import { qaTest } from '../../../fixtures/e2e';
import { appsCardRefused, asUser, routesRefused } from '../shared/access';

/**
 * 06-transfusion-medicine.xlsx, a user with no blood bank role (U3
 * "qa.staff", role qa_staff with no right) reads donors, stock and requests.
 */

qaTest('TC-APP006-064', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Transfusion Medicine\b/));
    await qa.step(2, () =>
      routesRefused(staff, qa, 2, ['/bloodbank/donors'], async () => {
        // DN-2 stands for any donor: the first one listed is opened.
        const open = staff.getByRole('main').getByRole('table').getByRole('row').nth(1).getByRole('link').or(staff.getByRole('main').getByRole('table').getByRole('row').nth(1).getByRole('button')).first();
        if (!(await open.count())) return;
        const donor = (await staff.getByRole('main').getByRole('table').getByRole('row').nth(1).innerText()).split(/\t|\n/)[0].trim();
        await open.click();
        await staff.waitForLoadState('networkidle').catch(() => {});
        return `the donor ${donor} opens`;
      }),
    );
    await qa.step(3, () => routesRefused(staff, qa, 3, ['/bloodbank/stock', '/bloodbank/requisitions']));
  });
});
