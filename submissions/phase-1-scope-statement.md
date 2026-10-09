# Phase 1 Scope Statement: Smart-Recovery Portal

Legacy Trust Bank, first release of the self-service debt recovery portal.

## In scope

- Customer identity verification (date of birth, post code, last 4 card digits) with a 3-attempt lockout and manual verification by a representative
- Rules-based account triage: eligible accounts are flagged portal eligible, everything else goes to a representative
- Live balance and options dashboard
- Pay the full overdue balance by card, with an on-screen receipt
- 3, 6 or 12-month repayment plans for eligible accounts (first instalment by card)
- Digital promise to pay with automatic follow-up when the date arrives
- Hardship and dispute requests raised on the portal and routed to specialists
- Real-time status sync to the legacy database, write-back failure handling and an append-only audit trail

## Out of scope

- Confirmation and reminder emails or texts (receipts appear on screen instead)
- Direct Debit mandate for plan instalments (Should-have, can follow the core release)
- Hardship assessment and bespoke repayment negotiation, which stay with representatives
- Legal escalation workflow, handled outside the portal by managers
- Management reporting dashboards (audit data is captured so reports can follow)
- Core platform replacement and advanced personalisation

## Scope definition

| System aspect / capability | Included or excluded | Justification |
|---|---|---|
| Automated self-service repayment (pay in full by card; standard 3/6/12-month plans) | Included | Reduces time spent contacting customers about repayment when straightforward cases are handled on the portal. The first plan instalment is taken by card. |
| Direct Debit mandate for plan instalments | Included as Should-have (deferrable) | A heavier build than card payment and not needed to prove the self-service model. Until it ships, later instalments are paid by card and checked automatically (KAN-28). |
| Automated payment monitoring (promises and instalments) | Included | The To-Be workflow checks payment status when a promise date arrives and routes unpaid cases to a representative, so representatives no longer check manually. |
| Failed-verification lockout and manual ID verification | Included | Protects customer data and gives genuine customers a route back in, as shown in the To-Be workflow. |
| Hardship and dispute capture and diversion | Included (capture and route only) | Customers can raise a request and pre-flagged accounts skip self-service. Assessment stays with representatives. |
| Write-back failure handling | Included | The legacy database is the source of truth, so failed updates must be retried and flagged. |
| Audit trail | Included | Compliance needs an append-only record of verification, payment, promise and escalation events. |
| Automated case update (status sync) | Included | Account status must be current in the legacy database for customers and staff to rely on the portal. |
| Digital promise-to-pay capture | Included | Straightforward promises are accepted automatically and timestamped, so representatives can focus on complex cases. |
| Identity verification | Included | Customers must prove who they are before any account data is shown. The standard is three fixed fields, pending Compliance sign-off. |
| Automated account triage | Included | Rules-based triage separates straightforward cases from complex ones. Customers who disagree with their status can raise a dispute or hardship request. |
| Automated payment confirmations via email | Excluded | Adds complexity that is hard to deliver in the time available. Customers see their receipt and remaining balance on screen instead. |
| Legal escalation workflow | Excluded | Runs independently of the portal and is handled by managers. |
| Management reporting dashboards | Excluded | Audit data is captured so reports can be built after Phase 1. |

## Assumptions

- The legacy database stays the source of truth and the portal reads and writes to it.
- The identity verification standard (date of birth, post code, last 4 card digits) must be confirmed by Compliance before build. The owner is still to be confirmed: the Week 1 notes list Amina Rahman as Compliance Liaison and Daniel Okoye as Finance Business Partner.
- No account details are shown and no promise to pay is accepted until verification passes. Every attempt is logged for audit, and failed verification routes to a representative.
- Portal eligibility rules: no hardship or vulnerability flag, no active dispute, overdue balance under 5,000 GBP, and fewer than 60 days overdue.

## Dependencies and constraints

- The portal must write back to the legacy database before showing a final confirmation (KAN-25).
- There is no owner yet for write-back failures. One must be named before build (KAN-30).
- Promise to pay: the backlog assumes a date up to 30 days ahead. An earlier draft said up to 6 months, so this is to be confirmed with Collections Operations.
- Plans the portal can accept automatically: 3, 6 or 12 months, for accounts under the automatic-acceptance threshold (value to be confirmed).
- Hardship and dispute cases go to a representative or the compliance and legal review path.
- Payments: card through a payment gateway (owner to be confirmed). The Direct Debit provider is also to be confirmed (KAN-28).
- The triage eligibility rules must be agreed before build (KAN-22).
- The audit table in the legacy database is to be confirmed (KAN-26).

## Backlog prioritisation note

Must-have stories follow the To-Be workflow sequence: triage and eligibility (KAN-22), verification and its fallbacks (KAN-11, KAN-14, KAN-27), hardship diversion (KAN-16), dashboard (KAN-12), the three resolution journeys (KAN-20, KAN-18, KAN-19), monitoring (KAN-29), then routing, sync, audit and failure handling (KAN-23, KAN-25, KAN-26, KAN-30). Foundational stories that others depend on are ranked Highest. Should-have items (transaction history, manager escalation and Direct Debit) add value but have workarounds, so they can follow the core release.

The order protects the Week 1 value case. Automated resolution and automatic follow-up cut representative effort per account, while hardship routing and audit controls limit compliance and change risk. The ROI case should not quote "three calls per account" as a balance-enquiry figure until it is checked against the Discovery Dossier. The interview note says customers call back about three times because they forget what was said, but the recovery activity tracker shows about 3.1 activities per account of all types and only about 0.4 call attempts per account (1,397 across 3,214 accounts).

## Why this scope is credible

**Value and fit with Week 1.** Phase 1 funds three of the five ranked opportunities: automated case update (ranked 1), automated account triage (ranked 3) and self-service repayment (ranked 4). Together they cost 175,000 GBP and return about 1.4M GBP in benefit, a net 1.23M GBP or roughly 700% ROI, paid back in about 1.5 months. About 1.0M GBP of that benefit is recovery uplift, which Finance rates as low to medium confidence. On hard savings alone (405,000 GBP) the build still returns 131% and pays back in about 5.2 months, inside the 12-month target. Missed-payment reminders (ranked 2) and payment confirmations (ranked 5) are deferred because they depend on email or text channels, while the check on unpaid promises is still covered by automatic monitoring.

**Delivery feasibility and change risk.** The scope is small enough to deliver: the backlog holds 19 user stories across 5 epics, each with acceptance criteria, dependencies, a priority and an estimate, and a working prototype of all 12 screens exists. The riskiest cases (hardship, disputes, complex accounts and legal escalation) stay with representatives, which answers the main compliance concern. Adoption risk is recorded in the ADKAR assessment, and the explicit eligibility rules with hardship escalation address its main compliance risk. The open items are named in the dependencies above, and the identity standard, eligibility rules, payment gateway and write-back failure owner are conditions of approval.
