import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';
import { asOnSite } from '../../../lib/i18n';
import { qaName, qaPrefix } from '../../../lib/qa-data/names';
import type { Qa } from '../../../fixtures/e2e';
import { Patients, WALKED_IN } from '../15-emergency/helpers';
import { markForDischarge } from '../15-emergency/patients-cases';
import { firstCode, qaCode, uniqueToken } from '../../../lib/qa-data/names';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY } from '../../../lib/inventory-data';
import { HR } from '../../../lib/hr-data';
import { BILLING } from '../../../lib/billing-data';
import { PHARMACY, PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { ProcurementDeskPage } from '../../../pages/procurement/ProcurementPages';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { approvedOrder, press } from '../09-procurement/desk-hub-screens-cases';
import { unique } from '../07-inventory/cases';
import { addItem } from '../07-inventory/items-cases';
import { imprestSection, pickStarting, sectionSelect } from '../19-finance/cases';
import { clickFor } from '../19-finance/helpers';
import { Batches, payrollEmployee } from '../17-payroll/helpers';
import { patient as pharmacyPatient, sell, stock } from '../05-pharmacy/helpers';
import { discountNotHeld } from '../05-pharmacy/evaluation-cashier-cases';

/** A stand-in for the qa fixture, for the shared helpers a watch reuses: names and codes, notes dropped. */
function watchQa(): Qa {
  const noop = () => {};
  return {
    code: qaCode, bed: firstCode, name: qaName, prefix: qaPrefix, token: uniqueToken,
    note: noop, deviation: noop, notRun: noop, blocked: noop,
    step: async (_n: number, fn: () => Promise<unknown>) => { await fn(); },
  } as unknown as Qa;
}

const writes = () => test.skip(process.env.QA_ALLOW_WRITES !== '1', 'this blocker is checked with saves: QA_ALLOW_WRITES=1');

/**
 * Blocker watch (asked 2026-11-01: "untuk blocker apakah semuanya sudah di cek
 * ulang?"). Many test cases are blocked without trying their step: the
 * checklist blocks whole journeys (fixme), and some tests mark a step blocked
 * where the site is known to fail. So each run looks again at the symptom of
 * every such blocker here, read-only (or with a save the site refuses): the
 * test passes while the blocker holds and fails with "seems resolved" when the
 * symptom is gone, so the blocked test cases can be written or run again.
 * Each look is kept in .qa-state/blocker-watch.json, which the summary shows
 * on sheet Blocker (columns "Dicek ulang" and "Hasil cek ulang").
 */

const FILE = '.qa-state/blocker-watch.json';
type Seen = { at: string; holds: boolean; symptom: string };

function keep(no: number, seen: Seen): void {
  const all = (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {}) as Record<string, Seen>;
  all[String(no)] = seen;
  fs.mkdirSync('.qa-state', { recursive: true });
  fs.writeFileSync(FILE, `${JSON.stringify(all, null, 1)}\n`);
}

/** The text of the main part of a screen, as the site writes it. */
async function screenText(page: Page, route: string): Promise<string> {
  return asOnSite(async () => {
    await page.goto(route);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1_000);
    return (await page.locator('main').innerText().catch(() => page.locator('body').innerText())).replace(/\s+/g, ' ');
  });
}

interface Watch { no: number; title: string; user: 'U1' | 'U2'; look: (page: Page) => Promise<{ holds: boolean; symptom: string }> }

