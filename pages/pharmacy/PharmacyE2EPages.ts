import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRe } from '../ambulatory/RegisteredPatientsPage';

/**
 * Pharmacy (/id/pharmacy): Orders, the Dispense wizard and Issue Lines. Read
 * from the live screens on 2026-10-15.
 */

/** A type-ahead with suggestions in `#<aria-controls>` (Store on Orders and on Confirm). */
export async function typeAhead(page: Page, field: Locator, text: string): Promise<void> {
  // The field fills itself with a default store shortly after the page loads; typing before that is overwritten.
  await expect(field).not.toHaveValue('', { timeout: 5_000 }).catch(() => {});
  const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
  const option = list.getByRole('option').filter({ hasText: text }).first().getByRole('button');
  await field.click();
  await field.fill('');
  await field.pressSequentially(text, { delay: 20 });
  await option.click();
}

export class OrdersPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  readonly store: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Orders' });
    this.table = this.main.getByRole('table');
    this.store = this.main.getByRole('combobox', { name: 'Store' });
  }

  async open(visitClass?: 'outpatient' | 'inpatient'): Promise<void> {
    await this.page.goto(`/id/pharmacy/orders${visitClass ? `?visit_class=${visitClass}` : ''}`);
    await expect(this.heading).toBeVisible();
  }

  /** Order rows (each opens the wizard through the patient link). */
  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row').filter({ has: this.page.getByRole('link') });
  }

  /** Rows of one patient (the name carries the test token, so it is unique). */
  row(patient: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('link', { name: patient, exact: true }) });
  }

  /** Cells of a row: Patient, Drug, Visit, Remaining. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.trim());
  }

  async pickStore(code: string): Promise<void> {
    await typeAhead(this.page, this.store, code);
    await expect(this.store).toHaveValue(new RegExp(escapeRe(code)));
  }
}

export type WizardStep = 'Select items' | 'Set quantities' | 'Drug order alerts' | 'Confirm';

export class DispenseWizard {
  readonly main: Locator;
  readonly heading: Locator;
  readonly patientSearch: Locator;
  readonly patientSearchButton: Locator;
  readonly itemSearch: Locator;
  readonly scan: Locator;
  readonly back: Locator;
  readonly next: Locator;
  readonly confirm: Locator;
  readonly done: Locator;
  readonly visit: Locator;
  readonly store: Locator;

  constructor(
    readonly page: Page,
    readonly lang: 'en' | 'id' = 'id',
  ) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.patientSearch = this.main.getByRole('searchbox', { name: 'Search medical record' });
    this.patientSearchButton = this.main.getByRole('button', { name: 'Search medical record' });
    this.itemSearch = this.main.getByRole('searchbox', { name: 'Search by name or code' });
    this.scan = this.main.getByRole('button', { name: 'Scan', exact: true });
    this.back = this.main.getByRole('button', { name: 'Back', exact: true });
    this.next = this.main.getByRole('button', { name: 'Next', exact: true });
    this.confirm = this.main.getByRole('button', { name: /^(Confirm dispense|Submitting…)$/ });
    this.done = this.main.getByRole('button', { name: 'Done', exact: true });
    this.visit = this.main.getByRole('combobox', { name: 'Visit' });
    this.store = this.main.getByRole('combobox', { name: 'Store' });
  }

  async open(): Promise<void> {
    await this.page.goto(`/${this.lang}/pharmacy/dispense`);
    await expect(this.heading).toBeVisible();
  }

  /** Search results of "Search medical record": buttons "name · MRN". */
  patientResults(): Locator {
    return this.main.getByRole('list').filter({ has: this.page.getByRole('button', { name: / · / }) }).getByRole('button');
  }

  async searchPatient(text: string): Promise<void> {
    await this.patientSearch.fill(text);
    await this.patientSearchButton.click();
  }

  async pickPatient(p: { mrn: string; fullName: string }, typed: string = p.fullName): Promise<void> {
    await this.searchPatient(typed);
    await this.patientResults().filter({ hasText: p.mrn }).click();
    // "<name> MRN <mrn>"; the Indonesian site writes "RM" for MRN.
    await expect(this.main.getByText(new RegExp(`${escapeRe(p.fullName)}\\s+(MRN|RM)\\s+${escapeRe(p.mrn)}`))).toBeVisible();
  }

  itemResults(): Locator {
    return this.main.getByRole('listbox', { name: 'Matching catalog items' }).getByRole('button');
  }

  /** Searches by code and clicks the result carrying that exact code. */
  async addItem(code: string): Promise<void> {
    await this.itemSearch.fill(code);
    await this.itemResults().filter({ has: this.page.getByText(code, { exact: true }) }).first().click();
    await expect(this.selected().filter({ has: this.page.getByText(code, { exact: true }) })).toHaveCount(1);
  }

  /** Lines under "Selected (n)". */
  selected(): Locator {
    return this.main.getByText(/^(Selected|Dipilih) \(\d+\)$/).locator('xpath=following::ul[1]').getByRole('listitem');
  }

  selectedCount(): Locator {
    return this.main.getByText(/^(Selected|Dipilih) \(\d+\)$/);
  }

  /** The row of an item on "Set quantities". */
  qtyRow(itemName: string): Locator {
    return this.main.getByRole('table').getByRole('row').filter({ has: this.page.getByRole('cell', { name: itemName, exact: true }) });
  }

  requested(itemName: string): Locator {
    return this.qtyRow(itemName).getByRole('spinbutton').nth(0);
  }

  issued(itemName: string): Locator {
    return this.qtyRow(itemName).getByRole('spinbutton').nth(1);
  }

  discount(itemName: string): Locator {
    return this.qtyRow(itemName).getByRole('spinbutton').nth(2);
  }

  generic(itemName: string): Locator {
    return this.qtyRow(itemName).getByRole('checkbox', { name: 'Generic' });
  }

  async setQuantities(itemName: string, q: { requested?: string; issued?: string; discount?: string }): Promise<void> {
    if (q.requested !== undefined) await this.requested(itemName).fill(q.requested);
    if (q.issued !== undefined) await this.issued(itemName).fill(q.issued);
    if (q.discount !== undefined) await this.discount(itemName).fill(q.discount);
  }

  /** A text shown only on that step. */
  marker(step: WizardStep): Locator {
    // An order opens on "Select items" with its own hint ("<patient> — <drug>. Issued quantity …") instead of the search hint;
    // both hints in English and in Indonesian (the site runs in Indonesian, lib/i18n).
    if (step === 'Select items') {
      return this.main.getByText(
        /^(Search by name or code, then click a result to add\. Use Scan for barcode \/ exact code\.|Cari nama atau kode, lalu klik hasil untuk menambah\. Gunakan Scan untuk barcode \/ kode tepat\.|.+ — .+\. (Issued quantity cannot exceed what is still ordered|Jumlah yang dikeluarkan tidak boleh melebihi sisa order)\.)$/,
      );
    }
    const text = {
      'Select items': 'Search by name or code, then click a result to add. Use Scan for barcode / exact code.',
      'Set quantities': 'Set requested and issued quantities. Mark generic substitution when applicable.',
      'Drug order alerts': /^Review hard blocks and soft warnings before confirming\./,
      Confirm: 'Review the issue summary, then confirm to persist issue lines.',
    }[step];
    return this.main.getByText(text);
  }

  async goNext(to: WizardStep): Promise<void> {
    await expect(this.next).toBeEnabled();
    await this.next.click();
    await expect(this.marker(to)).toBeVisible();
  }

  async goBack(to: WizardStep): Promise<void> {
    await this.back.click();
    await expect(this.marker(to)).toBeVisible();
  }

  /** Summary lines on Confirm ("Paracetamol 500mg Tablet 10/10"). */
  summary(): Locator {
    return this.marker('Confirm').locator('xpath=following::ul[1]').getByRole('listitem');
  }

  async pickStore(code: string): Promise<void> {
    await typeAhead(this.page, this.store, code);
    await expect(this.store).toHaveValue(new RegExp(escapeRe(code)));
  }

  /** Summary lines without spaces: the item name and "n/m" are separate elements with no space between them. */
  async summaryCompact(): Promise<string[]> {
    await expect(this.summary().first()).toBeVisible();
    return (await this.summary().allTextContents()).map((t) => t.replace(/\s+/g, ''));
  }

  /** "Done" keeps the patient and clears the items. */
  async expectAfterDone(): Promise<boolean> {
    await expect(this.marker('Select items')).toBeVisible();
    await expect(this.selected()).toHaveCount(0);
    await expect(this.next).toBeDisabled();
    return this.main.getByText('No medical record selected.', { exact: true }).isVisible();
  }
}

