#!/usr/bin/env python3
"""Smart-Recovery Phase 1 prototype backend. Standard library only; demo data only."""
import calendar
import hashlib
import json
import mimetypes
import os
import re
import secrets
import threading
import time
from datetime import date, datetime, timezone
from decimal import ROUND_DOWN, Decimal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8000"))
SESSION_TIMEOUT = int(os.environ.get("SR_SESSION_TIMEOUT_SECONDS", "300"))
LOCK_SECONDS = int(os.environ.get("SR_LOCK_SECONDS", "3600"))
MAX_ATTEMPTS = 3
# eligible only if overdue balance is strictly below this
BALANCE_LIMIT = Decimal("5000")
DAYS_LIMIT = 60  # eligible only if days overdue is strictly below this
PTP_MAX_DAYS = 30
SUPPORT_NUMBER = "0800 000 0000"
MONITOR_INTERVAL = 30

STATUS_LABELS = {
    "delinquent": "Overdue",
    "portal_eligible": "Overdue",
    "awaiting_representative": "With our team",
    "repayment_arrangement": "Repayment plan active",
    "ptp_captured": "Promise to pay recorded",
    "ptp_unpaid": "Promise not met - with our team",
    "payment_settled": "Paid in full",
    "hardship_flagged": "Specialist support requested",
    "dispute_flagged": "Dispute under review",
}

LOCK = threading.RLock()


class ApiError(Exception):
    def __init__(self, status, code, message, **extra):
        super().__init__(message)
        self.status, self.code, self.message, self.extra = status, code, message, extra


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def money(d):
    return f"{Decimal(d):.2f}"


def add_months(d, n):
    month = d.month - 1 + n
    year, month = d.year + month // 12, month % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


class AuditLog:
    """Append-only, hash-chained log. No update or delete operations exist."""

    def __init__(self, path):
        path.parent.mkdir(exist_ok=True)
        self._fh = open(path, "a", encoding="utf-8")
        self._records, self._prev, self._lock = [], "0" * 64, threading.Lock()

    def record(self, account_id, event, actor, outcome, **detail):
        with self._lock:
            rec = {"seq": len(self._records) + 1, "ts": utc_now(), "account_id": account_id,
                   "event": event, "actor": actor, "outcome": outcome, "detail": detail,
                   "prev_hash": self._prev}
            rec["hash"] = hashlib.sha256(json.dumps(
                rec, sort_keys=True).encode()).hexdigest()
            self._prev = rec["hash"]
            self._records.append(rec)
            self._fh.write(json.dumps(rec) + "\n")
            self._fh.flush()

    def snapshot(self):
        with self._lock:
            return list(self._records)


AUDIT = AuditLog(BASE / "runtime" / "audit_log.jsonl")

