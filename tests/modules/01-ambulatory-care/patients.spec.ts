import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { bookSettings, claimDDay, ensureMasterData, releaseWeek, SHARED } from '../../../lib/ambulatory-data';
import { hourWib } from '../../../lib/dates';
import { AppointmentsPage, whenText } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage, QueueBoardPage } from '../../../pages/ambulatory/ArrivalPage';
import { DEFAULT_FORM_SETTINGS, RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';

/**
 * 01-ambulatory-care.xlsx, feature "Registered Patients (/registration/patients)".
 * Every test creates its own patients with the workbook names, the "QA-"
 * prefix and a new token per save, so runs never collide.
 *
 * Form settings are one shared record per branch; each test starts from the
 * workbook defaults (TC-APP001-009 / TC-APP001-036 Preconditions).
 */

/** Today in the branch's time zone (Western Indonesia, TC-APP001-058 Preconditions). */
function todayWib(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
}

function ageInYears(dob: string, today = todayWib()): number {
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
  await new RegisteredPatientsPage(page).open();
  await new RegisteredPatientsPage(page).setFormSettings(DEFAULT_FORM_SETTINGS);
});

qaTest('TC-APP001-001', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const last = `Satu ${qa.token()}`;
  const dob = '1990-05-17';
  let before = 0;

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /Ambulatory Care/ }).first().click();
    // On the hub "New Registration" is a link (TC-APP001-026 records this).
    await page.getByRole('main').getByRole('link', { name: 'New Registration' }).click();
    await expect(reg.heading).toBeVisible();
    await expect(reg.registeredTab).toBeVisible();
    await expect(reg.preRegistrationTab).toBeVisible();
    await expect(reg.searchBox).toHaveAttribute('placeholder', 'MRN or name…');
    await expect(reg.formSettingsButton).toBeVisible();
    await expect(reg.mergeButton).toBeVisible();
    await expect(reg.newRegistrationButton).toBeVisible();
    before = await reg.tabCount(reg.registeredTab);
  });

  await qa.step(2, async () => {
    const d = await reg.openRegister();
    await expect(reg.visitTypeSelect(d)).toHaveValue(/outpatient/i);
    await expect(d.getByRole('textbox', { name: 'MRN (optional)' })).toHaveAttribute(
      'placeholder',
      'Leave blank to auto-assign MRN-YYYY-XXXXXXXX',
    );
    for (const f of ['First name', 'Middle name', 'Last name', 'Date of birth']) {
      await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    }
    await expect(d.getByText('Branch', { exact: true })).toHaveCount(0);
  });

  await qa.step(3, async () => {
    const d = reg.registerDialog();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: last, dateOfBirth: dob }, d);
    const saving = page.waitForFunction(() =>
      [...document.querySelectorAll('[role="dialog"] button')].some((b) => b.textContent?.trim() === 'Saving…'),
    );
    await reg.registerButton(d).click();
    await saving;
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await expect(d).toBeHidden();
  });

  await qa.step(4, async () => {
    const row = reg.rows().first();
    const year = todayWib().slice(0, 4);
    await expect(await reg.cell(row, 'MRN')).toHaveText(new RegExp(`^MRN-${year}-[0-9A-F]{8}$`));
    await expect(await reg.cell(row, 'Full name')).toHaveText(`QA-AMB Pasien ${last}`);
    await expect(await reg.cell(row, 'Visit')).toHaveText('Outpatient');
    await expect(await reg.cell(row, 'Date of birth')).toHaveText(`${dob} · ${ageInYears(dob)} years`);
    // The column title is a message key on the site (FND-07 in the Summary of the workbook).
    const registered = (await row.getByRole('cell').nth(6).innerText()).trim();
    if (registered === todayWib(-1) && hourWib() < 7) {
      // TC-APP001-058 known risk: dates are kept in world time, so before 07:00 WIB the column shows yesterday.
      qa.deviation(4, `Registered: today's date (${todayWib()})`, `"${registered}" (before 07:00 WIB the site shows yesterday's date)`);
    } else {
      expect(registered).toBe(todayWib());
    }
  });

  await qa.step(5, async () => {
    await expect.poll(() => reg.tabCount(reg.registeredTab)).toBe(before + 1);
  });
});

qaTest('TC-APP001-002', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const mrn = qa.mrn();
  const d = await reg.openRegister();

  await qa.step(1, async () => {
    const field = d.getByRole('textbox', { name: 'MRN (optional)' });
    await field.fill(mrn);
    await expect(field).toHaveValue(mrn);
  });

  await qa.step(2, async () => {
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Dua ${qa.token()}` }, d);
    await reg.registerButton(d).click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
  });

  await qa.step(3, async () => {
    await reg.search(mrn);
    await expect(reg.rows()).toHaveCount(1);
    await expect(await reg.cell(reg.rows().first(), 'MRN')).toHaveText(mrn);
  });
});

qaTest('TC-APP001-003', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  // PT-1, PT-2, PT-3 (Data catalogue): "QA-AMB Pasien Satu/Dua/Tiga".
  const pt1 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Satu ${token}`, dateOfBirth: '1990-05-17' });
  await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Dua ${token}` });
  await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Tiga ${token}` });
  await reg.open();

  const firstPageMrns: string[] = [];
  await qa.step(1, async () => {
    await expect(reg.rows()).toHaveCount(10);
    await expect(await reg.cell(reg.rows().first(), 'Full name')).toHaveText(`QA-AMB Pasien Tiga ${token}`);
    await expect(reg.pagingSummary).toHaveText(/^Showing 1–10 of \d+$/);
    await expect(reg.nextPageButton).toBeEnabled();
    for (const r of await reg.rows().all()) firstPageMrns.push((await (await reg.cell(r, 'MRN')).innerText()).trim());
  });

  await qa.step(2, async () => {
    await reg.search(`pasien sat`);
    await expect(reg.row(pt1.fullName)).toHaveCount(1);
    expect(await reg.tabCount(reg.registeredTab)).toBeGreaterThanOrEqual(await reg.rows().count());
  });

  await qa.step(3, async () => {
    await reg.search(pt1.mrn.slice(-4), 'enter');
    await expect(reg.row(pt1.fullName)).toHaveCount(1);
  });

  await qa.step(4, async () => {
    const d = await reg.openDetails(pt1.fullName);
    await expect(d.getByText(pt1.mrn, { exact: true })).toBeVisible();
    for (const term of ['First name', 'Middle name', 'Last name', 'Visit type', 'Merged']) {
      await expect(d.getByRole('term').filter({ hasText: new RegExp(`^${term}$`) })).toBeVisible();
    }
    await expect(reg.detail(d, 'Merged')).toHaveText('No');
  });

  await qa.step(5, async () => {
    const d = reg.detailsDialog(pt1.fullName);
    await d.getByRole('button', { name: 'Close' }).last().click();
    await reg.search('');
    await reg.nextPageButton.click();
    await expect(reg.pagingSummary).toHaveText(/^Showing 11–20 of \d+$/);
    await expect(reg.rows()).toHaveCount(10);
    const secondPageMrns = await Promise.all((await reg.rows().all()).map(async (r) => (await (await reg.cell(r, 'MRN')).innerText()).trim()));
    expect(secondPageMrns.filter((m) => firstPageMrns.includes(m))).toEqual([]);
  });
});

