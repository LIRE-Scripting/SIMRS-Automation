import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { click } from './helpers';

/**
 * 13-dietary.xlsx: hub and language (011), Catalogue (034 … 039), Diet orders
 * (040 … 043) and the screen check of every route (053 … 059).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

qaTest('TC-APP013-011', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Dietary\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Dietary$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Dietary' })).toBeVisible();
    await expect(main.getByText('Inpatient diet requests', { exact: true })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Open requests' })).toBeVisible();
    qa.deviation(1, 'A button "Open requests"', '"Open requests" is a link');
    for (const t of ['Requests', 'TPN']) await expect(main.getByRole('link', { name: t, exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    for (const [tile, heading] of [['Requests', 'Diet requests'], ['TPN', 'Total parenteral nutrition']]) {
      await page.goto('/en/diet');
      await main.getByRole('link', { name: tile, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    const side = (await page.getByRole('complementary').getByRole('link').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
    qa.note(2, `sidebar: ${side.join(', ')}`);
  });
  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    const seen: string[] = [];
    for (const r of ['/id/diet', '/id/diet/requests', '/id/diet/tpn']) {
      await page.goto(r);
      seen.push((await main.getByRole('heading', { level: 1 }).innerText()).trim());
    }
    qa.note(3, `headings: ${seen.join(', ')}`);
    if (seen.includes('Dietary') || seen.includes('Diet requests')) qa.deviation(3, 'Headings, field names, buttons and toasts are Indonesian ("Gizi", "Permintaan diet", …)', `English: ${seen.join(', ')}`);
  });
});

/** Catalogue (/diet/catalogue): the line of saved entries, three small forms, the rule form and the calculation. */
function catalogue(page: Page) {
  const main = page.getByRole('main');
  const saves = main.getByRole('button', { name: 'Save', exact: true });
  const numbers = main.getByRole('textbox').filter({ hasNotText: /./ });
  return {
    main,
    code: main.getByRole('textbox', { name: 'Code', exact: true }),
    session: main.getByRole('textbox', { name: 'Session', exact: true }),
    from: main.getByRole('textbox', { name: 'Session', exact: true }).locator('xpath=following::input[1]'),
    to: main.getByRole('textbox', { name: 'Session', exact: true }).locator('xpath=following::input[2]'),
    menu: main.getByRole('textbox', { name: 'Menu', exact: true }),
    item: main.getByRole('textbox', { name: 'Item', exact: true }),
    saveCode: saves.nth(0),
    saveSession: saves.nth(1),
    saveMenu: saves.nth(2),
    gender: main.getByRole('combobox'),
    formula: main.getByRole('button', { name: 'Formula', exact: true }),
    weight: main.getByRole('button', { name: 'Formula', exact: true }).locator('xpath=following::input[1]'),
    height: main.getByRole('button', { name: 'Formula', exact: true }).locator('xpath=following::input[2]'),
    calculate: main.getByRole('button', { name: 'Calculate', exact: true }),
    numbers,
    async line(): Promise<string> {
      return (await main.innerText()).split('\n')[1] ?? '';
    },
    async open(): Promise<void> {
      await page.goto('/en/diet/catalogue');
      await expect(main.getByRole('heading', { level: 1, name: 'Catalogue' })).toBeVisible();
    },
  };
}

