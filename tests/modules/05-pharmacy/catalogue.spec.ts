import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { toastsOf } from '../shared/access';
import { addDays, todayWib } from '../../../lib/dates';
import { CONFIRMED, ownItem, patient, sell, stock } from './helpers';

/**
 * 05-pharmacy.xlsx, features "Drug catalogue (/pharmacy/catalogue)" and
 * "Alerts and vaccines (/pharmacy/alerts)". Read from the live screens on
 * 2026-10-22: each screen has two forms with unlabelled "Save" buttons
 * (the first saves a generic or an alert rule, the second a frequency or a
 * vaccine type) above a line that lists the entries ("A · B · C").
 * Entries cannot be deleted, so every saved value carries the test token.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const GENERIC = { name: 'X Parasetamol', strength: '500 mg', route: 'oral', form: 'tablet' };
const FREQUENCY = { code: 'X-TID', value: '3', times: '08:00,14:00,20:00' };
const ALERT = { level: 'hard', type: 'allergy', item: 'X Amoksisilin' };
const VACCINE = { code: 'X-VAC1', name: 'X Vaksin uji' };
const SAVED = /^Saved\.?$/;

class TwoForms {
  readonly main: Locator;
  constructor(
    readonly page: Page,
    readonly route: string,
    readonly title: string,
  ) {
    this.main = page.getByRole('main');
  }

  async open(): Promise<void> {
    await this.page.goto(`/id${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.title })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  input(name: string, nth = 0): Locator {
    return this.main.getByRole('textbox', { name, exact: true }).or(this.main.getByRole('spinbutton', { name, exact: true })).nth(nth);
  }

  save(form: 0 | 1): Locator {
    return this.main.getByRole('button', { name: 'Save', exact: true }).nth(form);
  }

  /** The text of the entries' block (all of main without the forms). */
  async entries(): Promise<string> {
    return (await this.main.innerText()).replace(/\s+/g, ' ');
  }
}

/** Opens the screen from the Pharmacy hub; a deviation when the hub has no link to it. */
async function fromHub(page: Page, qa: Qa, s: TwoForms, link: string): Promise<void> {
  await page.goto('/id/apps');
  await page.getByRole('main').getByRole('link', { name: /^Pharmacy\b/ }).first().click();
  const tile = page.getByRole('main').getByRole('link', { name: link, exact: true });
  if (await tile.count()) {
    await tile.first().click();
  } else {
    const tiles = (await page.getByRole('main').getByRole('link').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    qa.deviation(1, `Pharmacy has "${link}"`, `the Pharmacy hub has no "${link}" (links: ${tiles.join(', ')}); ${s.route} opened by its address`);
    await s.open();
  }
  await expect(s.main.getByRole('heading', { level: 1, name: s.title })).toBeVisible();
}

/** A refusal: no "Saved" toast and nothing new in the block; the text shown is noted (the workbook has TBD). */
async function expectNothingAdded(qa: Qa, step: number, s: TwoForms, what: string, click: () => Promise<unknown>, marker: string): Promise<void> {
  const toasts = await toastsOf(s.page, click);
  expect(toasts.filter((t) => SAVED.test(t)), `${what} is saved`).toEqual([]);
  qa.note(step, `${what}: "${toasts.join(' / ') || 'no toast'}"`);
  await s.open();
  expect(await s.entries()).not.toContain(marker);
}

// ------------------------------------------------------------- catalogue

qaTest('TC-APP005-051', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/catalogue', 'Drug catalogue');
  const name = qa.name(GENERIC.name);
  const code = qa.code(FREQUENCY.code);

  await qa.step(1, async () => {
    await fromHub(page, qa, s, 'Catalogue');
    for (const f of ['Name', 'Strength', 'Route', 'Form', 'Code', 'Times']) await expect(s.input(f)).toBeVisible();
    await expect(s.input('Value')).toHaveValue('3');
    await expect(s.save(0)).toBeVisible();
    await expect(s.save(1)).toBeVisible();
  });

  await qa.step(2, async () => {
    await s.input('Name').fill(name);
    await s.input('Strength').fill(GENERIC.strength);
    await s.input('Route').fill(GENERIC.route);
    await s.input('Form').fill(GENERIC.form);
    expect(await toastsOf(page, () => s.save(0).click())).toEqual(expect.arrayContaining([expect.stringMatching(SAVED)]));
    await s.open();
    expect(await s.entries()).toContain(name);
  });

  await qa.step(3, async () => {
    await s.input('Code').fill(code);
    await s.input('Value').fill(FREQUENCY.value);
    await s.input('Times').fill(FREQUENCY.times);
    expect(await toastsOf(page, () => s.save(1).click())).toEqual(expect.arrayContaining([expect.stringMatching(SAVED)]));
    await s.open();
    expect(await s.entries()).toContain(`${code} ${FREQUENCY.value}`);
  });
});

