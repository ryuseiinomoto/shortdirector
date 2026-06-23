import type { GenerateResult } from "@/lib/types";
import { toMarkdown } from "@/lib/toMarkdown";
import ReferenceCard from "@/components/ReferenceCard";
import KataCard from "@/components/KataCard";
import SheetTable from "@/components/SheetTable";
import CopyButton from "@/components/CopyButton";

/**
 * 生成結果の表示一式。
 * 参考動画 → 抽出した型 → 構成シート（6列）を縦に並べ、上部に Markdown コピーを置く。
 */
export default function Result({
  result,
  videoUrl,
}: {
  result: GenerateResult;
  videoUrl?: string;
}) {
  const markdown = toMarkdown(result, videoUrl);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold sm:text-xl">生成結果</h1>
        <CopyButton markdown={markdown} />
      </div>

      <ReferenceCard reference={result.reference} videoUrl={videoUrl} />
      <KataCard kata={result.kata} />
      <SheetTable sheet={result.sheet} />
    </div>
  );
}
