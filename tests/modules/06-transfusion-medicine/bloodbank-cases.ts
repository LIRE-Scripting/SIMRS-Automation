import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, isServerFailure, toastMark } from '../../../lib/assertions';
import { BLOODBANK, ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { QcPage, RequestsPage, StockPage } from '../../../pages/bloodbank/BloodBankPages';
import { NO_UNIT, save, savedRequest, TC_APP006_020, TC_APP006_022, toastsAfter } from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of bloodbank.spec.ts, shared with the end-to-end chains (chain.run). */

/**
 * A test case none of whose steps can run (blocker 2): every step is marked
 * blocked and the test is skipped, so the report does not count it as passed.
 */
export function allBlocked(qa: Qa, steps: number[], why: string): void {
  for (const s of steps) qa.blocked(s, 2);
  test.skip(true, `Blocker 2: Donor screen answers HTTP 500 (00-blockers-checklist-linked.xlsx | Checklist | row 6): ${why}`);
}

// ------------------------------------------------------------------ stock

export const TC_APP006_012: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  await stock.open();

  await qa.step(1, async () => {
    const d = await stock.openDialog('Collection', 'Collect the donation');
    await expect(d.getByText('Record segment, volume, times, and the collected site.')).toBeVisible();
    for (const f of ['Blood bag no', 'Segment', 'Volume (ml)', 'Start', 'End', 'Collected site']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  // Steps 2-3 need DN-1's accepted visit with bag QAWB-00001, made on Donors.
  qa.blocked(2, 2);
  qa.blocked(3, 2);
};

export const TC_APP006_016: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  const prefix = 'QAEX-';
  await stock.open();
  const d = stock.dialog('Receive an external bag');

  await qa.step(1, async () => {
    await stock.openDialog('Receive from another bank', 'Receive an external bag');
    await expect(d.getByText('A unit from another blood bank gets its own number and stays unscreened.')).toBeVisible();
  });

  await qa.step(2, async () => {
    await stock.fill(d, { 'Participant type': 'PMI', 'Number prefix': prefix, Digits: '5' });
    expect(await save(page, d, 'Save settings')).toContain('Settings saved');
  });

  const reference = qa.code('QA-REF-1');
  let saved = false;
  await qa.step(3, async () => {
    await stock.fill(d, {
      Component: 'PRC',
      'Blood group': 'O Positive',
      'Expiry date': addDays(todayWib(), 20),
      Quantity: '1',
      'Donor name': qa.name('QA-TRF Donor Luar'),
      'Reference no': reference,
      Source: 'PMI Kota QA',
    });
    const toasts = await save(page, d);
    if (isServerFailure(toasts)) return qa.note(3, `"Save": "${toasts.join(' / ')}" (found blocker 25)`);
    expect(toasts).toContain('External bag received');
    saved = true;
  });
  if (!saved) {
    qa.blocked(3, 25);
    qa.blocked(4, 25);
    return;
  }

  await qa.step(4, async () => {
    await stock.open();
    const row = stock.rows().filter({ hasText: prefix }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('External');
    await expect(await stock.cell(row, 'Status')).toHaveText('Unscreened');
    qa.note(4, `newest external row: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
  });
};

export const TC_APP006_017: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  const bag = qa.code('QA-MANUAL-1');
  await stock.open();
  const intake = await stock.openDialog('Intake stock', 'Stock intake');
  await stock.fill(intake, { 'Blood bag no': bag, 'Expiry date': addDays(todayWib(), 10), Quantity: '350' });
  expect(await save(page, intake)).toContain('Stock intake recorded');

  await qa.step(1, async () => {
    await stock.open();
    await expect(stock.main.getByText('Blood bag inventory — scan or type bag number to locate a unit.')).toBeVisible();
    for (const f of ['Bag no', 'Component', 'Group', 'Phenotype', 'Donor no.']) await expect(stock.main.getByRole('textbox', { name: f, exact: true })).toBeVisible();
    await expect(stock.statusFilter()).toBeVisible();
    await expect(stock.main.getByRole('textbox', { name: 'Scan or type bag number' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await stock.filter({ status: 'Available' });
    const statuses = await stock.rows().evaluateAll((rs) => rs.map((r) => r.querySelectorAll('td')[1]?.textContent?.trim() ?? ''));
    for (const s of statuses.filter(Boolean)) expect(s).toBe('Available');
  });

  await qa.step(3, async () => {
    await stock.main.getByRole('textbox', { name: 'Scan or type bag number' }).fill(bag);
    await stock.main.getByRole('textbox', { name: 'Scan or type bag number' }).press('Enter');
    const located = stock.main.getByText('Located bag').locator('xpath=..');
    await expect(located).toContainText(bag);
    for (const b of ['Group', 'Serology', 'Label', 'Trace']) await expect(located.getByRole('button', { name: b, exact: true }).first()).toBeVisible();
  });

  await qa.step(4, async () => {
    await stock.main.getByText('Located bag').locator('xpath=..').getByRole('button', { name: 'Label', exact: true }).click();
    const d = page.getByRole('dialog');
    await expect(d).toBeVisible();
    await expect(d.locator('svg, img, canvas').first()).toBeVisible();
    await d.getByRole('button', { name: /Close|Cancel/ }).first().click();
  });

  await qa.step(5, async () => {
    await stock.main.getByText('Located bag').locator('xpath=..').getByRole('button', { name: 'Trace', exact: true }).click();
    const trace = page.getByRole('dialog').or(stock.main.getByText(/trace/i).locator('xpath=..')).first();
    await expect(trace).toBeVisible();
    qa.note(5, `precondition "one unit issued and transfused" cannot be made (blocker 2); the trace of an intake bag reads: ${(await trace.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
  });
};

export const TC_APP006_018: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  await stock.open();
  // "Three Available, unexpired units": plain intake is the only way to make an "Available" row here.
  const bags = [qa.code('QA-MANUAL-1'), qa.code('QA-MANUAL-1'), qa.code('QA-MANUAL-1')];
  for (const bag of bags) {
    const d = await stock.openDialog('Intake stock', 'Stock intake');
    await stock.fill(d, { 'Blood bag no': bag, 'Expiry date': addDays(todayWib(), 10), Quantity: '350' });
    expect(await save(page, d)).toContain('Stock intake recorded');
  }
  qa.note(1, 'the units are plain intake rows (no component, no group): screened units cannot be made (blocker 2)');

  const act = async (step: number, bag: string, button: string, values: Record<string, string>, toast: string) => {
    await qa.step(step, async () => {
      await stock.filter({ 'Bag no': bag });
      const row = stock.row(bag).first();
      const control = row.getByRole('button', { name: button, exact: true });
      if (!(await control.count())) {
        qa.notRun(step, `the row of a plain intake unit has no "${button}" button (buttons: ${(await row.getByRole('button').allInnerTexts()).join(', ')})`);
        return;
      }
      await control.click();
      const d = page.getByRole('dialog');
      await stock.fill(d, values);
      expect(await save(page, d)).toContain(toast);
    });
  };
  await act(1, bags[0], 'Discard', { Reason: 'Kantong bocor' }, 'Unit discarded');
  await act(2, bags[1], 'Convert', { Component: BLOODBANK.components.FFP.code, Quantity: '100' }, 'Component converted');
  await act(3, bags[2], 'Send out', { Destination: 'RS QA Lain' }, 'Unit sent');
};

export const TC_APP006_019: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  const req = new RequestsPage(page);
  const prc = BLOODBANK.components.PRC;

  await qa.step(1, async () => {
    await stock.open();
    const d = await stock.openDialog('Components');
    await stock.fill(d, {
      'Component code': prc.code,
      'Component name': prc.name,
      'Storage days': prc.storageDays,
      'Return limit (hours)': prc.returnHours,
      'Product code': prc.code,
    });
    await d.getByRole('checkbox', { name: 'Cross-match required' }).setChecked(prc.crossMatch);
    expect(await save(page, d)).toContain('Component saved');
    qa.note(1, 'PRC already exists in the seed data; saving it with the workbook values updates it');
  });

  await qa.step(2, async () => {
    await req.open();
    const d = await req.openDialog('Service mapping');
    await d.getByRole('combobox', { name: 'Component' }).selectOption({ label: await optionWith(d.getByRole('combobox', { name: 'Component' }), prc.code) });
    await stock.fill(d, { 'Service code': qa.prefix('QA-SVC-PRC'), 'Service name': prc.name });
    const toasts = await save(page, d, 'Save request');
    expect(toasts).toContain('Mapping saved');
    qa.note(2, 'the dialog\'s save button reads "Save request"');
    const open = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Close' }) }).first();
    if (await open.isVisible()) await open.getByRole('button', { name: 'Close' }).click();
  });

  const c = BLOODBANK.compatibility[0];
  await qa.step(3, async () => {
    await req.tab('Queue');
    const d = await req.openDialog('Compatibility');
    await stock.fill(d, { 'Patient group': c.patient, 'Donor group': c.donor });
    await d.getByRole('combobox', { name: 'Component' }).selectOption({ label: await optionWith(d.getByRole('combobox', { name: 'Component' }), c.component) });
    expect(await save(page, d)).toContain('Compatibility saved');
  });

  await qa.step(4, async () => {
    const d = await req.openDialog('Cross-match hours');
    await stock.fill(d, { 'Cross-match hours': '48' });
    expect(await save(page, d)).toContain('Hours saved');
  });
};

export async function optionWith(select: import('@playwright/test').Locator, text: string): Promise<string> {
  const option = select.locator('option').filter({ hasText: text }).first();
  await expect(option).toBeAttached();
  return (await option.innerText()).trim();
}

export const TC_APP006_023: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3], NO_UNIT);
};

export const TC_APP006_024: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3], NO_UNIT);
};

