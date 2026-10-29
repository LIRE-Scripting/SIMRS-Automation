import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { deskEmployee, idOf, leave, NLK, profile, SAVED, TC_APP010_042, YEAR } from './desk-cases';

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


qaTest('TC-APP010-040', async ({ page, qa }) => {
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

qaTest('TC-APP010-042', TC_APP010_042);

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
  const opened = await l.save({ ...YEAR, 'Employee no': no, 'Leave / shift': type }, 'Year balance');
  if (!opened.includes(SAVED)) {
    // The year balance answers HTTP 500 (found blocker 43): no balance for the second-balance refusal.
    qa.note(4, `the balance of the test: "${opened.join(' / ').slice(0, 80)}"`);
    qa.blocked(4, 43);
    return;
  }
  await qa.step(4, async () => {
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
    if (!id) qa.deviation(1, 'Toast "Saved."; a row for the comp-off with an id', `"Saved.", but the list shows no row of ${no}`);
  });
  if (!id) {
    qa.notRun(2, 'the saved comp-off is listed nowhere, so its id for "Approve comp-off" is not known');
    return;
  }

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
