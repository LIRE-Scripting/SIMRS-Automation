import { chainTest, expect } from '../../../fixtures/chain';
import { SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { attach, Patients, pdf, WALKED_IN, walkInName } from '../../modules/15-emergency/helpers';
import { createRequest, docNo, hits, issue, records, requests } from '../../modules/16-mrd/helpers';

/**
 * E2E-025: a walk-in brought to the emergency room is registered and received;
 * the same patient's arrival is flagged as a medico-legal case (the flag is
 * kept: the chain uses steps 1-3 of TC-APP001-077), the evidence file is
 * attached to the encounter, and the patient's medical record is requested,
 * issued with its movement and returned.
 */
chainTest('E2E-025', async ({ page, chain }) => {
  await installToastRecorder(page);
  const p = new Patients(page);
  const arrival = new ArrivalPage(page);

  const pt = await chain.step(1, async (qa) => {
    const name = walkInName(qa);
    await qa.step(1, async () => {
      await p.open();
      await expect(p.main.getByRole('button', { name: 'Walk-in ER', exact: true })).toBeVisible();
    });
    await qa.step(2, async () => {
      await p.main.getByRole('button', { name: 'Walk-in ER', exact: true }).click();
      await expect(p.dialog.getByRole('textbox', { name: 'Name' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await p.dialog.getByRole('textbox', { name: 'Name' }).fill(name);
      await p.dialog.getByRole('spinbutton', { name: 'Estimated age (years)' }).fill('25');
      await p.dialog.getByRole('combobox').selectOption({ label: 'IGD' });
      await p.dialog.getByRole('combobox').locator('xpath=following::input[1]').fill(qa.prefix('X IGD 1'));
      expect(await p.click(p.dialog.getByRole('button', { name: 'Receive' }))).toContain(WALKED_IN);
    });
    let mrn = '';
    await qa.step(4, async () => {
      const row = await p.row(name, 'Emergency OP Patients');
      for (const b of ['Triage', 'Bed', 'Consultant', 'Outcome', 'Attach file']) await expect(row.getByRole('button', { name: b, exact: true })).toBeVisible();
      mrn = (await row.innerText()).match(/MRN-\d{4}-[0-9A-F]{8}/)?.[0] ?? '';
      expect(mrn, 'a new MRN on the row').not.toBe('');
    });
    return { fullName: name, mrn };
  });

  await chain.step(2, async (qa) => {
    // Precondition: the patient has an arrival number today (Arrival in DEP-1).
    await arrival.open();
    await arrival.arrive(pt.fullName, SHARED.dep1.name);
    const row = arrival.row(pt.fullName, SHARED.dep1.name);
    const d = page.getByRole('dialog', { name: 'Set MLC' });
    await qa.step(1, async () => {
      await expect(await arrival.cell(row, 'MLC')).toHaveText('—');
      await expect(row.getByRole('button', { name: 'Set MLC' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await row.getByRole('button', { name: 'Set MLC' }).click();
      await expect(d.getByRole('textbox', { name: 'Reason' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await d.getByRole('textbox', { name: 'Reason' }).fill(qa.name('QA cedera lalu lintas'));
      await d.getByRole('button', { name: /^(Save|Set MLC)$/ }).click();
      await expect(toastLocator(page, /^MLC updated$/)).toBeVisible();
      await expect(await arrival.cell(row, 'MLC')).toHaveText('MLC');
    });
  });

  await chain.step(3, async (qa) => {
    await qa.step(1, async () => {
      const d = await p.openRow(pt.fullName, 'Attach file');
      await expect(d.getByRole('button', { name: 'Attach file' })).toBeDisabled();
      await d.getByRole('button', { name: 'Close' }).first().click();
    });
    await qa.step(2, async () => {
      expect(await attach(p, pt.fullName, pdf(100, 'qa-visum.pdf'), qa.prefix('X Surat rujukan'))).toContain('File attached.');
    });
    await qa.step(3, async () => qa.note(3, 'no screen lists the files of an encounter'));
  });

  await chain.step(4, async (qa) => {
    const s = requests(page);
    const no = docNo(qa, 'QA-REQ-001');
    const purpose = 'QA Kontrol poli penyakit dalam';
    await qa.step(1, async () => {
      await page.goto('/id/apps');
      await page.getByRole('link', { name: /^MRD\b/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'File Requests' }).first().click();
      await expect(s.main.getByRole('heading', { level: 1, name: 'Patient File Requests' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await s.main.getByRole('button', { name: 'New request' }).click();
      await expect(s.dialog.getByRole('textbox', { name: 'Document date' })).toHaveValue(todayWib());
      await s.dialog.getByRole('button', { name: 'Cancel' }).click();
    });
    await qa.step(3, async () => expect(await createRequest(s, { no, purpose })).toContain('File request created'));
    await qa.step(4, async () => {
      const c = await s.cells(await s.row(no));
      expect([c[0], c[1], c[2]]).toEqual([no, todayWib(), purpose]);
    });
  });

  const issued = await chain.step(5, async (qa) => {
    const s = records(page);
    const no = docNo(qa, 'QA-MR-001');
    await qa.step(1, async () => s.open());
    await qa.step(2, async () => {
      await s.main.getByRole('button', { name: 'Issue record' }).click();
      await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeDisabled();
    });
    await qa.step(3, async () => {
      await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(pt.fullName);
      await s.dialog.getByRole('button', { name: 'Find' }).click();
      await expect(hits(s).filter({ hasText: pt.mrn })).toHaveCount(1);
    });
    await qa.step(4, async () => {
      await hits(s).filter({ hasText: pt.mrn }).click();
      await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeEnabled();
    });
    await qa.step(5, async () => {
      await s.dialog.getByRole('textbox', { name: 'Document number' }).fill(no);
      await s.dialog.getByRole('textbox', { name: 'Remarks' }).fill('QA Poli penyakit dalam');
      expect(await s.click(s.dialog.getByRole('button', { name: 'Issue' }))).toContain('Record issued');
    });
    await qa.step(6, async () => {
      const c = await s.cells(await s.row(no));
      expect([c[0], c[3]]).toEqual([no, 'Issued']);
      expect(c[2]).toContain(pt.mrn);
    });
    return no;
  });

  await chain.step(6, async (qa) => {
    const s = records(page);
    const no = docNo(qa, 'QA-MR');
    const shelf = qa.prefix('X Rak A-12');
    const clinic = qa.prefix('X Poli Penyakit Dalam');
    await qa.step(1, async () => s.open());
    await qa.step(2, async () => {
      await s.main.getByRole('button', { name: 'Issue record' }).click();
      for (const f of ['From', 'To']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
      await s.dialog.getByRole('button', { name: 'Cancel' }).click();
    });
    await qa.step(3, async () => expect(await issue(s, { patient: pt, no, from: shelf, to: clinic })).toContain('Record issued'));
    await qa.step(4, async () => {
      await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
      await expect(s.dialog).toContainText(shelf);
      await s.dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click();
    });
    await qa.step(5, async () => {
      await (await s.row(no)).getByRole('button', { name: 'Return' }).click();
      await expect(s.dialog.getByRole('textbox', { name: 'From' })).toBeVisible();
    });
    await qa.step(6, async () => {
      await s.dialog.getByRole('textbox', { name: 'From' }).fill(clinic);
      await s.dialog.getByRole('textbox', { name: 'To' }).fill(shelf);
      expect(await s.click(s.dialog.getByRole('button', { name: 'Return' }))).toContain('Record returned');
    });
    await qa.step(7, async () => {
      await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
      await expect(s.dialog).toContainText('Returned');
    });
  });

  await chain.step(7, async (qa) => {
    const s = records(page);
    await qa.step(1, async () => {
      await (await s.row(issued)).getByRole('button', { name: 'Return' }).click();
      expect(await s.click(s.dialog.getByRole('button', { name: 'Return' }))).toContain('Record returned');
    });
    await qa.step(2, async () => expect((await s.cells(await s.row(issued)))[3]).toBe('Returned'));
  });
});
