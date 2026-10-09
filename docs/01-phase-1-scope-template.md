# Phase 1 Scope Template

Use this to define a disciplined Smart-Recovery first release.

## In scope

List the capabilities you believe should be built in Phase 1.

Starter examples:
- identity verification
- account summary and eligible actions
- promise-to-pay capture
- eligible payment-plan selection
- rules-based routing to representatives
- portal outcome reporting

## Out of scope

Be explicit.

Starter examples:
- hardship assessment
- bespoke repayment negotiation
- legal escalation workflow
- major core-platform replacement
- advanced personalisation

## Scope definition
| System aspects/Capabilities | Included or Excluded | Justification
|---|---|---|
Automated self-service repayment (pay in full by card; standard 3/6/12-month plans) | Included | This reduces time spent contacting customers to discuss repayment options if straightforward cases are handled via the portal. The first plan instalment is taken by card.
Direct Debit mandate for plan installments | Included as Should-have (deferrable) | A heavier build than card payment and not needed to prove the self-service model. Until it ships, later installments are paid by card and checked automatically (KAN-28).
Automated payment monitoring (promises and installments) | Included | The To-Be workflow checks payment status when a promise date arrives and routes unpaid cases to a representative, so reps no longer check manually.
Failed-verification lockout and manual ID verification | Included | Protects customer data and gives genuine customers a route back in, as shown in the To-Be workflow.
Hardship / dispute capture and diversion | Included (capture and route only) | Customers can raise a hardship or dispute request and pre-flagged accounts skip self-service; assessment itself stays with representatives.
Write-back failure handling | Included | The legacy database is the source of truth, so failed updates must be retried and flagged.
Audit trail | Included | Compliance needs an append-only record of verification, payment, promise and escalation events.
Automated case update (status sync) | Included | When a payment is made or the status of an account changes, the portal writes to the central legacy database since key account details will need to be up-to-date in order for customer to manage their account through the portal
Digital promise-to-pay capture | Included | Straightforward cases are automatically accepted by the portal so representatives can spend time on complex cases that require special handling. Payment promises are now automatically timestamped and recorded in the database
Identity verification | Included | For customers to be able to access their account information via the portal, they need to be able to verify their identity. This can be done through answering security questions
Automated account triage | Included | Accounts triaging for portal eligibility is rules-based and can separate straightforward cases from complex ones.Customer who disagree with their account status can raise a dispute/ claim hardship through the portal
Automated payment confirmations via email | Excluded | This adds a layer of complexity which will be tough to fulfill in the given time frame. If customers make a payment via the portal, they can check the portal to see what the remaining balance and transaction history themselves rather than being sent an email confirmation for it.
Legal escalation workflow | Excluded | This workflow will be executed independent of the portal system by managers
Management reporting dashboards | Excluded | Audit data is captured so reports can be built after Phase 1



## Assumptions

- Legacy database stays the source of truth and the portal reads and writes to it
- Identity verification standard (DOB, post code, last 4 card digits) must be confirmed by Compliance before build. Owner to be confirmed: Week 1 notes list Amina Rahman as Compliance Liaison and Daniel Okoye as Finance Business Partner.
- No account details are shown and no promise-to-pay is accepted until verification passes, every attempt is logged for audit, and failed verification routes to an agent

## Dependencies and constraints

- Portal must write back to the legacy db before showing a final confirmation (KAN-25)
- No owner if the portal fails to write back to the legacy db; one must be named before build (KAN-30)
- For promise-to-pay, the backlog assumes a date up to 30 days ahead; an earlier draft said up to 6 months. To be confirmed with Collections Operations.
- Arrangements the portal can accept automatically: 3/6/12 month payment plans for accounts under the automatic-acceptance threshold (value TBC)
- Hardship or dispute go to an agent or compliance/legal review path
- Payment processing method: card via payment gateway (owner TBC); Direct Debit provider TBC (KAN-28)
- Triage eligibility rules must be agreed before build (KAN-22)
- Audit table in the legacy database to be confirmed (KAN-26)




## Deliverable planning
| Deliverable | Completed by | Time estimate | Potential blockers | Justifications
|---|---|---|---|---|
To-Be workflow | Tuesday EOD | 4-5 hours | Stakeholder disagreement of the new workflow and its feasibility | Need to collect stakeholder feedback and make changes accordingly until agreement is reached 
Prioritized Jira backlog | Thursday afternoon | 8-12 hours | Unclear what to include in the backlog | Need to check quality of user stories, prioritisations and dependencies
AI-built Portal prototype | Friday morning | 3 - 5 hours | To-be workflow and backlog must be complete and approved | The prototype must be tested and each screen quality checked. Each screen should have a related user story ID, key data shown, validation or business rule
Executive briefing slide deck | Friday afternoon | 5 hours | Depends on discovery findings, ROI case and backlog readiness | Need to structure recommendations, build the supporting argument, design slides, add speaker notes and review deck 



## Backlog prioritisation note

Must-have stories follow the To-Be workflow sequence: triage and eligibility (KAN-22), verification and its fallbacks (KAN-11, KAN-14, KAN-27), hardship diversion (KAN-16), dashboard (KAN-12), the three resolution journeys (KAN-20, KAN-18, KAN-19), monitoring (KAN-29), then routing, sync, audit and failure handling (KAN-23, KAN-25, KAN-26, KAN-30). Foundational stories that others depend on are ranked Highest. Should-have items (KAN-17 history, KAN-24 manager escalation, KAN-28 Direct Debit) add value but have manual or card-based workarounds, so they can follow the core release.

The order protects the value case from Week 1: automated resolution (payment, plan, promise) and automatic follow-up cut representative effort per account, while hardship routing and audit controls limit compliance and adoption risk. The ROI case should not quote 'three calls per account' as a balance-enquiry figure until it is checked against the Discovery Dossier. The interview note (Daniel Okoye, Finance Business Partner) says customers call back about three times because they forget what was said, but the recovery activity tracker shows about 3.1 activities per account of all types and only about 0.4 call attempts per account (1,397 across 3,214 accounts).

## Why this scope is credible

Write 1-2 paragraphs linking the chosen scope to:
- Week 1 top-ranked opportunities
- measurable value
- delivery feasibility
- change and adoption risk