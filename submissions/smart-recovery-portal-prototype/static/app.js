"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const gbp = (v) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v));
const fmtDate = (iso) => new Date(iso + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = (iso) => new Date(iso).toLocaleString("en-GB");

const state = { token: null, config: null, demo: [], current: null, account: null, requestId: null };
const idle = { warn: null, tick: null, lastPing: 0, active: false };

const STEP_OF = { "s-verify": 0, "s-dashboard": 1, "s-pay": 2, "s-plan": 2, "s-ptp": 2, "s-help": 2, "s-receipt": 3 };
const PUBLIC = new Set(["s-start", "s-locked", "s-expired"]);

const HELP_QUESTIONS = {
  hardship: ["What has changed for you?", "How long has this affected your finances?", "Is there anything else we should know?"],
  dispute: ["What are you disputing (balance, fees or agreement)?", "When did you first notice the problem?", "Please describe the issue"],
};

function showAlert(message, info = false) {
  const el = $("#alert");
  el.textContent = message;
  el.classList.toggle("info", info);
  el.hidden = !message;
}

function show(id) {
  $$(".screen").forEach((s) => { s.hidden = s.id !== id; });
  showAlert("");
  const step = STEP_OF[id];
  $("#steps").hidden = step === undefined;
  $$("#steps li").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("current", n === step);
    li.classList.toggle("done", step !== undefined && n < step);
    li.toggleAttribute("aria-current", n === step);
  });
  $("#signout").hidden = PUBLIC.has(id);
  $$(".support-number").forEach((el) => { el.textContent = state.config.support_number; });
  const h1 = $("h1", $("#" + id));
  if (h1) h1.focus();
  window.scrollTo(0, 0);
}

async function api(path, body, method = "POST") {
  const res = window.mockApi(path, body, method, state.token);
  if (res.status === 401 && res.data.error === "session_expired") {
    expire();
    throw new Error("expired");
  }
  return res;
}

function guard(fn) {
  return async (...args) => {
    try { await fn(...args); } catch (e) {
      if (e.message !== "expired") showAlert("Something went wrong. Please try again.");
    }
  };
}

function clearSession() {
  stopIdle();
  state.token = null;
  state.account = null;
  $$("form").forEach((f) => f.reset());
  $("#plan-preview").hidden = true;
  $("#plan-submit").disabled = true;
}

function expire() {
  clearSession();
  show("s-expired");
}

// ---- Inactivity (KAN-15) ----
function startIdle() {
  idle.active = true;
  resetIdle();
}

function stopIdle() {
  idle.active = false;
  clearTimeout(idle.warn);
  clearInterval(idle.tick);
  $("#timeout-modal").hidden = true;
}

function resetIdle() {
  clearTimeout(idle.warn);
  idle.warn = setTimeout(showTimeoutWarning, state.config.warn_after * 1000);
}

function showTimeoutWarning() {
  let left = state.config.session_timeout - state.config.warn_after;
  const text = $("#t-text");
  const render = () => { text.textContent = `Your session will time out in ${left} seconds because there has been no activity.`; };
  render();
  $("#timeout-modal").hidden = false;
  $("#t-stay").focus();
  idle.tick = setInterval(() => {
    left -= 1;
    if (left <= 0) { expire(); return; }
    render();
  }, 1000);
}

function onActivity() {
  if (!idle.active || !$("#timeout-modal").hidden) return;
  resetIdle();
  const gap = Math.max(2, Math.min(20, state.config.session_timeout / 3)) * 1000;
  if (Date.now() - idle.lastPing > gap) {
    idle.lastPing = Date.now();
    api("/api/keepalive", {}).catch(() => {});
  }
}

["click", "keydown", "input", "touchstart"].forEach((ev) => document.addEventListener(ev, onActivity, { passive: true }));

$("#t-stay").addEventListener("click", guard(async () => {
  clearInterval(idle.tick);
  await api("/api/keepalive", {});
  $("#timeout-modal").hidden = true;
  idle.lastPing = Date.now();
  resetIdle();
}));