export const TC_APP006_025: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3, 4, 5], 'needs a unit issued for PT-1; ' + NO_UNIT);
};

export const TC_APP006_027: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3], 'needs a cross-matched unit; ' + NO_UNIT);
};

// --------------------------------------------------------------- refusals

export const TC_APP006_041: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  await stock.open();
  const d = stock.dialog('Collect the donation');

  await qa.step(1, async () => {
    await stock.openDialog('Collection', 'Collect the donation');
    await stock.fill(d, {
      // A made-up number of the workbook's series QAWB- that no visit has.
      'Blood bag no': `QAWB-${qa.token()}`,
      Segment: 'S-001',
      'Volume (ml)': '450',
      Start: `${todayWib()}T08:00`,
      End: `${todayWib()}T08:10`,
      'Collected site': 'QA Ruang Donor',
    });
    const toasts = await save(page, d);
    expect(toasts).not.toContain('Collection saved');
    qa.note(1, `refusal: "${toasts.join(' / ')}"`);
  });

  qa.blocked(2, 2);
  qa.blocked(3, 2);
  qa.blocked(4, 2);
};

export const TC_APP006_042: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2], 'needs the tick "Consume the bag from inventory" in Bag series and an accepted visit, both on Donors');
};

export const TC_APP006_043: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3, 4], 'needs bag QAWB-00002 "Collected", made from a visit on Donors');
};