/** "Paracetamol 500mg Tablet 3/5 · Generic" -> "Paracetamol500mgTablet3/5·Generic" */
export const compact = (s: string) => s.replace(/\s+/g, '');

export class IssueLinesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly search: Locator;
  readonly table: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Issue Lines' });
    this.search = this.main.getByPlaceholder('Search item name or remarks…');
    this.table = this.main.getByRole('table');
  }

  async open(): Promise<void> {
    await this.page.goto('/id/pharmacy/issue-lines');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  /** Cells: Item, Requested, Issued, Issued, Verified, Returned, Return, Remarks. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  pager(): Locator {
    return this.main.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  /**
   * Shows the page that holds the rows `row` finds: the search narrows only the
   * page on screen (found blocker 40), so with no hit the search is cleared and
   * the list is paged until the rows are there.
   */
  async showRow(row: () => Locator, text: string): Promise<void> {
    await this.search.fill(text);
    if (await row().first().waitFor({ timeout: 10_000 }).then(() => true, () => false)) return;
    await this.search.fill('');
    const next = this.main.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 150; i++) {
      if (await row().first().waitFor({ timeout: 2_000 }).then(() => true, () => false)) return;
      if (!(await next.isVisible()) || (await next.isDisabled())) return;
      await next.click();
      await this.page.waitForLoadState('networkidle').catch(() => {});
    }
  }
}
