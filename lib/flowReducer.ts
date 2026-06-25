import type { Candidate, GenerateResponse } from "@/lib/types";

/**
 * フルフロー（#10）のフェーズ遷移を担う純粋関数 reducer。
 *
 * UI（`components/FullFlow.tsx`）から状態遷移ロジックだけを切り出し、
 * `node --test` で契約テストできるようにする（M2 中核のリグレッション防止）。
 * 非同期 fetch 自体はコンポーネント側に残し、ここは「入力 → 結果」の
 * 状態機械（input → searching → select → generating → result）のみを扱う。
 */
export type Phase =
  | "input"
  | "searching"
  | "select"
  | "generating"
  | "result";

export interface FlowState {
  phase: Phase;
  candidates: Candidate[];
  searchReason?: string;
  /** 選択中の参考候補。generate の `videoUrl` 元になる。 */
  selected: Candidate | null;
  result: GenerateResponse | null;
  error: string | null;
}

export const initialFlowState: FlowState = {
  phase: "input",
  candidates: [],
  searchReason: undefined,
  selected: null,
  result: null,
  error: null,
};

export type FlowAction =
  | { type: "SEARCH_START" }
  | { type: "SEARCH_SUCCESS"; candidates: Candidate[]; reason?: string }
  | { type: "SEARCH_ERROR"; message: string }
  | { type: "SELECT"; candidate: Candidate }
  | { type: "GENERATE_START" }
  | { type: "GENERATE_SUCCESS"; result: GenerateResponse }
  | { type: "GENERATE_ERROR"; message: string }
  | { type: "RESET" };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SEARCH_START":
      // 検索開始。エラーは消す。
      return { ...state, phase: "searching", error: null };

    case "SEARCH_SUCCESS":
      // 候補を受け取り選択フェーズへ。前回の選択はリセット。
      return {
        ...state,
        phase: "select",
        candidates: action.candidates,
        searchReason: action.reason,
        selected: null,
      };

    case "SEARCH_ERROR":
      // 検索失敗 → 入力フェーズへ戻す（再入力で再試行）。
      return { ...state, phase: "input", error: action.message };

    case "SELECT":
      // 候補選択は select / generating 中のみ有効（result 等での誤操作を無視）。
      if (state.phase !== "select" && state.phase !== "generating") {
        return state;
      }
      return { ...state, selected: action.candidate };

    case "GENERATE_START":
      // 候補未選択なら遷移しない（生成は選択が前提）。
      if (!state.selected || state.phase !== "select") {
        return state;
      }
      return { ...state, phase: "generating", error: null };

    case "GENERATE_SUCCESS":
      return { ...state, phase: "result", result: action.result };

    case "GENERATE_ERROR":
      // 生成失敗 → 選択フェーズへ戻す（別候補で再試行 or 同候補で再生成）。
      return { ...state, phase: "select", error: action.message };

    case "RESET":
      return initialFlowState;

    default:
      return state;
  }
}
