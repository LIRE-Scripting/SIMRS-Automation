import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { HR } from '../../../lib/hr-data';
import { everyPage } from '../../../pages/paging';
import { Vouchers } from '../19-finance/helpers';
import { signedOutJourney, userPage } from '../shared/access';
import { BASE } from './cases';
import { Batches, payrollEmployee, plain } from './helpers';

/**
 * 17-payroll.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): what a batch gives (payslip, leave and
 * overtime, review and approval, Finance and bank), Payroll without a session
 * and two officers at once. Employees are made per test; batches use the
 * period "2027-03" of the workbook. "Payroll officer 2" is U4 (qa.admin3);
 * the employee with a linked account is U7 (qa.pegawai).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const PERIOD = '2027-03';

/** Runs a batch for an employee and returns its result. */
async function ran(page: Page, no: string) {
  const b = new Batches(page);
  await b.runWith({ employee: no, period: PERIOD, base: BASE });
  return { b, r: await b.result() };
}

/** The buttons and links of the Payroll screens (batches and the hub). */
async function controls(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const route of ['/id/payroll', '/id/payroll/batches']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle').catch(() => {});
    const main = page.getByRole('main');
    out.push(...(await main.getByRole('button').allInnerTexts()), ...(await main.getByRole('link').allInnerTexts()));
  }
  return [...new Set(out.map(plain).filter(Boolean))];
}

qaTest('TC-APP017-009', async ({ page, qa, browser }) => {
  const e = await payrollEmployee(page, qa);
  const { b, r } = await ran(page, e.no);
  qa.note(1, `batch ${r.head} for ${e.no}`);
  await qa.step(1, async () => {
    const inPanel = (await b.panel.getByRole('button').allInnerTexts()).map(plain);
    const all = await controls(page);
    qa.note(1, `"Batch result" offers: ${inPanel.join(', ')}`);
    if (![...inPanel, ...all].some((x) => /payslip|slip|print|export|pdf|cetak/i.test(x))) qa.deviation(1, 'A payslip with the employee, the period, the lines, gross and net', 'no print or export of a payslip from "Batch result" or the list');
  });
  await qa.step(2, async () => {
    const u7 = await userPage(browser, 'U7');
    try {
      const found = await controls(u7);
      qa.note(2, `U7 (qa.pegawai, linked to X-EMP-QA-PEGAWAI) on Payroll: ${found.slice(0, 15).join(', ')}`);
      if (!found.some((x) => /my payslip|payslip|slip gaji/i.test(x))) qa.deviation(2, 'A list of their payslips', 'the linked employee finds no own payslips on Payroll');
    } finally {
      await u7.context().close();
    }
  });
});

qaTest('TC-APP017-017', async ({ page, qa }) => {
  const e = await payrollEmployee(page, qa);
  qa.note(1, `EMP-1 of this test (${e.no}) has no unpaid leave and no shifts: HR leave is not read by Payroll (TC-APP010-024) and the site keeps no Duty Roster`);
  const { b, r } = await ran(page, e.no);
  qa.note(1, `${r.head}; lines ${r.lines.join('; ')}`);
  await qa.step(1, async () => {
    const lop = r.lines.find((l) => l.startsWith('QA-LOP'));
    if (!lop) qa.deviation(1, 'A deduction for the two unpaid days', 'no line "QA-LOP"');
    else qa.note(1, `"${lop}"`);
  });
  await qa.step(2, async () => {
    const ot = r.lines.find((l) => l.startsWith('QA-OT'));
    if (!ot) qa.deviation(2, 'An amount for overtime or night shifts, if the hospital pays one', 'no line "QA-OT"');
    else qa.note(2, `"${ot}"`);
  });
  await qa.step(3, async () => {
    await b.close();
    await b.open();
    const fields = await page.getByRole('main').locator('input').evaluateAll((es) => es.map((x) => (x as HTMLInputElement).labels?.[0]?.innerText ?? x.getAttribute('aria-label') ?? ''));
    qa.note(3, `the run form: ${fields.filter(Boolean).join(', ')}`);
    if (!fields.some((f) => /days|hours|overtime|lembur|hari/i.test(f))) qa.deviation(3, 'Fields for the days worked or the overtime hours', 'the form has Employee, Period, Currency and Base amount only');
  });
});

