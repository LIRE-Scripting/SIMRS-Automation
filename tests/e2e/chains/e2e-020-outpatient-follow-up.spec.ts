import { chainTest, expect } from '../../../fixtures/chain';
import { bookSettings, claimDDay, DR1_TIMES, ensureMasterData, releaseWeek, SHARED, storableBookSettings } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { addDays } from '../../../lib/dates';
import { AppointmentsPage, whenText } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { BOOKING_LIST, TypeListPage } from '../../../pages/appointment/TypeListPage';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { FollowUps } from '../../modules/03-patient-care/helpers';

/**
 * E2E-020: one pre-registered patient becomes a patient, is booked with DR-1
 * on a claimed D-day (with a new referral type on offer) and rescheduled; the
 * same patient arrives today, is called, seen (consultation, SOAP, allergy),
 * gets a follow-up, and the visit is closed. The QA bookings of the claimed
 * week are cancelled at the end, as in the appointment specs.
 */
const SCHEDULE = '/id/appointment/schedule';
const TYPE = bookSettings().types[0].name;
const pad = (n: number) => String(n).padStart(3, '0');

chainTest('E2E-020', async ({ page, chain }) => {
  await installToastRecorder(page);
  const reg = new RegisteredPatientsPage(page);
  const appts = new AppointmentsPage(page, SCHEDULE);
  const arrival = new ArrivalPage(page);
  const c = new ConsultationPage(page);
  // Precondition "Book settings of the shared data" (as the appointment specs set them before they run).
  await ensureMasterData(page);
  await appts.open();
  await appts.writeBookSettings(storableBookSettings());

  const pt = await chain.step(1, async (qa) => {
    const last = `Satu ${qa.token()}`;
    const fullName = `QA-AMB Calon ${last}`;
    let panel = reg.main.getByRole('tabpanel');
    let before = 0;
    await qa.step(1, async () => {
      await reg.open();
      panel = await reg.openPreRegistration();
      await expect(panel.getByRole('heading', { name: 'Waiting for a form' })).toBeVisible();
      before = await reg.tabCount(reg.preRegistrationTab);
    });
    await qa.step(2, async () => {
      await panel.getByRole('radio', { name: 'Online' }).check();
      await panel.getByRole('textbox', { name: 'First name' }).fill('QA-AMB Calon');
      await panel.getByRole('textbox', { name: 'Last name' }).fill(last);
      await panel.getByRole('textbox', { name: 'Date of birth' }).fill('1992-11-20');
      await panel.getByRole('button', { name: 'Add to worklist' }).click();
      await expect(toastLocator(page, /^Added to the worklist$/)).toBeVisible();
      await expect(panel.getByRole('listitem').filter({ hasText: fullName })).toContainText('Online');
      await expect.poll(() => reg.tabCount(reg.preRegistrationTab)).toBe(before + 1);
    });
    await qa.step(3, async () => {
      await panel.getByRole('listitem').filter({ hasText: fullName }).getByRole('button', { name: 'Open form' }).click();
      await expect(reg.registerDialog().getByRole('textbox', { name: 'Last name' }).first()).toHaveValue(last);
    });
    await qa.step(4, async () => {
      await reg.registerButton().click();
      await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    });
    let mrn = '';
    await qa.step(5, async () => {
      await expect(reg.main.getByRole('tabpanel').getByRole('listitem').filter({ hasText: fullName })).toHaveCount(0);
      await reg.registeredTab.click();
      await reg.search(fullName);
      await expect(reg.row(fullName)).toHaveCount(1);
      mrn = (await (await reg.cell(reg.row(fullName), 'MRN')).innerText()).trim();
    });
    return { mrn, fullName };
  });

  await chain.step(2, async (qa) => {
    const list = new TypeListPage(page, 'Referral types');
    const code = qa.code('X-01');
    const name = qa.name('X Tipe uji 01');
    await qa.step(1, async () => {
      await page.goto('/id/apps');
      await page.getByRole('link', { name: /^Appointment\b/ }).first().click();
      await page.getByRole('complementary').filter({ hasText: 'Appointment' }).getByRole('link', { name: 'Referral types', exact: true }).click();
      await expect(list.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await list.openAdd();
      await expect(list.active()).toBeChecked();
    });
    await qa.step(3, async () => {
      await list.fill(code, name);
      await list.saveButton().click();
      await expect(toastLocator(page, /^Saved$/)).toBeVisible();
      await expect(list.dialog).toBeHidden();
    });
    // The list shows its first 24 types only, with no paging (found blocker 24): a new type is often not listed.
    await page.reload();
    await expect(list.rows().first()).toBeVisible();
    if (!(await list.row(code).isVisible()) && (await list.rows().count()) >= 24) {
      qa.note(4, `${code} is saved but not among the ${await list.rows().count()} types the list shows`);
      qa.blocked(4, 24);
    } else {
      await qa.step(4, async () => {
        await expect(list.row(code)).toHaveCount(1);
        await expect(list.row(code).getByRole('cell').nth(2)).toHaveText('Yes');
      });
    }
    await qa.step(5, async () => {
      await appts.open();
      const d = await appts.openBook();
      const options = (await d.getByRole('combobox', { name: BOOKING_LIST['Referral types'] }).locator('option').allInnerTexts()).map((o) => o.trim());
      await d.getByRole('button', { name: 'Cancel' }).click();
      expect(options.some((o) => o.includes(name))).toBe(true);
    });
  });

  const dDay = await claimDDay(page);
  try {
    await chain.step(3, async (qa) => {
      qa.note(1, `D-day ${dDay} (claimed as in the appointment specs)`);
      await appts.open();
      let d = appts.bookDialog();
      await qa.step(1, async () => {
        d = await appts.openBook();
        await expect(appts.submitBook(d)).toBeDisabled();
      });
      await qa.step(2, async () => {
        await appts.pick(appts.field(d, 'Patient'), pt.fullName.split(' ').slice(-2).join(' '), pt.mrn);
        await expect(appts.field(d, 'Patient')).toHaveValue(new RegExp(`${pt.mrn}.*${pt.fullName}`));
      });
      await qa.step(3, async () => {
        const dep = appts.field(d, 'Department');
        await dep.fill('poli');
        const list = page.locator(`#${await dep.getAttribute('aria-controls')}`);
        await expect(list.getByRole('option').first()).toBeVisible();
        if (!(await list.getByRole('option').filter({ hasText: SHARED.dep1.name }).count())) {
          const offered = (await list.getByRole('option').allInnerTexts()).length;
          qa.deviation(3, `Types "poli" in Department and picks DEP-1`, `"poli" offers ${offered} departments without ${SHARED.dep1.name} (the list stops at ${offered}; test departments of other runs match "poli" too); DEP-1 is picked by its name`);
          await appts.pick(dep, SHARED.dep1.name);
        } else {
          await appts.pick(dep, 'poli', SHARED.dep1.name);
        }
        await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.dr1.name);
        await expect(appts.field(d, 'Consultant or unit')).toHaveValue(new RegExp(SHARED.dr1.name));
      });
      await qa.step(4, async () => {
        await appts.typeSelect(d).selectOption({ label: TYPE });
        await appts.dateField(d).fill(dDay);
        await expect.poll(() => appts.openTimes(d)).toEqual(DR1_TIMES);
        await expect(appts.openTime(d)).toHaveValue(/08:00/);
      });
      await qa.step(5, async () => {
        await appts.submitBook(d).click();
        await expect(page.getByRole('status').filter({ hasText: /^Appointment booked$/ })).toBeVisible();
        await expect(d).toBeHidden();
      });
      await qa.step(6, async () => {
        await appts.showRange(dDay);
        const mine = (await appts.allRowTexts()).filter((r) => r.Patient === pt.fullName);
        expect(mine).toHaveLength(1);
        expect(mine[0]).toMatchObject({ MRN: pt.mrn, Block: '08:00–08:30', Department: SHARED.dep1.name, Consultant: SHARED.dr1.name, Type: TYPE, Status: 'Waiting' });
        expect(mine[0].When).toBe(whenText(dDay, '08:00'));
        expect(mine[0].Token).toMatch(/^T-/);
      });
    });

    await chain.step(4, async (qa) => {
      await appts.showRange(dDay);
      const token = (await appts.allRowTexts()).find((r) => r.Patient === pt.fullName)!.Token;
      const d = page.getByRole('dialog', { name: 'Reschedule' });
      await qa.step(1, async () => {
        await appts.pageWith([pt.fullName]);
        await appts.row(pt.fullName).getByRole('checkbox').check();
        await appts.rescheduleButton().click();
        await expect(d).toContainText('Moves every selected row to one open time.');
      });
      await qa.step(2, async () => {
        await d.getByRole('textbox', { name: 'Date' }).fill(addDays(dDay, 1));
        expect(await appts.settledOpenTimes(d)).toEqual(DR1_TIMES);
      });
      await qa.step(3, async () => {
        await d.getByRole('combobox', { name: 'Open time' }).selectOption({ label: '09:00' });
        await d.getByRole('button', { name: 'Reschedule', exact: true }).click();
        await expect(toastLocator(page, /^Appointments rescheduled$/)).toBeVisible();
        await expect.poll(async () => (await appts.allRowTexts()).map((r) => r.Patient)).not.toContain(pt.fullName);
      });
      await qa.step(4, async () => {
        await appts.showRange(addDays(dDay, 1));
        const r = (await appts.allRowTexts()).find((x) => x.Patient === pt.fullName);
        expect(r).toMatchObject({ When: whenText(addDays(dDay, 1), '09:00'), Block: '09:00–09:30', Status: 'Waiting', Token: token });
      });
    });
  } finally {
    await releaseWeek(page, dDay);
  }

  await chain.step(5, async (qa) => {
    await arrival.open();
    const last = await arrival.lastNumber(SHARED.dep1.name);
    if (last) qa.note(2, `precondition "no arrival in ${SHARED.dep1.name} today" not met on the shared site (last No. ${pad(last)}); expected the next number`);
    await qa.step(1, async () => {
      await page.goto('/id/registration');
      await page.getByRole('main').getByRole('link', { name: 'Arrival', exact: true }).click();
      await expect(arrival.heading).toBeVisible();
    });
    const row = arrival.row(pt.fullName, SHARED.dep1.name);
    await qa.step(2, async () => {
      await arrival.arrive(pt.fullName, SHARED.dep1.name);
      await expect(await arrival.cell(row, 'No.')).toHaveText(pad(last + 1));
      await expect(await arrival.cell(row, 'MRN')).toHaveText(pt.mrn);
      await expect(await arrival.cell(row, 'Status')).toHaveText('Waiting');
    });
    await qa.step(4, async () => {
      await row.getByRole('button', { name: 'Call', exact: true }).click();
      await expect(toastLocator(page, /^Called$/)).toBeVisible();
      await expect(await arrival.cell(row, 'Status')).toHaveText('Called');
      const actions = (await row.getByRole('cell').last().innerText()).replace(/\s+/g, ' ').trim();
      if (!/\bCalled\b/.test(actions)) qa.deviation(4, 'the button is replaced by the word "Called"', `the button is replaced by "Start encounter" (actions: ${actions})`);
    });
  });

  await chain.step(6, async (qa) => {
    await qa.step(1, async () => {
      await page.goto('/id/apps');
      await page.getByRole('link', { name: /^Patient Care\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Open Consultation' }).click();
      await expect(c.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await c.patientField.fill(pt.fullName.split(' ').slice(-2).join(' '));
      await expect(c.suggestions().filter({ hasText: `${pt.mrn} · ${pt.fullName}` })).toHaveCount(1);
    });
    await qa.step(3, async () => {
      await c.suggestions().filter({ hasText: pt.mrn }).getByRole('button').click();
      await expect(c.pane.getByRole('heading', { level: 2, name: pt.fullName })).toBeVisible();
      if (!(await c.pane.getByText(/DOB/).count())) qa.deviation(3, 'Left pane: name, MRN and "DOB"', 'name and MRN; no date of birth');
      await expect(c.paneSection('Allergies')).toHaveText('Nothing recorded yet.');
    });
    await qa.step(4, async () => {
      for (const t of ['Order', 'SOAP', 'Prescription'] as const) await expect(c.tab(t)).toBeVisible();
      await expect(c.tab('Order')).toHaveAttribute('aria-selected', 'true');
      await expect(c.changePatient).toBeVisible();
    });
    await qa.step(5, async () => {
      await c.changePatient.click();
      await expect(c.patientField).toBeVisible();
    });
  });

  await chain.step(7, async (qa) => {
    await c.openFor(pt);
    const texts = { Subjective: qa.name('QA S'), Objective: qa.name('QA O'), Assessment: qa.name('QA A'), Plan: qa.name('QA P') };
    await qa.step(1, async () => {
      await c.showTab('SOAP');
      await expect(c.panel.getByText('This SOAP draft stays in the current session.')).toBeVisible();
    });
    await qa.step(2, async () => {
      for (const [f, v] of Object.entries(texts)) await c.panel.getByRole('textbox', { name: f }).fill(v);
      await c.panel.getByRole('button', { name: 'Save draft' }).click();
      await expect(toastLocator(page, /^SOAP draft kept in session\.$/)).toBeVisible();
    });
    await qa.step(3, async () => {
      await c.showTab('Order');
      await c.showTab('SOAP');
      for (const [f, v] of Object.entries(texts)) await expect(c.panel.getByRole('textbox', { name: f })).toHaveValue(v);
    });
  });

  await chain.step(8, async (qa) => {
    await c.openFor(pt);
    const note = qa.name('QA Amoksisilin');
    const input = c.pane.getByRole('textbox', { name: 'Allergy' });
    const save = input.locator('xpath=following::button[normalize-space()="Save"][1]');
    await qa.step(1, async () => {
      await expect(c.paneSection('Allergies')).toHaveText('Nothing recorded yet.');
      await expect(save).toBeVisible();
    });
    await qa.step(2, async () => {
      await input.fill(note);
      await save.click();
      await expect(toastLocator(page, /^Allergy recorded on this patient$/)).toBeVisible();
      await expect(c.paneSection('Allergies')).toContainText(note);
      await expect(input).toHaveValue('');
    });
  });

  await chain.step(9, async (qa) => {
    const f = new FollowUps(page);
    const note = qa.name('QA Pasien dihubungi, kontrol minggu depan');
    await qa.step(1, async () => {
      await page.goto('/id/clinical');
      await page.getByRole('main').getByRole('link', { name: 'Follow-up', exact: true }).click();
      await expect(f.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await f.add.click();
      await expect(f.dialog).toBeVisible();
    });
    await qa.step(3, async () => {
      await f.pick(f.dialog.getByRole('combobox', { name: 'Patient' }), pt.mrn);
      await f.dialog.getByRole('combobox', { name: 'Mode' }).selectOption({ label: 'Call' });
      await f.dialog.getByRole('textbox', { name: 'Note' }).fill(note);
      await f.dialog.getByRole('button', { name: 'Save' }).click();
      await expect(toastLocator(page, /^Follow-up saved\.$/)).toBeVisible();
      const row = f.rows().filter({ hasText: note });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(pt.mrn);
    });
    await qa.step(4, async () => {
      await f.pick(f.filter, pt.mrn);
      await expect(f.rows()).toHaveCount(1);
    });
    await qa.step(5, async () => {
      await f.main.getByRole('button', { name: 'Clear filter' }).click();
      await expect.poll(() => f.rows().count()).toBeGreaterThan(1);
    });
  });

  await chain.step(10, async (qa) => {
    await arrival.open();
    const row = arrival.row(pt.fullName, SHARED.dep1.name);
    await qa.step(1, () => expect(row.getByRole('button', { name: 'Start encounter' })).toBeVisible());
    await qa.step(2, async () => {
      await row.getByRole('button', { name: 'Start encounter' }).click();
      await expect(toastLocator(page, /^Encounter started$/)).toBeVisible();
      await expect(await arrival.cell(row, 'Status')).toHaveText('In encounter');
    });
    await qa.step(3, async () => {
      await row.getByRole('button', { name: 'Close visit' }).click();
      await expect(toastLocator(page, /^Visit closed$/)).toBeVisible();
      await expect(await arrival.cell(row, 'Status')).toHaveText('Closed');
    });
  });
});
