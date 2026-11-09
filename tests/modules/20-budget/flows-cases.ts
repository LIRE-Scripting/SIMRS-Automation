import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { toastsAfter } from '../18-settings/helpers';
import { Processes, restoreChain } from '../18-settings/process-cases';
import { menuScreens, rowCount, screenRefuses, userPage } from '../shared/access';
import {
  allocationLineBalance,
  approvedAllocation,
  approvedCircular,
  book,
  cellOf,
  choose,
  draftNo,
  editSanction,
  ensurePostingRules,
  file,
  headOf,
  linesOf,
  postingOf,
  postingRuleStatus,
  releaseDialog,
  removePostingRule,
  rowAction,
  rowActionRead,
  sanctionDialog,
  saveForm,
  restorePostingRule,
  closeOpenDialogs,
  saveSanction,
  shows,
  upload,
} from './cases';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of flows.spec.ts, shared with the end-to-end chains (chain.run). */

/** Opens a budget screen by its menu link and checks its heading and buttons; returns its columns. */
export async function screen(page: Page, link: string, heading: string, buttons: string[]): Promise<string[]> {
  const main = page.getByRole('main');
  await page.goto('/id/budget');
  await page.getByRole('complementary').getByRole('link', { name: link }).or(main.getByRole('link', { name: link })).first().click();
  await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  for (const name of buttons) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
  return (await main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
}

/** Since 2026-11-01 a budget line and an approved sanction can be made; what a utilisation still lacks is an approved payment voucher. */
export const NO_VOUCHER = 'a utilisation is paid by an approved Finance bank or cash payment voucher, and no user can approve finance documents (blocker 46: the tenant has no FINANCE_APPROVE)';

// TC-APP020-029 to 032 (sanction proposals) are in sanctions.spec.ts since 2026-11-01: allocations give the lines a balance.

export const TC_APP020_033: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    qa.note(1, `columns: ${(await screen(page, 'Budget utilisation', 'Budget utilisation', ['Download CSV', 'New utilisation'])).join(', ')}`);
  });
  await qa.step(2, async () => {
    await page.getByRole('main').getByRole('button', { name: 'New utilisation' }).click();
    const form = page.getByRole('dialog').or(page.getByRole('main')).first();
    qa.note(2, `the new utilisation asks for: ${(await form.locator('label').allInnerTexts()).map((l) => l.trim().split('\n')[0]).filter(Boolean).join(', ')} (TBD in the workbook)`);
    await closeOpenDialogs(page);
  });
  for (const st of [3, 4, 5]) qa.blocked(st, 46);
  qa.note(3, NO_VOUCHER);
};

export const TC_APP020_034: QaBody = async ({ qa }) => {
  for (const st of [1, 2, 3, 4, 5, 6, 7]) qa.blocked(st, 46);
  qa.note(1, NO_VOUCHER);
};

// TC-APP020-035 to 038 (transfer and budget position) are in transfers.spec.ts since 2026-11-01.

/** A circular of the test, saved as draft; returns its number. */
export async function draftCircular(page: Page, qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa']): Promise<string> {
  const b = await book(page, qa);
  const dialog = page.getByRole('dialog');
  await page.goto('/id/budget/circulars');
  await page.getByRole('main').getByRole('button', { name: 'New circular' }).click();
  await dialog.getByLabel('Due date', { exact: true }).fill(addDays(todayWib(), 14));
  await choose(dialog.getByLabel('Budget book', { exact: true }), b.code);
  await choose(dialog.getByLabel('Issued by', { exact: true }), 'QA-EMP');
  await dialog.getByRole('button', { name: 'Add department' }).click();
  const names = (await dialog.getByLabel('Department', { exact: true }).first().locator('option').allInnerTexts()).slice(1);
  await dialog.getByLabel('Department', { exact: true }).first().selectOption({ label: names[0] });
  await choose(dialog.getByLabel('In-charge', { exact: true }).first(), 'QA-EMP');
  const mark = await toastMark(page);
  await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
  const no = draftNo(await toastsAfter(page, mark), 'Circular');
  expect(no, 'a draft circular of the test').toBeTruthy();
  return no;
}

export const status = (page: Page, no: string) => cellOf(page, 'circulars', no, 'Status');

