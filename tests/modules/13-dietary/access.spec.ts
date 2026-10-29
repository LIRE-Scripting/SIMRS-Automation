import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { DIET } from '../../../lib/diet-data';
import { pageToRow } from '../../../pages/paging';
import { appsCardRefused, asUser, BR_B, headerOneBranch, menuScreens, routesRefused, toastsOf, tryRefused, userPage } from '../shared/access';
import { click, RequestsPage, TpnPage, TPN_A } from './helpers';

/**
 * 13-dietary.xlsx, the access test cases of Diet requests and TPN: U2 on
 * "All branches", U3 without any right, and U1 next to a branch of U6
 * (Kemayoran). Request numbers, patient names and template codes carry a token.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const CREATED = 'Request created';
const TPN_SAVED = 'TPN saved on the patient.';
const docNo = (qa: Qa, base: string = DIET.request.docNo) => `${base}-${qa.token()}`;
const request = (no: string) => ({ 'Doc no': no, 'Bed no': DIET.request.bedNo, 'Bed category': DIET.request.bedCategory, Comments: 'QA Diet lunak, rendah garam' });

/** Rows of a TPN prescription (by patient name) on the Compounding workbench, paging through it. */
async function tpnListed(page: Page, name: string): Promise<number> {
  const t = new TpnPage(page);
  await t.open();
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!(await t.rows().count())) return 0;
  return (await pageToRow(t.main, () => t.rows().filter({ hasText: name }))).count();
}

async function requestListed(page: Page, no: string): Promise<number> {
  return (await new RequestsPage(page).row(no)).count();
}

qaTest('TC-APP013-009', async ({ page, qa, browser }) => {
  const r = new RequestsPage(page);
  const t = new TpnPage(page);
  const no = docNo(qa, 'QA-DIET-B02');
  // The workbook's patient of BR-B, "QA-DIE Pasien Pusat", with a token.
  const patient = `QA-DIE Pasien Pusat ${qa.token()}`;
  const branch = r.dialog.getByRole('combobox', { name: 'Branch' });

  await qa.step(1, async () => {
    await r.open();
    const headers = (await r.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `the list has no Branch column (columns: ${headers.join(', ')})`);
  });

  await qa.step(2, async () => {
    await r.main.getByRole('button', { name: 'New request' }).click();
    await expect(branch).toBeVisible();
    for (const [k, v] of Object.entries(request(no))) await r.dialog.getByRole('textbox', { name: k, exact: true }).fill(v);
    const toasts = await toastsOf(page, () => r.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click());
    expect(toasts).not.toContain(CREATED);
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(2, `without a branch: "${message}"`);
  });

  await qa.step(3, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await click(page, r.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }))).toContain(CREATED);
  });

  const tpnBranch = t.main.getByRole('combobox', { name: 'Branch' });
  await qa.step(4, async () => {
    await t.open();
    await t.fill({ ...TPN_A, Patient: patient });
    const toasts = await toastsOf(page, () => t.button('Save on patient').click());
    expect(toasts).not.toContain(TPN_SAVED);
    expect(toasts.join(' ')).not.toBe('');
    qa.note(4, `without a branch: "${toasts.join(' / ')}"`);
  });

  await qa.step(5, async () => {
    await expect(tpnBranch).toBeVisible();
    await tpnBranch.selectOption({ label: BR_B });
    expect(await click(page, t.button('Save on patient'))).toContain(TPN_SAVED);
  });

  await qa.step(6, async () => {
    await asUser(browser, 'U6', async (u6) => {
      expect(await requestListed(u6, no)).toBe(1);
      expect(await tpnListed(u6, patient)).toBe(1);
    });
    await asUser(browser, 'U1', async (u1) => {
      expect(await requestListed(u1, no)).toBe(0);
      expect(await tpnListed(u1, patient)).toBe(0);
    });
  });
});

qaTest('TC-APP013-015', async ({ page, qa, browser }) => {
  // Preconditions: RQ-1 in BR-A (U1) and RQ-B in BR-B (U6), each with a number of this test.
  const r = new RequestsPage(page);
  const rq1 = docNo(qa);
  const rqB = docNo(qa, 'QA-DIET-B01');
  expect(await r.create(request(rq1))).toContain(CREATED);
  await asUser(browser, 'U6', async (u6) => expect(await new RequestsPage(u6).create(request(rqB))).toContain(CREATED));

  await qa.step(1, async () => {
    const toasts = await r.create(request(rq1));
    expect(toasts).not.toContain(CREATED);
    if (!toasts.some((x) => /already|exists|used|duplicate/i.test(x))) qa.deviation(1, 'A message that the number already exists', `toast "${toasts.join(' / ') || 'none'}"`);
    expect(await requestListed(page, rq1)).toBe(1);
  });

  await qa.step(2, async () => {
    const toasts = await r.create(request(rqB));
    const created = toasts.includes(CREATED);
    qa.note(2, `the number of BR-B in BR-A: ${created ? 'accepted' : `refused: "${toasts.join(' / ') || 'no toast'}"`}`);
    if (!created && !toasts.some((x) => /already|exists|used|branch/i.test(x))) qa.deviation(2, 'Accepted, or a message that explains where the number is used', `refused with "${toasts.join(' / ') || 'no toast'}"`);
  });

  await qa.step(3, async () => {
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    const field = r.dialog.getByRole('textbox', { name: 'Doc no', exact: true });
    const required = await field.evaluate((e: HTMLInputElement) => e.required);
    const hint = (await field.getAttribute('placeholder')) ?? '';
    if (required || !/auto/i.test(hint)) qa.deviation(3, 'The number can be left empty', `"Doc no" is ${required ? 'required' : 'not marked required'} and offers no automatic number${hint ? ` (hint "${hint}")` : ''}`);
  });
});