export const TC_APP006_049: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  const bag = qa.code('QA-MANUAL-1');
  await stock.open();

  await qa.step(1, async () => {
    const d = await stock.openDialog('Intake stock', 'Stock intake');
    await stock.fill(d, { 'Blood bag no': bag, 'Expiry date': addDays(todayWib(), 10), Quantity: '350' });
    expect(await save(page, d)).toContain('Stock intake recorded');
  });

  await qa.step(2, async () => {
    await stock.filter({ 'Bag no': bag });
    const status = (await (await stock.cell(stock.row(bag).first(), 'Status')).innerText()).trim();
    if (status !== 'Unscreened') qa.deviation(2, 'Status "Unscreened", with "Group" and "Serology" to be done', `Status "${status || '—'}" (buttons: ${(await stock.row(bag).first().getByRole('button').allInnerTexts()).join(', ')})`);
  });

  qa.notRun(3, 'a request line can be cross-matched only after Accept and a patient group; the unit list of that step needs a screened unit (blocker 2)');
};

export const TC_APP006_050: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3, 4], 'needs an "Available" PRC unit of 250 ml; ' + NO_UNIT);
};

export const TC_APP006_051: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3, 4], 'needs UNIT-1/UNIT-2 expiring today; ' + NO_UNIT);
};

