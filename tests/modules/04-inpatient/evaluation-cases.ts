import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient, registerTwins } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { CLINICAL } from '../../../lib/clinical-data';
import { PASSWORD } from '../../../lib/config';
import { userLogin } from '../../../lib/qa-data';
import { AppHeader } from '../../../pages/AppHeader';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { AdmissionsPage } from '../../../pages/inpatient/InpatientPages';
import { LoginPage } from '../../../pages/LoginPage';
import { PHARMACY, PHARMACY_STORE, stockOf, total } from '../../../lib/pharmacy-data';
import { IssueLinesPage } from '../../../pages/pharmacy/PharmacyE2EPages';
import { newBed } from '../../e2e/chains/steps/inpatient-steps';
import { CONFIRMED, sell, stock } from '../05-pharmacy/helpers';
import { admittedWithOrder, dispensedGroup, fullyReturnedLine, dispenseGroup, drug, groupButton, groupOrders, inpatientOrderFor, postRequest, requestReturn, stayLine, wardGroups } from '../05-pharmacy/ward';
import { signedOutJourney, userPage } from '../shared/access';
import { WardSupply } from './helpers';
/** OR-1 of the 04 journeys: the standard order of Patient Care (10 tablets). */
export const OR_1 = CLINICAL.standardOrder;
export const QTY = CLINICAL.standardQuantity;

/**
 * 04-inpatient.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): inpatient orders on Ward supply, a second
 * nurse (U4) on the same stays and beds, admission numbers, transfers and
 * discharges that must be refused, and Admissions without a session. Ward
 * supply needs the inpatient store ST-IP, which cannot be made (found
 * blocker 26): the steps that group, dispense, receive or return from it are
 * blocked by 26.
 */



export async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 6_000 }).toBeGreaterThan(0).catch(() => {});
  return toastsSince(page, mark);
}

export async function clicked(page: Page, button: Locator): Promise<string[]> {
  const mark = await toastMark(page);
  await button.click();
  return toastsAfter(page, mark);
}

/** The inpatient order of the shared data for a patient (Consultation, Visit "Inpatient"); returns the toasts. */
export async function inpatientOrder(page: Page, pt: { mrn: string; fullName: string }): Promise<string[]> {
  const c = new ConsultationPage(page);
  await c.openFor(pt);
  await c.fillOrder(CLINICAL.standardOrder);
  await c.panel.getByRole('combobox', { name: 'Visit' }).selectOption({ label: 'Inpatient' });
  return clicked(page, c.submitOrder());
}

export async function wardSupply(page: Page): Promise<AdmissionsPage> {
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
  await expect(adm.main.getByRole('heading', { level: 2, name: 'Stay' })).toBeVisible();
  return adm;
}

export const admitButton = (adm: AdmissionsPage) => adm.wizard.getByRole('button', { name: /^(Admit|Saving…)$/ });

/** Fills the admit wizard (name, number, bed) up to its last step; returns the "Admit" button. */
export async function fillAdmit(adm: AdmissionsPage, name: string, bed?: string, no?: string): Promise<Locator> {
  await adm.admitButton.click();
  await expect(adm.wizard).toBeVisible();
  await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
  if (no) await adm.wizard.getByRole('textbox', { name: 'Admission no' }).fill(no);
  await adm.next();
  if (bed) await adm.pickBed(adm.wizard.getByRole('combobox', { name: 'Bed' }), bed);
  await adm.next();
  return admitButton(adm);
}

