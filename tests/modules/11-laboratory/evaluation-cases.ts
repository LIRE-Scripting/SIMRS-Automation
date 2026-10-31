import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { LAB } from '../../../lib/lab-data';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { WorklistPage, type LabStep } from '../../../pages/lab/LabPages';
import { labOrder, newPt1, type Patient } from '../03-patient-care/cases';
import { signedOutJourney, userPage } from '../shared/access';
import { capture, order, resulted, toastsAfter } from './helpers';
/**
 * 11-laboratory.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): lab orders made in a consultation, what the
 * worklist shows of the patient, corrections and two analysts on one order.
 * An order from a consultation has the type "Hematologi Lengkap" and the
 * remark "QA puasa 8 jam" + token, so its row is found by the remark.
 * "Analyst 2" is U4 (qa.admin3).
 */



export const TYPE = 'Hematologi Lengkap';

/** A lab order from PT-1's consultation; returns the patient, the remark and the toasts. */
export async function consultationOrder(page: Page, qa: Qa, pt?: Patient): Promise<{ pt: Patient; remark: string; toasts: string[] }> {
  const p = pt ?? (await newPt1(page, qa));
  const c = new ConsultationPage(page);
  await c.openFor(p);
  const remark = qa.prefix('QA puasa 8 jam');
  const r = await labOrder(page, c, TYPE, remark);
  return { pt: p, remark, toasts: r.toasts };
}

/** The worklist row of an order by its remark (searched, else on the first page). */
export async function rowOf(page: Page, remark: string): Promise<Locator> {
  const w = new WorklistPage(page);
  await w.open();
  await w.search.fill(remark);
  await w.main.getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  let row = w.rows().filter({ hasText: remark });
  if (!(await row.first().isVisible({ timeout: 5_000 }).catch(() => false))) {
    await w.open();
    row = w.rows().filter({ hasText: remark });
  }
  await expect(row.first()).toBeVisible();
  return row.first();
}

/** Presses the steps on the order of a remark (each answers "Advanced to <step>"). */
export async function advanceBy(page: Page, remark: string, steps: LabStep[]): Promise<void> {
  const w = new WorklistPage(page);
  for (const s of steps) {
    let toasts: string[] = [];
    for (let i = 0; i < 3 && !toasts.includes(`Advanced to ${s}`); i++) {
      const row = await rowOf(page, remark);
      const mark = await toastMark(page);
      await w.press(row, s);
      toasts = await toastsAfter(page, mark, 5_000);
    }
    expect(toasts).toContain(`Advanced to ${s}`);
  }
}

/** Captures a result on the order of a remark; returns the toasts. */
export async function captureBy(page: Page, remark: string, result: string): Promise<string[]> {
  const w = new WorklistPage(page);
  await w.press(await rowOf(page, remark), 'Capture result', w.capture);
  await w.field('Lab result').fill(result);
  await w.field('Result range').fill(LAB.range);
  const mark = await toastMark(page);
  await w.capture.getByRole('button', { name: /^(Save result|Saving…)$/ }).click();
  return toastsAfter(page, mark);
}

export const TC_APP011_007 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  let remark = '';
  await qa.step(1, async () => {
    const o = await consultationOrder(page, qa);
    remark = o.remark;
    expect(o.toasts).toContain('Lab order created. Check the laboratory worklist.');
  });
  await qa.step(2, async () => {
    const w = new WorklistPage(page);
    await w.open();
    const first = await w.cells(w.rows().first());
    qa.note(2, `first row: ${first.join(' | ')}`);
    const row = await w.cells(await rowOf(page, remark));
    expect(row[1]).toBe(TYPE);
    expect(row[2]).toBe('Ordered');
    if (!first.includes(remark)) qa.deviation(2, 'A new first row', 'the order is not the first row');
  });
  await qa.step(3, async () => {
    await advanceBy(page, remark, ['Generated', 'Sent', 'Accepted']);
    expect(await captureBy(page, remark, LAB.result)).toContain('Result captured');
    const w = new WorklistPage(page);
    expect((await w.cells(await rowOf(page, remark)))[2]).toBe('Resulted');
  });
};

