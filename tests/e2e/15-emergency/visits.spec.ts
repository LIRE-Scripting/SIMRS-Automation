import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { bedWithId, patientWithId } from '../shared/internal-ids';

/**
 * 15-emergency.xlsx, the old Visits screen (/emergency/visits): create a visit
 * by the patient's internal id, one-click triage, assign a bay by the bed's
 * internal id. The ids are read from the server answers of Registered patients
 * and Bed management (shown on no screen, Q27). Patients and beds are made per
 * test. The Visits screen is not in the Emergency menu; it opens by its address.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

class VisitsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Visits' });
    this.table = this.main.getByRole('table');
  }
  async open(): Promise<void> {
    await this.page.goto('/en/emergency/visits');
    await expect(this.heading).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }
  /** Cells: Priority, Patient (first 8 characters of the id), Bed, Triage at, From, Status, Actions. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  /** The row of a patient's visit (by the first 8 characters of the patient id), paging from page 1. */
  async row(patientId: string): Promise<Locator> {
    await this.open();
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: new RegExp(`^${patientId.slice(0, 8)}…?$`) }) });
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
  async create(patientId: string): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'Create visit' }).click();
    const d = this.page.getByRole('dialog', { name: 'Create visit' });
    await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(patientId);
    const mark = await toastMark(this.page);
    await d.getByRole('button', { name: /^(Create|Saving…)$/ }).click();
    return toastsAfter(this.page, mark);
  }
  async act(patientId: string, name: 'Triage' | 'Assign bay'): Promise<string[]> {
    const row = await this.row(patientId);
    const mark = await toastMark(this.page);
    await row.getByRole('button', { name, exact: true }).press('Enter');
    return toastsAfter(this.page, mark);
  }
  async assignBay(patientId: string, bedId: string): Promise<string[]> {
    const row = await this.row(patientId);
    await row.getByRole('button', { name: 'Assign bay', exact: true }).press('Enter');
    const d = this.page.getByRole('dialog', { name: 'Assign bay' });
    await d.getByRole('textbox', { name: 'Bed ID (UUID)' }).fill(bedId);
    const mark = await toastMark(this.page);
    await d.getByRole('button', { name: 'Assign bay' }).click();
    return toastsAfter(this.page, mark);
  }
}

const patient = (page: Page, qa: Qa, name = 'QA-EMG Pasien Satu') => patientWithId(page, name, qa.token());

