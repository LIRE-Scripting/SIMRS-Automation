import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { DIET } from '../../../lib/diet-data';
import { click, TpnPage, TPN_A, type TpnInputs } from './helpers';

/**
 * 13-dietary.xlsx, feature "Total parenteral nutrition (/diet/tpn)". Patient
 * names and template codes carry a token; TPN-A comes from the catalogue.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const SAVED = 'TPN saved on the patient.';
const BASE: TpnInputs = { 'Energy (kcal)': '2000', 'Protein (g/kg)': '1', 'Fluid (mL/kg)': '30', lipid: '20' };
const patientName = (qa: Qa) => `${DIET.tpn.patient} ${qa.token()}`;

/** The expected results of TPN-A (TC-APP013-004, steps 5 to 7). */
const TPN_A_RESULTS: Record<string, string> = {
  BMI: '24.22 · Normal',
  Protein: '70 g / 280 kcal',
  Dextrose: '388.24 g / 1320 kcal',
  Lipid: '200 mL / 40 g / 400 kcal',
  'Max dextrose': '504 g',
  'Dextrose rate': '3.85 mg/kg/min',
  Volume: '2.1 L',
  'Per litre': 'P 33.33 · D 184.88 · L 19.05',
  Electrolytes: 'Na 84 · K 42 · Ca 10.5 · Mg 8.4 · PO4 21',
  Additives: 'MVI 21 · Trace 2.1 · Heparin 0 · Insulin 0',
};

async function calculate(t: TpnPage, v: TpnInputs): Promise<Record<string, string>> {
  await t.open();
  await t.fill(v);
  await t.button('Calculate').click();
  await expect(t.result('BMI')).toBeVisible();
  return t.results();
}

/** Saves TPN-A on a patient of this test; returns the name. */
async function saved(t: TpnPage, qa: Qa): Promise<string> {
  const name = patientName(qa);
  await t.open();
  await t.fill({ ...TPN_A, Patient: name });
  expect(await click(t.page, t.button('Save on patient'))).toContain(SAVED);
  return name;
}

qaTest('TC-APP013-004', async ({ page, qa }) => {
  const t = new TpnPage(page);

  await qa.step(1, async () => {
    await page.goto('/en/diet');
    await page.getByRole('main').getByRole('link', { name: 'TPN', exact: true }).click();
    await expect(t.heading).toBeVisible();
    await expect(t.main.getByText('Calculate one composition, save it on the patient, and list it for compounding.', { exact: true })).toBeVisible();
    for (const b of ['Calculate', 'Save on patient', 'Save template', 'Reset'] as const) await expect(t.button(b)).toBeVisible();
    await expect(t.main.getByRole('heading', { level: 2, name: 'Compounding workbench' })).toBeVisible();
  });

  await qa.step(2, async () => {
    const { 'Sodium / L': _a, 'Potassium / L': _b, 'Calcium / L': _c, 'Magnesium / L': _d, 'Phosphate / L': _e, 'MVI-12 / L': _f, 'Trace metals / L': _g, ...first } = TPN_A;
    await t.fill(first);
    await expect(t.field('Height')).toHaveValue(DIET.tpn.height);
    await expect(t.main.getByRole('combobox', { name: 'Height unit' })).toHaveValue('cm');
    await expect(t.main.getByRole('combobox', { name: 'Lipid %' })).toHaveValue('20');
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

qaTest('TC-APP013-005', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const name = patientName(qa);
  await t.open();
  await t.fill(TPN_A);

  await qa.step(1, async () => {
    await t.fill({ Patient: name });
    expect(await click(page, t.button('Save on patient'))).toContain(SAVED);
    await expect(t.result('BMI')).toHaveText(TPN_A_RESULTS.BMI);
  });

  await qa.step(2, async () => {
    await t.open();
    const first = await t.cells(t.rows().first());
    const mine = await t.cells(t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) }));
    expect(mine).toEqual([name, TPN_A_RESULTS.BMI, '70 g', '388.24 g', '200 mL', '2.1 L']);
    if (first[0] !== name) qa.deviation(2, 'The first row of "Compounding workbench"', `the row is not first (first is "${first[0]}")`);
  });
});

