/**
 * Next.js instrumentation hook。プロセス起動時に1度だけ呼ばれる。
 * nodejs ランタイムでのみ Langfuse(OpenTelemetry) を初期化する。
 * キー未設定なら `initObservability()` 側で no-op になる（graceful degradation）。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { initObservability } = await import("@/lib/observability");
  initObservability();
}
