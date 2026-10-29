import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { toastsAfter } from '../18-settings/helpers';
import { AMOUNTS, approvedCircular, book, cellOf, choose, draftNo, internalBudget, rowAction, sendAndApprove } from './cases';

/**
 * 20-budget.xlsx, what the circular, the internal budget and the budget
 * request (consolidation) refuse: each test makes its own book, heads on
 * its chart and an approved circular (approvedCircular in cases.ts).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Saves the open dialog: the toasts and the text it still shows. */
async function saveDialog(page: Page): Promise<string[]> {
  const dialog = page.getByRole('dialog');
  const mark = await toastMark(page);
  await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
  const toasts = await toastsAfter(page, mark);
  const inDialog = (await dialog.isVisible()) ? (await dialog.innerText()).replace(/\s+/g, ' ') : '';
  return [...toasts, inDialog];
}

/** True when one of the texts holds `message`; else the deviation is recorded. */
function expectText(qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa'], step: number, shown: string[], message: string | RegExp): void {
  const hit = shown.some((t) => (typeof message === 'string' ? t.includes(message) : message.test(t)));
  if (!hit) qa.deviation(step, `The text "${typeof message === 'string' ? message : message.source}"`, `"${shown.join(' / ').slice(-220) || 'nothing shown'}"`);
}

/** The new-circular dialog with the given parts filled (departments: [department index, in-charge typed or '']). */
async function circularDialog(page: Page, v: { date?: string; due?: string; book?: string; issuer?: boolean; departments?: [number, string][] }): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/circulars');
  await page.getByRole('main').getByRole('button', { name: 'New circular' }).click();
  if (v.date) await dialog.getByLabel('Circular date', { exact: true }).fill(v.date);
  await dialog.getByLabel('Due date', { exact: true }).fill(v.due ?? addDays(todayWib(), 14));
  if (v.book) await choose(dialog.getByLabel('Budget book', { exact: true }), v.book);
  if (v.issuer !== false) await choose(dialog.getByLabel('Issued by', { exact: true }), 'QA-EMP');
  const names = (await dialog.getByLabel('Department', { exact: true }).first().locator('option').allInnerTexts().catch(() => [] as string[])).slice(1);
  for (const [i, [d, inCharge]] of (v.departments ?? []).entries()) {
    await dialog.getByRole('button', { name: 'Add department' }).click();
    const all = (await dialog.getByLabel('Department', { exact: true }).nth(i).locator('option').allInnerTexts()).slice(1);
    await dialog.getByLabel('Department', { exact: true }).nth(i).selectOption({ label: (all[d] ?? names[d])! });
    if (inCharge) await choose(dialog.getByLabel('In-charge', { exact: true }).nth(i), inCharge);
  }
  return dialog;
}

qaTest('TC-APP020-014', async ({ page, qa }) => {
  const b = await book(page, qa);
  await qa.step(1, async () => {
    await circularDialog(page, { date: todayWib(), due: addDays(todayWib(), -1), book: b.code, departments: [[0, 'QA-EMP']] });
    expectText(qa, 1, await saveDialog(page), 'The due date is before the circular date.');
  });
  await qa.step(2, async () => {
    const c = await approvedCircular(page, qa);
    await circularDialog(page, { book: c.book.code, departments: [[0, 'QA-EMP']] });
    const shown = await saveDialog(page);
    expectText(qa, 2, shown, new RegExp(`${c.circular}.*already active|already active.*${c.circular}`));
  });
  let draft = '';
  await qa.step(3, async () => {
    const b2 = await book(page, qa);
    await circularDialog(page, { book: b2.code });
    const shown = await saveDialog(page);
    draft = draftNo(shown, 'Circular');
    if (!draft) {
      expectText(qa, 3, shown, 'List at least one department before sending.');
      return;
    }
    expectText(qa, 3, await rowAction(page, 'circulars', draft, 'Send'), 'List at least one department before sending.');
  });
  await qa.step(4, async () => {
    const b3 = await book(page, qa);
    await circularDialog(page, { book: b3.code, departments: [[0, 'QA-EMP'], [0, 'QA-EMP']] });
    expectText(qa, 4, await saveDialog(page), 'A department is listed twice.');
  });
  await qa.step(5, async () => {
    const b4 = await book(page, qa);
    await circularDialog(page, { book: b4.code, departments: [[0, '']] });
    expectText(qa, 5, await saveDialog(page), 'Choose the in-charge of every department.');
  });
  await qa.step(6, async () => {
    const b5 = await book(page, qa);
    await circularDialog(page, { book: b5.code, issuer: false, departments: [[0, 'QA-EMP']] });
    expectText(qa, 6, await saveDialog(page), 'Choose who issues the circular.');
  });
  await qa.step(7, async () => {
    const c = await approvedCircular(page, qa);
    await page.goto('/id/budget/circulars');
    await page.waitForLoadState('networkidle').catch(() => {});
    const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: c.circular }).first();
    if (!(await row.getByRole('button', { name: 'Edit', exact: true }).isVisible().catch(() => false))) {
      const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
      qa.note(7, `the row of the approved circular ${c.circular} offers no "Edit" (buttons: ${buttons.join(', ') || 'none'}): the change is not offered`);
      qa.deviation(7, 'The text "The circular can be changed only while it is a draft."', `no "Edit" on the row of the sent circular, so no text is shown`);
      return;
    }
    const edit = await rowAction(page, 'circulars', c.circular, 'Edit');
    const dialog = page.getByRole('dialog');
    const readOnly = (await dialog.getByText('This circular has left draft; it can no longer be changed.').count()) > 0;
    if (readOnly) qa.note(7, 'the dialog of the sent circular says "This circular has left draft; it can no longer be changed."');
    else expectText(qa, 7, [...edit, ...(await saveDialog(page))], 'The circular can be changed only while it is a draft.');
  });
});

