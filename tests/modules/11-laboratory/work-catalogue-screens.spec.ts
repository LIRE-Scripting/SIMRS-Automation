import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { SampleWorkflowPage, WorklistPage } from '../../../pages/lab/LabPages';
import { backToEnglish, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { catalogue, cellsOf, certified, labelOf, order, press, qc, resulted, work } from './helpers';

/**
 * 11-laboratory.xlsx: hub and language (010), Specimens and tests (030 … 032),
 * Sample workflow (033 … 043), BMHP (046) and the screen check of every route
 * (047 … 051). The Sample workflow lists the ten newest orders by their sample
 * ID (or the first 8 characters of the order id); each test picks its own.
 */

// A step that waits for a missing element fails after 15 s instead of at the 6-minute test timeout.
test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToEnglish(page);
});

qaTest('TC-APP011-010', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const w = new WorklistPage(page);
  const tiles = ['Serviceorder', 'Sample', 'Accept Sample', 'Capture Result'];

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Laboratory\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Laboratory$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Laboratory' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Open worklist' })).toBeVisible();
    qa.deviation(1, 'A button "Open worklist"', '"Open worklist" is a link');
    await expect(main.getByRole('heading', { level: 2, name: 'Workflow' })).toBeVisible();
    for (const t of tiles) await expect(main.getByRole('link', { name: t, exact: true })).toBeVisible();
    qa.note(1, 'a fifth tile "BMHP" is shown too');
  });

  await qa.step(2, async () => {
    for (const t of tiles) {
      await page.goto('/en/laboratory');
      await main.getByRole('link', { name: t, exact: true }).click();
      await expect(w.heading).toBeVisible();
    }
  });

  await qa.step(3, async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/laboratory/orders');
    const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim();
    const buttons = (await main.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
    qa.note(3, `heading "${h1}"; buttons ${[...new Set(buttons)].slice(0, 8).join(', ')}`);
    if (h1 === 'Lab order worklist' || buttons.includes('New lab order')) qa.deviation(3, 'Headings, field names, buttons and toasts are Indonesian ("Worklist order lab", "Order lab baru", …)', `English: heading "${h1}"`);
  });
});

qaTest('TC-APP011-030', async ({ page, qa }) => {
  const c = catalogue(page);
  const code = qa.code('X-HB');
  const name = qa.name('X Hemoglobin');

  await qa.step(1, async () => {
    await page.goto('/en/laboratory');
    await page.getByRole('complementary').getByRole('link', { name: 'Specimens' }).first().click();
    await expect(c.main.getByRole('heading', { level: 1, name: 'Specimens and tests' })).toBeVisible();
    await expect(c.main.getByText('Lookup stays the sample id.', { exact: true })).toBeVisible();
    for (const l of [c.kind, c.code, c.name, c.test, c.low, c.high, c.unit]) await expect(l).toBeVisible();
  });

  await qa.step(2, async () => {
    await c.kind.selectOption('test');
    await c.code.fill(code);
    await c.name.fill(name);
    expect(await press(page, c.saveMaster)).toContain('Saved');
    await expect(c.main.getByText(new RegExp(code))).toBeVisible();
  });

  await qa.step(3, async () => {
    await c.test.fill(code);
    await c.low.fill('12');
    await c.high.fill('16');
    await c.unit.fill('g/dL');
    expect(await press(page, c.saveRange)).toContain('Saved');
    qa.note(3, `the block reads: ${(await c.main.innerText()).replace(/\s+/g, ' ').match(new RegExp(`[^·]*${code}[^·]*`, 'g'))?.join(' · ')}`);
  });

  await qa.step(4, async () => {
    const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
    const w = new WorklistPage(page);
    await w.press(await w.row(type), 'Capture result', w.capture);
    const offered = await w.field('Result range').getAttribute('list');
    qa.note(4, `"Result range" offers ${offered ? 'a list' : 'no list'}; the order's result type is free text, so the test "${code}" is not linked to it`);
  });
});

