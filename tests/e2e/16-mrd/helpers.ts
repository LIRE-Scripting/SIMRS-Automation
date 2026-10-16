import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { toastMark, toastsSince } from '../../../lib/assertions';

/** Shared steps of 16-mrd.xlsx: the screens File Requests and Patient Records, and their records of a test. */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export class Screen {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page, readonly route: 'requests' | 'records', readonly heading: string) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(`/en/mrd/${this.route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.main.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** The row of a document number, paging through the list from page 1. */
  async row(docNo: string): Promise<Locator> {
    await this.open();
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: docNo, exact: true }) });
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
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  async click(button: Locator): Promise<string[]> {
    const mark = await toastMark(this.page);
    await button.click();
    return toastsAfter(this.page, mark);
  }
}

export const requests = (page: Page) => new Screen(page, 'requests', 'Patient File Requests');
export const records = (page: Page) => new Screen(page, 'records', 'Patient Records');

/** Creates a file request; the type is the first active one unless given. Returns the toasts. */
export async function createRequest(s: Screen, v: { no: string; purpose: string; date?: string; type?: string }): Promise<string[]> {
  await s.open();
  await s.main.getByRole('button', { name: 'New request' }).click();
  await s.dialog.getByRole('textbox', { name: 'Document number' }).fill(v.no);
  if (v.date) await s.dialog.getByRole('textbox', { name: 'Document date' }).fill(v.date);
  const type = s.dialog.getByRole('combobox', { name: 'Request type' });
  if (v.type !== '') {
    const options = await type.locator('option').allInnerTexts();
    await type.selectOption({ label: v.type ? options.find((o) => o.startsWith(v.type!))! : options[1] });
  }
  await s.dialog.getByRole('textbox', { name: 'Purpose' }).fill(v.purpose);
  return s.click(s.dialog.getByRole('button', { name: /^(Create|Saving…)$/ }));
}

/** Issues a record for a patient (searched by MRN); returns the toasts. */
export async function issue(s: Screen, v: { patient: { mrn: string; fullName: string }; no: string; remarks?: string; date?: string; from?: string; to?: string }): Promise<string[]> {
  await s.open();
  await s.main.getByRole('button', { name: 'Issue record' }).click();
  await pick(s, v.patient.mrn, v.patient.mrn);
  await s.dialog.getByRole('textbox', { name: 'Document number' }).fill(v.no);
  if (v.date) await s.dialog.getByRole('textbox', { name: 'Document date' }).fill(v.date);
  if (v.remarks !== undefined) await s.dialog.getByRole('textbox', { name: 'Remarks' }).fill(v.remarks);
  if (v.from !== undefined) await s.dialog.getByRole('textbox', { name: 'From' }).fill(v.from);
  if (v.to !== undefined) await s.dialog.getByRole('textbox', { name: 'To' }).fill(v.to);
  return s.click(s.dialog.getByRole('button', { name: /^(Issue|Saving…)$/ }));
}

/** The hits of the patient search of the issue dialog. */
export const hits = (s: Screen) => s.dialog.getByRole('list').getByRole('button').or(s.dialog.getByRole('listbox').getByRole('button'));

export async function pick(s: Screen, search: string, choose: string): Promise<void> {
  await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(search);
  await s.dialog.getByRole('button', { name: 'Find' }).click();
  await hits(s).filter({ hasText: choose }).first().click();
}

export const docNo = (qa: Qa, base: string) => `${base}-${qa.token()}`;
export const mrdPatient = (page: Page, qa: Qa, name = 'QA-MRD Pasien Satu') => registerPatient(page, name, qa.token());