export const TC_APP004_014 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const pt = await registerPatient(page, 'QA-INP Pasien Satu', qa.token());
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(pt.fullName, bed);
  await qa.step(1, async () => {
    expect(await inpatientOrder(page, pt)).toContain('Order placed.');
  });
  let w: AdmissionsPage = adm;
  await qa.step(2, async () => {
    w = await wardSupply(page);
    await expect(w.main.getByText('Three steps, each in its own card.')).toBeVisible();
    for (const h of ['Store', 'Ward supply', 'Stay']) await expect(w.main.getByRole('heading', { level: 2, name: h })).toBeVisible();
  });
  await qa.step(3, async () => {
    const box = new WardSupply(page).pending(pt.fullName).first();
    const shown = await box.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    if (!shown) return qa.deviation(3, `A line "${pt.fullName} — ${CLINICAL.standardOrder.Drug} · ${CLINICAL.standardQuantity}" with a tick box`, 'the order is not among "Pending inpatient orders"');
    const label = (await box.evaluate((e) => ((e as HTMLInputElement).labels?.[0]?.innerText ?? e.parentElement?.innerText ?? ''))).replace(/\s+/g, ' ').trim();
    expect(label).toBe(`${pt.fullName} — ${CLINICAL.standardOrder.Drug} · ${CLINICAL.standardQuantity}`);
  });
};

export const TC_APP004_015 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const p1 = await admittedWithOrder(page, qa, { order: OR_1 });
  const p2 = await admittedWithOrder(page, qa, { name: 'QA-INP Pasien Dua', order: OR_1, withStock: false });
  qa.note(1, `OR-1 and OR-2: the standard order of ${p1.fullName} and of ${p2.fullName}; ST-IP cannot be made (found blocker 26), ${PHARMACY_STORE.code} stands in`);
  const ws = new WardSupply(page);
  const group = ws.card('Store').getByRole('button', { name: 'Group for this store' });
  await qa.step(1, async () => {
    await ws.open();
    await ws.pickStore(PHARMACY_STORE.code);
    await expect(group).toBeVisible();
  });
  let g = '';
  await qa.step(2, async () => {
    const r = await groupOrders(page, [p1, p2]);
    g = r.group;
    expect(r.toasts).toContain('Orders grouped for the pharmacy queue.');
    await ws.open();
    const b = await groupButton(ws, g, 'Receive');
    const row = (await ws.rowOf(b).innerText()).replace(/\s+/g, ' ');
    qa.note(2, `the group "${g}": "${row}"`);
    expect(row).toMatch(/Open/);
    for (const p of [p1, p2]) if (!row.includes(p.fullName)) qa.deviation(2, 'Both lines as "patient — drug"', `the group does not name ${p.fullName}`);
    await expect(ws.rowOf(b).getByRole('button', { name: 'Refuse', exact: true })).toBeVisible();
  });
  await qa.step(3, async () => {
    for (const p of [p1, p2]) expect((await dispenseGroup(page, p, g)).toasts).toContain(CONFIRMED);
  });
  await qa.step(4, async () => {
    await ws.open();
    const b = await groupButton(ws, g, 'Receive');
    const row = ws.rowOf(b);
    const before = (await row.innerText()).replace(/\s+/g, ' ');
    const toasts = await ws.decide(b, 'Receive');
    qa.note(4, `Receive: "${toasts.join(' / ')}"`);
    expect(toasts.some((t) => t.startsWith('Ward receipt recorded.'))).toBe(true);
    await ws.open();
    const after = ws.card('Ward supply').getByRole('paragraph').filter({ hasText: p1.fullName }).first().locator('xpath=../..');
    qa.note(4, `the group before: "${before}"`);
    if (await after.count()) {
      await expect(after).toContainText('Received');
      await expect(after.getByRole('button', { name: /^(Receive|Refuse)$/ })).toHaveCount(0);
    } else qa.note(4, 'the received group is no longer listed among the open groups');
  });
};

export const TC_APP004_016 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const { group } = await dispensedGroup(page, qa, OR_1);
  qa.note(1, `an open group of the test dispensed in full from ${PHARMACY_STORE.code} (ST-IP cannot be made, found blocker 26)`);
  const before = total(await stockOf(page, PHARMACY.para.code));
  const ws = new WardSupply(page);
  await qa.step(1, async () => {
    await ws.open();
    const toasts = await ws.decide(await groupButton(ws, group, 'Refuse'), 'Refuse');
    qa.note(1, `Refuse: "${toasts.join(' / ')}"`);
    expect(toasts.join(' ')).toMatch(/refused/i);
  });
  await qa.step(2, async () => {
    const found = await fullyReturnedLine(page, String(QTY));
    qa.note(2, 'Issue Lines names the item, not the patient: a line of the drug with Issued and Returned both 10 is looked for');
    if (!found) qa.deviation(2, 'The issued lines of the group are returned in full', `no line of ${drug} on Issue Lines shows Issued ${QTY} and Returned ${QTY}`);
  });
  await qa.step(3, async () => {
    const after = total(await stockOf(page, PHARMACY.para.code));
    qa.note(3, `stock of ${PHARMACY.para.code}: ${before} after the dispense, ${after} after the refusal`);
    if (after - before !== Number(QTY)) qa.deviation(3, 'The quantity is back in stock', `stock moved by ${after - before}, not +${QTY}`);
    qa.note(3, "the patient's charges are read in 14 Hospital Accounts (TC-APP014-061)");
  });
};

