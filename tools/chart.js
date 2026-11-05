#!/usr/bin/env node
/*
 * 주문 들어온 사람의 사주 자료를 풀이 작성용으로 뽑는다.
 *
 *   node tools/chart.js --birth 1995-08-20 --time 07:30 --gender 여 --name 김하늘
 *   node tools/chart.js --birth 1995-08-20 --time 모름 --gender 남
 *
 *   node tools/chart.js --birth 1994-06-18 --lunar 1 --time 17:30 --gender 여   (음력 생일)
 *   node tools/chart.js --birth 1993-03-10 --lunar 1 --leap 1 ...               (음력 윤달)
 *
 * 생년월일은 기본이 양력. --lunar 1 이면 site/lunar.js로 양력으로 바꿔서 계산한다.
 */
const S = require("../site/saju.js");
const Lunar = require("../site/lunar.js");

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, "")] = argv[i + 1];
  return out;
}

const truthy = (v) => v === true || ["1", "true", "yes", "y", "음력"].includes(String(v || "").toLowerCase());

function chart({ birth, time = "모름", gender, name = "", lunar, leap, now = new Date() }) {
  let [year, month, day] = birth.split("-").map(Number);
  let lunarNote = "";
  if (truthy(lunar)) {
    const sol = Lunar.lunarToSolar(year, month, day, truthy(leap));
    lunarNote = `음력 ${birth}${truthy(leap) ? "(윤달)" : ""} → `;
    [year, month, day] = [sol.year, sol.month, sol.day];
    birth = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const unknown = !time || time === "모름";
  const [hour, minute] = unknown ? [12, 0] : time.split(":").map(Number);
  const r = S.calculate({ year, month, day, hour, minute, timeUnknown: unknown, gender });
  const dm = r.dayMaster;
  const el = (e) => `${S.ELEMENTS[e]}(${S.ELEMENTS_HANJA[e]})`;
  const stemInfo = (st) => `${S.STEMS[st]}${S.STEMS_HANJA[st]} ${S.ELEMENTS[S.STEM_ELEMENT[st]]}`;
  const branchInfo = (b) => `${S.BRANCHES[b]}${S.BRANCHES_HANJA[b]} ${S.ELEMENTS[S.BRANCH_ELEMENT[b]]}`;

  const lines = [];
  lines.push(`# 사주 자료 — ${name || "(이름 없음)"} (${gender || "성별 모름"})`);
  lines.push("");
  lines.push(`- ${lunarNote}양력 ${birth} ${unknown ? "시 모름" : time} · 서울 기준 시간 보정${r.input.dst ? " · 서머타임 1시간 뺌" : ""}`);
  lines.push(`- ${r.animal}띠 (${S.label(r.pillars.year)}년생 기준 입춘 적용) · 월령: ${r.monthTermName} 이후`);
  lines.push(`- 일간(나): **${stemInfo(dm)}** (${dm % 2 === 0 ? "양" : "음"})`);
  if (r.nearTermBoundary) lines.push(`- ⚠️ 절기 경계 1시간 이내 출생 — 월주가 바뀔 수 있음, 풀이에서 언급할 것`);
  lines.push("");

  lines.push("## 원국");
  lines.push("");
  lines.push("| | 시주 | 일주 | 월주 | 연주 |");
  lines.push("|---|---|---|---|---|");
  const cols = [r.pillars.hour, r.pillars.day, r.pillars.month, r.pillars.year];
  lines.push("| 천간 | " + cols.map((p, i) => (p ? `${stemInfo(p.stem)}` : "모름")).join(" | ") + " |");
  lines.push("| 십신 | " + cols.map((p, i) => (p ? (i === 1 ? "나(일간)" : S.tenGod(dm, p.stem)) : "-")).join(" | ") + " |");
  lines.push("| 지지 | " + cols.map((p) => (p ? branchInfo(p.branch) : "모름")).join(" | ") + " |");
  lines.push("| 십신 | " + cols.map((p) => (p ? S.tenGodOfBranch(dm, p.branch) : "-")).join(" | ") + " |");
  lines.push("");

  lines.push("## 오행");
  lines.push("");
  lines.push(r.counts.map((c, i) => `${el(i)} ${c}`).join(" · "));
  const help = r.counts[r.dayMasterElement] + r.counts[(r.dayMasterElement + 4) % 5];
  const total = r.counts.reduce((a, b) => a + b, 0);
  lines.push("");
  lines.push(`- 나를 돕는 기운(비겁+인성): ${help}/${total} → ${help >= total / 2 ? "신강 쪽(힘이 있는 편)" : "신약 쪽(도움이 필요한 편)"} — 참고용 단순 계산, 월령과 함께 판단할 것`);
  lines.push(`- 없는 오행: ${r.counts.map((c, i) => (c === 0 ? el(i) : null)).filter(Boolean).join(", ") || "없음"}`);
  const godCount = {};
  for (const [i, p] of cols.entries()) {
    if (!p) continue;
    if (i !== 1) godCount[S.tenGod(dm, p.stem)] = (godCount[S.tenGod(dm, p.stem)] || 0) + 1;
    godCount[S.tenGodOfBranch(dm, p.branch)] = (godCount[S.tenGodOfBranch(dm, p.branch)] || 0) + 1;
  }
  // 지지 조합: 삼합(셋이 모이면 한 기운으로 뭉침), 충(서로 부딪힘)
  const branches = cols.filter(Boolean).map((p) => p.branch);
  const has = (b) => branches.includes(b);
  const SAMHAP = [[[8, 0, 4], 4], [[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3]];
  const combos = [];
  for (const [set, e] of SAMHAP) {
    const n = set.filter(has).length;
    const names = set.map((b) => S.BRANCHES[b] + S.BRANCHES_HANJA[b]).join("·");
    if (n === 3) combos.push(`삼합 ${names} → ${el(e)} 기운으로 뭉침`);
    else if (n === 2 && has(set[1])) combos.push(`반합 ${set.filter(has).map((b) => S.BRANCHES[b]).join("·")} → ${el(e)} 기운 쪽으로 기움`);
  }
  for (let b = 0; b < 6; b++) if (has(b) && has(b + 6)) combos.push(`충 ${S.BRANCHES[b]}${S.BRANCHES_HANJA[b]}↔${S.BRANCHES[b + 6]}${S.BRANCHES_HANJA[b + 6]} (부딪힘·변동)`);
  lines.push(`- 지지 조합: ${combos.join(" / ") || "눈에 띄는 삼합·충 없음"}`);
  lines.push(`- 십신 분포: ${Object.entries(godCount).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  lines.push("");

  const thisYear = now.getFullYear();
  if (r.daewoon) {
    lines.push(`## 대운 (${r.daewoon.forward ? "순행" : "역행"}, 대운수 ${r.daewoon.startAge})`);
    lines.push("");
    lines.push("| 나이 | 시작 연도 | 대운 | 천간 십신 | 지지 십신 | |");
    lines.push("|---|---|---|---|---|---|");
    for (const d of r.daewoon.list) {
      const current = thisYear >= d.fromYear && thisYear < d.fromYear + 10 ? "← 지금" : "";
      lines.push(`| ${d.age}세 | ${d.fromYear} | ${S.label(d)}(${S.label(d, true)}) | ${S.tenGod(dm, d.stem)} | ${S.tenGodOfBranch(dm, d.branch)} | ${current} |`);
    }
    lines.push("");
  } else {
    lines.push("## 대운");
    lines.push("");
    lines.push("성별을 알아야 계산할 수 있어요 (--gender 남|여).");
    lines.push("");
  }

  lines.push("## 세운 (해마다 들어오는 기운)");
  lines.push("");
  for (const y of [thisYear, thisYear + 1]) {
    const p = S.yearPillarOf(y);
    lines.push(`- ${y}년 ${S.label(p)}(${S.label(p, true)}): 천간 ${S.tenGod(dm, p.stem)} · 지지 ${S.tenGodOfBranch(dm, p.branch)}`);
  }
  // 내년 월운: 절기 기준 달마다 들어오는 기운 (신년운세용)
  const ny = thisYear + 1;
  lines.push("");
  lines.push(`## ${ny}년 월운 (달마다 들어오는 기운, 절기 기준)`);
  lines.push("");
  lines.push("| 양력 달 | 월주 | 천간 십신 | 지지 십신 | 원국 지지와 |");
  lines.push("|---|---|---|---|---|");
  for (let m = 1; m <= 12; m++) {
    const mp = S.calculate({ year: ny, month: m, day: 20, timeUnknown: true }).pillars.month;
    const notes = [];
    for (const b of branches) {
      if ((b + 6) % 12 === mp.branch) notes.push(`${S.BRANCHES[b]}${S.BRANCHES[mp.branch]} 충`);
      for (const [set, e] of SAMHAP) if (set.includes(b) && set.includes(mp.branch) && b !== mp.branch) notes.push(`${S.BRANCHES[b]}${S.BRANCHES[mp.branch]} 반합(${S.ELEMENTS[e]})`);
    }
    lines.push(`| ${m}월 (${m === 1 ? "1/6 무렵 소한~" : `${m}월 초 ${["", "", "입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설"][m]}~`}) | ${S.label(mp)}(${S.label(mp, true)}) | ${S.tenGod(dm, mp.stem)} | ${S.tenGodOfBranch(dm, mp.branch)} | ${[...new Set(notes)].join(", ") || "-"} |`);
  }
  return lines.join("\n");
}

if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (!a.birth) {
    console.error("사용법: node tools/chart.js --birth YYYY-MM-DD [--time HH:MM|모름] --gender 남|여 [--name 이름] [--lunar 1] [--leap 1]");
    process.exit(1);
  }
  console.log(chart(a));
}

module.exports = { chart };
