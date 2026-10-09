/**
 * Smart-Recovery Phase 1 executive briefing: Google Slides builder.
 *
 * How to use:
 *  1. Open https://script.google.com, create a new project, paste this whole file over Code.gs.
 *  2. Run createDeck() (approve the permissions prompt). The deck URL appears in the Execution log.
 *  3. Run reviewDeck() to check the deck against the review tests (Task 4).
 *
 * Every number below comes from the workspace outputs named in each slide's "Source" line.
 * Figures marked "derived" are simple arithmetic on those sourced figures.
 */

// ---------- Slide content ----------

const SLIDES = [
  {
    type: 'recommendation',
    title: 'Recommendation: approve Phase 1 of the Smart-Recovery portal now',
    cards: [
      { head: 'WHAT Phase 1 includes', items: [
        'Identity check, then a live balance view',
        'Pay in full, a 3/6/12-month plan, or a promise to pay',
        'Hardship, dispute and complex cases routed to a representative with context',
        'Every action written back to the legacy database and audited'] },
      { head: 'WHY approve it now', items: [
        '100,000+ delinquent accounts run on spreadsheets, email and a 20-year-old database',
        '20% of logged activities are flagged as duplicates',
        '£1.4M estimated annual benefit for a £175k build, about 700% ROI'] },
      { head: 'WHY it is credible and focused', items: [
        '3 of 5 ranked opportunities; the rest are deferred',
        'Hard savings alone (£405k) repay the build in about 5 months',
        '19 backlog stories and a working prototype already exist',
        'Hardship, disputes and legal escalation stay with people'] },
    ],
    bar: 'Decision needed: approve the £175k Phase 1 build and confirm four open owners (slide 10).',
    source: 'Source: ROI summary (Week 1), Phase 1 scope, Jira backlog, discovery brief. ROI and payback are derived from the ROI model.',
    notes:
      'My recommendation is to approve Phase 1 of the Smart-Recovery portal today. ' +
      'Phase 1 lets customers verify who they are, see what they owe, and pay in full, set up a 3, 6 or 12 month plan, or promise to pay. ' +
      'Anything involving hardship, a dispute or a complex account goes straight to a representative, with the context already captured. ' +
      'We should approve it now because 100,000 delinquent accounts are being run on spreadsheets and email, and about one in five logged activities is a duplicate. ' +
      'It is credible because it is deliberately small: three of the five ranked opportunities, a 175 thousand pound build, and it pays back within 12 months even if we count only hard savings. ' +
      'The rest of the deck shows the evidence, and I will finish with the specific decisions I need from you.',
  },
  {
    type: 'bullets-tiles',
    title: 'Collections still runs on spreadsheets and memory, and it is costing recoveries',
    bullets: [
      'Scale: 100,000+ delinquent accounts handled by 50+ representatives',
      'Tools: spreadsheets, email and a 20-year-old collections database with no single source of truth',
      'Leakage we can trace: £500k a year lost to spreadsheet errors; at least 20% of follow-ups lost at shift hand-offs',
      'Capacity: representatives spend up to 50% of their day finding information before a call',
      'Reported revenue loss of about 15% is not yet confirmed by Finance, so the value case does not rely on it',
    ],
    tiles: [
      ['100,000+', 'delinquent accounts'],
      ['~15%', 'revenue loss (reported, unconfirmed)'],
      ['£500k', 'yearly loss from spreadsheet errors (SN-096)'],
      ['20%+', 'follow-ups lost at shift hand-offs'],
    ],
    source: 'Source: case study; ROI summary (OPT-04, OPT-03); current process impact analysis; discovery brief (15% estimate awaiting Finance).',
    notes:
      'Here is why this matters now. Legacy Trust manages more than 100,000 delinquent accounts with over 50 representatives, using spreadsheets, email and a collections database that is twenty years old. ' +
      'We can trace two specific leaks. Spreadsheet errors cost about 500 thousand pounds a year, and at least a fifth of follow-ups are lost when work is handed over between shifts. ' +
      'Representatives also spend up to half their day just finding information. ' +
      'You will see a reported 15 percent revenue loss in the case study. I want to be clear that Finance has not confirmed how it is defined, so our value case does not depend on it.',
  },
  {
    type: 'table',
    title: 'Discovery shows duplicated work, missed follow-ups and no reliable view of status',
    table: [
      ['Pain point', 'Evidence', 'Source'],
      ['Duplicate activity', '2,020 of 9,890 logged activities flagged as duplicates (20%)', 'Activity tracker, first pass'],
      ['Missed follow-ups', '1,465 of 9,890 records (15%) have no next follow-up date; Finance estimates a 14% missed rate', 'Activity tracker; FA-06'],
      ['Hunting for data', 'Up to 50% of the representative day spent searching spreadsheets, database screens and email', 'As-Is impact analysis'],
      ['Repeat contact', 'Customers are called repeatedly and must re-explain; stakeholders say they call back about three times', 'As-Is analysis; stakeholder note SN-002'],
      ['Manager visibility', 'Managers reconcile counts that never match and defend unreliable numbers', 'As-Is impact analysis'],
    ],
    widths: [110, 360, 178],
    footerBox: 'Priority needs (JTBD): JTBD-02 self-service balance and repayment, JTBD-04 automatic case update, JTBD-05 triage of simple vs complex cases.',
    source: 'Source: discovery brief; current process impact analysis; finance assumptions (FA-06); stakeholder interview notes.',
    notes:
      'This is what discovery found. In the activity tracker, about 20 percent of logged activities are flagged as duplicates and about 15 percent have no next follow-up date, which lines up with Finance\'s 14 percent missed follow-up estimate. ' +
      'Representatives lose up to half their day searching for information, customers are called repeatedly and have to re-explain themselves, and managers cannot trust the counts they report. ' +
      'These are first-pass figures from the tracker, and we are treating them as indicative rather than final. ' +
      'They point to three needs: customers need to see and act on their balance, every case needs to update one central record automatically, and simple cases need to be separated from complex ones.',
  },
  {
    type: 'table-note',
    title: 'Three focused projects return about £1.2M net on a £175k build',
    table: [
      ['Opportunity (ROI rank)', 'Benefit', 'Cost', 'Net benefit', 'ROI', 'Payback', 'Confidence'],
      ['#1 OPT-04 Status sync (case update)', '£685,000', '£45,000', '£640,000', '1,422%', '0.8 mo', 'High'],
      ['#4 OPT-02 Self-service repayment', '£430,000', '£85,000', '£345,000', '406%', '1.3 mo', 'Medium'],
      ['#3 OPT-01 Automated account triage', '£290,000', '£45,000', '£245,000', '544%', '1.9 mo', 'High'],
      ['Phase 1 total (derived)', '£1,405,000', '£175,000', '£1,230,000', '703%', '1.5 mo', ''],
    ],
    widths: [214, 76, 58, 76, 52, 58, 114],
    boldLast: true,
    deferred: 'Deferred, not in the total: #2 OPT-03 Missed-payment reminders (£361,500 benefit, 703% ROI, 1.5 mo payback) and #5 OPT-05 Payment confirmations (£110,500 benefit, 146% ROI, 4.9 mo payback). Both are email or text features outside Phase 1 scope.',
    noteHead: 'Challenge-ready view (derived from the model)',
    noteTable: [
      ['Scenario', 'Net benefit', 'ROI', 'Payback'],
      ['Full model: £405k hard savings + £1.0M recovery uplift', '£1,230,000', '703%', '1.5 months'],
      ['Uplift halved (£500k)', '£730,000', '417%', '2.3 months'],
      ['Hard savings only (£185k + £110k + £110k)', '£230,000', '131%', '5.2 months'],
    ],
    noteWidths: [330, 100, 68, 150],
    source: 'Source: ROI summary and ROI calculations (Week 1); finance assumptions FA-01, FA-07, FA-10, FA-11. Recovery uplift is Low/Medium confidence (FA-07).',
    notes:
      'This is the value case. We ranked five automation opportunities and Phase 1 funds three of them: status sync, self-service repayment and account triage. ' +
      'The reminders project ranks second, but it is an email and text feature, so it is deferred; the check on unpaid promises is still covered by automatic monitoring. Payment confirmations are deferred too, because receipts appear on screen. ' +
      'Together they cost 175 thousand pounds and return 1.4 million in benefit, which is a net 1.23 million and roughly 700 percent ROI, paid back in about a month and a half. ' +
      'I expect to be challenged on that, so the bottom table shows the stress test. About a million of the benefit is recovery uplift, and Finance rates that as low to medium confidence. ' +
      'If we halve it, ROI is still over 400 percent. If we count only hard savings from time released at 22 pounds an hour, we still return 131 percent and pay back in just over five months, inside the 12 month target.',
  },
  {
    type: 'two-col',
    title: 'Phase 1 is deliberately small: self-service for simple cases, people for the rest',
    left: { head: 'In scope', items: [
      'Customer identity verification with a 3-attempt lockout',
      'Rules-based account triage for portal eligibility',
      'Live balance and options dashboard',
      'Pay in full by card, with an on-screen receipt',
      '3, 6 or 12-month repayment plans (first instalment by card)',
      'Digital promise to pay with automatic follow-up check',
      'Hardship and dispute requests routed to specialists',
      'Status sync to the legacy database and an audit trail'] },
    right: { head: 'Out of scope', items: [
      'Confirmation and reminder emails or texts (OPT-05, OPT-03 deferred)',
      'Direct Debit mandate (Should-have, can follow)',
      'Hardship assessment and bespoke repayment negotiation',
      'Legal escalation workflow',
      'Core platform replacement',
      'Management reporting dashboards'] },
    bar: 'Right-sized: 3 of 5 ranked opportunities, and the riskiest cases stay with people.',
    source: 'Source: Phase 1 scope document; ROI summary (deferrals); Jira backlog (KAN-11 to KAN-30).',
    notes:
      'Here is exactly what you would be approving, and what you would not. ' +
      'In scope is the customer journey from verification to a confirmed payment, plan or promise, plus the routing and record keeping behind it. ' +
      'Out of scope is just as important. We are not building email confirmations or reminders, not Direct Debit in the first release, not hardship assessment, and not the legal escalation workflow. ' +
      'Receipts appear on screen instead of by email. That keeps Phase 1 small enough to deliver and keeps the sensitive cases with trained people.',
  },
  {
    type: 'flow',
    title: 'The To-Be journey resolves simple cases online and hands complex cases to people with context',
    steps: [
      ['1 Triage', 'Account enters delinquency; rules check eligibility'],
      ['2 Verify', 'Customer confirms date of birth, post code and card digits'],
      ['3 Safeguard', 'Hardship and vulnerability check before any account data'],
      ['4 Choose', 'Pay in full, plan, promise to pay, or ask for help'],
      ['5 Record', 'Status written to the legacy database; receipt shown'],
    ],
    cards: [
      { head: 'Not eligible, flagged or disputed', items: ['Goes to the representative queue with the reason recorded'] },
      { head: 'Failed verification', items: ['3 attempts, then a 60-minute lock, support number and manual ID check'] },
      { head: 'Unpaid promise', items: ['Checked automatically on the due date; flagged for follow-up and manager escalation'] },
    ],
    bar: 'Every step is written to an append-only audit log for compliance reporting.',
    source: 'Source: to-be_workflow.bpmn; Jira backlog (KAN-11, KAN-14, KAN-16, KAN-22, KAN-26, KAN-29).',
    notes:
      'This is the To-Be workflow in one view. The account is triaged by rules when it becomes delinquent. Eligible customers verify their identity, pass a hardship check, and then choose how to resolve the balance. ' +
      'The result is written back to the legacy database and shown to the customer on screen. ' +
      'The three boxes underneath are the exception paths, and they matter most to operations. Anything not eligible, flagged or disputed goes to a representative with the reason recorded. ' +
      'Repeated failed verification locks the account for an hour and routes it to a person. Unpaid promises are checked automatically and escalated. ' +
      'Every step is audited, which gives managers and Compliance a record they can rely on.',
  },
  {
    type: 'two-col',
    title: 'The backlog and a working prototype are ready; four dependencies need owners',
    left: { head: 'Backlog (Jira)', items: [
      '5 epics and 19 user stories, each with acceptance criteria, dependencies, priority and estimate',
      '16 Must-have and 3 Should-have stories',
      '89 story points in total, 73 of them Must-have',
      'Examples: KAN-11 verify identity, KAN-14 lockout and fallback, KAN-16 hardship diversion, KAN-19 promise to pay, KAN-20 card payment',
      'Includes non-screen needs: routing, audit trail, write-back failure handling'] },
    right: { head: 'Prototype', items: [
      'Working portal with 12 screens, each annotated with story IDs, data shown, rule and next step',
      'Covers verification, lockout, hardship diversion, pay, plan, promise to pay and receipt',
      'Not yet usability tested; that is the next step'] },
    bar: 'Open dependencies: Compliance sign-off on verification; eligibility rules and the £5,000 threshold; payment gateway owner; owner for database write-back failures.',
    source: 'Source: Jira backlog export; Phase 1 scope document (dependencies); smart-recovery-portal prototype and README.',
    notes:
      'On delivery readiness: the backlog has five epics and nineteen stories, each with acceptance criteria, dependencies, a priority and an estimate. Sixteen are must-haves and three are should-haves, about 89 story points in total. Examples include verifying identity, the lockout fallback, hardship diversion, promise to pay and card payment. ' +
      'We have also built a working prototype with twelve screens, and each screen is annotated with its story, the data shown, the rule and the next step. ' +
      'To be straightforward about its status: it has not been usability tested yet. ' +
      'Four things need an owner before build starts: Compliance sign-off on how identity is verified, agreement on the eligibility rules and the 5,000 pound threshold, a payment gateway owner, and an owner for what happens if a database update fails.',
  },
  {
    type: 'table',
    title: 'Adoption is the main risk, and each group has a specific mitigation',
    table: [
      ['Group', 'Key risks', 'Mitigation'],
      ['Collections representatives and Operations', 'Teething problems slow cases; reps revert to old tools if triage misfires; fear of job displacement', 'Give time and support to learn before raising productivity expectations; reps keep all complex, hardship and dispute cases'],
      ['Finance and Compliance', 'Hardship cases misclassified as straightforward; corrupt legacy records spread into reporting', 'Explicit eligibility decision tables with hardship and vulnerability escalation; confirm data with account owners'],
      ['Customers', 'Slow to notice the change; prefer a person; struggle with the portal; disagree with the balance', 'Announce by email, then letter if unopened after two weeks; walkthrough video; hardship and dispute options inside the portal'],
      ['Managers and team leaders', 'Lose visibility if portal outcomes sit outside existing reports; receive escalated cases when promises go unpaid', 'Every action syncs to the legacy database and audit log so counts reconcile; escalations arrive with the reason recorded'],
    ],
    widths: [128, 250, 270],
    footerBox: 'Reinforcement is weakest for customers (Low) and representatives under pressure, so early support and visible hand-offs are part of the plan.',
    source: 'Source: ADKAR assessment; manager row from As-Is impact analysis and To-Be workflow (not yet ADKAR-assessed).',
    notes:
      'The main risk is adoption rather than technology, so I want to show you the change plan. We assessed three groups using ADKAR. ' +
      'Representatives are aware of the problem and want relief, but they lack knowledge of the new system. Our mitigation is to give them time and support before raising targets, and to make clear that complex, hardship and dispute cases stay with them. ' +
      'Finance and Compliance worry that a vulnerable customer is treated as a simple case, so we use explicit decision tables and escalation rules. ' +
      'Customers may not notice the change or may prefer to talk to someone, so we announce it by email and letter, provide a walkthrough, and build hardship and dispute options into the portal. ' +
      'Reinforcement is the weakest part for customers, and that is why early support matters. ' +
      'Managers are not in the ADKAR assessment yet, so that row comes from the as-is analysis and the workflow: they need counts that reconcile, and they receive escalated cases with the reason recorded.',
  },
  {
    type: 'table',
    title: 'We have tested the operational objections, not avoided them',
    table: [
      ['Objection', 'Our answer', 'Evidence'],
      ['Will vulnerable customers be mishandled?', 'Hardship, vulnerability and disputes are screened out before and after login; no payment options are shown to flagged accounts', 'Triage rules; KAN-16, KAN-21'],
      ['Are the numbers solid?', 'Hard savings alone repay the build in about 5 months; the 15% revenue-loss figure is not used in the model', 'ROI model; FA-07 confidence'],
      ['What if customers cannot verify?', '3 attempts, a 60-minute lock, a support number and a manual ID check by a representative', 'KAN-11, KAN-14, KAN-27'],
      ['What if a database update fails?', 'A retry and a task for a representative are planned (KAN-30); an owner is not yet named, so it is a condition of approval', 'KAN-30; scope dependencies'],
      ['Is identity checking compliant?', 'The standard (date of birth, post code, card digits) awaits Compliance sign-off', 'KAN-11; scope assumptions'],
    ],
    widths: [150, 340, 158],
    source: 'Source: Jira backlog; Phase 1 scope document (assumptions and dependencies); ROI model; ADKAR assessment.',
    notes:
      'I want to address the objections you are most likely to raise, including the ones where we do not yet have a complete answer. ' +
      'On vulnerable customers, flagged accounts never see payment options and go to specialists. On the numbers, we showed that hard savings alone cover the build, and we do not use the 15 percent revenue loss figure. ' +
      'If customers cannot verify, they are locked out for an hour and routed to a person. ' +
      'Two items are open. Nobody owns database write-back failures yet, and Compliance has not signed off the identity standard. I am treating both as conditions of approval rather than hiding them.',
  },
  {
    type: 'ask',
    title: 'Decision today: approve Phase 1 funding and start delivery',
    asks: [
      ['1 Approve', 'The £175k Phase 1 build: status sync £45k, self-service repayment £85k, account triage £45k.'],
      ['2 Name owners', 'Compliance sign-off on identity verification; eligibility rules and the £5,000 threshold; payment gateway; database write-back failures.'],
      ['3 Start delivery', 'Refine the 19-story backlog, and usability test the prototype with representatives and customers.'],
    ],
    bar: 'Success at 12 months: payback achieved, fewer duplicate and missed follow-ups (baseline 20% and 14%), simple cases resolved online.',
    source: 'Source: ROI summary; Phase 1 scope document; Jira backlog; discovery baselines (activity tracker, FA-06).',
    notes:
      'My ask is for three decisions. First, approve the 175 thousand pound Phase 1 build. Second, name an owner for each of the four open items: identity verification sign-off, the eligibility rules and threshold, the payment gateway, and database write-back failures. ' +
      'Third, let the team start refining the backlog and test the prototype with real representatives and customers. ' +
      'We will measure success against the baselines you have seen today: duplicate activity at about 20 percent, missed follow-ups at about 14 percent, and payback inside 12 months. ' +
      'With those decisions, we can start delivery planning immediately.',
  },
];

