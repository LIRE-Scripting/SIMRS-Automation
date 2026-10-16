import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { HR } from '../../../lib/hr-data';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { Batches, Desk, RAN, SAVED, payrollEmployee } from './helpers';
import { BASE, TC_APP017_001 } from './cases';

/**
 * 17-payroll.xlsx: Payroll batches (/payroll/batches), hub and screens. The
 * components of the workbook are not on the site (found blocker 37): the
 * figures that depend on them are blocked, the rest is checked on the
 * components the site has.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

qaTest('TC-APP017-001', TC_APP017_001);

qaTest('TC-APP017-003', async ({ page, qa }) => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa, HR.emp2);
  await qa.step(1, async () => {
    await b.runWith({ employee: e.no, base: '8000000' });
    const r = await b.result();
    qa.note(1, `Gross ${r.gross}; Net ${r.net}; lines ${r.lines.join('; ')}`);
  });
  for (const s of [2, 3, 4]) qa.blocked(s, 37);
});

qaTest('TC-APP017-004', async ({ page, qa }) => {
  const b = new Batches(page);
  await b.open();
  const total = async () => Number((await page.getByText(/^Showing/).innerText()).match(/of (\d+)/)?.[1] ?? 0);
  if ((await total()) <= 10) {
    const e = await payrollEmployee(page, qa);
    while ((await total()) <= 10) {
      await b.runWith({ employee: e.no });
      await b.close();
      await b.open();
    }
    qa.note(1, 'batches were run for a test employee until the branch had more than 10');
  }
  await qa.step(1, async () => {
    await b.open();
    await expect(b.rows()).toHaveCount(10);
    await expect(page.getByText(/^Showing/)).toHaveText(`Showing 1–10 of ${await total()}`);
    await expect(page.getByRole('columnheader')).toHaveText(['Batch no', 'Status', 'List index', 'Id']);
  });
  let first: number[] = [];
  await qa.step(2, async () => {
    first = (await b.rows().evaluateAll((rs) => rs.map((r) => Number(r.querySelector('td')?.textContent)))) as number[];
    expect(first).toEqual([...first].sort((x, y) => y - x));
  });
  await qa.step(3, async () => {
    await page.getByRole('button', { name: 'Next page' }).press('Enter');
    await expect(page.getByText(/^Showing/)).toHaveText(/^Showing 11–/);
    await expect(b.rows().first().getByRole('cell').first()).toHaveText(String(Math.min(...first) - 1));
    const next = (await b.rows().evaluateAll((rs) => rs.map((r) => Number(r.querySelector('td')?.textContent)))) as number[];
    expect(Math.max(...next)).toBeLessThan(Math.min(...first));
  });
});

qaTest('TC-APP017-007', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Payroll\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Payroll$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Payroll' })).toBeVisible();
    await expect(main.getByText('Payroll batches and tax calculation.', { exact: true })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Runs' })).toBeVisible();
    await expect(main.getByRole('link')).toHaveText(['Home', 'Apps', 'Batches']);
  });
  await qa.step(2, async () => {
    for (const via of ['tile', 'sidebar']) {
      await page.goto('/en/payroll');
      const link = via === 'tile' ? main.getByRole('link', { name: 'Batches' }) : page.getByRole('complementary').getByRole('link', { name: 'Batches' }).first();
      await link.click();
      await expect(page.getByRole('heading', { level: 1, name: 'Payroll batches' })).toBeVisible();
      await expect(page.getByText(/^Payroll\s*\/\s*Payroll batches$/)).toBeVisible();
    }
  });
  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/payroll/batches');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    const button = (await page.getByRole('button', { name: /batch/i }).first().innerText()).trim();
    qa.note(3, `heading "${h1}", button "${button}"`);
    if (h1 === 'Payroll batches' || button === 'Run batch') qa.deviation(3, 'Headings, fields, buttons and toasts are Indonesian ("Batch payroll", "Jalankan batch", …)', `heading "${h1}", button "${button}"`);
  });
});

qaTest('TC-APP017-008', async ({ page, qa }) => {
  const b = new Batches(page);
  const one = await payrollEmployee(page, qa);
  const two = await payrollEmployee(page, qa, HR.emp2);
  await b.runWith({ employee: one.no, base: BASE });
  await b.close();
  await b.runWith({ employee: two.no, base: '8000000' });
  await b.close();
  qa.note(1, 'the two batches are run by the test (not yesterday)');
  await qa.step(1, async () => {
    const rows = [await b.cells(b.rows().nth(0)), await b.cells(b.rows().nth(1))];
    const text = rows.map((r) => r.join(' | ')).join(' ; ');
    expect(text).not.toContain(one.no);
    qa.deviation(1, 'Each row names the employee, the period, the currency, gross and net', `rows: ${text}`);
  });
  await qa.step(2, async () => {
    await b.rows().first().click();
    if (!(await b.panel.isVisible({ timeout: 2_000 }).catch(() => false))) qa.deviation(2, '"Batch result" opens again with gross, net and the lines', 'a row cannot be opened');
  });
  await qa.step(3, async () => {
    const search = await page.getByRole('searchbox').or(page.getByRole('textbox', { name: /search/i })).count();
    if (!search) qa.deviation(3, 'A search and a filter are present', 'none');
  });
});

qaTest('TC-APP017-010', async ({ page, qa }) => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa);
  await qa.step(1, async () => {
    await b.open();
    await b.pick(e.no);
    const v = await b.base.inputValue();
    expect(v).toBe(BASE);
    qa.deviation(1, 'The agreed salary of EMP-1, taken from the employee\'s file', `"Base amount" reads ${v}, the same for every employee`);
  });
  await qa.step(2, async () => {
    await b.runWith({ employee: e.no, base: '8000000' });
    const r = await b.result();
    qa.note(2, `Gross ${r.gross}; lines ${r.lines.join('; ')}`);
    const idr = (t: string) => Number((t.match(/IDR ([\d.]+),(\d{2})$/) ?? ['', '0', '0']).slice(1).join('.').replace(/\.(?=\d{3})/g, ''));
    const sum = r.lines.reduce((x, l) => x + idr(l), 0);
    const same = r.lines.filter((l) => idr(l) === 8_000_000 || idr(l) === 10_000_000);
    if (idr(r.gross) === 8_000_000 + sum && same.length) {
      qa.deviation(2, 'Gross is built on a basic salary of 8.000.000,00, counted once', `Gross ${r.gross} = the base 8.000.000 plus the lines, among them ${same.join('; ')}`);
    }
  });
  await qa.step(3, async () => {
    const toasts = await b.runWith({ employee: e.no, base: '1500' });
    if (await b.panel.isVisible().catch(() => false)) {
      const r = await b.result();
      qa.note(3, `run: Gross ${r.gross}`);
    } else qa.note(3, `refused: "${toasts.join(' / ')}"`);
  });
});

/** Runs a batch and says what happened: the gross of "Batch result", or the refusal. */
async function outcome(b: Batches, v: Parameters<Batches['runWith']>[0]): Promise<{ ran: boolean; text: string; gross?: string }> {
  const toasts = await b.runWith(v);
  if (await b.panel.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const r = await b.result();
    return { ran: true, text: `run: ${r.head}, Gross ${r.gross}`, gross: r.gross };
  }
  const invalid = await b.page.locator('input:invalid').evaluateAll((es) => es.map((e) => `${(e as HTMLInputElement).name || e.id}: ${(e as HTMLInputElement).validationMessage}`));
  return { ran: false, text: toasts.length ? `toast "${toasts.join(' / ')}"` : invalid.length ? `the browser stops the click (${invalid.join('; ')})` : 'nothing happens' };
}

