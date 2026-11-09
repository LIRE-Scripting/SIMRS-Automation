import { ensurePassedBowieDick } from './cases';
import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { stock } from '../05-pharmacy/helpers';
import { approvedReceipt, CycleForm, STORES } from './docs';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of cycles.spec.ts, shared with the end-to-end chains (chain.run). */

export const BOWIE = 'The first cycle of this autoclave today needs a passed Bowie Dick test.';

/** The packs of an approved receipt of the test, in the CSSD store and unsterile. */
export async function unsterilePacks(page: Page, qa: Qa): Promise<string[] | null> {
  const batches = await stock(page, qa);
  const r = await approvedReceipt(page, PHARMACY.para.code, batches[0]);
  // The saved receipt does not open, so no pack comes to the CSSD store (found blocker 48).
  if (r.stalled) qa.note(1, `precondition: the unsterile receipt of ${r.request} is saved but does not open (nginx "504 Gateway Time-out"); it is not approved`);
  return r.stalled ? null : r.packs;
}

export const TC_APP021_017: QaBody = async ({ page, qa }) => {
  const packs = await unsterilePacks(page, qa);
  const f = new CycleForm(page);
  let saved: string[] = [];
  await qa.step(1, async () => {
    await page.goto('/id/cssd');
    await page.getByRole('complementary').getByRole('link', { name: 'Sterilization Cycle' }).or(f.main.getByRole('link', { name: 'Sterilization Cycle' })).first().click();
    await f.main.getByRole('link', { name: 'New' }).or(f.main.getByRole('button', { name: 'New' })).first().click();
    await expect(f.main.getByText(/^Save records the load\./)).toBeVisible();
  });
  await qa.step(2, async () => {
    const toasts = await f.saveStore(STORES.transit.code);
    qa.note(2, `"Save store" with ${STORES.transit.code}: "${toasts.join(' / ')}"`);
    expect(toasts).toContain('Sterile store saved for this branch.');
  });
  if (!packs) {
    for (const st of [3, 4, 5, 6, 7]) qa.blocked(st, 48);
    return;
  }
  await qa.step(3, async () => {
    const check = await f.load({ packs, result: 'Pass' });
    qa.note(3, `packs of the receipt of the test: ${packs.join(', ')}; the result list of the check offers: ${check.results.join(', ')}`);
    if (!check.chosen) qa.deviation(4, 'The result "Pass" can be chosen for the check', `the result list offers only "${check.results.join('", "')}"`);
  });
  await qa.step(4, async () => {
    saved = await f.act('Save');
    qa.note(4, `Save: "${saved.join(' / ')}"`);
  });
  if (saved.includes(BOWIE)) {
    // The cycle needs a passed Bowie Dick test of today, which the branch set-up does not allow (blocker 13).
    for (const st of [4, 5, 6, 7]) qa.blocked(st, 13);
    return;
  }
  expect(saved).toContain('Cycle saved.');
  await qa.step(5, async () => {
    expect(await f.act('Approve')).toContain('Approved. The load is sterile stock in this branch.');
  });
  await qa.step(6, async () => {
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 8_000 }).catch(() => null), f.button('Sterile labels').click().catch(() => {})]);
    qa.note(6, `"Sterile labels" ${popup ? `opens ${new URL(popup.url()).pathname}` : 'opens no page'}`);
    await popup?.close();
  });
  await qa.step(7, async () => {
    await page.goto('/id/cssd/trace');
    await page.getByRole('main').getByRole('textbox').first().fill(packs[0]);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(7, `Pack Trace of ${packs[0]}: "${(await page.getByRole('main').innerText()).replace(/\s+/g, ' ').slice(-200)}"`);
  });
};

export const TC_APP021_018: QaBody = async ({ page, qa }) => {
  const f = new CycleForm(page);
  const refused = async (step: number, v: Parameters<CycleForm['load']>[0], message: string) => {
    await f.openCycle();
    await f.load(v);
    const shown = await f.act('Save');
    expect(shown).not.toContain('Cycle saved.');
    if (shown.includes(BOWIE)) {
      // Refused for the missing Bowie Dick test first: the check of the step cannot be reached (blocker 13).
      qa.blocked(step, 13);
      return;
    }
    if (!shown.some((t) => t.includes(message)) && !(await f.main.getByText(message).count())) qa.deviation(step, `The text "${message}"`, `"${shown.join(' / ') || 'nothing shown'}"`);
  };
  const day = todayWib();
  await qa.step(1, () => refused(1, { packs: ['PK-0001'], start: `${day}T10:00`, end: `${day}T09:00`, result: 'Pass' }, 'End is before start.'));
  await qa.step(2, () => refused(2, { packs: ['PK-0001'], expiry: day, result: 'Pass' }, 'Expiry must be after the sterilization date.'));
  await qa.step(3, () => refused(3, { packs: [], result: 'Pass' }, 'Add at least one set or item.'));
  await qa.step(4, () => refused(4, { packs: ['PK-UNKNOWN-0'], result: 'Pass' }, 'That packing number is not an unsterile set.'));
  qa.notRun(5, 'U1 works on Podomoro only; "All branches" in the header is U2, who would write a cycle of the hospital');
  qa.notRun(6, 'needs a branch with no sterile store: the sterile store is a setting of the branch (step 2 of TC-APP021-017)');
};

export const TC_APP021_019: QaBody = async ({ page, qa }) => {
  const packs = await unsterilePacks(page, qa);
  const f = new CycleForm(page);
  if (!packs) {
    qa.blocked(1, 48);
    qa.blocked(2, 48);
    return;
  }
  await qa.step(1, async () => {
    await f.openCycle();
    await f.load({ packs });
    const saved = await f.act('Save');
    if (saved.includes(BOWIE)) {
      qa.blocked(1, 13);
      return;
    }
    const shown = await f.act('Approve');
    if (!shown.some((t) => t.includes('Approve needs at least one quality check.'))) qa.deviation(1, 'The text "Approve needs at least one quality check."', `"${shown.join(' / ') || 'nothing shown'}"`);
  });
  qa.blocked(2, 48);
  qa.note(2, 'a cycle with a failed check needs a saved cycle, which needs a passed Bowie Dick test of today (blocker 13)');
};

export const TC_APP021_020: QaBody = async ({ qa }) => {
  for (const st of [1, 2, 3]) qa.blocked(st, 48);
  qa.note(1, 'a next cycle needs a saved and failed cycle; a cycle needs a passed Bowie Dick test of today, which the branch set-up does not allow (blocker 13)');
};