// ---------- Build ----------

const THEME = {
  navy: '#0b2a4a', blue: '#14558f', teal: '#1b7f79', light: '#eef3f8',
  ink: '#1b2733', muted: '#5f6b76', white: '#ffffff', font: 'Arial',
};
const M = 36;          // page margin (pt)
const TITLE_H = 56;
const CONTENT_Y = 84;

function createDeck() {
  const pres = SlidesApp.create('Smart-Recovery Phase 1 | Executive briefing');
  const first = pres.getSlides()[0];
  SLIDES.forEach((spec, i) => buildSlide_(pres, spec, i + 1));
  first.remove();
  PropertiesService.getScriptProperties().setProperty('DECK_ID', pres.getId());
  Logger.log('Deck created: ' + pres.getUrl());
}

function buildSlide_(pres, spec, n) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = pres.getPageWidth();
  const H = pres.getPageHeight();
  const cw = W - 2 * M;

  rect_(slide, 0, 0, W, 8, THEME.blue);
  text_(slide, spec.title, M, 18, cw, TITLE_H, { size: 22, bold: true, color: THEME.navy });
  text_(slide, spec.source, M, H - 26, cw - 40, 20, { size: 8, color: THEME.muted });
  text_(slide, String(n), W - M - 24, H - 26, 24, 16, { size: 9, color: THEME.muted, align: SlidesApp.ParagraphAlignment.END });

  const body = H - CONTENT_Y - 40;
  switch (spec.type) {
    case 'recommendation': {
      const w = (cw - 24) / 3;
      spec.cards.forEach((c, i) => card_(slide, c.head, c.items, M + i * (w + 12), CONTENT_Y, w, body - 44, THEME.blue));
      banner_(slide, spec.bar, M, CONTENT_Y + body - 36, cw, 32);
      break;
    }
    case 'bullets-tiles': {
      bullets_(slide, spec.bullets, M, CONTENT_Y, 380, body, 12);
      const tw = 122, th = (body - 12) / 2;
      spec.tiles.forEach((t, i) => tile_(slide, t[0], t[1], M + 400 + (i % 2) * (tw + 12), CONTENT_Y + Math.floor(i / 2) * (th + 12), tw, th));
      break;
    }
    case 'table': {
      table_(slide, spec.table, M, CONTENT_Y, spec.widths, { size: 10 });
      if (spec.footerBox) banner_(slide, spec.footerBox, M, H - 78, cw, 40, true);
      break;
    }
    case 'table-note': {
      const h1 = table_(slide, spec.table, M, CONTENT_Y, spec.widths, { size: 10, boldLast: spec.boldLast });
      let y = CONTENT_Y + h1 + 6;
      if (spec.deferred) {
        text_(slide, spec.deferred, M, y, cw, 28, { size: 9, color: THEME.muted });
        y += 30;
      }
      text_(slide, spec.noteHead, M, y + 4, cw, 18, { size: 12, bold: true, color: THEME.teal });
      table_(slide, spec.noteTable, M, y + 24, spec.noteWidths, { size: 10 });
      break;
    }
    case 'two-col': {
      const w = (cw - 16) / 2;
      card_(slide, spec.left.head, spec.left.items, M, CONTENT_Y, w, body - 44, THEME.teal);
      card_(slide, spec.right.head, spec.right.items, M + w + 16, CONTENT_Y, w, body - 44, THEME.blue);
      banner_(slide, spec.bar, M, CONTENT_Y + body - 36, cw, 32);
      break;
    }
    case 'flow': {
      const w = (cw - 4 * 10) / 5;
      spec.steps.forEach((s, i) => stepBox_(slide, s[0], s[1], M + i * (w + 10), CONTENT_Y, w, 92));
      const cwid = (cw - 24) / 3;
      spec.cards.forEach((c, i) => card_(slide, c.head, c.items, M + i * (cwid + 12), CONTENT_Y + 106, cwid, 112, THEME.teal));
      banner_(slide, spec.bar, M, CONTENT_Y + body - 36, cw, 32);
      break;
    }
    case 'ask': {
      spec.asks.forEach((a, i) => {
        const y = CONTENT_Y + i * 76;
        rect_(slide, M, y, 110, 66, THEME.blue);
        text_(slide, a[0], M + 8, y + 20, 100, 28, { size: 15, bold: true, color: THEME.white });
        rect_(slide, M + 110, y, cw - 110, 66, THEME.light);
        text_(slide, a[1], M + 122, y + 10, cw - 134, 50, { size: 13, color: THEME.ink });
      });
      banner_(slide, spec.bar, M, CONTENT_Y + 3 * 76 + 4, cw, 40);
      break;
    }
  }
  slide.getNotesPage().getSpeakerNotesShape().getText().setText(spec.notes);
}

