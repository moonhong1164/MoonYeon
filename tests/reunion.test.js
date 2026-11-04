// node --test tests/reunion.test.js — '재회운세' 맛보기
const test = require("node:test");
const assert = require("node:assert");
const S = require("../site/saju.js");
const R = require("../site/reunion.js");

const me = S.calculate({ year: 1995, month: 8, day: 20, timeUnknown: true }); // 계미일주 (水)
const ex = S.calculate({ year: 1993, month: 3, day: 14, timeUnknown: true }); // 갑오일주 (木)

test("두 사람의 결: 계수→갑목은 내가 낳는 관계, 미·오는 육합", () => {
  const r = R.build(me, S, "여", ex, 2026, 11);
  assert.strictEqual(r.pair.stem.title, "내가 더 많이 주던 사이");
  assert.strictEqual(r.pair.palace.title, "배우자 자리끼리 짝을 이뤄요");
});

test("다시 닿기 쉬운 달: 최대 3개, 시간 순, 이유 포함", () => {
  const r = R.build(me, S, "여", ex, 2026, 11);
  assert.ok(r.months.length >= 1 && r.months.length <= 3);
  for (let i = 1; i < r.months.length; i++) {
    const a = r.months[i - 1], b = r.months[i];
    assert.ok(a.year * 12 + a.month < b.year * 12 + b.month);
  }
  // 미(未)와 짝인 오(午)월 = 2027년 6월(병오월 아님: 2027 정미년의 오월은 병오) 이 포함되어야 함
  assert.ok(r.months.some((m) => m.year === 2027 && m.month === 6), JSON.stringify(r.months));
  assert.ok(r.months.every((m) => m.reasons.length));
});

test("그 사람 생일 없이도 동작", () => {
  const r = R.build(me, S, "남", null, 2026, 11);
  assert.strictEqual(r.pair, null);
  assert.ok(r.months.length <= 3);
});
