/*
 * '운명의 상대' 맛보기 — 생일만으로 바로 계산
 * - 배우자 자리: 태어난 날의 지지(일지)
 * - 배우자 별: 여성은 관성(나를 다스리는 오행), 남성은 재성(내가 다스리는 오행)
 * - 인연이 오는 해: 앞으로 5년 중, 그해 천간·지지에 배우자 별이 들어오거나 그해 지지가 일지와 육합을 이루는 해
 */
(function (root) {
  "use strict";

  // 배우자 자리(일지) 오행별 그 사람의 분위기
  const PALACE = [
    { mood: "곧고 성장하는 나무", look: "키가 크거나 자세가 반듯하고, 목표가 분명한 사람", vibe: "함께 있으면 '같이 커 가는' 느낌을 주는 사람이에요." },
    { mood: "따뜻한 불", look: "표정이 밝고 말이 시원시원한, 첫인상이 환한 사람", vibe: "함께 있으면 기운이 나고 하루가 밝아지는 사람이에요." },
    { mood: "듬직한 흙", look: "차분하고 믿음직하며, 말보다 행동으로 챙기는 사람", vibe: "함께 있으면 마음이 놓이고 생활이 안정되는 사람이에요." },
    { mood: "단단한 쇠", look: "깔끔하고 기준이 분명한, 맺고 끊음이 확실한 사람", vibe: "함께 있으면 흐트러진 일이 정리되는 사람이에요." },
    { mood: "깊은 물", look: "부드럽고 생각이 깊으며, 이야기를 잘 들어 주는 사람", vibe: "함께 있으면 말하지 않아도 통하는 사람이에요." },
  ];
  const SIX_HE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };

  function build(r, S, gender, fromYear) {
    const dme = r.dayMasterElement;
    const starEl = gender === "남" ? (dme + 2) % 5 : (dme + 3) % 5; // 재성 / 관성
    const starName = gender === "남" ? "재성" : "관성";
    const palaceBranch = r.pillars.day.branch;
    const palaceEl = S.BRANCH_ELEMENT[palaceBranch];

    let starCount = 0;
    for (const p of Object.values(r.pillars)) {
      if (!p) continue;
      if (S.STEM_ELEMENT[p.stem] === starEl) starCount++;
      if (S.BRANCH_ELEMENT[p.branch] === starEl) starCount++;
    }
    const starText = starCount === 0
      ? "원국에는 배우자 별이 보이지 않아요. 별이 없는 사주는 인연이 '운'을 타고 들어와요. 그래서 그 별이 들어오는 해가 더 또렷하게 중요해요."
      : starCount >= 3
        ? `원국에 배우자 별이 ${starCount}개나 있어요. 인연의 기회가 많은 편이라, 고르는 눈이 곧 행복의 열쇠예요.`
        : `원국에 배우자 별이 ${starCount}개 있어요. 인연이 자연스럽게 찾아오는 편이에요.`;

    const years = [];
    for (let y = fromYear; y < fromYear + 5; y++) {
      const yp = S.yearPillarOf(y);
      const reasons = [];
      if (S.STEM_ELEMENT[yp.stem] === starEl || S.BRANCH_ELEMENT[yp.branch] === starEl) reasons.push("배우자 별이 들어와요");
      if (SIX_HE[palaceBranch] === yp.branch) reasons.push("배우자 자리와 짝을 이뤄요");
      if (reasons.length) years.push({ year: y, label: S.label(yp), reasons });
    }

    const pal = PALACE[palaceEl];
    return {
      palace: `${S.BRANCHES[palaceBranch]}(${S.BRANCHES_HANJA[palaceBranch]}) · ${S.ELEMENTS[palaceEl]}`,
      mood: pal.mood,
      look: pal.look,
      vibe: pal.vibe,
      star: `${starName} · ${S.ELEMENTS[starEl]}(${S.ELEMENTS_HANJA[starEl]})`,
      starCount,
      starText,
      years: years.slice(0, 3),
    };
  }

  const Destiny = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = Destiny;
  else root.Destiny = Destiny;
})(typeof window !== "undefined" ? window : globalThis);
