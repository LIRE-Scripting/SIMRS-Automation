import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { OtDeskPage, OtRequestsPage } from '../../../pages/ot/OtPages';
import { act, cellsOf, full, procedure, toastsAfter } from '../../modules/08-operation-theater/helpers';
import { Patients } from '../../modules/15-emergency/helpers';
import { triageSteps, walkInSteps } from './steps/emergency-steps';
import { admitSteps, dischargeSteps, newBed, transferSteps } from './steps/inpatient-steps';

/**
 * E2E-023: a walk-in is received and triaged in the emergency room, admission
 * is requested, the operation is requested and done (the full request carries
 * the walk-in's name), and the patient is admitted, moved and discharged on
 * the ward. The emergency "Admission id" cannot be filled (the internal id of
 * an admission is shown on no screen, Q27): steps 4-5 of TC-APP015-044 are
 * not part of the chain; the patient is admitted in Inpatient by name.
 */
chainTest('E2E-023', async ({ page, chain }) => {
  await installToastRecorder(page);
  const p = new Patients(page);
  const ot = new OtRequestsPage(page);

  const pt = await chain.step(1, (qa) => walkInSteps(page, qa));
  await chain.step(2, (qa) => triageSteps(page, qa, pt.fullName));

  await chain.step(3, async (qa) => {
    await qa.step(1, async () => {
      const d = await p.openRow(pt.fullName, 'Outcome');
      expect(await p.click(d.getByRole('button', { name: 'Request admission' }))).toContain('Saved.');
    });
    await qa.step(2, async () => {
      await p.row(pt.fullName, 'Emergency IP Patients');
    });
    await qa.step(3, async () => {
      const d = await p.openRow(pt.fullName, 'Outcome');
      await expect(d.getByRole('button', { name: 'Record admission' })).toBeVisible();
      await expect(d.getByRole('button', { name: 'Request admission' })).toBeDisabled();
    });
  });

  await chain.step(4, async (qa) => {
    const proc = procedure(qa);
    await qa.step(1, async () => {
      await page.goto('/id/apps');
      await page.getByRole('link', { name: /^Operation Theater\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Open requests' }).click();
      await expect(ot.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await ot.openNew();
      await expect(ot.field('Procedures display')).toBeVisible();
    });
    await qa.step(3, async () => {
      await ot.fill({ procedure: proc });
      const mark = await toastMark(page);
      await ot.save().click();
      expect(await toastsAfter(page, mark)).toContain('Request created');
    });
    await qa.step(4, async () => {
      const c = await cellsOf(page, proc);
      expect(c[0]).toMatch(/^OT-\d+$/);
      expect(c[4]).toBe('No');
    });
  });

  const r = await chain.step(5, async (qa) => {
    const req = { ...full(qa), patient: pt.fullName };
    qa.note(2, 'the request carries the walk-in of step 1 as its patient');
    await qa.step(1, async () => {
      await ot.open();
      await ot.openNew();
      await expect(ot.field('Chief surgeon')).toBeVisible();
    });
    await qa.step(2, async () => {
      await ot.fill(req);
      const mark = await toastMark(page);
      await ot.save().click();
      expect(await toastsAfter(page, mark)).toContain('Request created');
      expect((await cellsOf(page, req.procedure))[2]).toBe('pending');
    });
    await qa.step(3, async () => expect(await act(page, req.procedure, 'Place on calendar')).toContain('Scheduled'));
    await qa.step(4, async () => {
      const desk = new OtDeskPage(page);
      await desk.open('calendar', 'Calendar');
      await desk.main.locator('input[type="date"]').fill(req.day);
      await expect(desk.main.getByRole('button').filter({ hasText: req.room })).toHaveCount(1);
    });
    return req;
  });

  await chain.step(6, async (qa) => {
    const status = async () => (await cellsOf(page, r.procedure))[2];
    await ot.open();
    await qa.step(1, async () => {
      await act(page, r.procedure, 'Validate');
      expect(await status()).toMatch(/^validated/);
    });
    await qa.step(2, async () => {
      const toasts = await act(page, r.procedure, 'Pre-anesthesia');
      expect(toasts.some((t) => /React error #441/.test(t))).toBe(false);
    });
    await qa.step(3, async () => {
      await act(page, r.procedure, 'Start');
      await act(page, r.procedure, 'In progress');
      expect(await status()).toMatch(/in_progress$/);
    });
    await qa.step(4, async () => {
      await ot.open();
      await ot.note.fill(qa.prefix('X Operasi selesai tanpa penyulit'));
      await act(page, r.procedure, 'Complete');
      expect(await status()).toMatch(/completed$/);
    });
  });

  const beds = { first: '', second: '' };
  await chain.step(7, async (qa) => {
    beds.first = await newBed(page, qa, 'QA-101');
    await admitSteps(page, qa, pt.fullName, beds.first);
    qa.note(1, 'the walk-in of step 1 is admitted by name');
  });
  await chain.step(8, async (qa) => {
    beds.second = await newBed(page, qa, 'QA-103');
    await transferSteps(page, qa, pt.fullName, beds.first, beds.second);
  });
  await chain.step(9, (qa) => dischargeSteps(page, qa, pt.fullName, beds.second));
});
