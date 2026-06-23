import type { GenerateResult } from "@/lib/types";

/** Markdown のテーブルセルで安全になるようパイプ/改行をエスケープ。 */
function cell(value: string): string {
  return (value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim();
}

/**
 * 生成結果（型＋構成シート）を、コピペで使える Markdown に整形する。
 *
 * @param result Gemini 生成結果
 * @param videoUrl 参考動画URL（任意。あれば見出し下にリンクを添える）
 */
export function toMarkdown(result: GenerateResult, videoUrl?: string): string {
  const { reference, kata, sheet } = result;
  const lines: string[] = [];

  lines.push(`# 構成シート: ${reference.title}`);
  lines.push("");
  if (videoUrl) {
    lines.push(`参考動画: [${reference.title}](${videoUrl})`);
    lines.push("");
  }

  lines.push("## 抽出した型");
  lines.push(`- **フックの型**: ${kata.hook_type}`);
  lines.push(`- **テンポ / カット割り**: ${kata.pacing}`);
  lines.push(`- **テロップ・演出**: ${kata.tele_style}`);
  lines.push(`- **全体構成**: ${kata.structure_summary}`);
  lines.push("");

  lines.push("## 構成シート");
  lines.push("");
  lines.push(
    "| 時間 | ブロック | 狙い | 撮影内容 | カメラワーク | テロップ・演出 | 維持率の仕掛け |",
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of sheet) {
    lines.push(
      `| ${cell(row.time)} | ${cell(row.block)} | ${cell(row.purpose)} | ${cell(
        row.shoot,
      )} | ${cell(row.camera)} | ${cell(row.tele)} | ${cell(row.retention)} |`,
    );
  }

  const examples = sheet.filter((r) => r.script_example && r.script_example.trim());
  if (examples.length > 0) {
    lines.push("");
    lines.push("## セリフ例");
    for (const row of examples) {
      lines.push(`- **${row.block}**: ${row.script_example}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
