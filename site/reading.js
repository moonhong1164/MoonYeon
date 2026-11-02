/* 무료 풀이 문구 — 할매 말투. 계산 결과(Saju.calculate)를 받아 풀이를 만든다. */
(function (root) {
  "use strict";

  // 일간(태어난 날의 천간) 10가지
  const DAY_MASTER = [
    {
      title: "큰 나무 같은 사람, 갑목(甲木)",
      nature: "곧게 뻗은 소나무 같구먼. 한번 마음먹으면 꺾일지언정 굽히지는 않는 성미여. 남들 앞에 서서 길을 내는 걸 좋아하고, 뒤에서 수군대는 건 질색이지.",
      good: "책임감이 커서 맡기면 끝을 보는 사람",
      care: "고집이 세서 혼자 다 짊어지다 지치기 쉬우니, 가끔은 기대도 된다",
    },
    {
      title: "넝쿨 같은 사람, 을목(乙木)",
      nature: "담장을 타고 오르는 넝쿨처럼 부드럽고 끈질긴 사람이여. 겉으론 순해 보여도 속은 질기디질겨서, 어떤 자리에 가도 기어이 뿌리를 내리고 꽃을 피우지.",
      good: "사람 마음을 잘 읽고 어디서든 적응하는 재주",
      care: "남 눈치를 너무 보다 내 마음을 놓치니, 싫은 건 싫다고 말해도 괜찮다",
    },
    {
      title: "한낮의 해 같은 사람, 병화(丙火)",
      nature: "아이고, 해님이 떴구먼. 있는 자리를 환하게 만드는 사람이여. 숨기는 게 없고 화끈해서 사람들이 절로 모여들지.",
      good: "밝은 기운으로 사람을 끌어당기는 힘",
      care: "확 타올랐다 금방 식기도 하니, 시작한 일은 끝까지 불씨를 지키거라",
    },
    {
      title: "촛불 같은 사람, 정화(丁火)",
      nature: "어둔 방을 밝히는 촛불이여. 겉으론 조용해도 속은 뜨겁고, 한 사람 한 사람 따뜻하게 챙기는 정이 깊지.",
      good: "섬세하고 다정해서 곁에 있으면 마음이 놓이는 사람",
      care: "속으로 끙끙 앓다 혼자 타 버리지 않게, 서운한 건 그때그때 털어놓거라",
    },
    {
      title: "큰 산 같은 사람, 무토(戊土)",
      nature: "듬직한 큰 산이구먼. 쉽게 흔들리지 않고 묵묵히 제자리를 지키니, 주변 사람들이 기대러 오지.",
      good: "믿음직하고 속이 넓어 사람을 품는 그릇",
      care: "너무 버티기만 하면 답답해 보이니, 가끔은 먼저 움직여 보거라",
    },
    {
      title: "기름진 논밭 같은 사람, 기토(己土)",
      nature: "씨 뿌리면 뭐든 키워 내는 논밭이여. 살뜰하고 꼼꼼해서 사람도 일도 알뜰히 길러 내는 재주가 있지.",
      good: "챙김이 많고 현실 감각이 좋은 살림꾼",
      care: "걱정이 많아 생각만 늘어나니, 할 일은 적어 두고 하나씩 하거라",
    },
    {
      title: "바위·무쇠 같은 사람, 경금(庚金)",
      nature: "단단한 무쇠구먼. 옳고 그름이 분명하고 의리가 있어서, 한번 내 사람이면 끝까지 지키는 사람이여.",
      good: "결단력 있고 뒤끝 없이 시원한 성미",
      care: "말이 날카로워 본의 아니게 상처를 줄 수 있으니, 한 번 더 둥글게 말하거라",
    },
    {
      title: "보석 같은 사람, 신금(辛金)",
      nature: "갈고 닦은 보석이여. 보는 눈이 높고 깔끔해서, 대충 하는 걸 못 참는 사람이지. 반짝이는 감각이 있어.",
      good: "섬세한 안목과 자존심 있는 품위",
      care: "남의 말 한마디에 쉽게 긁히니, 내 빛은 남이 정하는 게 아니란 걸 기억하거라",
    },
    {
      title: "큰 강·바다 같은 사람, 임수(壬水)",
      nature: "넓은 바다 같구먼. 생각이 크고 깊어서 어디로든 흘러갈 수 있는 사람이여. 머리가 좋고 품이 넓지.",
      good: "큰 그림을 보는 지혜와 넉넉한 마음",
      care: "물이 넘치면 방향을 잃으니, 하고 싶은 게 많을수록 한 가지씩 정하거라",
    },
    {
      title: "봄비·이슬 같은 사람, 계수(癸水)",
      nature: "소리 없이 땅을 적시는 봄비여. 조용하지만 눈치 빠르고 생각이 깊어서, 남들이 못 보는 걸 먼저 알아채지.",
      good: "직감이 좋고 남을 조용히 돕는 사람",
      care: "혼자 생각이 깊어지면 마음이 가라앉으니, 햇볕 쬐고 사람 만나거라",
    },
  ];

  // 오행이 하나도 없거나 적을 때 채우는 법
  const ELEMENT_TIPS = [
    { name: "목(木·나무)", color: "초록", direction: "동쪽", tip: "산책, 화분 키우기, 새로 배우는 일" },
    { name: "화(火·불)", color: "빨강·분홍", direction: "남쪽", tip: "햇볕 쬐기, 사람 만나기, 표현하는 취미" },
    { name: "토(土·흙)", color: "노랑·베이지", direction: "가운데(집 안 정돈)", tip: "규칙적인 식사와 잠, 저축 습관" },
    { name: "금(金·쇠)", color: "흰색·은색", direction: "서쪽", tip: "정리정돈, 운동으로 몸 다지기, 마감 지키기" },
    { name: "수(水·물)", color: "검정·남색", direction: "북쪽", tip: "물 자주 마시기, 독서, 혼자 쉬는 시간" },
  ];

  // 올해 기운이 일간과 어떤 관계인지
  const YEAR_FLOW = {
    비겁: "올해는 나랑 닮은 기운이 들어오는 해여. 친구·동료가 늘고 자신감도 붙지. 다만 돈 나갈 일도 같이 오니, 보증이나 동업은 꼭 한 번 더 따져 보거라.",
    식상: "올해는 내 재주가 밖으로 터져 나오는 해구먼. 말하고 만들고 보여 주는 일이 잘 풀려. 말이 많아지니 말실수만 조심하면 된다.",
    재성: "올해는 재물 기운이 손에 잡히는 해여. 일한 만큼 들어오고, 연애운도 같이 움직이지. 욕심내서 무리하게 벌이면 탈 나니 차곡차곡 모으거라.",
    관성: "올해는 책임과 자리가 따라오는 해구먼. 승진·합격·이름 날 일이 있지만 부담도 커. 몸 상하지 않게 쉬는 날을 꼭 챙기거라.",
    인성: "올해는 도와주는 사람과 배움이 들어오는 해여. 공부·자격증·문서 일이 잘 풀려. 다만 생각만 하다 때를 놓치지 않게, 시작은 빨리 하거라.",
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
      ? `${missing.map((i) => ELEMENT_TIPS[i].name).join(", ")} 기운이 하나도 없구먼. 없는 건 흉이 아니라 채워 쓰라는 뜻이여.`
      : "다섯 기운이 하나도 빠짐없이 다 있구먼. 고루 갖춘 복 받은 사주여.";

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