export const TC_APP006_052: QaBody = async ({ page, qa }) => {
  const req = new RequestsPage(page);
  const p = await registerPatient(page, BLOODBANK.pt1.name, qa.token());
  await req.open();
  const d = await req.openDialog('New request');
  const addLine = async (component: string, units: string, requiredBy = addDays(todayWib(), 1)) => {
    await d.getByRole('combobox', { name: 'Component' }).selectOption({ label: component });
    await d.getByRole('textbox', { name: 'Units' }).fill(units);
    await d.getByRole('textbox', { name: 'Required by' }).fill(requiredBy);
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Add line' }).click();
    return toastsAfter(page, mark);
  };
  const refusal = async (step: number, expected: RegExp, excel: string, toasts: string[]) => {
    const shown = [...toasts, ...(await d.getByRole('alert').allInnerTexts())].join(' / ');
    if (!expected.test(shown)) qa.deviation(step, excel, shown ? `"${shown}"` : 'no message');
  };

  await qa.step(1, () => expect(d.getByRole('button', { name: 'Save request' })).toBeDisabled());

  await qa.step(2, async () => {
    await req.pickPatient(d, p.fullName, p.mrn);
    const toasts = await save(page, d, 'Save request');
    expect(toasts).not.toContain('Request saved');
    await refusal(2, /department/i, 'Refused: "department is required"', toasts);
  });

  await qa.step(3, async () => {
    const toasts = await addLine('PRC', '0');
    await refusal(3, /above zero|units/i, 'A message that units must be above zero', toasts);
  });

  await qa.step(4, async () => {
    await addLine('PRC', '1');
    const toasts = await addLine('PRC', '1');
    await refusal(4, /already/i, 'A message that the component is already listed', toasts);
  });

  await qa.step(5, async () => {
    await addLine('FFP', '1', addDays(todayWib(), -1));
    const toasts = await save(page, d, 'Save request');
    expect(toasts).not.toContain('Request saved');
    await refusal(5, /past/i, 'Refused: "required-by date is in the past"', toasts);
  });

  await qa.step(6, async () => {
    qa.note(6, 'CRYO "without a service mapping" is a seed component; whether it has a mapping is not shown on the screen');
    await addLine('CRYO', '1');
    const toasts = await save(page, d, 'Save request');
    await refusal(6, /mapping/i, 'Refused: "component has no service mapping"', toasts);
  });
};

export const TC_APP006_055: QaBody = async ({ page, qa }) => {
  const req = new RequestsPage(page);
  const { patient, approved } = await savedRequest(page, qa);
  if (!approved) {
    qa.blocked(1, 25);
    qa.blocked(2, 25);
    qa.notRun(3, 'needs an approved and accepted line (found blocker 25)');
    test.skip(true, 'Blocker 25 (found by automation, docs/qa/blockers-found.md): a request cannot be approved');
  }
  await req.open();
  await req.tab('Queue');
  await req.main.getByRole('button', { name: 'Search' }).click();
  await req.queueTable().getByRole('row').filter({ hasText: patient.fullName }).getByRole('button').first().click();
  const d = page.getByRole('dialog', { name: 'Cross-match and issue' });
  await d.getByRole('textbox', { name: 'Remarks', exact: true }).fill('OK');
  expect(await save(page, d, 'Accept')).toContain('Request accepted');

  await qa.step(1, async () => {
    const field = d.getByRole('textbox', { name: /Patient group/ });
    await expect(field).toBeVisible();
    if (!(await field.inputValue())) qa.deviation(1, "The group is filled from the patient's tested sample, or can only be entered with a second check", 'a free text field, empty, saved by one click');
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: /Patient group/ }).fill('O Positive');
    const toasts = await save(page, d, 'Save group');
    if (toasts.includes('Group saved')) qa.deviation(2, 'Refused, or checked against an earlier group of this patient', 'saved (toast "Group saved")');
  });

  qa.notRun(3, "needs a second request for the same patient: the workbook's PT-1 is made per test here; not run (would need a second save of the same flow)");
};

