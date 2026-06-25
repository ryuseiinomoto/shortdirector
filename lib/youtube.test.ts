import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSearchQuery,
  parseISO8601DurationToSec,
  sanitizeQuery,
  selectCandidates,
  SHORTS_MAX_SEC,
  toCandidate,
  MAX_QUERY_LEN,
} from "./youtube.ts";

test("parseISO8601DurationToSec: 分秒/時分秒/秒のみ/不正", () => {
  assert.equal(parseISO8601DurationToSec("PT1M15S"), 75);
  assert.equal(parseISO8601DurationToSec("PT45S"), 45);
  assert.equal(parseISO8601DurationToSec("PT1H2M3S"), 3723);
  assert.equal(parseISO8601DurationToSec("PT2M"), 120);
  assert.equal(parseISO8601DurationToSec(""), 0);
  assert.equal(parseISO8601DurationToSec("garbage"), 0);
  assert.equal(parseISO8601DurationToSec(undefined), 0);
});

test("sanitizeQuery: 制御文字除去・空白畳み・トリム", () => {
  assert.equal(sanitizeQuery("  新NISA\nの\t落とし穴  "), "新NISA の 落とし穴");
  // ゼロ幅スペース(U+200B)等の書式文字を除去
  assert.equal(sanitizeQuery("投資​術"), "投資 術");
  assert.equal(sanitizeQuery("   "), "");
});

test("sanitizeQuery: 120字上限", () => {
  const long = "あ".repeat(200);
  assert.equal(sanitizeQuery(long).length, MAX_QUERY_LEN);
});

test("buildSearchQuery: ジャンル固定プレフィックス", () => {
  assert.equal(buildSearchQuery("新NISA"), "お金 投資 新NISA");
});

test("selectCandidates: 75s超を除外し再生数降順で上位5本", () => {
  const mk = (id: string, dur: string, views: string) => ({
    id,
    snippet: { title: `t${id}`, channelTitle: `c${id}`, thumbnails: { medium: { url: `u${id}` } } },
    contentDetails: { duration: dur },
    statistics: { viewCount: views },
  });
  const items = [
    mk("a", "PT80S", "999999"), // 80s → 除外
    mk("b", "PT60S", "100"),
    mk("c", "PT30S", "5000"),
    mk("d", "PT75S", "3000"), // 境界75s → 含む
    mk("e", "PT10S", "1"),
    mk("f", "PT0S", "9999"), // 0s → 除外（取得失敗扱い）
    mk("g", "PT20S", "8000"),
    mk("h", "PT20S", "7000"),
  ];
  const got = selectCandidates(items);
  assert.deepEqual(
    got.map((c) => c.videoId),
    ["g", "h", "c", "d", "b"], // 8000,7000,5000,3000,100（aとfは除外、上位5本）
  );
  assert.ok(got.every((c) => c.durationSec <= SHORTS_MAX_SEC && c.durationSec > 0));
});

test("toCandidate: URL/サムネ/欠落フィールドの整形", () => {
  const c = toCandidate({
    id: "xyz",
    snippet: { title: "T", channelTitle: "C", thumbnails: { high: { url: "H" } } },
    contentDetails: { duration: "PT30S" },
    statistics: { viewCount: "1234" },
  });
  assert.ok(c);
  assert.equal(c.url, "https://www.youtube.com/shorts/xyz");
  assert.equal(c.thumbnail, "H");
  assert.equal(c.views, 1234);
  assert.equal(c.durationSec, 30);
  // id 欠落は null
  assert.equal(toCandidate({ snippet: {} }), null);
  // viewCount 欠落は 0
  assert.equal(toCandidate({ id: "z", contentDetails: { duration: "PT5S" } })?.views, 0);
});
