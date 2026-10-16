import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastLocator, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { DIET } from '../../../lib/diet-data';
import { LAB } from '../../../lib/lab-data';
import { RIS } from '../../../lib/ris-data';
import { WorklistPage } from '../../../pages/lab/LabPages';
import { advance, cellsOf, labType, toastsAfter } from '../../modules/11-laboratory/helpers';
import { RadOrdersPage, StudiesPage } from '../../modules/12-ris/helpers';
import { catalogue, click, RequestsPage, TPN_A, TPN_A_RESULTS, TpnPage } from '../../modules/13-dietary/helpers';
import { admitSteps, newBed } from './steps/inpatient-steps';

/**
 * E2E-027: an admitted patient gets a lab test (ordered, sampled, resulted,
 * certified and handed over), a diet (BMI and energy, a diet request on the
 * patient's bed, a TPN calculated and saved on the patient, its price on
 * Billing) and a radiology study. The admitted patient's name and bed are
 * used for the diet request and the TPN (the workbook's "QA-DIE Pasien Satu"
 * and diet bed stand for the patient of the stay); the lab and radiology
 * orders carry no patient on the site. Radiology is last: an order without a
 * study date is not offered on "Schedule and report" (see E2E-003).
 */
chainTest('E2E-027', async ({ page, chain }) => {
  await installToastRecorder(page);
  const w = new WorklistPage(page);
  const stay = { name: '', bed: '' };

  await chain.step(1, async (qa) => {
    stay.name = qa.name('QA-INP Pasien Satu');
    stay.bed = await newBed(page, qa, 'QA-101');
    await admitSteps(page, qa, stay.name, stay.bed);
  });

  const type = await chain.step(2, async (qa) => {
    const t = labType(qa);
    const d = page.getByRole('dialog', { name: 'Create lab order' });
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /^Laboratory\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Open worklist' }).click();
      await expect(w.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await w.main.getByRole('button', { name: 'New lab order' }).click();
      await expect(d.getByRole('textbox', { name: 'Result type' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await d.getByRole('textbox', { name: 'Result type' }).fill(t);
      await d.getByRole('textbox', { name: 'Remarks' }).fill(LAB.remark);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Create' }).click();
      expect(await toastsAfter(page, mark)).toContain('Lab order created');
    });
    await qa.step(4, async () => expect((await cellsOf(page, t)).slice(0, 3)).toEqual(['—', t, 'Ordered']));
    return t;
  });

  await chain.step(3, async (qa) => {
    // Precondition: the order is "Generated" (sample labelled).
    await advance(page, type, ['Generated']);
    // The list renders twice after a search: a press that lands on the first rendering is repeated (as advance() does).
    // The answer can take more than 5 s; the toast is awaited on screen (a reload clears the toast recorder),
    // and a press that lands on the first rendering of the list is repeated.
    const step = async (s: 'Sent' | 'Accepted'): Promise<string[]> => {
      const toast = toastLocator(page, new RegExp(`^Advanced to ${s}$`));
      for (let i = 0; i < 3; i++) {
        await w.press(await w.row(type), s);
        if (await toast.waitFor({ timeout: 15_000 }).then(() => true, () => false)) return [`Advanced to ${s}`];
        if ((await cellsOf(page, type))[2] === s) return [];
      }
      return [];
    };
    await qa.step(1, async () => {
      expect(await step('Sent')).toContain('Advanced to Sent');
      expect((await cellsOf(page, type))[2]).toBe('Sent');
    });
    await qa.step(2, async () => {
      expect(await step('Accepted')).toContain('Advanced to Accepted');
      const r = await w.row(type);
      expect((await w.cells(r))[2]).toBe('Accepted');
      await expect(r.getByRole('button', { name: 'Capture result', exact: true })).toBeVisible();
    });
  });

  await chain.step(4, async (qa) => {
    await qa.step(1, async () => {
      const row = await w.row(type);
      const sample = (await w.cells(row))[0];
      await w.press(row, 'Capture result', w.capture);
      await expect(w.capture.getByText(`${type} · Accepted · ${sample}`, { exact: true })).toBeVisible();
    });
    await qa.step(2, async () => {
      await w.field('Lab result').fill(LAB.result);
      await w.field('Result range').fill(LAB.range);
      await w.field('Remarks').fill(LAB.note);
      const mark = await toastMark(page);
      await w.capture.getByRole('button', { name: 'Save result' }).click();
      expect(await toastsAfter(page, mark)).toContain('Result captured');
    });
    await qa.step(3, async () => {
      await w.capture.getByRole('button', { name: 'Cancel' }).click();
      const c = await cellsOf(page, type);
      expect([c[2], c[3], c[4], c[6]]).toEqual(['Resulted', LAB.result, LAB.range, LAB.note]);
    });
  });

  await chain.step(5, async (qa) => {
    await qa.step(1, async () => {
      await w.open();
      await expect(w.table.getByRole('columnheader', { name: 'Result status' })).toBeVisible();
    });
    await qa.step(2, async () => {
      const d = page.getByRole('dialog', { name: 'Result status' });
      await w.press(await w.row(type), 'Result status', d);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Certify' }).click();
      expect(await toastsAfter(page, mark)).toContain('Order certified');
    });
    const d = page.getByRole('dialog').filter({ hasText: 'Handed to' });
    await qa.step(3, async () => {
      await w.press(await w.row(type), 'Handover', d);
      for (const f of ['Handed to', 'How', 'Dispatch number']) await expect(d.getByLabel(f, { exact: true })).toBeVisible();
    });
    await qa.step(4, async () => {
      await d.getByLabel('Handed to', { exact: true }).fill(qa.prefix('X Keluarga pasien'));
      await d.getByLabel('How', { exact: true }).fill(qa.prefix('X diambil'));
      await d.getByLabel('Dispatch number', { exact: true }).fill(qa.code('X-D-001'));
      const sig = d.getByRole('combobox', { name: 'Signature' });
      if (await sig.count()) await sig.selectOption({ label: 'Signed' });
      const mark = await toastMark(page);
      await d.getByRole('button', { name: /^Save/ }).click();
      expect(await toastsAfter(page, mark)).toContain('Handover saved.');
    });
  });

  await chain.step(6, async (qa) => {
    const c = catalogue(page);
    await qa.step(1, async () => {
      await c.open();
      await expect(c.weight).toHaveValue('60');
      await expect(c.height).toHaveValue('160');
    });
    await qa.step(2, async () => {
      await c.gender.selectOption('female');
      const toasts = await click(page, c.formula);
      if (!toasts.includes('Saved')) qa.note(2, `not saved ("${toasts.join(' / ')}"): the rule for female exists from an earlier run (one rule per gender)`);
    });
    await qa.step(3, async () => {
      await c.open();
      await c.gender.selectOption('female');
      expect(await click(page, c.calculate)).toContain('Saved');
      await expect(c.main.getByText('23.4 / 1600', { exact: true })).toBeVisible();
    });
    await qa.step(4, async () => {
      await c.weight.fill('80');
      await c.height.fill('170');
      await click(page, c.calculate);
      await expect(c.main.getByText('27.7 / 1863', { exact: true })).toBeVisible();
    });
  });

  await chain.step(7, async (qa) => {
    const r = new RequestsPage(page);
    const no = `${DIET.request.docNo}-${qa.token()}`;
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /^Dietary\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Open requests' }).click();
      await expect(r.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await r.main.getByRole('button', { name: 'New request' }).click();
      await expect(r.dialog.getByRole('textbox', { name: 'Bed no', exact: true })).toBeVisible();
    });
    await qa.step(3, async () => {
      await r.dialog.getByRole('textbox', { name: 'Doc no' }).fill(no);
      await r.dialog.getByRole('textbox', { name: 'Bed no' }).fill(stay.bed);
      await r.dialog.getByRole('textbox', { name: 'Bed category' }).fill(DIET.request.bedCategory);
      await r.dialog.getByRole('textbox', { name: 'Comments' }).fill('QA Diet lunak, rendah garam');
      expect(await click(page, r.dialog.getByRole('button', { name: 'Save' }))).toContain('Request created');
    });
    await qa.step(4, async () => expect(await r.cells(await r.row(no))).toEqual([no, todayWib(), todayWib(), '1 line(s)', 'Active']));
    qa.note(3, `the diet request is for the bed of the stay (${stay.bed})`);
  });

  const t = new TpnPage(page);
  await chain.step(8, async (qa) => {
    await qa.step(1, async () => {
      await page.goto('/en/diet');
      await page.getByRole('main').getByRole('link', { name: 'TPN', exact: true }).click();
      await expect(t.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      const { 'Sodium / L': _a, 'Potassium / L': _b, 'Calcium / L': _c, 'Magnesium / L': _d, 'Phosphate / L': _e, 'MVI-12 / L': _f, 'Trace metals / L': _g, ...first } = TPN_A;
      await t.fill(first);
      await expect(t.field('Height')).toHaveValue(DIET.tpn.height);
    });
    await qa.step(3, async () => {
      await t.fill({ 'Sodium / L': DIET.tpn.sodium, 'Potassium / L': DIET.tpn.potassium, 'Calcium / L': DIET.tpn.calcium, 'Magnesium / L': DIET.tpn.magnesium, 'Phosphate / L': DIET.tpn.phosphate, 'MVI-12 / L': DIET.tpn.mvi, 'Trace metals / L': DIET.tpn.trace });
      await expect(t.field('Trace metals / L')).toHaveValue(DIET.tpn.trace);
    });
    await qa.step(4, async () => {
      await t.button('Calculate').click();
      await expect(t.result('BMI')).toBeVisible();
    });
    const r = await t.results();
    for (const [step, keys] of [[5, ['BMI', 'Protein', 'Dextrose', 'Lipid']], [6, ['Max dextrose', 'Dextrose rate', 'Volume', 'Per litre']], [7, ['Electrolytes', 'Additives']]] as const) {
      await qa.step(step, async () => {
        for (const k of keys) expect(r[k], k).toBe(TPN_A_RESULTS[k]);
      });
    }
  });

  await chain.step(9, async (qa) => {
    await qa.step(1, async () => {
      await t.fill({ Patient: stay.name });
      expect(await click(page, t.button('Save on patient'))).toContain('TPN saved on the patient.');
      await expect(t.result('BMI')).toHaveText(TPN_A_RESULTS.BMI);
    });
    await qa.step(2, async () => {
      await t.open();
      const mine = await t.cells(t.rows().filter({ has: page.getByRole('cell', { name: stay.name, exact: true }) }));
      expect(mine).toEqual([stay.name, TPN_A_RESULTS.BMI, '70 g', '388.24 g', '200 mL', '2.1 L']);
    });
    qa.note(1, 'the TPN is saved on the admitted patient of step 1');
  });

  await chain.step(10, async (qa) => {
    const main = page.getByRole('main');
    await qa.step(1, async () => {
      await page.goto('/en/pharmacy');
      await page.getByRole('navigation', { name: 'Pharmacy' }).getByRole('link', { name: 'Price & TPN' }).click();
      await expect(main.getByRole('heading', { level: 1, name: 'Price and TPN' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await main.getByRole('link', { name: 'Open Billing' }).click();
      await expect(page).toHaveURL(/\/billing$/);
    });
    await qa.step(3, async () => {
      await page.goBack();
      await main.getByRole('link', { name: 'Open diet TPN' }).click();
      await expect(page).toHaveURL(/\/diet\/tpn$/);
    });
  });

  const o = new RadOrdersPage(page);
  const study = await chain.step(11, async (qa) => {
    const s = `${RIS.short.study} ${qa.token()}`;
    await qa.step(1, async () => expect(await o.create({ 'Study description': s })).toContain('Order created'));
    await qa.step(2, async () => {
      const c = await o.cells(await o.row(s));
      expect(c[0]).toMatch(/^RAD-\d+$/);
      expect(c.slice(1)).toEqual([s, '—', '—', '—', '—']);
    });
    return s;
  });

  await chain.step(12, async (qa) => {
    const s = new StudiesPage(page);
    const start = `${addDays(todayWib(), 1)}T02:00:00Z`;
    await qa.step(1, async () => {
      await s.open();
      qa.note(1, `"Schedule and report" lists ${await s.order.locator('option').count()} orders`);
    });
    await qa.step(2, async () => {
      await expect(s.order.locator('option', { hasText: study }), `the order "${study}" of step 11 can be chosen in "Schedule and report"`).toBeAttached();
      expect(await s.act(study, 'Schedule', { Room: qa.code('X-RO1'), Start: start })).toContain('Saved');
    });
    await qa.step(3, async () => expect(await s.act(study, 'Accept')).toContain('Saved'));
    await qa.step(4, async () => expect(await s.act(study, 'Save report', { 'Report text': qa.prefix('X Tidak tampak kelainan') })).toContain('Saved'));
    await qa.step(5, async () => expect(await s.act(study, 'Attach', { 'File name': `${qa.code('X-thorax')}.pdf` })).toContain('Saved'));
    await qa.step(6, async () => qa.note(6, `Schedule and report: "${await s.line(study)}"`));
  });
});
