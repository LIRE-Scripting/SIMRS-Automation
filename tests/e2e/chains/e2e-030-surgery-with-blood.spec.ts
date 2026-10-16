import { chainTest, expect } from '../../../fixtures/chain';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { OtRequestsPage } from '../../../pages/ot/OtPages';
import { TC_APP006_020, TC_APP006_022 } from '../06-transfusion-medicine/cases';
import { TC_APP008_002 } from '../08-operation-theater/cases';
import { cellsOf, procedure, toastsAfter } from '../08-operation-theater/helpers';

/**
 * E2E-030: an operation request is created and its amount blocked; blood is
 * requested and a unit is to be cross-matched and issued. Steps 2-4 run their
 * module cases (with their own records). The chain stops at the first step a
 * blocker stops; the cause is recorded by the run.
 */
chainTest('E2E-030', async ({ page, chain }) => {
  await installToastRecorder(page);
  // As the 06 spec does before it runs: the blood bank department exists.
  await ensureBloodbankDepartment(page);
  const ot = new OtRequestsPage(page);

  await chain.step(1, async (qa) => {
    const proc = procedure(qa);
    await qa.step(1, async () => {
      await page.goto('/en/apps');
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
  await chain.step(2, (qa) => TC_APP008_002({ page, qa }));
  await chain.step(3, (qa) => TC_APP006_020({ page, qa }));
  await chain.step(4, (qa) => TC_APP006_022({ page, qa }));
});
