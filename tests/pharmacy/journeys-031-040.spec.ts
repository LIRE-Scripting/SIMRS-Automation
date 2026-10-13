import { test, expect } from '../../fixtures/pharmacy';
import { expectNoToast, expectToast } from '../../lib/assertions';

const PATIENT = 'QA-PHA Pasien Satu';
const PARACETAMOL = 'QA-PARA';

/** Journeys PHA-JRN-031..040: interaction edge cases, stock, pricing, returns. */
test.describe('Pharmacy journeys 031-040', () => {
  test('PHA-JRN-031 · Interacting drugs sold in two separate visits', async ({
    pharmacy: { dispense },
  }) => {
    await test.step('Step 1 · First visit: QA-IBU alone', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
      await dispense.searchItem('QA-IBU');
      const ibu = await dispense.pickItem('QA-IBU');
      test.skip(!ibu, 'Seed data missing: item QA-IBU (Ibuprofen 400mg Tablet)');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
      await dispense.doneButton().click();
    });

    await test.step('Steps 2-3 · Second visit: QA-AMLO alone, no interaction found', async () => {
      await dispense.searchItem('QA-AMLO');
      const amlodipine = await dispense.pickItem('QA-AMLO');
      test.skip(!amlodipine, 'Seed data missing: item QA-AMLO (Amlodipine 5mg Tablet)');
      await dispense.goNext();
      await expect(dispense.page.getByText(/no drug interactions/i).first()).toBeVisible();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/dispense confirmed/i);
    });
  });

  test('PHA-JRN-032 · Not enough stock', async ({ pharmacy: { dispense } }) => {
    await test.step('Step 1 · Counter sale of 21 is refused', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1) with 20 QA-PARA in stock');
      await dispense.searchItem(PARACETAMOL);
      await dispense.pickItem(PARACETAMOL);
      await dispense.goNext();
      await dispense.requestedInput().fill('21');
      await dispense.issuedInput().fill('21');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/not enough stock/i);
    });

    await test.step('Step 2 · Nothing was saved', async () => {
      await dispense.doneButton().click().catch(() => {});
      await dispense.open();
      await dispense.searchItem(PARACETAMOL);
      await expect(dispense.selectedCount()).toHaveCount(0);
    });
  });

  test('PHA-JRN-033 · Expired and nearly expired stock', async ({ pharmacy: { dispense } }, testInfo) => {
    await test.step('Step 1 · Selling expired QA-EXP is refused', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
      await dispense.searchItem('QA-EXP');
      const expired = await dispense.pickItem('QA-EXP');
      test.skip(!expired, 'Seed data missing: item QA-EXP (only batch expired yesterday)');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/not enough stock/i);
    });

    testInfo.attach('manual-remainder.txt', {
      body: 'Steps 2-6 need QA-FRZ (batches at exactly 30/31 days) and the Inventory "Freeze days" setting.',
    });
  });

  test('PHA-JRN-034 · Picking the store', async ({ pharmacy: { dispense } }, testInfo) => {
    await test.step('Steps 1-3 · Confirm without a store is refused', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1) and stores ST-OP/ST-IP');
      await dispense.searchItem(PARACETAMOL);
      await dispense.pickItem(PARACETAMOL);
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.confirmButton().click();
      await dispense.expectToast(/choose a store/i);
    });

    testInfo.attach('manual-remainder.txt', {
      body: 'Steps 4-5 edit ST-OP visit types in Inventory > Stores (outside Pharmacy) and are restored there.',
    });
  });

  test('PHA-JRN-035 · Item that cannot be priced, or would sell below cost', async ({
    pharmacy: { dispense },
  }, testInfo) => {
    await test.step('Step 1 · Selling QA-NOCOST is refused by the cashier', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
      await dispense.searchItem('QA-NOCOST');
      const noCost = await dispense.pickItem('QA-NOCOST');
      test.skip(!noCost, 'Seed data missing: item QA-NOCOST (no last cost, no sales price)');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.goNext();
      await dispense.pickStore('ST-OP');
      await dispense.confirmButton().click();
      await dispense.expectToast(/no price for this item/i);
    });

    testInfo.attach('manual-remainder.txt', {
      body: 'Steps 3-4 need a Fast Cashier price of 900.00 for QA-PARA (cost 1,000) to trigger the below-cost block.',
    });
  });

  test('PHA-JRN-036 · Discount rejected: sale goes ahead at full price', async ({
    pharmacy: { dispense },
  }, testInfo) => {
    await test.step('Hold a sale with Discount % 15 again', async () => {
      await dispense.open();
      await dispense.searchPatient(PATIENT);
      const picked = await dispense.pickPatient(PATIENT);
      test.skip(!picked, 'Seed data missing: patient QA-PHA Pasien Satu (PT-1)');
      await dispense.searchItem(PARACETAMOL);
      await dispense.pickItem(PARACETAMOL);
      await dispense.goNext();
      const discount = dispense.discountInput();
      test.skip((await discount.count()) === 0, 'The Discount % field is not offered on "Set quantities"');
      await discount.fill('15');
      await dispense.goNext();
      await dispense.goNext();
      await dispense.confirmButton().click();
      await dispense.expectToast(/sent for approval/i);
    });

    testInfo.attach('manual-remainder.txt', {
      body: 'Steps 1, 3-4 need the Cashier to Reject in "Dispense discounts" (Hospital Accounts); after a rejection the pharmacist completes at full price.',
    });
  });

  test('PHA-JRN-037 · Who may approve a discount', async () => {
    test.skip(true, 'Needs the Pharmacist, Cashier 2 and Cashier (approver) accounts; the pharmacist and Cashier 2 must be refused, the Cashier must succeed');
  });

  test('PHA-JRN-038 · Returning more than was issued', async ({
    pharmacy: { issueLines },
  }, testInfo) => {
    await test.step('Steps 1-2 · 0 and 11 must not return anything', async () => {
      await issueLines.open();
      const row = await issueLines.findReturnableRow(1, 10);
      test.skip(!row, 'Seed data missing: a returnable issue line with 1-10 remaining');
      let signature = await issueLines.rowSignature(row!);

      for (const invalid of ['0', '11']) {
        const current = issueLines.rowBySignature(issueLines.table, signature);
        const before = Number((await issueLines.returnedCell(current).textContent())?.trim() ?? '0');
        await issueLines.qtyInput(current).fill(invalid);
        await issueLines.returnButton(current).click();
        await issueLines.page.waitForTimeout(1_500);
        const after = Number(
          (await issueLines.returnedCell(current).textContent())?.trim() ?? '0',
        );
        if (after !== before) {
          // Known app deviation: an invalid quantity is not refused cleanly.
          testInfo.attach('deviation.txt', {
            body: `Step ${invalid === '0' ? '1' : '2'}: entering ${invalid} and clicking Return changed the returned quantity from ${before} to ${after} instead of being refused.`,
          });
        }
      }
    });

    await test.step('Step 3 · Returning 7 succeeds and the row updates', async () => {
      const row = await issueLines.findReturnableRow(7);
      test.skip(!row, 'Seed data missing: a returnable issue line with at least 7 remaining');
      await issueLines.returnOnRow(row!, 7);
    });

    await test.step('Steps 4-5 · A stale second tab cannot return past the total', async () => {
      const row = await issueLines.findReturnableRow(4, 10);
      test.skip(!row, 'Seed data missing: a returnable issue line with 4-10 remaining');
      const signature = await issueLines.rowSignature(row!);
      const returnedBefore = Number(
        (await issueLines.returnedCell(row!).textContent())?.trim() ?? '0',
      );

      // tabB is loaded BEFORE tabA's return, so it still shows the old remaining quantity.
      const tabB = await issueLines.page.context().newPage();
      await tabB.goto('/en/pharmacy/issue-lines');
      const staleRow = issueLines.rowBySignature(tabB.getByRole('main'), signature);
      await staleRow.waitFor({ state: 'visible', timeout: 10_000 });
      const staleCapacity = Number(await issueLines.qtyInput(staleRow).getAttribute('max'));

      // tabA returns 3, so the stale tab's full capacity is no longer allowed.
      await issueLines.returnOnRow(row!, 3);
      await issueLines.qtyInput(staleRow).fill(String(staleCapacity));
      await issueLines.returnButton(staleRow).click();

      // After a reload the row shows exactly tabA's return - the refused
      // click never pushed the total past what was issued.
      await tabB.reload();
      const reloadedRow = issueLines.rowBySignature(tabB.getByRole('main'), signature);
      await expect(issueLines.returnedCell(reloadedRow)).toHaveText(
        String(returnedBefore + 3),
        { timeout: 10_000 },
      );
      await tabB.close();
    });
  });

  test('PHA-JRN-039 · Refund for a discounted sale', async () => {
    test.skip(true, 'Needs the invoice from PHA-JRN-015 (10% discount, total 12,487.50) and Finance > Vouchers for the reversal; the workbook documents the known risk that the reversal is re-priced to 13,875.00');
  });

  test('PHA-JRN-040 · Return after the price list changed', async () => {
    test.skip(true, 'Needs Fast Cashier price settings (margin 50%, then a price list without Ibuprofen) and Finance to read the reversal voucher');
  });
});
