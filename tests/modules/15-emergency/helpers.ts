import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { patientWithId } from '../shared/internal-ids';

/** Shared steps of 15-emergency.xlsx: Visits (/emergency/visits) and Emergency Patients (/emergency/patients). */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export class VisitsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Visits' });
    this.table = this.main.getByRole('table');
  }
  async open(): Promise<void> {
    await this.page.goto('/id/emergency/visits');
    await expect(this.heading).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** Cells: Priority, Patient (first 8 characters of the id), Bed, Triage at, From, Status, Actions. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  /** The row of a patient's visit (by the first 8 characters of the patient id), paging from page 1. */
  async row(patientId: string): Promise<Locator> {
    await this.open();
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: new RegExp(`^${patientId.slice(0, 8)}…?$`) }) });
    const next = this.main.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 50; i++) {
      if (await match().count()) return match();
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      await next.press('Enter');
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return match();
  }
  async create(patientId: string): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'Create visit' }).click();
    const d = this.page.getByRole('dialog', { name: 'Create visit' });
    await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(patientId);
    const mark = await toastMark(this.page);
    await d.getByRole('button', { name: /^(Create|Saving…)$/ }).click();
    return toastsAfter(this.page, mark);
  }
  async act(patientId: string, name: 'Triage' | 'Assign bay'): Promise<string[]> {
    const row = await this.row(patientId);
    const mark = await toastMark(this.page);
    await row.getByRole('button', { name, exact: true }).press('Enter');
    return toastsAfter(this.page, mark);
  }
  async assignBay(patientId: string, bedId: string): Promise<string[]> {
    const row = await this.row(patientId);
    await row.getByRole('button', { name: 'Assign bay', exact: true }).press('Enter');
    const d = this.page.getByRole('dialog', { name: 'Assign bay' });
    await d.getByRole('textbox', { name: 'Bed ID (UUID)' }).fill(bedId);
    const mark = await toastMark(this.page);
    await d.getByRole('button', { name: 'Assign bay' }).click();
    return toastsAfter(this.page, mark);
  }
}

export const patient = (page: Page, qa: Qa, name = 'QA-EMG Pasien Satu') => patientWithId(page, name, qa.token());

export class Patients {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(tab?: 'Emergency Patients' | 'Emergency OP Patients' | 'Emergency IP Patients'): Promise<void> {
    await this.page.goto('/id/emergency/patients');
    await expect(this.main.getByRole('heading', { level: 1, name: 'Emergency Patients' })).toBeVisible();
    if (tab) await this.main.getByRole('tab', { name: tab }).click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  async row(name: string, tab?: 'Emergency Patients' | 'Emergency OP Patients' | 'Emergency IP Patients'): Promise<Locator> {
    await this.open(tab);
    await this.main.getByRole('searchbox', { name: 'Search' }).fill(name);
    const row = this.main.getByRole('row').filter({ hasText: name });
    await expect(row.first()).toBeVisible();
    return row.first();
  }
  /** Opens a row dialog ("Triage", "Bed", "Consultant", "Outcome", "Attach file"). */
  async openRow(name: string, button: string): Promise<Locator> {
    const row = await this.row(name);
    await row.getByRole('button', { name: button, exact: true }).click();
    await expect(this.dialog).toBeVisible();
    return this.dialog;
  }
  async click(button: Locator): Promise<string[]> {
    const mark = await toastMark(this.page);
    await button.click();
    return toastsAfter(this.page, mark);
  }
  /** "Walk-in ER": registers and receives a patient at IGD; returns the toasts. */
  async walkIn(name: string, age = '25', unit = 'QA-IGD 1'): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'Walk-in ER', exact: true }).click();
    const d = this.dialog;
    await d.getByRole('textbox', { name: 'Name' }).fill(name);
    await d.getByRole('spinbutton', { name: 'Estimated age (years)' }).fill(age);
    await d.getByRole('combobox').selectOption({ label: 'IGD' });
    await d.getByRole('combobox').locator('xpath=following::input[1]').fill(unit);
    return this.click(d.getByRole('button', { name: 'Receive' }));
  }
}

export const WALKED_IN = 'Walk-in registered and received. Ready for triage.';

export const walkInName = (qa: Qa) => qa.name('X Pasien Walk-in');

/** An open, received encounter of a walk-in patient of this test; returns the name. */
export async function encounter(p: Patients, qa: Qa): Promise<string> {
  const name = walkInName(qa);
  expect(await p.walkIn(name)).toContain(WALKED_IN);
  return name;
}

/** A PDF-like file of about `kb` kilobytes. */
export function pdf(kb: number, name: string) {
  const head = '%PDF-1.4\n% QA test file\n';
  return { name, mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from(head), Buffer.alloc(kb * 1024 - head.length, 32)]) };
}

export async function attach(p: Patients, name: string, file: ReturnType<typeof pdf>, description: string): Promise<string[]> {
  const d = await p.openRow(name, 'Attach file');
  await d.getByRole('textbox', { name: 'Description' }).fill(description);
  const chooser = p.page.waitForEvent('filechooser');
  await d.getByRole('button', { name: 'File', exact: true }).click();
  await (await chooser).setFiles(file);
  return p.click(d.getByRole('button', { name: 'Attach file' }));
}
