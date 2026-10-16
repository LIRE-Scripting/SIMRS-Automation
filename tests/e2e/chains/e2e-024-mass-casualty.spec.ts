import { chainTest, expect } from '../../../fixtures/chain';
import { installToastRecorder, toastLocator, toastMark } from '../../../lib/assertions';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';
import { toastsAfter, VisitsPage } from '../15-emergency/helpers';
import { bedWithId, patientIdOf } from '../shared/internal-ids';

/**
 * E2E-024: three victims are registered as one disaster batch; each gets an
 * emergency visit, the first is triaged (the third is put in a bay so the
 * list holds the three statuses), the visit list is read by priority, and the
 * first victim is admitted from the vacant-bed strip.
 */
const DESCRIPTION = 'QA Kelas 1';

chainTest('E2E-024', async ({ page, chain }) => {
  await installToastRecorder(page);
  const reg = new RegisteredPatientsPage(page);
  const v = new VisitsPage(page);

  const victims = await chain.step(1, async (qa) => {
    const token = qa.token();
    const names = ['Satu', 'Dua', 'Tiga'].map((n) => ({ first: 'QA-AMB Korban', last: `${n} ${token}` }));
    await reg.open();
    const d = await reg.openRegister();
    await qa.step(1, async () => {
      await reg.visitTypeSelect(d).selectOption('Disaster');
      await expect(d.getByRole('textbox', { name: 'Triage color' })).toBeVisible();
      await expect(d.getByRole('button', { name: 'Add patient' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await d.getByRole('textbox', { name: 'Triage color' }).fill('Merah');
      for (const i of [0, 1]) {
        await d.getByRole('textbox', { name: 'First name' }).nth(i).fill(names[i].first);
        await d.getByRole('textbox', { name: 'Last name' }).nth(i).fill(names[i].last);
      }
      await expect(d.getByRole('textbox', { name: 'Last name' }).nth(1)).toHaveValue(names[1].last);
    });
    await qa.step(3, async () => {
      await d.getByRole('button', { name: 'Add patient' }).click();
      await d.getByRole('textbox', { name: 'First name' }).nth(2).fill(names[2].first);
      await d.getByRole('textbox', { name: 'Last name' }).nth(2).fill(names[2].last);
    });
    await qa.step(4, async () => {
      await reg.registerButton(d).click();
      await expect(toastLocator(page, /^Disaster patients registered$/)).toBeVisible();
    });
    const out: { fullName: string; mrn: string }[] = [];
    await qa.step(5, async () => {
      await reg.search(token);
      await expect(reg.rows()).toHaveCount(3);
      for (const r of await reg.rows().all()) {
        await expect(await reg.cell(r, 'Visit')).toHaveText('Disaster');
        out.push({ fullName: (await (await reg.cell(r, 'Full name')).innerText()).trim(), mrn: (await (await reg.cell(r, 'MRN')).innerText()).trim() });
      }
      expect(new Set(out.map((x) => x.mrn)).size).toBe(3);
    });
    await qa.step(6, async () => {
      const det = await reg.openDetails(`QA-AMB Korban Satu ${token}`);
      await expect(reg.detail(det, 'Triage color')).toHaveText('Merah');
    });
    // Victim one first, as named in the batch.
    return names.map((n) => out.find((o) => o.fullName === `${n.first} ${n.last}`)!);
  });

  const ids = await chain.step(2, async (qa) => {
    const list: string[] = [];
    for (const p of victims) list.push(await patientIdOf(page, p.mrn));
    // The search of Registered patients is still settling: wait before leaving the screen.
    await page.waitForLoadState('networkidle').catch(() => {});
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
      await d.getByRole('textbox', { name: 'Patient ID (UUID)' }).fill(list[0]);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Create' }).click();
      expect(await toastsAfter(page, mark)).toContain('Visit created');
    });
    await qa.step(4, async () => {
      const c = await v.cells(await v.row(list[0]));
      expect([c[0], c[1].replace('…', ''), c[5]]).toEqual(['1', list[0].slice(0, 8), 'Awaiting triage']);
    });
    for (const id of list.slice(1)) expect(await v.create(id)).toContain('Visit created');
    qa.note(4, 'victims two and three got their visits the same way');
    return list;
  });

  await chain.step(3, async (qa) => {
    await qa.step(1, async () => expect(await v.act(ids[0], 'Triage')).toContain('Triage recorded'));
    await qa.step(2, async () => {
      const row = await v.row(ids[0]);
      expect((await v.cells(row)).slice(0, 1).concat((await v.cells(row))[5])).toEqual(['2', 'Triaged']);
    });
  });

  await chain.step(4, async (qa) => {
    // Precondition: visits in the three states; victim three is triaged and put in a bay of this run.
    expect(await v.act(ids[2], 'Triage')).toContain('Triage recorded');
    const bed = await bedWithId(page, qa.code('X-IGD-01'));
    expect(await v.assignBay(ids[2], bed.id)).toContain('Bay assigned');
    qa.note(1, 'the three victims: awaiting triage (two), triaged (one), in a bay (three)');
    await qa.step(1, async () => {
      await v.open();
      await expect(v.table.getByRole('columnheader')).toHaveText(['Priority', 'Patient', 'Bed', 'Triage at', 'From', 'Status', 'Actions']);
    });
    await qa.step(2, async () => {
      const prios = await v.rows().evaluateAll((rs) => rs.map((r) => Number(r.querySelector('td')?.textContent ?? '0')));
      expect(prios).toEqual([...prios].sort((a, b) => a - b));
    });
    await qa.step(3, async () => {
      const states: string[] = [];
      for (const id of ids) states.push((await v.cells(await v.row(id)))[5]);
      expect(states).toEqual(['Triaged', 'Awaiting triage', 'In bay']);
    });
  });

  await chain.step(5, async (qa) => {
    const adm = new AdmissionsPage(page);
    const beds = new BedsPage(page);
    const bed2 = qa.code('QA-102');
    await beds.open();
    await beds.add({ no: bed2, description: DESCRIPTION });
    const name = victims[0].fullName;
    await adm.open();
    await qa.step(1, async () => {
      await expect(adm.main.getByText('Tap to admit into this bed.')).toBeVisible();
      await expect(adm.stripCard(bed2)).toHaveText(new RegExp(`${bed2}\\s*${DESCRIPTION}`));
    });
    await qa.step(2, async () => {
      await adm.stripCard(bed2).click();
      await expect(adm.wizard.getByRole('textbox', { name: 'Patient name' })).toBeVisible();
    });
    await qa.step(3, async () => {
      await adm.wizard.getByRole('textbox', { name: 'Patient name' }).fill(name);
      await adm.next();
      await expect(adm.wizard.getByRole('combobox', { name: 'Bed' })).toHaveValue(new RegExp(`${bed2}.*${DESCRIPTION}`));
    });
    await qa.step(4, async () => {
      await adm.next();
      await adm.wizard.getByRole('button', { name: 'Admit' }).click();
      await expect(toastLocator(page, /^Patient admitted$/)).toBeVisible();
      await expect(await adm.cell(await adm.stay(name), 'Bed')).toHaveText(bed2);
    });
    qa.note(3, 'the admission takes the name of victim one (the dialog asks for a name, not a registered patient)');
  });
});
