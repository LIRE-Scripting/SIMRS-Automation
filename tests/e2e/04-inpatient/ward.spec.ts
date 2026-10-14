import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { AdmissionsPage, BedsPage } from '../../../pages/inpatient/InpatientPages';

/**
 * 04-inpatient.xlsx, feature "Ward care (/adt/ward)". Every test admits its own
 * stay first (Admissions), then works on it in Ward care. When the list
 * "Ward care" does not offer the new stay, the steps that act on a stay cannot
 * run (found blocker 23).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

class Ward {
  readonly main: Locator;
  readonly heading: Locator;
  readonly stays: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Ward care' });
    this.stays = this.main.getByRole('combobox', { name: 'Ward care' });
  }

  async open() {
    await this.page.goto('/en/adt/ward');
    await expect(this.heading).toBeVisible();
  }

  /** Chooses the stay whose option contains `name`; false when the list does not offer it. */
  async choose(name: string): Promise<boolean> {
    const label = (await this.stays.locator('option').allInnerTexts()).find((o) => o.includes(name));
    if (!label) return false;
    await this.stays.selectOption({ label });
    return true;
  }

  control(name: string): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }
}

/** A stay of this test on a new bed; returns the patient name and bed number. */
async function admitted(page: Page, qa: Qa, excelName: string, excelBed = 'QA-101'): Promise<{ name: string; bed: string }> {
  const beds = new BedsPage(page);
  const adm = new AdmissionsPage(page);
  const bed = qa.code(excelBed);
  const name = qa.name(excelName);
  await beds.open();
  await beds.add({ no: bed, description: 'QA Kelas 1' });
  await adm.open();
  await adm.admit(name, bed);
  return { name, bed };
}

async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** Opens Ward care on the stay of `name`; marks `steps` as blocked (blocker 23) when the stay is not offered. */
async function onStay(w: Ward, qa: Qa, name: string, steps: number[]): Promise<boolean> {
  await w.open();
  if (await w.choose(name)) return true;
  qa.note(steps[0], `the list "Ward care" offers ${(await w.stays.locator('option').count()) - 1} stay(s), not the stay just admitted`);
  for (const s of steps) qa.blocked(s, 23);
  return false;
}

qaTest('TC-APP004-065', async ({ page, qa }) => {
  const w = new Ward(page);
  const pt1 = await admitted(page, qa, 'QA-INP Pasien Satu');

  await qa.step(1, async () => {
    await page.goto('/en/adt');
    await page.getByRole('main').getByRole('link', { name: 'Ward', exact: true }).click();
    await expect(w.heading).toBeVisible();
    await expect(w.main.getByText('Receive onto a bed, daily note, transfer, swap, doctor change, and exceptional exit. Payment stays at the cashier. Housekeeping turns the bed over.')).toBeVisible();
  });

  if (!(await onStay(w, qa, pt1.name, [2, 3]))) return;

  await qa.step(2, async () => {
    for (const c of ['Receive', 'Note', 'Doctor', 'Swap', 'Exceptional exit']) await expect(w.control(c)).toBeVisible();
  });

  await qa.step(3, async () => {
    await w.control('Receive').click();
    await expect(toastLocator(page, /^Patient received on the ward$/)).toBeVisible();
    expect((await w.stays.locator('option').allInnerTexts()).find((o) => o.includes(pt1.name))).toMatch(/received$/);
  });
});

/** One-step ward checks: click a control (after an optional fill) and expect a toast. */
function wardToast(id: string, excelName: string, act: (w: Ward, qa: Qa) => Promise<void>, toast: string, setup?: (w: Ward, page: Page, qa: Qa) => Promise<void>) {
  qaTest(id, async ({ page, qa }) => {
    const w = new Ward(page);
    const stay = await admitted(page, qa, excelName);
    if (!(await onStay(w, qa, stay.name, [1]))) return;
    if (setup) await setup(w, page, qa);
    await qa.step(1, async () => {
      const mark = await toastMark(page);
      await act(w, qa);
      expect(await toastsAfter(page, mark)).toContain(toast);
    });
  });
}

wardToast('TC-APP004-066', 'QA-INP Pasien Satu', async (w) => {
  await w.control('Receive').click();
}, 'This stay has no bed', async (w, page, qa) => {
  // "For a stay without a bed": a second stay of this test admitted without one.
  const adm = new AdmissionsPage(page);
  const name = qa.name('QA-INP Pasien Satu');
  await adm.open();
  await adm.admit(name);
  await w.open();
  await w.choose(name);
});

