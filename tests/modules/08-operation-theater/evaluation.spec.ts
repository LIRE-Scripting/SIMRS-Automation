import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { OtRequestsPage } from '../../../pages/ot/OtPages';
import { signedOutJourney, userPage } from '../shared/access';
import { act, cellsOf, create, procedure, request, toastsAfter } from './helpers';

/**
 * 08-operation-theater.xlsx, the journeys marked "Needs Evaluation"
 * (automated since 2026-10-29, open question Q10): what "Consume" records,
 * finding a request, requests made at once, and OT requests without a
 * session. "Theatre nurse 2" is U4 (qa.admin3).
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP008-011', async ({ page, qa }) => {
  const p = procedure(qa);
  await request(page, { procedure: p });
  const scheduled = await act(page, p, 'Schedule');
  qa.note(1, `RQ-PREP is a request of this test (${p}), scheduled: "${scheduled.join(' / ')}"`);
  let form = false;
  await qa.step(1, async () => {
    const toasts = await act(page, p, 'Consume');
    const dialog = page.getByRole('dialog');
    form = (await dialog.count()) > 0 && (await dialog.getByRole('spinbutton').count()) > 0;
    qa.note(1, `"Consume": "${toasts.join(' / ') || 'no toast'}"${form ? '; a form opens' : ''}`);
    if (!form) qa.deviation(1, 'A form to enter the items and quantities used', `no form: "Consume" records at once ("${toasts.join(' / ')}")`);
  });
  await qa.step(2, async () => {
    if (!form) return qa.deviation(2, 'Stock is lower by the quantities used', 'no item or quantity was entered, so no stock of the theatre store can go down (the theatre store cannot be made either, found blocker 26)');
  });
  await qa.step(3, async () => {
    const c = await cellsOf(page, p);
    qa.note(3, `the request row: ${c.slice(0, 5).join(' | ')}`);
    qa.deviation(3, 'Charges for the operation and the items', 'the request names the patient as free text only (no MRN, no visit), so no bill of PT-1 can carry it');
  });
});

qaTest('TC-APP008-016', async ({ page, qa, browser }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa, qa.prefix('X Hernia'));
  await qa.step(1, async () => {
    expect(await create(page, { procedure: p })).toContain('Request created');
    await ot.open();
    const first = (await ot.cells(ot.rows().first()))[1];
    const total = (await ot.pager().innerText().catch(() => '')).trim();
    qa.note(1, `first row "${first}"; ${total}`);
    if (first !== p) qa.deviation(1, 'The new request is the first row', `the list starts with the lowest request number ("${first}"); the new one is on the last page`);
  });
  await qa.step(2, async () => {
    await ot.open();
    const search = await ot.main.getByRole('searchbox').or(ot.main.getByRole('textbox', { name: /search|cari/i })).count();
    if (!search) qa.deviation(2, 'A search by number or procedure', 'the list has no search field, only paging');
  });
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(3, async () => {
      const [a, b] = [procedure(qa, qa.prefix('X Hernia')), procedure(qa, qa.prefix('X Hernia'))];
      const [o1, o2] = [new OtRequestsPage(page), new OtRequestsPage(nurse2)];
      await Promise.all([o1.open(), o2.open()]);
      await Promise.all([o1.openNew(), o2.openNew()]);
      await o1.fill({ procedure: a });
      await o2.fill({ procedure: b });
      const [m1, m2] = [await toastMark(page), await toastMark(nurse2)];
      await Promise.all([o1.save().click(), o2.save().click()]);
      const [t1, t2] = [await toastsAfter(page, m1), await toastsAfter(nurse2, m2)];
      qa.note(3, `at the same moment: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
      expect(t1).toContain('Request created');
      expect(t2).toContain('Request created');
      const [n1, n2] = [(await cellsOf(page, a))[0], (await cellsOf(page, b))[0]];
      qa.note(3, `numbers: ${n1} and ${n2}`);
      if (n1 === n2) qa.deviation(3, 'Two different request numbers', `both requests got ${n1}`);
    });
  } finally {
    await nurse2.context().close();
  }
});

qaTest('TC-APP008-022', ({ qa, browser }) => signedOutJourney(browser, qa, '/ot/requests', /\/(id|en)\/ot\/requests/));

qaTest('TC-APP008-024', async ({ page, qa, browser }) => {
  const ot = new OtRequestsPage(page);
  await qa.step(1, async () => {
    const p = procedure(qa, qa.prefix('X Cepat'));
    await ot.open();
    await ot.openNew();
    await ot.fill({ procedure: p });
    await ot.save().dblclick();
    await page.waitForTimeout(3000);
    await ot.open();
    const n = await (await ot.row(p)).count();
    qa.note(1, `double-click on "Save": ${n} request(s) "${p}"`);
    if (n !== 1) qa.deviation(1, 'One request. The button is disabled while it reads "Saving…"', `${n} requests`);
  });
  const nurse2 = await userPage(browser, 'U4');
  try {
    await qa.step(2, async () => {
      const p = procedure(qa);
      await request(page, { procedure: p });
      await new OtRequestsPage(nurse2).open();
      const t1 = await act(page, p, 'Schedule');
      const t2 = await act(nurse2, p, 'Schedule').catch(() => ['(the row of Nurse 2 offers no "Schedule" any more)']);
      qa.note(2, `"Schedule" one after the other: "${t1.join(' / ')}" and "${t2.join(' / ')}"`);
      expect(t1).toContain('Scheduled');
      if (t2.includes('Scheduled')) qa.deviation(2, 'The second nurse is told the list is already prepared', 'scheduled again');
    });
  } finally {
    await nurse2.context().close();
  }
  await qa.step(3, async () => {
    await ot.open();
    await ot.openNew();
    await ot.fill({ procedure: 'QA Cep' });
    let warned = false;
    page.once('dialog', (d) => {
      warned = true;
      void d.accept();
    });
    await page.reload({ timeout: 30_000 }).catch(() => {});
    await ot.open();
    const kept = await ot.dialog.isVisible().catch(() => false);
    if (!warned && !kept) qa.deviation(3, 'The text is kept, or the nurse is warned', 'the half-typed procedure is lost with no warning');
  });
});