qaTest('TC-APP013-006', async ({ page, qa }) => {
  const t = new TpnPage(page);
  await qa.step(1, async () => {
    const r = await calculate(t, { ...BASE, Height: '170', heightUnit: 'cm', Weight: '70', weightUnit: 'kg' });
    expect([r.BMI, r.Protein]).toEqual(['24.22 · Normal', '70 g / 280 kcal']);
  });
  await qa.step(2, async () => {
    const r = await calculate(t, { ...BASE, Height: '67', heightUnit: 'in', Weight: '154', weightUnit: 'lb' });
    expect([r.BMI, r.Protein, r.Dextrose, r.Volume]).toEqual(['24.12 · Normal', '69.85 g / 279.4 kcal', '388.41 g / 1320.6 kcal', '2.1 L']);
    qa.note(2, `Max dextrose reads "${r['Max dextrose']}"`);
  });
  await qa.step(3, async () => {
    await expect(t.main.getByRole('combobox', { name: 'Height unit' }).locator('option')).toHaveText(['m', 'cm', 'ft', 'in']);
    await expect(t.main.getByRole('combobox', { name: 'Weight unit' }).locator('option')).toHaveText(['kg', 'g', 'lb']);
  });
});

qaTest('TC-APP013-007', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const code = `${DIET.template}-${qa.token()}`;
  const reuse = t.main.getByRole('combobox', { name: 'Reuse template' });
  await t.open();
  await t.fill(TPN_A);

  await qa.step(1, async () => {
    await t.fill({ 'Template code': code, Description: 'QA Standar dewasa' });
    expect(await click(page, t.button('Save template'))).toContain('Template saved.');
    await expect(reuse.locator('option', { hasText: code })).toBeAttached();
  });

  await qa.step(2, async () => {
    await t.button('Reset').click();
    for (const f of ['Height', 'Weight', 'Energy (kcal)', 'Protein (g/kg)', 'Fluid (mL/kg)']) await expect(t.field(f)).toHaveValue('');
    await expect(t.main.getByRole('combobox', { name: 'Height unit' })).toHaveValue('m');
    await expect(t.main.getByRole('combobox', { name: 'Weight unit' })).toHaveValue('kg');
    await expect(t.main.getByRole('term')).toHaveCount(0);
  });

  await qa.step(3, async () => {
    const label = (await reuse.locator('option', { hasText: code }).first().innerText()).trim();
    await reuse.selectOption({ label });
    await expect(t.field('Height')).toHaveValue(DIET.tpn.height);
    await expect(t.field('Energy (kcal)')).toHaveValue(DIET.tpn.energy);
    await expect(t.field('Description')).toHaveValue('QA Standar dewasa');
    await expect(t.main.getByRole('term')).toHaveCount(0);
  });

  await qa.step(4, async () => {
    await t.button('Calculate').click();
    await expect(t.result('BMI')).toBeVisible();
    const r = await t.results();
    for (const k of Object.keys(TPN_A_RESULTS)) expect(r[k], k).toBe(TPN_A_RESULTS[k]);
  });
});