export const TC_APP020_039: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    const no = await draftCircular(page, qa);
    await rowAction(page, 'circulars', no, 'Send');
    const toasts = await rowAction(page, 'circulars', no, 'Reject');
    qa.note(1, `Reject: "${toasts.join(' / ')}"`);
    expect((await status(page, no)).toLowerCase()).toBe('rejected');
  });
  await qa.step(2, async () => {
    const no = await draftCircular(page, qa);
    await rowAction(page, 'circulars', no, 'Cancel');
    expect((await status(page, no)).toLowerCase()).toBe('cancelled');
  });
  await qa.step(3, async () => {
    const c = await approvedCircular(page, qa);
    const toasts = await rowAction(page, 'circulars', c.circular, 'Pre-close');
    qa.note(3, `Pre-close: "${toasts.join(' / ')}"; the status reads "${await status(page, c.circular)}"`);
  });
  qa.notRun(4, 'needs a user with the budget approval right who is not the approver of the step (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
  const p = new Processes(page);
  const was = await p.readChain('budget_circular');
  let changed = false;
  try {
    await qa.step(5, async () => {
      changed = true;
      expect(await p.write('budget_circular', { ...was, active: false })).toContain('Approval chain saved.');
      const no = await draftCircular(page, qa);
      const toasts = await rowAction(page, 'circulars', no, 'Send');
      if (!toasts.some((t) => t.includes('No active approval chain for budget circulars.'))) qa.deviation(5, 'The text "No active approval chain for budget circulars."', `"${toasts.join(' / ') || 'no toast'}"; the status reads "${await status(page, no)}"`);
      await restoreChain(page, 'budget_circular', was);
      changed = false;
    });
    await qa.step(6, async () => {
      changed = true;
      expect(await p.write('budget_circular', { ...was, steps: [...was.steps, qa.prefix('X Direktur')] })).toContain('Approval chain saved.');
      const no = await draftCircular(page, qa);
      await rowAction(page, 'circulars', no, 'Send');
      await rowAction(page, 'circulars', no, 'Approve');
      const after = await status(page, no);
      qa.note(6, `after the first approval of the two-step chain the circular reads "${after}"`);
      if (after.toLowerCase() === 'approved') qa.deviation(6, 'The circular stays pending until the approver of the second step approves', 'approved after the first step');
    });
  } finally {
    if (changed) await restoreChain(page, 'budget_circular', was);
  }
};

export const TC_APP020_040: QaBody = async ({ page, qa, browser }) => {
  const second = await userPage(browser, 'U1');
  try {
    await qa.step(1, async () => {
      const no = await draftCircular(page, qa);
      await rowAction(page, 'circulars', no, 'Send');
      await page.goto('/id/budget/circulars');
      await page.waitForLoadState('networkidle').catch(() => {});
      await rowAction(second, 'circulars', no, 'Approve');
      const toasts = await rowAction(page, 'circulars', no, 'Cancel').catch((e: Error) => [`(${e.message.slice(0, 80)})`]);
      qa.note(1, `"Cancel" on the stale row of the approved circular: "${toasts.join(' / ')}"; the status reads "${await status(page, no)}" (TBD in the workbook)`);
    });
    await qa.step(2, async () => {
      const no = await draftCircular(page, qa);
      await page.goto('/id/budget/circulars');
      await page.waitForLoadState('networkidle').catch(() => {});
      await rowAction(second, 'circulars', no, 'Send');
      await rowAction(second, 'circulars', no, 'Reject');
      const toasts = await rowAction(page, 'circulars', no, 'Send').catch((e: Error) => [`(${e.message.slice(0, 80)})`]);
      if (!toasts.some((t) => t.includes("This action is not allowed in the circular's current state."))) qa.deviation(2, `The text "This action is not allowed in the circular's current state."`, `"${toasts.join(' / ') || 'no toast'}"`);
    });
    await qa.step(3, async () => {
      const c = await approvedCircular(page, qa);
      qa.note(3, `U1 wrote, sent and approved ${c.circular} (TBD in the workbook: accepted)`);
    });
  } finally {
    await second.context().close();
  }
};

