import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { appsCardRefused, asUser, BR_B, headerOneBranch, routesRefused, seedPatientOf, toastsOf, tryRefused, userPage } from '../shared/access';
import { createRequest, docNo, hits, issue, mrdPatient, records, requests, type Screen } from './helpers';

/**
 * 16-mrd.xlsx, the access test cases of File Requests and Patient Records,
 * and the file review: U2 on "All branches", U3 without any right, U1 next
 * to a branch of U6 (Kemayoran). Numbers and patients carry a token; PT-B is
 * a seed patient of Kemayoran (no patient can be registered there, found
 * blocker 41).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const PURPOSE = 'X Kontrol poli';
const NOTE = 'X Lengkap, resume medis ditandatangani';

async function listed(s: Screen, no: string): Promise<number> {
  return (await s.row(no)).count();
}

/** Opens "Issue record" and searches; returns the hit texts. */
async function find(s: Screen, text: string): Promise<string[]> {
  await s.open();
  await s.main.getByRole('button', { name: 'Issue record' }).click();
  await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(text);
  await s.dialog.getByRole('button', { name: 'Find' }).click();
  await s.page.waitForLoadState('networkidle').catch(() => {});
  await hits(s).first().waitFor({ timeout: 4_000 }).catch(() => {});
  return (await hits(s).allInnerTexts()).map((h) => h.replace(/\s+/g, ' ').trim());
}

/** A record of this test, issued for a new patient; returns its number. */
async function issued(page: Page, qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa']): Promise<string> {
  const no = docNo(qa, 'QA-MR');
  expect(await issue(records(page), { patient: await mrdPatient(page, qa), no })).toContain('Record issued');
  return no;
}

/** Clicks a review button of a record's row and saves the dialog "Review" (with a note when given). */
async function review(s: Screen, no: string, button: 'Open review' | 'Complete review', note?: string): Promise<string[]> {
  await (await s.row(no)).getByRole('button', { name: button }).click();
  await expect(s.dialog).toBeVisible();
  if (note !== undefined) await s.dialog.getByRole('textbox', { name: 'Review note' }).fill(note);
  return s.click(s.dialog.getByRole('button', { name: 'Save' }));
}

