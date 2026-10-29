import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';
import { asOnSite } from '../../lib/i18n';
import { escapeRe } from '../ambulatory/RegisteredPatientsPage';

/**
 * Patient Care > Consultation (/id/clinical/consultation). Read from the live
 * screen on 2026-10-15: a patient picker, then a left pane (complementary:
 * name, MRN, Drug orders, Problem list, Allergies) and the tabs Order, SOAP
 * and Prescription. Order and Prescription share the group "Formulary".
 */

/** The fields of a medication order, by their labels on the screen. */
export interface DrugOrder {
  Drug: string;
  Generic?: string;
  Form?: string;
  Strength?: string;
  'Strength unit'?: string;
  Route?: string;
  'Age band'?: string;
  Dose?: string;
  'Dose unit'?: string;
  'Dose type'?: string;
  Frequency?: string;
  'Clock times'?: string;
  Days?: string;
}

export type Tab = 'Order' | 'SOAP' | 'Prescription';

export class ConsultationPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly patientField: Locator;
  readonly pane: Locator;
  readonly panel: Locator;
  readonly changePatient: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Consultation' });
    this.patientField = this.main.getByRole('combobox', { name: 'Select patient' });
    this.pane = this.main.getByRole('complementary');
    this.panel = this.main.getByRole('tabpanel');
    this.changePatient = this.main.getByRole('button', { name: 'Change patient' });
  }

  async open(): Promise<void> {
    await this.page.goto('/id/clinical/consultation');
    await expect(this.heading).toBeVisible();
  }

  /** Suggestions under "Select patient": buttons "MRN · name". */
  suggestions(): Locator {
    return this.page.locator('#consult-patient-list').getByRole('option');
  }

  /** Types `typed` and picks the suggestion containing `choose` (e.g. the MRN). */
  async pickPatient(typed: string, choose: string = typed): Promise<void> {
    await this.patientField.fill(typed);
    await this.suggestions().filter({ hasText: new RegExp(escapeRe(choose)) }).first().getByRole('button').click();
    await expect(this.pane).toBeVisible();
  }

  /** Opens the consultation of a patient by MRN. */
  async openFor(p: { mrn: string; fullName: string }): Promise<void> {
    await this.open();
    await this.pickPatient(p.mrn);
    await expect(this.pane.getByRole('heading', { level: 2, name: p.fullName })).toBeVisible();
  }

  tab(name: Tab): Locator {
    return this.main.getByRole('tab', { name, exact: true });
  }

  async showTab(name: Tab): Promise<void> {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  /** A section of the left pane ("Drug orders", "Problem list", "Allergies"): the elements after its heading. */
  paneSection(title: 'Drug orders' | 'Problem list' | 'Allergies'): Locator {
    return this.pane.locator(`xpath=.//h3[normalize-space()="${title}"]/following-sibling::*[1]`);
  }

  // ------------------------------------------------------------- formulary

  field(name: keyof DrugOrder | 'Vaccine code' | 'Vaccine name' | 'Restriction level' | 'Restriction type' | 'Restriction item' | 'Other generics'): Locator {
    if (name === 'Dose' || name === 'Days') return this.panel.getByRole('spinbutton', { name, exact: true });
    return this.panel.getByRole('textbox', { name, exact: true });
  }

  async fillOrder(o: Partial<DrugOrder>): Promise<void> {
    for (const [k, v] of Object.entries(o)) {
      if (v !== undefined) await this.field(k as keyof DrugOrder).fill(v);
    }
  }

  /** The value under the formulary: "Quantity: 10 dose × clock times × days" (in Indonesian "Jumlah: 10 dosis × jumlah jam × hari") -> "10" ("—" when it cannot be worked out). */
  async quantity(): Promise<string> {
    // Read as the site shows it: the rule's words are separate elements and are not translated one by one.
    const text = await asOnSite(() => this.panel.getByText(/^(Quantity|Jumlah):/).locator('xpath=..').innerText());
    return text.replace(/^(Quantity|Jumlah):\s*/, '').replace(/\s*(dose × clock times × days|dosis × jumlah jam × hari)\s*$/, '').trim();
  }

  checkInteractions(): Locator {
    return this.panel.getByRole('button', { name: 'Check interactions' });
  }

  submitOrder(): Locator {
    return this.panel.getByRole('button', { name: 'Submit order' });
  }

  submitPrescription(): Locator {
    return this.panel.getByRole('button', { name: 'Submit prescription' });
  }

  addLine(): Locator {
    return this.panel.getByRole('button', { name: 'Add', exact: true });
  }

  /** Lines of the prescription list (each with its drug name and a remove button). */
  lines(): Locator {
    return this.panel.getByRole('listitem').filter({ hasNot: this.page.getByRole('button', { name: 'Authorise' }) });
  }

  async placeOrder(o: DrugOrder): Promise<void> {
    await this.fillOrder(o);
    await expect(this.submitOrder()).toBeEnabled();
    await this.submitOrder().click();
    await expect(toastLocator(this.page, /^Order placed\.$/)).toBeVisible();
    // The form clears itself after a placed order.
    await expect(this.field('Drug')).toHaveValue('');
  }

  // ------------------------------------------------------------- sections

  restrictedList(): Locator {
    return this.panel.locator('xpath=.//h3[normalize-space()="Authorise restricted orders"]/following-sibling::ul[1]');
  }
}
