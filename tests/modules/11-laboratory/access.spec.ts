import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { LAB } from '../../../lib/lab-data';
import { WorklistPage, type LabStep } from '../../../pages/lab/LabPages';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';
import { labType, order } from './helpers';

/**
 * 11-laboratory.xlsx, the access test cases of the Lab order worklist: U2 on
 * "All branches", U3 without any right, and U1 next to a branch of U6
 * (Kemayoran). Each order carries the workbook result type plus a token.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Rows of an order (by its result type) found by the worklist search of a user. */
async function found(page: Page, type: string): Promise<number> {
  const w = new WorklistPage(page);
  await w.open();
  await w.search.fill(type);
  await w.main.getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  return w.rows().filter({ has: page.getByRole('cell', { name: type, exact: true }) }).count();
}

qaTest('TC-APP011-008', async ({ page, qa, browser }) => {
  const w = new WorklistPage(page);
  const type = labType(qa, 'QA Pusat');
  const d = page.getByRole('dialog', { name: 'Create lab order' });
  const branch = d.getByRole('combobox', { name: 'Branch' });
  const create = d.getByRole('button', { name: /^(Create|Saving…)$/ });

  await qa.step(1, async () => {
    await w.open();
    await expect(w.rows().first()).toBeVisible();
    const headers = (await w.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await w.main.getByRole('button', { name: 'New lab order' }).click();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Result type' }).fill(type);
    await d.getByRole('textbox', { name: 'Remarks' }).fill(LAB.remark);
    const toasts = await toastsOf(page, () => create.click());
    expect(toasts).not.toContain('Lab order created');
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await toastsOf(page, () => create.click())).toContain('Lab order created');
  });

  await qa.step(5, async () => {
    expect(await asUser(browser, 'U6', (u6) => found(u6, type))).toBe(1);
    expect(await asUser(browser, 'U1', (u1) => found(u1, type))).toBe(0);
  });
});

qaTest('TC-APP011-024', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): orders at Ordered, Generated, Sent and Accepted.
  const at: Record<string, string> = {};
  const chain: LabStep[] = ['Generated', 'Sent', 'Accepted'];
  for (const [i, s] of (['Ordered', ...chain] as const).entries()) at[s] = await order(page, qa, chain.slice(0, i));
  const status = async (type: string) => (await new WorklistPage(page).cells(await new WorklistPage(page).row(type)))[2];
  const before: Record<string, string> = {};
  for (const [k, t] of Object.entries(at)) before[k] = await status(t);

  const staff = await userPage(browser, 'U3');
  const w = new WorklistPage(staff);
  try {
    await qa.step(1, async () => {
      const other = labType(qa);
      await w.open();
      await w.main.getByRole('button', { name: 'New lab order' }).click();
      const d = staff.getByRole('dialog', { name: 'Create lab order' });
      await d.getByRole('textbox', { name: 'Result type' }).fill(other);
      const toasts = await tryRefused(qa, 1, staff, 'Create', /^Lab order created$/, () => d.getByRole('button', { name: /^(Create|Saving…)$/ }).click());
      if (!toasts.includes('Failed to create lab order')) qa.deviation(1, 'Toast "Failed to create lab order"', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
      expect(await found(page, other)).toBe(0);
    });

    await qa.step(2, async () => {
      for (const [from, next] of [['Ordered', 'Generated'], ['Generated', 'Sent'], ['Sent', 'Accepted']] as const) {
        const row = await w.row(at[from]);
        await tryRefused(qa, 2, staff, next, new RegExp(`^Advanced to ${next}$`), () => row.getByRole('button', { name: next, exact: true }).press('Enter'));
        expect(await status(at[from])).toBe(before[from]);
      }
    });

    await qa.step(3, async () => {
      const row = await w.row(at.Accepted);
      await w.press(row, 'Capture result', w.capture);
      await w.field('Lab result').fill(LAB.result);
      await w.field('Result range').fill(LAB.range);
      await tryRefused(qa, 3, staff, 'Save result', /^Result captured$/, () => w.capture.getByRole('button', { name: /^(Save result|Saving…)$/ }).click());
      const box = await w.capture.getByRole('alert').or(w.capture.locator('.text-destructive, [data-variant="destructive"]')).first().innerText().catch(() => '');
      qa.note(3, box ? `the dialog shows "${box.trim()}"` : 'the dialog shows no red box');
      expect(await status(at.Accepted)).toBe(before.Accepted);
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP011-025', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Laboratory\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/laboratory/orders']));
  });
});

qaTest('TC-APP011-026', async ({ page, qa, browser }) => {
  // Precondition: OR-B, an order of BR-B with a sample ID (made by U6 and taken to Generated).
  const orB = await asUser(browser, 'U6', async (u6) => {
    const type = await order(u6, qa, ['Generated']);
    return { type, ...(await new WorklistPage(u6).orderOf(type)) };
  });
  expect(orB.sampleId, 'the sample ID of OR-B').toMatch(/\S/);
  const w = new WorklistPage(page);

  await qa.step(1, async () => {
    expect(await found(page, orB.sampleId)).toBe(0);
    await expect(w.rows().filter({ hasText: orB.type })).toHaveCount(0);
  });

  await qa.step(2, async () => {
    await w.open();
    await w.scan.fill(orB.sampleId);
    await w.scan.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(w.main).not.toContainText(orB.type);
    const empty = await w.main.getByText('No lab orders yet.').count();
    if (!empty) qa.note(2, 'the scan shows no "No lab orders yet." text, and no row of OR-B');
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});