qaTest('TC-APP001-005', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const staffKey = `QA-EMP-0001-${token}`;
  const depKey = `QA-EMP-0001-A-${token}`;
  const staffName = `QA-AMB Staf Satu ${token}`;

  await qa.step(1, async () => {
    const d = await reg.openRegister();
    await reg.visitTypeSelect(d).selectOption('Staff');
    await expect(d.getByRole('textbox', { name: 'Person key' })).toHaveAttribute(
      'placeholder',
      'Staff or dependent id — a second MRN for this person is refused',
    );
  });

  await qa.step(2, async () => {
    const d = reg.registerDialog();
    await reg.fillRegister({ firstName: 'QA-AMB Staf', lastName: `Satu ${token}`, personKey: staffKey }, d);
    await reg.registerButton(d).click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await reg.search(staffName);
    await expect(await reg.cell(reg.row(staffName), 'Visit')).toHaveText('Staff');
  });

  await qa.step(3, async () => {
    const name = `QA-AMB Tanggungan Satu ${token}`;
    await reg.openRegister();
    await reg.fillRegister({ visitType: 'Staff dependent', firstName: 'QA-AMB Tanggungan', lastName: `Satu ${token}`, personKey: depKey });
    await reg.registerButton().click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await reg.search(name);
    await expect(await reg.cell(reg.row(name), 'Visit')).toHaveText('Staff dependent');
  });

  await qa.step(4, async () => {
    await reg.search(staffName);
    const d = await reg.openDetails(staffName);
    await expect(reg.detail(d, 'Person key')).toHaveText(staffKey);
  });
});

qaTest('TC-APP001-006', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  // PT-MOM (Data catalogue): "QA-AMB Ibu Satu", date of birth 1995-08-09.
  const mom = await reg.register({ firstName: 'QA-AMB Ibu', lastName: `Satu ${token}`, dateOfBirth: '1995-08-09' });
  const baby = `QA-AMB Bayi Ibu Satu ${token}`;
  const d = await reg.openRegister();

  await qa.step(1, async () => {
    await reg.visitTypeSelect(d).selectOption('Newborn');
    await expect(d.getByRole('textbox', { name: 'Born' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Mother' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Mother' }).fill(`Ibu Satu ${token}`);
    await expect(d.getByRole('listitem').getByRole('button', { name: `${mom.mrn} · ${mom.fullName}` })).toBeVisible();
  });

  await qa.step(3, async () => {
    await d.getByRole('listitem').getByRole('button', { name: `${mom.mrn} · ${mom.fullName}` }).click();
    await expect(d.getByRole('textbox', { name: 'Mother' })).toHaveValue(`${mom.mrn} ${mom.fullName}`);
  });

  await qa.step(4, async () => {
    const today = todayWib();
    await reg.fillRegister({ firstName: 'QA-AMB Bayi Ibu', lastName: `Satu ${token}`, dateOfBirth: today }, d);
    await d.getByRole('textbox', { name: 'Born' }).fill(today);
    await reg.registerButton(d).click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await reg.search(baby);
    await expect(await reg.cell(reg.row(baby), 'Visit')).toHaveText('Newborn');
    await expect(await reg.cell(reg.row(baby), 'Date of birth')).toHaveText(`${today} · 0 years`);
  });

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  await qa.step(5, async () => {
    const det = await reg.openDetails(baby);
    // C2: "Mother" holds the mother's internal id as plain text, not her MRN and name as a link.
    await expect(reg.detail(det, 'Mother')).toHaveText(UUID);
    await expect(reg.detail(det, 'Mother').getByRole('link')).toHaveCount(0);
    qa.deviation(5, `"Mother" shows PT-MOM's MRN and name as a link`, '"Mother" shows an internal id (UUID) as plain text');
    await expect(reg.detail(det, 'Birth record')).toHaveText(UUID);
  });

  await qa.step(6, async () => {
    // No mother link exists (step 5), so the dialog cannot change to PT-MOM.
    qa.deviation(6, 'The dialog changes to PT-MOM', 'there is no mother link to click');
    await expect(reg.detailsDialog(baby).getByRole('link')).toHaveCount(0);
  });
});

