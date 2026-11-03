/*
 * 한국 음력 → 양력 변환 (외부 라이브러리 없음)
 * - 매달 1일 = 한국 시간(UTC+9) 기준 합삭(새달)이 있는 날
 * - 동지가 든 달 = 11월, 동지에서 다음 동지 사이에 달이 13개면 중기(中氣)가 없는 첫 달이 윤달
 * 합삭 시각은 Meeus 공식(오차 수 분), 절기는 saju.js 의 태양 황경을 쓴다.
 */
(function (root) {
  "use strict";
  const S = root.Saju || (typeof require !== "undefined" ? require("./saju.js") : null);

  const DAY_MS = 86400000;
  const KST_MS = 9 * 3600000;
  const rad = (d) => (d * Math.PI) / 180;

  /** k번째 합삭의 순간 (UTC ms). k=0 은 2000년 1월 6일 무렵. */
  function newMoon(k) {
    const T = k / 1236.85;
    let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T ** 3);
    const Mp = rad(201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4);
    const F = rad(160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4);
    const O = rad(124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3);
    const s = Math.sin;
    jde +=
      -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F) +
      0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M) -
      0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M) -
      0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) -
      0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M) +
      0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F) +
      0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F) + 0.00003 * s(Mp - M + 2 * F) -
      0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
    const deltaT = 70 / 86400; // TT→UT 근사
    return (jde - deltaT - 2440587.5) * DAY_MS;
  }

  /** 한국 시간 기준 날짜(그날 0시를 UTC ms로 표현한 '날짜 번호') */
  const kstDay = (utcMs) => Math.floor((utcMs + KST_MS) / DAY_MS);
  /** 날짜 번호 → 그날 한국 0시의 실제 순간(UTC ms) */
  const dayStartUtc = (day) => day * DAY_MS - KST_MS;

  /** 날짜 번호 day 이하에서 가장 늦은 합삭의 k */
  function kAtOrBefore(day) {
    let k = Math.floor((dayStartUtc(day) - Date.UTC(2000, 0, 6)) / (29.530588861 * DAY_MS)) + 1;
    while (kstDay(newMoon(k)) > day) k--;
    while (kstDay(newMoon(k + 1)) <= day) k++;
    return k;
  }

  /** 그해 동지(황경 270°)가 든 날의 날짜 번호 */
  function dongjiDay(year) {
    return kstDay(S.findSolarTerm(270, Date.UTC(year, 11, 21)));
  }

  /** [start, end) 날짜 사이에 중기(황경 30°의 배수)가 있는지 */
  function hasZhongqi(startDay, endDay) {
    const a = S.solarLongitude(dayStartUtc(startDay));
    const b = S.solarLongitude(dayStartUtc(endDay));
    return Math.floor(a / 30) !== Math.floor(b / 30);
  }

  /**
   * year-1년 동지가 든 달(11월)부터 year년 동지가 든 달 직전까지의 달 목록.
   * 각 달: {year, month, leap, startDay, days}
   */
  function suiMonths(year) {
    const k0 = kAtOrBefore(dongjiDay(year - 1));
    const k1 = kAtOrBefore(dongjiDay(year));
    const starts = [];
    for (let k = k0; k <= k1; k++) starts.push(kstDay(newMoon(k)));
    const count = starts.length - 1; // 12 또는 13
    let leapIndex = -1;
    if (count === 13) {
      for (let i = 0; i < 13; i++) {
        if (!hasZhongqi(starts[i], starts[i + 1])) { leapIndex = i; break; }
      }
    }
    const months = [];
    let num = 11;
    let y = year - 1;
    for (let i = 0; i < count; i++) {
      const leap = i === leapIndex;
      if (i > 0 && !leap) {
        num++;
        if (num === 13) { num = 1; y = year; }
      }
      months.push({ year: y, month: num, leap, startDay: starts[i], days: starts[i + 1] - starts[i] });
    }
    return months;
  }

  /** 음력 (년, 월, 일, 윤달 여부) → 양력 {year, month, day} */
  function lunarToSolar(year, month, day, leap = false) {
    if (year < 1901 || year > 2099) throw new Error("음력은 1901~2099년만 바꿀 수 있어요.");
    const all = [...suiMonths(year), ...suiMonths(year + 1)];
    const m = all.find((x) => x.year === year && x.month === month && x.leap === !!leap);
    if (!m) throw new Error(leap ? `${year}년에는 윤${month}월이 없어요. 윤달 체크를 풀어 주세요.` : "없는 음력 날짜예요.");
    if (day < 1 || day > m.days) throw new Error(`음력 ${year}년 ${leap ? "윤" : ""}${month}월은 ${m.days}일까지 있어요.`);
    const d = new Date((m.startDay + day - 1) * DAY_MS);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }

  /** 그해의 윤달 번호 (없으면 0) */
  function leapMonthOf(year) {
    const m = [...suiMonths(year), ...suiMonths(year + 1)].find((x) => x.year === year && x.leap);
    return m ? m.month : 0;
  }

  const Lunar = { lunarToSolar, leapMonthOf, newMoon };
  if (typeof module !== "undefined" && module.exports) module.exports = Lunar;
  else root.Lunar = Lunar;
})(typeof window !== "undefined" ? window : globalThis);
