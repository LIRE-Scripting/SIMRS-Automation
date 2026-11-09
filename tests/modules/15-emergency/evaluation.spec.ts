import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { signedOutJourney, userPage } from '../shared/access';
import { bedWithId } from '../shared/internal-ids';
import { patient, toastsAfter, VisitsPage } from './helpers';

/**
 * 15-emergency.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10), on the old Visits screen (/emergency/visits:
 * the patient and the bay by their internal ids). Patients and beds are made
 * per test; BED-B is a bed of the test made by U6 (qa.kemayoran) in
 * Kemayoran. "Nurse 2" is U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const NO_BED = '00000000-0000-4000-8000-000000000000';

qaTest('TC-APP015-011', async ({ page, qa, browser }) => {
  const v = new VisitsPage(page);
  const [pt1, pt2] = [await patient(page, qa), await patient(page, qa, 'QA-EMG Pasien Dua')];
  const bed1 = await bedWithId(page, qa.code('X-IGD-01'));
  for (const p of [pt1, pt2]) {
    expect(await v.create(p.id)).toContain('Visit created');
    expect(await v.act(p.id, 'Triage')).toContain('Triage recorded');
  }
  expect(await v.assignBay(pt1.id, bed1.id)).toContain('Bay assigned');
  const occ = await bedWithId(page, qa.bed('X-IGD-OCC'));
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(`QA-INP Pasien Satu ${qa.token()}`, occ.no);
  const p6 = await userPage(browser, 'U6');
  let bedB = { id: '', no: '' };
  try {
    bedB = await bedWithId(p6, qa.code('X-IGD-B'));
  } finally {
    await p6.context().close();
  }
  qa.note(1, `PT-1 in bay on ${bed1.no}; PT-2 triaged; BED-OCC ${occ.no} holds an inpatient; BED-B ${bedB.no} made by U6 in Kemayoran`);
  const d = page.getByRole('dialog', { name: 'Assign bay' });
  // A bay the site gives PT-2 although it should refuse (a deviation) leaves PT-2 without "Assign bay": the later
  // steps then use another triaged patient of the test.
  let placed = false;
  const tryBed = async (st: number, id: string, what: string, expected: string) => {
    await qa.step(st, async () => {
      let who = pt2.id;
      if (placed) {
        const pt3 = await patient(page, qa, 'QA-EMG Pasien Tiga');
        expect(await v.create(pt3.id)).toContain('Visit created');
        expect(await v.act(pt3.id, 'Triage')).toContain('Triage recorded');
        who = pt3.id;
        qa.note(st, 'PT-2 was given a bay in an earlier step: a third patient of the test, triaged, stands for PT-2');
      }
      const toasts = await v.assignBay(who, id);
      qa.note(st, `${what}: "${toasts.join(' / ')}"`);
      if (toasts.includes('Bay assigned')) {
        placed = true;
        qa.deviation(st, expected, `PT-2 is given ${what}`);
      }
      else if (!toasts.some((t) => new RegExp(expected.replace(/^Refused: "?|"$/g, '').split(' ').slice(0, 2).join(' '), 'i').test(t))) qa.note(st, `refused with another text than "${expected}"`);
      if (await d.isVisible()) await d.getByRole('button', { name: /Cancel|Close/ }).first().click().catch(() => page.keyboard.press('Escape'));
    });
  };
  await tryBed(1, NO_BED, 'an id that no bed has', 'Refused: "bed not found"');
  await tryBed(2, bedB.id, `BED-B (${bedB.no}, Kemayoran)`, 'Refused: "bed not found"');
  await tryBed(3, bed1.id, `BED-1 (${bed1.no}, PT-1 lies on it)`, 'Refused: the bay is occupied');
  await tryBed(4, occ.id, `BED-OCC (${occ.no}, an inpatient's bed)`, 'Refused: the bed is occupied');
  await qa.step(5, async () => {
    const beds = new BedsPage(page);
    await beds.open();
    await beds.search(bed1.no);
    const row = (await beds.row(bed1.no).innerText()).replace(/\s+/g, ' ');
    qa.note(5, `Bed management, ${bed1.no}: "${row}"`);
    if (!/occupied|terisi/i.test(row)) qa.deviation(5, 'BED-1 is shown as occupied by the emergency patient', `the row reads "${row}"`);
  });
});

qaTest('TC-APP015-013', async ({ page, qa, browser }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  expect(await v.create(pt.id)).toContain('Visit created');
  expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(1, async () => {
      const toasts = await new VisitsPage(nurse2).create(pt.id);
      qa.note(1, `Nurse 2 creates a visit for PT-1 again: "${toasts.join(' / ')}"`);
      if (toasts.includes('Visit created')) qa.deviation(1, 'A warning that PT-1 already has an open visit', 'a second visit is created');
    });
  } finally {
    await nurse2.context().close();
  }
  await qa.step(2, async () => {
    const n = await (await v.row(pt.id)).count();
    qa.note(2, `${n} visit(s) of PT-1 on the page that holds them`);
    if (n !== 1) qa.deviation(2, 'One visit for PT-1', `${n} visits`);
  });
});

qaTest('TC-APP015-017', async ({ page, qa }) => {
  const v = new VisitsPage(page);
  const pt = await patient(page, qa);
  const bed = await bedWithId(page, qa.code('X-IGD-01'));
  expect(await v.create(pt.id)).toContain('Visit created');
  expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded');
  expect(await v.assignBay(pt.id, bed.id)).toContain('Bay assigned');
  await qa.step(1, async () => {
    const row = await v.row(pt.id);
    const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    await row.click().catch(() => {});
    const dialog = await page.getByRole('dialog').count();
    qa.note(1, `the visit row offers: ${buttons.join(', ') || 'nothing'}`);
    if (!dialog) qa.deviation(1, 'The complaint, vital signs, the doctor in charge and notes can be recorded on the visit', 'the visit has no form: only priority, bed, triage time and status');
  });
  await qa.step(2, async () => {
    const c = new ConsultationPage(page);
    await c.openFor(pt);
    const text = (await c.pane.innerText()).replace(/\s+/g, ' ');
    if (!/emergency|IGD|gawat/i.test(text)) qa.deviation(2, 'The emergency visit is shown, and orders are tied to it', 'the consultation shows no emergency visit');
  });
  qa.notRun(3, "the bill of PT-1 is read at the cashier, whose counter is closed until 07:00 WIB");
});

qaTest('TC-APP015-022', ({ qa, browser }) => signedOutJourney(browser, qa, '/emergency/visits', /\/(id|en)\/emergency\/visits/));

qaTest('TC-APP015-023', async ({ page, qa, browser }) => {
  const v = new VisitsPage(page);
  await qa.step(1, async () => {
    const pt3 = await patient(page, qa, 'QA-EMG Pasien Tiga');
    await v.open();
    await v.main.getByRole('button', { name: 'Create visit' }).click();
    const d = page.getByRole('dialog', { name: 'Create visit' });
    await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(pt3.id);
    await d.getByRole('button', { name: /^(Create|Saving…)$/ }).dblclick();
    await page.waitForTimeout(3000);
    const n = await (await v.row(pt3.id)).count();
    qa.note(1, `double-click on "Create": ${n} visit(s)`);
    if (n !== 1) qa.deviation(1, 'One visit. The button is disabled while it reads "Saving…"', `${n} visits`);
  });
  const pt = await patient(page, qa);
  expect(await v.create(pt.id)).toContain('Visit created');
  const nurse2 = await userPage(browser, 'U4');
  const v2 = new VisitsPage(nurse2);
  try {
    await qa.step(2, async () => {
      const [r1, r2] = [await v.row(pt.id), await v2.row(pt.id)];
      const m1 = await toastMark(page);
      await r1.getByRole('button', { name: 'Triage', exact: true }).press('Enter');
      const t1 = await toastsAfter(page, m1);
      const m2 = await toastMark(nurse2);
      await r2.getByRole('button', { name: 'Triage', exact: true }).press('Enter').catch(() => {});
      const t2 = await toastsAfter(nurse2, m2);
      qa.note(2, `Nurse: "${t1.join(' / ')}"; Nurse 2: "${t2.join(' / ')}"`);
      expect(t1).toContain('Triage recorded');
      if (t2.includes('Triage recorded')) qa.deviation(2, 'Nurse 2 is told that triage was already recorded', 'triage is recorded a second time');
    });
    await qa.step(3, async () => {
      const [b1, b2] = [await bedWithId(page, qa.code('X-IGD-01')), await bedWithId(page, qa.code('X-IGD-02'))];
      const r2 = await v2.row(pt.id);
      expect(await v.assignBay(pt.id, b1.id)).toContain('Bay assigned');
      const offered = await r2.getByRole('button', { name: 'Assign bay', exact: true }).count();
      if (!offered) return qa.note(3, 'Nurse 2 no longer sees "Assign bay"');
      await r2.getByRole('button', { name: 'Assign bay', exact: true }).press('Enter');
      const d = nurse2.getByRole('dialog', { name: 'Assign bay' });
      await d.getByRole('textbox', { name: 'Bed ID (UUID)' }).fill(b2.id);
      const m = await toastMark(nurse2);
      await d.getByRole('button', { name: 'Assign bay' }).click();
      const t2 = await toastsAfter(nurse2, m);
      qa.note(3, `Nurse 2 assigns ${b2.no}: "${t2.join(' / ')}"`);
      if (t2.includes('Bay assigned')) qa.deviation(3, 'Nurse 2 is told that the visit already has a bay', `the visit is moved to ${b2.no}`);
    });
  } finally {
    await nurse2.context().close();
  }
  await qa.step(4, async () => {
    await v.open();
    await v.main.getByRole('button', { name: 'Create visit' }).click();
    const d = page.getByRole('dialog', { name: 'Create visit' });
    await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill('0000-');
    let warned = false;
    page.once('dialog', (x) => {
      warned = true;
      void x.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await v.open();
    if (!warned && !(await d.isVisible().catch(() => false))) qa.deviation(4, 'The text is kept, or the nurse is warned', 'the half-typed id is lost with no warning');
  });
});
