import "server-only";

import { env } from "@/lib/env";
import { buildPrompt } from "@/lib/prompt";
import type {
  GenerateRequest,
  GenerateResult,
  GenerateMeta,
} from "@/lib/types";

/** Gemini responseSchema（OpenAPI型・ASCIIキー）。PoC のスキーマを移植。 */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reference: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        hook_observed: { type: "STRING" },
      },
      required: ["title", "hook_observed"],
    },
    kata: {
      type: "OBJECT",
      properties: {
        hook_type: { type: "STRING" },
        pacing: { type: "STRING" },
        tele_style: { type: "STRING" },
        structure_summary: { type: "STRING" },
      },
      required: ["hook_type", "pacing", "tele_style", "structure_summary"],
    },
    sheet: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          time: { type: "STRING" },
          block: { type: "STRING" },
          purpose: { type: "STRING" },
          shoot: { type: "STRING" },
          camera: { type: "STRING" },
          tele: { type: "STRING" },
          retention: { type: "STRING" },
          script_example: { type: "STRING" },
        },
        required: [
          "time",
          "block",
          "purpose",
          "shoot",
          "camera",
          "tele",
          "retention",
        ],
      },
    },
  },
  required: ["reference", "kata", "sheet"],
} as const;

const GEMINI_TIMEOUT_MS = 180_000;

export class GeminiError extends Error {
  /** 上流に返す HTTP ステータス（無ければ 502 相当）。 */
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: UsageMetadata;
  error?: { message?: string };
}

/**
 * 参考動画＋ユーザー入力から構成シートを1コールで生成する。
 *
 * APIキーはサーバー側 env のみで参照し、クライアントには出さない。
 */
export async function generateSheet(
  input: GenerateRequest,
  videoUrl: string,
): Promise<{ result: GenerateResult; meta: GenerateMeta }> {
  if (!env.GEMINI_API_KEY) {
    throw new GeminiError("GEMINI_API_KEY が未設定です", 500);
  }

  const model = env.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { file_data: { file_uri: videoUrl } },
          { text: buildPrompt(input) },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
    },
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);
  const t0 = Date.now();
  let res: Response;
  let data: GeminiApiResponse;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    data = (await res.json()) as GeminiApiResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new GeminiError(`Gemini への接続に失敗しました: ${msg}`, 504);
  } finally {
    clearTimeout(timer);
  }
  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    throw new GeminiError(
      data.error?.message ?? `Gemini がエラーを返しました (${res.status})`,
      502,
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  let result: GenerateResult;
  try {
    result = JSON.parse(text) as GenerateResult;
  } catch {
    throw new GeminiError("Gemini 応答の JSON パースに失敗しました", 502);
  }
  if (!result?.kata || !Array.isArray(result?.sheet)) {
    throw new GeminiError("Gemini 応答の形式が不正です", 502);
  }

  const u = data.usageMetadata ?? {};
  const meta: GenerateMeta = {
    model,
    latencyMs,
    promptTokenCount: u.promptTokenCount ?? 0,
    candidatesTokenCount: u.candidatesTokenCount ?? 0,
    totalTokenCount: u.totalTokenCount ?? 0,
  };

  return { result, meta };
}
