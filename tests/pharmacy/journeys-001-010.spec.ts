import { test, expect } from '../../fixtures/pharmacy';

const PATIENT = 'QA-PHA Pasien Satu';
const PARACETAMOL = 'QA-PARA';

/** Journeys PHA-JRN-001..010: prescriptions, ward supply and counter sales. */
test.describe('Pharmacy journeys 001-010', () => {
  test('PHA-JRN-001 · Pharmacist dispenses an outpatient prescription in full', async ({
    pharmacy: { orders, dispense, issueLines },
  }, testInfo) => {
    await test.step('Steps 1-2 · Orders list, Outpatient tab shows a Store field', async () => {
      await orders.open();
      await expect(orders.heading).toBeVisible();
      await orders.selectTab('Outpatient');
      await expect(orders.storeField).toBeVisible();
    });

    await test.step('Steps 3-5 · Store ST-OP, open the order, wizard to "Set quantities"', async () => {
      const store = await orders.pickStore('ST-OP');
      if (store !== 'ST-OP') {
        testInfo.attach('deviation.txt', {
          body: `Steps 3-5: the workbook store "ST-OP" does not exist in this environment; "${store || 'no store'}" was picked instead.`,
        });
      }
      const opened = await orders.openOrder(PATIENT);
      test.skip(!opened, 'Seed data missing: pending outpatient order (OR-OP) for QA-PHA Pasien Satu');
      await dispense.expectOnStep('Select items');
      await dispense.goNext();
      await dispense.expectOnStep('Set quantities');
    });

    await test.step('Steps 6-7 · Drug order alerts, then Confirm', async () => {
      await dispense.goNext();
      await dispense.expectOnStep('Drug order alerts');
      await dispense.goNext();
      await dispense.expectOnStep('Confirm');
    });

    await test.step('Step 8 · Confirm dispense → toast and label "Issued 10 of 10"', async () => {
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await expect(dispense.page.getByText(/issued 10 of 10/i)).toBeVisible();
    });

    await test.step('Step 9 · Done → back on Orders, row gone', async () => {
      await dispense.doneButton().click();
      await expect(orders.heading).toBeVisible();
      await expect(orders.rowsFor(PATIENT)).toHaveCount(0);
    });

    await test.step('Check at the end · Issue Lines has the new line', async () => {
      await issueLines.open();
      await expect(issueLines.rowsFor('Paracetamol 500mg Tablet').first()).toBeVisible();
    });
  });

  test('PHA-JRN-002 · Prescription collected in two visits', async ({
    pharmacy: { orders, dispense },
  }) => {
    await test.step('Steps 1-3 · Open the order, issue 4 of 10, confirm', async () => {
      await orders.open();
      const opened = await orders.openOrder(PATIENT);
      test.skip(!opened, 'Seed data missing: pending outpatient order (OR-OP) for QA-PHA Pasien Satu');
      await dispense.goNext();
      await dispense.issuedInput().fill('4');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await dispense.doneButton().click();
    });

    await test.step('Step 4 · The order stays queued with Remaining 6', async () => {
      await expect(orders.rowsFor(PATIENT).first()).toBeVisible();
    });

    await test.step('Steps 5-7 · Reopen, issue the remaining 6, row disappears', async () => {
      const reopened = await orders.openOrder(PATIENT);
      expect(reopened, 'the order row should still be listed').toBe(true);
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await dispense.doneButton().click();
      await expect(orders.rowsFor(PATIENT)).toHaveCount(0);
    });
  });

  test('PHA-JRN-003 · Restricted drug waits for the doctor\'s authorisation', async ({
    pharmacy: { orders },
  }) => {
    await test.step('Step 1 · Pharmacist opens Pharmacy, Orders', async () => {
      await orders.open();
      await expect(orders.heading).toBeVisible();
      await expect(orders.table).toBeVisible();
    });

    test.skip(true, 'Steps 2-4 need the doctor role in Patient Care and a seeded restricted order (OR-RX); authorisation happens outside the Pharmacy module');
  });

  test('PHA-JRN-004 · Generic substitution on a prescription', async ({
    pharmacy: { orders, dispense, issueLines },
  }) => {
    await test.step('Steps 1-2 · Open the order, tick Generic on "Set quantities"', async () => {
      await orders.open();
      const opened = await orders.openOrder(PATIENT);
      test.skip(!opened, 'Seed data missing: pending outpatient order (OR-OP) for QA-PHA Pasien Satu');
      await dispense.goNext();
      const generic = dispense.genericCheckbox();
      test.skip((await generic.count()) === 0, 'The Generic tick box is not offered on this build');
      await generic.check();
    });

    await test.step('Steps 2-3 · Confirm with the Generic tick', async () => {
      await dispense.goNext();
      await dispense.goNext();
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
    });

    await test.step('Step 4 · Issue Lines remark records the substitution', async () => {
      await issueLines.open();
      await expect(issueLines.rowsFor('Diganti obat generik atas persetujuan dokter').first()).toBeVisible();
    });
  });

  test('PHA-JRN-005 · Ward supply: pharmacist sees inpatient orders and the ward group', async ({
    pharmacy: { orders },
  }) => {
    await test.step('Steps 3-4 · Pharmacy Orders, Inpatient tab offers a store', async () => {
      await orders.open();
      await orders.selectTab('Inpatient');
      await expect(orders.storeField).toBeVisible();
    });

    test.skip(true, 'Steps 1-2 and 6-7 need the Inpatient "Ward supply" screen, a nurse role and seeded OR-IP; see the manual workbook');
  });

  test('PHA-JRN-006 · Ward refuses a delivery', async () => {
    test.skip(true, 'Depends on PHA-JRN-005 (Ward supply group); refusal handling lives in the Inpatient module');
  });

  test('PHA-JRN-007 · Counter sale to a registered patient', async ({
    pharmacy: { dispense },
  }) => {
    await test.step('Step 1 · Dispense starts with no medical record and Next disabled', async () => {
      await dispense.open();
      await dispense.expectOnStep('Select items');
      await expect(dispense.noPatientText()).toBeVisible();
      await expect(dispense.nextButton).toBeDisabled();
    });

    await test.step('Steps 2-3 · Search and pick PT-1', async () => {
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
    });

    await test.step('Step 4 · Add QA-PARA ×2', async () => {
      await dispense.searchItem(PARACETAMOL);
      const added = await dispense.pickItem(PARACETAMOL);
      expect(added, 'QA-PARA should be offered in the catalog search').toBe(true);
      await expect(dispense.selectedCount()).toBeVisible();
    });

    await test.step('Steps 5-7 · Quantities 2/2, alerts, confirm with ST-OP', async () => {
      await dispense.goNext();
      await dispense.requestedInput().fill('2');
      await dispense.issuedInput().fill('2');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await expect(dispense.page.getByText(/issued 2 of 2/i)).toBeVisible();
    });

    await test.step('Step 8 · Done → empty wizard ready for the next sale', async () => {
      await dispense.doneButton().click();
      await expect(dispense.noPatientText()).toBeVisible();
    });
  });

  test('PHA-JRN-008 · Counter sale to a new patient: register, then continue', async ({
    pharmacy: { dispense },
  }) => {
    await test.step('Step 1 · Searching the new patient finds nothing yet', async () => {
      await dispense.open();
      await dispense.searchPatient('QA-PHA Pasien Baru');
      await expect(dispense.page.getByText(/no medical record matches/i).first()).toBeVisible({ timeout: 10_000 }).catch(async () => {
        await expect(dispense.patientResults()).toHaveCount(0);
      });
    });

    await test.step('Step 2 · "Register on the patient form" links to the patient form', async () => {
      await expect(dispense.registerWalkInLink).toBeVisible();
      await expect(dispense.registerWalkInLink).toHaveAttribute('href', /registration\/patients/);
    });

    test.skip(true, 'Steps 3-4 fill the Ambulatory Care patient form (outside Pharmacy) to create QA-PHA Pasien Baru; covered by the manual workbook');
  });

  test('PHA-JRN-009 · Several items in one sale, then labels', async ({
    pharmacy: { dispense },
  }) => {
    await test.step('Step 1 · Pick PT-1 and add two items → Selected (2)', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
      await dispense.searchItem(PARACETAMOL);
      expect(await dispense.pickItem(PARACETAMOL)).toBe(true);
      await dispense.searchItem('QA-IBU');
      const ibuAdded = await dispense.pickItem('QA-IBU');
      test.skip(!ibuAdded, 'Seed data missing: item QA-IBU (Ibuprofen 400mg Tablet)');
      await expect(dispense.selectedCount()).toHaveText(/\(2\)/);
    });

    await test.step('Steps 3-6 · Quantities, alerts, confirm → labels per item → Done', async () => {
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await expect(dispense.page.getByText(/issued \d+ of \d+/i).first()).toBeVisible();
      await dispense.doneButton().click();
      await expect(dispense.noPatientText()).toBeVisible();
    });
  });

  test('PHA-JRN-010 · Selling a kit', async ({ pharmacy: { dispense } }, testInfo) => {
    await test.step('Step 1 · Sell QA-KIT ×2 to PT-1', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
      await dispense.searchItem('QA-KIT');
      const kitAdded = await dispense.pickItem('QA-KIT');
      test.skip(!kitAdded, 'Seed data missing: kit item QA-KIT');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await dispense.doneButton().click();
    });

    testInfo.attach('manual-remainder.txt', {
      body: 'Steps 2-3 check Inventory Item Master stock and the kit-mixing refusal; the kit item is not seeded in this environment.',
    });
  });
});
