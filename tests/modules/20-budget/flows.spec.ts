import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { toastsAfter } from '../18-settings/helpers';
import { Processes, restoreChain } from '../18-settings/process-cases';
import { menuScreens, rowCount, screenRefuses, userPage } from '../shared/access';
import { approvedCircular, book, cellOf, choose, draftNo, rowAction } from './cases';

/**
 * 20-budget.xlsx, the spending side (sanction proposals, utilisation,
 * transfers), the budget position, the states of the documents and the
 * budget rights. A budget line gets its balance from an approved allocation,
 * and no allocation can be made on Podomoro (blocker 13: the allocation,
 * fund release and fund withdrawal set-up is missing on the branch). So the
 * steps that spend, reserve, move or post a balance are blocked by 13; the
 * screens, the dialogs and the states of the circulars are run.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Opens a budget screen by its menu link and checks its heading and buttons; returns its columns. */
async function screen(page: Page, link: string, heading: string, buttons: string[]): Promise<string[]> {
  const main = page.getByRole('main');
  await page.goto('/id/budget');
  await page.getByRole('complementary').getByRole('link', { name: link }).or(main.getByRole('link', { name: link })).first().click();
  await expect(main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  for (const name of buttons) await expect(main.getByRole('button', { name }).or(main.getByRole('link', { name })).first()).toBeVisible();
  return (await main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
}

const NO_LINE = 'no budget line has a balance: a line is made by an approved allocation, which the branch set-up does not allow (blocker 13)';

qaTest('TC-APP020-029', async ({ page, qa }) => {
  await qa.step(1, async () => {
    qa.note(1, `columns: ${(await screen(page, 'Sanction proposals', 'Sanction proposals', ['Download CSV', 'New proposal'])).join(', ')}`);
  });
  await qa.step(2, async () => {
    await page.getByRole('main').getByRole('button', { name: 'New proposal' }).click();
    const d = page.getByRole('dialog');
    for (const f of ['Document date', 'Budget book']) await expect(d.getByLabel(f, { exact: true })).toBeVisible();
    qa.note(2, `fields: ${(await d.locator('label').allInnerTexts()).map((l) => l.trim().split('\n')[0]).filter(Boolean).join(', ')}`);
    await page.keyboard.press('Escape');
  });
  for (const st of [3, 4, 5, 6]) qa.blocked(st, 13);
  qa.note(3, NO_LINE);
});

qaTest('TC-APP020-030', async ({ qa }) => {
  for (const st of [1, 2, 3, 4, 5, 6, 7]) qa.blocked(st, 13);
  qa.note(1, `a proposal needs a budget line to save: ${NO_LINE}`);
});

qaTest('TC-APP020-031', async ({ qa }) => {
  qa.blocked(1, 13);
  qa.note(1, NO_LINE);
});

qaTest('TC-APP020-032', async ({ qa }) => {
  for (const st of [1, 2, 3]) qa.blocked(st, 13);
  qa.note(1, `an approved sanction needs a budget line: ${NO_LINE}`);
});

qaTest('TC-APP020-033', async ({ page, qa }) => {
  await qa.step(1, async () => {
    qa.note(1, `columns: ${(await screen(page, 'Budget utilisation', 'Budget utilisation', ['Download CSV', 'New utilisation'])).join(', ')}`);
  });
  await qa.step(2, async () => {
    await page.getByRole('main').getByRole('button', { name: 'New utilisation' }).click();
    const form = page.getByRole('dialog').or(page.getByRole('main')).first();
    qa.note(2, `the new utilisation asks for: ${(await form.locator('label').allInnerTexts()).map((l) => l.trim().split('\n')[0]).filter(Boolean).join(', ')} (TBD in the workbook)`);
    await page.keyboard.press('Escape');
  });
  for (const st of [3, 4, 5]) qa.blocked(st, 13);
  qa.note(3, `a utilisation needs an approved sanction: ${NO_LINE}`);
});

qaTest('TC-APP020-034', async ({ qa }) => {
  for (const st of [1, 2, 3, 4, 5, 6, 7]) qa.blocked(st, 13);
  qa.note(1, `a utilisation needs an approved sanction: ${NO_LINE}`);
});

qaTest('TC-APP020-035', async ({ page, qa }) => {
  await qa.step(1, async () => {
    qa.note(1, `columns: ${(await screen(page, 'Budget transfer', 'Budget transfer', ['Download CSV', 'New transfer'])).join(', ')}`);
  });
  await qa.step(2, async () => {
    await page.getByRole('main').getByRole('button', { name: 'New transfer' }).click();
    const form = page.getByRole('dialog').or(page.getByRole('main')).first();
    const labels = (await form.locator('label').allInnerTexts()).map((l) => l.trim().split('\n')[0]).filter(Boolean);
    qa.note(2, `the form asks for: ${labels.join(', ')}`);
    expect(labels.join(' ')).toMatch(/Document date|Tanggal dokumen/);
    await page.keyboard.press('Escape');
  });
  for (const st of [3, 4, 5]) qa.blocked(st, 13);
  qa.note(3, `a transfer moves the balance of a line: ${NO_LINE}`);
});

qaTest('TC-APP020-036', async ({ qa }) => {
  for (const st of [1, 2, 3, 4, 5, 6]) qa.blocked(st, 13);
  qa.note(1, `a transfer needs a source line with a balance: ${NO_LINE}`);
});

qaTest('TC-APP020-037', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Budget\b/ }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Budget' })).toBeVisible();
    qa.note(1, `the hub reads: "${(await main.innerText()).replace(/\s+/g, ' ').slice(0, 200)}"`);
  });
  await qa.step(2, async () => {
    const lists = main.locator('select');
    if ((await lists.count()) >= 2) {
      await lists.nth(0).selectOption({ index: 1 }).catch(() => {});
      await lists.nth(1).selectOption({ index: 1 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    const rows = await rowCount(page);
    qa.note(2, `budget position of the first book and year: ${rows} rows`);
    if (!rows) qa.blocked(2, 13);
  });
  for (const st of [3, 4, 5]) qa.blocked(st, 13);
  qa.note(3, `a row of the position is a budget line: ${NO_LINE}`);
});

qaTest('TC-APP020-038', async ({ page, qa }) => {
  const b = await book(page, qa);
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/id/budget');
    await page.waitForLoadState('networkidle').catch(() => {});
    const bookList = main.locator('select').filter({ has: page.locator('option', { hasText: b.code }) }).first();
    if (await bookList.count()) await choose(bookList, b.code);
    await page.waitForLoadState('networkidle').catch(() => {});
    if (!(await main.getByText('No budget lines yet. A line is created when an allocation is approved.').count())) {
      qa.deviation(1, 'The text "No budget lines yet. A line is created when an allocation is approved."', `"${(await main.innerText()).replace(/\s+/g, ' ').slice(-200)}"`);
    }
  });
  qa.blocked(2, 13);
  await qa.step(3, async () => {
    qa.note(3, `${await main.getByRole('button', { name: /Download CSV|Unduh CSV/ }).or(main.getByRole('link', { name: /Download CSV|Unduh CSV/ })).count()} export(s) on the budget position (TBD in the workbook)`);
  });
});

/** A circular of the test, saved as draft; returns its number. */
async function draftCircular(page: Page, qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa']): Promise<string> {
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

const status = (page: Page, no: string) => cellOf(page, 'circulars', no, 'Status');

qaTest('TC-APP020-039', async ({ page, qa }) => {
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
});

qaTest('TC-APP020-040', async ({ page, qa, browser }) => {
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
});

qaTest('TC-APP020-041', async ({ page, qa, browser }) => {
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
      await page.keyboard.press('Escape');
    } finally {
      await second.context().close();
    }
  });
  qa.blocked(3, 13);
});

qaTest('TC-APP020-043', async ({ qa }) => {
  for (const st of [1, 2, 3, 4, 5, 6]) qa.blocked(st, 13);
  qa.note(1, 'a fund release needs an approved allocation, which the branch set-up does not allow (blocker 13)');
});

qaTest('TC-APP020-044', async ({ qa }) => {
  for (const st of [1, 2, 3]) qa.blocked(st, 13);
  qa.note(1, 'the Finance posting of a fund release needs an approved allocation (blocker 13)');
});

qaTest('TC-APP020-045', async ({ qa, browser }) => {
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
});
