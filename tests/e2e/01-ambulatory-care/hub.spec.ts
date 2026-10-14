import { expect, qaTest } from '../../../fixtures/e2e';
import { AppHeader } from '../../../pages/AppHeader';

/**
 * 01-ambulatory-care.xlsx, feature "Ambulatory Care (/registration)" and the
 * screen checks of every route (TC-APP001-081 … 086, run as U2 on "All
 * branches" as their Preconditions say). The workbook opens /id/…; the suite
 * runs in English (answer Q6), so the same routes are opened under /en/.
 */

qaTest('TC-APP001-026', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const screens = [
    { link: 'Registration', heading: 'Registered Patients' },
    { link: 'Appointments', heading: 'Appointments' },
    { link: 'Arrival', heading: 'Arrival' },
  ];

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /Ambulatory Care/ }).first().click();
    const crumbs = main.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Ambulatory Care$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Ambulatory Care' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'New Registration' })).toBeVisible();
    qa.deviation(1, 'a button "New Registration"', '"New Registration" is a link');
    await expect(main.getByRole('heading', { level: 2, name: 'Workflow' })).toBeVisible();
    for (const s of screens) await expect(main.getByRole('link', { name: s.link, exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    for (const s of screens) {
      await page.goto('/en/registration');
      await main.getByRole('link', { name: s.link, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name: s.heading })).toBeVisible();
    }
    const sidebar = page.getByRole('complementary').filter({ hasText: 'Ambulatory Care' });
    for (const [link, heading] of [
      ['Registered Patients', 'Registered Patients'],
      ['Priority rules', 'Priority rules'],
      ['Patient flags', 'Patient flags'],
      ['Appointments', 'Appointments'],
      ['Arrival', 'Arrival'],
    ]) {
      await sidebar.getByRole('link', { name: link, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  await qa.step(3, async () => {
    const header = new AppHeader(page);
    await page.goto('/en/registration/patients');
    await header.selectLanguage('ID');
    try {
      await expect(page).toHaveURL(/\/id\/registration\/patients/);
      await expect(main.getByRole('heading', { level: 1, name: 'Pasien Terdaftar' })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Pendaftaran Baru' })).toBeVisible();
      await page.goto('/id/registration/appointments');
      await expect(main.getByRole('heading', { level: 1, name: 'Janji Temu' })).toBeVisible();
      await page.goto('/id/registration/department-queue');
      await expect(main.getByRole('heading', { level: 1, name: 'Kedatangan' })).toBeVisible();
    } finally {
      await header.selectLanguage('EN');
    }
  });
});

/** "HTTP 200; the screen shows its title and controls; no error screen; no request of the page fails." */
async function screenOpens(
  page: import('@playwright/test').Page,
  route: string,
  heading: string,
): Promise<void> {
  const failed: string[] = [];
  page.on('requestfailed', (r) => {
    if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) failed.push(`${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(new URL(page.url() || 'https://rs.showcase.atklik.xyz').origin)) {
      failed.push(`${r.status()} ${r.url()}`);
    }
  });
  const response = await page.goto(`/en${route}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  // Controls: buttons on the work screens, links (tiles) on the hub.
  await expect(page.getByRole('main').getByRole('button').or(page.getByRole('main').getByRole('link')).first()).toBeVisible();
  expect(failed).toEqual([]);
}

const SCREENS: [string, string, string][] = [
  ['TC-APP001-081', '/registration', 'Ambulatory Care'],
  ['TC-APP001-082', '/registration/appointments', 'Appointments'],
  ['TC-APP001-083', '/registration/department-queue', 'Arrival'],
  ['TC-APP001-084', '/registration/patient-flags', 'Patient flags'],
  ['TC-APP001-085', '/registration/patients', 'Registered Patients'],
  ['TC-APP001-086', '/registration/priority-rules', 'Priority rules'],
];

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
