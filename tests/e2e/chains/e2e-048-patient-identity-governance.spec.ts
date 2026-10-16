import { chainTest, expect } from '../../../fixtures/chain';
import { bookSettings, claimDDay, ensureMasterData, releaseWeek, SHARED } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark } from '../../../lib/assertions';
import { AppointmentsPage, whenText } from '../../../pages/ambulatory/AppointmentsPage';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { CONFIRMED, para, sell, stock, toastsAfter } from '../../modules/05-pharmacy/helpers';
import { hits, records, docNo } from '../../modules/16-mrd/helpers';

/**
 * E2E-048: patients are found and read (PT-1 … PT-3); a duplicate registration
 * of PT-DUP-A (PT-DUP-B, with a booking) is merged into it; the survivor's
 * registration is renewed, its pharmacy issues are looked up after a sale to
 * it, and its medical record is issued. Steps 2 to 5 work on the survivor.
 */
chainTest('E2E-048', async ({ page, chain }) => {
  await installToastRecorder(page);
  const reg = new RegisteredPatientsPage(page);

  await chain.step(1, async (qa) => {
    const token = qa.token();
    await reg.open();
    const pt1 = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Satu ${token}`, dateOfBirth: '1990-05-17' });
    await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Dua ${token}` });
    await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Tiga ${token}` });
    await reg.open();
    await qa.step(1, async () => {
      await expect(reg.rows()).toHaveCount(10);
      await expect(await reg.cell(reg.rows().first(), 'Full name')).toHaveText(`QA-AMB Pasien Tiga ${token}`);
    });
    await qa.step(2, async () => {
      await reg.search('pasien sat');
      await expect(reg.row(pt1.fullName)).toHaveCount(1);
    });
    await qa.step(3, async () => {
      await reg.search(pt1.mrn.slice(-4), 'enter');
      await expect(reg.row(pt1.fullName)).toHaveCount(1);
    });
    await qa.step(4, async () => {
      const d = await reg.openDetails(pt1.fullName);
      await expect(d.getByText(pt1.mrn, { exact: true })).toBeVisible();
      await expect(reg.detail(d, 'Merged')).toHaveText('No');
    });
    await qa.step(5, async () => {
      await reg.detailsDialog(pt1.fullName).getByRole('button', { name: 'Close' }).last().click();
      await reg.search('');
      await reg.nextPageButton.click();
      await expect(reg.pagingSummary).toHaveText(/^Showing 11–20 of \d+$/);
    });
  });

  const survivor = await chain.step(2, async (qa) => {
    const token = qa.token();
    await reg.open();
    const a = await reg.register({ firstName: 'QA-AMB Pasien', lastName: `Ganda ${token}`, dateOfBirth: '1985-03-02' });
    await reg.search('');
    const bReg = await reg.openRegister();
    await reg.fillRegister({ firstName: 'QA-AMB Pasien', lastName: `Ganda ${token}`, dateOfBirth: '1985-03-02' }, bReg);
    await reg.registerButton(bReg).click();
    await expect(toastLocator(page, /^Patient registered$/)).toBeVisible();
    await reg.search(`Ganda ${token}`);
    await expect(reg.rows()).toHaveCount(2);
    const mrns = await Promise.all((await reg.rows().all()).map(async (r) => (await (await reg.cell(r, 'MRN')).innerText()).trim()));
    const b = { mrn: mrns.find((m) => m !== a.mrn)! };
    // Precondition "PT-DUP-B has one booked appointment": booked with DR-1 on a claimed D-day.
    await ensureMasterData(page);
    const dDay = await claimDDay(page);
    try {
      const appts = new AppointmentsPage(page);
      await appts.open();
      const book = await appts.openBook();
      await appts.pick(appts.field(book, 'Patient'), `Ganda ${token}`, b.mrn);
      await appts.fillBook({ patient: b.mrn, department: SHARED.dep1.name, resource: SHARED.dr1.name, type: bookSettings().types[0].name, date: dDay, time: '08:00' }, book);
      await appts.submitBook(book).click();
      await expect(toastLocator(page, /^Appointment booked$/)).toBeVisible();
      await reg.open();
      const d = reg.mergeDialog();
      await qa.step(1, async () => {
        await reg.mergeButton.click();
        await expect(d.getByRole('button', { name: 'Merge' })).toBeDisabled();
      });
      await qa.step(2, async () => {
        await reg.pickFrom(d.getByRole('textbox', { name: 'Survivor' }), `Ganda ${token}`, a.mrn, d);
        await expect(d.getByRole('textbox', { name: 'Survivor' })).toHaveValue(`${a.mrn} ${a.fullName}`);
      });
      await qa.step(3, async () => {
        await reg.pickFrom(d.getByRole('textbox', { name: 'Duplicate' }), `Ganda ${token}`, b.mrn, d);
        await expect(d.getByRole('button', { name: 'Merge' })).toBeEnabled();
      });
      await qa.step(4, async () => {
        await d.getByRole('button', { name: 'Merge' }).click();
        await expect(toastLocator(page, /^Patients merged$/)).toBeVisible();
      });
      await qa.step(5, async () => {
        await reg.search(`Pasien Ganda ${token}`);
        await expect(reg.rows()).toHaveCount(1);
        await expect(await reg.cell(reg.rows().first(), 'MRN')).toHaveText(a.mrn);
      });
      await qa.step(6, async () => {
        await appts.open();
        await appts.showRange(dDay);
        const row = (await appts.allRowTexts()).find((r) => r.Patient === a.fullName && r.When === whenText(dDay, '08:00'));
        expect(row, 'the booking of PT-DUP-B').toBeDefined();
        if (row!.MRN !== a.mrn) qa.deviation(6, "The appointment now shows PT-DUP-A's name and MRN", `the appointment still shows PT-DUP-B's MRN ${row!.MRN}`);
      });
    } finally {
      await releaseWeek(page, dDay);
    }
    return a;
  });

  await chain.step(3, async (qa) => {
    await reg.open();
    await reg.search(survivor.fullName);
    let before = '';
    await qa.step(1, async () => {
      await expect(reg.table.getByRole('columnheader', { name: 'Valid until' })).toBeVisible();
      before = (await (await reg.cell(reg.row(survivor.fullName), 'Valid until')).innerText()).trim();
    });
    await qa.step(2, async () => {
      const d = await reg.openDetails(survivor.fullName);
      await expect(d.getByRole('button', { name: 'Renew' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await reg.detailsDialog(survivor.fullName).getByRole('button', { name: 'Renew' }).click();
      await expect(toastLocator(page, /^Registration renewed$/)).toBeVisible();
    });
    await qa.step(4, async () => {
      await reg.detailsDialog(survivor.fullName).getByRole('button', { name: 'Close' }).last().click();
      await reg.search(survivor.fullName);
      await expect.poll(async () => (await (await reg.cell(reg.row(survivor.fullName), 'Valid until')).innerText()).trim()).not.toBe(before);
    });
  });

  await chain.step(4, async (qa) => {
    // Precondition "has at least one dispensed item": a sale of QA-PARA to the survivor.
    await stock(page, qa);
    expect(await sell(page, survivor, [{ item: para }])).toContain(CONFIRMED);
    const main = page.getByRole('main');
    const lookUp = async (text: string) => {
      await main.getByRole('textbox', { name: 'Patient' }).fill(text);
      const mark = await toastMark(page);
      await main.getByRole('button', { name: 'Look up' }).click();
      await toastsAfter(page, mark);
      return (await main.innerText()).replace(/\s+/g, ' ');
    };
    await qa.step(1, async () => {
      await page.goto('/en/pharmacy');
      await page.getByRole('navigation', { name: 'Pharmacy' }).getByRole('link', { name: 'Patient issues' }).click();
      await expect(main.getByText('Nothing here yet.', { exact: true })).toBeVisible();
    });
    await qa.step(2, async () => {
      const seen: string[] = [];
      for (const typed of [survivor.fullName, survivor.mrn]) {
        const listed = (await lookUp(typed)).includes(para.name);
        seen.push(`"${typed}": ${listed ? 'lists the item' : 'Nothing here yet.'}`);
        if (listed) break;
      }
      qa.note(2, seen.join('; '));
      if (!seen.some((s) => s.includes('lists the item'))) qa.deviation(2, 'The block lists item names with the issued quantity', `nothing is listed for the name or the MRN`);
    });
    await qa.step(3, async () => expect(await lookUp(`QA-PHA Nobody ${qa.token()}`)).toContain('Nothing here yet.'));
  });

  await chain.step(5, async (qa) => {
    const s = records(page);
    const no = docNo(qa, 'QA-MR-001');
    await qa.step(1, async () => s.open());
    await qa.step(2, async () => {
      await s.main.getByRole('button', { name: 'Issue record' }).click();
      await expect(s.dialog.getByRole('button', { name: 'Issue' })).toBeDisabled();
    });
    await qa.step(3, async () => {
      await s.dialog.getByRole('textbox', { name: 'Search by name or MRN…' }).fill(survivor.fullName);
      await s.dialog.getByRole('button', { name: 'Find' }).click();
      await expect(hits(s).filter({ hasText: survivor.mrn })).toHaveCount(1);
    });
    await qa.step(4, async () => {
      await hits(s).filter({ hasText: survivor.mrn }).click();
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
      expect(c[2]).toContain(survivor.mrn);
    });
  });
});