export const TC_APP004_017 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const { pt, group } = await dispensedGroup(page, qa, OR_1);
  const ws = new WardSupply(page);
  await ws.open();
  await ws.decide(await groupButton(ws, group, 'Receive'), 'Receive');
  qa.note(1, `10 tablets of OR-1 issued to ${pt.fullName} from ${PHARMACY_STORE.code} (ST-IP cannot be made, found blocker 26)`);
  await qa.step(1, async () => {
    await ws.open();
    await ws.pickStay(pt.fullName, pt.admissionNo);
    const line = stayLine(ws);
    await expect(line).toBeVisible();
    const text = (await line.innerText()).replace(/\s+/g, ' ');
    qa.note(1, `the line: "${text}"`);
    expect(text).toContain(`0/${QTY}`);
    await expect(line.getByRole('spinbutton').first()).toHaveValue('1');
    await expect(line.getByRole('button', { name: 'Request return' })).toBeVisible();
  });
  await qa.step(2, async () => {
    expect(await requestReturn(ws, '4')).toContain('Return request raised. The pharmacist posts it from issue lines.');
  });
  await qa.step(3, async () => {
    expect(await postRequest(page, '4')).toContain('Returned.');
  });
  await qa.step(4, async () => {
    await ws.open();
    await ws.pickStay(pt.fullName, pt.admissionNo);
    await expect(stayLine(ws)).toContainText(`4/${QTY}`);
  });
};

export const TC_APP004_022 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  await stock(page, qa);
  const pt = await registerPatient(page, 'QA-INP Pasien Satu', qa.token());
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  const lower = pt.fullName.toLowerCase();
  await qa.step(1, async () => {
    await adm.open();
    await adm.admit(lower, bed);
    qa.note(1, `admitted as "${lower}" (registered "${pt.fullName}")`);
  });
  await adm.open();
  const admNo = await adm.admissionNo(await adm.stay(lower));
  await inpatientOrderFor(page, pt, OR_1);
  const ws = new WardSupply(page);
  await qa.step(2, async () => {
    const g = await groupOrders(page, pt);
    expect(g.toasts).toContain('Orders grouped for the pharmacy queue.');
    expect((await dispenseGroup(page, pt, g.group)).toasts).toContain(CONFIRMED);
    await ws.open();
    await ws.pickStay(lower, admNo);
    const nothing = ws.card('Stay').getByText('Nothing issued for this stay yet.');
    if (await nothing.isVisible({ timeout: 3_000 }).catch(() => false)) qa.deviation(2, 'The line issued for OR-1', `the stay "${lower}" shows "Nothing issued for this stay yet."`);
    else await expect(stayLine(ws)).toBeVisible();
  });
  await qa.step(3, async () => {
    const toasts = await sell(page, pt, [{ item: PHARMACY.para, requested: '1', issued: '1' }]);
    qa.note(3, `counter sale for ${pt.fullName}: "${toasts.join(' / ')}"`);
    if (toasts.includes(CONFIRMED)) qa.deviation(3, 'Refused, because the patient has an open stay', `sold: the stay is "${lower}"`);
  });
};