export const TC_APP011_011 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const other = await consultationOrder(page, qa, await newPt1(page, qa));
  const mine = await consultationOrder(page, qa);
  qa.note(1, `two orders of "${TYPE}": ${other.pt.fullName} ("${other.remark}") a moment before ${mine.pt.fullName} ("${mine.remark}")`);
  const w = new WorklistPage(page);
  await qa.step(1, async () => {
    const text = (await (await rowOf(page, mine.remark)).innerText()).replace(/\s+/g, ' ');
    qa.note(1, `PT-1's row: "${text}"`);
    if (!text.includes(mine.pt.fullName) || !text.includes(mine.pt.mrn)) qa.deviation(1, "PT-1's name and MRN on the row", 'the row names no patient; only the remark tells the two orders apart');
  });
  await qa.step(2, async () => {
    await advanceBy(page, mine.remark, ['Generated']);
    const row = (await (await rowOf(page, mine.remark)).innerText()).replace(/\s+/g, ' ');
    const s = page;
    await s.goto('/id/laboratory/work');
    const labels = await s.getByRole('main').getByRole('combobox', { name: 'Order' }).locator('option').allInnerTexts();
    const mineLabel = labels.find((l) => l.includes(mine.pt.fullName));
    qa.note(2, `the row after "Generated": "${row}"`);
    if (!mineLabel) qa.deviation(2, "The label carries the patient's name, MRN and date of birth beside the sample ID", 'no label of the Sample workflow names the patient');
  });
  await qa.step(3, async () => {
    await w.press(await rowOf(page, mine.remark), 'Capture result', w.capture);
    const text = (await w.capture.innerText()).replace(/\s+/g, ' ');
    qa.note(3, `"Capture result": "${text.slice(0, 160)}"`);
    if (!text.includes(mine.pt.fullName)) qa.deviation(3, 'The dialog shows whose result is being typed', 'the dialog names no patient');
    await page.keyboard.press('Escape');
  });
  await qa.step(4, async () => {
    await w.open();
    await w.main.getByRole('button', { name: 'New lab order' }).click();
    const d = page.getByRole('dialog', { name: 'Create lab order' });
    const fields = await d.getByRole('textbox').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? e.getAttribute('aria-label') ?? ''));
    qa.note(4, `"New lab order" fields: ${fields.join(', ')}`);
    if (!fields.some((f) => /patient|pasien/i.test(f))) qa.deviation(4, 'A patient must be picked', 'the dialog has no patient field');
    await page.keyboard.press('Escape');
  });
};

export const TC_APP011_012 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const o = await consultationOrder(page, qa);
  await advanceBy(page, o.remark, ['Generated', 'Sent', 'Accepted']);
  expect(await captureBy(page, o.remark, LAB.result)).toContain('Result captured');
  qa.note(1, `the order "${o.remark}" of ${o.pt.fullName} is resulted (${LAB.result})`);
  const c = new ConsultationPage(page);
  await qa.step(1, async () => {
    await c.openFor(o.pt);
    const text = await c.panel.innerText();
    if (!text.includes(LAB.result)) qa.deviation(1, 'The lab order and its result are listed', `the consultation shows no result (${text.includes(o.remark) ? 'the order is listed' : 'nor the order'})`);
  });
  await qa.step(2, async () => {
    await page.goto('/id');
    const bell = page.getByRole('button', { name: 'Notifications' });
    await bell.click().catch(() => {});
    const menu = (await page.getByRole('menu').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    qa.note(2, `notifications: "${menu.slice(0, 120)}"`);
    if (!/lab|result|hasil/i.test(menu)) qa.deviation(2, 'A notice or a marker on the patient', 'no notification and no marker that the result is ready');
  });
  await qa.step(3, async () => {
    const row = await rowOf(page, o.remark);
    const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim());
    qa.note(3, `the row offers: ${buttons.join(', ')}`);
    if (!buttons.some((b) => /print|report|send|cetak|kirim/i.test(b))) qa.deviation(3, 'A report with patient, test, result, range and the analyst\'s name', 'no print or send of a result report on the worklist');
  });
};

export const TC_APP011_018 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const type = await resulted(page, qa);
  qa.note(1, `OR-RES: the order "${type}" resulted with ${LAB.result} by U1`);
  const a2 = await userPage(browser, 'U4');
  try {
    await qa.step(1, async () => {
      const w2 = new WorklistPage(a2);
      await w2.press(await w2.row(type), 'Capture result', w2.capture);
      const reasonField = await w2.capture.getByRole('textbox', { name: /reason|alasan/i }).count();
      const toasts = await capture(a2, type, { result: '8.5 g/dL' });
      qa.note(1, `Analyst 2 changes the result to 8.5 g/dL: "${toasts.join(' / ')}"`);
      if (!reasonField && toasts.includes('Result captured')) qa.deviation(1, 'A reason is asked for, and the change is saved as a correction', 'saved over the released result with no reason');
    });
    await qa.step(2, async () => {
      const w2 = new WorklistPage(a2);
      const cells = await w2.cells(await w2.row(type));
      qa.note(2, `the row: ${cells.join(' | ')}`);
      if (!cells.join(' ').match(/correct|koreksi|13\.5/i)) qa.deviation(2, 'The result is marked as corrected, with the earlier value, the user and the time', `the row shows ${cells[3]} only`);
    });
  } finally {
    await a2.context().close();
  }
};