export const TC_APP006_056: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3], 'needs UNIT-A, screened and available; ' + NO_UNIT);
};

export const TC_APP006_057: QaBody = async ({ page, qa }) => {
  const req = new RequestsPage(page);
  const { patient, approved } = await savedRequest(page, qa);
  if (!approved) {
    qa.blocked(1, 25);
    qa.blocked(2, 25);
    qa.blocked(3, 2);
    qa.blocked(4, 2);
    test.skip(true, 'Blocker 25 (found by automation, docs/qa/blockers-found.md): a request cannot be approved');
  }
  await req.open();
  await req.tab('Queue');
  await req.main.getByRole('button', { name: 'Search' }).click();
  await req.queueTable().getByRole('row').filter({ hasText: patient.fullName }).getByRole('button').first().click();
  const d = page.getByRole('dialog', { name: 'Cross-match and issue' });
  await d.getByRole('textbox', { name: 'Remarks', exact: true }).fill('OK');
  expect(await save(page, d, 'Accept')).toContain('Request accepted');
  qa.note(1, 'line A is an accepted line without a cross-matched unit (no screened unit can be made, blocker 2)');

  await qa.step(1, async () => {
    await d.getByRole('textbox', { name: 'Stop remarks' }).fill('');
    const toasts = await save(page, d, 'Cancel line');
    expect(toasts).not.toContain('Line cancelled');
    if (!toasts.some((t) => /remarks/i.test(t))) qa.deviation(1, 'Refused: "remarks are required"', `"${toasts.join(' / ')}"`);
  });

  await qa.step(2, async () => {
    await d.getByRole('textbox', { name: 'Stop remarks' }).fill('Pasien pulang');
    expect(await save(page, d, 'Cancel line')).toContain('Line cancelled');
  });

  qa.blocked(3, 2);
  qa.blocked(4, 2);
};

export const TC_APP006_058: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3, 4, 5], 'needs a unit issued for PT-1; ' + NO_UNIT);
};

export const TC_APP006_059: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3], 'needs a unit issued for PT-1; ' + NO_UNIT);
};

export const TC_APP006_060: QaBody = async ({ qa }) => {
  allBlocked(qa, [1, 2, 3, 4, 5], 'needs issued and transfused units; ' + NO_UNIT);
};

// ------------------------------------------------------- quality control

export const TC_APP006_029: QaBody = async ({ page, qa }) => {
  const qc = new QcPage(page);

  await qa.step(1, async () => {
    await page.goto('/id/bloodbank');
    await page.getByRole('main').getByRole('link', { name: 'Quality control', exact: true }).click();
    await expect(qc.heading).toBeVisible();
    await expect(qc.main.getByText('One list for red cells, plasma, platelets, cryoprecipitate, equipment, and CuSO4.')).toBeVisible();
    await expect(qc.main.getByRole('combobox', { name: 'Kind' })).toBeVisible();
    for (const b of ['Record', 'Limits']) await expect(qc.button(b)).toBeVisible();
  });

  await qa.step(2, async () => {
    const d = await qc.openDialog('Limits');
    await d.getByRole('combobox', { name: 'Measure' }).selectOption({ label: await optionWith(d.getByRole('combobox', { name: 'Measure' }), 'Volume') });
    await qc.fill(d, { Minimum: '200', Maximum: '350' });
    expect(await save(page, d)).toContain('Limit saved');
  });

  const unit = qa.code('QA-QC-1');
  let recorded = false;
  await qa.step(3, async () => {
    const d = await qc.openDialog('Record');
    await qc.fill(d, { Technician: qa.name('QA Teknisi'), Date: todayWib(), 'Unit no.': unit, Collected: todayWib(), Volume: '280', HCT: '60' });
    const toasts = await save(page, d);
    if (isServerFailure(toasts)) {
      qa.note(3, `"Save": "${toasts.join(' / ')}" (found blocker 25)`);
      await d.getByRole('button', { name: 'Close' }).click();
      return;
    }
    expect(toasts).toContain('Quality control saved');
    recorded = true;
  });
  if (!recorded) {
    qa.blocked(3, 25);
    qa.blocked(4, 25);
    return;
  }

  await qa.step(4, async () => {
    await qc.main.getByRole('combobox', { name: 'Kind' }).selectOption({ label: 'Red cells' });
    await qc.button('Search').click();
    await expect(qc.main.getByRole('listitem').first()).not.toHaveText('No documents yet.');
    qa.note(4, `first document: ${(await qc.main.getByRole('listitem').first().innerText()).replace(/\s+/g, ' ')}`);
  });
};