export const TC_APP004_023 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  await stock(page, qa);
  const t = qa.token();
  const [k1, k2] = await registerTwins(page, 'QA-INP Pasien Kembar', t);
  const [no1, no2] = [`QA-RI-K1${t.slice(-5)}`, `QA-RI-K2${t.slice(-5)}`];
  const [b1, b2] = [await newBed(page, qa, 'QA-101'), await newBed(page, qa, 'QA-102')];
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(k1.fullName, b1, no1);
  await adm.open();
  await adm.admit(k2.fullName, b2, no2);
  await inpatientOrderFor(page, k1, OR_1);
  const g = await groupOrders(page, k1);
  expect((await dispenseGroup(page, k1, g.group)).toasts).toContain(CONFIRMED);
  qa.note(1, `PT-K1 and PT-K2: "${k1.fullName}" (MRN ${k1.mrn}, ${no1} on ${b1}) and (MRN ${k2.mrn}, ${no2} on ${b2}); OR-1 issued for PT-K1 only`);
  const ws = new WardSupply(page);
  await qa.step(1, async () => {
    await ws.open();
    await ws.pickStay(no2);
    const nothing = ws.card('Stay').getByText('Nothing issued for this stay yet.');
    if (!(await nothing.isVisible({ timeout: 5_000 }).catch(() => false))) qa.deviation(1, '"Nothing issued for this stay yet."', `PT-K2's stay shows "${(await ws.card('Stay').innerText()).replace(/\s+/g, ' ').slice(0, 160)}"`);
  });
  await qa.step(2, async () => {
    await ws.open();
    await ws.pickStay(no1);
    await expect(stayLine(ws)).toBeVisible();
  });
  await qa.step(3, async () => {
    await ws.open();
    await ws.pickStay(no2);
    const n = await stayLine(ws).count();
    if (n) {
      const toasts = await requestReturn(ws, '2');
      qa.deviation(3, 'Not possible: PT-K2 has no line', `PT-K2's stay offers the line of PT-K1; the request: "${toasts.join(' / ')}"`);
    } else await expect(ws.card('Stay').getByRole('button', { name: 'Request return' })).toHaveCount(0);
  });
};

export const TC_APP004_024 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const name = `QA-INP Pasien Satu ${qa.token()}`;
  const [b1, b2] = [await newBed(page, qa, 'QA-101'), await newBed(page, qa, 'QA-102')];
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(name, b1);
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(1, async () => {
      const a2 = new AdmissionsPage(nurse2);
      await a2.open();
      const toasts = await clicked(nurse2, await fillAdmit(a2, name, b2));
      qa.note(1, `Nurse 2 admits the same name on ${b2}: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes('Patient admitted')) qa.deviation(1, `A warning that this patient already has an open stay on ${b1}`, 'admitted a second time with no warning');
    });
    await qa.step(2, async () => {
      await adm.open();
      await adm.search(name);
      await adm.row(name).first().waitFor({ timeout: 10_000 }).catch(() => {});
      const n = await adm.row(name).count();
      qa.note(2, `${n} stay(s) named ${name}`);
      if (n > 1) qa.deviation(2, 'PT-1 on one bed', `${n} open stays`);
    });
  } finally {
    await nurse2.context().close();
  }
};

export const TC_APP004_026 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const t = qa.token();
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  await adm.open();
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(1, async () => {
      const a2 = new AdmissionsPage(nurse2);
      await a2.open();
      await a2.admit(`QA-INP Pasien Dua ${t}`, bed);
    });
    await qa.step(2, async () => {
      const card = adm.stripCard(bed);
      if (!(await card.isVisible().catch(() => false))) return qa.note(2, `${bed} is not in the strip of the first nurse any more`);
      await card.click();
      await expect(adm.wizard).toBeVisible();
      await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(`QA-INP Pasien Tiga ${t}`);
      await adm.next();
      await adm.next();
      const toasts = await clicked(page, admitButton(adm));
      qa.note(2, `admit into ${bed}, occupied a moment ago: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes('Patient admitted')) qa.deviation(2, 'A clear message that the bed is occupied. Nothing is saved', 'admitted into the occupied bed');
      else if (toasts.some((x) => /React error #441/.test(x))) qa.deviation(2, 'A clear message that the bed is occupied', 'a server error toast ("Minified React error #441", HTTP 500)');
    });
    await qa.step(3, async () => {
      if (await adm.wizard.isVisible()) await adm.wizard.getByRole('button', { name: /Close|Cancel/ }).first().click().catch(() => {});
      await adm.open();
      await expect(adm.stripCard(bed)).toHaveCount(0);
    });
  } finally {
    await nurse2.context().close();
  }
};