// ---------- Drawing helpers ----------

function rect_(slide, x, y, w, h, fill) {
  const s = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  s.getFill().setSolidFill(fill);
  s.getBorder().setTransparent();
  return s;
}

function text_(slide, str, x, y, w, h, o) {
  if (!str) return null; // an empty text box has no text range to style
  const box = slide.insertTextBox(str, x, y, w, h);
  const tr = box.getText();
  tr.getTextStyle().setFontFamily(THEME.font).setFontSize(o.size || 12)
    .setForegroundColor(o.color || THEME.ink).setBold(!!o.bold);
  if (o.align) tr.getParagraphStyle().setParagraphAlignment(o.align);
  return box;
}

function bullets_(slide, items, x, y, w, h, size) {
  const box = text_(slide, items.join('\n'), x, y, w, h, { size: size || 12 });
  const tr = box.getText();
  tr.getListStyle().applyListPreset(SlidesApp.ListPreset.DISC_CIRCLE_SQUARE);
  tr.getParagraphStyle().setSpaceBelow(5);
  // Bold the lead-in before the first colon.
  tr.getParagraphs().forEach(p => {
    const r = p.getRange();
    const idx = r.asString().indexOf(':');
    if (idx > 0 && idx < 40) tr.getRange(r.getStartIndex(), r.getStartIndex() + idx + 1).getTextStyle().setBold(true);
  });
  return box;
}