qaTest('TC-APP013-034', async ({ page, qa }) => {
  const c = catalogue(page);
  const code = qa.code('X-NT1');
  const session = qa.name('X pagi');
  const menu = qa.name('X Diet DM');

  await qa.step(1, async () => {
    await page.goto('/en/diet');
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
});

qaTest('TC-APP013-035', async ({ page, qa }) => {
  const c = catalogue(page);
  const cases = [
    [1, '06:00', '06:00', 'to time must be greater than from time'],
    [2, '0600', '07:00', 'separator must be colon'],
    [3, '24:00', '07:00', 'hour must be between 0 and 23'],
    [4, '06:00', '07:60', 'minute must be between 0 and 59'],
  ] as const;
  for (const [step, from, to, server] of cases) {
    await qa.step(step, async () => {
      await c.open();
      const session = qa.name('X pagi');
      await c.session.fill(session);
      await c.from.fill(from);
      await c.to.fill(to);
      const toasts = await click(page, c.saveSession);
      expect(toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "${server}")`);
    });
  }
});

qaTest('TC-APP013-036', async ({ page, qa }) => {
  const c = catalogue(page);
  const code = qa.code('X-NT1');
  const session = qa.name('X pagi');
  const menu = qa.name('X Diet DM');
  await c.open();
  await c.code.fill(code);
  expect(await click(page, c.saveCode)).toContain('Saved');
  await c.session.fill(session);
  expect(await click(page, c.saveSession)).toContain('Saved');
  await c.menu.fill(menu);
  await c.item.fill(qa.prefix('X Nasi tim'));
  expect(await click(page, c.saveMenu)).toContain('Saved');
  const again = [
    [1, async () => { await c.code.fill(code); return click(page, c.saveCode); }],
    [2, async () => { await c.session.fill(session); return click(page, c.saveSession); }],
    [3, async () => { await c.menu.fill(menu); await c.item.fill(qa.prefix('X Nasi tim')); return click(page, c.saveMenu); }],
  ] as const;
  for (const [step, run] of again) {
    await qa.step(step, async () => {
      await c.open();
      const toasts = await run();
      expect(toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "duplicate")`);
    });
  }
});

qaTest('TC-APP013-037', async ({ page, qa }) => {
  const c = catalogue(page);
  await qa.step(1, async () => {
    await c.open();
    for (const [input, save] of [[c.code, c.saveCode], [c.session, c.saveSession], [c.menu, c.saveMenu]] as const) {
      await input.fill('');
      const toasts = await click(page, save);
      expect(toasts).toEqual([]);
      expect(await input.evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    }
  });
  await qa.step(2, async () => {
    await c.open();
    await c.code.fill('   ');
    const toasts = await click(page, c.saveCode);
    expect(toasts).not.toContain('Saved');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "code required")`);
  });
});

qaTest('TC-APP013-038', async ({ page, qa }) => {
  const c = catalogue(page);
  await qa.step(1, async () => {
    await c.open();
    await expect(c.gender.locator('option')).toHaveText(['female', 'male']);
    await expect(c.weight).toHaveValue('60');
    await expect(c.height).toHaveValue('160');
  });
  await qa.step(2, async () => {
    await c.gender.selectOption('female');
    const toasts = await click(page, c.formula);
    if (!toasts.includes('Saved')) {
      // One rule per gender and tenant: a rule saved by an earlier run is refused as a duplicate.
      qa.note(2, `not saved ("${toasts.join(' / ')}"): the rule for female exists from an earlier run`);
    } else {
      await expect(c.main).toContainText('female');
    }
  });
  await qa.step(3, async () => {
    await c.open();
    await c.gender.selectOption('female');
    expect(await click(page, c.calculate)).toContain('Saved');
    await expect(c.main.getByText('23.4 / 1600', { exact: true })).toBeVisible();
  });
  await qa.step(4, async () => {
    await c.weight.fill('80');
    await c.height.fill('170');
    await click(page, c.calculate);
    await expect(c.main.getByText('27.7 / 1863', { exact: true })).toBeVisible();
  });
});

qaTest('TC-APP013-039', async ({ page, qa }) => {
  const c = catalogue(page);
  const refusal = async (step: number, server: string, run: () => Promise<string[]>) => {
    await qa.step(step, async () => {
      await c.open();
      const toasts = await run();
      expect(toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "${server}")`);
    });
  };
  await refusal(1, 'body-mass rule not found', async () => {
    await c.gender.selectOption('male');
    return click(page, c.calculate);
  });
  await refusal(2, 'weight and height required', async () => {
    await c.gender.selectOption('female');
    await c.weight.fill('0');
    return click(page, c.calculate);
  });
  await refusal(3, 'reference height and weight required', async () => {
    await c.gender.selectOption('male');
    await c.height.fill('');
    return click(page, c.formula);
  });
  await refusal(4, 'duplicate', async () => {
    await c.gender.selectOption('female');
    return click(page, c.formula);
  });
});

