import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, isServerFailure } from '../../../lib/assertions';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { authFileOf } from '../../../lib/config';
import { addDays, todayWib } from '../../../lib/dates';
import { RequestsPage, StockPage } from '../../../pages/bloodbank/BloodBankPages';
import { userPage } from '../shared/access';
import { NO_UNIT, openRequest, save, savedRequest } from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of evaluation.spec.ts, shared with the end-to-end chains (chain.run). */

/** A plain intake bag of the test (350 ml, 10 days), standing in for QAWB-00001; returns its number. */
export async function intakeBag(page: Page, qa: Qa): Promise<string> {
  const stock = new StockPage(page);
  const bag = qa.code('QA-MANUAL-1');
  await stock.open();
  const d = await stock.openDialog('Intake stock', 'Stock intake');
  await stock.fill(d, { 'Blood bag no': bag, 'Expiry date': addDays(todayWib(), 10), Quantity: '350' });
  expect(await save(page, d)).toContain('Stock intake recorded');
  qa.note(1, `the bag is a plain intake bag of the test, ${bag}: a collected bag is made on Donors (HTTP 500, checklist blocker 2)`);
  return bag;
}

/** Opens a dialog from the bag's row ("Group", "Serology", "Separate"). */
export async function rowDialog(page: Page, bag: string, button: 'Group' | 'Serology' | 'Separate'): Promise<Locator> {
  const stock = new StockPage(page);
  await stock.open();
  await stock.filter({ 'Bag no': bag });
  await stock.row(bag).first().getByRole('button', { name: button, exact: true }).click();
  const d = page.getByRole('dialog').last();
  await expect(d).toBeVisible();
  return d;
}

export const blockedAll = (qa: Qa, steps: number[], no: number, why: string) => {
  for (const s of steps) qa.blocked(s, no);
  qa.note(steps[0], why);
};

export const TC_APP006_013: QaBody = async ({ page, qa }) => {
  const bag = await intakeBag(page, qa);
  await qa.step(1, async () => {
    const d = await rowDialog(page, bag, 'Group');
    await expect(d.getByText('Cell and serum reactions take the group from the active chart.')).toBeVisible();
    const fields = await d.getByRole('textbox').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.innerText ?? e.getAttribute('aria-label') ?? '').filter((l) => !/^(DU|Disc) |^Reason$/.test(l)));
    qa.note(1, `reaction fields: ${fields.join(', ') || 'none'}`);
    if (!fields.length) qa.deviation(1, 'A field per column of the branch', 'no reaction field on the intake bag, although the chart of the branch has its columns (anti_a … cell_o) and an O Positive row since 2026-10-31');
  });
  blockedAll(qa, [2, 3, 4, 5], 2, 'no reaction can be typed on an intake bag: a collected bag of DN-1 is made on Donors (HTTP 500, checklist blocker 2)');
};

export const TC_APP006_014: QaBody = async ({ page, qa }) => {
  const bag = await intakeBag(page, qa);
  await qa.step(1, async () => {
    const d = await rowDialog(page, bag, 'Serology');
    await expect(d.getByText('A validated negative panel and a confirmed group release the unit.')).toBeVisible();
    const options = await d.getByRole('combobox', { name: 'Result' }).first().locator('option').allInnerTexts();
    qa.note(1, `the dialog of the intake bag: "${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 200)}"; Result offers ${options.join(', ') || 'nothing'}`);
  });
  blockedAll(qa, [2, 3, 4], 2, 'needs a collected bag with a confirmed group and four open serology tests (Donors answers HTTP 500, checklist blocker 2)');
};

