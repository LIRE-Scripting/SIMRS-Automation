import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastLocator, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { INVENTORY, STAND_IN_STORE } from '../../../lib/inventory-data';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { ItemMasterPage } from '../../../pages/inventory/InventoryE2EPages';
import { DispenseWizard } from '../../../pages/pharmacy/PharmacyE2EPages';
import { CONFIRMED, confirm, patient, sell, stock, toastsAfter } from '../../modules/05-pharmacy/helpers';
import { TC_APP005_013 } from '../../modules/05-pharmacy/evaluation-cases';
import { TC_APP005_017 } from '../../modules/05-pharmacy/issue-cases';
import { TC_APP007_008 } from '../../modules/07-inventory/evaluation-cases';
import { rxInvoices } from '../../modules/14-hospital-accounts/helpers';
import { TC_APP019_010 } from '../../modules/19-finance/evaluation-cases';
import { paySteps, saleSteps } from './steps/pharmacy-billing-steps';

/**
 * E2E-017: stock is received into the pharmacy store, items are found by
 * search and scan for PT-1, a new walk-in is registered from the counter and
 * buys, and PT-1 buys several items with labels. Each step uses the data of
 * its workbook (IT-1 in 07, QA-PARA and QA-IBU in 05). Steps 5-10 run their
 * source test cases with their own records (batches, return, the sale at the
 * cashier and in Finance). ST-1/ST-OP cannot be made (found blocker 26): the seed store stands in.
 */
const para = PHARMACY.para;
const NO_INTERACTIONS = 'No drug interactions detected for this order.';

