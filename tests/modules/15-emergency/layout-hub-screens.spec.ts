import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { asAllBranches } from '../shared/access';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';

/**
 * 15-emergency.xlsx: hub and language (007), Emergency Layout (053 … 055),
 * Emergency Layout Design (056, 057; the service centre IGD has no beds,
 * blocker 13) and the screen check of every route (060 … 066).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

qaTest('TC-APP015-007', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Emergency\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Emergency$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Emergency' })).toBeVisible();
    const sub = (await main.getByRole('paragraph').first().innerText()).trim();
    const tiles = (await main.getByRole('link').allInnerTexts()).map((t) => t.trim()).filter((t) => t && !['Home', 'Apps'].includes(t));
    qa.note(1, `line "${sub}"; tiles ${tiles.join(', ')}`);
    if (sub !== 'Triage & bay assignment (IGD)' || !tiles.includes('Visits')) qa.deviation(1, '"Triage & bay assignment (IGD)", a button "Open visits" and one tile "Visits" under "Workflow"', `"${sub}"; tiles ${tiles.join(', ')} under "Accident & Emergency"`);
  });
  await qa.step(2, async () => {
    const side = (await page.getByRole('complementary').getByRole('link').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    qa.note(2, `sidebar: ${side.join(', ')}`);
    if (!side.includes('Visits')) qa.deviation(2, 'The tile and the sidebar item "Visits" open Visits', 'neither the hub nor the sidebar has "Visits"; the screen opens only by its address');
  });
  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/emergency/visits');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    qa.note(3, `heading "${h1}"`);
    if (h1 === 'Visits') qa.deviation(3, 'Headings, column names, statuses and toasts are Indonesian ("Kunjungan", …)', `heading "${h1}"`);
  });
});

class Board {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto('/en/emergency/layout');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Emergency Layout' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async register(v: Partial<Record<'Existing MRN' | 'Name' | 'Date of birth', string>> & { age?: string; gender?: string }): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'New Registration' }).click();
    for (const [k, val] of Object.entries(v)) {
      if (k === 'age') await this.dialog.getByRole('spinbutton', { name: 'Age' }).fill(val ?? '');
      else if (k === 'gender') await this.dialog.getByRole('combobox', { name: 'Gender' }).selectOption(val ?? '');
      else await this.dialog.getByRole('textbox', { name: k }).fill(val ?? '');
    }
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: 'Register' }).click();
    return toastsAfter(this.page, mark);
  }
}

const REGISTERED = 'Registered. The patient is unplaced until a bed is assigned.';

qaTest('TC-APP015-053', async ({ page, qa }) => {
  const b = new Board(page);
  const name = qa.name('X Pasien Papan');
  await qa.step(1, async () => {
    await page.goto('/en/emergency/patients');
    await page.getByRole('complementary').getByRole('link', { name: 'Emergency Layout', exact: true }).first().click();
    await expect(b.main.getByRole('heading', { level: 1, name: 'Emergency Layout' })).toBeVisible();
    await expect(b.main.getByText('Choose a department and service centre. Tiles sit on the saved layout and show name, age, gender, and triage colour.', { exact: true })).toBeVisible();
    for (const l of ['Department', 'Service centre']) await expect(b.main.getByRole('combobox', { name: l })).toBeVisible();
    await expect(b.main.getByRole('button', { name: 'New Registration' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await b.main.getByRole('combobox', { name: 'Service centre' }).selectOption({ label: 'IGD' });
    await expect(b.main.getByText('This centre has no saved layout yet. Patients stay in the unplaced list.')).toBeVisible();
    await expect(b.main.getByRole('heading', { level: 2, name: 'Unplaced' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await b.main.getByRole('button', { name: 'New Registration' }).click();
    for (const f of ['Existing MRN', 'Name', 'Date of birth', 'Phone', 'Address', 'Brought by']) await expect(b.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(b.dialog.getByRole('combobox', { name: 'Unit' }).locator('option')).toHaveText(['Years', 'Months', 'Days']);
    for (const f of ['MLC', 'Informed police']) await expect(b.dialog.getByRole('checkbox', { name: f })).toBeVisible();
    await b.dialog.getByRole('button', { name: 'Close' }).first().click();
  });
  const toasts = await b.register({ Name: name, age: '35', gender: 'Female' });
  qa.note(4, `"Register": "${toasts.join(' / ')}"`);
  expect(toasts).not.toContain(REGISTERED);
  for (const st of [4, 5, 6, 7]) qa.blocked(st, 13);
});

qaTest('TC-APP015-054', async ({ page, qa }) => {
  const b = new Board(page);
  const cases: [number, Parameters<Board['register']>[0], string][] = [
    [1, { Name: qa.name('X Pasien Papan'), 'Date of birth': '2000-01-01', age: '10', gender: 'Female' }, 'Date of birth and age do not agree.'],
    [2, { Name: qa.name('X Pasien Papan'), gender: 'Female' }, 'date of birth or age is required'],
    [3, { age: '35', gender: 'Female' }, 'a name or an existing MRN is required'],
    [4, { 'Existing MRN': 'MRN-QA-TIDAK-ADA', age: '35', gender: 'Female' }, 'patient not found'],
    [6, { Name: qa.name('X Pasien Papan'), 'Date of birth': '2099-01-01', gender: 'Female' }, 'date of birth cannot be in the future'],
  ];
  for (const [step, v, expected] of cases) {
    await qa.step(step, async () => {
      const toasts = await b.register(v);
      const shown = await b.dialog.getByText(expected).count();
      expect(toasts).not.toContain(REGISTERED);
      qa.note(step, `text shown: "${toasts.join(' / ') || (shown ? expected : 'none')}" (expected "${expected}")`);
    });
  }
  qa.notRun(5, 'needs the MRN of a patient with an open emergency encounter; walk-in MRNs are not read here');
});

qaTest('TC-APP015-055', async ({ qa, browser }) => {
  await asAllBranches(browser, async (u2) => {
    const b = new Board(u2);
    await qa.step(1, async () => {
      await b.open();
      const centre = b.main.getByRole('combobox', { name: 'Service centre' });
      const chosen = await centre.evaluate((e: HTMLSelectElement) => e.selectedOptions[0]?.textContent?.trim() ?? '').catch(() => '');
      const button = b.main.getByRole('button', { name: 'New Registration' });
      await expect(button).toBeVisible();
      const disabled = await button.isDisabled();
      const text = (await b.main.innerText()).replace(/\s+/g, ' ');
      const says = /(choose|select|pilih)[^.]{0,40}(service cent|centre|center)/i.test(text.replace('Choose a department and service centre. Tiles', ''));
      qa.note(1, `service centre on the screen: "${chosen || 'none'}"; "New Registration" is ${disabled ? 'greyed out' : 'enabled'}${says ? '; a text asks to choose a service centre' : '; nothing says that a service centre must be chosen first'}`);
      if (!disabled) qa.deviation(1, '"New Registration" is greyed out', '"New Registration" can be clicked with no service centre chosen');
    });
  });
});

qaTest('TC-APP015-056', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/emergency/patients');
    await page.getByRole('complementary').getByRole('link', { name: 'Emergency Layout Design' }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Emergency Layout Design' })).toBeVisible();
    await expect(main.getByText('Place each bed of this service centre. A bed with no plot is not configured.', { exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Save layout' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await main.getByRole('combobox', { name: 'Service centre' }).selectOption({ label: 'IGD' });
    await expect(main.getByText('This centre has no beds.')).toBeVisible();
  });
  qa.blocked(3, 13);
  qa.blocked(4, 13);
});

qaTest('TC-APP015-057', async ({ qa }) => {
  qa.blocked(1, 13);
  test.skip(true, 'Blocker 13: set-up missing on the branch (00-blockers-checklist-linked.xlsx | Checklist | row 17)');
});

const SCREENS: [string, string, string][] = [
  ['TC-APP015-060', '/emergency', 'Emergency'],
  ['TC-APP015-061', '/emergency/layout', 'Emergency Layout'],
  ['TC-APP015-062', '/emergency/layout-design', 'Emergency Layout Design'],
  ['TC-APP015-063', '/emergency/patients', 'Emergency Patients'],
  ['TC-APP015-064', '/emergency/registration', 'Accident/Emergency Registration'],
  ['TC-APP015-065', '/emergency/triage-categories', 'Triage Category'],
  ['TC-APP015-066', '/emergency/visits', 'Visits'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
