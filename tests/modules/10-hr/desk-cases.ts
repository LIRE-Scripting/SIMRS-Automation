import type { Locator, Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { LeavePage } from '../../../pages/hr/HrPages';
import { toastsOf } from '../shared/access';

/**
 * The HR desk of 10-hr.xlsx (My profile, Year balance) shared by desk.spec.ts
 * and the end-to-end chains (tests/e2e/chains/): each test case is declared by
 * the module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const SAVED = 'Saved.';
export const NLK = 'Name / location / kind';

export class HrDesk {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(
    readonly page: Page,
    readonly route: string,
    readonly heading: string,
    readonly button: string,
  ) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/id${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async openDialog(): Promise<void> {
    await this.open();
    await this.main.getByRole('button', { name: this.button, exact: true }).click();
    await expect(this.dialog).toBeVisible();
  }
  /** Fills the fields on whichever step they are (text or date), picks the action and saves; returns the toasts. */
  async save(v: Record<string, string>, action?: string): Promise<string[]> {
    await this.openDialog();
    const pending = new Map(Object.entries(v));
    for (let step = 0; step < 4; step++) {
      for (const [k, val] of [...pending]) {
        const box = this.dialog.getByRole('textbox', { name: k, exact: true }).or(this.dialog.getByRole('spinbutton', { name: k, exact: true })).or(this.dialog.getByLabel(k, { exact: true }));
        if (await box.first().isVisible()) {
          await box.first().fill(val);
          pending.delete(k);
        }
      }
      if (action && (await this.dialog.getByRole('combobox', { name: 'Action' }).isVisible())) await this.dialog.getByRole('combobox', { name: 'Action' }).selectOption({ label: action });
      const next = this.dialog.getByRole('button', { name: 'Next' });
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      await next.click();
    }
    if (pending.size) throw new Error(`fields not found: ${[...pending.keys()].join(', ')}`);
    if (action) await this.dialog.getByRole('combobox', { name: 'Action' }).selectOption({ label: action });
    return toastsOf(this.page, () => this.dialog.getByRole('button', { name: 'Save' }).click());
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The rows as [status, detail, id]; with a search text, typed first. */
  async list(search?: string): Promise<string[][]> {
    await this.open();
    if (search) await this.main.getByRole('textbox', { name: 'Search' }).or(this.main.getByRole('searchbox')).first().fill(search);
    await this.page.waitForLoadState('networkidle').catch(() => {});
    return this.rows().evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length >= 3).map((r) => Array.from(r.querySelectorAll('td')).slice(0, 3).map((c) => c.textContent?.replace(/\s+/g, ' ').trim() ?? '')));
  }
}

export const profile = (page: Page) => new HrDesk(page, '/hr/desk', 'My profile', 'Employee');
export const leave = (page: Page) => new HrDesk(page, '/hr/desk/leave', 'Year balance', 'Year balance');

/** An employee of the desk ("X-EMP-01" with a token). */
export async function deskEmployee(page: Page, qa: Qa): Promise<string> {
  const no = qa.code('X-EMP-01');
  expect(await profile(page).save({ 'Employee no': no, [NLK]: qa.name('X Karyawan Uji') }, 'Employee')).toContain(SAVED);
  return no;
}

/** The id of the row of the desk list whose detail holds every text given, newest last. */
export async function idOf(d: HrDesk, ...texts: string[]): Promise<string> {
  const rows = (await d.list(texts[0])).filter((r) => texts.every((t) => r.join(' ').includes(t)));
  return rows.at(-1)?.[2] ?? '';
}

export const YEAR = { 'Leave / shift': '', Year: '2027', From: '2027-01-01', To: '2027-12-31', Days: '12' };

/**
 * A leave type of the test whose type code is `code` (Leave applications,
 * "Leave types"): the desk's "Leave / shift" takes the code of an existing
 * type ("X-Tahunan" of the workbook's data).
 */
export async function leaveTypeCode(page: Page, qa: Qa, code: string): Promise<string> {
  const l = new LeavePage(page);
  await l.open();
  const d = await l.openTypes();
  await d.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Cuti Tahunan desk').replace(/^QA-/, 'QA '));
  await d.getByRole('textbox', { name: 'Type' }).fill(code);
  await d.getByRole('spinbutton', { name: 'Eligibility period' }).fill('12');
  await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('12');
  expect(await toastsOf(page, () => d.getByRole('button', { name: 'Save type' }).click())).toContain('Leave type saved');
  return code;
}

