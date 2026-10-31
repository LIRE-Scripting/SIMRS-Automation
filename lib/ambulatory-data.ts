import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { AppointmentsPage } from '../pages/ambulatory/AppointmentsPage';
import { RegisteredPatientsPage } from '../pages/ambulatory/RegisteredPatientsPage';
import { MasterListPage } from '../pages/settings/MasterListPage';
import { toastMark, toastsSince } from './assertions';
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

/** Two registered patients with the same full name (the workbook name + token); returns both with their MRNs. */
export async function registerTwins(page: Page, excelName: string, token: string): Promise<[{ mrn: string; fullName: string }, { mrn: string; fullName: string }]> {
  const reg = new RegisteredPatientsPage(page);
  const words = excelName.split(' ');
  const last = `${words.pop()} ${token}`;
  for (let i = 0; i < 2; i++) {
    await reg.open();
    const d = await reg.openRegister();
    await reg.fillRegister({ visitType: 'Outpatient', firstName: words.join(' '), lastName: last }, d);
    await reg.registerButton(d).click();
    await expect(page.getByText('Patient registered', { exact: true }).first()).toBeVisible();
    await expect(d).toBeHidden();
  }
  await reg.search(last);
  const rows = reg.row(last);
  await expect(rows).toHaveCount(2);
  const out: { mrn: string; fullName: string }[] = [];
  for (const r of await rows.all()) {
    out.push({ mrn: (await (await reg.cell(r, 'MRN')).innerText()).trim(), fullName: (await (await reg.cell(r, 'Full name')).innerText()).trim() });
  }
  return [out[0], out[1]];
}

// ---------------------------------------------------------------- D-day

/**
 * D-day (00-test-data.xlsx | Catalogue, row 17): "A Monday in the future
 * with no bookings for DR-1 or UNIT-1". DR-1 is shared by every run, and the
 * site books at most one year ahead ("Booking failed" after that), so Mondays
 * are reused:
 *
 * - after each appointment test its bookings in DEP-1/DEP-2 are cancelled
 *   (releaseWeek): a cancelled booking no longer counts against the quota;
 * - "free": no active booking in DEP-1/DEP-2 that week and DR-1 offers every
 *   open time (no block, quota free). Most tests take this;
 * - "fresh": a weekday (Monday to Friday, DR-1's open days) with no row at
 *   all, cancelled ones included: the calendars show four bookings a day
 *   before "+N" (TC-…-015). Mondays are all reused, so this one may be
 *   another weekday; the test notes it;
 * - "08:00": no active booking and 08:00 still offered (TC-…-052 books 08:00
 *   and blocks 08:00–09:00), and "unbooked": no active booking, blocks
 *   allowed (TC-…-044 blocks the whole morning). These reuse Mondays blocked
 *   by earlier runs; blocks cannot be removed on the site.
 *
 * Mondays found blocked or used are remembered in a git-ignored file so the
 * next search skips them (blocks and rows never go away).
 */
const DR1_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const UNIT1_TIMES = ['09:00', '09:30', '10:00', '10:30'];

export type DDayNeed = 'free' | 'fresh' | '08:00' | 'unbooked';

const STATE_FILE = path.join('.qa-state', 'd-day.json');
interface DDayState {
  /** Mondays (or days) on which DR-1 does not offer every time with no active booking: blocked for good. */
  blocked: string[];
  /** Days that hold rows (cancelled ones stay): never "fresh" again. */
  used: string[];
  /** Rows last seen in the week of each Monday: claims prefer the emptiest week. */
  rows: Record<string, number>;
}

function readState(): DDayState {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as Partial<DDayState>;
    return { blocked: s.blocked ?? [], used: s.used ?? [], rows: s.rows ?? {} };
  } catch {
    return { blocked: [], used: [], rows: {} };
  }
}

