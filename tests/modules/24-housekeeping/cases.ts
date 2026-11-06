import type { Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { todayWib } from '../../../lib/dates';
import { Desk, SAVED } from '../shared/desk';
import { expectStatus } from '../shared/desk-status';

/**
 * Test cases of 24-housekeeping that end-to-end chains run too (tests/e2e/chains/, E2E-047):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const CENTER = 'QA-UNIT-1';
export const locations = (p: Page) => new Desk(p, '/housekeeping/locations', 'Locations', 'New location');
export const contracts = (p: Page) => new Desk(p, '/housekeeping/contracts', 'Contracts', 'New');
export const logs = (p: Page) => new Desk(p, '/housekeeping/logs', 'Daily logs', 'New');
export const bills = (p: Page) => new Desk(p, '/housekeeping/bills', 'Bills', 'New');

export const LOC = 'Location code';
export const CEF = 'Center / end / frequency';
export const PQ = 'People / quantity';

/** A location of the test with its manpower; optionally its shifts, an activity and a material. */
export async function location(page: Page, qa: Qa, opts: { people?: string; shifts?: [string, string][]; activity?: boolean } = {}): Promise<string> {
  const l = locations(page);
  const code = qa.code('X-LT1');
  expect(await l.save({ [LOC]: code, Name: qa.name('X Lantai 1 uji'), [CEF]: CENTER, [PQ]: opts.people ?? '3' })).toContain(SAVED);
  for (const [shift, n] of opts.shifts ?? []) expect(await l.save({ [LOC]: code, Name: qa.prefix(shift), [PQ]: n }, 'Save shift')).toContain(SAVED);
  if (opts.activity) expect(await l.save({ [LOC]: code, Name: qa.prefix('X Mengepel'), [CEF]: 'daily' }, 'Save activity')).toContain(SAVED);
  return code;
}

export const CONTRACT = (qa: Qa, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-HK-001'),
  Name: qa.prefix('X PT Bersih Uji'),
  'Start / date': '2026-11-01',
  [CEF]: '2027-10-31',
  ...extra,
});

/** A contract of the test; "approved" also saves a price line, sends and approves it. */
export async function contract(page: Page, qa: Qa, state: 'draft' | 'sent' | 'approved' = 'approved'): Promise<string> {
  const c = contracts(page);
  const { toasts, id } = await c.create(CONTRACT(qa));
  expect(toasts).toContain(SAVED);
  if (state === 'approved') expect(await c.save({ Document: id, [CEF]: qa.prefix('X per orang per shift'), Amount: '150000' }, 'Price line')).toContain(SAVED);
  if (state !== 'draft') expect(await c.save({ Document: id }, 'Send contract')).toContain(SAVED);
  if (state === 'approved') expect(await c.save({ Document: id }, 'Approve contract')).toContain(SAVED);
  return id;
}

export const LOG = (qa: Qa, loc: string, extra: Record<string, string> = {}) => ({
  Number: qa.code('X-LOG-001'),
  [LOC]: loc,
  Name: qa.prefix('X Pagi'),
  'Start / date': todayWib(),
  [PQ]: '2',
  ...extra,
});


/** TC-APP024-001: a ward location with two shifts, an activity and a material (E2E-047 step 3). */
export const TC_APP024_001 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};

/** TC-APP024-007: a daily log of the location, approved (E2E-047 step 4). */
export const TC_APP024_007 = async ({ page, qa }: CaseArgs): Promise<void> => {
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
};
