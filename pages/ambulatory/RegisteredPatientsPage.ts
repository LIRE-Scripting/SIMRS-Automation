import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';

/**
 * Ambulatory Care > Registered Patients (/id/registration/patients).
 * Locators were read from the live screen on 2026-10-14 (roles and
 * accessible names; the screen has no test ids).
 */

export const VISIT_TYPES = ['Outpatient', 'Emergency desk', 'Staff', 'Staff dependent', 'Disaster', 'Newborn'] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export interface NewPatient {
  visitType?: VisitType;
  mrn?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  personKey?: string;
  born?: string;
  /** Text to type in "Mother"; the suggestion containing it is picked. */
  mother?: string;
}

export interface FormSettings {
  visitTypes?: Partial<Record<VisitType, boolean>>;
  defaultVisitType?: VisitType;
  duplicates?: Partial<Record<'First name' | 'Last name' | 'Date of birth', boolean>>;
  triage?: string;
}

/**
 * Defaults stated by the workbook: 01-ambulatory-care.xlsx | Steps,
 * TC-APP001-009 Preconditions ("all six visit types, default Outpatient, no
 * duplicate field") and TC-APP001-036 Preconditions ("no default triage colour").
 */
export const DEFAULT_FORM_SETTINGS: Required<FormSettings> = {
  visitTypes: Object.fromEntries(VISIT_TYPES.map((v) => [v, true])),
  defaultVisitType: 'Outpatient',
  duplicates: { 'First name': false, 'Last name': false, 'Date of birth': false },
  triage: '',
};

