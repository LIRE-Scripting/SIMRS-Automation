import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { LAB } from '../../../lib/lab-data';
import { SampleWorkflowPage, WorklistPage } from '../../../pages/lab/LabPages';
import { advance, catalogue, cellsOf, certified, labelOf, labType, order, press, qc, resulted, toastsAfter, work } from '../../modules/11-laboratory/helpers';

/**
 * E2E-046: the test X-HB with its reference range is set up and gets its
 * daily QC value; an order is created and its sample rejected; a resulted
 * order is reviewed and certified, then rectified; further orders take the
 * exceptions retest, recollect, panic, culture and send-out. The site keeps
 * the order's result type as free text, so the orders are not tied to X-HB.
 */
chainTest('E2E-046', async ({ page, chain }) => {
  await installToastRecorder(page);
  const w = new WorklistPage(page);

  const test = await chain.step(1, async (qa) => {
    const c = catalogue(page);
    const code = qa.code('X-HB');
    await qa.step(1, async () => {
      await page.goto('/id/laboratory');
      await page.getByRole('complementary').getByRole('link', { name: 'Specimens' }).first().click();
      await expect(c.main.getByRole('heading', { level: 1, name: 'Specimens and tests' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await c.kind.selectOption('test');
      await c.code.fill(code);
      await c.name.fill(qa.name('X Hemoglobin'));
      expect(await press(page, c.saveMaster)).toContain('Saved');
      await expect(c.main.getByText(new RegExp(code))).toBeVisible();
    });
    await qa.step(3, async () => {
      await c.test.fill(code);
      await c.low.fill('12');
      await c.high.fill('16');
      await c.unit.fill('g/dL');
      expect(await press(page, c.saveRange)).toContain('Saved');
    });
    await qa.step(4, async () => {
      const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
      await w.press(await w.row(type), 'Capture result', w.capture);
      const offered = await w.field('Result range').getAttribute('list');
      qa.note(4, `"Result range" offers ${offered ? 'a list' : 'no list'}; the order's result type is free text, so the test is not linked to it`);
    });
    return code;
  });

  await chain.step(2, async (qa) => {
    const q = qc(page);
    await qa.step(1, async () => {
      await new SampleWorkflowPage(page).open();
      await expect(q.rows.first().or(page.getByRole('main').getByText('No QC line today.'))).toBeVisible();
    });
    await qa.step(2, async () => {
      await q.test.fill(test);
      await q.value.fill('13.2');
      expect(await press(page, q.save)).toContain('Saved');
      await expect(q.rows.filter({ hasText: test })).toHaveCount(1);
    });
    qa.note(2, `the QC value is for the test ${test} of step 1`);
  });

  const rejectType = await chain.step(3, async (qa) => {
    const t = labType(qa);
    const d = page.getByRole('dialog', { name: 'Create lab order' });
    await qa.step(1, async () => {
      await page.goto('/id/apps');
      await page.getByRole('link', { name: /^Laboratory\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Open worklist' }).click();
      await expect(w.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await w.main.getByRole('button', { name: 'New lab order' }).click();
      await expect(d.getByRole('textbox', { name: 'Result type' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await d.getByRole('textbox', { name: 'Result type' }).fill(t);
      await d.getByRole('textbox', { name: 'Remarks' }).fill(LAB.remark);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Create' }).click();
      expect(await toastsAfter(page, mark)).toContain('Lab order created');
    });
    await qa.step(4, async () => expect((await cellsOf(page, t)).slice(0, 3)).toEqual(['—', t, 'Ordered']));
    return t;
  });

  await chain.step(4, async (qa) => {
    // Precondition: the sample of the order of step 3 was sent and has no result.
    await advance(page, rejectType, ['Generated', 'Sent']);
    const label = await labelOf(page, rejectType);
    await qa.step(1, async () => expect((await work(page, label, 'Reject', { Reason: qa.prefix('X sampel lisis') })).toasts).toContain('Saved'));
    await qa.step(2, async () => expect((await cellsOf(page, rejectType))[5].toLowerCase()).toContain('reject'));
  });

  const certifiedLabel = await chain.step(5, async (qa) => {
    const s = new SampleWorkflowPage(page);
    const type = await resulted(page, qa);
    const label = await labelOf(page, type);
    await qa.step(1, async () => {
      await page.goto('/id/laboratory');
      await page.getByRole('complementary').getByRole('link', { name: 'Workflow' }).first().click();
      await expect(s.heading).toBeVisible();
    });
    await qa.step(2, async () => expect((await work(page, label, 'Review')).toasts).toContain('Saved'));
    await qa.step(3, async () => expect((await work(page, label, 'Certify')).toasts).toContain('Saved'));
    await qa.step(4, async () => expect((await cellsOf(page, type))[5].toLowerCase()).toContain('certif'));
    return label;
  });

  await chain.step(6, async (qa) => {
    await qa.step(1, async () => {
      const r = await work(page, certifiedLabel, 'Rectify');
      expect(r.toasts).toContain('Saved');
      qa.note(1, `the order certified in step 5, after Rectify: "${r.line}"`);
    });
    await qa.step(2, async () => {
      for (const a of ['Retest', 'Recollect'] as const) expect((await work(page, await certified(page, qa), a)).toasts).toContain('Saved');
    });
    await qa.step(3, async () => {
      const type = await resulted(page, qa);
      const r = await work(page, await labelOf(page, type), 'Panic');
      expect(r.toasts).toContain('Saved');
      qa.note(3, `line after Panic: "${r.line}"`);
    });
  });

  await chain.step(7, async (qa) => {
    const a = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
    const b = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
    await qa.step(1, async () => expect((await work(page, await labelOf(page, a), 'Culture', { 'Culture note': qa.prefix('X tidak ada pertumbuhan 48 jam') })).toasts).toContain('Saved'));
    await qa.step(2, async () => expect((await work(page, await labelOf(page, b), 'Send out', { 'External lab': qa.prefix('X Lab Rujukan') })).toasts).toContain('Saved'));
  });
});
