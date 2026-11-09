import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import {
  allocationCells,
  allocationRow,
  approvedAllocation,
  approvedRelease,
  approvedSanction,
  ensurePostingRules,
  headOf,
  postingRuleStatus,
  removePostingRule,
  savePostingRule,
  approvedRequest,
  branchBank,
  cellOf,
  choose,
  fillAllocation,
  openAllocation,
  PER_DEPARTMENT,
  postingOf,
  releaseDialog,
  rowAction,
  rowActionRead,
  saveAllocation,
  saveForm,
  withdrawalDialog,
  restorePostingRule,
  shows,
  isApproved,
  linesOf,
  amountOf,
} from './cases';
import type { Locator } from '@playwright/test';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of allocation.spec.ts, shared with the end-to-end chains (chain.run). */

export const TC_APP020_021: QaBody = async ({ page, qa }) => {
  const r = await approvedRequest(page, qa);
  const main = page.getByRole('main');
  const authorities = r.heads.map(() => qa.code('X-DIPA'));
  qa.note(1, `the test's chain: book ${r.book.code}, circular ${r.circular}, budget request ${r.request} (two heads, two departments, ${PER_DEPARTMENT} each)`);

  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Budget allocation' }).or(main.getByRole('link', { name: 'Budget allocation' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Budget allocation' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Download CSV' }).or(main.getByRole('link', { name: 'Download CSV' })).first()).toBeVisible();
    await expect(main.getByRole('searchbox').or(main.getByPlaceholder('Search no., circular, book, or authority')).first()).toBeVisible();
    const cols = (await main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
    qa.note(1, `columns ${cols.join(', ')}`);
    expect(cols).toHaveLength(8);
  });

  await qa.step(2, async () => {
    const row = await allocationRow(page, r.request);
    const actions = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim());
    if (!actions.includes('Edit')) qa.deviation(2, 'A button "Edit" in the row of the approved request', `the row offers ${actions.join(', ')}`);
    const dialog = await openAllocation(page, r.request);
    await expect(dialog.getByLabel('Authority no. (dasar alokasi)', { exact: true })).toHaveCount(r.heads.length);
    await expect(dialog.getByLabel('Head total', { exact: true })).toHaveCount(r.heads.length);
    // One amount per head and department, named "Allocated <head> for <department> (<branch>)".
    await expect(dialog.getByLabel(/^Allocated .+ for .+ \(.+\)$/)).toHaveCount(r.heads.length * 2);
  });

  await qa.step(3, async () => {
    await fillAllocation(page.getByRole('dialog'), authorities.map((authority) => ({ authority })));
    const saved = await saveAllocation(page);
    expect(saved.toasts.join(' / ')).toContain(`Allocation of ${r.request} saved as draft.`);
    const cells = await allocationCells(page, r.request);
    qa.note(3, `row: allocated "${cells.allocated}", authority "${cells.authority}", status "${cells.status}"`);
    expect(amountOf(cells.allocated)).toBe(Number(PER_DEPARTMENT) * 2 * r.heads.length);
    for (const a of authorities) expect(cells.authority).toContain(a);
  });

  await qa.step(4, async () => {
    const sent = await rowAction(page, 'allocations', r.request, 'Send');
    const approved = await rowAction(page, 'allocations', r.request, 'Approve');
    qa.note(4, `Send: "${sent.join(' / ')}"; Approve (U1, the approver of the chain): "${approved.join(' / ')}"`);
    const first = await allocationCells(page, r.request);
    expect(first.status).toMatch(/^Approved/);
    const journal = await postingOf(async () => (await allocationCells(page, r.request)).journal);
    qa.note(4, `journal: "${first.journal}" right after the approval, then "${journal}"`);
    expect(journal).toMatch(/^Posted/);
  });

  await qa.step(5, async () => {
    const rows = await linesOf(page, r.book.code, authorities, r.heads.length * 2);
    qa.note(5, `${rows.length} lines: ${rows.map((x) => `${x.head} · ${x.department} · ${x.authority}: allocated ${x.allocated}, balance ${x.balance}`).join('; ')}`);
    expect(rows).toHaveLength(r.heads.length * 2);
    for (const x of rows) {
      expect(x.allocated).toBe(Number(PER_DEPARTMENT));
      expect(x.balance).toBe(Number(PER_DEPARTMENT));
    }
  });

  qa.notRun(6, `TBD in the workbook (the allocation journal of ${todayWib()} in Finance, Journals): what the steps expect is not stated`);
};

