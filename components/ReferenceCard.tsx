import type { Reference } from "@/lib/types";
import { youTubeThumbnailFromUrl } from "@/lib/video";

/** 参考にしたショート動画（サムネ＋タイトル＋リンク＋観測フック）を表示。 */
export default function ReferenceCard({
  reference,
  videoUrl,
}: {
  reference: Reference;
  videoUrl?: string;
}) {
  const thumbnail = youTubeThumbnailFromUrl(videoUrl);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        参考にしたショート動画
      </h2>
      <div className="flex flex-col gap-4 sm:flex-row">
        {thumbnail ? (
          // 外部サムネ。next/image の最適化は使わず素の img（ドメイン設定不要・先行実装）
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={`${reference.title} のサムネイル`}
            className="aspect-video w-full shrink-0 rounded-lg object-cover sm:w-48"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-video w-full shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800 sm:w-48">
            サムネイルなし
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{reference.title}</h3>
          {reference.hook_observed && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-500 dark:text-zinc-500">
                観測したフック:{" "}
              </span>
              {reference.hook_observed}
            </p>
          )}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              YouTube で開く
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
