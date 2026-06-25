import test from "node:test";
import assert from "node:assert/strict";

import {
  flowReducer,
  initialFlowState,
  type FlowState,
} from "./flowReducer.ts";
import type { Candidate, GenerateResponse } from "./types.ts";

const candA: Candidate = {
  videoId: "aaa",
  title: "候補A",
  channel: "chA",
  views: 1000,
  durationSec: 50,
  thumbnail: "https://img/a.jpg",
  url: "https://www.youtube.com/shorts/aaa",
};
const candB: Candidate = {
  videoId: "bbb",
  title: "候補B",
  channel: "chB",
  views: 2000,
  durationSec: 40,
  thumbnail: "https://img/b.jpg",
  url: "https://www.youtube.com/shorts/bbb",
};

const fakeResult = {
  reference: { title: "ref", hook_observed: "h" },
  kata: { hook_type: "x", pacing: "y", tele_style: "z", structure_summary: "s" },
  sheet: [],
  meta: {
    model: "gemini-2.5-flash",
    latencyMs: 1,
    promptTokenCount: 1,
    candidatesTokenCount: 1,
    totalTokenCount: 2,
  },
} as unknown as GenerateResponse;

test("happy path: 初期→search→候補選択→generate→result", () => {
  let s: FlowState = initialFlowState;
  assert.equal(s.phase, "input");

  s = flowReducer(s, { type: "SEARCH_START" });
  assert.equal(s.phase, "searching");

  s = flowReducer(s, { type: "SEARCH_SUCCESS", candidates: [candA, candB], reason: undefined });
  assert.equal(s.phase, "select");
  assert.equal(s.candidates.length, 2);
  assert.equal(s.selected, null, "検索成功時は選択をリセット");

  s = flowReducer(s, { type: "SELECT", candidate: candB });
  assert.equal(s.phase, "select");
  assert.equal(s.selected, candB);

  s = flowReducer(s, { type: "GENERATE_START" });
  assert.equal(s.phase, "generating");
  assert.equal(s.selected, candB, "生成中も選択候補を保持");

  s = flowReducer(s, { type: "GENERATE_SUCCESS", result: fakeResult });
  assert.equal(s.phase, "result");
  assert.equal(s.result, fakeResult);
  assert.equal(s.selected, candB, "結果フェーズまで選択候補を保持");
});

test("エラー時に前フェーズへ戻る: SEARCH_ERROR → input", () => {
  const searching = flowReducer(initialFlowState, { type: "SEARCH_START" });
  const errored = flowReducer(searching, { type: "SEARCH_ERROR", message: "検索失敗" });
  assert.equal(errored.phase, "input");
  assert.equal(errored.error, "検索失敗");
});

test("エラー時に前フェーズへ戻る: GENERATE_ERROR → select", () => {
  let s = flowReducer(initialFlowState, { type: "SEARCH_START" });
  s = flowReducer(s, { type: "SEARCH_SUCCESS", candidates: [candA], reason: undefined });
  s = flowReducer(s, { type: "SELECT", candidate: candA });
  s = flowReducer(s, { type: "GENERATE_START" });
  assert.equal(s.phase, "generating");
  s = flowReducer(s, { type: "GENERATE_ERROR", message: "生成失敗" });
  assert.equal(s.phase, "select", "生成失敗は選択フェーズへ戻す");
  assert.equal(s.error, "生成失敗");
  assert.equal(s.selected, candA, "失敗後も選択は保持（再生成可）");
});

test("契約: 候補選択で正しい候補が次フェーズに渡る", () => {
  let s = flowReducer(initialFlowState, { type: "SEARCH_START" });
  s = flowReducer(s, { type: "SEARCH_SUCCESS", candidates: [candA, candB], reason: undefined });
  // 一度Aを選び、Bに選び直す
  s = flowReducer(s, { type: "SELECT", candidate: candA });
  s = flowReducer(s, { type: "SELECT", candidate: candB });
  assert.equal(s.selected, candB);
  s = flowReducer(s, { type: "GENERATE_START" });
  // generate に渡るのは最後に選んだ候補
  assert.equal(s.selected?.url, candB.url);
});

test("ガード: 未選択では GENERATE_START で遷移しない", () => {
  let s = flowReducer(initialFlowState, { type: "SEARCH_START" });
  s = flowReducer(s, { type: "SEARCH_SUCCESS", candidates: [candA], reason: undefined });
  // selected は null のまま
  const next = flowReducer(s, { type: "GENERATE_START" });
  assert.equal(next.phase, "select", "未選択なら generating に進まない");
});

test("ガード: select/generating 以外での SELECT は無視", () => {
  // input フェーズで SELECT しても選択されない
  const s = flowReducer(initialFlowState, { type: "SELECT", candidate: candA });
  assert.equal(s.selected, null);
  assert.equal(s.phase, "input");
});

test("SEARCH_SUCCESS: 0件でも select へ（reason 付き）", () => {
  let s = flowReducer(initialFlowState, { type: "SEARCH_START" });
  s = flowReducer(s, { type: "SEARCH_SUCCESS", candidates: [], reason: "候補なし" });
  assert.equal(s.phase, "select");
  assert.equal(s.candidates.length, 0);
  assert.equal(s.searchReason, "候補なし");
});

test("RESET: 初期状態に戻る", () => {
  let s = flowReducer(initialFlowState, { type: "SEARCH_START" });
  s = flowReducer(s, { type: "SEARCH_SUCCESS", candidates: [candA], reason: undefined });
  s = flowReducer(s, { type: "SELECT", candidate: candA });
  s = flowReducer(s, { type: "GENERATE_SUCCESS", result: fakeResult });
  const reset = flowReducer(s, { type: "RESET" });
  assert.deepEqual(reset, initialFlowState);
});
