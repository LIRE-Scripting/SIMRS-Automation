import type { Browser, Locator, Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';

/**
 * The access test cases every workbook has: a user without the module's
 * right (U3 "qa.staff", role qa_staff with no right at all), a user with no
 * role of the module (U3 again), a user of another branch (U6 "qa.kemayoran",
 * admin of Kemayoran) and a user on "All branches" (U2).
 * 00-prerequisites.xlsx | Users.
 */

export const BR_A = 'Podomoro';
export const BR_B = 'Kemayoran';

/** "Access refused", "no access" and the like on a screen. */
export const REFUSAL = /no access|not allowed|forbidden|permission|missing required privilege|access denied|unauthori[sz]ed|tidak memiliki akses/i;

/** A page of another prepared user, with the toast recorder. Close it with page.context().close(). */
export async function userPage(browser: Browser, user: 'U1' | 'U2' | 'U3' | 'U6'): Promise<Page> {
  const page = await (await browser.newContext({ storageState: authFileOf(user) })).newPage();
  await installToastRecorder(page);
  return page;
}

/** Runs body with a page of user, closed at the end. */
export async function asUser<T>(browser: Browser, user: 'U1' | 'U2' | 'U3' | 'U6', body: (page: Page) => Promise<T>): Promise<T> {
  const page = await userPage(browser, user);
  try {
    return await body(page);
  } finally {
    await page.context().close();
  }
}

/** Clicks and returns the toasts that follow (waits up to 8 s for the first one). */
export async function toastsOf(page: Page, click: () => Promise<unknown>): Promise<string[]> {
  const mark = await toastMark(page);
  await click();
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** The save of a user without the right must not show its success toast; the toast it shows is noted. */
export function refused(qa: Qa, step: number, what: string, toasts: string[], saved: RegExp): void {
  expect(toasts.filter((t) => saved.test(t)), `${what} is saved for a user without the right`).toEqual([]);
  qa.note(step, `${what}: "${toasts.join(' / ') || 'no toast'}"`);
}

/** Clicks a save of a user without the right; the success toast must not follow. */
export async function tryRefused(qa: Qa, step: number, page: Page, what: string, saved: RegExp, click: () => Promise<unknown>): Promise<string[]> {
  const toasts = await toastsOf(page, click);
  refused(qa, step, what, toasts, saved);
  return toasts;
}

/** True when the screen shows a refusal or an error instead of its content. */
export async function screenRefuses(page: Page): Promise<boolean> {
  const main = (await page.getByRole('main').count()) ? page.getByRole('main') : page.locator('body');
  return (await main.getByText(REFUSAL).count()) > 0 || (await page.getByText("This page couldn't load").count()) > 0;
}

/** "Opens Apps -> No <card> card, or the card opens a "no access" page". */
export async function appsCardRefused(page: Page, qa: Qa, step: number, card: RegExp): Promise<void> {
  await page.goto('/en/apps');
  const link = page.getByRole('main').getByRole('link', { name: card });
  if (!(await link.count())) return;
  await link.first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!(await screenRefuses(page))) {
    const expected = `No "${card.source.replace(/^\^|\\b|\$$/g, '')}" card, or the card opens a "no access" page`;
    qa.deviation(step, expected, `the card is shown to U3 (no right) and opens ${new URL(page.url()).pathname}`);
  }
}

/** Rows of the first table in main, counted without the header row. */
export async function rowCount(page: Page): Promise<number> {
  const main = (await page.getByRole('main').count()) ? page.getByRole('main') : page.locator('body');
  const table = main.getByRole('table').first();
  if (!(await table.count())) return 0;
  return Math.max((await table.getByRole('row').count()) - 1, 0);
}

/**
 * "Opens <route> directly -> Access refused". Each route that shows its
 * content is a deviation, with its title and row count; `then` may act on
 * the screen (e.g. open a record) before it is judged.
 */
export async function routesRefused(page: Page, qa: Qa, step: number, routes: string[], then?: (route: string) => Promise<string | void>): Promise<void> {
  const shown: string[] = [];
  for (const route of routes) {
    await page.goto(`/en${route}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const extra = then ? await then(route) : undefined;
    if (await screenRefuses(page)) continue;
    const heading = (await page.getByRole('heading', { level: 1 }).allInnerTexts()).join(' ').trim();
    shown.push(`${route} ("${heading}", ${await rowCount(page)} rows${extra ? `; ${extra}` : ''})`);
  }
  if (shown.length) qa.deviation(step, 'Access refused', `U3 (no right) reads ${shown.join(' and ')}`);
}

/** "Opens the branch selector in the header -> BR-A only. No "All branches"". */
export async function headerOneBranch(page: Page, qa: Qa, step: number): Promise<void> {
  const banner = page.getByRole('banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Branch' })).toHaveCount(0);
  await expect(banner.getByText('All branches')).toHaveCount(0);
  qa.note(step, `the header of U1 has no branch selector: U1 works on ${BR_A} only`);
}

/** Texts of a column of the first table in main (0-based), blank rows left out. */
export async function columnTexts(page: Page, column = 0, scope?: Locator): Promise<string[]> {
  const main = scope ?? ((await page.getByRole('main').count()) ? page.getByRole('main') : page.locator('body'));
  const rows = main.getByRole('table').first().getByRole('row');
  const out: string[] = [];
  for (const row of await rows.all()) {
    const cells = row.getByRole('cell');
    if ((await cells.count()) <= column) continue;
    const text = (await cells.nth(column).innerText()).trim();
    if (text) out.push(text);
  }
  return out;
}

/**
 * The rows U6 (Kemayoran) sees on a list and U1 (Podomoro) does not: the
 * records of BR-B that must stay hidden from BR-A. Returns the keys of U6's
 * rows found in U1's list too.
 */
export async function otherBranchRowsShown(u1: Page, u6: Page, route: string, column = 0): Promise<{ b: string[]; shownToA: string[] }> {
  await u6.goto(`/en${route}`);
  await u6.waitForLoadState('networkidle').catch(() => {});
  const b = await columnTexts(u6, column);
  await u1.goto(`/en${route}`);
  await u1.waitForLoadState('networkidle').catch(() => {});
  const a = new Set(await columnTexts(u1, column));
  return { b, shownToA: b.filter((k) => a.has(k)) };
}

/**
 * A patient of BR-B: the first row of U6's patient list. New patients cannot
 * be registered in Kemayoran (found blocker 41), so a seed patient of the
 * branch stands in for PT-B.
 */
export async function seedPatientOf(page: Page): Promise<{ mrn: string; fullName: string }> {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const row = reg.rows().first();
  return {
    mrn: (await (await reg.cell(row, 'MRN')).innerText()).trim(),
    fullName: (await (await reg.cell(row, 'Full name')).innerText()).trim(),
  };
}

/**
 * Opens the screens of an application by its menu (the side menu, else the
 * links of its hub) and returns "<link>: <heading> (<n> rows)" for each one
 * that opens.
 */
export async function menuScreens(page: Page, hub: string, links: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const name of links) {
    await page.goto(`/en${hub}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const link = page.getByRole('complementary').getByRole('link', { name, exact: true }).or(page.getByRole('main').getByRole('link', { name, exact: true })).first();
    if (!(await link.count())) {
      out.push(`${name}: no link`);
      continue;
    }
    await link.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const heading = (await page.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).trim();
    out.push(`${name}: ${(await screenRefuses(page)) ? 'refused' : `"${heading}" (${await rowCount(page)} rows)`}`);
  }
  return out;
}

/** The newest Audit Log entries of a module (filter "Module"), as row texts. */
export async function auditEntries(page: Page, module: string): Promise<string[]> {
  await page.goto('/en/audit');
  await page.getByRole('textbox', { name: 'Module' }).fill(module);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const rows = page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row').filter({ has: page.getByRole('cell').nth(1) });
  return (await rows.allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
}

/**
 * Saves a desk dialog with an action that may not be offered: the toasts, or
 * null when the "Action" list has no such entry.
 */
export async function saveIfOffered(desk: { save(v: Record<string, string>, action?: string): Promise<string[]>; dialog: Locator }, v: Record<string, string>, action: string): Promise<string[] | null> {
  try {
    return await desk.save(v, action);
  } catch (e) {
    const options = await desk.dialog.getByRole('combobox', { name: 'Action' }).locator('option').allInnerTexts().catch(() => [] as string[]);
    if (options.length && !options.map((o) => o.trim()).includes(action)) return null;
    throw e;
  }
}