qaTest('TC-APP017-012', async ({ page, qa }) => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa);
  const cases: [number, string, string][] = [
    [1, '', 'Refused: the base amount is missing'],
    [2, '0', 'Refused'],
    [3, '-5000000', 'Refused: the amount cannot be negative'],
    [4, '999999999999999', 'Refused, or a warning about the size'],
  ];
  for (const [s, base, expected] of cases) {
    await qa.step(s, async () => {
      const o = await outcome(b, { employee: e.no, base });
      qa.note(s, o.text);
      if (o.ran) qa.deviation(s, expected, o.text);
    });
  }
});

qaTest('TC-APP017-013', async ({ page, qa }) => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa);
  await b.runWith({ employee: e.no, period: '2027-03', base: BASE });
  const first = (await b.result()).head;
  await qa.step(1, async () => {
    const o = await outcome(b, { employee: e.no, period: '2027-03', base: BASE });
    if (o.ran) qa.deviation(1, 'Refused, or a warning that this employee was already run for the period', `${o.text} (first ${first})`);
  });
  await qa.step(2, async () => {
    const o = await outcome(b, { employee: e.no, period: '2027-03', base: '12000000' });
    if (o.ran) qa.deviation(2, 'Refused', o.text);
  });
});

qaTest('TC-APP017-014', async ({ page, qa }) => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa);
  await qa.step(1, async () => {
    await b.open();
    const type = await b.period.getAttribute('type');
    const placeholder = await b.period.getAttribute('placeholder');
    if (type !== 'month') qa.deviation(1, 'A month can be chosen', `a text field (type "${type}", hint "${placeholder}")`);
  });
  const check = async (s: number, period: string, expected: string) => {
    const o = await outcome(b, { employee: e.no, period });
    qa.note(s, `"${period.length > 20 ? `${period.length} characters` : period}": ${o.text}`);
    if (o.ran) qa.deviation(s, expected, `"${period.length > 20 ? `${period.length} characters` : period}" ${o.text}`);
  };
  await qa.step(2, async () => {
    for (const p of ['2027-13', 'Maret 2027', 'abc']) await check(2, p, 'Refused: not a month');
  });
  await qa.step(3, () => check(3, '2099-12', 'Refused, or a warning about the future month'));
  await qa.step(4, () => check(4, '', 'Refused: the period is missing'));
  await qa.step(5, async () => {
    const o = await outcome(b, { employee: e.no, period: '2027-03-' + 'X'.repeat(25) });
    qa.note(5, o.text);
    if (o.ran || !/33|32|long|limit|length/i.test(o.text)) qa.deviation(5, 'Refused with a message that names the limit', o.text);
  });
});

