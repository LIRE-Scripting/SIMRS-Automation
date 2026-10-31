import type { Page } from '@playwright/test';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { signedOutJourney, userPage } from '../shared/access';
import { docNo, hits, issue, mrdPatient, records, toastsAfter, type Screen } from './helpers';

/**
 * 16-mrd.xlsx, the journeys marked "Needs Evaluation" (automated since
 * 2026-10-29, open question Q10): loans of a file that is out, the loan and
 * the chart, returns made twice, a merged patient, Patient Records without a
 * session and two officers at once. "Records officer 2" is U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Clicks "Return" on a record's row (and in the "Return" dialog when one opens); returns the toasts. */
async function giveBack(s: Screen, no: string): Promise<string[]> {
  const row = await s.row(no);
  const mark = await toastMark(s.page);
  await row.getByRole('button', { name: 'Return' }).click();
  if (await s.dialog.isVisible({ timeout: 2_000 }).catch(() => false)) await s.dialog.getByRole('button', { name: 'Return' }).click();
  return toastsAfter(s.page, mark);
}

async function chart(page: Page, pt: { mrn: string; fullName: string }): Promise<string> {
  const c = new ConsultationPage(page);
  await c.open();
  await c.pickPatient(pt.mrn);
  return (await c.pane.isVisible().catch(() => false)) ? 'opens' : 'does not open';
}

qaTest('TC-APP016-011', async ({ page, qa, browser }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const out = docNo(qa, 'QA-MR-001');
  expect(await issue(s, { patient: pt, no: out })).toContain('Record issued');
  qa.note(1, `REC-OUT ${out} is issued for ${pt.fullName}`);
  const o2 = await userPage(browser, 'U4');
  try {
    const s2 = records(o2);
    await qa.step(1, async () => {
      await s2.open();
      await s2.main.getByRole('button', { name: 'Issue record' }).click();
      await s2.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(pt.mrn);
      await s2.dialog.getByRole('button', { name: 'Find' }).click();
      await hits(s2).filter({ hasText: pt.mrn }).first().click();
      const text = (await s2.dialog.innerText()).replace(/\s+/g, ' ');
      if (!text.includes(out)) qa.deviation(1, "A warning that PT-1's file is already out, with the number of the open loan", 'no warning when the patient is chosen');
    });
    await qa.step(2, async () => {
      await s2.dialog.getByRole('textbox', { name: 'Document number' }).fill(docNo(qa, 'QA-MR-013'));
      const toasts = await s2.click(s2.dialog.getByRole('button', { name: /^(Issue|Saving…)$/ }));
      qa.note(2, `"Issue" while ${out} is out: "${toasts.join(' / ')}"`);
      if (toasts.includes('Record issued')) qa.deviation(2, 'Refused: the file has not been returned', 'a second loan of the same file is issued');
    });
  } finally {
    await o2.context().close();
  }
});

qaTest('TC-APP016-013', async ({ page, qa }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const no = docNo(qa, 'QA-MR-001');
  let before = '';
  await qa.step(1, async () => {
    before = await chart(page, pt);
    qa.note(1, `with no record issued the chart ${before}`);
    if (before === 'opens') qa.note(1, 'the chart is not gated by a loan');
  });
  await qa.step(2, async () => {
    expect(await issue(s, { patient: pt, no })).toContain('Record issued');
    qa.note(2, `after the issue the chart ${await chart(page, pt)}`);
  });
  await qa.step(3, async () => {
    expect(await giveBack(s, no)).toContain('Record returned');
    qa.note(3, `after the return the chart ${await chart(page, pt)}`);
  });
});

