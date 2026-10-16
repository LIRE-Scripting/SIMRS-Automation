import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { admitTypedSteps, dischargeSteps, newBed, transferSteps } from './steps/inpatient-steps';

/**
 * E2E-026: the newborn of a registered mother (PT-MOM, registered first as
 * the precondition) is registered with her, admitted with a typed admission
 * number, moved to another bed and discharged.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

chainTest('E2E-026', async ({ page, chain }) => {
  await installToastRecorder(page);
  const reg = new RegisteredPatientsPage(page);

  const baby = await chain.step(1, async (qa) => {
    const token = qa.token();
    // PT-MOM (00-test-data.xlsx | Catalogue): "QA-AMB Ibu Satu", date of birth 1995-08-09.
    await reg.open();
    const mom = await reg.register({ firstName: 'QA-AMB Ibu', lastName: `Satu ${token}`, dateOfBirth: '1995-08-09' });
    const name = `QA-AMB Bayi Ibu Satu ${token}`;
    await reg.open();
    const d = await reg.openRegister();
    await qa.step(1, async () => {
      await reg.visitTypeSelect(d).selectOption('Newborn');
      await expect(d.getByRole('textbox', { name: 'Born' })).toBeVisible();
      await expect(d.getByRole('textbox', { name: 'Mother' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await d.getByRole('textbox', { name: 'Mother' }).fill(`Ibu Satu ${token}`);
      await expect(d.getByRole('listitem').getByRole('button', { name: `${mom.mrn} · ${mom.fullName}` })).toBeVisible();
    });
    await qa.step(3, async () => {
      await d.getByRole('listitem').getByRole('button', { name: `${mom.mrn} · ${mom.fullName}` }).click();
      await expect(d.getByRole('textbox', { name: 'Mother' })).toHaveValue(`${mom.mrn} ${mom.fullName}`);
    });
    await qa.step(4, async () => {
      const today = todayWib();
      await reg.fillRegister({ firstName: 'QA-AMB Bayi Ibu', lastName: `Satu ${token}`, dateOfBirth: today }, d);
      await d.getByRole('textbox', { name: 'Born' }).fill(today);
      await reg.registerButton(d).click();
      await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
      await reg.search(name);
      await expect(await reg.cell(reg.row(name), 'Visit')).toHaveText('Newborn');
    });
    await qa.step(5, async () => {
      const det = await reg.openDetails(name);
      await expect(reg.detail(det, 'Mother')).toHaveText(UUID);
      qa.deviation(5, `"Mother" shows PT-MOM's MRN and name as a link`, '"Mother" shows an internal id (UUID) as plain text');
      await expect(reg.detail(det, 'Birth record')).toHaveText(UUID);
    });
    await qa.step(6, async () => {
      qa.deviation(6, 'The dialog changes to PT-MOM', 'there is no mother link to click');
      await expect(reg.detailsDialog(name).getByRole('link')).toHaveCount(0);
    });
    return name;
  });

  const beds = { first: '', second: '' };
  await chain.step(2, async (qa) => {
    beds.first = await newBed(page, qa, 'QA-101');
    await admitTypedSteps(page, qa, baby, beds.first);
  });

  await chain.step(3, async (qa) => {
    beds.second = await newBed(page, qa, 'QA-103');
    await transferSteps(page, qa, baby, beds.first, beds.second);
  });

  await chain.step(4, async (qa) => dischargeSteps(page, qa, baby, beds.second));
});
