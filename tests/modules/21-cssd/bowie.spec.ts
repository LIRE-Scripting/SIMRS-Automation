import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { bowieForm, code, made, saveBowieDick } from './cases';
import { CycleForm } from './docs';

/**
 * 21-cssd.xlsx, Bowie Dick (journey JRN-APP021-006, TC-APP021-015 and 016).
 * Checklist blocker 13 named the CSSD set-up of the branch as missing; since
 * 2026-11-01 Bowie Dick tests are saved on Podomoro, so the journey runs
 * (lib/qa-data/plan.ts, CHECKLIST_RESOLVED). Each test makes its own
 * autoclaves, so "today" starts without a test for them.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const BOWIE = 'The first cycle of this autoclave today needs a passed Bowie Dick test.';

/** A new autoclave of the test; returns the name the lists show. */
async function autoclave(page: Page, qa: Qa, base: string): Promise<string> {
  const v = { code: code(qa, base), name: qa.name('X Autoklaf uji') };
  await made(page, 'autoclave', v);
  return v.name;
}

/** Saves a cycle on an autoclave with one pack number; returns the toasts. The Bowie Dick check comes before the packs are checked. */
async function cycleOn(page: Page, name: string): Promise<string[]> {
  const f = new CycleForm(page);
  await f.openCycle();
  await f.main.locator('select').filter({ has: page.locator('option', { hasText: name }) }).first().selectOption({ label: name });
  await f.load({ packs: ['PK-0001'], result: 'Pass' });
  return f.act('Save');
}

qaTest('TC-APP021-015', async ({ page, qa }) => {
  const day = todayWib();
  const first = await autoclave(page, qa, 'X-AC1');
  const second = await autoclave(page, qa, 'X-AC2');
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/cssd');
    await page.getByRole('complementary').getByRole('link', { name: 'Bowie Dick' }).or(main.getByRole('link', { name: 'Bowie Dick' })).first().click();
    await expect(main.getByText('The daily test of an autoclave. The first cycle of that autoclave on a calendar day waits for a passed test.')).toBeVisible();
    const f = bowieForm(page);
    for (const l of [f.date, f.autoclave, f.batch, f.load, f.indicator, f.result]) await expect(l).toBeVisible();
    qa.note(1, `columns ${(await main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim()).join(', ')}`);
  });
  await qa.step(2, async () => {
    const r = await saveBowieDick(page, { date: day, autoclave: first, result: 'Pass' });
    expect(r.toasts).toContain('Bowie Dick test saved.');
    // The list shows the newest tests first, a page at a time: the test's row is looked for, not required on page 1.
    const rows = (await main.getByRole('table').getByRole('row').allInnerTexts()).map((x) => x.replace(/\s+/g, ' '));
    qa.note(2, rows.some((x) => x.includes(first)) ? `a row for ${first} on the first page` : `toast "Bowie Dick test saved."; ${first} is not on the first page of the list (${rows.length - 1} rows)`);
  });
  await qa.step(3, async () => {
    const shown = await cycleOn(page, first);
    qa.note(3, `a cycle of ${first} today: "${shown.join(' / ')}"`);
    expect(shown, 'the passed test lets the first cycle through the Bowie Dick check').not.toContain(BOWIE);
    if (!shown.includes('Cycle saved.')) qa.note(3, 'saved past the Bowie Dick check; the pack PK-0001 is not an unsterile set of a receipt (an approved receipt needs found blocker 48 fixed), so the site refuses the pack, not the autoclave');
  });
  await qa.step(4, async () => {
    const empty = await saveBowieDick(page, { date: day, autoclave: second, result: 'Fail' });
    qa.note(4, `"Fail" without the measure of failure: "${empty.toasts.join(' / ')}"`);
    expect(empty.toasts).not.toContain('Bowie Dick test saved.');
    const r = await saveBowieDick(page, { date: day, autoclave: second, result: 'Fail', failure: qa.prefix('X Pola tidak merata') });
    expect(r.toasts).toContain('Bowie Dick test saved.');
  });
  await qa.step(5, async () => {
    const shown = await cycleOn(page, second);
    if (!shown.includes(BOWIE)) qa.deviation(5, `Refused with "${BOWIE}"`, `refused with "${shown.join(' / ')}": a cycle on a new autoclave is refused before the Bowie Dick check (its cycle type is not one of the autoclave)`);
  });
});

qaTest('TC-APP021-016', async ({ page, qa }) => {
  const day = todayWib();
  const ac = await autoclave(page, qa, 'X-AC3');
  const untested = await autoclave(page, qa, 'X-AC4');
  await qa.step(1, async () => {
    const r = await saveBowieDick(page, { date: day, autoclave: ac, result: 'Fail' });
    const shown = [...r.toasts, r.form].join(' / ');
    if (!shown.includes('A failed test needs the measure of failure.')) qa.deviation(1, 'The text "A failed test needs the measure of failure."', `"${shown.slice(0, 200)}"`);
    expect(r.toasts).not.toContain('Bowie Dick test saved.');
  });
  await qa.step(2, async () => {
    const shown = await cycleOn(page, untested);
    expect(shown).not.toContain('Cycle saved.');
    if (!shown.includes(BOWIE)) qa.deviation(2, `The text "${BOWIE}"`, `refused with "${shown.join(' / ')}": a cycle on a new autoclave is refused before the Bowie Dick check (its cycle type is not one of the autoclave)`);
  });
  await qa.step(3, async () => {
    const failed = await saveBowieDick(page, { date: day, autoclave: ac, result: 'Fail', failure: qa.prefix('X Pola tidak merata') });
    const passed = await saveBowieDick(page, { date: day, autoclave: ac, result: 'Pass' });
    const rows = (await page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: ac }).allInnerTexts()).map((r) => r.replace(/\s+/g, ' '));
    const cycle = await cycleOn(page, ac);
    qa.note(3, `failed "${failed.toasts.join(' / ')}", then passed "${passed.toasts.join(' / ')}"; rows of ${ac}: ${rows.join(' | ')}; a cycle afterwards: "${cycle.join(' / ')}" (TBD in the workbook)`);
    expect(passed.toasts).toContain('Bowie Dick test saved.');
    expect(cycle).not.toContain(BOWIE);
  });
  await qa.step(4, async () => {
    const r = await saveBowieDick(page, { date: addDays(day, 1), autoclave: untested, result: 'Pass' });
    qa.note(4, `a test dated ${addDays(day, 1)}: "${[...r.toasts].join(' / ') || r.form.slice(0, 160)}" (TBD in the workbook)`);
  });
  await qa.step(5, async () => {
    const row = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: ac }).first();
    const actions = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    qa.note(5, `a saved test offers ${actions.length ? actions.join(', ') : 'no button'} to correct or remove it (TBD in the workbook)`);
  });
});