function card_(slide, head, items, x, y, w, h, accent) {
  rect_(slide, x, y, w, h, THEME.light);
  rect_(slide, x, y, 4, h, accent);
  text_(slide, head, x + 12, y + 8, w - 20, 20, { size: 12, bold: true, color: accent });
  bullets_(slide, items, x + 12, y + 32, w - 20, h - 36, 11);
}

function tile_(slide, big, label, x, y, w, h) {
  rect_(slide, x, y, w, h, THEME.light);
  text_(slide, big, x + 8, y + 10, w - 16, 34, { size: 24, bold: true, color: THEME.blue });
  text_(slide, label, x + 8, y + 48, w - 16, h - 52, { size: 10, color: THEME.muted });
}

function stepBox_(slide, head, body, x, y, w, h) {
  rect_(slide, x, y, w, h, THEME.navy);
  text_(slide, head, x + 6, y + 6, w - 12, 18, { size: 12, bold: true, color: THEME.white });
  text_(slide, body, x + 6, y + 28, w - 12, h - 32, { size: 9, color: THEME.white });
}

function banner_(slide, str, x, y, w, h, light) {
  rect_(slide, x, y, w, h, light ? THEME.light : THEME.navy);
  text_(slide, str, x + 10, y + 5, w - 20, h - 8, { size: 11, bold: true, color: light ? THEME.navy : THEME.white });
}

