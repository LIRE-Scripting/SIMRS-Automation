import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { agreement, TC_APP019_066, TC_APP019_068 } from './cases';
import { rowCount, screenRefuses, userPage } from '../shared/access';
import { FinanceDesk } from './finance-desk';
import { clickFor, createAccount } from './helpers';
import { firstCode } from '../../../lib/qa-data/names';

/**
 * 19-finance.xlsx, treasury and audit: imprest (/finance/imprest), bank
 * reconciliation, payment requests, security deposits, bank guarantees,
 * letters of credit, agreements and loans, audit sheets, and the finance
 * rights. The bodies used by the chains are in cases.ts; the desk screens
 * share FinanceDesk (finance-desk.ts). The second finance user is the role
 * account qa.finance (FINANCE_WRITE only); its steps stop where a journal of
 * today cannot be saved (blocker 45) or an approval is needed (blocker 46).
 * Steps that need a setting of the branch for every user are not run.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP019-066', async ({ page, qa }) => {
  await TC_APP019_066({ page, qa });
});

// ------------------------------------------------------------ the desks of treasury and audit

const amountIn = (cells: string[], amount: string) => cells.some((c) => c.replace(/[.,\s]/g, '').includes(amount));
const shows = (toasts: string[], text: string) => toasts.some((t) => t.includes(text));

qaTest('TC-APP019-064', async ({ page, qa }) => {
  const d = new FinanceDesk(page, 'reconciliation');
  // The account lists offer only the first 50 accounts (found blocker 40): the first offered QA bank account.
  const bank = { code: 'QA-1010' };
  await qa.step(1, async () => {
    await page.goto('/id/finance');
    await page.getByRole('complementary').getByRole('link', { name: 'Bank reconciliation' }).or(d.main.getByRole('link', { name: 'Bank reconciliation' })).first().click();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Bank reconciliation' })).toBeVisible();
    for (const b of ['Load', 'Auto-match', 'Save']) await expect(d.main.getByRole('button', { name: b, exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    await d.choose(0, bank.code);
    await d.main.getByLabel('From', { exact: true }).fill(`${todayWib().slice(0, 8)}01`);
    await d.main.getByLabel('To', { exact: true }).fill(todayWib());
    await clickFor(page, d.main.getByRole('button', { name: 'Load', exact: true }));
    qa.note(2, `rows of the new bank account ${bank.code}: "${(await d.main.innerText()).replace(/\s+/g, ' ').slice(-200)}"`);
  });
  await qa.step(3, async () => {
    const file = test.info().outputPath('statement.csv');
    fs.writeFileSync(file, `date,description,amount\n${todayWib()},${qa.prefix('X Setoran uji')},1000000\n`);
    await d.main.locator('input[type="file"]').setInputFiles(file);
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(3, `statement file: ${(await d.main.getByRole('table').last().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}`);
  });
  await qa.step(4, async () => {
    qa.note(4, `Auto-match: "${(await clickFor(page, d.main.getByRole('button', { name: 'Auto-match', exact: true }))).join(' / ') || 'no toast'}"`);
  });
  await qa.step(5, async () => {
    const toasts = await clickFor(page, d.main.getByRole('button', { name: 'Save', exact: true }));
    qa.note(5, `Save: "${toasts.join(' / ') || 'no toast'}"`);
    if (!shows(toasts, 'Reconciliation saved.')) qa.deviation(5, 'Toast "Reconciliation saved."', `"${toasts.join(' / ') || 'no toast'}" (the new account has no ledger row to clear)`);
  });
  qa.notRun(6, 'needs the saved reconciliation of step 5 (a bank account with ledger rows and a matching statement)');
});

qaTest('TC-APP019-065', async ({ page, qa }) => {
  const d = new FinanceDesk(page, 'reconciliation');
  // The account lists offer only the first 50 accounts (found blocker 40): the first offered QA bank account.
  const bank = { code: 'QA-1010' };
  const load = async (from: string, to: string) => {
    await d.open();
    await d.choose(0, bank.code);
    await d.main.getByLabel('From', { exact: true }).fill(from);
    await d.main.getByLabel('To', { exact: true }).fill(to);
    return clickFor(page, d.main.getByRole('button', { name: 'Load', exact: true }));
  };
  await qa.step(1, async () => {
    const toasts = await load('2000-01-01', '2000-01-31');
    qa.note(1, `start 2000-01-01: "${toasts.join(' / ') || 'no toast'}"; screen: "${(await d.main.innerText()).replace(/\s+/g, ' ').slice(-160)}"`);
  });
  qa.notRun(2, 'needs a reconciliation of the account waiting for approval (TC-APP019-064 step 6)');
  await qa.step(3, async () => {
    await load(`${todayWib().slice(0, 8)}01`, todayWib());
    const file = test.info().outputPath('no-amount.csv');
    fs.writeFileSync(file, `date,description\n${todayWib()},${qa.prefix('X Setoran uji')}\n`);
    await d.main.locator('input[type="file"]').setInputFiles(file);
    await page.waitForLoadState('networkidle').catch(() => {});
    qa.note(3, `file without an amount column: "${(await d.main.innerText()).replace(/\s+/g, ' ').slice(-200)}"`);
  });
  await qa.step(4, async () => {
    const toasts = await load('2001-01-01', '2001-01-31');
    const shown = shows(toasts, 'No ledger rows in this range.') || (await d.main.getByText('No ledger rows in this range.').count()) > 0;
    if (!shown) qa.deviation(4, 'The text "No ledger rows in this range."', `"${toasts.join(' / ') || 'no toast'}"`);
  });
});

qaTest('TC-APP019-067', async ({ qa }) => {
  qa.blocked(1, 42);
  qa.notRun(2, 'needs an approved imprest advance and its bill (found blocker 42: no advance can be requested)');
  qa.notRun(3, 'needs an approved imprest advance to pay (found blocker 42)');
  qa.notRun(4, 'needs a first advance that is not settled (found blocker 42)');
});

// Declared through a wrapper: qaTest passes testInfo as the second argument.
qaTest('TC-APP019-068', ({ page, qa }) => TC_APP019_068({ page, qa }));

qaTest('TC-APP019-069', async ({ page, qa }) => {
  const d = new FinanceDesk(page, 'payment-requests');
  await qa.step(2, async () => {
    await d.open();
    const r = await d.create({ 0: 'Refund', 'Source document': qa.code('X-SRC-001'), Party: qa.name('X Tanpa akun'), Amount: '100000' });
    expect(r.no).toBe('');
    if (!shows(r.toasts, 'The party needs a ledger account.')) qa.deviation(2, 'The text "The party needs a ledger account."', `"${r.toasts.join(' / ') || 'no toast'}"`);
  });
  await qa.step(3, async () => {
    await d.open();
    const r = await d.create({ 0: 'Agreement', 'Source document': qa.code('X-AGR-DRAFT'), Party: qa.name('X Vendor'), Amount: '100000' });
    expect(r.no).toBe('');
    if (!shows(r.toasts, 'An approved legal agreement is required.')) qa.deviation(3, 'The text "An approved legal agreement is required."', `"${r.toasts.join(' / ') || 'no toast'}"`);
  });
  qa.notRun(1, 'needs an open payment request for a source (TC-APP019-068 step 3)');
  qa.notRun(4, 'needs an approved payment request to pay on Payments (TC-APP019-068 step 3)');
});

/** A security receipt of the test (kind, party, amount, instrument), sent and approved. */
async function securityReceipt(page: Page, qa: Qa, amount = '10000000'): Promise<{ no: string; status: string; toasts: string[]; refused?: boolean }> {
  const d = new FinanceDesk(page, 'security-receipts');
  await d.open();
  const r = await d.create({ 0: 'EMD', Party: qa.name('X Peserta tender'), Amount: amount, 'Instrument number': qa.code('X-INS-001'), 'Instrument type': 'CHEQUE', 'Instrument date': todayWib() });
  if (!r.no) return { no: '', status: '', toasts: r.toasts };
  const a = await d.sendApprove(r.no);
  return { no: r.no, status: a.status, toasts: [...r.toasts, ...a.toasts], refused: a.refused };
}

