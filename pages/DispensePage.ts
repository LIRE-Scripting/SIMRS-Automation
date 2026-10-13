import { expect, type Locator, type Page } from '@playwright/test';
import { expectToast } from '../lib/assertions';
import { ensureSignedIn } from '../lib/auth';
import { gotoStable } from '../lib/navigation';

export const WIZARD_STEPS = ['Select items', 'Set quantities', 'Drug order alerts', 'Confirm'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** Escapes text for use inside a RegExp locator name. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pharmacy > Dispense: the four-step dispense wizard. */
export class DispensePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly toast: Locator;
  readonly patientSearch: Locator;
  readonly patientSearchButton: Locator;
  readonly itemSearch: Locator;
  readonly scanButton: Locator;
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly registerWalkInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Dispense' });
    this.toast = page.getByRole('alert');
    this.patientSearch = page.getByRole('searchbox', { name: /search medical record|cari rekam medis/i });
    this.patientSearchButton = page.getByRole('button', { name: /search medical record|cari rekam medis/i });
    this.itemSearch = page.getByRole('searchbox', { name: /search by name or code|cari nama atau kode/i });
    this.scanButton = page.getByRole('button', { name: /^scan$/i });
    this.backButton = page.getByRole('button', { name: /^(back|kembali)$/i });
    this.nextButton = page.getByRole('button', { name: /^(next|lanjut)$/i });
    this.registerWalkInLink = page.getByRole('link', { name: /register on the patient form/i });
  }

  async open(): Promise<void> {
    await ensureSignedIn(this.page);
    await gotoStable(this.page, '/en/pharmacy/dispense');
  }

  stepItem(name: WizardStep): Locator {
    return this.page.getByRole('list', { name: /wizard steps/i }).getByText(name, { exact: true });
  }

  /**
   * Region holding patient search results. The empty state is a paragraph
   * ("No medical record matches."); matches render as clickable buttons,
   * so matching is done by button role inside the wizard body.
   */
  patientResults(): Locator {
    return this.page.getByRole('main');
  }

  itemResults(): Locator {
    return this.page.getByRole('listbox', { name: /matching catalog items/i });
  }

  async searchPatient(term: string): Promise<void> {
    await this.patientSearch.fill(term);
    await this.patientSearchButton.click();
  }

  /** Picks the first result matching the name; returns false when nothing matched. */
  async pickPatient(name: string): Promise<boolean> {
    const option = this.patientResults().getByRole('button', { name: new RegExp(escapeRegExp(name), 'i') }).first();
    try {
      await option.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return false;
    }
    await option.click();
    return true;
  }

  async searchItem(term: string): Promise<void> {
    await this.itemSearch.fill(term);
  }

  /** Picks the first catalog item matching the name; returns false when nothing matched. */
  async pickItem(name: string): Promise<boolean> {
    const option = this.itemResults().getByRole('button', { name: new RegExp(escapeRegExp(name), 'i') }).first();
    try {
      await option.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return false;
    }
    await option.click();
    return true;
  }

  selectedCount(): Locator {
    return this.page.getByText(/selected \(\d+\)/i);
  }

  requestedInput(): Locator {
    return this.page.getByLabel(/requested/i).first();
  }

  issuedInput(): Locator {
    return this.page.getByLabel(/issued/i).first();
  }

  discountInput(): Locator {
    return this.page.getByLabel(/discount|diskon/i);
  }

  genericCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /generic|generik/i });
  }

  /**
   * Picks a store in the wizard. Handles both a native select and a custom
   * dropdown that lists options after a click.
   */
  async pickStore(name: string): Promise<string> {
    const combo = this.page.getByRole('combobox', { name: /^(store|apotek)$/i });
    if ((await combo.count()) > 0) {
      try {
        await combo.selectOption({ label: name }, { timeout: 3_000 });
        return name;
      } catch {
        // The workbook's store (e.g. ST-OP) does not exist here: take the first real option.
        const options = (await combo.locator('option').allTextContents())
          .map((text) => text.trim())
          .filter((text) => text.length > 0 && !/^(choose|pilih)/i.test(text));
        if (options.length === 0) return '';
        await combo.selectOption({ label: options[0] });
        return options[0];
      }
    }
    try {
      await this.page.getByLabel(/^(store|apotek)$/i).click({ timeout: 3_000 });
      const option = this.page.getByRole('option', { name, exact: true }).first();
      await option.click({ timeout: 3_000 });
      return name;
    } catch {
      const option = this.page.getByRole('option').first();
      if ((await option.count()) === 0) return '';
      const picked = (await option.textContent())?.trim() ?? '';
      await option.click();
      return picked;
    }
  }

  confirmButton(): Locator {
    return this.page.getByRole('button', { name: /confirm dispense/i });
  }

  doneButton(): Locator {
    return this.page.getByRole('button', { name: /^done$/i });
  }

  scanDialog(): Locator {
    return this.page.getByRole('dialog', { name: /scan item code/i });
  }

  /** Types "no medical record selected" state text. */
  noPatientText(): Locator {
    return this.page.getByText(/no medical record selected/i);
  }

  async goNext(): Promise<void> {
    await expect(this.nextButton).toBeEnabled();
    await this.nextButton.click();
  }

  async goBack(): Promise<void> {
    await expect(this.backButton).toBeEnabled();
    await this.backButton.click();
  }

  /**
   * Verifies the wizard is showing a step by that step's content,
   * which is more reliable than any highlight styling.
   */
  async expectOnStep(name: WizardStep): Promise<void> {
    switch (name) {
      case 'Select items':
        await expect(this.patientSearch).toBeVisible();
        break;
      case 'Set quantities':
        await expect(this.requestedInput()).toBeVisible();
        break;
      case 'Drug order alerts':
        await expect(
          this.page.getByText(/no drug interactions|hard interaction|soft warning/i).first(),
        ).toBeVisible();
        break;
      case 'Confirm':
        await expect(this.confirmButton()).toBeVisible();
        break;
    }
  }

  /** Types an exact code into the Scan dialog and presses Enter. */
  async scanCode(code: string): Promise<void> {
    await this.scanButton.click();
    const input = this.scanDialog().getByRole('textbox');
    await input.fill(code);
    await input.press('Enter');
  }

  /** Expects a toast fragment (alert or status region). */
  async expectToast(pattern: RegExp): Promise<void> {
    await expectToast(this.page, pattern);
  }
}
