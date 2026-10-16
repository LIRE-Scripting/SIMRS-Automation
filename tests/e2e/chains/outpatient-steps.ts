import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { bookSettings, claimDDay, DR1_TIMES, ensureMasterData, SHARED, storableBookSettings } from '../../../lib/ambulatory-data';
import { toastLocator } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { AppointmentsPage, whenText } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';

/**
 * Outpatient steps used by several chains (01 Ambulatory Care, 02 Appointment,
 * 03 Patient Care), written as in the module specs but on the chain's patient.
 */
export type Patient = { mrn: string; fullName: string };
export const SCHEDULE = '/en/appointment/schedule';
const pad = (n: number) => String(n).padStart(3, '0');

/** TC-APP001-001: registers "QA-AMB Pasien Satu <token>" with an automatic MRN. */
export async function registerSteps(page: Page, qa: Qa): Promise<Patient> {
  const reg = new RegisteredPatientsPage(page);
  const last = `Satu ${qa.token()}`;
  let before = 0;
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /Ambulatory Care/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'New Registration' }).click();
    await expect(reg.heading).toBeVisible();
    before = await reg.tabCount(reg.registeredTab);
  });
  await qa.step(2, async () => {
    const d = await reg.openRegister();
    await expect(reg.visitTypeSelect(d)).toHaveValue(/outpatient/i);
  });
  await qa.step(3, async () => {
    const d = reg.registerDialog();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: last, dateOfBirth: '1990-05-17' }, d);
    await reg.registerButton(d).click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await expect(d).toBeHidden();
  });
  const fullName = `QA-AMB Pasien ${last}`;
  let mrn = '';
  await qa.step(4, async () => {
    const row = reg.rows().first();
    await expect(await reg.cell(row, 'Full name')).toHaveText(fullName);
    mrn = (await (await reg.cell(row, 'MRN')).innerText()).trim();
    expect(mrn).toMatch(new RegExp(`^MRN-${todayWib().slice(0, 4)}-[0-9A-F]{8}$`));
  });
  await qa.step(5, async () => expect.poll(() => reg.tabCount(reg.registeredTab)).toBe(before + 1));
  return { mrn, fullName };
}

/** The Book settings of the shared data (as the appointment specs set them before they run). */
export async function bookSettingsReady(page: Page): Promise<void> {
  await ensureMasterData(page);
  const appts = new AppointmentsPage(page, SCHEDULE);
  await appts.open();
  await appts.writeBookSettings(storableBookSettings());
}

/** TC-APP002-002: books the patient with DR-1 at 08:00 on a claimed D-day; returns the D-day (release it with releaseWeek). */
export async function bookSteps(page: Page, qa: Qa, pt: Patient): Promise<string> {
  const appts = new AppointmentsPage(page, SCHEDULE);
  const type = bookSettings().types[0].name;
  const dDay = await claimDDay(page);
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
      qa.deviation(3, 'Types "poli" in Department and picks DEP-1', `"poli" offers ${offered} departments without ${SHARED.dep1.name} (the list stops at ${offered}; test departments of other runs match "poli" too); DEP-1 is picked by its name`);
      await appts.pick(dep, SHARED.dep1.name);
    } else {
      await appts.pick(dep, 'poli', SHARED.dep1.name);
    }
    await appts.pick(appts.field(d, 'Consultant or unit'), SHARED.dr1.name);
    await expect(appts.field(d, 'Consultant or unit')).toHaveValue(new RegExp(SHARED.dr1.name));
  });
  await qa.step(4, async () => {
    await appts.typeSelect(d).selectOption({ label: type });
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
    expect(mine[0]).toMatchObject({ MRN: pt.mrn, Block: '08:00–08:30', Department: SHARED.dep1.name, Consultant: SHARED.dr1.name, Type: type, Status: 'Waiting' });
    expect(mine[0].When).toBe(whenText(dDay, '08:00'));
    expect(mine[0].Token).toMatch(/^T-/);
  });
  return dDay;
}

/** TC-APP001-019 steps 1, 2 and 4: the patient arrives in DEP-1 today and is called. */
export async function arriveSteps(page: Page, qa: Qa, pt: Patient): Promise<void> {
  const arrival = new ArrivalPage(page);
  await arrival.open();
  const last = await arrival.lastNumber(SHARED.dep1.name);
  if (last) qa.note(2, `precondition "no arrival in ${SHARED.dep1.name} today" not met on the shared site (last No. ${pad(last)}); expected the next number`);
  await qa.step(1, async () => {
    await page.goto('/en/registration');
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
}

/** TC-APP003-001: the doctor opens the consultation of the patient. */
export async function consultSteps(page: Page, qa: Qa, pt: Patient): Promise<void> {
  const c = new ConsultationPage(page);
  await qa.step(1, async () => {
    await page.goto('/en/apps');
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
}
