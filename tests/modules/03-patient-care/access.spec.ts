import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { CLINICAL, orderFor } from '../../../lib/clinical-data';
import { PHARMACY_STORE } from '../../../lib/pharmacy-data';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { appsCardRefused, asUser, BR_A, headerOneBranch, routesRefused, seedPatientOf, toastsOf, tryRefused, userPage } from '../shared/access';
import { newPt1 } from './cases';

/**
 * 03-patient-care.xlsx, the access test cases of Consultation: U2 on "All
 * branches", U3 without any right, and U1 next to a branch of U6 (Kemayoran).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const PLACED = /^Order placed\.$/;
const RESTRICTED_SAVED = /^Restricted order saved\./;

/** Places the workbook's restricted order for the open patient; it then waits under "Authorise restricted orders". */
async function placeRestricted(c: ConsultationPage): Promise<void> {
  const r = CLINICAL.restricted;
  await c.fillOrder(orderFor(r.drug));
  await c.field('Restriction level').fill(r.level);
  await c.field('Restriction type').fill(r.type);
  await c.field('Restriction item').fill(r.item);
  await c.submitOrder().click();
  await expect(toastLocator(c.page, RESTRICTED_SAVED)).toBeVisible();
}

/** Rows of a patient on Pharmacy, Orders (outpatient, the pharmacy store). */
async function pharmacyRows(o: OrdersPage, patient: string): Promise<number> {
  await o.open('outpatient');
  await o.pickStore(PHARMACY_STORE.code);
  return o.row(patient).count();
}

qaTest('TC-APP003-012', async ({ page, qa, browser }) => {
  // PT-1 belongs to BR-A: registered by U1.
  const pt1 = await asUser(browser, 'U1', (u1) => newPt1(u1, qa));
  const c = new ConsultationPage(page);
  await c.openFor(pt1);
  const branch = c.main.getByRole('combobox', { name: 'Branch' });

  await qa.step(1, async () => {
    await expect(branch).toBeVisible();
    const options = await branch.locator('option').allInnerTexts();
    expect(options).toContain(BR_A);
    qa.note(1, `"Branch" offers ${options.filter((o) => o.trim() && o !== 'Branch').length} branches`);
  });

  await qa.step(2, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    const toasts = await toastsOf(page, () => c.submitOrder().click());
    expect(toasts.filter((t) => PLACED.test(t))).toEqual([]);
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(2, `without a branch: "${message}"`);
  });

  await qa.step(3, async () => {
    await branch.selectOption({ label: BR_A });
    await c.submitOrder().click();
    await expect(toastLocator(page, PLACED)).toBeVisible();
  });

  await qa.step(4, async () => {
    await asUser(browser, 'U1', async (u1) => {
      const o = new OrdersPage(u1);
      await expect.poll(() => pharmacyRows(o, pt1.fullName), { timeout: 30_000 }).toBeGreaterThan(0);
    });
  });
});

qaTest('TC-APP003-035', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): PT-1 and a restricted order of PT-1 that waits for authorisation.
  const pt1 = await newPt1(page, qa);
  const mine = new ConsultationPage(page);
  await mine.openFor(pt1);
  await placeRestricted(mine);

  const staff = await userPage(browser, 'U3');
  const c = new ConsultationPage(staff);
  try {
    await qa.step(1, async () => {
      await c.openFor(pt1);
      await c.fillOrder(CLINICAL.standardOrder);
      await tryRefused(qa, 1, staff, 'Submit order', PLACED, () => c.submitOrder().click());
      expect(await pharmacyRows(new OrdersPage(page), pt1.fullName)).toBe(0);
    });

    await qa.step(2, async () => {
      const toasts = await toastsOf(staff, () => c.checkInteractions().click());
      qa.note(2, `Check interactions: "${toasts.join(' / ') || 'no toast'}"`);
      if (!toasts.includes('Interaction check failed.')) qa.deviation(2, 'Toast "Interaction check failed."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
    });

    await qa.step(3, async () => {
      const row = c.restrictedList().getByRole('listitem').filter({ hasText: pt1.fullName }).first();
      await expect(row).toBeVisible();
      await row.getByRole('textbox', { name: 'Remark' }).fill(qa.name('QA tanpa hak'));
      await tryRefused(qa, 3, staff, 'Authorise', /authoris/i, () => row.getByRole('button', { name: 'Authorise' }).click());
      expect(await pharmacyRows(new OrdersPage(page), pt1.fullName)).toBe(0);
    });

    await qa.step(4, async () => {
      await c.showTab('SOAP');
      await c.panel.getByRole('textbox', { name: 'Subjective' }).fill(qa.name('QA S tanpa hak'));
      const toasts = await toastsOf(staff, () => c.panel.getByRole('button', { name: 'Save draft' }).click());
      qa.note(4, `Save draft: "${toasts.join(' / ') || 'no toast'}"`);
      if (!toasts.includes('Failed to save SOAP draft.')) qa.deviation(4, 'Toast "Failed to save SOAP draft."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
    });
    qa.note(1, 'every control is shown to U3; a refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP003-036', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Patient Care\b/));
    await qa.step(2, () =>
      routesRefused(staff, qa, 2, ['/clinical/consultation'], async () => {
        const c = new ConsultationPage(staff);
        if (!(await c.patientField.count())) return;
        await c.patientField.fill(CLINICAL.pt1.name);
        await expect(c.suggestions().first()).toBeAttached({ timeout: 10_000 }).catch(() => {});
        return `the patient search offers ${await c.suggestions().count()} patients`;
      }),
    );
  });
});

qaTest('TC-APP003-037', async ({ page, qa, browser }) => {
  // Precondition: a restricted order of a BR-B patient waits in BR-B (made by U6 for a seed patient of Kemayoran).
  const ptB = await asUser(browser, 'U6', async (u6) => {
    const p = await seedPatientOf(u6);
    const cb = new ConsultationPage(u6);
    await cb.openFor(p);
    await placeRestricted(cb);
    // The order waits in BR-B: U6 sees it.
    await cb.openFor(p);
    await expect(cb.restrictedList().getByRole('listitem').filter({ hasText: p.fullName }).first()).toBeVisible();
    return p;
  });
  const pt1 = await newPt1(page, qa);
  const c = new ConsultationPage(page);
  await c.openFor(pt1);

  await qa.step(1, async () => {
    await page.waitForLoadState('networkidle').catch(() => {});
    const rows = await c.restrictedList().getByRole('listitem').allInnerTexts();
    expect(rows.filter((r) => r.includes(ptB.fullName))).toEqual([]);
    qa.note(1, `${rows.length} waiting orders listed; none of ${ptB.fullName} (BR-B)`);
  });

  await qa.step(2, async () => {
    await expect(c.main.getByRole('combobox', { name: 'Branch' })).toHaveCount(0);
    await c.placeOrder(CLINICAL.standardOrder);
    await expect.poll(() => pharmacyRows(new OrdersPage(page), pt1.fullName), { timeout: 30_000 }).toBeGreaterThan(0);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});
