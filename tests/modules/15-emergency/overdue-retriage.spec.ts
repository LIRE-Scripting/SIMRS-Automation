import { createHash } from 'node:crypto';
import type { Locator } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { encounter, Patients } from './helpers';

/**
 * 15-emergency.xlsx, TC-APP015-039: "Receives a patient with a 5-minute
 * category at 10:00 and triages again at 10:04 with a 30-minute category" →
 * "TBD: overdue is counted from the time of reception, 10:00, not from the
 * new triage; the patient is overdue at 10:30".
 *
 * The clock times of the workbook stand for times relative to the reception
 * (open question Q16): the test receives the patient at T, triages with a
 * category of 5 minutes at once and with one of 30 minutes at T+4, and reads
 * the row every 30 seconds until "Overdue" shows: about T+30 means counted
 * from the reception, about T+34 from the new triage, about T+5 from the first
 * category. The two categories are made by the test and deactivated at the end
 * (as the category tests do), so the branch keeps its own.
 */

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

const SAVED = 'Triage category saved.';
const TRIAGED = 'Triage saved. This category is now current.';

qaTest('TC-APP015-039', async ({ page, qa }) => {
  test.setTimeout(50 * 60_000);
  const p = new Patients(page);
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  const toasts = async (click: () => Promise<void>) => {
    const mark = await toastMark(page);
    await click();
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 10_000 }).toBeGreaterThan(0).catch(() => {});
    return toastsSince(page, mark);
  };
  const category = async (description: string, minutes: string, active = true) => {
    await page.goto('/id/emergency/triage-categories');
    await expect(main.getByRole('heading', { level: 1, name: 'Triage Category' })).toBeVisible();
    if (active) await main.getByRole('button', { name: 'New', exact: true }).click();
    else {
      await main.getByRole('searchbox', { name: 'Search' }).fill(description);
      await main.getByRole('table').getByRole('row').filter({ has: page.getByRole('cell', { name: description, exact: true }) }).getByRole('button', { name: 'Modify' }).click();
    }
    await expect(dialog).toBeVisible();
    if (active) {
      await dialog.getByRole('textbox', { name: 'Description' }).fill(description);
      await dialog.getByRole('textbox', { name: 'Colour' }).fill(`#${createHash('sha1').update(qa.token()).digest('hex').slice(0, 6)}`);
      await dialog.getByRole('spinbutton', { name: 'Time (minutes)' }).fill(minutes);
    }
    await dialog.getByRole('checkbox', { name: 'Active' }).setChecked(active);
    return toasts(() => dialog.getByRole('button', { name: 'Save' }).click());
  };
  /** Saves a triage with the category whose option holds `description`. */
  const triage = async (name: string, description: string): Promise<string[]> => {
    const d = await p.openRow(name, 'Triage');
    const list: Locator = d.getByRole('combobox', { name: 'Triage category' });
    const option = list.locator('option', { hasText: description });
    await expect(option).toHaveCount(1, { timeout: 15_000 });
    await list.selectOption({ value: (await option.getAttribute('value')) ?? '' });
    await d.getByRole('combobox', { name: 'Patient condition' }).selectOption('Critical');
    await d.getByRole('combobox', { name: 'Patient status' }).selectOption('Waiting');
    return p.click(d.getByRole('button', { name: 'Save' }));
  };

  const red = qa.name('X Merah');
  const yellow = qa.name('X Kuning');
  expect(await category(red, '5')).toContain(SAVED);
  expect(await category(yellow, '30')).toContain(SAVED);
  try {
    await qa.step(1, async () => {
      const name = await encounter(p, qa);
      const received = Date.now();
      expect(await triage(name, red)).toContain(TRIAGED);
      await page.waitForTimeout(Math.max(0, received + 4 * 60_000 - Date.now()));
      expect(await triage(name, yellow)).toContain(TRIAGED);
      await expect(await p.row(name)).toContainText(yellow);
      // The row is read every 30 s until "Overdue" shows, at most until T+38.
      let overdueAt = 0;
      while (Date.now() < received + 38 * 60_000) {
        if ((await (await p.row(name)).innerText()).includes('Overdue')) {
          overdueAt = (Date.now() - received) / 60_000;
          break;
        }
        await page.waitForTimeout(30_000);
      }
      const at = overdueAt ? `${overdueAt.toFixed(1)} minutes after the reception` : 'not within 38 minutes of the reception';
      qa.note(1, `received at T, "${red}" (5 min) at T, "${yellow}" (30 min) at T+4: "Overdue" shows ${at}`);
      if (!overdueAt || overdueAt < 29 || overdueAt > 32) {
        const counted = !overdueAt ? 'never' : overdueAt < 10 ? 'from the reception with the first category (5 minutes)' : overdueAt > 32 && overdueAt < 37 ? 'from the new triage (T+4 + 30)' : 'by another rule';
        qa.deviation(1, 'Overdue counted from the reception: the patient is overdue 30 minutes after the reception (10:30)', `"Overdue" shows ${at}: counted ${counted}`);
      }
    });
  } finally {
    await category(red, '5', false).catch(() => {});
    await category(yellow, '30', false).catch(() => {});
  }
});
