import type { Browser, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { bookSettings, claimDDay, ensureMasterData, registerPatient, releaseWeek, SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { AppointmentsPage } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';

/**
 * 01-ambulatory-care.xlsx, a user without the front-desk rights: U3
 * "qa.staff" of Podomoro, whose role qa_staff holds no right at all
 * (00-prerequisites.xlsx | Users). U1 makes the records the steps act on.
 * Every save U3 tries leaves the records as they are when it is refused,
 * and is harmless when it is not: settings are saved unchanged, the
 * booking falls in the test's own D-day (cancelled at the end) and the
 * block lies outside the open hours.
 */

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: authFileOf('U1') });
  await ensureMasterData(page);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

async function staffPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext({ storageState: authFileOf('U3') })).newPage();
  await installToastRecorder(page);
  return page;
}

/** Clicks and returns the toasts that follow (waits up to 8 s for the first one). */
async function toastsOf(page: Page, click: () => Promise<void>): Promise<string[]> {
  const mark = await toastMark(page);
  await click();
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

const TYPE = bookSettings().types[0].name;

qaTest('TC-APP001-061', async ({ page, qa, browser }) => {
  const t = qa.token();
  // Preconditions (made by U1): PT-1 waits in DEP-1 today and has an appointment; PT-2 and PT-3 to merge and book.
  const pt1 = await registerPatient(page, SHARED.pt1.name, t);
  const pt2 = await registerPatient(page, SHARED.pt2.name, t);
  const pt3 = await registerPatient(page, SHARED.pt3.name, t);
  const dDay = await claimDDay(page);
  const appts1 = new AppointmentsPage(page);
  await appts1.open();
  await appts1.book({ patient: pt1.fullName, department: SHARED.dep1.name, resource: SHARED.dr1.name, type: TYPE, date: dDay, time: '08:00' });
  const arrival1 = new ArrivalPage(page);
  await arrival1.open();
  await arrival1.arrive(pt1.fullName, SHARED.dep1.name);

  const staff = await staffPage(browser);
  const reg = new RegisteredPatientsPage(staff);
  const appts = new AppointmentsPage(staff);
  const arrival = new ArrivalPage(staff);
  const refused = (step: number, what: string, toasts: string[], saved: string) => {
    expect(toasts, what).not.toContain(saved);
    qa.note(step, `${what}: "${toasts.join(' / ') || 'no toast'}"`);
  };

  try {
    await qa.step(1, async () => {
      await reg.open();
      const d = await reg.openRegister();
      await reg.fillRegister({ firstName: 'QA-AMB Tanpa', lastName: `Hak ${t}` }, d);
      refused(1, 'Register', await toastsOf(staff, () => reg.registerButton(d).click()), 'Patient registered');
      const check = new RegisteredPatientsPage(page);
      await check.open();
      await check.search(`Hak ${t}`);
      await expect(check.row(`Hak ${t}`)).toHaveCount(0);
    });

    await qa.step(2, async () => {
      await reg.open();
      await reg.mergeButton.click();
      const d = reg.mergeDialog();
      await reg.pickFrom(d.getByRole('textbox', { name: 'Survivor' }), pt2.fullName, pt2.mrn, d);
      await reg.pickFrom(d.getByRole('textbox', { name: 'Duplicate' }), pt3.fullName, pt3.mrn, d);
      refused(2, 'Merge', await toastsOf(staff, () => d.getByRole('button', { name: 'Merge' }).click()), 'Patients merged');
      await staff.keyboard.press('Escape');
    });

    await qa.step(3, async () => {
      await appts.open();
      await appts.showRange(dDay);
      await appts.pageWith([pt1.fullName]);
      await appts.row(pt1.fullName).getByRole('checkbox').check();
      refused(3, 'Cancel selected', await toastsOf(staff, () => appts.cancelSelectedButton().click()), 'Appointments cancelled');
      await appts.open();
      const book = await appts.openBook();
      await appts.pick(appts.field(book, 'Patient'), pt2.fullName);
      await appts.pick(appts.field(book, 'Department'), SHARED.dep1.name);
      const consultant = appts.field(book, 'Consultant or unit');
      await consultant.fill(SHARED.dr1.name);
      await staff.waitForLoadState('networkidle').catch(() => {});
      const dr1 = staff.locator(`#${await consultant.getAttribute('aria-controls')}`).getByRole('option').filter({ hasText: SHARED.dr1.name });
      if (await dr1.count()) {
        await dr1.first().getByRole('button').click();
        await appts.typeSelect(book).selectOption({ label: TYPE });
        await appts.dateField(book).fill(dDay);
        await appts.openTime(book).selectOption({ label: '08:30' });
        refused(3, 'Book', await toastsOf(staff, () => appts.submitBook(book).click()), 'Appointment booked');
      } else {
        qa.note(3, `Book: ${SHARED.dr1.name} is not offered to U3 under "Consultant or unit", so no booking can be filled`);
      }
      await staff.keyboard.press('Escape');
      await appts.open();
      const block = await appts.openBlock();
      const consultants = await block.getByRole('combobox', { name: 'Consultant' }).locator('option').allInnerTexts();
      if (consultants.some((o) => o.trim() === SHARED.dr1.name)) {
        await appts.fillBlock(block, SHARED.dr1.name, `${dDay}T20:00`, `${dDay}T21:00`);
        refused(3, 'Block time', await toastsOf(staff, () => block.getByRole('button', { name: 'Block', exact: true }).click()), 'Consultant blocked');
      } else {
        qa.note(3, `Block time: ${SHARED.dr1.name} is not in the Consultant list of U3 (${consultants.length} options), so no block can be filled`);
      }
      await staff.keyboard.press('Escape');
    });

    await qa.step(4, async () => {
      await arrival.open();
      const call = arrival.row(pt1.fullName, SHARED.dep1.name).getByRole('button', { name: 'Call', exact: true });
      refused(4, 'Call', await toastsOf(staff, () => call.click()), 'Called');
      await arrival.open();
      const d = await arrival.openArrive();
      await arrival.pickPatient(d, pt2.fullName);
      await arrival.pickDepartment(d, SHARED.dep1.name);
      refused(4, 'Arrive', await toastsOf(staff, () => arrival.submit(d).click()), 'Arrival number issued');
      await staff.keyboard.press('Escape');
    });

    await qa.step(5, async () => {
      // Each dialog is saved as it opens: nothing changes even if the save is taken.
      await reg.open();
      const form = await reg.openFormSettings();
      refused(5, 'Form settings', await toastsOf(staff, () => form.getByRole('button', { name: 'Save settings' }).click()), 'Settings saved');
      await appts.open();
      const book = await appts.openBookSettings();
      refused(5, 'Book settings', await toastsOf(staff, () => book.getByRole('button', { name: 'Save settings' }).click()), 'Book settings saved');
      await arrival.open();
      await arrival.numberRuleButton.click();
      const rule = staff.getByRole('dialog', { name: 'Number rule' });
      refused(5, 'Number rule', await toastsOf(staff, () => rule.getByRole('button', { name: 'Save rule' }).click()), 'Number rule saved');
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
    // Frees DR-1's quota on the D-day for later tests.
    await releaseWeek(page, dDay);
  }
});

qaTest('TC-APP001-062', async ({ qa, browser }) => {
  const staff = await staffPage(browser);
  const main = staff.getByRole('main');
  try {
    await qa.step(1, async () => {
      await staff.goto('/en/apps');
      const card = main.getByRole('link', { name: /Ambulatory Care/ });
      if (await card.count()) {
        await card.first().click();
        await staff.waitForLoadState('networkidle').catch(() => {});
        const refusedPage = await main.getByText(/no access|not allowed|forbidden|permission/i).count();
        if (!refusedPage) qa.deviation(1, 'No "Ambulatory Care" card, or the card opens a "no access" page', `the card is shown to U3 (no rights) and opens ${new URL(staff.url()).pathname}`);
      }
    });

    for (const [step, routes] of [
      [2, ['/en/registration/patients']],
      [3, ['/en/registration/appointments', '/en/registration/department-queue']],
    ] as const) {
      await qa.step(step, async () => {
        const shown: string[] = [];
        for (const route of routes) {
          await staff.goto(route);
          await staff.waitForLoadState('networkidle').catch(() => {});
          if (step === 2) {
            const reg = new RegisteredPatientsPage(staff);
            await reg.search('QA-AMB Pasien');
            await staff.waitForLoadState('networkidle').catch(() => {});
          }
          const heading = (await main.getByRole('heading', { level: 1 }).allInnerTexts()).join(' ');
          const rows = await main.getByRole('table').getByRole('row').count();
          if (!(await main.getByText(/no access|not allowed|forbidden|permission/i).count())) shown.push(`${route} ("${heading}", ${Math.max(rows - 1, 0)} rows)`);
        }
        if (shown.length) qa.deviation(step, 'Access refused', `U3 (no rights) reads ${shown.join(' and ')}`);
      });
    }
  } finally {
    await staff.context().close();
  }
});