qaTest('TC-APP017-018', async ({ page, qa }) => {
  const e = await payrollEmployee(page, qa);
  await ran(page, e.no);
  const all = await controls(page);
  qa.note(1, `Payroll offers: ${all.join(', ')}`);
  const look = (st: number, re: RegExp, expected: string) => {
    if (!all.some((x) => re.test(x))) qa.deviation(st, expected, `no such control (Payroll offers ${all.slice(0, 12).join(', ')})`);
  };
  await qa.step(1, async () => look(1, /draft|prepare|save as/i, 'A draft that can be reviewed'));
  await qa.step(2, async () => look(2, /approve|release|setujui/i, 'An approval step'));
  await qa.step(3, async () => look(3, /cancel|correct|reverse|batal/i, 'A cancellation or a correction run'));
  await qa.step(4, async () => look(4, /all employees|branch|bulk|semua/i, 'A run for the branch or for a selection of employees'));
  await qa.step(5, async () => {
    const b = new Batches(page);
    await b.open();
    const rows = await everyPage(page.getByRole('main'), () => b.rows().evaluateAll((rs) => rs.map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? ''))));
    const draft = rows.find((c) => c[1] === 'DRAFT');
    qa.note(5, draft ? `seeded draft #${draft[0]}` : 'no DRAFT batch is listed');
    if (!draft) return qa.notRun(5, 'no seeded "DRAFT" batch is listed');
    await b.open();
    const row = b.rows().filter({ has: page.getByRole('cell', { name: draft[0], exact: true }) }).first();
    await row.click().catch(() => {});
    const opened = await page.getByRole('dialog').or(b.panel).first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!opened) qa.deviation(5, 'The draft can be opened and run', `#${draft[0]} does not open`);
  });
});

qaTest('TC-APP017-019', async ({ page, qa }) => {
  const e = await payrollEmployee(page, qa);
  const { r } = await ran(page, e.no);
  qa.note(1, `${r.head} for ${e.no}, net ${r.net}`);
  await qa.step(1, async () => {
    const v = new Vouchers(page);
    await v.open();
    const rows = (await v.rows().allInnerTexts()).map(plain);
    const payroll = rows.filter((x) => /payroll|salary|gaji/i.test(x));
    qa.note(1, `vouchers about payroll on the first page: ${payroll.slice(0, 3).join(' ; ') || 'none'}`);
    if (!payroll.length) qa.deviation(1, 'A voucher or journal for the payroll', 'no voucher of the payroll in Finance');
  });
  const all = await controls(page);
  await qa.step(2, async () => {
    if (!all.some((x) => /bank|payment list|transfer|daftar pembayaran/i.test(x))) qa.deviation(2, 'A list of net amounts per employee', 'no payment list or bank file on Payroll');
  });
  await qa.step(3, async () => {
    if (!all.some((x) => /tax|pph|pajak/i.test(x))) qa.deviation(3, 'A report per period of the income tax withheld', 'no tax summary on Payroll');
  });
});

qaTest('TC-APP017-025', ({ qa, browser }) => signedOutJourney(browser, qa, '/payroll/batches', /\/(id|en)\/payroll\/batches/));

qaTest('TC-APP017-027', async ({ page, qa, browser }) => {
  const b = new Batches(page);
  const [e1, e2] = [await payrollEmployee(page, qa), await payrollEmployee(page, qa, HR.emp2)];
  const numbersOf = async (p: Page, no: string) => {
    const bb = new Batches(p);
    await bb.open();
    const rows = await everyPage(p.getByRole('main'), () => bb.rows().evaluateAll((rs) => rs.map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? ''))));
    return rows.length ? rows.map((c) => c[0]) : [];
  };
  await qa.step(1, async () => {
    const before = new Set(await numbersOf(page, e1.no));
    await b.open();
    await b.pick(e1.no);
    await b.period.fill(PERIOD);
    await b.run.dblclick();
    await page.waitForTimeout(3000);
    const added = (await numbersOf(page, e1.no)).filter((n) => !before.has(n));
    qa.note(1, `double-click on "Run batch": ${added.length} new batch(es) ${added.join(', ')}`);
    if (added.length !== 1) qa.deviation(1, 'One batch. The button is disabled while it reads "Running…"', `${added.length} batches`);
  });
  const o2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const b2 = new Batches(o2);
      await Promise.all([b.open(), b2.open()]);
      await b.pick(e1.no);
      await b2.pick(e2.no);
      for (const x of [b, b2]) await x.period.fill(PERIOD);
      await Promise.all([b.run.click(), b2.run.click()]);
      const [h1, h2] = [(await b.result()).head, (await b2.result()).head];
      qa.note(2, `at the same moment: ${h1} and ${h2}`);
      expect(h1.split(' ')[0]).not.toBe(h2.split(' ')[0]);
    });
  } finally {
    await o2.context().close();
  }
  await qa.step(3, async () => {
    const { b: bb, r } = await ran(page, e1.no);
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    const still = await bb.panel.isVisible().catch(() => false);
    const number = r.head.match(/^#(\d+)/)?.[1] ?? '';
    const listed = (await numbersOf(page, e1.no)).includes(number);
    qa.note(3, `after the reload: "Batch result" ${still ? 'is still open' : 'is closed'}; #${number} ${listed ? 'is listed' : 'is not listed'}`);
    if (!still) {
      const row = bb.rows().filter({ has: page.getByRole('cell', { name: number, exact: true }) }).first();
      await row.click().catch(() => {});
      const reopened = await bb.panel.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!reopened) qa.deviation(3, 'The result is still there, or can be opened again', `the result is gone; #${number} is listed but does not open`);
    }
  });
});
