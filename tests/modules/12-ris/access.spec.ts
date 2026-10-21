import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { RIS } from '../../../lib/ris-data';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';
import { RadOrdersPage } from './helpers';

/**
 * 12-ris.xlsx, the access test cases of Orders: U2 on "All branches", U3
 * without any right, and U1 next to a branch of U6 (Kemayoran). Each order
 * carries the workbook study text plus a token; the list has no search, so
 * an order is found by paging through it.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const study = (t: string) => `${RIS.full.study} ${t}`;

async function listed(page: Page, text: string): Promise<number> {
  return (await new RadOrdersPage(page).row(text)).count();
}

qaTest('TC-APP012-004', async ({ page, qa, browser }) => {
  const o = new RadOrdersPage(page);
  const s = study(qa.token());
  const branch = o.dialog.getByRole('combobox', { name: 'Branch' });
  const save = o.dialog.getByRole('button', { name: /^(Save|Saving…)$/ });

  await qa.step(1, async () => {
    await o.open();
    await expect(o.rows().first()).toBeVisible();
    const headers = (await o.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await o.openNew();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await o.fill({ 'Study description': s });
    const toasts = await toastsOf(page, () => save.click());
    expect(toasts).not.toContain('Order created');
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await toastsOf(page, () => save.click())).toContain('Order created');
  });

  await qa.step(5, async () => {
    expect(await asUser(browser, 'U6', (u6) => listed(u6, s))).toBe(1);
    expect(await asUser(browser, 'U1', (u1) => listed(u1, s))).toBe(0);
  });
});

qaTest('TC-APP012-018', async ({ page, qa, browser }) => {
  const s = study(qa.token());
  const staff = await userPage(browser, 'U3');
  const o = new RadOrdersPage(staff);
  try {
    await qa.step(1, async () => {
      await o.open();
      const button = o.main.getByRole('button', { name: 'New order' });
      if (await button.count()) qa.deviation(1, 'The button "New order" is not offered, or the page is refused', '"New order" is shown to U3 (no right)');
    });

    await qa.step(2, async () => {
      await o.openNew();
      await o.fill({ 'Study description': s });
      await tryRefused(qa, 2, staff, 'Save', /^Order created$/, () => o.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click());
      expect(await listed(page, s)).toBe(0);
    });
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP012-019', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^RIS\b/));
    await qa.step(2, () =>
      routesRefused(staff, qa, 2, ['/radiology/orders'], async () => {
        const report = new RadOrdersPage(staff).rows().getByRole('link', { name: 'Report' }).first();
        if (!(await report.count())) return 'no row has a "Report" link';
        return `"Report" of a row leads to ${await report.getAttribute('href')}`;
      }),
    );
  });
});

qaTest('TC-APP012-020', async ({ page, qa, browser }) => {
  // Precondition: OR-B, an order of BR-B made by U6.
  const s = study(qa.token());
  await asUser(browser, 'U6', async (u6) => {
    expect(await new RadOrdersPage(u6).create({ 'Study description': s })).toContain('Order created');
  });

  await qa.step(1, async () => {
    expect(await listed(page, s)).toBe(0);
  });

  await qa.step(2, () => headerOneBranch(page, qa, 2));
});
