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

/** 自由入力フィールドの最大文字数（#21 注入・肥大化対策）。 */
const MAX_FIELD_LEN = 120;

/**
 * 実生成は実測 ~21–35s で 60s 以内に収まる（PoC/#4 実測）。
 * Vercel Hobby の関数上限(60s)に整合させる。60s 超の長尺動画解析が必要になったら Pro 移行を検討。
 */
export const maxDuration = 60;

/**
 * 自由入力テキストを正規化する（#21 サニタイズ）。
 * - 制御文字（C0制御 \x00-\x1F と DEL \x7F。改行・タブ含む）を空白へ畳み込み
 * - 連続する空白を1つに圧縮し、前後の空白を除去
 */
function sanitizeText(value: string): string {
  return value
    .replace(/[\x00-\x1F\x7F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ValidationResult {
  input: GenerateRequest;
  videoUrl: string;
}

function validate(body: unknown): ValidationResult | string {
  if (typeof body !== "object" || body === null) {
    return "リクエストボディが不正です";
  }
  const b = body as Record<string, unknown>;

  const tsutaetai =
    typeof b.tsutaetai === "string" ? sanitizeText(b.tsutaetai) : "";
  if (!tsutaetai) return "tsutaetai は必須です";
  if (tsutaetai.length > MAX_FIELD_LEN)
    return `tsutaetai は${MAX_FIELD_LEN}字以内です`;

  const target = typeof b.target === "string" ? sanitizeText(b.target) : "";
  if (!target) return "target は必須です";
  if (target.length > MAX_FIELD_LEN)
    return `target は${MAX_FIELD_LEN}字以内です`;

  const mokuteki =
    typeof b.mokuteki === "string" ? sanitizeText(b.mokuteki) : "";
  if (!mokuteki) return "mokuteki は必須です";
  if (mokuteki.length > MAX_FIELD_LEN)
    return `mokuteki は${MAX_FIELD_LEN}字以内です`;

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
