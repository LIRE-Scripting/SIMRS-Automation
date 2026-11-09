import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { toastsAfter } from '../18-settings/helpers';
import {
  approvedAllocation,
  approvedSanction,
  cellOf,
  headOf,
  linesOf,
  Master,
  rowAction,
  rowActionRead,
  sanctionDialog,
  saveSanction,
  type ApprovedAllocation,
  editSanction,
  file,
  upload,
  shows,
  closeOpenDialogs,
  isApproved,
  answerChecklist,
} from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of sanctions.spec.ts, shared with the end-to-end chains (chain.run). */

export const questions = (p: Page) => new Master(p, 'sanction-checklists', 'Sanction checklist', 'New question');

/** The test's allocation, with a checklist question on its book and the head of its first authority. */
export async function setUp(page: Page, qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa']): Promise<ApprovedAllocation & { head: string; question: string }> {
  const a = await approvedAllocation(page, qa);
  const question = qa.name('X Apakah TOR sudah dilampirkan?');
  expect(await questions(page).add({ 'Budget book': a.book.code, Order: '1', Question: question })).toContain('Question added.');
  return { ...a, head: await headOf(page, a.request, a.authorities[0]), question };
}

/** What a step expects to be refused, against the toasts and the dialog text the site showed. */
export function refused(qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa'], step: number, expected: string, re: RegExp, shown: string[]): void {
  const all = shown.join(' / ');
  if (shows(re, all)) qa.note(step, `refused: "${(all.match(re) ?? [''])[0]}"`);
  else qa.deviation(step, `The text "${expected}"`, `"${all.slice(0, 220) || 'nothing shown'}"`);
}

