import { expect, qaTest, test } from '../../../fixtures/e2e';
import { bookSettings, ensureMasterData, registerPatient, releaseWeek, SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib, weekdayOf } from '../../../lib/dates';
import { AppointmentsPage } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage, QueueBoardPage } from '../../../pages/ambulatory/ArrivalPage';

/**
 * 01-ambulatory-care.xlsx, Arrival (/registration/department-queue) and the
 * queue board (/id/queue).
 *
 * DEP-1/DEP-2 are shared by every run (lib/ambulatory-data.ts), so other
 * runs may already have issued numbers today: where the workbook expects
 * "001", the test expects the next number after the last one shown and
 * notes it. The number rule is one record per branch; every test starts
 * from "Restart each day" (TC-APP001-019 Preconditions).
 */

const pad = (n: number) => String(n).padStart(3, '0');

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureMasterData(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  const arrival = new ArrivalPage(page);
  await arrival.open();
  if ((await arrival.numberRule()) !== 'Restart each day') await arrival.setNumberRule('Restart each day');
});

type Patient = { mrn: string; fullName: string };

/** The number the workbook expects ("001") or, when today's list already has numbers, the next one. */
async function nextNumber(arrival: ArrivalPage, qa: { note(step: number, t: string): void }, step: number, department: string) {
  await arrival.open();
  const last = await arrival.lastNumber(department);
  if (last) qa.note(step, `precondition "no arrival in ${department} today" not met on the shared site (last No. ${pad(last)}); expected the next number`);
  return last + 1;
}

async function callRow(arrival: ArrivalPage, p: Patient, department: string) {
  await arrival.row(p.fullName, department).getByRole('button', { name: 'Call', exact: true }).click();
  await expect(toastLocator(arrival.page, /^Called$/)).toBeVisible();
}

qaTest('TC-APP001-019', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const t = qa.token();
  const pt1 = await registerPatient(page, SHARED.pt1.name, t);
  const pt2 = await registerPatient(page, SHARED.pt2.name, t);
  const n = await nextNumber(arrival, qa, 2, SHARED.dep1.name);

  await qa.step(1, async () => {
    await page.goto('/id/registration');
    await page.getByRole('main').getByRole('link', { name: 'Arrival', exact: true }).click();
    await expect(arrival.heading).toBeVisible();
    await expect(arrival.main).toContainText("Today's arrival list. Arrive issues a number. Call publishes that row to the queue board.");
    await expect(arrival.numberRuleButton).toBeVisible();
    await expect(arrival.arriveButton).toBeVisible();
    if ((await arrival.rows().count()) === 0) await expect(arrival.table).toContainText('No arrivals today.');
  });

  await qa.step(2, async () => {
    await arrival.arrive(pt1.fullName, SHARED.dep1.name);
    const row = arrival.row(pt1.fullName, SHARED.dep1.name);
    await expect(await arrival.cell(row, 'No.')).toHaveText(pad(n));
    await expect(await arrival.cell(row, 'MRN')).toHaveText(pt1.mrn);
    await expect(await arrival.cell(row, 'Status')).toHaveText('Waiting');
    await expect(row.getByRole('button', { name: 'Call', exact: true })).toBeVisible();
  });

  await qa.step(3, async () => {
    await arrival.arrive(pt2.fullName, SHARED.dep1.name);
    const row = arrival.row(pt2.fullName, SHARED.dep1.name);
    await expect(await arrival.cell(row, 'No.')).toHaveText(pad(n + 1));
    const order = (await arrival.rows().allInnerTexts()).map((r) => r.includes(pt2.fullName) ? 2 : r.includes(pt1.fullName) ? 1 : 0).filter(Boolean);
    expect(order).toEqual([2, 1]);
  });

  await qa.step(4, async () => {
    await callRow(arrival, pt1, SHARED.dep1.name);
    const row = arrival.row(pt1.fullName, SHARED.dep1.name);
    await expect(await arrival.cell(row, 'Status')).toHaveText('Called');
    await expect(row.getByRole('button', { name: 'Call', exact: true })).toHaveCount(0);
    const actions = (await row.getByRole('cell').last().innerText()).replace(/\s+/g, ' ').trim();
    if (!/\bCalled\b/.test(actions)) {
      qa.deviation(4, 'the button is replaced by the word "Called"', `the button is replaced by "Start encounter" (actions: ${actions})`);
    }
  });

  await qa.step(5, async () => {
    const m = await nextNumber(arrival, qa, 5, SHARED.dep2.name);
    await arrival.arrive(pt1.fullName, SHARED.dep2.name);
    await expect(await arrival.cell(arrival.row(pt1.fullName, SHARED.dep2.name), 'No.')).toHaveText(pad(m));
  });
});