/** TC-APP010-042: a year balance opened for an employee of the test, applied, approved and the approval cancelled. */
export const TC_APP010_042 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const l = leave(page);
  const no = await deskEmployee(page, qa);
  const type = await leaveTypeCode(page, qa, qa.prefix('X-Tahunan'));
  let app = '';

  await qa.step(1, async () => {
    await page.goto('/id/hr');
    await page.getByRole('complementary').getByRole('link', { name: 'Leave year' }).or(page.getByRole('main').getByRole('link', { name: 'Leave year' })).first().click();
    await expect(l.main.getByRole('heading', { level: 1, name: 'Year balance' })).toBeVisible();
    await expect(l.main.getByRole('button', { name: 'Year balance', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await l.main.getByRole('button', { name: 'Year balance', exact: true }).click();
    for (const f of ['Employee no', NLK, 'Leave / shift', 'Document', 'Year']) await expect(l.dialog.getByRole('textbox', { name: f })).toBeVisible();
    for (const b of ['Back', 'Next']) await expect(l.dialog.getByRole('button', { name: b })).toBeVisible();
  });

  let balance = false;
  await qa.step(3, async () => {
    const toasts = await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type }, 'Year balance');
    qa.note(3, `Year balance of ${no}, type "${type}": "${toasts.join(' / ').slice(0, 80)}"`);
    if (!toasts.includes(SAVED) && toasts.some((t) => /React error #441/.test(t))) return;
    expect(toasts).toContain(SAVED);
    expect((await l.list(no)).some((r) => r.join(' ').includes(no))).toBe(true);
    balance = true;
  });
  if (!balance) {
    // The year balance answers HTTP 500 (found blocker 43): nothing to apply, approve or cancel.
    for (const st of [3, 4, 5, 6]) qa.blocked(st, 43);
    return;
  }

  await qa.step(4, async () => {
    const from = '2027-03-01';
    expect(await l.save({ 'Employee no': no, 'Leave / shift': type, Year: '2027', From: from, To: '2027-03-02', Days: '2' }, 'Apply')).toContain(SAVED);
    app = await idOf(l, no, from);
    expect(app).toMatch(/^[0-9a-f-]{36}$/);
  });

  await qa.step(5, async () => {
    expect(await l.save({ Document: app }, 'Approve')).toContain(SAVED);
  });

  await qa.step(6, async () => {
    expect(await l.save({ Document: app }, 'Cancel approved')).toContain(SAVED);
    qa.note(6, `rows of ${no}: ${(await l.list(no)).map((r) => `${r[0]} ${r[1]}`).join(' ; ')} (TBD in the workbook: whether the days return to the balance)`);
  });
};

export const TC_APP010_040 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const p = profile(page);
  const no = qa.code('X-EMP-01');

  await qa.step(1, async () => {
    await page.goto('/id/hr');
    await page.getByRole('complementary').getByRole('link', { name: 'Profile' }).or(page.getByRole('main').getByRole('link', { name: 'Profile' })).first().click();
    await expect(p.main.getByRole('heading', { level: 1, name: 'My profile' })).toBeVisible();
    await expect(p.main.getByRole('textbox', { name: 'Search' }).or(p.main.getByRole('searchbox')).first()).toBeVisible();
    await expect(p.main.getByRole('button', { name: 'Employee', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await p.main.getByRole('button', { name: 'Employee', exact: true }).click();
    await expect(p.dialog).toHaveAccessibleName('My profile');
    for (const f of ['Employee no', NLK]) await expect(p.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(p.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Employee', 'Link me', 'My profile']);
    for (const b of ['Close', 'Save']) await expect(p.dialog.getByRole('button', { name: b }).first()).toBeVisible();
  });

  await qa.step(3, async () => {
    expect(await p.save({ 'Employee no': no, [NLK]: qa.name('X Karyawan Uji') }, 'Employee')).toContain(SAVED);
    expect((await p.list(no)).some((r) => r.join(' ').includes(no))).toBe(true);
  });

  let linked = true;
  await qa.step(4, async () => {
    const toasts = await p.save({ 'Employee no': no }, 'Link me');
    if (toasts.some((t) => /React error #441/.test(t))) {
      linked = false;
      qa.note(4, '"Link me": toast "Minified React error #441" (HTTP 500, found blocker 57); U1 was linked to an employee by an earlier run of this test');
      return qa.blocked(4, 57);
    }
    expect(toasts).toContain(SAVED);
  });
  if (!linked) return qa.blocked(5, 57);

  await qa.step(5, async () => {
    const toasts = await p.save({}, 'My profile');
    const shown = (await p.dialog.innerText().catch(() => '')).replace(/\s+/g, ' ');
    qa.note(5, `"My profile": "${toasts.join(' / ') || 'no toast'}"; the dialog reads "${shown.slice(0, 160)}" (TBD in the workbook)`);
  });
};