function writeState(s: DDayState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function remember(kind: 'blocked' | 'used', day: string): void {
  const s = readState();
  if (s[kind].includes(day)) return;
  s[kind].push(day);
  s[kind].sort();
  writeState(s);
}

function rememberRows(monday: string, rows: number): void {
  const s = readState();
  s.rows[monday] = rows;
  writeState(s);
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

const QA_DEPARTMENTS = () => [SHARED.dep1.name, SHARED.dep2.name];

/** Rows of the shown range, from "Showing 1–10 of N" (0 when empty). */
async function shownTotal(appts: AppointmentsPage): Promise<number> {
  return Number((await appts.pagingSummary.innerText()).match(/of (\d+)$/)?.[1] ?? 0);
}

/** A weekday with no row at all and DR-1 fully open (need "fresh"). */
async function dayIsFresh(page: Page, day: string): Promise<boolean> {
  const state = readState();
  if (state.used.includes(day) || state.blocked.includes(day)) return false;
  const appts = new AppointmentsPage(page);
  await appts.open();
  await appts.showRange(day);
  if ((await shownTotal(appts)) > 0) {
    remember('used', day);
    return false;
  }
  const times = await offeredTimes(page, day, 'Consultant');
  if (times.join() !== DR1_TIMES.join()) {
    remember('blocked', day);
    return false;
  }
  return true;
}

async function mondaySuits(page: Page, monday: string, need: DDayNeed): Promise<boolean> {
  const state = readState();
  if (need === 'free' && state.blocked.includes(monday)) return false;
  const appts = new AppointmentsPage(page);
  await appts.open();
  await appts.showRange(monday, addDays(monday, 6));
  const total = await shownTotal(appts);
  rememberRows(monday, total);
  if (total > 0) {
    remember('used', monday);
    const rows = await appts.allRowTexts();
    if (rows.some((r) => QA_DEPARTMENTS().includes(r.Department) && r.Status === 'Waiting')) return false;
  }
  if (need === 'unbooked') return true;
  const times = await offeredTimes(page, monday, 'Consultant');
  if (times.join() !== DR1_TIMES.join()) remember('blocked', monday);
  // UNIT-1 offers no time at all while blocker 17 stands, so only DR-1 is checked.
  return need === '08:00' ? times.includes('08:00') : times.join() === DR1_TIMES.join();
}

/**
 * Claims a Monday for one test (see above). Needs the shared Book settings.
 * Mondays are tried emptiest week first, so the rows that stay behind
 * (cancelled bookings) spread over the year instead of piling up on a few
 * weeks; "08:00" and "unbooked" try Mondays that are blocked already first.
 * Release it with releaseWeek() when the test ends.
 */
export async function claimDDay(page: Page, need: DDayNeed = 'free'): Promise<string> {
  const today = todayWib();
  // The test may book up to two days after D-day; the site books one year ahead at most.
  const last = addDays(today, 365 - 2);
  const mondays: string[] = [];
  for (let m = nextWeekday(today, 1); m <= last; m = addDays(m, 7)) mondays.push(m);
  if (need === 'fresh') {
    for (const monday of mondays) {
      for (let i = 0; i < 5; i++) {
        const day = addDays(monday, i);
        if (day <= last && (await dayIsFresh(page, day))) {
          remember('used', day);
          return day;
        }
      }
    }
  } else {
    const state = readState();
    const blockedFirst = need !== 'free';
    const order = [...mondays].sort(
      (a, b) =>
        (blockedFirst ? Number(!state.blocked.includes(a)) - Number(!state.blocked.includes(b)) : 0) ||
        (state.rows[a] ?? 0) - (state.rows[b] ?? 0) ||
        a.localeCompare(b),
    );
    for (const monday of order) if (await mondaySuits(page, monday, need)) return monday;
  }
  throw new Error(
    `No ${need} Monday for DR-1 between ${nextWeekday(today, 1)} and ${last} (the site books one year ahead at most). ` +
      'Blocks cannot be removed on the site; see docs/qa/open-questions.md Q18.',
  );
}

/**
 * Cancels every waiting booking in DEP-1/DEP-2 in the week of `monday` (the
 * test's own bookings): a page at a time, and one by one when the site
 * refuses the page. A booking the site refuses to cancel (e.g. one whose
 * patient was merged away, TC-APP001-010, "Booking failed") is left as it
 * is; its Monday then no longer counts as free.
 */
export async function releaseWeek(page: Page, monday: string): Promise<void> {
  const appts = new AppointmentsPage(page);
  const key = (r: Record<string, string>) => `${r.Patient}|${r.When}|${r.Token}`;
  const refused = new Set<string>();
  let single = false;
  const cancellable = (r: Record<string, string>) =>
    QA_DEPARTMENTS().includes(r.Department) && r.Status === 'Waiting' && !refused.has(key(r));
  await appts.open();
  await appts.showRange(monday, addDays(monday, 6));
  for (let round = 0; round < 60; round++) {
    if ((await shownTotal(appts)) === 0 || !(await appts.allRowTexts()).some(cancellable)) {
      rememberRows(monday, await shownTotal(appts));
      return;
    }
    await appts.firstPage();
    const ticked: Record<string, string>[] = [];
    for (;;) {
      const rows = await appts.rowTexts();
      for (const [i, r] of rows.entries()) {
        if (!cancellable(r) || (single && ticked.length)) continue;
        await appts.rows().nth(i).getByRole('checkbox').check();
        ticked.push(r);
      }
      if (ticked.length || !(await appts.nextPage())) break;
    }
    if (!ticked.length) return;
    const mark = await toastMark(page);
    await appts.cancelSelectedButton().click();
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    if (!(await toastsSince(page, mark)).includes('Appointments cancelled')) {
      if (single) refused.add(key(ticked[0]));
      single = true;
    }
    await page.reload();
    await appts.showRange(monday, addDays(monday, 6));
  }
  throw new Error(`Could not cancel the QA bookings in the week of ${monday}`);
}

export { DR1_TIMES, UNIT1_TIMES };