SEED = [
    dict(account_id="ACC-10001", access_ref="SR-NC01", name="Naomi Clarke", dob="1985-04-12",
         postcode="M14BT", last4="4821", product="Credit Card", overdue="1747.22", total="14822.54",
         days=28, hardship=False, vulnerability=False, dispute=False,
         scenario="Eligible: full journey (pay, plan, promise to pay, help)"),
    dict(account_id="ACC-10002", access_ref="SR-TR02", name="Tom Reed", dob="1979-11-02",
         postcode="LS12AB", last4="7730", product="Personal Loan", overdue="3150.00", total="9800.00",
         days=45, hardship=False, vulnerability=False, dispute=False,
         scenario="Eligible: personal loan, 45 days overdue"),
    dict(account_id="ACC-10003", access_ref="SR-OH03", name="Omar Hassan", dob="1990-01-30",
         postcode="B11AA", last4="1156", product="Auto Finance", overdue="6200.00", total="21400.00",
         days=38, hardship=False, vulnerability=False, dispute=False,
         scenario="Not eligible: balance at or above 5,000"),
    dict(account_id="ACC-10004", access_ref="SR-PN04", name="Priya Nair", dob="1988-07-19",
         postcode="E149AB", last4="9042", product="Credit Card", overdue="772.39", total="11496.59",
         days=71, hardship=False, vulnerability=False, dispute=False,
         scenario="Not eligible: 60 or more days overdue"),
    dict(account_id="ACC-10005", access_ref="SR-DW05", name="Daniel Wright", dob="1972-03-08",
         postcode="G12RT", last4="3365", product="Personal Loan", overdue="900.00", total="4100.00",
         days=20, hardship=True, vulnerability=False, dispute=False,
         scenario="Hardship flag: diverted to specialist support"),
    dict(account_id="ACC-10006", access_ref="SR-FB06", name="Fiona Bell", dob="1994-09-23",
         postcode="CF101AA", last4="2208", product="Credit Card", overdue="1250.00", total="6020.00",
         days=33, hardship=False, vulnerability=False, dispute=True,
         scenario="Open dispute: diverted to representative"),
    dict(account_id="ACC-10007", access_ref="SR-AO07", name="Amara Okafor", dob="1966-12-14",
         postcode="NE14ST", last4="5514", product="Auto Finance", overdue="410.00", total="7300.00",
         days=15, hardship=False, vulnerability=True, dispute=False,
         scenario="Vulnerability flag: diverted to specialist support"),
]

TEST_CARDS = {"approved": "4242 4242 4242 4242", "declined": "4000 0000 0000 0002",
              "gateway_error": "4000 0000 0000 0119"}


class LegacyDB:
    """In-memory stand-in for the legacy database; every write is audited."""

    def __init__(self):
        self.accounts = {}
        for s in SEED:
            self.accounts[s["account_id"]] = {
                "account_id": s["account_id"], "access_ref": s["access_ref"], "name": s["name"],
                "dob": s["dob"], "postcode": s["postcode"], "last4": s["last4"],
                "product": s["product"], "overdue": Decimal(s["overdue"]), "total": Decimal(s["total"]),
                "days": s["days"], "hardship_flag": s["hardship"], "vulnerability_flag": s["vulnerability"],
                "dispute_flag": s["dispute"], "scenario": s["scenario"], "status": "delinquent",
                "portal_eligible": False, "triage_reasons": [], "failed_attempts": 0, "lock_until": None,
                "arrangement": None, "ptp": None, "status_history": [],
            }

    def by_ref(self, ref):
        return next((a for a in self.accounts.values() if a["access_ref"] == ref), None)

    def write_back(self, account_id, status=None, **fields):
        a = self.accounts[account_id]
        a.update(fields)
        if status:
            a["status"] = status
            a["status_history"].append({"ts": utc_now(), "status": status})
        AUDIT.record(account_id, "db_write_back", "system",
                     "success", status=status, fields=sorted(fields))


DB = LegacyDB()
QUEUE = []
SESSIONS = {}
# (account_id, request_id) -> response, prevents double charging on retry
PROCESSED = {}


def route_to_rep(account_id, queue, reasons, priority="normal", context=None):
    QUEUE.append({"id": f"CASE-{len(QUEUE) + 1:04d}", "account_id": account_id, "queue": queue,
                  "priority": priority, "reasons": reasons, "context": context or {},
                  "created": utc_now(), "status": "open"})
    AUDIT.record(account_id, "routed_to_representative", "system",
                 "success", queue=queue, reasons=reasons)


def triage(a):
    reasons = []
    if a["hardship_flag"]:
        reasons.append("HARDSHIP_FLAG")
    if a["vulnerability_flag"]:
        reasons.append("VULNERABILITY_FLAG")
    if a["dispute_flag"]:
        reasons.append("ACTIVE_DISPUTE")
    if not a["overdue"] < BALANCE_LIMIT:
        reasons.append("BALANCE_NOT_UNDER_5000")
    if not a["days"] < DAYS_LIMIT:
        reasons.append("DAYS_OVERDUE_60_PLUS")
    return reasons


