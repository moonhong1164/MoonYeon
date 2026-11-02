/* 화면 동작: 무료 사주 계산·풀이 표시, 상품 목록, 주문서 */
(function () {
  "use strict";
  const S = window.Saju;
  const R = window.Reading;
  const SHOP = window.SHOP;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 받침 있으면 a, 없으면 b (예: 이여/여)
  const josa = (word, a, b) => {
    const c = word.charCodeAt(word.length - 1) - 0xac00;
    return c >= 0 && c < 11172 && c % 28 ? a : b;
  };
  const won = (n) => n.toLocaleString("ko-KR") + "원";

  // 가게 이름
  document.querySelectorAll("[data-shop=name]").forEach((el) => (el.textContent = SHOP.name));
  document.title = SHOP.name;
  if (SHOP.hours) $("#hours-text").textContent = SHOP.hours;

  // ── 무료 사주 ────────────────────────────────────────
  const form = $("#saju-form");
  const timeInput = form.elements.time;
  form.elements.unknown.addEventListener("change", (e) => (timeInput.disabled = e.target.checked));

  let last = null; // 주문서 미리 채우기용

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    $("#form-error").textContent = "";
    const f = form.elements;
    if (!f.birth.value) {
      $("#form-error").textContent = "생년월일을 넣어 주거라.";
      return;
    }
    const [year, month, day] = f.birth.value.split("-").map(Number);
    const unknown = f.unknown.checked;
    const [hour, minute] = (f.time.value || "12:00").split(":").map(Number);
    let r;
    try {
      r = S.calculate({ year, month, day, hour, minute, timeUnknown: unknown, solarTime: f.solar.checked });
    } catch (err) {
      $("#form-error").textContent = err.message;
      return;
    }
    last = { name: f.name.value.trim(), gender: f.gender.value, birth: f.birth.value, time: unknown ? "모름" : f.time.value };
    render(r, last.name);
  });

  function glyph(p, which) {
    if (!p) return `<div class="glyph unknown"><span class="h">？</span><span class="k">모름</span></div>`;
    const e = which === "stem" ? S.STEM_ELEMENT[p.stem] : S.BRANCH_ELEMENT[p.branch];
    const h = which === "stem" ? S.STEMS_HANJA[p.stem] : S.BRANCHES_HANJA[p.branch];
    const k = which === "stem" ? S.STEMS[p.stem] : S.BRANCHES[p.branch];
    return `<div class="glyph e${e}"><span class="h">${h}</span><span class="k">${k} · ${S.ELEMENTS[e]}</span></div>`;
  }

  function render(r, name) {
    const reading = R.build(r, S);
    const who = name ? esc(name) + josa(name, "이", "") : "아가";
    const dmWord = S.STEMS[r.dayMaster] + S.ELEMENTS[r.dayMasterElement];
    $("#greet").innerHTML = `아이고, ${who} 왔구먼. ${r.input.year}년생 <b>${r.animal}띠</b>(${S.label(r.pillars.year)}년)이고, 태어난 날 기운은 <b>${dmWord}</b>${josa(dmWord, "이여", "여")}. 찬찬히 봐 줄게.`;

    const cols = [
      ["시", r.pillars.hour, r.hourName || "시 모름"],
      ["일", r.pillars.day, "나 자신"],
      ["월", r.pillars.month, `${r.monthTermName} 이후`],
      ["년", r.pillars.year, `${r.animal}띠`],
    ];
    $("#pillars").innerHTML = cols
      .map(([head, p, note]) => `
        <div class="pillar ${head === "일" ? "me" : ""}">
          <div class="head">${head}주 <small>${esc(note)}</small></div>
          ${glyph(p, "stem")}${glyph(p, "branch")}
        </div>`)
      .join("");
    const notes = [];
    notes.push(r.input.useSolarTime ? "서울 기준 보정" : "보정 없음");
    if (r.input.dst) notes.push("서머타임 1시간 뺌");
    $("#calendar-note").textContent = `(양력 ${r.input.year}.${r.input.month}.${r.input.day}${r.input.timeUnknown ? "" : ` ${String(r.input.hour).padStart(2, "0")}:${String(r.input.minute).padStart(2, "0")}`} · ${notes.join(" · ")})`;
    $("#boundary-note").textContent = r.nearTermBoundary
      ? "⚠️ 절기가 바뀌는 시각과 가까운 때에 태어났어요. 몇십 분 차이로 월주가 달라질 수 있으니, 자세한 풀이에서 정확히 짚어 드려요."
      : "가운데 굵은 테두리가 '나 자신'을 뜻하는 일간이에요.";

    const total = r.counts.reduce((a, b) => a + b, 0);
    $("#bars").innerHTML = r.counts
      .map((c, i) => `
        <div class="bar">
          <span>${S.ELEMENTS[i]}(${S.ELEMENTS_HANJA[i]})</span>
          <div class="track"><div class="fill e${i}" style="width:${(c / total) * 100}%"></div></div>
          <b>${c}</b>
        </div>`)
      .join("");
    $("#balance").textContent = `제일 센 기운은 ${reading.strongText}이구먼. ${reading.balance}`;

    $("#dm-title").textContent = reading.dayMaster.title;
    $("#dm-nature").textContent = reading.dayMaster.nature;
    $("#dm-good").textContent = reading.dayMaster.good;
    $("#dm-care").textContent = reading.dayMaster.care;

    $("#tips").innerHTML = reading.tips
      .map((t) => `<div class="tip"><h4>${esc(t.name)}</h4>행운의 색: ${esc(t.color)}<br>좋은 방향: ${esc(t.direction)}<br>이렇게 채우거라: ${esc(t.tip)}</div>`)
      .join("");

    $("#year-title").textContent = `${reading.year.label} 기운`;
    $("#year-text").textContent = reading.year.text;

    $("#result").hidden = false;
    $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── 상품 목록 ────────────────────────────────────────
  $("#product-list").innerHTML = SHOP.products
    .map((p) => `
      <article class="product">
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
        <h3>${esc(p.name)}</h3>
        <div class="price">${won(p.price)} <small>/ 1회</small></div>
        <p>${esc(p.desc)}</p>
        <ul>${p.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        <button class="btn btn-red" data-order="${esc(p.id)}">이 풀이 주문하기</button>
      </article>`)
    .join("");

  // ── 주문서 ──────────────────────────────────────────
  const dialog = $("#order");
  const of = $("#order-form");
  const productSelect = $("#order-product");
  productSelect.innerHTML = SHOP.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${won(p.price)})</option>`).join("");

  const bank = SHOP.bank || {};
  $("#bank").innerHTML = bank.account
    ? `입금 계좌: <b>${esc(bank.name)} ${esc(bank.account)}</b>${bank.holder ? ` (예금주 ${esc(bank.holder)})` : ""}<br><span class="small">입금자명은 주문서 이름과 같게 해 주세요.</span>`
    : "주문서를 카카오톡으로 보내 주시면 입금 계좌를 안내해 드려요.";
  if (SHOP.kakaoUrl) {
    $("#kakao-link").href = SHOP.kakaoUrl;
    $("#kakao-link").hidden = false;
  }

  function orderText() {
    const f = of.elements;
    const p = SHOP.products.find((x) => x.id === f.product.value);
    const lines = [
      `[${SHOP.name} 주문서]`,
      `상품: ${p.name} (${won(p.price)})`,
      `이름: ${f.name.value}`,
      `성별: ${f.gender.value}`,
      `생년월일: ${f.birth.value}`,
      `태어난 시각: ${f.time.value || "모름"}`,
    ];
    if (p.id === "love") lines.push(`상대방: ${f.partner.value}`);
    lines.push(`궁금한 점: ${f.question.value || "-"}`, `연락처: ${f.contact.value}`);
    return lines.join("\n");
  }

  function refresh() {
    $("#partner-wrap").hidden = of.elements.product.value !== "love";
    $("#order-text").textContent = orderText();
    $("#copy-done").textContent = "";
  }
  of.addEventListener("input", refresh);
  of.addEventListener("change", refresh);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order]");
    if (!btn) return;
    of.elements.product.value = btn.dataset.order;
    if (last) {
      of.elements.name.value ||= last.name;
      of.elements.gender.value = last.gender;
      of.elements.birth.value ||= `${last.birth} (양력)`;
      of.elements.time.value ||= last.time;
    }
    refresh();
    dialog.showModal();
  });

  $("#copy-order").addEventListener("click", async () => {
    const f = of.elements;
    if (!f.name.value || !f.birth.value || !f.contact.value) {
      $("#copy-done").textContent = "이름, 생년월일, 연락받을 곳은 꼭 적어 주세요.";
      return;
    }
    try {
      await navigator.clipboard.writeText(orderText());
      $("#copy-done").textContent = "복사했어요! 카카오톡 채팅창에 붙여 넣어 보내 주세요.";
    } catch {
      $("#copy-done").textContent = "자동 복사가 안 돼요. 위 주문서를 길게 눌러 직접 복사해 주세요.";
    }
  });
})();