// Slides tables cannot set column widths in Apps Script, so the grid is drawn from shapes.
// Returns the total height so callers can place content below it.
function table_(slide, rows, x, y, widths, o) {
  const size = o.size || 10;
  let top = y;
  rows.forEach((r, ri) => {
    const header = ri === 0;
    const lines = Math.max.apply(null, r.map((v, ci) =>
      Math.ceil(String(v).length * size * 0.52 / (widths[ci] - 14.4)) || 1));
    const h = Math.max(24, lines * size * 1.3 + 12);
    let left = x;
    r.forEach((val, ci) => {
      rect_(slide, left, top, widths[ci], h, header ? THEME.navy : (ri % 2 ? THEME.white : THEME.light));
      text_(slide, String(val), left, top + 2, widths[ci], h - 4, {
        size: size, bold: header || (!!o.boldLast && ri === rows.length - 1),
        color: header ? THEME.white : THEME.ink });
      left += widths[ci];
    });
    top += h;
  });
  return top - y;
}

// ---------- Review (Task 4) ----------

function reviewDeck() {
  const id = PropertiesService.getScriptProperties().getProperty('DECK_ID');
  if (!id) throw new Error('Run createDeck() first.');
  const slides = SlidesApp.openById(id).getSlides();
  const allText = s => s.getShapes().map(sh => sh.getText().asString()).join(' ');
  const words = s => s.getNotesPage().getSpeakerNotesShape().getText().asString().trim().split(/\s+/).filter(Boolean).length;
  const results = [];
  const check = (name, ok, detail) => results.push((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? ' - ' + detail : ''));

  check('Recommendation is obvious by slide 1', /approve/i.test(allText(slides[0])) && /WHAT/.test(allText(slides[0])));
  check('Every slide has speaker notes of at least 50 words', slides.every(s => words(s) >= 50),
    'shortest: ' + Math.min.apply(null, slides.map(words)) + ' words');
  check('Every slide cites a source', slides.every(s => /Source:/.test(allText(s))));
  check('Numbers are challenge-ready (scenario table present)', slides.some(s => /Hard savings only/.test(allText(s))));
  check('Operational objections are addressed', slides.some(s => /objections/i.test(allText(s))));
  check('Final slide makes a clear ask', /approve/i.test(allText(slides[slides.length - 1])) && /owners/i.test(allText(slides[slides.length - 1])));
  Logger.log(results.join('\n'));
}