def run_triage():
    for a in DB.accounts.values():
        reasons = triage(a)
        eligible = not reasons
        AUDIT.record(a["account_id"], "triage", "system",
                     "eligible" if eligible else "ineligible", reasons=reasons)
        DB.write_back(a["account_id"], status="portal_eligible" if eligible else "awaiting_representative",
                      portal_eligible=eligible, triage_reasons=reasons)
        if not eligible:
            specialist = {"HARDSHIP_FLAG", "VULNERABILITY_FLAG",
                          "ACTIVE_DISPUTE"} & set(reasons)
            route_to_rep(a["account_id"],
                         "specialist" if specialist else "standard", reasons)


def lock_info(a):
    locked = is_locked(a)
    return {"locked": locked, "support_number": SUPPORT_NUMBER,
            "lock_until": datetime.fromtimestamp(a["lock_until"], timezone.utc).isoformat(timespec="seconds")
            if locked else None}


def is_locked(a):
    if a["lock_until"] and a["lock_until"] > time.time():
        return True
    if a["lock_until"]:
        DB.write_back(a["account_id"], lock_until=None, failed_attempts=0)
        AUDIT.record(a["account_id"], "lock_expired", "system", "success")
    return False


def get_session(token, verified=True):
    s = SESSIONS.get(token or "")
    if not s:
        raise ApiError(401, "session_expired",
                       "Your session has ended. Please start again.")
    if time.time() - s["last"] > SESSION_TIMEOUT:
        del SESSIONS[token]
        AUDIT.record(s["account_id"], "session_timeout", "system", "success")
        raise ApiError(401, "session_expired",
                       "Your session timed out for your security.")
    if verified and not s["verified"]:
        raise ApiError(401, "not_verified",
                       "Please verify your identity first.")
    s["last"] = time.time()
    return s


def next_step(a):
    if a["hardship_flag"] or a["vulnerability_flag"]:
        return "specialist_support"
    if a["dispute_flag"] or not a["portal_eligible"]:
        return "representative_support"
    return "dashboard"


def portal_account(token):
    s = get_session(token)
    a = DB.accounts[s["account_id"]]
    if next_step(a) != "dashboard":
        raise ApiError(403, "diverted", "This account needs support from our team.",
                       support_number=SUPPORT_NUMBER)
    return s, a


def luhn_ok(number):
    total = 0
    for i, ch in enumerate(reversed(number)):
        d = int(ch)
        if i % 2:
            d = d * 2 - 9 if d * 2 > 9 else d * 2
        total += d
    return total % 10 == 0


def validate_card(card):
    bad = ApiError(400, "invalid_card", "Please check your card details.")
    if not isinstance(card, dict):
        raise bad
    number = re.sub(r"[ -]", "", str(card.get("number", "")))
    m = re.fullmatch(r"(\d{2})/(\d{2})", str(card.get("expiry", "")).strip())
    name = str(card.get("name", "")).strip()
    if not re.fullmatch(r"\d{13,19}", number) or not luhn_ok(number):
        raise bad
    if not m or not 1 <= int(m[1]) <= 12 or (2000 + int(m[2]), int(m[1])) < (date.today().year, date.today().month):
        raise bad
    if not re.fullmatch(r"\d{3,4}", str(card.get("cvv", ""))) or not 2 <= len(name) <= 60:
        raise bad
    return number


def gateway_charge(number):
    """Simulated payment gateway; card data is used here only and never stored."""
    if number.endswith("0002"):
        return "declined"
    if number.endswith("0119"):
        return "error"
    return "approved"


