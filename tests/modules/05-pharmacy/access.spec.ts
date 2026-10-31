import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { PHARMACY, PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { AppHeader } from '../../../pages/AppHeader';
import { DispenseWizard, IssueLinesPage, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { appsCardRefused, asUser, columnTexts, BR_A, BR_B, headerOneBranch, routesRefused, seedPatientOf, toastsOf, tryRefused, userPage } from '../shared/access';
import { CONFIRMED, ownItem, outpatientOrder, patient, sell, stock, toConfirm, type Patient } from './helpers';

/**
 * 05-pharmacy.xlsx, the access test cases of Orders, Dispense and Issue
 * Lines: U2 on "All branches", U3 without any right, and U1 next to a branch
 * of U6 (Kemayoran).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const para = PHARMACY.para;

/** The options of a type-ahead after typing `typed`. */
async function optionsOf(page: Page, field: import('@playwright/test').Locator, typed: string): Promise<string[]> {
  const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
  await field.click();
  await field.fill('');
  await field.pressSequentially(typed, { delay: 20 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await list.getByRole('option').first().waitFor({ timeout: 5_000 }).catch(() => {});
  return (await list.getByRole('option').allInnerTexts()).map((o) => o.replace(/\s+/g, ' ').trim());
}

/** The item's lines on Issue Lines (searched by its name, which carries the token). */
function lineRow(il: IssueLinesPage, name: string) {
  return il.rows().filter({ has: il.page.getByRole('cell', { name, exact: true }) });
}

qaTest('TC-APP005-020', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): QA-PARA in the stand-in store (ST-OP) and PT-1 of BR-A.
  const pt1 = await asUser(browser, 'U1', async (u1) => {
    await stock(u1, qa);
    return patient(u1, qa);
  });
  const w = new DispenseWizard(page);

  await qa.step(1, async () => {
    const o = new OrdersPage(page);
    await o.open('outpatient');
    qa.note(1, `Orders lists ${await o.rows().count()} rows; Issue Lines follows`);
    const il = new IssueLinesPage(page);
    await il.open();
    await expect(il.rows().first()).toBeVisible();
    const headers = (await il.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `neither list has a Branch column (Issue Lines: ${headers.join(', ')})`);
  });

  const branch = w.main.getByRole('combobox', { name: 'Branch' }).or(w.main.locator('#dispense-branch'));
  await qa.step(2, async () => {
    await toConfirm(page, pt1, [{ item: para, requested: '1', issued: '1' }]);
    await expect(branch.first()).toBeVisible();
    // Without a branch "Confirm dispense" may simply be disabled: that is the refusal, read instead of clicked.
    const disabled = await w.confirm.isDisabled();
    const toasts = disabled ? [] : await toastsOf(page, () => w.confirm.click());
    expect(toasts).not.toContain(CONFIRMED);
    const message = toasts.join(' / ') || (await branch.first().evaluate((e: HTMLSelectElement) => e.validationMessage)) || (disabled ? '"Confirm dispense" is disabled until a branch is chosen' : '');
    qa.note(2, `without a branch: "${message}"`);
    if (!message.includes('Choose a branch before confirming the dispense.')) {
      qa.deviation(2, 'Toast "Choose a branch before confirming the dispense."', message ? `"${message}"` : 'no message');
    }
  });

  await qa.step(3, async () => {
    await branch.first().selectOption({ label: BR_B });
    const ofB = await optionsOf(page, w.store, PHARMACY_STORE.code.slice(0, 2));
    await branch.first().selectOption({ label: BR_A });
    const ofA = await optionsOf(page, w.store, PHARMACY_STORE.code.slice(0, 2));
    expect(ofA.some((o) => o.includes(PHARMACY_STORE.code))).toBe(true);
    if (ofB.some((o) => o.includes(PHARMACY_STORE.code))) {
      qa.deviation(3, 'Stores of BR-A only', `the Store list is not narrowed by the branch: ${PHARMACY_STORE.code} (BR-A) is offered for ${BR_B} too (${ofA.length} stores for ${BR_A}, ${ofB.length} for ${BR_B})`);
    }
  });

  await qa.step(4, async () => {
    await w.pickStore(PHARMACY_STORE.code);
    const toasts = await toastsOf(page, () => w.confirm.click());
    expect(toasts).toContain(CONFIRMED);
  });

  await qa.step(5, async () => {
    await new AppHeader(page).selectBranch(BR_A);
    const il = new IssueLinesPage(page);
    await il.open();
    await il.search.fill(para.name);
    await expect(lineRow(il, para.name).first()).toBeVisible();
    qa.note(5, `the header selector was set to ${BR_A}; the line of ${para.name} is listed (lines carry no patient or date to tell this one apart)`);
    await new AppHeader(page).selectBranch('All branches');
  });
});

qaTest('TC-APP005-044', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): PT-1, QA-PARA in stock, and an issued line of an item of this test.
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  const it = await ownItem(page, qa, para.code, para.name, [{ quantity: '10', expiry: addDays(todayWib(), 300) }]);
  expect(await sell(page, pt1, [{ item: it, requested: '2', issued: '2' }])).toContain(CONFIRMED);
  const mine = new IssueLinesPage(page);
  await mine.open();
  const rule = (p: Page, label: string) => p.getByRole('main').getByLabel(label, { exact: true }).or(p.getByRole('main').getByRole('radio', { name: label }));
  const ruleBefore = (await rule(page, 'Verified lines only').first().isChecked()) ? 'Verified lines only' : 'Every issued line';

  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const w = new DispenseWizard(staff);
      await w.open();
      await w.pickPatient(pt1);
      await w.addItem(para.code);
      const toasts = await toastsOf(staff, () => w.next.click());
      qa.note(1, `Next: "${toasts.join(' / ') || 'no toast'}"`);
      if (await w.marker('Set quantities').isVisible()) {
        qa.deviation(1, 'A refusal. The wizard stays on "Select items"', 'the wizard moves on to "Set quantities"');
      } else {
        await expect(w.marker('Select items')).toBeVisible();
      }
    });

    let listed = true;
    await qa.step(2, async () => {
      const il = new IssueLinesPage(staff);
      await il.open();
      await il.search.fill(it.name);
      const r = lineRow(il, it.name);
      if (!(await r.first().waitFor({ timeout: 15_000 }).then(() => true, () => false))) {
        listed = false;
        return qa.note(2, `Issue Lines does not list the sale of ${it.name} made just before (found blocker 51)`);
      }
      await expect(r).toHaveCount(1);
      await staff.waitForLoadState('networkidle').catch(() => {});
      await r.getByRole('spinbutton', { name: 'Qty' }).fill('1');
      const toasts = await tryRefused(qa, 2, staff, 'Return', /^Returned\.$/, () => r.getByRole('button', { name: 'Return' }).click());
      if (!toasts.includes('Return failed.')) qa.deviation(2, 'Toast "Return failed."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
      await mine.open();
      await mine.search.fill(it.name);
      await expect.poll(async () => (await mine.cells(lineRow(mine, it.name)))[5]).toBe('0');
    });
    if (!listed) qa.blocked(2, 51);

    await qa.step(3, async () => {
      const il = new IssueLinesPage(staff);
      await il.open();
      const other = ruleBefore === 'Verified lines only' ? 'Every issued line' : 'Verified lines only';
      await rule(staff, other).first().check();
      await tryRefused(qa, 3, staff, `Save "${other}"`, /^(Saved|Rule saved)/i, () => il.main.getByRole('button', { name: 'Save', exact: true }).click());
      await mine.open();
      await expect(rule(page, ruleBefore).first()).toBeChecked();
    });
    qa.note(1, 'the Dispense, Return and Save buttons are shown to U3; a refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP005-045', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Pharmacy\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/pharmacy/orders']));
    await qa.step(3, () => routesRefused(staff, qa, 3, ['/pharmacy/issue-lines']));
  });
});

