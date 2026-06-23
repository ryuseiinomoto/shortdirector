import type { SheetRow } from "@/lib/types";

/** 6列の本体フィールド（時間・ブロックは見出し列として別扱い）。 */
const COLUMNS: { key: keyof SheetRow; label: string }[] = [
  { key: "purpose", label: "狙い" },
  { key: "shoot", label: "撮影内容" },
  { key: "camera", label: "カメラワーク" },
  { key: "tele", label: "テロップ・演出" },
  { key: "retention", label: "維持率の仕掛け" },
];

/**
 * 構成シート。
 * - md 以上: 横並びのテーブル（広すぎる場合は横スクロール）
 * - md 未満: 行ごとのカード表示で破綻を防ぐ
 */
export default function SheetTable({ sheet }: { sheet: SheetRow[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        構成シート（{sheet.length}ブロック）
      </h2>

      {/* デスクトップ: テーブル */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block dark:border-zinc-800">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">時間</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">ブロック</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.map((row, i) => (
              <tr
                key={i}
                className="border-t border-zinc-200 align-top dark:border-zinc-800"
              >
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-zinc-500">
                  {row.time}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  {row.block}
                  {row.script_example && (
                    <span className="mt-1 block max-w-[12rem] text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      💬「{row.script_example}」
                    </span>
                  )}
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-3 py-2 leading-relaxed">
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル: カード */}
      <ul className="flex flex-col gap-3 md:hidden">
        {sheet.map((row, i) => (
          <li
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{row.block}</span>
              <span className="font-mono text-xs text-zinc-500">{row.time}</span>
            </div>
            {row.script_example && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                💬「{row.script_example}」
              </p>
            )}
            <dl className="mt-3 space-y-2">
              {COLUMNS.map((c) => (
                <div key={c.key}>
                  <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {c.label}
                  </dt>
                  <dd className="text-sm leading-relaxed">{row[c.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
