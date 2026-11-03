#!/usr/bin/env node
/*
 * 월연 카드뉴스 이미지 만들기 (1080×1350, 인스타 세로 비율)
 *   node tools/cardnews.js
 * → docs/marketing/cards/2027-zodiac/01.png … 14.png
 * 문구를 바꾸려면 아래 SLIDES만 고치고 다시 실행하세요. (Playwright 필요)
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "docs", "marketing", "cards", "2027-zodiac");

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

const page = (inner, n) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@700;900&display=swap">
<style>${CSS}</style></head><body><div class="frame"></div>${inner}
<div class="foot"><span>월연 사주</span><span><b>${n}</b> / 14</span></div></body></html>`;

const SLIDES = [
  page(`<div class="top">2027 · 丁未年</div>
    <div class="center">
      <div class="moon" style="font-size:150px">未</div>
      <div class="serif" style="font-size:96px;line-height:1.25;margin-top:70px">2027<br>붉은 양의 해</div>
      <div style="font-size:48px;font-weight:700;margin-top:34px;color:#f3d27a">내 띠 한 줄 운세 🌙</div>
      <div style="font-size:30px;margin-top:40px;color:#b6b1d8">저장해 두고 내년에 꺼내 보기</div>
    </div>`, 1),
  ...ZODIAC.map((z, i) =>
    page(`<div class="top">2027 띠별 운세</div>
      <div class="center">
        <div class="moon" style="width:250px;height:250px;font-size:140px">${z.hanja}</div>
        <div class="serif name">${z.name}</div>
        <div class="years">${z.years}년생</div>
        <div class="serif line">${z.line}</div>
        <div class="tags">${z.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="months">좋은 달 <b>${z.months}</b></div>
      </div>`, i + 2)
  ),
  page(`<div class="top">MOONYEON</div>
    <div class="center">
      <div class="serif" style="font-size:80px;line-height:1.3">띠는<br>맛보기일 뿐 🌙</div>
      <div style="font-size:44px;line-height:1.6;margin-top:56px;color:#e3e0f5">내 사주 여덟 글자는<br><b style="color:#f3d27a">무료로</b> 볼 수 있어요</div>
      <div style="margin-top:56px;background:#5a4fcf;border-radius:999px;padding:24px 56px;font-size:40px;font-weight:700;box-shadow:0 10px 30px #5a4fcf66">프로필 링크에서 확인하기</div>
      <div style="font-size:28px;margin-top:48px;color:#9d98c4;line-height:1.6">음력 생일도 OK · 회원가입 없음<br>띠는 입춘 기준 · 재미로 봐 주세요</div>
    </div>`, 14),
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [i, html] of SLIDES.entries()) {
    await p.setContent(html, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `${String(i + 1).padStart(2, "0")}.png`);
    await p.screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
})();
