/*
 * 만세력 계산 (외부 라이브러리 없음)
 * - 연주: 입춘(태양 황경 315°) 기준으로 해가 바뀜
 * - 월주: 12절기(황경 315°부터 30°마다) 기준
 * - 일주: 율리우스일 기준 60갑자 순환
 * - 시주: 일간 + 시지 (23시부터 다음 날 자시)
 * 태양 황경은 Meeus의 저정밀 공식(오차 약 0.01°, 시간으로 15분 안팎)을 쓴다.
 * 절기 경계 몇십 분 안에 태어난 경우는 결과가 달라질 수 있어 표시해 준다.
 */
(function (root) {
  "use strict";

  const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const STEMS_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const BRANCHES_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
  const ELEMENTS = ["목", "화", "토", "금", "수"];
  const ELEMENTS_HANJA = ["木", "火", "土", "金", "水"];
  const STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  const HOUR_NAMES = ["자시", "축시", "인시", "묘시", "진시", "사시", "오시", "미시", "신시", "유시", "술시", "해시"];

  const DAY_MS = 86400000;
  const KST_OFFSET_H = 9;
  const SEOUL_LONGITUDE = 127.0; // 진태양시 보정용 (서울 동경 127°)

  // 한국 서머타임(일광절약시간): 그 시기 시계는 1시간 빨랐다.
  const KOREA_DST = [
    ["1987-05-10T02:00", "1987-10-11T03:00"],
    ["1988-05-08T02:00", "1988-10-09T03:00"],
  ];

  const mod = (a, n) => ((a % n) + n) % n;
  const rad = (d) => (d * Math.PI) / 180;

  function julianDay(utcMs) {
    return utcMs / DAY_MS + 2440587.5;
  }

  /** 주어진 순간(UTC ms)의 태양 겉보기 황경(도). */
  function solarLongitude(utcMs) {
    const T = (julianDay(utcMs) - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M)) +
      (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M)) +
      0.000289 * Math.sin(rad(3 * M));
    const omega = 125.04 - 1934.136 * T;
    return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega)), 360);
  }

  /** 태양 황경이 target(도)이 되는 순간을 guess 근처에서 찾는다 (UTC ms). */
  function findSolarTerm(target, guessMs) {
    let t = guessMs;
    for (let i = 0; i < 50; i++) {
      const diff = mod(target - solarLongitude(t) + 180, 360) - 180;
      t += (diff / 360) * 365.2422 * DAY_MS;
      if (Math.abs(diff) < 1e-6) break;
    }
    return t;
  }

  /** 그해 입춘 순간 (UTC ms). */
  function ipchun(year) {
    return findSolarTerm(315, Date.UTC(year, 1, 4));
  }

  const TERM_NAMES = ["입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설", "소한"];

  function inKoreaDst(y, mo, d, h, mi) {
    const s = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    return KOREA_DST.some(([a, b]) => s >= a && s < b);
  }

  function pillar(index60) {
    const s = mod(index60, 10);
    const b = mod(index60, 12);
    return { stem: s, branch: b };
  }

  function stemBranchIndex(stem, branch) {
    // 천간·지지 조합 → 60갑자 순번
    for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return -1;
  }

  /**
   * 사주 팔자 계산.
   * @param {object} input {year, month, day, hour, minute, timeUnknown, solarTime(bool, 기본 true)}
   *   시각은 한국 표준시(KST) 기준 시계 시각.
   */
  function calculate(input) {
    const { year, month, day } = input;
    const timeUnknown = !!input.timeUnknown;
    const hour = timeUnknown ? 12 : input.hour;
    const minute = timeUnknown ? 0 : input.minute || 0;
    const useSolarTime = input.solarTime !== false;

    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      throw new Error("없는 날짜예요. 생년월일을 다시 확인해 주세요.");
    }
    if (year < 1900 || year > 2100) throw new Error("1900~2100년 사이만 계산할 수 있어요.");

    const dst = !timeUnknown && inKoreaDst(year, month, day, hour, minute);
    // 실제 순간 (UTC)
    const utcMs = Date.UTC(year, month - 1, day, hour - KST_OFFSET_H - (dst ? 1 : 0), minute);

    // ── 연주: 입춘 기준
    const sajuYear = utcMs < ipchun(year) ? year - 1 : year;
    const yearIdx = mod(sajuYear - 4, 60);
    const yearP = pillar(yearIdx);

    // ── 월주: 절기 기준 (인월 = 황경 315°~345°)
    const lon = solarLongitude(utcMs);
    const monthOrder = Math.floor(mod(lon - 315, 360) / 30); // 0 = 인월
    const monthBranch = mod(2 + monthOrder, 12);
    const monthStem = mod(yearP.stem * 2 + 2 + monthOrder, 10);
    const monthP = { stem: monthStem, branch: monthBranch };

    // 절기 경계와 가까우면 알려 준다
    const termTarget = mod(315 + monthOrder * 30, 360);
    const nextTarget = mod(termTarget + 30, 360);
    const prevTerm = findSolarTerm(termTarget, utcMs - 15 * DAY_MS);
    const nextTerm = findSolarTerm(nextTarget, utcMs + 15 * DAY_MS);
    const nearTermMin = Math.min(Math.abs(utcMs - prevTerm), Math.abs(nextTerm - utcMs)) / 60000;

    // ── 일주·시주: 진태양시(서울 경도) 또는 표준시
    const offsetH = useSolarTime ? SEOUL_LONGITUDE / 15 : KST_OFFSET_H;
    const local = new Date(utcMs + offsetH * 3600000);
    let lh = local.getUTCHours() + local.getUTCMinutes() / 60;
    let dayStartMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    if (lh >= 23) dayStartMs += DAY_MS; // 23시 이후는 다음 날 자시
    const jdn = Math.floor(julianDay(dayStartMs) + 0.5);
    const dayIdx = mod(jdn + 49, 60);
    const dayP = pillar(dayIdx);

    let hourP = null;
    if (!timeUnknown) {
      const hb = mod(Math.floor((lh + 1) / 2), 12);
      hourP = { stem: mod(dayP.stem * 2 + hb, 10), branch: hb };
    }

    const pillars = { year: yearP, month: monthP, day: dayP, hour: hourP };

    // ── 오행 분포
    const counts = [0, 0, 0, 0, 0];
    for (const p of Object.values(pillars)) {
      if (!p) continue;
      counts[STEM_ELEMENT[p.stem]]++;
      counts[BRANCH_ELEMENT[p.branch]]++;
    }

    // ── 대운: 양남음녀 순행, 음남양녀 역행. 절기까지 날수 ÷ 3 = 대운수
    let daewoon = null;
    if (input.gender === "남" || input.gender === "여") {
      const yangYear = yearP.stem % 2 === 0;
      const forward = (input.gender === "남") === yangYear;
      const days = (forward ? nextTerm - utcMs : utcMs - prevTerm) / DAY_MS;
      const startAge = Math.max(1, Math.round(days / 3));
      const monthIdx = stemBranchIndex(monthP.stem, monthP.branch);
      const list = [];
      for (let i = 1; i <= 9; i++) {
        const p = pillar(monthIdx + (forward ? i : -i));
        const age = startAge + (i - 1) * 10;
        list.push({ ...p, age, fromYear: year + age - 1 });
      }
      daewoon = { forward, startAge, list };
    }

    return {
      daewoon,
      input: { year, month, day, hour: timeUnknown ? null : hour, minute: timeUnknown ? null : minute, timeUnknown, useSolarTime, dst },
      pillars,
      dayMaster: dayP.stem,
      dayMasterElement: STEM_ELEMENT[dayP.stem],
      animal: ANIMALS[yearP.branch],
      sajuYear,
      counts,
      solarLongitude: lon,
      monthTermName: TERM_NAMES[monthOrder],
      nearTermBoundary: nearTermMin < 60,
      hourName: hourP ? HOUR_NAMES[hourP.branch] : null,
    };
  }

  /** 일간 오행 기준으로 다른 오행이 어떤 관계인지: 비겁·식상·재성·관성·인성 */
  function relation(dayElement, otherElement) {
    const d = mod(otherElement - dayElement, 5);
    return ["비겁", "식상", "재성", "관성", "인성"][d];
  }

  // 지지 속 본기(가장 큰 기운) 천간: 子癸 丑己 寅甲 卯乙 辰戊 巳丙 午丁 未己 申庚 酉辛 戌戊 亥壬
  const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
  const TEN_GODS = [["비견", "겁재"], ["식신", "상관"], ["편재", "정재"], ["편관", "정관"], ["편인", "정인"]];

  /** 일간 기준 다른 천간의 십신 */
  function tenGod(dayStem, otherStem) {
    const d = mod(STEM_ELEMENT[otherStem] - STEM_ELEMENT[dayStem], 5);
    return TEN_GODS[d][dayStem % 2 === otherStem % 2 ? 0 : 1];
  }

  /** 일간 기준 지지의 십신 (본기 기준) */
  function tenGodOfBranch(dayStem, branch) {
    return tenGod(dayStem, BRANCH_MAIN_STEM[branch]);
  }

  function yearPillarOf(year) {
    return pillar(mod(year - 4, 60));
  }

  function label(p, hanja) {
    if (!p) return hanja ? "？" : "모름";
    return hanja ? STEMS_HANJA[p.stem] + BRANCHES_HANJA[p.branch] : STEMS[p.stem] + BRANCHES[p.branch];
  }

  const Saju = {
    STEMS, STEMS_HANJA, BRANCHES, BRANCHES_HANJA, ANIMALS, ELEMENTS, ELEMENTS_HANJA,
    STEM_ELEMENT, BRANCH_ELEMENT, HOUR_NAMES,
    calculate, relation, tenGod, tenGodOfBranch, BRANCH_MAIN_STEM, yearPillarOf, label, solarLongitude, findSolarTerm, ipchun, stemBranchIndex,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Saju;
  else root.Saju = Saju;
})(typeof window !== "undefined" ? window : globalThis);