qaTest('TC-APP005-046', async ({ page, qa, browser }) => {
  // Preconditions: a pending order of BR-B (U6, for a seed patient of Kemayoran) and one of BR-A (U1).
  const ptB: Patient = await asUser(browser, 'U6', async (u6) => {
    const p = await seedPatientOf(u6);
    await outpatientOrder(u6, p);
    return p;
  });
  const orderB = await asUser(browser, 'U6', async (u6) => {
    const o = new OrdersPage(u6);
    await o.open('outpatient');
    const link = o.row(ptB.fullName).first().getByRole('link');
    await expect(link).toBeVisible();
    return (await link.getAttribute('href')) ?? '';
  });
  const pt1 = await patient(page, qa);
  await outpatientOrder(page, pt1);

  await qa.step(1, async () => {
    const o = new OrdersPage(page);
    await o.open('outpatient');
    await o.pickStore(PHARMACY_STORE.code);
    await expect(o.row(pt1.fullName).first()).toBeVisible();
    await expect(o.row(ptB.fullName)).toHaveCount(0);
  });

  await qa.step(2, async () => {
    const il = new IssueLinesPage(page);
    await il.open();
    const total = (await il.pager().innerText().catch(() => '')).trim();
    qa.note(2, `Issue Lines of U1: "${total || `${await il.rows().count()} rows`}" (the lines carry no patient or branch to tell BR-B lines apart)`);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));

  await qa.step(4, async () => {
    expect(orderB).toMatch(/order=/);
    await page.goto(orderB.replace(/^\/(id|en)\//, '/id/'));
    const w = new DispenseWizard(page);
    await expect(w.heading).toBeVisible();
    await expect(w.main).not.toContainText(ptB.fullName);
    await expect(w.main.getByText('No medical record selected.', { exact: true })).toBeVisible();
    await expect(w.selected()).toHaveCount(0);
  });

  await qa.step(5, async () => {
    await stock(page, qa);
    const w = await toConfirm(page, pt1, [{ item: para, requested: '1', issued: '1' }]);
    // An empty field offers nothing: the first letter of the store codes ("F", shared by the stores of both branches) lists them.
    const offered = await optionsOf(page, w.store, PHARMACY_STORE.code.slice(0, 1));
    expect(offered.some((o) => o.includes(PHARMACY_STORE.code))).toBe(true);
    // The stores of BR-B: the Stores list of U6.
    const storesB = await asUser(browser, 'U6', async (u6) => {
      await u6.goto('/id/inventory/stores');
      await u6.waitForLoadState('networkidle').catch(() => {});
      return columnTexts(u6, 0);
    });
    const shown = storesB.filter((code) => offered.some((o) => o.split(/\s|·/)[0] === code));
    if (shown.length) qa.deviation(5, `Stores of ${BR_A} only`, `stores of ${BR_B} offered to U1: ${shown.join(', ')}`);
    qa.note(5, `the Store field offers ${offered.length} stores; none of the ${storesB.length} stores of ${BR_B} (${storesB.slice(0, 5).join(', ')})`);
  });
});
