/* 무료 풀이 문구 — 월연 말투(친근한 존댓말). 계산 결과(Saju.calculate)를 받아 풀이를 만든다. */
(function (root) {
  "use strict";

  // 일간(태어난 날의 천간) 10가지
  const DAY_MASTER = [
    {
      title: "곧게 자라는 큰 나무, 갑목(甲木)",
      nature: "한번 정한 방향으로 곧게 뻗어 나가는 사람이에요. 남이 만든 길보다 내가 낸 길이 편하고, 앞에 서서 사람들을 이끄는 역할이 자연스러워요.",
      good: "책임감이 강해서 맡은 일은 끝까지 해내요",
      care: "혼자 다 짊어지다 지치기 쉬워요. 도움을 청하는 것도 능력이에요",
    },
    {
      title: "유연하게 뻗는 덩굴, 을목(乙木)",
      nature: "부드러워 보이지만 생각보다 훨씬 단단한 사람이에요. 어떤 환경에서도 결국 자리를 잡고 꽃을 피우는 적응력과 끈기가 있어요.",
      good: "사람의 마음을 잘 읽고 어디서든 잘 어울려요",
      care: "눈치를 너무 보다 내 마음을 놓치기 쉬워요. 싫은 건 싫다고 말해도 괜찮아요",
    },
    {
      title: "한낮의 태양, 병화(丙火)",
      nature: "있는 자리를 환하게 만드는 사람이에요. 솔직하고 시원시원해서 사람들이 자연스럽게 모여들어요.",
      good: "밝은 에너지로 분위기를 바꾸는 힘이 있어요",
      care: "확 타올랐다 금방 식기도 해요. 시작한 일의 불씨를 끝까지 지켜 보세요",
    },
    {
      title: "어둠을 밝히는 촛불, 정화(丁火)",
      nature: "겉으로는 차분해도 속은 따뜻하고 뜨거운 사람이에요. 한 사람 한 사람을 섬세하게 챙기는 다정함이 있어요.",
      good: "곁에 있으면 마음이 놓이는 사람이에요",
      care: "서운한 걸 혼자 삭이다 지치기 쉬워요. 그때그때 말로 꺼내 보세요",
    },
    {
      title: "든든한 큰 산, 무토(戊土)",
      nature: "쉽게 흔들리지 않고 묵묵히 제자리를 지키는 사람이에요. 그래서 주변 사람들이 기대러 와요.",
      good: "믿음직하고 품이 넓어요",
      care: "버티기만 하면 답답해 보일 수 있어요. 가끔은 먼저 움직여 보세요",
    },
    {
      title: "뭐든 키워 내는 밭, 기토(己土)",
      nature: "꼼꼼하고 살뜰해서 사람도 일도 차근차근 키워 내는 사람이에요. 현실 감각이 좋아 계획을 실제로 만들어 내요.",
      good: "세심하게 챙기고 살림·관리에 강해요",
      care: "걱정이 생각을 키워요. 할 일은 적어 두고 하나씩 지워 보세요",
    },
    {
      title: "단단한 원석, 경금(庚金)",
      nature: "옳고 그름이 분명하고 의리가 있는 사람이에요. 한번 내 사람이라고 정하면 끝까지 지켜요.",
      good: "결단이 빠르고 뒤끝이 없어요",
      care: "말이 날카롭게 전해질 때가 있어요. 한 번만 더 둥글게 말해 보세요",
    },
    {
      title: "빛나는 보석, 신금(辛金)",
      nature: "보는 눈이 높고 감각이 섬세한 사람이에요. 대충 하는 걸 못 참고, 나만의 기준과 스타일이 분명해요.",
      good: "안목이 좋고 디테일에 강해요",
      care: "남의 말 한마디에 쉽게 상처받아요. 내 빛은 남이 정하는 게 아니에요",
    },
    {
      title: "넓고 깊은 바다, 임수(壬水)",
      nature: "생각의 그릇이 크고 깊은 사람이에요. 머리 회전이 빠르고, 어디로든 흘러갈 수 있는 자유로움이 있어요.",
      good: "큰 그림을 보는 시야와 넉넉한 마음",
      care: "하고 싶은 게 많아 방향을 잃기 쉬워요. 우선순위를 하나만 정해 보세요",
    },
    {
      title: "조용히 스미는 봄비, 계수(癸水)",
      nature: "조용하지만 직감이 뛰어나고 생각이 깊은 사람이에요. 남들이 놓치는 걸 먼저 알아차려요.",
      good: "감수성이 풍부하고 사람을 조용히 도와요",
      care: "혼자 생각에 잠기면 마음이 가라앉아요. 햇볕 쬐고 사람을 만나 보세요",
    },
  ];

  // 오행이 하나도 없거나 적을 때 채우는 법
  const ELEMENT_TIPS = [
    { name: "목(木·나무)", color: "초록", direction: "동쪽", tip: "산책, 식물 키우기, 새로운 걸 배우기" },
    { name: "화(火·불)", color: "빨강·코랄", direction: "남쪽", tip: "햇볕 쬐기, 사람 만나기, 나를 표현하는 취미" },
    { name: "토(土·흙)", color: "베이지·노랑", direction: "가운데(내 방 정돈)", tip: "규칙적인 식사와 수면, 작은 저축 습관" },
    { name: "금(金·쇠)", color: "화이트·실버", direction: "서쪽", tip: "정리정돈, 근력 운동, 마감 지키기" },
    { name: "수(水·물)", color: "블랙·네이비", direction: "북쪽", tip: "물 자주 마시기, 독서, 혼자만의 쉬는 시간" },
  ];

  // 올해 기운이 일간과 어떤 관계인지
  const YEAR_FLOW = {
    비겁: "나와 닮은 기운이 들어오는 해예요. 친구·동료가 늘고 자신감도 붙어요. 대신 돈이 나갈 일도 함께 오니 보증·동업은 한 번 더 따져 보세요.",
    식상: "내 재능이 밖으로 드러나는 해예요. 말하고, 만들고, 보여 주는 일이 잘 풀려요. 말이 많아지는 만큼 말실수만 조심하세요.",
    재성: "재물 기운이 손에 잡히는 해예요. 움직인 만큼 들어오고 연애운도 함께 움직여요. 무리하게 벌리기보다 차곡차곡 모으는 게 좋아요.",
    관성: "책임과 자리가 따라오는 해예요. 승진·합격처럼 이름이 날 일이 있지만 부담도 커요. 쉬는 날은 꼭 지켜 주세요.",
    인성: "도와주는 사람과 배움이 들어오는 해예요. 공부·자격증·계약 같은 문서 일이 잘 풀려요. 생각만 하다 때를 놓치지 않게 시작은 빨리 하세요.",
  };

  function build(r, S) {
    const dm = DAY_MASTER[r.dayMaster];
    const counts = r.counts;
    const max = Math.max(...counts);
    const strong = counts.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
    const missing = counts.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
    const weak = missing.length ? missing : [counts.indexOf(Math.min(...counts))];

    const thisYear = new Date().getFullYear();
    const yp = S.yearPillarOf(thisYear);
    const yearElement = S.STEM_ELEMENT[yp.stem];
    const flow = S.relation(r.dayMasterElement, yearElement);

    const strongText = strong.map((i) => ELEMENT_TIPS[i].name).join(", ");
    const balance = missing.length
      ? `${missing.map((i) => ELEMENT_TIPS[i].name).join(", ")} 기운이 없어요. 없는 건 나쁜 게 아니라, 채워 쓰면 된다는 뜻이에요.`
      : "다섯 기운이 하나도 빠짐없이 모두 있어요. 균형이 좋은 사주예요.";

    return {
      dayMaster: dm,
      strongText,
      balance,
      tips: weak.map((i) => ELEMENT_TIPS[i]),
      year: { label: `${thisYear}년 ${S.label(yp)}년`, text: YEAR_FLOW[flow], flow },
    };
  }

  root.Reading = { build, DAY_MASTER, ELEMENT_TIPS };
})(typeof window !== "undefined" ? window : globalThis);
