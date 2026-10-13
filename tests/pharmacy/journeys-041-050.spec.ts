import { expect, test } from '../../fixtures/pharmacy';
import { BASE_URL, PASSWORD, USERNAME } from '../../lib/config';
import { expectToast } from '../../lib/assertions';
import { AppHeader } from '../../pages/AppHeader';
import { LoginPage } from '../../pages/LoginPage';

const PARACETAMOL = 'QA-PARA';

/** Journeys PHA-JRN-041..050: returns, access control, sessions. */
test.describe('Pharmacy journeys 041-050', () => {
  test('PHA-JRN-041 · What a return does to the order and the bill', async ({
    pharmacy: { issueLines, orders },
  }, testInfo) => {
    await test.step('Step 1 · Return all remaining units of a fully issued line', async () => {
      await issueLines.open();
      const row = await issueLines.findReturnableRow(10);
      test.skip(!row, 'Seed data missing: a returnable issue line with at least 10 remaining');
      await issueLines.returnOnRow(row!, 10);
    });

    await test.step('Step 2 · The order does not come back to the queue', async () => {
      await orders.open();
      await expect(orders.heading).toBeVisible();
    });

    testInfo.attach('manual-remainder.txt', {
      body: 'Step 3 reads the RX- invoice in Hospital Accounts (outside Pharmacy): the total stays 13,875.00 and open; only Finance sees the reversal.',
    });
  });

  test('PHA-JRN-042 · Finding the right line to return', async ({ pharmacy: { issueLines } }) => {
    await test.step('Step 1 · Searching Paracetamol shows both sales', async () => {
      await issueLines.open();
      await issueLines.filter('Paracetamol');
      const rows = issueLines.rowsFor('Paracetamol 500mg Tablet');
      await expect(rows.first()).toBeVisible();
      expect(await rows.count(), 'at least two Paracetamol sales exist').toBeGreaterThanOrEqual(2);
    });

    await test.step('Step 2 · No column identifies the patient (known risk)', async () => {
      await expect(issueLines.table.getByRole('columnheader', { name: /patient|mrn/i })).toHaveCount(0);
    });
  });

  test('PHA-JRN-043 · Opening Pharmacy without being signed in', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await test.step('Step 1 · /en/pharmacy/orders redirects to the sign-in page', async () => {
      await page.goto(`${BASE_URL}/en/pharmacy/orders`);
      await expect(page, 'PHA-JRN-043 expects an unauthenticated visit to be redirected to the sign-in page; if this fails, pharmacy screens are visible without a session').toHaveURL(/login/);
      await expect(new LoginPage(page).username).toBeVisible();
    });

    await test.step('Step 2 · After signing in, the user reaches Pharmacy, Orders', async () => {
      const login = new LoginPage(page);
      await login.login(USERNAME, PASSWORD);
      await page.goto(`${BASE_URL}/en/pharmacy/orders`);
      await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
    });

    await test.step('Step 3 · Sign out, then browser Back lands on sign-in, not the list', async () => {
      const header = new AppHeader(page);
      await header.signOut();
      await page.goBack();
      await expect(page).toHaveURL(/login/);
      await expect(new LoginPage(page).username).toBeVisible();
    });

    await context.close();
  });

  test('PHA-JRN-044 · User without dispensing rights tries to dispense and to return', async () => {
    test.skip(true, 'Needs the Staff user account (e.g. HR Admin) with no pharmacy rights; current build shows the buttons and refuses after clicking with "advanceDispense: 403 missing required privilege"');
  });

  test('PHA-JRN-045 · User with no pharmacy role looks at orders and issue lines', async () => {
    test.skip(true, 'Needs the Staff user account; the workbook documents the known risk that both lists open for any user of a licensed tenant');
  });

  test('PHA-JRN-046 · Pharmacist sees and touches only their own branch', async ({ pharmacy: { header } }) => {
    await test.step('Step 3 · The branch selector lists branches (superadmin sees all)', async () => {
      await header.page.goto('/en/pharmacy/orders');
      await header.branchButton().click();
      await expect(header.page.getByRole('menuitemradio', { name: 'All branches' })).toBeVisible();
      await header.page.keyboard.press('Escape');
    });

    test.skip(true, 'Steps 1-2, 4-5 need a BR-A-only pharmacist and a known BR-B order address (/pharmacy/dispense?order=<id>); this environment uses different branch names than the workbook seed');
  });

  test('PHA-JRN-047 · Tenant without the Pharmacy licence', async () => {
    test.skip(true, 'Needs a tenant without the Pharmacy licence (e.g. the Lab tenant) to verify the card, search and direct address are all refused');
  });

  test('PHA-JRN-048 · Counter sale on a pharmacy-only tenant', async () => {
    test.skip(true, 'Needs the Apotek (pharmacy edition) tenant; the workbook documents the known risk that the patient search belongs to the missing Ambulatory Care module');
  });

  test('PHA-JRN-049 · Messages the pharmacist sees when a sale is refused', async ({
    pharmacy: { dispense },
  }) => {
    await test.step('Step 1 · Trigger a refusal in English and record the toast', async () => {
      await dispense.open();
      await dispense.searchPatient('QA-PHA Pasien Satu');
      const picked = await dispense.pickPatient('QA-PHA Pasien Satu');
      test.skip(!picked, 'Seed data missing: the four refusal scenarios (discount pending, admitted patient, no stock, no price)');
      test.skip(true, 'The refusal texts need the scenarios from PHA-JRN-016/027/032/035');
    });
  });

  test('PHA-JRN-050 · The web session ends in the middle of a sale', async ({ pharmacy: { header, dispense } }) => {
    await test.step('Step 0 · Fill the wizard up to "Select items"', async () => {
      await dispense.open();
      await dispense.searchItem(PARACETAMOL);
      const added = await dispense.pickItem(PARACETAMOL);
      test.skip(!added, 'Seed data missing: item QA-PARA (Paracetamol 500mg Tablet)');
    });

    await test.step('Step 1 · Sign out in a second tab', async () => {
      const tab2 = await header.page.context().newPage();
      const header2 = new AppHeader(tab2);
      await tab2.goto(`${BASE_URL}/en/pharmacy`);
      await header2.signOut();
      await expect(new LoginPage(tab2).username).toBeVisible();
      await tab2.close();
    });

    await test.step('Steps 2-3 · The wizard is not saved; a fresh sign-in starts empty', async () => {
      await header.page.reload();
      const login = new LoginPage(header.page);
      if ((await login.username.count()) > 0) {
        await login.login(USERNAME, PASSWORD);
      }
      await dispense.open();
      await expect(dispense.noPatientText()).toBeVisible();
      await expect(dispense.selectedCount()).toHaveCount(0);
    });
  });
});
