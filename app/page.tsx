import GenerateForm from "@/components/GenerateForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ShortDirector
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          YouTubeショート専門の構成・演出ガイド（構成シート）をAIが生成します。
          参考ショート動画を解析し、入力した題材で撮影・演出のタイムラインを作成します。
        </p>
      </header>

      <GenerateForm />
    </main>
  );
}
