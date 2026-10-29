import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { RIS } from '../../../lib/ris-data';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { RadOrdersPage, StudiesPage, toastsAfter, type RadOrder } from './helpers';

/**
 * 12-ris.xlsx: Orders (/radiology/orders), Schedule and report
 * (/radiology/studies), hub and screen checks. Every order carries a token in
 * its study text, reference and accession number.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

/** The Full order of the catalogue with a token, study today at the catalogue times. */
function fullOrder(qa: Qa): RadOrder & { study: string; ref: string; acc: string } {
  const t = qa.token();
  const acc = `${RIS.full.accession}-${t}`;
  const ref = `${RIS.full.ref}-${t}`;
  const study = `${RIS.full.study} ${t}`;
  return {
    study,
    ref,
    acc,
    'Order ref': ref,
    'Accession no': acc,
    'Study description': study,
    'Study date': `${todayWib()}T${RIS.full.studyTime}`,
    'Reported by': RIS.full.reportedBy,
    'Reported date': `${todayWib()}T${RIS.full.reportedTime}`,
    'Image link': RIS.full.image.replace(RIS.full.accession, acc),
    'Report link': RIS.full.report.replace(RIS.full.accession, acc),
  };
}

const short = (qa: Qa) => `${RIS.short.study} ${qa.token()}`;

/**
 * An order for Schedule and report. That screen lists only the first 20 orders
 * of the list (dated ones first, latest first), so the order gets a study date
 * of tomorrow 23:00 to be among them (seen 2026-10-15).
 */
async function studyOrder(o: RadOrdersPage, qa: Qa): Promise<string> {
  const study = short(qa);
  expect(await o.create({ 'Study description': study, 'Study date': `${addDays(todayWib(), 1)}T23:00` })).toContain('Order created');
  qa.note(1, `the order "${study}" has the study date tomorrow 23:00 so that "Schedule and report" lists it (the list holds 20 orders)`);
  return study;
}

qaTest('TC-APP012-001', async ({ page, qa, context }) => {
  const o = new RadOrdersPage(page);
  const f = fullOrder(qa);

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^RIS\b|^Radiology/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Open orders' }).click();
    await expect(o.heading).toBeVisible();
    await expect(o.main.getByText('Radiology orders with external viewer links.', { exact: true })).toBeVisible();
    await expect(o.table).toBeVisible();
    await expect(o.main.getByRole('button', { name: 'New order' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await o.openNew();
    await expect(o.dialog.getByText('Study description is required. The other fields are optional.', { exact: true })).toBeVisible();
    await expect(o.dialog.getByRole('textbox')).toHaveCount(8);
    await expect(o.dialog.getByRole('textbox', { name: 'Branch' }).or(o.dialog.getByRole('combobox', { name: 'Branch' }))).toHaveCount(0);
  });

  await qa.step(3, async () => {
    const { study: _s, ref: _r, acc: _a, ...fields } = f;
    await o.fill(fields);
    const mark = await toastMark(page);
    await o.dialog.getByRole('button', { name: 'Save' }).click();
    expect(await toastsAfter(page, mark)).toContain('Order created');
  });

  await qa.step(4, async () => {
    const c = await o.cells(await o.row(f.study));
    expect([c[0], c[1], c[3], c[4]]).toEqual([f.ref, f.study, f.acc, RIS.full.reportedBy]);
    qa.note(4, `Study date shows "${c[2]}" (typed ${todayWib()} ${RIS.full.studyTime} WIB)`);
    expect(c[5]).toBe('Image Report');
  });

  await qa.step(5, async () => {
    const row = await o.row(f.study);
    for (const [name, url] of [['Image', f['Image link']], ['Report', f['Report link']]] as const) {
      const link = row.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', url!);
      await expect(link).toHaveAttribute('target', '_blank');
    }
    void context;
    qa.note(5, 'the links open in a new tab (target="_blank"); the outside viewer itself is not opened');
    await expect(o.heading).toBeVisible();
  });
});

qaTest('TC-APP012-002', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const study = short(qa);
  await qa.step(1, async () => {
    expect(await o.create({ 'Study description': study })).toContain('Order created');
  });
  await qa.step(2, async () => {
    const c = await o.cells(await o.row(study));
    expect(c[0]).toMatch(/^RAD-\d+$/);
    expect(c.slice(1)).toEqual([study, '—', '—', '—', '—']);
  });
});