$("#timeout-modal").addEventListener("keydown", (e) => {
  if (e.key === "Tab") { e.preventDefault(); $("#t-stay").focus(); }
});

// ---- Entry and verification (KAN-11, KAN-14) ----
function renderCustomers() {
  const list = $("#customer-list");
  state.demo.forEach((c) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "customer-btn";
    btn.textContent = c.name;
    const small = document.createElement("span");
    small.textContent = c.scenario;
    btn.append(small);
    btn.addEventListener("click", guard(() => startSession(c)));
    li.append(btn);
    list.append(li);
  });
}

async function startSession(customer) {
  state.current = customer;
  const { ok, data } = await api("/api/session", { ref: customer.ref });
  if (!ok) return showAlert(data.message || "This link is not valid.");
  state.token = data.token;
  if (data.locked) return showLocked(data);
  $("#verify-hint").textContent = `Prototype aid: the fields are pre-filled for ${customer.name} (date of birth ${fmtDate(customer.dob)}, post code ${customer.postcode}, card digits ${customer.last4}). Change them to show a failed attempt.`;
  show("s-verify");
  $("#v-dob").value = customer.dob;
  $("#v-postcode").value = customer.postcode;
  $("#v-last4").value = customer.last4;
}

function showLocked(data) {
  clearSession();
  $("#lock-until").textContent = data.lock_until ? `Access reopens at ${fmtTime(data.lock_until)}.` : "";
  show("s-locked");
}

$("#verify-form").addEventListener("submit", (e) => {
  e.preventDefault();
  guard(async () => {
    const body = { dob: $("#v-dob").value, postcode: $("#v-postcode").value, last4: $("#v-last4").value };
    if (!body.dob || !body.postcode.trim() || !/^\d{4}$/.test(body.last4)) {
      return showAlert("Please complete all three fields. The card digits are exactly 4 numbers.");
    }
    const { ok, status, data } = await api("/api/verify", body);
    if (status === 423) return showLocked(data);
    if (!ok) {
      const left = data.attempts_remaining;
      return showAlert(`${data.message} You have ${left} attempt${left === 1 ? "" : "s"} left.`);
    }
    $("#verify-form").reset();
    startIdle();
    if (data.next === "dashboard") await loadDashboard();
    else show(data.next === "specialist_support" ? "s-specialist" : "s-rep");
  })();
});

// ---- Dashboard (KAN-12) ----
async function loadDashboard() {
  const { ok, status, data } = await api("/api/account", null, "GET");
  if (status === 403) return show("s-rep");
  if (!ok) return showAlert(data.message || "We could not load your account.");
  state.account = data;
  $("#d-name").textContent = data.name;
  $("#d-overdue").textContent = gbp(data.overdue);
  $("#d-product").textContent = data.product;
  $("#d-days").textContent = String(data.days_overdue);
  $("#d-total").textContent = gbp(data.total);
  $("#d-status").textContent = data.status_label;
  $("#opt-pay").disabled = !data.can_pay;
  $("#opt-plan").disabled = !data.can_plan_or_ptp;
  $("#opt-ptp").disabled = !data.can_plan_or_ptp;
  renderCurrent(data);
  show("s-dashboard");
}

function renderCurrent(data) {
  const box = $("#d-current");
  box.replaceChildren();
  const add = (tag, text) => { const el = document.createElement(tag); el.textContent = text; box.append(el); return el; };
  if (data.arrangement && data.arrangement.status === "active") {
    add("h2", `Your ${data.arrangement.months}-month repayment plan`);
    const ol = document.createElement("ol");
    data.arrangement.schedule.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = `${fmtDate(s.due)}: ${gbp(s.amount)} (${s.status === "paid" ? "paid" : "due"})`;
      ol.append(li);
    });
    box.append(ol);
  } else if (data.ptp && data.ptp.status === "open") {
    add("h2", "Your promise to pay");
    add("p", `${gbp(data.ptp.amount)} by ${fmtDate(data.ptp.date)}. Recorded ${fmtTime(data.ptp.captured_at)}.`);
  } else if (data.status === "payment_settled") {
    add("h2", "Your overdue balance is cleared");
    add("p", "There is nothing left to pay on this account.");
  }
  box.hidden = !box.childElementCount;
}

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go && !go.disabled) openScreen(go.dataset.go);
  if (e.target.closest("[data-action=signout]")) signOut();
  if (e.target.closest("[data-action=restart]")) restart();
});