export class RegisteredPatientsPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly formSettingsButton: Locator;
  readonly mergeButton: Locator;
  readonly newRegistrationButton: Locator;
  readonly registeredTab: Locator;
  readonly preRegistrationTab: Locator;
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  readonly table: Locator;
  /** "Showing 1–10 of 55" under the table. */
  readonly pagingSummary: Locator;
  readonly nextPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Registered Patients' });
    this.formSettingsButton = this.main.getByRole('button', { name: 'Form settings', exact: true });
    this.mergeButton = this.main.getByRole('button', { name: 'Merge', exact: true });
    this.newRegistrationButton = this.main.getByRole('button', { name: 'New Registration', exact: true });
    this.registeredTab = this.main.getByRole('tab', { name: /^Registered/ });
    this.preRegistrationTab = this.main.getByRole('tab', { name: /^Pre-registration/ });
    this.searchBox = this.main.getByRole('searchbox', { name: 'Search' });
    this.searchButton = this.main.getByRole('button', { name: 'Search', exact: true });
    this.table = this.main.getByRole('table');
    this.pagingSummary = this.main.getByText(/^Showing \d+–\d+ of \d+$/);
    this.nextPageButton = this.main.getByRole('button', { name: 'Next page' });
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/id/registration/patients${query}`);
    await expect(this.heading).toBeVisible();
  }

  /** Number shown on a tab, e.g. "Registered 43" -> 43. */
  async tabCount(tab: Locator): Promise<number> {
    const text = (await tab.innerText()).replace(/\s+/g, ' ');
    const n = text.match(/(\d+)\s*$/)?.[1];
    if (!n) throw new Error(`No number on tab "${text}"`);
    return Number(n);
  }

  async search(term: string, how: 'button' | 'enter' = 'button'): Promise<void> {
    await this.searchBox.fill(term);
    if (how === 'enter') await this.searchBox.press('Enter');
    else await this.searchButton.click();
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /** Cell of a row by its column header ("MRN", "Full name", "Visit", …). */
  async cell(row: Locator, column: string): Promise<Locator> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`Column "${column}" not in ${headers.join(', ')}`);
    return row.getByRole('cell').nth(i);
  }

  // ------------------------------------------------------------ register

  registerDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Register patient' });
  }

  async openRegister(): Promise<Locator> {
    await this.newRegistrationButton.click();
    const d = this.registerDialog();
    await expect(d).toBeVisible();
    return d;
  }

  visitTypeSelect(d = this.registerDialog()): Locator {
    return d.getByRole('combobox', { name: 'Visit type' });
  }

  async fillRegister(p: NewPatient, d = this.registerDialog()): Promise<void> {
    if (p.visitType) await this.visitTypeSelect(d).selectOption(p.visitType);
    if (p.mrn !== undefined) await d.getByRole('textbox', { name: 'MRN (optional)' }).fill(p.mrn);
    await d.getByRole('textbox', { name: 'First name' }).first().fill(p.firstName);
    if (p.middleName) await d.getByRole('textbox', { name: 'Middle name' }).first().fill(p.middleName);
    await d.getByRole('textbox', { name: 'Last name' }).first().fill(p.lastName);
    if (p.dateOfBirth) await d.getByRole('textbox', { name: 'Date of birth' }).first().fill(p.dateOfBirth);
    if (p.personKey !== undefined) await d.getByRole('textbox', { name: 'Person key' }).fill(p.personKey);
    if (p.born) await d.getByRole('textbox', { name: 'Born' }).fill(p.born);
    if (p.mother) await this.pick(d.getByRole('textbox', { name: 'Mother' }), p.mother, d);
  }

  registerButton(d = this.registerDialog()): Locator {
    return d.getByRole('button', { name: /^(Register|Saving…)$/ });
  }

  /** Types into a patient field and picks the suggestion ("MRN · name") that contains `text`. */
  async pick(field: Locator, text: string, scope: Locator): Promise<void> {
    await field.fill(text);
    await scope.getByRole('listitem').getByRole('button', { name: new RegExp(escapeRe(text)) }).first().click();
  }

  /** Types `typed` into a patient field and picks the suggestion whose text contains `choose` (e.g. an MRN). */
  async pickFrom(field: Locator, typed: string, choose: string, scope: Locator): Promise<void> {
    await field.fill(typed);
    await scope.getByRole('listitem').getByRole('button', { name: new RegExp(escapeRe(choose)) }).first().click();
  }

  /** Registers one patient and returns its MRN and full name as listed. */
  async register(p: NewPatient): Promise<{ mrn: string; fullName: string }> {
    const d = await this.openRegister();
    await this.fillRegister(p, d);
    await this.registerButton(d).click();
    await expect(toastLocator(this.page, /^Patient registered$/)).toBeVisible();
    await expect(d).toBeHidden();
    return this.find(p.lastName);
  }

  /** Searches a unique text and returns MRN and full name of the single row found. */
  async find(text: string): Promise<{ mrn: string; fullName: string }> {
    await this.search(text);
    const row = this.row(text);
    await expect(row).toHaveCount(1);
    return {
      mrn: (await (await this.cell(row, 'MRN')).innerText()).trim(),
      fullName: (await (await this.cell(row, 'Full name')).innerText()).trim(),
    };
  }

  // ------------------------------------------------------------- details

  detailsDialog(name: string): Locator {
    return this.page.getByRole('dialog', { name });
  }

  async openDetails(fullName: string): Promise<Locator> {
    await this.table.getByRole('button', { name: fullName, exact: true }).click();
    const d = this.detailsDialog(fullName);
    await expect(d).toBeVisible();
    return d;
  }

  /** Value next to a term in the details dialog. */
  detail(d: Locator, term: string): Locator {
    return d.getByRole('term').filter({ hasText: new RegExp(`^${escapeRe(term)}$`) }).locator('xpath=following-sibling::*[1]');
  }

  // ------------------------------------------------------- form settings

  formSettingsDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Form settings' });
  }

  async openFormSettings(): Promise<Locator> {
    await this.formSettingsButton.click();
    const d = this.formSettingsDialog();
    await expect(d).toBeVisible();
    return d;
  }

  async setFormSettings(s: FormSettings): Promise<void> {
    const d = await this.openFormSettings();
    for (const [name, on] of Object.entries(s.visitTypes ?? {})) {
      await d.getByRole('group', { name: 'Visit types' }).getByRole('checkbox', { name, exact: true }).setChecked(on);
    }
    if (s.defaultVisitType) await d.getByRole('combobox', { name: 'Default visit type' }).selectOption(s.defaultVisitType);
    for (const [name, on] of Object.entries(s.duplicates ?? {})) {
      await d.getByRole('group', { name: 'Duplicate fields' }).getByRole('checkbox', { name, exact: true }).setChecked(on);
    }
    if (s.triage !== undefined) await d.getByRole('textbox', { name: 'Default triage color' }).fill(s.triage);
    await d.getByRole('button', { name: 'Save settings' }).click();
    await expect(toastLocator(this.page, /^Settings saved$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  // --------------------------------------------------------------- merge

  mergeDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Merge patients' });
  }

  // ---------------------------------------------------- pre-registration

  async openPreRegistration(): Promise<Locator> {
    await this.preRegistrationTab.click();
    const panel = this.main.getByRole('tabpanel');
    await expect(panel.getByRole('heading', { name: 'Record an intake' })).toBeVisible();
    return panel;
  }
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