qaTest('TC-APP012-003', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  await o.open();
  const total = Number(((await o.pager().innerText().catch(() => 'of 0')).match(/of (\d+)$/) ?? ['', '0'])[1]);
  for (let i = total; i <= 10; i++) expect(await o.create({ 'Study description': short(qa), 'Study date': `${addDays(todayWib(), -i)}T09:00` })).toContain('Order created');

  await qa.step(1, async () => {
    await o.open();
    await expect(o.rows()).toHaveCount(10);
    await expect(o.table.getByRole('columnheader')).toHaveText(['Order ref', 'Study', 'Study date', 'Accession', 'Reported by', 'Links']);
  });

  await qa.step(2, async () => {
    const dates = await o.rows().evaluateAll((rs) => rs.map((r) => (r.querySelectorAll('td')[2]?.textContent ?? '').trim()));
    qa.note(2, `Study date of the first page: ${dates.join(', ')}`);
    const firstUndated = dates.indexOf('—');
    const datedAfter = firstUndated >= 0 && dates.slice(firstUndated).some((d) => d !== '—');
    if (datedAfter) qa.deviation(2, 'Latest study date first; orders without a study date come last', 'orders without a study date come before dated ones');
  });

  await qa.step(3, async () => {
    const first = await o.rows().first().innerText();
    await o.main.getByRole('button', { name: /^\d+$/ }).last().press('Enter');
    await expect(o.rows().first()).not.toHaveText(first);
    await expect(o.rows().first()).toBeVisible();
  });
});

qaTest('TC-APP012-006', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const o = new RadOrdersPage(page);

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^RIS\b|^Radiology/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Radiology \(RIS\)$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Radiology (RIS)' })).toBeVisible();
    await expect(main.getByText('External order registry', { exact: true })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Open orders' })).toBeVisible();
    qa.deviation(1, 'A button "Open orders"', '"Open orders" is a link');
    await expect(main.getByRole('heading', { level: 2, name: 'Workflow' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Orders', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await main.getByRole('link', { name: 'Orders', exact: true }).click();
    await expect(o.heading).toBeVisible();
    await page.goto('/id/radiology');
    await page.getByRole('complementary').getByRole('link', { name: 'Orders', exact: true }).first().click();
    await expect(o.heading).toBeVisible();
  });

  await qa.step(3, () => asOnSite(async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/radiology/orders');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    const button = (await main.getByRole('button').first().innerText()).trim();
    qa.note(3, `heading "${h1}", button "${button}"`);
    if (h1 === 'Orders' || button === 'New order') qa.deviation(3, 'Headings, field names, buttons and toasts are Indonesian ("Order baru", …)', `English: heading "${h1}", button "${button}"`);
  }));
});

qaTest('TC-APP012-007', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const study = `${RIS.full.study} ${qa.token()}`;
  await qa.step(1, async () => {
    await o.open();
    await o.openNew();
    if (!(await o.dialog.getByRole('textbox', { name: /patient/i }).or(o.dialog.getByRole('combobox', { name: /patient/i })).count())) qa.deviation(1, 'A patient must be picked from the register', 'the form has no patient field');
  });
  await qa.step(2, async () => {
    for (let i = 0; i < 2; i++) expect(await o.create({ 'Study description': study })).toContain('Order created');
    const texts = await (await o.row(study)).allInnerTexts();
    qa.deviation(2, "Each row shows the patient's name and MRN", `the rows show reference and study only: ${texts.map((t) => t.replace(/\s+/g, ' ')).join(' // ')}`);
  });
  qa.notRun(3, 'the orders of this test carry no report link; whose report opens can be told only in the outside viewer');
});