qaTest('TC-APP016-018', async ({ page, qa, browser }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const [out, second] = [docNo(qa, 'QA-MR-001'), docNo(qa, 'QA-MR-002')];
  expect(await issue(s, { patient: pt, no: out })).toContain('Record issued');
  expect(await issue(s, { patient: await mrdPatient(page, qa, 'QA-MRD Pasien Dua'), no: second })).toContain('Record issued');
  const o2 = await userPage(browser, 'U4');
  try {
    const s2 = records(o2);
    const stale = await s2.row(out);
    await qa.step(1, async () => {
      expect(await giveBack(s, out)).toContain('Record returned');
    });
    await qa.step(2, async () => {
      const mark = await toastMark(o2);
      await stale.getByRole('button', { name: 'Return' }).click().catch(() => {});
      if (await s2.dialog.isVisible({ timeout: 2_000 }).catch(() => false)) await s2.dialog.getByRole('button', { name: 'Return' }).click();
      const toasts = await toastsAfter(o2, mark);
      qa.note(2, `Records officer 2 on the old list: "${toasts.join(' / ')}"`);
      if (!toasts.includes('Record already returned')) qa.deviation(2, 'Toast "Record already returned"', `"${toasts.join(' / ') || 'no toast'}"`);
      expect((await s2.cells(await s2.row(out)))[3]).toBe('Returned');
    });
  } finally {
    await o2.context().close();
  }
  await qa.step(3, async () => {
    const row = await s.row(second);
    await row.getByRole('button', { name: 'Return' }).click();
    const asked = await s.dialog.isVisible({ timeout: 2_000 }).catch(() => false);
    qa.note(3, asked ? 'a "Return" dialog opens first' : 'returned at once');
    if (!asked) qa.deviation(3, 'A question to confirm before anything changes', 'returned with one click');
    else await s.dialog.getByRole('button', { name: 'Return' }).click();
  });
  await qa.step(4, async () => {
    const row = await s.row(second);
    const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    if (!buttons.some((b) => /undo|reissue|issue again|batal/i.test(b))) qa.deviation(4, 'An undo that sets the record to "Issued" again', `the returned row offers ${buttons.join(', ') || 'nothing'}`);
  });
});

