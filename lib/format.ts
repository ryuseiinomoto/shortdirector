/**
 * 候補UI などの表示整形ヘルパー（純粋関数）。
 * `lib/format.test.ts` から `node --test` で直接ユニットテストできるよう、
 * 依存ゼロにしている。
 */

/**
 * 再生数を日本語の概数表記にする（例: 1395310 → "139.5万回"）。
 * 1万未満はカンマ区切り。負値・非有限は "0回"。
 */
export function formatViews(views: number): string {
  if (!Number.isFinite(views) || views < 0) return "0回";
  const n = Math.floor(views);
  if (n >= 100_000_000) {
    return `${trim1(n / 100_000_000)}億回`;
  }
  if (n >= 10_000) {
    return `${trim1(n / 10_000)}万回`;
  }
  return `${n.toLocaleString("en-US")}回`;
}

/** 小数第1位まで（末尾の .0 は落とす）。 */
function trim1(v: number): string {
  return v.toFixed(1).replace(/\.0$/, "");
}

/**
 * 秒数を mm:ss 形式にする（例: 75 → "1:15"）。
 * 負値・非有限は "0:00"。
 */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
