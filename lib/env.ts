/**
 * サーバー側で参照する環境変数の型付きアクセサ。
 *
 * 値が未設定でもビルド・起動は通す（実行時に各機能側で検証する想定）。
 * クライアントには絶対に渡さないこと（`server-only` 相当の運用ルール）。
 */
export const env = {
  /** Gemini API キー */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  /** 使用する Gemini モデル（既定: gemini-2.5-flash） */
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  /** YouTube Data API キー */
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ?? "",
  /** Langfuse 公開キー */
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  /** Langfuse シークレットキー */
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY ?? "",
  /** Langfuse ホスト（既定: https://jp.cloud.langfuse.com） */
  LANGFUSE_HOST: process.env.LANGFUSE_HOST ?? "https://jp.cloud.langfuse.com",
} as const;

export type Env = typeof env;
