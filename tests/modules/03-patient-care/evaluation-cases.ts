import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient, registerTwins } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { CLINICAL, orderFor } from '../../../lib/clinical-data';
import { PASSWORD } from '../../../lib/config';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { LoginPage } from '../../../pages/LoginPage';
import { OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { signedOutJourney, userPage } from '../shared/access';
import { addLine, authorise, clicked, inpatientOrder, labFromConsultation, labOrder, newPt1, pharmacyRows, placeRestricted, remark, toastsAfter, type Patient } from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of evaluation.spec.ts, shared with the end-to-end chains (chain.run). */

export const TC_APP003_002: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  await qa.step(1, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    expect(await c.quantity()).toBe(CLINICAL.standardQuantity);
    await expect(c.submitOrder()).toBeEnabled();
  });
  await qa.step(2, async () => {
    const toasts = await clicked(page, c.checkInteractions());
    if (!toasts.includes('No drug interactions detected.')) qa.deviation(2, 'Toast "No drug interactions detected."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
  });
  await qa.step(3, async () => {
    expect(await clicked(page, c.submitOrder())).toContain('Order placed.');
    await expect(c.field('Drug')).toHaveValue('');
  });
  await qa.step(4, async () => {
    const rows = await pharmacyRows(page, pt.fullName);
    expect(rows.length).toBe(1);
    expect(rows[0].slice(0, 3)).toEqual([pt.fullName, CLINICAL.standardOrder.Drug, 'Outpatient']);
    if (rows[0][3] !== CLINICAL.standardQuantity) qa.deviation(4, `Remaining ${CLINICAL.standardQuantity}`, `Remaining reads "${rows[0][3]}"`);
  });
};

export const TC_APP003_003: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  await c.fillOrder(CLINICAL.standardOrder);
  const check = async (step: number, expected: string) => {
    const q = await c.quantity();
    if (q !== expected) qa.deviation(step, `Quantity ${expected}`, `Quantity reads "${q}"`);
  };
  await qa.step(1, async () => {
    await c.field('Dose').fill('1');
    await c.field('Clock times').fill('08:00, 20:00');
    await c.field('Days').fill('5');
    expect(await c.quantity()).toBe('10');
  });
  await qa.step(2, async () => {
    await c.field('Clock times').fill('08:00, 14:00, 20:00');
    await check(2, '15');
  });
  await qa.step(3, async () => {
    await c.field('Dose').fill('0.5');
    await check(3, '7.5');
  });
  await qa.step(4, async () => {
    await c.field('Days').fill('7');
    await check(4, '10.5');
  });
  await qa.step(5, async () => {
    await c.field('Dose').fill('1');
    await c.field('Days').fill('3.5');
    await c.field('Clock times').fill('08:00, 08:00, 20:00');
    const q = await c.quantity();
    qa.note(5, `the same time twice (dose 1, days 3.5): quantity "${q}"`);
    if (q !== '7') qa.deviation(5, 'The repeated time counts once: 7', `Quantity reads "${q}"`);
  });
  await qa.step(6, async () => {
    const q = await c.quantity();
    const toasts = (await c.submitOrder().isEnabled()) ? await clicked(page, c.submitOrder()) : [];
    qa.note(6, `submit: "${toasts.join(' / ') || 'the button is disabled'}"`);
    if (!toasts.includes('Order placed.')) return;
    const rows = await pharmacyRows(page, pt.fullName);
    qa.note(6, `Pharmacy, Orders: ${rows.map((r) => r.join(' | ')).join(' ; ')}`);
    if (!rows.some((r) => r[3]?.startsWith(q))) qa.deviation(6, `Remaining ${q}`, `the row reads "${rows[0]?.[3] ?? 'none'}"`);
  });
};