const WATCHES: Watch[] = [
  { no: 2, title: 'Donors does not list donors', user: 'U1', look: async (p) => { const t = await screenText(p, '/id/bloodbank/donors'); return { holds: /failed to list donors|couldn't load/i.test(t), symptom: t.slice(0, 120) }; } },
  { no: 3, title: 'New sterile issue page fails', user: 'U1', look: async (p) => { const t = await screenText(p, '/id/cssd/issues/new'); return { holds: /cssd request failed|couldn't load/i.test(t), symptom: t.slice(0, 120) }; } },
  { no: 4, title: 'Tenants and Entitlements refuse the administrator', user: 'U1', look: async (p) => { const a = await screenText(p, '/id/tenants'); const b = await screenText(p, '/id/entitlements'); return { holds: /missing required privilege|couldn't load/i.test(a + b), symptom: `${a.slice(0, 60)} / ${b.slice(0, 60)}` }; } },
  {
    no: 7, title: '"Calculate fee" cannot succeed', user: 'U1',
    look: async (p) => asOnSite(async () => {
      await p.goto('/id/hr/desk/fee');
      await p.getByRole('main').getByRole('button', { name: 'Fee plan', exact: true }).or(p.getByRole('main').getByRole('button', { name: 'Rencana fee', exact: true })).first().click().catch(() => {});
      const d = p.getByRole('dialog').last();
      await d.locator('select').first().selectOption('calculate').catch(() => {});
      // A filled form, so the save is sent (an empty one answered with the page data and read as resolved, 2026-11-07).
      await d.getByRole('textbox', { name: 'Employee no' }).fill('QA-EMP-001-MV94ZOBL101').catch(() => {});
      await d.getByRole('textbox', { name: 'Name / location / kind' }).fill('QA Jasa uji').catch(() => {});
      await d.getByRole('textbox', { name: 'Amount' }).fill('100000').catch(() => {});
      const seen: string[] = [];
      p.on('response', async (r) => { if (r.request().method() === 'POST' && /"kind":"calculate"/.test(r.request().postData() ?? '')) seen.push((await r.text().catch(() => '')).slice(0, 300)); });
      await d.getByRole('button', { name: /^(Save|Simpan)$/ }).click().catch(() => {});
      await p.waitForTimeout(3_000);
      const said = seen.join(' ');
      if (!said) throw new Error('blocker 7: no "Calculate fee" save was sent, nothing to judge');
      return { holds: /number and amount are required/i.test(said), symptom: (/number and amount are required/.exec(said)?.[0] ?? said.slice(0, 120)) || 'no answer' };
    }),
  },
  { no: 8, title: 'A diet order never reaches Kitchen', user: 'U1', look: async (p) => { const t = await screenText(p, '/id/diet/kitchen'); return { holds: !/QA-DIE|QA-DIET|QA Diet/i.test(t), symptom: `Kitchen: ${t.slice(0, 100)}` }; } },
  { no: 10, title: 'Saved payroll records are listed nowhere', user: 'U1', look: async (p) => { const t = await screenText(p, '/id/payroll/desk/tax'); return { holds: !/\bdeclar/i.test(t.replace(/^.*?Kode/, '')), symptom: `Tax lists: ${t.slice(0, 100)}` }; } },
  { no: 11, title: 'Service receipt and Vendor bill are never listed', user: 'U1', look: async (p) => { const a = await screenText(p, '/id/services/receipts'); const b = await screenText(p, '/id/services/bills'); return { holds: /Belum ada data|No rows yet/.test(a) && /Belum ada data|No rows yet/.test(b), symptom: `${a.slice(0, 60)} / ${b.slice(0, 60)}` }; } },
  {
    no: 12, title: 'Terminology search finds no code', user: 'U1',
    look: async (p) => asOnSite(async () => {
      await p.goto('/id/clinical/terminology');
      const box = p.getByRole('main').getByRole('searchbox').or(p.getByRole('main').getByRole('textbox')).first();
      await box.fill('I10');
      await p.getByRole('main').getByRole('button', { name: 'Cari' }).first().click();
      await p.waitForTimeout(2_500);
      const t = (await p.getByRole('main').innerText()).replace(/\s+/g, ' ');
      return { holds: /Tidak ada kode yang cocok|No matching code/i.test(t), symptom: `I10: ${t.slice(t.indexOf('Hasil'), t.indexOf('Hasil') + 60)}` };
    }),
  },
  { no: 13, title: 'Set-up missing on the branch (emergency registration of Podomoro)', user: 'U1', look: async (p) => { const t = await screenText(p, '/id/emergency/registration'); return { holds: /belum punya konfigurasi|has no registration configuration/i.test(t), symptom: t.slice(t.search(/Podomoro|configuration/), t.search(/Podomoro|configuration/) + 90) }; } },
  {
    // The 12 lists that hold rows for U1 (Podomoro) and none for U2 (All branches), seen 2026-11-09.
    no: 5, title: 'Lists stay empty with "All branches" (12 lists)', user: 'U2',
    look: async (p) => {
      const routes = ['/bloodbank/requisitions', '/hr/desk/attendance', '/hr/desk/fee', '/billing/plans', '/billing/ledger', '/payroll/desk/pay', '/payroll/desk/reimburse', '/services/requests', '/services/purchase-requests', '/sourcing/tenders', '/sourcing/bids', '/sourcing/agreements'];
      const empty: string[] = [];
      for (const r of routes) if (/No rows yet|Belum ada data/i.test(await screenText(p, `/en${r}`))) empty.push(r);
      return { holds: empty.length > 0, symptom: `${empty.length} of ${routes.length} lists empty with All branches: ${empty.join(', ')}` };
    },
  },
  {
    // A save the site refuses while the blocker holds; the discharges of the coding queue are made by the automation runs.
    no: 6, title: '"Record code" cannot be saved with "All branches"', user: 'U2',
    look: async (p) => {
      await p.goto('/en/mrd/coding');
      await p.waitForLoadState('networkidle').catch(() => {});
      const row = p.getByRole('main').getByRole('row').filter({ hasText: /DIS-\d+/ }).filter({ has: p.getByRole('button', { name: 'Record code' }) }).first();
      await row.getByRole('button', { name: 'Record code' }).click();
      const d = p.getByRole('dialog').last();
      await d.getByRole('textbox').first().fill('Z00.0');
      const said: string[] = [];
      p.on('response', async (r) => { if (r.request().method() === 'POST' && /Z00\.0/.test(r.request().postData() ?? '')) said.push((await r.text().catch(() => '')).slice(0, 300)); });
      await d.getByRole('button', { name: 'Record code' }).click();
      await p.waitForTimeout(3_000);
      const t = said.join(' ');
      if (!t) throw new Error('blocker 6: no "Record code" save was sent, nothing to judge');
      return { holds: /branch are required/i.test(t), symptom: /"error":"([^"]+)"/.exec(t)?.[1] ?? t.slice(0, 120) };
    },
  },
  {
    // Writes (a walk-in of the test, discharged): runs only with QA_ALLOW_WRITES=1.
    no: 9, title: 'A closed emergency encounter cannot be received again', user: 'U1',
    look: async (p) => {
      test.skip(process.env.QA_ALLOW_WRITES !== '1', 'blocker 9 is checked with a save: QA_ALLOW_WRITES=1');
      const pt = new Patients(p);
      const qa = { prefix: qaPrefix } as unknown as Qa;
      const name = qaName('X Pasien Walk-in');
      expect(await pt.walkIn(name)).toContain(WALKED_IN);
      let d = await pt.openRow(name, 'Outcome');
      await markForDischarge(d, qa);
      expect(await pt.click(d.getByRole('button', { name: 'Mark for discharge' }))).toContain('Saved.');
      d = await pt.openRow(name, 'Outcome');
      expect(await pt.click(d.getByRole('button', { name: 'Discharge' }))).toContain('Saved.');
      await pt.open();
      await pt.main.getByRole('button', { name: 'Registration', exact: true }).click();
      await pt.dialog.getByRole('textbox', { name: 'Name or MRN' }).fill(name);
      await pt.dialog.getByRole('button', { name: 'Search' }).click();
      const hit = pt.dialog.getByRole('listbox').getByRole('button').or(pt.dialog.getByRole('list').getByRole('button')).first();
      if (!(await hit.isVisible({ timeout: 5_000 }).catch(() => false))) return { holds: true, symptom: `${name}: discharged, not offered by Registration` };
      await hit.click();
      await pt.dialog.locator('select').first().selectOption({ label: 'IGD' }).catch(() => {});
      const toasts = await pt.click(pt.dialog.getByRole('button', { name: 'Receive' }));
      return { holds: !toasts.some((t) => /received/i.test(t) && !/already|not/i.test(t)), symptom: `${name}: receive again → "${toasts.join(' / ').slice(0, 120)}"` };
    },
  },
  {
    // An approved purchase order of the watch, its gate entry, then the goods receipt.
    no: 31, title: 'Goods receipt cannot be saved after the gate ("receive at the gate first")', user: 'U1',
    look: async (p) => {
      writes();
      const qa = watchQa();
      const id = await approvedOrder(p, qa);
      const desk = new ProcurementDeskPage(p);
      await desk.open('receipts', 'Receipts and returns');
      await desk.input('Document').fill(id);
      await desk.input('Quantity').fill('50');
      const gate = await press(desk, 'gate');
      if (!gate.includes('Saved.')) throw new Error(`blocker 31: the gate entry is not saved ("${gate.join(' / ')}"), nothing to judge`);
      await desk.input('Store').fill(PHARMACY_STORE.code);
      await desk.input('Batch').fill(qa.code('X-B02'));
      await desk.input('Expiry').fill(addDays(todayWib(), 365));
      const grn = await press(desk, 'grn');
      return { holds: !grn.includes('Saved.'), symptom: `grn after a saved gate: "${grn.join(' / ').slice(0, 120)}"` };
    },
  },
  {
    // A payroll batch of an employee of the watch: the lines hold only the components already on the site.
    no: 37, title: 'The salary components of the workbook are not on the site', user: 'U1',
    look: async (p) => {
      writes();
      const e = await payrollEmployee(p, watchQa(), HR.emp2);
      const b = new Batches(p);
      await b.runWith({ employee: e.no, base: '8000000' });
      const r = await b.result();
      const codes = r.lines.map((l) => /^([A-Z0-9_]+)/.exec(l.trim())?.[1] ?? l).filter(Boolean);
      const extra = codes.filter((c) => !['GAPOK', 'POTBPJS', 'TUNJAB'].includes(c));
      return { holds: extra.length === 0, symptom: `batch lines: ${codes.join(', ') || '(none)'}` };
    },
  },
  {
    // An advance request of a QA employee: refused while no imprest eligibility can be set up for the branch.
    no: 42, title: 'No imprest advance can be requested (no eligibility for the branch)', user: 'U1',
    look: async (p) => {
      writes();
      await p.goto('/id/finance/imprest');
      await p.waitForLoadState('networkidle').catch(() => {});
      const advance = imprestSection(p, 'Advance request');
      await pickStarting(sectionSelect(advance, 0), 'QA-ATK');
      await pickStarting(sectionSelect(advance, 1), 'QA-HRM');
      await advance.getByLabel('Amount', { exact: true }).fill('2000000');
      await advance.getByLabel('Remarks', { exact: true }).fill(qaPrefix('X Uang muka ATK'));
      const toasts = await clickFor(p, advance.getByRole('button', { name: 'Save', exact: true }));
      return { holds: toasts.some((t) => /imprest eligibility/i.test(t)) || !toasts.includes('Saved.'), symptom: `advance request: "${toasts.join(' / ').slice(0, 120)}"` };
    },
  },
  {
    // A dispense of the watch with a line discount above the maximum: it should wait for the cashier.
    no: 47, title: 'A dispense discount above the maximum cannot wait ("chain not found: billingdiscount")', user: 'U1',
    look: async (p) => {
      writes();
      const qa = watchQa();
      await stock(p, qa);
      const pt = await pharmacyPatient(p, qa);
      const over = String(Number(BILLING.counter['Maximum line discount (%)']) * 2);
      const toasts = await sell(p, pt, [{ item: PHARMACY.para, requested: '1', issued: '1', discount: over }]);
      return { holds: discountNotHeld(toasts), symptom: `discount ${over}%: "${toasts.join(' / ').slice(0, 120)}"` };
    },
  },
  {
    // A kit of the watch with one component, saved on Item Master.
    no: 27, title: 'Saving a kit fails ("saveKitComponents: 500")', user: 'U1',
    look: async (p) => {
      writes();
      const qa = watchQa();
      // The component picker offers the first items in code order (found blocker 40): the component's code sorts first.
      const kit = unique(qa, INVENTORY.kit);
      const a = { code: firstCode(INVENTORY.itA.code), name: `${INVENTORY.itA.name} ${uniqueToken()}` };
      for (const it of [kit, a]) await addItem(p, it);
      const items = new ItemMasterPage(p);
      await items.open();
      // A new item reaches the picker after a while (found blocker 51), and the dialog sometimes opens without the
      // component row: the whole pick is tried again from a fresh dialog, up to four times.
      let d = items.dialog('Edit Item');
      for (let i = 0; ; i++) {
        try {
          await items.open();
          d = await items.openEdit(kit);
          await d.getByRole('button', { name: 'Add component' }).click();
          const field = d.getByRole('combobox', { name: 'Component code' }).last();
          await field.fill(a.code, { timeout: 10_000 });
          const hit = p.locator(`#${await field.getAttribute('aria-controls', { timeout: 5_000 })}`).getByRole('option').filter({ hasText: a.code }).first().getByRole('button');
          await hit.click({ timeout: 10_000 });
          break;
        } catch (e) {
          if (i === 3) throw new Error(`blocker 27: the component ${a.code} could not be picked (blockers 40, 51), nothing to judge: ${String(e).slice(0, 120)}`);
          await p.keyboard.press('Escape').catch(() => {});
          await p.waitForTimeout(15_000);
        }
      }
      await d.getByRole('spinbutton').last().fill('1');
      const said: string[] = [];
      p.on('response', async (r) => { if (r.request().method() === 'POST') said.push((await r.text().catch(() => '')).slice(0, 200)); });
      await d.getByRole('button', { name: 'Save kit' }).click();
      await p.waitForTimeout(4_000);
      const t = said.join(' ');
      if (!t) throw new Error('blocker 27: no "Save kit" was sent, nothing to judge');
      return { holds: /saveKitComponents|stock update failed|"error"/i.test(t), symptom: /"error":"([^"]+)"/.exec(t)?.[1] ?? t.slice(0, 120) };
    },
  },
  {
    // The details of a patient registered by the watch: no way to edit (Consent, Renew, Close only).
    no: 20, title: 'A registered patient cannot be edited', user: 'U1',
    look: async (p) => {
      writes();
      const reg = new RegisteredPatientsPage(p);
      await reg.open();
      const pt = await reg.register({ firstName: 'QA-AMB Salah', lastName: `Ketik ${uniqueToken()}` });
      const d = await reg.openDetails(pt.fullName);
      const buttons = (await d.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
      return { holds: !buttons.some((b) => /edit|ubah/i.test(b)), symptom: `details buttons: ${buttons.join(', ')}` };
    },
  },
  {
    no: 45, title: 'The financial year 2026 has no periods', user: 'U1',
    look: async (p) => {
      let body = '';
      p.on('response', async (r) => { const t = await r.text().catch(() => ''); if (/"code\\?":\\?"2026\\?"/.test(t)) body = t; });
      await screenText(p, '/id/finance/financial-years');
      const year = /\\?"code\\?":\\?"2026\\?"[\s\S]{0,400}?\\?"periods\\?":(\[\])?/.exec(body);
      return { holds: !!year?.[1], symptom: year ? `2026: periods ${year[1] ? '[] (none)' : 'present'}` : 'the year 2026 is not in the page data' };
    },
  },
];

for (const w of WATCHES) {
  test(`Blocker watch ${w.no}: ${w.title}`, async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: authFileOf(w.user) })).newPage();
    await installToastRecorder(page);
    try {
      const r = await w.look(page);
      keep(w.no, { at: new Date().toISOString(), holds: r.holds, symptom: r.symptom });
      expect(r.holds, `blocker ${w.no} seems resolved (${r.symptom}): run or write its blocked test cases again`).toBe(true);
    } finally {
      await page.context().close();
    }
  });
}
