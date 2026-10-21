import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { BILLING } from '../../../lib/billing-data';
import { CashierPage, norm } from '../../../pages/billing/CashierPage';
import { appsCardRefused, asUser, headerOneBranch, menuScreens, routesRefused, toastsOf, userPage } from '../shared/access';
import { backToEnglish } from '../shared/language';
import { patientWithId, plans, tariffs } from './cases';
import { counterClosed, ensureSettings, sale, select } from './helpers';

/**
 * 14-hospital-accounts.xlsx, Counter settings, sponsor shares and the access
 * test cases of Fast Cashier and the new screens: U3 without any right, and
 * U1 next to a branch of U6 (Kemayoran). Settings and shares changed by a
 * test are set back to the shared data at its end. Runs before
 * zz-close-day.spec.ts: once U1's day is closed, no money can be taken.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureSettings(page);
  test.skip(await counterClosed(page), "The U1 cashier's counter is closed for today (TC-APP014-011 ran); no money can be taken until tomorrow");
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

const SETTING = (page: Page, label: string) => page.getByRole('textbox', { name: label === 'Rounding' ? /^Rounding/ : label, exact: label !== 'Rounding' });

/** The values of "Counter settings", by label. */
async function counterSettings(page: Page): Promise<Record<string, string>> {
  const c = new CashierPage(page);
  await c.open();
  const out: Record<string, string> = {};
  for (const label of [...Object.keys(BILLING.counter), 'Maximum line discount (%)']) out[label] = await SETTING(page, label).inputValue().catch(() => '');
  return out;
}

/** Saves counter settings and returns the red message or the toasts. */
async function saveSettings(page: Page, v: Record<string, string>): Promise<string> {
  const c = new CashierPage(page);
  await c.open();
  for (const [label, value] of Object.entries(v)) await SETTING(page, label).fill(value);
  const toasts = await toastsOf(page, () => c.button('Save settings').click());
  const red = (await c.error().allInnerTexts().catch(() => [] as string[])).join(' / ');
  return red || toasts.join(' / ');
}

/** Sets BR-A's counter settings back to the shared data (and the maximum line discount to what it was). */
async function restoreSettings(page: Page, maxLine: string): Promise<void> {
  await saveSettings(page, { ...BILLING.counter, 'Maximum line discount (%)': maxLine });
}

