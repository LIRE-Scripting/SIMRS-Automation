import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage, DischargesPage } from '../../../pages/inpatient/InpatientPages';
import { toastsOf } from '../shared/access';
import { setChainActive } from '../shared/workflow';

/**
 * 04-inpatient.xlsx, "Discharge when the approval chain is missing or
 * switched off" (TC-APP004-041). The chain "discharge" of Workflow is
 * switched off by U1 (the superadmin of the journey) only for steps 1 and 2
 * and switched on again whatever happens, so other discharges of the site are
 * held up for as short a time as possible. Run it on its own (workers=1).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP004-041', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const beds = new BedsPage(page);
  const bed = qa.bed('QA-101');
  await beds.open();
  await beds.add({ no: bed, description: 'QA Kelas 1' });
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, bed);
  await adm.open();
  await adm.markBillingCleared(await adm.stay(name));
  const d = page.getByRole('dialog', { name: 'Discharge' });

  const off = await setChainActive(page, 'discharge', false);
  qa.note(1, `precondition: the chain "discharge" switched off in Workflow by U1 ("${off.join(' / ') || 'saved'}")`);
  try {
    await qa.step(1, async () => {
      await adm.open();
      await (await adm.stay(name)).getByRole('button', { name: 'Discharge' }).click();
      await expect(d).toBeVisible();
      const text = (await d.innerText()).replace(/\s+/g, ' ');
      qa.note(1, `the dialog: "${text.slice(0, 200)}"`);
      if (/Configured chain has \d+ steps/.test(text) || !/chain|rantai|approval|persetujuan/i.test(text)) {
        qa.deviation(1, 'The dialog says that no approval chain is active', `the dialog still reads "${/Configured chain has \d+ steps[^.]*\./.exec(text)?.[0] ?? text.slice(0, 120)}"`);
      }
    });

    await qa.step(2, async () => {
      const toasts = await toastsOf(page, () => d.getByRole('button', { name: 'Discharge', exact: true }).click());
      qa.note(2, `Discharge: "${toasts.join(' / ') || 'no toast'}"`);
      const recorded = toasts.some((t) => /^Discharge recorded/.test(t));
      if (recorded) {
        qa.deviation(2, 'Refused with the reason. The stay, the bed and the Discharges list are unchanged', `the discharge is recorded with the chain switched off: "${toasts.join(' / ')}"`);
        return;
      }
      if (!toasts.some((t) => /chain|rantai|approval|persetujuan/i.test(t))) {
        qa.deviation(2, 'Refused with the reason', `refused with "${toasts.join(' / ') || 'no text'}": the reason (no active approval chain) is not given`);
      }
      await page.keyboard.press('Escape');
      await adm.open();
      await expect(await adm.cell(await adm.stay(name), 'Bed')).toHaveText(bed);
      const dis = new DischargesPage(page);
      await dis.open();
      await expect(dis.main).not.toContainText(name);
    });
  } finally {
    await setChainActive(page, 'discharge', true);
  }

  await qa.step(3, async () => {
    await adm.open();
    const row = await adm.stay(name);
    const button = row.getByRole('button', { name: 'Discharge' });
    if (!(await button.count())) {
      qa.note(3, 'the stay was discharged in step 2: nothing is left to discharge after the chain is switched on');
      return;
    }
    await button.click();
    await d.getByRole('button', { name: 'Discharge', exact: true }).click();
    await expect(toastLocator(page, /^Discharge recorded — approval chain started$/)).toBeVisible();
  });
});
