import { randomBytes } from 'node:crypto';
import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { LoginPage } from '../../../pages/LoginPage';

/**
 * Shared steps of 18-settings.xlsx. Master data lists (/mdm/...) and the
 * identity screens share one pattern: a list with a search box and a status
 * filter, an "Add …" button and a dialog with "Advanced settings". Codes and
 * logins carry a token; SITE-NEW is made once and reused (a site is a branch
 * for every user and cannot be removed).
 */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** Why the browser holds a form back: the validation messages of its invalid fields. */
export async function invalidFields(scope: Locator): Promise<string[]> {
  return scope.locator('input:invalid, select:invalid, textarea:invalid').evaluateAll((es) =>
    es.map((e) => `${(e as HTMLInputElement).labels?.[0]?.textContent?.trim() || e.getAttribute('aria-label') || e.id}: ${(e as HTMLInputElement).validationMessage}`),
  );
}

export class Mdm {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly route: string,
    readonly heading: string,
    readonly addLabel: string,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/en${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  get search(): Locator {
    return this.main.getByRole('searchbox');
  }
  get status(): Locator {
    return this.main.getByRole('combobox').first();
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  /** The row whose first cell is the code, searched by the code; pages on when the search covers one page only. */
  async row(code: string, search = code): Promise<Locator> {
    await this.open();
    if (await this.search.count()) await this.search.fill(search);
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
    const next = this.main.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 30; i++) {
      if (await match().count()) return match();
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      await next.press('Enter');
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return match();
  }
  async openAdd(): Promise<void> {
    await this.open();
    await this.main.getByRole('button', { name: this.addLabel }).click();
    await expect(this.dialog).toBeVisible();
  }
  async advanced(): Promise<void> {
    const box = this.dialog.getByRole('checkbox', { name: 'Active' });
    if (!(await box.isVisible())) await this.dialog.getByText('Advanced settings').click();
  }
  /** Fills text fields by label, ticks or clears check boxes, and clicks "Save"; returns the toasts. */
  async fill(v: Record<string, string | boolean>): Promise<void> {
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === 'boolean') {
        if (!(await this.dialog.getByRole('checkbox', { name: k }).isVisible())) await this.advanced();
        await this.dialog.getByRole('checkbox', { name: k }).setChecked(val);
      } else {
        const box = this.dialog.getByRole('textbox', { name: k }).or(this.dialog.getByRole('spinbutton', { name: k }));
        if (!(await box.isVisible())) await this.advanced();
        await box.fill(val);
      }
    }
  }
  async save(): Promise<string[]> {
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    return toastsAfter(this.page, mark);
  }
  async add(v: Record<string, string | boolean>): Promise<string[]> {
    await this.openAdd();
    await this.fill(v);
    return this.save();
  }
  /** Opens the edit dialog of the row of a code. */
  async edit(code: string): Promise<void> {
    const row = await this.row(code);
    await row.getByRole('button', { name: /^Edit/ }).click();
    await expect(this.dialog).toBeVisible();
  }
}

export const sites = (page: Page) => new Mdm(page, '/mdm/sites', 'Sites', 'Add Site');
export const departments = (page: Page) => new Mdm(page, '/mdm/departments', 'Departments', 'Add Department');
export const serviceCenters = (page: Page) => new Mdm(page, '/mdm/service-centers', 'Service Centers', 'Add Service Center');
export const countries = (page: Page) => new Mdm(page, '/mdm/packs/countries', 'Countries', 'Add Country');
export const cities = (page: Page) => new Mdm(page, '/mdm/packs/cities', 'Cities', 'Add City');
export const units = (page: Page) => new Mdm(page, '/mdm/packs/units-of-measure', 'Units of Measure', 'Add UOM');
export const taxCodes = (page: Page) => new Mdm(page, '/mdm/tax-codes', 'Tax Codes', 'Add tax code');
export const holidays = (page: Page) => new Mdm(page, '/mdm/holidays', 'Holidays', 'Add holiday');
export const users = (page: Page) => new Mdm(page, '/identity/users', 'Users', 'Add User');
export const roles = (page: Page) => new Mdm(page, '/identity/roles', 'Roles', 'Add Role');

/** SITE-NEW (00-test-data.xlsx | Catalogue, 18): code "QA-SITE-01", name "QA Klinik Uji"; made once and reused. */
export const SITE_NEW = { code: 'QA-SITE-01', name: 'QA Klinik Uji' } as const;

export async function ensureSiteNew(page: Page): Promise<void> {
  const s = sites(page);
  if (await (await s.row(SITE_NEW.code)).count()) return;
  expect(await s.add({ 'Site code': SITE_NEW.code, 'Site name': SITE_NEW.name })).toContain('Site added.');
}

/** A password for a test account made by the test: random per run, never written to a report. */
export function newPassword(): string {
  return `Qa-${randomBytes(9).toString('base64url')}`;
}

export type NewUser = { login: string; fullName: string; email: string; password: string; branch?: string; store?: string; roles: string[] };

/** Fills the user dialog (open) and saves; returns the toasts. */
export async function fillUser(u: Mdm, v: Partial<NewUser>): Promise<string[]> {
  const d = u.dialog;
  if (v.login !== undefined) await d.getByRole('textbox', { name: 'Login' }).fill(v.login);
  if (v.fullName !== undefined) await d.getByRole('textbox', { name: 'Full name' }).fill(v.fullName);
  if (v.email !== undefined) await d.getByRole('textbox', { name: 'Email' }).fill(v.email);
  if (v.password !== undefined) await d.getByRole('textbox', { name: 'Password' }).fill(v.password);
  if (v.branch !== undefined) await pick(d.getByRole('combobox', { name: 'Branch' }), v.branch);
  if (v.store !== undefined) await d.getByRole('combobox', { name: 'Store' }).selectOption({ label: v.store });
  for (const r of v.roles ?? []) await d.getByRole('checkbox', { name: r, exact: true }).check();
  return u.save();
}

export async function createUser(page: Page, v: NewUser): Promise<string[]> {
  const u = users(page);
  await u.openAdd();
  return fillUser(u, v);
}

/**
 * Picks from a typed list (an input with role combobox whose list of option
 * buttons is named by aria-controls): types the text and clicks the option
 * that contains it. The list of Branch map floats above the page, so the
 * click is sent to the option button directly.
 */
export async function pick(box: Locator, text: string): Promise<void> {
  await box.fill(text);
  const id = await box.getAttribute('aria-controls');
  const option = box.page().locator(`[id="${id}"]`).getByRole('option').filter({ hasText: text }).first();
  await option.getByRole('button').dispatchEvent('click');
  await expect(box).toHaveValue(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

/** Signs in on a fresh browser context; returns the page, or the text shown when the sign-in is refused. */
export async function signInAs(browser: Browser, login: string, password: string): Promise<{ context: BrowserContext; page: Page; ok: boolean; message: string }> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await installToastRecorder(page);
  const l = new LoginPage(page);
  await page.goto('/en/login?next=%2Fapps');
  await l.username.fill(login);
  await l.password.fill(password);
  const mark = await toastMark(page);
  await l.submit.click();
  const ok = await page
    .waitForURL(/\/en\/apps$/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  let message = '';
  if (!ok) {
    const alerts = await page.locator('[role=alert]:not(#__next-route-announcer__)').allInnerTexts();
    message = [...(await toastsSince(page, mark)), ...alerts].map((t) => t.trim()).filter(Boolean).join(' / ');
  }
  return { context, page, ok, message };
}
