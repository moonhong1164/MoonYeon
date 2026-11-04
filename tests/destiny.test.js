// node --test tests/destiny.test.js — '운명의 상대' 맛보기
const test = require("node:test");
const assert = require("node:assert");
const S = require("../site/saju.js");
const D = require("../site/destiny.js");

test("계미일주 여성: 배우자 자리 미(토), 배우자 별 관성(토), 2027 정미년은 별+합", () => {
  const r = S.calculate({ year: 1995, month: 8, day: 20, hour: 7, minute: 30 });
  const d = D.build(r, S, "여", 2026);
  assert.strictEqual(d.palace, "미(未) · 토");
  assert.strictEqual(d.star, "관성 · 토(土)");
  // 2026 병오: 오(午)가 미(未)와 육합 / 2027 정미: 미(未) 토 = 관성
  assert.deepStrictEqual(d.years.map((y) => y.year).slice(0, 2), [2026, 2027]);
});

test("남성은 재성을 배우자 별로 본다", () => {
  const r = S.calculate({ year: 1993, month: 3, day: 14, hour: 21, minute: 0 }); // 갑오일주
  const d = D.build(r, S, "남", 2026);
  assert.strictEqual(d.star, "재성 · 토(土)");
  assert.ok(d.years.length <= 3);
});
