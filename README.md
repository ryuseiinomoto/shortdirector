# ShortDirector

YouTubeショート専門の「構成・演出ガイド（構成シート）」をAIが生成するツール。
作りたいショートのイメージを入力すると、最新トレンドの人気ショートを **Gemini が実際に解析**し、撮影・演出のタイムライン（構成シート）を生成します。

> 28卒就活ポートフォリオ作品 / MVP開発中

## 差別化
- **自動トレンド発見**（YouTube Data API）
- **実動画のマルチモーダル解析**（Gemini が実際に視聴）
- **ユーザートピックに合わせた"新規"撮影・演出シート生成**
- **日本語 × お金/投資ニッチ**

## 技術スタック
Next.js (App Router, TypeScript) / Vercel / Gemini API / YouTube Data API / Langfuse

## 状態
開発中（M1 Geminiコア）。実現性PoCは `poc/` に同梱（`node poc/poc.mjs`）。
