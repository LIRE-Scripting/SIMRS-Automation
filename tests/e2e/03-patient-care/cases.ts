import { registerPatient } from '../../../lib/ambulatory-data';
import { PT1_DATE_OF_BIRTH, orderFor, CLINICAL } from '../../../lib/clinical-data';
import { type DrugOrder, ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { toastLocator } from '../../../lib/assertions';
import { expect } from '../../../fixtures/e2e';
import type { Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 03-patient-care that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP003_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const c = new ConsultationPage(page);
  const [a, b] = CLINICAL.warningPair;
  await c.openFor(await newPt1(page, qa));
  await c.showTab('Prescription');

  const warning = c.panel.getByText(`Soft warning (sandbox): ${a} with ${b} — acknowledge to continue.`);
  await addLine(c, orderFor(a));
  await addLine(c, orderFor(b));
  await c.checkInteractions().click();
  if (!(await warning.isVisible())) {
    // The pair is not on the site (found blocker 22): no warning, nothing to acknowledge.
    qa.blocked(1, 22);
    qa.blocked(2, 22);
  } else {
    await qa.step(1, async () => {
      await expect(c.panel.getByRole('button', { name: 'Acknowledge' })).toBeVisible();
      await expect(c.submitPrescription()).toBeDisabled();
    });
    await qa.step(2, async () => {
      await c.panel.getByRole('button', { name: 'Acknowledge' }).click();
      await expect(c.panel.getByText('Acknowledged')).toBeVisible();
      await expect(c.submitPrescription()).toBeEnabled();
    });
  }

  await qa.step(3, async () => {
    await c.submitPrescription().click();
    await expect(toastLocator(page, /^Prescription order placed\.$/)).toBeVisible();
  });
};

export async function newPt1(page: Page, qa: Qa): Promise<Patient> {
  return registerPatient(page, CLINICAL.pt1.name, qa.token(), PT1_DATE_OF_BIRTH);
}

/** Adds one prescription line (the formulary is filled, then "Add"). */
export async function addLine(c: ConsultationPage, o: DrugOrder): Promise<void> {
  await c.fillOrder(o);
  await expect(c.addLine()).toBeEnabled();
  await c.addLine().click();
  await expect(c.panel.getByText(o.Drug).first()).toBeVisible();
}

/**
 * 03-patient-care.xlsx, feature "Consultation (/clinical/consultation)".
 * Every test registers its own PT-1 ("QA-PCR Pasien Satu" + a new token) and
 * works on that patient only. Orders placed here stay in the pharmacy queue
 * (no cancel on the site; Cleanup Requirements).
 */

export type Patient = { mrn: string; fullName: string };