qaTest('TC-APP016-006', async ({ page, qa, browser }) => {
  const ptB = await asUser(browser, 'U6', seedPatientOf);
  const r = requests(page);
  const s = records(page);
  const req = docNo(qa, 'QA-REQ-B01');
  const rec = docNo(qa, 'QA-MR-B02');
  const branch = r.dialog.getByRole('combobox', { name: 'Branch' });
  const create = r.dialog.getByRole('button', { name: /^(Create|Saving…)$/ });

  await qa.step(1, async () => {
    for (const x of [r, s]) {
      await x.open();
      const headers = (await x.main.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
      if (!headers.some((h) => /branch/i.test(h))) qa.note(1, `${x.heading} has no Branch column (columns: ${headers.join(', ')})`);
    }
  });

  await qa.step(2, async () => {
    await r.open();
    await r.main.getByRole('button', { name: 'New request' }).click();
    await expect(branch).toBeVisible();
  });

  await qa.step(3, async () => {
    await r.dialog.getByRole('textbox', { name: 'Document number' }).fill(req);
    const type = r.dialog.getByRole('combobox', { name: 'Request type' });
    await type.selectOption({ label: (await type.locator('option').allInnerTexts())[1] });
    await r.dialog.getByRole('textbox', { name: 'Purpose' }).fill(qa.prefix(PURPOSE));
    const toasts = await toastsOf(page, () => create.click());
    expect(toasts).not.toContain('File request created');
    const message = toasts.join(' / ') || (await branch.evaluate((e: HTMLSelectElement) => e.validationMessage));
    expect(message).not.toBe('');
    qa.note(3, `without a branch: "${message}"`);
  });

  await qa.step(4, async () => {
    await branch.selectOption({ label: BR_B });
    expect(await toastsOf(page, () => create.click())).toContain('File request created');
  });

  await qa.step(5, async () => {
    await s.open();
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    const b = s.dialog.getByRole('combobox', { name: 'Branch' });
    if (await b.count()) await b.selectOption({ label: BR_B });
    else qa.note(5, 'the dialog "Issue record" has no Branch list');
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(ptB.mrn);
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    await hits(s).filter({ hasText: ptB.mrn }).first().click();
    await s.dialog.getByRole('textbox', { name: 'Document number' }).fill(rec);
    expect(await s.click(s.dialog.getByRole('button', { name: /^(Issue|Saving…)$/ }))).toContain('Record issued');
  });

  await qa.step(6, async () => {
    await asUser(browser, 'U6', async (u6) => {
      expect(await listed(requests(u6), req)).toBe(1);
      expect(await listed(records(u6), rec)).toBe(1);
    });
    await asUser(browser, 'U1', async (u1) => {
      expect(await listed(requests(u1), req)).toBe(0);
      expect(await listed(records(u1), rec)).toBe(0);
    });
  });
});

qaTest('TC-APP016-015', async ({ page, qa, browser }) => {
  // Preconditions: REQ-1 and REC-OUT of BR-A (U1), REC-B of BR-B (U6), each with a number of this test.
  const r = requests(page);
  const s = records(page);
  const req1 = docNo(qa, 'QA-REQ-001');
  const recOut = docNo(qa, 'QA-MR-001');
  const recB = docNo(qa, 'QA-MR-B01');
  expect(await createRequest(r, { no: req1, purpose: qa.prefix(PURPOSE) })).toContain('File request created');
  expect(await issue(s, { patient: await mrdPatient(page, qa), no: recOut })).toContain('Record issued');
  await asUser(browser, 'U6', async (u6) => {
    expect(await issue(records(u6), { patient: await seedPatientOf(u6), no: recB })).toContain('Record issued');
  });
  const pt2 = await mrdPatient(page, qa, 'QA-MRD Pasien Dua');

  await qa.step(1, async () => {
    const toasts = await createRequest(r, { no: req1, purpose: qa.prefix(PURPOSE) });
    expect(toasts).not.toContain('File request created');
    if (!toasts.includes('Document number already exists')) qa.deviation(1, 'Toast "Document number already exists"', `toast "${toasts.join(' / ') || 'none'}"`);
    await expect(r.dialog).toBeVisible();
    expect(await listed(r, req1)).toBe(1);
  });

  await qa.step(2, async () => {
    const toasts = await issue(s, { patient: pt2, no: recOut });
    expect(toasts).not.toContain('Record issued');
    if (!toasts.includes('Document number already exists')) qa.deviation(2, 'Toast "Document number already exists"', `toast "${toasts.join(' / ') || 'none'}"`);
    expect(await listed(s, recOut)).toBe(1);
  });

  await qa.step(3, async () => {
    const toasts = await issue(s, { patient: pt2, no: recB });
    if (toasts.includes('Record issued')) qa.note(3, `the number of BR-B is accepted in BR-A`);
    else if (toasts.includes('Document number already exists')) qa.deviation(3, 'Accepted, or a message that explains where the number is used', `toast "Document number already exists", although ${recB} is not in the BR-A list (numbers are unique across branches)`);
    else qa.note(3, `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(4, async () => {
    for (const [x, button] of [[r, 'New request'], [s, 'Issue record']] as const) {
      await x.open();
      await x.main.getByRole('button', { name: button }).click();
      const field = x.dialog.getByRole('textbox', { name: 'Document number' });
      const required = await field.evaluate((e: HTMLInputElement) => e.required);
      const hint = (await field.getAttribute('placeholder')) ?? '';
      if (required || !/auto/i.test(hint)) qa.deviation(4, 'The number can be left empty', `"Document number" of "${button}" is ${required ? 'required' : 'not marked required'}, with no automatic number`);
      await x.dialog.getByRole('button', { name: 'Cancel' }).click();
    }
  });
});

qaTest('TC-APP016-017', async ({ page, qa, browser }) => {
  const s = records(page);
  const ptB = await asUser(browser, 'U6', seedPatientOf);
  const pt1 = await mrdPatient(page, qa);
  const empty = () => s.dialog.getByText(/no patients? found|no results?|nothing found/i);

  await qa.step(1, async () => {
    expect(await find(s, 'zzzz-tidak-ada')).toEqual([]);
    if (!(await empty().count())) qa.deviation(1, 'A text such as "No patients found"', 'nothing appears, with no message');
  });

  await qa.step(2, async () => {
    const found = await find(s, 'QA');
    const hint = await s.dialog.getByText(/more|refine|first \d+/i).count();
    qa.note(2, `"QA" lists ${found.length} patients`);
    if (found.length <= 10 && !hint) qa.deviation(2, 'All matching patients, or the first 10 with a hint that there are more', `${found.length} patients with no hint and no further page`);
  });

  await qa.step(3, async () => {
    expect((await find(s, ptB.mrn)).filter((h) => h.includes(ptB.mrn))).toEqual([]);
    if (!(await empty().count())) qa.deviation(3, 'Nothing, with a text that says so', 'nothing appears, with no message');
  });

  await qa.step(4, async () => {
    // registerPatient gives PT-1 the date of birth of the shared data; the search is tried with it.
    const dob = (await find(s, pt1.mrn))[0] ?? '';
    const found = await find(s, '1990-01-01');
    qa.note(4, `a hit of PT-1 reads "${dob}"`);
    if (!found.some((h) => h.includes(pt1.mrn))) qa.deviation(4, 'The patient is found by date of birth or national ID', 'nothing is found: the search looks at name and MRN only');
  });
});

qaTest('TC-APP016-022', async ({ page, qa, browser }) => {
  // Preconditions (made by U1): REC-OUT "Issued", and PT-2.
  const recOut = await issued(page, qa);
  const pt2 = await mrdPatient(page, qa, 'QA-MRD Pasien Dua');
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(1, async () => {
      const no = docNo(qa, 'QA-REQ-TANPA-HAK');
      const toasts = await createRequest(requests(staff), { no, purpose: qa.prefix(PURPOSE) });
      expect(toasts).not.toContain('File request created');
      qa.note(1, `Create: "${toasts.join(' / ') || 'no toast'}"`);
      if (!toasts.some((t) => /privilege|permission|not allowed|right/i.test(t))) qa.deviation(1, 'Refused with a message that the user may not do this', `toast "${toasts.join(' / ') || 'none'}"`);
      expect(await listed(requests(page), no)).toBe(0);
    });

    await qa.step(2, async () => {
      const no = docNo(qa, 'QA-MR-TANPA-HAK');
      const toasts = await issue(records(staff), { patient: pt2, no });
      expect(toasts).not.toContain('Record issued');
      qa.note(2, `Issue: "${toasts.join(' / ') || 'no toast'}"`);
      expect(await listed(records(page), no)).toBe(0);
    });

    await qa.step(3, async () => {
      const s = records(staff);
      await (await s.row(recOut)).getByRole('button', { name: 'Return' }).click();
      const toasts = (await s.dialog.isVisible({ timeout: 2_000 }).catch(() => false))
        ? await s.click(s.dialog.getByRole('button', { name: 'Return' }))
        : await toastsOf(staff, async () => {});
      expect(toasts).not.toContain('Record returned');
      qa.note(3, `Return: "${toasts.join(' / ') || 'no toast'}"`);
      const mine = records(page);
      expect((await mine.cells(await mine.row(recOut))).join(' ')).toContain('Issued');
    });
    qa.note(1, 'every button is shown to U3; the refusal comes only after the click');
  } finally {
    await staff.context().close();
  }
});

qaTest('TC-APP016-023', async ({ qa, browser }) => {
  await asUser(browser, 'U3', async (staff) => {
    await qa.step(1, () => appsCardRefused(staff, qa, 1, /^MRD\b/));
    await qa.step(2, () => routesRefused(staff, qa, 2, ['/mrd/records']));
    await qa.step(3, async () => {
      const found = await find(records(staff), '');
      if (found.length) qa.deviation(3, 'No patients are shown to this user', `"Find" with an empty box lists ${found.length} patients to U3 (e.g. "${found[0]}")`);
    });
  });
});

qaTest('TC-APP016-024', async ({ page, qa, browser }) => {
  // Preconditions (made by U6): REC-B and a request of BR-B.
  const recB = docNo(qa, 'QA-MR-B01');
  const reqB = docNo(qa, 'QA-REQ-B01');
  const ptB = await asUser(browser, 'U6', async (u6) => {
    const p = await seedPatientOf(u6);
    expect(await issue(records(u6), { patient: p, no: recB })).toContain('Record issued');
    expect(await createRequest(requests(u6), { no: reqB, purpose: qa.prefix(PURPOSE) })).toContain('File request created');
    return p;
  });

  await qa.step(1, async () => {
    expect(await listed(requests(page), reqB)).toBe(0);
    expect(await listed(records(page), recB)).toBe(0);
  });

  await qa.step(2, async () => {
    expect((await find(records(page), ptB.fullName)).filter((h) => h.includes(ptB.mrn))).toEqual([]);
  });

  await qa.step(3, () => headerOneBranch(page, qa, 3));
});

qaTest('TC-APP016-034', async ({ page, qa }) => {
  const s = records(page);
  const no = await issued(page, qa);
  const note = qa.prefix(NOTE);

  await qa.step(1, async () => {
    await (await s.row(no)).getByRole('button', { name: 'Open review' }).click();
    await expect(s.dialog.getByRole('heading', { name: 'Review' }).or(s.dialog.getByText('Review', { exact: true })).first()).toBeVisible();
    await expect(s.dialog.getByRole('textbox', { name: 'Review note' })).toBeVisible();
    await expect(s.dialog.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  await qa.step(2, async () => {
    expect(await s.click(s.dialog.getByRole('button', { name: 'Save' }))).toContain('Review opened');
    await expect((await s.row(no)).getByRole('button', { name: 'Complete review' })).toBeVisible();
  });

  await qa.step(3, async () => {
    expect(await review(s, no, 'Complete review', note)).toContain('Review completed');
    const row = await s.row(no);
    await expect(row.getByRole('button', { name: /review/i })).toHaveCount(0);
    await expect(row).toContainText('Review');
  });

  await qa.step(4, async () => {
    const shown = (await s.main.innerText()).includes(note);
    qa.note(4, `the note is ${shown ? 'shown' : 'shown nowhere'} on Patient Records; the reviewer is not shown (TBD in the workbook: Audit only)`);
  });
});

qaTest('TC-APP016-035', async ({ page, qa, browser }) => {
  const s = records(page);
  const note = qa.prefix(NOTE);

  await qa.step(1, async () => {
    const no = await issued(page, qa);
    expect(await review(s, no, 'Open review')).toContain('Review opened');
    const toasts = await review(s, no, 'Complete review', '');
    expect(toasts).not.toContain('Review completed');
    if (!toasts.includes('A review note is required')) qa.deviation(1, 'Toast "A review note is required"', `toast "${toasts.join(' / ') || 'none'}"`);
  });

  await qa.step(2, async () => {
    const no = await issued(page, qa);
    await asUser(browser, 'U1', async (other) => {
      const s2 = records(other);
      const row2 = await s2.row(no);
      expect(await review(s, no, 'Open review')).toContain('Review opened');
      await row2.getByRole('button', { name: 'Open review' }).click();
      const toasts = await s2.click(s2.dialog.getByRole('button', { name: 'Save' }));
      expect(toasts).not.toContain('Review opened');
      if (!toasts.includes('That review step is not available')) qa.deviation(2, 'Toast "That review step is not available"', `toast "${toasts.join(' / ') || 'none'}"`);
    });
    qa.note(2, 'the second officer is U1 in a second browser (one account of the role)');
  });

  await qa.step(3, async () => {
    const no = await issued(page, qa);
    await (await s.row(no)).getByRole('button', { name: 'Open review' }).click();
    const field = s.dialog.getByRole('textbox', { name: 'Review note' });
    if (await field.isEditable()) await field.fill(note);
    expect(await s.click(s.dialog.getByRole('button', { name: 'Save' }))).toContain('Review opened');
    await (await s.row(no)).getByRole('button', { name: 'Complete review' }).click();
    const kept = await s.dialog.getByRole('textbox', { name: 'Review note' }).inputValue();
    qa.note(3, `the note typed while opening is ${kept === note ? 'shown again' : 'not shown'} when completing (TBD in the workbook)`);
    await s.dialog.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
  });

  await qa.step(4, async () => {
    const returned = await issued(page, qa);
    await (await s.row(returned)).getByRole('button', { name: 'Return' }).click();
    if (await s.dialog.isVisible({ timeout: 2_000 }).catch(() => false)) expect(await s.click(s.dialog.getByRole('button', { name: 'Return' }))).toContain('Record returned');
    const still = await issued(page, qa);
    for (const [no, status] of [[returned, 'Returned'], [still, 'Issued']] as const) {
      const opened = (await review(s, no, 'Open review')).includes('Review opened');
      const done = opened && (await review(s, no, 'Complete review', note)).includes('Review completed');
      qa.note(4, `a file "${status}": review ${done ? 'opened and completed' : opened ? 'opened, not completed' : 'refused'} (TBD in the workbook)`);
    }
  });
});

qaTest('TC-APP016-041', async ({ page, qa, browser }) => {
  qa.notRun(1, 'needs an account with MRD_WRITE and without the write right of Patient Care; the prepared U3 has no right at all (00-prerequisites.xlsx | Users)');
  const no = await issued(page, qa);
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(2, async () => {
      const r = requests(staff);
      await r.open();
      await r.main.getByRole('button', { name: 'Request types' }).click();
      await r.dialog.getByRole('textbox', { name: 'Code' }).fill(qa.code('X-PRJ'));
      await r.dialog.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Pinjam rawat jalan'));
      await tryRefused(qa, 2, staff, 'Create request type', /^Request type saved$/, () => r.dialog.getByRole('button', { name: 'Create' }).click());
    });

    await qa.step(3, async () => {
      const s = records(staff);
      const toasts = await review(s, no, 'Open review');
      expect(toasts).not.toContain('Review opened');
      qa.note(3, `Open review: "${toasts.join(' / ') || 'no toast'}"`);
      const mine = records(page);
      await expect((await mine.row(no)).getByRole('button', { name: 'Open review' })).toBeVisible();
    });

    await qa.step(4, async () => {
      const shown: string[] = [];
      for (const [route, heading] of [['/mrd/outpatient', 'Outpatient visits without a document'], ['/mrd/coding', 'Discharged stays missing a diagnosis code']] as const) {
        await staff.goto(`/en${route}`);
        await staff.waitForLoadState('networkidle').catch(() => {});
        if (await staff.getByRole('main').getByRole('heading', { level: 1, name: heading }).isVisible()) shown.push(`${heading} (${Math.max((await staff.getByRole('main').getByRole('row').count()) - 1, 0)} rows)`);
      }
      qa.note(4, `U3 reads ${shown.join(' and ') || 'neither list'} (TBD in the workbook)`);
    });
  } finally {
    await staff.context().close();
  }
});