chainTest('E2E-017', async ({ page, chain }) => {
  await installToastRecorder(page);
  const w = new DispenseWizard(page);

  await chain.step(1, async (qa) => {
    const items = new ItemMasterPage(page);
    const t = qa.token();
    const it = { code: `${INVENTORY.it1.code}-${t}`, name: `${INVENTORY.it1.name} ${t}` };
    await items.open();
    const add = await items.openAdd();
    await items.fill(add, it);
    await add.getByRole('button', { name: 'Save' }).click();
    await expect(toastLocator(page, /^Item added\.$/)).toBeVisible();
    await items.open();
    const d = await items.openEdit(it);
    const b = INVENTORY.batch1;
    const batch = `${b.batch}-${qa.token()}`;
    const expiry = addDays(todayWib(), b.daysAhead);
    qa.note(2, `ST-1 cannot be made (found blocker 26); the seed store ${STAND_IN_STORE.code} stands in`);
    await qa.step(1, async () => {
      await expect(d.getByText('No batches for this item yet.')).toBeVisible();
      await expect(d.getByRole('button', { name: 'Add batch' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await items.addBatch(d, { store: STAND_IN_STORE.name, batch, expiry, quantity: b.quantity });
      await expect(toastLocator(page, /^Batch quantity added\.$/)).toBeVisible();
      await expect(d.getByRole('textbox', { name: 'Batch' })).toHaveValue('');
    });
    await qa.step(3, async () => {
      const line = d.getByText(batch).locator('xpath=ancestor::*[self::li or self::tr or self::div][1]');
      await expect(line).toContainText(b.quantity);
      await expect(line).toContainText(STAND_IN_STORE.code);
    });
  });

  const pt1 = await chain.step(2, async (qa) => {
    // Precondition: QA-PARA in stock (the 05 workbook's batches) and PT-1 registered.
    await stock(page, qa, [para, PHARMACY.ibu]);
    const p = await patient(page, qa);
    const items = new ItemMasterPage(page);
    const t = qa.token();
    const inactive = { code: `QA-INACTIVE-${t}`, name: `QA-INACTIVE Tablet ${t}` };
    await items.open();
    const d = await items.openAdd();
    await items.fill(d, { ...inactive, active: false });
    await d.getByRole('button', { name: 'Save' }).click();
    await expect(toastLocator(page, /^Item added\.$/)).toBeVisible();
    const dialog = page.getByRole('dialog', { name: 'Scan item code' });
    await qa.step(1, async () => {
      await w.open();
      await w.pickPatient(p);
      await w.itemSearch.fill('paracet');
      await expect(w.itemResults().first()).toBeVisible();
      for (const r of await w.itemResults().allInnerTexts()) expect(r.toLowerCase()).toContain('paracet');
    });
    await qa.step(2, async () => {
      await w.itemSearch.fill('QA-INACTIVE');
      await expect(w.itemResults().filter({ hasText: inactive.code }).or(w.main.getByText('No matching items.'))).toBeVisible();
      await expect(w.itemResults().filter({ hasText: inactive.code })).toHaveCount(0);
    });
    await qa.step(3, async () => {
      await w.itemSearch.fill('zzzz');
      await expect(w.main.getByText('No matching items.', { exact: true })).toBeVisible();
    });
    await qa.step(4, async () => {
      await w.scan.click();
      await expect(dialog.getByText('Scan a barcode or type the exact code and press Enter.', { exact: true })).toBeVisible();
    });
    await qa.step(5, async () => {
      const input = dialog.getByRole('textbox');
      await input.fill(para.code);
      await input.press('Enter');
      await expect(w.selected().filter({ has: page.getByText(para.code, { exact: true }) })).toHaveCount(1);
    });
    await qa.step(6, async () => {
      if (!(await dialog.isVisible())) await w.scan.click();
      const m = await toastMark(page);
      const input = dialog.getByRole('textbox');
      await input.fill('QA-DOES-NOT-EXIST');
      await input.press('Enter');
      expect(await toastsAfter(page, m)).toContain('No catalog item found for that code.');
      await expect(w.selected()).toHaveCount(1);
    });
    return p;
  });

  await chain.step(3, async (qa) => {
    const reg = new RegisteredPatientsPage(page);
    const t = qa.token();
    const name = `QA-PHA Pasien Baru ${t}`;
    await qa.step(1, async () => {
      await w.open();
      await w.searchPatient(name);
      await expect(w.main.getByText('No medical record matches.', { exact: true })).toBeVisible();
    });
    await qa.step(2, async () => {
      await w.main.getByRole('link', { name: 'Register on the patient form' }).click();
      await expect(page).toHaveURL(/\/registration\/patients\?next=/);
      const note = page.getByText('Registration saves this walk-in. The pharmacy wizard continues with the saved patient.');
      if (!(await note.isVisible({ timeout: 5_000 }).catch(() => false))) qa.deviation(2, 'Note "Registration saves this walk-in. The pharmacy wizard continues with the saved patient."', 'the note is not shown on the patient form');
    });
    await qa.step(3, async () => {
      const d = reg.registerDialog();
      if (!(await d.isVisible())) await reg.openRegister();
      await reg.fillRegister({ visitType: 'Outpatient', firstName: 'QA-PHA Pasien', lastName: `Baru ${t}` }, d);
      await reg.registerButton(d).click();
      await expect(page.getByText('Patient registered', { exact: true }).first()).toBeVisible();
      await page.waitForURL(/\/pharmacy\/dispense/, { timeout: 10_000 }).catch(() => {});
      if (!/\/pharmacy\/dispense/.test(page.url())) {
        qa.deviation(3, 'Back on the Dispense wizard with the new patient selected', `stays on ${new URL(page.url()).pathname}`);
        const p = await reg.find(`Baru ${t}`);
        await w.open();
        await w.pickPatient(p);
        return;
      }
      await expect(w.main.getByText(new RegExp(`^${name} MRN (\\S+)$`))).toBeVisible();
    });
    await qa.step(4, async () => {
      await w.addItem(para.code);
      await w.goNext('Set quantities');
      await w.goNext('Drug order alerts');
      await w.goNext('Confirm');
      expect(await confirm(page, w)).toContain(CONFIRMED);
    });
  });

  await chain.step(4, async (qa) => {
    await qa.step(1, async () => {
      await w.open();
      await w.pickPatient(pt1);
      await w.addItem(para.code);
      await w.addItem(PHARMACY.ibu.code);
      await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(2\)$/i);
    });
    await qa.step(2, async () => {
      await w.selected().filter({ hasText: PHARMACY.ibu.code }).getByRole('button', { name: 'Remove' }).click();
      await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(1\)$/i);
      await w.addItem(PHARMACY.ibu.code);
      await expect(w.selectedCount()).toHaveText(/^(Selected|Dipilih) \(2\)$/i);
    });
    await qa.step(3, async () => {
      await w.goNext('Set quantities');
      await w.setQuantities(para.name, { requested: '2', issued: '2' });
      await w.setQuantities(PHARMACY.ibu.name, { requested: '1', issued: '1' });
      await w.goNext('Drug order alerts');
      await expect(w.main.getByText(NO_INTERACTIONS, { exact: true })).toBeVisible();
    });
    await qa.step(4, async () => {
      await w.goNext('Confirm');
      expect(await confirm(page, w)).toContain(CONFIRMED);
      for (const [it, n] of [[para, 2], [PHARMACY.ibu, 1]] as const) await expect(w.main.getByRole('listitem').filter({ hasText: it.name })).toContainText(`Issued ${n} of ${n}`);
    });
    await qa.step(5, async () => {
      await page.evaluate(() => {
        (window as unknown as { __printed: number }).__printed = 0;
        window.print = () => {
          (window as unknown as { __printed: number }).__printed++;
        };
      });
      await w.main.getByRole('button', { name: 'Print labels' }).click();
      expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    });
    await qa.step(6, async () => {
      await w.done.click();
      if (!(await w.expectAfterDone())) qa.deviation(6, 'Empty wizard', 'the items are cleared but the patient stays selected');
    });
  });

  await chain.step(5, (qa) => TC_APP005_013({ page, qa }));
  await chain.step(6, (qa) => TC_APP005_017({ page, qa }));
  await chain.step(7, (qa) => TC_APP007_008({ page, qa }));
  const rx = await chain.step(8, async (qa) => {
    await stock(page, qa);
    const p = await patient(page, qa);
    const before = await rxInvoices(page);
    const toasts = await sell(page, p, [{ item: para, requested: '10', issued: '10' }]);
    qa.note(1, `the sale of this step: QA-PARA x 10 to ${p.fullName}`);
    return saleSteps(page, qa, { before, toasts });
  });
  await chain.step(9, (qa) => paySteps(page, qa, rx));
  await chain.step(10, (qa) => TC_APP019_010({ page, qa }));
});
