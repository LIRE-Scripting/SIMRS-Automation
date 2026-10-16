import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { OT } from '../../../lib/ot-data';
import { OtDeskPage, OtRequestsPage } from '../../../pages/ot/OtPages';
import { act, cellsOf, dossier, full, toastsAfter } from '../08-operation-theater/helpers';

/**
 * E2E-006: one operation request (patient, room, tomorrow 08:00-09:00, chief
 * surgeon and the blocked amount of RQ-PREP) goes from the calendar through the
 * surgical case, its dossier and consumption; the billing policy is set last.
 */
const SERVER_ERROR = /React error #441/;

chainTest('E2E-006', async ({ page, chain }) => {
  await installToastRecorder(page);
  const ot = new OtRequestsPage(page);
  let r!: ReturnType<typeof full> & { amount: string };
  const status = async () => (await cellsOf(page, r.procedure))[2];

  await chain.step(1, async (qa) => {
    r = { ...full(qa), amount: OT.amount };
    await qa.step(1, async () => {
      await ot.open();
      await ot.openNew();
      for (const f of ['Procedures display', 'Patient', 'Room', 'Start', 'End', 'Chief surgeon'] as const) await expect(ot.field(f)).toBeVisible();
      await expect(ot.amount()).toBeVisible();
      if (!(await ot.dialog.getByRole('textbox', { name: 'Branch' }).or(ot.dialog.getByRole('combobox', { name: 'Branch' })).count())) {
        qa.deviation(1, 'A dialog with "Branch", …', 'no "Branch" field (the request takes the branch of the session)');
      }
    });
    await qa.step(2, async () => {
      await ot.fill(r);
      const mark = await toastMark(page);
      await ot.save().click();
      expect(await toastsAfter(page, mark)).toContain('Request created');
      expect(await status()).toBe('pending');
    });
    await qa.step(3, async () => expect(await act(page, r.procedure, 'Place on calendar')).toContain('Scheduled'));
    await qa.step(4, async () => {
      const desk = new OtDeskPage(page);
      await desk.open('calendar', 'Calendar');
      await desk.main.locator('input[type="date"]').fill(r.day);
      const slot = desk.main.getByRole('button').filter({ hasText: r.room });
      await expect(slot).toHaveCount(1);
      await expect(slot).toContainText(`${r.day}T08:00`);
    });
    qa.note(1, `request "${r.procedure}", room ${r.room}, blocked amount ${r.amount}`);
  });

  await chain.step(2, async (qa) => {
    await qa.step(1, async () => {
      await ot.open();
      await act(page, r.procedure, 'Validate');
      expect(await status()).toMatch(/^validated/);
    });
    await qa.step(2, async () => {
      const toasts = await act(page, r.procedure, 'Pre-anesthesia');
      expect(toasts.some((t) => SERVER_ERROR.test(t))).toBe(false);
      qa.note(2, `status after "Pre-anesthesia": "${await status()}"`);
    });
    await qa.step(3, async () => {
      await act(page, r.procedure, 'Start');
      expect(await status()).toMatch(/started$/);
      await act(page, r.procedure, 'In progress');
      expect(await status()).toMatch(/in_progress$/);
    });
    await qa.step(4, async () => {
      await ot.open();
      await ot.note.fill(qa.prefix('X Operasi selesai tanpa penyulit'));
      await act(page, r.procedure, 'Complete');
      expect(await status()).toMatch(/completed$/);
    });
    qa.note(1, `status at the end: "${await status()}"`);
  });

  await chain.step(3, async (qa) => {
    const d = await dossier(page, qa);
    await qa.step(1, async () => {
      await ot.open();
      await ot.dossier.fill(d.id);
      const toasts = await act(page, r.procedure, 'Record dossier');
      qa.note(1, `dossier "${d.name}"; toast "${toasts.join(' / ')}"`);
      expect(toasts.some((t) => SERVER_ERROR.test(t))).toBe(false);
    });
    await qa.step(2, async () => {
      await page.goto('/en/pharmacy/orders');
      const rows = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: r.patient });
      qa.note(2, `Pharmacy Orders rows for the patient of the request: ${(await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' // ') || 'none'}`);
    });
  });

  await chain.step(4, async (qa) => {
    // Precondition of the test case (RQ-PREP): "List prepared" Yes, which the action "Schedule" sets (as in the module spec).
    await ot.open();
    const before = await cellsOf(page, r.procedure);
    qa.note(1, `row before: ${before.slice(0, 5).join(' | ')}`);
    if (before[4] !== 'Yes') {
      const toasts = await act(page, r.procedure, 'Schedule');
      qa.note(1, `"Schedule" for "List prepared": ${toasts.join(' / ')}; row: ${(await cellsOf(page, r.procedure)).slice(0, 5).join(' | ')}`);
    }
    await qa.step(1, async () => {
      expect(await act(page, r.procedure, 'Consume')).toContain('Consumed');
    });
    await qa.step(2, async () => {
      const c = await cellsOf(page, r.procedure);
      qa.note(2, `row: ${c.slice(0, 5).join(' | ')}`);
      expect(c[3]).toBe('0');
      expect(c[4]).toBe('Yes');
    });
  });

  await chain.step(5, async (qa) => {
    const desk = new OtDeskPage(page);
    const d = desk.dialog();
    const incision = qa.name('X sama');
    await qa.step(1, async () => {
      await page.goto('/en/ot');
      await page.getByRole('complementary').getByRole('link', { name: 'Billing' }).first().click();
      await expect(desk.main.getByRole('heading', { level: 1, name: 'Billing policy' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await desk.main.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(d.getByRole('textbox', { name: 'Incision' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await d.getByRole('textbox', { name: 'Incision' }).fill(incision);
      await d.getByRole('combobox').selectOption('single');
      await d.getByRole('spinbutton').fill('50');
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Save' }).click();
      expect(await toastsAfter(page, mark)).toContain('Saved');
      await expect(desk.main.getByText(new RegExp(`^${incision} single 50%$`))).toBeVisible();
    });
  });
});