qaTest('TC-APP012-009', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const study = short(qa);
  expect(await o.create({ 'Study description': study })).toContain('Order created');
  await qa.step(1, async () => {
    const row = await o.row(study);
    await row.getByRole('cell').first().click();
    if (!(await page.getByRole('dialog').count())) qa.deviation(1, 'The order opens for editing', 'a row cannot be opened');
  });
  for (const [step, what] of [[2, 'The same row now shows the reporter, date and links'], [3, 'Saved, with the change on record'], [4, 'The order is marked as cancelled']] as const) {
    qa.notRun(step, `no edit or cancel on Orders (step 1); ${what} cannot be tried`);
  }
});

qaTest('TC-APP012-010', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  await o.open();
  const cols = (await o.table.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
  await qa.step(1, async () => {
    if (!cols.some((c) => /status/i.test(c))) qa.deviation(1, 'A status per order', `columns: ${cols.join(', ')}`);
  });
  await qa.step(2, async () => {
    if (!(await o.main.getByRole('combobox').count())) qa.deviation(2, 'A filter by status', 'no filter');
  });
  await qa.step(3, async () => {
    await page.goto('/id/radiology');
    const side = (await page.getByRole('complementary').getByRole('link').allInnerTexts()).map((t) => t.trim()).join(', ');
    qa.note(3, `RIS menu: ${side}`);
    if (!/calendar|schedule|jadwal/i.test(side)) qa.deviation(3, 'A calendar by machine or room', 'no schedule screen');
  });
});