qaTest('TC-APP005-052', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/catalogue', 'Drug catalogue');
  const name = qa.name(GENERIC.name);
  await s.open();

  await qa.step(1, async () => {
    await s.input('Name').fill(name);
    await s.input('Route').fill(GENERIC.route);
    await s.input('Form').fill(GENERIC.form);
    await expectNothingAdded(qa, 1, s, 'Save without "Strength"', () => s.save(0).click(), name);
  });
});

qaTest('TC-APP005-053', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/catalogue', 'Drug catalogue');
  const code = qa.code(FREQUENCY.code);
  await s.open();

  await qa.step(1, async () => {
    await s.input('Value').fill(FREQUENCY.value);
    await s.input('Times').fill(FREQUENCY.times);
    const before = await s.entries();
    const toasts = await toastsOf(page, () => s.save(1).click());
    expect(toasts.filter((t) => SAVED.test(t)), 'a frequency without a code is saved').toEqual([]);
    qa.note(1, `Save with "Code" empty: "${toasts.join(' / ') || 'no toast'}"`);
    await s.open();
    expect((await s.entries()).length).toBe(before.length);
  });

  await qa.step(2, async () => {
    await s.input('Code').fill(code);
    await s.input('Value').fill('0');
    await s.input('Times').fill(FREQUENCY.times);
    await expectNothingAdded(qa, 2, s, 'Save with value 0', () => s.save(1).click(), code);
  });
});

// ---------------------------------------------------------------- alerts

qaTest('TC-APP005-054', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/alerts', 'Alerts and vaccines');
  const item = qa.name(ALERT.item);
  const code = qa.code(VACCINE.code);

  await qa.step(1, async () => {
    await fromHub(page, qa, s, 'Alerts');
    await expect(s.main.getByText('The vaccine code stays on the order.')).toBeVisible();
    await expect(s.input('Level')).toHaveValue(ALERT.level);
    await expect(s.input('Type')).toHaveValue(ALERT.type);
    for (const f of ['Item', 'Code', 'Name']) await expect(s.input(f)).toBeVisible();
    await expect(s.save(1)).toBeVisible();
  });

  await qa.step(2, async () => {
    await s.input('Item').fill(item);
    expect(await toastsOf(page, () => s.save(0).click())).toEqual(expect.arrayContaining([expect.stringMatching(SAVED)]));
    await s.open();
    expect(await s.entries()).toContain(item);
  });

  await qa.step(3, async () => {
    await s.input('Code').fill(code);
    await s.input('Name').fill(qa.name(VACCINE.name));
    expect(await toastsOf(page, () => s.save(1).click())).toEqual(expect.arrayContaining([expect.stringMatching(SAVED)]));
    await s.open();
    expect(await s.entries()).toContain(code);
  });

  await qa.step(4, async () => {
    // The rule names an item by free text; an item of this test whose name starts with that text is sold.
    await stock(page, qa);
    const pt1 = await patient(page, qa);
    const it = await ownItem(page, qa, 'QA-AMOX', item, [{ quantity: '10', expiry: addDays(todayWib(), 300) }]);
    const toasts = await sell(page, pt1, [{ item: it, requested: '1', issued: '1' }]);
    qa.note(4, `selling "${it.name}" after the rule on "${item}": ${toasts.join(' / ') || 'no toast'} (TBD in the workbook: whether the rule warns or stops)`);
    expect(toasts.length).toBeGreaterThan(0);
    if (toasts.includes(CONFIRMED)) qa.note(4, 'the sale is confirmed: the rule neither warned nor stopped the wizard');
  });
});

qaTest('TC-APP005-055', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/alerts', 'Alerts and vaccines');
  await s.open();

  await qa.step(1, async () => {
    await expect(s.input('Item')).toHaveValue('');
    const before = await s.entries();
    const toasts = await toastsOf(page, () => s.save(0).click());
    expect(toasts.filter((t) => SAVED.test(t)), 'an alert rule without an item is saved').toEqual([]);
    qa.note(1, `Save with "Item" empty: "${toasts.join(' / ') || 'no toast'}"`);
    await s.open();
    expect((await s.entries()).length).toBe(before.length);
  });
});

qaTest('TC-APP005-056', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/alerts', 'Alerts and vaccines');
  const code = qa.code(VACCINE.code);
  await s.open();

  await qa.step(1, async () => {
    await s.input('Code').fill(code);
    await expectNothingAdded(qa, 1, s, 'Save with a code only', () => s.save(1).click(), code);
  });
});

qaTest('TC-APP005-057', async ({ page, qa }) => {
  const s = new TwoForms(page, '/pharmacy/alerts', 'Alerts and vaccines');
  const item = qa.name(ALERT.item);
  await s.open();

  await qa.step(1, async () => {
    await s.input('Level').fill('banana');
    await s.input('Item').fill(item);
    const toasts = await toastsOf(page, () => s.save(0).click());
    await s.open();
    const saved = (await s.entries()).includes(item);
    qa.note(1, `level "banana": "${toasts.join(' / ') || 'no toast'}"; the rule is ${saved ? 'saved' : 'not saved'} (TBD in the workbook: no requirement; as coded it is saved)`);
  });
});
