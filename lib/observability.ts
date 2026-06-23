import "server-only";

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { startObservation } from "@langfuse/tracing";

import { env } from "@/lib/env";
import type { GenerateMeta, GenerateRequest, GenerateResult } from "@/lib/types";
import { parseYouTubeId } from "@/lib/video";

/**
 * Langfuse(JPリージョン)による `/api/generate` のトレース計装。
 *
 * 方針:
 * - **graceful degradation**: `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` が未設定なら
 *   計装は完全 no-op にし、生成処理そのものは常に成功させる（計装失敗で500にしない）。
 * - キーがあれば 1 リクエスト = 1 トレース（中に Gemini generation を1つ）として記録し、
 *   input / output / model / tokens(usage) / cost / latency を乗せる。
 * - サーバーレスでのトレース欠落を防ぐため、レスポンス前に `flushTraces()` する。
 */

/** 計装が有効か（公開鍵・秘密鍵が両方そろっているか）。 */
export function isLangfuseEnabled(): boolean {
  return Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);
}

/**
 * SpanProcessor はプロセス唯一のシングルトンとして `globalThis` に保持する。
 *
 * Next.js では `instrumentation.ts`（起動時計装）と route ハンドラが**別々の
 * モジュールインスタンス**としてこのファイルを読み込むことがあり、ふつうの
 * モジュールスコープ変数では参照を共有できない（init 側で作っても route 側からは
 * null に見える）。OpenTelemetry のグローバル TracerProvider はプロセス共有なので、
 * プロセッサ参照も同様に `globalThis` に置いて全コンテキストから使えるようにする。
 */
const PROCESSOR_KEY = Symbol.for("shortdirector.langfuse.spanProcessor");
const INIT_KEY = Symbol.for("shortdirector.langfuse.initialized");

type GlobalStore = typeof globalThis & {
  [PROCESSOR_KEY]?: LangfuseSpanProcessor | null;
  [INIT_KEY]?: boolean;
};
const store = globalThis as GlobalStore;

function getProcessor(): LangfuseSpanProcessor | null {
  return store[PROCESSOR_KEY] ?? null;
}

/**
 * OpenTelemetry プロバイダに Langfuse の SpanProcessor を登録する。
 * `instrumentation.ts` の `register()` から nodejs ランタイムで呼ぶ（冪等）。
 * 例外は握りつぶす（graceful）。
 */
export function initObservability(): void {
  if (store[INIT_KEY]) return;
  store[INIT_KEY] = true;

  if (!isLangfuseEnabled()) return;

  try {
    const spanProcessor = new LangfuseSpanProcessor({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      // 本プロジェクトは host を `LANGFUSE_HOST`(JP既定) で持つため明示注入。
      baseUrl: env.LANGFUSE_HOST,
      environment: process.env.NODE_ENV,
      // **Next.js の自動計装スパンは送出しない**。
      // 例えば fetch 自動計装はスパン名に Gemini 呼び出しURL（`?key=...`）を含むため、
      // そのまま送ると APIキーが Langfuse に漏れる。自分が `startObservation` で
      // 作った Langfuse スパンだけを送り、フレームワークのスパンは除外する。
      shouldExportSpan: ({ otelSpan }) =>
        otelSpan.instrumentationScope?.name !== "next.js",
    });
    // グローバルに登録し、`startObservation` で作る観測を確実に拾わせる。
    const provider = new NodeTracerProvider({ spanProcessors: [spanProcessor] });
    provider.register();
    store[PROCESSOR_KEY] = spanProcessor;
  } catch (e) {
    // 計装の初期化失敗はアプリ機能をブロックしない。
    store[PROCESSOR_KEY] = null;
    console.warn("[observability] Langfuse 初期化に失敗（計装をスキップ）:", e);
  }
}

/** 保留中のトレースを送信しきる（サーバーレスでの欠落防止）。失敗は無視。 */
export async function flushTraces(): Promise<void> {
  const spanProcessor = getProcessor();
  if (!spanProcessor) return;
  try {
    await spanProcessor.forceFlush();
  } catch (e) {
    console.warn("[observability] flush に失敗:", e);
  }
}

/** モデル別の概算単価（USD / 1Mトークン）。実価格は要確認の暫定値。 */
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};
const FALLBACK_RATE = { input: 0.3, output: 2.5 };

/** tokens から概算コスト（USD）を算出。 */
function estimateCost(meta: GenerateMeta): {
  input: number;
  output: number;
  total: number;
} {
  const rate = MODEL_RATES[meta.model] ?? FALLBACK_RATE;
  const input = (meta.promptTokenCount * rate.input) / 1_000_000;
  const output = (meta.candidatesTokenCount * rate.output) / 1_000_000;
  return { input, output, total: input + output };
}

/** トレースの input に載せる（秘密情報を含まない）入力サマリ。 */
function traceInput(input: GenerateRequest, videoUrl: string) {
  return {
    tsutaetai: input.tsutaetai,
    shaku: input.shaku,
    target: input.target,
    mokuteki: input.mokuteki,
    videoUrl,
    videoId: parseYouTubeId(videoUrl),
  };
}

/**
 * 生成処理を 1 トレース（内側に Gemini generation）として計装しつつ実行する。
 * 計装が無効・失敗しても `work()` の結果はそのまま返す（生成は止めない）。
 */
export async function traceGenerate(
  input: GenerateRequest,
  videoUrl: string,
  model: string,
  work: () => Promise<{ result: GenerateResult; meta: GenerateMeta }>,
): Promise<{ result: GenerateResult; meta: GenerateMeta }> {
  // instrumentation 未経由のコンテキストでも確実に初期化（冪等）。
  initObservability();
  if (!isLangfuseEnabled() || !getProcessor()) {
    return work();
  }

  const inputSummary = traceInput(input, videoUrl);

  // ルートspan（=トレース）。中に Gemini generation を1つぶら下げる。
  const root = startObservation("generate-sheet", { input: inputSummary });
  root.updateTrace({
    name: "generate-sheet",
    input: inputSummary,
    tags: ["api/generate"],
    metadata: { videoUrl, videoId: inputSummary.videoId },
  });

  const generation = root.startObservation(
    "gemini.generateContent",
    { input: inputSummary, model },
    { asType: "generation" },
  );

  try {
    const { result, meta } = await work();
    const cost = estimateCost(meta);

    generation.update({
      output: result,
      model: meta.model,
      usageDetails: {
        input: meta.promptTokenCount,
        output: meta.candidatesTokenCount,
        total: meta.totalTokenCount,
      },
      costDetails: {
        input: cost.input,
        output: cost.output,
        total: cost.total,
      },
      metadata: { latencyMs: meta.latencyMs },
    });
    generation.end();

    root.update({ output: result });
    root.updateTrace({ output: { kata: result.kata, sheet: result.sheet } });
    root.end();

    return { result, meta };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    generation.update({ level: "ERROR", statusMessage: message });
    generation.end();
    root.update({ level: "ERROR", statusMessage: message });
    root.end();
    throw e;
  }
}
