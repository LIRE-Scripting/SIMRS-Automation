import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { addDays, todayWib } from '../../../lib/dates';
import { LAB } from '../../../lib/lab-data';
import { RIS } from '../../../lib/ris-data';
import { WorklistPage } from '../../../pages/lab/LabPages';
import { CashierPage } from '../../../pages/billing/CashierPage';
import { advance, cellsOf, labType, toastsAfter } from '../../modules/11-laboratory/helpers';
import { RadOrdersPage, StudiesPage } from '../../modules/12-ris/helpers';
import { pay } from '../../modules/14-hospital-accounts/helpers';
import { attach, encounter, Patients, patient, pdf, VisitsPage } from '../../modules/15-emergency/helpers';
import { bedWithId } from '../../modules/shared/internal-ids';

/**
 * E2E-022: an emergency visit of a registered patient is triaged and put in a
 * bay; the lab test and the radiology study of the visit are ordered and
 * resulted; the encounter gets its file and is closed; the walk-in charge is
 * paid. The site does not link these records: the lab and radiology orders
 * carry no patient, and a registered patient cannot be received on Emergency
 * Patients (TC-APP015-031 steps 3-6, blocker 13), so the encounter of steps
 * 8 and 9 is the walk-in of this run, as in the module spec.
 */