export const TC_APP006_062: QaBody = async ({ page, qa }) => {
  const qc = new QcPage(page);
  await qc.open();
  const limit = await qc.openDialog('Limits');
  await limit.getByRole('combobox', { name: 'Measure' }).selectOption({ label: await optionWith(limit.getByRole('combobox', { name: 'Measure' }), 'Volume') });
  await qc.fill(limit, { Minimum: '200', Maximum: '350' });
  expect(await save(page, limit)).toContain('Limit saved');

  const d = await qc.openDialog('Record');
  await qc.fill(d, { Technician: qa.name('QA Teknisi'), Date: todayWib(), 'Unit no.': qa.code('QA-QC-1'), Collected: todayWib(), Volume: '180' });
  const toasts = await save(page, d);
  if (isServerFailure(toasts)) {
    // Every QC save fails today (found blocker 25), so the out-of-limit case cannot be told apart.
    qa.blocked(1, 25);
    qa.blocked(2, 25);
    test.skip(true, 'Blocker 25 (found by automation, docs/qa/blockers-found.md): Saving an external bag or a quality-control record answers HTTP 500');
  }

  await qa.step(1, async () => {
    if (!toasts.includes('Quality control saved')) {
      qa.deviation(1, 'Toast "Quality control saved"; the line is marked as failed', `refused: "${toasts.join(' / ')}"`);
    }
  });

  await qa.step(2, async () => {
    await d.getByRole('button', { name: 'Close' }).click().catch(() => {});
    await qc.button('Search').click();
    qa.note(2, `documents: ${(await qc.main.getByRole('listitem').allInnerTexts()).slice(0, 2).join(' | ')}`);
  });
};

export const TC_APP006_072: QaBody = async ({ page, qa }) => {
  const stock = new StockPage(page);
  await stock.open();
  const d = await stock.openDialog('Blood group chart');

  await qa.step(1, async () => {
    await expect(d.getByRole('textbox', { name: 'Reagent cells' })).toBeVisible();
    await expect(d.getByRole('group', { name: 'Columns' })).toBeVisible();
    for (const b of ['Save settings', 'Save chart']) await expect(d.getByRole('button', { name: b })).toBeVisible();
    await expect(d.getByRole('combobox', { name: /Branch/ })).toHaveCount(0);
  });

  await qa.step(2, async () => {
    const toasts = await save(page, d, 'Save settings');
    qa.note(2, `confirmation (TBD in the workbook): "${toasts.join(' / ')}"`);
    expect(toasts.length).toBeGreaterThan(0);
  });

  await qa.step(3, async () => {
    // Group chart of the shared data: CellSerum row giving O Positive (00-test-data.xlsx | Catalogue, row 100).
    await d.getByRole('combobox', { name: 'Chart' }).selectOption({ label: 'CellSerum' });
    // The catalogue gives only the resulting group; the reaction strengths (0 / 4) are assumed (Q21).
    await stock.fill(d, { anti_a: '0', anti_b: '0', anti_ab: '0', anti_d: '4', cell_a: '4', cell_b: '4', cell_o: '0', ABO: 'O', Rh: 'Positive', Group: 'O Positive' });
    const toasts = await save(page, d, 'Save chart');
    if (isServerFailure(toasts)) return qa.blocked(3, 25);
    // The row of the catalogue is saved once per branch (since 2026-10-31); a later run is refused as a duplicate.
    if (toasts.some((t) => /chart already exists/i.test(t))) return qa.note(3, `the O Positive row is already on the chart of the branch: "${toasts.join(' / ')}"`);
    expect(toasts).toContain('Chart saved');
  });

  qa.blocked(4, 2);
};
