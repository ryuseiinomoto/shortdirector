/**
 * ShortDirector 共有型。
 *
 * `/api/generate`（#2）と結果UI（#3）で共有する。
 * Gemini の responseSchema 出力（ASCIIキー）に対応する。
 */

/** 尺（秒）。フォームの選択肢に対応。 */
export type Shaku = 15 | 30 | 60;

/** 生成APIへのリクエスト入力。 */
export interface GenerateRequest {
  /** 参考にするショート動画URL。未指定なら既定動画を使う。 */
  videoUrl?: string;
  /** 伝えたいこと（題材）。 */
  tsutaetai: string;
  /** 尺（秒）。 */
  shaku: Shaku;
  /** ターゲット視聴者。 */
  target: string;
  /** 目的（例: 視聴維持率を最大化）。 */
  mokuteki: string;
}

/** 参考動画から観測した情報。 */
export interface Reference {
  /** 動画タイトル（Geminiが視聴して把握したもの）。 */
  title: string;
  /** 観測したフックの内容。 */
  hook_observed: string;
}

/** 参考動画から抽出した「型」。 */
export interface Kata {
  /** フックの型（最初の1-2秒で何をしているか）。 */
  hook_type: string;
  /** テンポ / カット割り。 */
  pacing: string;
  /** テロップ・演出の型。 */
  tele_style: string;
  /** 全体構成の要約。 */
  structure_summary: string;
}

/** 構成シートの1行（意味ブロック単位）。 */
export interface SheetRow {
  /** 秒範囲（例: "0-3s"）。 */
  time: string;
  /** ブロック名（フック / 導入 / 本編 / オチ / CTA など）。 */
  block: string;
  /** 狙い。 */
  purpose: string;
  /** 撮影内容（話す内容の要旨）。 */
  shoot: string;
  /** カメラワーク。 */
  camera: string;
  /** テロップ・演出。 */
  tele: string;
  /** 維持率の仕掛け。 */
  retention: string;
  /** 掴みのセリフ例。「フック」ブロックにのみ入る。 */
  script_example?: string;
}

/** Geminiが生成する構成シート一式。 */
export interface GenerateResult {
  reference: Reference;
  kata: Kata;
  sheet: SheetRow[];
}

/** YouTube 検索で得た参考ショート候補（`/api/search`）。 */
export interface Candidate {
  /** YouTube 動画ID。 */
  videoId: string;
  /** 動画タイトル。 */
  title: string;
  /** チャンネル名。 */
  channel: string;
  /** 再生数。 */
  views: number;
  /** 実尺（秒）。 */
  durationSec: number;
  /** サムネイルURL。 */
  thumbnail: string;
  /** 視聴URL（Shorts）。 */
  url: string;
}

/** `/api/search` のレスポンス。 */
export interface SearchResponse {
  /** 上位候補（3-5本目安。0件もあり得る）。 */
  candidates: Candidate[];
  /** 6ヶ月で0件のため12ヶ月に拡張して取得したか。 */
  expandedTo12mo: boolean;
  /** 0件など、補足の理由（あれば）。 */
  reason?: string;
}

/** 生成メタ情報（トークン・レイテンシ）。トレース／コスト把握用。 */
export interface GenerateMeta {
  model: string;
  latencyMs: number;
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

/** `/api/generate` のレスポンス。 */
export interface GenerateResponse extends GenerateResult {
  meta: GenerateMeta;
}
