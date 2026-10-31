import { everyPage } from '../../../pages/paging';
import { todayWib } from '../../../lib/dates';
import { payrollEmployee, RAN, Batches } from './helpers';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 17-payroll that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP017_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const b = new Batches(page);
  const e = await payrollEmployee(page, qa);
  let head = '';
  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Payroll\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Batches' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Payroll batches' })).toBeVisible();
    await expect(page.getByText('Back-office payroll batch register — run applies salary-component agents.', { exact: true })).toBeVisible();
    await expect(b.employee).toBeVisible();
    await expect(b.period).toHaveValue(todayWib().slice(0, 7));
    await expect(b.currency).toHaveValue('IDR');
    await expect(b.base).toHaveValue(BASE);
    await expect(b.run).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Branch' })).toHaveCount(0);
  });
  await qa.step(2, async () => {
    await b.pick(e.no);
    await expect(b.employee).toHaveValue(`${e.no} ${e.name}`);
  });
  await qa.step(3, async () => {
    await b.period.fill('2027-03');
    const toasts = await b.submit();
    qa.note(3, `toasts "${toasts.join(' / ')}"`);
    if (!toasts.includes(RAN)) qa.deviation(3, 'Toast "Payroll batch run"', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast; "Batch result" opens');
  });
  await qa.step(4, async () => {
    const r = await b.result();
    head = r.head;
    expect(r.head).toMatch(/^#\d+ · COMPLETED$/);
    expect(r.gross).toMatch(/^IDR [\d.]+,\d{2}$/);
    expect(r.net).toMatch(/^IDR [\d.]+,\d{2}$/);
    expect(r.lines.length).toBeGreaterThan(0);
    qa.note(4, `${r.head}; Gross ${r.gross}; Net ${r.net}; lines ${r.lines.join('; ')}`);
  });
  await qa.step(5, async () => {
    await b.close();
    // The batch of this run is on the last page (the list is kept lowest number first): find it by its number.
    const number = head.match(/^#(\d+)/)![1];
    let c: string[] | undefined;
    await expect.poll(async () => {
      const listed = await everyPage(page.getByRole('main'), () =>
        b.rows().evaluateAll((rs) => rs.map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? ''))),
      );
      c = listed.find((x) => x[0] === number);
      return c !== undefined;
    }, { timeout: 10_000 }).toBe(true);
    expect(c, `batch #${number} is listed`).toBeDefined();
    expect(c![0]).toBe(number);
    expect(c![1]).toBe('COMPLETED');
    expect(c![2]).toBe('0');
    expect(c![3]).toMatch(/^[0-9a-f]{8}$/);
  });
};

export const BASE = '10000000';
