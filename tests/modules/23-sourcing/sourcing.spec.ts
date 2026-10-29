import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { allBranchesList, allBranchesSave, asAllBranches, auditEntries, menuScreens, userPage } from '../shared/access';
import { head } from '../20-budget/cases';
import { screenOpens } from '../shared/screen-opens';
import {
  act,
  agreementSaved,
  desk,
  draftTender,
  expectListed,
  freshRequest,
  master,
  newBid,
  openedBid,
  publishedTender,
  ratedTender,
  reached,
  saveAgreement,
  refused,
  SAVED,
  TC_APP023_001,
  TC_APP023_003,
  TC_APP023_005,
  TC_APP023_008,
  TC_APP023_012,
  TC_APP023_016,
  TC_APP023_020,
  WEEK,
  type Route,
} from './cases';

/**
 * 23-sourcing.xlsx: masters, tenders, bids, agreements and deposits. Every
 * screen has one button that opens a dialog (one or two steps) with an
 * "Action" list; actions on a saved row take its internal id (column
 * "Code") in "Document". The approved purchase request a tender starts from
 * is an approved row of Procurement (/procurement/requests, made by 09). A
 * bid can be accepted only after the close date, so the tenders of those
 * tests close yesterday (a typed date in the past is accepted, TC-APP023-006
 * step 8). Refusals show "Minified React error #441"; the server text of the
 * workbook is recorded next to it.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});



qaTest('TC-APP023-001', TC_APP023_001);

qaTest('TC-APP023-002', async ({ page, qa }) => {
  const d = desk(page, 'masters');
  const cat = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
  await qa.step(1, async () => {
    for (const kind of ['Category', 'Checklist', 'Bidder']) refused(qa, 1, await d.save({ Code: qa.code('X-ALKES'), Name: '' }, kind), 'code and name are required');
  });
  await qa.step(2, async () => refused(qa, 2, await d.save({ Code: cat, Name: qa.name('X Alkes uji') }), 'duplicate'));
  await qa.step(3, async () => {
    await d.open();
    const rowButtons = await d.rows().first().getByRole('button').count();
    await d.openDialog();
    const actions = await d.dialog.getByRole('combobox', { name: 'Action' }).locator('option').allInnerTexts();
    expect(actions.some((a) => /edit|deactivate|delete/i.test(a))).toBe(false);
    qa.note(3, `actions ${actions.join(', ')}; ${rowButtons} button(s) on a row`);
  });
});

qaTest('TC-APP023-003', ({ page, qa }) => TC_APP023_003({ page, qa }));

qaTest('TC-APP023-004', async ({ page, qa }) => {
  const d = desk(page, 'masters');
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  expect(await d.save({ Code: bidder }, 'Convert to vendor')).toContain(SAVED);
  await qa.step(1, async () => refused(qa, 1, await d.save({ Code: bidder }, 'Convert to vendor'), 'bidder is already a supplier'));
  await qa.step(2, async () => refused(qa, 2, await d.save({ Code: qa.code('X-TIDAK-ADA') }, 'Convert to vendor'), 'bidder is missing'));
  await qa.step(3, async () => refused(qa, 3, await d.save({ Code: '' }, 'Convert to vendor'), 'code is required'));
  qa.notRun(4, 'needs a bidder named like an existing supplier of Procurement');
});

// Declared through a wrapper: qaTest passes testInfo as the second argument, the chain passes its request there.
qaTest('TC-APP023-005', ({ page, qa }) => TC_APP023_005({ page, qa }));

qaTest('TC-APP023-006', async ({ page, qa }) => {
  const t = desk(page, 'tenders');
  const category = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
  // A request with no tender yet, so that a refusal is the check of the step (a second tender of a request answers HTTP 500).
  const pr = await freshRequest(page, qa);
  const v = (extra: Record<string, string>) => ({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: pr, Close: WEEK(), ...extra });
  await qa.step(1, async () => {
    refused(qa, 1, await t.save(v({ Document: '' })), 'document is missing');
    refused(qa, 1, await t.save(v({ Document: 'bukan-id' })), 'document is missing');
  });
  await qa.step(2, async () => {
    await page.goto('/id/procurement/requests');
    const draft = (await page.getByRole('main').innerText()).match(/draft \S+ ([0-9a-f-]{36})/)?.[1];
    if (!draft) {
      qa.note(2, 'no request that is not approved on /procurement/requests');
      return;
    }
    refused(qa, 2, await t.save(v({ Document: draft })), 'the tender needs an approved purchase request');
  });
  await qa.step(3, async () => refused(qa, 3, await t.save(v({ Name: 'limited' })), 'at least one vendor is required'));
  await qa.step(4, async () => refused(qa, 4, await t.save(v({ Close: '' })), 'number, category and close date are required'));
  await qa.step(5, async () => refused(qa, 5, await t.save(v({ Code: qa.code('X-TIDAK-ADA') })), 'category is missing'));
  await qa.step(6, async () => {
    const t6 = await draftTender(page, qa, { category });
    refused(qa, 6, (await act(page, 'tenders', t6.id, 'Publish')).toasts, 'send the tender first');
    expectListed(await t.status(t6.id), 'draft');
  });
  await qa.step(7, async () => {
    const t7 = await draftTender(page, qa, { category });
    refused(qa, 7, await t.save({ Name: qa.name('X Koran Uji'), Note: '', Document: t7.id }, 'Advert'), 'media and text are required');
  });
  await qa.step(8, async () => {
    const toasts = await t.save(v({ Close: addDays(todayWib(), -30) }));
    qa.note(8, `a close date in the past: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP023-007', async ({ page, qa, browser }) => {
  // The tender category and a new approved request of Procurement (made by U1); U2 works on "All branches".
  const category = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
  const pr = await freshRequest(page, qa);
  await asAllBranches(browser, async (u2) => {
    const t = desk(u2, 'tenders');
    await qa.step(1, async () => {
      await t.open();
      await allBranchesList(u2, qa, 1);
    });
    await qa.step(2, async () => {
      allBranchesSave(qa, 2, await t.save({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: pr, Close: WEEK() }));
    });
  });
});

/** The screens of a tender (bids, agreements, deposits) on "All branches": the list, and a save for a tender of U1's branch. */
async function allBranchesOfTender(browser: Parameters<typeof asAllBranches>[0], qa: Qa, route: Route): Promise<void> {
  await asAllBranches(browser, async (u2) => {
    await qa.step(1, async () => {
      await desk(u2, route).open();
      await allBranchesList(u2, qa, 1);
    });
  });
}

