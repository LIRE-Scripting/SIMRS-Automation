import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { PHARMACY } from '../../../lib/pharmacy-data';
import { stock } from '../05-pharmacy/helpers';
import { rowCount, screenRefuses, userPage } from '../shared/access';
import { approvedReceipt, approvedRequest, CssdForm, refusedWith } from './docs';

/**
 * 21-cssd.xlsx, the ward's Sterile Receipt (/cssd/sterile-receipts), the
 * whole loop of a set and the CSSD rights. A sterile receipt converts an
 * approved sterile issue, and the new sterile issue page answers HTTP 500
 * (blocker 3): no issue waits to be received, so the receipt steps and the
 * end of the loop are blocked by 3. The loop also needs a sterilized load,
 * which needs a Bowie Dick test of today (blocker 13).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  // A saved unsterile receipt stalls the site for minutes when it is opened (found blocker 48).
  test.setTimeout(900_000);
  await installToastRecorder(page);
});

const ITEM = PHARMACY.para;

qaTest('TC-APP021-024', async ({ page, qa }) => {
  const f = new CssdForm(page, 'sterile-receipts');
  await qa.step(1, async () => {
    await page.goto('/id/cssd');
    await page.getByRole('complementary').getByRole('link', { name: 'Sterile Receipt' }).or(f.main.getByRole('link', { name: 'Sterile Receipt' })).first().click();
    await f.main.getByRole('link', { name: 'New' }).or(f.main.getByRole('button', { name: 'New' })).first().click();
    await expect(f.main.getByText(/^Convert from an approved sterile issue/)).toBeVisible();
    const offered = (await f.main.locator('select').first().locator('option').allInnerTexts()).map((o) => o.trim());
    qa.note(1, `"Convert from" offers: ${offered.join(', ')}`);
  });
  for (const st of [2, 3, 4, 5]) qa.blocked(st, 3);
  qa.note(2, 'no sterile issue waits to be received: the new sterile issue page answers HTTP 500 (blocker 3)');
});

qaTest('TC-APP021-025', async ({ page, qa }) => {
  const f = new CssdForm(page, 'sterile-receipts');
  await qa.step(1, async () => {
    await f.openNew();
    const r = await refusedWith(f, 'Save', 'please select the document to convert.');
    if (!r.shown) qa.deviation(1, 'The text "please select the document to convert."', `"${r.texts.join(' / ') || 'nothing shown'}"`);
  });
  for (const st of [2, 3]) qa.blocked(st, 3);
  qa.note(4, 'TBD in the workbook: the lines of a sterile receipt take the issue whole (no issue to read, blocker 3)');
  qa.blocked(4, 3);
});

qaTest('TC-APP021-026', async ({ qa }) => {
  for (const st of [1, 2]) qa.blocked(st, 3);
  qa.note(1, 'a sterile receipt needs an approved sterile issue, and the new sterile issue page answers HTTP 500 (blocker 3)');
});

qaTest('TC-APP021-029', async ({ page, qa }) => {
  const batches = await stock(page, qa);
  await qa.step(1, async () => {
    await page.goto('/id/cssd');
    await page.getByRole('complementary').getByRole('link', { name: 'Sterile Request' }).or(page.getByRole('main').getByRole('link', { name: 'Sterile Request' })).first().click();
    await expect(page.getByRole('main').getByText(/^A ward or theatre asks CSSD to sterilize sets and loose items\./)).toBeVisible();
  });
  let request = '';
  await qa.step(2, async () => {
    request = (await approvedRequest(page, ITEM.code, batches[0])).no;
    qa.note(2, `${request} approved: the set is booked in the transit store, unsterile`);
  });
  let stalled = false;
  await qa.step(3, async () => {
    const r = await approvedReceipt(page, ITEM.code, batches[1]);
    stalled = !!r.stalled;
    if (stalled) return qa.note(3, `the receipt of ${r.request} is saved but does not open from the list (nginx "504 Gateway Time-out", found blocker 48)`);
    qa.note(3, `receipt of ${r.request} approved: the set is in the CSSD store, unsterile (packs ${r.packs.join(', ')})`);
  });
  if (stalled) qa.blocked(3, 48);
  qa.blocked(4, 13);
  qa.note(4, 'the cycle of the load needs a passed Bowie Dick test of today, which the branch set-up does not allow (blocker 13)');
  for (const st of [5, 6]) qa.blocked(st, 3);
  qa.blocked(7, 13);
});

qaTest('TC-APP021-030', async ({ qa }) => {
  qa.blocked(1, 13);
  qa.note(1, 'a failed and a passed cycle need a Bowie Dick test of today (blocker 13)');
  qa.blocked(2, 3);
  qa.blocked(3, 3);
  qa.notRun(4, 'TBD in the workbook: whether Operation Theater knows sterile sets and their packing numbers (08-operation-theater.xlsx)');
});

qaTest('TC-APP021-034', async ({ page, qa, browser }) => {
  qa.notRun(1, 'needs a user with the CSSD write right only (an account of 00-prerequisites.xlsx that is not prepared, blocker 38)');
  qa.notRun(2, 'needs a user with the CSSD approval right only (blocker 38)');
  await qa.step(3, async () => {
    const batches = await stock(page, qa);
    const r = await approvedRequest(page, ITEM.code, batches[0]);
    qa.note(3, `U1, who holds both rights, saved, sent and approved its own request ${r.no} (TBD in the workbook: accepted)`);
  });
  qa.notRun(4, 'needs the writer-only user of step 1 (blocker 38)');
  const staff = await userPage(browser, 'U3');
  try {
    await qa.step(5, async () => {
      const seen: string[] = [];
      for (const route of ['/cssd/requests', '/cssd/receipts', '/cssd/cycles', '/cssd/trace']) {
        await staff.goto(`/id${route}`);
        await staff.waitForLoadState('networkidle').catch(() => {});
        seen.push(`${route}: ${(await screenRefuses(staff)) ? 'refused' : `shown (${await rowCount(staff)} rows)`}`);
      }
      qa.note(5, `U3 (no right): ${seen.join('; ')} (TBD in the workbook)`);
    });
    await qa.step(6, async () => {
      await staff.goto('/id/cssd/bowie-tests');
      await staff.waitForLoadState('networkidle').catch(() => {});
      const save = staff.getByRole('main').getByRole('button', { name: /^(Save|Simpan|New|Baru)$/ }).first();
      if (!(await save.isVisible().catch(() => false))) return qa.note(6, 'U3 is offered no button to save a Bowie Dick test');
      const f = new CssdForm(staff, 'requests');
      const texts = await f.act((await save.innerText()).trim());
      qa.note(6, `U3 saving a Bowie Dick test: "${texts.join(' / ') || 'nothing shown'}" (TBD in the workbook: refused)`);
    });
  } finally {
    await staff.context().close();
  }
});