qaTest('TC-APP011-031', async ({ page, qa }) => {
  const c = catalogue(page);
  await qa.step(1, async () => {
    await page.goto('/en/laboratory/catalogue');
    await c.kind.selectOption('test');
    await c.code.fill('');
    await c.name.fill(qa.name('X Hemoglobin'));
    const toasts = await press(page, c.saveMaster);
    expect(toasts).not.toContain('Saved');
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
});

qaTest('TC-APP011-032', async ({ page, qa }) => {
  const c = catalogue(page);
  const code = qa.code('X-HB');
  await page.goto('/en/laboratory/catalogue');
  await c.kind.selectOption('test');
  await c.code.fill(code);
  await c.name.fill(qa.name('X Hemoglobin'));
  expect(await press(page, c.saveMaster)).toContain('Saved');
  for (const [step, low, high] of [[1, '16', '12'], [2, '12', '12']] as const) {
    await qa.step(step, async () => {
      await page.goto('/en/laboratory/catalogue');
      await c.test.fill(code);
      await c.low.fill(low);
      await c.high.fill(high);
      await c.unit.fill('g/dL');
      const toasts = await press(page, c.saveRange);
      expect(toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}"`);
    });
  }
});

qaTest('TC-APP011-033', async ({ page, qa }) => {
  const s = new SampleWorkflowPage(page);
  const type = await resulted(page, qa);
  const label = await labelOf(page, type);

  await qa.step(1, async () => {
    await page.goto('/en/laboratory');
    await page.getByRole('complementary').getByRole('link', { name: 'Workflow' }).first().click();
    await expect(s.heading).toBeVisible();
    await expect(s.main.getByText(/^Sign and print stay on the handover dialog\./)).toBeVisible();
    await expect(s.main.getByText(/Other service centers stay in their own modules\.$/)).toBeVisible();
    for (const i of ['Reason', 'Culture note', 'External lab'] as const) await expect(s.input(i)).toBeVisible();
    for (const b of ['Reject', 'Review', 'Certify', 'Rectify', 'Retest', 'Recollect', 'Panic', 'Culture', 'Send out', 'Revert latest stamp'] as const) await expect(s.button(b)).toBeVisible();
    await expect(s.main.getByRole('heading', { level: 2, name: 'Daily QC' })).toBeVisible();
  });

  await qa.step(2, async () => {
    const r = await work(page, label, 'Review');
    expect(r.toasts).toContain('Saved');
    qa.note(2, `line after Review: "${r.line}"`);
  });

  await qa.step(3, async () => {
    const r = await work(page, label, 'Certify');
    expect(r.toasts).toContain('Saved');
    qa.note(3, `line after Certify: "${r.line}"`);
  });

  await qa.step(4, async () => {
    const status = (await cellsOf(page, type))[5];
    expect(status.toLowerCase()).toContain('certif');
  });
});

qaTest('TC-APP011-034', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
    const r = await work(page, await labelOf(page, type), 'Review');
    expect(r.toasts).not.toContain('Saved');
    qa.note(1, `text shown: "${r.toasts.join(' / ') || 'none'}" (the server refuses with "result required")`);
  });
  await qa.step(2, async () => {
    const type = await order(page, qa, ['Generated']);
    const r = await work(page, await labelOf(page, type), 'Certify');
    expect(r.toasts).not.toContain('Saved');
    qa.note(2, `text shown: "${r.toasts.join(' / ') || 'none'}" (the server refuses with "accepted order required")`);
  });
});

qaTest('TC-APP011-035', async ({ page, qa }) => {
  const type = await order(page, qa, ['Generated', 'Sent']);
  const label = await labelOf(page, type);
  await qa.step(1, async () => {
    const r = await work(page, label, 'Reject', { Reason: qa.prefix('X sampel lisis') });
    expect(r.toasts).toContain('Saved');
    qa.note(1, `line after Reject: "${r.line}"`);
  });
  await qa.step(2, async () => {
    const status = (await cellsOf(page, type))[5];
    expect(status.toLowerCase()).toContain('reject');
  });
});

qaTest('TC-APP011-036', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const type = await order(page, qa, ['Generated', 'Sent']);
    const r = await work(page, await labelOf(page, type), 'Reject', { Reason: '' });
    expect(r.toasts).not.toContain('Saved');
    if (!r.toasts.includes('A rejection needs a reason')) qa.deviation(1, 'Toast "A rejection needs a reason"', `toast "${r.toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const type = await resulted(page, qa);
    const r = await work(page, await labelOf(page, type), 'Reject', { Reason: qa.prefix('X sampel lisis') });
    expect(r.toasts).not.toContain('Saved');
    qa.note(2, `text shown: "${r.toasts.join(' / ') || 'none'}" (the server refuses with "result stored")`);
  });
});

qaTest('TC-APP011-037', async ({ page, qa }) => {
  await qa.step(1, async () => {
    const r = await work(page, await certified(page, qa), 'Rectify');
    expect(r.toasts).toContain('Saved');
    qa.note(1, `line after Rectify: "${r.line}"`);
  });
  await qa.step(2, async () => {
    for (const a of ['Retest', 'Recollect'] as const) {
      const r = await work(page, await certified(page, qa), a);
      expect(r.toasts).toContain('Saved');
      qa.note(2, `line after ${a}: "${r.line}"`);
    }
  });
  await qa.step(3, async () => {
    const type = await resulted(page, qa);
    const r = await work(page, await labelOf(page, type), 'Panic');
    expect(r.toasts).toContain('Saved');
    qa.note(3, `line after Panic: "${r.line}"; worklist row: ${(await cellsOf(page, type)).slice(0, 7).join(' | ')}`);
  });
});

qaTest('TC-APP011-038', async ({ page, qa }) => {
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  const label = await labelOf(page, type);
  for (const [step, action, server] of [[1, 'Rectify', 'certify or a stored result'], [2, 'Panic', 'panic needs a stored result']] as const) {
    await qa.step(step, async () => {
      const r = await work(page, label, action);
      expect(r.toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${r.toasts.join(' / ') || 'none'}" (the server refuses with "${server}")`);
    });
  }
});

