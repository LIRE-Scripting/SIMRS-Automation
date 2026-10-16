import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { AppointmentsPage } from '../../../pages/ambulatory/AppointmentsPage';
import { BOOKING_LIST, TypeListPage, type TypeKind } from '../../../pages/appointment/TypeListPage';

/**
 * 02-appointment.xlsx, features "Referral type (/appointment/referral-types)"
 * and "Cross-consult type (/appointment/cross-consult-types)". The two
 * screens and their test cases are alike; each case is written once and
 * declared for both. Codes and names ("X-01", "X Tipe uji 01") get the QA-
 * prefix and a new token per save (Q5; the screen has no delete, Final State).
 */

type Args = { page: import('@playwright/test').Page; qa: Qa };
const SCHEDULE = '/en/appointment/schedule';

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

/** The options of a booking list, read from the "Book" dialog of Appointments. */
async function bookingOptions(page: Args['page'], kind: TypeKind): Promise<string[]> {
  const appts = new AppointmentsPage(page, SCHEDULE);
  await appts.open();
  const d = await appts.openBook();
  const options = (await d.getByRole('combobox', { name: BOOKING_LIST[kind] }).locator('option').allInnerTexts()).map((o) => o.trim());
  await d.getByRole('button', { name: 'Cancel' }).click();
  return options;
}

/** Adds a type through the dialog and waits for "Saved". */
async function addType(list: TypeListPage, code: string, name: string, active = true): Promise<void> {
  await list.openAdd();
  await list.fill(code, name, active);
  await list.saveButton().click();
  await expect(toastLocator(list.page, /^Saved$/)).toBeVisible();
  await expect(list.dialog).toBeHidden();
}

/**
 * The row of `code` after a save; null when the list is full: it shows the
 * first 24 types only, with no paging (found blocker 24).
 */
async function savedRow(list: TypeListPage, code: string) {
  for (let i = 0; i < 2; i++) {
    if (await list.row(code).isVisible()) return list.row(code);
    await list.page.reload();
    await expect(list.heading).toBeVisible();
    await expect(list.rows().first()).toBeVisible();
  }
  if (await list.row(code).isVisible()) return list.row(code);
  expect(await list.rows().count(), 'the type is not listed although the list is not full').toBeGreaterThanOrEqual(24);
  return null;
}

const intro: Record<TypeKind, string> = {
  'Referral types': 'Types a booking may store. This is not a SEP and not a referring hospital.',
  'Cross-consult types': 'A booking still names one consultant or one unit.',
};

const adding = (kind: TypeKind) => async ({ page, qa }: Args) => {
  const list = new TypeListPage(page, kind);
  const code = qa.code('X-01');
  const name = qa.name('X Tipe uji 01');

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Appointment\b/ }).first().click();
    await page.getByRole('complementary').filter({ hasText: 'Appointment' }).getByRole('link', { name: kind, exact: true }).click();
    await expect(list.heading).toBeVisible();
    await expect(list.main).toContainText(intro[kind]);
    await expect(list.addButton).toBeVisible();
    for (const c of ['Code', 'Name', 'Active']) await expect(list.table.getByRole('columnheader', { name: c, exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await list.openAdd();
    await expect(list.code()).toHaveAttribute('required', '');
    await expect(list.name()).toHaveAttribute('required', '');
    await expect(list.active()).toBeChecked();
  });

  await qa.step(3, async () => {
    await list.fill(code, name);
    await list.saveButton().click();
    await expect(toastLocator(page, /^Saved$/)).toBeVisible();
    await expect(list.dialog).toBeHidden();
  });

  const row = await savedRow(list, code);
  if (!row) qa.blocked(4, 24);
  else {
    await qa.step(4, async () => {
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('cell').nth(1)).toHaveText(name);
      await expect(row.getByRole('cell').nth(2)).toHaveText('Yes');
    });
  }

  await qa.step(5, async () => {
    const options = await bookingOptions(page, kind);
    expect(options.some((o) => o.includes(name))).toBe(true);
  });
};

const codeUsed = (kind: TypeKind) => async ({ page, qa }: Args) => {
  const list = new TypeListPage(page, kind);
  const code = qa.code('X-01');
  await list.open();
  await addType(list, code, qa.name('X Tipe uji 01'));

  await qa.step(1, async () => {
    await list.openAdd();
    await list.fill(code, qa.name('X Tipe uji 01'));
    const mark = await toastMark(page);
    await list.saveButton().click();
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    const toasts = await toastsSince(page, mark);
    const open = await list.dialog.isVisible();
    const first = await savedRow(list, code);
    const rows = first ? await list.row(code).count() : null;
    if (rows === null) qa.blocked(1, 24);
    if (toasts.includes('That code or name is already used') && open && (rows ?? 1) === 1) return;
    qa.deviation(
      1,
      'Toast "That code or name is already used"; the dialog stays open; no second row',
      `toast "${toasts.join(' / ')}"; dialog ${open ? 'stays open' : 'closes'}${rows === null ? '' : `; ${rows} row(s) with the code`}`,
    );
    if (rows !== null) expect(rows, 'no second row with the same code').toBe(1);
  });
};

const empty = (kind: TypeKind) => async ({ page, qa }: Args) => {
  const list = new TypeListPage(page, kind);
  await list.open();
  const before = await list.rows().count();

  await qa.step(1, async () => {
    await list.openAdd();
    const posts: string[] = [];
    const onRequest = (r: import('@playwright/test').Request) => {
      if (r.method() === 'POST') posts.push(r.url());
    };
    page.on('request', onRequest);
    await list.saveButton().click();
    // The browser stops the form at the first required field.
    expect(await list.code().evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    await expect(list.dialog).toBeVisible();
    page.off('request', onRequest);
    expect(posts).toEqual([]);
  });

  await qa.step(2, async () => {
    await list.code().fill('   ');
    await list.name().fill('   ');
    const mark = await toastMark(page);
    await list.saveButton().click();
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(await toastsSince(page, mark)).toContain('Save failed');
    await page.reload();
    await expect(list.rows()).toHaveCount(before);
  });
};

const inactive = (kind: TypeKind) => async ({ page, qa }: Args) => {
  const list = new TypeListPage(page, kind);
  const code = qa.code('X-02');
  const name = qa.name('X Tipe nonaktif');
  await list.open();

  await addType(list, code, name, false);
  const row = await savedRow(list, code);
  if (!row) qa.blocked(1, 24);
  else await qa.step(1, () => expect(row.getByRole('cell').nth(2)).toHaveText('No'));

  await qa.step(2, async () => {
    const options = await bookingOptions(page, kind);
    expect(options.some((o) => o.includes(name))).toBe(false);
  });

  qa.notRun(3, 'the workbook marks this step TBD: a type that turns inactive while the dialog is open needs a data fix (no screen sets a type inactive)');
};


for (const [kind, ids] of [
  ['Referral types', ['TC-APP002-019', 'TC-APP002-020', 'TC-APP002-021', 'TC-APP002-022']],
  ['Cross-consult types', ['TC-APP002-023', 'TC-APP002-024', 'TC-APP002-025', 'TC-APP002-026']],
] as [TypeKind, string[]][]) {
  qaTest(ids[0], adding(kind));
  qaTest(ids[1], codeUsed(kind));
  qaTest(ids[2], empty(kind));
  qaTest(ids[3], inactive(kind));
}
