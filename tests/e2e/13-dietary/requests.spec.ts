import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { DIET } from '../../../lib/diet-data';
import { click, RequestsPage, TpnPage, TPN_A } from './helpers';

/** 13-dietary.xlsx, feature "Diet requests (/diet/requests)". Request numbers carry a token. */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const COMMENTS = 'QA Diet lunak, rendah garam';
const docNo = (qa: Qa) => `${DIET.request.docNo}-${qa.token()}`;

async function request(r: RequestsPage, qa: Qa, extra: Record<string, string> = {}): Promise<string> {
  const no = docNo(qa);
  expect(await r.create({ 'Doc no': no, 'Bed no': DIET.request.bedNo, 'Bed category': DIET.request.bedCategory, Comments: COMMENTS, ...extra })).toContain('Request created');
  return no;
}

/** The "Lines — <doc no>" section under the list. */
const lines = (r: RequestsPage, no: string) => r.main.getByRole('heading', { name: `Lines — ${no}` });

qaTest('TC-APP013-001', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  const no = docNo(qa);

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Dietary\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Open requests' }).click();
    await expect(r.heading).toBeVisible();
    await expect(r.main.getByText('List requests with expandable line detail.', { exact: true })).toBeVisible();
    await expect(r.table).toBeVisible();
    await expect(r.main.getByRole('button', { name: 'New request' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await r.main.getByRole('button', { name: 'New request' }).click();
    for (const f of ['Doc no', 'Bed no', 'Bed category', 'Comments', 'Status']) await expect(r.dialog.getByRole('textbox', { name: f, exact: true })).toBeVisible();
    await expect(r.dialog.getByRole('textbox', { name: 'Branch' }).or(r.dialog.getByRole('combobox', { name: 'Branch' }))).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await r.dialog.getByRole('textbox', { name: 'Doc no' }).fill(no);
    await r.dialog.getByRole('textbox', { name: 'Bed no' }).fill(DIET.request.bedNo);
    await r.dialog.getByRole('textbox', { name: 'Bed category' }).fill(DIET.request.bedCategory);
    await r.dialog.getByRole('textbox', { name: 'Comments' }).fill(COMMENTS);
    expect(await click(page, r.dialog.getByRole('button', { name: 'Save' }))).toContain('Request created');
  });

  await qa.step(4, async () => {
    const c = await r.cells(await r.row(no));
    expect(c).toEqual([no, todayWib(), todayWib(), '1 line(s)', 'Active']);
  });
});

qaTest('TC-APP013-002', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  const one = await request(r, qa);
  const two = await request(r, qa);

  await qa.step(1, async () => {
    await (await r.row(one)).getByRole('button', { name: '1 line(s)' }).click();
    await expect(lines(r, one)).toBeVisible();
    const section = lines(r, one).locator('xpath=..');
    for (const t of [DIET.request.bedNo, DIET.request.bedCategory, 'ordered', COMMENTS]) await expect(section).toContainText(t);
  });

  await qa.step(2, async () => {
    await (await r.row(two)).getByRole('button', { name: '1 line(s)' }).click();
    await expect(lines(r, two)).toBeVisible();
    await expect(lines(r, one)).toHaveCount(0);
  });

  await qa.step(3, async () => {
    await (await r.row(two)).getByRole('button', { name: '1 line(s)' }).click();
    await expect(lines(r, two)).toBeVisible();
    await (await r.row(two)).getByRole('button', { name: '1 line(s)' }).click();
    await expect(lines(r, two)).toHaveCount(0);
    qa.note(3, 'the second click on the same link closes the section (the row is found again first, which reopens the list)');
  });
});

qaTest('TC-APP013-003', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  await r.open();
  const total = Number(((await r.pager().innerText()).match(/of (\d+)$/) ?? ['', '0'])[1]);
  for (let i = total; i <= 10; i++) await request(r, qa);
  if (total <= 10) qa.note(1, `${11 - total} request(s) made so that more than 10 exist; all of them carry today's date (the form has no date field)`);

  await qa.step(1, async () => {
    await r.open();
    await expect(r.rows()).toHaveCount(10);
    await expect(r.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    await expect(r.table.getByRole('columnheader')).toHaveText(['Doc no', 'Doc date', 'Request date', 'Lines', 'Status']);
  });

  await qa.step(2, async () => {
    const rows = await r.rows().evaluateAll((rs) => rs.map((x) => [...x.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim())));
    const dates = rows.map((x) => x[2]);
    expect(dates).toEqual([...dates].sort().reverse());
    const today = rows.filter((x) => x[2] === dates[0]).map((x) => x[0]);
    if (today.join() !== [...today].sort().join()) qa.deviation(2, 'Requests of the same date by document number, lowest first', `order: ${today.join(', ')}`);
  });

  await qa.step(3, async () => {
    const first = await r.rows().first().innerText();
    await r.main.getByRole('button', { name: /^\d+$/ }).last().press('Enter');
    await expect(r.rows().first()).not.toHaveText(first);
    const dates = await r.rows().evaluateAll((rs) => rs.map((x) => (x.querySelectorAll('td')[2]?.textContent ?? '').trim()));
    qa.note(3, `last page dates: ${dates.join(', ')}`);
  });
});