export const TC_APP020_029: QaBody = async ({ page, qa }) => {
  const a = await setUp(page, qa);
  const main = page.getByRole('main');
  const dialog = page.getByRole('dialog');
  const v = { bookCode: a.book.code, head: a.head, authority: a.authorities[0], request: '20000000', sanction: '18000000' };
  let no = '';
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.getByRole('complementary').getByRole('link', { name: 'Sanction proposals' }).or(main.getByRole('link', { name: 'Sanction proposals' })).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Sanction proposals' })).toBeVisible();
    for (const name of ['Download CSV', 'New proposal']) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
    await expect(main.getByRole('columnheader')).toHaveText(['No.', 'Date', 'Budget head', 'Department / requester', 'Request', 'Sanction', 'Status', 'Actions']);
  });
  await qa.step(2, async () => {
    await main.getByRole('button', { name: 'New proposal' }).click();
    await expect(dialog.getByText('New sanction proposal', { exact: true })).toBeVisible();
    for (const f of ['Document date', 'Budget book', 'Budget head', 'Requesting department and authority', 'Requested by', 'Request amount (IDR)', 'Sanction amount (IDR)', 'Remarks']) await expect(dialog.getByLabel(f, { exact: true })).toBeVisible();
    await expect(dialog.getByText('Checklist', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Supporting documents', { exact: true })).toBeVisible();
    await closeOpenDialogs(page);
  });
  await qa.step(3, async () => {
    await sanctionDialog(page, v);
    const text = (await dialog.innerText()).replace(/\s+/g, ' ');
    qa.note(3, `"${text.match(/(Line balance now|Saldo baris saat ini)[^.]*\./)?.[0] ?? text.slice(0, 200)}"`);
    expect(text).toMatch(/(Line balance now|Saldo baris saat ini) IDR 70[.,]000[.,]000/);
    expect(text).toMatch(/(Financial year|Tahun anggaran) \d{4}/);
  });
  await qa.step(4, async () => {
    const answered = await answerChecklist(dialog);
    const saved = await saveSanction(page);
    no = saved.no;
    expect(no, `toast "Sanction proposal <no> saved as draft." (${saved.toasts.join(' / ')})`).toBeTruthy();
    qa.note(4, `${no}: ${answered} checklist answer(s) given in the new proposal; the document is attached after the first save ("Save the proposal to attach documents.")`);
    await editSanction(page, no);
    if (!answered) qa.note(4, `answers given in Edit: ${await answerChecklist(dialog)}`);
    const t = await upload(page, file('qa-tor.pdf', 'application/pdf'));
    expect(t.join(' / ')).toContain('qa-tor.pdf attached.');
    const mark = await toastMark(page);
    await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    qa.note(4, `saved again: "${(await toastsAfter(page, mark)).join(' / ')}"`);
    await closeOpenDialogs(page);
  });
  await qa.step(5, async () => {
    const sent = await rowAction(page, 'sanctions', no, 'Send');
    const approved = await rowAction(page, 'sanctions', no, 'Approve');
    qa.note(5, `Send "${sent.join(' / ')}"; Approve "${approved.join(' / ')}"`);
    expect(isApproved(await cellOf(page, 'sanctions', no, 'Status'))).toBe(true);
    const line = (await linesOf(page, a.book.code, [a.authorities[0]], 2)).find((x) => x.reserved > 0);
    qa.note(5, `line: ${line ? `${line.department}, reserved ${line.reserved}, balance ${line.balance}` : 'no line shows a reservation'}`);
    expect(line?.reserved).toBe(18_000_000);
    expect(line?.balance).toBe(70_000_000 - 18_000_000);
  });
  await qa.step(6, async () => {
    // A second proposal, left pending, takes the notes.
    await sanctionDialog(page, { ...v, request: '1000000', sanction: '1000000' });
    await answerChecklist(dialog);
    const pending = (await saveSanction(page)).no;
    expect(pending, 'a second proposal of the test').toBeTruthy();
    await rowAction(page, 'sanctions', pending, 'Send');
    await rowAction(page, 'sanctions', pending, 'View');
    const notes: string[] = [];
    for (const [button, text, toast] of [['Add observation (approver)', qa.prefix('X Observasi penyetuju'), 'Observation added.'], ['Add response', qa.prefix('X Tanggapan pengusul'), 'Response added.']]) {
      const add = dialog.getByRole('button', { name: button });
      if (!(await add.count())) {
        qa.deviation(6, `A button "${button}" on the pending proposal`, `not offered (buttons: ${(await dialog.getByRole('button').allInnerTexts()).join(', ')})`);
        continue;
      }
      // The button turns on once the note is typed.
      await dialog.getByRole('textbox').last().fill(text);
      const mark = await toastMark(page);
      await add.click();
      const t = await toastsAfter(page, mark);
      notes.push(`${button}: "${t.join(' / ')}"`);
      if (!t.includes(toast)) qa.deviation(6, `Toast "${toast}"`, `"${t.join(' / ') || 'no toast'}"`);
    }
    const shown = (await dialog.innerText()).replace(/\s+/g, ' ');
    qa.note(6, `${pending}: ${notes.join('; ')}; the notes read "${shown.slice(shown.indexOf('Observations and responses'), shown.indexOf('Observations and responses') + 200)}"`);
  });
};

export const TC_APP020_030: QaBody = async ({ page, qa }) => {
  const a = await setUp(page, qa);
  const v = { bookCode: a.book.code, head: a.head, authority: a.authorities[0] };
  const dialog = page.getByRole('dialog');
  /** Saves the open proposal (and sends it when asked); returns what the site showed and the draft number. */
  const attempt = async (send: boolean): Promise<{ shown: string[]; no: string }> => {
    const s = await saveSanction(page);
    const shown = [...s.toasts, s.dialog];
    if (send && s.no) shown.push(...(await rowAction(page, 'sanctions', s.no, 'Send')));
    await closeOpenDialogs(page);
    return { shown, no: s.no };
  };
  await qa.step(1, async () => {
    await sanctionDialog(page, { ...v, request: '80000000', sanction: '75000000' });
    await answerChecklist(dialog);
    refused(qa, 1, 'The sanction amount is more than the line balance, with the balance', /The sanction amount is more than the line balance \([^)]+\)/, (await attempt(true)).shown);
  });
  await qa.step(2, async () => {
    await sanctionDialog(page, { ...v, request: '10000000', sanction: '12000000' });
    await answerChecklist(dialog);
    refused(qa, 2, 'The sanction amount is more than the request amount.', /The sanction amount is more than the request amount\./, (await attempt(true)).shown);
  });
  await qa.step(3, async () => {
    await sanctionDialog(page, { ...v, request: '1000000', sanction: '1000000' });
    refused(qa, 3, 'A number of checklist questions are not answered', /\d+ checklist question\(s\) are not answered\./, (await attempt(true)).shown);
  });
  await qa.step(4, async () => {
    await sanctionDialog(page, { ...v, request: '1000000', sanction: '' });
    await answerChecklist(dialog);
    refused(qa, 4, 'Enter a sanction amount above zero before sending.', /Enter a sanction amount above zero before sending\./, (await attempt(true)).shown);
  });
  // Steps 5 to 7 upload to a draft of the test.
  await sanctionDialog(page, { ...v, request: '1000000', sanction: '1000000' });
  await answerChecklist(dialog);
  const draft = (await saveSanction(page)).no;
  expect(draft, 'a draft proposal of the test').toBeTruthy();
  await qa.step(5, async () => {
    await editSanction(page, draft);
    refused(qa, 5, 'Only PDF, JPEG or PNG documents are accepted.', /Only PDF, JPEG or PNG documents are accepted\./, [...(await upload(page, file('qa-tor.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))), (await dialog.innerText()).replace(/\s+/g, ' ')]);
    await closeOpenDialogs(page);
  });
  await qa.step(6, async () => {
    await editSanction(page, draft);
    refused(qa, 6, 'The document is larger than 5 MB.', /The document is larger than 5 MB\./, [...(await upload(page, file('qa-besar.pdf', 'application/pdf', 5 * 1024 * 1024 + 200_000))), (await dialog.innerText()).replace(/\s+/g, ' ')]);
    await closeOpenDialogs(page);
  });
  await qa.step(7, async () => {
    await rowAction(page, 'sanctions', draft, 'Send');
    const actions = await (await page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: draft }).first()).getByRole('button').allInnerTexts();
    const open = actions.includes('Edit') ? 'Edit' : 'View';
    await rowAction(page, 'sanctions', draft, open);
    const input = dialog.locator('input[type="file"]');
    if (!(await input.count())) {
      qa.deviation(7, 'The text "Documents can change only while the proposal is a draft."', `the sent proposal (${open}) offers no upload: "${((await dialog.innerText()).replace(/\s+/g, ' ').match(/Supporting documents.{0,120}/) ?? [''])[0]}"`);
    } else {
      refused(qa, 7, 'Documents can change only while the proposal is a draft.', /Documents can change only while the proposal is a draft\./, [...(await upload(page, file('qa-tor2.pdf', 'application/pdf'))), (await dialog.innerText()).replace(/\s+/g, ' ')]);
    }
  });
};

export const TC_APP020_031: QaBody = async ({ page, qa }) => {
  const a = await setUp(page, qa);
  const v = { bookCode: a.book.code, head: a.head, authority: a.authorities[0], request: '40000000', sanction: '40000000' };
  await qa.step(1, async () => {
    const nos: string[] = [];
    for (let i = 0; i < 2; i++) {
      await sanctionDialog(page, v);
      await answerChecklist(page.getByRole('dialog'));
      const s = await saveSanction(page);
      expect(s.no, `proposal ${i + 1} of the test`).toBeTruthy();
      await rowAction(page, 'sanctions', s.no, 'Send');
      nos.push(s.no);
    }
    const first = await rowAction(page, 'sanctions', nos[0], 'Approve');
    const second = await rowActionRead(page, 'sanctions', nos[1], 'Approve');
    const states = [await cellOf(page, 'sanctions', nos[0], 'Status'), await cellOf(page, 'sanctions', nos[1], 'Status')];
    qa.note(1, `two proposals of 40000000 on a line of 70000000: ${nos[0]} "${first.join(' / ')}" → ${states[0]}; ${nos[1]} "${second.toasts.join(' / ')}" → ${states[1]}`);
    expect(isApproved(states[0])).toBe(true);
    if (isApproved(states[1])) qa.deviation(1, 'The second approval is refused: the balance is checked again at approval', `both are approved ("${second.toasts.join(' / ')}")`);
    else expect(second.toasts.join(' / ')).toMatch(/more than the line balance/);
  });
};

export const TC_APP020_032: QaBody = async ({ page, qa }) => {
  const a = await setUp(page, qa);
  const v = { bookCode: a.book.code, head: a.head, authority: a.authorities[0], request: '18000000', sanction: '18000000' };
  await qa.step(1, async () => {
    const no = await approvedSanction(page, { ...v });
    const before = (await linesOf(page, a.book.code, [a.authorities[0]], 2)).find((x) => x.reserved > 0);
    const r = await rowActionRead(page, 'sanctions', no, 'Cancel');
    const after = await linesOf(page, a.book.code, [a.authorities[0]], 2);
    qa.note(1, `${no}: reserved ${before?.reserved} before; "${r.confirm}"; "${r.toasts.join(' / ')}"; after: ${after.map((x) => `${x.department} reserved ${x.reserved}, balance ${x.balance}`).join('; ')}`);
    expect(after.every((x) => x.reserved === 0 && x.balance === 70_000_000)).toBe(true);
  });
  qa.blocked(2, 46);
  qa.blocked(3, 46);
  qa.note(2, 'a utilisation needs an approved Finance payment voucher, and no user can approve finance documents (blocker 46)');
};
