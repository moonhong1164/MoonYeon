#!/usr/bin/env node
/*
 * 월연 카드뉴스 이미지 만들기 (1080×1350, 인스타 세로 비율)
 *   node tools/cardnews.js            → 모든 카드 묶음
 *   node tools/cardnews.js zodiac     → docs/marketing/cards/2027-zodiac/
 *   node tools/cardnews.js daymaster  → docs/marketing/cards/daymaster/
 * 문구를 바꾸려면 아래 데이터만 고치고 다시 실행하세요. (Playwright 필요)
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const CARDS = path.join(__dirname, "..", "docs", "marketing", "cards");

const ZODIAC = [
  { hanja: "子", name: "쥐띠", years: "1984 · 1996 · 2008", line: "관계는 정리,\n실력은 쌓기", tags: ["관계 정리", "실력 쌓기"], months: "8월 · 12월" },
  { hanja: "丑", name: "소띠", years: "1985 · 1997 · 2009", line: "움직이면\n열리는 해", tags: ["이사·이직", "새 출발"], months: "4월 · 10월" },
  { hanja: "寅", name: "호랑이띠", years: "1986 · 1998 · 2010", line: "재능을 보여 줄\n차례", tags: ["표현", "인정"], months: "3월 · 6월" },
  { hanja: "卯", name: "토끼띠", years: "1987 · 1999 · 2011", line: "좋은 사람이\n들어오는 해", tags: ["협력", "인연"], months: "3월 · 7월" },
  { hanja: "辰", name: "용띠", years: "1988 · 2000 · 2012", line: "꾸준함이\n이기는 해", tags: ["꾸준함", "저축"], months: "5월 · 9월" },
  { hanja: "巳", name: "뱀띠", years: "1989 · 2001 · 2013", line: "기회가 넘치는\n여름의 해", tags: ["활기", "기회"], months: "5월 · 6월" },
  { hanja: "午", name: "말띠", years: "1990 · 2002 · 2014", line: "12띠 중\n인연운 1등", tags: ["귀인", "연애"], months: "6월 · 7월" },
  { hanja: "未", name: "양띠", years: "1991 · 2003 · 2015", line: "새로운 12년의\n시작", tags: ["새 출발", "신중함"], months: "3월 · 10월" },
  { hanja: "申", name: "원숭이띠", years: "1980 · 1992 · 2004", line: "도와주는 손이\n많은 해", tags: ["도움", "성장"], months: "8월 · 10월" },
  { hanja: "酉", name: "닭띠", years: "1981 · 1993 · 2005", line: "미뤄 둔 서류가\n풀리는 해", tags: ["문서운", "안정"], months: "8월 · 11월" },
  { hanja: "戌", name: "개띠", years: "1982 · 1994 · 2006", line: "꼼꼼한 만큼\n남는 해", tags: ["꼼꼼함", "실속"], months: "4월 · 10월" },
  { hanja: "亥", name: "돼지띠", years: "1983 · 1995 · 2007", line: "함께할수록\n커지는 해", tags: ["협력", "재능"], months: "3월 · 7월" },
];

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1080px; height: 1350px; overflow: hidden; font-family: "Noto Sans KR", sans-serif; color: #fff;
  background:
    radial-gradient(2px 2px at 9% 12%, #fff9 50%, transparent 51%),
    radial-gradient(2px 2px at 88% 9%, #fffc 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 76% 30%, #fff8 50%, transparent 51%),
    radial-gradient(2px 2px at 14% 58%, #fff7 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 92% 66%, #fff9 50%, transparent 51%),
    radial-gradient(2px 2px at 6% 88%, #fff8 50%, transparent 51%),
    linear-gradient(180deg, #17153a 0%, #2a2462 100%); }
.frame { position: absolute; inset: 40px; border: 2px solid #f3d27a55; border-radius: 36px; }
.top { position: absolute; top: 84px; left: 0; right: 0; text-align: center; font-weight: 700; letter-spacing: .2em; color: #f3d27a; font-size: 28px; }
.foot { position: absolute; bottom: 82px; left: 90px; right: 90px; display: flex; justify-content: space-between; color: #9d98c4; font-size: 26px; }
.foot b { color: #f3d27a; font-weight: 700; }
.center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 110px; }
.moon { width: 300px; height: 300px; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 38% 34%, #fffbea 0%, #f9e6a8 45%, #e9c46a 100%);
  box-shadow: 0 0 80px #f3d27a66, 0 0 160px #f3d27a2a; color: #17153a; font-family: "Noto Serif KR", serif; font-weight: 900; }
.serif { font-family: "Noto Serif KR", serif; font-weight: 900; letter-spacing: -0.02em; }
.name { font-size: 72px; margin-top: 54px; }
.years { color: #b6b1d8; font-size: 30px; margin-top: 14px; letter-spacing: .04em; }
.line { font-size: 84px; line-height: 1.28; margin-top: 56px; white-space: pre-line; }
.tags { display: flex; gap: 16px; margin-top: 52px; }
.tag { border: 2px solid #f3d27a88; color: #f3d27a; border-radius: 999px; padding: 10px 28px; font-size: 32px; font-weight: 700; }
.months { margin-top: 34px; font-size: 34px; color: #e3e0f5; }
.months b { color: #f3d27a; }
`;

const page = (inner, n, total) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@700;900&display=swap">
<style>${CSS}</style></head><body><div class="frame"></div>${inner}
<div class="foot"><span>월연 사주</span><span><b>${n}</b> / ${total}</span></div></body></html>`;

const zodiacSlides = (T) => [
  page(`<div class="top">2027 · 丁未年</div>
    <div class="center">
      <div class="moon" style="font-size:150px">未</div>
      <div class="serif" style="font-size:96px;line-height:1.25;margin-top:70px">2027<br>붉은 양의 해</div>
      <div style="font-size:48px;font-weight:700;margin-top:34px;color:#f3d27a">내 띠 한 줄 운세 🌙</div>
      <div style="font-size:30px;margin-top:40px;color:#b6b1d8">저장해 두고 내년에 꺼내 보기</div>
    </div>`, 1, T),
  ...ZODIAC.map((z, i) =>
    page(`<div class="top">2027 띠별 운세</div>
      <div class="center">
        <div class="moon" style="width:250px;height:250px;font-size:140px">${z.hanja}</div>
        <div class="serif name">${z.name}</div>
        <div class="years">${z.years}년생</div>
        <div class="serif line">${z.line}</div>
        <div class="tags">${z.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="months">좋은 달 <b>${z.months}</b></div>
      </div>`, i + 2, T)
  ),
  page(`<div class="top">MOONYEON</div>
    <div class="center">
      <div class="serif" style="font-size:80px;line-height:1.3">띠는<br>맛보기일 뿐 🌙</div>
      <div style="font-size:44px;line-height:1.6;margin-top:56px;color:#e3e0f5">내 사주 여덟 글자는<br><b style="color:#f3d27a">무료로</b> 볼 수 있어요</div>
      <div style="margin-top:56px;background:#5a4fcf;border-radius:999px;padding:24px 56px;font-size:40px;font-weight:700;box-shadow:0 10px 30px #5a4fcf66">프로필 링크에서 확인하기</div>
      <div style="font-size:28px;margin-top:48px;color:#9d98c4;line-height:1.6">음력 생일도 OK · 회원가입 없음<br>띠는 입춘 기준 · 재미로 봐 주세요</div>
    </div>`, 14, T),
];

const DAYMASTER = [
  { hanja: "甲", name: "갑목", el: "木", title: "곧게 자라는\n큰 나무", line: "한번 정한 방향으로\n곧게 뻗어 나가는 사람", good: "끝까지 해내는 책임감", tip: "도움을 청하는 것도 능력" },
  { hanja: "乙", name: "을목", el: "木", title: "유연하게 뻗는\n덩굴", line: "부드럽지만\n누구보다 끈질긴 사람", good: "어디서든 어울리는 적응력", tip: "싫은 건 싫다고 말해도 돼요" },
  { hanja: "丙", name: "병화", el: "火", title: "한낮의\n태양", line: "있는 자리를\n환하게 만드는 사람", good: "분위기를 바꾸는 에너지", tip: "시작한 일의 불씨를 끝까지" },
  { hanja: "丁", name: "정화", el: "火", title: "어둠을 밝히는\n촛불", line: "겉은 차분해도\n속은 따뜻한 사람", good: "곁에 있으면 마음이 놓여요", tip: "서운함은 그때그때 말로" },
  { hanja: "戊", name: "무토", el: "土", title: "든든한\n큰 산", line: "쉽게 흔들리지 않고\n자리를 지키는 사람", good: "믿음직한 넓은 품", tip: "가끔은 먼저 움직여 보기" },
  { hanja: "己", name: "기토", el: "土", title: "뭐든 키워 내는\n밭", line: "사람도 일도\n차근차근 키워 내는 사람", good: "세심한 관리와 살림력", tip: "걱정은 적어 두고 하나씩" },
  { hanja: "庚", name: "경금", el: "金", title: "단단한\n원석", line: "옳고 그름이 분명하고\n의리 있는 사람", good: "빠른 결단, 뒤끝 없음", tip: "한 번만 더 둥글게 말하기" },
  { hanja: "辛", name: "신금", el: "金", title: "빛나는\n보석", line: "보는 눈이 높고\n감각이 섬세한 사람", good: "안목과 디테일", tip: "내 빛은 남이 정하지 않아요" },
  { hanja: "壬", name: "임수", el: "水", title: "넓고 깊은\n바다", line: "생각의 그릇이 크고\n자유로운 사람", good: "큰 그림을 보는 시야", tip: "우선순위는 하나만 정하기" },
  { hanja: "癸", name: "계수", el: "水", title: "조용히 스미는\n봄비", line: "조용하지만\n직감이 뛰어난 사람", good: "남이 못 보는 걸 먼저 앎", tip: "햇볕 쬐고 사람 만나기" },
];
const EL_COLOR = { "木": "#4f9a6a", "火": "#e2604c", "土": "#c99a3d", "金": "#9aa0ab", "水": "#36508a" };

const daymasterSlides = (T) => [
  page(`<div class="top">MOONYEON</div>
    <div class="center">
      <div style="display:flex;gap:18px">${["木", "火", "土", "金", "水"].map((e) => `<div style="width:118px;height:118px;border-radius:50%;display:grid;place-items:center;background:${EL_COLOR[e]};font-family:'Noto Serif KR',serif;font-weight:900;font-size:60px">${e}</div>`).join("")}</div>
      <div class="serif" style="font-size:88px;line-height:1.3;margin-top:80px">나를 나타내는<br>글자 10가지</div>
      <div style="font-size:42px;font-weight:700;margin-top:36px;color:#f3d27a">사주 속 '진짜 나', 일간 🌙</div>
      <div style="font-size:30px;margin-top:40px;color:#b6b1d8;line-height:1.6">띠가 아니라 <b style="color:#fff">태어난 날</b>에 있어요<br>내 글자를 찾아 저장해 두세요</div>
    </div>`, 1, T),
  ...DAYMASTER.map((d, i) =>
    page(`<div class="top">일간 ${i + 1} / 10</div>
      <div class="center">
        <div class="moon" style="width:240px;height:240px;font-size:136px">${d.hanja}</div>
        <div style="margin-top:44px;display:flex;align-items:center;gap:16px">
          <span class="serif" style="font-size:60px">${d.name}</span>
          <span style="background:${EL_COLOR[d.el]};border-radius:999px;padding:6px 22px;font-size:30px;font-weight:700">${d.el}</span>
        </div>
        <div class="serif line" style="font-size:80px;margin-top:40px">${d.title}</div>
        <div style="font-size:36px;line-height:1.5;margin-top:36px;color:#e3e0f5;white-space:pre-line">${d.line}</div>
        <div style="margin-top:44px;font-size:32px;line-height:1.8">
          <div><span style="color:#f3d27a;font-weight:700">강점</span> &nbsp;${d.good}</div>
          <div><span style="color:#f3d27a;font-weight:700">한마디</span> &nbsp;${d.tip}</div>
        </div>
      </div>`, i + 2, T)
  ),
  page(`<div class="top">MOONYEON</div>
    <div class="center">
      <div class="serif" style="font-size:80px;line-height:1.3">내 일간은<br>뭘까? 🌙</div>
      <div style="font-size:44px;line-height:1.6;margin-top:56px;color:#e3e0f5">생년월일만 넣으면<br><b style="color:#f3d27a">무료로</b> 바로 알려 드려요</div>
      <div style="margin-top:56px;background:#5a4fcf;border-radius:999px;padding:24px 56px;font-size:40px;font-weight:700;box-shadow:0 10px 30px #5a4fcf66">프로필 링크에서 확인하기</div>
      <div style="font-size:28px;margin-top:48px;color:#9d98c4;line-height:1.6">음력 생일도 OK · 회원가입 없음<br>재미로 봐 주세요</div>
    </div>`, T, T),
];

const DECKS = {
  zodiac: { dir: "2027-zodiac", build: zodiacSlides, total: 14 },
  daymaster: { dir: "daymaster", build: daymasterSlides, total: 12 },
};

(async () => {
  const names = process.argv[2] ? [process.argv[2]] : Object.keys(DECKS);
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const name of names) {
    const deck = DECKS[name];
    if (!deck) throw new Error(`없는 카드 묶음: ${name} (가능: ${Object.keys(DECKS).join(", ")})`);
    const out = path.join(CARDS, deck.dir);
    fs.mkdirSync(out, { recursive: true });
    for (const [i, html] of deck.build(deck.total).entries()) {
      await p.setContent(html, { waitUntil: "networkidle" });
      await p.evaluate(() => document.fonts.ready);
      const file = path.join(out, `${String(i + 1).padStart(2, "0")}.png`);
      await p.screenshot({ path: file });
      console.log(file);
    }
  }
  await browser.close();
})();