qaTest('TC-APP012-011', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);

  await qa.step(1, async () => {
    await o.open();
    await o.openNew();
    const mark = await toastMark(page);
    await o.dialog.getByRole('button', { name: 'Save' }).click();
    expect(await o.dialog.getByRole('textbox', { name: 'Study description' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
  });

  await qa.step(2, async () => {
    const toasts = await o.create({ 'Study description': '   ' });
    expect(toasts).not.toContain('Order created');
    if (!toasts.some((t) => /study/i.test(t) && !/React/.test(t))) qa.deviation(2, 'A clear message that the study is missing', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(3, async () => {
    await o.open();
    await o.openNew();
    await o.fill({ 'Study description': short(qa), 'Image link': 'pacs lokal' });
    await o.dialog.getByRole('button', { name: 'Save' }).click();
    expect(await o.dialog.getByRole('textbox', { name: 'Image link' }).evaluate((e) => (e as HTMLInputElement).validity.typeMismatch)).toBe(true);
  });

  await qa.step(4, async () => {
    const long = `${short(qa)} ${'x'.repeat(300)}`.slice(0, 300);
    const toasts = await o.create({ 'Study description': long });
    expect(toasts).not.toContain('Order created');
    if (!toasts.some((t) => /255|long|limit/i.test(t))) qa.deviation(4, 'Refused with a message that names the limit of 255, or the field stops at 255', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(5, async () => {
    const toasts = await o.create({ 'Study description': short(qa), 'Image link': `https://pacs.example.test/${'x'.repeat(600)}`.slice(0, 600) });
    expect(toasts).not.toContain('Order created');
    if (!toasts.some((t) => /500|long|limit/i.test(t))) qa.deviation(5, 'Refused with a message that names the limit of 500', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP012-012', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const cases: [number, RadOrder, string][] = [
    [1, { 'Study date': `${addDays(todayWib(), 1)}T10:00` }, 'Refused, or a warning'],
    [2, { 'Study date': `${todayWib()}T10:00`, 'Reported date': `${addDays(todayWib(), -1)}T10:00`, 'Reported by': RIS.full.reportedBy }, 'Refused'],
    [3, { 'Reported date': `${todayWib()}T11:00` }, 'Refused: a report needs a reporter'],
  ];
  for (const [step, extra, expected] of cases) {
    await qa.step(step, async () => {
      const toasts = await o.create({ 'Study description': short(qa), ...extra });
      if (toasts.includes('Order created')) qa.deviation(step, expected, 'saved with toast "Order created"');
    });
  }
});

qaTest('TC-APP012-013', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const study = short(qa);
  await qa.step(1, async () => {
    expect(await o.create({ 'Study description': study, 'Study date': `${todayWib()}T10:00` })).toContain('Order created');
  });
  await qa.step(2, async () => {
    const shown = (await o.cells(await o.row(study)))[2];
    qa.note(2, `Study date shows "${shown}"`);
    if (!shown.includes('10:00') || !shown.includes(todayWib())) qa.deviation(2, `Today 10:00 (${todayWib()})`, `"${shown}"`);
  });
});

qaTest('TC-APP012-015', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  await o.open();
  await qa.step(1, async () => {
    if (!(await o.main.getByRole('searchbox').or(o.main.getByRole('textbox')).count())) qa.deviation(1, 'A search by reference, accession number, study and date', 'no search');
  });
  await qa.step(2, async () => {
    if (!(await o.main.getByRole('combobox').count())) qa.deviation(2, 'A filter by date and study', 'no filter; only paging, 10 rows at a time');
  });
});

qaTest('TC-APP012-016', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });

  await qa.step(1, async () => {
    const toasts = await o.create({ 'Study description': short(qa), 'Image link': 'http://example.org/x' });
    if (toasts.includes('Order created')) qa.deviation(1, "Refused: only addresses of the hospital's viewer are accepted", 'saved');
  });

  await qa.step(2, async () => {
    const study = short(qa);
    const toasts = await o.create({ 'Study description': study, 'Report link': 'javascript:alert(1)' });
    if (!toasts.includes('Order created')) {
      qa.note(2, `the link is refused: "${toasts.join(' / ')}"`);
      return;
    }
    const link = (await o.row(study)).getByRole('link', { name: 'Report' });
    const href = await link.getAttribute('href');
    qa.note(2, `saved; the Report link has href="${href}"`);
    if (href?.startsWith('javascript:')) {
      await link.click({ modifiers: [] }).catch(() => {});
      expect(alerted).toBe(false);
    }
  });

  await qa.step(3, async () => {
    const study = short(qa);
    expect(await o.create({ 'Study description': study, 'Image link': 'https://pacs.example.test/x' })).toContain('Order created');
    const rel = await (await o.row(study)).getByRole('link', { name: 'Image' }).getAttribute('rel');
    qa.note(3, `the Image link has rel="${rel}"`);
    if (!/noopener|noreferrer/.test(rel ?? '')) qa.deviation(3, 'The address opens in a new tab that cannot reach back into KlikMed', `rel="${rel}"`);
  });
});

qaTest('TC-APP012-023', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const t = qa.token();
  const study = `<script>alert(1)</script> ${t}`;
  const by = '<img src=x onerror=alert(1)>';
  const ref = `<b>1</b> ${t}`;
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });
  await qa.step(1, async () => {
    expect(await o.create({ 'Study description': study, 'Reported by': by, 'Order ref': ref })).toContain('Order created');
  });
  await qa.step(2, async () => {
    const c = await o.cells(await o.row(study));
    expect([c[0], c[1], c[4]]).toEqual([ref, study, by]);
    await expect(o.table.locator('img, b')).toHaveCount(0);
    expect(alerted).toBe(false);
  });
});

qaTest('TC-APP012-025', async ({ page, qa }) => {
  const s = new StudiesPage(page);
  const o = new RadOrdersPage(page);
  const study = await studyOrder(o, qa);
  // "Start" holds an ISO time in UTC (prefilled "…T02:00:00Z"): tomorrow 09:00 WIB is 02:00Z.
  const start = `${addDays(todayWib(), 1)}T02:00:00Z`;

  await qa.step(1, async () => {
    await page.goto('/id/radiology');
    // The workbook names the menu item "Jadwal studi"; the English menu reads "Study schedule".
    await page.getByRole('complementary').getByRole('link', { name: 'Study schedule' }).first().click();
    await expect(s.main.getByRole('heading', { level: 1, name: 'Schedule and report' })).toBeVisible();
    await expect(s.main.getByText('Image and report links stay the URLs already stored.', { exact: true })).toBeVisible();
    for (const i of ['Room', 'Start', 'Report text', 'Cancel reason', 'File name'] as const) await expect(s.input(i)).toBeVisible();
    for (const b of ['Schedule', 'Accept', 'Save report', 'Cancel', 'Attach']) await expect(s.main.getByRole('button', { name: b, exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    expect(await s.act(study, 'Schedule', { Room: qa.code('X-RO1'), Start: start })).toContain('Saved');
  });
  await qa.step(3, async () => {
    expect(await s.act(study, 'Accept')).toContain('Saved');
  });
  await qa.step(4, async () => {
    expect(await s.act(study, 'Save report', { 'Report text': qa.prefix('X Tidak tampak kelainan') })).toContain('Saved');
  });
  await qa.step(5, async () => {
    expect(await s.act(study, 'Attach', { 'File name': `${qa.code('X-thorax')}.pdf` })).toContain('Saved');
  });
  await qa.step(6, async () => {
    const line = await s.line(study);
    const c = await o.cells(await o.row(study));
    qa.note(6, `Schedule and report: "${line}"; Orders: ${c.join(' | ')}`);
  });
});

qaTest('TC-APP012-026', async ({ page, qa }) => {
  const s = new StudiesPage(page);
  const o = new RadOrdersPage(page);
  const study = await studyOrder(o, qa);
  const cases = [
    [1, 'Schedule', { Room: '', Start: `${addDays(todayWib(), 1)}T02:00:00Z` }, 'room and start required'],
    [2, 'Save report', { 'Report text': '' }, 'report text required'],
    [3, 'Attach', { 'File name': '' }, 'file name required'],
  ] as const;
  for (const [step, button, inputs, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await s.act(study, button, inputs);
      expect(toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "${server}")`);
    });
  }
});

qaTest('TC-APP012-027', async ({ page, qa }) => {
  const s = new StudiesPage(page);
  const o = new RadOrdersPage(page);
  const study = await studyOrder(o, qa);
  await qa.step(1, async () => {
    expect(await s.act(study, 'Cancel', { 'Cancel reason': qa.prefix('X pasien menolak') })).toContain('Saved');
  });
  await qa.step(2, async () => {
    const line = await s.line(study);
    qa.note(2, `Schedule and report: "${line}"`);
    expect(line).toMatch(/cancel/i);
  });
});

qaTest('TC-APP012-028', async ({ page, qa }) => {
  const s = new StudiesPage(page);
  const o = new RadOrdersPage(page);
  const study = await studyOrder(o, qa);
  await qa.step(1, async () => {
    const toasts = await s.act(study, 'Cancel', { 'Cancel reason': '' });
    expect(toasts).not.toContain('Saved');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "cancel needs a reason")`);
  });
});

qaTest('TC-APP012-029', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  const s = new StudiesPage(page);
  // An order of the consultation journey of 03 Patient Care: "QA Foto toraks PA <token>" rows are on the list (seen 2026-10-15).
  await o.open();
  const fromConsult = (await o.rows().evaluateAll((rs) => rs.map((r) => (r.querySelectorAll('td')[1]?.textContent ?? '').trim()))).find((t) => /^QA Foto toraks PA /.test(t));
  if (!fromConsult) {
    for (const st of [1, 2, 3]) qa.notRun(st, 'no radiology order from a consultation (03 Patient Care) is on the first page');
    return;
  }
  qa.note(1, `an order written in 03 Patient Care by the consultation journey: "${fromConsult}"`);
  await qa.step(1, async () => {
    const c = await o.cells(await o.row(fromConsult));
    qa.note(1, `row: ${c.join(' | ')}`);
    expect(c[1]).toBe(fromConsult);
  });
  await qa.step(2, async () => {
    await s.open();
    await expect(s.order.locator('option').first()).toBeAttached();
    const options = await s.order.locator('option').allInnerTexts();
    expect(options).toContain(fromConsult);
  });
  await qa.step(3, async () => {
    const c = await o.cells(await o.row(fromConsult));
    qa.note(3, `no patient on the order: ${c.join(' | ')}`);
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP012-030', '/radiology', 'Radiology (RIS)'],
  ['TC-APP012-031', '/radiology/orders', 'Orders'],
  ['TC-APP012-032', '/radiology/studies', 'Schedule and report'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
