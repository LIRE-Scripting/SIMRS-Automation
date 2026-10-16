import { expect, qaTest } from '../../../fixtures/e2e';
import { AdmissionsPage } from '../../../pages/inpatient/InpatientPages';

/**
 * 04-inpatient.xlsx, Admissions tab "Ward supply" (group, receipt or refusal,
 * return requests). Their preconditions are records of other applications:
 * inpatient orders OR-1/OR-2 (03 Patient Care), stores ST-IP/ST-OP
 * (07 Inventory) and medicine dispensed and issued to a stay (05 Pharmacy).
 * What the screen shows without them is checked here; the rest is not run
 * until those modules are automated (open question Q20).
 */

qaTest('TC-APP004-044', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
  qa.notRun(1, 'needs ST-OP "a store allowed for outpatient only" (00-test-data.xlsx | Catalogue, row 60; made in 07 Inventory)');
  qa.notRun(2, 'needs ST-IP "QA Depo Rawat Inap" (Catalogue row 59; 07 Inventory)');
  await qa.step(3, async () => {
    await expect(adm.main.getByText('Pending inpatient orders', { exact: true })).toBeVisible();
    qa.note(3, 'OR-1/OR-2 (Catalogue row 61) are not made yet; only the block is checked');
  });
  qa.notRun(4, 'needs OR-1 in an open group and OR-2 pending (03 Patient Care, 05 Pharmacy)');
});

qaTest('TC-APP004-046', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
  await expect(adm.main.getByText('Record receipt, or refuse. A refusal is the pharmacy return.')).toBeVisible();
  qa.notRun(1, 'needs an open ward group dispensed in full (05 Pharmacy)');
  qa.notRun(2, 'needs a refused group (step 1)');
});

qaTest('TC-APP004-047', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
  await expect(adm.main.getByText('Request a return for lines already issued to this stay.')).toBeVisible();
  for (const s of [1, 2, 3, 4, 5]) qa.notRun(s, 'needs a stay with 10 issued and 4 returned and a pending request of 3 (05 Pharmacy)');
});

qaTest('TC-APP004-048', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await qa.step(1, async () => {
    await adm.open();
    await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
    for (const h of ['Store', 'Ward supply', 'Stay']) await expect(adm.main.getByRole('heading', { level: 2, name: h })).toBeVisible();
  });
  qa.notRun(2, 'needs "QA-INP Zulkifli" on page 2 with issued medicine (05 Pharmacy)');
});
