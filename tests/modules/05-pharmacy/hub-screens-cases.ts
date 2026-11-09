import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { DispenseWizard, OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { backToIndonesian, CONFIRMED, outpatientOrder, patient, sell, stock, toastsAfter } from './helpers';
import { doseIds, recordDose, TC_APP005_063 } from './hub-cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of hub-screens.spec.ts, shared with the end-to-end chains (chain.run). */

export const TC_APP005_024: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  const cards = ['Orders', 'Dispense', 'Issue Lines'];

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Pharmacy\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Pharmacy$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Pharmacy' })).toBeVisible();
    await expect(main.getByText('Orders, dispense & issue lines', { exact: true })).toBeVisible();
    for (const c of cards) await expect(main.getByRole('link', { name: c, exact: true }).last()).toBeVisible();
    await expect(main.getByRole('link', { name: 'Dispense', exact: true }).first()).toBeVisible();
    qa.deviation(1, 'A Dispense button', '"Dispense" is a link');
  });

  await qa.step(2, async () => {
    for (const c of cards) {
      await page.goto('/id/pharmacy');
      await main.getByRole('link', { name: c, exact: true }).last().click();
      await expect(main.getByRole('heading', { level: 1, name: c })).toBeVisible();
    }
    const side = page.getByRole('navigation', { name: 'Pharmacy' });
    const items = (await side.getByRole('link').allInnerTexts()).map((t) => t.trim());
    if (items.length !== 3) qa.deviation(2, 'The sidebar shows 3 items', `${items.length} items: ${items.join(', ')}`);
    await side.getByRole('link', { name: 'Issue Lines' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Issue Lines' })).toBeVisible();
    const current = await side.getByRole('link', { name: 'Issue Lines' }).getAttribute('aria-current');
    if (!current) qa.note(2, 'the current item carries no aria-current; its highlight is styling only');
  });

  await qa.step(3, async () => {
    await main.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Pharmacy' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Pharmacy' })).toBeVisible();
    await expect(page).toHaveURL(/\/id\/pharmacy$/);
  });
};

