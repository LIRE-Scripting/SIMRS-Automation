import { expect, type Locator, type Page } from '@playwright/test';
import { gotoStable } from '../lib/navigation';

const OPEN_DIALOG = '[role="dialog"]:not([data-open="false"])';
// Input teks pada form ini tidak punya atribut type eksplisit.
const TEXT_INPUT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="number"])';

async function openDialogBy(page: Page, trigger: Locator, hasText: string): Promise<Locator> {
  await trigger.first().click({ timeout: 10_000 });
  // Beberapa dialog selalu ter-mount: pilih dialog berdasarkan isinya.
  const dlg = page.locator(OPEN_DIALOG).filter({ hasText }).first();
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  return dlg;
}

/** Registration > Priority rules: aturan prioritas antrean pasien. */
export class PriorityRulesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Priority rules' });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/registration/priority-rules');
    await expect(this.heading).toBeVisible();
  }

  rowWithCode(code: string): Locator {
    return this.rows.filter({ hasText: code }).first();
  }

  openAdd(): Promise<Locator> {
    return openDialogBy(this.page, this.page.getByRole('button', { name: /^add$/i }), 'Requires same-day');
  }

  /** Dialog Add: Code, Name, Active, Requires same-day encounter. */
  async fillRule(
    dlg: Locator,
    rule: { code: string; name: string; active: boolean; sameDay: boolean },
  ): Promise<void> {
    const texts = dlg.locator(TEXT_INPUT);
    await texts.nth(0).fill(rule.code);
    await texts.nth(1).fill(rule.name);
    const checks = dlg.locator('input[type="checkbox"]');
    await checks.nth(0).setChecked(rule.active);
    await checks.nth(1).setChecked(rule.sameDay);
  }
}

/** Registration > Patient flags: penanda pasien berbasis ekspresi. */
export class PatientFlagsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Patient flags' });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/registration/patient-flags');
    await expect(this.heading).toBeVisible();
  }

  rowWithName(name: string): Locator {
    return this.rows.filter({ hasText: name }).first();
  }

  openAdd(): Promise<Locator> {
    return openDialogBy(this.page, this.page.getByRole('button', { name: /^add$/i }), 'Expression');
  }

  /** Dialog Add: Name, Expression, Priority, Role (select), Branch (select). */
  async fillFlag(
    dlg: Locator,
    flag: { name: string; expression: string; priority: string; role: string; branch: string },
  ): Promise<void> {
    const texts = dlg.locator(TEXT_INPUT);
    await texts.nth(0).fill(flag.name);
    await texts.nth(1).fill(flag.expression);
    await dlg.locator('input[type="number"]').first().fill(flag.priority);
    await dlg.locator('select').nth(0).selectOption({ label: flag.role });
    await dlg.locator('select').nth(1).selectOption({ label: flag.branch });
  }
}

/** Registration > Appointments: daftar janji temu, Book, Block time. */
export class RegistrationAppointmentsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Appointments' });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/registration/appointments');
    await expect(this.heading).toBeVisible();
  }

  openBook(): Promise<Locator> {
    return openDialogBy(this.page, this.page.getByRole('button', { name: /^book$/i }), 'Book appointment');
  }

  openBlockTime(): Promise<Locator> {
    return openDialogBy(this.page, this.page.getByRole('button', { name: /^block time$/i }), 'Block consultant');
  }
}

/** Registration > Arrival (department queue): kedatangan pasien + aturan nomor. */
export class ArrivalPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Arrival' });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/registration/department-queue');
    await expect(this.heading).toBeVisible();
  }

  openArrive(): Promise<Locator> {
    return openDialogBy(this.page, this.page.locator('main').getByRole('button', { name: /^arrive$/i }), 'Priority rule');
  }

  openNumberRule(): Promise<Locator> {
    return openDialogBy(this.page, this.page.getByRole('button', { name: /^number rule$/i }), 'Restart each day');
  }
}