export const TC_APP003_004: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  const amlodipine = { ...orderFor('Amlodipine 5mg Tablet'), Dose: '1', 'Dose type': 'fixed', Frequency: 'OD', 'Clock times': '08:00', Days: '30' };
  await qa.step(1, async () => {
    await c.showTab('Prescription');
    await expect(c.panel.getByText('No prescription lines yet.')).toBeVisible();
    await expect(c.panel.getByText('Prescription lines are checked for drug interactions before they are sent.')).toBeVisible();
  });
  await qa.step(2, async () => {
    await addLine(c, CLINICAL.standardOrder);
    await expect(c.field('Drug')).toHaveValue('');
  });
  await qa.step(3, async () => {
    await addLine(c, amlodipine);
    await expect(c.lines()).toHaveCount(2);
  });
  await qa.step(4, async () => {
    const toasts = await clicked(page, c.checkInteractions());
    if (!toasts.includes('No drug interactions detected.')) qa.deviation(4, 'Toast "No drug interactions detected."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast');
  });
  await qa.step(5, async () => {
    expect(await clicked(page, c.submitPrescription())).toContain('Prescription order placed.');
  });
  await qa.step(6, async () => {
    const rows = await pharmacyRows(page, pt.fullName);
    qa.note(6, `Pharmacy, Orders: ${rows.map((r) => r.join(' | ')).join(' ; ')}`);
    expect(rows.length).toBe(2);
  });
};

export const TC_APP003_006: QaBody = async ({ page, qa, browser }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  const r = CLINICAL.restricted;
  let row: Locator = c.panel;
  await qa.step(1, async () => {
    await c.fillOrder(orderFor(r.drug));
    await c.field('Restriction level').fill(r.level);
    await expect(c.panel.getByText('Fill level, type, and item together to hold this order until it is authorised here.')).toBeVisible();
    await c.field('Restriction type').fill(r.type);
    await c.field('Restriction item').fill(r.item);
  });
  await qa.step(2, async () => {
    expect(await clicked(page, c.submitOrder())).toContain('Restricted order saved. Authorise it on this screen before pharmacy can see it.');
  });
  await qa.step(3, async () => {
    row = c.restrictedList().getByRole('listitem').filter({ hasText: pt.fullName }).first();
    await expect(row).toContainText(r.drug);
    await expect(authorise(row)).toBeVisible();
  });
  await qa.step(4, async () => {
    expect((await pharmacyRows(page, pt.fullName)).length).toBe(0);
  });
  const doctor2 = await userPage(browser, 'U4');
  try {
    await qa.step(5, async () => {
      const c2 = new ConsultationPage(doctor2);
      await c2.openFor(await registerPatient(doctor2, CLINICAL.pt1.name, qa.token()));
      const row2 = c2.restrictedList().getByRole('listitem').filter({ hasText: pt.fullName }).first();
      await remark(row2).fill(qa.prefix('QA disetujui DPJP'));
      expect(await clicked(doctor2, authorise(row2))).toContain('Order authorised.');
      await expect(c2.restrictedList().getByRole('listitem').filter({ hasText: pt.fullName })).toHaveCount(0);
    });
  } finally {
    await doctor2.context().close();
  }
  await qa.step(6, async () => {
    const rows = await pharmacyRows(page, pt.fullName);
    expect(rows.some((x) => x[1] === r.drug)).toBe(true);
  });
};

export const TC_APP003_007: QaBody = ({ page, qa }) => inpatientOrder({ page, qa });

export const TC_APP003_010: QaBody = ({ page, qa }) => labFromConsultation({ page, qa });

