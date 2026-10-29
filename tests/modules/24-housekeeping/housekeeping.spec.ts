import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { Desk, SAVED, refused } from '../shared/desk';
import { auditEntries, menuScreens, userPage } from '../shared/access';
import { screenOpens } from '../shared/screen-opens';
import { expectStatus } from '../shared/desk-status';

/**
 * 24-housekeeping.xlsx: locations (shifts, activities, materials, match),
 * contracts, daily logs and bills. Codes and numbers carry a token. The
 * service center of a location is QA-UNIT-1 "QA Ruang Tindakan" (made by 01,
 * Q14). Refusals show "Minified React error #441"; the server text of the
 * workbook is recorded next to it.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const CENTER = 'QA-UNIT-1';
const locations = (p: Page) => new Desk(p, '/housekeeping/locations', 'Locations', 'New location');
const contracts = (p: Page) => new Desk(p, '/housekeeping/contracts', 'Contracts', 'New');
const logs = (p: Page) => new Desk(p, '/housekeeping/logs', 'Daily logs', 'New');
const bills = (p: Page) => new Desk(p, '/housekeeping/bills', 'Bills', 'New');

const LOC = 'Location code';
const CEF = 'Center / end / frequency';
const PQ = 'People / quantity';

/** A location of the test with its manpower; optionally its shifts, an activity and a material. */
async function location(page: Page, qa: Qa, opts: { people?: string; shifts?: [string, string][]; activity?: boolean } = {}): Promise<string> {
  const l = locations(page);
  const code = qa.code('X-LT1');
  expect(await l.save({ [LOC]: code, Name: qa.name('X Lantai 1 uji'), [CEF]: CENTER, [PQ]: opts.people ?? '3' })).toContain(SAVED);
  for (const [shift, n] of opts.shifts ?? []) expect(await l.save({ [LOC]: code, Name: qa.prefix(shift), [PQ]: n }, 'Save shift')).toContain(SAVED);
  if (opts.activity) expect(await l.save({ [LOC]: code, Name: qa.prefix('X Mengepel'), [CEF]: 'daily' }, 'Save activity')).toContain(SAVED);
  return code;
}

const CONTRACT = (qa: Qa, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-HK-001'),
  Name: qa.prefix('X PT Bersih Uji'),
  'Start / date': '2026-11-01',
  [CEF]: '2027-10-31',
  ...extra,
});

/** A contract of the test; "approved" also saves a price line, sends and approves it. */
async function contract(page: Page, qa: Qa, state: 'draft' | 'sent' | 'approved' = 'approved'): Promise<string> {
  const c = contracts(page);
  const { toasts, id } = await c.create(CONTRACT(qa));
  expect(toasts).toContain(SAVED);
  if (state === 'approved') expect(await c.save({ Document: id, [CEF]: qa.prefix('X per orang per shift'), Amount: '150000' }, 'Price line')).toContain(SAVED);
  if (state !== 'draft') expect(await c.save({ Document: id }, 'Send contract')).toContain(SAVED);
  if (state === 'approved') expect(await c.save({ Document: id }, 'Approve contract')).toContain(SAVED);
  return id;
}