qaTest('TC-APP001-020', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
  const n = await nextNumber(arrival, qa, 1, SHARED.dep1.name);
  const d = page.getByRole('dialog', { name: 'Number rule' });
  try {
    await qa.step(1, async () => {
      await arrival.arrive(pt1.fullName, SHARED.dep1.name);
      await expect(await arrival.cell(arrival.row(pt1.fullName), 'No.')).toHaveText(pad(n));
    });

    await qa.step(2, async () => {
      await arrival.numberRuleButton.click();
      await expect(d.getByRole('radio', { name: 'Restart each day Each department starts again at 001 today.' })).toBeVisible();
      await expect(d.getByRole('radio', { name: 'Keep counting Each department keeps the next number and does not restart.' })).toBeVisible();
    });

    await qa.step(3, async () => {
      await d.getByRole('radio', { name: /^Keep counting/ }).check();
      await d.getByRole('button', { name: 'Save rule' }).click();
      await expect(toastLocator(page, /^Number rule saved$/)).toBeVisible();
    });

    qa.notRun(4, 'needs the next working day: arrivals cannot be dated on the site, and one run lasts minutes');
  } finally {
    await arrival.open();
    await arrival.setNumberRule('Restart each day');
  }
});

qaTest('TC-APP001-021', async ({ page, context, qa }) => {
  const arrival = new ArrivalPage(page);
  const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
  const n = await nextNumber(arrival, qa, 1, SHARED.dep1.name);
  await arrival.arrive(pt1.fullName, SHARED.dep1.name);
  const board = new QueueBoardPage(await context.newPage());
  await board.open();

  const boardRow = () => board.rowTexts().then((rows) => rows.find((x) => x.Patient === pt1.fullName));

  await qa.step(1, async () => {
    await expect(board.live).toBeVisible();
    const r = await boardRow();
    if (!r) {
      qa.deviation(1, `A row with No "${pad(n)}", PT-1's name, MRN and department`, 'no row for the arrival: the board lists appointment tokens only (status "A")');
      return;
    }
    expect(r).toMatchObject({ No: pad(n), MRN: pt1.mrn, Department: SHARED.dep1.name });
  });

  await qa.step(2, async () => {
    await callRow(arrival, pt1, SHARED.dep1.name);
    try {
      await expect(board.rows().first()).toContainText(pt1.fullName, { timeout: 10_000 });
      await expect(board.rows().first()).toContainText('CALLED');
    } catch {
      qa.deviation(2, 'Within a few seconds the board row moves to the top with status "CALLED", without a reload', 'no row of PT-1 appears on the open board within 10 s');
    }
  });

  await qa.step(3, async () => {
    await board.page.reload();
    await expect(board.table).toBeVisible();
    const r = await boardRow();
    if (!r || r.Status !== 'CALLED') {
      qa.deviation(3, 'The same row with "CALLED"', r ? `the row reads "${r.Status}"` : 'no row of PT-1 after the reload either');
    }
  });
});

qaTest('TC-APP001-055', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const appts = new AppointmentsPage(page);
  const today = todayWib();
  test.skip([0, 6].includes(weekdayOf(today)), `DR-1 has no open hours on ${today} (Monday to Friday only)`);
  const pt1 = await registerPatient(page, SHARED.pt1.name, qa.token());
  await appts.open();
  const d = await appts.openBook();
  await appts.fillBook(
    { patient: pt1.fullName, department: SHARED.dep1.name, resource: SHARED.dr1.name, type: bookSettings().types[0].name, date: today },
    d,
  );
  const times = await appts.settledOpenTimes(d);
  test.skip(!/^\d\d:\d\d/.test(times[0]), `precondition: DR-1's quota for today (${today}) is used up by earlier runs`);
  await appts.submitBook(d).click();
  await expect(toastLocator(page, /^Appointment booked$/)).toBeVisible();

  await qa.step(1, async () => {
    await arrival.open();
    await expect(arrival.main.getByText(/appointment|booked/i)).toHaveCount(0);
    qa.deviation(1, "PT-1's appointment is offered for check-in", 'Arrival shows no appointments; the patient is searched and the department picked again');
  });

  await qa.step(2, async () => {
    await arrival.arrive(pt1.fullName, SHARED.dep1.name);
    await callRow(arrival, pt1, SHARED.dep1.name);
  });

  await qa.step(3, async () => {
    await appts.open();
    await appts.showRange(today);
    const status = (await appts.allRowTexts()).find((r) => r.Patient === pt1.fullName)!.Status;
    if (status === 'Waiting') qa.deviation(3, 'PT-1\'s row no longer reads "Waiting"', 'the appointment still reads "Waiting"');
    else expect(status).not.toBe('Waiting');
  });
});