export const TC_APP011_021 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const o = await consultationOrder(page, qa);
  await qa.step(1, async () => {
    await advanceBy(page, o.remark, ['Generated', 'Sent', 'Accepted']);
    expect(await captureBy(page, o.remark, LAB.result)).toContain('Result captured');
  });
  qa.notRun(2, "the bill of PT-1 is read at the cashier, whose counter is closed until 07:00 WIB; the order names no patient (TC-APP003-034), so no charge can reach PT-1's bill");
};

export const TC_APP011_023 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const gen = await order(page, qa, ['Generated']);
  const acc = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  const a2 = await userPage(browser, 'U4');
  const [w1, w2] = [new WorklistPage(page), new WorklistPage(a2)];
  try {
    await qa.step(1, async () => {
      const [r1, r2] = [await w1.row(gen), await w2.row(gen)];
      const m1 = await toastMark(page);
      await w1.press(r1, 'Sent');
      const t1 = await toastsAfter(page, m1);
      const m2 = await toastMark(a2);
      const offered = await r2.getByRole('button', { name: 'Sent', exact: true }).count();
      if (offered) await w2.press(r2, 'Sent');
      const t2 = offered ? await toastsAfter(a2, m2) : ['(no "Sent" any more)'];
      qa.note(1, `Analyst: "${t1.join(' / ')}"; Analyst 2 on the old list: "${t2.join(' / ')}"`);
      expect(t1).toContain('Advanced to Sent');
      if (t2.includes('Advanced to Sent')) qa.deviation(1, 'Analyst 2 is told that the order was already sent', 'sent a second time');
    });
    await qa.step(2, async () => {
      const r2 = await w2.row(gen);
      const m = await toastMark(a2);
      await r2.getByRole('button', { name: 'Accepted', exact: true }).dblclick();
      const t = await toastsAfter(a2, m);
      qa.note(2, `double-click on "Accepted": "${t.join(' / ')}"`);
      if (t.filter((x) => x === 'Advanced to Accepted').length > 1) qa.deviation(2, 'One step; the second click is ignored or refused', 'two steps');
    });
    await qa.step(3, async () => {
      const [r1, r2] = [await w1.row(acc), await w2.row(acc)];
      await w1.press(r1, 'Capture result', w1.capture);
      await w2.press(r2, 'Capture result', w2.capture);
      await w1.field('Lab result').fill('13.5 g/dL');
      await w2.field('Lab result').fill('14.0 g/dL');
      const m1 = await toastMark(page);
      await w1.capture.getByRole('button', { name: /^(Save result|Saving…)$/ }).click();
      const t1 = await toastsAfter(page, m1);
      const m2 = await toastMark(a2);
      await w2.capture.getByRole('button', { name: /^(Save result|Saving…)$/ }).click();
      const t2 = await toastsAfter(a2, m2);
      qa.note(3, `Analyst: "${t1.join(' / ')}"; Analyst 2: "${t2.join(' / ')}"`);
      if (t2.includes('Result captured')) qa.deviation(3, 'Analyst 2 is warned that a result was saved meanwhile', `14.0 g/dL saved over 13.5 g/dL with no warning (row: ${(await w1.cells(await w1.row(acc)))[3]})`);
    });
  } finally {
    await a2.context().close();
  }
  await qa.step(4, async () => {
    const half = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
    await w1.press(await w1.row(half), 'Capture result', w1.capture);
    await w1.field('Lab result').fill('13.');
    let warned = false;
    page.once('dialog', (d) => {
      warned = true;
      void d.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await w1.open();
    if (!warned && !(await w1.capture.isVisible().catch(() => false))) qa.deviation(4, 'The text is kept, or the analyst is warned', 'the half-typed result is lost with no warning');
  });
};

export const TC_APP011_028 = ({ qa, browser }: { qa: Qa; browser: Browser }) => signedOutJourney(browser, qa, '/laboratory/orders', /\/(id|en)\/laboratory\/orders/);
