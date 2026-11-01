import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder } from '../../../lib/assertions';
import { CLINICAL } from '../../../lib/clinical-data';
import { addDays, todayWib } from '../../../lib/dates';
import { DIET } from '../../../lib/diet-data';
import { HR } from '../../../lib/hr-data';
import { PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { TypeListPage } from '../../../pages/appointment/TypeListPage';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { StockPage } from '../../../pages/bloodbank/BloodBankPages';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { AdmissionsPage } from '../../../pages/inpatient/InpatientPages';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { createOrder, docNo } from '../09-procurement/cases';
import { create as createOtRequest, procedure } from '../08-operation-theater/helpers';
import { createEmployee, employeeData } from '../10-hr/helpers';
import { create as createLabOrder, labType } from '../11-laboratory/helpers';
import { RadOrdersPage } from '../12-ris/helpers';
import { RequestsPage as DietRequests } from '../13-dietary/helpers';
import { VisitsPage } from '../15-emergency/helpers';
import { requests as mrdRequests } from '../16-mrd/helpers';
import { Desk as PayrollDesk } from '../17-payroll/helpers';
import { departments } from '../18-settings/helpers';
import { Vouchers } from '../19-finance/helpers';
import { heads, YEAR } from '../20-budget/cases';
import { master as cssdMaster } from '../21-cssd/cases';
import { desk as servicesDesk } from '../22-services/cases';
import { desk as sourcingDesk } from '../23-sourcing/cases';
import { STORES, stores as linenStores } from '../25-linen/cases';
import { CA, NE, plans } from '../26-maintenance/cases';
import { CH, masters as assetMasters } from '../27-fixed-assets/cases';
import { Desk, SAVED } from '../shared/desk';
import { seedPatientOf, toastsOf, userPage } from '../shared/access';
import { patientIdOf } from '../shared/internal-ids';
import { modules } from '../../../lib/qa-data';

/**
 * "Write without the write privilege" of every workbook (journey "Access to
 * <application>: session, licence and write privilege"): "With a role that
 * has no write privilege for the application, saves a record on any of its
 * screens" → "The API answers 403 "missing required privilege"; nothing is
 * saved. TBD: the text the screen shows."
 *
 * The role is that of U3 (qa.staff, role qa_staff without any privilege),
 * which opens every application (seen 2026-11-01). The journey names U10 for
 * its licence case only (lib/qa-data/plan.ts, usersOfCase). Each application
 * is tried on one screen with a save its own tests make as U1: the success
 * text must not follow, and the text shown is recorded. A save that is taken
 * anyway changes only a record of the test (or saves a setting unchanged).
 */

interface Tried { what: string; shown: string[]; saved: RegExp }
type Writer = (u3: Page, u1: Page, qa: Qa) => Promise<Tried>;

/** Clicks the Save (or Create) button of the open dialog and returns the toasts. */
async function saveDialog(page: Page, name: RegExp = /^(Save|Saving…)$/): Promise<string[]> {
  return toastsOf(page, () => page.getByRole('dialog').last().getByRole('button', { name }).click());
}

const WRITERS: Record<string, Writer> = {
  '01': async (u3, _u1, qa) => {
    const reg = new RegisteredPatientsPage(u3);
    await reg.open();
    const d = await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Tanpa', lastName: `Hak ${qa.token()}` }, d);
    return { what: 'Register (Registered Patients)', shown: await toastsOf(u3, () => reg.registerButton(d).click()), saved: /^Patient registered$/ };
  },
  '02': async (u3, _u1, qa) => {
    const t = new TypeListPage(u3, 'Referral types');
    await t.open();
    await t.openAdd();
    await t.fill(qa.code('X-RJK'), qa.name('X Rujukan tanpa hak'));
    return { what: 'Add (Referral types)', shown: await saveDialog(u3), saved: /saved|created|added/i };
  },
  '03': async (u3, u1, qa) => {
    const pt = await registerPatient(u1, CLINICAL.pt1.name, qa.token());
    const c = new ConsultationPage(u3);
    await c.openFor(pt);
    await c.fillOrder(CLINICAL.standardOrder);
    return { what: 'Submit order (Consultation)', shown: await toastsOf(u3, () => c.submitOrder().click()), saved: /^Order placed\.$/ };
  },
  '04': async (u3, _u1, qa) => {
    const adm = new AdmissionsPage(u3);
    await adm.open();
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(qa.name('QA-INP Tanpa Hak'));
    await adm.next();
    await adm.next();
    return { what: 'Admit (Admissions)', shown: await toastsOf(u3, () => adm.wizard.getByRole('button', { name: /^(Admit|Saving…)$/ }).click()), saved: /^Patient admitted$/ };
  },
  '05': async (u3) => {
    // Pharmacy: "Visit types" of a store (the setting is saved as it is shown).
    await u3.goto('/id/inventory/stores');
    const row = u3.getByRole('main').getByRole('table').getByRole('row').filter({ has: u3.getByRole('cell', { name: PHARMACY_STORE.code, exact: true }) });
    await row.getByRole('cell').nth(4).getByRole('button').click();
    await expect(u3.getByRole('dialog').filter({ hasText: 'Visit types' })).toBeVisible();
    return { what: `Save (Visit types of the store ${PHARMACY_STORE.code})`, shown: await saveDialog(u3), saved: /^Visit types saved\.$/ };
  },
  '06': async (u3, _u1, qa) => {
    const stock = new StockPage(u3);
    await stock.open();
    const d = await stock.openDialog('Intake stock', 'Stock intake');
    await stock.fill(d, { 'Blood bag no': qa.code('QA-TANPA-HAK'), 'Expiry date': addDays(todayWib(), 10), Quantity: '350' });
    return { what: 'Intake stock (Stock)', shown: await saveDialog(u3), saved: /^Stock intake recorded$/ };
  },
  '07': async (u3, _u1, qa) => {
    const items = new ItemMasterPage(u3);
    await items.open();
    const d = await items.openAdd();
    await items.fill(d, { code: qa.code('QA-INV-NOHAK'), name: qa.name('QA-INV-NOHAK') });
    return { what: 'Add Item (Item master)', shown: await toastsOf(u3, () => d.getByRole('button', { name: 'Save' }).click()), saved: /^Item added\.$/ };
  },
  '08': async (u3, _u1, qa) => ({ what: 'New request (OT requests)', shown: await createOtRequest(u3, { procedure: procedure(qa) }), saved: /^Request created$/ }),
  '09': async (u3, _u1, qa) => ({
    what: 'New PO (Purchase orders)',
    shown: await createOrder(u3, { docNumber: docNo(qa), docDate: todayWib(), vendor: qa.name('QA Tanpa Hak'), dept: PROCUREMENT.dept, advance: '100000' }),
    saved: /^Purchase order created$/,
  }),
  '10': async (u3, _u1, qa) => ({ what: 'Save (Employees)', shown: await createEmployee(u3, employeeData(qa, { no: 'QA-EMP-TANPA-HAK', name: HR.emp1.name })), saved: /^Employee saved$/ }),
  '11': async (u3, _u1, qa) => ({ what: 'New lab order (Worklist)', shown: await createLabOrder(u3, labType(qa)), saved: /^Lab order created$/ }),
  '12': async (u3, _u1, qa) => {
    const o = new RadOrdersPage(u3);
    await o.open();
    await o.openNew();
    await o.fill({ 'Study description': qa.name('QA Rontgen tanpa hak') });
    return { what: 'New order (Orders)', shown: await toastsOf(u3, () => o.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click()), saved: /^Order created$/ };
  },
  '13': async (u3, _u1, qa) => {
    const r = new DietRequests(u3);
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    const v = { 'Doc no': qa.code('QA-DIET-NOHAK'), 'Bed no': DIET.request.bedNo, 'Bed category': DIET.request.bedCategory, Comments: 'QA tanpa hak' };
    for (const [k, x] of Object.entries(v)) await r.dialog.getByRole('textbox', { name: k, exact: true }).fill(x);
    return { what: 'New request (Diet requests)', shown: await toastsOf(u3, () => r.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click()), saved: /^Request created$/ };
  },
  '14': async (u3) => {
    const c = new CashierPage(u3);
    await c.open();
    await c.charge.fill('150000');
    await c.remark.fill('QA tanpa hak');
    const shown = await toastsOf(u3, () => c.button('Create charge').click());
    const red = (await c.error().allInnerTexts().catch(() => [] as string[])).filter(Boolean);
    const draft = /Draft\s*(INV|RX)-/.test(await c.bar.innerText().catch(() => ''));
    return { what: 'Create charge (Fast Cashier)', shown: [...red, ...shown, ...(draft ? ['a draft invoice is shown'] : [])], saved: /^a draft invoice is shown$/ };
  },
  '15': async (u3, u1) => {
    const p = await seedPatientOf(u1);
    const id = await patientIdOf(u1, p.mrn);
    return { what: 'Create visit (Visits)', shown: await new VisitsPage(u3).create(id), saved: /^Visit created$/ };
  },
  '16': async (u3, _u1, qa) => {
    const r = mrdRequests(u3);
    await r.open();
    await r.main.getByRole('button', { name: 'Request types' }).click();
    await r.dialog.getByRole('textbox', { name: 'Code' }).fill(qa.code('X-PRJ'));
    await r.dialog.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Pinjam tanpa hak'));
    return { what: 'Create request type (Patient File Requests)', shown: await toastsOf(u3, () => r.dialog.getByRole('button', { name: 'Create' }).click()), saved: /^Request type saved$/ };
  },
  '17': async (u3, _u1, qa) => ({
    what: 'Lock month (Payroll desk)',
    shown: await new PayrollDesk(u3).calculate({ Period: `2099-10-${qa.token()}` }, 'Lock month'),
    saved: new RegExp(`^${SAVED.replace('.', '\\.')}$`),
  }),
  '18': async (u3, _u1, qa) => {
    const d = departments(u3);
    await d.openAdd();
    await d.fill({ 'Department code': qa.code('QA-DEP-TANPA-HAK'), 'Department name': qa.name('QA Zz Tanpa Hak') });
    return { what: 'Add Department (Departments)', shown: await d.save(), saved: /^Department added\.$/ };
  },
  '19': async (u3, _u1, qa) => {
    const party = qa.name('QA Tanpa Hak');
    return { what: 'New voucher (Vouchers)', shown: await new Vouchers(u3).create({ value: '100000', party, narration: party }), saved: /^Voucher created$/ };
  },
  '20': async (u3, _u1, qa) => ({
    what: 'New head (Budget heads)',
    shown: await heads(u3).add({ Code: qa.code('X-TANPA-HAK'), 'Head name': qa.name('X Tanpa hak'), 'Spending type': 'Operating', 'Financial year': YEAR }),
    saved: /^Budget head created$/,
  }),
  '21': async (u3, _u1, qa) => ({ what: 'Add (Autoclaves)', shown: (await cssdMaster(u3, 'autoclave').add({ code: qa.code('X-AC-NOHAK'), name: qa.name('X Autoklaf tanpa hak') })).split(' / '), saved: /^Saved\.$/ }),
  '22': async (u3, _u1, qa) => ({
    what: 'Save (Categories)',
    shown: await servicesDesk(u3, 'categories').save({ Code: qa.code('X-LDR'), Name: qa.name('X Laundry tanpa hak') }),
    saved: /^Saved\.$/,
  }),
  '23': async (u3, _u1, qa) => ({ what: 'Category (Masters)', shown: await sourcingDesk(u3, 'masters').save({ Code: qa.code('X-ALKES'), Name: qa.name('X Alkes tanpa hak') }, 'Category'), saved: /^Saved\.$/ }),
  '24': async (u3, _u1, qa) => ({
    what: 'New location (Locations)',
    shown: await new Desk(u3, '/housekeeping/locations', 'Locations', 'New location').save({ 'Location code': qa.code('X-LT-NOHAK'), Name: qa.name('X Lantai tanpa hak'), 'Center / end / frequency': 'QA-UNIT-1', 'People / quantity': '3' }),
    saved: /^Saved\.$/,
  }),
  '25': async (u3) => ({ what: 'Save stores (Stores and recipe)', shown: await linenStores(u3).save(STORES), saved: /^Saved\.$/ }),
  '26': async (u3, _u1, qa) => ({ what: 'Job card (Plans)', shown: await plans(u3).save({ [CA]: qa.bed('X-JC-NOHAK'), [NE]: qa.name('X Servis tanpa hak') }), saved: /^Saved\.$/ }),
  '27': async (u3, _u1, qa) => ({ what: 'Category (Classification)', shown: await assetMasters(u3).save({ Code: qa.code('X-ALKES'), [CH]: qa.name('X Alkes tanpa hak') }), saved: /^Saved\.$/ }),
};

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

for (const m of modules()) {
  for (const t of m.testCases.filter((x) => x.scenario === 'Write without the write privilege')) {
    const writer = WRITERS[m.appId.slice(-2)] ?? WRITERS[m.slug.slice(0, 2)];
    if (!writer) throw new Error(`${t.id}: no save of ${m.slug} for U3`);
    qaTest(t.id, async ({ page, qa, browser }) => {
      const staff = await userPage(browser, 'U3');
      try {
        await qa.step(t.steps[0].step, async () => {
          const tried = await writer(staff, page, qa);
          const shown = tried.shown.filter(Boolean);
          const saved = shown.filter((x) => tried.saved.test(x));
          if (saved.length) {
            qa.deviation(t.steps[0].step, 'The API answers 403 "missing required privilege"; nothing is saved', `${tried.what} is saved for U3 (a role without any privilege): "${saved.join(' / ')}"`);
            return;
          }
          qa.note(t.steps[0].step, `U3 (no privilege), ${tried.what}: "${shown.join(' / ') || 'no message'}"`);
          if (!shown.some((x) => /missing required privilege/i.test(x))) {
            qa.note(t.steps[0].step, 'the text "missing required privilege" is not shown (the screen text is TBD in the workbook)');
          }
        });
      } finally {
        await staff.context().close();
      }
    });
  }
}
