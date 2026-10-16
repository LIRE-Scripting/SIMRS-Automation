import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { Desk, SAVED } from '../../modules/shared/desk';
import { admitSteps, DESCRIPTION, dischargeSteps, newBed, transferSteps } from './steps/inpatient-steps';

/**
 * E2E-029: a bed is added, a patient admitted into it and found on the bed
 * list, moved to a second bed and discharged; the room is cleaned (daily log
 * of a housekeeping location with its shifts, approved) and the next patient
 * is admitted into the freed bed from the vacant-bed strip.
 */
const n = (s: string) => Number(s.replace(/[^\d.-]/g, ''));

chainTest('E2E-029', async ({ page, chain }) => {
  await installToastRecorder(page);
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  let patient = '';
  let second = '';

  const bed = await chain.step(1, async (qa) => {
    const no = qa.code('QA-101');
    const d = beds.dialog();
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /^Inpatient\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Bed management', exact: true }).click();
      await expect(beds.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await beds.main.getByRole('button', { name: 'Add bed' }).click();
      await expect(d.getByRole('checkbox', { name: 'Active' })).toBeChecked();
    });
    await qa.step(3, async () => {
      await beds.fill(d, { no, description: DESCRIPTION });
      await d.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
      await expect(toastLocator(page, /^Bed created$/)).toBeVisible();
    });
    await qa.step(4, async () => {
      await beds.search(no);
      await expect(await beds.cell(beds.row(no), 'Patient')).toHaveText('—');
      await expect(await beds.cell(beds.row(no), 'Status')).toHaveText('Active');
    });
    await qa.step(5, async () => {
      await adm.open();
      await expect(adm.stripCard(no)).toBeVisible();
    });
    return no;
  });

  await chain.step(2, async (qa) => {
    patient = qa.name('QA-INP Pasien Satu');
    await admitSteps(page, qa, patient, bed);
  });

  await chain.step(3, async (qa) => {
    const admissionNo = await adm.admissionNo(await adm.stay(patient));
    await qa.step(1, async () => {
      await beds.open();
      const total = n((await beds.pagingSummary().innerText()).split('of')[1]);
      if (total > 10) await expect(beds.rows()).toHaveCount(10);
      else qa.note(1, `precondition "more than 10 beds" not met: ${total}`);
    });
    await qa.step(2, async () => {
      await beds.search(bed);
      await expect(await beds.cell(beds.row(bed), 'Patient')).toHaveText(patient);
      await expect(await beds.cell(beds.row(bed), 'Admission no')).toHaveText(admissionNo);
    });
    await qa.step(3, async () => {
      await beds.search('qa-10');
      const nos = await beds.rows().evaluateAll((rs) => rs.map((r) => r.querySelector('td')?.textContent?.trim() ?? ''));
      expect(nos.length).toBeGreaterThan(0);
      for (const x of nos) expect(x.toLowerCase()).toContain('qa-10');
    });
    await qa.step(4, async () => {
      await beds.search(bed);
      await beds.show('Vacant only');
      await expect(beds.row(bed)).toHaveCount(0);
    });
    await qa.step(5, async () => {
      await beds.search('');
      await expect(beds.rows().first()).toBeVisible();
      for (const p of await beds.rows().all()) await expect(await beds.cell(p, 'Patient')).toHaveText('—');
    });
  });

  await chain.step(4, async (qa) => {
    second = await newBed(page, qa, 'QA-103');
    await transferSteps(page, qa, patient, bed, second);
  });

  await chain.step(5, async (qa) => dischargeSteps(page, qa, patient, second));

  await chain.step(6, async (qa) => {
    // Precondition: a housekeeping location with shifts (journey "Location"), made as in the module spec.
    const l = new Desk(page, '/housekeeping/locations', 'Locations', 'New location');
    const g = new Desk(page, '/housekeeping/logs', 'Daily logs', 'New');
    const loc = qa.code('X-LT1');
    expect(await l.save({ 'Location code': loc, Name: qa.name('X Lantai 1 uji'), 'Center / end / frequency': 'QA-UNIT-1', 'People / quantity': '3' })).toContain(SAVED);
    expect(await l.save({ 'Location code': loc, Name: qa.prefix('X Pagi'), 'People / quantity': '2' }, 'Save shift')).toContain(SAVED);
    qa.note(3, `the room of bed ${second} is logged on the location ${loc} of this run (a location is not tied to a bed on the site)`);
    let id = '';
    await qa.step(1, async () => {
      await page.goto('/en/housekeeping');
      await page.getByRole('main').getByRole('link', { name: 'Daily logs' }).click();
      await expect(g.main.getByRole('heading', { level: 1, name: 'Daily logs' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await g.main.getByRole('button', { name: 'New', exact: true }).click();
      await expect(g.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Log', 'Approve log']);
    });
    await qa.step(3, async () => {
      const r = await g.create({ Number: qa.code('X-LOG-001'), 'Location code': loc, Name: qa.prefix('X Pagi'), 'Start / date': todayWib(), 'People / quantity': '2' });
      expect(r.toasts).toContain(SAVED);
      id = r.id;
      const status = await g.status(id);
      if (status !== 'draft') qa.deviation(3, 'a row with the status "draft"', `the new log reads "${status}"`);
    });
    await qa.step(4, async () => {
      expect(await g.save({ Document: id }, 'Approve log')).toContain(SAVED);
      expect(await g.status(id)).toBe('approved');
    });
  });

  await chain.step(7, async (qa) => {
    const next = qa.name('QA-INP Pasien Dua');
    await adm.open();
    await qa.step(1, async () => {
      await expect(adm.main.getByText('Tap to admit into this bed.')).toBeVisible();
      await expect(adm.stripCard(second)).toHaveText(new RegExp(`${second}\\s*${DESCRIPTION}`));
    });
    await qa.step(2, async () => {
      await adm.stripCard(second).click();
      await expect(adm.wizard.getByRole('textbox', { name: 'Patient name' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(next);
      await adm.next();
      await expect(adm.wizard.getByRole('combobox', { name: 'Bed' })).toHaveValue(new RegExp(`${second}.*${DESCRIPTION}`));
    });
    await qa.step(4, async () => {
      await adm.next();
      await adm.wizard.getByRole('button', { name: 'Admit' }).click();
      await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
      await expect(await adm.cell(await adm.stay(next), 'Bed')).toHaveText(second);
    });
    qa.note(1, `the next patient takes bed ${second}, freed by the discharge of step 5`);
  });
});