export const TC_APP006_015: QaBody = async ({ page, qa }) => {
  const bag = await intakeBag(page, qa);
  await qa.step(1, async () => {
    const d = await rowDialog(page, bag, 'Separate');
    await expect(d.getByText('Volume above zero. Storage days set the expiry.')).toBeVisible();
    const options = (await d.getByRole('combobox').first().locator('option').allInnerTexts()).map((o) => o.trim());
    qa.note(1, `Component offers: ${options.join(', ')}`);
  });
  blockedAll(qa, [2, 3, 4], 2, 'needs the collected whole-blood bag QAWB-00001 with a donation date (Donors answers HTTP 500, checklist blocker 2)');
};

/** Clicks a button of the request form; a server failure (isServerFailure) blocks the step by 25. Returns the toasts, or null when blocked. */
export async function act(page: Page, qa: Qa, step: number, d: Locator, button: string): Promise<string[] | null> {
  const toasts = await save(page, d, button);
  qa.note(step, `${button}: "${toasts.join(' / ') || 'no toast'}"`);
  if (isServerFailure(toasts)) {
    qa.blocked(step, 25);
    return null;
  }
  return toasts;
}

export const TC_APP006_021: QaBody = async ({ page, qa, browser }) => {
  let number = '';
  await qa.step(1, async () => {
    const r = await savedRequest(page, qa, 'PRC', false);
    number = r.number;
    qa.note(1, `request ${number} saved by U1 (the nurse)`);
  });
  const doctor = await userPage(browser, 'U4');
  try {
    let d: Locator | undefined;
    await qa.step(2, async () => {
      d = await openRequest(doctor, number);
      for (const b of ['Reject', 'Print', 'Approve']) await expect(d.getByRole('button', { name: b, exact: true })).toBeVisible();
    });
    await qa.step(3, async () => {
      const toasts = await act(doctor, qa, 3, d!, 'Approve');
      if (toasts) {
        expect(toasts).toContain('Request approved');
        await expect(d!.getByText('Approved', { exact: true }).first()).toBeVisible();
      }
    });
  } finally {
    await doctor.context().close();
  }
};

export const TC_APP006_026: QaBody = async ({ qa }) => {
  blockedAll(qa, [1, 2], 2, `needs UNIT-2 issued ten minutes ago; ${NO_UNIT}`);
};

export const TC_APP006_044: QaBody = async ({ qa }) => {
  blockedAll(qa, [1, 2, 3], 2, 'no reaction can be typed on an intake bag: a collected bag with open grouping is made on Donors (HTTP 500, checklist blocker 2)');
  blockedAll(qa, [4, 5], 2, "needs the donor's earlier donation (A Positive) made on Donors (HTTP 500, checklist blocker 2)");
};

export const TC_APP006_045: QaBody = async ({ qa }) => {
  blockedAll(qa, [1, 2, 3, 4, 5, 6], 2, 'needs a collected bag of DN-2 with a confirmed group and two components (Donors answers HTTP 500, checklist blocker 2)');
};

export const TC_APP006_046: QaBody = async ({ qa }) => {
  blockedAll(qa, [1, 2, 3, 4], 2, `needs a bag validated negative with a cross-matched and an issued component; ${NO_UNIT}`);
};

export const TC_APP006_047: QaBody = async ({ page, qa }) => {
  qa.blocked(1, 2);
  qa.note(1, 'needs a collected bag in BR-B (Donors answers HTTP 500, checklist blocker 2); the serology list of Kemayoran is not changed');
  const bag = await intakeBag(page, qa);
  await qa.step(2, async () => {
    const d = await rowDialog(page, bag, 'Serology');
    const options = await d.getByRole('combobox', { name: 'Result' }).first().locator('option').allInnerTexts();
    const text = (await d.innerText()).replace(/\s+/g, ' ');
    qa.note(2, `Podomoro, Serology of ${bag}: "${text.slice(0, 220)}"`);
    if (!/set up|configure|no test|atur/i.test(text)) qa.deviation(2, 'A message that the test list must be set up first', `no such message; ${options.length ? `Result offers ${options.join(', ')}` : 'the dialog shows no test line'}`);
  });
};