qaTest('TC-APP016-021', async ({ page, qa }) => {
  const s = records(page);
  const reg = new RegisteredPatientsPage(page);
  const t = qa.token();
  await reg.open();
  const pt1 = await reg.register({ firstName: 'QA-MRD Pasien', lastName: `Satu ${t}`, dateOfBirth: '1980-01-01' });
  const pt2 = await reg.register({ firstName: 'QA-MRD Pasien', lastName: `Dua ${t}`, dateOfBirth: '1980-01-01' });
  const no = docNo(qa, 'QA-MR-001');
  expect(await issue(s, { patient: pt2, no })).toContain('Record issued');
  await reg.open();
  const d = reg.mergeDialog();
  await reg.mergeButton.click();
  await reg.pickFrom(d.getByRole('textbox', { name: 'Survivor' }), `Satu ${t}`, pt1.mrn, d);
  await reg.pickFrom(d.getByRole('textbox', { name: 'Duplicate' }), `Dua ${t}`, pt2.mrn, d);
  const mark = await toastMark(page);
  await d.getByRole('button', { name: 'Merge', exact: true }).click();
  expect(await toastsAfter(page, mark)).toContain('Patients merged');
  qa.note(1, `${pt2.fullName} (${pt2.mrn}) merged into ${pt1.fullName} (${pt1.mrn}) after ${no} was issued for PT-2`);
  await qa.step(1, async () => {
    const row = (await (await s.row(no)).innerText()).replace(/\s+/g, ' ');
    qa.note(1, `the row: "${row}"`);
    if (!row.includes(pt1.fullName) && !row.includes(pt1.mrn) && !/merge/i.test(row)) qa.deviation(1, 'The row shows PT-1, the patient who remains, or a note about the merge', `the row still names PT-2: "${row}"`);
  });
  await qa.step(2, async () => {
    await s.open();
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(pt2.mrn);
    await s.dialog.getByRole('button', { name: 'Find' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const n = await hits(s).filter({ hasText: pt2.mrn }).count();
    qa.note(2, `${n} hit(s) for ${pt2.mrn}`);
    if (n) qa.deviation(2, 'Nothing is found; PT-2 is no longer listed as a patient', `PT-2 (${pt2.mrn}) is still offered`);
  });
});

qaTest('TC-APP016-026', async ({ qa, browser }) => {
  await signedOutJourney(browser, qa, '/mrd/records', /\/(id|en)\/mrd\/records/);
  await qa.step(4, async () => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const page = await context.newPage();
      await page.goto('/id/mrd/requests');
      await expect(page).toHaveURL(/\/login\?next=%2Fmrd%2Frequests/, { timeout: 20_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    } finally {
      await context.close();
    }
  });
});

qaTest('TC-APP016-028', async ({ page, qa, browser }) => {
  const s = records(page);
  const pt = await mrdPatient(page, qa);
  const fill = async (sc: Screen, no: string) => {
    await sc.open();
    await sc.main.getByRole('button', { name: 'Issue record' }).click();
    await sc.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(pt.mrn);
    await sc.dialog.getByRole('button', { name: 'Find' }).click();
    await hits(sc).filter({ hasText: pt.mrn }).first().click();
    await sc.dialog.getByRole('textbox', { name: 'Document number' }).fill(no);
  };
  await qa.step(1, async () => {
    const no = docNo(qa, 'QA-MR-CEPAT-1');
    await fill(s, no);
    await s.dialog.getByRole('button', { name: /^(Issue|Saving…)$/ }).dblclick();
    await page.waitForTimeout(3000);
    const n = await (await s.row(no)).count();
    qa.note(1, `double-click on "Issue": ${n} record(s) ${no}`);
    if (n !== 1) qa.deviation(1, 'One record. The button is disabled while it reads "Saving…"', `${n} records`);
  });
  const o2 = await userPage(browser, 'U4');
  try {
    const s2 = records(o2);
    await qa.step(2, async () => {
      const no = docNo(qa, 'QA-MR-CEPAT-2');
      await fill(s, no);
      await fill(s2, no);
      const [m1, m2] = [await toastMark(page), await toastMark(o2)];
      await Promise.all([s.dialog.getByRole('button', { name: /^(Issue|Saving…)$/ }).click(), s2.dialog.getByRole('button', { name: /^(Issue|Saving…)$/ }).click()]);
      const [t1, t2] = [await toastsAfter(page, m1), await toastsAfter(o2, m2)];
      qa.note(2, `the same number at once: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
      const n = await (await s.row(no)).count();
      if (n !== 1) qa.deviation(2, 'One is saved; the other gets "Document number already exists"', `${n} records ${no}`);
      else if (![t1, t2].some((t) => t.join(' ').includes('Document number already exists'))) qa.note(2, 'the other is refused with another text');
    });
    await qa.step(3, async () => {
      await s2.open();
      const no = docNo(qa, 'QA-MR-CEPAT-1');
      expect(await issue(s, { patient: pt, no })).toContain('Record issued');
      const without = await s2.rows().filter({ hasText: no }).count();
      const after = await (await s2.row(no)).count();
      qa.note(3, `Records officer 2's list: ${without} without a reload, ${after} after it`);
      if (!without && !after) qa.deviation(3, 'The new row appears, or a hint to reload', 'the row does not appear');
    });
  } finally {
    await o2.context().close();
  }
  await qa.step(4, async () => {
    await s.open();
    await s.main.getByRole('button', { name: 'Issue record' }).click();
    await s.dialog.getByRole('textbox', { name: 'Document number' }).fill('QA-MR-SETENGAH');
    let warned = false;
    page.once('dialog', (x) => {
      warned = true;
      void x.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await s.open();
    if (!warned && !(await s.dialog.isVisible().catch(() => false))) qa.deviation(4, 'The text is kept, or the officer is warned', 'the half-filled form is lost with no warning');
  });
});
