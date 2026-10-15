import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { OT } from '../../../lib/ot-data';
import { OtRequestsPage, type OtRequest, type RowAction } from '../../../pages/ot/OtPages';

/**
 * Shared steps of 08-operation-theater.xlsx. Every request of a test carries
 * the workbook's procedure plus a new token, so its row is found by that text.
 */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** The workbook procedure made unique for this test. */
export const procedure = (qa: Qa, base: string = OT.procedure) => `${base} ${qa.token()}`;

/** Creates a request through "New request" and returns the toasts. */
export async function create(page: Page, r: OtRequest): Promise<string[]> {
  const ot = new OtRequestsPage(page);
  await ot.open();
  await ot.openNew();
  await ot.fill(r);
  const mark = await toastMark(page);
  await ot.save().click();
  return toastsAfter(page, mark);
}

/** Creates a request (toast "Request created") and returns its row. */
export async function request(page: Page, r: OtRequest): Promise<Locator> {
  expect(await create(page, r)).toContain('Request created');
  const ot = new OtRequestsPage(page);
  await ot.open();
  const row = await ot.row(r.procedure);
  await expect(row).toHaveCount(1);
  return row;
}

/** Clicks an action of a request's row (found again after the list reloads) and returns the toasts. */
export async function act(page: Page, procedureText: string, name: RowAction): Promise<string[]> {
  const ot = new OtRequestsPage(page);
  // The list may reload while the row is found, and the twelve action buttons run past the right edge of the
  // screen (a mouse click lands on the page), so the button is pressed with the keyboard and found again if needed.
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await ot.row(procedureText);
    const mark = await toastMark(page);
    if (await ot.action(row, name).press('Enter', { timeout: 5_000 }).then(() => true, () => false)) return toastsAfter(page, mark);
  }
  throw new Error(`"${name}" of the request "${procedureText}" could not be clicked`);
}

/** The cells of a request's row, read after opening the list again. */
export async function cellsOf(page: Page, procedureText: string): Promise<string[]> {
  const ot = new OtRequestsPage(page);
  await ot.open();
  return ot.cells(await ot.row(procedureText));
}

/** Tomorrow (WIB) at hh:mm as a datetime-local value. */
export function tomorrowAt(isoDate: string, hhmm: string): string {
  return `${isoDate}T${hhmm}`;
}
