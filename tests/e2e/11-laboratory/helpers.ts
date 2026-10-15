import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { LAB } from '../../../lib/lab-data';
import { WorklistPage, type LabStep } from '../../../pages/lab/LabPages';

/**
 * Shared steps of 11-laboratory.xlsx. Every order of a test carries the
 * workbook's result type plus a token ("QA Hemoglobin <token>"), so its row
 * is found by searching for that type.
 */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export const labType = (qa: Qa, base: string = LAB.type) => `${base} ${qa.token()}`;

/** Creates an order through "New lab order" and returns the toasts. */
export async function create(page: Page, type: string, remark?: string): Promise<string[]> {
  const w = new WorklistPage(page);
  await w.open();
  await w.main.getByRole('button', { name: 'New lab order' }).click();
  const d = page.getByRole('dialog', { name: 'Create lab order' });
  await d.getByRole('textbox', { name: 'Result type' }).fill(type);
  if (remark !== undefined) await d.getByRole('textbox', { name: 'Remarks' }).fill(remark);
  const mark = await toastMark(page);
  await d.getByRole('button', { name: /^(Create|Saving…)$/ }).click();
  return toastsAfter(page, mark);
}

/** Takes an order through the given steps (each must answer "Advanced to <step>"). */
export async function advance(page: Page, type: string, steps: LabStep[]): Promise<void> {
  const w = new WorklistPage(page);
  for (const s of steps) {
    // The list renders twice after a search; a press that lands on the first rendering is repeated.
    let toasts: string[] = [];
    for (let i = 0; i < 3 && !toasts.includes(`Advanced to ${s}`); i++) {
      const row = await w.row(type);
      const mark = await toastMark(page);
      await w.press(row, s);
      toasts = await toastsAfter(page, mark, 5_000);
    }
    expect(toasts).toContain(`Advanced to ${s}`);
  }
}

/** An order of this test at the given status ("Ordered" when no step is given); returns its result type. */
export async function order(page: Page, qa: Qa, steps: LabStep[] = [], remark: string = LAB.remark): Promise<string> {
  const type = labType(qa);
  expect(await create(page, type, remark)).toContain('Lab order created');
  await advance(page, type, steps);
  return type;
}

/** Opens "Capture result", fills the given fields and saves; returns the toasts (the dialog stays open). */
export async function capture(page: Page, type: string, v: { result?: string; range?: string; remark?: string }): Promise<string[]> {
  const w = new WorklistPage(page);
  const row = await w.row(type);
  await w.press(row, 'Capture result', w.capture);
  await expect(w.capture).toBeVisible();
  if (v.result !== undefined) await w.field('Lab result').fill(v.result);
  if (v.range !== undefined) await w.field('Result range').fill(v.range);
  if (v.remark !== undefined) await w.field('Remarks').fill(v.remark);
  const mark = await toastMark(page);
  await w.capture.getByRole('button', { name: /^(Save result|Saving…)$/ }).click();
  return toastsAfter(page, mark);
}

/** An order of this test with the workbook result captured ("Resulted"). */
export async function resulted(page: Page, qa: Qa): Promise<string> {
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  expect(await capture(page, type, { result: LAB.result, range: LAB.range, remark: LAB.note })).toContain('Result captured');
  return type;
}

export async function cellsOf(page: Page, type: string): Promise<string[]> {
  const w = new WorklistPage(page);
  return w.cells(await w.row(type));
}
