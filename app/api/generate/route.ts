import { NextResponse } from "next/server";

import { generateSheet, GeminiError } from "@/lib/gemini";
import { flushTraces, traceGenerate } from "@/lib/observability";
import { env } from "@/lib/env";
import type {
  GenerateRequest,
  GenerateResponse,
  Shaku,
} from "@/lib/types";

/** PoC と同じ既定の参考動画（お金/投資ショート）。 */
const DEFAULT_VIDEO_URL = "https://www.youtube.com/shorts/hzeBNipY0YI";

const ALLOWED_SHAKU: Shaku[] = [15, 30, 60];

/** Gemini 呼び出しが長いので実行時間上限を延ばす。 */
export const maxDuration = 300;

interface ValidationResult {
  input: GenerateRequest;
  videoUrl: string;
}

function validate(body: unknown): ValidationResult | string {
  if (typeof body !== "object" || body === null) {
    return "リクエストボディが不正です";
  }
  const b = body as Record<string, unknown>;

  const tsutaetai = typeof b.tsutaetai === "string" ? b.tsutaetai.trim() : "";
  if (!tsutaetai) return "tsutaetai は必須です";

  const target = typeof b.target === "string" ? b.target.trim() : "";
  if (!target) return "target は必須です";

  const mokuteki = typeof b.mokuteki === "string" ? b.mokuteki.trim() : "";
  if (!mokuteki) return "mokuteki は必須です";

  const shaku = b.shaku as Shaku;
  if (!ALLOWED_SHAKU.includes(shaku)) {
    return "shaku は 15 / 30 / 60 のいずれかです";
  }

  let videoUrl = DEFAULT_VIDEO_URL;
  if (b.videoUrl !== undefined && b.videoUrl !== null && b.videoUrl !== "") {
    if (typeof b.videoUrl !== "string") return "videoUrl は文字列です";
    try {
      new URL(b.videoUrl);
    } catch {
      return "videoUrl が不正なURLです";
    }
    videoUrl = b.videoUrl;
  }

  return {
    input: { tsutaetai, shaku, target, mokuteki, videoUrl },
    videoUrl,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON の解析に失敗しました" }, { status: 400 });
  }

  const validated = validate(body);
  if (typeof validated === "string") {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const { result, meta } = await traceGenerate(
      validated.input,
      validated.videoUrl,
      env.GEMINI_MODEL,
      () => generateSheet(validated.input, validated.videoUrl),
    );
    const response: GenerateResponse = { ...result, meta };
    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json(
      { error: `生成に失敗しました: ${msg}` },
      { status: 500 },
    );
  } finally {
    // サーバーレスでのトレース欠落を防ぐためレスポンス確定前に送信しきる。
    await flushTraces();
  }
}