qaTest('TC-APP023-011', async ({ page, qa, browser }) => {
  const t = await publishedTender(page, qa, { close: WEEK() });
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  await allBranchesOfTender(browser, qa, 'bids');
  await asAllBranches(browser, async (u2) => {
    await qa.step(2, async () => allBranchesSave(qa, 2, await desk(u2, 'bids').save({ Document: t.id, Code: bidder, Price: '1450000' }, 'Bid')));
  });
});

qaTest('TC-APP023-015', async ({ page, qa, browser }) => {
  const r = await ratedTender(page, qa);
  await allBranchesOfTender(browser, qa, 'agreements');
  await asAllBranches(browser, async (u2) => {
    await qa.step(2, async () =>
      allBranchesSave(qa, 2, await desk(u2, 'agreements').save({ Number: qa.code('X-AGR-001'), Name: qa.name('X PT Penawar Uji'), Item: qa.prefix('X Monitor pasien'), Price: '1450000', Document: r.tender }, 'Agreement')),
    );
  });
});

qaTest('TC-APP023-008', ({ page, qa }) => TC_APP023_008({ page, qa }));

qaTest('TC-APP023-009', async ({ page, qa }) => {
  const b = desk(page, 'bids');
  // One bid per bidder and tender (a second bid of a bidder answers HTTP 500, TC-APP023-010 step 3): a new bidder for each bid.
  const another = () => master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  const bidder = await another();
  await qa.step(1, async () => {
    const draft = await draftTender(page, qa);
    refused(qa, 1, (await newBid(page, draft.id, bidder, '1450000')).toasts, 'publish the tender first');
  });
  const past = await publishedTender(page, qa);
  await qa.step(2, async () => refused(qa, 2, (await newBid(page, past.id, qa.code('X-TIDAK-ADA'), '1450000')).toasts, 'bidder is missing'));
  await qa.step(3, async () => {
    const bid = await newBid(page, past.id, bidder, '1450000');
    expect(bid.toasts).toContain(SAVED);
    refused(qa, 3, (await act(page, 'bids', bid.id, 'Open bid')).toasts, 'submit the bid first');
  });
  await qa.step(4, async () => {
    const future = await publishedTender(page, qa, { close: WEEK() });
    const bid = await openedBid(page, future.id, bidder, '1450000');
    const r = await act(page, 'bids', bid, 'Accept bid');
    refused(qa, 4, r.toasts, 'last date is not completed');
    if (r.status) expect(r.status).toBe('opened');
  });
  await qa.step(5, async () => {
    const bid = await newBid(page, past.id, await another(), '1460000');
    reached(await act(page, 'bids', bid.id, 'Submit bid'), 'submitted');
    refused(qa, 5, (await act(page, 'bids', bid.id, 'Accept bid')).toasts, 'open the bid first');
  });
  const opened = await openedBid(page, past.id, await another(), '1470000');
  await qa.step(6, async () => refused(qa, 6, await b.save({ Document: opened, Note: '' }, 'Evaluate reject'), 'reason is required'));
  await qa.step(7, async () => refused(qa, 7, await b.save({ Document: opened, Name: '' }, 'Evaluate accept'), 'grade is required'));
  await qa.step(8, async () => refused(qa, 8, await b.save({ Document: past.id, Code: bidder, Name: 'good' }, 'Sheet'), 'bidder and rating are required'));
});

