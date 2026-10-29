import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { OT } from '../../../lib/ot-data';
import { OtRequestsPage } from '../../../pages/ot/OtPages';
import { act, cellsOf, create, procedure, request, toastsAfter } from './helpers';
import { TC_APP008_002 } from './cases';

/**
 * 08-operation-theater.xlsx, feature "OT requests (/ot/requests)": the
 * request, its blocked amount, Schedule and Consume. Every refusal seen on
 * 2026-10-15 is the toast "Minified React error #441" (a server error) instead
 * of a message; the steps check that nothing changed and record the text.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const SERVER_ERROR = /React error #441/;

qaTest('TC-APP008-001', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Operation Theater\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Open requests' }).click();
    await expect(ot.heading).toBeVisible();
    await expect(ot.main.getByText('Surgical requests with optional blocked amount.', { exact: true })).toBeVisible();
    await expect(ot.table).toBeVisible();
    await expect(ot.main.getByRole('button', { name: 'New request' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await ot.openNew();
    await expect(ot.field('Procedures display')).toBeVisible();
    await expect(ot.amount()).toBeVisible();
    await expect(ot.dialog.getByRole('textbox', { name: 'Branch' }).or(ot.dialog.getByRole('combobox', { name: 'Branch' }))).toHaveCount(0);
    const hint = (await ot.amount().getAttribute('placeholder')) ?? '';
    if (!(await ot.dialog.getByText('Optional', { exact: true }).count()) && hint !== 'Optional') {
      qa.deviation(2, 'Hint "Optional" on "Blocked amount"', `no such hint; the dialog reads "${(await ot.dialog.getByRole('paragraph').nth(1).innerText()).trim()}"`);
    }
    qa.note(2, 'the dialog also has Patient, Room, Start, End and Chief surgeon');
  });

  await qa.step(3, async () => {
    await ot.fill({ procedure: p });
    const mark = await toastMark(page);
    await ot.save().click();
    expect(await toastsAfter(page, mark)).toContain('Request created');
  });

  await qa.step(4, async () => {
    const c = await cellsOf(page, p);
    expect(c[0]).toMatch(/^OT-\d+$/);
    expect(c[1]).toBe(p);
    expect(c[3]).toBe('—');
    expect(c[4]).toBe('No');
    const row = await ot.row(p);
    for (const b of ['Schedule', 'Consume'] as const) await expect(ot.action(row, b)).toBeVisible();
    qa.note(4, `row: ${c.slice(0, 5).join(' | ')}; actions: ${c[5]}`);
  });
});

qaTest('TC-APP008-002', TC_APP008_002);

qaTest('TC-APP008-003', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);
  await request(page, { procedure: p, amount: OT.amount });
  qa.note(1, 'RQ-NEW is a request of this test');

  await qa.step(1, async () => {
    expect(await act(page, p, 'Schedule')).toContain('Scheduled');
  });

  await qa.step(2, async () => {
    expect((await cellsOf(page, p))[4]).toBe('Yes');
    const row = await ot.row(p);
    await expect(ot.action(row, 'Schedule')).toHaveCount(0);
    await expect(ot.action(row, 'Consume')).toBeVisible();
  });
});

qaTest('TC-APP008-004', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);
  await request(page, { procedure: p, amount: OT.amount });
  expect(await act(page, p, 'Schedule')).toContain('Scheduled');
  qa.note(1, 'RQ-PREP is a request of this test, scheduled first');

  await qa.step(1, async () => {
    expect(await act(page, p, 'Consume')).toContain('Consumed');
  });

  await qa.step(2, async () => {
    const c = await cellsOf(page, p);
    expect(c[3]).toBe('0');
    expect(c[4]).toBe('Yes');
    await expect(ot.action(await ot.row(p), 'Consume')).toBeVisible();
  });
});

qaTest('TC-APP008-005', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  await ot.open();
  const total = Number((await ot.pager().innerText()).match(/of (\d+)$/)![1]);
  for (let i = total; i <= 10; i++) await request(page, { procedure: procedure(qa) });
  if (total <= 10) qa.note(1, `${11 - total} request(s) made so that more than 10 exist`);

  await qa.step(1, async () => {
    await ot.open();
    await expect(ot.rows()).toHaveCount(10);
    await expect(ot.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    const cols = (await ot.table.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
    const want = ['Request no', 'Procedures', 'Blocked', 'List prepared', 'Actions'];
    if (cols.join('|') !== want.join('|')) qa.deviation(1, `Columns ${want.join(', ')}`, `columns ${cols.join(', ')}`);
  });

  await qa.step(2, async () => {
    const all = await ot.rows().evaluateAll((rows) => rows.map((r) => (r.querySelector('td')?.textContent ?? '').trim()));
    qa.note(2, `first page: ${all.join(', ')}`);
    const sorted = [...all].sort();
    if (all.join() !== sorted.join()) qa.deviation(2, 'In order of the request number, lowest first', `order on screen: ${all.join(', ')}`);
  });

  await qa.step(3, async () => {
    const firstRow = await ot.rows().first().innerText();
    await ot.main.getByRole('button', { name: /^\d+$/ }).last().press('Enter');
    await expect(ot.pager()).not.toHaveText(/^Showing 1–10 /);
    await expect(ot.rows().first()).not.toHaveText(firstRow);
    const all = await ot.rows().evaluateAll((rows) => rows.map((r) => (r.querySelector('td')?.textContent ?? '').trim()));
    const numbers = all.map((n) => n.match(/OT-(\d+)/)?.[1]).filter((n): n is string => !!n).map(Number);
    qa.note(3, `last page: ${all.join(', ')}`);
    expect(all.length).toBeGreaterThan(0);
    const newestLast = numbers.length > 0 && /OT-\d+/.test(all[all.length - 1]) && numbers[numbers.length - 1] === Math.max(...numbers);
    if (!newestLast) qa.deviation(3, 'The remaining requests, the newest at the end', `the list is sorted by the number as text, so the seed requests (${all.slice(-2).join(', ')}) come last`);
  });
});

qaTest('TC-APP008-009', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);

  await qa.step(1, async () => {
    await ot.open();
    await ot.openNew();
    const tag = await ot.field('Patient').evaluate((e) => `${e.tagName} ${e.getAttribute('role') ?? ''} ${e.getAttribute('aria-controls') ?? ''}`);
    qa.deviation(1, 'A patient is picked from the register or from the admitted patients', `"Patient" is a free text field (${tag.trim()})`);
    await ot.dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(2, async () => {
    await ot.openNew();
    const fields = (await ot.dialog.getByRole('textbox').or(ot.dialog.getByRole('spinbutton')).evaluateAll((es) => es.map((e) => e.id))).join(', ');
    const has = (n: string) => ot.dialog.getByRole('textbox', { name: new RegExp(n, 'i') }).count();
    const missing: string[] = [];
    for (const [label, re] of [['surgeon', 'surgeon'], ['anaesthetist', 'anaesth|anesth'], ['diagnosis', 'diagnos'], ['kind of anaesthesia', 'anaesthesia type|anesthesia type|kind of']] as const) {
      if (!(await has(re))) missing.push(label);
    }
    qa.note(2, `fields: ${fields}`);
    if (missing.length) qa.deviation(2, 'Fields for surgeon, anaesthetist, diagnosis and kind of anaesthesia', `missing: ${missing.join(', ')} (only "Chief surgeon" exists)`);
    await ot.dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(3, async () => {
    const patient = qa.name(OT.pt1.name.replace(/^QA-/, 'X '));
    for (let i = 0; i < 2; i++) expect(await create(page, { procedure: p, patient })).toContain('Request created');
    await ot.open();
    const rows = await ot.row(p);
    await expect(rows).toHaveCount(2);
    const texts = await rows.allInnerTexts();
    if (!texts.every((t) => t.includes(patient))) qa.deviation(3, "Each row shows the patient's name and MRN", 'the rows show the request number and the procedure only; both read the same text');
  });
});

qaTest('TC-APP008-010', async ({ page, qa }) => {
  const a = procedure(qa);
  const b = procedure(qa);
  for (const p of [a, b]) await request(page, { procedure: p });

  await qa.step(1, async () => {
    const toasts = await act(page, a, 'Schedule');
    expect(toasts).toContain('Scheduled');
    qa.deviation(1, 'A form for date, start time, expected length and theatre', '"Schedule" is one click (toast "Scheduled"); "List prepared" becomes "Yes"');
  });

  await qa.step(2, async () => {
    const toasts = await act(page, b, 'Schedule');
    if (toasts.includes('Scheduled')) qa.deviation(2, 'Refused, or a warning about the clash', 'scheduled with no question (no date, time or theatre to clash on)');
  });

  await qa.step(3, async () => {
    await page.goto('/id/ot/calendar');
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible();
    const slots = await page.getByRole('main').getByRole('button').filter({ hasText: /OT-\d+/ }).allInnerTexts();
    qa.note(3, `Calendar exists (a day picker with the slots placed through "Place on calendar"); the two scheduled requests have no slot: ${slots.some((s) => s.includes(a) || s.includes(b)) ? 'listed' : 'not listed'}`);
  });
});

qaTest('TC-APP008-012', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);
  await request(page, { procedure: p, amount: OT.amount });

  await qa.step(1, async () => {
    const consume = ot.action(await ot.row(p), 'Consume');
    if ((await consume.isVisible()) && (await consume.isEnabled())) qa.deviation(1, 'The "Consume" button is not offered, or is disabled', '"Consume" is offered on a request whose list is not prepared');
  });

  await qa.step(2, async () => {
    const toasts = await act(page, p, 'Consume');
    expect(toasts).not.toContain('Consumed');
    expect((await cellsOf(page, p))[3]).toBe('5,000,000');
    if (toasts.some((t) => SERVER_ERROR.test(t))) qa.deviation(2, 'Refused with a clear message', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP008-013', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);
  await request(page, { procedure: p, amount: '3000000' });
  expect(await act(page, p, 'Schedule')).toContain('Scheduled');

  await qa.step(1, async () => {
    let asked = false;
    page.once('dialog', async (d) => {
      asked = true;
      await d.accept();
    });
    const toasts = await act(page, p, 'Consume');
    if (!asked && !(await page.getByRole('alertdialog').count())) qa.deviation(1, 'A question to confirm before anything changes', `consumed at once (toast "${toasts.join(' / ')}")`);
  });

  await qa.step(2, async () => {
    const row = await ot.row(p);
    const undo = row.getByRole('button', { name: /undo|restore|reverse/i });
    if (!(await undo.count())) qa.deviation(2, 'An undo that restores the 3,000,000', `no undo; Blocked reads "${(await cellsOf(page, p))[3]}"`);
  });

  await qa.step(3, async () => {
    const toasts = await act(page, p, 'Consume');
    if (toasts.includes('Consumed')) qa.deviation(3, 'Refused: already consumed; the button is no longer offered', 'consumed again (toast "Consumed")');
  });

  await qa.step(4, async () => {
    const c = await cellsOf(page, p);
    if (!/consumed/i.test(c[2])) qa.deviation(4, 'A status "Consumed" on the row', `Status "${c[2]}", Blocked "${c[3]}", List prepared "${c[4]}"`);
  });
});

qaTest('TC-APP008-014', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);

  await qa.step(1, async () => {
    const p = procedure(qa);
    const toasts = await create(page, { procedure: p, amount: '-1' });
    expect(toasts).not.toContain('Request created');
    if (toasts.some((t) => SERVER_ERROR.test(t))) qa.deviation(1, 'Refused: the amount cannot be negative', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(2, async () => {
    await ot.open();
    await ot.openNew();
    await ot.amount().pressSequentially('abc');
    await expect(ot.amount()).toHaveValue('');
    await ot.dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  for (const [step, amount] of [[3, '0.001'], [4, '999999999999999']] as const) {
    await qa.step(step, async () => {
      const p = procedure(qa);
      const toasts = await create(page, { procedure: p, amount });
      if (toasts.includes('Request created')) {
        qa.deviation(step, step === 3 ? "Refused, or rounded to the currency's smallest unit" : 'Refused, or a warning about the size', `saved; Blocked reads "${(await cellsOf(page, p))[3]}"`);
      } else qa.note(step, `refused: "${toasts.join(' / ')}"`);
    });
  }
});

qaTest('TC-APP008-015', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);

  await qa.step(1, async () => {
    await ot.open();
    await ot.openNew();
    const mark = await toastMark(page);
    await ot.save().click();
    expect(await ot.field('Procedures display').evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
    await ot.dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  await qa.step(2, async () => {
    const toasts = await create(page, { procedure: '   ' });
    expect(toasts).not.toContain('Request created');
    if (!toasts.length || toasts.some((t) => SERVER_ERROR.test(t))) qa.deviation(2, 'A message that the procedure is missing', toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing happens, no message');
  });

  await qa.step(3, async () => {
    const text = `${procedure(qa)} ${'x'.repeat(1100)}`.slice(0, 1100);
    const toasts = await create(page, { procedure: text });
    expect(toasts).not.toContain('Request created');
    if (!toasts.some((t) => /1024|1,024|long|limit/i.test(t))) qa.deviation(3, 'Refused with a message that names the limit of 1,024, or the field stops there', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP008-017', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa);
  await request(page, { procedure: p });

  await qa.step(1, async () => {
    const row = await ot.row(p);
    await row.getByRole('cell').nth(1).click();
    if (!(await page.getByRole('dialog').isVisible())) qa.deviation(1, 'The request opens for editing', 'clicking the row opens nothing');
  });

  await qa.step(2, async () => {
    await ot.open();
    await expect(ot.action(await ot.row(p), 'Cancel request')).toBeVisible();
    await expect(ot.reason).toBeVisible();
    qa.note(2, '"Cancel request" with "Reason" exists (TC-APP008-030); whether it releases the blocked amount is checked there');
  });

  await qa.step(3, async () => {
    if (!(await ot.main.getByRole('textbox', { name: /remark/i }).count())) qa.deviation(3, 'A remarks field', 'no remarks field (only Reason, Operation note and Dossier id above the list)');
  });
});

qaTest('TC-APP008-023', async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const text = `<script>alert(1)</script><img src=x onerror=alert(1)> ${qa.token()}`;
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });

  await qa.step(1, async () => {
    expect(await create(page, { procedure: text })).toContain('Request created');
  });

  await qa.step(2, async () => {
    await ot.open();
    const row = await ot.row(text);
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('cell').nth(1)).toHaveText(text);
    await expect(row.locator('img')).toHaveCount(0);
    expect(alerted).toBe(false);
  });
});

