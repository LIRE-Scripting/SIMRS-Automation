import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { registerPatient } from '../../../lib/ambulatory-data';
import { todayWib } from '../../../lib/dates';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';

/**
 * 16-mrd.xlsx: Patient File Requests (/mrd/requests), Patient Records
 * (/mrd/records), Visits without a document, hub and screen checks. Numbers
 * and patients carry a token. A request needs a request type on the site;
 * where the workbook has none, the first active type is chosen (noted).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

class Screen {
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

const requests = (page: Page) => new Screen(page, 'requests', 'Patient File Requests');
const records = (page: Page) => new Screen(page, 'records', 'Patient Records');

/** Creates a file request; the type is the first active one unless given. Returns the toasts. */
async function createRequest(s: Screen, v: { no: string; purpose: string; date?: string; type?: string }): Promise<string[]> {
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
async function issue(s: Screen, v: { patient: { mrn: string; fullName: string }; no: string; remarks?: string; date?: string; from?: string; to?: string }): Promise<string[]> {
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
const hits = (s: Screen) => s.dialog.getByRole('list').getByRole('button').or(s.dialog.getByRole('listbox').getByRole('button'));

async function pick(s: Screen, search: string, choose: string): Promise<void> {
  await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(search);
  await s.dialog.getByRole('button', { name: 'Find' }).click();
  await hits(s).filter({ hasText: choose }).first().click();
}

const docNo = (qa: Qa, base: string) => `${base}-${qa.token()}`;
const mrdPatient = (page: Page, qa: Qa, name = 'QA-MRD Pasien Satu') => registerPatient(page, name, qa.token());

qaTest('TC-APP016-001', async ({ page, qa }) => {
  const s = requests(page);
  const no = docNo(qa, 'QA-REQ-001');
  const purpose = 'QA Kontrol poli penyakit dalam';
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^MRD\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'File Requests' }).first().click();
    await expect(s.main.getByRole('heading', { level: 1, name: 'Patient File Requests' })).toBeVisible();
    await expect(s.main.getByText('Requests to borrow a medical record.', { exact: true })).toBeVisible();
    await expect(s.main.getByRole('button', { name: 'New request' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await s.main.getByRole('button', { name: 'New request' }).click();
    await expect(s.dialog.getByRole('textbox', { name: 'Document date' })).toHaveValue(todayWib());
    for (const f of ['Document number', 'Purpose']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(s.dialog.getByRole('combobox', { name: 'Branch' })).toHaveCount(0);
    qa.note(2, 'the dialog also asks for a "Request type" (required); the first active type is chosen');
    await s.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(3, async () => {
    expect(await createRequest(s, { no, purpose })).toContain('File request created');
  });
  await qa.step(4, async () => {
    const c = await s.cells(await s.row(no));
    expect([c[0], c[1], c[2]]).toEqual([no, todayWib(), purpose]);
    expect(c[c.length - 1]).toBe('Yes');
  });
});

qaTest('TC-APP016-002', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const no = docNo(qa, 'QA-MR-001');
  await qa.step(1, async () => {
    await s.open();
    await expect(s.main.getByText('Issue and return a patient’s medical record.', { exact: true })).toBeVisible();
    await expect(s.main.getByRole('button', { name: 'Issue record' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    await expect(s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' })).toBeVisible();
    await expect(s.dialog.getByRole('button', { name: 'Find' })).toBeVisible();
    await expect(s.dialog.getByRole('textbox', { name: 'Document date' })).toHaveValue(todayWib());
    await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeDisabled();
  });
  await qa.step(3, async () => {
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(pt.fullName);
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    await expect(hits(s).filter({ hasText: pt.mrn })).toHaveCount(1);
  });
  await qa.step(4, async () => {
    await hits(s).filter({ hasText: pt.mrn }).click();
    await expect(s.dialog).toContainText(pt.mrn);
    await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeEnabled();
  });
  await qa.step(5, async () => {
    await s.dialog.getByRole('textbox', { name: 'Document number' }).fill(no);
    await s.dialog.getByRole('textbox', { name: 'Remarks' }).fill('QA Poli penyakit dalam');
    expect(await s.click(s.dialog.getByRole('button', { name: 'Issue' }))).toContain('Record issued');
  });
  await qa.step(6, async () => {
    const row = await s.row(no);
    const c = await s.cells(row);
    expect([c[0], c[1], c[3]]).toEqual([no, todayWib(), 'Issued']);
    expect(c[2]).toContain(pt.fullName);
    expect(c[2]).toContain(pt.mrn);
    await expect(row.getByRole('button', { name: 'Return' })).toBeVisible();
  });
});

qaTest('TC-APP016-003', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const no = docNo(qa, 'QA-MR-001');
  expect(await issue(s, { patient: pt, no, remarks: 'QA Poli penyakit dalam' })).toContain('Record issued');
  await qa.step(1, async () => {
    const row = await s.row(no);
    await row.getByRole('button', { name: 'Return' }).click();
    const d = s.dialog;
    if (await d.isVisible({ timeout: 2_000 }).catch(() => false)) {
      qa.note(1, 'a dialog "Return" with From and To opens first (TC-APP016-032)');
      expect(await s.click(d.getByRole('button', { name: 'Return' }))).toContain('Record returned');
    } else expect(await toastsAfter(page, 0)).toContain('Record returned');
  });
  await qa.step(2, async () => {
    const row = await s.row(no);
    expect((await s.cells(row))[3]).toBe('Returned');
    await expect(row.getByRole('button', { name: 'Return' })).toHaveCount(0);
  });
});

qaTest('TC-APP016-004', async ({ page, qa }) => {
  const s = records(page);
  const t = qa.token();
  const one = await registerPatient(page, 'QA-MRD Pasien Satu', t);
  const two = await registerPatient(page, 'QA-MRD Pasien Dua', t);
  await s.open();
  await s.main.getByRole('button', { name: 'Issue record' }).click();
  await qa.step(1, async () => {
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(`QA-MRD`);
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    const found = await hits(s).allInnerTexts();
    qa.note(1, `${found.length} hit(s) for "QA-MRD"`);
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(t);
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    await expect(hits(s).filter({ hasText: one.mrn })).toHaveCount(1);
    await expect(hits(s).filter({ hasText: two.mrn })).toHaveCount(1);
  });
  await qa.step(2, async () => {
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(two.mrn);
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    await expect(hits(s)).toHaveCount(1);
    await expect(hits(s)).toContainText(two.mrn);
  });
  await qa.step(3, async () => {
    await hits(s).first().click();
    await expect(s.dialog).toContainText(two.mrn);
    await pick(s, one.mrn, one.mrn);
    await expect(s.dialog).toContainText(one.mrn);
    await expect(s.dialog).not.toContainText(two.mrn);
  });
  await qa.step(4, async () => {
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill('');
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    const n = await hits(s).count();
    qa.note(4, `${n} patient(s) listed for an empty search`);
    expect(n).toBeLessThanOrEqual(10);
  });
});

qaTest('TC-APP016-005', async ({ page, qa }) => {
  const r = requests(page);
  const s = records(page);
  await qa.step(1, async () => {
    await r.open();
    await expect(r.main.getByRole('columnheader')).toHaveText(['Doc no.', 'Doc date', 'Purpose', 'Type', 'Active']);
    const pager = (await r.main.getByText(/^Showing/).innerText()).trim();
    qa.note(1, `requests: ${pager}`);
    if (!/of (1[1-9]|[2-9]\d|\d{3,})$/.test(pager)) qa.note(1, 'fewer than 11 requests in the branch; paging is not shown');
  });
  await qa.step(2, async () => {
    await s.open();
    await expect(s.main.getByRole('columnheader')).toHaveText(['Doc no.', 'Doc date', 'Patient', 'Status', 'Actions']);
    for (const row of await s.rows().all()) {
      const status = (await s.cells(row))[3];
      if (status === 'Issued') await expect(row.getByRole('button', { name: 'Return' })).toBeVisible();
      else await expect(row.getByRole('button', { name: 'Return' })).toHaveCount(0);
    }
  });
  await qa.step(3, async () => {
    for (const sc of [r, s]) {
      await sc.open();
      const dates = await sc.rows().evaluateAll((rs) => rs.map((x) => (x.querySelectorAll('td')[1]?.textContent ?? '').trim()));
      expect(dates).toEqual([...dates].sort().reverse());
    }
  });
  await qa.step(4, async () => {
    await s.open();
    const buttons = s.main.getByRole('button', { name: /^\d+$/ });
    if ((await buttons.count()) > 1) {
      const first = await s.rows().first().innerText();
      await buttons.last().press('Enter');
      await expect(s.rows().first()).not.toHaveText(first);
    } else qa.note(4, 'one page only');
  });
});

qaTest('TC-APP016-008', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^MRD\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*MRD$/);
    await expect(main.getByRole('heading', { level: 1, name: 'MRD' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'File Requests' }).first()).toBeVisible();
    qa.deviation(1, 'A button "File Requests"', '"File Requests" is a link');
    const tiles = (await main.getByRole('link').allInnerTexts()).map((x) => x.trim()).filter((x) => x && !['Home', 'Apps'].includes(x));
    qa.note(1, `tiles: ${tiles.join(', ')}`);
  });
  await qa.step(2, async () => {
    for (const [tile, heading] of [['File Requests', 'Patient File Requests'], ['Patient Records', 'Patient Records']]) {
      await page.goto('/en/mrd');
      await main.getByRole('link', { name: tile, exact: true }).last().click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(new RegExp(`Home\\s*/\\s*MRD\\s*/\\s*${heading}`));
    }
  });
  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/mrd/records');
    const buttons = (await main.getByRole('button').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
    const cols = (await main.getByRole('columnheader').allInnerTexts()).map((x) => x.trim());
    qa.note(3, `buttons ${[...new Set(buttons)].slice(0, 6).join(', ')}; columns ${cols.join(', ')}`);
    if (buttons.includes('Issue record') || cols.includes('Status')) qa.deviation(3, 'Column names, buttons, statuses and toasts are Indonesian', `English: ${buttons.includes('Issue record') ? '"Issue record"' : ''} ${cols.join(', ')}`);
  });
});

qaTest('TC-APP016-009', async ({ page, qa }) => {
  const s = requests(page);
  await s.open();
  await s.main.getByRole('button', { name: 'New request' }).click();
  const labels = await s.dialog.locator('input, select').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.textContent ?? e.getAttribute('aria-label') ?? ''));
  await qa.step(1, async () => {
    if (!labels.some((l) => /patient/i.test(l))) qa.deviation(1, 'A patient must be picked from the registered patients', `the form has ${labels.join(', ')}`);
  });
  await qa.step(2, async () => {
    if (!labels.some((l) => /requester|department|doctor/i.test(l))) qa.deviation(2, 'A field for the requester or the department', 'none');
  });
  await qa.step(3, async () => {
    const a = docNo(qa, 'QA-REQ-011');
    const b = docNo(qa, 'QA-REQ-012');
    for (const no of [a, b]) expect(await createRequest(s, { no, purpose: 'QA Kontrol' })).toContain('File request created');
    const c = await s.cells(await s.row(a));
    qa.deviation(3, 'Each row shows the patient and the requester', `the row: ${c.join(' | ')}`);
  });
});

