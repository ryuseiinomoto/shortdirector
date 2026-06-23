import Result from "@/components/Result";
import { SAMPLE_RESULT, SAMPLE_VIDEO_URL } from "@/lib/sample";

export default function Home() {
  // NOTE(#3): API（#2）未完のため、PoC 出力相当のサンプルJSONで結果UIを描画。
  // 完成後は `/api/generate` の結果を渡すフォーム経由に差し替える。
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ShortDirector
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          YouTubeショート専門の構成・演出ガイド（構成シート）をAIが生成します。
        </p>
      </header>

      <Result result={SAMPLE_RESULT} videoUrl={SAMPLE_VIDEO_URL} />
    </main>
  );
}
