"use client";

import { useState } from "react";
import Result from "@/components/Result";
import type { GenerateResponse, Shaku } from "@/lib/types";

/** 尺の選択肢。 */
const SHAKU_OPTIONS: Shaku[] = [15, 30, 60];

/** 既定の参考動画（PoC の固定ショート）。空ならサーバー側で同じ既定が使われる。 */
const DEFAULT_VIDEO_URL = "https://www.youtube.com/shorts/hzeBNipY0YI";

/**
 * 入力フォーム → `/api/generate` → 結果表示 のクライアント結線（#4 E2E）。
 * 固定動画＋仮入力で「生成→型＋6列表示→コピー」を一気通貫で動かす。
 */
export default function GenerateForm() {
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL);
  const [tsutaetai, setTsutaetai] = useState("新NISAの落とし穴");
  const [shaku, setShaku] = useState<Shaku>(30);
  const [target, setTarget] = useState("投資初心者");
  const [mokuteki, setMokuteki] = useState("視聴維持率を最大化");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoUrl.trim() || undefined,
          tsutaetai,
          shaku,
          target,
          mokuteki,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : `生成に失敗しました (${res.status})`);
        return;
      }
      setResult(data as GenerateResponse);
    } catch {
      setError("通信に失敗しました。ネットワークを確認して再試行してください。");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tsutaetai" className="text-sm font-medium">
            伝えたいこと
          </label>
          <input
            id="tsutaetai"
            value={tsutaetai}
            onChange={(e) => setTsutaetai(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="shaku" className="text-sm font-medium">
              尺（秒）
            </label>
            <select
              id="shaku"
              value={shaku}
              onChange={(e) => setShaku(Number(e.target.value) as Shaku)}
              className={inputClass}
            >
              {SHAKU_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}秒
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="target" className="text-sm font-medium">
              ターゲット
            </label>
            <input
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mokuteki" className="text-sm font-medium">
              目的
            </label>
            <input
              id="mokuteki"
              value={mokuteki}
              onChange={(e) => setMokuteki(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="videoUrl" className="text-sm font-medium">
            参考ショート動画URL
            <span className="ml-1 font-normal text-zinc-500">（空欄なら既定動画）</span>
          </label>
          <input
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={DEFAULT_VIDEO_URL}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "生成中…（30秒前後）" : "構成シートを生成"}
          </button>
          {loading && (
            <span className="text-sm text-zinc-500" aria-live="polite">
              参考動画を解析しています…
            </span>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </form>

      {result && <Result result={result} videoUrl={videoUrl.trim() || DEFAULT_VIDEO_URL} />}
    </div>
  );
}
