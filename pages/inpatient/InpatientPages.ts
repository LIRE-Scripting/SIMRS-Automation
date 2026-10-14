import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';
import { escapeRe } from '../ambulatory/RegisteredPatientsPage';

/**
 * Inpatient (/en/adt): Bed management, Admissions, Discharges, Admission
 * requests and Ward care. Read from the live screens on 2026-10-15.
 */

/** Picks a suggestion "code · description" of a type-ahead (bed fields). */
async function pick(page: Page, field: Locator, typed: string, choose: string = typed): Promise<void> {
  await field.fill(typed);
  const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
  await list.getByRole('option').filter({ hasText: new RegExp(escapeRe(choose)) }).first().getByRole('button').click();
}

abstract class ListScreen {
  readonly main: Locator;
  readonly table: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.table = this.main.getByRole('table');
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  async cell(row: Locator, column: string): Promise<Locator> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`Column "${column}" not in ${headers.join(', ')}`);
    return row.getByRole('cell').nth(i);
  }

  async search(text: string): Promise<void> {
    await this.main.getByRole('searchbox', { name: 'Search' }).fill(text);
    await this.main.getByRole('button', { name: 'Search', exact: true }).click();
  }

  pagingSummary(): Locator {
    return this.main.getByText(/^Showing \d+(–\d+)? of \d+$/);
  }
}

// ------------------------------------------------------------------ beds

export interface Bed {
  no: string;
  description?: string;
  availability?: string;
  active?: boolean;
  crossGender?: boolean;
}

export class BedsPage extends ListScreen {
  readonly heading = this.page.getByRole('main').getByRole('heading', { level: 1, name: 'Bed management' });

  async open(): Promise<void> {
    await this.page.goto('/en/adt/beds');
    await expect(this.heading).toBeVisible();
  }

