import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { LAB } from '../../../lib/lab-data';
import { WorklistPage } from '../../../pages/lab/LabPages';
import { advance, capture, cellsOf, create, labType, order, resulted, toastsAfter } from './helpers';
import { escapeText, sourceOnSite } from '../../../lib/i18n';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of worklist.spec.ts, shared with the end-to-end chains (chain.run). */

export const COLUMNS = ['Sample ID', 'Result type', 'Status', 'Result', 'Result range', 'Result status', 'Remarks', 'Actions'];

export const TC_APP011_001: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = labType(qa);
  const d = page.getByRole('dialog', { name: 'Create lab order' });

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Laboratory\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Open worklist' }).click();
    await expect(w.heading).toBeVisible();
    await expect(w.main.getByText('Service orders, sample status, and result entry.', { exact: true })).toBeVisible();
    for (const l of [w.search, w.status, w.scan, w.main.getByRole('button', { name: 'New lab order' })]) await expect(l).toBeVisible();
  });

  await qa.step(2, async () => {
    await w.main.getByRole('button', { name: 'New lab order' }).click();
    await expect(d.getByText('Create a lab order that starts in progress.', { exact: true })).toBeVisible();
    for (const f of ['Result type', 'Remarks']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Branch' }).or(d.getByRole('combobox', { name: 'Branch' }))).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Result type' }).fill(type);
    await d.getByRole('textbox', { name: 'Remarks' }).fill(LAB.remark);
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Create' }).click();
    expect(await toastsAfter(page, mark)).toContain('Lab order created');
  });

  await qa.step(4, async () => {
    await w.open();
    const first = await w.cells(w.rows().first());
    if (first[1] !== type) qa.deviation(4, 'The new order is the first row', `the first row is "${first[1]}"`);
    const c = await cellsOf(page, type);
    expect(c.slice(0, 5)).toEqual(['—', type, 'Ordered', '—', '—']);
    expect(c[6]).toBe(LAB.remark);
    const row = await w.row(type);
    for (const b of ['Generated', 'Capture result']) await expect(row.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
};

export const TC_APP011_003: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await order(page, qa, ['Generated']);

  await qa.step(1, async () => {
    const row = await w.row(type);
    const mark = await toastMark(page);
    await w.press(row, 'Sent');
    expect(await toastsAfter(page, mark)).toContain('Advanced to Sent');
    const c = await cellsOf(page, type);
    expect(c[2]).toBe('Sent');
    await expect((await w.row(type)).getByRole('button', { name: 'Accepted', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    const row = await w.row(type);
    const mark = await toastMark(page);
    await w.press(row, 'Accepted');
    expect(await toastsAfter(page, mark)).toContain('Advanced to Accepted');
    const r = await w.row(type);
    expect((await w.cells(r))[2]).toBe('Accepted');
    for (const s of ['Generated', 'Sent', 'Accepted']) await expect(r.getByRole('button', { name: s, exact: true })).toHaveCount(0);
    for (const b of ['Capture result', 'Print barcode']) await expect(r.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
};

export const TC_APP011_004: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  let sample = '';

  await qa.step(1, async () => {
    const row = await w.row(type);
    sample = (await w.cells(row))[0];
    await w.press(row, 'Capture result', w.capture);
    // One text of three parts; the site writes the status in Indonesian.
      await expect(w.capture.getByText(new RegExp(`^${escapeText(type)} · ${sourceOnSite('Accepted')} · ${escapeText(sample)}$`))).toBeVisible();
    for (const f of ['Lab result', 'Result range', 'Remarks'] as const) await expect(w.field(f)).toBeVisible();
    await expect(w.capture.getByText('Note on this order.', { exact: true })).toBeVisible();
    await expect(w.capture.getByText('The lab result and result range are written only once the sample is accepted.', { exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await w.field('Lab result').fill(LAB.result);
    await w.field('Result range').fill(LAB.range);
    await w.field('Remarks').fill(LAB.note);
    const mark = await toastMark(page);
    await w.capture.getByRole('button', { name: 'Save result' }).click();
    expect(await toastsAfter(page, mark)).toContain('Result captured');
    await expect(w.capture).toBeVisible();
    await expect(w.field('Lab result')).toHaveValue(LAB.result);
    await expect(w.capture.getByText(/Resulted/)).toBeVisible();
  });

  await qa.step(3, async () => {
    await w.capture.getByRole('button', { name: 'Cancel' }).click();
    const c = await cellsOf(page, type);
    expect([c[2], c[3], c[4], c[6]]).toEqual(['Resulted', LAB.result, LAB.range, LAB.note]);
  });
};

export const TC_APP011_005: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await resulted(page, qa);

  await qa.step(1, async () => {
    await w.press(await w.row(type), 'Capture result', w.capture);
    await expect(w.field('Lab result')).toHaveValue(LAB.result);
    await expect(w.field('Result range')).toHaveValue(LAB.range);
    await expect(w.field('Remarks')).toHaveValue(LAB.note);
  });

  await qa.step(2, async () => {
    await w.field('Lab result').fill('12.5 g/dL');
    await w.field('Remarks').fill('');
    const mark = await toastMark(page);
    await w.capture.getByRole('button', { name: 'Save result' }).click();
    expect(await toastsAfter(page, mark)).toContain('Result captured');
  });

  await qa.step(3, async () => {
    const c = await cellsOf(page, type);
    expect([c[2], c[3], c[6]]).toEqual(['Resulted', '12.5 g/dL', '—']);
  });
};

export const TC_APP011_006: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const generated = await order(page, qa, ['Generated']);
  const accepted = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  const sample = (await cellsOf(page, generated))[0];

  await qa.step(1, async () => {
    await w.open();
    await expect(w.table.getByRole('columnheader')).toHaveText(COLUMNS);
    await expect(w.rows()).toHaveCount(10);
    await expect(w.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    const first = (await w.cells(w.rows().first()))[1];
    if (first !== accepted) qa.deviation(1, 'Newest order first', `the first row is "${first}"`);
  });

  await qa.step(2, async () => {
    await w.search.fill('hemo');
    await w.main.getByRole('button', { name: 'Search', exact: true }).click();
    await expect.poll(async () => (await w.rows().allInnerTexts()).every((t) => /hemo/i.test(t)), { timeout: 10_000 }).toBe(true);
  });

  await qa.step(3, async () => {
    await w.status.selectOption('Accepted');
    await expect.poll(async () => (await w.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[2]?.textContent?.trim()))).every((s) => s === 'Accepted'), { timeout: 10_000 }).toBe(true);
    for (const t of await w.rows().allInnerTexts()) expect(t.toLowerCase()).toContain('hemo');
  });

  await qa.step(4, async () => {
    await w.search.fill('');
    await w.status.selectOption({ label: 'All statuses' });
    await w.scan.fill(sample);
    await w.scan.press('Enter');
    await expect(w.search).toHaveValue(sample);
    await expect(w.rows().filter({ hasText: sample })).toHaveCount(1);
  });

  await qa.step(5, async () => {
    await w.search.fill('');
    await w.main.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(w.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    await w.main.getByRole('button', { name: 'Next page' }).press('Enter');
    await expect(w.pager()).toHaveText(/^Showing 11–\d+ of \d+$/);
  });
};

export const TC_APP011_013: QaBody = async ({ page, qa }) => {
  const d = page.getByRole('dialog', { name: 'Create lab order' });
  const w = new WorklistPage(page);

  await qa.step(1, async () => {
    await w.open();
    await w.main.getByRole('button', { name: 'New lab order' }).click();
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Create' }).click();
    expect(await d.getByRole('textbox', { name: 'Result type' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
  });

  await qa.step(2, async () => {
    const toasts = await create(page, '   ');
    expect(toasts).not.toContain('Lab order created');
    if (!toasts.length) qa.deviation(2, 'A message that the result type is missing', 'nothing happens, no message');
  });

  await qa.step(3, async () => {
    const toasts = await create(page, labType(qa, 'Hemoglobn'));
    if (toasts.includes('Lab order created')) qa.deviation(3, "The test is picked from the laboratory's list, so a misspelt name cannot be saved", 'the result type is free text; "Hemoglobn" is saved');
  });

  await qa.step(4, async () => {
    const type = labType(qa);
    const first = await create(page, type);
    const second = await create(page, type);
    expect(first).toContain('Lab order created');
    if (second.includes('Lab order created')) qa.deviation(4, 'A warning about the repeated order, or both are kept on purpose', 'both are saved without a warning');
  });
};

export const TC_APP011_014: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const ordered = await order(page, qa);
  const sent = await order(page, qa, ['Generated', 'Sent']);

  await qa.step(1, async () => {
    const row = await w.row(ordered);
    const steps = await row.locator('button[data-step]').allInnerTexts();
    expect(steps).toEqual(['Generated']);
  });

  await qa.step(2, async () => {
    await w.press(await w.row(ordered), 'Capture result', w.capture);
    await expect(w.capture.getByText('Generated is still open. Saving a result does not write the earlier step.', { exact: true })).toBeVisible();
  });

  await qa.step(3, async () => {
    await w.field('Lab result').fill(LAB.result);
    const mark = await toastMark(page);
    await w.capture.getByRole('button', { name: 'Save result' }).click();
    expect(await toastsAfter(page, mark, 3_000)).not.toContain('Result captured');
    await expect(w.capture.getByText(/is still open|masih terbuka/)).toBeVisible();
    await w.capture.getByRole('button', { name: 'Cancel' }).click();
    expect((await cellsOf(page, ordered))[3]).toBe('—');
  });

  await qa.step(4, async () => {
    await w.press(await w.row(sent), 'Capture result', w.capture);
    await expect(w.capture.getByText('Accepted is still open. Saving a result does not write the earlier step.', { exact: true })).toBeVisible();
    await w.capture.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(5, async () => {
    await advance(page, sent, ['Accepted']);
    expect(await capture(page, sent, { result: LAB.result, range: LAB.range })).toContain('Result captured');
  });
};

export const TC_APP011_015: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await order(page, qa, ['Generated']);

  await qa.step(1, async () => {
    let asked = false;
    page.once('dialog', async (d) => {
      asked = true;
      await d.dismiss();
    });
    const mark = await toastMark(page);
    await w.press(await w.row(type), 'Sent');
    const toasts = await toastsAfter(page, mark);
    if (!asked) qa.deviation(1, 'A question to confirm before the step is saved', `saved at once (toast "${toasts.join(' / ')}")`);
  });

  await qa.step(2, async () => {
    const buttons = await (await w.row(type)).getByRole('button').allInnerTexts();
    if (!buttons.some((b) => /undo|back|revert/i.test(b))) qa.deviation(2, 'An undo, or a step back with a reason', `no way back on the row (buttons: ${buttons.join(', ')}); the Sample workflow has "Revert latest stamp" (TC-APP011-041)`);
  });
};

export const TC_APP011_016: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const sent = await order(page, qa, ['Generated', 'Sent']);
  const dup = await order(page, qa);

  await qa.step(1, async () => {
    const buttons = await (await w.row(sent)).getByRole('button').allInnerTexts();
    qa.note(1, `buttons of the sent order: ${buttons.join(', ')}; "Result status" opens Reason, Reject and Certify`);
    if (!buttons.some((b) => /reject/i.test(b))) qa.deviation(1, '"Reject sample" with a reason, which asks for a new sample', 'no "Reject sample" on the row; a reject is inside "Result status"');
  });

  await qa.step(2, async () => {
    const buttons = await (await w.row(dup)).getByRole('button').allInnerTexts();
    if (!buttons.some((b) => /cancel/i.test(b))) qa.deviation(2, 'A cancellation with a reason', 'no cancel on the row');
  });

  await qa.step(3, async () => {
    const statuses = await w.status.locator('option').allInnerTexts();
    if (!statuses.some((s) => /reject|cancel/i.test(s))) qa.deviation(3, 'Rejected and cancelled orders have their own status', `the status list holds ${statuses.join(', ')}`);
  });
};

export const TC_APP011_017: QaBody = async ({ page, qa }) => {
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);

  await qa.step(1, async () => {
    expect(await capture(page, type, { result: '2.1 g/dL', range: LAB.range })).toContain('Result captured');
    const c = await cellsOf(page, type);
    qa.note(1, `after the save: Status "${c[2]}", Result status "${c[5]}"`);
    if (c[2] === 'Resulted') qa.deviation(1, 'The result waits for validation by a second, authorised user', `final at once: Status "Resulted", Result status "${c[5]}"`);
  });

  await qa.step(2, async () => {
    const row = await new WorklistPage(page).row(type);
    const text = await row.innerText();
    if (!/low|critical|panic|↓|L\b/i.test(text)) qa.deviation(2, 'The value is marked as below the range, and as critical', 'nothing is marked');
  });

  await qa.step(3, async () => {
    const w = new WorklistPage(page);
    await w.press(await w.row(type), 'Capture result', w.capture);
    const fields = await w.capture.getByRole('textbox').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
    if (!fields.some((f) => /unit|method/i.test(f))) qa.deviation(3, 'Separate fields for the unit and the method', `fields: ${fields.join(', ')}`);
  });
};

export const TC_APP011_019: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const acc = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  const res = await resulted(page, qa);

  await qa.step(1, async () => {
    await w.press(await w.row(acc), 'Capture result', w.capture);
    const mark = await toastMark(page);
    await w.capture.getByRole('button', { name: 'Save result' }).click();
    expect(await w.field('Lab result').evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
  });

  await qa.step(2, async () => {
    const toasts = await capture(page, acc, { result: '   ' });
    expect(toasts).not.toContain('Result captured');
    if (!toasts.length) qa.deviation(2, 'A message that the result is missing', 'nothing happens, no message');
  });

  await qa.step(3, async () => {
    const w2 = new WorklistPage(page);
    await w2.press(await w2.row(acc), 'Capture result', w2.capture);
    await w2.field('Lab result').fill('x'.repeat(300));
    const len = (await w2.field('Lab result').inputValue()).length;
    if (len !== 255) qa.deviation(3, 'The field stops at 255 characters', `the field holds ${len}`);
    const mark = await toastMark(page);
    await w2.capture.getByRole('button', { name: 'Save result' }).click();
    const toasts = await toastsAfter(page, mark);
    qa.note(3, `save: "${toasts.join(' / ')}"`);
    if (len === 255) expect(toasts).toContain('Result captured');
  });

  await qa.step(4, async () => {
    expect(await capture(page, res, { range: '' })).toContain('Result captured');
    const range = (await cellsOf(page, res))[4];
    if (range !== '—') qa.deviation(4, 'The range is removed', `the old range comes back: "${range}"`);
  });
};

export const TC_APP011_020: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  qa.note(1, `an accepted order of this test ("${type}") stands in for "Hematologi Lengkap" made from a consultation`);

  await qa.step(1, async () => {
    await w.press(await w.row(type), 'Capture result', w.capture);
    const results = await w.capture.getByRole('textbox', { name: 'Lab result' }).count();
    if (results === 1) qa.deviation(1, 'One line per parameter, each with value, unit and range', 'one "Lab result" and one "Result range" of 255 characters each');
  });

  await qa.step(2, async () => {
    const panel = 'Hb 13.5 g/dL; Leukosit 7.2 10^3/uL; Trombosit 250 10^3/uL; Hematokrit 40 %';
    await w.field('Lab result').fill(panel);
    const mark = await toastMark(page);
    await w.capture.getByRole('button', { name: 'Save result' }).click();
    expect(await toastsAfter(page, mark)).toContain('Result captured');
    qa.deviation(2, 'Every value is stored and can be read on its own', `the panel is stored as one line of text: "${(await cellsOf(page, type))[3]}"`);
  });
};

export const TC_APP011_022: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await resulted(page, qa);

  await qa.step(1, async () => {
    const row = await w.row(type);
    const text = await row.innerText();
    await w.press(row, 'Capture result', w.capture);
    const dialog = await w.capture.innerText();
    if (!/\d{2}:\d{2}/.test(text + dialog)) qa.deviation(1, 'The time of each step, and the time the result was saved', 'no time is shown on the row or in the dialog');
  });

  await qa.step(2, async () => {
    const sample = (await cellsOf(page, type))[0];
    const day = sample.match(/^LAB-(\d{4})(\d{2})(\d{2})-/);
    expect(day).not.toBeNull();
    const date = `${day![1]}-${day![2]}-${day![3]}`;
    qa.note(2, `sample ID ${sample}; today (WIB) ${todayWib()}`);
    if (date !== todayWib()) qa.deviation(2, "Today's date in its middle part", `${date} (the date is taken in world time)`);
  });

  await qa.step(3, async () => {
    const sorts = await w.table.getByRole('columnheader').allInnerTexts();
    if (!sorts.some((s) => /wait|time|age/i.test(s))) qa.deviation(3, 'A marker or a sort by waiting time', 'none');
  });
};

export const TC_APP011_029: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = `<script>alert(1)</script> ${qa.token()}`;
  const remark = '<img src=x onerror=alert(1)>';
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });

  await qa.step(1, async () => {
    expect(await create(page, type, remark)).toContain('Lab order created');
    await advance(page, type, ['Generated', 'Sent', 'Accepted']);
    expect(await capture(page, type, { result: '<b>1</b>' })).toContain('Result captured');
  });

  await qa.step(2, async () => {
    const c = await cellsOf(page, type);
    expect([c[1], c[3], c[6]]).toEqual([type, '<b>1</b>', remark]);
    await expect(w.table.locator('img, b')).toHaveCount(0);
    expect(alerted).toBe(false);
  });

  await qa.step(3, async () => {
    for (const s of ['%', '_']) {
      await w.open();
      await w.search.fill(s);
      await w.main.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(w.heading).toBeVisible();
      await expect(page.getByText("This page couldn't load")).toHaveCount(0);
      qa.note(3, `"${s}" lists ${await w.rows().count()} row(s) on the first page`);
    }
  });
};

export const TC_APP011_044: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await resulted(page, qa);

  await qa.step(1, async () => {
    await w.open();
    await expect(w.table.getByRole('columnheader', { name: 'Result status' })).toBeVisible();
    qa.note(1, `Result status of the order: "${(await cellsOf(page, type))[5]}"`);
  });

  await qa.step(2, async () => {
    await w.press(await w.row(type), 'Result status', page.getByRole('dialog', { name: 'Result status' }));
    const d = page.getByRole('dialog', { name: 'Result status' });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Certify' }).click();
    expect(await toastsAfter(page, mark)).toContain('Order certified');
    qa.note(2, '"Certify" sits in the "Result status" dialog of the row');
  });

  await qa.step(3, async () => {
    await w.press(await w.row(type), 'Handover', page.getByRole('dialog').filter({ hasText: 'Handed to' }));
    const d = page.getByRole('dialog').filter({ hasText: 'Handed to' });
    await expect(d).toBeVisible();
    for (const f of ['Handed to', 'How', 'Dispatch number']) await expect(d.getByLabel(f, { exact: true })).toBeVisible();
    await expect(d.getByLabel('When', { exact: true })).toBeVisible();
    qa.note(3, `the dialog: ${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
  });

  await qa.step(4, async () => {
    const d = page.getByRole('dialog').filter({ hasText: 'Handed to' });
    await d.getByLabel('Handed to', { exact: true }).fill(qa.prefix('X Keluarga pasien'));
    await d.getByLabel('How', { exact: true }).fill(qa.prefix('X diambil'));
    await d.getByLabel('Dispatch number', { exact: true }).fill(qa.code('X-D-001'));
    const sig = d.getByRole('combobox', { name: 'Signature' });
    if (await sig.count()) await sig.selectOption({ label: 'Signed' });
    const mark = await toastMark(page);
    await d.getByRole('button', { name: /^Save/ }).click();
    expect(await toastsAfter(page, mark)).toContain('Handover saved.');
  });
};

export const TC_APP011_045: QaBody = async ({ page, qa }) => {
  const w = new WorklistPage(page);
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  await qa.step(1, async () => {
    await w.press(await w.row(type), 'Result status', page.getByRole('dialog', { name: 'Result status' }));
    const d = page.getByRole('dialog', { name: 'Result status' });
    let mark = await toastMark(page);
    await d.getByRole('button', { name: 'Reject' }).click();
    expect(await toastsAfter(page, mark)).toContain('A rejection needs a reason');
    await d.getByRole('textbox', { name: 'Reason' }).fill(qa.prefix('X sampel lisis'));
    mark = await toastMark(page);
    await d.getByRole('button', { name: 'Reject' }).click();
    expect(await toastsAfter(page, mark)).toContain('Order rejected');
  });
};