qaTest('TC-APP015-001', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  const d = page.getByRole('dialog', { name: 'Create visit' });
  qa.note(1, 'Visits is not in the Emergency menu or hub; it is opened by its address');

  await qa.step(1, async () => {
    await v.open();
    await expect(v.main.getByText('IGD visits with triage priority queue.', { exact: true })).toBeVisible();
    await expect(v.table).toBeVisible();
    await expect(v.main.getByRole('button', { name: 'Create visit' })).toBeVisible();
  });
  await qa.step(2, async () => {
    await v.main.getByRole('button', { name: 'Create visit' }).click();
    await expect(d.getByText('Record an emergency visit for a patient.', { exact: true })).toBeVisible();
    await expect(d.getByRole('textbox')).toHaveCount(1);
    await expect(d.getByRole('textbox', { name: 'Patient ID (UUID)' })).toBeVisible();
  });
  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(pt.id);
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Create' }).click();
    expect(await toastsAfter(page, mark)).toContain('Visit created');
  });
  await qa.step(4, async () => {
    const row = await v.row(pt.id);
    const c = await v.cells(row);
    expect([c[0], c[1].replace('…', ''), c[2], c[3], c[5]]).toEqual(['1', pt.id.slice(0, 8), '—', '—', 'Awaiting triage']);
    qa.note(4, `From "${c[4]}"`);
    for (const b of ['Triage', 'Assign bay']) await expect(row.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
});

qaTest('TC-APP015-002', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  expect(await v.create(pt.id)).toContain('Visit created');
  await qa.step(1, async () => {
    expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
  });
  await qa.step(2, async () => {
    const row = await v.row(pt.id);
    const c = await v.cells(row);
    expect([c[0], c[5]]).toEqual(['2', 'Triaged']);
    expect(c[3]).not.toBe('—');
    await expect(row.getByRole('button', { name: 'Triage', exact: true })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Assign bay', exact: true })).toBeVisible();
  });
});

qaTest('TC-APP015-003', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  const bed = await bedWithId(page, qa.code('X-IGD-01'));
  qa.note(1, `BED-1 is a bed of this test (${bed.no}) made in Inpatient, Bed management`);
  expect(await v.create(pt.id)).toContain('Visit created');
  expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
  const d = page.getByRole('dialog', { name: 'Assign bay' });

  await qa.step(1, async () => {
    const row = await v.row(pt.id);
    await row.getByRole('button', { name: 'Assign bay', exact: true }).press('Enter');
    await expect(d).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Bed ID (UUID)' })).toBeVisible();
    qa.note(1, `dialog: ${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 120)}`);
  });
  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Bed ID (UUID)' }).fill(bed.id);
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Assign bay' }).click();
    expect(await toastsAfter(page, mark)).toContain('Bay assigned');
  });
  await qa.step(3, async () => {
    const row = await v.row(pt.id);
    const c = await v.cells(row);
    expect([c[2].replace('…', ''), c[5]]).toEqual([bed.id.slice(0, 8), 'In bay']);
    if (c[0] !== '4') qa.deviation(3, 'Priority 4', `Priority ${c[0]}`);
    await expect(row.getByRole('button')).toHaveCount(0);
  });
});

qaTest('TC-APP015-004', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push(await patient(page, qa));
  for (const p of pts) expect(await v.create(p.id)).toContain('Visit created');
  for (const p of pts.slice(2)) expect(await v.act(p.id, 'Triage')).toContain('Triage recorded');
  for (const p of pts.slice(4)) {
    const bed = await bedWithId(page, qa.code('X-IGD-01'));
    expect(await v.assignBay(p.id, bed.id)).toContain('Bay assigned');
  }
  qa.note(1, 'six visits of this test: two awaiting triage, two triaged, two in a bay');

  await qa.step(1, async () => {
    await v.open();
    await expect(v.table.getByRole('columnheader')).toHaveText(['Priority', 'Patient', 'Bed', 'Triage at', 'From', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    const prios = await v.rows().evaluateAll((rs) => rs.map((r) => Number(r.querySelector('td')?.textContent ?? '0')));
    qa.note(2, `priorities on page 1: ${prios.join(', ')}`);
    expect(prios).toEqual([...prios].sort((a, b) => a - b));
  });
  await qa.step(3, async () => {
    const statuses = new Set(await v.rows().evaluateAll((rs) => rs.map((r) => (r.querySelectorAll('td')[5]?.textContent ?? '').trim())));
    for (const s of ['Awaiting triage', 'Triaged', 'In bay']) expect([...statuses]).toContain(s);
  });
});

qaTest('TC-APP015-008', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  await qa.step(1, async () => {
    const toasts = await v.create(pt.fullName);
    expect(toasts).not.toContain('Visit created');
    qa.deviation(1, 'A list of matching patients to pick from', `"Patient ID (UUID)" takes the internal id only; the name is refused ("${toasts.join(' / ')}")`);
  });
  await qa.step(2, async () => {
    qa.deviation(2, 'Not needed; if looked for, it is shown', 'Registered patients shows no internal id; the test reads it from the server answer');
  });
  await qa.step(3, async () => {
    expect(await v.create(pt.id)).toContain('Visit created');
    expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
    const toasts = await v.assignBay(pt.id, 'QA-IGD-01');
    expect(toasts).not.toContain('Bay assigned');
    qa.deviation(3, 'A list of free beds to pick from', `"Bed ID (UUID)" takes the internal id only; the bed number is refused ("${toasts.join(' / ')}")`);
    await page.getByRole('dialog', { name: 'Assign bay' }).getByRole('button', { name: /Cancel|Close/ }).first().click().catch(() => {});
  });
  await qa.step(4, async () => {
    const c = await v.cells(await v.row(pt.id));
    if (!c.join(' ').includes(pt.fullName)) qa.deviation(4, "The patient's name and MRN and the bed number are shown", `the row shows ${c.slice(0, 3).join(' | ')}`);
  });
});