qaTest('TC-APP001-056', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const t = qa.token();
  const pt1 = await registerPatient(page, SHARED.pt1.name, t);
  const pt2 = await registerPatient(page, SHARED.pt2.name, t);
  await arrival.open();
  await arrival.arrive(pt1.fullName, SHARED.dep1.name);
  let d = arrival.arriveDialog();

  await qa.step(1, async () => {
    d = await arrival.openArrive();
    await arrival.pickPatient(d, pt1.fullName);
    await arrival.pickDepartment(d, SHARED.dep1.name);
    const mark = await toastMark(page);
    await arrival.submit(d).click();
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    const toast = (await toastsSince(page, mark)).join(' / ');
    if (toast !== 'This patient is already waiting in that department') {
      qa.deviation(1, 'Toast "This patient is already waiting in that department". No new number', `toast "${toast}"`);
    }
    if (await d.isHidden()) d = await arrival.openArrive();
    await arrival.pickPatient(d, pt1.fullName);
  });

  await qa.step(2, async () => {
    await arrival.pickDepartment(d, SHARED.dep2.name);
    await arrival.submit(d).click();
    await expect(toastLocator(page, /^Arrival number issued$/)).toBeVisible();
    await arrival.open();
    await expect(arrival.row(pt1.fullName)).toHaveCount(2);
  });

  await qa.step(3, async () => {
    d = await arrival.openArrive();
    await arrival.pickPatient(d, pt2.fullName);
    await expect(arrival.departmentField(d)).toHaveValue('');
    if (await arrival.submit(d).isEnabled()) {
      const stored = await arrival.departmentField(d).getAttribute('data-stored');
      qa.deviation(3, 'The button is disabled until a department is picked', `"Arrive" is enabled; the empty field already holds a department (id ${stored ? 'set' : 'empty'})`);
    } else {
      await expect(arrival.submit(d)).toBeDisabled();
    }
  });

  await qa.step(4, async () => {
    await d.getByRole('button', { name: 'Cancel' }).click();
    d = await arrival.openArrive();
    await arrival.patientField(d).fill(pt2.fullName);
    await expect(arrival.submit(d)).toBeDisabled();
  });
});

qaTest('TC-APP001-060', async ({ page, context, qa }) => {
  const arrival = new ArrivalPage(page);
  const appts = new AppointmentsPage(page);
  const t = qa.token();
  const pt1 = await registerPatient(page, SHARED.pt1.name, t);
  const pt2 = await registerPatient(page, SHARED.pt2.name, t);
  await arrival.open();
  await arrival.arrive(pt1.fullName, SHARED.dep1.name);
  const board = new QueueBoardPage(await context.newPage());
  await board.open();
  // "Next week": the Monday after next Monday's week starts (always a Monday).
  const nextWeek = addDays(todayWib(), 7 + ((8 - weekdayOf(todayWib())) % 7));
  const r = () => board.rowTexts().then((rows) => rows.find((x) => (x.Patient ?? '').includes(pt1.fullName) || x.MRN === pt1.mrn));

  await qa.step(1, async () => {
    const row = await r();
    if (!row) {
      qa.deviation(1, 'The number and the department', 'no row for the arrival: the board lists appointment tokens only (status "A")');
      return;
    }
    expect(row.No).toMatch(/^\d{3}$/);
    expect(row!.Department).toBe(SHARED.dep1.name);
    if (row!.Patient === pt1.fullName || row!.MRN === pt1.mrn) {
      qa.deviation(1, "The patient's name shortened or hidden, and no MRN", `full name "${row!.Patient}" and MRN shown`);
    }
  });

  await qa.step(2, async () => {
    // A waiting patient's status, read from PT-1's row or, when the board has none, from any waiting row.
    const row = (await r()) ?? (await board.rowTexts())[0];
    expect(row).toBeDefined();
    if (row.Status !== 'Waiting') qa.deviation(2, 'A word such as "Waiting"', `Status "${row.Status}"`);
  });

  await qa.step(3, async () => {
    const before = await board.rows().count();
    await appts.open();
    await appts.book({ patient: pt2.fullName, department: SHARED.dep1.name, resource: SHARED.dr1.name, type: bookSettings().types[0].name, date: nextWeek });
    const appeared = board.row(pt2.fullName);
    try {
      await expect(appeared).toHaveCount(1, { timeout: 10_000 });
      qa.deviation(3, 'The board does not change', `a row for the booking of ${nextWeek} appears at once, with its token, name and MRN`);
    } catch {
      expect(await board.rows().count()).toBe(before);
    }
  });

  // Frees DR-1's quota on that Monday for the appointment tests (lib/ambulatory-data.ts, D-day).
  await releaseWeek(page, nextWeek);
  qa.notRun(4, 'needs a BR-B clerk: user U6 is not prepared (00-prerequisites.xlsx | Users | row 10)');
  qa.notRun(5, 'needs a day on which nobody has arrived in the branch; the shared board already has rows today');
});

