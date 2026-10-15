import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';

/**
 * 15-emergency.xlsx, Triage Category (/emergency/triage-categories). Active
 * descriptions and active colours are unique, so each test uses its own
 * description and a colour made from its token; categories of a test are
 * deactivated or deleted at its end.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** A colour of this test: "#" and six hex digits taken from the token. */
function colourOf(qa: Qa): string {
  const t = qa.token().toLowerCase();
  let hex = '';
  for (const ch of t) hex += ch.charCodeAt(0).toString(16).slice(-1);
  return `#${(hex + '000000').slice(-6)}`;
}

class Categories {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto('/en/emergency/triage-categories');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Triage Category' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  row(description: string): Locator {
    return this.main.getByRole('table').getByRole('row').filter({ has: this.page.getByRole('cell', { name: description, exact: true }) });
  }
  async cells(description: string): Promise<string[]> {
    await this.main.getByRole('searchbox', { name: 'Search' }).fill(description);
    return (await this.row(description).getByRole('cell').allInnerTexts()).map((t) => t.trim());
  }
  async fill(v: { description?: string; colour?: string; minutes?: string; active?: boolean }): Promise<void> {
    if (v.description !== undefined) await this.dialog.getByRole('textbox', { name: 'Description' }).fill(v.description);
    if (v.colour !== undefined) await this.dialog.getByRole('textbox', { name: 'Colour' }).fill(v.colour);
    if (v.minutes !== undefined) await this.dialog.getByRole('spinbutton', { name: 'Time (minutes)' }).fill(v.minutes);
    if (v.active !== undefined) await this.dialog.getByRole('checkbox', { name: 'Active' }).setChecked(v.active);
  }
  async save(): Promise<string[]> {
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(this.page, mark);
  }
  async create(v: { description: string; colour: string; minutes: string; active?: boolean }): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'New', exact: true }).click();
    await this.fill(v);
    return this.save();
  }
  async modify(description: string): Promise<void> {
    await this.open();
    await this.main.getByRole('searchbox', { name: 'Search' }).fill(description);
    await this.row(description).getByRole('button', { name: 'Modify' }).click();
    await expect(this.dialog).toBeVisible();
  }
  /** Deactivates a category of a test (best effort, at the end of the test). */
  async deactivate(description: string): Promise<void> {
    await this.modify(description).catch(() => {});
    if (await this.dialog.isVisible()) {
      await this.fill({ active: false });
      await this.save();
    }
  }
}

const SAVED = 'Triage category saved.';
const TAKEN = 'An active category already uses that description or colour.';

qaTest('TC-APP015-024', async ({ page, qa }) => {
  const c = new Categories(page);
  const description = qa.name('X Merah');
  const colour = colourOf(qa);

  await qa.step(1, async () => {
    await page.goto('/en/emergency/patients');
    await page.getByRole('complementary').getByRole('link', { name: 'Triage Category' }).first().click();
    await expect(c.main.getByRole('heading', { level: 1, name: 'Triage Category' })).toBeVisible();
    await expect(c.main.getByText('Description, colour, and the minutes allowed before consultation is overdue.', { exact: true })).toBeVisible();
    await expect(c.main.getByRole('searchbox', { name: 'Search' })).toBeVisible();
    await expect(c.main.getByRole('columnheader')).toHaveText(['Description', 'Colour', 'Time (minutes)', 'Status', '']);
  });
  await qa.step(2, async () => {
    await c.main.getByRole('button', { name: 'New', exact: true }).click();
    for (const f of ['Description', 'Colour']) await expect(c.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(c.dialog.getByRole('spinbutton', { name: 'Time (minutes)' })).toBeVisible();
    await expect(c.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
    for (const b of ['Clear', 'Save']) await expect(c.dialog.getByRole('button', { name: b })).toBeVisible();
  });
  await qa.step(3, async () => {
    await c.fill({ description, colour, minutes: '5' });
    expect(await c.save()).toContain(SAVED);
    await c.open();
    const row = await c.cells(description);
    expect([row[0], row[2], row[3]]).toEqual([description, '5', 'Active']);
  });
  await qa.step(4, async () => {
    await c.modify(description);
    await c.fill({ minutes: '10' });
    expect(await c.save()).toContain(SAVED);
    await c.open();
    expect((await c.cells(description))[2]).toBe('10');
  });
  await qa.step(5, async () => {
    await c.modify(description);
    await c.fill({ active: false });
    expect(await c.save()).toContain(SAVED);
    await c.open();
    expect((await c.cells(description))[3]).toBe('Inactive');
    await page.goto('/en/emergency/patients');
    const row = page.getByRole('main').getByRole('row').filter({ has: page.getByRole('button', { name: 'Triage' }) }).first();
    if (await row.count()) {
      await row.getByRole('button', { name: 'Triage', exact: true }).click();
      const options = await page.getByRole('dialog').getByRole('combobox', { name: 'Triage category' }).locator('option').allInnerTexts();
      expect(options).not.toContain(description);
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
    } else qa.note(5, 'no open encounter on Emergency Patients to open the Triage dialog');
  });
  await qa.step(6, async () => {
    await c.modify(description);
    const mark = await toastMark(page);
    await c.dialog.getByRole('button', { name: 'Delete' }).click();
    expect(await toastsAfter(page, mark)).toContain('Triage category deleted.');
    await c.open();
    await c.main.getByRole('searchbox', { name: 'Search' }).fill(description);
    await expect(c.row(description)).toHaveCount(0);
  });
});

qaTest('TC-APP015-025', async ({ page, qa }) => {
  const c = new Categories(page);
  const description = qa.name('X Merah');
  const colour = colourOf(qa);
  expect(await c.create({ description, colour, minutes: '5' })).toContain(SAVED);
  try {
    await qa.step(1, async () => {
      expect(await c.create({ description, colour: colourOf(qa), minutes: '5' })).toContain(TAKEN);
    });
    await qa.step(2, async () => {
      expect(await c.create({ description: qa.name('X Merah'), colour, minutes: '5' })).toContain(TAKEN);
    });
    await qa.step(3, async () => {
      const toasts = await c.create({ description: qa.name('X Merah'), colour: colourOf(qa), minutes: '0' });
      const stopped = await c.dialog.getByRole('spinbutton', { name: 'Time (minutes)' }).evaluate((e) => !(e as HTMLInputElement).validity.valid).catch(() => false);
      expect(toasts).not.toContain(SAVED);
      qa.note(3, stopped ? 'the browser stops the click' : `toast "${toasts.join(' / ')}"`);
    });
    qa.notRun(4, 'needs a category on an open encounter; the encounter part is run in TC-APP015-037');
  } finally {
    await c.deactivate(description);
  }
});

qaTest('TC-APP015-026', async ({ page, qa }) => {
  const c = new Categories(page);
  const description = qa.name('X Merah');
  expect(await c.create({ description, colour: colourOf(qa), minutes: '5', active: false })).toContain(SAVED);
  await qa.step(1, async () => {
    await page.goto('/en/emergency/layout');
    const tile = page.getByRole('main').getByRole('listitem').getByRole('button').first();
    if (!(await tile.count())) {
      qa.note(1, 'no tile on Emergency Layout');
      return;
    }
    await tile.click();
    await page.getByRole('menuitem', { name: 'Triage' }).or(page.getByRole('button', { name: 'Triage', exact: true })).first().click();
    const options = await page.getByRole('dialog').getByRole('combobox', { name: 'Triage category' }).locator('option').allInnerTexts();
    qa.note(1, `the inactive category is ${options.includes(description) ? '' : 'not '}offered in the Triage dialog of the board`);
  });
});