export const TC_APP003_019: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  const row = await placeRestricted(c, pt);
  const tabB = await page.context().newPage();
  await installToastRecorder(tabB);
  try {
    const cB = new ConsultationPage(tabB);
    await cB.openFor(pt);
    const rowB = cB.restrictedList().getByRole('listitem').filter({ hasText: pt.fullName }).first();
    await qa.step(1, async () => {
      const toasts = await clicked(page, authorise(row));
      if (!toasts.includes('A remark is required.')) qa.deviation(1, 'Toast "A remark is required." The row stays', `"${toasts.join(' / ') || 'no toast'}"`);
      await expect(row).toBeVisible();
    });
    await qa.step(2, async () => {
      await remark(row).fill(qa.prefix('QA kultur positif'));
      expect(await clicked(page, authorise(row))).toContain('Order authorised.');
    });
    await qa.step(3, async () => {
      await remark(rowB).fill(qa.prefix('QA kultur positif B'));
      const toasts = await clicked(tabB, authorise(rowB));
      qa.note(3, `tab B authorises again: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes('Order authorised.')) qa.deviation(3, 'A refusal saying the order is already authorised', 'authorised a second time ("Order authorised.")');
    });
  } finally {
    await tabB.close();
  }
};

export const TC_APP003_023: QaBody = async ({ page, qa, browser }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  qa.notRun(1, 'needs a SOAP draft saved yesterday: the draft stays in the session only ("This SOAP draft stays in the current session.", TC-APP003-009)');
  const doctor2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      await c.openFor(pt);
      await c.showTab('SOAP');
      await c.panel.getByRole('textbox', { name: 'Subjective' }).fill(qa.prefix('QA S dokter satu'));
      await c.panel.getByRole('button', { name: 'Save draft' }).click();
      const c2 = new ConsultationPage(doctor2);
      await c2.openFor(pt);
      await c2.showTab('SOAP');
      const seen = await c2.panel.getByRole('textbox', { name: 'Subjective' }).inputValue();
      qa.note(2, `Doctor 2 opens PT-1's SOAP: Subjective "${seen}"`);
      if (!seen) qa.deviation(2, 'A second note; the earlier note is kept with its date and author', 'Doctor 2 sees no earlier note: the draft is kept in the first session only');
    });
  } finally {
    await doctor2.context().close();
  }
  await qa.step(3, async () => {
    const sign = await c.panel.getByRole('button', { name: /sign|finali[sz]e/i }).count();
    if (!sign) qa.deviation(3, 'A sign or finalise control, after which the note is read-only', 'no sign or finalise control on SOAP');
  });
};

export const TC_APP003_025: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await qa.step(1, async () => {
    await page.goto('/id/apps');
    const card = (await page.getByRole('link', { name: /^Patient Care\b/ }).first().innerText()).replace(/\s+/g, ' ');
    qa.note(1, `the card reads "${card}"`);
  });
  await c.openFor(await newPt1(page, qa));
  await qa.step(2, async () => {
    const vitals = await c.main.getByText(/vital|blood pressure|tekanan darah|tanda vital/i).count();
    if (!vitals) qa.deviation(2, 'A vitals form', 'no place to record vital signs on Consultation');
  });
  await qa.step(3, async () => {
    const dx = await c.main.getByText(/diagnos|ICD/i).count();
    if (!dx) qa.deviation(3, 'A diagnosis field or list', 'no coded diagnosis on Consultation');
  });
};

export const TC_APP003_027: QaBody = async ({ page, qa }) => {
  const t = qa.token();
  const [pt2] = await registerTwins(page, 'QA-PCR Pasien Kembar', t);
  const c = new ConsultationPage(page);
  await qa.step(1, async () => {
    await c.open();
    await c.pickPatient(pt2.fullName, pt2.mrn);
    await c.fillOrder(CLINICAL.standardOrder);
    expect(await clicked(page, c.submitOrder())).toContain('Order placed.');
  });
  await qa.step(2, async () => {
    const rows = await pharmacyRows(page, pt2.fullName);
    qa.note(2, `rows of "${pt2.fullName}": ${rows.map((r) => r.join(' | ')).join(' ; ')}`);
    if (!rows.some((r) => r.join(' ').includes(pt2.mrn))) qa.deviation(2, 'A row that shows which of the two patients the order is for', 'the row names the patient only, with no MRN');
  });
};