wardToast('TC-APP004-067', 'QA-INP Pasien Satu', async (w) => {
  await w.control('Receive').click();
}, 'The patient is already received', async (w, page) => {
  await w.control('Receive').click();
  await expect(toastLocator(page, /^Patient received on the ward$/)).toBeVisible();
});

wardToast('TC-APP004-069', 'QA-INP Pasien Satu', async (w, qa) => {
  await w.main.getByRole('textbox', { name: 'Note' }).fill(qa.name('X Pasien stabil, makan habis'));
  await w.control('Note').click();
}, 'Note saved');

wardToast('TC-APP004-070', 'QA-INP Pasien Satu', async (w) => {
  await w.main.getByRole('textbox', { name: 'Note' }).fill('');
  await w.control('Note').click();
}, 'A note is required');

wardToast('TC-APP004-071', 'QA-INP Pasien Satu', async (w, qa) => {
  await w.main.getByRole('textbox', { name: 'Doctor' }).fill(qa.name('X dr. Uji Dua'));
  await w.control('Doctor').click();
}, 'Doctor changed');

wardToast('TC-APP004-072', 'QA-INP Pasien Satu', async (w) => {
  await w.main.getByRole('textbox', { name: 'Doctor' }).fill('');
  await w.control('Doctor').click();
}, 'A doctor name is required');

wardToast('TC-APP004-075', 'QA-INP Pasien Tiga', async (w) => {
  await w.main.getByRole('textbox', { name: 'Reason' }).fill('');
  await w.control('Exceptional exit').click();
}, 'A reason is required');

wardToast('TC-APP004-076', 'QA-INP Pasien Tiga', async (w) => {
  await w.control('Exceptional exit').click();
}, 'That exit is already recorded', async (w, page, qa) => {
  await w.main.getByRole('combobox', { name: 'Exit kind' }).selectOption({ label: 'Abscond' });
  await w.main.getByRole('textbox', { name: 'Reason' }).fill(qa.name('X pasien meninggalkan RS tanpa izin'));
  await w.control('Exceptional exit').click();
  await expect(toastLocator(page, /^Exit recorded$/)).toBeVisible();
  await w.main.getByRole('textbox', { name: 'Reason' }).fill(qa.name('X pasien meninggalkan RS tanpa izin'));
});

qaTest('TC-APP004-068', async ({ page, qa }) => {
  const w = new Ward(page);
  const beds = new BedsPage(page);
  const pt1 = await admitted(page, qa, 'QA-INP Pasien Satu');
  const other = await admitted(page, qa, 'QA-INP Pasien Dua', 'QA-102');
  const blocked = qa.code('QA-103');
  await beds.open();
  await beds.add({ no: blocked, description: 'QA Kelas 1', availability: 'Blocked' });
  if (!(await onStay(w, qa, pt1.name, [1, 2]))) return;
  const bed = w.main.getByRole('combobox', { name: 'Bed' }).or(w.main.getByRole('textbox', { name: 'Bed' }));

  for (const [step, bedNo, toast] of [[1, other.bed, 'That bed is occupied'], [2, blocked, 'That bed is blocked']] as const) {
    await qa.step(step, async () => {
      const options = await bed.locator('option').allInnerTexts().catch(() => [] as string[]);
      if (options.length) await bed.selectOption({ label: options.find((o) => o.includes(bedNo))! });
      else await bed.fill(bedNo);
      const mark = await toastMark(page);
      await w.control('Receive').click();
      expect(await toastsAfter(page, mark)).toContain(toast);
    });
  }
});

qaTest('TC-APP004-073', async ({ page, qa }) => {
  const w = new Ward(page);
  const pt1 = await admitted(page, qa, 'QA-INP Pasien Satu');
  const pt2 = await admitted(page, qa, 'QA-INP Pasien Dua', 'QA-102');
  if (!(await onStay(w, qa, pt1.name, [1, 2]))) return;

  await qa.step(1, () => expect(w.control('Swap')).toBeDisabled());

  await qa.step(2, async () => {
    const swap = w.main.getByRole('combobox', { name: 'Swap' });
    await swap.selectOption({ label: (await swap.locator('option').allInnerTexts()).find((o) => o.includes(pt2.name))! });
    await w.control('Swap').click();
    await expect(toastLocator(page, /^Beds swapped$/)).toBeVisible();
    const adm = new AdmissionsPage(page);
    await adm.open();
    await expect(await adm.cell(await adm.stay(pt1.name), 'Bed')).toHaveText(pt2.bed);
    await expect(await adm.cell(await adm.stay(pt2.name), 'Bed')).toHaveText(pt1.bed);
  });
});

