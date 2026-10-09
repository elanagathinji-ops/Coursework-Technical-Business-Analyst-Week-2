"use strict";

const $ = (sel) => document.querySelector(sel);

function cell(tr, text) {
  const td = document.createElement("td");
  td.textContent = text;
  tr.append(td);
  return td;
}

function fill(tableId, rows) {
  const body = $(`#${tableId} tbody`);
  body.replaceChildren(...rows);
}

async function promiseDue(accountId) {
  const res = window.mockApi("/api/demo/promise-due", { account_id: accountId }, "POST");
  const data = res.data;
  const el = $("#alert");
  el.textContent = res.ok ? `Promise check run: ${data.results.map((r) => r.result).join(", ")}` : data.message;
  el.classList.toggle("info", res.ok);
  el.hidden = false;
  refresh();
}

async function refresh() {
  const s = window.mockApi("/api/staff/state", null, "GET").data;

  fill("accounts", s.accounts.map((a) => {
    const tr = document.createElement("tr");
    cell(tr, `${a.account_id} ${a.name}`);
    cell(tr, a.status_label);
    cell(tr, a.overdue);
    cell(tr, String(a.days));
    cell(tr, a.eligible ? "Yes" : "No");
    cell(tr, a.reasons.join(", ") || "-");
    cell(tr, a.locked ? "Yes" : "No");
    const td = cell(tr, a.ptp ? `${a.ptp.amount} by ${a.ptp.date} (${a.ptp.status})` : "-");
    if (a.ptp && a.ptp.status === "open") {
      const b = document.createElement("button");
      b.className = "btn secondary";
      b.textContent = "Simulate promise date arriving";
      b.addEventListener("click", () => promiseDue(a.account_id));
      td.append(document.createElement("br"), b);
    }
    return tr;
  }));

  fill("queue", s.queue.map((q) => {
    const tr = document.createElement("tr");
    [q.id, q.account_id, q.queue, q.priority, q.reasons.join(", "),
      q.context.answers ? `${q.context.type}: ${q.context.answers.join(" | ")}` : "-", q.created].forEach((t) => cell(tr, t));
    return tr;
  }));

  fill("audit", s.audit.slice().reverse().map((r) => {
    const tr = document.createElement("tr");
    [r.seq, r.ts, r.account_id, r.event, r.actor, r.outcome, JSON.stringify(r.detail), r.hash.slice(0, 10)]
      .forEach((t) => cell(tr, String(t)));
    return tr;
  }));
}

refresh();
setInterval(refresh, 3000);
