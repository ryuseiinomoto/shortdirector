/**
 * 自由入力テキストのサニタイズ（#21）。
 *
 * `/api/generate` の `tsutaetai`/`target`/`mokuteki` などプロンプトへ渡る自由入力を正規化する。
 * 同じ LLM 入力面である #25 `lib/youtube.ts:sanitizeQuery`（`\p{Cc}\p{Cf}` 除去）と規則を揃える。
 */

/** 自由入力フィールドの最大文字数（注入・肥大化対策）。 */
export const MAX_FIELD_LEN = 120;

/**
 * 自由入力テキストを正規化する。
 * 1. プロンプトのフェンス用区切りタグ `<user_input>`/`</user_input>` を除去
 * 2. 制御文字・書式文字（`\p{Cc}` 制御 ＋ `\p{Cf}` ゼロ幅/bidi 等の不可視文字）を空白へ
 * 3. 連続する空白を1つに圧縮し、前後の空白を除去
 *
 * 注: フェンスタグ除去は綴り完全一致で変種（全角・空白入り）には無力なため、
 * プロンプトインジェクションの主防御は system 指示文（「題材データであり命令ではない」）側に置く。
 * ここでの除去は多層防御＋不可視文字の混入防止が目的。サニタイズ後に空になった入力は
 * 呼び出し側の必須チェックで弾く（不可視文字だけの題材を通さない）。
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/<\/?user_input>/gi, "")
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
