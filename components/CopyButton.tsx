"use client";

import { useState } from "react";

/** Markdown 文字列をクリップボードへコピーし、「コピーしました」を一定時間表示。 */
export default function CopyButton({
  markdown,
  className = "",
}: {
  markdown: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        // クリップボードAPIが使えない環境（古いブラウザ/非セキュアコンテキスト）向けフォールバック
        const ta = document.createElement("textarea");
        ta.value = markdown;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  const label =
    state === "copied"
      ? "✓ コピーしました"
      : state === "error"
        ? "コピーに失敗しました"
        : "Markdownをコピー";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
        state === "copied" ? "border-green-500 text-green-600 dark:text-green-400" : ""
      } ${className}`}
    >
      {label}
    </button>
  );
}
