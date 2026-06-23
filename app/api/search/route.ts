import { NextResponse } from "next/server";

import { sanitizeQuery, searchShortCandidates, YouTubeError } from "@/lib/youtube";
import type { SearchResponse } from "@/lib/types";

/** YouTube 呼び出しは速いが、検索→詳細の2段＋再試行を見込み少し延ばす。 */
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON の解析に失敗しました" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }
  const raw = (body as Record<string, unknown>).tsutaetai;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "tsutaetai は必須です" }, { status: 400 });
  }

  // 注入・暴走防止: 制御文字正規化＋120字上限。空になれば 400。
  const tsutaetai = sanitizeQuery(raw);
  if (!tsutaetai) {
    return NextResponse.json({ error: "tsutaetai は必須です" }, { status: 400 });
  }

  try {
    const result: SearchResponse = await searchShortCandidates(tsutaetai);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof YouTubeError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json(
      { error: `検索に失敗しました: ${msg}` },
      { status: 500 },
    );
  }
}