/** Did the site show a message (a toast or a text of the open dialog) matching `expected`? Records a deviation if not. */
export function expectRefusal(qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa'], step: number, expected: string, re: RegExp, shown: { toasts: string[]; dialog: string }): void {
  const all = [...shown.toasts, shown.dialog].join(' / ');
  if (shows(re, all)) qa.note(step, `refused: "${(all.match(re) ?? [''])[0]}"`);
  else qa.deviation(step, `The text "${expected}"`, `${shown.toasts.length ? `toasts "${shown.toasts.join(' / ')}"` : 'no toast'}; the dialog ${shown.dialog ? `reads "${shown.dialog.slice(0, 160)}"` : 'closed (saved)'}`);
}

/** Sets one head of the open allocation dialog: authority no., head total and the department amounts. */
export async function setHead(dialog: Locator, i: number, v: { authority?: string; total?: string; departments?: string[] }): Promise<void> {
  await dialog.getByLabel('Allocation date (journal date)', { exact: true }).fill(todayWib());
  await dialog.getByLabel('Authority', { exact: true }).nth(i).selectOption({ label: 'DIPA' });
  await dialog.getByLabel('Authority no. (dasar alokasi)', { exact: true }).nth(i).fill(v.authority ?? '');
  await dialog.getByLabel('Head total', { exact: true }).nth(i).fill(v.total ?? '');
  const amounts = dialog.getByLabel(/^Allocated .+ for .+ \(.+\)$/);
  const perHead = (await amounts.count()) / (await dialog.getByLabel('Head total', { exact: true }).count());
  for (let d = 0; d < perHead; d++) await amounts.nth(i * perHead + d).fill(v.departments?.[d] ?? '');
}

export const TC_APP020_022: QaBody = async ({ page, qa }) => {
  const r = await approvedRequest(page, qa);
  const open = async () => {
    await page.keyboard.press('Escape');
    return openAllocation(page, r.request);
  };
  await qa.step(1, async () => {
    const d = await open();
    await setHead(d, 0, { authority: qa.code('X-DIPA'), total: '140000000', departments: ['70000000', '60000000'] });
    expectRefusal(qa, 1, 'The department allocations of the head must add up to the head total', /must add up to the head total|does not match the head total/, await saveAllocation(page));
  });
  await qa.step(2, async () => {
    const d = await open();
    await setHead(d, 0, { authority: qa.code('X-DIPA'), total: '150000000', departments: ['75000000', '75000000'] });
    expectRefusal(qa, 2, 'The total of the head is more than the consolidated amount', /the total is more than the consolidated amount/, await saveAllocation(page));
  });
  await qa.step(3, async () => {
    const d = await open();
    await setHead(d, 0, { authority: '', total: '140000000', departments: ['70000000', '70000000'] });
    expectRefusal(qa, 3, 'Enter the authority no. for the head', /enter the authority no\./, await saveAllocation(page));
  });
  await qa.step(4, async () => {
    const d = await open();
    const same = qa.code('X-DIPA');
    await setHead(d, 0, { authority: same, total: '140000000', departments: ['70000000', '70000000'] });
    await setHead(d, 1, { authority: same, total: '140000000', departments: ['70000000', '70000000'] });
    expectRefusal(qa, 4, 'The two heads name the same authority', /name the same authority/, await saveAllocation(page));
  });
  await qa.step(5, async () => {
    // An authority of an approved allocation of another test request funds its head in the year.
    await allocationRow(page, 'BRQ');
    const rows = (await page.getByRole('main').getByRole('table').getByRole('row').allInnerTexts()).map((x) => x.replace(/\s+/g, ' '));
    const used = rows.filter((x) => /\bApproved\b/.test(x) && !x.includes(r.request)).map((x) => x.match(/QA-DIPA-\S+/)?.[0]).find(Boolean) ?? '';
    qa.note(5, `authority of another approved allocation: ${used || 'none found'}`);
    const d = await open();
    await setHead(d, 0, { authority: used, total: '140000000', departments: ['70000000', '70000000'] });
    await setHead(d, 1, { authority: '', total: '', departments: ['', ''] });
    expectRefusal(qa, 5, 'The authority already funds that head in the year', /already funds .+ in \d{4}/, await saveAllocation(page));
  });
  await qa.step(6, async () => {
    const d = await open();
    for (let i = 0; i < r.heads.length; i++) await setHead(d, i, {});
    expectRefusal(qa, 6, 'Allocate at least one head.', /Allocate at least one head\./, await saveAllocation(page));
  });
};