qaTest('TC-APP016-010', async ({ page, qa }) => {
  const s = records(page);
  const r = requests(page);
  const req = docNo(qa, 'QA-REQ-001');
  expect(await createRequest(r, { no: req, purpose: 'QA Kontrol poli penyakit dalam' })).toContain('File request created');
  const pt = await mrdPatient(page, qa);
  await qa.step(1, async () => {
    await s.open();
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    if (!(await s.dialog.getByRole('combobox', { name: /request/i }).count())) qa.deviation(1, 'The request can be chosen; patient and purpose are taken from it', 'the issue dialog does not ask for a request');
    await s.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(2, async () => {
    expect(await issue(s, { patient: pt, no: docNo(qa, 'QA-MR-001') })).toContain('Record issued');
    const c = await r.cells(await r.row(req));
    if (c[c.length - 1] === 'Yes') qa.deviation(2, 'REQ-1 shows a status such as "Fulfilled", with the record\'s number', `the row still reads Active "Yes": ${c.join(' | ')}`);
  });
  await qa.step(3, async () => {
    const row = await r.row(req);
    if (!(await row.getByRole('button').count())) qa.deviation(3, 'A button to reject or close, with a reason', 'none');
  });
});

qaTest('TC-APP016-012', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const no = docNo(qa, 'QA-MR-002');
  expect(await issue(s, { patient: pt, no })).toContain('Record issued');
  await s.open();
  await s.main.getByRole('button', { name: 'Issue record' }).click();
  const labels = await s.dialog.locator('input').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.textContent ?? e.getAttribute('aria-label') ?? ''));
  await qa.step(1, async () => {
    qa.note(1, `issue dialog: ${labels.join(', ')}`);
    if (!labels.some((l) => /borrower/i.test(l))) qa.deviation(1, 'Fields for the borrower and the destination', 'no borrower; "From" and "To" are free text places');
  });
  await qa.step(2, async () => {
    if (!labels.some((l) => /due/i.test(l))) qa.deviation(2, 'A due date', 'none');
    await s.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(3, async () => {
    const row = await s.row(no);
    await row.getByRole('button', { name: 'Return' }).click();
    if (await s.dialog.isVisible({ timeout: 2_000 }).catch(() => false)) await s.click(s.dialog.getByRole('button', { name: 'Return' }));
    const c = await s.cells(await s.row(no));
    qa.note(3, `the returned row: ${c.join(' | ')}`);
    qa.deviation(3, 'The date of return and the person who took it back', 'the row shows neither');
  });
  await qa.step(4, async () => {
    const side = (await page.getByRole('complementary').getByRole('link').allInnerTexts()).join(', ');
    if (!/overdue/i.test(side)) qa.deviation(4, 'A list or a mark for overdue files', `none (menu: ${side})`);
  });
});

qaTest('TC-APP016-014', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  await qa.step(1, async () => {
    await s.open();
    const listed = await s.rows().filter({ hasText: pt.mrn }).count();
    if (!listed) qa.deviation(1, "An entry for the patient's file, created at registration", 'the new patient is not listed; Patient Records lists loans only');
  });
  await qa.step(2, async () => {
    const cols = (await s.main.getByRole('columnheader').allInnerTexts()).join(', ');
    if (!/location|rack|shelf/i.test(cols)) qa.deviation(2, 'A location or rack number', `columns ${cols}`);
  });
  await qa.step(3, async () => {
    const side = (await page.getByRole('complementary').getByRole('link').allInnerTexts()).join(', ');
    if (!/retention|destr/i.test(side)) qa.deviation(3, 'A retention list', `none (menu: ${side})`);
  });
});