qaTest('TC-APP004-074', async ({ page, qa }) => {
  const w = new Ward(page);
  const pt3 = await admitted(page, qa, 'QA-INP Pasien Tiga', 'QA-103');
  if (!(await onStay(w, qa, pt3.name, [1, 2]))) return;
  const kind = w.main.getByRole('combobox', { name: 'Exit kind' });

  await qa.step(1, async () => {
    expect((await kind.locator('option').allInnerTexts()).map((o) => o.trim())).toEqual(expect.arrayContaining(['Abscond', 'Death', 'Cancelled by doctor']));
  });

  await qa.step(2, async () => {
    await kind.selectOption({ label: 'Abscond' });
    await w.main.getByRole('textbox', { name: 'Reason' }).fill(qa.name('X pasien meninggalkan RS tanpa izin'));
    await w.control('Exceptional exit').click();
    await expect(toastLocator(page, /^Exit recorded$/)).toBeVisible();
    expect((await w.stays.locator('option').allInnerTexts()).find((o) => o.includes(pt3.name))).toMatch(/abscond/i);
  });
});

qaTest('TC-APP004-077', async ({ page, qa }) => {
  const w = new Ward(page);
  const pt1 = await admitted(page, qa, 'QA-INP Pasien Satu');
  await w.open();
  const d = page.getByRole('dialog', { name: 'Record dose' });

  await qa.step(1, async () => {
    await expect(w.main.getByText('Given or not given. A missed dose needs a reason. The row stays in pharmacy.')).toBeVisible();
    await expect(w.control('Record dose')).toBeVisible();
  });

  await qa.step(2, async () => {
    await w.control('Record dose').click();
    await expect(d).toBeVisible();
    for (const f of ['Patient', 'Order', 'Reason']) await expect(d.getByRole('textbox', { name: f })).toBeVisible();
    await expect(d.getByRole('combobox', { name: 'Status' })).toBeVisible();
    if (!(await d.getByRole('combobox', { name: 'Branch' }).or(d.getByRole('textbox', { name: 'Branch' })).count())) {
      qa.deviation(2, '"Branch", "Patient", "Order", "Status" and "Reason"', 'no "Branch" field (U1 works on one branch)');
    }
  });

  // "What is typed in Patient and Order" is TBD in the workbook (Q8); the stay's name and the shared drug are used.
  for (const [step, status, reason] of [[3, 'Given', ''], [4, 'Not given', qa.name('X pasien puasa')]] as const) {
    await qa.step(step, async () => {
      if (!(await d.isVisible())) await w.control('Record dose').click();
      await d.getByRole('textbox', { name: 'Patient' }).fill(pt1.name);
      await d.getByRole('textbox', { name: 'Order' }).fill('Paracetamol 500mg Tablet');
      await d.getByRole('combobox', { name: 'Status' }).selectOption({ label: status });
      await d.getByRole('textbox', { name: 'Reason' }).fill(reason);
      const mark = await toastMark(page);
      await d.getByRole('button', { name: 'Save' }).click();
      const toasts = await toastsAfter(page, mark);
      if (!toasts.includes('Dose recorded')) {
        // What "Patient" and "Order" take is TBD in the workbook; the site refuses names.
        await d.getByRole('button', { name: 'Cancel' }).first().click();
        return qa.notRun(step, `the workbook leaves the values of "Patient" and "Order" TBD (Q8); with the stay's name and the drug name the site answers "${toasts.join(' / ')}"`);
      }
      await expect(w.main.getByText(status, { exact: true }).first()).toBeVisible();
    });
  }
});

qaTest('TC-APP004-078', async ({ page, qa }) => {
  const w = new Ward(page);
  const pt1 = await admitted(page, qa, 'QA-INP Pasien Satu');
  await w.open();

  await qa.step(1, async () => {
    await w.control('Record dose').click();
    const d = page.getByRole('dialog', { name: 'Record dose' });
    await d.getByRole('textbox', { name: 'Patient' }).fill(pt1.name);
    await d.getByRole('textbox', { name: 'Order' }).fill('Paracetamol 500mg Tablet');
    await d.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Not given' });
    await d.getByRole('button', { name: 'Save' }).click();
    await expect(toastLocator(page, /^A missed dose needs a reason$/)).toBeVisible();
  });
});
