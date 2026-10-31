import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { RIS } from '../../../lib/ris-data';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { newPt1 } from '../03-patient-care/cases';
import { signedOutJourney, userPage } from '../shared/access';
import { RadOrdersPage, toastsAfter } from './helpers';

/**
 * 12-ris.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): the doctor's request, numbers used twice,
 * the charge, Orders without a session and two radiographers at once.
 * "Radiographer 2" is U4 (qa.admin3). Orders carry the workbook text + token.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const study = (base: string, t: string) => `${base} ${t}`;

qaTest('TC-APP012-008', async ({ page, qa }) => {
  const pt = await newPt1(page, qa);
  const c = new ConsultationPage(page);
  await qa.step(1, async () => {
    await c.openFor(pt);
    const text = await c.panel.innerText();
    const button = await c.panel.getByRole('button', { name: /radiolog|imaging|x-ray|rontgen/i }).count();
    qa.note(1, `radiology on the consultation: ${button} button(s); "${(text.match(/.{0,40}(radiolog|rontgen).{0,40}/i) ?? [''])[0]}"`);
    if (!button) qa.deviation(1, 'A request form like the laboratory order', 'the Order tab has a laboratory order but no radiology request');
  });
  qa.notRun(2, 'no radiology request can be written from the consultation (step 1)');
  qa.notRun(3, 'no radiology request can be written from the consultation (step 1), so no report is linked to it');
});

qaTest('TC-APP012-014', async ({ page, qa, browser }) => {
  const o = new RadOrdersPage(page);
  const t = qa.token();
  const [ref, acc] = [`${RIS.full.ref}-${t}`, `${RIS.full.accession}-${t}`];
  expect(await o.create({ 'Study description': study(RIS.full.study, t), 'Order ref': ref, 'Accession no': acc })).toContain('Order created');
  qa.note(1, `the Full order of this test: ${ref}, ${acc}`);
  await qa.step(1, async () => {
    const toasts = await o.create({ 'Study description': study(RIS.short.study, qa.token()), 'Order ref': ref });
    qa.note(1, `a second order with ${ref}: "${toasts.join(' / ')}"`);
    if (toasts.includes('Order created')) qa.deviation(1, 'Refused: the reference is in use', `a second order with ${ref} is created`);
  });
  await qa.step(2, async () => {
    const toasts = await o.create({ 'Study description': study(RIS.short.study, qa.token()), 'Accession no': acc });
    qa.note(2, `a second order with ${acc}: "${toasts.join(' / ')}"`);
    if (toasts.includes('Order created')) qa.deviation(2, 'Refused, or a warning', `a second order with ${acc} is created with no warning`);
  });
  const r2 = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const [s1, s2] = [study(RIS.short.study, qa.token()), study(RIS.short.study, qa.token())];
      const [o1, o2] = [new RadOrdersPage(page), new RadOrdersPage(r2)];
      await Promise.all([o1.open(), o2.open()]);
      await Promise.all([o1.openNew(), o2.openNew()]);
      await o1.fill({ 'Study description': s1 });
      await o2.fill({ 'Study description': s2 });
      const [m1, m2] = [await toastMark(page), await toastMark(r2)];
      await Promise.all([o1.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click(), o2.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click()]);
      const [t1, t2] = [await toastsAfter(page, m1), await toastsAfter(r2, m2)];
      qa.note(3, `at the same moment: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
      const [c1, c2] = [await o1.cells(await o1.row(s1)), await o1.cells(await o1.row(s2))];
      qa.note(3, `references: ${c1[0]} and ${c2[0]}`);
      if (c1[0] === c2[0]) qa.deviation(3, 'Two different references', `both orders got ${c1[0]}`);
    });
  } finally {
    await r2.context().close();
  }
});

qaTest('TC-APP012-017', async ({ page, qa }) => {
  const o = new RadOrdersPage(page);
  await qa.step(1, async () => {
    expect(await o.create({ 'Study description': study(RIS.short.study, qa.token()) })).toContain('Order created');
    await o.openNew();
    const fields = await o.dialog.getByRole('textbox').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? ''));
    qa.note(1, `the order form: ${fields.join(', ')}`);
    await page.keyboard.press('Escape');
  });
  qa.notRun(2, "the order form has no patient (step 1), so no charge can reach PT-1's bill; the cashier counter is closed until 07:00 WIB");
});

qaTest('TC-APP012-022', ({ qa, browser }) => signedOutJourney(browser, qa, '/radiology/orders', /\/(id|en)\/radiology\/orders/));

qaTest('TC-APP012-024', async ({ page, qa, browser }) => {
  const o = new RadOrdersPage(page);
  const s = study(qa.prefix('QA Cepat'), qa.token());
  const r2 = await userPage(browser, 'U4');
  const o2 = new RadOrdersPage(r2);
  try {
    await o2.open();
    await qa.step(1, async () => {
      await o.open();
      await o.openNew();
      await o.fill({ 'Study description': s });
      await o.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).dblclick();
      await page.waitForTimeout(3000);
      const n = await (await o.row(s)).count();
      qa.note(1, `double-click on "Save": ${n} order(s) "${s}"`);
      if (n !== 1) qa.deviation(1, 'One order. The button is disabled while it reads "Saving…"', `${n} orders`);
    });
    await qa.step(2, async () => {
      const before = await o2.rows().filter({ hasText: s }).count();
      const after = await (await o2.row(s)).count();
      qa.note(2, `Radiographer 2's list without a reload: ${before}; after a reload: ${after}`);
      expect(after).toBeGreaterThan(0);
    });
  } finally {
    await r2.context().close();
  }
  await qa.step(3, async () => {
    await o.open();
    await o.openNew();
    await o.fill({ 'Study description': 'QA Cep' });
    let warned = false;
    page.once('dialog', (d) => {
      warned = true;
      void d.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await o.open();
    if (!warned && !(await o.dialog.isVisible().catch(() => false))) qa.deviation(3, 'The entries are kept, or the radiographer is warned', 'the half-filled order is lost with no warning');
  });
});
