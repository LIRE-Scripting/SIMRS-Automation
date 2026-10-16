import { chainTest, expect } from '../../../fixtures/chain';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { CLINICAL, PT1_DATE_OF_BIRTH } from '../../../lib/clinical-data';
import { addDays, todayWib } from '../../../lib/dates';
import { ConsultationPage } from '../../../pages/clinical/ConsultationPage';
import { RadOrdersPage, StudiesPage } from '../12-ris/helpers';

/** E2E-003: the radiology order written in the consultation of a new patient is scheduled, accepted and reported in RIS. */
chainTest('E2E-003', async ({ page, chain }) => {
  await installToastRecorder(page);
  const o = new RadOrdersPage(page);
  const s = new StudiesPage(page);

  const study = await chain.step(1, async (qa) => {
    const pt1 = await registerPatient(page, CLINICAL.pt1.name, qa.token(), PT1_DATE_OF_BIRTH);
    const c = new ConsultationPage(page);
    await c.openFor(pt1);
    const name = qa.name('QA Foto toraks PA');
    const field = c.panel.getByRole('textbox', { name: 'Study' });
    const create = c.panel.getByRole('button', { name: /^(Create radiology order|Creating…)$/ });
    await qa.step(1, async () => {
      await expect(field).toBeVisible();
      await expect(create).toBeVisible();
    });
    await qa.step(2, async () => {
      await field.fill(name);
      await create.click();
      await expect(toastLocator(page, /^Radiology order created\. It is worked on the radiology screen\.$/)).toBeVisible();
      await expect(field).toHaveValue('');
    });
    await qa.step(3, async () => {
      // The list holds the orders of every run (paged, no search): the order is looked up page by page.
      await expect(await new RadOrdersPage(page).row(name)).toHaveCount(1);
    });
    qa.note(1, `order "${name}" for a new test patient`);
    return name;
  });

  await chain.step(2, async (qa) => {
    await o.open();
    await qa.step(1, async () => {
      const c = await o.cells(await o.row(study));
      qa.note(1, `row: ${c.join(' | ')}`);
      expect(c[1]).toBe(study);
    });
    await qa.step(2, async () => {
      await s.open();
      await expect(s.order.locator('option').first()).toBeAttached();
      qa.note(2, `"Schedule and report" lists ${await s.order.locator('option').count()} orders`);
      await expect(s.order.locator('option', { hasText: study }), `the order "${study}" can be chosen in "Schedule and report"`).toBeAttached();
    });
    await qa.step(3, async () => {
      qa.note(3, `the order row: ${(await o.cells(await o.row(study))).join(' | ')}`);
    });
  });

  await chain.step(3, async (qa) => {
    // "Start" holds an ISO time in UTC: tomorrow 09:00 WIB is 02:00Z.
    const start = `${addDays(todayWib(), 1)}T02:00:00Z`;
    await qa.step(1, async () => {
      await page.goto('/en/radiology');
      await page.getByRole('complementary').getByRole('link', { name: 'Study schedule' }).first().click();
      await expect(s.main.getByRole('heading', { level: 1, name: 'Schedule and report' })).toBeVisible();
    });
    await qa.step(2, async () => expect(await s.act(study, 'Schedule', { Room: qa.code('X-RO1'), Start: start })).toContain('Saved'));
    await qa.step(3, async () => expect(await s.act(study, 'Accept')).toContain('Saved'));
    await qa.step(4, async () => expect(await s.act(study, 'Save report', { 'Report text': qa.prefix('X Tidak tampak kelainan') })).toContain('Saved'));
    await qa.step(5, async () => expect(await s.act(study, 'Attach', { 'File name': `${qa.code('X-thorax')}.pdf` })).toContain('Saved'));
    await qa.step(6, async () => {
      qa.note(6, `Schedule and report: "${await s.line(study)}"; Orders: ${(await o.cells(await o.row(study))).join(' | ')}`);
    });
  });
});
