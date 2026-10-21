import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { toastsOf } from '../shared/access';

/**
 * 10-hr.xlsx, the HR desk: My profile (/hr/desk) and Year balance
 * (/hr/desk/leave). One button opens a dialog with an "Action" list; actions
 * on a saved row take its id in "Document". Employee numbers, names and leave
 * types carry a token. "Link me" links the signed-in account: it is tried on
 * an employee of the test only.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const SAVED = 'Saved.';
const NLK = 'Name / location / kind';

class HrDesk {
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
    await this.page.goto(`/en${this.route}`);
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

const profile = (page: Page) => new HrDesk(page, '/hr/desk', 'My profile', 'Employee');
const leave = (page: Page) => new HrDesk(page, '/hr/desk/leave', 'Year balance', 'Year balance');

/** An employee of the desk ("X-EMP-01" with a token). */
async function deskEmployee(page: Page, qa: Qa): Promise<string> {
  const no = qa.code('X-EMP-01');
  expect(await profile(page).save({ 'Employee no': no, [NLK]: qa.name('X Karyawan Uji') }, 'Employee')).toContain(SAVED);
  return no;
}

/** The id of the row of the desk list whose detail holds every text given, newest last. */
async function idOf(d: HrDesk, ...texts: string[]): Promise<string> {
  const rows = (await d.list(texts[0])).filter((r) => texts.every((t) => r.join(' ').includes(t)));
  return rows.at(-1)?.[2] ?? '';
}

const YEAR = { 'Leave / shift': '', Year: '2027', From: '2027-01-01', To: '2027-12-31', Days: '12' };

qaTest('TC-APP010-040', async ({ page, qa }) => {
  const p = profile(page);
  const no = qa.code('X-EMP-01');

  await qa.step(1, async () => {
    await page.goto('/en/hr');
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

  await qa.step(4, async () => {
    expect(await p.save({ 'Employee no': no }, 'Link me')).toContain(SAVED);
  });

  await qa.step(5, async () => {
    const toasts = await p.save({}, 'My profile');
    const shown = (await p.dialog.innerText().catch(() => '')).replace(/\s+/g, ' ');
    qa.note(5, `"My profile": "${toasts.join(' / ') || 'no toast'}"; the dialog reads "${shown.slice(0, 160)}" (TBD in the workbook)`);
  });
});

qaTest('TC-APP010-041', async ({ page, qa }) => {
  const p = profile(page);
  await qa.step(1, async () => {
    const toasts = await p.save({ 'Employee no': qa.code('X-EMP-01'), [NLK]: '' }, 'Employee');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `name empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "code and name are required")`);
  });
  await qa.step(2, async () => {
    const toasts = await p.save({ 'Employee no': '' }, 'Link me');
    expect(toasts).not.toContain(SAVED);
    qa.note(2, `number empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "notmapped")`);
  });
});

qaTest('TC-APP010-042', async ({ page, qa }) => {
  const l = leave(page);
  const no = await deskEmployee(page, qa);
  const type = qa.prefix('X-Tahunan');
  let app = '';

  await qa.step(1, async () => {
    await page.goto('/en/hr');
    await page.getByRole('complementary').getByRole('link', { name: 'Leave year' }).or(page.getByRole('main').getByRole('link', { name: 'Leave year' })).first().click();
    await expect(l.main.getByRole('heading', { level: 1, name: 'Year balance' })).toBeVisible();
    await expect(l.main.getByRole('button', { name: 'Year balance', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await l.main.getByRole('button', { name: 'Year balance', exact: true }).click();
    for (const f of ['Employee no', NLK, 'Leave / shift', 'Document', 'Year']) await expect(l.dialog.getByRole('textbox', { name: f })).toBeVisible();
    for (const b of ['Back', 'Next']) await expect(l.dialog.getByRole('button', { name: b })).toBeVisible();
  });

  await qa.step(3, async () => {
    expect(await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type }, 'Year balance')).toContain(SAVED);
    expect((await l.list(no)).some((r) => r.join(' ').includes(no))).toBe(true);
  });

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
});

qaTest('TC-APP010-043', async ({ page, qa }) => {
  const l = leave(page);
  const no = await deskEmployee(page, qa);
  const type = qa.prefix('X-Tahunan');
  const refusedNote = (step: number, what: string, toasts: string[], server: string) => {
    expect(toasts, what).not.toContain(SAVED);
    qa.note(step, `${what}: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "${server}")`);
  };

  await qa.step(1, async () => refusedNote(1, 'no dates', await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type, From: '', To: '' }, 'Year balance'), 'defineresetdate'));
  await qa.step(2, async () => refusedNote(2, '"To" before "From"', await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type, From: '2027-12-31', To: '2027-01-01' }, 'Year balance'), 'to date is before from'));
  await qa.step(3, async () => refusedNote(3, 'days 0', await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type, Days: '0' }, 'Year balance'), 'employee, type and days are required'));
  await qa.step(4, async () => {
    expect(await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type }, 'Year balance')).toContain(SAVED);
    expect(await l.save({ 'Employee no': no, 'Leave / shift': type, Year: '2027', From: '2027-04-01', To: '2027-04-01', Days: '1' }, 'Apply')).toContain(SAVED);
    refusedNote(4, 'a second balance while an application waits', await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type }, 'Year balance'), 'pending approval');
  });
});

qaTest('TC-APP010-044', async ({ page, qa }) => {
  const l = leave(page);
  await qa.step(1, async () => {
    const toasts = await l.save({ Document: '' }, 'Approve');
    expect(toasts).not.toContain(SAVED);
    qa.note(1, `"Document" empty: "${toasts.join(' / ') || 'no toast'}" (the workbook: the server text "document is missing")`);
  });
});

/** The latest day off in the last 7 days: a Sunday (the site keeps no roster; a Sunday stands for the day off). */
function workedDayOff(): string {
  for (let i = 1; i <= 6; i++) {
    const d = addDays(todayWib(), -i);
    if (new Date(`${d}T00:00:00Z`).getUTCDay() === 0) return d;
  }
  return addDays(todayWib(), -1);
}

qaTest('TC-APP010-045', async ({ page, qa }) => {
  const l = leave(page);
  const no = await deskEmployee(page, qa);
  const day = workedDayOff();
  qa.note(1, `the worked day off is ${day} (a Sunday within the last 7 days)`);
  let id = '';

  await qa.step(1, async () => {
    expect(await l.save({ 'Employee no': no, From: day, To: day }, 'Comp-off')).toContain(SAVED);
    id = await idOf(l, no);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  await qa.step(2, async () => {
    expect(await l.save({ Document: id }, 'Approve comp-off')).toContain(SAVED);
    qa.note(2, `rows of ${no}: ${(await l.list(no)).map((r) => `${r[0]} ${r[1]}`).join(' ; ')} (TBD in the workbook: whether a day is added to the balance)`);
  });
});

qaTest('TC-APP010-046', async ({ page, qa }) => {
  const l = leave(page);
  const no = await deskEmployee(page, qa);
  for (const [step, offset, server] of [
    [1, 1, 'date is in the future'],
    [2, -8, 'worked day is older than 7 days'],
    [3, -7, 'accepted or refused at the limit'],
  ] as const) {
    await qa.step(step, async () => {
      const day = addDays(todayWib(), offset);
      const toasts = await l.save({ 'Employee no': no, From: day, To: day }, 'Comp-off');
      if (step < 3) expect(toasts).not.toContain(SAVED);
      qa.note(step, `worked day ${day}: "${toasts.join(' / ') || 'no toast'}" (the workbook: ${server})`);
    });
  }
});
