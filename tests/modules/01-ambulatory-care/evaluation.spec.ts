import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { ensureMasterData, SHARED } from '../../../lib/ambulatory-data';
import { PASSWORD } from '../../../lib/config';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { AppointmentsPage } from '../../../pages/ambulatory/AppointmentsPage';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { DEFAULT_FORM_SETTINGS, RegisteredPatientsPage, VISIT_TYPES } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { LoginPage } from '../../../pages/LoginPage';
import { userPage } from '../shared/access';
import { NotOffered } from '../../../lib/not-offered';

/**
 * 01-ambulatory-care.xlsx, the journeys marked "Needs Evaluation" (automated
 * since 2026-10-29, open question Q10): registration seen from the other
 * screens, settings and lists changed by a second clerk, double clicks, the
 * register without a session, and the priority rules and patient flags.
 * "Clerk 2" is U4 (qa.admin3, a second user of the same role).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Toasts after `mark`, waiting up to 6 s for the first one. */
async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 6_000 }).toBeGreaterThan(0).catch(() => {});
  return toastsSince(page, mark);
}

async function clicked(page: Page, button: Locator): Promise<string[]> {
  const mark = await toastMark(page);
  await button.click();
  return toastsAfter(page, mark);
}

/** Types into a type-ahead and waits for the suggestion naming `name`. */
async function offered(page: Page, field: Locator, typed: string, name: string): Promise<boolean> {
  await field.fill(typed);
  const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
  return list.getByRole('option').filter({ hasText: name }).first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
}