qaTest('TC-APP019-070', async ({ page, qa }) => {
  const d = new FinanceDesk(page, 'security-receipts');
  let rec = { no: '', status: '', toasts: [] as string[] };
  await qa.step(1, async () => {
    await d.open();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Security receipts' })).toBeVisible();
    for (const f of ['Party', 'Amount', 'Instrument number']) await expect(d.main.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    rec = await securityReceipt(page, qa);
    qa.note(2, `${rec.no}: "${rec.toasts.join(' / ').slice(0, 160)}"; status "${rec.status}"`);
    expect(rec.no, 'the receipt of the test').toBeTruthy();
    if (!(rec as { refused?: boolean }).refused && rec.status !== 'Approved') qa.deviation(2, 'The receipt is approved', `status "${rec.status}"`);
  });
  if ((rec as { refused?: boolean }).refused) {
    // The receipt cannot be approved (found blocker 46): nothing to post or dispose of.
    for (const st of [2, 3, 4]) qa.blocked(st, 46);
    qa.notRun(5, 'needs the approved disposal request of step 4 (found blocker 46)');
    qa.notRun(6, 'the forfeiture repeats steps 2 to 5 for a second receipt (found blocker 46)');
    return;
  }
  await qa.step(3, async () => {
    const toasts = await new FinanceDesk(page, 'security-accounting').post(rec.no);
    if (!shows(toasts, 'Posted.')) qa.deviation(3, 'Toast "Posted."; a system bank receipt books the deposit', `"${toasts.join(' / ') || 'no toast'}"`);
  });
  await qa.step(4, async () => {
    const req = new FinanceDesk(page, 'security-disposal-requests');
    await req.open();
    const r = await req.create({ 0: rec.no, 1: 'Refund', Amount: '10000000' }).catch((e: Error) => ({ toasts: [String(e.message).slice(0, 100)], no: '' }));
    qa.note(4, `disposal request: ${r.no || '(none)'} "${r.toasts.join(' / ')}"`);
    if (r.no) qa.note(4, `status "${(await req.sendApprove(r.no)).status}"`);
  });
  qa.notRun(5, 'the posting of the refund needs the approved disposal request of step 4 (its result is noted there)');
  qa.notRun(6, 'the forfeiture repeats steps 2 to 5 for a second receipt');
});

qaTest('TC-APP019-071', async ({ page, qa }) => {
  const rec = await securityReceipt(page, qa, '1000000');
  if (rec.refused) qa.blocked(2, 46);
  else await qa.step(2, async () => {
    const req = new FinanceDesk(page, 'security-disposal-requests');
    await req.open();
    const r = await req.create({ 0: rec.no || 'Receipt', 1: 'Refund', Amount: '9000000' }).catch((e: Error) => ({ toasts: [String(e.message).slice(0, 100)], no: '' }));
    if (!shows(r.toasts, 'The amount exceeds the receipt.')) qa.deviation(2, 'The text "The amount exceeds the receipt."', `"${r.toasts.join(' / ') || 'no toast'}"`);
  });
  await qa.step(5, async () => {
    const acc = new FinanceDesk(page, 'security-accounting');
    await acc.open();
    const toasts = await clickFor(page, acc.main.getByRole('button', { name: 'Post', exact: true }).first());
    qa.note(5, `"Post" with no row ticked: "${toasts.join(' / ') || 'nothing is said'}" (TBD in the workbook)`);
  });
  qa.notRun(1, 'needs a branch without deposit accounts: the mapping is a setting of the branch configuration for every user');
  qa.notRun(3, 'TBD in the workbook: the list of receipts offered for disposal is read in TC-APP019-070 step 4');
  // The second accountant exists (qa.finance); there is no approved receipt to post (blocker 46).
  qa.blocked(4, 46);
});

/** An approved bank guarantee of the test; returns its number. */
async function guarantee(page: Page, qa: Qa): Promise<{ no: string; status: string; toasts: string[]; refused?: boolean }> {
  const d = new FinanceDesk(page, 'bank-guarantees');
  await d.open();
  const r = await d.create({ 0: 'Performance', Party: qa.name('X Kontraktor'), Bank: qa.name('X Bank'), Amount: '50000000', 'Instrument number': qa.code('X-BG-001'), 'Valid until': addDays(todayWib(), 365) });
  if (!r.no) return { no: '', status: '', toasts: r.toasts };
  const a = await d.sendApprove(r.no);
  return { no: r.no, status: a.status, toasts: [...r.toasts, ...a.toasts], refused: a.refused };
}

qaTest('TC-APP019-072', async ({ page, qa }) => {
  let bg = { no: '', status: '', toasts: [] as string[] };
  await qa.step(1, async () => {
    const d = new FinanceDesk(page, 'bank-guarantees');
    await d.open();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Bank guarantees' })).toBeVisible();
    for (const f of ['Party', 'Bank', 'Amount', 'Instrument number', 'Valid until']) await expect(d.main.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    bg = await guarantee(page, qa);
    qa.note(2, `${bg.no}: "${bg.toasts.join(' / ').slice(0, 160)}"; status "${bg.status}"`);
    expect(bg.no, 'the guarantee of the test').toBeTruthy();
  });
  if ((bg as { refused?: boolean }).refused) {
    // The guarantee cannot be approved (found blocker 46): no encashment can be requested or posted.
    for (const st of [2, 3, 4]) qa.blocked(st, 46);
    return;
  }
  let reqNo = '';
  await qa.step(3, async () => {
    const req = new FinanceDesk(page, 'bank-guarantee-settlement-requests');
    await req.open();
    const r = await req.create({ 0: bg.no, Amount: '20000000' }).catch((e: Error) => ({ toasts: [String(e.message).slice(0, 100)], no: '' }));
    reqNo = r.no;
    qa.note(3, `encashment request: ${r.no || '(none)'} "${r.toasts.join(' / ')}"${r.no ? `; status "${(await req.sendApprove(r.no)).status}"` : ''}`);
  });
  await qa.step(4, async () => {
    if (!reqNo) return qa.note(4, 'no encashment request of the test to post');
    const toasts = await new FinanceDesk(page, 'bank-guarantee-settlements').post(reqNo);
    if (!shows(toasts, 'Posted.')) qa.deviation(4, 'Toast "Posted."', `"${toasts.join(' / ') || 'no toast'}"`);
  });
});

qaTest('TC-APP019-073', async ({ page, qa }) => {
  const bg = await guarantee(page, qa);
  if (bg.refused) qa.blocked(1, 46);
  else await qa.step(1, async () => {
    const req = new FinanceDesk(page, 'bank-guarantee-settlement-requests');
    await req.open();
    const r = await req.create({ 0: bg.no || 'Guarantee', Amount: '60000000' }).catch((e: Error) => ({ toasts: [String(e.message).slice(0, 100)], no: '' }));
    if (!shows(r.toasts, 'The amount exceeds the guarantee.')) qa.deviation(1, 'The text "The amount exceeds the guarantee."', `"${r.toasts.join(' / ') || 'no toast'}"`);
  });
  qa.notRun(2, 'TBD in the workbook: a second encashment after the first of TC-APP019-072');
  qa.notRun(3, 'needs a branch without guarantee accounts: the mapping is a setting of the branch configuration for every user');
  qa.notRun(4, 'TBD in the workbook: needs a guarantee whose "Valid until" has passed (a date in the past is the reference\'s case)');
});

/** Saves an LC document of a kind, sends and approves it; returns its number, status and toasts. */
async function lcStep(page: Page, qa: Qa, kind: string, v: Record<string, string>): Promise<{ no: string; status: string; toasts: string[]; refused?: boolean }> {
  const d = new FinanceDesk(page, 'letters-of-credit');
  await d.open();
  const r = await d.create({ 0: kind, ...v });
  if (!r.no) return { no: '', status: '', toasts: r.toasts };
  const a = await d.sendApprove(r.no);
  return { no: r.no, status: a.status, toasts: [...r.toasts, ...a.toasts], refused: a.refused };
}

qaTest('TC-APP019-074', async ({ page, qa }) => {
  // The account lists offer only the first 50 accounts (found blocker 40): the first offered QA bank account.
  const bank = { code: 'QA-1010' };
  const margin = { code: 'QA-1501' };
  // QA-5010 accounts of earlier runs are past the first 50 since 2026-10-31: an expense account whose code sorts first.
  const charges = await createAccount(page, { code: firstCode('QA-5010'), name: qa.name('QA Beban Uji'), kind: 'Expense' });
  let open = { no: '', status: '', toasts: [] as string[] };
  await qa.step(1, async () => {
    const d = new FinanceDesk(page, 'letters-of-credit');
    await d.open();
    await expect(d.main.getByRole('heading', { level: 1, name: 'Letter of credit' })).toBeVisible();
    for (const f of ['Bank', 'LC amount', 'Margin', 'Valid until', 'Charges']) await expect(d.main.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    open = await lcStep(page, qa, 'Open', { Bank: qa.name('X Bank'), 1: bank.code, 2: margin.code, 3: charges.code, 'LC amount': '100000000', Margin: '10000000', Charges: '500000', 'Valid until': addDays(todayWib(), 90) });
    qa.note(2, `${open.no}: "${open.toasts.join(' / ').slice(0, 160)}"; status "${open.status}"`);
    expect(open.no, 'the opened LC of the test').toBeTruthy();
  });
  if ((open as { refused?: boolean }).refused) {
    // The opened LC cannot be approved (found blocker 46): no amendment, establishment or maturity can follow.
    for (const st of [2, 3, 4]) qa.blocked(st, 46);
  } else await qa.step(3, async () => {
    const r = await lcStep(page, qa, 'Amendment', { Document: open.no, 'Valid until': addDays(todayWib(), 120) });
    qa.note(3, `amendment ${r.no || '(none)'}: "${r.toasts.join(' / ').slice(0, 120)}"; status "${r.status}"`);
  });
  if (!(open as { refused?: boolean }).refused) await qa.step(4, async () => {
    const est = await lcStep(page, qa, 'Establishment', { Document: open.no });
    const mat = await lcStep(page, qa, 'Maturity', { Document: open.no, 'LC amount': '100000000' });
    const row = await new FinanceDesk(page, 'letters-of-credit').cells(open.no).catch(() => [] as string[]);
    qa.note(4, `establishment ${est.no || '(none)'} "${est.status}"; maturity ${mat.no || '(none)'} "${mat.status}"; the LC reads ${row.join(' | ')}`);
  });
  await qa.step(5, async () => {
    const d = new FinanceDesk(page, 'letters-of-credit');
    await d.open();
    qa.note(5, `purchase orders in the form: "${(await d.main.innerText()).match(/(purchase order|pesanan pembelian)[^.]*\./i)?.[0] ?? 'no text on purchase orders'}" (TBD in the workbook)`);
  });
});

qaTest('TC-APP019-075', async ({ page, qa }) => {
  // The account lists offer only the first 50 accounts (found blocker 40): the first offered QA bank account.
  const bank = { code: 'QA-1010' };
  const open = await lcStep(page, qa, 'Open', { Bank: qa.name('X Bank'), 1: bank.code, 2: bank.code, 3: bank.code, 'LC amount': '100000000', Margin: '10000000', Charges: '500000', 'Valid until': addDays(todayWib(), 90) });
  await qa.step(1, async () => {
    const d = new FinanceDesk(page, 'letters-of-credit');
    await d.open();
    const r = await d.create({ 0: 'Maturity', Document: open.no || 'X', 'LC amount': '1000000' });
    if (!shows(r.toasts, 'This letter of credit step is not allowed yet.')) qa.deviation(1, 'The text "This letter of credit step is not allowed yet."', `"${r.toasts.join(' / ') || 'no toast'}"`);
  });
  qa.notRun(2, 'needs an established LC (TC-APP019-074 step 4)');
  qa.notRun(3, 'needs an LC whose open document is still a draft; the open document of the test is sent and approved');
});

qaTest('TC-APP019-076', async ({ page, qa }) => {
  // The ledger list offers only the first 50 accounts (found blocker 40): the first offered QA liability account.
  const ledger = { code: 'QA-2110' };
  let ag: { no: string; toasts: string[]; status: string; refused?: boolean } = { no: '', toasts: [], status: '' };
  await qa.step(1, async () => {
    const d = new FinanceDesk(page, 'legal-agreements');
    await d.open();
    for (const f of ['Name', 'Date', 'Beneficiary department', 'Party', 'Security', 'Amount', 'Terms']) await expect(d.main.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    ag = await agreement(page, qa, ledger.code);
    qa.note(2, `${ag.no}: "${ag.toasts.join(' / ').slice(0, 160)}"; state "${ag.status}"`);
    expect(ag.no, 'the agreement of the test').toBeTruthy();
  });
  if (ag.refused) {
    // The agreement cannot be approved (found blocker 46): no renewal.
    qa.blocked(2, 46);
    qa.blocked(3, 46);
  } else await qa.step(3, async () => {
    const d = new FinanceDesk(page, 'legal-agreements');
    const toasts = await d.act(ag.no, 'Renew');
    qa.note(3, `Renew: "${toasts.join(' / ')}"; the row reads "${(await d.cells(ag.no)).join(' | ')}"`);
  });
  await qa.step(4, async () => {
    const d = new FinanceDesk(page, 'loans');
    await d.open();
    for (const f of ['Contract number', 'Date', 'Collateral', 'Details', 'Worth', 'Instalment due', 'Instalment']) await expect(d.main.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(5, async () => {
    const d = new FinanceDesk(page, 'loans');
    await d.open();
    const r = await d.create({ 'Contract number': qa.code('X-KRD-01'), Date: todayWib(), Collateral: qa.prefix('X Gedung'), Details: qa.prefix('X Pinjaman uji'), Worth: '500000000', 'Instalment due': addDays(todayWib(), 30), Instalment: '10000000' });
    expect(r.no, 'the loan of the test').toBeTruthy();
    const a = await d.sendApprove(r.no);
    qa.note(5, `loan ${r.no}: "${r.toasts.join(' / ')}"; status "${a.status}"`);
    if (a.refused) qa.blocked(5, 46);
  });
  await qa.step(6, async () => {
    const d = new FinanceDesk(page, 'loans');
    await d.open();
    const labels = (await d.main.locator('label').allInnerTexts()).map((l) => l.trim());
    qa.note(6, `the loan form asks for: ${labels.join(', ')} (TBD in the workbook: no principal, interest or schedule)`);
  });
});

qaTest('TC-APP019-077', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const d = new FinanceDesk(page, 'legal-agreements');
    await d.open();
    const r = await d.create({ Name: qa.prefix('X Sewa alat'), Date: todayWib(), Party: qa.name('X Tanpa akun'), Amount: '1000000' });
    if (!shows(r.toasts, 'The party needs a ledger account.')) qa.deviation(1, 'The text "The party needs a ledger account."', `"${r.toasts.join(' / ') || 'no toast'}"`);
  });
  await qa.step(4, async () => {
    const d = new FinanceDesk(page, 'loans');
    await d.open();
    const r = await d.create({ 'Contract number': qa.code('X-KRD-00'), Date: todayWib(), Collateral: qa.prefix('X Gedung'), Worth: '0', 'Instalment due': addDays(todayWib(), 30), Instalment: '10000000' });
    qa.note(4, `a loan worth 0: ${r.no ? `accepted (${r.no})` : `refused ("${r.toasts.join(' / ')}")`} (TBD in the workbook)`);
  });
  qa.notRun(2, 'TBD in the workbook: "Renew" on a draft is read on the list of TC-APP019-076');
  qa.notRun(3, 'TBD in the workbook: a second renewal of the agreement of TC-APP019-076');
});

qaTest('TC-APP019-078', async ({ page, qa }) => {
  const d = new FinanceDesk(page, 'rough-sheets');
  let no = '';
  await qa.step(1, async () => {
    await d.open();
    for (const f of ['Date', 'Report type', 'Agency', 'Reported by', 'Scope', 'Remarks']) await expect(d.main.getByLabel(f, { exact: true })).toBeVisible();
  });
  await qa.step(2, async () => {
    const r = await d.create({ Date: todayWib(), 'Report type': qa.prefix('X Audit kas'), Agency: qa.prefix('X SPI'), 'Reported by': qa.name('X Auditor'), Scope: qa.prefix('X Kas kecil'), Nature: qa.prefix('X Temuan minor'), 'File number': qa.code('X-BRK-01'), Observation: qa.prefix('X Bukti kas kurang'), Auditee: qa.name('X Kasir') });
    no = r.no;
    if (!no) return qa.deviation(2, 'The sheet is approved; each observation opens one workflow task for its auditee', `"Save" lists no rough sheet ("${r.toasts.join(' / ') || 'no toast'}"; the screen has no list)`);
    const a = await d.sendApprove(no);
    qa.note(2, `rough sheet ${no}: "${r.toasts.join(' / ')}"; status "${a.status}"`);
    if (a.refused) qa.blocked(2, 46);
  });
  if (!no) {
    for (const st of [3, 4, 5]) qa.notRun(st, 'needs the rough sheet of step 2, which is not listed after "Save"');
    return;
  }
  await qa.step(3, async () => {
    qa.note(3, `Respond: "${(await d.act(no, 'Respond')).join(' / ')}"; Settle: "${(await d.act(no, 'Settle')).join(' / ')}"`);
  });
  await qa.step(4, async () => {
    qa.note(4, `Finalize: "${(await d.act(no, 'Finalize')).join(' / ')}"; Create fair sheet: "${(await d.act(no, 'Create fair sheet')).join(' / ')}"`);
  });
  qa.notRun(5, 'needs the fair sheet of step 4 sent, approved and finalized');
  await qa.step(6, async () => {
    for (const r of ['fair-sheets', 'audit-sheets']) {
      const s = new FinanceDesk(page, r);
      await s.open();
      const create = await s.main.getByRole('button', { name: /new|create|baru|buat/i }).count();
      qa.note(6, `${r}: ${create} button(s) to create a sheet`);
    }
  });
});

qaTest('TC-APP019-079', async ({ page, qa }) => {
  await qa.step(3, async () => {
    const d = new FinanceDesk(page, 'rough-sheets');
    await d.open();
    const r = await d.create({ Date: todayWib(), 'Report type': qa.prefix('X Audit kas'), Agency: qa.prefix('X SPI'), 'Reported by': qa.name('X Auditor') });
    qa.note(3, `a rough sheet with no observation: ${r.no ? `accepted (${r.no})` : `refused ("${r.toasts.join(' / ')}")`} (TBD in the workbook)`);
  });
  qa.notRun(1, 'needs an approved rough sheet whose observations are all settled (TC-APP019-078 step 3)');
  qa.notRun(2, 'needs a fair sheet that is approved and not finalized (TC-APP019-078 step 5)');
});

qaTest('TC-APP019-084', async ({ qa, browser }) => {
  // The writer is qa.finance (role finance = FINANCE_WRITE only); its journal cannot be saved for today (blocker 45), and
  // no role or right gives FINANCE_APPROVE (blocker 46).
  qa.blocked(1, 45);
  qa.blocked(2, 46);
  qa.notRun(3, 'U1 holds both rights: TC-APP019-044 saves, sends and approves its own journal');
  qa.blocked(4, 45);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(5, async () => {
      const seen: string[] = [];
      for (const route of ['/finance/journals', '/finance/collections', '/finance/trial-balance']) {
        await staff.goto(`/id${route}`);
        await staff.waitForLoadState('networkidle').catch(() => {});
        seen.push(`${route}: ${(await screenRefuses(staff)) ? 'refused' : `shown ("${(await staff.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).trim()}", ${await rowCount(staff)} rows)`}`);
      }
      qa.note(5, `U3 (no right): ${seen.join('; ')} (TBD in the workbook)`);
    });
    await qa.step(6, async () => {
      await staff.goto('/id/finance/journals');
      await staff.waitForLoadState('networkidle').catch(() => {});
      const add = staff.getByRole('main').getByRole('button', { name: 'New journal' });
      if (!(await add.isVisible().catch(() => false))) return qa.note(6, 'U3 is not offered "New journal"');
      await add.click();
      const toasts = await clickFor(staff, staff.getByRole('dialog').getByRole('button', { name: /^(Save|Saving…)$/ }));
      expect(toasts).not.toContain('Journal saved');
      qa.note(6, `U3 "Save" of a new journal: "${toasts.join(' / ') || 'no toast'}" (TBD in the workbook)`);
    });
  } finally {
    await staff.context().close();
  }
});