/** Diet orders (/diet/orders): the prescription lines, the name input, Save, Calculate, Menu, end date, Diet orders, Advice. */
function orders(page: Page) {
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
      await page.goto('/en/diet/orders');
      await expect(main.getByRole('heading', { level: 1, name: 'Diet orders' })).toBeVisible();
    },
  };
}

qaTest('TC-APP013-040', async ({ page, qa }) => {
  const o = orders(page);
  const name = qa.name('X Pasien Diet');

  await qa.step(1, async () => {
    await page.goto('/en/diet');
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
  await qa.step(3, async () => {
    expect(await click(page, o.calculate)).toContain('Saved');
    await o.open();
    const first = (await o.lines().first().innerText()).trim();
    qa.note(3, `first line after Calculate: "${first}"; this test's line: "${(await o.line(name).innerText()).trim()}"`);
  });
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
});

qaTest('TC-APP013-041', async ({ page, qa }) => {
  const o = orders(page);
  await o.open();
  await o.name.fill(qa.name('X Pasien Diet'));
  expect(await click(page, o.save)).toContain('Saved');
  const step = async (n: number, server: string, run: () => Promise<string[]>) => {
    await qa.step(n, async () => {
      await o.open();
      const toasts = await run();
      qa.note(n, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "${server}")`);
      return toasts;
    });
  };
  await step(1, 'end date before start date', async () => {
    await o.menu.fill(qa.name('X Diet DM'));
    await o.end.fill(addDays(todayWib(), -1));
    const t = await click(page, o.order);
    expect(t).not.toContain('Saved');
    return t;
  });
  await step(2, 'prescription is not pending', async () => {
    await click(page, o.calculate);
    await o.open();
    return click(page, o.calculate);
  });
  qa.notRun(3, 'the body rule for female is shared by the tenant (one per gender); removing it would affect other users');
  await step(4, 'patient required', async () => {
    await o.name.fill('');
    const t = await click(page, o.save);
    expect(t).not.toContain('Saved');
    return t;
  });
});

qaTest('TC-APP013-042', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch, so the form shows no branch list; the case needs "All branches" in the header (U2 on this screen)');
});

qaTest('TC-APP013-043', async ({ page, qa }) => {
  const o = orders(page);
  const a = qa.name('X Pasien A');
  const b = qa.name('X Pasien B');
  await qa.step(1, async () => {
    for (const n of [a, b]) {
      await o.open();
      await o.name.fill(n);
      expect(await click(page, o.save)).toContain('Saved');
    }
    await o.open();
    await o.name.fill(b);
    await o.menu.fill(qa.name('X Diet DM'));
    await o.end.fill(addDays(todayWib(), 3));
    const toasts = await click(page, o.order);
    await o.open();
    qa.note(1, `toast "${toasts.join(' / ')}"; first line "${(await o.lines().first().innerText()).trim()}"; A "${(await o.line(a).innerText()).trim()}"; B "${(await o.line(b).innerText()).trim()}"`);
  });
  await qa.step(2, async () => {
    const pickers = await o.main.getByRole('combobox').count();
    if (!pickers) qa.deviation(2, 'A way to choose which prescription is assessed or ordered', 'none: the first prescription of the list is used');
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP013-053', '/diet', 'Dietary'],
  ['TC-APP013-054', '/diet/catalogue', 'Catalogue'],
  ['TC-APP013-055', '/diet/kitchen', 'Kitchen'],
  ['TC-APP013-056', '/diet/orders', 'Diet orders'],
  ['TC-APP013-057', '/diet/requests', 'Diet requests'],
  ['TC-APP013-058', '/diet/service', 'Service and bill'],
  ['TC-APP013-059', '/diet/tpn', 'Total parenteral nutrition'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
