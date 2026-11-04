/*
 * '재회운세' 맛보기 — 생일(나, 그리고 알면 그 사람)로 바로 계산
 * - 두 사람의 결: 일간끼리의 생·극, 일지(배우자 자리)끼리의 합·충
 * - 다시 닿기 쉬운 달: 앞으로 12달 중, 그달 지지가 내 일지(또는 그 사람 일지)와 육합하거나
 *   그달에 내 배우자 별(여: 관성, 남: 재성)이 들어오는 달
 * 확률 숫자나 '반드시' 같은 단정은 하지 않는다.
 */
(function (root) {
  "use strict";

  const SIX_HE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  const mod = (a, n) => ((a % n) + n) % n;

  // 일간 관계 (나 기준): 0 같은 기운, 1 내가 낳음, 2 내가 다스림, 3 나를 다스림, 4 나를 낳음
  const STEM_REL = [
    { title: "친구 같던 사이", text: "두 사람은 같은 기운이라 말이 잘 통하고 편했지만, 서로 물러서지 않아 부딪히면 오래가기 쉬웠어요." },
    { title: "내가 더 많이 주던 사이", text: "내 기운이 그 사람을 키워 주는 관계예요. 챙기고 맞춰 주다 내가 먼저 지쳤을 가능성이 커요." },
    { title: "내가 이끌던 사이", text: "내가 방향을 정하고 그 사람이 따라오는 흐름이었어요. 그 사람에게는 그게 부담으로 느껴졌을 수 있어요." },
    { title: "그 사람의 기준이 강하던 사이", text: "그 사람의 기운이 나를 다잡는 관계예요. 든든했지만, 내 마음을 다 말하지 못했을 수 있어요." },
    { title: "그 사람이 품어 주던 사이", text: "그 사람의 기운이 나를 키워 주는 관계예요. 기대고 의지했던 만큼 빈자리가 크게 느껴질 거예요." },
  ];

  function pairOf(rMe, rEx, S) {
    const rel = mod(S.STEM_ELEMENT[rEx.dayMaster] - S.STEM_ELEMENT[rMe.dayMaster], 5);
    const a = rMe.pillars.day.branch, b = rEx.pillars.day.branch;
    let palace;
    if (SIX_HE[a] === b) palace = { title: "배우자 자리끼리 짝을 이뤄요", text: "끌림이 강했던 사이예요. 다시 이어질 실마리가 남아 있는 조합이에요." };
    else if (mod(a - b, 12) === 6) palace = { title: "배우자 자리끼리 부딪혀요", text: "가까울수록 부딪히던 사이예요. 다시 만난다면 '같은 싸움'을 반복하지 않을 방법이 먼저 필요해요." };
    else if (a === b) palace = { title: "배우자 자리가 같아요", text: "바라는 관계의 모양이 닮은 사이예요. 그래서 서로의 부족함도 잘 보였을 거예요." };
    else palace = { title: "배우자 자리가 서로 다른 결이에요", text: "끌림보다 '노력'으로 맞춰 가던 사이예요. 대화의 방식이 관계를 좌우해요." };
    return { stem: STEM_REL[rel], palace };
  }

  /**
   * @param rMe 내 Saju.calculate 결과, gender "여"|"남"
   * @param rEx 그 사람의 결과(없으면 null)
   * @param fromYear, fromMonth 시작 달(양력)
   */
  function build(rMe, S, gender, rEx, fromYear, fromMonth) {
    const dme = rMe.dayMasterElement;
    const starEl = gender === "남" ? (dme + 2) % 5 : (dme + 3) % 5;
    const myPalace = rMe.pillars.day.branch;
    const exPalace = rEx ? rEx.pillars.day.branch : null;

    const months = [];
    for (let i = 0; i < 12; i++) {
      const y = fromYear + Math.floor((fromMonth - 1 + i) / 12);
      const m = ((fromMonth - 1 + i) % 12) + 1;
      const mp = S.calculate({ year: y, month: m, day: 20, timeUnknown: true }).pillars.month;
      const reasons = [];
      let score = 0;
      if (SIX_HE[myPalace] === mp.branch) { reasons.push("내 배우자 자리와 짝을 이루는 달"); score += 2; }
      if (exPalace !== null && SIX_HE[exPalace] === mp.branch) { reasons.push("그 사람의 배우자 자리와 짝을 이루는 달"); score += 2; }
      if (S.STEM_ELEMENT[mp.stem] === starEl || S.BRANCH_ELEMENT[mp.branch] === starEl) { reasons.push("인연의 별이 들어오는 달"); score += 1; }
      if (score) months.push({ year: y, month: m, label: S.label(mp), reasons, score });
    }
    months.sort((a, b) => b.score - a.score || a.year - b.year || a.month - b.month);
    const top = months.slice(0, 3).sort((a, b) => a.year - b.year || a.month - b.month);

    return { pair: rEx ? pairOf(rMe, rEx, S) : null, months: top };
  }

  const Reunion = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = Reunion;
  else root.Reunion = Reunion;
})(typeof window !== "undefined" ? window : globalThis);
