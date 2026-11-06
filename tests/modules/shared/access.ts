import type { Browser, Locator, Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf, PASSWORD } from '../../../lib/config';
import { signInAs } from '../18-settings/helpers';
import { AppHeader } from '../../../pages/AppHeader';
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
export async function userPage(browser: Browser, user: 'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6' | 'U7'): Promise<Page> {
  const page = await (await browser.newContext({ storageState: authFileOf(user) })).newPage();
  await installToastRecorder(page);
  return page;
}

/**
 * A page signed in as a role account of 00-prerequisites.xlsx (U8, made on 2026-10-20: qa.apoteker, qa.kasir,
 * qa.finance, …), with the password of .env. Throws when the sign-in is refused.
 */
export async function roleAccountPage(browser: Browser, login: string): Promise<Page> {
  const s = await signInAs(browser, login, PASSWORD);
  if (!s.ok) {
    await s.context.close();
    throw new Error(`${login} cannot sign in: ${s.message}`);
  }
  return s.page;
}

/** Runs body with a page of user, closed at the end. */
export async function asUser<T>(browser: Browser, user: 'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6' | 'U7', body: (page: Page) => Promise<T>): Promise<T> {
  const page = await userPage(browser, user);
  try {
    return await body(page);
  } finally {
    await page.context().close();
  }
}

/** Runs body with a page of U2 with "All branches" chosen in the header (U2 may have been left on one branch). */
export async function asAllBranches<T>(browser: Browser, body: (page: Page) => Promise<T>): Promise<T> {
  return asUser(browser, 'U2', async (page) => {
    await page.goto('/id/apps');
    await new AppHeader(page).selectBranch('All branches');
    return body(page);
  });
}

/** Step "opens the screen with All branches" (expected TBD): notes whether the screen asks for one branch, or what its list shows. */
export async function allBranchesList(page: Page, qa: Qa, step: number): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  const main = page.getByRole('main');
  const text = (await main.innerText()).replace(/\s+/g, ' ');
  const asks = /(choose|select|pick|pilih)[^.]{0,40}(branch|cabang)/i.test(text);
  const rows = await main.getByRole('table').first().getByRole('row').count().catch(() => 0);
  qa.note(step, asks ? 'the screen asks to choose one branch' : `no request to choose one branch; the table has ${Math.max(rows - 1, 0)} rows`);
}

/** A save with "All branches" in the header: a refusal is noted with its text, a save is a deviation. */
export function allBranchesSave(qa: Qa, step: number, toasts: string[], saved = 'Saved.', serverText = 'branch is required'): void {
  if (toasts.some((t) => t.includes(saved))) qa.deviation(step, 'Refused: one branch must be chosen', `saved with "All branches" in the header ("${toasts.join(' / ')}")`);
  else qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the workbook: the server refuses with a text ending in "${serverText}")`);
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
  await page.goto('/id/apps');
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
    await page.goto(`/id${route}`);
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
  await u6.goto(`/id${route}`);
  await u6.waitForLoadState('networkidle').catch(() => {});
  const b = await columnTexts(u6, column);
  await u1.goto(`/id${route}`);
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
    await page.goto(`/id${hub}`);
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
  await page.goto('/id/audit');
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

/**
 * "Opening <screen> without being signed in": the address leads to the
 * sign-in page with next=<route>; signing in there stays on the login page
 * (checklist blocker 1: only the target /apps goes on), so step 2 is blocked
 * by 1 and the user signs in through /apps to open the screen for step 3:
 * signing out, then Back, shows the sign-in page again.
 */
export async function signedOutJourney(browser: Browser, qa: Qa, route: string, screen: RegExp): Promise<void> {
  const { LoginPage } = await import('../../../pages/LoginPage');
  const { PASSWORD } = await import('../../../lib/config');
  const { userLogin } = await import('../../../lib/qa-data');
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  context.setDefaultNavigationTimeout(30_000);
  const page = await context.newPage();
  const login = new LoginPage(page);
  try {
    await qa.step(1, async () => {
      await page.goto(`/id${route}`);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), { timeout: 20_000 });
    });
    await qa.step(2, async () => {
      await login.username.fill(userLogin('U1')!);
      await login.password.fill(PASSWORD);
      await login.submit.click();
      await page.waitForURL(screen, { timeout: 20_000 }).catch(() => {});
      if (/\/login/.test(page.url())) {
        qa.note(2, `after "Sign in" the page stays on ${new URL(page.url()).pathname}${new URL(page.url()).search}`);
        qa.blocked(2, 1);
        await login.signIn(userLogin('U1')!, PASSWORD);
        await page.goto(`/id${route}`);
      } else if (!screen.test(page.url())) qa.deviation(2, 'The screen that was asked for', `after signing in: ${new URL(page.url()).pathname}`);
    });
    await qa.step(3, async () => {
      await expect(page).toHaveURL(screen, { timeout: 20_000 });
      await new AppHeader(page).signOut();
      await page.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => {});
      // Back may wait for a load that never comes (the page is served from the cache): bounded.
      await page.goBack({ timeout: 15_000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    });
  } finally {
    await context.close();
  }
}
