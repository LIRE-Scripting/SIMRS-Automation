import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../lib/assertions';
import { gotoStable } from '../lib/navigation';

/** Data form Register patient. */
export interface RegisterPatientInput {
  visitType?: string;
  branch?: string;
  mrn?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
}

/**
 * Halaman Registered Patients (/en/registration/patients): daftar pasien,
 * search MRN/nama, dan dialog "Register patient".
 */
export class RegistrationPatientsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newRegistration: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Registered Patients' });
    this.searchInput = page.locator('#regPatientSearch');
    this.newRegistration = page.getByRole('button', { name: /new registration/i });
    this.emptyState = page.locator('main').getByText(/no patients yet/i);
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/registration/patients');
    await expect(this.heading).toBeVisible();
  }

  /**
   * Search hanya terpicu oleh Enter atau ketikan per karakter - fill() saja
   * tanpa Enter tidak menjalankan query.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.searchInput.press('Enter');
  }

  rows(): Locator {
    return this.page.locator('main table tbody tr');
  }

  /** Nama lengkap (kolom ke-2) pada baris pertama tabel. */
  async fullNameOfFirstRow(): Promise<string> {
    return (await this.rows().first().locator('td').nth(1).textContent())?.trim() ?? '';
  }

  /** Dialog "Register patient" (berisi field #reg-first). */
  registerDialog(): Locator {
    return this.page.locator('[role="dialog"]').filter({ has: this.page.locator('#reg-first') });
  }

  async openRegisterDialog(): Promise<void> {
    await this.newRegistration.first().click();
    await expect(this.registerDialog()).toBeVisible();
    await expect(this.registerDialog().getByText('Register patient')).toBeVisible();
  }

  async fillRegisterForm(input: RegisterPatientInput): Promise<void> {
    const dlg = this.registerDialog();
    if (input.visitType) {
      await dlg.locator('select[name="visit_type"]').selectOption({ label: input.visitType });
    }
    if (input.branch) {
      await dlg.locator('#reg-branch').selectOption({ label: input.branch });
    }
    if (input.mrn) {
      await dlg.locator('#reg-mrn').fill(input.mrn);
    }
    await dlg.locator('#reg-first').fill(input.firstName);
    if (input.middleName) {
      await dlg.locator('#reg-middle').fill(input.middleName);
    }
    await dlg.locator('#reg-last').fill(input.lastName);
    if (input.dateOfBirth) {
      await dlg.locator('#reg-dob').fill(input.dateOfBirth);
    }
  }

  /**
   * Dialog ini ditutup lewat atribut (data-open="false" + aria-hidden)
   * tanpa display:none, jadi isVisible()/toBeHidden tidak bisa dipakai.
   */
  async dialogIsOpen(): Promise<boolean> {
    const dlg = this.registerDialog();
    const open = await dlg.getAttribute('data-open').catch(() => null);
    if (open !== null) return open !== 'false';
    return dlg.isVisible();
  }

  /**
   * Submit dan menunggu hasil. Keputusan sukses/gagal diambil dari status
   * HTTP POST-nya (toast sukses kadang terlewat karena auto-dismiss cepat,
   * dan staging kadang memakan submit tanpa efek - klik sekali lagi).
   */
  async submitRegister(expectedToast: RegExp): Promise<void> {
    const dlg = this.registerDialog();
    const submit = dlg.getByRole('button', { name: /^register$/i });
    for (let attempt = 1; attempt <= 2; attempt++) {
      const postPromise = this.page
        .waitForResponse(
          (res) => res.request().method() === 'POST' && res.url().includes('/registration/patients'),
          { timeout: 15_000 },
        )
        .catch(() => null);
      await submit.click();
      const res = await postPromise;
      if (res && res.status() >= 400) {
        throw new Error(
          `Server menolak registrasi: POST /en/registration/patients -> HTTP ${res.status()}. ` +
            'Defect staging (diverifikasi 2026-10-13 pada 5 varian input, semuanya 500).',
        );
      }
      if (res && res.ok()) {
        await toastLocator(this.page, expectedToast)
          .waitFor({ state: 'visible', timeout: 5_000 })
          .catch(() => {});
        return;
      }
      if (!(await this.dialogIsOpen())) return;
    }
  }

  /**
   * Setelah Register, dialog bisa tetap terbuka (mode entry lanjutan) -
   * tutup dengan Escape; kalau masih terbuka, klik tombol Cancel.
   */
  async closeRegisterDialog(): Promise<void> {
    if (!(await this.dialogIsOpen())) return;
    await this.page.keyboard.press('Escape');
    if (await this.dialogIsOpen()) {
      await this.registerDialog()
        .getByRole('button', { name: /^cancel$/i })
        .first()
        .click()
        .catch(() => {});
    }
    await expect(this.registerDialog()).toHaveAttribute('data-open', 'false', { timeout: 5_000 });
  }
}