qaTest('TC-APP024-001', async ({ page, qa }) => {
  const l = locations(page);
  const code = qa.code('X-LT1');
  await qa.step(1, async () => {
    await page.goto('/id/housekeeping');
    await page.getByRole('main').getByRole('link', { name: 'Locations' }).click();
    await expect(l.main.getByRole('heading', { level: 1, name: 'Locations' })).toBeVisible();
    for (const b of ['New location', 'Search']) await expect(l.main.getByRole('button', { name: b, exact: true })).toBeVisible();
    await expect(l.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await l.main.getByRole('button', { name: 'New location' }).click();
    await expect(l.dialog).toHaveAccessibleName('Locations');
    for (const f of [LOC, 'Name', CEF, 'Material', PQ]) await expect(l.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(l.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Save location', 'Save shift', 'Save activity', 'Save material', 'Match']);
  });
  await qa.step(3, async () => {
    expect(await l.save({ [LOC]: code, Name: qa.name('X Lantai 1 uji'), [CEF]: CENTER, [PQ]: '3' })).toContain(SAVED);
    qa.note(3, `service center "${CENTER}" (QA Ruang Tindakan) stands for "the service center of the branch"`);
    expect((await l.list(code)).some((r) => r[1].includes(code))).toBe(true);
  });
  await qa.step(4, async () => {
    expect(await l.save({ [LOC]: code, Name: qa.prefix('X Pagi'), [PQ]: '2' }, 'Save shift')).toContain(SAVED);
    expect(await l.save({ [LOC]: code, Name: qa.prefix('X Sore'), [PQ]: '1' }, 'Save shift')).toContain(SAVED);
  });
  await qa.step(5, async () => {
    expect(await l.save({ [LOC]: code, Name: qa.prefix('X Mengepel'), [CEF]: 'daily' }, 'Save activity')).toContain(SAVED);
  });
  await qa.step(6, async () => {
    expect(await l.save({ [LOC]: code, Material: qa.code('X-KARBOL'), [PQ]: '2' }, 'Save material')).toContain(SAVED);
  });
  await qa.step(7, async () => {
    expect(await l.save({ [LOC]: code }, 'Match')).toContain(SAVED);
  });
  await qa.step(8, async () => {
    const rows = (await l.list(code)).map((r) => r.join(' | '));
    qa.note(8, `the table for the code: ${rows.join(' ; ')}; shifts, activities and materials are shown nowhere`);
    expect(rows.join(' ')).not.toContain('QA-Pagi');
  });
});

qaTest('TC-APP024-002', async ({ page, qa }) => {
  const l = locations(page);
  const code = await location(page, qa);
  await qa.step(1, async () => refused(qa, 1, await l.save({ [LOC]: qa.code('X-LT1'), Name: qa.name('X Lantai 1 uji'), [CEF]: '', [PQ]: '3' }), 'code, name, center and manpower are required'));
  await qa.step(2, async () => refused(qa, 2, await l.save({ [LOC]: code, Name: qa.prefix('X Pagi'), [PQ]: '0' }, 'Save shift'), 'location, shift and people are required'));
  await qa.step(3, async () => refused(qa, 3, await l.save({ [LOC]: code, Name: qa.prefix('X Mengepel'), [CEF]: 'twice a week' }, 'Save activity'), 'location, activity and frequency are required'));
  await qa.step(4, async () => {
    const mat = qa.code('X-KARBOL');
    expect(await l.save({ [LOC]: code, Material: mat, [PQ]: '2' }, 'Save material')).toContain(SAVED);
    refused(qa, 4, await l.save({ [LOC]: code, Material: mat, [PQ]: '2' }, 'Save material'), 'The Material is Already Added');
  });
  await qa.step(5, async () => refused(qa, 5, await l.save({ [LOC]: qa.code('X-TIDAK-ADA'), Name: qa.prefix('X Pagi'), [PQ]: '2' }, 'Save shift'), 'location is missing'));
  await qa.step(6, async () => refused(qa, 6, await l.save({ [LOC]: code, Name: qa.name('X Lantai 1 uji'), [CEF]: CENTER, [PQ]: '3' }), 'duplicate'));
});

qaTest('TC-APP024-003', async ({ page, qa }) => {
  const l = locations(page);
  await qa.step(1, async () => {
    const code = await location(page, qa, { shifts: [['X Pagi', '2']], activity: true });
    refused(qa, 1, await l.save({ [LOC]: code }, 'Match'), 'shift manpower and total manpower are not Matching');
  });
  await qa.step(2, async () => {
    const code = await location(page, qa, { shifts: [['X Pagi', '2'], ['X Sore', '1']] });
    refused(qa, 2, await l.save({ [LOC]: code }, 'Match'), 'at least one activity is required');
  });
});

qaTest('TC-APP024-004', async ({ page, qa }) => {
  const c = contracts(page);
  let id = '';
  await qa.step(1, async () => {
    await page.goto('/id/housekeeping');
    await page.getByRole('main').getByRole('link', { name: 'Contracts' }).click();
    await expect(c.main.getByRole('heading', { level: 1, name: 'Contracts' })).toBeVisible();
    await expect(c.main.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await expect(c.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await c.main.getByRole('button', { name: 'New', exact: true }).click();
    for (const f of ['Number', 'Name', 'Start / date', CEF, 'Document', 'Amount']) await expect(c.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(c.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Save contract', 'Price line', 'Send contract', 'Approve contract']);
  });
  await qa.step(3, async () => {
    const r = await c.create(CONTRACT(qa));
    expect(r.toasts).toContain(SAVED);
    id = r.id;
    await expectStatus(qa, 3, c, id, 'draft');
  });
  await qa.step(4, async () => {
    expect(await c.save({ Document: id, [CEF]: qa.prefix('X per orang per shift'), Amount: '150000' }, 'Price line')).toContain(SAVED);
  });
  await qa.step(5, async () => {
    expect(await c.save({ Document: id }, 'Send contract')).toContain(SAVED);
    await expectStatus(qa, 5, c, id, 'sent');
    expect(await c.save({ Document: id }, 'Approve contract')).toContain(SAVED);
    await expectStatus(qa, 5, c, id, 'approved');
  });
});

qaTest('TC-APP024-005', async ({ page, qa }) => {
  const c = contracts(page);
  await qa.step(1, async () => refused(qa, 1, await c.save(CONTRACT(qa, { [CEF]: '' })), 'number, vendor, start and end are required'));
  await qa.step(2, async () => refused(qa, 2, await c.save(CONTRACT(qa, { 'Start / date': '2027-10-31', [CEF]: '2026-11-01' })), 'end is before start'));
  const draft = await contract(page, qa, 'draft');
  await qa.step(3, async () => refused(qa, 3, await c.save({ Document: draft }, 'Approve contract'), 'send the contract first'));
  await qa.step(4, async () => refused(qa, 4, await c.save({ Document: draft, [CEF]: '', Amount: '150000' }, 'Price line'), 'price line is required'));
  await qa.step(5, async () => refused(qa, 5, await c.save({ Document: '' }, 'Send contract'), 'document is missing'));
});

qaTest('TC-APP024-006', async ({ page, qa }) => {
  const c = contracts(page);
  await qa.step(1, async () => {
    const toasts = await c.save(CONTRACT(qa, { 'Start / date': '01-11-2026', [CEF]: '31-10-2027' }));
    qa.note(1, `dates typed as 01-11-2026 and 31-10-2027: "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const id = await contract(page, qa, 'draft');
    const zero = await c.save({ Document: id, [CEF]: qa.prefix('X per orang per shift'), Amount: '0' }, 'Price line');
    const minus = await c.save({ Document: id, [CEF]: qa.prefix('X per orang per shift'), Amount: '-1' }, 'Price line');
    qa.note(2, `price 0: "${zero.join(' / ')}"; price -1: "${minus.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const v = CONTRACT(qa);
    expect(await c.save(v)).toContain(SAVED);
    const toasts = await c.save(v);
    qa.note(3, `the same number again: "${toasts.join(' / ')}"`);
  });
});

const LOG = (qa: Qa, loc: string, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-LOG-001'),
  [LOC]: loc,
  Name: qa.prefix('X Pagi'),
  'Start / date': todayWib(),
  [PQ]: '2',
  ...extra,
});

qaTest('TC-APP024-007', async ({ page, qa }) => {
  const g = logs(page);
  const loc = await location(page, qa, { shifts: [['X Pagi', '2'], ['X Sore', '1']], activity: true });
  let id = '';
  await qa.step(1, async () => {
    await page.goto('/id/housekeeping');
    await page.getByRole('main').getByRole('link', { name: 'Daily logs' }).click();
    await expect(g.main.getByRole('heading', { level: 1, name: 'Daily logs' })).toBeVisible();
    await expect(g.main.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await expect(g.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await g.main.getByRole('button', { name: 'New', exact: true }).click();
    for (const f of ['Number', LOC, 'Name', 'Start / date', 'Document', PQ]) await expect(g.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(g.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Log', 'Approve log']);
  });
  await qa.step(3, async () => {
    const r = await g.create(LOG(qa, loc));
    expect(r.toasts).toContain(SAVED);
    id = r.id;
    const status = await g.status(id);
    if (!status) qa.note(3, `${id} is not among the rows the list shows (found blocker 40): its status cannot be read`);
    if (status && status !== 'draft') qa.deviation(3, 'a row with the status "draft"', `the new log reads "${status}"`);
  });
  await qa.step(4, async () => {
    expect(await g.save({ Document: id }, 'Approve log')).toContain(SAVED);
    await expectStatus(qa, 4, g, id, 'approved');
  });
});

qaTest('TC-APP024-008', async ({ page, qa }) => {
  const g = logs(page);
  const loc = await location(page, qa, { shifts: [['X Pagi', '2'], ['X Sore', '1']], activity: true });
  await qa.step(1, async () => {
    refused(qa, 1, await g.save(LOG(qa, loc, { Name: '' })), 'Please Select the Shift and Date');
    refused(qa, 1, await g.save(LOG(qa, loc, { 'Start / date': '' })), 'Please Select the Shift and Date');
  });
  await qa.step(2, async () => {
    expect(await g.save(LOG(qa, loc))).toContain(SAVED);
    refused(qa, 2, await g.save(LOG(qa, loc)), 'The Shift is Already Added in the Selected Date');
  });
  await qa.step(3, async () => refused(qa, 3, await g.save({ Document: '' }, 'Approve log'), 'document is missing'));
});

qaTest('TC-APP024-009', async ({ page, qa }) => {
  const g = logs(page);
  const loc = await location(page, qa, { shifts: [['X Pagi', '2'], ['X Sore', '1']], activity: true });
  await qa.step(1, async () => {
    const toasts = await g.save(LOG(qa, loc, { Name: qa.prefix('X Malam') }));
    qa.note(1, `a shift the location does not have: "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await g.save(LOG(qa, loc, { 'Start / date': addDays(todayWib(), -1), [PQ]: '9' }));
    qa.note(2, `9 people on a shift of 2: "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const toasts = await g.save(LOG(qa, loc, { 'Start / date': addDays(todayWib(), 31) }));
    qa.note(3, `a log dated next month: "${toasts.join(' / ')}"`);
  });
  await qa.step(4, async () => {
    const r = await g.create(LOG(qa, loc, { 'Start / date': addDays(todayWib(), -2) }));
    expect(r.toasts).toContain(SAVED);
    const first = await g.save({ Document: r.id }, 'Approve log');
    const second = await g.save({ Document: r.id }, 'Approve log');
    qa.note(4, `approved twice: "${first.join(' / ')}", then "${second.join(' / ')}"`);
  });
});

qaTest('TC-APP024-010', async ({ page, qa }) => {
  const b = bills(page);
  const id = await contract(page, qa);
  await qa.step(1, async () => {
    await page.goto('/id/housekeeping');
    await page.getByRole('main').getByRole('link', { name: 'Bills' }).click();
    await expect(b.main.getByRole('heading', { level: 1, name: 'Bills' })).toBeVisible();
    for (const x of ['New', 'Search', 'CSV']) await expect(b.main.getByRole('button', { name: x, exact: true })).toBeVisible();
    await expect(b.main.getByRole('columnheader')).toHaveText(['Status', 'Detail', 'Code', '']);
  });
  await qa.step(2, async () => {
    await b.main.getByRole('button', { name: 'New', exact: true }).click();
    for (const f of ['Document', 'Amount']) await expect(b.dialog.getByRole('textbox', { name: f })).toBeVisible();
    await expect(b.dialog.getByRole('combobox', { name: 'Action' })).toHaveCount(0);
  });
  await qa.step(3, async () => {
    const r = await b.create({ Document: id, Amount: '9000000' });
    expect(r.toasts).toContain(SAVED);
    expect(r.id).not.toBe('');
  });
  await qa.step(4, async () => {
    await page.goto('/id/finance/vouchers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const rows = (await page.getByRole('table').getByRole('row').filter({ hasText: 'QA-PT Bersih Uji' }).allInnerTexts()).map((x) => x.replace(/\s+/g, ' '));
    qa.note(4, `vouchers of the vendor on the first page: ${rows.slice(0, 2).join(' ; ') || 'none'}`);
  });
  await qa.step(5, async () => {
    const rows = await b.list(id);
    qa.note(5, `search by the contract id: ${rows.length} row(s)`);
    expect(rows.every((r) => r.join(' ').includes(id))).toBe(true);
  });
  await qa.step(6, async () => {
    await b.open();
    const before = await b.main.innerText();
    await b.main.getByRole('button', { name: 'CSV', exact: true }).click();
    await expect.poll(async () => (await b.main.innerText()) !== before, { timeout: 5_000 }).toBe(true).catch(() => {});
    qa.note(6, `after "CSV": "${(await b.main.innerText()).replace(/\s+/g, ' ').slice(-160)}"`);
  });
});

qaTest('TC-APP024-011', async ({ page, qa }) => {
  const b = bills(page);
  await qa.step(1, async () => refused(qa, 1, await b.save({ Document: await contract(page, qa, 'sent'), Amount: '9000000' }), 'approve the contract first'));
  const id = await contract(page, qa);
  await qa.step(2, async () => refused(qa, 2, await b.save({ Document: id, Amount: '0' }), 'amount must be positive'));
  await qa.step(3, async () => refused(qa, 3, await b.save({ Document: '', Amount: '9000000' }), 'document is missing'));
});

qaTest('TC-APP024-012', async ({ page, qa }) => {
  const b = bills(page);
  const id = await contract(page, qa);
  await qa.step(1, async () => {
    const toasts = await b.save({ Document: id, Amount: '9000000' });
    qa.note(1, `a bill with no approved log: "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await b.save({ Document: id, Amount: '999000000' });
    qa.note(2, `a bill far above people x shifts x price: "${toasts.join(' / ')}"`);
  });
  await qa.step(3, async () => {
    const a = await b.save({ Document: id, Amount: '9000000' });
    const c = await b.save({ Document: id, Amount: '9000000' });
    qa.note(3, `the same bill twice: "${a.join(' / ')}", "${c.join(' / ')}"`);
  });
  await qa.step(4, async () => {
    const c = contracts(page);
    const old = await c.create(CONTRACT(qa, { 'Start / date': '2025-01-01', [CEF]: '2025-12-31' }));
    for (const a of ['Send contract', 'Approve contract']) await c.save({ Document: old.id }, a);
    const toasts = await b.save({ Document: old.id, Amount: '9000000' });
    qa.note(4, `a contract that ended 2025-12-31: "${toasts.join(' / ')}"`);
  });
  await qa.step(5, async () => {
    await b.openDialog();
    await expect(b.dialog.getByRole('textbox', { name: 'Amount' })).toHaveValue('1500');
    qa.note(5, 'the dialog opens with the sample amount 1500');
  });
});

qaTest('TC-APP024-013', async ({ page, qa }) => {
  let loc = '';
  await qa.step(1, async () => {
    loc = await location(page, qa, { shifts: [['X Pagi', '2'], ['X Sore', '1']], activity: true });
    expect(await locations(page).save({ [LOC]: loc }, 'Match')).toContain(SAVED);
  });
  let id = '';
  await qa.step(2, async () => {
    id = await contract(page, qa);
    // The list holds only its first 40 contracts (blocker 40): a new one is often not there to be read.
    const status = await contracts(page).status(id);
    if (status) expect(status).toBe('approved');
    else qa.blocked(2, 40);
  });
  await qa.step(3, async () => {
    const g = logs(page);
    for (const shift of ['X Pagi', 'X Sore']) {
      const r = await g.create(LOG(qa, loc, { Name: qa.prefix(shift), [PQ]: shift === 'X Pagi' ? '2' : '1' }));
      expect(r.toasts).toContain(SAVED);
      expect(await g.save({ Document: r.id }, 'Approve log')).toContain(SAVED);
    }
    qa.note(3, 'the logs of one day (both shifts) stand for the month');
  });
  await qa.step(4, async () => {
    expect(await bills(page).save({ Document: id, Amount: '300000' })).toContain(SAVED);
  });
  await qa.step(5, async () => {
    qa.note(5, 'no screen shows the logs of a contract, their total or a proposed bill amount (as the workbook says)');
    const c = contracts(page);
    if (!(await c.list(id)).length) qa.blocked(5, 40);
  });
  await qa.step(6, async () => {
    const c = contracts(page);
    await c.openDialog();
    const fields = await c.dialog.getByRole('textbox').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
    expect(fields.some((f) => /location/i.test(f))).toBe(false);
  });
});

qaTest('TC-APP024-014', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): a contract sent for approval and an approved one.
  const sent = await contract(page, qa, 'sent');
  const approved = await contract(page, qa);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 opens ${(await menuScreens(staff, '/housekeeping', ['Locations', 'Contracts', 'Bills'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      refused(qa, 2, await locations(staff).save({ [LOC]: qa.code('X-LT1'), Name: qa.name('X Lantai tanpa hak'), [CEF]: CENTER, [PQ]: '3' }), 'missing required privilege');
    });
    await qa.step(3, async () => {
      refused(qa, 3, await contracts(staff).save({ Document: sent }, 'Approve contract'), 'missing required privilege');
      // The list holds only its first 40 contracts (blocker 40): the status is read when the contract is there.
      const status = await contracts(page).status(sent);
      if (status) expect(status).toBe('sent');
      else qa.note(3, 'the status of the contract cannot be read: the list shows its first 40 contracts (found blocker 40)');
    });
    await qa.step(4, async () => {
      refused(qa, 4, await bills(staff).save({ Document: approved, Amount: '300000' }), 'missing required privilege');
    });
    await qa.step(5, async () => {
      const b = bills(staff);
      await b.open();
      const before = await b.main.innerText();
      await b.main.getByRole('button', { name: 'CSV', exact: true }).click();
      const changed = await expect.poll(async () => (await b.main.innerText()) !== before, { timeout: 5_000 }).toBe(true).then(() => true, () => false);
      qa.note(5, `"CSV" for U3: ${changed ? 'the export is shown' : 'nothing changes'} (TBD in the workbook)`);
    });
    await qa.step(6, async () => {
      const entries = await auditEntries(page, 'housekeeping');
      qa.note(6, `Audit Log, module "housekeeping": ${entries.length} entries${entries[0] ? `, newest "${entries[0].slice(0, 120)}"` : ''} (TBD in the workbook: no entry is written)`);
    });
  } finally {
    await staff.context().close();
  }
});

const ROUTES: [string, string, string][] = [
  ['TC-APP024-015', '/housekeeping', 'Housekeeping'],
  ['TC-APP024-016', '/housekeeping/bills', 'Bills'],
  ['TC-APP024-017', '/housekeeping/contracts', 'Contracts'],
  ['TC-APP024-018', '/housekeeping/locations', 'Locations'],
  ['TC-APP024-019', '/housekeeping/logs', 'Daily logs'],
];
for (const [id, route, heading] of ROUTES) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