export const TC_APP020_041: QaBody = async ({ page, qa, browser }) => {
  await qa.step(1, async () => {
    const no = await draftCircular(page, qa);
    await rowAction(page, 'circulars', no, 'Edit');
    const dialog = page.getByRole('dialog');
    const due = addDays(todayWib(), 21);
    await dialog.getByLabel('Due date', { exact: true }).fill(due);
    const mark = await toastMark(page);
    await dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    const toasts = await toastsAfter(page, mark);
    qa.note(1, `Edit of the draft circular ${no}: "${toasts.join(' / ')}"; due date "${await cellOf(page, 'circulars', no, 'Due date')}" (the sanction, utilisation, transfer, allocation and release lists need budget lines, blocker 13)`);
    expect(toasts).toContain('Circular updated.');
  });
  await qa.step(2, async () => {
    const second = await userPage(browser, 'U1');
    try {
      const no = await draftCircular(page, qa);
      await page.goto('/id/budget/circulars');
      await page.waitForLoadState('networkidle').catch(() => {});
      await rowAction(second, 'circulars', no, 'Send');
      await rowAction(page, 'circulars', no, 'Edit');
      const dialog = page.getByRole('dialog');
      const text = (await dialog.innerText()).replace(/\s+/g, ' ');
      if (!/left draft|only while it is a draft|hanya dapat diubah selama|sudah tidak draf/i.test(text)) qa.deviation(2, 'The text that the document can be changed only while it is a draft', `the stale "Edit" opens: "${text.slice(0, 160)}"`);
      await closeOpenDialogs(page);
    } finally {
      await second.context().close();
    }
  });
  await qa.step(3, async () => {
    // A sanction proposal of the test with a document, first as a draft, then sent (pending).
    const a = await approvedAllocation(page, qa);
    const head = await headOf(page, a.request, a.authorities[0]);
    await sanctionDialog(page, { bookCode: a.book.code, head, authority: a.authorities[0], request: '1000000', sanction: '1000000' });
    const no = (await saveSanction(page)).no;
    expect(no, 'a draft proposal of the test').toBeTruthy();
    const dialog = await editSanction(page, no);
    expect((await upload(page, file('qa-tor.pdf', 'application/pdf'))).join(' / ')).toContain('qa-tor.pdf attached.');
    const remove = async () => {
      const button = dialog.getByRole('button', { name: /^(Remove|Delete)$/ }).first();
      if (!(await button.count())) return [`(no remove button: ${(await dialog.getByRole('button').allInnerTexts()).join(', ')})`];
      const mark = await toastMark(page);
      await button.click();
      const confirm = page.getByRole('alertdialog');
      if (await confirm.waitFor({ timeout: 3_000 }).then(() => true, () => false)) await confirm.getByRole('button', { name: /^(Remove|Delete|Confirm|Yes|OK)$/ }).last().click();
      return toastsAfter(page, mark);
    };
    const fromDraft = await remove();
    qa.note(3, `${no}, draft: "${fromDraft.join(' / ')}"`);
    await closeOpenDialogs(page);
    // The document again, then the proposal is sent and its document taken away through the stale view.
    await editSanction(page, no);
    await upload(page, file('qa-tor2.pdf', 'application/pdf'));
    await closeOpenDialogs(page);
    await rowAction(page, 'sanctions', no, 'Send');
    await rowAction(page, 'sanctions', no, 'View');
    const fromPending = await remove();
    const shown = (await dialog.innerText()).replace(/\s+/g, ' ');
    qa.note(3, `${no}, pending: "${fromPending.join(' / ')}"`);
    if (![...fromPending, shown].some((t) => t.includes('Documents can change only while the proposal is a draft.'))) {
      qa.deviation(3, 'Refused on the pending one with "Documents can change only while the proposal is a draft."', fromPending[0]?.startsWith('(no remove') ? `the pending proposal offers no remove button; it reads "${shown.match(/Supporting documents.{0,120}/)?.[0] ?? ''}"` : `"${fromPending.join(' / ')}"`);
    }
  });
};

