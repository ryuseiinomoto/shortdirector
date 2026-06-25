"use client";

import type { Candidate } from "@/lib/types";
import CandidateCard from "@/components/CandidateCard";

/**
 * 参考ショート候補の一覧（3-5本）。カードで並べ、1本を選択させる。
 * 状態は持たない presentational コンポーネント。選択値・取得状態は親（#10結線）が管理。
 *
 * - `loading`: スケルトン表示
 * - 候補0件（非ローディング）: `reason` か既定文言で空表示
 * - それ以外: レスポンシブなカードグリッド
 */
export default function CandidateList({
  candidates,
  selectedVideoId,
  onSelect,
  loading = false,
  reason,
}: {
  candidates: Candidate[];
  selectedVideoId?: string | null;
  onSelect: (candidate: Candidate) => void;
  loading?: boolean;
  reason?: string;
}) {
  if (loading) {
    return (
      <section aria-busy="true" aria-live="polite">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          参考ショート候補を検索中…
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="aspect-video w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (candidates.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          参考ショート候補
        </h2>
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {reason ?? "候補が見つかりませんでした。題材を変えてお試しください。"}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        参考にするショートを選択（{candidates.length}件）
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {candidates.map((c) => (
          <li key={c.videoId}>
            <CandidateCard
              candidate={c}
              selected={c.videoId === selectedVideoId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