  dialog(name: 'Add bed' | 'Edit bed' = 'Add bed'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  async fill(d: Locator, b: Partial<Bed>): Promise<void> {
    if (b.no !== undefined) await d.getByRole('textbox', { name: 'Bed no' }).fill(b.no);
    if (b.description !== undefined) await d.getByRole('textbox', { name: 'Description' }).fill(b.description);
    if (b.availability) await d.getByRole('combobox', { name: 'Availability' }).selectOption({ label: b.availability });
    if (b.active !== undefined) await d.getByRole('checkbox', { name: 'Active' }).setChecked(b.active);
    if (b.crossGender !== undefined) await d.getByRole('checkbox', { name: 'Cross-gender' }).setChecked(b.crossGender);
  }

  /** Adds a bed and waits for "Bed created". */
  async add(b: Bed): Promise<void> {
    await this.main.getByRole('button', { name: 'Add bed' }).click();
    const d = this.dialog();
    await this.fill(d, b);
    await d.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    await expect(toastLocator(this.page, /^Bed created$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  async openEdit(no: string): Promise<Locator> {
    await this.search(no);
    await this.row(no).getByRole('button', { name: 'Edit' }).click();
    const d = this.dialog('Edit bed');
    await expect(d).toBeVisible();
    return d;
  }

  async edit(no: string, b: Partial<Bed>): Promise<void> {
    const d = await this.openEdit(no);
    await this.fill(d, b);
    await d.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    await expect(toastLocator(this.page, /^Bed updated$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  /** Shows "All beds" or "Vacant only". */
  async show(which: 'All beds' | 'Vacant only'): Promise<void> {
    await this.main.getByRole('combobox').filter({ has: this.page.getByRole('option', { name: 'Vacant only' }) }).selectOption({ label: which });
  }
}

// ------------------------------------------------------------ admissions

export class AdmissionsPage extends ListScreen {
  readonly heading = this.page.getByRole('main').getByRole('heading', { level: 1, name: 'Admissions' });
  readonly admitButton = this.page.getByRole('main').getByRole('button', { name: 'Admit patient' });
  readonly wizard = this.page.getByRole('dialog', { name: 'Admit patient' });

  async open(): Promise<void> {
    await this.page.goto('/en/adt/admissions');
    await expect(this.heading).toBeVisible();
  }

  /** The census figures: "In house", "Occupied", "Vacant" (numbers) and "Occupancy" (text with %). */
  async census(): Promise<Record<'In house' | 'Occupied' | 'Vacant' | 'Occupancy', string>> {
    const region = this.main.getByRole('region', { name: 'Admissions' });
    // The figures load after the page: four labels and four values.
    await expect(region.getByRole('paragraph')).toHaveCount(8);
    await expect(region.getByRole('paragraph').nth(1)).toHaveText(/\d/);
    // textContent: the labels are upper-cased by CSS, innerText would read "IN HOUSE".
    const texts = (await region.getByRole('paragraph').allTextContents()).map((t) => t.trim());
    const value = (label: string) => texts[texts.indexOf(label) + 1];
    return { 'In house': value('In house'), Occupied: value('Occupied'), Vacant: value('Vacant'), Occupancy: value('Occupancy') };
  }

  /** The cards of the "Vacant beds" strip ("BED description"). */
  strip(): Locator {
    return this.main.getByText('Tap to admit into this bed.').locator('xpath=following-sibling::*').getByRole('button').or(
      this.main.getByText('Tap to admit into this bed.').locator('xpath=../following-sibling::*[1]').getByRole('button'),
    );
  }

  stripCard(bedNo: string): Locator {
    return this.main.getByRole('button', { name: new RegExp(`^${escapeRe(bedNo)}\\b`) });
  }

  async next(): Promise<void> {
    await this.wizard.getByRole('button', { name: 'Next' }).click();
  }

  /** Admits through the wizard; `bed` undefined leaves "Allocate later". */
  async admit(name: string, bed?: string, admissionNo?: string): Promise<void> {
    await this.admitButton.click();
    await expect(this.wizard).toBeVisible();
    await this.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
    if (admissionNo) await this.wizard.getByRole('textbox', { name: 'Admission no' }).fill(admissionNo);
    await this.next();
    if (bed) await pick(this.page, this.wizard.getByRole('combobox', { name: 'Bed' }), bed);
    await this.next();
    await this.wizard.getByRole('button', { name: /^(Admit|Saving…)$/ }).click();
    await expect(toastLocator(this.page, /^Patient admitted$/)).toBeVisible();
    await expect(this.wizard).toBeHidden();
  }

  /** The stay row of a patient (searched by name). */
  async stay(name: string): Promise<Locator> {
    await this.search(name);
    const row = this.row(name);
    await expect(row).toHaveCount(1);
    return row;
  }

  /** The admission number under the patient name. */
  async admissionNo(row: Locator): Promise<string> {
    return (await row.getByRole('cell').first().getByRole('paragraph').nth(1).innerText()).trim();
  }

  async transfer(row: Locator, bed: string): Promise<void> {
    await row.getByRole('button', { name: 'Transfer' }).click();
    const d = this.page.getByRole('dialog', { name: 'Transfer bed' });
    await pick(this.page, d.getByRole('combobox', { name: 'New bed' }), bed);
    await d.getByRole('button', { name: 'Transfer' }).click();
    await expect(toastLocator(this.page, /^Transferred$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  async markBillingCleared(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'Mark billing cleared' }).click();
    const d = this.page.getByRole('dialog', { name: 'Mark billing cleared' });
    await d.getByRole('button', { name: 'Mark cleared' }).click();
    await expect(toastLocator(this.page, /^Billing clearance recorded$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  pickBed(field: Locator, typed: string, choose?: string): Promise<void> {
    return pick(this.page, field, typed, choose);
  }
}

export class DischargesPage extends ListScreen {
  readonly heading = this.page.getByRole('main').getByRole('heading', { level: 1, name: 'Discharges' });

  async open(): Promise<void> {
    await this.page.goto('/en/adt/discharges');
    await expect(this.heading).toBeVisible();
  }
}
