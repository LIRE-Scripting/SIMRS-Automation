import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { Patients } from '../15-emergency/helpers';
import { triageSteps, walkInSteps } from './emergency-steps';

/**
 * E2E-005: a walk-in is registered, received and triaged; the bed dialog
 * opens, and steps 2-6 of TC-APP015-040 are blocked by checklist blocker 13 (as
 * in the module spec), so the chain stops at step 3.
 */
chainTest('E2E-005', async ({ page, chain }) => {
  await installToastRecorder(page);
  const pt = await chain.step(1, (qa) => walkInSteps(page, qa));
  await chain.step(2, (qa) => triageSteps(page, qa, pt.fullName));
  await chain.step(3, async (qa) => {
    const p = new Patients(page);
    await qa.step(1, async () => {
      const d = await p.openRow(pt.fullName, 'Bed');
      for (const f of ['Ward', 'Bed type', 'Status', 'Gender']) await expect(d.getByRole('combobox', { name: f })).toBeVisible();
      qa.note(1, `beds offered: ${(await d.getByRole('listitem').allInnerTexts()).join(' / ') || 'none'}`);
    });
    qa.blocked(2, 13);
  });
});