qaTest('TC-APP020-016', async ({ page, qa }) => {
  const c = await approvedCircular(page, qa);
  const dialog = page.getByRole('dialog');
  const openNew = async () => {
    await page.goto('/id/budget/internal-budgets');
    await page.getByRole('main').getByRole('button', { name: 'New internal budget' }).click();
    await choose(dialog.getByLabel('Budget circular', { exact: true }), c.circular);
    await expect.poll(() => dialog.getByLabel('Budget head', { exact: true }).first().locator('option').count(), { timeout: 15_000 }).toBeGreaterThan(1);
  };
  await qa.step(1, async () => {
    await openNew();
    await choose(dialog.getByLabel('Department', { exact: true }), c.departments[0]);
    await dialog.getByLabel('Document date', { exact: true }).fill(addDays(todayWib(), 30));
    await choose(dialog.getByLabel('Budget head', { exact: true }).first(), c.heads[0]);
    await dialog.getByLabel(/^(Requested amount|Nilai usulan) \(IDR\)$/).first().fill('1000000');
    expectText(qa, 1, await saveDialog(page), /after the (circular )?due date/i);
  });
  qa.notRun(2, 'needs a circular whose due date has passed: the due date of an approved circular cannot be moved back');
  await qa.step(3, async () => {
    await openNew();
    const offered = (await dialog.getByLabel('Department', { exact: true }).locator('option').allInnerTexts()).map((o) => o.trim()).filter(Boolean);
    qa.note(3, `departments offered for ${c.circular}: ${offered.join(', ')} (the circular lists ${c.departments.join(', ')})`);
    if (offered.filter((o) => !/^(Choose|Pilih)/.test(o)).some((o) => !c.departments.includes(o))) qa.deviation(3, 'The text "The circular does not ask this department for a budget."', 'a department the circular does not list is offered');
  });
  await qa.step(4, async () => {
    const first = await internalBudget(page, c.circular, c.departments[0], AMOUNTS(c.heads));
    expect(first.no, 'the first internal budget of the department').toBeTruthy();
    const second = await internalBudget(page, c.circular, c.departments[0], AMOUNTS(c.heads));
    expect(second.no).toBe('');
    expectText(qa, 4, second.toasts, /already answered/i);
  });
  qa.notRun(5, 'needs a group head on the chart of the book of the circular (the chart groups are TC-APP020-005)');
  await qa.step(6, async () => {
    const r = await internalBudget(page, c.circular, c.departments[1], [[c.heads[0], '1000000'], [c.heads[0], '2000000']]);
    expect(r.no).toBe('');
    expectText(qa, 6, r.toasts, 'A budget head is listed twice.');
  });
  await qa.step(7, async () => {
    await openNew();
    await choose(dialog.getByLabel('Department', { exact: true }), c.departments[1]);
    expectText(qa, 7, await saveDialog(page), /Add at least one head/);
  });
});

qaTest('TC-APP020-017', async ({ page, qa }) => {
  const c = await approvedCircular(page, qa);
  const amounts: [number, string][] = [[1, '150.000'], [2, '150,5'], [3, '0']];
  for (const [step, amount] of amounts) {
    await qa.step(step, async () => {
      const r = await internalBudget(page, c.circular, c.departments[0], [[c.heads[0], amount]]);
      qa.note(step, `amount "${amount}": "${r.toasts.join(' / ') || 'no toast'}"${r.no ? `; saved as ${r.no}` : ''}`);
      if (r.no) return qa.deviation(step, 'The text "Enter an amount above zero with at most two decimals." and no internal budget saved', `the internal budget ${r.no} is saved with the amount "${amount}"`);
      expectText(qa, step, r.toasts, 'Enter an amount above zero with at most two decimals.');
    });
  }
});

