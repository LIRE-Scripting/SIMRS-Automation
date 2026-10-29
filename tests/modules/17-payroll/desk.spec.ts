import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { Desk, SAVED, payrollEmployee } from './helpers';

/**
 * 17-payroll.xlsx: the desk screens Calculate (/payroll/desk/run, Doctor
 * fee) and Payslip (/payroll/desk/slip). The doctor is a test employee with a
 * payroll record (account "QA-6101"); payslips are made with "Correct" for
 * the period "2026-10". Refusals show the toast "Minified React error #441".
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const PERIOD = '2026-10';
/** A period no other test uses, locked for TC-APP017-045 (locking it again changes nothing). */
const LOCKED = '2090-01';

/** A doctor: a test employee with a payroll record and an account. */
async function doctor(d: Desk, page: Parameters<typeof payrollEmployee>[0], qa: Parameters<typeof payrollEmployee>[1]) {
  const e = await payrollEmployee(page, qa);
  expect(await d.save('/pay', 'Payroll record', 'Payroll record', { Code: e.no, Account: qa.prefix('X-6101'), Amount: '8000000' })).toContain(SAVED);
  return e;
}

const fee = (d: Desk, code: string, amount: string, period?: string) => d.calculate({ Code: code, Amount: amount, ...(period ? { Period: period } : {}) }, 'Doctor fee');

qaTest('TC-APP017-043', async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await doctor(d, page, qa);
  let before = '';
  await qa.step(1, async () => {
    await d.open('/run', 'Re-run');
    await d.main.getByRole('button', { name: 'Correct' }).click();
    await expect(d.dialog).toHaveAccessibleName('Re-run');
    await expect(d.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Correct', 'Re-run', 'Doctor fee', 'Lock month']);
    await d.dialog.getByRole('button', { name: 'Close' }).last().click();
  });
  await qa.step(2, async () => {
    before = await d.main.getByRole('table').innerText();
    expect(await fee(d, e.no, '2500000')).toContain(SAVED);
    await d.open('/run', 'Re-run');
    expect(await d.main.getByRole('table').innerText()).toBe(before);
  });
  await qa.step(3, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Vouchers', exact: true }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const hits = page.getByRole('row').filter({ hasText: e.no });
    const n = await hits.count();
    qa.note(3, n ? `Vouchers: ${(await hits.first().innerText()).replace(/\s+/g, ' ')}` : 'the voucher is not on the first page of Finance / Vouchers (TBD where it shows)');
  });
  qa.notRun(4, 'TBD: which account the voucher carries; the voucher is written without lines (from the code)');
});

qaTest('TC-APP017-044', async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await doctor(d, page, qa);
  await qa.step(1, async () => {
    const other = await payrollEmployee(page, qa);
    const toasts = await fee(d, other.no, '2500000');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `toast "${toasts.join(' / ')}"`);
    if (!toasts.some((t) => /Account is not mapped/.test(t))) qa.deviation(1, 'TBD: the text shown. The server refuses with a text ending in "Account is not mapped for Employee"', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await fee(d, e.no, '0');
    expect(toasts).not.toContain(SAVED);
    if (!toasts.some((t) => /employee and amount are required/.test(t))) qa.deviation(2, 'TBD: the text shown. The server refuses with a text ending in "employee and amount are required"', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP017-045', async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await doctor(d, page, qa);
  expect(await fee(d, e.no, '2500000')).toContain(SAVED);
  await qa.step(1, async () => {
    const toasts = await fee(d, e.no, '2500000');
    qa.note(1, `second save: "${toasts.join(' / ')}"`);
    if (toasts.includes(SAVED)) qa.note(1, 'saved again: nothing guards against a double booking (as the workbook says)');
  });
  await qa.step(2, async () => {
    const lock = await d.calculate({ Period: LOCKED }, 'Lock month');
    qa.note(2, `"Lock month" ${LOCKED}: "${lock.join(' / ')}"`);
    const toasts = await fee(d, e.no, '2500000', LOCKED);
    qa.note(2, `fee for the locked period: "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const toasts = await fee(d, qa.code('X-NOPE'), '2500000');
    expect(toasts).not.toContain(SAVED);
    if (!toasts.some((t) => /Account is not mapped/.test(t))) qa.deviation(3, 'TBD: the text shown. The server refuses with a text ending in "Account is not mapped for Employee"', `toast "${toasts.join(' / ')}"`);
  });
});

/** A payslip of a test employee for 2026-10, made with "Correct". */
async function payslip(d: Desk, page: Parameters<typeof payrollEmployee>[0], qa: Parameters<typeof payrollEmployee>[1]) {
  const e = await payrollEmployee(page, qa);
  expect(await d.calculate({ Code: e.no, Period: PERIOD, Amount: '8000000' }, 'Correct')).toContain(SAVED);
  return e;
}

qaTest('TC-APP017-046', async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await payslip(d, page, qa);
  await qa.step(1, async () => {
    await page.goto('/id/payroll');
    await page.getByRole('complementary').getByRole('link', { name: 'Payslip' }).first().click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Payroll desk' })).toBeVisible();
    await expect(d.main.getByText('The payslip stays on this screen. Nothing is emailed.', { exact: true }).first()).toBeVisible();
    await expect(d.main.getByRole('textbox', { name: 'Search' })).toBeVisible();
    await expect(d.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    const rows = await d.search(e.no);
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(e.no);
  });
  await qa.step(3, async () => {
    await (await d.search(e.no)).getByRole('button', { name: 'Use' }).click();
    const slip = d.main.getByRole('article');
    await expect(slip.getByRole('heading', { level: 2 })).toHaveText(e.no);
    await expect(slip).toContainText(PERIOD);
    await expect(slip.getByRole('term')).toHaveText(['earning', 'deduction', 'net']);
    await expect(slip.getByRole('definition')).toHaveText(['8000000.00', '0.00', '8000000.00']);
  });
  await qa.step(4, async () => {
    const slip = d.main.getByRole('article');
    expect(await slip.innerText()).not.toContain(e.name);
    expect(await slip.getByRole('button').count()).toBe(0);
    qa.note(4, 'no name, no components and no print or download, as the workbook says (TBD)');
  });
});

qaTest('TC-APP017-047', async ({ page, qa }) => {
  const d = new Desk(page);
  const e = await payslip(d, page, qa);
  await qa.step(1, async () => {
    await d.open('/slip', 'Payroll desk');
    const n = await (await d.search(e.name)).count();
    qa.note(1, `${n} row(s) for the name`);
    if (n) qa.deviation(1, 'TBD: no row; the search looks at the employee number, the period and the amounts only', `${n} row(s)`);
  });
  qa.notRun(2, 'U1 works on one branch; "All branches" in the header needs U2');
});
