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

  // ── 방문자 분석 (config.js 의 analytics 코드가 있을 때만) ──
  const track = (name) => {
    try { window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: name, event: true }); } catch {}
  };
  if (SHOP.analytics && /^[a-z0-9-]+$/.test(SHOP.analytics)) {
    const sc = document.createElement("script");
    sc.async = true;
    sc.src = "https://gc.zgo.at/count.js";
    sc.dataset.goatcounter = `https://${SHOP.analytics}.goatcounter.com/count`;
    document.head.appendChild(sc);
  }

  // 가게 이름
  document.querySelectorAll("[data-shop=name]").forEach((el) => (el.textContent = SHOP.name));

  // ── 시즌 배너 ───────────────────────────────────────
  (function promo() {
    const p = SHOP.promo;
    if (!p || !p.enabled) return;
    if (p.until && new Date() > new Date(`${p.until}T23:59:59+09:00`)) return;
    const key = `promo-closed:${p.title}`;
    try { if (sessionStorage.getItem(key)) return; } catch {}
    $("#promo-title").textContent = p.title;
    $("#promo-sub").textContent = p.sub || "";
    $("#promo-btn").dataset.order = p.product;
    $("#promo").hidden = false;
    $("#promo-btn").addEventListener("click", () => track(`promo-${p.product}`));
    $("#promo-close").addEventListener("click", () => {
      $("#promo").hidden = true;
      try { sessionStorage.setItem(key, "1"); } catch {}
    });
  })();
  document.title = SHOP.name;
  if (SHOP.hours) $("#hours-text").textContent = SHOP.hours;

  // ── 안내자(캐릭터) ─────────────────────────────────
  const GUIDES = SHOP.guides || [];
  let guide = null;
  $("#guide-list").innerHTML = GUIDES.map((g) => `
    <article class="guide" data-guide="${esc(g.id)}">
      <div class="guide-art">
        ${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.name)}" loading="lazy">` : `<div class="guide-ph" aria-hidden="true"><span class="ph-ring"></span><span class="ph-hanja">${esc(g.hanja)}</span><span class="ph-brand">月緣</span></div>`}
        <div class="guide-info">
          <h3>${esc(g.name)}</h3>
          <p>${esc(g.line)}</p>
          <button type="button" class="btn btn-gold small-btn" data-pick="${esc(g.id)}">${esc(g.name)}${josa(g.name, "과", "와")} 사주 보기</button>
        </div>
      </div>
    </article>`).join("");
  function pickGuide(id) {
    guide = GUIDES.find((g) => g.id === id) || null;
    document.querySelectorAll(".guide").forEach((el) => el.classList.toggle("picked", guide && el.dataset.guide === guide.id));
    if (guide) {
      $("#avatar").textContent = guide.hanja;
      $("#submit-btn").textContent = `${guide.name}에게 내 사주 보여 주기`;
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    pickGuide(b.dataset.pick);
    track(`guide-${b.dataset.pick}`);
    $("#free").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ── 후기 (실제 후기만) ─────────────────────────────
  const REVIEWS = SHOP.reviews || [];
  if (REVIEWS.length) {
    const ANIMAL_HANJA = { 쥐: "子", 소: "丑", 호랑이: "寅", 토끼: "卯", 용: "辰", 뱀: "巳", 말: "午", 양: "未", 원숭이: "申", 닭: "酉", 개: "戌", 돼지: "亥" };
    $("#story-list").innerHTML = REVIEWS.map((v) => `
      <article class="story">
        <header><span class="story-badge">${esc(ANIMAL_HANJA[v.animal] || "月")}</span>
          <div><b>${esc(v.name)}</b><small>${esc(v.animal ? v.animal + "띠 · " : "")}${esc(v.product || "")}</small></div>
          <time>${esc(v.date || "")}</time></header>
        <p>${esc(v.text)}</p>
      </article>`).join("");
    $("#stories").hidden = false;
  }

  // ── 무료 사주 ────────────────────────────────────────
  const form = $("#saju-form");
  const f = form.elements;
  const timeInput = f.time;
  f.unknown.addEventListener("change", (e) => (timeInput.disabled = e.target.checked));

  // 생년월일 선택 상자
  const thisYear = new Date().getFullYear();
  const opt = (v, t, sel) => `<option value="${v}"${sel ? " selected" : ""}>${t}</option>`;
  f.y.innerHTML = opt("", "년", true) + Array.from({ length: thisYear - 1901 + 1 }, (_, i) => thisYear - i).map((y) => opt(y, `${y}년`)).join("");
  f.m.innerHTML = opt("", "월", true) + Array.from({ length: 12 }, (_, i) => opt(i + 1, `${i + 1}월`)).join("");
  f.d.innerHTML = opt("", "일", true) + Array.from({ length: 31 }, (_, i) => opt(i + 1, `${i + 1}일`)).join("");
  const isLunar = () => f.cal.value === "lunar";
  form.querySelectorAll("input[name=cal]").forEach((el) =>
    el.addEventListener("change", () => {
      form.querySelector(".leap").hidden = !isLunar();
      if (!isLunar()) f.leap.checked = false;
    })
  );

  let last = null; // 주문서 미리 채우기·공유 카드용

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    $("#form-error").textContent = "";
    if (!f.y.value || !f.m.value || !f.d.value) {
      $("#form-error").textContent = "생년월일을 모두 골라 주세요.";
      return;
    }
    const by = Number(f.y.value), bm = Number(f.m.value), bd = Number(f.d.value);
    const unknown = f.unknown.checked;
    const [hour, minute] = (f.time.value || "12:00").split(":").map(Number);
    let solar = { year: by, month: bm, day: bd };
    let lunarText = "";
    let r;
    try {
      if (isLunar()) {
        solar = window.Lunar.lunarToSolar(by, bm, bd, f.leap.checked);
        lunarText = `음력 ${by}.${bm}.${bd}${f.leap.checked ? "(윤달)" : ""}`;
      }
      r = S.calculate({ ...solar, hour, minute, timeUnknown: unknown, solarTime: f.solar.checked });
    } catch (err) {
      $("#form-error").textContent = err.message;
      return;
    }
    const pad = (n) => String(n).padStart(2, "0");
    const solarStr = `${solar.year}-${pad(solar.month)}-${pad(solar.day)}`;
    last = {
      name: f.name.value.trim(),
      gender: f.gender.value,
      birth: lunarText ? `${lunarText} (양력 ${solarStr})` : `${solarStr} (양력)`,
      time: unknown ? "모름" : f.time.value,
      result: r,
      lunarText,
    };
    render(r, last.name, lunarText);
    track(isLunar() ? "free-saju-lunar" : "free-saju");
  });

  // ── 이달의 운세 ─────────────────────────────────────
  let monthState = null;
  function renderMonth(offset) {
    if (!monthState || !window.Monthly) return;
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const y = base.getFullYear(), mo = base.getMonth() + 1;
    const m = window.Monthly.build(monthState.r, S, y, mo, monthState.name);
    document.querySelectorAll(".month-tabs button").forEach((b) => b.classList.toggle("on", Number(b.dataset.offset) === offset));
    $("#tab-this").textContent = `${now.getMonth() + 1}월 · 이번 달`;
    $("#tab-next").textContent = `${((now.getMonth() + 1) % 12) + 1}월 · 다음 달`;
    $("#m-eyebrow").textContent = `${y}년 ${mo}월 사주`;
    $("#m-title").textContent = m.title;
    $("#m-theme").textContent = m.theme;
    $("#m-meta").innerHTML = `${mo}월의 기운 <b>${esc(m.pillarLabel)}(${esc(m.pillarHanja)})</b> · 내 일간 <b>${esc(m.dmLabel)}</b>`;
    $("#m-keyword").textContent = `이달의 키워드 · ${m.keyword}`;
    document.querySelectorAll(".m-mon").forEach((el) => (el.textContent = `${mo}월`));
    $("#m-you").textContent = m.you;
    $("#m-overall").textContent = m.overall;
    $("#m-money").textContent = m.money;
    $("#m-love").textContent = m.love;
    $("#m-work").textContent = m.work;
    $("#m-health").textContent = m.health;
    $("#m-color").textContent = m.luck.color;
    $("#m-dir").textContent = m.luck.dir;
    $("#m-num").textContent = m.luck.num;
    $("#m-item").textContent = m.luck.item;
    $("#m-cautions").innerHTML = m.cautions.map((c) => `<li>${esc(c)}</li>`).join("");
    $("#m-quote").textContent = `“${m.quote}”`;
    $("#m-note").textContent = `사주의 달은 절기로 바뀌어요. ${mo}월의 기운은 ${mo}월 초 절기(4~8일 무렵)부터 시작돼요.`;
  }
  document.querySelectorAll(".month-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      renderMonth(Number(b.dataset.offset));
      track(Number(b.dataset.offset) ? "month-next" : "month-this");
    })
  );

  function glyph(p, which) {
    if (!p) return `<div class="glyph unknown"><span class="h">？</span><span class="k">모름</span></div>`;
    const e = which === "stem" ? S.STEM_ELEMENT[p.stem] : S.BRANCH_ELEMENT[p.branch];
    const h = which === "stem" ? S.STEMS_HANJA[p.stem] : S.BRANCHES_HANJA[p.branch];
    const k = which === "stem" ? S.STEMS[p.stem] : S.BRANCHES[p.branch];
    return `<div class="glyph e${e}"><span class="h">${h}</span><span class="k">${k} · ${S.ELEMENTS[e]}</span></div>`;
  }

  function render(r, name, lunarText) {
    const reading = R.build(r, S);
    const who = name ? `${esc(name)}님` : "당신";
    const dmWord = S.STEMS[r.dayMaster] + S.ELEMENTS[r.dayMasterElement];
    const voice = guide ? `${esc(guide.name)}${josa(guide.name, "이", "가")} ` : "";
    $("#greet").innerHTML = `${voice}${who}의 사주를 펼쳐 봤어요. ${r.input.year}년생 <b>${r.animal}띠</b>(${S.label(r.pillars.year)}년)이고, 나를 나타내는 일간은 <b>${dmWord}</b>${josa(dmWord, "이에요", "예요")}.`;

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
    $("#calendar-note").textContent = `(${lunarText ? lunarText + " → " : ""}양력 ${r.input.year}.${r.input.month}.${r.input.day}${r.input.timeUnknown ? "" : ` ${String(r.input.hour).padStart(2, "0")}:${String(r.input.minute).padStart(2, "0")}`} · ${notes.join(" · ")})`;
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
    $("#balance").textContent = `가장 강한 기운은 ${reading.strongText}이에요. ${reading.balance}`;

    $("#dm-title").textContent = reading.dayMaster.title;
    $("#dm-nature").textContent = reading.dayMaster.nature;
    $("#dm-good").textContent = reading.dayMaster.good;
    $("#dm-care").textContent = reading.dayMaster.care;

    $("#tips").innerHTML = reading.tips
      .map((t) => `<div class="tip"><h4>${esc(t.name)}</h4>행운의 색: ${esc(t.color)}<br>좋은 방향: ${esc(t.direction)}<br>채우는 방법: ${esc(t.tip)}</div>`)
      .join("");

    $("#year-title").textContent = `${reading.year.label} 기운`;
    $("#year-text").textContent = reading.year.text;

    monthState = { r, name };
    renderMonth(0);

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
        <button class="btn btn-main" data-order="${esc(p.id)}">이 풀이 주문하기</button>
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
      of.elements.birth.value ||= last.birth;
      of.elements.time.value ||= last.time;
    }
    refresh();
    dialog.showModal();
    track(`order-open-${btn.dataset.order}`);
  });

  $("#kakao-link").addEventListener("click", () => track("order-kakao"));

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
  // ── 결과 카드 이미지 (공유·저장) ──────────────────────
  const ELEMENT_COLORS = ["#4f9a6a", "#e2604c", "#c99a3d", "#9aa0ab", "#36508a"];
  const siteUrl = () => location.origin + location.pathname;

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function drawCard() {
    if (!last) return null;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const r = last.result;
    const reading = R.build(r, S);
    const c = $("#share-canvas");
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const serif = '"Noto Serif KR", serif', sans = '"Noto Sans KR", sans-serif';

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#f8f4ea");
    g.addColorStop(1, "#eee6d2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1f4d3a33";
    [[120, 160, 2], [930, 120, 3], [820, 300, 2], [160, 520, 2], [980, 620, 2], [70, 980, 3]].forEach(([x, y, rad]) => {
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    });

    // 달 + 이름
    const moon = ctx.createRadialGradient(W / 2 - 30, 190, 10, W / 2, 210, 110);
    moon.addColorStop(0, "#fffbea"); moon.addColorStop(1, "#e9c46a");
    ctx.fillStyle = moon;
    ctx.beginPath(); ctx.arc(W / 2, 210, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#173a2c";
    ctx.textAlign = "center";
    ctx.font = `900 64px ${serif}`;
    ctx.fillText("월연", W / 2, 232);

    ctx.fillStyle = "#5d6b63";
    ctx.font = `500 34px ${sans}`;
    ctx.fillText(`${last.name ? last.name + "님" : "나"}의 사주 · ${r.animal}띠`, W / 2, 380);
    ctx.fillStyle = "#173a2c";
    ctx.font = `900 50px ${serif}`;
    ctx.fillText(reading.dayMaster.title, W / 2, 452);

    // 여덟 글자
    const cols = [r.pillars.hour, r.pillars.day, r.pillars.month, r.pillars.year];
    const heads = ["시", "일", "월", "년"];
    const bw = 190, bh = 150, gap = 22, x0 = (W - (bw * 4 + gap * 3)) / 2, y0 = 530;
    cols.forEach((p, i) => {
      const x = x0 + i * (bw + gap);
      ctx.fillStyle = "#7a857e"; ctx.font = `500 28px ${sans}`;
      ctx.fillText(heads[i] + "주", x + bw / 2, y0 - 16);
      [["stem", 0], ["branch", 1]].forEach(([which, row]) => {
        const y = y0 + row * (bh + 16);
        let color = "#d9d1bd", hanja = "?", kor = "모름";
        if (p) {
          const e = which === "stem" ? S.STEM_ELEMENT[p.stem] : S.BRANCH_ELEMENT[p.branch];
          color = ELEMENT_COLORS[e];
          hanja = which === "stem" ? S.STEMS_HANJA[p.stem] : S.BRANCHES_HANJA[p.branch];
          kor = (which === "stem" ? S.STEMS[p.stem] : S.BRANCHES[p.branch]) + " · " + S.ELEMENTS[e];
        }
        ctx.fillStyle = color; rrect(ctx, x, y, bw, bh, 22); ctx.fill();
        if (i === 1 && row === 0) { ctx.strokeStyle = "#173a2c"; ctx.lineWidth = 6; rrect(ctx, x - 6, y - 6, bw + 12, bh + 12, 26); ctx.stroke(); }
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 80px ${serif}`; ctx.fillText(hanja, x + bw / 2, y + 92);
        ctx.font = `500 26px ${sans}`; ctx.fillText(kor, x + bw / 2, y + 132);
      });
    });

    // 오행 막대
    const total = r.counts.reduce((a, b) => a + b, 0);
    const by0 = 900, barX = 250, barW = 640;
    r.counts.forEach((n, i) => {
      const y = by0 + i * 52;
      ctx.textAlign = "left"; ctx.fillStyle = "#3d4a43"; ctx.font = `500 30px ${sans}`;
      ctx.fillText(`${S.ELEMENTS[i]}(${S.ELEMENTS_HANJA[i]})`, 150, y + 26);
      ctx.fillStyle = "#1f4d3a1a"; rrect(ctx, barX, y + 6, barW, 24, 12); ctx.fill();
      if (n) { ctx.fillStyle = ELEMENT_COLORS[i]; rrect(ctx, barX, y + 6, Math.max(24, (barW * n) / total), 24, 12); ctx.fill(); }
      ctx.textAlign = "right"; ctx.fillStyle = "#173a2c"; ctx.fillText(String(n), 940, y + 28);
    });

    // 한 줄 + 주소
    ctx.textAlign = "center";
    ctx.fillStyle = "#2e6b52"; ctx.font = `700 32px ${sans}`;
    ctx.fillText(`타고난 강점 · ${reading.dayMaster.good}`, W / 2, 1210);
    ctx.fillStyle = "#8a948d"; ctx.font = `500 26px ${sans}`;
    ctx.fillText(`${SHOP.name} · ${siteUrl().replace(/^https?:\/\//, "")}`, W / 2, 1290);
    return c;
  }

  const toBlob = (c) => new Promise((res) => c.toBlob(res, "image/png"));
  const shareDone = (t) => ($("#share-done").textContent = t);

  $("#save-image").addEventListener("click", async () => {
    const c = await drawCard();
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "wolyeon-saju.png";
    a.click();
    shareDone("이미지를 저장했어요. 휴대폰에서는 사진 앱이나 다운로드 폴더를 확인해 주세요.");
  });

  $("#share-image").addEventListener("click", async () => {
    track("share-image");
    const c = await drawCard();
    if (!c) return;
    const file = new File([await toBlob(c)], "wolyeon-saju.png", { type: "image/png" });
    const data = { files: [file], title: `${SHOP.name} — 나의 사주`, text: `나도 사주 봤어! 무료로 보기 → ${siteUrl()}` };
    if (navigator.canShare && navigator.canShare(data)) {
      try { await navigator.share(data); shareDone(""); } catch { /* 사용자가 취소 */ }
    } else {
      $("#save-image").click();
      shareDone("이 브라우저에서는 바로 공유가 안 돼서 이미지를 저장했어요. 저장한 사진을 카톡이나 인스타에 올려 주세요.");
    }
  });

  $("#copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(siteUrl());
      shareDone("링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요.");
    } catch {
      shareDone(siteUrl());
    }
  });
})();