qaTest('TC-APP015-009', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const ankle = await patient(page, qa);
  const chest = await patient(page, qa);
  for (const p of [ankle, chest]) expect(await v.create(p.id)).toContain('Visit created');
  await qa.step(1, async () => {
    const row = await v.row(chest.id);
    await row.getByRole('button', { name: 'Triage', exact: true }).press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    if (!(await page.getByRole('dialog').count())) qa.deviation(1, 'A form for the triage level or colour, the complaint and the vital signs', '"Triage" is one click that stores the time');
  });
  await qa.step(2, async () => {
    expect(await v.act(ankle.id, 'Triage')).toContain('Triage recorded');
    await v.open();
    const ids = await v.rows().evaluateAll((rs) => rs.map((r) => (r.querySelectorAll('td')[1]?.textContent ?? '').trim().replace('…', '')));
    const ci = ids.indexOf(chest.id.slice(0, 8));
    const ai = ids.indexOf(ankle.id.slice(0, 8));
    if (ci > ai) qa.deviation(2, 'The chest-pain patient moves above the ankle patient in the list', 'no urgency can be saved; the ankle patient, who arrived first, stays above');
  });
  await qa.step(3, async () => {
    qa.deviation(3, 'The triage level of each patient', 'the Priority column is the step of the visit (1 waiting, 2 triaged, 4 in a bay)');
  });
});

qaTest('TC-APP015-012', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  const bed = await bedWithId(page, qa.code('X-IGD-02'));
  expect(await v.create(pt.id)).toContain('Visit created');
  expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
  expect(await v.assignBay(pt.id, bed.id)).toContain('Bay assigned');
  const buttons = await (await v.row(pt.id)).getByRole('button').allInnerTexts();
  await qa.step(1, async () => {
    if (!buttons.some((b) => /change/i.test(b))) qa.deviation(1, 'A "Change bay" action', 'no button is left on the row');
  });
  await qa.step(2, async () => {
    if (!buttons.some((b) => /free|release|discharge/i.test(b))) qa.deviation(2, 'The bay is freed when the patient leaves', 'nothing frees the bay');
  });
  await qa.step(3, async () => {
    if (!buttons.some((b) => /undo/i.test(b))) qa.deviation(3, 'An undo of the triage click', 'none');
  });
});

qaTest('TC-APP015-014', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  const bed = await bedWithId(page, qa.code('X-IGD-01'));
  expect(await v.create(pt.id)).toContain('Visit created');
  expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
  expect(await v.assignBay(pt.id, bed.id)).toContain('Bay assigned');
  const buttons = await (await v.row(pt.id)).getByRole('button').count();
  for (const [step, expected] of [[1, 'A discharge with time and outcome'], [2, 'A hand-over to Inpatient that keeps the patient and the visit'], [3, 'An outcome for each; the status "Death" for the fourth']] as const) {
    await qa.step(step, async () => {
      if (!buttons) qa.deviation(step, expected, 'the row of a visit "In bay" has no button');
    });
  }
  qa.notRun(4, 'needs the list read the next day (time-dependent, Q16)');
});