export const TC_APP003_028: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  await qa.step(1, async () => {
    await c.field('Drug').fill('Paracetmol 500 mg tab');
    await page.waitForTimeout(1500);
    const listId = await c.field('Drug').getAttribute('aria-controls');
    const hints = listId ? await page.locator(`#${listId}`).getByRole('option').count() : 0;
    qa.note(1, `${hints} suggestion(s) for the misspelt name`);
    if (!hints) qa.deviation(1, 'Suggestions from the drug list', 'no list of matching drugs');
  });
  await qa.step(2, async () => {
    await c.fillOrder({ ...CLINICAL.standardOrder, Drug: 'Paracetmol 500 mg tab' });
    const toasts = (await c.submitOrder().isEnabled()) ? await clicked(page, c.submitOrder()) : [];
    qa.note(2, `submit with the misspelt drug: "${toasts.join(' / ') || 'the button is disabled'}"`);
    if (toasts.includes('Order placed.')) qa.deviation(2, 'The misspelling is refused or corrected', 'the order is placed with "Paracetmol 500 mg tab"');
  });
  qa.notRun(3, 'the dispense of a misspelt order is the 05 Pharmacy flow (TC-APP005-001); the order of step 2 is left for the pharmacist');
};

export const TC_APP003_033: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  await qa.step(1, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    const mark = await toastMark(page);
    await c.submitOrder().dblclick();
    const toasts = await toastsAfter(page, mark);
    qa.note(1, `double-click on "Submit order": "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    const toasts = await clicked(page, c.submitOrder());
    qa.note(2, `the same order again: "${toasts.join(' / ')}"`);
    if (toasts.includes('Order placed.') && !toasts.some((x) => /same|already|duplicate/i.test(x))) qa.deviation(2, 'A warning that the same drug was just ordered for this patient', 'placed again with no warning');
  });
  await qa.step(3, async () => {
    const rows = await pharmacyRows(page, pt.fullName);
    qa.note(3, `${rows.length} row(s) for PT-1`);
    if (rows.length !== 1) qa.deviation(3, 'One row', `${rows.length} rows`);
  });
};

export const TC_APP003_034: QaBody = async ({ page, qa }) => {
  const pt = await newPt1(page, qa);
  const r = await labFromConsultationQuiet(page, qa, pt);
  await qa.step(1, async () => {
    await page.goto('/id/laboratory/orders');
    await page.waitForLoadState('networkidle').catch(() => {});
    const row = page.getByRole('main').getByRole('row').filter({ hasText: r }).first();
    const text = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
    qa.note(1, `the lab order row: "${text || 'not on the first page'}"`);
    if (!text.includes(pt.fullName) && !text.includes(pt.mrn)) qa.deviation(1, "The patient's name and MRN on the order", 'the order has no patient');
  });
};

/** A lab order from the consultation with no steps of its own; returns its remark. */
export async function labFromConsultationQuiet(page: Page, qa: Qa, pt: Patient): Promise<string> {
  const c = new ConsultationPage(page);
  await c.openFor(pt);
  const text = qa.prefix('QA puasa 8 jam');
  expect((await labOrder(page, c, 'Hematologi Lengkap', text)).toasts).toContain('Lab order created. Check the laboratory worklist.');
  return text;
}

export const TC_APP003_039: QaBody = ({ qa, browser }) => signedOutJourney(browser, qa, '/clinical/consultation', /\/(id|en)\/clinical\/consultation/);

export const TC_APP003_041: QaBody = async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt = await newPt1(page, qa);
  await c.openFor(pt);
  const script = '<script>alert(1)</script>';
  let alerted = false;
  page.on('dialog', (d) => {
    alerted = true;
    void d.dismiss();
  });
  let row: Locator = c.panel;
  await qa.step(1, async () => {
    row = await placeRestricted(c, pt, { drug: `QA ${script}`, item: '<img src=x onerror=alert(1)>' }).catch(async (e: Error) => {
      qa.note(1, `the restricted order with script text: ${e.message.split('\n')[0].slice(0, 100)}`);
      return c.panel;
    });
  });
  await qa.step(2, async () => {
    const text = await row.innerText().catch(() => '');
    qa.note(2, `the row reads "${text.replace(/\s+/g, ' ').slice(0, 160)}"`);
    expect(alerted).toBe(false);
  });
  await qa.step(3, async () => {
    if (row === c.panel) return qa.note(3, 'no restricted order of step 1 to authorise');
    await remark(row).fill(`QA ${script}`);
    await clicked(page, authorise(row));
    await pharmacyRows(page, pt.fullName);
    expect(alerted).toBe(false);
  });
};
