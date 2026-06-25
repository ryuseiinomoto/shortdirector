"use client";

import type { Candidate } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";

/**
 * 参考ショート候補1件のカード。クリック/Enter で選択。
 * 選択中はリング＋チェックでハイライトする（presentational・状態は親が保持）。
 */
export default function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: Candidate;
  selected: boolean;
  onSelect: (candidate: Candidate) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(candidate)}
      aria-pressed={selected}
      className={`group flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors dark:bg-zinc-900 ${
        selected
          ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-white dark:ring-white"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
      }`}
    >
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
        {candidate.thumbnail ? (
          // 外部サムネ。next/image の最適化は使わず素の img（ドメイン設定不要）。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.thumbnail}
            alt={`${candidate.title} のサムネイル`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            サムネイルなし
          </div>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-white">
          {formatDuration(candidate.durationSec)}
        </span>
        {selected && (
          <span
            aria-hidden
            className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900"
          >
            ✓
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {candidate.title}
        </h3>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {candidate.channel}
        </p>
        <p className="mt-auto text-xs text-zinc-500 dark:text-zinc-400">
          {formatViews(candidate.views)}
        </p>
      </div>
    </button>
  );
}