export const TC_APP020_024: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    const a = await approvedAllocation(page, qa);
    const r = await rowActionRead(page, 'allocations', a.request, 'Cancel');
    qa.note(1, `confirmation: "${r.confirm}"; toasts "${r.toasts.join(' / ')}"`);
    if (!/takes the amounts back off the budget lines and asks finance to reverse the journal/.test(r.confirm)) qa.deviation(1, 'The confirmation says the amounts are taken back off the budget lines and Finance is asked to reverse the journal', `"${r.confirm}"`);
    const first = (await allocationCells(page, a.request)).journal;
    const journal = await postingOf(async () => (await allocationCells(page, a.request)).journal);
    qa.note(1, `journal: "${first}" right after, then "${journal}"`);
    expect(journal).toMatch(/^Revers/);
    if (!/^Reversed/.test(journal)) qa.deviation(1, '"Journal" reads "Reversal waiting", then "Reversed"', `"${journal}"`);
  });
  await qa.step(2, async () => {
    const a = await approvedAllocation(page, qa);
    const rel = await approvedRelease(page, a.book.code, a.authorities[0]);
    qa.note(2, `release ${rel.no} of ${a.authorities[0]} approved (posting "${rel.posting}")`);
    const r = await rowActionRead(page, 'allocations', a.request, 'Cancel');
    expectRefusal(qa, 2, 'Funds of this allocation are already released; cancel the fund releases first.', /Funds of this allocation are already released; cancel the fund releases first\./, { toasts: r.toasts, dialog: '' });
    expect((await allocationCells(page, a.request)).status).toMatch(/^Approved/);
  });
  await qa.step(3, async () => {
    const a = await approvedAllocation(page, qa);
    const head = await headOf(page, a.request, a.authorities[0]);
    const s = await approvedSanction(page, { bookCode: a.book.code, head, authority: a.authorities[0], request: '10000000', sanction: '10000000' });
    qa.note(3, `sanction ${s} reserves 10000000 of ${a.authorities[0]}`);
    const r = await rowActionRead(page, 'allocations', a.request, 'Cancel');
    expectRefusal(qa, 3, 'Part of the allocation is already reserved or spent; it cannot be cancelled.', /Part of the allocation is already reserved or spent; it cannot be cancelled\./, { toasts: r.toasts, dialog: '' });
    expect((await allocationCells(page, a.request)).status).toMatch(/^Approved/);
  });
};