qaTest('TC-APP013-012', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  await r.open();
  await r.main.getByRole('button', { name: 'New request' }).click();
  const fields = await r.dialog.getByRole('textbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
  qa.note(1, `the form has: ${fields.join(', ')}`);

  await qa.step(1, async () => {
    if (!fields.some((f) => /patient/i.test(f))) qa.deviation(1, 'A patient must be picked from the admitted patients', 'no patient field');
  });
  await qa.step(2, async () => {
    if (!fields.some((f) => /diet|meal|allerg/i.test(f))) qa.deviation(2, 'Fields or lists for the diet type, the meal time and allergies', 'none; the diet can only be written into "Comments"');
  });
  await qa.step(3, async () => {
    const bed = r.dialog.getByRole('textbox', { name: 'Bed no' });
    if (!(await bed.getAttribute('list')) && !(await bed.getAttribute('aria-controls'))) qa.deviation(3, 'The beds of Inpatient are offered', '"Bed no" is typed by hand');
  });
  await qa.step(4, async () => {
    const a = await request(r, qa, { Comments: 'QA Diet rendah garam' });
    await request(r, qa, { Comments: 'QA Diet diabetes' });
    const c = await r.cells(await r.row(a));
    qa.deviation(4, 'Each row shows the patient and the diet', `the row shows numbers and dates only: ${c.join(' | ')}`);
  });
});

qaTest('TC-APP013-014', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  const no = await request(r, qa);
  await (await r.row(no)).getByRole('button', { name: '1 line(s)' }).click();
  const section = lines(r, no).locator('xpath=..');
  const buttons = async () => (await section.getByRole('button').allInnerTexts()).concat(await (await r.row(no)).getByRole('button').allInnerTexts());

  await qa.step(1, async () => {
    const b = await buttons();
    if (!b.some((x) => /deliver|status|prepar/i.test(x)) && !(await section.getByRole('combobox').count())) qa.deviation(1, 'A button or a list of statuses', 'none; the line status is what was typed at creation ("ordered")');
  });
  await qa.step(2, async () => {
    if (!(await buttons()).some((x) => /edit|change/i.test(x))) qa.deviation(2, 'The line can be edited', 'no edit');
  });
  await qa.step(3, async () => {
    if (!(await buttons()).some((x) => /cancel/i.test(x))) qa.deviation(3, 'A cancellation; Status then reads "Inactive"', 'no cancel');
  });
  await qa.step(4, async () => {
    if (!(await buttons()).some((x) => /add/i.test(x))) qa.deviation(4, 'A button to add a line', 'no way to add a line ("One line per dialog")');
  });
});

qaTest('TC-APP013-016', async ({ page, qa }) => {
  const r = new RequestsPage(page);

  await qa.step(1, async () => {
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    await r.dialog.getByRole('button', { name: 'Save' }).click();
    for (const f of ['Doc no', 'Bed no', 'Bed category']) {
      expect(await r.dialog.getByRole('textbox', { name: f, exact: true }).evaluate((e) => (e as HTMLInputElement).required)).toBe(true);
    }
  });

  await qa.step(2, async () => {
    const toasts = await r.create({ 'Doc no': docNo(qa), 'Bed no': '   ', 'Bed category': DIET.request.bedCategory });
    expect(toasts).not.toContain('Request created');
    if (!toasts.some((t) => /bed/i.test(t))) qa.deviation(2, 'A message that the bed is missing', toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing happens, no message');
  });

  await qa.step(3, async () => {
    const toasts = await r.create({ 'Doc no': `${docNo(qa)}-${'X'.repeat(60)}`.slice(0, 51), 'Bed no': DIET.request.bedNo, 'Bed category': DIET.request.bedCategory });
    expect(toasts).not.toContain('Request created');
    if (!toasts.some((t) => /50|long|limit/i.test(t))) qa.deviation(3, 'Refused with a message that names the limit of 50, or the field stops there', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(4, async () => {
    const toasts = await r.create({ 'Doc no': docNo(qa), 'Bed no': DIET.request.bedNo, 'Bed category': DIET.request.bedCategory, Comments: 'x'.repeat(256) });
    expect(toasts).not.toContain('Request created');
    if (!toasts.some((t) => /255|long|limit/i.test(t))) qa.deviation(4, 'Refused with a message that names the limit of 255', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(5, async () => {
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    if (!(await r.dialog.locator('input[type="date"], input[type="datetime-local"]').count())) qa.deviation(5, 'A request date can be chosen', 'no date field: document and request date are always today');
  });
});

qaTest('TC-APP013-032', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  const no = `<script>alert(1)</script> ${qa.token()}`;
  const img = '<img src=x onerror=alert(1)>';
  let alerted = false;
  page.on('dialog', async (d) => {
    alerted = true;
    await d.dismiss();
  });

  await qa.step(1, async () => {
    expect(await r.create({ 'Doc no': no, 'Bed no': DIET.request.bedNo, 'Bed category': DIET.request.bedCategory, Comments: img, Status: img })).toContain('Request created');
    await (await r.row(no)).getByRole('button', { name: '1 line(s)' }).click();
    await expect(lines(r, no)).toBeVisible();
    await expect(lines(r, no).locator('xpath=..')).toContainText(img);
    await expect(r.main.locator('img')).toHaveCount(0);
    expect(alerted).toBe(false);
  });

  await qa.step(2, async () => {
    const t = new TpnPage(page);
    const name = `<script>alert(1)</script> ${qa.token()}`;
    await t.open();
    await t.fill({ ...TPN_A, Patient: name });
    expect(await click(page, t.button('Save on patient'))).toContain('TPN saved on the patient.');
    await t.fill({ 'Template code': `${img} ${qa.token()}`, Description: 'QA script' });
    expect(await click(page, t.button('Save template'))).toContain('Template saved.');
    await t.open();
    await expect(t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) })).toHaveCount(1);
    await expect(t.main.getByRole('combobox', { name: 'Reuse template' }).locator('option', { hasText: img }).first()).toBeAttached();
    await expect(t.main.locator('table img')).toHaveCount(0);
    expect(alerted).toBe(false);
  });
});
