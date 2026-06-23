import type { Candidate, SearchResponse } from "@/lib/types";

/**
 * YouTube Data API でジャンル固定（お金/投資）＋題材から人気ショート候補を取得する。
 *
 * - search.list（videoDuration=short, order=viewCount, publishedAfter）で候補ID
 * - videos.list（contentDetails/statistics/snippet）で実尺・再生数・メタ取得
 * - 実尺 ≤ 75s に厳格フィルタ（Shorts近似。short指定でも最大~3分が混ざるため）
 * - 6ヶ月で0件なら12ヶ月へ自動拡張。なお0件は空＋理由
 *
 * APIキーはサーバー側でのみ参照しクライアントへ出さない。
 * NOTE: 純粋関数（パース/サニタイズ/整形）は `process.env`/エイリアスに依存させず、
 * `lib/youtube.test.ts` から `node --test` で直接ユニットテストできるようにしている。
 */

/** Shorts と見なす実尺の上限（秒）。 */
export const SHORTS_MAX_SEC = 75;
/** 検索の取得件数。 */
const SEARCH_MAX_RESULTS = 15;
/** 返す候補の上限（3-5本目安）。 */
const TOP_N = 5;
/** ユーザー題材の最大文字数（注入・暴走防止）。 */
export const MAX_QUERY_LEN = 120;

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_TIMEOUT_MS = 15_000;

export class YouTubeError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "YouTubeError";
    this.status = status;
  }
}

/**
 * ユーザー入力（題材）を検索クエリ用に正規化する。
 * - 制御文字（C0/C1・ゼロ幅等の書式文字）を除去
 * - 改行・連続空白を単一スペースに畳む
 * - 前後空白を除去し、最大 {@link MAX_QUERY_LEN} 文字に切り詰め
 * 空文字（実質空）になる場合は空文字を返す（呼び出し側で 400 判定）。
 */
export function sanitizeQuery(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ") // 制御文字・書式文字（改行/ゼロ幅等）→空白
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_QUERY_LEN)
    .trim();
}

/** ジャンル固定の検索クエリを組み立てる。 */
export function buildSearchQuery(tsutaetai: string): string {
  return `お金 投資 ${tsutaetai}`.trim();
}

/**
 * ISO8601 期間（例 `PT1M15S`）を秒に変換する。解釈不能なら 0。
 */
export function parseISO8601DurationToSec(iso: string | undefined | null): number {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (
    (Number(d) || 0) * 86400 +
    (Number(h) || 0) * 3600 +
    (Number(min) || 0) * 60 +
    (Number(s) || 0)
  );
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

/** videos.list の生データを Candidate に整形。実尺/再生数の欠落は 0 扱い。 */
export function toCandidate(item: VideoItem): Candidate | null {
  const videoId = item.id;
  if (!videoId) return null;
  const sn = item.snippet ?? {};
  const thumbs = sn.thumbnails ?? {};
  const thumbnail =
    thumbs.medium?.url ?? thumbs.high?.url ?? thumbs.default?.url ?? "";
  return {
    videoId,
    title: sn.title ?? "",
    channel: sn.channelTitle ?? "",
    views: Number(item.statistics?.viewCount ?? 0) || 0,
    durationSec: parseISO8601DurationToSec(item.contentDetails?.duration),
    thumbnail,
    url: `https://www.youtube.com/shorts/${videoId}`,
  };
}

/**
 * videos.list 結果を実尺 ≤ {@link SHORTS_MAX_SEC} で厳格フィルタし、
 * 再生数降順で上位 {@link TOP_N} 本に絞る。
 */
export function selectCandidates(items: VideoItem[]): Candidate[] {
  return items
    .map(toCandidate)
    .filter((c): c is Candidate => c !== null)
    .filter((c) => c.durationSec > 0 && c.durationSec <= SHORTS_MAX_SEC)
    .sort((a, b) => b.views - a.views)
    .slice(0, TOP_N);
}

/** ミリ秒で中断する fetch。 */
async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const data = (await res.json()) as {
      error?: { message?: string; code?: number };
    };
    if (!res.ok) {
      const code = data.error?.code ?? res.status;
      const msg = data.error?.message ?? `YouTube API エラー (${res.status})`;
      // クォータ超過は 403。明示メッセージで上流に伝える。
      throw new YouTubeError(msg, code === 403 ? 403 : 502);
    }
    return data;
  } catch (e) {
    if (e instanceof YouTubeError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new YouTubeError(`YouTube への接続に失敗しました: ${msg}`, 504);
  } finally {
    clearTimeout(timer);
  }
}

/** 指定 publishedAfter で search→videos を実行し、絞り込んだ候補を返す。 */
async function runSearch(
  query: string,
  publishedAfter: string,
  key: string,
): Promise<Candidate[]> {
  const searchParams = new URLSearchParams({
    key,
    part: "snippet",
    q: query,
    type: "video",
    videoDuration: "short",
    order: "viewCount",
    publishedAfter,
    maxResults: String(SEARCH_MAX_RESULTS),
    regionCode: "JP",
    relevanceLanguage: "ja",
  });
  const search = (await fetchJson(`${YT_BASE}/search?${searchParams}`)) as {
    items?: { id?: { videoId?: string } }[];
  };
  const ids = (search.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((v): v is string => Boolean(v));
  if (ids.length === 0) return [];

  const videoParams = new URLSearchParams({
    key,
    part: "snippet,contentDetails,statistics",
    id: ids.join(","),
    maxResults: String(ids.length),
  });
  const videos = (await fetchJson(`${YT_BASE}/videos?${videoParams}`)) as {
    items?: VideoItem[];
  };
  return selectCandidates(videos.items ?? []);
}

/** 現在から `months` ヶ月前の RFC3339 文字列。 */
function publishedAfterMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

/**
 * 題材から参考ショート候補を検索する。
 * 6ヶ月窓 → 0件なら12ヶ月窓に自動拡張。なお0件なら空＋理由を返す。
 *
 * @param tsutaetai 既にサニタイズ済みの題材（空でないこと）
 */
export async function searchShortCandidates(
  tsutaetai: string,
): Promise<SearchResponse> {
  const key = process.env.YOUTUBE_API_KEY ?? "";
  if (!key) {
    throw new YouTubeError("YOUTUBE_API_KEY が未設定です", 500);
  }

  const query = buildSearchQuery(tsutaetai);

  const within6 = await runSearch(query, publishedAfterMonths(6), key);
  if (within6.length > 0) {
    return { candidates: within6, expandedTo12mo: false };
  }

  const within12 = await runSearch(query, publishedAfterMonths(12), key);
  if (within12.length > 0) {
    return { candidates: within12, expandedTo12mo: true };
  }

  return {
    candidates: [],
    expandedTo12mo: true,
    reason:
      "直近12ヶ月で実尺75秒以下の人気ショート候補が見つかりませんでした。題材を変えてお試しください。",
  };
}