qaTest('TC-APP001-007', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const names = ['Satu', 'Dua', 'Tiga'].map((n) => ({ first: 'QA-AMB Korban', last: `${n} ${token}` }));
  const d = await reg.openRegister();

  await qa.step(1, async () => {
    await reg.visitTypeSelect(d).selectOption('Disaster');
    await expect(d.getByRole('textbox', { name: 'MRN (optional)' })).toHaveCount(0);
    await expect(d.getByText('Several patients on this save. Blocked when triage color is unset.')).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Triage color' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'First name' })).toHaveCount(2);
    await expect(d.getByRole('button', { name: 'Add patient' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Triage color' }).fill('Merah');
    for (const i of [0, 1]) {
      await d.getByRole('textbox', { name: 'First name' }).nth(i).fill(names[i].first);
      await d.getByRole('textbox', { name: 'Last name' }).nth(i).fill(names[i].last);
    }
    await expect(d.getByRole('textbox', { name: 'Last name' }).nth(0)).toHaveValue(names[0].last);
    await expect(d.getByRole('textbox', { name: 'Last name' }).nth(1)).toHaveValue(names[1].last);
  });

  await qa.step(3, async () => {
    await d.getByRole('button', { name: 'Add patient' }).click();
    await expect(d.getByRole('textbox', { name: 'First name' })).toHaveCount(3);
    await d.getByRole('textbox', { name: 'First name' }).nth(2).fill(names[2].first);
    await d.getByRole('textbox', { name: 'Last name' }).nth(2).fill(names[2].last);
  });

  await qa.step(4, async () => {
    await reg.registerButton(d).click();
    await expect(toastLocator(page, /^Disaster patients registered$/)).toBeVisible();
  });

  await qa.step(5, async () => {
    await reg.search(token);
    await expect(reg.rows()).toHaveCount(3);
    const mrns = new Set<string>();
    for (const r of await reg.rows().all()) {
      await expect(await reg.cell(r, 'Visit')).toHaveText('Disaster');
      mrns.add((await (await reg.cell(r, 'MRN')).innerText()).trim());
    }
    expect(mrns.size).toBe(3);
  });

  await qa.step(6, async () => {
    const det = await reg.openDetails(`QA-AMB Korban Satu ${token}`);
    await expect(reg.detail(det, 'Triage color')).toHaveText('Merah');
  });
});

qaTest('TC-APP001-008', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const last = `Satu ${qa.token()}`;
  const full = `QA-AMB Calon ${last}`;
  let panel = reg.main.getByRole('tabpanel');
  let before = 0;

  await qa.step(1, async () => {
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
    const item = panel.getByRole('listitem').filter({ hasText: full });
    await expect(item).toContainText('Online');
    await expect(item).toContainText('1992-11-20');
    await expect.poll(() => reg.tabCount(reg.preRegistrationTab)).toBe(before + 1);
  });

  await qa.step(3, async () => {
    await panel.getByRole('listitem').filter({ hasText: full }).getByRole('button', { name: 'Open form' }).click();
    const d = reg.registerDialog();
    await expect(d.getByRole('textbox', { name: 'First name' }).first()).toHaveValue('QA-AMB Calon');
    await expect(d.getByRole('textbox', { name: 'Last name' }).first()).toHaveValue(last);
    await expect(d.getByRole('textbox', { name: 'Date of birth' }).first()).toHaveValue('1992-11-20');
  });

  await qa.step(4, async () => {
    await reg.registerButton().click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
  });

  await qa.step(5, async () => {
    await expect(reg.main.getByRole('tabpanel').getByRole('listitem').filter({ hasText: full })).toHaveCount(0);
    await reg.registeredTab.click();
    await reg.search(full);
    await expect(reg.row(full)).toHaveCount(1);
  });
});

qaTest('TC-APP001-009', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const wanted = {
    visitTypes: { 'Emergency desk': false },
    defaultVisitType: 'Staff' as const,
    duplicates: { 'First name': true, 'Last name': true, 'Date of birth': true },
    triage: 'Kuning',
  };

  await qa.step(1, async () => {
    const d = await reg.openFormSettings();
    await expect(d.getByRole('group', { name: 'Visit types' })).toBeVisible();
    await expect(d.getByRole('combobox', { name: 'Default visit type' })).toBeVisible();
    await expect(d.getByRole('group', { name: 'Duplicate fields' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Default triage color' })).toBeVisible();
    await d.getByRole('button', { name: 'Close' }).click();
  });

  await qa.step(2, async () => {
    await reg.setFormSettings(wanted);
  });

  await qa.step(3, async () => {
    const d = await reg.openRegister();
    await expect(reg.visitTypeSelect(d)).toHaveValue(/staff/i);
    await expect(reg.visitTypeSelect(d).getByRole('option', { name: 'Emergency desk' })).toHaveCount(0);
    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(4, async () => {
    await page.reload();
    const d = await reg.openFormSettings();
    await expect(d.getByRole('checkbox', { name: 'Emergency desk' })).not.toBeChecked();
    await expect(d.getByRole('combobox', { name: 'Default visit type' })).toHaveValue(/staff/i);
    for (const f of ['First name', 'Last name', 'Date of birth']) {
      await expect(d.getByRole('group', { name: 'Duplicate fields' }).getByRole('checkbox', { name: f })).toBeChecked();
    }
    await expect(d.getByRole('textbox', { name: 'Default triage color' })).toHaveValue('Kuning');
    await d.getByRole('button', { name: 'Close' }).click();
  });

  qa.notRun(5, 'needs a BR-B clerk: user U6 is not prepared (00-prerequisites.xlsx | Users | row 10)');
});

qaTest('TC-APP001-075', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const pt1 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Satu ${qa.token()}`, dateOfBirth: '1990-05-17' });
  let before = '';

  await qa.step(1, async () => {
    await expect(
      reg.main.getByText('A new registration is valid for one year. Renew extends that date. A deceased patient cannot be renewed.'),
    ).toBeVisible();
    await expect(reg.table.getByRole('columnheader', { name: 'Valid until' })).toBeVisible();
    before = (await (await reg.cell(reg.row(pt1.fullName), 'Valid until')).innerText()).trim();
  });

  await qa.step(2, async () => {
    const d = await reg.openDetails(pt1.fullName);
    await expect(d.getByRole('button', { name: 'Renew' })).toBeVisible();
  });

  await qa.step(3, async () => {
    await reg.detailsDialog(pt1.fullName).getByRole('button', { name: 'Renew' }).click();
    await expect(toastLocator(page, /^Registration renewed$/)).toBeVisible();
  });

  await qa.step(4, async () => {
    // TBD in the workbook: from which date the year is counted. Asserted: a later date.
    await reg.detailsDialog(pt1.fullName).getByRole('button', { name: 'Close' }).last().click();
    await reg.search(pt1.fullName);
    await expect
      .poll(async () => (await (await reg.cell(reg.row(pt1.fullName), 'Valid until')).innerText()).trim())
      .not.toBe(before);
    const after = (await (await reg.cell(reg.row(pt1.fullName), 'Valid until')).innerText()).trim();
    expect(after > before, `Valid until ${before} -> ${after}`).toBe(true);
  });
});

// ---------------------------------------------------------------- negatives

interface Attempt {
  /** Text of the toast shown after Register ('' when none). */
  toast: string;
  /** The dialog closed, i.e. the form was accepted. */
  closed: boolean;
  /** Fields the browser marks as missing (required attribute). */
  missing: string[];
}

/** Clicks Register in the open dialog and reports what the site answered. */
async function attemptRegister(reg: RegisteredPatientsPage): Promise<Attempt> {
  const d = reg.registerDialog();
  const mark = await toastMark(reg.page);
  await reg.registerButton(d).click();
  const missing = await invalidFields(reg);
  if (missing.length) return { toast: '', closed: false, missing };
  await expect.poll(async () => (await toastsSince(reg.page, mark)).length, { timeout: 15_000 }).toBeGreaterThan(0);
  const toasts = await toastsSince(reg.page, mark);
  return { toast: toasts[toasts.length - 1], closed: await d.isHidden(), missing };
}

/** Field names the browser reports as required-but-empty, by their labels. */
async function invalidFields(reg: RegisteredPatientsPage): Promise<string[]> {
  return reg.registerDialog().locator('input:invalid').evaluateAll((els) =>
    els.map((e) => ((e as HTMLInputElement).labels?.[0]?.textContent ?? e.getAttribute('aria-label') ?? '').trim()),
  );
}

/** A token of letters only (digits mapped to a–j), for fields that must hold letters. */
function letters(token: string): string {
  return token.toLowerCase().replace(/\d/g, (d) => 'abcdefghij'[Number(d)]);
}

/** What the site shows today for every refused registration (HTTP 500 from the server action). */
const GENERIC_REFUSAL = 'Registration failed';

/**
 * A refused save: nothing is saved and the dialog stays open. The toast is the
 * workbook's text, or today the generic "Registration failed" (recorded as a
 * deviation, so the test keeps passing once the specific message is shown).
 */
function expectRefused(qa: Qa, step: number, r: Attempt, excelToast: string): void {
  expect(r.closed, 'the dialog stays open').toBe(false);
  expect([excelToast, GENERIC_REFUSAL]).toContain(r.toast);
  if (r.toast !== excelToast) qa.deviation(step, `Toast "${excelToast}"`, `toast "${r.toast}" (HTTP 500)`);
}

/** Row MRNs of all patients matching a unique search text. */
async function mrnsOf(reg: RegisteredPatientsPage, text: string, count: number): Promise<string[]> {
  await reg.search(text);
  await expect(reg.rows()).toHaveCount(count);
  const headers = (await reg.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
  const i = headers.indexOf('MRN');
  return reg.rows().evaluateAll((rows, idx) => rows.map((row) => row.querySelectorAll('td')[idx]?.textContent?.trim() ?? ''), i);
}

qaTest('TC-APP001-010', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  // PT-DUP-A, PT-DUP-B (Data catalogue): both "QA-AMB Pasien Ganda", 1985-03-02, different MRNs.
  const a = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Ganda ${token}`, dateOfBirth: '1985-03-02' });
  await reg.search('');
  const bReg = await reg.openRegister();
  await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Ganda ${token}`, dateOfBirth: '1985-03-02' }, bReg);
  await reg.registerButton(bReg).click();
  await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
  await reg.search(`Ganda ${token}`);
  await expect(reg.rows()).toHaveCount(2);
  const mrns = await Promise.all((await reg.rows().all()).map(async (r) => (await (await reg.cell(r, 'MRN')).innerText()).trim()));
  const b = { mrn: mrns.find((m) => m !== a.mrn)!, fullName: a.fullName };
  // Precondition "PT-DUP-B has one booked appointment": booked with DR-1 on a D-day of its own.
  await ensureMasterData(page);
  const dDay = await claimDDay(page);
  const appts = new AppointmentsPage(page);
  await appts.open();
  const book = await appts.openBook();
  await appts.pick(appts.field(book, 'Patient'), `Ganda ${token}`, b.mrn);
  await appts.fillBook({ patient: b.mrn, department: SHARED.dep1.name, resource: SHARED.dr1.name, type: bookSettings().types[0].name, date: dDay, time: '08:00' }, book);
  await appts.submitBook(book).click();
  await expect(toastLocator(page, /^Appointment booked$/)).toBeVisible();
  await reg.open();
  const d = reg.mergeDialog();

  await qa.step(1, async () => {
    await reg.mergeButton.click();
    await expect(d.getByText('Survivor keeps the record. The duplicate is marked merged. No HL7.')).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Survivor' })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Duplicate' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Merge' })).toBeDisabled();
  });

  await qa.step(2, async () => {
    await reg.pickFrom(d.getByRole('textbox', { name: 'Survivor' }), `Ganda ${token}`, a.mrn, d);
    await expect(d.getByRole('textbox', { name: 'Survivor' })).toHaveValue(`${a.mrn} ${a.fullName}`);
  });

  await qa.step(3, async () => {
    await reg.pickFrom(d.getByRole('textbox', { name: 'Duplicate' }), `Ganda ${token}`, b.mrn, d);
    await expect(d.getByRole('button', { name: 'Merge' })).toBeEnabled();
  });

  await qa.step(4, async () => {
    await d.getByRole('button', { name: 'Merge' }).click();
    await expect(toastLocator(page, /^Patients merged$/)).toBeVisible();
    await expect(d).toBeHidden();
  });

  await qa.step(5, async () => {
    await reg.search(`Pasien Ganda ${token}`);
    await expect(reg.rows()).toHaveCount(1);
    await expect(await reg.cell(reg.rows().first(), 'MRN')).toHaveText(a.mrn);
  });

  await qa.step(6, async () => {
    await appts.open();
    await appts.showRange(dDay);
    const row = (await appts.allRowTexts()).find((r) => r.Patient === a.fullName && r.When === whenText(dDay, '08:00'));
    expect(row, 'the booking of PT-DUP-B').toBeDefined();
    if (row!.MRN !== a.mrn) {
      qa.deviation(6, "The appointment now shows PT-DUP-A's name and MRN", `the appointment still shows PT-DUP-B's MRN ${row!.MRN}`);
    }
  });
  // Frees DR-1's quota on that Monday for later tests (lib/ambulatory-data.ts, D-day).
  await releaseWeek(page, dDay);
});

