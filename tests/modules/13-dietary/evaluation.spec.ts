import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { DIET } from '../../../lib/diet-data';
import { AdmissionsPage } from '../../../pages/inpatient/InpatientPages';
import { OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { newBed } from '../../e2e/chains/steps/inpatient-steps';
import { signedOutJourney, userPage } from '../shared/access';
import { click, RequestsPage, TpnPage, TPN_A } from './helpers';

/**
 * 13-dietary.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): diet requests and the patient's stay, the
 * clinical basis and the links of a TPN, Dietary without a session, and two
 * dietitians at once. "Dietitian 2" is U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const docNo = (qa: Qa) => `${DIET.request.docNo}-${qa.token()}`;
const COMMENTS = 'QA Diet lunak, rendah garam';
const patientName = (qa: Qa) => `${DIET.tpn.patient} ${qa.token()}`;

qaTest('TC-APP013-013', async ({ page, qa }) => {
  const r = new RequestsPage(page);
  const adm = new AdmissionsPage(page);
  const name = `QA-DIE Pasien Satu ${qa.token()}`;
  const [bed1, bed2] = [await newBed(page, qa, 'QA-RI-01'), await newBed(page, qa, 'QA-RI-02')];
  await qa.step(1, async () => {
    await adm.open();
    await adm.admit(name, bed1);
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    await expect(r.dialog).toBeVisible();
    const text = (await r.dialog.innerText()).replace(/\s+/g, ' ');
    const offered = text.includes(name) || (await r.dialog.getByRole('combobox').count()) > 0;
    qa.note(1, `"New diet request" after admitting ${name} on ${bed1}: "${text.slice(0, 160)}"`);
    if (!offered) qa.deviation(1, 'A request for the new patient is proposed, or the admitted patients are offered', 'the form has free-text Bed no and Bed category only: no patient is offered');
    await page.keyboard.press('Escape');
  });
  const no = docNo(qa);
  expect(await r.create({ 'Doc no': no, 'Bed no': bed1, 'Bed category': DIET.request.bedCategory, Comments: COMMENTS })).toContain('Request created');
  qa.note(2, `RQ-1 of this test: ${no} for ${bed1}`);
  await qa.step(2, async () => {
    await adm.open();
    await adm.transfer(await adm.stay(name), bed2);
    const row = await r.row(no);
    await row.click();
    await page.waitForTimeout(800);
    const lines = (await r.main.innerText()).replace(/\s+/g, ' ');
    const shows = lines.includes(bed2);
    qa.note(2, `RQ-1 after the transfer to ${bed2}: ${shows ? 'shows the new bed' : `still ${bed1}`}`);
    if (!shows) qa.deviation(2, 'The line shows the new bed', `the line keeps ${bed1}: the request is not linked to the stay`);
  });
  await qa.step(3, async () => {
    await adm.open();
    await adm.markBillingCleared(await adm.stay(name));
    await adm.open();
    await (await adm.stay(name)).getByRole('button', { name: 'Discharge' }).click();
    const d = page.getByRole('dialog').last();
    const toasts = await click(page, d.getByRole('button', { name: /^(Discharge|Confirm|Start)/ }).last());
    qa.note(3, `discharge: "${toasts.join(' / ')}"`);
    const c = await r.cells(await r.row(no));
    qa.note(3, `RQ-1 after the discharge: ${c.join(' | ')}`);
    if (c[4] === 'Active') qa.deviation(3, 'The request is closed; Status is no longer "Active"', 'RQ-1 stays "Active" after the discharge');
  });
});

qaTest('TC-APP013-022', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const calc = async (lipid: string) => {
    await t.open();
    await t.fill({ ...TPN_A, lipid });
    await t.button('Calculate').click();
    await expect(t.result('BMI')).toBeVisible();
    return t.results();
  };
  qa.notRun(1, "no reference calculation of a clinical pharmacist for TPN-A is in the workbooks; the site's figures are recorded in step 2");
  await qa.step(2, async () => {
    const [r20, r10] = [await calc('20'), await calc('10')];
    const changed = Object.keys(r20).filter((k) => r20[k] !== r10[k]);
    qa.note(2, `lipid 20: ${JSON.stringify(r20)}`);
    qa.note(2, `lipid 10: ${JSON.stringify(r10)}`);
    qa.note(2, `changed: ${changed.join(', ')}`);
    const others = changed.filter((k) => !/^Lipid$|^Per litre$|^Volume$/.test(k));
    if (others.length) qa.deviation(2, 'Only the volume and weight of the lipid emulsion change', `also changed: ${others.map((k) => `${k} ${r20[k]} → ${r10[k]}`).join('; ')}`);
    else if (r20.Lipid?.split('/').pop() !== r10.Lipid?.split('/').pop()) qa.deviation(2, 'The share of energy given as lipid follows the prescription', `the lipid energy changes: ${r20.Lipid} → ${r10.Lipid}`);
  });
  await qa.step(3, async () => {
    const r = await calc('20');
    const labels = await t.main.getByRole('textbox').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? '').filter((l) => / \/ L$/.test(l)));
    qa.note(3, `electrolyte and additive fields: ${labels.join(', ')}; results: Electrolytes "${r.Electrolytes}", Additives "${r.Additives}"`);
    const unit = /mEq|mmol|units?|IU|mL/i;
    if (!labels.every((l) => unit.test(l)) || !unit.test(r.Electrolytes ?? '') || !unit.test(r.Additives ?? '')) qa.deviation(3, 'Each field and each result names its unit, for example mEq, mmol or units', `fields read "${labels.join(', ')}"; results "${r.Electrolytes}" and "${r.Additives}" with no unit`);
  });
});

qaTest('TC-APP013-025', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const name = patientName(qa);
  await t.open();
  await t.fill({ ...TPN_A, Patient: name });
  expect(await click(page, t.button('Save on patient'))).toContain('TPN saved on the patient.');
  qa.note(1, `TPN-A saved for "${name}"`);
  await qa.step(1, async () => {
    await t.open();
    const fields = await t.main.getByRole('textbox').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? ''));
    if (!fields.some((f) => /prescrib|doctor|dokter/i.test(f))) qa.deviation(1, 'A prescriber is required', `the form has no prescriber (fields: ${fields.filter(Boolean).join(', ')})`);
  });
  await qa.step(2, async () => {
    const o = new OrdersPage(page);
    await o.open();
    const n = await o.rows().filter({ hasText: name }).count();
    qa.note(2, `Pharmacy, Orders rows of "${name}": ${n}`);
    if (!n) qa.deviation(2, 'The prescription waits there to be verified and prepared', 'Pharmacy, Orders shows no TPN');
  });
  qa.notRun(3, 'nothing is prepared in Pharmacy (step 2), so no solution leaves the stock');
  qa.notRun(4, 'the TPN names the patient as free text only, so no charge can reach the bill; the cashier counter is closed until 07:00 WIB');
});

qaTest('TC-APP013-031', async ({ qa, browser }) => {
  await signedOutJourney(browser, qa, '/diet/tpn', /\/(id|en)\/diet\/tpn/);
  await qa.step(4, async () => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const page = await context.newPage();
      await page.goto('/id/diet/requests');
      await expect(page).toHaveURL(/\/login\?next=%2Fdiet%2Frequests/, { timeout: 20_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    } finally {
      await context.close();
    }
  });
});

qaTest('TC-APP013-033', async ({ page, qa, browser }) => {
  const r = new RequestsPage(page);
  const t = new TpnPage(page);
  await qa.step(1, async () => {
    const no = `QA-DIET-CEPAT-${qa.token()}`;
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    await r.dialog.getByRole('textbox', { name: 'Doc no', exact: true }).fill(no);
    await r.dialog.getByRole('textbox', { name: 'Bed no', exact: true }).fill(DIET.request.bedNo);
    await r.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).dblclick();
    await page.waitForTimeout(3000);
    const n = await (await r.row(no)).count();
    qa.note(1, `double-click on "Save": ${n} request(s) ${no}`);
    if (n !== 1) qa.deviation(1, 'One request. The button is disabled while it reads "Saving…"', `${n} requests`);
  });
  const name = patientName(qa);
  const d2 = await userPage(browser, 'U4');
  try {
    const t2 = new TpnPage(d2);
    await t2.open();
    const before2 = await t2.rows().filter({ hasText: name }).count();
    await qa.step(2, async () => {
      await t.open();
      await t.fill({ ...TPN_A, Patient: name });
      await t.button('Save on patient').dblclick();
      await page.waitForTimeout(3000);
      await t.open();
      const n = await t.rows().filter({ hasText: name }).count();
      qa.note(2, `double-click on "Save on patient": ${n} row(s) of "${name}" on the workbench`);
      if (n !== 1) qa.deviation(2, 'One prescription. The buttons are disabled while it is saved', `${n} prescriptions`);
    });
    await qa.step(3, async () => {
      const without = await t2.rows().filter({ hasText: name }).count();
      await t2.open();
      const after = await t2.rows().filter({ hasText: name }).count();
      qa.note(3, `Dietitian 2's workbench: ${before2} before, ${without} without a reload, ${after} after a reload`);
      if (!without && !after) qa.deviation(3, 'The new row appears, or a hint to reload', 'the row does not appear');
      else if (!without && !(await d2.getByText(/reload|refresh|muat ulang/i).count())) qa.note(3, 'the row appears after a reload; no hint is shown before');
    });
  } finally {
    await d2.context().close();
  }
  await qa.step(4, async () => {
    await t.open();
    await t.fill({ Height: TPN_A.Height, Weight: TPN_A.Weight });
    let warned = false;
    page.once('dialog', (d) => {
      warned = true;
      void d.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await t.open();
    const kept = (await t.field('Height').inputValue()) === TPN_A.Height;
    if (!warned && !kept) qa.deviation(4, 'The inputs are kept, or the dietitian is warned', 'the half-filled inputs are lost with no warning');
  });
});
