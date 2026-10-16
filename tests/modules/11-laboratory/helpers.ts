import { expect, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { LAB } from '../../../lib/lab-data';
import { SampleWorkflowPage, WorklistPage, workLabel, type LabStep, type WorkAction } from '../../../pages/lab/LabPages';

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

/** The label of an order of this test on the Sample workflow. */
export async function labelOf(page: Page, type: string): Promise<string> {
  return workLabel(await new WorklistPage(page).orderOf(type));
}

/** Chooses the order on the Sample workflow, fills the inputs and clicks an action; returns the toasts and the order's line. */
export async function work(page: Page, label: string, action: WorkAction, inputs: Partial<Record<'Reason' | 'Culture note' | 'External lab', string>> = {}): Promise<{ toasts: string[]; line: string }> {
  const s = new SampleWorkflowPage(page);
  await s.open();
  await s.order.selectOption({ label });
  for (const [k, v] of Object.entries(inputs)) await s.input(k as 'Reason').fill(v);
  const mark = await toastMark(page);
  await s.button(action).click();
  const toasts = await toastsAfter(page, mark);
  await s.open();
  const line = (await s.line(label).innerText().catch(() => '')).trim();
  return { toasts, line };
}

/** Specimens and tests: the kind list (labelled "Name"), Code, Name, Save; Test, Low, High, Unit, Save. */
export function catalogue(page: Page) {
  const main = page.getByRole('main');
  return {
    main,
    kind: main.getByRole('combobox', { name: 'Name' }),
    code: main.getByRole('textbox', { name: 'Code', exact: true }),
    name: main.getByRole('textbox', { name: 'Name', exact: true }),
    test: main.getByRole('textbox', { name: 'Test', exact: true }),
    low: main.getByRole('textbox', { name: 'Low', exact: true }),
    high: main.getByRole('textbox', { name: 'High', exact: true }),
    unit: main.getByRole('textbox', { name: 'Unit', exact: true }),
    saveMaster: main.getByRole('button', { name: 'Save' }).first(),
    saveRange: main.getByRole('button', { name: 'Save' }).last(),
  };
}

export async function press(page: Page, button: import('@playwright/test').Locator): Promise<string[]> {
  const mark = await toastMark(page);
  await button.click();
  return toastsAfter(page, mark);
}

/** An order with a result, reviewed and certified on the Sample workflow; returns its label. */
export async function certified(page: Page, qa: Qa): Promise<string> {
  const type = await resulted(page, qa);
  const label = await labelOf(page, type);
  for (const a of ['Review', 'Certify'] as const) expect((await work(page, label, a)).toasts).toContain('Saved');
  return label;
}

/** The Daily QC block: its lines (a table under the heading) and the inputs Test, Value and Save at the end of the screen. */
export function qc(page: Page) {
  const main = page.getByRole('main');
  return {
    block: main.getByRole('heading', { level: 2, name: 'Daily QC' }).locator('xpath=following-sibling::*[1]'),
    rows: main.getByRole('table').last().getByRole('row'),
    test: main.getByRole('textbox', { name: 'Test', exact: true }),
    value: main.getByRole('textbox', { name: 'Value', exact: true }),
    save: main.getByRole('button', { name: 'Save', exact: true }),
  };
}
