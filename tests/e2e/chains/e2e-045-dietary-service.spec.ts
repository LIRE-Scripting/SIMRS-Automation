import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP013_034, TC_APP013_040 } from '../../modules/13-dietary/cases';
import { catalogue, click } from '../../modules/13-dietary/helpers';

/**
 * E2E-045: the diet catalogue (nutrient, session, menu), the body rule with
 * the BMI and energy calculation, and a diet prescription with its order.
 * Steps 1 and 3 run their module cases (with their own records). Step 4 (the
 * order reaches the kitchen, TC-APP013-051) is blocked as planned in its
 * workbook, so the chain stops there.
 */
chainTest('E2E-045', async ({ page, chain }) => {
  await installToastRecorder(page);
  await chain.step(1, (qa) => TC_APP013_034({ page, qa }));
  await chain.step(2, async (qa) => {
    const c = catalogue(page);
    await qa.step(1, async () => {
      await c.open();
      await expect(c.weight).toHaveValue('60');
      await expect(c.height).toHaveValue('160');
    });
    await qa.step(2, async () => {
      await c.gender.selectOption('female');
      const toasts = await click(page, c.formula);
      if (!toasts.includes('Saved')) qa.note(2, `not saved ("${toasts.join(' / ')}"): the rule for female exists from an earlier run (one rule per gender)`);
    });
    await qa.step(3, async () => {
      await c.open();
      await c.gender.selectOption('female');
      expect(await click(page, c.calculate)).toContain('Saved');
      await expect(c.main.getByText('23.4 / 1600', { exact: true })).toBeVisible();
    });
    await qa.step(4, async () => {
      await c.weight.fill('80');
      await c.height.fill('170');
      await click(page, c.calculate);
      await expect(c.main.getByText('27.7 / 1863', { exact: true })).toBeVisible();
    });
  });
  await chain.step(3, (qa) => TC_APP013_040({ page, qa }));
  chain.stopAsPlanned(4);
});