qaTest('TC-APP013-008', async ({ page, qa }) => {
  const t = new TpnPage(page);
  await t.open();
  const total = Number(((await t.pager().innerText()).match(/of (\d+)$/) ?? ['', '0'])[1]);
  let last = '';
  for (let i = total; i <= 10; i++) last = await saved(t, qa);
  if (!last) last = await saved(t, qa);

  await qa.step(1, async () => {
    await t.open();
    await expect(t.rows()).toHaveCount(10);
    await expect(t.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    await expect(t.workbench.getByRole('columnheader')).toHaveText(['Patient', 'BMI', 'Protein', 'Dextrose', 'Lipid', 'Volume']);
  });

  await qa.step(2, async () => {
    const first = (await t.cells(t.rows().first()))[0];
    if (first !== last) qa.deviation(2, 'The prescription saved last is first', `the first row is "${first}"`);
  });

  await qa.step(3, async () => {
    const first = await t.rows().first().innerText();
    await t.main.getByRole('button', { name: 'Next page' }).press('Enter');
    await expect(t.rows().first()).not.toHaveText(first);
  });
});

qaTest('TC-APP013-017', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const name = patientName(qa);

  await qa.step(1, async () => {
    await t.open();
    const f = t.field('Patient');
    if (!(await f.getAttribute('aria-controls')) && !(await f.getAttribute('list'))) qa.deviation(1, 'A search of the registered or admitted patients, by name or MRN', '"Patient" is a plain text field');
  });

  await qa.step(2, async () => {
    await t.open();
    await t.fill({ ...TPN_A, Patient: name });
    expect(await click(page, t.button('Save on patient'))).toContain(SAVED);
    await t.open();
    const c = await t.cells(t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) }));
    qa.deviation(2, "The row shows the patient's MRN or bed next to the name", `the row: ${c.join(' | ')}`);
  });

  await qa.step(3, async () => {
    await t.open();
    await t.fill({ ...TPN_A, Patient: name });
    expect(await click(page, t.button('Save on patient'))).toContain(SAVED);
    await t.open();
    const rows = t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) });
    const texts = await rows.allInnerTexts();
    if (new Set(texts).size < texts.length) qa.deviation(3, 'The two rows can be told apart', 'two identical rows');
  });

  await qa.step(4, async () => {
    await t.open();
    await t.fill({ ...TPN_A, Patient: `QA Bukan Pasien ${qa.token()}` });
    if ((await click(page, t.button('Save on patient'))).includes(SAVED)) qa.deviation(4, 'Refused', 'saved on a name that belongs to no patient');
  });
});

qaTest('TC-APP013-018', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const typed = async (field: string, keys: string) => {
    await t.field(field).fill('');
    await t.field(field).pressSequentially(keys, { delay: 30 });
    return t.field(field).inputValue();
  };
  await t.open();
  for (const [step, field, keys, want] of [[1, 'Height', '1.7', '1.7'], [2, 'Protein (g/kg)', '1.5', '1.5'], [3, 'Sodium / L', '0.5', '0.5']] as const) {
    await qa.step(step, async () => {
      const v = await typed(field, keys);
      if (v !== want) qa.deviation(step, `The field shows ${want}`, `the field shows "${v}"`);
    });
  }
  await qa.step(4, async () => {
    const v = await typed('Height', '1,7');
    if (!['1,7', '1.7'].includes(v)) qa.deviation(4, 'The field shows 1,7 or 1.7, or the comma is refused with a hint', `the field shows "${v}"`);
  });
  await qa.step(5, async () => {
    await t.field('Height').fill('');
    await t.field('Height').focus();
    await page.evaluate(() => navigator.clipboard?.writeText('1.7').catch(() => {}));
    await t.field('Height').fill('1.7');
    await expect(t.field('Height')).toHaveValue('1.7');
    qa.note(5, 'the value is set at once (as a paste does)');
  });
  await qa.step(6, async () => {
    await t.fill({ Weight: '70', 'Energy (kcal)': '2000', 'Fluid (mL/kg)': '30', 'Protein (g/kg)': '1' });
    await t.button('Calculate').click();
    await expect(t.result('BMI')).toHaveText('24.22 · Normal');
  });
});

