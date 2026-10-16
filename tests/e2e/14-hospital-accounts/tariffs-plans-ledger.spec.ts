import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, toastsSince } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { registerPatient } from '../../../lib/ambulatory-data';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { screenOpens } from '../shared/screen-opens';
import { counterClosed, ensureSettings, sale } from './helpers';
import { DeskScreen, ledger, patientWithId, plans, pricedGroup, tariffs, TC_APP014_053, TC_APP014_057, TC_APP014_061, toastsAfter } from './cases';

/**
 * 14-hospital-accounts.xlsx: Tariff group (/billing/tariffs), Patient plan
 * (/billing/plans), Patient ledger (/billing/ledger) and the screen check of
 * every route (074 … 078). Codes carry a token. "The internal id of a
 * registered test patient" is shown on no screen; it is read from the answer of
 * the patient search on Registered patients (Q27).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP014-053', TC_APP014_053);

qaTest('TC-APP014-054', async ({ page, qa }) => {
  const t = tariffs(page);
  const { group } = await pricedGroup(page, qa);
  const cases: [number, Record<string, string>, string, string][] = [
    [1, { 'Group / plan code': qa.code('X-UMUM'), 'Name / destination': '' }, 'Tariff group', 'code and name are required'],
    [2, { 'Group / plan code': group, 'Name / destination': qa.name('X Umum') }, 'Tariff group', 'DuplicateEntry'],
    [3, { 'Group / plan code': qa.code('X-TIDAK'), Service: qa.code('X-VISITE'), Amount: '150000' }, 'Service price', 'select the tariff group'],
    [4, { 'Group / plan code': group, Service: '', Amount: '150000' }, 'Service price', 'serviceGrpOrType'],
    [5, { 'Group / plan code': group, Service: qa.code('X-VISITE'), Amount: '0' }, 'Service price', 'serviceGrpOrType'],
    [6, { 'Group / plan code': '   ', 'Name / destination': '   ' }, 'Tariff group', 'hospital accounts failed'],
  ];
  for (const [step, v, action, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await t.save(v, action);
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
});

qaTest('TC-APP014-055', async ({ page, qa }) => {
  const t = tariffs(page);
  const { group } = await pricedGroup(page, qa);
  await qa.step(1, async () => {
    const service = qa.code('X-VISITE');
    const toasts = await t.save({ 'Group / plan code': group, Service: service, Amount: '150.000' }, 'Service price');
    if (toasts.includes('Saved.')) {
      await t.open();
      qa.note(1, `stored: ${(await t.cells(t.row(service)))[1]}`);
    } else qa.note(1, `text shown: "${toasts.join(' / ')}"`);
  });
  for (const [step, amount] of [[2, '150,000'], [3, '-5000']] as const) {
    await qa.step(step, async () => {
      const toasts = await t.save({ 'Group / plan code': group, Service: qa.code('X-VISITE'), Amount: amount }, 'Service price');
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}"`);
    });
  }
});

qaTest('TC-APP014-056', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2 on this screen (blocker 5 for its lists)');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP014-057', TC_APP014_057);

qaTest('TC-APP014-058', async ({ page, qa }) => {
  const pl = plans(page);
  const pt = await patientWithId(page, qa);
  const code = qa.code('X-BPJS-K1');
  expect(await pl.save({ 'Group / plan code': code, 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.id }, 'Plan')).toContain('Saved.');
  const cases: [number, Record<string, string>, string][] = [
    [1, { 'Group / plan code': qa.code('X-BPJS-K1'), 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.name }, 'noPatPlanAvail'],
    [2, { 'Group / plan code': '', 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.id }, 'code is required'],
    [3, { 'Group / plan code': code, 'Name / destination': qa.code('X-BPJS'), 'Patient / source': pt.id }, 'DuplicateEntry'],
  ];
  for (const [step, v, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await pl.save(v, 'Plan');
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
  await qa.step(4, async () => {
    const toasts = await pl.save({ 'Group / plan code': qa.code('X-BPJS-K1'), 'Name / destination': qa.code('X-BPJS'), 'Patient / source': '00000000-0000-4000-8000-000000000000' }, 'Plan');
    qa.note(4, `a well-formed id of no patient: "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP014-059', async ({ page, qa }) => {
  const pl = plans(page);
  const none = await patientWithId(page, qa);
  await qa.step(1, async () => {
    const toasts = await pl.save({ 'Patient / source': none.id }, 'Check eligibility');
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "noPatPlanAvail")`);
  });
  await qa.step(2, async () => {
    expect(await pl.save({ 'Group / plan code': qa.code('X-BPJS-K1'), 'Name / destination': qa.code('X-BPJS'), 'Patient / source': none.id }, 'Plan')).toContain('Saved.');
    const toasts = await pl.save({ 'Patient / source': none.id }, 'Check eligibility');
    expect(toasts).not.toContain('Saved.');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "pre-authorization is not approved")`);
  });
  await qa.step(3, async () => {
    await pl.open();
    await pl.rows().first().getByRole('button', { name: 'Use' }).click();
    await pl.openDialog();
    const source = await pl.input('Patient / source').inputValue();
    const toasts = await pl.fillAndSave({}, 'Check eligibility');
    qa.note(3, `"Patient / source" after "Use": ${source}; text shown: "${toasts.join(' / ') || 'none'}"`);
  });
});

qaTest('TC-APP014-060', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2 on this screen (blocker 5 for its lists)');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP014-061', TC_APP014_061);

qaTest('TC-APP014-062', async ({ page, qa }) => {
  const l = ledger(page);
  const { group, service } = await pricedGroup(page, qa);
  const pt = await patientWithId(page, qa);
  const base = { 'Invoice number': qa.code('X-RI-0001'), 'Group / plan code': group, Service: service, 'Patient / source': pt.id, Quantity: '2' };
  const cases: [number, Record<string, string>, string][] = [
    [1, { ...base, Service: qa.code('X-TANPA-HARGA') }, 'Tariff is not defined for this service'],
    [2, { ...base, Quantity: '0' }, 'Tariff is not defined for this service'],
    [3, { ...base, 'Invoice number': '' }, 'Tariff is not defined for this service'],
    [4, { ...base, 'Patient / source': pt.name }, 'patient is required'],
  ];
  for (const [step, v, server] of cases) {
    await qa.step(step, async () => {
      const toasts = await l.save(v, 'Bill inpatient', true);
      expect(toasts).not.toContain('Saved.');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "${server}")`);
    });
  }
});

qaTest('TC-APP014-063', async ({ page, qa }) => {
  const l = ledger(page);
  const { group, service } = await pricedGroup(page, qa);
  const pt = await patientWithId(page, qa);
  const invoice = qa.code('X-RI-0001');
  const base = { 'Invoice number': invoice, 'Group / plan code': group, Service: service, 'Patient / source': pt.id, Quantity: '2' };
  expect(await l.save(base, 'Bill inpatient', true)).toContain('Saved.');

  await qa.step(1, async () => {
    const toasts = await l.save(base, 'Bill inpatient', true);
    await l.find(pt.id);
    qa.note(1, `second bill with the same number: "${toasts.join(' / ')}"; rows with the number: ${await l.row(invoice).count()}`);
  });
  await qa.step(2, async () => {
    const other = qa.code('X-RI-0001');
    const toasts = await l.save({ ...base, 'Invoice number': other, Quantity: '1', Amount: '999999' }, 'Bill inpatient', true);
 await l.find(pt.id);
    qa.note(2, `"${toasts.join(' / ')}"; row: ${(await l.cells(l.row(other).first()).catch(() => [])).join(' | ')}`);
  });
  qa.blocked(3, 36);
  await qa.step(4, async () => {
    await l.open();
    await l.main.getByRole('textbox', { name: 'Find patient' }).fill(pt.name);
    await l.main.getByRole('button', { name: 'Find patient' }).click();
    qa.note(4, `search by name shows ${await l.rows().count()} row(s); the invoice of the patient is ${(await l.row(invoice).count()) ? '' : 'not '}among them`);
  });
});

qaTest('TC-APP014-064', async ({ qa }) => {
  qa.notRun(1, 'U1 works on one branch; "All branches" in the header needs U2 on this screen (blocker 5 for its lists)');
  qa.notRun(2, 'see step 1');
});

qaTest('TC-APP014-065', async () => {
  // Every step needs a chosen invoice on Patient ledger (found blocker 36); the plan declares the case fixme.
});

qaTest('TC-APP014-066', async ({ page, qa }) => {
  const l = ledger(page);
  await qa.step(1, async () => {
    await l.open();
    const dest = (await l.cells(l.rows().first()))[2];
    await l.openDialog();
    const toasts = await l.fillAndSave({ 'Patient / source': '', 'Name / destination': dest, Amount: '50000' }, 'Move deposit', true);
    expect(toasts).not.toContain('Saved.');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "PlsSelSrcSite")`);
  });
  for (const st of [2, 3, 4, 5]) qa.blocked(st, 36);
  qa.notRun(6, 'needs a chosen invoice (found blocker 36)');
  qa.notRun(7, 'needs an invoice of BR-B; U1 works on one branch');
});

qaTest('TC-APP014-067', async ({ qa }) => {
  qa.notRun(1, 'needs two users saving at the same moment (U4 "Second user of the same role" is not made)');
});

qaTest('TC-APP014-068', async () => {
  // Every step needs a chosen invoice on Patient ledger (found blocker 36); the plan declares the case fixme.
});

qaTest('TC-APP014-069', async ({ page, qa }) => {
  const l = ledger(page);
  await qa.step(3, async () => {
    await l.open();
    await l.openDialog();
    const toasts = await l.fillAndSave({ 'Patient / source': '', 'Card status': 'failed', Amount: '100000' }, 'Failed card', true);
    expect(toasts).not.toContain('Saved.');
    qa.note(3, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with a text ending in "document is missing")`);
  });
  for (const st of [1, 2, 4]) qa.blocked(st, 36);
});

const SCREENS: [string, string, string][] = [
  ['TC-APP014-074', '/billing', 'Hospital Accounts'],
  ['TC-APP014-075', '/billing/cashier', 'Fast Cashier'],
  ['TC-APP014-076', '/billing/ledger', 'Patient ledger'],
  ['TC-APP014-077', '/billing/plans', 'Patient plan'],
  ['TC-APP014-078', '/billing/tariffs', 'Tariff group'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
