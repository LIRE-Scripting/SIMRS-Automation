import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { asOnSite } from '../../../lib/i18n';
import {
  addToChart,
  approvedAllocation,
  approvedSanction,
  approvedTransfer,
  book,
  cellOf,
  choose,
  departmentName,
  head,
  headOf,
  heads,
  linesOf,
  openPosition,
  rowActionRead,
  saveTransfer,
  shownLines,
  shows,
  closeOpenDialogs,
  isApproved,
  transferDialog,
  YEAR,
  type TransferValues,
} from './cases';

/**
 * 20-budget.xlsx, Budget transfer and Budget position (TC-APP020-035 to
 * 038). Both need budget lines, which an approved allocation makes; since
 * 2026-11-01 allocations are approved on Podomoro (checklist blocker 13 no
 * longer stops them), so each test makes its own chain (cases.ts).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

type QaOf = Parameters<Parameters<typeof qaTest>[1]>[0]['qa'];

/** What a step expects to be refused, against what the site showed. */
function refused(qa: QaOf, step: number, expected: string, re: RegExp, shown: string[]): void {
  const all = shown.join(' / ');
  if (shows(re, all)) qa.note(step, `refused: "${(all.match(re) ?? [''])[0]}"`);
  else qa.deviation(step, `The text "${expected}"`, `"${all.slice(0, 220) || 'nothing shown'}"`);
}

/** The test's allocation with its first authority's head, the other head and the first department. */
async function setUp(page: Parameters<Parameters<typeof qaTest>[1]>[0]['page'], qa: QaOf) {
  const a = await approvedAllocation(page, qa);
  const head0 = await headOf(page, a.request, a.authorities[0]);
  const other = a.heads.find((h) => h !== head0)!;
  const lines = await linesOf(page, a.book.code, [a.authorities[0]], 2);
  const department = departmentName(lines[0]);
  const v: TransferValues = { bookCode: a.book.code, authority: a.authorities[0], department, destHead: other, destDepartment: department, amount: '5000000' };
  return { a, head0, other, department, v };
}

qaTest('TC-APP020-035', async ({ page, qa }) => {
  const { a, head0, other, department, v } = await setUp(page, qa);
  const main = page.getByRole('main');
  let no = '';
  qa.note(1, `source: ${head0} · ${department} · ${a.authorities[0]} (70000000); destination head ${other}, ${department}`);
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Budget transfer' }).or(main.getByRole('link', { name: 'Budget transfer' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Budget transfer' })).toBeVisible();
    for (const name of ['Download CSV', 'New transfer']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['No.', 'Date', 'Book / head type', 'From → to', 'Total', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New transfer' }).click();
    const dialog = page.getByRole('dialog');
    for (const f of ['Document date', 'Budget book', 'Head type', 'Destination head', 'Destination branch', 'Destination department', 'Amount (IDR)', 'Remarks']) await expect(dialog.getByLabel(f, { exact: true }).first()).toBeVisible();
    // The source list is named "1. Source line".
    await expect(dialog.locator('select').filter({ has: page.locator('option', { hasText: 'Choose the source line' }) })).toBeVisible();
    qa.note(2, 'the form opens in a dialog');
    await closeOpenDialogs(page);
  });
  await qa.step(3, async () => {
    await transferDialog(page, v);
    const r = await saveTransfer(page);
    no = r.no;
    expect(no, `toast "Transfer <no> saved as draft." (${r.toasts.join(' / ')} ${r.dialog.slice(0, 160)})`).toBeTruthy();
  });
  await qa.step(4, async () => {
    const sent = await rowActionRead(page, 'transfers', no, 'Send');
    const approved = await rowActionRead(page, 'transfers', no, 'Approve');
    qa.note(4, `Send "${sent.toasts.join(' / ')}"; Approve "${approved.toasts.join(' / ')}"`);
    expect(isApproved(await cellOf(page, 'transfers', no, 'Status'))).toBe(true);
  });
  await qa.step(5, async () => {
    const lines = await linesOf(page, a.book.code, [a.authorities[0]], 3);
    qa.note(5, lines.map((x) => `${x.head.split(' ')[0]} · ${x.department} · allocated ${x.allocated}, in ${x.transferredIn}, out ${x.transferredOut}, balance ${x.balance}`).join('; '));
    const source = lines.find((x) => x.head.startsWith(head0) && x.department.startsWith(department));
    const dest = lines.find((x) => x.head.startsWith(other) && x.department.startsWith(department));
    expect(source?.transferredOut).toBe(5_000_000);
    expect(source?.allocated).toBe(70_000_000);
    expect(dest?.transferredIn).toBe(5_000_000);
    qa.note(5, `the destination line under the source's authority: allocated ${dest?.allocated} (a new line, the allocation is not changed)`);
  });
});

