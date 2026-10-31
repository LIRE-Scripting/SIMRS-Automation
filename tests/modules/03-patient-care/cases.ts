import { registerPatient } from '../../../lib/ambulatory-data';
import { PT1_DATE_OF_BIRTH, orderFor, CLINICAL } from '../../../lib/clinical-data';
import { type DrugOrder, ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { OrdersPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { expect } from '../../../fixtures/e2e';
import type { Locator, Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';

/**
 * Test cases of 03-patient-care that end-to-end chains run too (tests/e2e/chains/):
 * each is declared by its module spec with qaTest and called by a chain with the chain's Qa.
 */
export type CaseArgs = { page: Page; qa: Qa };

export const TC_APP003_005 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const c = new ConsultationPage(page);
  const [a, b] = CLINICAL.warningPair;
  await c.openFor(await newPt1(page, qa));
  await c.showTab('Prescription');

  const warning = c.panel.getByText(`Soft warning (sandbox): ${a} with ${b} — acknowledge to continue.`);
  await addLine(c, orderFor(a));
  await addLine(c, orderFor(b));
  await c.checkInteractions().click();
  if (!(await warning.isVisible())) {
    // The pair is not on the site (found blocker 22): no warning, nothing to acknowledge.
    qa.blocked(1, 22);
    qa.blocked(2, 22);
  } else {
    await qa.step(1, async () => {
      await expect(c.panel.getByRole('button', { name: 'Acknowledge' })).toBeVisible();
      await expect(c.submitPrescription()).toBeDisabled();
    });
    await qa.step(2, async () => {
      await c.panel.getByRole('button', { name: 'Acknowledge' }).click();
      await expect(c.panel.getByText('Acknowledged')).toBeVisible();
      await expect(c.submitPrescription()).toBeEnabled();
    });
  }

  await qa.step(3, async () => {
    await c.submitPrescription().click();
    await expect(toastLocator(page, /^Prescription order placed\.$/)).toBeVisible();
  });
};

export async function newPt1(page: Page, qa: Qa): Promise<Patient> {
  return registerPatient(page, CLINICAL.pt1.name, qa.token(), PT1_DATE_OF_BIRTH);
}

/** Adds one prescription line (the formulary is filled, then "Add"). */
export async function addLine(c: ConsultationPage, o: DrugOrder): Promise<void> {
  await c.fillOrder(o);
  await expect(c.addLine()).toBeEnabled();
  await c.addLine().click();
  await expect(c.panel.getByText(o.Drug).first()).toBeVisible();
}

/**
 * 03-patient-care.xlsx, feature "Consultation (/clinical/consultation)".
 * Every test registers its own PT-1 ("QA-PCR Pasien Satu" + a new token) and
 * works on that patient only. Orders placed here stay in the pharmacy queue
 * (no cancel on the site; Cleanup Requirements).
 */

export type Patient = { mrn: string; fullName: string };

export async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 6_000 }).toBeGreaterThan(0).catch(() => {});
  return toastsSince(page, mark);
}

export async function clicked(page: Page, button: Locator): Promise<string[]> {
  const mark = await toastMark(page);
  await button.click();
  return toastsAfter(page, mark);
}

/** The rows of a patient on Pharmacy, Orders (of a visit class when given). */
export async function pharmacyRows(page: Page, name: string, visit?: 'outpatient' | 'inpatient'): Promise<string[][]> {
  const o = new OrdersPage(page);
  await o.open(visit);
  await page.waitForLoadState('networkidle').catch(() => {});
  const rows = o.row(name);
  const out: string[][] = [];
  for (const r of await rows.all()) out.push(await o.cells(r));
  return out;
}

/** The lab order section of the consultation: result type, remarks, "Create lab order". */
export async function labOrder(page: Page, c: ConsultationPage, type: string, text: string): Promise<{ toasts: string[]; id: string }> {
  const section = c.panel.locator('section, div').filter({ has: page.getByRole('button', { name: 'Create lab order' }) }).last();
  await section.getByRole('combobox').first().selectOption({ label: type });
  await section.getByRole('textbox').first().fill(text);
  const toasts = await clicked(page, section.getByRole('button', { name: /^(Create lab order|Creating…)$/ }));
  const id = ((await c.panel.innerText()).match(/Lab order id\s*:?\s*(\S+)/i) ?? (await c.panel.innerText()).match(/ID order lab\s*:?\s*(\S+)/i))?.[1] ?? '';
  return { toasts, id };
}

