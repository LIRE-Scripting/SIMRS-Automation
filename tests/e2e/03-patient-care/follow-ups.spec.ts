import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { CLINICAL, PT1_DATE_OF_BIRTH } from '../../../lib/clinical-data';
import { escapeRe } from '../../../pages/ambulatory/RegisteredPatientsPage';

/**
 * 03-patient-care.xlsx, feature "Follow-up (/clinical/follow-ups)". Read from
 * the live screen on 2026-10-15: "Add follow-up" dialog (Patient type-ahead,
 * Mode Remark/Call/Note, Note), a "Filter by patient" type-ahead and the list.
 */
const MODE = 'Call';

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

class FollowUps {
  readonly main: Locator;
  readonly heading: Locator;
  readonly add: Locator;
  readonly filter: Locator;
  readonly dialog: Locator;
  readonly table: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Follow-up' });
    this.add = this.main.getByRole('button', { name: 'Add follow-up' });
    this.filter = this.main.getByRole('combobox', { name: 'Filter by patient' });
    this.dialog = page.getByRole('dialog', { name: 'Add follow-up' });
    this.table = this.main.getByRole('table');
  }

  async open() {
    await this.page.goto('/en/clinical/follow-ups');
    await expect(this.heading).toBeVisible();
  }

  async pick(field: Locator, typed: string, choose = typed) {
    await field.fill(typed);
    const list = this.page.locator(`#${await field.getAttribute('aria-controls')}`);
    const option = list.getByRole('option').filter({ hasText: new RegExp(escapeRe(choose)) }).first();
    await expect(option).toBeAttached();
    // Inside the dialog the list is clipped, so the option is chosen with the keyboard:
    // the first suggestion is highlighted, Enter picks it.
    await expect(list.getByRole('option').first()).toHaveText(new RegExp(escapeRe(choose)));
    await field.press('Enter');
    await expect(field).toHaveValue(new RegExp(escapeRe(choose)));
  }

  rows() {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }
}

async function pt1(page: Page, qa: Qa) {
  return registerPatient(page, CLINICAL.pt1.name, qa.token(), PT1_DATE_OF_BIRTH);
}

qaTest('TC-APP003-052', async ({ page, qa }) => {
  const f = new FollowUps(page);
  const p = await pt1(page, qa);
  const note = qa.name('QA Pasien dihubungi, kontrol minggu depan');

  await qa.step(1, async () => {
    await page.goto('/en/clinical');
    await page.getByRole('main').getByRole('link', { name: 'Follow-up', exact: true }).click();
    await expect(f.heading).toBeVisible();
    await expect(f.main.getByText('A remark, a call, or a note for one patient.')).toBeVisible();
    await expect(f.add).toBeVisible();
    await expect(f.filter).toBeVisible();
    for (const c of ['When', 'Patient', 'Mode', 'Note']) await expect(f.table.getByRole('columnheader', { name: c, exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await f.add.click();
    await expect(f.dialog).toBeVisible();
    await expect(f.dialog.getByRole('combobox', { name: 'Patient' })).toBeVisible();
    await expect(f.dialog.getByRole('combobox', { name: 'Mode' })).toBeVisible();
    await expect(f.dialog.getByRole('textbox', { name: 'Note' })).toBeVisible();
    await expect(f.dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(f.dialog.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  await qa.step(3, async () => {
    await f.pick(f.dialog.getByRole('combobox', { name: 'Patient' }), p.mrn);
    await f.dialog.getByRole('combobox', { name: 'Mode' }).selectOption({ label: MODE });
    await f.dialog.getByRole('textbox', { name: 'Note' }).fill(note);
    await f.dialog.getByRole('button', { name: 'Save' }).click();
    await expect(toastLocator(page, /^Follow-up saved\.$/)).toBeVisible();
    await expect(f.dialog).toBeHidden();
    const row = f.rows().filter({ hasText: note });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(p.mrn);
    await expect(row).toContainText(MODE);
  });

  await qa.step(4, async () => {
    await f.pick(f.filter, p.mrn);
    await expect(f.rows()).toHaveCount(1);
    await expect(f.rows().first()).toContainText(p.mrn);
  });

  await qa.step(5, async () => {
    await f.main.getByRole('button', { name: 'Clear filter' }).click();
    await expect.poll(() => f.rows().count()).toBeGreaterThan(1);
  });
});

qaTest('TC-APP003-053', async ({ page, qa }) => {
  const f = new FollowUps(page);
  const p = await pt1(page, qa);
  await f.open();

  await qa.step(1, async () => {
    await f.add.click();
    await f.pick(f.dialog.getByRole('combobox', { name: 'Patient' }), p.mrn);
    const save = f.dialog.getByRole('button', { name: 'Save' });
    if (await save.isDisabled()) {
      qa.deviation(1, 'The browser asks for the note (required field); nothing is sent', '"Save" stays disabled while Note is empty; nothing can be sent');
      return;
    }
    await save.click();
    expect(await f.dialog.getByRole('textbox', { name: 'Note' }).evaluate((e) => (e as HTMLTextAreaElement).validity.valueMissing)).toBe(true);
    await expect(f.dialog).toBeVisible();
  });
});

qaTest('TC-APP003-054', async ({ page, qa }) => {
  const f = new FollowUps(page);
  await f.open();

  await qa.step(1, async () => {
    await f.add.click();
    await f.dialog.getByRole('textbox', { name: 'Note' }).fill(qa.name('QA Pasien dihubungi, kontrol minggu depan'));
    const save = f.dialog.getByRole('button', { name: 'Save' });
    if (await save.isDisabled()) {
      qa.note(1, 'refused by the screen: "Save" stays disabled without a patient');
      return;
    }
    await save.click();
    await expect(toastLocator(page, /^Follow-up could not be saved\.$/)).toBeVisible();
  });
});

qaTest('TC-APP003-055', async ({ page, qa }) => {
  const f = new FollowUps(page);
  const p = await pt1(page, qa);
  await f.open();

  await qa.step(1, async () => {
    await f.pick(f.filter, p.mrn);
    await expect(f.main.getByText('No follow-ups for that patient.')).toBeVisible();
  });
});