qaTest('TC-APP013-019', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const cases: [number, TpnInputs, string][] = [
    [1, { Height: '170', heightUnit: 'cm', Weight: '70', 'Energy (kcal)': '500', 'Protein (g/kg)': '2', 'Fluid (mL/kg)': '30', lipid: '20' }, 'Refused or flagged: the protein and lipid calories exceed the energy'],
    [2, { Height: '160', heightUnit: 'cm', Weight: '50', 'Energy (kcal)': '3000', 'Protein (g/kg)': '1', 'Fluid (mL/kg)': '30', lipid: '10' }, 'A warning: the dextrose is above the maximum'],
    [3, { ...TPN_A, 'Potassium / L': '500', 'Insulin / L': '1000' }, 'A warning about the potassium and the insulin'],
  ];
  for (const [step, inputs, expected] of cases) {
    await qa.step(step, async () => {
      const r = await calculate(t, inputs);
      const warned = await t.main.getByText(/warning|exceed|above|too high|danger/i).count();
      qa.note(step, `results: ${['Dextrose', 'Max dextrose', 'Dextrose rate', 'Electrolytes', 'Additives'].map((k) => `${k} ${r[k]}`).join('; ')}`);
      if (!warned) qa.deviation(step, expected, 'no mark or warning');
    });
  }
  await qa.step(4, async () => {
    const savedCases: number[] = [];
    for (const [step, inputs] of cases) {
      await t.open();
      await t.fill({ ...inputs, Patient: `${patientName(qa)}` });
      if ((await click(page, t.button('Save on patient'))).includes(SAVED)) savedCases.push(step);
    }
    if (savedCases.length) qa.deviation(4, 'Refused, or saved only after a confirmation', `saved without a question: case(s) ${savedCases.join(', ')}`);
  });
});

qaTest('TC-APP013-020', async ({ page, qa }) => {
  const t = new TpnPage(page);
  await qa.step(1, async () => {
    await t.open();
    const toasts = await click(page, t.button('Calculate'));
    qa.note(1, `toast "${toasts.join(' / ')}"`);
    if (!toasts.some((x) => /height|weight|energy|protein|fluid/i.test(x)) || toasts.some((x) => /React error/.test(x))) qa.deviation(1, 'A message that names the missing fields, or the fields are marked', `toast "${toasts.join(' / ') || 'none'}"`);
  });
  await qa.step(2, async () => {
    await t.open();
    await t.fill({ ...TPN_A, 'Fluid (mL/kg)': '' });
    const toasts = await click(page, t.button('Calculate'));
    if (!toasts.some((x) => /^.*fluid.*$/i.test(x) && !/height, weight/i.test(x))) qa.deviation(2, 'A message that the fluid is missing', `toast "${toasts.join(' / ') || 'none'}"`);
  });
  await qa.step(3, async () => {
    await t.open();
    await t.fill(TPN_A);
    const toasts = await click(page, t.button('Save on patient'));
    expect(toasts).not.toContain(SAVED);
    if (!toasts.some((x) => /patient/i.test(x))) qa.deviation(3, 'A message that the patient is missing', toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing happens, no message');
  });
  await qa.step(4, async () => {
    const toasts = await click(page, t.button('Save template'));
    expect(toasts).not.toContain('Template saved.');
    if (!toasts.some((x) => /code/i.test(x))) qa.deviation(4, 'A message that the code is missing', toasts.length ? `toast "${toasts.join(' / ')}"` : 'nothing happens, no message');
  });
});

qaTest('TC-APP013-021', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const cases: [number, TpnInputs, string][] = [
    [1, { ...BASE, Height: '200', heightUnit: 'cm', Weight: '74', weightUnit: 'kg' }, '18.5'],
    [2, { ...BASE, Height: '170', heightUnit: 'cm', Weight: '72', weightUnit: 'kg' }, '24.91'],
    [3, { ...BASE, Height: '190', heightUnit: 'cm', Weight: '108', weightUnit: 'kg' }, '29.92'],
    [4, { Height: '50', heightUnit: 'cm', Weight: '3000', weightUnit: 'g', 'Energy (kcal)': '300', 'Protein (g/kg)': '3', 'Fluid (mL/kg)': '150', lipid: '20' }, '12'],
  ];
  for (const [step, inputs, bmi] of cases) {
    await qa.step(step, async () => {
      const r = await calculate(t, inputs);
      expect(r.BMI.startsWith(`${bmi} ·`)).toBe(true);
      qa.note(step, `BMI "${r.BMI}"`);
      if (step === 4 && /Underweight|Normal|Overweight|Obese/.test(r.BMI)) qa.deviation(4, 'No adult BMI class for a newborn, or a class for the age', `"${r.BMI}"`);
    });
  }
});