/** TC-APP003-007: the standard order as an inpatient order, then what Pharmacy, Orders lists per visit class. */
export async function inpatientOrder({ page, qa }: { page: Page; qa: Qa }, pt?: Patient): Promise<void> {
  const c = new ConsultationPage(page);
  const p = pt ?? (await newPt1(page, qa));
  await c.openFor(p);
  await qa.step(1, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    await c.panel.getByRole('combobox', { name: 'Visit' }).selectOption({ label: 'Inpatient' });
    expect(await clicked(page, c.submitOrder())).toContain('Order placed.');
  });
  await qa.step(2, async () => {
    const rows = await pharmacyRows(page, p.fullName, 'inpatient');
    expect(rows.length, 'the order on the inpatient list').toBe(1);
    expect(rows[0][2]).toBe('Inpatient');
  });
  await qa.step(3, async () => {
    expect((await pharmacyRows(page, p.fullName, 'outpatient')).length).toBe(0);
  });
}
/** TC-APP003-010: a lab order from the consultation and the new order on Laboratory, Orders. */
export async function labFromConsultation({ page, qa }: { page: Page; qa: Qa }, pt?: Patient): Promise<{ remark: string }> {
  const c = new ConsultationPage(page);
  await c.openFor(pt ?? (await newPt1(page, qa)));
  const text = qa.prefix('QA puasa 8 jam');
  await qa.step(1, async () => {
    await expect(c.panel.getByRole('button', { name: 'Create lab order' })).toBeVisible();
    const section = c.panel.locator('section, div').filter({ has: page.getByRole('button', { name: 'Create lab order' }) }).last();
    const types = (await section.getByRole('combobox').first().locator('option').allInnerTexts()).map((o) => o.trim());
    qa.note(1, `Result type offers: ${types.join(', ')}`);
    for (const t of ['Hematologi Lengkap', 'Kimia Darah', 'Urinalisis']) expect(types).toContain(t);
  });
  await qa.step(2, async () => {
    const r = await labOrder(page, c, 'Hematologi Lengkap', text);
    expect(r.toasts).toContain('Lab order created. Check the laboratory worklist.');
    qa.note(2, `lab order id "${r.id}"`);
  });
  await qa.step(3, async () => {
    await page.goto('/id/laboratory/orders');
    await page.waitForLoadState('networkidle').catch(() => {});
    const row = page.getByRole('main').getByRole('row').filter({ hasText: text }).first();
    if (!(await row.isVisible().catch(() => false))) qa.deviation(3, 'A new order of type Hematologi Lengkap with the remark', 'the remark is on no row of the first page of Laboratory, Orders');
    else await expect(row).toContainText('Hematologi Lengkap');
  });
  return { remark: text };
}

/** Places the workbook's restricted order (with the given texts) for the open patient; returns its row in "Authorise restricted orders". */
export async function placeRestricted(c: ConsultationPage, p: Patient, v: { drug?: string; item?: string } = {}): Promise<Locator> {
  const r = CLINICAL.restricted;
  await c.fillOrder({ ...orderFor(r.drug), ...(v.drug ? { Drug: v.drug } : {}) });
  await c.field('Restriction level').fill(r.level);
  await c.field('Restriction type').fill(r.type);
  await c.field('Restriction item').fill(v.item ?? r.item);
  await c.submitOrder().click();
  await expect(toastLocator(c.page, /^Restricted order saved\. Authorise it on this screen before pharmacy can see it\.$/)).toBeVisible();
  const row = c.restrictedList().getByRole('listitem').filter({ hasText: p.fullName }).first();
  await expect(row).toBeVisible();
  return row;
}

export const authorise = (row: Locator) => row.getByRole('button', { name: /^(Authorise|Authorising…)$/ });
export const remark = (row: Locator) => row.getByRole('textbox').first();
