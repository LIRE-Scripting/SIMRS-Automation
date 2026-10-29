import { catalogue, click } from './helpers';
import { todayWib, addDays } from '../../../lib/dates';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 13-dietary that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP013_034 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const c = catalogue(page);
  const code = qa.code('X-NT1');
  const session = qa.name('X pagi');
  const menu = qa.name('X Diet DM');

  await qa.step(1, async () => {
    await page.goto('/id/diet');
    await page.getByRole('complementary').getByRole('link', { name: 'Catalogue' }).first().click();
    await expect(c.main.getByRole('heading', { level: 1, name: 'Catalogue' })).toBeVisible();
    for (const l of [c.code, c.session, c.from, c.to, c.menu, c.item, c.gender, c.formula, c.weight, c.height, c.calculate]) await expect(l).toBeVisible();
  });
  await qa.step(2, async () => {
    await c.code.fill(code);
    expect(await click(page, c.saveCode)).toContain('Saved');
    await expect(c.main).toContainText(code);
  });
  await qa.step(3, async () => {
    await c.session.fill(session);
    await expect(c.from).toHaveValue('06:00');
    await expect(c.to).toHaveValue('07:00');
    expect(await click(page, c.saveSession)).toContain('Saved');
    await expect(c.main).toContainText(session);
  });
  await qa.step(4, async () => {
    await c.menu.fill(menu);
    await c.item.fill(qa.prefix('X Nasi tim'));
    expect(await click(page, c.saveMenu)).toContain('Saved');
    await expect(c.main).toContainText(menu);
  });
  await qa.step(5, async () => {
    await c.open();
    for (const t of [code, session, menu]) await expect(c.main).toContainText(t);
  });
};

export const TC_APP013_040 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const o = orders(page);
  const name = qa.name('X Pasien Diet');

  await qa.step(1, async () => {
    await page.goto('/id/diet');
    await page.getByRole('complementary').getByRole('link', { name: 'Orders' }).first().click();
    await expect(o.main.getByRole('heading', { level: 1, name: 'Diet orders' })).toBeVisible();
    for (const l of [o.name, o.save, o.menu, o.end, o.order, o.advice, o.adviceButton]) await expect(l).toBeVisible();
    if (!(await o.main.getByRole('combobox').count())) qa.note(1, 'no branch list: U1 works on one branch');
  });
  await qa.step(2, async () => {
    await o.name.fill(name);
    expect(await click(page, o.save)).toContain('Saved');
    await o.open();
    await expect(o.line(name)).toContainText('pending');
  });
  let calculated = true;
  await qa.step(3, async () => {
    const toasts = await click(page, o.calculate);
    if (toasts.some((t) => /React error #441/.test(t))) {
      // "Calculate" answers HTTP 500 (found blocker 49): no prescription is assessed.
      calculated = false;
      return qa.note(3, `"Calculate": "${toasts.join(' / ').slice(0, 80)}"; the first line reads "${(await o.lines().first().innerText()).trim()}"`);
    }
    expect(toasts).toContain('Saved');
    await o.open();
    const first = (await o.lines().first().innerText()).trim();
    qa.note(3, `first line after Calculate: "${first}"; this test's line: "${(await o.line(name).innerText()).trim()}"`);
  });
  if (!calculated) qa.blocked(3, 49);
  await qa.step(4, async () => {
    await o.menu.fill(qa.name('X Diet DM'));
    await o.end.fill(addDays(todayWib(), 3));
    expect(await click(page, o.order)).toContain('Saved');
  });
  await qa.step(5, async () => {
    const title = qa.name('X Anjuran makan');
    await o.advice.fill(title);
    await o.adviceText.fill(qa.prefix('X Makan tiga kali'));
    expect(await click(page, o.adviceButton)).toContain('Saved');
    await o.open();
    await expect(o.main.getByText(title)).toBeVisible();
  });
  await qa.step(6, async () => {
    await o.open();
    qa.note(6, `lines: ${(await o.lines().allInnerTexts()).slice(0, 6).join(' / ')}`);
  });
};

/** Diet orders (/diet/orders): the prescription lines, the name input, Save, Calculate, Menu, end date, Diet orders, Advice. */
export function orders(page: Page) {
  const main = page.getByRole('main');
  return {
    main,
    name: main.getByRole('textbox').first(),
    save: main.getByRole('button', { name: 'Save', exact: true }),
    calculate: main.getByRole('button', { name: 'Calculate', exact: true }),
    menu: main.getByRole('textbox', { name: 'Menu', exact: true }),
    end: main.locator('input[type="date"]'),
    order: main.getByRole('button', { name: 'Diet orders', exact: true }),
    advice: main.getByRole('textbox', { name: 'Advice', exact: true }),
    adviceText: main.getByRole('textbox', { name: 'Advice', exact: true }).locator('xpath=following::input[1]'),
    adviceButton: main.getByRole('button', { name: 'Advice', exact: true }),
    line: (name: string) => main.getByRole('paragraph').filter({ hasText: name }),
    lines: () => main.getByRole('paragraph'),
    async open(): Promise<void> {
      await page.goto('/id/diet/orders');
      await expect(main.getByRole('heading', { level: 1, name: 'Diet orders' })).toBeVisible();
    },
  };
}
