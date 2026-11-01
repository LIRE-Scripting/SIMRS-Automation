import fs from 'node:fs';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { ensureMasterData, registerPatient, SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';

/**
 * 01-ambulatory-care.xlsx, the arrival numbers across the turn of the day
 * (open question Q16): TC-APP001-058 (arrivals at 06:50 and 07:05 WIB, rule
 * "Restart each day") and TC-APP001-059 (an arrival of yesterday under
 * "Keep counting"). They run at those clock times, so only in the morning run
 * (QA_MORNING=1, .qa-state/morning-run.sh): a run at another hour would
 * record a result that says nothing and hide the morning's. The day before,
 * QA_TWO_DAY=prepare makes the uncalled arrival of TC-APP001-059 and keeps
 * it in .qa-state/two-day/TC-APP001-059.json.
 *
 * 07:00 WIB is midnight UTC: a site that turns its day at midnight UTC would
 * still count yesterday at 06:50 and restart at 07:05.
 */

const STATE = '.qa-state/two-day/TC-APP001-059.json';
const pad = (n: number) => String(n).padStart(3, '0');

/** Milliseconds until hh:mm WIB today (negative when past). */
function untilWib(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const target = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), h - 7, m);
  return target - now.getTime();
}
const clockWib = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureMasterData(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

/** Arrives a patient and returns the number of its row. */
async function arriveNumber(arrival: ArrivalPage, name: string, department: string): Promise<string> {
  await arrival.open();
  await arrival.arrive(name, department);
  await arrival.open();
  return (await (await arrival.cell(arrival.row(name, department), 'No.')).innerText()).trim();
}

if (process.env.QA_TWO_DAY === 'prepare') {
  test('Day 1 of TC-APP001-059: an uncalled arrival under "Keep counting"', async ({ page }) => {
    const arrival = new ArrivalPage(page);
    const pt1 = await registerPatient(page, SHARED.pt1.name, `${Date.now().toString(36).toUpperCase()}`);
    await arrival.open();
    const before = await arrival.numberRule();
    try {
      if (before !== 'Keep counting') await arrival.setNumberRule('Keep counting');
      const no = await arriveNumber(arrival, pt1.fullName, SHARED.dep1.name);
      fs.mkdirSync('.qa-state/two-day', { recursive: true });
      fs.writeFileSync(STATE, `${JSON.stringify({ date: todayWib(), at: clockWib(), patient: pt1, department: SHARED.dep1.name, number: no }, null, 1)}\n`);
    } finally {
      await arrival.open();
      await arrival.setNumberRule('Restart each day');
    }
  });
}

if (process.env.QA_MORNING === '1') {
  qaTest('TC-APP001-058', async ({ page, qa }) => {
    test.setTimeout(40 * 60_000);
    if (untilWib('06:50') < -5 * 60_000) throw new Error(`TC-APP001-058 runs at 06:50 and 07:05 WIB; it is ${clockWib()}`);
    const arrival = new ArrivalPage(page);
    const t = qa.token();
    const pt1 = await registerPatient(page, SHARED.pt1.name, t);
    const pt2 = await registerPatient(page, SHARED.pt2.name, t);
    await arrival.open();
    if ((await arrival.numberRule()) !== 'Restart each day') await arrival.setNumberRule('Restart each day');
    const dep = SHARED.dep1.name;
    let n1 = '';

    await page.waitForTimeout(Math.max(0, untilWib('06:50')));
    await qa.step(1, async () => {
      await arrival.open();
      const earlier = (await arrival.rows().allInnerTexts()).filter((r) => r.includes(dep)).length;
      n1 = await arriveNumber(arrival, pt1.fullName, dep);
      qa.note(1, `${pt1.fullName} arrives at ${clockWib()} WIB: No. ${n1}; ${earlier} earlier row(s) of ${dep} on the list`);
      if (n1 !== '001') {
        qa.deviation(1, 'No. "001", the first number of the morning', `No. "${n1}" at ${clockWib()} WIB: the list still counts ${earlier} row(s) of ${dep}${earlier ? ' (the day of the site has not turned yet: it turns at 07:00 WIB, midnight UTC)' : ''}`);
      }
    });

    await page.waitForTimeout(Math.max(0, untilWib('07:05')));
    await qa.step(2, async () => {
      const n2 = await arriveNumber(arrival, pt2.fullName, dep);
      qa.note(2, `${pt2.fullName} arrives at ${clockWib()} WIB: No. ${n2}`);
      const next = pad(Number(n1) + 1);
      if (n2 !== next) qa.deviation(2, `No. "002" (the number after PT-1's ${n1})`, `No. "${n2}" at ${clockWib()} WIB: the numbers ${n2 === '001' ? 'restarted at 07:00 WIB (midnight UTC)' : 'do not follow PT-1'}`);
    });

    await qa.step(3, async () => {
      await arrival.open();
      const row1 = arrival.row(pt1.fullName, dep);
      if (!(await row1.count())) {
        qa.deviation(3, 'Both patients, PT-1 still "Waiting" with a "Call" button', `PT-1 (arrived at 06:50) is gone from the list at ${clockWib()} WIB: the list turned at 07:00`);
        return;
      }
      await expect(arrival.row(pt2.fullName, dep)).toHaveCount(1);
      await expect(row1).toContainText('Waiting');
      await expect(row1.getByRole('button', { name: 'Call', exact: true })).toBeVisible();
    });

    await qa.step(4, async () => {
      const reg = new RegisteredPatientsPage(page);
      await reg.open();
      await reg.search(pt1.mrn);
      const cells = (await reg.row(pt1.mrn).getByRole('cell').allInnerTexts()).map((x) => x.trim());
      // The column "Registered" (its header reads the untranslated key "registration.patients.colRegistered", seen 2026-11-01).
      const headers = (await reg.main.getByRole('columnheader').allInnerTexts()).map((x) => x.trim());
      const at = headers.findIndex((h) => /colRegistered|^Registered$|^Terdaftar$/i.test(h));
      const registered = cells[at >= 0 ? at : 6] ?? '';
      qa.note(4, `the row of ${pt1.mrn} (registered before 06:50 WIB): ${cells.join(' | ')}`);
      if (registered !== todayWib()) qa.deviation(4, `Today's date (${todayWib()})`, `Registered "${registered}" (the date of the site is still yesterday before 07:00 WIB)`);
    });
  });

  qaTest('TC-APP001-059', async ({ page, qa }) => {
    test.slow();
    const day1 = fs.existsSync(STATE) ? (JSON.parse(fs.readFileSync(STATE, 'utf8')) as { date: string; at: string; patient: { mrn: string; fullName: string }; department: string; number: string }) : null;
    if (!day1 || day1.date !== addDays(todayWib(), -1)) throw new Error(`TC-APP001-059 needs the arrival of yesterday (${STATE}, made with QA_TWO_DAY=prepare); found ${day1?.date ?? 'none'}`);
    qa.note(1, `precondition: ${day1.patient.fullName} arrived for ${day1.department} on ${day1.date} at ${day1.at} WIB under "Keep counting", No. ${day1.number}, never called`);
    const arrival = new ArrivalPage(page);
    await arrival.open();
    await arrival.setNumberRule('Keep counting');
    try {
      await qa.step(1, async () => {
        await arrival.open();
        const shown = await arrival.row(day1.patient.fullName, day1.department).count();
        qa.note(1, `yesterday's uncalled row is ${shown ? 'still shown' : 'closed (not shown)'} on today's list`);
      });
      await qa.step(2, async () => {
        const last = await arrival.lastNumber(day1.department);
        await arrival.open();
        await arrival.arrive(day1.patient.fullName, day1.department);
        await expect(toastLocator(page, /^Arrival number issued$/)).toBeVisible();
        await arrival.open();
        const rows = arrival.row(day1.patient.fullName, day1.department);
        const n = (await (await arrival.cell(rows.last(), 'No.')).innerText()).trim();
        qa.note(2, `No. ${n} today (yesterday ${day1.number}; the last number on today's list before: ${last ? pad(last) : 'none'})`);
        if (n === '001' && day1.number !== '000') qa.deviation(2, 'Toast "Arrival number issued" with the next number (the count goes on)', `No. "001": the count restarted although the rule is "Keep counting" (yesterday ${day1.number})`);
      });
    } finally {
      await arrival.open();
      await arrival.setNumberRule('Restart each day');
    }
  });
}