function openScreen(id) {
  state.requestId = crypto.randomUUID();
  if (id === "s-dashboard") return guard(loadDashboard)();
  if (id === "s-pay") { $("#pay-amount").textContent = gbp(state.account.overdue); prefillCard($("#pay-form")); }
  if (id === "s-plan") prefillCard($("#plan-form"));
  if (id === "s-ptp") setupPtp();
  if (id === "s-help") setHelpQuestions();
  show(id);
}

// ---- Card entry used by KAN-20 and KAN-18 ----
function cardFields() {
  $$(".card-fields").forEach((box) => {
    const fields = [
      ["Name on card", "text", "name", "cc-name"],
      ["Card number", "text", "number", "cc-number"],
      ["Expiry (MM/YY)", "text", "expiry", "cc-exp"],
      ["Security code", "text", "cvv", "cc-csc"],
    ];
    fields.forEach(([label, type, name, auto]) => {
      const l = document.createElement("label");
      l.append(label);
      const i = document.createElement("input");
      Object.assign(i, { type, name, autocomplete: auto, required: true });
      if (name === "number") i.inputMode = "numeric";
      if (name === "cvv") { i.inputMode = "numeric"; i.maxLength = 4; }
      l.append(i);
      box.append(l);
    });
    const hint = document.createElement("p");
    hint.className = "demo-card";
    const c = state.config.test_cards;
    hint.textContent = `Prototype test cards: ${c.approved} (approved), ${c.declined} (declined), ${c.gateway_error} (payment service error). Any future expiry, any 3-digit code.`;
    box.append(hint);
  });
}

function readCard(form) {
  const v = (n) => form.elements[n].value.trim();
  return { name: v("name"), number: v("number"), expiry: v("expiry"), cvv: v("cvv") };
}

// Demo convenience: the approved test card is filled in so the flow can be shown quickly.
function prefillCard(form) {
  const set = (n, v) => { form.elements[n].value = v; };
  set("name", state.account.name);
  set("number", state.config.test_cards.approved);
  set("expiry", "12/30");
  set("cvv", "123");
}

function receipt(title, facts, note, { dashboard = true } = {}) {
  $("#h-receipt").textContent = title;
  const dl = $("#receipt-facts");
  dl.replaceChildren();
  facts.forEach(([k, v]) => {
    const d = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = k;
    dd.textContent = v;
    d.append(dt, dd);
    dl.append(d);
  });
  $("#receipt-note").textContent = note;
  $("#receipt-dashboard").hidden = !dashboard;
  show("s-receipt");
}

const KEEP = "Keep this reference. We do not send confirmations by email, so this screen is your proof.";

// ---- Pay in full (KAN-20) ----
$("#pay-form").addEventListener("submit", (e) => {
  e.preventDefault();
  guard(async () => {
    const { ok, data } = await api("/api/pay-full", { request_id: state.requestId, card: readCard(e.target) });
    if (!ok) return showAlert(data.message || "Payment could not be completed.");
    e.target.reset();
    receipt("Payment received", [
      ["Reference", data.reference], ["Amount paid", gbp(data.amount)], ["Card ending", data.card_last4],
      ["Date and time", fmtTime(data.paid_at)], ["Overdue balance now", gbp(data.remaining_overdue)],
    ], KEEP);
  })();
});

// ---- Repayment plan (KAN-18) ----
$$("input[name=months]").forEach((r) => r.addEventListener("change", guard(async () => {
  const { ok, data } = await api("/api/plan/preview", { months: Number(r.value) });
  if (!ok) return showAlert(data.message || "Could not calculate this plan.");
  $("#plan-instalment").textContent = gbp(data.schedule[0].amount);
  $("#plan-total").textContent = gbp(data.total);
  const ol = $("#plan-schedule");
  ol.replaceChildren();
  data.schedule.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = `${i === 0 ? "Today" : fmtDate(s.due)}: ${gbp(s.amount)}`;
    ol.append(li);
  });
  $("#plan-preview").hidden = false;
  $("#plan-submit").disabled = false;
})));