export const TC_APP020_043: QaBody = async ({ page, qa }) => {
  const a = await approvedAllocation(page, qa);
  await ensurePostingRules(page);
  const line = a.authorities[0];
  // The allocation balance of the line the release draws on (a release does not change the budget position).
  const balance = () => allocationLineBalance(page, a.book.code, line);
  let no = '';
  await qa.step(1, async () => {
    await releaseDialog(page, a.book.code, [{ authority: line, requested: '1000000', released: '1000000' }]);
    const saved = await saveForm(page);
    no = saved.toasts.map((t) => t.match(/^Fund release (\S+) saved as draft\.$/)?.[1]).find(Boolean) ?? '';
    expect(no, 'a release of the test').toBeTruthy();
    await rowAction(page, 'fund-releases', no, 'Send');
    const before = await balance();
    // The rule is taken away for this approval only; step 2 saves it again (and finally does so if a check fails).
    const removed = await removePostingRule(page, 'Fund release');
    try {
      const r = await rowActionRead(page, 'fund-releases', no, 'Approve');
      const status = await cellOf(page, 'fund-releases', no, 'Status');
      const after = await balance();
      qa.note(1, `rule removed ("${removed.join(' / ')}"); Approve: "${r.toasts.join(' / ')}"; ${no} reads "${status}"; allocation balance ${before} → ${after}`);
      if (!r.toasts.some((t) => shows(/Finance cannot post yet: branch .+ has no usable .+ posting rule\./, t))) qa.deviation(1, 'The approval is refused with the text that Finance cannot post yet', `"${r.toasts.join(' / ') || 'no toast'}"`);
      expect(status.toLowerCase()).not.toMatch(/^approved/);
      expect(after).toBe(before);
    } finally {
      await restorePostingRule(page, 'Fund release');
    }
  });
  await qa.step(2, async () => {
    expect(await postingRuleStatus(page, 'Fund release')).toBe('Ready');
    await rowAction(page, 'fund-releases', no, 'Approve');
    const first = await cellOf(page, 'fund-releases', no, 'Finance posting');
    const posting = await postingOf(() => cellOf(page, 'fund-releases', no, 'Finance posting'));
    qa.note(2, `"${first}" right after the approval, then "${posting}"`);
    expect(posting).toMatch(/^Posted/);
  });
  qa.notRun(3, 'TBD in the workbook (the journal of 1000000.00 in Finance, Journals, and who approves it)');
  await qa.step(4, async () => {
    const before = await balance();
    const r = await rowActionRead(page, 'fund-releases', no, 'Cancel');
    const posting = await postingOf(() => cellOf(page, 'fund-releases', no, 'Finance posting'));
    const after = await balance();
    qa.note(4, `"${r.confirm}"; finance posting "${posting}"; allocation balance ${before} → ${after}`);
    expect(posting).toMatch(/^Revers/);
    if (!/^Reversed/.test(posting)) qa.deviation(4, '"Finance posting" reads "Reversal waiting", then "Reversed"', `"${posting}"`);
    expect(after).toBe(before + 1_000_000);
  });
  qa.notRun(5, 'a failing posting cannot be made from the screens: Finance posts by itself, so no row offers "Post again"');
  qa.notRun(6, 'locking the financial year in Finance would stop every other test that saves budget or finance documents this year on the shared site');
};

export const TC_APP020_044: QaBody = async ({ qa }) => {
  qa.notRun(1, 'TBD in the workbook; a posting that waits for minutes cannot be made from the screens (Finance posts allocations and releases at once since 2026-11-01)');
  qa.notRun(2, 'TBD in the workbook; a reversal that fails in Finance cannot be made from the screens');
  qa.notRun(3, 'TBD in the workbook; "Post again" is offered only on a failed posting, which cannot be made from the screens');
};

export const TC_APP020_045: QaBody = async ({ qa, browser }) => {
  qa.notRun(1, 'needs a user with the budget write right only (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
  qa.notRun(2, 'needs a user with the budget approval right only (blocker 38)');
  qa.notRun(3, 'needs the writer-only and approver-only users of steps 1 and 2 (blocker 38)');
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(4, async () => {
      await staff.goto('/id/apps');
      await staff.waitForLoadState('networkidle').catch(() => {});
      qa.note(4, `U3 (no right) is ${(await staff.getByRole('main').getByRole('link', { name: /^Budget\b/ }).count()) ? '' : 'not '}offered the Budget card (TBD in the workbook)`);
    });
    await qa.step(5, async () => {
      const seen: string[] = [];
      for (const route of ['/budget', '/budget/sanctions', '/budget/fund-withdrawals']) {
        await staff.goto(`/id${route}`);
        await staff.waitForLoadState('networkidle').catch(() => {});
        seen.push(`${route}: ${(await screenRefuses(staff)) ? 'refused' : `shown (${await rowCount(staff)} rows)`}`);
      }
      qa.note(5, `U3: ${seen.join('; ')} (TBD in the workbook)`);
    });
    await qa.step(6, async () => {
      const shown = await menuScreens(staff, '/budget', ['Sanction proposals']);
      qa.note(6, `U3 opens ${shown.join('; ')}; no sanction document of a test exists to download (blocker 13)`);
    });
  } finally {
    await staff.context().close();
  }
};
