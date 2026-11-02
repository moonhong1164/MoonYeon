// site/data/stats.json(실제 설정 + 업무일지)을 읽어 화면을 채운다.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");

const HOUSE_RULES = [
  "고객·외부로 나가는 메시지·메일·게시물은 초안까지만. 발송은 사장 승인 후.",
  "돈·결제·환불·계약은 근거 숫자와 함께 보고하고, 결정은 사장이.",
  "모르는 건 추측하지 않고 '확인 필요'. 법·세무 내용은 법령 원문 출처를 붙여요.",
];

function kpiCards(k) {
  const cards = [
    ["AI 직원", k.employees, "명", "blue", `그중 <b>${fmt(k.employees_on_routine)}명</b>은 정해진 시간에 알아서 출근`],
    ["매일 출근 루틴", k.routines, "개", "blue", "사장이 자는 동안에도 정해진 시간에 실행"],
    ["업무 지침서 (스킬)", k.skills, "개", "blue", "일하는 방식을 저장해 매번 같은 품질로 재사용"],
    ["휴대폰으로 일 시키는 방", k.rooms, "개", "blue", "텔레그램: 본부·유튜브·블로그·주문·상담·메일"],
    ["AI가 스스로 쓴 업무일지", k.worklog_total, "건", "red", `이번 달 <b>${fmt(k.worklog_month)}건</b> · 한 일과 배운 것을 기록`],
    ["사장 승인 대기", k.pending_approvals, "건", "red", "고객에게 나가는 건 전부 사장이 승인해야 나가요"],
  ];
  return cards.map(([title, n, unit, color, desc]) => `
    <article class="kpi">
      <h3>${title}</h3>
      <div class="num ${color}">${fmt(n)}<small>${unit}</small></div>
      <p>${desc}</p>
    </article>`).join("");
}

function departments(depts) {
  return depts.map((d) => `
    <article class="dept">
      <h3><span class="dot" style="background:${esc(d.color)}"></span>${esc(d.no)} ${esc(d.name)}</h3>
      <ul>${d.employees.map((e) => `
        <li><b>${esc(e.name)}</b> — ${esc(e.role)}
          <span class="chips">
            ${e.routines.length ? `<span class="chip">⏰ 루틴 ${e.routines.length}개</span>` : `<span class="chip">지시할 때</span>`}
            ${e.web ? `<span class="chip">🔎 웹 조사</span>` : ""}
            ${e.customer_facing ? `<span class="chip warn">✋ 사장 승인 후 발송</span>` : ""}
            ${e.done ? `<span class="chip">완료 ${fmt(e.done)}건</span>` : ""}
          </span>
        </li>`).join("")}
      </ul>
    </article>`).join("");
}

function recent(rows) {
  if (!rows.length) {
    return `<div class="log-empty">아직 기록이 없어요. 직원이 첫 일을 마치면 여기에 자동으로 쌓여요.</div>`;
  }
  return rows.map((r) => `
    <div class="log-row">
      <span class="when">${esc(r.at.slice(5, 16).replace("T", " "))}</span>
      <span class="who">${esc(r.employee)}</span>
      <span>${r.status === "failed" ? "⚠️ " : ""}${esc(r.summary || r.task)}</span>
    </div>`).join("");
}

async function main() {
  let s;
  try {
    const res = await fetch("data/stats.json", { cache: "no-store" });
    s = await res.json();
  } catch (e) {
    document.getElementById("generated").textContent = "숫자를 불러오지 못했어요. `python -m moonyeon stats` 후 웹 서버로 열어 주세요.";
    return;
  }
  document.querySelectorAll("[data-bind=name]").forEach((el) => (el.textContent = s.business.name));
  document.getElementById("kpis").innerHTML = kpiCards(s.kpi);
  document.getElementById("generated").textContent = `기준 시각 ${s.generated_at.replace("T", " ").slice(0, 16)} · 설정 파일과 업무일지에서 자동 집계`;
  document.getElementById("departments").innerHTML = departments(s.departments);
  document.getElementById("recent").innerHTML = recent(s.recent);
  document.getElementById("rules").innerHTML = HOUSE_RULES.map((r) => `<li>${esc(r)}</li>`).join("");
}

main();
