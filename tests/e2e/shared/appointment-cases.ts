import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import {
  bookSettings,
  claimDDay,
  type DDayNeed,
  DR1_TIMES,
  ensureMasterData,
  registerPatient,
  releaseWeek,
  SHARED,
  storableBookSettings,
  UNIT1_TIMES,
} from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { addDays, hourWib, todayWib, weekdayOf } from '../../../lib/dates';
import { authFileOf } from '../../../lib/config';
import { AppointmentsPage, to24h, weekLabelOf, whenText } from '../../../pages/ambulatory/AppointmentsPage';
import { MasterListPage } from '../../../pages/settings/MasterListPage';


const TYPE = bookSettings().types[0].name;

/**
 * The appointment test cases, written once and declared by two workbooks
 * whose steps are word for word the same:
 * 01-ambulatory-care.xlsx (Appointments, /registration/appointments) and
 * 02-appointment.xlsx (Appointments, /appointment/schedule).
 *
 * Shared data (00-test-data.xlsx | Catalogue, DEP-1/DEP-2, DR-1/DR-2,
 * UNIT-1, Book settings, D-day): made once and reused
 * (lib/ambulatory-data.ts); the Book settings are written back to the
 * workbook's set before a file runs (the consultant rows only: unit rows
 * cannot be set, found blocker 17). Each test registers its own patients and
 * claims its own D-day.
 */

type Body = (args: { page: Page; qa: Qa }, route: string) => Promise<void>;

/** Mondays claimed by the running test; their QA bookings are cancelled after it (releaseWeek). */
const claimed: string[] = [];

async function claim(page: Page, need?: DDayNeed): Promise<string> {
  const monday = await claimDDay(page, need);
  claimed.push(monday);
  return monday;
}

// ------------------------------------------------------------------ helpers

type Patient = { mrn: string; fullName: string };

/** Books a patient with DR-1 (DEP-1 unless given) and returns to the list. */
async function bookDr1(appts: AppointmentsPage, p: Patient, date: string, time?: string, department: string = SHARED.dep1.name) {
  await appts.open();
  await appts.book({ patient: p.fullName, department, resource: SHARED.dr1.name, type: TYPE, date, time });
}

/** Opens "Book" with everything but the time filled; returns the dialog. */
async function openBookFor(
  appts: AppointmentsPage,
  p: Patient,
  date: string,
  resource: string = SHARED.dr1.name,
  kind: 'Consultant' | 'Unit' = 'Consultant',
) {
  await appts.open();
  const d = await appts.openBook();
  await appts.fillBook({ patient: p.fullName, department: SHARED.dep1.name, kind, resource, type: TYPE, date }, d);
  return d;
}

