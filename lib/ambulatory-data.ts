import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { AppointmentsPage } from '../pages/ambulatory/AppointmentsPage';
import { RegisteredPatientsPage } from '../pages/ambulatory/RegisteredPatientsPage';
import { MasterListPage } from '../pages/settings/MasterListPage';
import { PASSWORD } from './config';
import { addDays, nextWeekday, todayWib } from './dates';
import { catalogueOf } from './qa-data';

/**
 * Shared data of 01 Ambulatory Care (00-test-data.xlsx | Catalogue, rows of
 * application "01 Ambulatory Care"). The names are read from the catalogue
 * text; nothing here is typed by hand except what the site needs and the
 * workbook does not give (codes, logins; see "Values the workbook does not
 * give" below and docs/qa/open-questions.md).
 *
 * Answer of 2026-10-14 ("a, buat sekali lalu reuse"): departments, the
 * service center and the doctor accounts are made once and reused by every
 * run. Patients, bookings and arrivals stay unique per run (qa.name).
 */

function catalogueRow(shortName: string) {
  const row = catalogueOf('01').find((c) => c.shortName === shortName);
  if (!row) throw new Error(`00-test-data.xlsx | Catalogue has no 01 row "${shortName}"`);
  return row;
}

/** The quoted values of a catalogue text, in order. */
function quoted(shortName: string): string[] {
  return [...catalogueRow(shortName).what.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const [dep1, dep2] = quoted('DEP-1, DEP-2');
const [dr1, dr2] = quoted('DR-1, DR-2');
const [unit1] = quoted('UNIT-1');
const [pt1] = quoted('PT-1');
const [pt2, pt3] = quoted('PT-2, PT-3');

export const SHARED = {
  /** BR-A (00-test-data.xlsx | Overview, row 7): Podomoro, the branch of U1. */
  branch: 'Podomoro',
  dep1: { name: dep1, code: 'QA-DEP-1' },
  dep2: { name: dep2, code: 'QA-DEP-2' },
  unit1: { name: unit1, code: 'QA-UNIT-1' },
  dr1: { name: dr1, login: 'qa.dr1' },
  dr2: { name: dr2, login: 'qa.dr2' },
  /** Patients are made per test with qa.name(); these are the workbook names. */
  pt1: { name: pt1, dateOfBirth: catalogueRow('PT-1').what.match(/\d{4}-\d{2}-\d{2}/)![0] },
  pt2: { name: pt2 },
  pt3: { name: pt3 },
} as const;

/**
 * Values the workbook does not give but the site requires (open question
 * Q14): department and service center codes, user logins and e-mail. They
 * are derived from the catalogue's short names (DEP-1 -> QA-DEP-1, DR-1 ->
 * qa.dr1) and the e-mail pattern of the site's own accounts
 * (rs.admin@klikmed.local). The users get the role "dokter" at BR-A and the
 * shared password from .env (answer Q2).
 */
const DOCTOR_ROLE = 'dokter';
const emailOf = (login: string) => `${login}@klikmed.local`;

/**
 * Book settings of the shared data (00-test-data.xlsx | Catalogue, row 16).
 * DR-2's Monday hours have no times in the workbook; the site's default row
 * (08:00 to 17:00) is kept.
 */
export interface QuotaRow {
  kind: 'Consultant' | 'Unit';
  resource: string;
  max: number;
}
export interface HoursRow {
  kind: 'Consultant' | 'Unit';
  resource: string;
  weekday: string;
  from: string;
  to: string;
}
export interface BookSettings {
  types: { name: string; minutes: number }[];
  quota: QuotaRow[];
  hours: HoursRow[];
}

const BOOK_SETTINGS_TEXT =
  'Types "QA Konsultasi" 30 minutes and "QA Kontrol" 15 minutes. Daily quota: DR-1 = 3, UNIT-1 = 2. ' +
  'Open hours: DR-1 Monday to Friday 08:00 to 12:00; UNIT-1 Monday 09:00 to 11:00. ' +
  'DR-2 has open hours on Monday and no quota';

export function bookSettings(): BookSettings {
  // Guard: the settings below are this text; a change in the workbook must be seen here.
  expect(catalogueRow('Book settings').what, '00-test-data.xlsx | Catalogue | row 16 changed').toBe(BOOK_SETTINGS_TEXT);
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return {
    types: [
      { name: 'QA Konsultasi', minutes: 30 },
      { name: 'QA Kontrol', minutes: 15 },
    ],
    quota: [
      { kind: 'Consultant', resource: SHARED.dr1.name, max: 3 },
      { kind: 'Unit', resource: SHARED.unit1.name, max: 2 },
    ],
    hours: [
      ...weekdays.map((weekday) => ({ kind: 'Consultant' as const, resource: SHARED.dr1.name, weekday, from: '08:00', to: '12:00' })),
      { kind: 'Unit', resource: SHARED.unit1.name, weekday: 'Monday', from: '09:00', to: '11:00' },
      { kind: 'Consultant', resource: SHARED.dr2.name, weekday: 'Monday', from: '08:00', to: '17:00' },
    ],
  };
}

/**
 * The part of the Book settings the site can store today: the consultant
 * rows. Unit rows cannot be set (found blocker 17), so UNIT-1 has no quota
 * and no open hours.
 */
export function storableBookSettings(): BookSettings {
  const s = bookSettings();
  return { ...s, quota: s.quota.filter((q) => q.kind === 'Consultant'), hours: s.hours.filter((h) => h.kind === 'Consultant') };
}

/** Picks a suggestion of a type-ahead field ("HO · Podomoro", "QA-DEP-1 · QA Poli Umum"). */
export async function pickOption(field: Locator, typed: string, choose: string | RegExp): Promise<void> {
  await field.fill(typed);
  const list = field.page().locator(`#${await field.getAttribute('aria-controls')}`);
  await list.getByRole('option').filter({ hasText: choose }).first().getByRole('button').click();
}

/** Finds or creates the departments, the service center and the doctor accounts. Idempotent. */
export async function ensureMasterData(page: Page): Promise<void> {
  const deps = MasterListPage.departments(page);
  await deps.open();
  for (const dep of [SHARED.dep1, SHARED.dep2]) {
    if ((await (await deps.rowsWith('Name', dep.name)).count()) > 0) continue;
    const d = await deps.openAdd();
    await d.getByRole('textbox', { name: 'Department code' }).fill(dep.code);
    await d.getByRole('textbox', { name: 'Department name' }).fill(dep.name);
    await deps.save(d);
    await expect(await deps.rowsWith('Name', dep.name)).toHaveCount(1);
  }

  const scs = MasterListPage.serviceCenters(page);
  await scs.open();
  if ((await (await scs.rowsWith('Name', SHARED.unit1.name)).count()) === 0) {
    const d = await scs.openAdd();
    await d.getByRole('textbox', { name: 'Service center code' }).fill(SHARED.unit1.code);
    await d.getByRole('textbox', { name: 'Service center name' }).fill(SHARED.unit1.name);
    await scs.save(d);
    await expect(await scs.rowsWith('Name', SHARED.unit1.name)).toHaveCount(1);
  }

  const users = MasterListPage.users(page);
  await users.open();
  for (const dr of [SHARED.dr1, SHARED.dr2]) {
    if ((await (await users.rowsWith('Login', dr.login)).count()) > 0) continue;
    const d = await users.openAdd();
    await d.getByRole('textbox', { name: 'Login' }).fill(dr.login);
    await d.getByRole('textbox', { name: 'Full name' }).fill(dr.name);
    await d.getByRole('textbox', { name: 'Email' }).fill(emailOf(dr.login));
    await d.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await pickOption(d.getByRole('combobox', { name: 'Branch' }), SHARED.branch, SHARED.branch);
    await d.getByRole('checkbox', { name: DOCTOR_ROLE, exact: true }).check();
    await users.save(d);
    await expect(await users.rowsWith('Login', dr.login)).toHaveCount(1);
  }
}

// ------------------------------------------------------------- patients

/**
 * Registers a patient with a workbook name made unique: "QA-AMB Pasien Satu"
 * -> first name "QA-AMB Pasien", last name "Satu <token>" (the same split as
 * the Registered Patients spec). Returns MRN and full name as listed.
 */
export async function registerPatient(
  page: Page,
  excelName: string,
  token: string,
  dateOfBirth?: string,
): Promise<{ mrn: string; fullName: string }> {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const words = excelName.split(' ');
  const last = words.pop();
  return reg.register({ visitType: 'Outpatient', firstName: words.join(' '), lastName: `${last} ${token}`, dateOfBirth });
}

// ---------------------------------------------------------------- D-day

/**
 * D-day (00-test-data.xlsx | Catalogue, row 17): "A Monday in the future
 * with no bookings for DR-1 or UNIT-1". DR-1 and UNIT-1 are shared by every
 * run, so each test that books or blocks them claims a Monday of its own:
 * one whose week has no booking in DEP-1/DEP-2 and on which DR-1 and UNIT-1
 * still offer every open time (no booking, no block).
 *
 * Used Mondays pile up from next week onwards, run after run, so the first
 * free one is found by doubling the distance, then halving it.
 */
const DR1_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const UNIT1_TIMES = ['09:00', '09:30', '10:00', '10:30'];
/**
 * The next Monday to try, kept between workers and runs in a git-ignored
 * file, so a claim normally costs one check instead of a search.
 */
const STATE_FILE = path.join('.qa-state', 'd-day.json');

function readCursor(): string | null {
  try {
    return (JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as { next?: string }).next ?? null;
  } catch {
    return null;
  }
}

function writeCursor(next: string): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ next }, null, 2));
}