export const TC_APP006_048: QaBody = async ({ qa }) => {
  blockedAll(qa, [1, 2, 3, 4], 2, 'needs a collected whole-blood bag of 450 ml (Donors answers HTTP 500, checklist blocker 2)');
};

export const TC_APP006_053: QaBody = async ({ page, qa, browser }) => {
  const r = await savedRequest(page, qa, 'PRC', false);
  qa.note(1, `request ${r.number} saved by U1 (the nurse), status Pending`);
  await qa.step(1, async () => {
    const d = await openRequest(page, r.number);
    const toasts = await act(page, qa, 1, d, 'Approve');
    if (toasts) {
      if (toasts.includes('Request approved')) qa.deviation(1, 'Refused: "a different user must approve"', 'the author approves the request');
      else expect(toasts.join(' ').toLowerCase()).toContain('a different user must approve');
    }
    await page.keyboard.press('Escape');
  });
  await qa.step(2, async () => {
    const d = await openRequest(page, r.number);
    if (!(await d.getByRole('button', { name: 'Reject', exact: true }).isVisible())) return qa.note(2, 'the request no longer offers "Reject" (approved in step 1)');
    const toasts = await act(page, qa, 2, d, 'Reject');
    if (toasts) expect(toasts.join(' ').toLowerCase()).toContain('reject reason is required');
    await page.keyboard.press('Escape');
  });
  const doctor = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const d = await openRequest(doctor, r.number);
      const approved = await act(doctor, qa, 3, d, 'Approve');
      if (!approved) return;
      const reason = d.getByRole('textbox', { name: /Reason/ }).first();
      if (await reason.isVisible().catch(() => false)) await reason.fill('X alasan uji');
      const toasts = await act(doctor, qa, 3, d, 'Reject');
      if (toasts) expect(toasts.join(' ').toLowerCase()).toContain('requisition is not waiting for approval');
    });
    await qa.step(4, async () => {
      const own = await savedRequest(doctor, qa, 'PRC', false);
      const d = await openRequest(doctor, own.number);
      const text = (await d.innerText()).replace(/\s+/g, ' ');
      qa.note(4, `the Doctor's own request ${own.number}: "${text.slice(0, 160)}"`);
      if (!/Approved/.test(text)) qa.deviation(4, 'Status "Approved" at once', 'the request of the Doctor is "Pending" like any other');
    });
  } finally {
    await doctor.context().close();
  }
};

export const TC_APP006_054: QaBody = async ({ page, qa }) => {
  // An approved line: since 2026-10-31 a second user's approval saves (was found blocker 25).
  const { patient, approved } = await savedRequest(page, qa);
  if (!approved) {
    qa.blocked(1, 25);
    qa.note(1, 'needs an approved line: the request is not approved (found blocker 25)');
  } else {
    await qa.step(1, async () => {
      const req = new RequestsPage(page);
      await req.open();
      await req.tab('Queue');
      await req.main.getByRole('button', { name: 'Search' }).click();
      await req.queueTable().getByRole('row').filter({ hasText: patient.fullName }).getByRole('button').first().click();
      const d = page.getByRole('dialog', { name: 'Cross-match and issue' });
      await expect(d.getByRole('button', { name: 'Accept', exact: true })).toBeVisible();
      qa.note(1, `the line before "Accept": "${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 200)}"`);
      const crossMatch = d.getByRole('button', { name: 'Cross-match', exact: true });
      if (await crossMatch.isVisible()) qa.deviation(1, 'The cross-match fields are not shown before the line is accepted', '"Cross-match" is offered before "Accept"');
    });
  }
  blockedAll(qa, [2, 3, 4, 5], 2, `needs UNIT-1 (O Positive) and UNIT-A (A Positive); ${NO_UNIT}`);
};

export const TC_APP006_061: QaBody = async ({ qa }) => {
  blockedAll(qa, [1, 2, 3], 2, `needs a PRC unit to issue for PT-1; ${NO_UNIT}`);
};
