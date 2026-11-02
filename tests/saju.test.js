// node --test tests/  — 만세력 계산 검증
const test = require("node:test");
const assert = require("node:assert");
const Saju = require("../site/saju.js");

const L = (r) => [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.hour].map((p) => Saju.label(p));

test("2000-01-01 12:00 → 기묘년 병자월 무오일 무오시 (입춘 전이라 1999년 기묘)", () => {
  const r = Saju.calculate({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
  assert.deepStrictEqual(L(r), ["기묘", "병자", "무오", "무오"]);
  assert.strictEqual(r.animal, "토끼");
});

test("일주 기준점: 1900-01-01 갑술일, 2024-01-01 갑자일", () => {
  assert.strictEqual(Saju.label(Saju.calculate({ year: 1900, month: 1, day: 1, timeUnknown: true }).pillars.day), "갑술");
  assert.strictEqual(Saju.label(Saju.calculate({ year: 2024, month: 1, day: 1, timeUnknown: true }).pillars.day), "갑자");
});

test("입춘 시각 (KST): 2024-02-04 17:27 경, 2026-02-04 05:02 경 — 오차 15분 이내", () => {
  const kst = (ms) => new Date(ms + 9 * 3600000);
  const t24 = kst(Saju.ipchun(2024));
  assert.strictEqual(t24.getUTCDate(), 4);
  const min24 = t24.getUTCHours() * 60 + t24.getUTCMinutes();
  assert.ok(Math.abs(min24 - (17 * 60 + 27)) <= 15, `2024 입춘 ${t24.toISOString()}`);
  const t26 = kst(Saju.ipchun(2026));
  const min26 = t26.getUTCHours() * 60 + t26.getUTCMinutes();
  assert.ok(Math.abs(min26 - (5 * 60 + 2)) <= 15, `2026 입춘 ${t26.toISOString()}`);
});

test("입춘 전후로 띠가 바뀜", () => {
  assert.strictEqual(Saju.calculate({ year: 2024, month: 2, day: 4, hour: 12, minute: 0 }).animal, "토끼");
  assert.strictEqual(Saju.calculate({ year: 2024, month: 2, day: 4, hour: 20, minute: 0 }).animal, "용");
  assert.strictEqual(Saju.label(Saju.calculate({ year: 2024, month: 2, day: 5, timeUnknown: true }).pillars.year), "갑진");
});

test("월주: 2026-06-15는 병오년 갑오월", () => {
  const r = Saju.calculate({ year: 2026, month: 6, day: 15, hour: 10, minute: 0 });
  assert.deepStrictEqual(L(r).slice(0, 2), ["병오", "갑오"]);
});

test("시주와 23시 자시 처리, 진태양시 보정", () => {
  // 갑자일(2024-01-01) 0:40 → 보정 시 23:72… 즉 전날 해시가 아니라: 0:40-32분 = 0:08 → 자시
  const a = Saju.calculate({ year: 2024, month: 1, day: 1, hour: 0, minute: 40 });
  assert.strictEqual(Saju.label(a.pillars.hour), "갑자");
  // 23:40(보정 23:08) → 다음 날(을축일) 자시
  const b = Saju.calculate({ year: 2024, month: 1, day: 1, hour: 23, minute: 40 });
  assert.strictEqual(Saju.label(b.pillars.day), "을축");
  assert.strictEqual(Saju.label(b.pillars.hour), "병자");
  // 23:20(보정 22:48) → 같은 날 해시
  const c = Saju.calculate({ year: 2024, month: 1, day: 1, hour: 23, minute: 20 });
  assert.strictEqual(Saju.label(c.pillars.day), "갑자");
  assert.strictEqual(c.hourName, "해시");
  // 보정 끄면 23:20은 다음 날 자시
  const d = Saju.calculate({ year: 2024, month: 1, day: 1, hour: 23, minute: 20, solarTime: false });
  assert.strictEqual(Saju.label(d.pillars.day), "을축");
});

test("1988 서머타임 기간은 1시간 빼서 계산", () => {
  const r = Saju.calculate({ year: 1988, month: 7, day: 1, hour: 13, minute: 10 });
  assert.ok(r.input.dst);
  assert.strictEqual(r.hourName, "오시"); // 13:10 → 12:10 → 보정 11:38 → 오시
});

test("오행 개수 합은 8 (시간 모르면 6)", () => {
  const a = Saju.calculate({ year: 1995, month: 8, day: 20, hour: 7, minute: 30 });
  assert.strictEqual(a.counts.reduce((x, y) => x + y), 8);
  const b = Saju.calculate({ year: 1995, month: 8, day: 20, timeUnknown: true });
  assert.strictEqual(b.counts.reduce((x, y) => x + y), 6);
  assert.strictEqual(b.pillars.hour, null);
});

test("없는 날짜는 거절", () => {
  assert.throws(() => Saju.calculate({ year: 2023, month: 2, day: 29, timeUnknown: true }));
});

test("관계: 목 일간에게 화는 식상, 금은 관성", () => {
  assert.strictEqual(Saju.relation(0, 1), "식상");
  assert.strictEqual(Saju.relation(0, 3), "관성");
  assert.strictEqual(Saju.relation(0, 4), "인성");
});
