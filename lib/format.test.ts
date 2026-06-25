import test from "node:test";
import assert from "node:assert/strict";

import { formatViews, formatDuration } from "./format.ts";

test("formatViews: 万・億・カンマ・端数", () => {
  assert.equal(formatViews(1_395_310), "139.5万回");
  assert.equal(formatViews(587_085), "58.7万回");
  assert.equal(formatViews(10_000), "1万回");
  assert.equal(formatViews(9_999), "9,999回");
  assert.equal(formatViews(0), "0回");
  assert.equal(formatViews(123), "123回");
  assert.equal(formatViews(120_000_000), "1.2億回");
});

test("formatViews: 異常値は 0回", () => {
  assert.equal(formatViews(-5), "0回");
  assert.equal(formatViews(NaN), "0回");
  assert.equal(formatViews(Infinity), "0回");
});

test("formatDuration: mm:ss", () => {
  assert.equal(formatDuration(75), "1:15");
  assert.equal(formatDuration(60), "1:00");
  assert.equal(formatDuration(9), "0:09");
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(125), "2:05");
});

test("formatDuration: 異常値は 0:00", () => {
  assert.equal(formatDuration(-1), "0:00");
  assert.equal(formatDuration(NaN), "0:00");
});
