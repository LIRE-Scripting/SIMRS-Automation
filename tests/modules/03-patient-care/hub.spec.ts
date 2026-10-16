import { expect, qaTest } from '../../../fixtures/e2e';
import { AppHeader } from '../../../pages/AppHeader';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';

/** 03-patient-care.xlsx, feature "Patient Care (/clinical)": hub, navigation and Indonesian. */
qaTest('TC-APP003-014', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const c = new ConsultationPage(page);

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Patient Care\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Patient Care$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Patient Care' })).toBeVisible();
    await expect(main.getByText('SOAP, order entry & prescription')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Open Consultation' })).toBeVisible();
    qa.deviation(1, 'Button "Open Consultation"', '"Open Consultation" is a link');
    await expect(main.getByRole('heading', { level: 2, name: 'Workflow' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Consultation', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await main.getByRole('link', { name: 'Consultation', exact: true }).click();
    await expect(c.heading).toBeVisible();
    await page.goto('/en/clinical');
    await page.getByRole('complementary').filter({ hasText: 'Patient Care' }).getByRole('link', { name: 'Consultation', exact: true }).click();
    await expect(c.heading).toBeVisible();
  });

  await qa.step(3, async () => {
    const header = new AppHeader(page);
    try {
      await header.selectLanguage('ID');
      await page.goto('/id/clinical/consultation');
      const h1 = main.getByRole('heading', { level: 1 });
      await expect(h1).not.toHaveText('Consultation');
      qa.note(3, `Indonesian heading "${await h1.innerText()}", patient field "${await main.getByRole('combobox').first().getAttribute('placeholder')}"`);
    } finally {
      await header.selectLanguage('EN');
    }
  });
});