def charge(a, number, amount, kind, request_id):
    key = (a["account_id"], request_id)
    if key in PROCESSED:
        return PROCESSED[key]
    outcome = gateway_charge(number)
    if outcome == "declined":
        AUDIT.record(a["account_id"], "payment", "customer",
                     "declined", kind=kind, amount=money(amount))
        raise ApiError(402, "card_declined", "Your card was declined. No payment has been taken. "
                       "You can try another card or choose a different option.")
    if outcome == "error":
        AUDIT.record(a["account_id"], "payment", "system",
                     "gateway_error", kind=kind, amount=money(amount))
        raise ApiError(502, "gateway_error", "We could not reach the payment service. We checked and no payment "
                       f"was taken, so it is safe to try again. If this continues call {SUPPORT_NUMBER}.")
    return {"reference": "SR-" + secrets.token_hex(4).upper(), "last4": number[-4:]}


def require_id(body):
    rid = str(body.get("request_id", ""))
    if not re.fullmatch(r"[A-Za-z0-9-]{8,64}", rid):
        raise ApiError(400, "invalid_request", "Invalid request.")
    return rid


def account_view(a):
    arr, ptp = a["arrangement"], a["ptp"]
    open_pathway = a["arrangement"] is not None and a["arrangement"]["status"] == "active" \
        or (ptp is not None and ptp["status"] == "open")
    return {
        "name": a["name"], "product": a["product"], "overdue": money(a["overdue"]), "total": money(a["total"]),
        "days_overdue": a["days"], "status": a["status"], "status_label": STATUS_LABELS[a["status"]],
        "arrangement": arr, "ptp": ptp,
        "can_pay": a["overdue"] > 0, "can_plan_or_ptp": a["overdue"] > 0 and not open_pathway,
    }


# ---- API handlers: each returns (status, payload) ----