qaTest('TC-APP014-013', async ({ page, qa, browser }) => {
  const before = await counterSettings(page);
  const branchB = await asUser(browser, 'U6', counterSettings);
  try {
    await qa.step(1, async () => {
      for (const [label, value] of Object.entries(BILLING.counter)) expect(before[label], label).toBe(value);
      await expect(SETTING(page, 'Maximum line discount (%)')).toBeVisible();
    });

    await qa.step(2, async () => {
      await saveSettings(page, { 'Tax rate (%)': '12', 'Discount cap (IDR)': '75000' });
      const after = await counterSettings(page);
      expect([after['Tax rate (%)'], after['Discount cap (IDR)']]).toEqual(['12', '75000']);
    });

    await qa.step(3, async () => {
      await sale(page, '150000');
      const l = await new CashierPage(page).lines();
      expect([l.Tax, l['Patient net']]).toEqual(['Rp 18.000', 'Rp 168.000']);
    });

    await qa.step(4, async () => {
      const c = new CashierPage(page);
      await c.field('Discount (IDR)').fill('60000');
      await c.button('Apply discount').click();
      await expect.poll(async () => (await c.lines()).Discount, { timeout: 10_000 }).toMatch(/60\.000/);
      qa.note(4, `after the discount: ${Object.entries(await c.lines()).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    });

    await qa.step(5, async () => {
      const now = await asUser(browser, 'U6', counterSettings);
      expect(now).toEqual(branchB);
      qa.note(5, `BR-B keeps its own values (Tax rate ${now['Tax rate (%)']}, Discount cap ${now['Discount cap (IDR)']})`);
    });
  } finally {
    await restoreSettings(page, before['Maximum line discount (%)']);
  }
});

qaTest('TC-APP014-039', async ({ page, qa }) => {
  const before = await counterSettings(page);
  const message = 'tax rate must be between 0 and 1; caps and rounding must be zero or more';
  try {
    await qa.step(1, async () => {
      const shown = await saveSettings(page, { 'Tax rate (%)': '150' });
      if (!shown.includes(message)) qa.deviation(1, `Red message: "${message}"`, `"${shown || 'nothing'}"`);
    });
    await qa.step(2, async () => {
      const shown = await saveSettings(page, { 'Tax rate (%)': BILLING.counter['Tax rate (%)'], 'Maximum line discount (%)': '150' });
      if (!shown.includes(message)) qa.deviation(2, 'The same message', `"${shown || 'nothing'}"`);
    });
    await qa.step(3, async () => {
      expect(await counterSettings(page)).toEqual(before);
    });
  } finally {
    await restoreSettings(page, before['Maximum line discount (%)']);
  }
});

qaTest('TC-APP014-045', async ({ page, qa, browser }) => {
  const c = new CashierPage(page);
  const panel = page.getByRole('region', { name: 'Insurance / BPJS' });
  const shares = async (p: string, s: string): Promise<string> => {
    await c.open();
    await c.button('Insurance / BPJS').click();
    await panel.getByRole('textbox', { name: 'Patient share (%)' }).fill(p);
    await panel.getByRole('textbox', { name: 'Sponsor share (%)' }).fill(s);
    const toasts = await toastsOf(page, () => panel.getByRole('button', { name: 'Save shares' }).click());
    return [(await c.error().allInnerTexts().catch(() => [] as string[])).join(' / '), toasts.join(' / ')].filter(Boolean).join(' / ');
  };
  try {
    await qa.step(1, async () => {
      const shown = await shares('30', '60');
      if (!shown.includes('Patient share and sponsor share must add up to 100.')) qa.deviation(1, 'Red message: "Patient share and sponsor share must add up to 100."', `"${shown || 'nothing'}"`);
    });
    await qa.step(2, async () => {
      qa.note(2, `30 / 70: "${(await shares('30', '70')) || 'no message'}"`);
      await c.charge.fill('150000');
      await c.button('Create charge').click();
      await expect(c.bar).toContainText(/Draft\s*INV-/);
      const text = norm(await panel.innerText());
      if (!/Rp 45\.000 \/ Rp 105\.000/.test(text)) qa.deviation(2, 'Saved. The split line appears for the current charge', `no split line 30 / 70 (panel: "${text.slice(-160)}")`);
    });
    await qa.step(3, async () => {
      await asUser(browser, 'U6', async (u6) => {
        const b = new CashierPage(u6);
        await sale(u6, '150000');
        await b.button('Insurance / BPJS').click();
        const record = u6.getByRole('region', { name: 'Insurance / BPJS' }).getByRole('button', { name: 'Record sponsor' });
        const disabled = (await record.count()) ? await record.isDisabled() : true;
        qa.note(3, `BR-B: "Record sponsor" is ${(await record.count()) ? (disabled ? 'disabled' : 'enabled') : 'not shown'} for a walk-in sale (an eligible patient needs a plan of BR-B; none is made)`);
      });
    });
  } finally {
    await shares('20', '80');
  }
});

qaTest('TC-APP014-047', async ({ page, qa, browser }) => {
  // Precondition (made by U1): a Draft sale.
  const invoice = await sale(page, '150000');
  const staff = await userPage(browser, 'U3');
  const c = new CashierPage(staff);
  const click = async (step: number, what: string, button: string) => {
    const toasts = await toastsOf(staff, () => c.button(button).click());
    const red = (await c.error().allInnerTexts().catch(() => [] as string[])).join(' / ');
    qa.note(step, `${what}: "${[red, ...toasts].filter(Boolean).join(' / ') || 'no message'}"`);
  };
  try {
    await qa.step(1, async () => {
      await c.open();
      await c.charge.fill('150000');
      await c.remark.fill('QA tanpa hak');
      await click(1, 'Create charge', 'Create charge');
      await expect(c.bar).not.toContainText(/Draft\s*(INV|RX)-/);
    });
    await qa.step(2, async () => {
      await select(staff, invoice);
      await click(2, 'Pay', 'Pay');
      const mine = await select(page, invoice);
      expect((await mine.barState()).status).toBe('Draft');
    });
    await qa.step(3, async () => {
      await c.open();
      await click(3, 'Save settings', 'Save settings');
      await c.open();
      if (await c.button('Close my day').count()) await click(3, 'Close my day', 'Close my day');
      else qa.note(3, '"Close my day" is not shown to U3');
      expect(await counterClosed(page)).toBe(false);
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP014-048', async ({ page, qa, browser }) => {
  const invoice = await sale(page, '150000');
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Hospital Accounts\b/));
    await qa.step(2, () =>
      routesRefused(staff, qa, 2, ['/billing/cashier'], async () => {
        const c = new CashierPage(staff);
        await c.search.fill(invoice);
        await c.button('Search').click();
        const found = await expect(c.bar).toContainText(invoice, { timeout: 8_000 }).then(() => true, () => false);
        return found ? `the invoice ${invoice} is found with its amounts` : `the invoice ${invoice} is not found`;
      }),
    );
  });
});

qaTest('TC-APP014-049', async ({ page, qa, browser }) => {
  // A Draft sale of BR-B (made by U6) and the values U6 sees.
  const { invoice, valuesB } = await asUser(browser, 'U6', async (u6) => ({ invoice: await sale(u6, '150000'), valuesB: await counterSettings(u6) }));
  const c = new CashierPage(page);

  await qa.step(1, async () => {
    await c.open();
    await c.search.fill(invoice);
    await c.button('Search').click();
    await expect(page.getByText('No invoices match.')).toBeVisible();
    await expect(c.bar).not.toContainText(invoice);
  });

  await qa.step(2, async () => {
    const mine = await counterSettings(page);
    for (const [label, value] of Object.entries(BILLING.counter)) expect(mine[label], label).toBe(value);
    const cash = norm(await c.value('System cash').innerText().catch(() => ''));
    qa.note(2, `BR-A: ${Object.entries(mine).map(([k, v]) => `${k} ${v}`).join(', ')}; System cash ${cash}. BR-B: ${Object.entries(valuesB).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});

qaTest('TC-APP014-072', async ({ page, qa, browser }) => {
  const pt = await patientWithId(page, qa);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/billing', ['Tariff group', 'Patient plan', 'Patient ledger'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      const code = qa.code('X-UMUM');
      const toasts = await tariffs(staff).save({ 'Group / plan code': code, 'Name / destination': qa.name('X Umum') }, 'Tariff group');
      expect(toasts).not.toContain('Saved.');
      qa.note(2, `Tariff group: "${toasts.join(' / ') || 'no toast'}"`);
    });
    await qa.step(3, async () => {
      const toasts = await plans(staff).save({ 'Patient / source': pt.id }, 'Check eligibility');
      expect(toasts).not.toContain('Saved.');
      qa.note(3, `Check eligibility: "${toasts.join(' / ') || 'no toast'}"`);
    });
    qa.notRun(4, '"Move deposit" needs a chosen invoice on Patient ledger (found blocker 36)');
  } finally {
    await staff.context().close();
  }
});

