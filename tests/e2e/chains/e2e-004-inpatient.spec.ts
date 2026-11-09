import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { newType, REQUEST, Requests, Ward } from '../../modules/04-inpatient/helpers';
import { admitSteps, newBed } from './steps/inpatient-steps';
import { inpatientOrder } from '../../modules/03-patient-care/cases';
import { TC_APP005_005 } from '../../modules/05-pharmacy/evaluation-cases';
import { TC_APP013_040 } from '../../modules/13-dietary/cases';
import { TC_APP014_061 } from '../../modules/14-hospital-accounts/cases';
import { TC_APP004_011, TC_APP004_012 } from '../../modules/04-inpatient/admissions-cases';

/**
 * E2E-004: a patient is put on the admission waiting list, the request is
 * confirmed, the patient is admitted into a vacant bed and received on the
 * ward. The ward list "Ward care" does not offer the stay (found blocker 23),
 * so the chain stops at step 4 unless the list offers it; then it goes on to
 * the order, the ward supply and the diet, and stops at the kitchen (blocker 8).
 */
chainTest('E2E-004', async ({ page, chain }) => {
  await installToastRecorder(page);
  const r = new Requests(page);
  let patient = '';

  await chain.step(1, async (qa) => {
    await r.open();
    const type = await newType(r, qa);
    patient = qa.name('X Pasien Tunggu 01');
    await qa.step(1, async () => {
      for (const f of ['Patient', 'Estimate (IDR)', 'Estimate note']) await expect(r.form.getByRole('textbox', { name: f })).toBeVisible();
      expect((await r.typeSelect().locator('option').first().innerText()).trim()).toBe('Choose an active admission type');
      if (!(await r.form.getByRole('combobox', { name: 'Branch' }).count())) qa.deviation(1, 'A field "Branch"', 'no Branch field (U1 works on one branch)');
    });
    await qa.step(2, async () => {
      await r.request({ patient, type: type.name, ...REQUEST });
      await expect(toastLocator(page, /^Saved$/)).toBeVisible();
    });
    await qa.step(3, async () => {
      const item = r.requestItem(patient);
      await expect(item).toContainText(REQUEST.estimate);
      for (const b of ['Confirm', 'Reject', 'Cancel']) await expect(item.getByRole('button', { name: b })).toBeVisible();
    });
  });

  await chain.step(2, async (qa) => {
    await r.open();
    await qa.step(1, async () => {
      await r.requestItem(patient).getByRole('button', { name: 'Confirm' }).click();
      await expect(toastLocator(page, /^Request confirmed$/)).toBeVisible();
      await expect(r.requestItem(patient).getByRole('button')).toHaveCount(0);
    });
  });

  await chain.step(3, async (qa) => {
    const bed = await newBed(page, qa, 'QA-101');
    await admitSteps(page, qa, patient, bed);
    qa.note(1, 'the patient of the confirmed request is admitted by name');
  });

  await chain.step(4, async (qa) => {
    const w = new Ward(page);
    await qa.step(1, async () => {
      await page.goto('/id/adt');
      await page.getByRole('main').getByRole('link', { name: 'Ward', exact: true }).click();
      await expect(w.heading).toBeVisible();
    });
    await w.open();
    if (!(await w.choose(patient))) {
      qa.note(2, `the list "Ward care" offers ${(await w.stays.locator('option').count()) - 1} stay(s), not the stay of step 3`);
      qa.blocked(2, 23);
      return;
    }
    await qa.step(2, async () => {
      for (const c of ['Receive', 'Note', 'Doctor', 'Swap', 'Exceptional exit']) await expect(w.control(c)).toBeVisible();
    });
    await qa.step(3, async () => {
      await w.control('Receive').click();
      await expect(toastLocator(page, /^Patient received on the ward$/)).toBeVisible();
    });
  });

  // Steps 5-7 run their source test cases with their own records (an admitted patient with an inpatient order,
  // the ward group, the diet prescription); step 8 (the diet order reaching the kitchen) is blocked by checklist
  // blocker 8.
  await chain.step(5, (qa) => inpatientOrder({ page, qa }));
  await chain.step(6, (qa) => TC_APP005_005({ page, qa }));
  await chain.step(7, (qa) => TC_APP013_040({ page, qa }));
  chain.stopAsPlanned(8);
  await chain.step(9, (qa) => TC_APP014_061({ page, qa }));
  await chain.run(10, TC_APP004_011);
  await chain.run(11, TC_APP004_012);
  chain.stopAsPlanned(12);
});