qaTest('TC-APP011-039', async ({ page, qa }) => {
  const a = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  const b = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  await qa.step(1, async () => {
    const r = await work(page, await labelOf(page, a), 'Culture', { 'Culture note': qa.prefix('X tidak ada pertumbuhan 48 jam') });
    expect(r.toasts).toContain('Saved');
    qa.note(1, `line: "${r.line}"`);
  });
  await qa.step(2, async () => {
    const r = await work(page, await labelOf(page, b), 'Send out', { 'External lab': qa.prefix('X Lab Rujukan') });
    expect(r.toasts).toContain('Saved');
    qa.note(2, `line: "${r.line}"`);
  });
});

qaTest('TC-APP011-040', async ({ page, qa }) => {
  const type = await order(page, qa, ['Generated', 'Sent', 'Accepted']);
  const label = await labelOf(page, type);
  for (const [step, action, input, server] of [[1, 'Culture', 'Culture note', 'culture note required'], [2, 'Send out', 'External lab', 'external lab required']] as const) {
    await qa.step(step, async () => {
      const r = await work(page, label, action, { [input]: '' });
      expect(r.toasts).not.toContain('Saved');
      qa.note(step, `text shown: "${r.toasts.join(' / ') || 'none'}" (the server refuses with "${server}")`);
    });
  }
});

qaTest('TC-APP011-041', async ({ page, qa }) => {
  const type = await resulted(page, qa);
  const label = await labelOf(page, type);
  expect((await work(page, label, 'Review')).toasts).toContain('Saved');
  qa.note(1, 'the last step of the order is "Review", made just before');
  await qa.step(1, async () => {
    const r = await work(page, label, 'Revert latest stamp');
    expect(r.toasts).toContain('Saved');
    qa.note(1, `line after the revert: "${r.line}"; worklist Result status "${(await cellsOf(page, type))[5]}"`);
  });
});

qaTest('TC-APP011-042', async ({ page, qa }) => {
  const q = qc(page);
  const test = qa.code('X-HB');
  await qa.step(1, async () => {
    await new SampleWorkflowPage(page).open();
    await expect(q.rows.first().or(page.getByRole('main').getByText('No QC line today.'))).toBeVisible();
    qa.note(1, 'the block lists QC lines of earlier days too, not only today');
  });
  await qa.step(2, async () => {
    await q.test.fill(test);
    await q.value.fill('13.2');
    expect(await press(page, q.save)).toContain('Saved');
    await expect(q.rows.filter({ hasText: test })).toHaveCount(1);
    await expect(q.test).toHaveValue('');
  });
});

qaTest('TC-APP011-043', async ({ page, qa }) => {
  const q = qc(page);
  const test = qa.code('X-HB');
  await new SampleWorkflowPage(page).open();
  await q.test.fill(test);
  await q.value.fill('13.2');
  expect(await press(page, q.save)).toContain('Saved');
  await qa.step(1, async () => {
    await q.test.fill(test);
    await q.value.fill('13.4');
    const toasts = await press(page, q.save);
    expect(toasts).not.toContain('Saved');
    if (!toasts.includes('That test already has a value today')) qa.deviation(1, 'Toast "That test already has a value today"', `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    await q.test.fill(qa.code('X-HB'));
    await q.value.fill('');
    const toasts = await press(page, q.save);
    expect(toasts).not.toContain('Saved');
    qa.note(2, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "qc needs a test and a value")`);
  });
});

qaTest('TC-APP011-046', async ({ page, qa }) => {
  await qa.step(1, async () => {
    await page.goto('/en/laboratory');
    await page.getByRole('main').getByRole('link', { name: 'BMHP', exact: true }).click();
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'BMHP' })).toBeVisible();
    await expect(
      page.getByRole('main').getByText('A lab result consumes the standard bill of material. Physical variance stays out of the fee pool, and the monthly report keeps it separate from net revenue.', { exact: true }),
    ).toBeVisible();
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP011-047', '/laboratory', 'Laboratory'],
  ['TC-APP011-048', '/laboratory/bmhp', 'BMHP'],
  ['TC-APP011-049', '/laboratory/catalogue', 'Specimens and tests'],
  ['TC-APP011-050', '/laboratory/orders', 'Lab order worklist'],
  ['TC-APP011-051', '/laboratory/work', 'Sample workflow'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}