qaTest('TC-APP015-015', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const waiting = await patient(page, qa);
  expect(await v.create(waiting.id)).toContain('Visit created');
  await v.open();
  const total = Number(((await v.main.getByText(/^Showing \d+–\d+ of \d+$/).innerText()).match(/of (\d+)$/) ?? ['', '0'])[1]);
  const inBay = Math.max(0, 10 - 0);
  for (let i = 0; i < inBay; i++) {
    const p = await patient(page, qa);
    const bed = await bedWithId(page, qa.code('X-IGD-01'));
    expect(await v.create(p.id)).toContain('Visit created');
    expect(await v.assignBay(p.id, bed.id)).toContain('Bay assigned');
  }
  qa.note(1, `${total} visit(s) before; one waiting visit of this test, then ten newer visits put in a bay`);

  await qa.step(1, async () => {
    await v.open();
    const first = await v.cells(v.rows().first());
    const onPage1 = await v.rows().filter({ has: page.getByRole('cell', { name: new RegExp(`^${waiting.id.slice(0, 8)}…?$`) }) }).count();
    qa.note(1, `first row: ${first.join(' | ')}`);
    if (!onPage1 || first[1].replace('…', '') !== waiting.id.slice(0, 8)) qa.deviation(1, 'The oldest waiting patient is the first row', onPage1 ? `first row is ${first[1]}` : 'the waiting patient is not on page 1 (pages are cut by arrival time, newest first)');
  });
  await qa.step(2, async () => {
    const first = await v.rows().first().innerText();
    await v.main.getByRole('button', { name: 'Next page' }).press('Enter');
    await expect(v.rows().first()).not.toHaveText(first);
    const onPage2 = await v.rows().filter({ has: page.getByRole('cell', { name: new RegExp(`^${waiting.id.slice(0, 8)}…?$`) }) }).count();
    qa.note(2, `the waiting patient is ${onPage2 ? '' : 'not '}on page 2`);
  });
});

qaTest('TC-APP015-016', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
  await qa.step(1, async () => {
    expect(await v.create(pt.id)).toContain('Visit created');
    const from = (await v.cells(await v.row(pt.id)))[4];
    qa.note(1, `created about ${todayWib()} ${now} WIB; "From" shows "${from}"`);
    if (!from.includes(now.slice(0, 2))) qa.deviation(1, `Today ${now} (WIB)`, `"${from}" (world time, seven hours behind)`);
  });
  await qa.step(2, async () => {
    expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
    const at = (await v.cells(await v.row(pt.id)))[3];
    if (!at.includes(now.slice(0, 2))) qa.deviation(2, `Today about ${now} (WIB)`, `"${at}"`);
  });
});

qaTest('TC-APP015-058', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  await qa.step(1, async () => {
    await page.goto('/en/emergency');
    const links = (await page.getByRole('main').getByRole('link').allInnerTexts()).concat(await page.getByRole('complementary').getByRole('link').allInnerTexts());
    qa.note(1, `hub and menu: ${links.map((l) => l.trim()).filter(Boolean).join(', ')}`);
    expect(links.some((l) => /^Visits$/.test(l.trim()))).toBe(false);
  });
  await qa.step(2, async () => {
    expect(await v.create(pt.id)).toContain('Visit created');
    expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
    const bed = await bedWithId(page, qa.code('X-IGD-01'));
    expect(await v.assignBay(pt.id, bed.id)).toContain('Bay assigned');
    const c = await v.cells(await v.row(pt.id));
    expect(c[5]).toBe('In bay');
    qa.note(2, `listed with Priority ${c[0]}`);
  });
  await qa.step(3, async () => {
    await page.goto('/en/emergency/patients');
    await page.getByRole('main').getByRole('searchbox', { name: 'Search' }).fill(pt.fullName);
    const onPatients = await page.getByRole('main').getByRole('row').filter({ hasText: pt.fullName }).count();
    await page.goto('/en/emergency/layout');
    const onLayout = await page.getByRole('main').getByText(pt.fullName).count();
    qa.note(3, `Emergency Patients ${onPatients ? 'lists' : 'does not list'} the patient; Emergency Layout ${onLayout ? 'shows' : 'does not show'} it`);
  });
});