qaTest('TC-APP013-023', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const name = await saved(t, qa);
  await t.open();
  const row = t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) });
  await qa.step(1, async () => {
    const c = await t.cells(row);
    if (!c.join(' ').match(/Na|K |Ca/)) qa.deviation(1, 'Patient, protein, dextrose, lipid, volume, and the electrolytes and additives', `the row: ${c.join(' | ')}`);
  });
  await qa.step(2, async () => {
    await row.getByRole('cell').first().click();
    if (!(await page.getByRole('dialog').count())) qa.deviation(2, 'The full prescription opens', 'a row cannot be opened');
  });
  await qa.step(3, async () => {
    const c = (await t.cells(row)).join(' ');
    if (!/\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/.test(c)) qa.deviation(3, 'The date, the time and the person who saved it', 'none is shown');
  });
  await qa.step(4, async () => {
    if (!(await row.getByRole('button').count())) qa.deviation(4, 'A status, a button to mark it prepared and a print-out', 'none');
  });
});

qaTest('TC-APP013-024', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const name = patientName(qa);
  await t.open();
  await t.fill({ ...TPN_A, Patient: name });
  await qa.step(1, async () => {
    expect(await click(page, t.button('Save on patient'))).toContain(SAVED);
    const second = await click(page, t.button('Save on patient'));
    if (second.includes(SAVED)) qa.deviation(1, 'The second click is refused, or the dietitian is asked whether a second TPN is meant', 'a second, identical row is saved');
  });
  await qa.step(2, async () => {
    await t.open();
    const row = t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) }).first();
    if (!(await row.getByRole('button').count())) qa.deviation(2, 'The prescription can be edited before it is prepared', 'no edit');
  });
  await qa.step(3, async () => {
    const row = t.rows().filter({ has: page.getByRole('cell', { name, exact: true }) }).first();
    if (!(await row.getByRole('button', { name: /cancel/i }).count())) qa.deviation(3, 'A cancellation with a reason', 'no cancel');
  });
});

qaTest('TC-APP013-026', async ({ page, qa }) => {
  const t = new TpnPage(page);
  const code = `${DIET.template}-${qa.token()}`;
  const reuse = t.main.getByRole('combobox', { name: 'Reuse template' });
  await t.open();
  await t.fill({ ...TPN_A, 'Template code': code, Description: 'QA Standar dewasa' });
  expect(await click(page, t.button('Save template'))).toContain('Template saved.');
  qa.note(1, `TPL-1 is a template of this test (${code})`);

  await qa.step(1, async () => {
    await t.open();
    await t.fill({ ...BASE, Height: '160', heightUnit: 'cm', Weight: '50', 'Template code': code });
    const toasts = await click(page, t.button('Save template'));
    if (toasts.includes('Template saved.')) qa.deviation(1, 'Refused: the code exists, or the dietitian is asked whether to replace it', `saved; "${code}" is listed ${await reuse.locator('option', { hasText: code }).count()} times`);
  });

  await qa.step(2, async () => {
    await t.open();
    const label = (await reuse.locator('option', { hasText: code }).first().innerText()).trim();
    await reuse.selectOption({ label });
    await t.button('Reset').click();
    await reuse.selectOption({ label: 'None' }).catch(() => {});
    await reuse.selectOption({ label });
    if ((await t.field('Height').inputValue()) === '') qa.deviation(2, 'The inputs are loaded again', 'the fields stay empty');
  });

  await qa.step(3, async () => {
    const buttons = await t.main.getByRole('button').allInnerTexts();
    if (!buttons.some((b) => /edit|delete|remove/i.test(b))) qa.deviation(3, 'A template can be edited or removed', 'no edit or delete');
  });

  await qa.step(4, async () => {
    await t.open();
    await t.fill({ ...TPN_A, 'Template code': `${code}-${'X'.repeat(80)}`.slice(0, 65) });
    const toasts = await click(page, t.button('Save template'));
    expect(toasts).not.toContain('Template saved.');
    if (!toasts.some((x) => /64|long|limit/i.test(x))) qa.deviation(4, 'Refused with a message that names the limit of 64', `toast "${toasts.join(' / ')}"`);
  });
});