$("#plan-form").addEventListener("submit", (e) => {
  e.preventDefault();
  guard(async () => {
    const months = Number((new FormData(e.target)).get("months"));
    if (!months) return showAlert("Please choose a plan length.");
    const { ok, data } = await api("/api/plan", { request_id: state.requestId, months, card: readCard(e.target) });
    if (!ok) return showAlert(data.message || "Your plan could not be set up.");
    const last = data.schedule[data.schedule.length - 1];
    clearPlanForm(e.target);
    receipt("Repayment plan confirmed", [
      ["Reference", data.reference], ["Plan length", `${data.months} months`], ["First instalment paid", gbp(data.amount)],
      ["Card ending", data.card_last4], ["Final instalment due", `${gbp(last.amount)} on ${fmtDate(last.due)}`],
      ["Overdue balance now", gbp(data.remaining_overdue)],
    ], KEEP);
  })();
});

function clearPlanForm(form) {
  form.reset();
  $("#plan-preview").hidden = true;
  $("#plan-submit").disabled = true;
}

// ---- Promise to pay (KAN-19) ----
function localIso(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function setupPtp() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date();
  end.setDate(end.getDate() + state.config.ptp_max_days);
  $("#ptp-date").min = localIso(start);
  $("#ptp-date").max = localIso(end);
  $("#ptp-amount").max = state.account.overdue;
  $("#ptp-amount").value = state.account.overdue;
}

$("#ptp-form").addEventListener("submit", (e) => {
  e.preventDefault();
  guard(async () => {
    const { ok, data } = await api("/api/ptp", { date: $("#ptp-date").value, amount: $("#ptp-amount").value });
    if (!ok) return showAlert(data.message || "We could not record your promise.");
    e.target.reset();
    receipt("Promise to pay recorded", [
      ["Reference", data.reference], ["Pay by", fmtDate(data.date)], ["Amount", gbp(data.amount)],
      ["Recorded", fmtTime(data.captured_at)],
    ], KEEP + " We will check your account on the promise date.");
  })();
});

// ---- Hardship and dispute (KAN-21) ----
function setHelpQuestions() {
  const type = new FormData($("#help-form")).get("type");
  HELP_QUESTIONS[type].forEach((q, i) => { $(`#q${i + 1}-label`).textContent = q; });
}
$$("input[name=type]").forEach((r) => r.addEventListener("change", setHelpQuestions));

$("#help-form").addEventListener("submit", (e) => {
  e.preventDefault();
  guard(async () => {
    const type = new FormData(e.target).get("type");
    const answers = [$("#q1").value, $("#q2").value, $("#q3").value];
    if (answers.some((a) => !a.trim())) return showAlert("Please answer all three questions.");
    const { ok, data } = await api("/api/hardship", { type, answers });
    if (!ok) return showAlert(data.message || "We could not send your request.");
    clearSession();
    receipt("Your request has been sent", [
      ["Reference", data.reference], ["Request", type === "hardship" ? "Financial hardship" : "Balance dispute"],
    ], `A specialist will contact you. You can also call ${data.support_number}. Online options are now paused for this account. ${KEEP}`, { dashboard: false });
    $("#signout").hidden = true;
  })();
});

// ---- Sign out and restart ----
async function signOut() {
  if (state.token) await api("/api/logout", {}).catch(() => {});
  restart();
}

function restart() {
  clearSession();
  show("s-start");
}

$("#signout").addEventListener("click", signOut);

(async function init() {
  window.mockApi.reset(); // each page load starts a fresh demo
  state.config = (await api("/api/config", null, "GET")).data;
  state.demo = (await api("/api/demo/customers", null, "GET")).data.customers;
  cardFields();
  renderCustomers();
  show("s-start");
})();
