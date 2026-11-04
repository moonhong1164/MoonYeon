// node --test tests/monthly.test.js — 이달의 운세
const test = require("node:test");
const assert = require("node:assert");
const S = require("../site/saju.js");
const M = require("../site/monthly.js");

test("임수 일간 · 2026년 11월(기해) → 정관 · 인정받는 달, 행운은 금 기운", () => {
  const r = S.calculate({ year: 1994, month: 7, day: 25, hour: 17, minute: 30 });
  const m = M.build(r, S, 2026, 11, "윤슬기");
  assert.strictEqual(m.pillarLabel, "기해");
  assert.strictEqual(m.god, "정관");
  assert.strictEqual(m.theme, "인정받는 달");
  assert.strictEqual(m.title, "넓은 바다 같은 윤슬기님의 11월");
  assert.deepStrictEqual([m.luck.color, m.luck.dir, m.luck.num], ["화이트·골드", "서쪽", "9"]);
});

test("모든 일간 × 12달에서 풀이가 빠짐없이 만들어짐", () => {
  for (let d = 1; d <= 10; d++) {
    const r = S.calculate({ year: 2000, month: 1, day: d, timeUnknown: true });
    for (let mo = 1; mo <= 12; mo++) {
      const m = M.build(r, S, 2027, mo, "");
      for (const k of ["title", "theme", "overall", "money", "love", "work", "health", "quote"]) assert.ok(m[k], `${k} 비어 있음`);
      assert.strictEqual(m.cautions.length, 3);
      assert.ok(!m.overall.includes("{name}"));
    }
  }
  assert.strictEqual(Object.keys(M.GODS).length, 10);
});
