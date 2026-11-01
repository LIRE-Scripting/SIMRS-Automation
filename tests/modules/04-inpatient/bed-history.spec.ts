import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';

/**
 * 04-inpatient.xlsx, "History of a patient's beds" (TC-APP004-036): PT-1 is
 * admitted on BED-1, moved to BED-2 and then to BED-3; the nurse looks for
 * the earlier beds on the stay, and the Audit Log is read for the transfers.
 * The journey names a superadmin (U10) for the Audit Log; it is open to the
 * administrator U1 (seen 2026-11-01), who does both (lib/qa-data/plan.ts).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP004-036', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  const beds = new BedsPage(page);
  const nos = [qa.bed('QA-101'), qa.bed('QA-102'), qa.bed('QA-103')];
  for (const no of nos) {
    await beds.open();
    await beds.add({ no, description: 'QA Kelas 1' });
  }
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name, nos[0]);
  for (const to of nos.slice(1)) {
    await adm.open();
    await (await adm.stay(name)).getByRole('button', { name: 'Transfer' }).click();
    const d = page.getByRole('dialog', { name: 'Transfer bed' });
    await adm.pickBed(d.getByRole('combobox', { name: 'New bed' }), to);
    await d.getByRole('button', { name: 'Transfer' }).click();
    await expect(toastLocator(page, /^Transferred$/)).toBeVisible();
  }

  await qa.step(1, async () => {
    await adm.open();
    const row = await adm.stay(name);
    await expect(await adm.cell(row, 'Bed')).toHaveText(nos[2]);
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    const buttons = (await row.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    const earlier = nos.slice(0, 2).filter((b) => text.includes(b));
    qa.note(1, `the row of ${name}: "${text.slice(0, 160)}"; buttons: ${buttons.join(', ')}`);
    if (earlier.length < 2 && !buttons.some((b) => /history|moves|riwayat/i.test(b))) {
      qa.deviation(1, 'The list of moves with times', `the stay shows only its current bed ${nos[2]}: no earlier bed (${nos[0]}, ${nos[1]}) and no history on the row`);
    }
  });

  await qa.step(2, async () => {
    await page.goto('/id/audit');
    await page.getByRole('textbox', { name: 'Module' }).fill('adt');
    await page.getByRole('textbox', { name: 'Action' }).fill('admission.transfer');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    const rows = page.locator('table tbody tr').filter({ has: page.locator('td:nth-child(2)') });
    await expect(rows.first()).toContainText('admission.transfer');
    const latest = (await rows.allInnerTexts()).slice(0, 2).map((r) => r.replace(/\s+/g, ' ').trim());
    qa.note(2, `the newest admission.transfer entries: ${latest.join(' | ')}`);
    if (!latest.some((r) => nos.some((b) => r.includes(b)))) {
      qa.deviation(2, 'Each entry shows the bed left, the bed taken and the time', 'the entries show the time, the action, the module and the user only: no bed left, no bed taken (an entry cannot be opened)');
    }
  });
});
