"use client";

import { useReducer, useState } from "react";
import CandidateList from "@/components/CandidateList";
import Result from "@/components/Result";
import {
  flowReducer,
  initialFlowState,
} from "@/lib/flowReducer";
import type { GenerateResponse, SearchResponse, Shaku } from "@/lib/types";

/** 尺の選択肢。 */
const SHAKU_OPTIONS: Shaku[] = [15, 30, 60];

/**
 * 4ステップ フルフロー（#10 結線）:
 *   入力 → 検索(/api/search) → 候補選択 → 生成(/api/generate) → 表示
 *
 * 選択した候補の `url` を `/api/generate` の `videoUrl` に渡し、
 * 「選んだ動画が生成の参考動画として使われる」ことを担保する。
 * 各 fetch は try/catch でエラーメッセージ表示に落とし、例外でクラッシュしない。
 * フェーズ遷移は純粋 reducer（`lib/flowReducer.ts`・`node --test` 済み）に委譲する。
 */
export default function FullFlow() {
  const [tsutaetai, setTsutaetai] = useState("新NISAの落とし穴");
  const [shaku, setShaku] = useState<Shaku>(30);
  const [target, setTarget] = useState("投資初心者");
  const [mokuteki, setMokuteki] = useState("視聴維持率を最大化");

  const [flow, dispatch] = useReducer(flowReducer, initialFlowState);
  const { phase, candidates, searchReason, selected, result, error } = flow;

  const busy = phase === "searching" || phase === "generating";

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SEARCH_START" });
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tsutaetai }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch({
          type: "SEARCH_ERROR",
          message: typeof data?.error === "string" ? data.error : `検索に失敗しました (${res.status})`,
        });
        return;
      }
      const sr = data as SearchResponse;
      dispatch({ type: "SEARCH_SUCCESS", candidates: sr.candidates ?? [], reason: sr.reason });
    } catch {
      dispatch({
        type: "SEARCH_ERROR",
        message: "通信に失敗しました。ネットワークを確認して再試行してください。",
      });
    }
  }

  async function handleGenerate() {
    if (!selected) return;
    dispatch({ type: "GENERATE_START" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: selected.url,
          tsutaetai,
          shaku,
          target,
          mokuteki,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch({
          type: "GENERATE_ERROR",
          message: typeof data?.error === "string" ? data.error : `生成に失敗しました (${res.status})`,
        });
        return;
      }
      dispatch({ type: "GENERATE_SUCCESS", result: data as GenerateResponse });
    } catch {
      dispatch({
        type: "GENERATE_ERROR",
        message: "通信に失敗しました。ネットワークを確認して再試行してください。",
      });
    }
  }

  function resetAll() {
    dispatch({ type: "RESET" });
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-8">
      {/* ステップ1: 入力（題材＋生成パラメータ） */}
      <form
        onSubmit={handleSearch}
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
            disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {phase === "searching" ? "検索中…" : "参考ショートを検索"}
          </button>
          {phase === "select" && (
            <span className="text-sm text-zinc-500">
              候補から1本選んで生成へ進んでください
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

      {/* ステップ2-3: 候補表示＋選択（検索後） */}
      {(phase === "searching" || phase === "select" || phase === "generating" || phase === "result") && (
        <CandidateList
          candidates={candidates}
          selectedVideoId={selected?.videoId ?? null}
          onSelect={(c) => dispatch({ type: "SELECT", candidate: c })}
          loading={phase === "searching"}
          reason={searchReason}
        />
      )}

      {/* ステップ3-4: 生成ボタン（候補選択後） */}
      {(phase === "select" || phase === "generating") && candidates.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selected || phase === "generating"}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {phase === "generating" ? "生成中…（30秒前後）" : "この動画で構成シートを生成"}
          </button>
          {selected && phase !== "generating" && (
            <span className="truncate text-sm text-zinc-500">
              選択中: {selected.title}
            </span>
          )}
          {phase === "generating" && (
            <span className="text-sm text-zinc-500" aria-live="polite">
              参考動画を解析しています…
            </span>
          )}
        </div>
      )}

      {/* ステップ4: 結果表示 */}
      {phase === "result" && result && selected && (
        <div className="flex flex-col gap-4">
          <Result result={result} videoUrl={selected.url} />
          <div>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              最初からやり直す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