qaTest('TC-APP001-023', async ({ page, qa }) => {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const p = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Satu ${qa.token()}`, dateOfBirth: '1990-01-15' });
  await qa.step(1, async () => {
    const appts = new AppointmentsPage(page);
    await appts.open();
    const d = await appts.openBook();
    expect(await offered(page, appts.field(d, 'Patient'), p.mrn, p.fullName), `${p.fullName} offered in Book`).toBe(true);
  });
  await qa.step(2, async () => {
    const arrival = new ArrivalPage(page);
    await arrival.open();
    const d = await arrival.openArrive();
    if (!(await offered(page, arrival.patientField(d), p.mrn, p.fullName))) {
      const byName = await offered(page, arrival.patientField(d), p.fullName, p.fullName);
      qa.note(2, `"Patient" of Arrive finds PT-1 by its MRN: no; by its name: ${byName ? 'yes' : 'no'}`);
      if (!byName) throw new NotOffered(`${p.fullName} is offered by "Patient" of Arrive neither by MRN nor by name (found blocker 40)`);
      qa.deviation(2, 'PT-1 is offered when the MRN is typed', 'the MRN finds nobody; the name finds PT-1');
    }
  });
  await qa.step(3, async () => {
    const c = new ConsultationPage(page);
    await c.open();
    await c.pickPatient(p.mrn, p.fullName);
    const pane = (await c.pane.innerText()).replace(/\s+/g, ' ');
    expect(pane).toContain(p.mrn);
    if (!/1990|15 Jan|Jan 15/.test(pane)) qa.deviation(3, 'Left pane: name, MRN and date of birth', 'name and MRN; no date of birth');
  });
});

qaTest('TC-APP001-037', async ({ page, qa, browser }) => {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  await reg.setFormSettings(DEFAULT_FORM_SETTINGS);
  const newborn = (d: Locator) => d.getByRole('group', { name: 'Visit types' }).getByRole('checkbox', { name: 'Newborn', exact: true });
  const clerk2 = await userPage(browser, 'U4');
  try {
    await qa.step(1, async () => {
      const d = await reg.openFormSettings();
      await newborn(d).uncheck();
      await d.getByRole('button', { name: 'Cancel' }).click();
      const r = await reg.openRegister();
      const still = await reg.visitTypeSelect(r).locator('option', { hasText: 'Newborn' }).count();
      if (!still) qa.deviation(1, 'Nothing changed: "New Registration" still offers "Newborn"', '"Newborn" is no longer offered although the settings were cancelled');
      await r.getByRole('button', { name: 'Cancel' }).click();
    });
    await qa.step(2, async () => {
      const reg2 = new RegisteredPatientsPage(clerk2);
      await reg2.open();
      const r2 = await reg2.openRegister();
      await reg2.visitTypeSelect(r2).selectOption('Newborn');
      await reg2.fillRegister({ firstName: 'QA-AMB Bayi', lastName: `Baru ${qa.token()}`, dateOfBirth: new Date().toISOString().slice(0, 10) }, r2);
      await reg.setFormSettings({ visitTypes: { Newborn: false } });
      const toasts = await clicked(clerk2, reg2.registerButton(r2));
      qa.note(2, `Clerk 2 registers with "Newborn" after it was switched off: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes('Patient registered')) qa.deviation(2, 'Refused with a message that the visit type is not enabled', 'the patient is registered as "Newborn"');
    });
    await qa.step(3, async () => {
      const d = await reg.openFormSettings();
      for (const v of VISIT_TYPES) await d.getByRole('group', { name: 'Visit types' }).getByRole('checkbox', { name: v, exact: true }).uncheck();
      const toasts = await clicked(page, d.getByRole('button', { name: 'Save settings' }));
      qa.note(3, `every visit type off: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes('Settings saved')) qa.deviation(3, 'Refused with a message that at least one visit type is needed', 'saved with no visit type');
      if (await d.isVisible()) await d.getByRole('button', { name: 'Cancel' }).click();
    });
  } finally {
    await clerk2.context().close();
    await reg.open();
    await reg.setFormSettings(DEFAULT_FORM_SETTINGS);
  }
});

qaTest('TC-APP001-038', async ({ page, qa, browser }) => {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const last = `Dua ${qa.token()}`;
  const full = `QA-AMB Calon ${last}`;
  const panel = await reg.openPreRegistration();
  await panel.getByRole('textbox', { name: 'First name' }).fill('QA-AMB Calon');
  await panel.getByRole('textbox', { name: 'Last name' }).fill(last);
  await panel.getByRole('textbox', { name: 'Date of birth' }).fill('1992-11-20');
  await panel.getByRole('button', { name: 'Add to worklist' }).click();
  await expect(toastLocator(page, /^Added to the worklist$/)).toBeVisible();
  const clerk2 = await userPage(browser, 'U4');
  try {
    const reg2 = new RegisteredPatientsPage(clerk2);
    await reg2.open();
    const panel2 = await reg2.openPreRegistration();
    await qa.step(1, async () => {
      await panel.getByRole('listitem').filter({ hasText: full }).getByRole('button', { name: 'Open form' }).click();
      await panel2.getByRole('listitem').filter({ hasText: full }).getByRole('button', { name: 'Open form' }).click();
      for (const r of [reg, reg2]) await expect(r.registerDialog().getByRole('textbox', { name: 'Last name' }).first()).toHaveValue(last);
    });
    await qa.step(2, async () => {
      expect(await clicked(page, reg.registerButton())).toContain('Patient registered');
    });
    await qa.step(3, async () => {
      const toasts = await clicked(clerk2, reg2.registerButton());
      await reg.open();
      await reg.search(full);
      const n = await reg.row(full).count();
      qa.note(3, `Clerk 2 registers the same intake: "${toasts.join(' / ') || 'no toast'}"; ${n} patient(s) named ${full}`);
      if (n > 1) qa.deviation(3, 'Refused. No second patient', `${n} patients are registered from one intake`);
    });
    await qa.step(4, async () => {
      await clerk2.reload();
      const p2 = await reg2.openPreRegistration();
      await expect(p2.getByRole('listitem').filter({ hasText: full })).toHaveCount(0);
    });
  } finally {
    await clerk2.context().close();
  }
});

qaTest('TC-APP001-041', async ({ page, qa, browser }) => {
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const t = qa.token();
  const pt2 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Dua ${t}`, dateOfBirth: '1988-05-05' });
  const pt3 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Tiga ${t}`, dateOfBirth: '1979-09-09' });
  const d = reg.mergeDialog();
  const merge = () => d.getByRole('button', { name: 'Merge', exact: true });
  await qa.step(1, async () => {
    await reg.mergeButton.click();
    await d.getByRole('textbox', { name: 'Survivor' }).fill(`Dua ${t}`);
    await expect(merge()).toBeDisabled();
  });
  await qa.step(2, async () => {
    await reg.open();
    await reg.mergeButton.click();
    await reg.pickFrom(d.getByRole('textbox', { name: 'Survivor' }), `Dua ${t}`, pt2.mrn, d);
    await reg.pickFrom(d.getByRole('textbox', { name: 'Duplicate' }), `Dua ${t}`, pt2.mrn, d);
    const disabled = await merge().isDisabled();
    const toasts = disabled ? [] : await clicked(page, merge());
    qa.note(2, disabled ? '"Merge" stays disabled for the same patient twice' : `"Merge" of a patient with itself: "${toasts.join(' / ') || 'no toast'}"`);
    if (toasts.includes('Patients merged')) qa.deviation(2, 'Refused: a patient cannot be merged with itself', 'merged ("Patients merged")');
  });
  const clerk2 = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const reg2 = new RegisteredPatientsPage(clerk2);
      const d2 = reg2.mergeDialog();
      await reg.open();
      await reg2.open();
      for (const [r, dd] of [[reg, d], [reg2, d2]] as const) {
        await r.mergeButton.click();
        await r.pickFrom(dd.getByRole('textbox', { name: 'Survivor' }), `Dua ${t}`, pt2.mrn, dd);
        await r.pickFrom(dd.getByRole('textbox', { name: 'Duplicate' }), `Tiga ${t}`, pt3.mrn, dd);
      }
      expect(await clicked(page, merge())).toContain('Patients merged');
      const second = await clicked(clerk2, d2.getByRole('button', { name: 'Merge', exact: true }));
      qa.note(3, `Clerk 2 merges the same pair after: "${second.join(' / ') || 'no toast'}"`);
      if (second.includes('Patients merged')) qa.deviation(3, 'Clerk 2: refused', 'the second merge of the same pair is accepted ("Patients merged")');
    });
  } finally {
    await clerk2.context().close();
  }
});

qaTest('TC-APP001-057', async ({ page, qa, browser }) => {
  await ensureMasterData(page);
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const t = qa.token();
  const pts: { mrn: string; fullName: string }[] = [];
  for (const n of ['Satu', 'Dua', 'Tiga']) pts.push(await reg.register({ firstName: 'QA-AMB Pasien', lastName: `${n} ${t}` }));
  const arrival = new ArrivalPage(page);
  await arrival.open();
  for (const p of pts) await arrival.arrive(p.fullName, SHARED.dep1.name);
  const call = (a: ArrivalPage, name: string) => a.row(name, SHARED.dep1.name).getByRole('button', { name: 'Call', exact: true });
  const clerk2 = await userPage(browser, 'U4');
  try {
    const arrival2 = new ArrivalPage(clerk2);
    await arrival.open();
    await arrival2.open();
    await qa.step(1, async () => {
      expect(await clicked(page, call(arrival, pts[0].fullName))).toContain('Called');
      const late = (await call(arrival2, pts[0].fullName).isVisible().catch(() => false)) ? await clicked(clerk2, call(arrival2, pts[0].fullName)) : ['(no "Call" left)'];
      qa.note(1, `Clerk 2 calls 001 after Clerk: "${late.join(' / ') || 'no toast'}"`);
      if (late.includes('Called')) qa.deviation(1, 'Clerk 2: told that the number was already called', 'called a second time ("Called")');
    });
    await qa.step(2, async () => {
      await arrival.open();
      const offeredCall = await call(arrival, pts[2].fullName).isVisible().catch(() => false);
      const toasts = offeredCall ? await clicked(page, call(arrival, pts[2].fullName)) : [];
      qa.note(2, offeredCall ? `"Call" on 003 while 002 waits: "${toasts.join(' / ') || 'no toast'}"` : '"Call" is not offered on 003 while 002 waits');
      if (toasts.includes('Called') && !toasts.some((x) => /before|first|order/i.test(x))) qa.deviation(2, 'A warning that 002 is before 003, or the call is not offered', '003 is called with no warning');
    });
    await qa.step(3, async () => {
      await arrival.open();
      const buttons = [...new Set((await arrival.table.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean))];
      qa.note(3, `actions on the rows: ${buttons.join(', ')}`);
      if (!buttons.some((b) => /again|recall|not present|absent|end|undo/i.test(b))) qa.deviation(3, 'Present: call again, mark as not present, end the visit, undo a call', `the rows offer ${buttons.join(', ')}`);
    });
  } finally {
    await clerk2.context().close();
  }
});

qaTest('TC-APP001-065', async ({ qa, browser }) => {
  // A browser with no session.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await qa.step(1, async () => {
    await page.goto('/id/registration/patients');
    await expect(page).toHaveURL(/\/login\?next=%2Fregistration%2Fpatients/, { timeout: 20_000 });
  });
  await qa.step(2, async () => {
    await page.goto('/id/queue');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
  await qa.step(3, async () => {
    await page.goto('/id/registration/patients');
    const login = new LoginPage(page);
    await page.getByRole('textbox').first().waitFor();
    await login.username.fill(userLogin('U1')!);
    await login.password.fill(PASSWORD);
    await login.submit.click();
    await page.waitForURL(/\/(id|en)\/(registration\/patients|apps|login)/, { timeout: 20_000 }).catch(() => {});
    if (!/registration\/patients/.test(page.url())) qa.deviation(3, 'The page that was asked for', `after signing in: ${new URL(page.url()).pathname}`);
  });
  await qa.step(4, async () => {
    if (/\/login/.test(page.url())) return qa.note(4, 'not signed in after step 3');
    await new AppHeader(page).signOut();
    await page.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => {});
    await page.goBack();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
  await context.close();
});

qaTest('TC-APP001-068', async ({ page, qa, browser }) => {
  await ensureMasterData(page);
  const reg = new RegisteredPatientsPage(page);
  await reg.open();
  const t = qa.token();
  await qa.step(1, async () => {
    const last = `Dobel ${t}`;
    const d = await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: last }, d);
    await reg.registerButton(d).dblclick();
    await expect(toastLocator(page, /^Patient registered$/).first()).toBeVisible();
    await reg.open();
    await reg.search(last);
    const n = await reg.row(last).count();
    qa.note(1, `double-click on "Register": ${n} patient(s)`);
    if (n !== 1) qa.deviation(1, 'One patient; the button is disabled while it reads "Saving…"', `${n} patients are registered`);
  });
  const clerk2 = await userPage(browser, 'U4');
  try {
    const reg2 = new RegisteredPatientsPage(clerk2);
    await qa.step(2, async () => {
      // A typed MRN in the form the site gives ("MRN-YYYY-XXXXXXXX").
      const mrn = `MRN-${new Date().getFullYear()}-${t.slice(-8).padStart(8, '0')}`;
      await reg.open();
      await reg2.open();
      const d1 = await reg.openRegister();
      const d2 = await reg2.openRegister();
      await reg.fillRegister({ mrn, firstName: 'QA-AMB Pasien', lastName: `Sama ${t}` }, d1);
      await reg2.fillRegister({ mrn, firstName: 'QA-AMB Pasien', lastName: `Lain ${t}` }, d2);
      const [m1, m2] = [await toastMark(page), await toastMark(clerk2)];
      await Promise.all([reg.registerButton(d1).click(), reg2.registerButton(d2).click()]);
      const [a, b] = [await toastsAfter(page, m1), await toastsAfter(clerk2, m2)];
      qa.note(2, `the same typed MRN at once: "${a.join(' / ')}" and "${b.join(' / ')}"`);
      const saved = [a, b].filter((x) => x.includes('Patient registered')).length;
      if (saved !== 1) qa.deviation(2, 'One is saved; the other gets "MRN already exists for this tenant"', `${saved} saved`);
    });
    await qa.step(3, async () => {
      await reg.open();
      const p2 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Dua ${t}` });
      const p3 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Tiga ${t}` });
      const [a1, a2] = [new ArrivalPage(page), new ArrivalPage(clerk2)];
      await a1.open();
      await a2.open();
      const [d1, d2] = [await a1.openArrive(), await a2.openArrive()];
      await a1.pickPatient(d1, p2.fullName);
      await a1.pickDepartment(d1, SHARED.dep1.name);
      await a2.pickPatient(d2, p3.fullName);
      await a2.pickDepartment(d2, SHARED.dep1.name);
      await Promise.all([a1.submit(d1).click(), a2.submit(d2).click()]);
      await a1.open();
      const nos = [];
      for (const p of [p2, p3]) nos.push((await (await a1.cell(a1.row(p.fullName, SHARED.dep1.name), 'No.')).innerText().catch(() => '')).trim());
      qa.note(3, `numbers at the same moment: ${nos.join(', ')}`);
      if (nos[0] && nos[0] === nos[1]) qa.deviation(3, 'Two different numbers, one after the other', `both got ${nos[0]}`);
    });
    await qa.step(4, async () => {
      await reg.open();
      const d = await reg.openRegister();
      await d.getByRole('textbox', { name: 'First name' }).first().fill('QA-AMB Setengah');
      let warned = false;
      page.once('dialog', (dlg) => {
        warned = true;
        void dlg.accept();
      });
      await page.reload({ timeout: 30_000 }).catch(() => {});
      await reg.open();
      qa.note(4, warned ? 'the browser asks before leaving' : 'the page reloads with no warning; the entries are gone');
      if (!warned) qa.deviation(4, 'The entries are kept, or the clerk is warned before leaving', 'the half-filled form is lost with no warning');
    });
  } finally {
    await clerk2.context().close();
  }
  await qa.step(5, async () => {
    const tab = await page.context().newPage();
    await reg.open();
    const d = await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Keluar ${t}` }, d);
    await tab.goto('/id/apps');
    await new AppHeader(tab).signOut();
    await tab.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => {});
    const toasts = await clicked(page, reg.registerButton(d));
    qa.note(5, `"Register" after signing out in another tab: "${toasts.join(' / ') || 'no toast'}"; the page is ${new URL(page.url()).pathname}`);
    if (toasts.includes('Patient registered')) qa.deviation(5, 'Nothing is saved; the clerk is told, or taken to sign in', 'the patient is registered after the sign-out');
    await tab.close();
  });
});