chainTest('E2E-022', async ({ page, chain }) => {
  await installToastRecorder(page);
  const v = new VisitsPage(page);
  const w = new WorklistPage(page);

  const pt = await chain.step(1, async (qa) => {
    const p = await patient(page, qa);
    const d = page.getByRole('dialog', { name: 'Create visit' });
    await qa.step(1, async () => {
      await v.open();
      await expect(v.main.getByRole('button', { name: 'Create visit' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await v.main.getByRole('button', { name: 'Create visit' }).click();
      await expect(d.getByRole('textbox', { name: 'Patient ID (UUID)' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(p.id);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Create' }).click();
      expect(await toastsAfter(page, mark)).toContain('Visit created');
    });
    await qa.step(4, async () => {
      const c = await v.cells(await v.row(p.id));
      expect([c[0], c[1].replace('…', ''), c[2], c[3], c[5]]).toEqual(['1', p.id.slice(0, 8), '—', '—', 'Awaiting triage']);
    });
    return p;
  });

  await chain.step(2, async (qa) => {
    await qa.step(1, async () => expect(await v.act(pt.id, 'Triage')).toContain('Triage recorded'));
    await qa.step(2, async () => {
      const row = await v.row(pt.id);
      const c = await v.cells(row);
      expect([c[0], c[5]]).toEqual(['2', 'Triaged']);
      await expect(row.getByRole('button', { name: 'Assign bay', exact: true })).toBeVisible();
    });
  });

  await chain.step(3, async (qa) => {
    const bed = await bedWithId(page, qa.code('X-IGD-01'));
    qa.note(1, `BED-1 is a bed of this run (${bed.no}) made in Inpatient, Bed management`);
    const d = page.getByRole('dialog', { name: 'Assign bay' });
    await qa.step(1, async () => {
      await (await v.row(pt.id)).getByRole('button', { name: 'Assign bay', exact: true }).press('Enter');
      await expect(d.getByRole('textbox', { name: 'Bed ID (UUID)' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await d.getByRole('textbox', { name: 'Bed ID (UUID)' }).fill(bed.id);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Assign bay' }).click();
      expect(await toastsAfter(page, mark)).toContain('Bay assigned');
    });
    await qa.step(3, async () => {
      const row = await v.row(pt.id);
      const c = await v.cells(row);
      expect([c[2].replace('…', ''), c[5]]).toEqual([bed.id.slice(0, 8), 'In bay']);
      if (c[0] !== '4') qa.deviation(3, 'Priority 4', `Priority ${c[0]}`);
    });
  });

  const type = await chain.step(4, async (qa) => {
    const t = labType(qa);
    const d = page.getByRole('dialog', { name: 'Create lab order' });
    await qa.step(1, async () => {
      await page.goto('/en/apps');
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
    await qa.step(4, async () => {
      const c = await cellsOf(page, t);
      expect(c.slice(0, 5)).toEqual(['—', t, 'Ordered', '—', '—']);
    });
    qa.note(4, 'the lab order has no patient field: it is the order of this visit by its result type and token only');
    return t;
  });

  await chain.step(5, async (qa) => {
    // Precondition OR-ACC: the order of step 4 taken to "Accepted" (Generated, Sent, Accepted), as in the module spec.
    await advance(page, type, ['Generated', 'Sent', 'Accepted']);
    let sample = '';
    await qa.step(1, async () => {
      const row = await w.row(type);
      sample = (await w.cells(row))[0];
      await w.press(row, 'Capture result', w.capture);
      await expect(w.capture.getByText(`${type} · Accepted · ${sample}`, { exact: true })).toBeVisible();
    });
    await qa.step(2, async () => {
      await w.field('Lab result').fill(LAB.result);
      await w.field('Result range').fill(LAB.range);
      await w.field('Remarks').fill(LAB.note);
      const mark = await toastMark(page);
      await w.capture.getByRole('button', { name: 'Save result' }).click();
      expect(await toastsAfter(page, mark)).toContain('Result captured');
      await expect(w.capture.getByText(/Resulted/)).toBeVisible();
    });
    await qa.step(3, async () => {
      await w.capture.getByRole('button', { name: 'Cancel' }).click();
      const c = await cellsOf(page, type);
      expect([c[2], c[3], c[4], c[6]]).toEqual(['Resulted', LAB.result, LAB.range, LAB.note]);
    });
  });

  const o = new RadOrdersPage(page);
  const study = await chain.step(6, async (qa) => {
    const t = qa.token();
    const f = {
      ref: `${RIS.full.ref}-${t}`,
      acc: `${RIS.full.accession}-${t}`,
      study: `${RIS.full.study} ${t}`,
    };
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /^RIS\b|^Radiology/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Open orders' }).click();
      await expect(o.heading).toBeVisible();
    });
    await qa.step(2, async () => {
      await o.openNew();
      await expect(o.dialog.getByRole('textbox')).toHaveCount(8);
    });
    await qa.step(3, async () => {
      await o.fill({
        'Order ref': f.ref,
        'Accession no': f.acc,
        'Study description': f.study,
        'Study date': `${todayWib()}T${RIS.full.studyTime}`,
        'Reported by': RIS.full.reportedBy,
        'Reported date': `${todayWib()}T${RIS.full.reportedTime}`,
        'Image link': RIS.full.image,
        'Report link': RIS.full.report,
      });
      const mark = await toastMark(page);
      await o.dialog.getByRole('button', { name: 'Save' }).click();
      expect(await toastsAfter(page, mark)).toContain('Order created');
    });
    await qa.step(4, async () => {
      const c = await o.cells(await o.row(f.study));
      expect([c[0], c[1], c[3], c[4]]).toEqual([f.ref, f.study, f.acc, RIS.full.reportedBy]);
    });
    await qa.step(5, async () => {
      const row = await o.row(f.study);
      for (const [name, url] of [['Image', RIS.full.image], ['Report', RIS.full.report]] as const) {
        await expect(row.getByRole('link', { name, exact: true })).toHaveAttribute('href', url);
      }
    });
    return f.study;
  });

  await chain.step(7, async (qa) => {
    const s = new StudiesPage(page);
    const start = `${addDays(todayWib(), 1)}T02:00:00Z`;
    await qa.step(1, async () => {
      await page.goto('/en/radiology');
      await page.getByRole('complementary').getByRole('link', { name: 'Study schedule' }).first().click();
      await expect(s.main.getByRole('heading', { level: 1, name: 'Schedule and report' })).toBeVisible();
      qa.note(1, `"Schedule and report" lists ${await s.order.locator('option').count()} orders`);
    });
    await qa.step(2, async () => {
      await s.open();
      await expect(s.order.locator('option', { hasText: study }), `the order "${study}" of step 6 can be chosen in "Schedule and report"`).toBeAttached();
      expect(await s.act(study, 'Schedule', { Room: qa.code('X-RO1'), Start: start })).toContain('Saved');
    });
    await qa.step(3, async () => expect(await s.act(study, 'Accept')).toContain('Saved'));
    await qa.step(4, async () => expect(await s.act(study, 'Save report', { 'Report text': qa.prefix('X Tidak tampak kelainan') })).toContain('Saved'));
    await qa.step(5, async () => expect(await s.act(study, 'Attach', { 'File name': `${qa.code('X-thorax')}.pdf` })).toContain('Saved'));
    await qa.step(6, async () => qa.note(6, `Schedule and report: "${await s.line(study)}"`));
  });

  const p = new Patients(page);
  const walkIn = await chain.step(8, async (qa) => {
    const name = await encounter(p, qa);
    qa.note(1, `the open encounter is the walk-in "${name}" of this run (a registered patient cannot be received: TC-APP015-031, blocker 13)`);
    await qa.step(1, async () => {
      const d = await p.openRow(name, 'Attach file');
      await expect(d.getByRole('button', { name: 'Attach file' })).toBeDisabled();
      await d.getByRole('button', { name: 'Close' }).first().click();
    });
    await qa.step(2, async () => {
      expect(await attach(p, name, pdf(100, 'qa-surat-rujukan.pdf'), qa.prefix('X Surat rujukan'))).toContain('File attached.');
    });
    await qa.step(3, async () => qa.note(3, `the row: ${((await (await p.row(name)).innerText())).replace(/\s+/g, ' ')}; no screen lists the files`));
    return name;
  });

  await chain.step(9, async (qa) => {
    await qa.step(1, async () => {
      const d = await p.openRow(walkIn, 'Outcome');
      await d.getByRole('textbox', { name: 'Reason' }).last().fill(qa.prefix('X Pulang atas permintaan sendiri'));
      expect(await p.click(d.getByRole('button', { name: 'Close visit' }))).toContain('Saved.');
    });
    await qa.step(2, async () => {
      const d = await p.openRow(walkIn, 'Outcome');
      await expect(d.getByText('This encounter is closed and cannot be changed.')).toBeVisible();
    });
  });

  await chain.step(10, async (qa) => {
    const c = new CashierPage(page);
    let invoice = '';
    let cashBefore = 0;
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /^Hospital Accounts\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'Fast Cashier' }).first().click();
      await expect(c.heading).toBeVisible();
      await expect(c.closedBanner(), "the U1 cashier's day is open").toBeHidden();
      await expect.poll(() => c.systemCash(), { timeout: 5_000 }).toBeGreaterThan(0).catch(() => {});
      cashBefore = await c.systemCash();
    });
    await qa.step(2, async () => {
      await c.charge.fill('150000');
      await c.remark.fill('QA walk-in');
      await c.button('Create charge').click();
      await expect(c.bar).toContainText(/Draft\s*INV-/);
      invoice = (await c.barState()).invoice;
      expect(await c.barValue('Amount due')).toBe('Rp 166.500');
    });
    await qa.step(3, async () => {
      expect(await c.lines()).toEqual({ Gross: 'Rp 150.000', Discount: 'Rp 0', Tax: 'Rp 16.500', 'Patient net': 'Rp 166.500' });
    });
    await qa.step(4, async () => {
      await pay(page);
      expect((await c.barState()).status).toBe('Paid');
    });
    await qa.step(5, async () => {
      expect(await c.receiptValue('Invoice')).toBe(invoice);
      expect(await c.receiptValue('Status')).toBe('PAID');
    });
    await qa.step(6, async () => expect.poll(() => c.systemCash()).toBe(cashBefore + 166500));
    await qa.step(7, async () => {
      await c.button('New sale').click();
      await expect(c.bar).toContainText('No invoice selected');
    });
    qa.note(2, 'the charge is a walk-in charge: the cashier has no link to the emergency visit');
  });
});