qaTest('TC-APP020-018', async ({ page, qa }) => {
  const c = await approvedCircular(page, qa);
  const ib = await internalBudget(page, c.circular, c.departments[0], AMOUNTS(c.heads));
  expect((await sendAndApprove(page, 'internal-budgets', ib.no)).status.toLowerCase()).toBe('approved');
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/requests');
  await page.getByRole('main').getByRole('button', { name: 'New consolidation' }).click();
  await choose(dialog.getByLabel('Budget circular', { exact: true }), c.circular);
  await expect(dialog).toContainText(ib.no, { timeout: 15_000 });
  await dialog.getByRole('checkbox', { name: new RegExp(ib.no) }).check();
  const request = draftNo(await saveDialog(page), 'Budget request');
  qa.note(1, `the budget request ${request || '(not saved)'} holds ${ib.no}`);
  await qa.step(1, async () => {
    const toasts = await rowAction(page, 'internal-budgets', ib.no, 'Cancel');
    expectText(qa, 1, toasts, new RegExp(`consolidated|${request || 'BRQ'}`, 'i'));
    expect((await cellOf(page, 'internal-budgets', ib.no, 'Status')).toLowerCase()).not.toBe('cancelled');
  });
});

qaTest('TC-APP020-020', async ({ page, qa }) => {
  const c = await approvedCircular(page, qa);
  const ib = await internalBudget(page, c.circular, c.departments[0], AMOUNTS(c.heads));
  expect((await sendAndApprove(page, 'internal-budgets', ib.no)).status.toLowerCase()).toBe('approved');
  const dialog = page.getByRole('dialog');
  const openNew = async () => {
    await page.goto('/id/budget/requests');
    await page.getByRole('main').getByRole('button', { name: 'New consolidation' }).click();
    await choose(dialog.getByLabel('Budget circular', { exact: true }), c.circular);
    await expect(dialog).toContainText(ib.no, { timeout: 15_000 });
  };
  const amountInputs = () => dialog.locator('input[type="text"]:not([list]), input:not([type]):not([list])');
  await qa.step(2, async () => {
    await openNew();
    // The dialog ticks the approved internal budgets it lists: untick them all.
    for (const box of await dialog.getByRole('checkbox').all()) await box.uncheck();
    const toasts = await saveDialog(page);
    const saved = draftNo(toasts, 'Budget request');
    expectText(qa, 2, toasts, 'Include at least one internal budget.');
    // A request saved anyway holds the internal budget: cancel it so the next steps find the budget free again.
    if (saved) qa.note(2, `cancel of ${saved}, saved with no internal budget: "${(await rowAction(page, 'requests', saved, 'Cancel').catch((e: Error) => [`(${e.message.slice(0, 60)})`])).join(' / ')}"`);
  });
  let request = '';
  let free = false;
  await qa.step(1, async () => {
    await openNew();
    await dialog.getByRole('checkbox', { name: new RegExp(ib.no) }).check();
    request = draftNo(await saveDialog(page), 'Budget request');
    expect(request, 'a budget request with every amount empty, saved as draft').toBeTruthy();
    expectText(qa, 1, await rowAction(page, 'requests', request, 'Send'), /not fully consolidated/);
  });
  qa.notRun(3, 'needs the internal budget cancelled from a second window while the dialog is open');
  await qa.step(5, async () => {
    const toasts = await rowAction(page, 'requests', request, 'Reject').catch((e: Error) => [`(${e.message.slice(0, 80)})`]);
    await openNew().catch(() => {});
    const listed = (await dialog.innerText().catch(() => '')).includes(ib.no);
    qa.note(5, `Reject: "${toasts.join(' / ')}"; New consolidation ${listed ? 'lists' : 'does not list'} ${ib.no} again`);
    if (!listed) qa.deviation(5, 'The internal budgets of the rejected request are listed again', `${ib.no} is not offered after the reject`);
    free = listed;
  });
  // Step 4 last: a request saved in spite of the amount -1 would hold the internal budget the other steps need.
  if (!free) qa.notRun(4, `needs ${ib.no} free again, and it stays held by ${request || 'the request of step 1'} (step 5)`);
  else await qa.step(4, async () => {
    await openNew();
    await dialog.getByRole('checkbox', { name: new RegExp(ib.no) }).check();
    const inputs = amountInputs();
    if (await inputs.count()) await inputs.last().fill('-1');
    expectText(qa, 4, await saveDialog(page), 'Enter amounts of zero or more with at most two decimals.');
  });
});