/** An arrival of a new PT-1 in DEP-1 today; returns the patient. */
async function arrivedPt1(page: import('@playwright/test').Page, token: string): Promise<Patient> {
  const pt1 = await registerPatient(page, SHARED.pt1.name, token);
  const arrival = new ArrivalPage(page);
  await arrival.open();
  await arrival.arrive(pt1.fullName, SHARED.dep1.name);
  return pt1;
}

qaTest('TC-APP001-077', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const pt1 = await arrivedPt1(page, qa.token());
  const row = arrival.row(pt1.fullName, SHARED.dep1.name);
  const d = page.getByRole('dialog', { name: 'Set MLC' });

  await qa.step(1, async () => {
    await expect(await arrival.cell(row, 'MLC')).toHaveText('—');
    await expect(row.getByRole('button', { name: 'Set MLC' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await row.getByRole('button', { name: 'Set MLC' }).click();
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Reason' })).toBeVisible();
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Reason' }).fill(qa.name('QA cedera lalu lintas'));
    await d.getByRole('button', { name: /^(Save|Set MLC)$/ }).click();
    await expect(toastLocator(page, /^MLC updated$/)).toBeVisible();
    await expect(await arrival.cell(row, 'MLC')).toHaveText('MLC');
    await expect(row.getByRole('button', { name: 'Clear MLC' })).toBeVisible();
  });

  await qa.step(4, async () => {
    await row.getByRole('button', { name: 'Clear MLC' }).click();
    const c = page.getByRole('dialog', { name: /MLC/ });
    await c.getByRole('textbox', { name: 'Reason' }).fill(qa.name('QA cedera lalu lintas'));
    await c.getByRole('button', { name: /^(Save|Clear MLC)$/ }).click();
    await expect(toastLocator(page, /^MLC updated$/)).toBeVisible();
    await expect(await arrival.cell(row, 'MLC')).toHaveText('—');
  });
});

qaTest('TC-APP001-078', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const pt1 = await arrivedPt1(page, qa.token());
  const row = arrival.row(pt1.fullName, SHARED.dep1.name);
  const d = page.getByRole('dialog', { name: 'Record document' });

  await qa.step(1, async () => {
    await row.getByRole('button', { name: 'Record document' }).click();
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Document title' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Document title' }).fill(qa.name('QA Surat rujukan'));
    await d.getByRole('button', { name: /^(Save|Record|Record document)$/ }).click();
    await expect(toastLocator(page, /^Document recorded on this visit$/)).toBeVisible();
    await expect(d).toBeHidden();
  });

  await qa.step(3, async () => {
    // Expected Result is TBD (Q8): only that the row is still there is asserted.
    await expect(row).toHaveCount(1);
    qa.note(3, `the row shows: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
  });
});

qaTest('TC-APP001-079', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const pt1 = await arrivedPt1(page, qa.token());
  const row = arrival.row(pt1.fullName, SHARED.dep1.name);

  await qa.step(1, async () => {
    await row.getByRole('button', { name: 'Record document' }).click();
    const d = page.getByRole('dialog', { name: 'Record document' });
    const posts: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') posts.push(r.url());
    });
    await d.getByRole('button', { name: /^(Save|Record|Record document)$/ }).click();
    await expect(toastLocator(page, /^A document title is required$/)).toBeVisible();
    expect(posts).toEqual([]);
  });
});

qaTest('TC-APP001-080', async ({ page, qa }) => {
  const arrival = new ArrivalPage(page);
  const pt1 = await arrivedPt1(page, qa.token());
  await callRow(arrival, pt1, SHARED.dep1.name);
  const row = arrival.row(pt1.fullName, SHARED.dep1.name);

  await qa.step(1, () => expect(row.getByRole('button', { name: 'Start encounter' })).toBeVisible());

  await qa.step(2, async () => {
    await row.getByRole('button', { name: 'Start encounter' }).click();
    await expect(toastLocator(page, /^Encounter started$/)).toBeVisible();
    await expect(await arrival.cell(row, 'Status')).toHaveText('In encounter');
    await expect(row.getByRole('button', { name: 'Close visit' })).toBeVisible();
  });

  await qa.step(3, async () => {
    await row.getByRole('button', { name: 'Close visit' }).click();
    await expect(toastLocator(page, /^Visit closed$/)).toBeVisible();
    await expect(await arrival.cell(row, 'Status')).toHaveText('Closed');
    qa.note(3, `buttons left on the row: ${(await row.getByRole('button').allInnerTexts()).join(', ') || 'none'}`);
  });
});

