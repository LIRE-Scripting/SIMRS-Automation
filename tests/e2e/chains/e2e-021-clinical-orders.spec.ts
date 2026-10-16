import { chainTest, expect } from '../../../fixtures/chain';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { CLINICAL, PT1_DATE_OF_BIRTH } from '../../../lib/clinical-data';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { TC_APP003_005 } from '../03-patient-care/cases';
import { consultSteps } from './outpatient-steps';

/**
 * E2E-021: the doctor opens the consultation of PT-1 and records an allergy on
 * it; the prescription with a warning (TC-APP003-005) runs as its module case
 * (with its own patient). The chain stops at the first step a blocker stops;
 * the cause is recorded by the run.
 */
chainTest('E2E-021', async ({ page, chain }) => {
  await installToastRecorder(page);
  const c = new ConsultationPage(page);
  let pt = { mrn: '', fullName: '' };

  await chain.step(1, async (qa) => {
    pt = await registerPatient(page, CLINICAL.pt1.name, qa.token(), PT1_DATE_OF_BIRTH);
    await consultSteps(page, qa, pt);
  });

  await chain.step(2, async (qa) => {
    await c.openFor(pt);
    const note = qa.name('QA Amoksisilin');
    const input = c.pane.getByRole('textbox', { name: 'Allergy' });
    const save = input.locator('xpath=following::button[normalize-space()="Save"][1]');
    await qa.step(1, async () => {
      await expect(c.paneSection('Allergies')).toHaveText('Nothing recorded yet.');
      await expect(save).toBeVisible();
    });
    await qa.step(2, async () => {
      await input.fill(note);
      await save.click();
      await expect(toastLocator(page, /^Allergy recorded on this patient$/)).toBeVisible();
      await expect(c.paneSection('Allergies')).toContainText(note);
    });
  });

  await chain.step(3, (qa) => TC_APP003_005({ page, qa }));
});