def h_config(body, token):
    return 200, {"session_timeout": SESSION_TIMEOUT, "warn_after": max(SESSION_TIMEOUT - 60, SESSION_TIMEOUT // 2),
                 "support_number": SUPPORT_NUMBER, "ptp_max_days": PTP_MAX_DAYS, "test_cards": TEST_CARDS}


def h_demo_customers(body, token):
    return 200, {"customers": [{"ref": a["access_ref"], "name": a["name"], "scenario": a["scenario"],
                                "dob": a["dob"], "postcode": a["postcode"], "last4": a["last4"]}
                               for a in DB.accounts.values()]}


def h_session(body, token):
    a = DB.by_ref(str(body.get("ref", "")))
    if not a:
        raise ApiError(404, "unknown_link", "This access link is not valid.")
    tok = secrets.token_urlsafe(24)
    SESSIONS[tok] = {"account_id": a["account_id"],
                     "verified": False, "last": time.time()}
    AUDIT.record(a["account_id"], "portal_access", "customer", "started")
    return 200, {"token": tok, **lock_info(a)}


def h_verify(body, token):
    s = get_session(token, verified=False)
    a = DB.accounts[s["account_id"]]
    if is_locked(a):
        raise ApiError(423, "locked", "Access is locked.", **lock_info(a))
    given = "|".join([str(body.get("dob", "")), re.sub(r"\s", "", str(body.get("postcode", ""))).upper(),
                      str(body.get("last4", ""))])
    expected = "|".join([a["dob"], a["postcode"], a["last4"]])
    if secrets.compare_digest(given.encode(), expected.encode()):
        DB.write_back(a["account_id"], failed_attempts=0)
        s["verified"] = True
        AUDIT.record(a["account_id"], "verification_attempt",
                     "customer", "success")
        step = next_step(a)
        AUDIT.record(a["account_id"], "hardship_check", "system",
                     "flagged" if step == "specialist_support" else "clear")
        return 200, {"ok": True, "next": step, "support_number": SUPPORT_NUMBER}
    attempts = a["failed_attempts"] + 1
    DB.write_back(a["account_id"], failed_attempts=attempts)
    AUDIT.record(a["account_id"], "verification_attempt",
                 "customer", "fail", attempt=attempts)
    if attempts >= MAX_ATTEMPTS:
        DB.write_back(a["account_id"], lock_until=time.time() + LOCK_SECONDS)
        AUDIT.record(a["account_id"], "account_locked", "system",
                     "success", minutes=LOCK_SECONDS // 60)
        route_to_rep(a["account_id"], "standard", [
                     "FAILED_VERIFICATION_LOCKOUT"])
        raise ApiError(423, "locked", "Access is locked.", **lock_info(a))
    raise ApiError(401, "verification_failed", "The details you entered do not match our records.",
                   attempts_remaining=MAX_ATTEMPTS - attempts)


def h_keepalive(body, token):
    get_session(token, verified=False)
    return 200, {"ok": True}


def h_logout(body, token):
    s = SESSIONS.pop(token or "", None)
    if s:
        AUDIT.record(s["account_id"], "logout", "customer", "success")
    return 200, {"ok": True}


def h_account(body, token):
    _, a = portal_account(token)
    return 200, account_view(a)


def pay_response(a, ref, kind, amount, **extra):
    return {"ok": True, "kind": kind, "reference": ref["reference"], "amount": money(amount),
            "card_last4": ref["last4"], "paid_at": utc_now(), "remaining_overdue": money(a["overdue"]),
            "status_label": STATUS_LABELS[a["status"]], **extra}


def h_pay_full(body, token):
    _, a = portal_account(token)
    rid = require_id(body)
    if (a["account_id"], rid) in PROCESSED:
        return 200, PROCESSED[(a["account_id"], rid)]
    if a["overdue"] <= 0:
        raise ApiError(409, "nothing_due",
                       "There is no overdue balance to pay.")
    number = validate_card(body.get("card"))
    amount = a["overdue"]
    ref = charge(a, number, amount, "full_payment", rid)
    arrangement = dict(
        a["arrangement"], status="closed") if a["arrangement"] else None
    ptp = dict(a["ptp"], status="fulfilled") if a["ptp"] else None
    DB.write_back(a["account_id"], status="payment_settled", overdue=Decimal("0.00"),
                  arrangement=arrangement, ptp=ptp)
    AUDIT.record(a["account_id"], "payment", "customer", "success", kind="full_payment",
                 amount=money(amount), reference=ref["reference"])
    resp = pay_response(a, ref, "full_payment", amount)
    PROCESSED[(a["account_id"], rid)] = resp
    return 200, resp


def plan_amounts(overdue, months):
    base = (overdue / months).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    return [base] * (months - 1) + [overdue - base * (months - 1)]


def parse_months(value):
    try:
        months = int(value)
    except (TypeError, ValueError):
        months = 0
    if months not in (3, 6, 12):
        raise ApiError(400, "invalid_plan",
                       "Please choose a 3, 6 or 12 month plan.")
    return months


def plan_schedule(overdue, months):
    today = date.today()
    return [{"due": add_months(today, i).isoformat(), "amount": money(amt),
             "status": "due_now" if i == 0 else "scheduled"} for i, amt in enumerate(plan_amounts(overdue, months))]


def require_open_pathway(a):
    if not account_view(a)["can_plan_or_ptp"]:
        raise ApiError(409, "pathway_unavailable",
                       "You already have a plan or promise in place for this balance.")


def h_plan_preview(body, token):
    _, a = portal_account(token)
    require_open_pathway(a)
    months = parse_months(body.get("months"))
    return 200, {"months": months, "total": money(a["overdue"]), "schedule": plan_schedule(a["overdue"], months)}


def h_plan(body, token):
    _, a = portal_account(token)
    rid = require_id(body)
    if (a["account_id"], rid) in PROCESSED:
        return 200, PROCESSED[(a["account_id"], rid)]
    require_open_pathway(a)
    months = parse_months(body.get("months"))
    number = validate_card(body.get("card"))
    schedule = plan_schedule(a["overdue"], months)
    first = Decimal(schedule[0]["amount"])
    ref = charge(a, number, first, "plan_first_instalment", rid)
    schedule[0]["status"] = "paid"
    DB.write_back(a["account_id"], status="repayment_arrangement", overdue=a["overdue"] - first,
                  arrangement={"months": months, "schedule": schedule, "status": "active"})
    AUDIT.record(a["account_id"], "repayment_plan", "customer", "success", months=months,
                 amount=money(first), reference=ref["reference"])
    resp = pay_response(a, ref, "repayment_plan", first,
                        months=months, schedule=schedule)
    PROCESSED[(a["account_id"], rid)] = resp
    return 200, resp


def h_ptp(body, token):
    _, a = portal_account(token)
    require_open_pathway(a)
    try:
        when = date.fromisoformat(str(body.get("date", "")))
        amount = Decimal(str(body.get("amount", ""))).quantize(Decimal("0.01"))
    except (ValueError, ArithmeticError):
        raise ApiError(400, "invalid_ptp",
                       "Please enter a valid date and amount.")
    days = (when - date.today()).days
    if not 1 <= days <= PTP_MAX_DAYS:
        raise ApiError(400, "invalid_date",
                       f"Choose a date from tomorrow up to {PTP_MAX_DAYS} days ahead.")
    if not 0 < amount <= a["overdue"]:
        raise ApiError(400, "invalid_amount",
                       "The amount must be above 0 and no more than your overdue balance.")
    captured = utc_now()
    DB.write_back(a["account_id"], status="ptp_captured",
                  ptp={"date": when.isoformat(), "amount": money(amount), "captured_at": captured, "status": "open"})
    ref = "PTP-" + secrets.token_hex(4).upper()
    AUDIT.record(a["account_id"], "promise_to_pay", "customer", "success", date=when.isoformat(),
                 amount=money(amount), reference=ref)
    return 200, {"ok": True, "kind": "promise_to_pay", "reference": ref, "date": when.isoformat(),
                 "amount": money(amount), "captured_at": captured}


HELP_TYPES = {"hardship": ("hardship_flag", "hardship_flagged", "specialist"),
              "dispute": ("dispute_flag", "dispute_flagged", "specialist")}


def h_help(body, token):
    s, a = portal_account(token)
    kind = body.get("type")
    answers = body.get("answers")
    if kind not in HELP_TYPES or not isinstance(answers, list) or len(answers) != 3:
        raise ApiError(400, "invalid_request",
                       "Please answer all three questions.")
    clean = [re.sub(r"[\x00-\x08\x0b-\x1f]", "", str(x)).strip()[:500]
             for x in answers]
    if not all(clean):
        raise ApiError(400, "invalid_request",
                       "Please answer all three questions.")
    flag, status, queue = HELP_TYPES[kind]
    DB.write_back(a["account_id"], status=status, **{flag: True})
    ref = "CASE-" + secrets.token_hex(3).upper()
    route_to_rep(a["account_id"], queue, [kind.upper() + "_REQUESTED"], priority="high",
                 context={"type": kind, "answers": clean, "reference": ref})
    AUDIT.record(a["account_id"], kind + "_request",
                 "customer", "success", reference=ref)
    SESSIONS.pop(token, None)
    return 200, {"ok": True, "kind": kind, "reference": ref, "support_number": SUPPORT_NUMBER}


def check_promises(today, only=None):
    results = []
    for a in DB.accounts.values():
        p = a["ptp"]
        if only and a["account_id"] != only or not p or p["status"] != "open":
            continue
        if date.fromisoformat(p["date"]) > today:
            continue
        AUDIT.record(a["account_id"], "ptp_check", "system", "run")
        if a["overdue"] <= 0:
            DB.write_back(a["account_id"], status="payment_settled",
                          ptp=dict(p, status="fulfilled"))
            results.append(
                {"account_id": a["account_id"], "result": "fulfilled"})
        else:
            DB.write_back(a["account_id"], status="ptp_unpaid",
                          ptp=dict(p, status="missed"))
            route_to_rep(a["account_id"], "standard", ["PAYMENT_NOT_RECEIVED"])
            results.append({"account_id": a["account_id"], "result": "missed"})
    return results


def h_demo_promise_due(body, token):
    a = DB.accounts.get(str(body.get("account_id", "")))
    if not a or not a["ptp"] or a["ptp"]["status"] != "open":
        raise ApiError(404, "no_open_promise",
                       "That account has no open promise to pay.")
    a["ptp"] = dict(a["ptp"], date=date.today().isoformat())
    return 200, {"results": check_promises(date.today(), only=a["account_id"])}


def h_staff_state(body, token):
    accounts = [{"account_id": a["account_id"], "name": a["name"], "status": a["status_history"][-1]["status"]
                 if a["status_history"] else a["status"], "status_label": STATUS_LABELS[a["status"]],
                 "overdue": money(a["overdue"]), "days": a["days"], "eligible": a["portal_eligible"],
                 "reasons": a["triage_reasons"], "locked": is_locked(a),
                 "ptp": a["ptp"], "arrangement": a["arrangement"]} for a in DB.accounts.values()]
    return 200, {"accounts": accounts, "queue": list(QUEUE), "audit": AUDIT.snapshot()}


GET_ROUTES = {"/api/config": h_config, "/api/demo/customers": h_demo_customers, "/api/account": h_account,
              "/api/staff/state": h_staff_state}
POST_ROUTES = {"/api/session": h_session, "/api/verify": h_verify, "/api/keepalive": h_keepalive,
               "/api/logout": h_logout, "/api/plan/preview": h_plan_preview, "/api/pay-full": h_pay_full,
               "/api/plan": h_plan, "/api/ptp": h_ptp, "/api/hardship": h_help,
               "/api/demo/promise-due": h_demo_promise_due}

PAGES = {"/": "index.html", "/staff": "staff.html"}
ASSETS = {"styles.css", "app.js", "staff.js"}
SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "SmartRecovery/1.0"

    def _send(self, status, body, ctype):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in SECURITY_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status, payload):
        self._send(status, json.dumps(payload).encode(), "application/json")

    def _token(self):
        auth = self.headers.get("Authorization", "")
        return auth[7:] if auth.startswith("Bearer ") else None

    def _dispatch(self, handler, body):
        try:
            with LOCK:
                status, payload = handler(body, self._token())
        except ApiError as e:
            status, payload = e.status, {
                "ok": False, "error": e.code, "message": e.message, **e.extra}
        except Exception:
            status, payload = 500, {
                "ok": False, "error": "server_error", "message": "Something went wrong."}
        self._json(status, payload)

    def do_GET(self):
        path, _, query = self.path.partition("?")
        if path in GET_ROUTES:
            return self._dispatch(GET_ROUTES[path], {})
        name = PAGES.get(path) or (path.lstrip(
            "/") if path.lstrip("/") in ASSETS else None)
        if not name:
            return self._json(404, {"ok": False, "error": "not_found"})
        ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
        self._send(200, (STATIC / name).read_bytes(),
                   ctype + "; charset=utf-8")

    def do_POST(self):
        path = self.path.partition("?")[0]
        handler = POST_ROUTES.get(path)
        if not handler:
            return self._json(404, {"ok": False, "error": "not_found"})
        length = int(self.headers.get("Content-Length") or 0)
        if length > 16384:
            return self._json(413, {"ok": False, "error": "too_large"})
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError
        except ValueError:
            return self._json(400, {"ok": False, "error": "invalid_json"})
        self._dispatch(handler, body)


def monitor_loop():
    while True:
        time.sleep(MONITOR_INTERVAL)
        with LOCK:
            check_promises(date.today())


if __name__ == "__main__":
    run_triage()
    threading.Thread(target=monitor_loop, daemon=True).start()
    print(
        f"Smart-Recovery prototype running at http://{HOST}:{PORT}  (staff view: /staff)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
