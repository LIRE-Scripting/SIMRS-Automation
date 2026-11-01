import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '../../../fixtures/e2e';
import { authFileOf } from '../../../lib/config';
import { asOnSite } from '../../../lib/i18n';

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
  { no: 5, title: 'Lists stay empty with "All branches"', user: 'U2', look: async (p) => { const t = await screenText(p, '/en/billing/ledger'); return { holds: /No rows yet|Belum ada data/i.test(t), symptom: `Patient ledger with All branches: ${t.slice(0, 100)}` }; } },
  {
    no: 7, title: '"Calculate fee" cannot succeed', user: 'U1',
    look: async (p) => asOnSite(async () => {
      await p.goto('/id/hr/desk/fee');
      await p.getByRole('main').getByRole('button', { name: 'Fee plan', exact: true }).or(p.getByRole('main').getByRole('button', { name: 'Rencana fee', exact: true })).first().click().catch(() => {});
      const d = p.getByRole('dialog').last();
      await d.locator('select').first().selectOption('calculate').catch(() => {});
      const seen: string[] = [];
      p.on('response', async (r) => { if (r.request().method() === 'POST') seen.push((await r.text().catch(() => '')).slice(0, 300)); });
      await d.getByRole('button', { name: /^(Save|Simpan)$/ }).click().catch(() => {});
      await p.waitForTimeout(3_000);
      const said = seen.join(' ');
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
