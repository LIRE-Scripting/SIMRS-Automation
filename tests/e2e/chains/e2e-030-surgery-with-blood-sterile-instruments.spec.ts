import { chainTest, expect } from '../../../fixtures/chain';
import { ensureBloodbankDepartment } from '../../../lib/bloodbank-data';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { OtRequestsPage } from '../../../pages/ot/OtPages';
import { TC_APP006_020, TC_APP006_022 } from '../../modules/06-transfusion-medicine/cases';
import { TC_APP008_002 } from '../../modules/08-operation-theater/cases';
import { cellsOf, procedure, toastsAfter } from '../../modules/08-operation-theater/helpers';
import { TC_APP021_029 } from '../../modules/21-cssd/loop-cases';
import { TC_APP008_003, TC_APP008_004 } from '../../modules/08-operation-theater/requests-cases';
import { TC_APP008_027, TC_APP008_033 } from '../../modules/08-operation-theater/workflow-cases';
import { TC_APP008_040 } from '../../modules/08-operation-theater/hub-desk-screens-cases';

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
  await chain.step(2, (qa) => TC_APP008_002({ page, qa }));
  await chain.step(3, (qa) => TC_APP006_020({ page, qa }));
  await chain.step(4, (qa) => TC_APP006_022({ page, qa }));
  await chain.run(5, TC_APP021_029);
  await chain.run(6, TC_APP008_003);
  await chain.run(7, TC_APP008_027);
  await chain.run(8, TC_APP008_033);
  await chain.run(9, TC_APP008_004);
  await chain.run(10, TC_APP008_040);
});