qaTest('TC-APP013-027', async ({ page, qa, browser }) => {
  const no = docNo(qa, 'QA-DIET-TANPA-HAK');
  const patient = `${DIET.tpn.patient} ${qa.token()}`;
  const code = `${DIET.template}-${qa.token()}`;
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const r = new RequestsPage(staff);
      await r.open();
      await r.main.getByRole('button', { name: 'New request' }).click();
      for (const [k, v] of Object.entries(request(no))) await r.dialog.getByRole('textbox', { name: k, exact: true }).fill(v);
      await tryRefused(qa, 1, staff, 'Save', new RegExp(`^${CREATED}$`), () => r.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click());
      expect(await requestListed(page, no)).toBe(0);
    });

    const t = new TpnPage(staff);
    await qa.step(2, async () => {
      await t.open();
      await t.fill({ ...TPN_A, Patient: patient });
      const toasts = await toastsOf(staff, () => t.button('Calculate').click());
      const shown = await t.result('BMI').isVisible();
      qa.note(2, `Calculate: ${shown ? 'the result is shown' : 'no result'}; "${toasts.join(' / ') || 'no toast'}"`);
    });

    await qa.step(3, async () => {
      await tryRefused(qa, 3, staff, 'Save on patient', new RegExp(`^${TPN_SAVED}$`), () => t.button('Save on patient').click());
      expect(await tpnListed(page, patient)).toBe(0);
    });

    await qa.step(4, async () => {
      await t.fill({ 'Template code': code, Description: 'QA Standar dewasa' });
      await tryRefused(qa, 4, staff, 'Save template', /^Template saved\.$/, () => t.button('Save template').click());
      const mine = new TpnPage(page);
      await mine.open();
      await expect(mine.main.getByRole('combobox', { name: 'Reuse template' }).locator('option', { hasText: code })).toHaveCount(0);
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP013-028', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^Dietary\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/diet/tpn']));
    await qa.step(3, () => routesRefused(staff, qa, 3, ['/diet/requests']));
  });
});

qaTest('TC-APP013-029', async ({ page, qa, browser }) => {
  // Preconditions (made by U6): RQ-B, a TPN prescription and a template of BR-B.
  const rqB = docNo(qa, 'QA-DIET-B01');
  const patientB = `${DIET.tpn.patient} ${qa.token()}`;
  const codeB = `${DIET.template}-${qa.token()}`;
  await asUser(browser, 'U6', async (u6) => {
    expect(await new RequestsPage(u6).create(request(rqB))).toContain(CREATED);
    const t = new TpnPage(u6);
    await t.open();
    await t.fill({ ...TPN_A, Patient: patientB });
    expect(await click(u6, t.button('Save on patient'))).toContain(TPN_SAVED);
    await t.fill({ 'Template code': codeB, Description: 'QA Standar dewasa' });
    expect(await click(u6, t.button('Save template'))).toContain('Template saved.');
  });

  await qa.step(1, async () => {
    expect(await requestListed(page, rqB)).toBe(0);
  });

  await qa.step(2, async () => {
    expect(await tpnListed(page, patientB)).toBe(0);
  });

  await qa.step(3, async () => {
    const t = new TpnPage(page);
    await t.open();
    await expect(t.main.getByRole('combobox', { name: 'Reuse template' }).locator('option', { hasText: codeB })).toHaveCount(0);
  });

  await qa.step(4, () => headerOneBranch(page, qa, 4));
});

qaTest('TC-APP013-052', async ({ qa, browser }) => {
  const staff = await userPage(browser, 'U3');
  const main = staff.getByRole('main');
  /** Clicks a button of a diet screen as U3; the toasts, or a note that the screen does not offer it. */
  const tryAs = async (route: string, button: string, fill?: () => Promise<void>): Promise<string> => {
    await staff.goto(`/id${route}`);
    await staff.waitForLoadState('networkidle').catch(() => {});
    const b = main.getByRole('button', { name: button }).first();
    if (!(await b.isVisible().catch(() => false))) return `no "${button}" offered`;
    if (fill) await fill();
    const toasts = await toastsOf(staff, () => b.click());
    return `"${toasts.join(' / ') || 'no toast'}"`;
  };
  try {
    await qa.step(1, async () => {
      qa.note(1, `U3 (no right) opens ${(await menuScreens(staff, '/diet', ['Catalogue', 'Diet orders', 'Kitchen', 'Service and bill'])).join('; ')} (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      const r = await tryAs('/diet/catalogue', 'Save', async () => {
        await main.getByRole('textbox').first().fill(qa.code('X-DIET-01'));
      });
      expect(r).not.toMatch(/"(Saved|.*saved)\.?"/i);
      qa.note(2, `Save on Catalogue: ${r} (TBD in the workbook: refused)`);
    });
    await qa.step(3, async () => qa.note(3, `Calculate on Catalogue: ${await tryAs('/diet/catalogue', 'Calculate')} (TBD in the workbook)`));
    await qa.step(4, async () => qa.note(4, `Approve on Kitchen: ${await tryAs('/diet/kitchen', 'Approve')} (TBD in the workbook)`));
    await qa.step(5, async () => {
      const r = await tryAs('/diet/service', 'Bill contractor', async () => {
        await main.getByRole('textbox').first().fill(qa.name('X Kontraktor gizi'));
      });
      qa.note(5, `Bill contractor on Service and bill: ${r} (TBD in the workbook: refused)`);
    });
  } finally {
    await staff.context().close();
  }
});
