import type { Kata } from "@/lib/types";

const FIELDS: { key: keyof Kata; label: string }[] = [
  { key: "hook_type", label: "フックの型" },
  { key: "pacing", label: "テンポ / カット割り" },
  { key: "tele_style", label: "テロップ・演出" },
  { key: "structure_summary", label: "全体構成" },
];

/** 参考動画から抽出した「型」を一覧表示。 */
export default function KataCard({ kata }: { kata: Kata }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        抽出した型
      </h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {label}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed">{kata[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