export const TC_APP004_033 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const t = qa.token();
  const no = `QA-RI-${t.slice(-6)}`;
  const [b1, b2, b3, b4] = [await newBed(page, qa, 'QA-101'), await newBed(page, qa, 'QA-102'), await newBed(page, qa, 'QA-103'), await newBed(page, qa, 'QA-104')];
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(`QA-INP Pasien Satu ${t}`, b1, no);
  await qa.step(1, async () => {
    await adm.open();
    const toasts = await clicked(page, await fillAdmit(adm, `QA-INP Pasien Dua ${t}`, b2, no));
    qa.note(1, `the typed number ${no} again: "${toasts.join(' / ') || 'no toast'}"`);
    if (toasts.includes('Patient admitted')) qa.deviation(1, 'Refused: the number is in use', `admitted with ${no} a second time`);
  });
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const a2 = new AdmissionsPage(nurse2);
      await adm.open();
      await a2.open();
      const [x, y] = [await fillAdmit(adm, `QA-INP Pasien Tiga ${t}`, b3), await fillAdmit(a2, `QA-INP Pasien Empat ${t}`, b4)];
      await Promise.all([x.click(), y.click()]);
      await adm.open();
      const nos: string[] = [];
      for (const n of [`Tiga ${t}`, `Empat ${t}`]) nos.push(await adm.admissionNo(await adm.stay(n)).catch(() => ''));
      qa.note(2, `numbers given at the same moment: ${nos.join(', ')}`);
      if (nos[0] && nos[0] === nos[1]) qa.deviation(2, 'Two different numbers', `both got ${nos[0]}`);
    });
  } finally {
    await nurse2.context().close();
  }
  qa.notRun(3, 'needs a vacant bed and a barcode scanner to read the printed barcode of "qa_ri#2"');
};

