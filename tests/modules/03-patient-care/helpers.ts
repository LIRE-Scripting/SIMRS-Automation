import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRe } from '../../../pages/ambulatory/RegisteredPatientsPage';

/** Follow-up (/clinical/follow-ups) of 03-patient-care.xlsx: list, filter and the dialog "Add follow-up". */
export class FollowUps {
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
    await this.page.goto('/id/clinical/follow-ups');
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
