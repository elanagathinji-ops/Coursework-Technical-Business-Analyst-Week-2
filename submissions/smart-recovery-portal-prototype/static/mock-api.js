/* In-browser stand-in for the Smart-Recovery backend, so the prototype runs from a plain HTML file.
   Demo data only. Mirrors server.py: same rules, same responses. */
(function () {
  "use strict";

  const KEY = "sr_proto_state_v1";
  const SESSION_TIMEOUT = 300;
  const LOCK_MS = 3600 * 1000;
  const MAX_ATTEMPTS = 3;
  const BALANCE_LIMIT = 500000; // pence; eligible only if overdue is strictly below 5,000
  const DAYS_LIMIT = 60;
  const PTP_MAX_DAYS = 30;
  const SUPPORT = "0800 000 0000";

  const STATUS_LABELS = {
    delinquent: "Overdue", portal_eligible: "Overdue", awaiting_representative: "With our team",
    repayment_arrangement: "Repayment plan active", ptp_captured: "Promise to pay recorded",
    ptp_unpaid: "Promise not met - with our team", payment_settled: "Paid in full",
    hardship_flagged: "Specialist support requested", dispute_flagged: "Dispute under review",
  };
  const TEST_CARDS = { approved: "4242 4242 4242 4242", declined: "4000 0000 0000 0002", gateway_error: "4000 0000 0000 0119" };

  const SEED = [
    { id: "ACC-10001", ref: "SR-NC01", name: "Naomi Clarke", dob: "1985-04-12", postcode: "M1 4BT", last4: "4821", product: "Credit Card", overdue: 174722, total: 1482254, days: 28, hardship: false, vulnerability: false, dispute: false, scenario: "Eligible: full journey (pay, plan, promise to pay, help)" },
    { id: "ACC-10002", ref: "SR-TR02", name: "Tom Reed", dob: "1979-11-02", postcode: "LS1 2AB", last4: "7730", product: "Personal Loan", overdue: 315000, total: 980000, days: 45, hardship: false, vulnerability: false, dispute: false, scenario: "Eligible: personal loan, 45 days overdue" },
    { id: "ACC-10003", ref: "SR-OH03", name: "Omar Hassan", dob: "1990-01-30", postcode: "B1 1AA", last4: "1156", product: "Auto Finance", overdue: 620000, total: 2140000, days: 38, hardship: false, vulnerability: false, dispute: false, scenario: "Not eligible: balance at or above 5,000" },
    { id: "ACC-10004", ref: "SR-PN04", name: "Priya Nair", dob: "1988-07-19", postcode: "E14 9AB", last4: "9042", product: "Credit Card", overdue: 77239, total: 1149659, days: 71, hardship: false, vulnerability: false, dispute: false, scenario: "Not eligible: 60 or more days overdue" },
    { id: "ACC-10005", ref: "SR-DW05", name: "Daniel Wright", dob: "1972-03-08", postcode: "G1 2RT", last4: "3365", product: "Personal Loan", overdue: 90000, total: 410000, days: 20, hardship: true, vulnerability: false, dispute: false, scenario: "Hardship flag: diverted to specialist support" },
    { id: "ACC-10006", ref: "SR-FB06", name: "Fiona Bell", dob: "1994-09-23", postcode: "CF10 1AA", last4: "2208", product: "Credit Card", overdue: 125000, total: 602000, days: 33, hardship: false, vulnerability: false, dispute: true, scenario: "Open dispute: diverted to representative" },
    { id: "ACC-10007", ref: "SR-AO07", name: "Amara Okafor", dob: "1966-12-14", postcode: "NE1 4ST", last4: "5514", product: "Auto Finance", overdue: 41000, total: 730000, days: 15, hardship: false, vulnerability: true, dispute: false, scenario: "Vulnerability flag: diverted to specialist support" },
  ];

  class ApiErr extends Error {
    constructor(status, code, message, extra) {
      super(message);
      this.status = status; this.code = code; this.extra = extra || {};
    }
  }

  let S;
  let memState = null;

  // ---- helpers ----
  const utcNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const money = (c) => (c / 100).toFixed(2);
  const todayISO = () => new Date().toLocaleDateString("en-CA");
  const normPostcode = (s) => String(s || "").replace(/\s/g, "").toUpperCase();
  const dayNumber = (iso) => Date.parse(iso + "T00:00:00Z") / 86400000;

  function addMonths(iso, n) {
    const [y, m, d] = iso.split("-").map(Number);
    const total = m - 1 + n;
    const year = y + Math.floor(total / 12);
    const month = total % 12;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(d, last))).toISOString().slice(0, 10);
  }

  // Not cryptographic: a simple chain so the staff view can show linked records.
  function chainHash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
  }

  function audit(accountId, event, actor, outcome, detail) {
    const prev = S.audit.length ? S.audit[S.audit.length - 1].hash : "0".repeat(14);
    const rec = { seq: S.audit.length + 1, ts: utcNow(), account_id: accountId, event, actor, outcome, detail: detail || {}, prev_hash: prev };
    rec.hash = chainHash(JSON.stringify(rec));
    S.audit.push(rec);
  }

  function writeBack(id, status, fields) {
    const a = S.accounts[id];
    Object.assign(a, fields || {});
    if (status) {
      a.status = status;
      a.status_history.push({ ts: utcNow(), status });
    }
    audit(id, "db_write_back", "system", "success", { status: status || null, fields: Object.keys(fields || {}).sort() });
  }

  function routeToRep(id, queue, reasons, priority, context) {
    S.queue.push({ id: "CASE-" + String(S.queue.length + 1).padStart(4, "0"), account_id: id, queue, priority: priority || "normal",
      reasons, context: context || {}, created: utcNow(), status: "open" });
    audit(id, "routed_to_representative", "system", "success", { queue, reasons });
  }

  function triage(a) {
    const r = [];
    if (a.hardship_flag) r.push("HARDSHIP_FLAG");
    if (a.vulnerability_flag) r.push("VULNERABILITY_FLAG");
    if (a.dispute_flag) r.push("ACTIVE_DISPUTE");
    if (!(a.overdue < BALANCE_LIMIT)) r.push("BALANCE_NOT_UNDER_5000");
    if (!(a.days < DAYS_LIMIT)) r.push("DAYS_OVERDUE_60_PLUS");
    return r;
  }

  function freshState() {
    S = { accounts: {}, queue: [], audit: [], sessions: {}, processed: {} };
    SEED.forEach((s) => {
      S.accounts[s.id] = { account_id: s.id, access_ref: s.ref, name: s.name, dob: s.dob, postcode: s.postcode, last4: s.last4,
        product: s.product, overdue: s.overdue, total: s.total, days: s.days, hardship_flag: s.hardship,
        vulnerability_flag: s.vulnerability, dispute_flag: s.dispute, scenario: s.scenario, status: "delinquent",
        portal_eligible: false, triage_reasons: [], failed_attempts: 0, lock_until: null, arrangement: null, ptp: null, status_history: [] };
    });
    Object.values(S.accounts).forEach((a) => {
      const reasons = triage(a);
      const ok = reasons.length === 0;
      audit(a.account_id, "triage", "system", ok ? "eligible" : "ineligible", { reasons });
      writeBack(a.account_id, ok ? "portal_eligible" : "awaiting_representative", { portal_eligible: ok, triage_reasons: reasons });
      if (!ok) {
        const specialist = reasons.some((r) => ["HARDSHIP_FLAG", "VULNERABILITY_FLAG", "ACTIVE_DISPUTE"].includes(r));
        routeToRep(a.account_id, specialist ? "specialist" : "standard", reasons);
      }
    });
    return S;
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { if (memState) return memState; }
    return memState || freshState();
  }

  function save() {
    memState = S;
    try { window.localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* in-memory fallback */ }
  }

  // ---- session and rules ----
  function lockInfo(a) {
    const locked = isLocked(a);
    return { locked, support_number: SUPPORT, lock_until: locked ? new Date(a.lock_until).toISOString() : null };
  }

  function isLocked(a) {
    if (a.lock_until && a.lock_until > Date.now()) return true;
    if (a.lock_until) {
      writeBack(a.account_id, null, { lock_until: null, failed_attempts: 0 });
      audit(a.account_id, "lock_expired", "system", "success");
    }
    return false;
  }

  function getSession(token, verified) {
    const s = S.sessions[token || ""];
    if (!s) throw new ApiErr(401, "session_expired", "Your session has ended. Please start again.");
    if (Date.now() - s.last > SESSION_TIMEOUT * 1000) {
      delete S.sessions[token];
      audit(s.account_id, "session_timeout", "system", "success");
      throw new ApiErr(401, "session_expired", "Your session timed out for your security.");
    }
    if (verified !== false && !s.verified) throw new ApiErr(401, "not_verified", "Please verify your identity first.");
    s.last = Date.now();
    return s;
  }

  function nextStep(a) {
    if (a.hardship_flag || a.vulnerability_flag) return "specialist_support";
    if (a.dispute_flag || !a.portal_eligible) return "representative_support";
    return "dashboard";
  }

  function portalAccount(token) {
    const s = getSession(token);
    const a = S.accounts[s.account_id];
    if (nextStep(a) !== "dashboard") throw new ApiErr(403, "diverted", "This account needs support from our team.", { support_number: SUPPORT });
    return a;
  }

  function luhnOk(num) {
    let total = 0;
    [...num].reverse().forEach((ch, i) => {
      let d = Number(ch);
      if (i % 2) { d *= 2; if (d > 9) d -= 9; }
      total += d;
    });
    return total % 10 === 0;
  }

  function validateCard(card) {
    const bad = new ApiErr(400, "invalid_card", "Please check your card details.");
    if (!card || typeof card !== "object") throw bad;
    const number = String(card.number || "").replace(/[ -]/g, "");
    const m = /^(\d{2})\/(\d{2})$/.exec(String(card.expiry || "").trim());
    const name = String(card.name || "").trim();
    const now = new Date();
    if (!/^\d{13,19}$/.test(number) || !luhnOk(number)) throw bad;
    if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < now.getFullYear() * 12 + now.getMonth() + 1) throw bad;
    if (!/^\d{3,4}$/.test(String(card.cvv || "")) || name.length < 2 || name.length > 60) throw bad;
    return number;
  }

  function charge(a, number, amount, kind) {
    if (number.endsWith("0002")) {
      audit(a.account_id, "payment", "customer", "declined", { kind, amount: money(amount) });
      throw new ApiErr(402, "card_declined", "Your card was declined. No payment has been taken. You can try another card or choose a different option.");
    }
    if (number.endsWith("0119")) {
      audit(a.account_id, "payment", "system", "gateway_error", { kind, amount: money(amount) });
      throw new ApiErr(502, "gateway_error", "We could not reach the payment service. We checked and no payment was taken, so it is safe to try again. If this continues call " + SUPPORT + ".");
    }
    return { reference: "SR-" + Math.random().toString(16).slice(2, 10).toUpperCase(), last4: number.slice(-4) };
  }

  function requestId(body) {
    const rid = String(body.request_id || "");
    if (!/^[A-Za-z0-9-]{8,64}$/.test(rid)) throw new ApiErr(400, "invalid_request", "Invalid request.");
    return rid;
  }

  function accountView(a) {
    const open = (a.arrangement && a.arrangement.status === "active") || (a.ptp && a.ptp.status === "open");
    return { name: a.name, product: a.product, overdue: money(a.overdue), total: money(a.total), days_overdue: a.days,
      status: a.status, status_label: STATUS_LABELS[a.status], arrangement: a.arrangement, ptp: a.ptp,
      can_pay: a.overdue > 0, can_plan_or_ptp: a.overdue > 0 && !open };
  }

  function planAmounts(overdue, months) {
    const base = Math.floor(overdue / months);
    return Array(months - 1).fill(base).concat([overdue - base * (months - 1)]);
  }

  function parseMonths(v) {
    const n = Number(v);
    if (![3, 6, 12].includes(n)) throw new ApiErr(400, "invalid_plan", "Please choose a 3, 6 or 12 month plan.");
    return n;
  }

  function planSchedule(overdue, months) {
    const today = todayISO();
    return planAmounts(overdue, months).map((amt, i) => ({ due: addMonths(today, i), amount: money(amt), status: i === 0 ? "due_now" : "scheduled" }));
  }

  function requireOpenPathway(a) {
    if (!accountView(a).can_plan_or_ptp) throw new ApiErr(409, "pathway_unavailable", "You already have a plan or promise in place for this balance.");
  }

  function payResponse(a, ref, kind, amount, extra) {
    return Object.assign({ ok: true, kind, reference: ref.reference, amount: money(amount), card_last4: ref.last4, paid_at: utcNow(),
      remaining_overdue: money(a.overdue), status_label: STATUS_LABELS[a.status] }, extra || {});
  }

  function checkPromises(today, only) {
    const results = [];
    Object.values(S.accounts).forEach((a) => {
      const p = a.ptp;
      if ((only && a.account_id !== only) || !p || p.status !== "open" || p.date > today) return;
      audit(a.account_id, "ptp_check", "system", "run");
      if (a.overdue <= 0) {
        writeBack(a.account_id, "payment_settled", { ptp: Object.assign({}, p, { status: "fulfilled" }) });
        results.push({ account_id: a.account_id, result: "fulfilled" });
      } else {
        writeBack(a.account_id, "ptp_unpaid", { ptp: Object.assign({}, p, { status: "missed" }) });
        routeToRep(a.account_id, "standard", ["PAYMENT_NOT_RECEIVED"]);
        results.push({ account_id: a.account_id, result: "missed" });
      }
    });
    return results;
  }

  // ---- endpoints: each returns [status, payload] ----
  const H = {};

  H["GET /api/config"] = () => [200, { session_timeout: SESSION_TIMEOUT, warn_after: Math.max(SESSION_TIMEOUT - 60, Math.floor(SESSION_TIMEOUT / 2)),
    support_number: SUPPORT, ptp_max_days: PTP_MAX_DAYS, test_cards: TEST_CARDS }];

  H["GET /api/demo/customers"] = () => [200, { customers: Object.values(S.accounts).map((a) => ({
    ref: a.access_ref, name: a.name, scenario: a.scenario, dob: a.dob, postcode: a.postcode, last4: a.last4 })) }];

  H["POST /api/session"] = (body) => {
    const a = Object.values(S.accounts).find((x) => x.access_ref === String(body.ref || ""));
    if (!a) throw new ApiErr(404, "unknown_link", "This access link is not valid.");
    const tok = "t" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    S.sessions[tok] = { account_id: a.account_id, verified: false, last: Date.now() };
    audit(a.account_id, "portal_access", "customer", "started");
    return [200, Object.assign({ token: tok }, lockInfo(a))];
  };

  H["POST /api/verify"] = (body, token) => {
    const s = getSession(token, false);
    const a = S.accounts[s.account_id];
    if (isLocked(a)) throw new ApiErr(423, "locked", "Access is locked.", lockInfo(a));
    const match = String(body.dob || "") === a.dob && normPostcode(body.postcode) === normPostcode(a.postcode) && String(body.last4 || "") === a.last4;
    if (match) {
      writeBack(a.account_id, null, { failed_attempts: 0 });
      s.verified = true;
      audit(a.account_id, "verification_attempt", "customer", "success");
      const step = nextStep(a);
      audit(a.account_id, "hardship_check", "system", step === "specialist_support" ? "flagged" : "clear");
      return [200, { ok: true, next: step, support_number: SUPPORT }];
    }
    const attempts = a.failed_attempts + 1;
    writeBack(a.account_id, null, { failed_attempts: attempts });
    audit(a.account_id, "verification_attempt", "customer", "fail", { attempt: attempts });
    if (attempts >= MAX_ATTEMPTS) {
      writeBack(a.account_id, null, { lock_until: Date.now() + LOCK_MS });
      audit(a.account_id, "account_locked", "system", "success", { minutes: LOCK_MS / 60000 });
      routeToRep(a.account_id, "standard", ["FAILED_VERIFICATION_LOCKOUT"]);
      throw new ApiErr(423, "locked", "Access is locked.", lockInfo(a));
    }
    throw new ApiErr(401, "verification_failed", "The details you entered do not match our records.", { attempts_remaining: MAX_ATTEMPTS - attempts });
  };

  H["POST /api/keepalive"] = (body, token) => { getSession(token, false); return [200, { ok: true }]; };

  H["POST /api/logout"] = (body, token) => {
    const s = S.sessions[token || ""];
    delete S.sessions[token || ""];
    if (s) audit(s.account_id, "logout", "customer", "success");
    return [200, { ok: true }];
  };

  H["GET /api/account"] = (body, token) => [200, accountView(portalAccount(token))];

  H["POST /api/pay-full"] = (body, token) => {
    const a = portalAccount(token);
    const rid = requestId(body);
    const key = a.account_id + "|" + rid;
    if (S.processed[key]) return [200, S.processed[key]];
    if (a.overdue <= 0) throw new ApiErr(409, "nothing_due", "There is no overdue balance to pay.");
    const number = validateCard(body.card);
    const amount = a.overdue;
    const ref = charge(a, number, amount, "full_payment");
    writeBack(a.account_id, "payment_settled", { overdue: 0,
      arrangement: a.arrangement ? Object.assign({}, a.arrangement, { status: "closed" }) : null,
      ptp: a.ptp ? Object.assign({}, a.ptp, { status: "fulfilled" }) : null });
    audit(a.account_id, "payment", "customer", "success", { kind: "full_payment", amount: money(amount), reference: ref.reference });
    const resp = payResponse(a, ref, "full_payment", amount);
    S.processed[key] = resp;
    return [200, resp];
  };

  H["POST /api/plan/preview"] = (body, token) => {
    const a = portalAccount(token);
    requireOpenPathway(a);
    const months = parseMonths(body.months);
    return [200, { months, total: money(a.overdue), schedule: planSchedule(a.overdue, months) }];
  };

  H["POST /api/plan"] = (body, token) => {
    const a = portalAccount(token);
    const rid = requestId(body);
    const key = a.account_id + "|" + rid;
    if (S.processed[key]) return [200, S.processed[key]];
    requireOpenPathway(a);
    const months = parseMonths(body.months);
    const number = validateCard(body.card);
    const schedule = planSchedule(a.overdue, months);
    const first = Math.round(Number(schedule[0].amount) * 100);
    const ref = charge(a, number, first, "plan_first_instalment");
    schedule[0].status = "paid";
    writeBack(a.account_id, "repayment_arrangement", { overdue: a.overdue - first, arrangement: { months, schedule, status: "active" } });
    audit(a.account_id, "repayment_plan", "customer", "success", { months, amount: money(first), reference: ref.reference });
    const resp = payResponse(a, ref, "repayment_plan", first, { months, schedule });
    S.processed[key] = resp;
    return [200, resp];
  };

  H["POST /api/ptp"] = (body, token) => {
    const a = portalAccount(token);
    requireOpenPathway(a);
    const date = String(body.date || "");
    const amountText = String(body.amount || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date)) || !/^\d+(\.\d{1,2})?$/.test(amountText)) {
      throw new ApiErr(400, "invalid_ptp", "Please enter a valid date and amount.");
    }
    const days = dayNumber(date) - dayNumber(todayISO());
    if (days < 1 || days > PTP_MAX_DAYS) throw new ApiErr(400, "invalid_date", "Choose a date from tomorrow up to " + PTP_MAX_DAYS + " days ahead.");
    const amount = Math.round(parseFloat(amountText) * 100);
    if (!(amount > 0 && amount <= a.overdue)) throw new ApiErr(400, "invalid_amount", "The amount must be above 0 and no more than your overdue balance.");
    const captured = utcNow();
    writeBack(a.account_id, "ptp_captured", { ptp: { date, amount: money(amount), captured_at: captured, status: "open" } });
    const ref = "PTP-" + Math.random().toString(16).slice(2, 10).toUpperCase();
    audit(a.account_id, "promise_to_pay", "customer", "success", { date, amount: money(amount), reference: ref });
    return [200, { ok: true, kind: "promise_to_pay", reference: ref, date, amount: money(amount), captured_at: captured }];
  };

  H["POST /api/hardship"] = (body, token) => {
    const a = portalAccount(token);
    const kind = body.type;
    const answers = body.answers;
    if (!["hardship", "dispute"].includes(kind) || !Array.isArray(answers) || answers.length !== 3) {
      throw new ApiErr(400, "invalid_request", "Please answer all three questions.");
    }
    const clean = answers.map((x) => String(x).replace(/[\x00-\x08\x0b-\x1f]/g, "").trim().slice(0, 500));
    if (!clean.every(Boolean)) throw new ApiErr(400, "invalid_request", "Please answer all three questions.");
    const flag = kind === "hardship" ? "hardship_flag" : "dispute_flag";
    writeBack(a.account_id, kind === "hardship" ? "hardship_flagged" : "dispute_flagged", { [flag]: true });
    const ref = "CASE-" + Math.random().toString(16).slice(2, 8).toUpperCase();
    routeToRep(a.account_id, "specialist", [kind.toUpperCase() + "_REQUESTED"], "high", { type: kind, answers: clean, reference: ref });
    audit(a.account_id, kind + "_request", "customer", "success", { reference: ref });
    delete S.sessions[token];
    return [200, { ok: true, kind, reference: ref, support_number: SUPPORT }];
  };

  H["POST /api/demo/promise-due"] = (body) => {
    const a = S.accounts[String(body.account_id || "")];
    if (!a || !a.ptp || a.ptp.status !== "open") throw new ApiErr(404, "no_open_promise", "That account has no open promise to pay.");
    a.ptp = Object.assign({}, a.ptp, { date: todayISO() });
    return [200, { results: checkPromises(todayISO(), a.account_id) }];
  };

  H["GET /api/staff/state"] = () => [200, {
    accounts: Object.values(S.accounts).map((a) => ({ account_id: a.account_id, name: a.name, status: a.status, status_label: STATUS_LABELS[a.status],
      overdue: money(a.overdue), days: a.days, eligible: a.portal_eligible, reasons: a.triage_reasons, locked: isLocked(a), ptp: a.ptp, arrangement: a.arrangement })),
    queue: S.queue.slice(), audit: S.audit.slice() }];

  window.mockApi = function (path, body, method, token) {
    S = load();
    const handler = H[(method || "POST") + " " + path];
    let status, data;
    try {
      if (!handler) throw new ApiErr(404, "not_found", "Not found");
      checkPromises(todayISO());
      [status, data] = handler(body || {}, token);
    } catch (e) {
      if (!(e instanceof ApiErr)) throw e;
      status = e.status;
      data = Object.assign({ ok: false, error: e.code, message: e.message }, e.extra);
    }
    save();
    return { ok: status < 400, status, data };
  };

  window.mockApi.reset = function () { freshState(); save(); };
})();
