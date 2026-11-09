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
      await installToastRecorder(p);
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
    try {
      const r = await w.look(page);
      keep(w.no, { at: new Date().toISOString(), holds: r.holds, symptom: r.symptom });
      expect(r.holds, `blocker ${w.no} seems resolved (${r.symptom}): run or write its blocked test cases again`).toBe(true);
    } finally {
      await page.context().close();
    }
  });
}