export const TC_APP020_025: QaBody = async ({ page, qa }) => {
  const a = await approvedAllocation(page, qa);
  const set = await ensurePostingRules(page);
  if (set.length) qa.note(1, `Podomoro's budget posting rules ${set.join(' and ')} were not set; the test saved them (Finance, Budget posting rules)`);
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  let no = '';
  qa.note(1, `allocation of ${a.request} approved (journal "${a.journal}"), authorities ${a.authorities.join(', ')}`);
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Fund release' }).or(main.getByRole('link', { name: 'Fund release' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Fund release' })).toBeVisible();
    for (const name of ['Download CSV', 'New release']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['No.', 'Date', 'Book / head type', 'Allocation line', 'Released', 'Finance posting', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New release' }).click();
    await expect(dialog.getByText('New fund release', { exact: true })).toBeVisible();
    for (const f of ['Document date', 'Budget book', 'Head type', 'Requested (IDR)', 'Released (IDR)', 'Remarks']) await expect(dialog.getByLabel(f, { exact: true }).first()).toBeVisible();
    // The line list is named "1. Allocation line (dasar alokasi)".
    await expect(dialog.locator('select').filter({ has: page.locator('option', { hasText: 'Choose the allocation line' }) })).toBeVisible();
    await expect(dialog.getByText('Release lines', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add line' })).toBeVisible();
    await page.keyboard.press('Escape');
  });
  await qa.step(3, async () => {
    await releaseDialog(page, a.book.code, [{ authority: a.authorities[0], requested: '40000000', released: '40000000' }]);
    const text = (await dialog.innerText()).replace(/\s+/g, ' ');
    qa.note(3, `the line reads: "${text.match(/balance [\d.,]+/i)?.[0] ?? text.slice(0, 160)}"`);
    expect(text).toMatch(/70[.,]000[.,]000/);
  });
  await qa.step(4, async () => {
    const saved = await saveForm(page);
    no = saved.toasts.map((t) => t.match(/^Fund release (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(no, `toast "Fund release <no> saved as draft." (${saved.toasts.join(' / ')})`).toBeTruthy();
  });
  await qa.step(5, async () => {
    await rowAction(page, 'fund-releases', no, 'Send');
    await rowAction(page, 'fund-releases', no, 'Approve');
    expect(isApproved(await cellOf(page, 'fund-releases', no, 'Status'))).toBe(true);
    const posting = await postingOf(() => cellOf(page, 'fund-releases', no, 'Finance posting'));
    qa.note(5, `finance posting "${posting}"`);
    expect(posting).toMatch(/^Posted/);
    const lines = await linesOf(page, a.book.code, [a.authorities[0]], 2);
    qa.note(5, `lines of ${a.authorities[0]}: ${lines.map((x) => `${x.department}: allocated ${x.allocated}, balance ${x.balance}`).join('; ')}`);
    const after = await releaseDialog(page, a.book.code, [{ authority: a.authorities[0], requested: '1', released: '1' }]);
    const shown = (await after.innerText()).replace(/\s+/g, ' ');
    await page.keyboard.press('Escape');
    qa.note(5, `the allocation line now reads "${shown.match(/balance [\d.,]+/i)?.[0] ?? ''}"`);
    expect(shown).toMatch(/30[.,]000[.,]000/);
  });
  await qa.step(6, async () => {
    const d = await withdrawalDialog(page, a.book.code, { authority: a.authorities[0], bank: '', amount: '' });
    const text = (await d.innerText()).replace(/\s+/g, ' ');
    qa.note(6, `New withdrawal for ${a.authorities[0]}: "${text.match(/Released balance[^A-Z]*/)?.[0] ?? text.slice(0, 160)}"`);
    expect(text).toMatch(/40[.,]000[.,]000/);
    await page.keyboard.press('Escape');
  });
};

export const TC_APP020_026: QaBody = async ({ page, qa }) => {
  const a = await approvedAllocation(page, qa);
  const line = a.authorities[0];
  await qa.step(1, async () => {
    await releaseDialog(page, a.book.code, [{ authority: line, requested: '10000000', released: '20000000' }]);
    expectRefusal(qa, 1, 'The released amount is more than the requested amount.', /The released amount is more than the requested amount\./, await saveForm(page));
  });
  await qa.step(2, async () => {
    await page.keyboard.press('Escape');
    await releaseDialog(page, a.book.code, [{ authority: line, requested: '90000000', released: '90000000' }]);
    expectRefusal(qa, 2, 'The released amount of the line is more than the allocation balance, with the balance', /released is more than the allocation balance \([^)]+\)/, await saveForm(page));
  });
  await qa.step(3, async () => {
    await page.keyboard.press('Escape');
    await releaseDialog(page, a.book.code, [{ authority: line, requested: '1000000', released: '1000000' }, { authority: line, requested: '1000000', released: '1000000' }]);
    expectRefusal(qa, 3, 'An allocation line can be on the release only once.', /An allocation line can be on the release only once\./, await saveForm(page));
  });
  await qa.step(4, async () => {
    await page.keyboard.press('Escape');
    await releaseDialog(page, a.book.code, [{ authority: line, requested: '', released: '' }]);
    expectRefusal(qa, 4, 'Every line needs an allocation line and requested and released amounts above zero.', /Every line needs an allocation line and requested and released amounts above zero\./, await saveForm(page));
  });
  await qa.step(5, async () => {
    await page.keyboard.press('Escape');
    const rel = await approvedRelease(page, a.book.code, line, '30000000');
    const bank = await branchBank(page);
    await withdrawalDialog(page, a.book.code, { authority: line, bank, amount: '10000000' });
    const saved = await saveForm(page);
    const w = saved.toasts.map((t) => t.match(/^Fund withdrawal (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(w, `a withdrawal of the release (${saved.toasts.join(' / ')} ${saved.dialog.slice(0, 160)})`).toBeTruthy();
    await rowAction(page, 'fund-withdrawals', w, 'Send');
    await rowAction(page, 'fund-withdrawals', w, 'Approve');
    qa.note(5, `release ${rel.no} and withdrawal ${w} (status "${await cellOf(page, 'fund-withdrawals', w, 'Status')}")`);
    const r = await rowActionRead(page, 'fund-releases', rel.no, 'Cancel');
    expectRefusal(qa, 5, 'Funds of this release are already withdrawn; cancel the withdrawals first.', /Funds of this release are already withdrawn; cancel the withdrawals first\./, { toasts: r.toasts, dialog: '' });
  });
  await qa.step(6, async () => {
    await page.keyboard.press('Escape');
    await releaseDialog(page, a.book.code, [{ authority: line, requested: '1000000', released: '1000000' }]);
    const saved = await saveForm(page);
    const no = saved.toasts.map((t) => t.match(/^Fund release (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(no, 'a pending release of the test').toBeTruthy();
    await rowAction(page, 'fund-releases', no, 'Send');
    // The rule of the branch is taken away for the approval only, and saved again right after.
    const removed = await removePostingRule(page, 'Fund release');
    try {
      qa.note(6, `Fund release rule of Podomoro removed: "${removed.join(' / ')}"`);
      const r = await rowActionRead(page, 'fund-releases', no, 'Approve');
      expectRefusal(qa, 6, 'Finance cannot post yet', /Finance cannot post yet: branch .+ has no usable .+ posting rule\./, { toasts: r.toasts, dialog: '' });
      qa.note(6, `${no} stays "${await cellOf(page, 'fund-releases', no, 'Status')}"`);
    } finally {
      await restorePostingRule(page, 'Fund release');
    }
  });
};

export const TC_APP020_027: QaBody = async ({ page, qa }) => {
  const a = await approvedAllocation(page, qa);
  const rel = await approvedRelease(page, a.book.code, a.authorities[0], '40000000');
  const bank = await branchBank(page);
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  let no = '';
  qa.note(1, `release ${rel.no} of ${a.authorities[0]} (40000000, posting "${rel.posting}"); bank account ${bank} (Podomoro's finance configuration)`);
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Fund withdrawal' }).or(main.getByRole('link', { name: 'Fund withdrawal' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Fund withdrawal' })).toBeVisible();
    for (const name of ['Download CSV', 'New withdrawal']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['No.', 'Date', 'Dasar alokasi', 'Bank account / instrument', 'Amount', 'Finance posting', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New withdrawal' }).click();
    for (const f of ['Document date', 'Budget book', 'Head type', 'Branch', 'Dasar alokasi', 'Bank account', 'Withdrawal amount (IDR)', 'Instrument', 'Instrument no.', 'Instrument date', 'Remarks']) await expect(dialog.getByLabel(f, { exact: true }).first()).toBeVisible();
    await page.keyboard.press('Escape');
  });
  await qa.step(3, async () => {
    await withdrawalDialog(page, a.book.code, { authority: a.authorities[0], bank, amount: '25000000' });
    const saved = await saveForm(page);
    no = saved.toasts.map((t) => t.match(/^Fund withdrawal (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(no, `toast "Fund withdrawal <no> saved as draft." (${saved.toasts.join(' / ')} ${saved.dialog.slice(0, 160)})`).toBeTruthy();
  });
  await qa.step(4, async () => {
    await rowAction(page, 'fund-withdrawals', no, 'Send');
    await rowAction(page, 'fund-withdrawals', no, 'Approve');
    expect(isApproved(await cellOf(page, 'fund-withdrawals', no, 'Status'))).toBe(true);
    const posting = await postingOf(() => cellOf(page, 'fund-withdrawals', no, 'Finance posting'));
    qa.note(4, `finance posting "${posting}"`);
    expect(posting).toMatch(/^Posted/);
  });
  qa.notRun(5, 'TBD in the workbook (the bank receipt of 25000000.00 on the bank account in Trial balance)');
};

export const TC_APP020_028: QaBody = async ({ page, qa }) => {
  const a = await approvedAllocation(page, qa);
  const rel = await approvedRelease(page, a.book.code, a.authorities[0], '40000000');
  const bank = await branchBank(page);
  qa.note(1, `release ${rel.no} of ${a.authorities[0]} (40000000)`);
  await qa.step(1, async () => {
    await withdrawalDialog(page, a.book.code, { authority: a.authorities[0], bank, amount: '50000000' });
    expectRefusal(qa, 1, 'The withdrawal is more than the released balance, with the balance', /The withdrawal is more than the released balance \([^)]+\)/, await saveForm(page));
  });
  await qa.step(2, async () => {
    await page.keyboard.press('Escape');
    const d = await withdrawalDialog(page, a.book.code, { authority: a.authorities[0], bank, amount: '1' }).catch(() => null);
    const offered = d ? await d.getByLabel('Dasar alokasi', { exact: true }).locator('option').allInnerTexts() : [];
    if (!offered.some((o) => o.includes(a.authorities[1]))) {
      qa.deviation(2, 'The text "Nothing is released under this dasar alokasi at the branch."', `the list "Dasar alokasi" offers only authorities with a released balance (${a.authorities[1]}, with nothing released, is not offered)`);
    } else {
      await d!.getByLabel('Dasar alokasi', { exact: true }).selectOption({ label: offered.find((o) => o.includes(a.authorities[1]))! });
      expectRefusal(qa, 2, 'Nothing is released under this dasar alokasi at the branch.', /Nothing is released under this dasar alokasi at the branch\./, await saveForm(page));
    }
  });
  qa.notRun(3, 'needs a bank account restricted to another branch, or an inactive one; the shared data has none and the steps do not make one');
  await qa.step(4, async () => {
    await page.keyboard.press('Escape');
    await withdrawalDialog(page, a.book.code, { authority: a.authorities[0], bank, amount: '1000000', instrumentNo: '' });
    expectRefusal(qa, 4, 'Fill in the branch, dasar alokasi, bank account, instrument and an amount above zero.', /Fill in the branch, dasar alokasi, bank account, instrument and an amount above zero\./, await saveForm(page));
  });
  await qa.step(5, async () => {
    await page.keyboard.press('Escape');
    await withdrawalDialog(page, a.book.code, { authority: a.authorities[0], bank, amount: '5000000' });
    const saved = await saveForm(page);
    const w = saved.toasts.map((t) => t.match(/^Fund withdrawal (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(w, 'a withdrawal of the test').toBeTruthy();
    await rowAction(page, 'fund-withdrawals', w, 'Send');
    await rowAction(page, 'fund-withdrawals', w, 'Approve');
    const r = await rowActionRead(page, 'fund-withdrawals', w, 'Cancel');
    qa.note(5, `confirmation: "${r.confirm}"; toasts "${r.toasts.join(' / ')}"; status "${await cellOf(page, 'fund-withdrawals', w, 'Status')}"`);
    if (!/gives the released balance back and asks finance to reverse the bank receipt/.test(r.confirm)) qa.deviation(5, 'The confirmation says the released balance is given back and Finance is asked to reverse the bank receipt', `"${r.confirm}"`);
  });
};

export const TC_APP020_023: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    const r = await approvedRequest(page, qa);
    await openAllocation(page, r.request);
    await fillAllocation(page.getByRole('dialog'), r.heads.map(() => ({ authority: qa.code('X-DIPA') })));
    expect((await saveAllocation(page)).toasts.join(' / ')).toMatch(/saved as draft/);
    await rowAction(page, 'allocations', r.request, 'Send');
    // The operating rule of the branch is taken away for the approval only, and saved again right after.
    const removed = await removePostingRule(page, 'Allocation — operating');
    try {
      qa.note(1, `Allocation — operating rule of Podomoro removed: "${removed.join(' / ')}"`);
      const approve = await rowActionRead(page, 'allocations', r.request, 'Approve');
      const cells = await allocationCells(page, r.request);
      qa.note(1, `Approve: "${approve.toasts.join(' / ')}"; the allocation reads "${cells.status}", journal "${cells.journal}"`);
      if (!approve.toasts.some((t) => shows(/Finance cannot post yet: branch .+ has no usable .+ posting rule\./, t))) qa.deviation(1, 'The text that Finance cannot post yet because the branch has no usable posting rule of that kind', `"${approve.toasts.join(' / ') || 'no toast'}"`);
      expect(cells.status).not.toMatch(/^Approved/);
    } finally {
      await restorePostingRule(page, 'Allocation — operating');
    }
  });
  qa.notRun(2, 'a failing posting cannot be made from the screens: Finance posts the allocation journal by itself');
  await qa.step(3, async () => {
    const a = await approvedAllocation(page, qa);
    const cells = await allocationCells(page, a.request);
    qa.note(3, `journal "${cells.journal}"; the row offers ${cells.actions.join(', ')}`);
    if (cells.actions.includes('Post again')) {
      const toasts = await rowAction(page, 'allocations', a.request, 'Post again');
      if (!toasts.includes('The posting has not failed.')) qa.deviation(3, 'The text "The posting has not failed."', `"${toasts.join(' / ') || 'no toast'}"`);
    } else {
      qa.deviation(3, 'The text "The posting has not failed."', `a posted row offers no "Post again" (only ${cells.actions.join(', ')}), so the posting cannot be asked again`);
    }
  });
};