qaTest('TC-APP017-015', async ({ page, qa }) => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa);
  await qa.step(1, async () => {
    const o = await outcome(b, { employee: e.no, currency: 'USD', base: BASE });
    qa.note(1, o.text);
    if (o.ran && o.gross?.startsWith('IDR')) qa.deviation(1, 'Amounts in USD, or a refusal because salaries are in IDR', `${o.text}: the amounts are labelled IDR`);
  });
  await qa.step(2, async () => {
    const o = await outcome(b, { employee: e.no, currency: 'XYZ' });
    if (o.ran) qa.deviation(2, 'Refused: not a currency', o.text);
  });
  await qa.step(3, async () => {
    const o = await outcome(b, { employee: e.no, currency: 'ID' });
    qa.note(3, o.text);
    if (!/three|3 letters/i.test(o.text)) qa.deviation(3, 'A message that the currency needs three letters', o.text);
  });
  await qa.step(4, async () => {
    const o = await outcome(b, { employee: e.no, currency: '' });
    qa.note(4, o.text);
    if (o.ran) expect(o.gross).toMatch(/^IDR /);
  });
});

qaTest('TC-APP017-016', async ({ page, qa }) => {
  const b = new Batches(page);
  const off = await payrollEmployee(page, qa, { no: 'QA-EMP-NONAKTIF', name: HR.emp1.name }, { status: 'Inactive' });
  await qa.step(1, async () => {
    await b.open();
    await b.employee.fill(off.no);
    const hit = b.hits().filter({ hasText: off.no });
    await expect(hit).toHaveCount(1);
    const text = await hit.innerText();
    if (!/inactive|nonaktif/i.test(text.replace(off.no, ''))) qa.deviation(1, 'No hit, or the hit is marked as inactive', `hit "${text.trim()}" with no mark`);
  });
  await qa.step(2, async () => {
    const o = await outcome(b, { employee: off.no });
    if (o.ran) qa.deviation(2, 'Refused: the employee is not active', o.text);
  });
  await qa.step(3, async () => {
    const zzz = await payrollEmployee(page, qa, { no: 'QA-EMP-ZZZ', name: HR.emp1.name });
    await b.open();
    await b.employee.fill(zzz.no);
    const found = await b.hits().filter({ hasText: zzz.no }).count();
    qa.note(3, 'the size of the branch staff is not set by the test');
    if (!found) qa.deviation(3, 'The employee is found', `"${(await page.getByRole('listbox').innerText().catch(() => 'no list')).trim()}"`);
  });
});