qaTest('TC-APP001-027', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  await reg.setFormSettings({ duplicates: { 'First name': true, 'Last name': true, 'Date of birth': true } });
  await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Satu ${token}`, dateOfBirth: '1990-05-17' });

  await qa.step(1, async () => {
    const d = await reg.openRegister();
    await reg.fillRegister({ firstName: 'qa-amb pasien', lastName: `SATU ${token.toLowerCase()}`, dateOfBirth: '1990-05-17' }, d);
    expectRefused(qa, 1, await attemptRegister(reg), 'A patient already matches the duplicate fields');
    await expect(d.getByRole('textbox', { name: 'First name' })).toHaveValue('qa-amb pasien');
    await expect(d.getByRole('textbox', { name: 'Last name' })).toHaveValue(`SATU ${token.toLowerCase()}`);
  });

  await qa.step(2, async () => {
    await reg.registerDialog().getByRole('textbox', { name: 'Date of birth' }).fill('1990-05-18');
    expect((await attemptRegister(reg)).toast).toBe('Patient registered');
  });

  await qa.step(3, async () => {
    await reg.search(`Pasien Satu ${token}`);
    await expect(reg.rows()).toHaveCount(2);
    await expect(reg.rows().filter({ hasText: '1990-05-17' })).toHaveCount(1);
    await expect(reg.rows().filter({ hasText: '1990-05-18' })).toHaveCount(1);
  });
});

qaTest('TC-APP001-028', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const pt1 = { firstName: 'QA-AMB Pasien', lastName: `Satu ${token}`, dateOfBirth: '1990-05-17' };
  await reg.register(pt1);

  await qa.step(1, async () => {
    await reg.openRegister();
    await reg.fillRegister(pt1);
    // C2: with no duplicate field ticked the site saves the second record without a warning.
    expect((await attemptRegister(reg)).toast).toBe('Patient registered');
    qa.deviation(1, 'A warning that a patient with these details exists, before or instead of saving', 'saved without a warning (toast "Patient registered")');
  });

  await qa.step(2, async () => {
    await reg.search(`Pasien Satu ${token}`);
    await expect(reg.rows()).toHaveCount(2);
    qa.deviation(2, 'One patient', 'two patients with the same names and date of birth');
  });
});

qaTest('TC-APP001-029', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  await reg.setFormSettings({ duplicates: { 'Last name': true, 'Date of birth': true } });
  // "QA-AMB Kembar Satu" with last name "Kembar": first name "QA-AMB Satu".
  await reg.register({ firstName: 'QA-AMB Satu', lastName: `Kembar ${token}`, dateOfBirth: '2020-02-02' });

  await qa.step(1, async () => {
    const d = await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Dua', lastName: `Kembar ${token}`, dateOfBirth: '2020-02-02' }, d);
    const r = await attemptRegister(reg);
    // C2: the save is refused; the matching patient is not shown and there is no way to confirm another person.
    expect(r.closed).toBe(false);
    expect([GENERIC_REFUSAL, 'A patient already matches the duplicate fields']).toContain(r.toast);
    await expect(d.getByRole('button', { name: /confirm|another person/i })).toHaveCount(0);
    qa.deviation(1, 'The clerk is shown the matching patient and can confirm that this is another person', `refused with toast "${r.toast}"; no way to confirm`);
  });

  await qa.step(2, async () => {
    await reg.registerDialog().getByRole('button', { name: 'Cancel' }).click();
    await reg.search(`Kembar ${token}`);
    await expect(reg.rows()).toHaveCount(1);
    qa.deviation(2, 'Both twins', 'only the first twin (the second could not be saved)');
  });
});

qaTest('TC-APP001-030', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const pt1 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Satu ${token}`, dateOfBirth: '1990-05-17' });
  const mrnField = () => reg.registerDialog().getByRole('textbox', { name: 'MRN (optional)' });

  await qa.step(1, async () => {
    await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Lain ${token}`, mrn: pt1.mrn });
    expectRefused(qa, 1, await attemptRegister(reg), 'MRN already exists for this tenant');
  });

  const refusals: string[] = [];
  await qa.step(2, async () => {
    await mrnField().fill('12345');
    const r = await attemptRegister(reg);
    expect(r.closed).toBe(false);
    refusals.push(r.toast);
    if (!/MRN-YYYY-XXXXXXXX/.test(r.toast)) {
      expect(r.toast).toBe(GENERIC_REFUSAL);
      qa.deviation(2, 'A message that the MRN must look like MRN-YYYY-XXXXXXXX', `toast "${r.toast}"`);
    }
  });

  await qa.step(3, async () => {
    for (const mrn of ['MRN-26-0A1B2C3D', 'MRN-2026-ZZZZZZZZ']) {
      await mrnField().fill(mrn);
      const r = await attemptRegister(reg);
      expect(r.closed).toBe(false);
      expect(r.toast).toBe(refusals[0]);
    }
  });

  await qa.step(4, async () => {
    await mrnField().fill('');
    expect((await attemptRegister(reg)).toast).toBe('Patient registered');
    await reg.search(`Pasien Lain ${token}`);
    await expect(await reg.cell(reg.rows().first(), 'MRN')).toHaveText(/^MRN-\d{4}-[0-9A-F]{8}$/);
  });
});

qaTest('TC-APP001-031', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const mrn = qa.mrn();
  await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Huruf ${token}`, mrn });

  await qa.step(1, async () => {
    await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Huruf Dua ${token}`, mrn: mrn.toLowerCase() });
    expectRefused(qa, 1, await attemptRegister(reg), 'MRN already exists for this tenant');
  });

  await qa.step(2, async () => {
    await reg.registerDialog().getByRole('button', { name: 'Cancel' }).click();
    await reg.search(mrn.slice(-8).toLowerCase());
    await expect(reg.rows()).toHaveCount(1);
  });
});

qaTest('TC-APP001-032', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  await reg.openRegister();

  await qa.step(1, async () => {
    const r = await attemptRegister(reg);
    expect(r.closed).toBe(false);
    expect(r.missing).toContain('First name');
  });

  await qa.step(2, async () => {
    await reg.registerDialog().getByRole('textbox', { name: 'First name' }).fill('QA-AMB Pasien');
    const r = await attemptRegister(reg);
    expect(r.closed).toBe(false);
    expect(r.missing).toContain('Last name');
  });

  await qa.step(3, async () => {
    const d = reg.registerDialog();
    await d.getByRole('textbox', { name: 'First name' }).fill(`QA-Sukarno ${token}`);
    await d.getByRole('textbox', { name: 'Last name' }).fill('');
    const r = await attemptRegister(reg);
    // C2: Last name is required by the form, so a single name cannot be saved.
    expect(r.closed).toBe(false);
    expect(r.missing).toContain('Last name');
    qa.deviation(3, 'The patient is saved with that single name', 'the browser requires Last name; nothing is saved');
  });

  await qa.step(4, async () => {
    const d = reg.registerDialog();
    await d.getByRole('textbox', { name: 'First name' }).fill('   ');
    await d.getByRole('textbox', { name: 'Last name' }).fill(`QA-AMB Spasi ${token}`);
    const r = await attemptRegister(reg);
    // "Saved with the last name only, or refused with a clear message"
    if (r.closed) {
      await reg.search(`Spasi ${token}`);
      await expect(reg.rows()).toHaveCount(1);
    } else {
      expect(r.toast || r.missing.join(',')).not.toBe('');
      if (r.toast === GENERIC_REFUSAL) qa.deviation(4, 'Refused with a clear message', `toast "${r.toast}" (HTTP 500)`);
    }
  });
});

qaTest('TC-APP001-033', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const tryDob = async (last: string, dob: string) => {
    if (!(await reg.registerDialog().isVisible())) await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Batas', lastName: `${last} ${token}`, dateOfBirth: dob });
    return attemptRegister(reg);
  };

  await qa.step(1, async () => {
    const r = await tryDob('Satu', todayWib(1));
    if (r.closed) {
      // C2: a date of birth in the future is accepted.
      expect(r.toast).toBe('Patient registered');
      qa.deviation(1, 'Refused: the date of birth cannot be in the future', 'saved (toast "Patient registered")');
    } else {
      expect(r.toast).toMatch(/future/i);
    }
  });

  await qa.step(2, async () => {
    const r = await tryDob('Dua', '1800-01-01');
    if (r.closed) {
      expect(r.toast).toBe('Patient registered');
      qa.deviation(2, 'Refused, or a warning about the age', 'saved without a warning');
    }
  });

  await qa.step(3, async () => {
    const r = await tryDob('Tiga', todayWib());
    expect(r.toast).toBe('Patient registered');
    await reg.search(`Batas Tiga ${token}`);
    await expect(await reg.cell(reg.rows().first(), 'Date of birth')).toHaveText(`${todayWib()} · 0 years`);
  });

  await qa.step(4, async () => {
    const tag = `qa${letters(token)}`;
    const first = (tag + 'a'.repeat(200)).slice(0, 200);
    const last = (tag + 'b'.repeat(200)).slice(0, 200);
    if (!(await reg.registerDialog().isVisible())) await reg.openRegister();
    await reg.fillRegister({ firstName: first, lastName: last });
    const r = await attemptRegister(reg);
    // "Saved, or refused with a message that names the length limit"
    if (r.closed) {
      await reg.search(tag);
      await expect(reg.rows()).toHaveCount(1);
    } else if (r.toast === GENERIC_REFUSAL) {
      qa.deviation(4, 'Saved, or refused with a message that names the length limit', `refused with toast "${r.toast}" (HTTP 500)`);
    } else {
      expect(r.toast).toMatch(/\d+|length|long|characters/i);
    }
  });
});

qaTest('TC-APP001-034', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const key = `QA-EMP-0001-${token}`;
  await reg.register({ visitType: 'Staff', firstName: 'QA-AMB Staf', lastName: `Satu ${token}`, personKey: key });
  const again = async (visitType: 'Staff' | 'Staff dependent', personKey: string, last: string) => {
    if (!(await reg.registerDialog().isVisible())) await reg.openRegister();
    await reg.fillRegister({ visitType, firstName: 'QA-AMB Staf', lastName: `${last} ${token}`, personKey });
    return attemptRegister(reg);
  };

  await qa.step(1, async () => expectRefused(qa, 1, await again('Staff', key, 'Dua'), 'This person already has an MRN'));
  await qa.step(2, async () => expectRefused(qa, 2, await again('Staff dependent', key, 'Tiga'), 'This person already has an MRN'));
  await qa.step(3, async () => {
    const r = await again('Staff', '', 'Empat');
    expect(r.closed).toBe(false);
    expect(r.missing).toContain('Person key');
  });
  await qa.step(4, async () => {
    const r = await again('Staff', key.toLowerCase(), 'Lima');
    if (r.closed) {
      // C2: the person key check is case-sensitive; the same key in lower case is saved.
      expect(r.toast).toBe('Patient registered');
      qa.deviation(4, 'Toast "This person already has an MRN"', 'saved: the key check is case-sensitive');
    } else {
      expectRefused(qa, 4, r, 'This person already has an MRN');
    }
  });
});

qaTest('TC-APP001-035', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  // PT-MOM (Data catalogue): "QA-AMB Ibu Satu", date of birth 1995-08-09. Test Data: baby "QA-AMB Bayi Tanpa Ibu".
  const mom = await reg.register({ firstName: 'QA-AMB Ibu', lastName: `Satu ${token}`, dateOfBirth: '1995-08-09' });
  const today = todayWib();
  const baby = { visitType: 'Newborn' as const, firstName: 'QA-AMB Bayi Tanpa', lastName: `Ibu ${token}`, dateOfBirth: today, born: today };
  const babyName = `QA-AMB Bayi Tanpa Ibu ${token}`;
  const notSaved = async () => {
    const check = new RegisteredPatientsPage(page);
    if (await reg.registerDialog().isVisible()) return;
    await check.search(babyName);
    await expect(check.row(babyName)).toHaveCount(0);
  };
  await reg.open();
  await reg.openRegister();
  await reg.fillRegister(baby);

  await qa.step(1, async () => {
    expectRefused(qa, 1, await attemptRegister(reg), 'Newborn requires a mother');
    await notSaved();
  });

  await qa.step(2, async () => {
    await reg.registerDialog().getByRole('textbox', { name: 'Mother' }).fill(`Ibu Satu ${token}`);
    expectRefused(qa, 2, await attemptRegister(reg), 'Newborn requires a mother');
    await notSaved();
  });

  await qa.step(3, async () => {
    const d = reg.registerDialog();
    await reg.pickFrom(d.getByRole('textbox', { name: 'Mother' }), `Ibu Satu ${token}`, mom.mrn, d);
    const r = await attemptRegister(reg);
    expect(r.toast).toBe('Patient registered');
    await reg.search(babyName);
    await expect(reg.row(babyName)).toHaveCount(1);
  });

  await qa.step(4, async () => {
    const d = await reg.openRegister();
    await reg.visitTypeSelect(d).selectOption('Newborn');
    const mother = await d.getByRole('textbox', { name: 'Mother' }).inputValue();
    if (mother) qa.deviation(4, 'The Mother field is empty', `the Mother field still shows "${mother}" (the previous mother)`);
    await page.keyboard.press('Escape');
  });
});

qaTest('TC-APP001-036', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  await reg.setFormSettings({ triage: '', duplicates: { 'First name': true, 'Last name': true } });
  const d = await reg.openRegister();
  await reg.visitTypeSelect(d).selectOption('Disaster');
  const row = async (i: number, first: string, last: string) => {
    await d.getByRole('textbox', { name: 'First name' }).nth(i).fill(first);
    await d.getByRole('textbox', { name: 'Last name' }).nth(i).fill(last);
  };

  await qa.step(1, async () => {
    await row(0, 'QA-AMB Korban', `Empat ${token}`);
    await row(1, 'QA-AMB Korban', `Lima ${token}`);
    expectRefused(qa, 1, await attemptRegister(reg), 'Triage color is unset');
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Triage color' }).fill('Merah');
    await row(1, '', '');
    const r = await attemptRegister(reg);
    if (r.closed) {
      qa.deviation(2, 'A message that a disaster batch needs at least two patients', `saved one patient (toast "${r.toast}")`);
    } else if (!/two|2|at least/i.test(r.toast + r.missing.join(','))) {
      expect(r.toast).toBe(GENERIC_REFUSAL);
      qa.deviation(2, 'A message that a disaster batch needs at least two patients', `toast "${r.toast}" (HTTP 500)`);
    }
  });

  await qa.step(3, async () => {
    if (!(await d.isVisible())) {
      await reg.openRegister();
      await reg.visitTypeSelect(d).selectOption('Disaster');
      await d.getByRole('textbox', { name: 'Triage color' }).fill('Merah');
    }
    await row(0, 'QA-AMB Korban', `Empat ${token}`);
    await row(1, 'QA-AMB Korban', `Empat ${token}`);
    expectRefused(qa, 3, await attemptRegister(reg), 'A patient already matches the duplicate fields');
  });

  await qa.step(4, async () => {
    await row(0, 'QA-AMB Korban', `Enam ${token}`);
    await row(1, 'QA-AMB Korban', `Tujuh ${token}`);
    expect((await attemptRegister(reg)).toast).toBe('Disaster patients registered');
    await reg.search(`Enam ${token}`);
    await expect(reg.rows()).toHaveCount(1);
    await reg.search(`Tujuh ${token}`);
    await expect(reg.rows()).toHaveCount(1);
  });
});

qaTest('TC-APP001-039', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  // The workbook does not give the wrong date; the patient is registered without one.
  const p = await reg.register({ firstName: 'QA-AMB Salah', lastName: `Ketik ${qa.token()}` });

  await qa.step(1, async () => {
    const d = await reg.openDetails(p.fullName);
    // C2: the details dialog only offers Consent, Renew and Close.
    await expect(d.getByRole('button', { name: /edit/i })).toHaveCount(0);
    qa.deviation(1, 'Details with a way to edit', 'no edit function (buttons: Consent, Renew, Close)');
  });
  qa.blocked(2, 20);
  await qa.step(3, async () => {
    await expect(reg.detailsDialog(p.fullName).getByRole('button', { name: /deceased|died|death|remove|delete/i })).toHaveCount(0);
    qa.deviation(3, 'Present, with a reason', 'no way to record a death or remove a record');
  });
});

qaTest('TC-APP001-040', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const fields = [/sex|gender/i, /NIK|national id/i, /address/i, /phone/i, /payer/i, /insurance/i];
  await qa.step(1, async () => {
    const d = await reg.openRegister();
    for (const f of fields) await expect(d.getByRole('textbox', { name: f }).or(d.getByRole('combobox', { name: f }))).toHaveCount(0);
    qa.deviation(1, 'Fields are present', 'none of sex, NIK, address, phone, payer, insurance number is on the form');
    await d.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(2, async () => {
    for (const f of fields) await expect(reg.table.getByRole('columnheader', { name: f })).toHaveCount(0);
    qa.deviation(2, 'Shown in the details and in the list', 'not shown (no such data is kept)');
  });
});

qaTest('TC-APP001-042', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const a = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Ganda ${token}`, dateOfBirth: '1985-03-02' });
  await reg.openRegister();
  await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Ganda ${token}`, dateOfBirth: '1985-03-02' });
  expect((await attemptRegister(reg)).toast).toBe('Patient registered');
  const bMrn = (await mrnsOf(reg, `Ganda ${token}`, 2)).find((m) => m !== a.mrn)!;
  // Precondition "PT-DUP-B has an arrival today" (the appointment and other modules' records are not made here).
  await ensureMasterData(page);
  const arrival = new ArrivalPage(page);
  await arrival.open();
  const arrive = await arrival.openArrive();
  await arrival.pickPatient(arrive, `Ganda ${token}`, bMrn);
  await arrival.pickDepartment(arrive, SHARED.dep1.name);
  await arrival.submit(arrive).click();
  await expect(toastLocator(page, /^Arrival number issued$/)).toBeVisible();
  await reg.open();
  const d = reg.mergeDialog();

  await qa.step(1, async () => {
    await reg.mergeButton.click();
    await reg.pickFrom(d.getByRole('textbox', { name: 'Survivor' }), `Ganda ${token}`, a.mrn, d);
    await reg.pickFrom(d.getByRole('textbox', { name: 'Duplicate' }), `Ganda ${token}`, bMrn, d);
    await d.getByRole('button', { name: 'Merge' }).click();
    // C2: the merge runs at once, without a confirmation that names both patients.
    await expect(toastLocator(page, /^Patients merged$/)).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    qa.deviation(1, 'A question to confirm, naming both patients, before anything changes', 'merged at once (toast "Patients merged")');
  });
  await qa.step(2, async () => {
    await expect(reg.main.getByRole('button', { name: /undo|history/i })).toHaveCount(0);
    qa.deviation(2, 'An undo or a merge history', 'neither exists on Registered Patients');
  });
  await qa.step(3, async () => {
    await arrival.open();
    const row = arrival.row(a.fullName, SHARED.dep1.name);
    await expect(row).toHaveCount(1);
    const mrn = (await (await arrival.cell(row, 'MRN')).innerText()).trim();
    if (mrn !== a.mrn) qa.deviation(3, "PT-DUP-B's arrival is shown under PT-DUP-A", `the arrival still shows PT-DUP-B's MRN ${mrn}`);
  });
  qa.notRun(4, 'needs an invoice or drug order of PT-DUP-B in another module (Hospital Accounts / Pharmacy)');
});