qaTest('TC-APP016-016', async ({ page, qa }) => {
  const r = requests(page);
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  await qa.step(1, async () => {
    const toasts = await createRequest(r, { no: '   ', purpose: 'QA Kontrol' });
    expect(toasts).not.toContain('File request created');
    if (!toasts.some((t) => /number/i.test(t))) qa.deviation(1, 'A message that the number is missing', toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing happens, no message');
  });
  await qa.step(2, async () => {
    const toasts = await createRequest(r, { no: `${docNo(qa, 'QA-REQ')}-${'X'.repeat(60)}`.slice(0, 51), purpose: 'QA Kontrol' });
    expect(toasts).not.toContain('File request created');
    if (!toasts.some((t) => /50|long|limit/i.test(t))) qa.deviation(2, 'Refused with a message that names the limit of 50, or the field stops there', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const toasts = await createRequest(r, { no: docNo(qa, 'QA-REQ'), purpose: 'x'.repeat(256) });
    expect(toasts).not.toContain('File request created');
    if (!toasts.some((t) => /255|long|limit/i.test(t))) qa.deviation(3, 'Refused with a message that names the limit of 255', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(4, async () => {
    await s.open();
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeDisabled();
    await s.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(5, async () => {
    const toasts = await issue(s, { patient: pt, no: docNo(qa, 'QA-MR'), remarks: 'x'.repeat(1001) });
    expect(toasts).not.toContain('Record issued');
    if (!toasts.some((t) => /1000|1,000|long|limit/i.test(t))) qa.deviation(5, 'Refused with a message that names the limit of 1,000', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(6, async () => {
    const a = await createRequest(r, { no: docNo(qa, 'QA-REQ'), purpose: 'QA Kontrol', date: '1900-01-01' });
    const b = await issue(s, { patient: pt, no: docNo(qa, 'QA-MR'), date: '2099-12-31' });
    const saved = [a.includes('File request created') && '1900-01-01 request', b.includes('Record issued') && '2099-12-31 record'].filter(Boolean);
    if (saved.length) qa.deviation(6, 'Refused, or a warning about the date', `saved: ${saved.join(', ')}`);
  });
});

qaTest('TC-APP016-019', async ({ page, qa }) => {
  const r = requests(page);
  const s = records(page);
  const req = docNo(qa, 'QA-REQ');
  expect(await createRequest(r, { no: req, purpose: 'QA Salah tujuan' })).toContain('File request created');
  const pt = await mrdPatient(page, qa, 'QA-MRD Pasien Dua');
  const rec = docNo(qa, 'QA-MR');
  expect(await issue(s, { patient: pt, no: rec })).toContain('Record issued');
  await qa.step(1, async () => {
    await (await r.row(req)).getByRole('cell').first().click();
    if (!(await r.dialog.count())) qa.deviation(1, 'The request opens for editing', 'a row cannot be opened');
  });
  await qa.step(2, async () => {
    if (!(await (await r.row(req)).getByRole('button').count())) qa.deviation(2, 'A cancellation; the row then reads Active "No"', 'no cancel');
  });
  await qa.step(3, async () => {
    const row = await s.row(rec);
    await row.getByRole('cell').first().click();
    const buttons = await row.getByRole('button').allInnerTexts();
    if (!(await s.dialog.count()) && !buttons.some((b) => /cancel|edit/i.test(b))) qa.deviation(3, 'The record opens; the patient can be corrected, or the issue cancelled with a reason', `only ${buttons.join(', ')}`);
  });
});

qaTest('TC-APP016-020', async ({ page, qa }) => {
  const r = requests(page);
  const s = records(page);
  await s.open();
  await qa.step(1, async () => {
    if (!(await s.main.getByRole('searchbox').or(s.main.getByRole('textbox')).count())) qa.deviation(1, 'A search by patient, MRN or document number', 'none');
  });
  await qa.step(2, async () => {
    if (!(await s.main.getByRole('combobox').count())) qa.deviation(2, 'A filter "Issued"', 'none');
  });
  await qa.step(3, async () => {
    const before = await s.rows().first().innerText();
    await s.main.getByRole('columnheader', { name: 'Patient' }).click();
    if ((await s.rows().first().innerText()) === before) qa.deviation(3, 'The list sorts by that column', 'clicking a heading does nothing');
  });
  await qa.step(4, async () => {
    await r.open();
    if (!(await r.main.getByRole('searchbox').or(r.main.getByRole('textbox')).count())) qa.deviation(4, 'A search by number or purpose', 'none');
  });
});

qaTest('TC-APP016-027', async ({ page, qa }) => {
  const r = requests(page);
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const no = `<script>alert(1)</script> ${qa.token()}`;
  const img = '<img src=x onerror=alert(1)>';
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });
  await qa.step(1, async () => {
    expect(await createRequest(r, { no, purpose: img })).toContain('File request created');
  });
  const rec = `<script>alert(1)</script> ${qa.token()}`;
  await qa.step(2, async () => {
    expect(await issue(s, { patient: pt, no: rec, remarks: img })).toContain('Record issued');
  });
  await qa.step(3, async () => {
    expect((await r.cells(await r.row(no))).slice(0, 3)).toEqual([no, todayWib(), img]);
    expect((await s.cells(await s.row(rec)))[0]).toBe(rec);
    await expect(page.getByRole('main').locator('table img')).toHaveCount(0);
    expect(alerted).toBe(false);
  });
  qa.notRun(4, 'Audit is read by the Superadmin (U10, deferred)');
});

qaTest('TC-APP016-029', async ({ page, qa }) => {
  const r = requests(page);
  const code = qa.code('X-PRJ');
  const off = qa.code('X-LAMA');
  const name = qa.name('X Pinjam rawat jalan');
  const types = async (): Promise<string[]> => r.dialog.getByRole('listitem').allInnerTexts();
  const create = async (c: string, n: string, active: boolean): Promise<string[]> => {
    await r.dialog.getByRole('textbox', { name: 'Code' }).fill(c);
    await r.dialog.getByRole('textbox', { name: 'Name' }).fill(n);
    await r.dialog.getByRole('checkbox', { name: 'Active' }).setChecked(active);
    return r.click(r.dialog.getByRole('button', { name: 'Create' }));
  };
  await qa.step(1, async () => {
    await page.goto('/en/mrd');
    await page.getByRole('complementary').getByRole('link', { name: 'File Requests' }).first().click();
    await expect(r.main.getByRole('heading', { level: 1, name: 'Patient File Requests' })).toBeVisible();
    for (const b of ['Request types', 'New request']) await expect(r.main.getByRole('button', { name: b })).toBeVisible();
    await expect(r.main.getByRole('columnheader')).toHaveText(['Doc no.', 'Doc date', 'Purpose', 'Type', 'Active']);
  });
  await qa.step(2, async () => {
    await r.main.getByRole('button', { name: 'Request types' }).click();
    for (const f of ['Code', 'Name']) await expect(r.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(r.dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
  await qa.step(3, async () => {
    expect(await create(code, name, true)).toContain('Request type saved');
    await expect.poll(async () => (await types()).some((t) => t.startsWith(code.toUpperCase()))).toBe(true);
  });
  await qa.step(4, async () => {
    expect(await create(off, qa.name('X Lama'), false)).toContain('Request type saved');
    await expect.poll(async () => (await types()).some((t) => t.startsWith(off.toUpperCase()))).toBe(true);
    const line = (await types()).find((t) => t.startsWith(off.toUpperCase())) ?? '';
    qa.note(4, `listed as "${line}"`);
    expect(line).toMatch(/No$/);
  });
  await qa.step(5, async () => {
    await r.dialog.getByRole('button', { name: 'Cancel' }).click();
    await r.main.getByRole('button', { name: 'New request' }).click();
    for (const f of ['Document number', 'Document date', 'Purpose']) await expect(r.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(r.dialog.getByRole('combobox', { name: 'Request type' })).toBeVisible();
    if (!(await r.dialog.getByRole('combobox', { name: 'Branch' }).count())) qa.note(5, 'no "Branch" list: U1 works on one branch');
  });
  await qa.step(6, async () => {
    const options = await r.dialog.getByRole('combobox', { name: 'Request type' }).locator('option').allInnerTexts();
    expect(options.some((o) => o.startsWith(code.toUpperCase()))).toBe(true);
    expect(options.some((o) => o.startsWith(off.toUpperCase()))).toBe(false);
    await r.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(7, async () => {
    const no = qa.code('X-MRQ-001');
    expect(await createRequest(r, { no, purpose: qa.prefix('X Kontrol poli'), type: code.toUpperCase() })).toContain('File request created');
    const c = await r.cells(await r.row(no));
    expect(c[3]).toContain(code.toUpperCase());
    expect(c[4]).toBe('Yes');
  });
});

qaTest('TC-APP016-030', async ({ page, qa }) => {
  const r = requests(page);
  const code = qa.code('X-PRJ');
  await r.open();
  await r.main.getByRole('button', { name: 'Request types' }).click();
  await r.dialog.getByRole('textbox', { name: 'Code' }).fill(code);
  await r.dialog.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Pinjam rawat jalan'));
  expect(await r.click(r.dialog.getByRole('button', { name: 'Create' }))).toContain('Request type saved');
  await qa.step(1, async () => {
    await r.dialog.getByRole('textbox', { name: 'Code' }).fill(code.toLowerCase());
    await r.dialog.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Pinjam rawat jalan'));
    const toasts = await r.click(r.dialog.getByRole('button', { name: 'Create' }));
    expect(toasts).not.toContain('Request type saved');
    if (!toasts.includes('That code already exists')) qa.deviation(1, 'Toast "That code already exists"', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    await r.dialog.getByRole('textbox', { name: 'Code' }).fill(qa.code('X-PRJ'));
    await r.dialog.getByRole('textbox', { name: 'Name' }).fill('');
    const toasts = await r.click(r.dialog.getByRole('button', { name: 'Create' }));
    expect(toasts).not.toContain('Request type saved');
    qa.note(2, toasts.length ? `toast "${toasts.join(' / ')}"` : 'the browser stops the click');
  });
  await qa.step(3, async () => {
    const toasts = await createRequest(r, { no: qa.code('X-MRQ-001'), purpose: qa.prefix('X Kontrol poli'), type: '' });
    expect(toasts).not.toContain('File request created');
    const message = await r.dialog.getByRole('combobox', { name: 'Request type' }).evaluate((e) => (e as HTMLSelectElement).validationMessage);
    if (!toasts.includes('Choose an active request type. Purpose stays.')) qa.deviation(3, 'Toast "Choose an active request type. Purpose stays."', toasts.length ? `toast "${toasts.join(' / ')}"` : `the browser stops the click ("${message}"); that text is the first line of the list`);
    await expect(r.dialog.getByRole('textbox', { name: 'Purpose' })).toHaveValue(qa.prefix('X Kontrol poli'));
  });
  qa.notRun(4, 'U1 works on one branch; "All branches" in the header needs U2');
});

qaTest('TC-APP016-031', async ({ page, qa }) => {
  const r = requests(page);
  await r.open();
  await r.main.getByRole('button', { name: 'Request types' }).click();
  const buttons = await r.dialog.getByRole('button').allInnerTexts();
  await qa.step(1, async () => {
    qa.note(1, `the dialog offers: ${buttons.join(', ')}`);
    expect(buttons.some((b) => /edit|rename/i.test(b))).toBe(false);
  });
  await qa.step(2, async () => {
    expect(await r.dialog.getByRole('listitem').getByRole('button').count()).toBe(0);
  });
});

qaTest('TC-APP016-032', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const no = docNo(qa, 'QA-MR');
  const shelf = qa.prefix('X Rak A-12');
  const clinic = qa.prefix('X Poli Penyakit Dalam');
  await qa.step(1, async () => {
    await page.goto('/en/mrd');
    await page.getByRole('complementary').getByRole('link', { name: 'Patient Records' }).first().click();
    await expect(s.main.getByRole('heading', { level: 1, name: 'Patient Records' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    for (const f of ['Document number', 'Document date', 'Remarks', 'From', 'To']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await s.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
  await qa.step(3, async () => {
    expect(await issue(s, { patient: pt, no, from: shelf, to: clinic })).toContain('Record issued');
    const row = await s.row(no);
    for (const b of ['Movement', 'Open review', 'Return']) await expect(row.getByRole('button', { name: b })).toBeVisible();
  });
  await qa.step(4, async () => {
    await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
    await expect(s.dialog).toContainText('Issued');
    await expect(s.dialog).toContainText(shelf);
    await expect(s.dialog).toContainText(clinic);
    await s.dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click();
  });
  await qa.step(5, async () => {
    await (await s.row(no)).getByRole('button', { name: 'Return' }).click();
    for (const f of ['From', 'To']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
  });
  await qa.step(6, async () => {
    await s.dialog.getByRole('textbox', { name: 'From' }).fill(clinic);
    await s.dialog.getByRole('textbox', { name: 'To' }).fill(shelf);
    expect(await s.click(s.dialog.getByRole('button', { name: 'Return' }))).toContain('Record returned');
    const row = await s.row(no);
    expect((await s.cells(row))[3]).toBe('Returned');
    await expect(row.getByRole('button', { name: 'Return' })).toHaveCount(0);
  });
  await qa.step(7, async () => {
    await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
    await expect(s.dialog).toContainText('Issued');
    await expect(s.dialog).toContainText('Returned');
    qa.note(7, `movement: ${(await s.dialog.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
  });
});

qaTest('TC-APP016-033', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  await qa.step(1, async () => {
    const no = docNo(qa, 'QA-MR');
    const toasts = await issue(s, { patient: pt, no, from: '', to: '' });
    qa.note(1, `issue with empty places: "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    await s.open();
    const old = s.rows().filter({ hasText: 'MRD-RM-' }).first();
    if (await old.count()) {
      await old.getByRole('button', { name: 'Movement' }).click();
      qa.note(2, `movement of a seed record: ${(await s.dialog.innerText()).replace(/\s+/g, ' ').slice(0, 120)}`);
    } else qa.note(2, 'no record issued before the movement function is listed');
  });
  await qa.step(3, async () => {
    const no = docNo(qa, 'QA-MR');
    expect(await issue(s, { patient: pt, no, from: qa.prefix('X Rak A-12'), to: qa.prefix('X Poli') })).toContain('Record issued');
    await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
    qa.note(3, `time shown: ${(await s.dialog.innerText()).match(/\d{2}:\d{2}/)?.[0] ?? 'none'} (now ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB)`);
  });
  qa.notRun(4, 'needs two windows of two users at the same moment');
});

qaTest('TC-APP016-040', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/mrd');
    await page.getByRole('complementary').getByRole('link', { name: 'Visits without a document' }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Outpatient visits without a document' })).toBeVisible();
    await expect(main.getByText('The document itself is recorded on the registration visit.', { exact: true })).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['Visit', 'Patient', 'Arrived', 'Pending']);
  });
  qa.notRun(2, 'needs an outpatient arrival of a test patient without a document (01 Ambulatory Care, chain); which document is meant is TBD');
  qa.notRun(3, 'see step 2');
  qa.notRun(4, 'see step 2');
});

const SCREENS: [string, string, string][] = [
  ['TC-APP016-042', '/mrd', 'MRD'],
  ['TC-APP016-043', '/mrd/coding', 'Discharged stays missing a diagnosis code'],
  ['TC-APP016-044', '/mrd/outpatient', 'Outpatient visits without a document'],
  ['TC-APP016-045', '/mrd/records', 'Patient Records'],
  ['TC-APP016-046', '/mrd/requests', 'Patient File Requests'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
