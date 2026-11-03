// node --test tests/lunar.test.js — 음력 → 양력 변환 검증 (설날·추석·윤달)
const test = require("node:test");
const assert = require("node:assert");
const L = require("../site/lunar.js");

const ymd = (r) => `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;

test("설날 (음력 1월 1일)", () => {
  const cases = {
    1994: "1994-02-10",
    2000: "2000-02-05",
    2020: "2020-01-25",
    2023: "2023-01-22",
    2024: "2024-02-10",
    2025: "2025-01-29",
    2026: "2026-02-17",
  };
  for (const [y, want] of Object.entries(cases)) assert.strictEqual(ymd(L.lunarToSolar(Number(y), 1, 1)), want, `설날 ${y}`);
});

test("추석 (음력 8월 15일)", () => {
  assert.strictEqual(ymd(L.lunarToSolar(1995, 8, 15)), "1995-09-09");
  assert.strictEqual(ymd(L.lunarToSolar(2023, 8, 15)), "2023-09-29");
  assert.strictEqual(ymd(L.lunarToSolar(2024, 8, 15)), "2024-09-17");
  assert.strictEqual(ymd(L.lunarToSolar(2025, 8, 15)), "2025-10-06");
});

test("윤달", () => {
  assert.strictEqual(L.leapMonthOf(2020), 4);
  assert.strictEqual(L.leapMonthOf(2023), 2);
  assert.strictEqual(L.leapMonthOf(2024), 0);
  assert.strictEqual(ymd(L.lunarToSolar(2020, 4, 1, true)), "2020-05-23");
  assert.strictEqual(ymd(L.lunarToSolar(2023, 2, 1, true)), "2023-03-22");
  assert.throws(() => L.lunarToSolar(2024, 3, 1, true));
});

test("말일 검사", () => {
  assert.throws(() => L.lunarToSolar(2024, 1, 31));
});