qaTest('TC-APP001-066', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const addresses = ['?next=https://example.org', '?next=/pharmacy/dispense://x', '?next=/billing'];
  const check = async (query: string, last: string) => {
    await reg.open(query);
    await expect(reg.registerDialog()).toBeHidden();
    await expect(page.getByText('Registration saves this walk-in. The pharmacy wizard continues with the saved patient.')).toHaveCount(0);
    await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `${last} ${token}` });
    const r = await attemptRegister(reg);
    expect(r.toast).toBe('Patient registered');
    await expect(page).toHaveURL(/\/en\/registration\/patients/);
    await expect(reg.heading).toBeVisible();
  };

  await qa.step(1, async () => {
    await reg.open(addresses[0]);
    await expect(reg.registerDialog()).toBeHidden();
    await expect(page.getByText('Registration saves this walk-in. The pharmacy wizard continues with the saved patient.')).toHaveCount(0);
  });
  await qa.step(2, async () => {
    await check(addresses[0], 'Alamat Satu');
  });
  await qa.step(3, async () => {
    await check(addresses[1], 'Alamat Dua');
    await check(addresses[2], 'Alamat Tiga');
  });
});

qaTest('TC-APP001-067', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const token = qa.token();
  const first = '<script>alert(1)</script>';
  const last = `<img src=x onerror=alert(1)> ${token}`;
  const scripts: string[] = [];
  page.on('dialog', async (dlg) => {
    scripts.push(dlg.message());
    await dlg.dismiss();
  });

  await qa.step(1, async () => {
    await reg.openRegister();
    await reg.fillRegister({ firstName: first, lastName: last });
    expect((await attemptRegister(reg)).toast).toBe('Patient registered');
  });

  await qa.step(2, async () => {
    await reg.search(token);
    await expect(await reg.cell(reg.rows().first(), 'Full name')).toHaveText(`${first} ${last}`);
    const d = await reg.openDetails(`${first} ${last}`);
    await expect(reg.detail(d, 'First name')).toHaveText(first);
    await expect(reg.detail(d, 'Last name')).toHaveText(last);
    await d.getByRole('button', { name: 'Close' }).last().click();
    await reg.rows().first().getByRole('button', { name: 'Print barcode' }).click();
    // The label is a card on the page ("Barcode of this MRN."), not a dialog.
    await expect(reg.main.getByText('Barcode of this MRN.')).toBeVisible();
    await expect(reg.main.getByRole('paragraph').filter({ hasText: `${first} ${last}` })).toHaveText(`${first} ${last}`);
    await reg.main.getByRole('button', { name: 'Done' }).click();
    expect(scripts).toEqual([]);
  });

  await qa.step(3, async () => {
    await reg.open();
    await reg.search(token);
    const mrn = (await (await reg.cell(reg.rows().first(), 'MRN')).innerText()).trim();
    await ensureMasterData(page);
    const arrival = new ArrivalPage(page);
    await arrival.open();
    const arrive = await arrival.openArrive();
    await arrival.pickPatient(arrive, token, mrn);
    await arrival.pickDepartment(arrive, SHARED.dep1.name);
    await arrival.submit(arrive).click();
    await expect(toastLocator(page, /^Arrival number issued$/)).toBeVisible();
    const row = arrival.row(mrn);
    await expect(await arrival.cell(row, 'Patient')).toHaveText(`${first} ${last}`);
    await row.getByRole('button', { name: 'Call', exact: true }).click();
    await expect(toastLocator(page, /^Called$/)).toBeVisible();
    const board = new QueueBoardPage(page);
    await board.open();
    const onBoard = board.row(mrn);
    if (await onBoard.count()) await expect(onBoard.getByRole('cell', { name: `${first} ${last}`, exact: true })).toBeVisible();
    else qa.note(3, 'the board has no row for the arrival (it lists appointment tokens only, see TC-APP001-021); names checked on Arrival');
    expect(scripts).toEqual([]);
  });

  await qa.step(4, async () => {
    await reg.open();
    await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB', lastName: `O'Brien ${token}` });
    expect((await attemptRegister(reg)).toast).toBe('Patient registered');
    await reg.search("o'b");
    await expect(reg.row(`O'Brien ${token}`)).toHaveCount(1);
  });

  await qa.step(5, async () => {
    for (const term of ['%', '_']) {
      await reg.search(term);
      await expect(reg.table).toBeVisible();
      await expect(page.getByRole('alert').filter({ hasText: /error|failed/i })).toHaveCount(0);
    }
    expect(scripts).toEqual([]);
  });
});

