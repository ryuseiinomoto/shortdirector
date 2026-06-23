import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Langfuse/OpenTelemetry はサーバー専用。バンドルせず Node の require に委ねる
  // （Turbopack での計装系パッケージの取り込み不具合を避ける）。
  serverExternalPackages: [
    "@langfuse/otel",
    "@langfuse/tracing",
    "@langfuse/core",
    "@opentelemetry/sdk-trace-node",
  ],
};

export default nextConfig;