qaTest('TC-APP020-036', async ({ page, qa }) => {
  const { a, head0, department, v } = await setUp(page, qa);
  /** Fills the transfer; a choice the form does not offer is the answer of the step. */
  const attempt = async (step: number, expected: string, re: RegExp, values: TransferValues): Promise<void> => {
    await closeOpenDialogs(page);
    try {
      await transferDialog(page, values);
    } catch (e) {
      qa.deviation(step, `The text "${expected}"`, `the form does not offer the choice: ${(e as Error).message.slice(0, 160)}`);
      return;
    }
    const r = await saveTransfer(page);
    refused(qa, step, expected, re, [...r.toasts, r.dialog]);
  };
  await qa.step(1, () => attempt(1, 'The transfer from the line is more than its balance, with the balance', /The transfer from .+ is more than its balance \([^)]+\)\./, { ...v, amount: '80000000' }));
  await qa.step(2, () => attempt(2, 'Source and destination are the same budget line.', /Source and destination are the same budget line\./, { ...v, destHead: head0 }));
  await qa.step(3, async () => {
    const capital = await head(page, qa, 'X-MODAL', 'X Belanja modal uji', 'Capital');
    await addToChart(page, a.book, capital.code);
    await attempt(3, 'The destination head is not of this head type.', /The destination head is not of this head type\./, { ...v, destHead: capital.code });
  });
  await qa.step(4, async () => {
    const next = String(Number(YEAR) + 1);
    const h = { code: qa.code('X-NEXT'), name: qa.name('X Belanja tahun depan uji') };
    const made = await heads(page).add({ Code: h.code, 'Head name': h.name, 'Spending type': 'Operating', 'Financial year': next }).catch((e: Error) => [`(${e.message.slice(0, 100)})`]);
    if (!made.join(' ').includes('Budget head created')) {
      qa.notRun(4, `a head of ${next} cannot be made: "${made.join(' / ')}"`);
      return;
    }
    await addToChart(page, a.book, h.code).catch(() => '');
    await attempt(4, 'The destination head belongs to another financial year than the source.', /The destination head belongs to another financial year than the source\./, { ...v, destHead: h.code });
  });
  await qa.step(5, () => attempt(5, 'The department is not in that branch, or is inactive.', /The department is not in that branch, or is inactive\./, { ...v, destBranch: 'Kemayoran' }));
  await qa.step(6, async () => {
    await closeOpenDialogs(page);
    const t = await approvedTransfer(page, v);
    const s = await approvedSanction(page, { bookCode: a.book.code, head: v.destHead, authority: a.authorities[0], department, request: '5000000', sanction: '5000000' });
    qa.note(6, `transfer ${t} approved; sanction ${s} spends the 5000000 on the destination`);
    const r = await rowActionRead(page, 'transfers', t, 'Cancel');
    refused(qa, 6, 'The destination has already used the transferred amount; the transfer cannot be cancelled.', /The destination has already used the transferred amount; the transfer cannot be cancelled\./, r.toasts);
  });
});

qaTest('TC-APP020-037', async ({ page, qa }) => {
  const a = await approvedAllocation(page, qa);
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Budget\b/ }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Budget' })).toBeVisible();
    for (const l of ['Budget books', 'Budget heads', 'Budget allocation', 'Sanction proposals']) await expect(main.getByRole('link', { name: l }).first()).toBeVisible();
    await expect(main.getByPlaceholder('Search head, department, branch, or authority…')).toBeVisible();
    qa.note(1, `position columns: ${(await main.getByRole('table').last().getByRole('columnheader').allInnerTexts()).map((c) => c.trim()).join(', ')}`);
  });
  await qa.step(2, async () => {
    const lines = await linesOf(page, a.book.code, a.authorities, 4);
    const year = main.locator('select').filter({ has: page.locator('option', { hasText: YEAR }) }).first();
    if (await year.count()) await choose(year, YEAR).catch(() => {});
    qa.note(2, `${lines.length} rows for ${a.book.code} ${YEAR}`);
    expect(lines).toHaveLength(4);
  });
  await qa.step(3, async () => {
    const lines = await shownLines(page);
    const wrong = lines.filter((x) => x.balance !== x.allocated + x.transferredIn - x.transferredOut - x.reserved - x.utilised);
    qa.note(3, `formula checked on ${lines.length} rows; TBD in the workbook: no line of the test has all five amounts (utilisation needs an approved payment voucher, blocker 46)`);
    expect(wrong, 'rows whose balance is not allocated + in - out - reserved - utilised').toEqual([]);
  });
  await qa.step(4, async () => {
    const row = main.getByRole('table').last().getByRole('row').filter({ hasText: a.authorities[0] }).first();
    await row.getByRole('button', { name: 'History' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(a.authorities[0]);
    // The entries load after the dialog opens.
    await expect(dialog).toContainText(a.request, { timeout: 20_000 });
    const text = (await asOnSite(() => dialog.innerText())).replace(/\s+/g, ' ');
    qa.note(4, `"${text.slice(0, 300)}"`);
    expect(text).toMatch(/Alokasi|Allocation/);
    await closeOpenDialogs(page);
  });
  await qa.step(5, async () => {
    const headCode = a.heads[0];
    await main.getByPlaceholder('Search head, department, branch, or authority…').fill(headCode.slice(0, -2));
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect.poll(async () => (await shownLines(page)).every((x) => x.head.includes(headCode.slice(0, -2))), { timeout: 15_000 }).toBe(true);
    qa.note(5, `"${headCode.slice(0, -2)}": ${(await shownLines(page)).length} rows, all of that head`);
  });
});

qaTest('TC-APP020-038', async ({ page, qa }) => {
  const b = await book(page, qa);
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await openPosition(page, b.code);
    await expect(main.getByText('No budget lines yet. A line is created when an allocation is approved.')).toBeVisible({ timeout: 20_000 });
  });
  await qa.step(2, async () => {
    // B14-OPS is the shared opening book: its lines come from the opening data.
    await openPosition(page, 'B14-OPS');
    const row = main.getByRole('table').last().getByRole('row').nth(1);
    await row.getByRole('button', { name: 'History' }).click();
    const text = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ');
    qa.note(2, `history of the first line of B14-OPS: "${text.slice(0, 260)}" (TBD in the workbook: one entry "opening data")`);
    await closeOpenDialogs(page);
  });
  await qa.step(3, async () => {
    const exports = await main.getByRole('button', { name: 'Download CSV' }).or(main.getByRole('link', { name: 'Download CSV' })).count();
    qa.note(3, `${exports} "Download CSV" on the budget position (TBD in the workbook)`);
  });
});