export const TC_APP004_035 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const t = qa.token();
  const [b1, b2, b3] = [await newBed(page, qa, 'QA-101'), await newBed(page, qa, 'QA-102'), await newBed(page, qa, 'QA-103')];
  const adm = new AdmissionsPage(page);
  const [p1, p2] = [`QA-INP Pasien Satu ${t}`, `QA-INP Pasien Dua ${t}`];
  await adm.open();
  await adm.admit(p1, b1);
  await adm.open();
  await adm.admit(p2, b2);
  const d = page.getByRole('dialog', { name: 'Transfer bed' });
  await qa.step(1, async () => {
    await adm.open();
    await (await adm.stay(p1)).getByRole('button', { name: 'Transfer' }).click();
    const field = d.getByRole('combobox', { name: 'New bed' });
    await field.fill(b2);
    const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
    await expect(list.getByRole('option').filter({ hasText: b2 })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      await adm.open();
      await (await adm.stay(p1)).getByRole('button', { name: 'Transfer' }).click();
      const a2 = new AdmissionsPage(nurse2);
      await a2.open();
      await a2.transfer(await a2.stay(p2), b3);
      const field = d.getByRole('combobox', { name: 'New bed' });
      await field.fill(b3);
      const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
      const hit = list.getByRole('option').filter({ hasText: b3 }).first();
      if (!(await hit.isVisible().catch(() => false))) return qa.note(2, `${b3} is no longer offered in the open dialog`);
      await hit.getByRole('button').click();
      const toasts = await clicked(page, d.getByRole('button', { name: 'Transfer' }));
      qa.note(2, `transfer of PT-1 into ${b3}, taken a moment ago: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes('Transferred')) qa.deviation(2, 'A clear message that the bed is occupied. PT-1 stays on BED-1', `PT-1 is moved into ${b3}`);
    });
  } finally {
    await nurse2.context().close();
  }
  qa.notRun(3, 'needs a discharged stay of the test (the discharge waits on its approval chain, TC-APP004-042)');
};

export const TC_APP004_038 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const name = `QA-INP Pasien Satu ${qa.token()}`;
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(name, bed);
  await qa.step(1, async () => {
    await adm.open();
    const row = await adm.stay(name);
    await row.getByRole('button', { name: 'Mark billing cleared' }).click();
    const d = page.getByRole('dialog', { name: 'Mark billing cleared' });
    const toasts = await clicked(page, d.getByRole('button', { name: 'Mark cleared' }));
    qa.note(1, `"Mark cleared" with no settled bill: "${toasts.join(' / ') || 'no toast'}"`);
    if (toasts.includes('Billing clearance recorded')) qa.deviation(1, 'Refused: the bill is not settled, or only a cashier may do this', 'the nurse marks the billing cleared');
  });
  qa.notRun(2, 'the stay has no charges in Hospital Accounts to settle: inpatient services are billed in TC-APP014-061');
  await qa.step(3, async () => {
    await adm.open();
    const buttons = (await (await adm.stay(name)).getByRole('button').allInnerTexts()).map((b) => b.trim());
    if (!buttons.some((b) => /undo|clear|revert|batal/i.test(b))) qa.deviation(3, 'Present: a way to take a wrong mark back', `the row offers ${buttons.join(', ') || 'icons only'}`);
  });
};

export const TC_APP004_039 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const { pt, group } = await dispensedGroup(page, qa, OR_1);
  const ws = new WardSupply(page);
  await ws.open();
  await ws.decide(await groupButton(ws, group, 'Receive'), 'Receive');
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.markBillingCleared(await adm.stay(pt.fullName));
  qa.note(1, `${pt.fullName} on ${pt.bed}, billing cleared, 10 tablets issued from ${PHARMACY_STORE.code} (ST-IP cannot be made, found blocker 26)`);
  const discharge = async () => {
    await adm.open();
    await (await adm.stay(pt.fullName)).getByRole('button', { name: 'Discharge' }).click();
    const d = page.getByRole('dialog').last();
    const mark = await toastMark(page);
    await d.getByRole('button', { name: /^(Discharge|Confirm|Start)/ }).last().click();
    const toasts = await toastsAfter(page, mark);
    const red = await d.locator('[role="alert"], .text-red-600, .text-destructive').count();
    return { toasts, red, d };
  };
  await qa.step(1, async () => {
    await ws.open();
    await ws.pickStay(pt.fullName, pt.admissionNo);
    expect(await requestReturn(ws, '3')).toContain('Return request raised. The pharmacist posts it from issue lines.');
  });
  await qa.step(2, async () => {
    const r = await discharge();
    qa.note(2, `Discharge with a request pending: "${r.toasts.join(' / ') || 'no toast'}"; ${r.red} red box(es)`);
    if (r.toasts.some((x) => /Discharge recorded/i.test(x))) qa.deviation(2, 'Refused with a red box in the dialog', 'the discharge is recorded while the return request is pending');
    else if (await r.d.isVisible()) await r.d.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
  });
  await qa.step(3, async () => {
    await ws.open();
    await ws.pickStay(pt.fullName, pt.admissionNo);
    const text = (await ws.card('Stay').innerText()).replace(/\s+/g, ' ');
    const withdraw = await ws.card('Stay').getByRole('button', { name: /withdraw|cancel|batal/i }).count();
    qa.note(3, `the Stay card: "${text.slice(0, 200)}"`);
    if (!/3/.test(text) || !withdraw) qa.deviation(3, 'The request is listed with its quantity and can be withdrawn', withdraw ? 'the quantity is not shown' : 'the ward screen offers no way to withdraw the request');
  });
  await qa.step(4, async () => {
    const posted = await postRequest(page, '3');
    expect(posted).toContain('Returned.');
    const r = await discharge();
    qa.note(4, `Discharge after the return: "${r.toasts.join(' / ')}"`);
    if (!r.toasts.some((x) => /Discharge recorded/i.test(x))) qa.note(4, 'the discharge was recorded in step 2 already, or it is refused');
  });
};

export const TC_APP004_040 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const t = qa.token();
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  const [p1, noBed] = [`QA-INP Pasien Satu ${t}`, `QA-INP Pasien Tanpa Bed ${t}`];
  await adm.open();
  await adm.admit(p1, bed);
  await adm.open();
  await adm.admit(noBed);
  await adm.open();
  await adm.markBillingCleared(await adm.stay(p1));
  await qa.step(1, async () => {
    await adm.open();
    await expect((await adm.stay(noBed)).getByRole('button', { name: 'Discharge' })).toBeDisabled();
  });
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      await adm.open();
      const mine = await adm.stay(p1);
      const a2 = new AdmissionsPage(nurse2);
      await a2.open();
      await (await a2.stay(p1)).getByRole('button', { name: 'Discharge' }).click();
      const d2 = nurse2.getByRole('dialog').last();
      await clicked(nurse2, d2.getByRole('button', { name: /^(Discharge|Confirm|Start)/ }).last());
      await mine.getByRole('button', { name: 'Discharge' }).click();
      const d = page.getByRole('dialog').last();
      const toasts = await clicked(page, d.getByRole('button', { name: /^(Discharge|Confirm|Start)/ }).last());
      const red = await d.locator('[role="alert"], .text-red-600, .text-destructive').count();
      qa.note(2, `the second discharge of the same stay: "${toasts.join(' / ') || 'no toast'}"; ${red} red box(es)`);
      if (toasts.some((x) => /Discharge recorded/i.test(x))) qa.deviation(2, 'Refused with a red box; nothing changes', 'the discharge is recorded a second time');
      else if (!red && toasts.some((x) => /React error #441/.test(x))) qa.deviation(2, 'Refused with a red box; nothing changes', 'a server error toast ("Minified React error #441", HTTP 500) and no red box');
    });
    await qa.step(3, async () => {
      const b = nurse2.getByRole('dialog').last().getByRole('button', { name: /Chain started/ });
      if (!(await b.count())) qa.note(3, 'the dialog of Nurse 2 shows no "Chain started" button any more');
      else await expect(b).toBeDisabled();
    });
  } finally {
    await nurse2.context().close();
  }
};

export const TC_APP004_042 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const name = `QA-INP Pasien Satu ${qa.token()}`;
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.admit(name, bed);
  await adm.open();
  await adm.markBillingCleared(await adm.stay(name));
  await qa.step(1, async () => {
    await adm.open();
    await (await adm.stay(name)).getByRole('button', { name: 'Discharge' }).click();
    const d = page.getByRole('dialog').last();
    const toasts = await clicked(page, d.getByRole('button', { name: /^(Discharge|Confirm|Start)/ }).last());
    qa.note(1, `discharge: "${toasts.join(' / ')}"`);
    await adm.open();
    const row = (await (await adm.stay(name)).innerText()).replace(/\s+/g, ' ');
    qa.note(1, `the stay reads "${row}"`);
    if (/Discharged/i.test(row)) qa.deviation(1, 'The stay shows that a discharge is waiting for approval; the patient still holds the bed', 'the stay reads "Discharged" at once');
  });
  qa.notRun(2, 'the rejection of the first step is a Workflow action of the doctor in charge (a user not prepared, blocker 38)');
  qa.notRun(3, 'needs every step of the discharge chain approved by its own approver (blocker 38)');
};

export const TC_APP004_045 = async ({ page, qa }: { page: Page; qa: Qa }): Promise<void> => {
  const p1 = await admittedWithOrder(page, qa, { order: OR_1 });
  const p2 = await admittedWithOrder(page, qa, { name: 'QA-INP Pasien Dua', order: OR_1, withStock: false });
  const { group } = await groupOrders(page, [p1, p2]);
  qa.note(1, `an open group of OR-1 (${p1.fullName}) and OR-2 (${p2.fullName}), nothing dispensed; ${PHARMACY_STORE.code} stands in for ST-IP (found blocker 26)`);
  const ws = new WardSupply(page);
  for (const [st, action] of [[1, 'Receive'], [2, 'Refuse']] as const) {
    await qa.step(st, async () => {
      await ws.open();
      const b = await groupButton(ws, group, action);
      const toasts = await ws.decide(b, action);
      qa.note(st, `${action} before anything is dispensed: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.some((t) => /recorded|refused\. The pharmacy return/i.test(t))) qa.deviation(st, 'Refused: the pharmacy has not sent this group. The badge stays "Open"', `${action} is accepted: "${toasts.join(' / ')}"`);
    });
  }
  await qa.step(3, async () => {
    const groups = await wardGroups(page);
    if (!groups.includes(group)) return qa.note(3, `the group "${group}" is no longer offered to the pharmacy after steps 1-2`);
    expect((await dispenseGroup(page, p1, group)).toasts).toContain(CONFIRMED);
    const d = await dispenseGroup(page, p2, group, '5');
    qa.note(3, `OR-2 with Issued 5: the field reads ${d.issued}; "${d.toasts.join(' / ')}"`);
    if (d.issued !== '5') qa.blocked(3, 29);
    await ws.open();
    const toasts = await ws.decide(await groupButton(ws, group, 'Receive'), 'Receive');
    qa.note(3, `Receive: "${toasts.join(' / ')}"`);
  });
};