/** Toasts shown after `mark`, waiting up to 5 s for the first one ([] when none came). */
async function toastsAfter(page: import('@playwright/test').Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 5_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

async function statusOf(appts: AppointmentsPage, p: Patient): Promise<string> {
  const r = (await appts.allRowTexts()).find((x) => x.Patient === p.fullName);
  if (!r) throw new Error(`${p.fullName} not in the list`);
  return r.Status;
}

const NO_TIME = ['No open time inside the quota'];

// ---------------------------------------------------------------- schedule






// --------------------------------------------------------------- negatives










async function cashierCell(list: MasterListPage, row: import('@playwright/test').Locator, column: string) {
  const headers = (await list.main.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
  return row.getByRole('cell').nth(headers.indexOf(column));
}

export const CASES = {
  bookSettings: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const s = bookSettings();
    await appts.open();
    // Precondition "No book settings yet": every row emptied and saved.
    await appts.writeBookSettings({ types: [], quota: [], hours: [] });
    let d = appts.bookSettingsDialog();

    await qa.step(1, async () => {
      d = await appts.openBookSettings();
      for (const t of ['Appointment types', 'Daily quota', 'Open hours'] as const) {
        await expect(appts.section(d, t)).toBeVisible();
      }
    });

    await qa.step(2, async () => {
      const types = appts.settingRows(d, 'Appointment types');
      const before = await types.count();
      await appts.section(d, 'Appointment types').getByRole('button', { name: 'Add type' }).click();
      await appts.section(d, 'Appointment types').getByRole('button', { name: 'Add type' }).click();
      await expect(types).toHaveCount(before + 2);
      if (before) qa.deviation(2, 'Two rows', `${before + 2} rows: the dialog already shows ${before} empty row(s)`);
      await appts.setTypeRow(types.nth(0), s.types[0].name, s.types[0].minutes);
      await appts.setTypeRow(types.nth(1), s.types[1].name, s.types[1].minutes);
    });

    // Rows whose kind is "Unit" cannot be set today (found blocker 17); they are tried and left out.
    let unitTaken = true;
    const fillResource = async (row: import('@playwright/test').Locator, kind: 'Consultant' | 'Unit', resource: string) => {
      if (!(await appts.setKind(row, kind))) {
        unitTaken = false;
        await row.locator('select').nth(1).selectOption({ label: 'Select…' });
        return false;
      }
      await row.locator('select').nth(1).selectOption({ label: resource });
      return true;
    };

    await qa.step(3, async () => {
      const quota = appts.settingRows(d, 'Daily quota');
      const before = await quota.count();
      for (const [i, q] of s.quota.entries()) {
        if (i >= before) await appts.section(d, 'Daily quota').getByRole('button', { name: 'Add quota' }).click();
        if (await fillResource(quota.nth(i), q.kind, q.resource)) {
          await quota.nth(i).getByRole('spinbutton', { name: 'Max per day' }).fill(String(q.max));
        }
      }
      await expect(quota).toHaveCount(Math.max(before, s.quota.length));
      if (!unitTaken) qa.blocked(3, 17);
    });

    await qa.step(4, async () => {
      unitTaken = true;
      const hours = appts.settingRows(d, 'Open hours');
      const before = await hours.count();
      for (const [i, h] of s.hours.entries()) {
        if (i >= before) await appts.section(d, 'Open hours').getByRole('button', { name: 'Add hours' }).click();
        const row = hours.nth(i);
        if (!(await fillResource(row, h.kind, h.resource))) continue;
        await row.getByRole('combobox', { name: 'Weekday' }).selectOption({ label: h.weekday });
        await row.getByRole('textbox', { name: 'From' }).fill(h.from);
        await row.getByRole('textbox', { name: 'To' }).fill(h.to);
      }
      await expect(hours).toHaveCount(Math.max(before, s.hours.length));
      if (!unitTaken) qa.blocked(4, 17);
    });

    await qa.step(5, () => appts.saveBookSettings(d));

    await qa.step(6, async () => {
      await appts.openHours.getByRole('radio', { name: 'Consultant' }).check();
      await appts.pick(appts.openHours.getByRole('combobox', { name: 'Consultant' }), SHARED.dr1.name);
      const panel = appts.openHours;
      await expect(panel).toContainText(/Sunday\s*—/);
      for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
        await expect(panel).toContainText(new RegExp(`${day}\\s*08:00–12:00`));
      }
      await expect(panel).toContainText(/Saturday\s*—/);
    });
  },

  bookConsultant: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token(), SHARED.pt1.dateOfBirth);
    await appts.open();
    const dDay = await claim(page);
    await appts.open();
    let d = appts.bookDialog();

    await qa.step(1, async () => {
      d = await appts.openBook();
      for (const f of ['Patient', 'Department', 'Consultant or unit'] as const) await expect(appts.field(d, f)).toBeVisible();
      await expect(appts.kindRadio(d, 'Consultant')).toBeChecked();
      await expect(appts.kindRadio(d, 'Unit')).not.toBeChecked();
      await expect(appts.typeSelect(d)).toBeVisible();
      await expect(appts.dateField(d)).toBeVisible();
      await expect(appts.openTime(d)).toBeVisible();
      await expect(appts.submitBook(d)).toBeDisabled();
    });

    await qa.step(2, async () => {
      await appts.pick(appts.field(d, 'Patient'), pt1.fullName.split(' ').slice(-2).join(' '), pt1.mrn);
      await expect(appts.field(d, 'Patient')).toHaveValue(new RegExp(`${pt1.mrn}.*${pt1.fullName}`));
    });

    await qa.step(3, async () => {
      await appts.pick(appts.field(d, 'Department'), 'poli', SHARED.dep1.name);
      await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.dr1.name);
      await expect(appts.field(d, 'Department')).toHaveValue(new RegExp(SHARED.dep1.name));
      await expect(appts.field(d, 'Consultant or unit')).toHaveValue(new RegExp(SHARED.dr1.name));
    });

    await qa.step(4, async () => {
      await appts.typeSelect(d).selectOption({ label: TYPE });
      await appts.dateField(d).fill(dDay);
      await expect.poll(() => appts.openTimes(d)).toEqual(DR1_TIMES);
      await expect(appts.openTime(d)).toHaveValue(/08:00/);
      await expect(appts.submitBook(d)).toBeEnabled();
    });

    await qa.step(5, async () => {
      await appts.submitBook(d).click();
      await expect(page.getByRole('status').filter({ hasText: /^Appointment booked$/ })).toBeVisible();
      await expect(d).toBeHidden();
    });

    await qa.step(6, async () => {
      await appts.showRange(dDay);
      const mine = (await appts.allRowTexts()).filter((r) => r.Patient === pt1.fullName);
      expect(mine).toHaveLength(1);
      const cells = mine[0];
      expect(cells).toMatchObject({
        Patient: pt1.fullName,
        MRN: pt1.mrn,
        Block: '08:00–08:30',
        Department: SHARED.dep1.name,
        Consultant: SHARED.dr1.name,
        Type: TYPE,
        Status: 'Waiting',
      });
      expect(cells.When).toBe(whenText(dDay, '08:00'));
      expect(cells.Token).toMatch(/^T-/);
    });
  },

  bookUnit: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt2 = await registerPatient(page, SHARED.pt2.name, qa.token());
    const dDay = await claim(page);
    await appts.open();
    let d = appts.bookDialog();

    await qa.step(1, async () => {
      d = await appts.openBook();
      await appts.pick(appts.field(d, 'Patient'), pt2.fullName, pt2.mrn);
      await appts.pick(appts.field(d, 'Department'), SHARED.dep1.name);
      await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.dr1.name);
      await d.getByRole('radiogroup').getByText('Unit', { exact: true }).click();
      await expect(appts.kindRadio(d, 'Unit')).toBeChecked();
      await expect(appts.field(d, 'Consultant or unit')).toHaveValue('');
    });

    await qa.step(2, async () => {
      await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.unit1.name);
      await appts.typeSelect(d).selectOption({ label: TYPE });
      await appts.dateField(d).fill(dDay);
    });
    if ((await appts.settledOpenTimes(d)).join() !== UNIT1_TIMES.join()) {
      // UNIT-1 has no open hours: they cannot be set (found blocker 17).
      await expect(appts.openTime(d)).toHaveValue('');
      expect(await appts.openTimes(d)).toEqual(['No open time inside the quota']);
      for (const n of [2, 3, 4]) qa.blocked(n, 17);
      return;
    }

    await qa.step(3, async () => {
      await appts.submitBook(d).click();
      await expect(page.getByRole('status').filter({ hasText: /^Appointment booked$/ })).toBeVisible();
    });

    await qa.step(4, async () => {
      await appts.showRange(dDay);
      const r = (await appts.allRowTexts()).find((x) => x.Patient === pt2.fullName);
      expect(r).toBeDefined();
      expect(r!.When).toBe(whenText(dDay, '09:00'));
      expect(r!.Block).toBe('09:00–09:30');
      if (!Object.values(r!).includes(SHARED.unit1.name)) {
        qa.deviation(4, 'the unit named in the row', `no column names the unit; Consultant shows "${r!.Consultant}"`);
      }
    });
  },

  scheduleList: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const t = qa.token();
    const pts = [
      await registerPatient(page, SHARED.pt1.name, t),
      await registerPatient(page, SHARED.pt2.name, t),
      await registerPatient(page, SHARED.pt3.name, t),
    ];
    const later = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page);
    for (const [i, p] of pts.entries()) await bookDr1(appts, p, dDay, DR1_TIMES[i]);
    await bookDr1(appts, later, addDays(dDay, 1));

    await qa.step(1, async () => {
      await appts.open();
      await expect(appts.tab('Schedule')).toHaveAttribute('aria-selected', 'true');
      await expect(appts.fromDate).toHaveValue(todayWib());
      await expect(appts.toDate).toHaveValue(todayWib());
      if ((await appts.rows().count()) === 0) await expect(appts.table).toContainText('No appointments in this view.');
    });

    await qa.step(2, async () => {
      await appts.showRange(dDay);
      const ours = (await appts.allRowTexts()).filter((r) => r.Patient.endsWith(t));
      expect(ours.map((r) => r.When)).toEqual([whenText(dDay, '09:00'), whenText(dDay, '08:30'), whenText(dDay, '08:00')]);
      await expect(appts.pagingSummary).toHaveText(/^Showing 1–\d+ of \d+$/);
      qa.blocked(2, 18);
    });

    await qa.step(3, async () => {
      await appts.showRange(dDay, addDays(dDay, 6));
      const names = (await appts.allRowTexts()).map((r) => r.Patient);
      for (const p of [...pts, later]) expect(names).toContain(p.fullName);
    });

    await qa.step(4, async () => {
      await appts.pageWith([pts[0].fullName, pts[1].fullName]);
      await appts.row(pts[0].fullName).getByRole('checkbox').check();
      await appts.row(pts[1].fullName).getByRole('checkbox').check();
      await expect(appts.selectionBar()).toHaveText('2 selected');
      await expect(appts.rescheduleButton()).toBeVisible();
      await expect(appts.cancelSelectedButton()).toBeVisible();
    });

    await qa.step(5, async () => {
      await appts.selectAll.check();
      for (const c of await appts.rows().getByRole('checkbox').all()) await expect(c).toBeChecked();
    });

    qa.blocked(6, 18);
  },

  calendars: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const t = qa.token();
    const pts = [
      await registerPatient(page, SHARED.pt1.name, t),
      await registerPatient(page, SHARED.pt2.name, t),
      await registerPatient(page, SHARED.pt3.name, t),
    ];
    const dDay = await claim(page, 'fresh');
    await bookDr1(appts, pts[0], dDay, '08:00');
    await bookDr1(appts, pts[1], dDay, '08:30');
    await bookDr1(appts, pts[2], dDay, '09:00', SHARED.dep2.name);
    await appts.open();
    // D-day here is the first weekday with no booking at all (lib/ambulatory-data.ts, "fresh").
  const dayIndex = weekdayOf(dDay);
  if (dayIndex !== 1) qa.note(1, `D-day is ${dDay}, a weekday other than Monday: every Monday in the bookable year already holds (cancelled) rows`);

    await qa.step(1, async () => {
      await appts.tab('Calendar').click();
      await appts.goToWeekOf(dDay, todayWib());
      await expect(appts.calendarDays()).toHaveCount(7);
      for (const [i, day] of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].entries()) {
        await expect(appts.calendarDays().nth(i)).toContainText(day);
      }
      // A box lists four bookings, then "+N" for the rest: the badge counts both.
      const shown = await appts.dayItems(appts.calendarDays()).count();
      const more = (await appts.calendarDays().getByText(/^\+\s*\d+/).allInnerTexts()).reduce((sum, t) => sum + Number(t.replace(/\D/g, '')), 0);
      await expect(appts.weekBadge()).toHaveText(`${shown + more} appointments`);
    });

    await qa.step(2, async () => {
      const box = appts.calendarDays().nth(dayIndex);
      for (const [p, time] of [[pts[0], '08:00'], [pts[1], '08:30'], [pts[2], '09:00']] as const) {
        const item = appts.dayItems(box).filter({ hasText: p.fullName });
        await expect(item).toHaveCount(1);
        expect(to24h(await item.locator('p').first().innerText())).toBe(time);
      }
      qa.blocked(2, 18);
    });

    await qa.step(3, async () => {
      await appts.weekButton('Today').click();
      await expect(appts.weekLabel()).toHaveText(weekLabelOf(todayWib()));
      const today = appts.calendarDays().nth(weekdayOf(todayWib()));
      const other = appts.calendarDays().nth((weekdayOf(todayWib()) + 1) % 7);
      expect(await today.getAttribute('class')).not.toBe(await other.getAttribute('class'));
    });

    await qa.step(4, async () => {
      await appts.tab('OPD calendar').click();
      await appts.goToWeekOf(dDay, todayWib());
      const dep1 = appts.opdCells(appts.opdLine(SHARED.dep1.name));
      const dep2 = appts.opdCells(appts.opdLine(SHARED.dep2.name));
      await expect(dep1).toHaveCount(7);
      await expect(appts.dayItems(dep1.nth(dayIndex))).toHaveCount(2);
      await expect(appts.dayItems(dep2.nth(dayIndex))).toHaveCount(1);
      await expect(dep2.nth(dayIndex)).toContainText(pts[2].fullName);
      qa.blocked(4, 18);
    });

    await qa.step(5, async () => {
      await appts.weekButton('Today').click();
      let shown = '';
      for (let i = 0; i < 26 && !/^0 appointments$/.test(await appts.weekBadge().innerText()); i++) {
        shown = await appts.weekLabel().innerText();
        await appts.weekButton('Previous week').click();
        await expect(appts.weekLabel()).not.toHaveText(shown);
      }
      await expect(appts.weekBadge()).toHaveText('0 appointments');
      await expect(appts.main.getByText('No appointments in this view.')).toBeVisible();
    });
  },

  reschedule: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page);
    await bookDr1(appts, pt1, dDay, '08:00');
    await appts.showRange(dDay);
    const token = (await appts.allRowTexts()).find((r) => r.Patient === pt1.fullName)!.Token;
    const d = page.getByRole('dialog', { name: 'Reschedule' });

    await qa.step(1, async () => {
      await appts.pageWith([pt1.fullName]);
      await appts.row(pt1.fullName).getByRole('checkbox').check();
      await appts.rescheduleButton().click();
      await expect(d).toBeVisible();
      await expect(d).toContainText('Moves every selected row to one open time.');
      await expect(d.getByRole('textbox', { name: 'Date' })).toBeVisible();
      await expect(d.getByRole('combobox', { name: 'Open time' })).toBeVisible();
    });

    await qa.step(2, async () => {
      await d.getByRole('textbox', { name: 'Date' }).fill(addDays(dDay, 1));
      expect(await appts.settledOpenTimes(d)).toEqual(DR1_TIMES);
    });

    await qa.step(3, async () => {
      await d.getByRole('combobox', { name: 'Open time' }).selectOption({ label: '09:00' });
      await d.getByRole('button', { name: 'Reschedule', exact: true }).click();
      await expect(toastLocator(page, /^Appointments rescheduled$/)).toBeVisible();
      await expect.poll(async () => (await appts.allRowTexts()).map((r) => r.Patient)).not.toContain(pt1.fullName);
    });

    await qa.step(4, async () => {
      await appts.showRange(addDays(dDay, 1));
      const r = (await appts.allRowTexts()).find((x) => x.Patient === pt1.fullName);
      expect(r).toMatchObject({ When: whenText(addDays(dDay, 1), '09:00'), Block: '09:00–09:30', Status: 'Waiting', Token: token });
    });
  },

  cancel: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const t = qa.token();
    const booked = [
      await registerPatient(page, SHARED.pt1.name, t),
      await registerPatient(page, SHARED.pt2.name, t),
      await registerPatient(page, SHARED.pt1.name, qa.token()),
    ];
    const pt3 = await registerPatient(page, SHARED.pt3.name, t);
    const dDay = await claim(page);
    for (const [i, p] of booked.entries()) await bookDr1(appts, p, dDay, DR1_TIMES[i]);

    await qa.step(1, async () => {
      const d = await openBookFor(appts, pt3, dDay);
      expect(await appts.settledOpenTimes(d)).toEqual(NO_TIME);
      await d.getByRole('button', { name: 'Cancel' }).click();
    });

    await qa.step(2, async () => {
      await appts.showRange(dDay);
      await appts.pageWith([booked[1].fullName]);
      await appts.row(booked[1].fullName).getByRole('checkbox').check();
      await appts.cancelSelectedButton().click();
      await expect(toastLocator(page, /^Appointments cancelled$/)).toBeVisible();
      await appts.pageWith([booked[1].fullName]);
      await expect(appts.row(booked[1].fullName)).toHaveCount(1);
      const status = await appts.cell(appts.row(booked[1].fullName), 'Status');
      await expect(status).toHaveText('Cancelled');
      // "red": the status text is drawn in a colour whose red part dominates.
      const [r, g, b] = (await status.locator('*').last().evaluate((e) => getComputedStyle(e).color)).match(/\d+/g)!.map(Number);
      expect(r).toBeGreaterThan(Math.max(g, b));
    });

    let d = appts.bookDialog();
    await qa.step(3, async () => {
      d = await openBookFor(appts, pt3, dDay);
      expect(await appts.settledOpenTimes(d)).not.toEqual(NO_TIME);
    });

    await qa.step(4, async () => {
      await appts.submitBook(d).click();
      await expect(toastLocator(page, /^Appointment booked$/)).toBeVisible();
    });
  },

  block: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page);
    await appts.open();
    const d = appts.blockDialog();

    await qa.step(1, async () => {
      await appts.openBlock();
      await expect(d).toContainText('A blocked slot is time that consultant cannot be booked.');
      await expect(d.getByRole('combobox', { name: 'Consultant' }).getByRole('option', { name: SHARED.dr1.name })).toBeAttached();
      await expect(d.getByRole('textbox', { name: 'From' })).toBeVisible();
      await expect(d.getByRole('textbox', { name: 'To' })).toBeVisible();
      await expect(d.getByRole('button', { name: 'Block', exact: true })).toBeDisabled();
    });

    await qa.step(2, async () => {
      await appts.fillBlock(d, SHARED.dr1.name, `${dDay}T10:00`, `${dDay}T11:00`);
      await d.getByRole('button', { name: 'Block', exact: true }).click();
      await expect(toastLocator(page, /^Consultant blocked$/)).toBeVisible();
    });

    await qa.step(3, async () => {
      const b = await openBookFor(appts, pt1, dDay);
      expect(await appts.settledOpenTimes(b)).toEqual(['08:00', '08:30', '09:00', '09:30', '11:00', '11:30']);
    });

    await qa.step(4, async () => {
      const b = await openBookFor(appts, pt1, dDay, SHARED.unit1.name, 'Unit');
      const times = await appts.settledOpenTimes(b);
      if (times.join() === NO_TIME.join()) return qa.blocked(4, 17);
      expect(times).toEqual(expect.arrayContaining(['10:00', '10:30']));
    });
  },

  noOpenTime: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page, 'unbooked');
    await appts.open();
    await appts.block(SHARED.dr1.name, `${dDay}T08:00`, `${dDay}T12:00`);
    const d = await openBookFor(appts, pt1, dDay, SHARED.dr2.name);

    await qa.step(1, async () => {
      expect(await appts.settledOpenTimes(d)).toEqual(NO_TIME);
      await expect(appts.submitBook(d)).toBeDisabled();
    });

    await qa.step(2, async () => {
      await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.dr1.name);
      await appts.dateField(d).fill(addDays(dDay, -1));
      expect(await appts.settledOpenTimes(d)).toEqual(NO_TIME);
    });

    await qa.step(3, async () => {
      await appts.dateField(d).fill(dDay);
      expect(await appts.settledOpenTimes(d)).toEqual(NO_TIME);
    });

    await qa.step(4, async () => {
      await d.getByRole('radiogroup').getByText('Unit', { exact: true }).click();
      await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.unit1.name);
      await appts.dateField(d).fill(addDays(dDay, 1));
      expect(await appts.settledOpenTimes(d)).toEqual(NO_TIME);
      // The same text shows on UNIT-1's Monday as well: it has no open hours at all.
      await appts.dateField(d).fill(dDay);
      if ((await appts.settledOpenTimes(d)).join() === NO_TIME.join()) qa.blocked(4, 17);
    });
  },

  sameTime: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const t = qa.token();
    const pt1 = await registerPatient(page, SHARED.pt1.name, t);
    const pt2 = await registerPatient(page, SHARED.pt2.name, t);
    const dDay = await claim(page);

    await qa.step(1, () => bookDr1(appts, pt1, dDay, '08:00'));

    await qa.step(2, async () => {
      const d = await openBookFor(appts, pt2, dDay);
      const times = await appts.settledOpenTimes(d);
      if (times.includes('08:00')) {
        qa.deviation(2, '08:00 is no longer offered', `08:00 is still offered${(await appts.openTime(d).inputValue()).includes('08:00') ? ' and chosen first' : ''}`);
      }
      await d.getByRole('button', { name: 'Cancel' }).click();
    });

    await qa.step(3, async () => {
      const d = await openBookFor(appts, pt1, dDay);
      await appts.openTime(d).selectOption({ label: '08:00' });
      const mark = await toastMark(page);
      await appts.submitBook(d).click();
      const toasts = await toastsAfter(page, mark);
      if (toasts.includes('Appointment booked')) {
        qa.deviation(3, 'A warning that PT-1 already has this appointment', 'booked a second time (toast "Appointment booked")');
        await appts.showRange(dDay);
        expect((await appts.allRowTexts()).filter((r) => r.Patient === pt1.fullName)).toHaveLength(2);
      } else {
        expect(toasts.join(' ')).toMatch(/already/i);
      }
    });
  },

  pastDay: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    // The last working day before today (DR-1 is open Monday to Friday).
    let past = addDays(todayWib(), -1);
    while ([0, 6].includes(weekdayOf(past))) past = addDays(past, -1);

    await qa.step(1, async () => {
      const d = await openBookFor(appts, pt1, past);
      const min = await appts.dateField(d).getAttribute('min');
      const times = await appts.settledOpenTimes(d);
      if (!(min && min > past) && times.join() !== NO_TIME.join()) {
        qa.deviation(1, 'The past day cannot be chosen, or no open time is offered', `${past} can be chosen and offers ${times.join(', ')}`);
      }
      await d.getByRole('button', { name: 'Cancel' }).click();
    });

    await qa.step(2, async () => {
      const today = todayWib();
      if ([0, 6].includes(weekdayOf(today)) || hourWib() < 12) {
        return qa.notRun(2, `needs a run on a weekday after 12:00 WIB (now ${today}, ${hourWib()}:00)`);
      }
      const d = await openBookFor(appts, pt1, today);
      const times = await appts.settledOpenTimes(d);
      if (times.join() !== NO_TIME.join()) qa.deviation(2, 'No open time for today', `today's morning times are offered: ${times.join(', ')}`);
      await d.getByRole('button', { name: 'Cancel' }).click();
    });
  },

  incompleteForm: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page);
    await appts.open();
    const d = await appts.openBook();

    await qa.step(1, () => expect(appts.submitBook(d)).toBeDisabled());

    /** Clicks Book (when it can be clicked) and reports what was shown. */
    const tryBook = async (step: number) => {
      if (await appts.submitBook(d).isDisabled()) {
        qa.deviation(step, 'A message that the department is missing', '"Book" is disabled; no message');
        return;
      }
      const mark = await toastMark(page);
      await appts.submitBook(d).click();
      const toasts = await toastsAfter(page, mark);
      await expect(d).toBeVisible();
      const shown = toasts.join(' ') || (await d.getByText(/department/i).allInnerTexts()).filter((x) => x !== 'Department').join(' ');
      if (!/department/i.test(shown)) qa.deviation(step, 'A message that the department is missing', 'the click does nothing: no message, the dialog stays open');
    };

    await qa.step(2, async () => {
      await appts.pick(appts.field(d, 'Patient'), pt1.fullName);
      await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.dr1.name);
      await appts.typeSelect(d).selectOption({ label: TYPE });
      await appts.dateField(d).fill(dDay);
      await appts.settledOpenTimes(d);
      await tryBook(2);
    });

    await qa.step(3, async () => {
      await appts.field(d, 'Department').fill('poli');
      await tryBook(3);
    });

    await qa.step(4, async () => {
      await appts.pick(appts.field(d, 'Department'), 'poli', SHARED.dep1.name);
      await appts.submitBook(d).click();
      await expect(toastLocator(page, /^Appointment booked$/)).toBeVisible();
    });
  },

  rescheduleRefused: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const t = qa.token();
    const pt1 = await registerPatient(page, SHARED.pt1.name, t);
    const pt2 = await registerPatient(page, SHARED.pt2.name, t);
    const pt3 = await registerPatient(page, SHARED.pt3.name, t);
    const dDay = await claim(page);
    const next = addDays(dDay, 1);
    await bookDr1(appts, pt1, dDay, '08:00');
    await bookDr1(appts, pt3, dDay, '08:30');
    for (const [i, p] of [pt1, pt2, pt3].entries()) await bookDr1(appts, p, next, DR1_TIMES[i]);
    await appts.showRange(dDay);
    await appts.pageWith([pt3.fullName]);
    await appts.row(pt3.fullName).getByRole('checkbox').check();
    await appts.cancelSelectedButton().click();
    await expect(toastLocator(page, /^Appointments cancelled$/)).toBeVisible();
    await page.reload();
    await appts.showRange(dDay);
    const d = page.getByRole('dialog', { name: 'Reschedule' });

    // Step 1 needs PT-2 booked with UNIT-1, which cannot be made (found blocker 17).
    qa.blocked(1, 17);

    await qa.step(2, async () => {
      await appts.pageWith([pt1.fullName]);
      await appts.row(pt1.fullName).getByRole('checkbox').check();
      await appts.rescheduleButton().click();
      await d.getByRole('textbox', { name: 'Date' }).fill(next);
      expect(await appts.settledOpenTimes(d)).toEqual(NO_TIME);
      await expect(d.getByRole('button', { name: 'Reschedule', exact: true })).toBeDisabled();
      await d.getByRole('button', { name: 'Cancel' }).click();
      await appts.row(pt1.fullName).getByRole('checkbox').uncheck();
    });

    await qa.step(3, async () => {
      await appts.pageWith([pt3.fullName]);
      await appts.row(pt3.fullName).getByRole('checkbox').check();
      await appts.rescheduleButton().click();
      await d.getByRole('textbox', { name: 'Date' }).fill(addDays(dDay, 2));
      expect((await appts.settledOpenTimes(d))[0]).toBe('08:00');
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Reschedule', exact: true }).click();
      const toasts = await toastsAfter(page, mark);
      expect(toasts).not.toContain('Appointments rescheduled');
      if (!toasts.some((x) => /cancel/i.test(x))) {
        qa.deviation(3, 'Refused: a cancelled appointment cannot be moved', `refused with toast "${toasts.join(' / ')}"`);
      }
      await page.reload();
      await appts.showRange(dDay);
      expect(await statusOf(appts, pt3)).toBe('Cancelled');
    });
  },

  cancelWithoutQuestion: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const t = qa.token();
    const [a, b, c] = [
      await registerPatient(page, SHARED.pt1.name, t),
      await registerPatient(page, SHARED.pt2.name, t),
      await registerPatient(page, SHARED.pt3.name, t),
    ];
    const dDay = await claim(page);
    for (const [i, p] of [a, b, c].entries()) await bookDr1(appts, p, dDay, DR1_TIMES[i]);
    await appts.showRange(dDay);
    await appts.pageWith([c.fullName]);
    await appts.row(c.fullName).getByRole('checkbox').check();
    await appts.cancelSelectedButton().click();
    await expect(toastLocator(page, /^Appointments cancelled$/)).toBeVisible();
    await page.reload();
    await appts.showRange(dDay);

    await qa.step(1, async () => {
      await appts.pageWith([a.fullName]);
      await appts.row(a.fullName).getByRole('checkbox').check();
      const mark = await toastMark(page);
      await appts.cancelSelectedButton().click();
      const question = page.getByRole('dialog').or(page.getByRole('alertdialog'));
      if (await question.isVisible()) {
        await expect(question.getByRole('textbox')).toBeVisible();
        return;
      }
      expect(await toastsAfter(page, mark)).toContain('Appointments cancelled');
      qa.deviation(1, 'A question to confirm, with a place for the reason', 'cancelled at once: no question, no reason');
    });

    await qa.step(2, async () => {
      await page.reload();
      await appts.showRange(dDay);
      await appts.pageWith([a.fullName]);
      const row = appts.row(a.fullName);
      await expect(row.getByRole('button')).toHaveCount(0);
      await expect(appts.main.getByRole('button', { name: /restore|undo|reinstate|uncancel/i })).toHaveCount(0);
      qa.deviation(2, 'Present, or a note that it must be booked again', 'no way to bring it back and no note');
    });

    await qa.step(3, async () => {
      await appts.pageWith([c.fullName, b.fullName]);
      await appts.row(c.fullName).getByRole('checkbox').check();
      await appts.row(b.fullName).getByRole('checkbox').check();
      const mark = await toastMark(page);
      await appts.cancelSelectedButton().click();
      const toasts = await toastsAfter(page, mark);
      await page.reload();
      await appts.showRange(dDay);
      const bStatus = await statusOf(appts, b);
      if (bStatus !== 'Waiting') {
        qa.deviation(3, 'Refused; the active row stays as it is', `the active row became "${bStatus}" (toast "${toasts.join(' / ')}")`);
        return;
      }
      expect(toasts).not.toContain('Appointments cancelled');
      if (!toasts.some((x) => /cancel/i.test(x))) qa.deviation(3, 'Refused', `refused with toast "${toasts.join(' / ')}"`);
    });
  },

  settingsInvalid: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const s = bookSettings();
    await appts.open();
    let d = appts.bookSettingsDialog();

    /** Saves the open dialog and tells what happened. */
    const trySave = async () => {
      const invalid = await d.locator('input:invalid').count();
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Save settings' }).click();
      if (invalid) return { invalid, toasts: [] as string[], open: await d.isVisible() };
      const toasts = await toastsAfter(page, mark);
      return { invalid, toasts, open: await d.isVisible() };
    };

    try {
      await qa.step(1, async () => {
        d = await appts.openBookSettings();
        const types = appts.settingRows(d, 'Appointment types');
        const n = await types.count();
        await appts.section(d, 'Appointment types').getByRole('button', { name: 'Add type' }).click();
        await appts.setTypeRow(types.nth(n), s.types[0].name);
        const r = await trySave();
        expect(r.toasts).not.toContain('Book settings saved');
        expect(r.open).toBe(true);
        if (!r.toasts.some((x) => /name|exist|repeat|duplicate/i.test(x))) {
          qa.deviation(1, 'Refused with a message about the repeated name', `refused with toast "${r.toasts.join(' / ')}"`);
        }
      });

      await qa.step(2, async () => {
        const row = appts.settingRows(d, 'Appointment types').last();
        const remove = row.getByRole('button');
        if ((await remove.count()) === 0) {
          qa.deviation(2, 'A remove button on each row', 'no remove button; the row is taken out by emptying its name');
          await appts.setTypeRow(row, '');
        } else {
          await remove.click();
        }
      });

      await qa.step(3, async () => {
        const quota = appts.settingRows(d, 'Daily quota');
        const q = await quota.count();
        await appts.section(d, 'Daily quota').getByRole('button', { name: 'Add quota' }).click();
        await appts.setResource(quota.nth(q), 'Consultant', SHARED.dr2.name);
        await quota.nth(q).getByRole('spinbutton', { name: 'Max per day' }).fill('0');
        const hours = appts.settingRows(d, 'Open hours');
        const h = await hours.count();
        await appts.section(d, 'Open hours').getByRole('button', { name: 'Add hours' }).click();
        await appts.setResource(hours.nth(h), 'Consultant', SHARED.dr2.name);
        await hours.nth(h).getByRole('combobox', { name: 'Weekday' }).selectOption({ label: 'Tuesday' });
        await hours.nth(h).getByRole('textbox', { name: 'From' }).fill('16:00');
        await hours.nth(h).getByRole('textbox', { name: 'To' }).fill('08:00');
        const r = await trySave();
        if (r.toasts.includes('Book settings saved')) {
          qa.deviation(3, 'Refused with a message for each row', 'saved (toast "Book settings saved"); the wrong rows are dropped without a word');
        } else if (r.invalid) {
          qa.deviation(3, 'Refused with a message for each row', `the browser stops the save at the field "Max per day" (minimum 1); the hours row gets no message`);
          await quota.nth(q).locator('select').nth(1).selectOption({ label: 'Select…' });
          await hours.nth(h).locator('select').nth(1).selectOption({ label: 'Select…' });
        } else {
          expect(r.open).toBe(true);
        }
      });

      await qa.step(4, async () => {
        if (!(await d.isVisible())) d = await appts.openBookSettings();
        const quota = appts.settingRows(d, 'Daily quota');
        const q = await quota.count();
        await appts.section(d, 'Daily quota').getByRole('button', { name: 'Add quota' }).click();
        await appts.setResource(quota.nth(q), 'Consultant', SHARED.dr1.name);
        await quota.nth(q).getByRole('spinbutton', { name: 'Max per day' }).fill('5');
        const r = await trySave();
        expect(r.toasts).not.toContain('Book settings saved');
        if (!r.toasts.some((x) => /quota|consultant|once|one/i.test(x))) {
          qa.deviation(4, 'Refused: one quota per consultant', `refused with toast "${r.toasts.join(' / ')}"`);
        }
      });
    } finally {
      // Back to the shared Book settings for the other tests.
      await appts.open();
      await appts.writeBookSettings(storableBookSettings());
    }
  },

  blockWrong: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page, '08:00');
    await bookDr1(appts, pt1, dDay, '08:00');
    const d = appts.blockDialog();

    await qa.step(1, async () => {
      await appts.openBlock();
      await appts.fillBlock(d, SHARED.dr1.name, `${dDay}T11:00`, `${dDay}T10:00`);
      const block = d.getByRole('button', { name: 'Block', exact: true });
      if (await block.isDisabled()) {
        qa.deviation(1, 'Refused with a message about the times', '"Block" is disabled; no message');
        return;
      }
      const mark = await toastMark(page);
      await block.click();
      const toasts = await toastsAfter(page, mark);
      expect(toasts).not.toContain('Consultant blocked');
      if (!toasts.some((x) => /time|before|after/i.test(x))) {
        qa.deviation(1, 'Refused with a message about the times', `refused with toast "${toasts.join(' / ')}"`);
      }
    });

    await qa.step(2, async () => {
      await appts.open();
      await appts.openBlock();
      await appts.fillBlock(d, SHARED.dr1.name, `${dDay}T08:00`, `${dDay}T09:00`);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Block', exact: true }).click();
      const toasts = await toastsAfter(page, mark);
      if (toasts.includes('Consultant blocked')) {
        qa.deviation(2, 'A warning that PT-1 is booked in that time', 'blocked without a warning; PT-1 stays booked');
        await appts.showRange(dDay);
        expect(await statusOf(appts, pt1)).toBe('Waiting');
      } else {
        expect(toasts.join(' ')).toMatch(/booked|appointment/i);
      }
    });

    await qa.step(3, async () => {
      await appts.open();
      await expect(appts.main.getByRole('tab', { name: /block/i })).toHaveCount(0);
      await expect(appts.main.getByRole('button', { name: /blocks|unblock|remove/i })).toHaveCount(0);
      qa.deviation(3, 'The block is listed and can be removed', 'no list of blocks and no way to remove one');
    });
  },

  whoCanBeChosen: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    // A user who is not a doctor: a "kasir" (cashier) account of the seed data.
    const users = MasterListPage.users(page);
    await users.open();
    const cashier = (await users.rowsWith('Roles', 'kasir')).first();
    const cashierName = (await (await cashierCell(users, cashier, 'Full name')).innerText()).trim();
    const userCount = Number((await users.main.getByText(/^Showing .* of \d+$/).innerText()).match(/of (\d+)$/)![1]);
    const deps = MasterListPage.departments(page);
    await deps.open();
    const depCount = Number((await deps.main.getByText(/^Showing .* of \d+$/).innerText()).match(/of (\d+)$/)![1]);

    await qa.step(1, async () => {
      await appts.open();
      const d = await appts.openBook();
      const field = appts.field(d, 'Consultant or unit');
      await field.fill(cashierName);
      const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
      const offered = list.getByRole('option').filter({ hasText: cashierName });
      await expect(offered.or(list.getByText(/no match|nothing/i)).first()).toBeVisible();
      if (await offered.count()) {
        qa.deviation(1, 'Not offered: only doctors are consultants', `"${(await offered.first().innerText()).trim()}" (role kasir) is offered`);
      }
    });

    if (userCount <= 50) qa.notRun(2, `needs more than 50 users in the tenant; the Users list has ${userCount}`);
    if (depCount <= 50) qa.notRun(3, `needs more than 50 departments in BR-A; the Departments list has ${depCount}`);
  },

  dateRange: async ({ page, qa }, route) => {
    const appts = new AppointmentsPage(page, route);
    const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
    const dDay = await claim(page);
    await bookDr1(appts, pt1, dDay, '08:00');
    await appts.open();
    await appts.showRange(dDay, addDays(dDay, 30));

    await qa.step(1, async () => {
      expect((await appts.allRowTexts()).filter((r) => r.Patient === pt1.fullName)).toHaveLength(1);
      await expect(appts.main.getByText('The range may be at most 30 days.')).toHaveCount(0);
    });

    await qa.step(2, async () => {
      const before = await appts.rowTexts();
      await appts.toDate.fill(addDays(dDay, 31));
      await expect(appts.main.getByText('The range may be at most 30 days.')).toBeVisible();
      expect(await appts.rowTexts()).toEqual(before);
    });

    await qa.step(3, async () => {
      await appts.toDate.fill(addDays(dDay, -1));
      const message = appts.main.getByText(/from date .*after|after the to date|before the from date/i);
      await expect(message.or(appts.table.getByText('No appointments in this view.')).first()).toBeVisible();
      if (!(await message.count())) {
        qa.deviation(3, 'A message that the From date is after the To date', 'no message; the list is empty ("No appointments in this view.")');
      }
    });
  },
} satisfies Record<string, Body>;

export type AppointmentCase = keyof typeof CASES;

/** Declares the appointment test cases of one workbook on the screen at `route`. */
export function defineAppointmentCases(route: string, ids: Partial<Record<AppointmentCase, string>>): void {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: authFileOf('U1') });
    await ensureMasterData(page);
    await new AppointmentsPage(page, route).open();
    await new AppointmentsPage(page, route).writeBookSettings(storableBookSettings());
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Each test registers patients, claims a D-day and books before its steps.
    test.slow();
    await installToastRecorder(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Frees DR-1's quota on the test's Mondays so later tests can use them again; this gets its own time.
    testInfo.setTimeout(testInfo.timeout + 180_000);
    for (const monday of new Set(claimed.splice(0))) await releaseWeek(page, monday);
  });

  for (const [key, id] of Object.entries(ids) as [AppointmentCase, string][]) {
    qaTest(id, ({ page, qa }) => CASES[key]({ page, qa }, route));
  }
}