export const TC_APP005_022: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  try {
    await switchLanguage(page, 'ID');

    await qa.step(1, () => asOnSite(async () => {
      await page.goto('/id/pharmacy');
      const h = await main.getByRole('heading', { level: 1 }).innerText();
      const desc = await main.getByText(/^Orders, dispense & issue lines$/).count();
      if (h === 'Pharmacy' || desc) qa.deviation(1, 'Heading, description, cards, sidebar and breadcrumb in Indonesian', `heading "${h}"${desc ? ', "Orders, dispense & issue lines"' : ''} stay English (known risk)`);
    }));

    await qa.step(2, () => asOnSite(async () => {
      await page.goto('/id/pharmacy/dispense');
      const want = ['Penyerahan obat bertahap, dengan pemeriksaan interaksi klinis.', 'Cari rekam medis', 'Cari nama atau kode', 'Lanjut', 'Kembali'];
      const text = await main.innerText();
      const missing = want.filter((w) => !text.includes(w));
      if (missing.length) qa.deviation(2, want.map((w) => `"${w}"`).join(', '), `missing: ${missing.join(', ')}; the screen reads "${(await main.getByRole('paragraph').first().innerText()).trim()}"`);
    }));

    await qa.step(3, () => asOnSite(async () => {
      const w = new DispenseWizard(page, 'id');
      await w.open();
      const steps = (await main.getByRole('list').first().getByRole('listitem').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
      if (/Select items/.test(steps.join(' '))) {
        // The wizard is in English, so the English helper completes the sale on /id/.
        const toasts = await sell(page, pt1, [{ item: PHARMACY.para }], 'id');
        expect(toasts).toContain(CONFIRMED);
        const label = (await w.main.getByText(/^Issued \d+ of \d+$/).first().innerText()).trim();
        qa.deviation(3, 'Indonesian step names, toast and label text', `English: steps "${steps.join(' / ')}", toast "${toasts.join(' / ')}", label "${label}"`);
      } else {
        qa.note(3, `step names "${steps.join(' / ')}"`);
        qa.notRun(3, 'the wizard is in Indonesian; the sale itself is covered in English (TC-APP005-007)');
      }
    }));

    await qa.step(4, () => asOnSite(async () => {
      await page.goto('/id/pharmacy/issue-lines');
      const cols = (await main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
      const h2 = await main.getByRole('heading', { level: 2 }).first().innerText();
      if (cols.includes('Requested') || h2 === 'Which lines may be returned') qa.deviation(4, 'Indonesian headings and column names', `"${h2}"; columns ${cols.join(', ')}`);
    }));
  } finally {
    await backToIndonesian(page);
  }
};

export const TC_APP005_058: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  const t = qa.token();
  const est = { patient: `X Pasien Estimasi 01 ${t}`, item: 'X Parasetamol', quantity: '10', amount: '500' };

  await qa.step(1, async () => {
    await page.goto('/id/pharmacy');
    await page.getByRole('navigation', { name: 'Pharmacy' }).getByRole('link', { name: 'Estimate' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Cost estimate' })).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'Patient' })).toHaveValue('');
    await expect(main.getByRole('textbox', { name: 'Item' })).toHaveValue('');
    await expect(main.getByRole('textbox', { name: 'Quantity' })).toHaveValue('1');
    await expect(main.getByRole('textbox', { name: 'Amount' })).toHaveValue('0');
    await expect(main.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  let line = '';
  await qa.step(2, async () => {
    await main.getByRole('textbox', { name: 'Patient' }).fill(est.patient);
    await main.getByRole('textbox', { name: 'Item' }).fill(est.item);
    await main.getByRole('textbox', { name: 'Quantity' }).fill(est.quantity);
    await main.getByRole('textbox', { name: 'Amount' }).fill(est.amount);
    const mark = await toastMark(page);
    await main.getByRole('button', { name: 'Save' }).click();
    expect(await toastsAfter(page, mark)).toContain('Saved');
    const shown = main.getByText(new RegExp(`${est.patient}`));
    await expect(shown).toBeVisible();
    line = (await shown.innerText()).trim();
  });

  await qa.step(3, async () => {
    qa.note(3, `the block reads "${line}" (quantity ${est.quantity} × amount ${est.amount} = 5000)`);
  });
};

export const TC_APP005_059: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  const t = qa.token();
  await page.goto('/id/pharmacy/estimate');
  await expect(main.getByRole('heading', { level: 1, name: 'Cost estimate' })).toBeVisible();
  const save = async (v: { patient: string; quantity?: string; amount?: string }) => {
    await main.getByRole('textbox', { name: 'Patient' }).fill(v.patient);
    await main.getByRole('textbox', { name: 'Item' }).fill('X Parasetamol');
    await main.getByRole('textbox', { name: 'Quantity' }).fill(v.quantity ?? '10');
    await main.getByRole('textbox', { name: 'Amount' }).fill(v.amount ?? '500');
    const mark = await toastMark(page);
    await main.getByRole('button', { name: 'Save' }).click();
    return toastsAfter(page, mark);
  };

  await qa.step(1, async () => {
    const toasts = await save({ patient: '' });
    expect(toasts).not.toContain('Saved');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(2, async () => {
    for (const [i, v] of [{ quantity: '0' }, { amount: '-1' }].entries()) {
      const patient = `X Pasien Estimasi 01 ${t}-${i}`;
      const toasts = await save({ patient, ...v });
      expect(toasts).not.toContain('Saved');
      await expect(main.getByText(patient)).toHaveCount(0);
      qa.note(2, `${JSON.stringify(v)}: "${toasts.join(' / ') || 'none'}"`);
    }
  });
};

export const TC_APP005_060: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  await stock(page, qa);
  const pt1 = await patient(page, qa);
  expect(await sell(page, pt1, [{ item: PHARMACY.para }])).toContain(CONFIRMED);
  const lookUp = async (text: string) => {
    await main.getByRole('textbox', { name: 'Patient' }).fill(text);
    const mark = await toastMark(page);
    await main.getByRole('button', { name: 'Look up' }).click();
    const toasts = await toastsAfter(page, mark);
    return { toasts, text: (await main.innerText()).replace(/\s+/g, ' ') };
  };

  await qa.step(1, async () => {
    await page.goto('/id/pharmacy');
    await page.getByRole('navigation', { name: 'Pharmacy' }).getByRole('link', { name: 'Patient issues' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Issues for one patient' })).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'Patient' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Look up' })).toBeVisible();
    await expect(main.getByText('Nothing here yet.', { exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    const seen: string[] = [];
    for (const typed of [pt1.fullName, pt1.mrn]) {
      const r = await lookUp(typed);
      seen.push(`"${typed}": toast "${r.toasts.join(' / ')}", ${r.text.includes(PHARMACY.para.name) ? 'lists the item' : 'Nothing here yet.'}`);
      if (r.text.includes(PHARMACY.para.name)) break;
    }
    qa.note(2, seen.join('; '));
    if (!seen.some((s) => s.includes('lists the item'))) qa.deviation(2, 'The block lists item names with the issued quantity', `nothing is listed for the name or the MRN (${seen.join('; ')})`);
  });

  await qa.step(3, async () => {
    const r = await lookUp(`QA-PHA Nobody ${qa.token()}`);
    expect(r.text).toContain('Nothing here yet.');
  });
};

export const TC_APP005_061: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/pharmacy/issues');
    await main.getByRole('textbox', { name: 'Patient' }).fill('');
    const mark = await toastMark(page);
    await main.getByRole('button', { name: 'Look up' }).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).not.toContain('Saved');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
};

export const TC_APP005_062: QaBody = async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/pharmacy');
    await page.getByRole('navigation', { name: 'Pharmacy' }).getByRole('link', { name: 'Price & TPN' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Price and TPN' })).toBeVisible();
    await expect(main.getByText('Price, tax, and margin stay on Billing. Pharmacy has no second price list.', { exact: true })).toBeVisible();
    await expect(main.getByText('TPN stays the diet calculator. Pharmacy has no second TPN document.', { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    await main.getByRole('link', { name: 'Open Billing' }).click();
    await expect(page).toHaveURL(/\/billing$/);
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
  });
  await qa.step(3, async () => {
    await page.goBack();
    await main.getByRole('link', { name: 'Open diet TPN' }).click();
    await expect(page).toHaveURL(/\/diet\/tpn$/);
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
  });
};

export const TC_APP005_064: QaBody = async ({ page, qa }) => {
  const { pt1, order } = await doseIds(page, qa);
  await qa.step(1, async () => {
    await page.goto('/id/pharmacy/doses');
    const toasts = await recordDose(page, { patient: pt1.mrn, order, status: 'Not given' });
    expect(toasts).not.toContain('Dose recorded');
    if (!toasts.includes('A missed dose needs a reason')) qa.deviation(1, 'Toast "A missed dose needs a reason"', `toast "${toasts.join(' / ') || 'none'}"`);
  });
};

export const TC_APP005_065: QaBody = async ({ page, qa }) => {
  const pt1 = await patient(page, qa);
  await qa.step(1, async () => {
    await page.goto('/id/pharmacy/doses');
    const toasts = await recordDose(page, { patient: pt1.fullName, order: PHARMACY.para.name, status: 'Given' });
    expect(toasts).not.toContain('Dose recorded');
    if (!toasts.includes('The dose could not be recorded')) qa.deviation(1, 'Toast "The dose could not be recorded"', `toast "${toasts.join(' / ') || 'none'}"`);
  });
};

export const SCREENS: [string, string, string][] = [
  ['TC-APP005-066', '/pharmacy', 'Pharmacy'],
  ['TC-APP005-067', '/pharmacy/alerts', 'Alerts and vaccines'],
  ['TC-APP005-068', '/pharmacy/catalogue', 'Drug catalogue'],
  ['TC-APP005-069', '/pharmacy/dispense', 'Dispense'],
  ['TC-APP005-070', '/pharmacy/doses', 'Dose record'],
  ['TC-APP005-071', '/pharmacy/estimate', 'Cost estimate'],
  ['TC-APP005-072', '/pharmacy/issue-lines', 'Issue Lines'],
  ['TC-APP005-073', '/pharmacy/issues', 'Issues for one patient'],
  ['TC-APP005-074', '/pharmacy/orders', 'Orders'],
  ['TC-APP005-075', '/pharmacy/stays', 'Price and TPN'],
];