export const TC_APP004_053 = ({ qa, browser }: { qa: Qa; browser: Browser }) => signedOutJourney(browser, qa, '/adt/admissions', /\/(id|en)\/adt\/admissions/);

export const TC_APP004_055 = async ({ page, qa, browser }: { page: Page; qa: Qa; browser: Browser }): Promise<void> => {
  const t = qa.token();
  const bed = await newBed(page, qa, 'QA-101');
  const adm = new AdmissionsPage(page);
  const name = `QA-INP Pasien Cepat ${t}`;
  await qa.step(1, async () => {
    await adm.open();
    await (await fillAdmit(adm, name, bed)).dblclick();
    await page.waitForTimeout(3000);
    await adm.open();
    await adm.search(name);
    await adm.row(name).first().waitFor({ timeout: 10_000 }).catch(() => {});
    const n = await adm.row(name).count();
    qa.note(1, `double-click on "Admit": ${n} stay(s)`);
    if (n !== 1) qa.deviation(1, 'One stay. The button is disabled while it reads "Saving…"', `${n} stays`);
  });
  await qa.step(2, async () => {
    const { group } = await dispensedGroup(page, qa, OR_1);
    const nurse2 = await userPage(browser, 'U4');
    try {
      await installToastRecorder(nurse2);
      const [w1, w2] = [new WardSupply(page), new WardSupply(nurse2)];
      await Promise.all([w1.open(), w2.open()]);
      const [b1, b2] = [await groupButton(w1, group, 'Receive'), await groupButton(w2, group, 'Receive')];
      const [t1, t2] = await Promise.all([w1.decide(b1, 'Receive'), w2.decide(b2, 'Receive')]);
      qa.note(2, `at the same moment: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
      const ok = [t1, t2].filter((t) => t.some((x) => x.startsWith('Ward receipt recorded.'))).length;
      if (ok !== 1) qa.deviation(2, 'One receipt. The other nurse is told the group is already closed', `${ok} receipts recorded`);
    } finally {
      await nurse2.context().close();
    }
  });
  await qa.step(3, async () => {
    await adm.open();
    await adm.admitButton.click();
    await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(`QA-INP Setengah ${t}`);
    await adm.next();
    let warned = false;
    page.once('dialog', (d) => {
      warned = true;
      void d.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await adm.open();
    if (!warned) qa.deviation(3, 'The entries are kept, or the nurse is warned before leaving', 'the wizard is lost with no warning');
  });
  await qa.step(4, async () => {
    const tab = await page.context().newPage();
    await adm.open();
    const admit = await fillAdmit(adm, `QA-INP Keluar ${t}`);
    await tab.goto('/id/apps');
    await new AppHeader(tab).signOut();
    await tab.waitForURL(/\/login/, { timeout: 20_000 }).catch(() => {});
    const toasts = await clicked(page, admit);
    qa.note(4, `"Admit" after signing out in another tab: "${toasts.join(' / ') || 'no toast'}"`);
    if (toasts.includes('Patient admitted')) qa.deviation(4, 'Nothing is saved; the nurse is told, or taken to sign in', 'admitted after the sign-out');
    await tab.close();
  });
};
