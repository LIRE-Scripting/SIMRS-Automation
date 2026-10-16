import { chainTest, expect } from '../../../fixtures/chain';
import { SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { ArrivalPage } from '../../../pages/ambulatory/ArrivalPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { createRequest, docNo, hits, issue, records, requests } from '../../modules/16-mrd/helpers';

/**
 * E2E-018: the patient registered in step 1 arrives in DEP-1 (precondition of
 * TC-APP016-040), is listed as a visit pending a document, gets the document
 * on the visit, and has the medical record file requested, issued, moved and
 * returned.
 */
chainTest('E2E-018', async ({ page, chain }) => {
  await installToastRecorder(page);
  const arrival = new ArrivalPage(page);
  const main = page.getByRole('main');
  const pendingList = async () => {
    await page.goto('/en/mrd');
    await page.getByRole('complementary').getByRole('link', { name: 'Visits without a document' }).first().click();
    await expect(main.getByRole('heading', { level: 1, name: 'Outpatient visits without a document' })).toBeVisible();
  };

  const pt = await chain.step(1, async (qa) => {
    const reg = new RegisteredPatientsPage(page);
    const last = `Satu ${qa.token()}`;
    const dob = '1990-05-17';
    let before = 0;
    await qa.step(1, async () => {
      await page.goto('/en/apps');
      await page.getByRole('link', { name: /Ambulatory Care/ }).first().click();
      await page.getByRole('main').getByRole('link', { name: 'New Registration' }).click();
      await expect(reg.heading).toBeVisible();
      before = await reg.tabCount(reg.registeredTab);
    });
    await qa.step(2, async () => {
      const d = await reg.openRegister();
      await expect(reg.visitTypeSelect(d)).toHaveValue(/outpatient/i);
    });
    await qa.step(3, async () => {
      const d = reg.registerDialog();
      await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: last, dateOfBirth: dob }, d);
      await reg.registerButton(d).click();
      await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
      await expect(d).toBeHidden();
    });
    const fullName = `QA-AMB Pasien ${last}`;
    let mrn = '';
    await qa.step(4, async () => {
      const row = reg.rows().first();
      await expect(await reg.cell(row, 'Full name')).toHaveText(fullName);
      mrn = (await (await reg.cell(row, 'MRN')).innerText()).trim();
      expect(mrn).toMatch(new RegExp(`^MRN-${todayWib().slice(0, 4)}-[0-9A-F]{8}$`));
    });
    await qa.step(5, async () => expect.poll(() => reg.tabCount(reg.registeredTab)).toBe(before + 1));
    return { mrn, fullName };
  });

  await chain.step(2, async (qa) => {
    // Precondition: an outpatient arrival of the patient, without a document.
    await arrival.open();
    await arrival.arrive(pt.fullName, SHARED.dep1.name);
    qa.note(1, `the patient of step 1 arrived in ${SHARED.dep1.name}`);
    await qa.step(1, async () => {
      await pendingList();
      await expect(main.getByText('The document itself is recorded on the registration visit.', { exact: true })).toBeVisible();
      await expect(main.getByRole('columnheader')).toHaveText(['Visit', 'Patient', 'Arrived', 'Pending']);
    });
    await qa.step(2, async () => {
      const row = main.getByRole('row').filter({ hasText: pt.mrn });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(pt.fullName);
      await expect(row).toContainText('Pending');
      qa.note(2, `row: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
    });
    await qa.step(3, async () => {
      const url = page.url();
      await main.getByRole('row').filter({ hasText: pt.mrn }).click();
      await expect(page).toHaveURL(url);
      qa.note(3, 'clicking the row stays on the list (no link to the visit)');
    });
  });

  await chain.step(3, async (qa) => {
    await arrival.open();
    const row = arrival.row(pt.fullName, SHARED.dep1.name);
    const d = page.getByRole('dialog', { name: 'Record document' });
    await qa.step(1, async () => {
      await row.getByRole('button', { name: 'Record document' }).click();
      await expect(d.getByRole('textbox', { name: 'Document title' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await d.getByRole('textbox', { name: 'Document title' }).fill(qa.name('QA Surat rujukan'));
      await d.getByRole('button', { name: /^(Save|Record|Record document)$/ }).click();
      await expect(toastLocator(page, /^Document recorded on this visit$/)).toBeVisible();
      await expect(d).toBeHidden();
    });
    await qa.step(3, async () => {
      await expect(row).toHaveCount(1);
      qa.note(3, `the arrival row shows: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
    });
  });

  await chain.step(4, async (qa) => {
    await qa.step(4, async () => {
      await pendingList();
      const left = await main.getByRole('row').filter({ hasText: pt.mrn }).count();
      qa.note(4, left ? 'the visit is still listed after its document was recorded' : 'the visit has left the list after its document was recorded');
    });
  });

  await chain.step(5, async (qa) => {
    const s = requests(page);
    const no = docNo(qa, 'QA-REQ-001');
    const purpose = 'QA Kontrol poli penyakit dalam';
    await qa.step(1, async () => {
      await page.goto('/en/apps');
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
      expect(c[c.length - 1]).toBe('Yes');
    });
  });

  const issued = await chain.step(6, async (qa) => {
    const s = records(page);
    const no = docNo(qa, 'QA-MR-001');
    await qa.step(1, async () => {
      await s.open();
      await expect(s.main.getByRole('button', { name: 'Issue record' })).toBeVisible();
    });
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
      await expect(s.dialog).toContainText(pt.mrn);
      await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeEnabled();
    });
    await qa.step(5, async () => {
      await s.dialog.getByRole('textbox', { name: 'Document number' }).fill(no);
      await s.dialog.getByRole('textbox', { name: 'Remarks' }).fill('QA Poli penyakit dalam');
      expect(await s.click(s.dialog.getByRole('button', { name: 'Issue' }))).toContain('Record issued');
    });
    await qa.step(6, async () => {
      const row = await s.row(no);
      const c = await s.cells(row);
      expect([c[0], c[1], c[3]]).toEqual([no, todayWib(), 'Issued']);
      expect(c[2]).toContain(pt.mrn);
      await expect(row.getByRole('button', { name: 'Return' })).toBeVisible();
    });
    return no;
  });

  await chain.step(7, async (qa) => {
    const s = records(page);
    const no = docNo(qa, 'QA-MR');
    const shelf = qa.prefix('X Rak A-12');
    const clinic = qa.prefix('X Poli Penyakit Dalam');
    await qa.step(1, async () => {
      await page.goto('/en/mrd');
      await page.getByRole('complementary').getByRole('link', { name: 'Patient Records' }).first().click();
      await expect(s.main.getByRole('heading', { level: 1, name: 'Patient Records' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await s.main.getByRole('button', { name: 'Issue record' }).click();
      for (const f of ['From', 'To']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
      await s.dialog.getByRole('button', { name: 'Cancel' }).click();
    });
    await qa.step(3, async () => {
      expect(await issue(s, { patient: pt, no, from: shelf, to: clinic })).toContain('Record issued');
      await expect((await s.row(no)).getByRole('button', { name: 'Movement' })).toBeVisible();
    });
    await qa.step(4, async () => {
      await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
      await expect(s.dialog).toContainText('Issued');
      await expect(s.dialog).toContainText(shelf);
      await expect(s.dialog).toContainText(clinic);
      await s.dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click();
    });
    await qa.step(5, async () => {
      await (await s.row(no)).getByRole('button', { name: 'Return' }).click();
      for (const f of ['From', 'To']) await expect(s.dialog.getByRole('textbox', { name: f })).toBeVisible();
    });
    await qa.step(6, async () => {
      await s.dialog.getByRole('textbox', { name: 'From' }).fill(clinic);
      await s.dialog.getByRole('textbox', { name: 'To' }).fill(shelf);
      expect(await s.click(s.dialog.getByRole('button', { name: 'Return' }))).toContain('Record returned');
      expect((await s.cells(await s.row(no)))[3]).toBe('Returned');
    });
    await qa.step(7, async () => {
      await (await s.row(no)).getByRole('button', { name: 'Movement' }).click();
      await expect(s.dialog).toContainText('Issued');
      await expect(s.dialog).toContainText('Returned');
    });
  });

  await chain.step(8, async (qa) => {
    const s = records(page);
    await qa.step(1, async () => {
      await (await s.row(issued)).getByRole('button', { name: 'Return' }).click();
      // A dialog "Return" with From and To opens first (as in TC-APP016-032).
      expect(await s.click(s.dialog.getByRole('button', { name: 'Return' }))).toContain('Record returned');
    });
    await qa.step(2, async () => {
      const row = await s.row(issued);
      expect((await s.cells(row))[3]).toBe('Returned');
      await expect(row.getByRole('button', { name: 'Return' })).toHaveCount(0);
    });
  });
});
