// ShortDirector PoC — Gemini 1コールで「動画視聴→型抽出→構成シート生成」を検証
// PoC-1: Gemini が YouTube ショートURLを入力に取れるか
// PoC-2: responseSchema で {kata, sheet[]} が"使える"品質で返るか
// PoC-3: レイテンシ・トークン・概算コスト
// 依存ゼロ（Node18+ の native fetch）。APIキーは x-auto-post/.env から実行時ロード（値は出力しない）。

import { readFileSync } from 'node:fs';

const ENV_PATH = '/Users/ryusei_inomoto/claude company/x-auto-post/.env';
const VIDEO_URL = 'https://www.youtube.com/shorts/hzeBNipY0YI'; // お金/投資ショート（新NISA/FIRE）
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']; // 404なら次へ

// --- サンプルのユーザー入力（本番フォームの4フィールド相当） ---
const USER_INPUT = {
  tsutaetai: '新NISAの落とし穴',
  shaku: 30,            // 秒
  target: '投資初心者',
  mokuteki: '視聴維持率を最大化',
};

// --- キーを .env から取得（値は決して出力しない） ---
function loadEnvVar(path, name) {
  const txt = readFileSync(path, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === name) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return v;
    }
  }
  return null;
}
const API_KEY = process.env.GEMINI_API_KEY || loadEnvVar(ENV_PATH, 'GEMINI_API_KEY');
if (!API_KEY) { console.error('❌ GEMINI_API_KEY が見つかりません'); process.exit(1); }

// --- 出力スキーマ（ASCIIキー。型=kata） ---
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    reference: {
      type: 'OBJECT',
      properties: { title: { type: 'STRING' }, hook_observed: { type: 'STRING' } },
    },
    kata: {
      type: 'OBJECT',
      properties: {
        hook_type: { type: 'STRING' },
        pacing: { type: 'STRING' },
        tele_style: { type: 'STRING' },
        structure_summary: { type: 'STRING' },
      },
      required: ['hook_type', 'pacing', 'tele_style', 'structure_summary'],
    },
    sheet: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          time: { type: 'STRING' },
          block: { type: 'STRING' },
          purpose: { type: 'STRING' },
          shoot: { type: 'STRING' },
          camera: { type: 'STRING' },
          tele: { type: 'STRING' },
          retention: { type: 'STRING' },
          script_example: { type: 'STRING' },
        },
        required: ['time', 'block', 'purpose', 'shoot', 'camera', 'tele', 'retention'],
      },
    },
  },
  required: ['kata', 'sheet'],
};

const PROMPT = `あなたはYouTubeショート専門の構成・演出ディレクターです。

【ステップ1】添付した参考ショート動画を実際に視聴し、その「型」を抽出してください:
- フックの型（最初の1-2秒で何をしているか）
- テンポ / カット割り
- テロップ・演出の型
- 全体構成の要約

【ステップ2】抽出した型を踏まえ、下記ユーザーの題材で「実写・顔出しトークで撮るための構成シート」を作成してください:
- 伝えたいこと: ${USER_INPUT.tsutaetai}
- 尺: ${USER_INPUT.shaku}秒
- ターゲット: ${USER_INPUT.target}
- 目的: ${USER_INPUT.mokuteki}

【構成シートのルール】
- 行は意味ブロック単位（フック/導入/本編/オチ/CTA など）。各行に秒範囲(time)を付ける。可変長。${USER_INPUT.shaku}秒なら5-6行が目安。
- 各行: time, block, purpose(狙い), shoot(撮影内容=話す内容の要旨), camera(カメラワーク), tele(テロップ・演出), retention(維持率の仕掛け)
- script_example(掴みのセリフ例)は「フック」ブロックにだけ入れる。他の行は空文字。
- コンプラ厳守: 具体的な利回り・断定・誇大表現・投資助言は書かない。フックのセリフ例も「問いかけ／一般論」ベースに限定。

出力はJSONのみ。`;

async function callModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ file_data: { file_uri: VIDEO_URL } }, { text: PROMPT }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.7 },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    });
    const latencyMs = Date.now() - t0;
    const data = await res.json();
    return { ok: res.ok, status: res.status, latencyMs, data };
  } finally { clearTimeout(timer); }
}

console.log('=== ShortDirector PoC ===');
console.log('参考動画:', VIDEO_URL);
console.log('ユーザー入力:', JSON.stringify(USER_INPUT, null, 0));
console.log('');

let result = null, usedModel = null;
for (const model of MODELS) {
  process.stdout.write(`→ ${model} で実行中... `);
  const r = await callModel(model);
  if (r.ok) { console.log(`OK (${(r.latencyMs/1000).toFixed(1)}s)`); result = r; usedModel = model; break; }
  const errMsg = r.data?.error?.message || JSON.stringify(r.data).slice(0, 300);
  console.log(`NG [${r.status}] ${errMsg}`);
  if (r.status !== 404 && !/not found|not supported|unsupported/i.test(errMsg)) {
    // モデル名以外の失敗（動画入力拒否など）はループせず即報告
    result = r; usedModel = model; break;
  }
}

console.log('\n================ 結果 ================');
if (!result) { console.error('❌ 全モデルで失敗'); process.exit(1); }

// PoC-1
console.log(`\n[PoC-1] 動画入力(YouTube URL): ${result.ok ? '✅ 取り込み成功' : '❌ 失敗'}  model=${usedModel}`);
if (!result.ok) {
  console.log('  エラー詳細:', JSON.stringify(result.data?.error || result.data, null, 2).slice(0, 1500));
  console.log('  → YouTube URL直が不可なら、ダウンロード→File APIアップロード方式を次に試す。');
  process.exit(0);
}

// PoC-2
const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
let parsed = null;
try { parsed = JSON.parse(text); } catch (e) { console.log('[PoC-2] ⚠️ JSONパース失敗:', e.message); }
console.log(`\n[PoC-2] responseSchema出力: ${parsed ? '✅ 妥当なJSON' : '❌ パース不可'}`);
if (parsed) {
  console.log('\n--- 抽出した型(kata) ---');
  console.log(JSON.stringify(parsed.kata, null, 2));
  console.log(`\n--- 構成シート (${parsed.sheet?.length ?? 0}行) ---`);
  for (const row of (parsed.sheet || [])) {
    console.log(`\n[${row.time}] ${row.block} — ${row.purpose}`);
    console.log(`  撮影: ${row.shoot}`);
    console.log(`  カメラ: ${row.camera}`);
    console.log(`  テロップ: ${row.tele}`);
    console.log(`  維持率: ${row.retention}`);
    if (row.script_example) console.log(`  セリフ例: ${row.script_example}`);
  }
}

// PoC-3
const u = result.data?.usageMetadata || {};
const inTok = u.promptTokenCount ?? 0, outTok = u.candidatesTokenCount ?? 0, total = u.totalTokenCount ?? 0;
// ※ 概算レートは仮（2.5 Flash 目安）。実コストは要 最新価格確認。
const RATE_IN = 0.30 / 1e6, RATE_OUT = 2.50 / 1e6;
const estUsd = inTok * RATE_IN + outTok * RATE_OUT;
console.log('\n[PoC-3] レイテンシ・コスト');
console.log(`  レイテンシ: ${(result.latencyMs/1000).toFixed(1)}s`);
console.log(`  トークン: in=${inTok} / out=${outTok} / total=${total}`);
console.log(`  概算コスト: $${estUsd.toFixed(5)} /回（※仮レート $0.30/1M in, $2.50/1M out・要価格確認）`);
console.log('\n=== PoC 完了 ===');