/** Times offered in "Open time" for DR-1 (or UNIT-1) with type "QA Konsultasi" on `date`. */
export async function offeredTimes(page: Page, date: string, kind: 'Consultant' | 'Unit'): Promise<string[]> {
  const appts = new AppointmentsPage(page);
  const d = await appts.openBook();
  await appts.pick(appts.field(d, 'Department'), SHARED.dep1.name);
  if (kind === 'Unit') await d.getByRole('radiogroup').getByText('Unit', { exact: true }).click();
  await appts.pick(appts.field(d, 'Consultant or unit'), kind === 'Unit' ? SHARED.unit1.name : SHARED.dr1.name);
  await appts.typeSelect(d).selectOption({ label: bookSettings().types[0].name });
  await appts.dateField(d).fill(date);
  const times = await appts.settledOpenTimes(d);
  await d.getByRole('button', { name: 'Cancel' }).click();
  await expect(d).toBeHidden();
  return times;
}

async function mondayIsFree(page: Page, monday: string): Promise<boolean> {
  const appts = new AppointmentsPage(page);
  await appts.open();
  await appts.showRange(monday, addDays(monday, 6));
  const deps = [SHARED.dep1.name, SHARED.dep2.name];
  if ((await appts.rowTexts()).some((r) => deps.includes(r.Department))) return false;
  // UNIT-1 offers no time at all while blocker 17 stands, so only DR-1 is checked.
  return (await offeredTimes(page, monday, 'Consultant')).join() === DR1_TIMES.join();
}

/** Claims the next free D-day for one test. Needs the shared Book settings. */
export async function claimDDay(page: Page): Promise<string> {
  const first = nextWeekday(todayWib(), 1);
  const saved = readCursor();
  let dDay: string;
  if (saved && saved >= first) {
    dDay = saved;
    while (!(await mondayIsFree(page, dDay))) dDay = addDays(dDay, 7);
  } else {
    // No saved cursor: search from next week, doubling the distance, then halving it.
    const week = (k: number) => addDays(first, 7 * k);
    let used = -1;
    let free = 0;
    while (!(await mondayIsFree(page, week(free)))) {
      used = free;
      free = free ? free * 2 : 1;
      if (free > 512) throw new Error(`No free Monday within ten years from ${first}: is DR-1's book setting missing?`);
    }
    while (free - used > 1) {
      const mid = Math.floor((used + free) / 2);
      if (await mondayIsFree(page, week(mid))) free = mid;
      else used = mid;
    }
    dDay = week(free);
  }
  writeCursor(addDays(dDay, 7));
  return dDay;
}

export { DR1_TIMES, UNIT1_TIMES };