/** A desk of Registration settings with "Add" (Tambah) and a list. */
async function addDialog(page: Page, route: string): Promise<Locator> {
  await page.goto(`/id/registration/${route}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('main').getByRole('button', { name: 'Add', exact: true }).click();
  const d = page.getByRole('dialog').last();
  await expect(d).toBeVisible();
  return d;
}

const saveButton = (d: Locator) => d.getByRole('button', { name: /^(Save|Add|Create)$/ }).last();

async function priorityRule(page: Page, code: string, name: string): Promise<string[]> {
  const d = await addDialog(page, 'priority-rules');
  await d.getByRole('textbox', { name: 'Code', exact: true }).fill(code);
  await d.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  return clicked(page, saveButton(d));
}

async function patientFlag(page: Page, name: string): Promise<string[]> {
  const d = await addDialog(page, 'patient-flags');
  await d.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await d.getByRole('textbox', { name: 'Expression', exact: true }).fill('age >= 60');
  await d.getByRole('spinbutton', { name: 'Priority' }).fill('1');
  const lists = d.locator('select');
  for (let i = 0; i < (await lists.count()); i++) await lists.nth(i).selectOption({ index: 1 }).catch(() => {});
  return clicked(page, saveButton(d));
}

qaTest('TC-APP001-069', async ({ page, qa }) => {
  const code = qa.code('X-PR');
  const name = qa.prefix('X Prioritas lansia');
  await qa.step(1, async () => {
    const d = await addDialog(page, 'priority-rules');
    for (const f of ['Code', 'Name']) await expect(d.getByRole('textbox', { name: f, exact: true })).toBeVisible();
    await expect(d.getByRole('checkbox', { name: 'Active' })).toBeVisible();
  });
  await qa.step(2, async () => {
    const toasts = await priorityRule(page, code, name);
    qa.note(2, `save: "${toasts.join(' / ') || 'no toast'}"`);
  });
  await qa.step(3, async () => {
    await page.goto('/id/registration/priority-rules');
    await expect(page.getByRole('main').getByRole('row').filter({ hasText: code.toUpperCase() }).or(page.getByRole('main').getByRole('row').filter({ hasText: code }))).toHaveCount(1);
  });
});

qaTest('TC-APP001-070', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const d = await addDialog(page, 'priority-rules');
    const toasts = await clicked(page, saveButton(d));
    const invalid = await d.locator('input:invalid').count();
    qa.note(1, `empty save: "${toasts.join(' / ') || 'no toast'}"; ${invalid} field(s) marked invalid`);
    if (toasts.some((x) => /saved|created|added/i.test(x))) qa.deviation(1, 'The save is refused; required: "Kode", "Nama"', `saved ("${toasts.join(' / ')}")`);
  });
});

qaTest('TC-APP001-071', async ({ qa, browser }) => {
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const toasts = await priorityRule(staff, qa.code('X-PR'), qa.prefix('X Prioritas tanpa hak')).catch((e: Error) => [`(${e.message.split('\n')[0].slice(0, 80)})`]);
      qa.note(1, `U3 (no REGISTRATION_WRITE) saves a priority rule: "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook)`);
      if (toasts.some((x) => /saved|created|added/i.test(x))) qa.deviation(1, 'Refused for lack of the right', 'saved by U3');
    });
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP001-072', async ({ page, qa }) => {
  const name = qa.prefix('X Lansia');
  await qa.step(1, async () => {
    const d = await addDialog(page, 'patient-flags');
    for (const f of ['Name', 'Expression']) await expect(d.getByRole('textbox', { name: f, exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    const toasts = await patientFlag(page, name);
    qa.note(2, `save: "${toasts.join(' / ') || 'no toast'}"`);
  });
  await qa.step(3, async () => {
    await page.goto('/id/registration/patient-flags');
    await expect(page.getByRole('main').getByRole('row').filter({ hasText: name })).toHaveCount(1);
  });
});

qaTest('TC-APP001-073', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const d = await addDialog(page, 'patient-flags');
    const toasts = await clicked(page, saveButton(d));
    qa.note(1, `empty save: "${toasts.join(' / ') || 'no toast'}"; ${await d.locator('input:invalid').count()} field(s) marked invalid`);
    if (toasts.some((x) => /saved|created|added/i.test(x))) qa.deviation(1, 'The save is refused; required: "Nama"', `saved ("${toasts.join(' / ')}")`);
  });
});

qaTest('TC-APP001-074', async ({ qa, browser }) => {
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const toasts = await patientFlag(staff, qa.prefix('X Penanda tanpa hak')).catch((e: Error) => [`(${e.message.split('\n')[0].slice(0, 80)})`]);
      qa.note(1, `U3 (no REGISTRATION_WRITE) saves a patient flag: "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook)`);
      if (toasts.some((x) => /saved|created|added/i.test(x))) qa.deviation(1, 'Refused for lack of the right', 'saved by U3');
    });
  } finally {
    await staff.context().close();
  }
});
