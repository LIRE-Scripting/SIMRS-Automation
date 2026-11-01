import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { todayWib } from '../../../lib/dates';
import { modules } from '../../../lib/qa-data';

/**
 * "Audit trail of …" of every workbook: the Audit Log (/id/audit), filtered by
 * module and action. The journey names a platform superadmin (U10); the
 * Audit Log is open to the administrator U1 (seen 2026-11-01), so U1 reads it
 * (lib/qa-data/plan.ts, usersOfCase).
 *
 * Seen on the site 2026-11-01: an entry is a row of When, Action, Module,
 * Hospital, Patient, MRN, User, Role at the time, Result, Reason, On behalf
 * of and Full name; it cannot be opened, and Patient, MRN and Reason are
 * empty, so no record number (MRN, admission number, document) is shown.
 *
 * The entries are those of the journeys run on the site; the newest entry of
 * each action is read, whatever its day (the workbook reads "today", after
 * its journeys; a run of the modules the same day precedes this one).
 */

interface Entry { when: string; action: string; module: string; hospital: string; patient: string; mrn: string; user: string; reason: string }

async function entries(page: Page, module: string, action = ''): Promise<Entry[]> {
  await page.goto('/id/audit');
  await page.getByRole('textbox', { name: 'Module' }).fill(module);
  await page.getByRole('textbox', { name: 'Action' }).fill(action);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const rows = page.locator('table tbody tr').filter({ has: page.locator('td:nth-child(2)') });
  await expect(rows.first().or(page.getByText('No audit rows match these filters.'))).toBeVisible({ timeout: 15_000 }).catch(() => {});
  const cells = await rows.evaluateAll((rs) => rs.map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent?.trim() ?? '')));
  return cells.filter((c) => c.length >= 10).map(([when = '', action = '', mod = '', hospital = '', patient = '', mrn = '', user = '', , , reason = '']) => ({ when, action, module: mod, hospital, patient, mrn, user, reason }));
}

/** "1/11/2026, 08.00.46" → "2026-11-01". */
const dayOf = (when: string): string => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(when);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : when;
};

/** The action names an Expected Result lists: REGISTER_PATIENT, bed.create, … (not the quoted values). */
const actionsOf = (expected: string): string[] =>
  expected.replace(/"[^"]*"/g, '').match(/\b[A-Z][A-Z]+(?:_[A-Z]+)+\b|\b[a-z_]+(?:\.[a-z_]+)+\b/g) ?? [];

/** The part of an Expected Result that asks for a record reference: "with the MRN", "with the document number", … */
const DETAIL = /\bwith (?:the |both )?(MRN|MRNs|token|number|admission number|new bed|bed|document number|document|request number|employee number|name|result type|authoriser|drug|code|year's code|kind|batch number|invoice number|declared)/i;

for (const m of modules()) {
  for (const t of m.testCases.filter((x) => /^Audit trail of /.test(x.scenario))) {
    const named = /filters module "([^"]+)"/.exec(t.steps[0].action)?.[1];
    if (!named) throw new Error(`${t.id}: no module in "${t.steps[0].action}"`);
    const module: string = named;
    qaTest(t.id, async ({ page, qa }) => {
      test.slow();
      const today = todayWib();
      for (const s of t.steps) {
        const actions = actionsOf(s.expected);
        await qa.step(s.step, async () => {
          if (s.step === 1 && !actions.length) {
            const all = await entries(page, module);
            expect(all.length, `entries of module "${module}"`).toBeGreaterThan(0);
            const ofToday = all.filter((e) => dayOf(e.when) === today);
            expect(all.some((e) => e.user), 'entries name their user').toBe(true);
            const system = all.filter((e) => !e.user);
            if (system.length) qa.note(s.step, `${system.length} entries without a user (${[...new Set(system.map((e) => e.action))].join(', ')}: made by the system)`);
            qa.note(s.step, `${ofToday.length ? `${ofToday.length} entries of ${today} on the first page` : `no entry of ${today}; the newest is of ${dayOf(all[0].when)}`}; actions: ${[...new Set(all.map((e) => e.action))].join(', ')}; users: ${[...new Set(all.map((e) => e.user))].join(', ')}`);
            return;
          }
          if (!actions.length) return special(t.id, s.step, s.expected);
          const found: Entry[] = [];
          const missing: string[] = [];
          for (const a of actions) {
            const e = (await entries(page, module, a)).find((x) => x.action === a);
            if (e) found.push(e);
            else missing.push(a);
          }
          if (found.length) qa.note(s.step, found.map((e) => `${e.action} ${dayOf(e.when)} by ${e.user}`).join('; '));
          if (missing.length) qa.deviation(s.step, s.expected, `no entry of ${missing.join(', ')} in the Audit Log (module "${module}"): not recorded, or the action was never done on the site (a flow blocked earlier)`);
          const detail = DETAIL.exec(s.expected.replace(/with the (?:clerk|nurse|user|users|admin|analyst|radiographer|dietitian|officer|accountant)'s? names?/gi, ''));
          if (detail && found.length && found.every((e) => !e.patient && !e.mrn && !e.reason && !e.hospital)) {
            qa.deviation(s.step, s.expected, `the entries show When, Action, Module, User and Result only: no ${detail[1]} (Hospital, Patient, MRN and Reason are empty; an entry cannot be opened)`);
          }
        });
      }

      /** The steps that name no action. */
      async function special(id: string, step: number, expected: string): Promise<void> {
        if (id === 'TC-APP003-013') {
          // "Looks for the SOAP save" → "An entry for the note".
          const all = await entries(page, module);
          const note = all.find((e) => /soap|note|encounter/i.test(e.action));
          if (note) qa.note(step, `${note.action} ${dayOf(note.when)} by ${note.user}`);
          else qa.deviation(step, expected, `no entry for the note on the first page of module "${module}" (actions: ${[...new Set(all.map((e) => e.action))].join(', ')})`);
          return;
        }
        if (id === 'TC-APP011-009') {
          // "Opens the two "resulted" entries" → the results and the reason of the change.
          const e = (await entries(page, module, 'TRANSITION_LAB_ORDER'))[0];
          expect(e, 'a TRANSITION_LAB_ORDER entry').toBeTruthy();
          await page.locator('table tbody tr').first().click();
          await page.waitForTimeout(1_000);
          const opened = await page.getByRole('dialog').count();
          if (!opened) qa.deviation(step, expected, 'an entry cannot be opened: the row shows When, Action, Module, User and Result only (no result, no reason)');
          return;
        }
        throw new Error(`${id} step ${step}: no action named in "${expected}"`);
      }
    });
  }
}