qaTest('TC-APP001-076', async () => {
  // Declared fixme by found blocker 19: no patient can be marked deceased, so the precondition cannot be made.
  throw new Error('TC-APP001-076 runs once blocker 19 is removed from lib/qa-data/found-blockers.ts: write its steps');
});

qaTest('TC-APP001-022', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  const main = page.getByRole('main');
  // Test Data: "QA-AMB Pembeli Satu", made unique per run.
  const last = `Satu ${qa.token()}`;
  const fullName = `QA-AMB Pembeli ${last}`;
  let d = reg.registerDialog();

  await qa.step(1, async () => {
    // Precondition: a counter sale in Pharmacy, Dispense for a person who is not registered.
    await page.goto('/en/pharmacy/dispense');
    await expect(main.getByRole('heading', { level: 1, name: 'Dispense' })).toBeVisible();
    await main.getByRole('searchbox', { name: 'Search medical record' }).fill(fullName);
    await main.getByRole('button', { name: 'Search medical record' }).click();
    await expect(main.getByText('No medical record matches.')).toBeVisible();
    await main.getByRole('link', { name: 'Register on the patient form' }).click();
    await expect(reg.heading).toBeVisible();
    d = reg.registerDialog();
    await expect(d).toBeVisible();
    await expect(page.getByText('Registration saves this walk-in. The pharmacy wizard continues with the saved patient.')).toBeVisible();
  });

  await qa.step(2, async () => {
    await reg.fillRegister({ firstName: 'QA-AMB Pembeli', lastName: last }, d);
    await reg.registerButton(d).click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await expect(page).toHaveURL(/\/pharmacy\/dispense/);
    await expect(main.getByText('No medical record selected.')).toHaveCount(0);
    await expect(main).toContainText(fullName);
  });

  await qa.step(3, async () => {
    await reg.open();
    await reg.search(last);
    await expect(reg.row(fullName)).toHaveCount(1);
  });
});