qaTest('TC-APP023-010', async ({ page, qa }) => {
  const bidders = [await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji'), await master(page, qa, 'Bidder', 'X-BDR2', 'X PT Penawar Dua')];
  await qa.step(1, async () => {
    const future = await publishedTender(page, qa, { close: WEEK() });
    const bid = await newBid(page, future.id, bidders[0], '1450000');
    await act(page, 'bids', bid.id, 'Submit bid');
    const r = await act(page, 'bids', bid.id, 'Open bid');
    qa.note(1, `"Open bid" before the close date ${WEEK()}: "${r.toasts.join(' / ')}"; the bid reads "${r.status}" (TBD in the workbook: accepted)`);
  });
  const past = await publishedTender(page, qa);
  await qa.step(2, async () => {
    const results: string[] = [];
    for (const [i, b] of bidders.entries()) {
      const bid = await openedBid(page, past.id, b, ['1450000', '1500000'][i]);
      const r = await act(page, 'bids', bid, 'Accept bid');
      results.push(`${bid}: "${r.toasts.join(' / ')}", "${r.status}"`);
    }
    qa.note(2, `both bids of ${past.id} accepted: ${results.join('; ')} (TBD in the workbook: accepted or refused)`);
  });
  await qa.step(3, async () => {
    const first = await newBid(page, past.id, bidders[0], '1440000');
    const second = await newBid(page, past.id, bidders[0], '1430000');
    qa.note(3, `two bids of ${bidders[0]} on one tender: "${first.toasts.join(' / ')}" (${first.id || 'no row'}) and "${second.toasts.join(' / ')}" (${second.id || 'no row'}) (TBD in the workbook)`);
  });
});

qaTest('TC-APP023-012', ({ page, qa }) => TC_APP023_012({ page, qa }));

qaTest('TC-APP023-013', async ({ page, qa }) => {
  const a = desk(page, 'agreements');
  const v = (tender: string, extra: Record<string, string> = {}) => ({ Number: qa.code('X-AGR-001'), Name: qa.name('X PT Penawar Uji'), Item: qa.prefix('X Monitor pasien'), Price: '1450000', Document: tender, ...extra });
  await qa.step(1, async () => {
    const unrated = await publishedTender(page, qa);
    refused(qa, 1, await a.save(v(unrated.id), 'Agreement'), 'accept a bidder on the sheet first');
  });
  const rated = await ratedTender(page, qa);
  await qa.step(2, async () => refused(qa, 2, await a.save(v(rated.tender, { Item: '' }), 'Agreement'), 'number, vendor, item and rate are required'));
  const draft = await saveAgreement(page, qa, v(rated.tender));
  if (!agreementSaved(qa, 3, draft)) {
    // No agreement of the test to send, approve, sanction or amend (found blocker 50).
    for (const st of [3, 4, 5, 6, 7]) qa.blocked(st, 50);
    return;
  }
  const h = (await head(page, qa)).code;
  await qa.step(3, async () => refused(qa, 3, (await act(page, 'agreements', draft.id, 'Approve agreement')).toasts, 'send the agreement first'));
  await qa.step(4, async () => refused(qa, 4, await a.save({ Document: draft.id, 'Budget head': h, Amount: '14500000' }, 'Sanction'), 'approve the agreement first'));
  reached(await act(page, 'agreements', draft.id, 'Send agreement'), 'sent');
  reached(await act(page, 'agreements', draft.id, 'Approve agreement'), 'approved');
  await qa.step(5, async () => refused(qa, 5, await a.save({ Document: draft.id, 'Budget head': '', Amount: '14500000' }, 'Sanction'), 'head and amount are required'));
  await qa.step(6, async () => {
    const toasts = await a.save({ Document: draft.id, 'Budget head': h, Amount: '999999999999' }, 'Sanction');
    qa.note(6, `"Sanction" far above any balance: "${toasts.join(' / ')}" (TBD in the workbook: Budget refuses the hold)`);
    if (toasts.includes(SAVED)) qa.deviation(6, 'Budget refuses the hold', 'the sanction above the balance is saved');
  });
  await qa.step(7, async () => refused(qa, 7, await a.save({ Number: '', Document: draft.id }, 'Amend'), 'a new number is required'));
});

qaTest('TC-APP023-014', async ({ page, qa }) => {
  const a = desk(page, 'agreements');
  const rated = await ratedTender(page, qa);
  let id = '';
  await qa.step(1, async () => {
    const r = await saveAgreement(page, qa, { Number: qa.code('X-AGR-001'), Name: qa.name('X PT Bukan Penawar'), Item: qa.prefix('X Monitor pasien'), Price: '1450000', Document: rated.tender });
    id = r.id;
    qa.note(1, `an agreement with a vendor that did not bid: "${r.toasts.map((t) => t.slice(0, 40)).join(' / ')}" (TBD in the workbook: accepted)`);
  });
  if (!id) return qa.blocked(2, 50);
  await qa.step(2, async () => {
    await act(page, 'agreements', id, 'Send agreement');
    await act(page, 'agreements', id, 'Approve agreement');
    const sanction = { Document: id, 'Budget head': (await head(page, qa)).code, Amount: '1450000' };
    const first = await a.save(sanction, 'Sanction');
    const second = await a.save(sanction, 'Sanction');
    qa.note(2, `"Sanction" twice: "${first.join(' / ')}" and "${second.join(' / ')}" (TBD in the workbook: budget is held twice)`);
  });
});

qaTest('TC-APP023-016', ({ page, qa }) => TC_APP023_016({ page, qa }));

qaTest('TC-APP023-017', async ({ page, qa }) => {
  const m = desk(page, 'money');
  const t = await publishedTender(page, qa, { close: WEEK() });
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  await qa.step(1, async () => refused(qa, 1, await m.save({ Document: t.id, Code: bidder, Amount: '0' }, 'Fee'), 'bidder and amount are required'));
  await qa.step(2, async () => refused(qa, 2, await m.save({ Document: '', Code: bidder, Amount: '250000' }, 'Fee'), 'document is missing'));
  await qa.step(3, async () => refused(qa, 3, await m.save({ Document: t.id, Code: bidder, Amount: '5000000' }, 'Refund'), 'collect the deposit first'));
});

qaTest('TC-APP023-018', async ({ page, qa }) => {
  const m = desk(page, 'money');
  const t = await publishedTender(page, qa, { close: WEEK() });
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  await qa.step(1, async () => {
    const dep = await m.create({ Document: t.id, Code: bidder, Amount: '5000000' }, 'Deposit');
    expect(dep.toasts).toContain(SAVED);
    const refund = await m.save({ Document: dep.id, Code: bidder, Amount: '5000000' }, 'Refund');
    const forfeit = await m.save({ Document: dep.id, Code: bidder, Amount: '5000000' }, 'Forfeit');
    qa.note(1, `deposit ${dep.id}: "Refund" "${refund.join(' / ')}", then "Forfeit" "${forfeit.join(' / ')}"; the row reads "${await m.status(dep.id)}" (TBD in the workbook)`);
  });
  await qa.step(2, async () => {
    const before = (await m.list()).length;
    const first = await m.save({ Document: t.id, Code: bidder, Amount: '250000' }, 'Fee');
    const second = await m.save({ Document: t.id, Code: bidder, Amount: '250000' }, 'Fee');
    qa.note(2, `the same fee twice: "${first.join(' / ')}" and "${second.join(' / ')}"; ${(await m.list()).length - before} new row(s) (TBD in the workbook: two vouchers)`);
  });
  await qa.step(3, async () => {
    const toasts = await m.save({ Document: t.id, Code: qa.code('X-TIDAK-ADA'), Amount: '250000' }, 'Fee');
    qa.note(3, `a bidder code that does not exist: "${toasts.join(' / ')}" (TBD in the workbook: accepted, the code is the party as typed)`);
  });
  await qa.step(4, async () => {
    await m.openDialog();
    await expect(m.dialog.getByRole('textbox', { name: 'Amount' })).toHaveValue('250000');
    qa.note(4, 'the dialog opens with the sample amount 250000');
  });
});

qaTest('TC-APP023-019', async ({ page, qa, browser }) => {
  const t = await publishedTender(page, qa, { close: WEEK() });
  const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
  await allBranchesOfTender(browser, qa, 'money');
  await asAllBranches(browser, async (u2) => {
    await qa.step(2, async () => allBranchesSave(qa, 2, await desk(u2, 'money').save({ Document: t.id, Code: bidder, Amount: '250000' }, 'Fee')));
  });
});

qaTest('TC-APP023-020', TC_APP023_020);

qaTest('TC-APP023-021', async ({ page, qa, browser }) => {
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/sourcing', ['Tenders', 'Bids', 'Deposits'])).join('; ')} (TBD in the workbook)`);
    });
    const category = await master(page, qa, 'Category', 'X-ALKES', 'X Alkes uji');
    await qa.step(2, async () => {
      refused(qa, 2, await desk(staff, 'tenders').save({ Number: qa.code('X-TND-001'), Code: category, Name: 'open', Document: await freshRequest(page, qa), Close: WEEK() }), 'missing required privilege');
    });
    const t = await publishedTender(page, qa, { category });
    const bidder = await master(page, qa, 'Bidder', 'X-BDR1', 'X PT Penawar Uji');
    const bid = await openedBid(page, t.id, bidder, '1450000');
    await qa.step(3, async () => {
      const toasts = await desk(staff, 'bids').save({ Document: bid }, 'Accept bid');
      const status = await desk(page, 'bids').status(bid);
      qa.note(3, `U3 "Accept bid" on ${bid}: "${toasts.join(' / ')}"; the bid reads "${status}"`);
      if (toasts.includes(SAVED) || status !== 'opened') qa.deviation(3, 'Refused; the bid stays "opened"', `"${toasts.join(' / ')}", the bid reads "${status}"`);
    });
    await qa.step(4, async () => {
      const future = await publishedTender(page, qa, { category, close: WEEK() });
      const sealed = await newBid(page, future.id, bidder, '1475000');
      const rows = await desk(staff, 'bids').list();
      const row = rows.find((r) => r[2] === sealed.id);
      qa.note(4, `U3 reads the bid ${sealed.id} of a tender closing ${WEEK()}: ${row ? `"${row[1]}"` : 'not listed'} (TBD in the workbook: shown to any user of the tenant)`);
    });
    await qa.step(5, async () => {
      const r = await act(page, 'bids', bid, 'Accept bid');
      const entries = await auditEntries(page, 'sourcing');
      qa.note(5, `U1 "Accept bid": "${r.toasts.join(' / ')}", the bid reads "${r.status}"; Audit Log, module "sourcing": ${entries.length} entries (TBD in the workbook: no entry is written)`);
    });
  } finally {
    await staff.context().close();
  }
});

const ROUTES: [string, string, string][] = [
  ['TC-APP023-022', '/sourcing', 'Sourcing'],
  ['TC-APP023-023', '/sourcing/agreements', 'Agreements'],
  ['TC-APP023-024', '/sourcing/bids', 'Bids'],
  ['TC-APP023-025', '/sourcing/masters', 'Masters'],
  ['TC-APP023-026', '/sourcing/money', 'Deposits'],
  ['TC-APP023-027', '/sourcing/tenders', 'Tenders'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