qaTest('TC-APP017-020', async ({ page, qa }) => {
  let screens = '';
  await qa.step(1, async () => {
    await page.goto('/en/payroll');
    const tiles = (await page.getByRole('main').getByRole('link').allInnerTexts()).map((t) => t.trim()).filter((t) => !['Home', 'Apps'].includes(t));
    const side = (await page.getByRole('complementary').getByRole('link').allInnerTexts()).map((t) => t.trim());
    screens = side.slice(side.indexOf('Analytics') + 1).join(', ');
    if (![...tiles, ...side].some((t) => /component/i.test(t))) qa.deviation(1, 'A list with name, kind, rate or amount, and whether it is an earning or a deduction', `no such screen (hub: ${tiles.join(', ')})`);
  });
  await qa.step(2, () => {
    qa.deviation(2, 'A component can be edited', `no screen to edit a component (Payroll menu: ${screens})`);
    return Promise.resolve();
  });
  await qa.step(3, () => {
    qa.deviation(3, 'Components can be assigned', `no screen to assign a component (Payroll menu: ${screens})`);
    return Promise.resolve();
  });
});

qaTest('TC-APP017-026', async ({ page, qa }) => {
  const b = new Batches(page);
  const name = '<script>alert(1)</script>';
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });
  const e = await payrollEmployee(page, qa, { no: 'QA-EMP-XSS', name: HR.emp1.name }, { name });
  await qa.step(1, async () => {
    await b.open();
    await b.employee.fill(e.no);
    await expect(b.hits().filter({ hasText: e.no })).toContainText(name);
    await b.hits().filter({ hasText: e.no }).click();
    await expect(b.employee).toHaveValue(`${e.no} ${name}`);
    expect(alerted).toBe(false);
  });
  await qa.step(2, async () => {
    const o = await outcome(b, { employee: e.no, period: '<img src=x onerror=1>' });
    qa.note(2, o.text);
    await expect(page.locator('main img[src="x"], table img')).toHaveCount(0);
    expect(alerted).toBe(false);
  });
  qa.notRun(3, 'Audit is read by the Superadmin (U10, deferred)');
});

qaTest('TC-APP017-051', async ({ page, qa }) => {
  const b = new Batches(page);
  const d = new Desk(page);
  const e = await payrollEmployee(page, qa);
  expect(await d.save('/pay', 'Payroll record', 'Payroll record', { Code: e.no, Account: qa.prefix('X-6101'), Amount: '8000000' })).toContain(SAVED);
  await qa.step(1, async () => {
    await b.open();
    await b.pick(e.no);
    const v = await b.base.inputValue();
    if (v !== '8000000') qa.deviation(1, '"Base amount" proposes the basic salary of the payroll record (TBD)', `it reads ${v}`);
  });
  let net = '';
  await qa.step(2, async () => {
    await b.period.fill('2026-10');
    await b.submit();
    const r = await b.result();
    net = r.net;
    expect(r.lines.length).toBeGreaterThan(0);
    qa.note(2, `Gross ${r.gross}; Net ${r.net}`);
  });
  await qa.step(3, async () => {
    await d.open('/slip', 'Payroll desk');
    const rows = await d.search(e.no);
    const n = await rows.count();
    if (!n) qa.deviation(3, 'A payslip with the net of the batch (TBD)', `no payslip for the employee (batch net ${net})`);
  });
  await qa.step(4, async () => {
    expect(await d.calculate({ Code: e.no, Period: '2026-10', Amount: '8000000' }, 'Correct')).toContain(SAVED);
    await d.open('/run', 'Re-run');
    const row = (await d.search(e.no)).first();
    const detail = (await row.innerText()).replace(/\s+/g, ' ');
    qa.note(4, `payslip "${detail}" next to the batch net ${net}: nothing compares them`);
    expect(detail).toContain('net 8000000.00');
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP017-053', '/payroll', 'Payroll'],
  ['TC-APP017-054', '/payroll/batches', 'Payroll batches'],
  ['TC-APP017-055', '/payroll/desk', 'Finance year'],
  ['TC-APP017-056', '/payroll/desk/pay', 'Payroll record'],
  ['TC-APP017-057', '/payroll/desk/reimburse', 'Reimburse'],
  ['TC-APP017-058', '/payroll/desk/run', 'Re-run'],
  ['TC-APP017-059', '/payroll/desk/slip', 'Payroll desk'],
  ['TC-APP017-060', '/payroll/desk/tax', 'Tax declaration'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
