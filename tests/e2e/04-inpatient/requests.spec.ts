import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { authFileOf } from '../../../lib/config';

/**
 * 04-inpatient.xlsx, feature "Admission requests (/adt/requests)". Read from
 * the live screen on 2026-10-15: a block "Admission types" (a list to switch
 * between Admission types and Referrals, Code, Name, Active and a button that
 * reads "New request"), a block "New request" and the request list with a
 * "Reason" field above it. Codes "X-AT1"/"X-RF1" become "QA-AT1-<token>" (Q5).
 */

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

class Requests {
  readonly main: Locator;
  readonly heading: Locator;
  readonly masters: Locator;
  readonly form: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Admission requests' });
    // The first card is the master block (its heading follows its list: "Admission types" or "Referrals").
    this.masters = this.main.locator('section.card').first();
    this.form = this.main.getByRole('heading', { level: 2, name: 'New request', exact: true }).locator('xpath=..');
  }

  async open() {
    await this.page.goto('/en/adt/requests');
    await expect(this.heading).toBeVisible();
  }

  /** Adds an admission type or a referral in the first block; returns the toasts. */
  async addMaster(kind: 'Admission types' | 'Referrals', code: string, name: string, active = true): Promise<void> {
    await this.masters.getByRole('combobox').first().selectOption({ label: kind });
    await this.masters.getByRole('textbox', { name: 'Code' }).fill(code);
    await this.masters.getByRole('textbox', { name: 'Name' }).fill(name);
    await this.masters.getByRole('checkbox', { name: 'Active' }).setChecked(active);
    await this.masters.getByRole('button', { name: 'New request' }).click();
  }

  typeSelect(): Locator {
    return this.form.getByRole('combobox', { name: 'Admission types' });
  }

  /** Fills and sends a request; the type and referral are chosen by an option text containing them. */
  async request(r: { patient: string; type?: string; referral?: string; estimate?: string; note?: string }): Promise<void> {
    await this.form.getByRole('textbox', { name: 'Patient' }).fill(r.patient);
    if (r.type) await this.typeSelect().selectOption({ label: await optionLabel(this.typeSelect(), r.type) });
    if (r.referral) {
      const sel = this.form.getByRole('combobox', { name: 'Referrals' });
      await sel.selectOption({ label: await optionLabel(sel, r.referral) });
    }
    if (r.estimate) await this.form.getByRole('textbox', { name: 'Estimate (IDR)' }).fill(r.estimate);
    if (r.note) await this.form.getByRole('textbox', { name: 'Estimate note' }).fill(r.note);
    await this.form.getByRole('button', { name: 'New request' }).click();
  }

  requestItem(patient: string): Locator {
    return this.main.getByRole('listitem').filter({ hasText: patient });
  }

  reason(): Locator {
    return this.main.getByRole('textbox', { name: 'Reason' });
  }
}

/** The option of `select` that contains `text`; the lists load after the page, so this waits for it. */
async function optionLabel(select: Locator, text: string): Promise<string> {
  const option = select.locator('option').filter({ hasText: text }).first();
  await expect(option, `an option with "${text}"`).toBeAttached({ timeout: 15_000 });
  return (await option.innerText()).trim();
}

async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** An active admission type of this test (Preconditions: "An active admission type exists"). */
async function newType(r: Requests, qa: Qa): Promise<{ code: string; name: string }> {
  const t = { code: qa.code('X-AT1'), name: qa.name('X Elektif') };
  await r.addMaster('Admission types', t.code, t.name);
  await expect(toastLocator(r.page, /^Saved$/)).toBeVisible();
  await r.page.reload();
  return t;
}

const REQUEST = { estimate: '2500000', note: 'X estimasi 3 hari' };

qaTest('TC-APP004-056', async ({ page, qa }) => {
  const r = new Requests(page);
  const type = { code: qa.code('X-AT1'), name: qa.name('X Elektif') };
  const referral = { code: qa.code('X-RF1'), name: qa.name('X Dokter praktik') };

  await qa.step(1, async () => {
    await page.goto('/en/adt');
    await page.getByRole('main').getByRole('link', { name: 'Requests', exact: true }).click();
    await expect(r.heading).toBeVisible();
    await expect(r.main.getByText("Waiting list. The stay's admit time stays on the admission.")).toBeVisible();
    expect(await r.masters.getByRole('combobox').first().locator('option').allInnerTexts()).toEqual(['Admission types', 'Referrals']);
    for (const f of ['Code', 'Name']) await expect(r.masters.getByRole('textbox', { name: f })).toBeVisible();
    await expect(r.masters.getByRole('checkbox', { name: 'Active' })).toBeVisible();
    await expect(r.form).toBeVisible();
  });

  await qa.step(2, async () => {
    await r.addMaster('Admission types', type.code, type.name);
    await expect(toastLocator(page, /^Saved$/)).toBeVisible();
    await expect(r.masters.getByRole('listitem').filter({ hasText: type.code })).toContainText('Yes');
  });

  await qa.step(3, async () => {
    await r.addMaster('Referrals', referral.code, referral.name);
    await expect(toastLocator(page, /^Saved$/)).toBeVisible();
    await expect(r.masters.getByRole('listitem').filter({ hasText: referral.code })).toBeVisible();
  });

  await qa.step(4, async () => {
    await page.reload();
    await optionLabel(r.typeSelect(), type.name);
    await optionLabel(r.form.getByRole('combobox', { name: 'Referrals' }), referral.name);
  });
});

qaTest('TC-APP004-057', async ({ page, qa }) => {
  const r = new Requests(page);
  await r.open();
  const type = await newType(r, qa);

  const secondName = qa.name('X Elektif');
  await qa.step(1, async () => {
    const mark = await toastMark(page);
    await r.addMaster('Admission types', type.code, secondName);
    const toasts = await toastsAfter(page, mark);
    await page.reload();
    // The type list of "New request" shows every type by name: the first name stays, the second is not added.
    await optionLabel(r.typeSelect(), type.name);
    const second = await r.typeSelect().locator('option').filter({ hasText: secondName }).count();
    if (!toasts.includes('That code already exists')) {
      qa.deviation(1, 'Toast "That code already exists"; no second row', `toast "${toasts.join(' / ')}"`);
    }
    expect(second, 'no second row').toBe(0);
  });
});

qaTest('TC-APP004-058', async ({ page, qa }) => {
  const r = new Requests(page);
  await r.open();
  const type = await newType(r, qa);
  const patient = qa.name('X Pasien Tunggu 01');

  await qa.step(1, async () => {
    for (const f of ['Patient', 'Estimate (IDR)', 'Estimate note']) await expect(r.form.getByRole('textbox', { name: f })).toBeVisible();
    expect((await r.typeSelect().locator('option').first().innerText()).trim()).toBe('Choose an active admission type');
    await expect(r.form.getByRole('combobox', { name: 'Referrals' })).toBeVisible();
    if (!(await r.form.getByRole('combobox', { name: 'Branch' }).count())) qa.deviation(1, 'A field "Branch"', 'no Branch field (U1 works on one branch)');
  });

  await qa.step(2, async () => {
    await r.request({ patient, type: type.name, ...REQUEST });
    await expect(toastLocator(page, /^Saved$/)).toBeVisible();
    for (const f of ['Patient', 'Estimate (IDR)', 'Estimate note']) await expect(r.form.getByRole('textbox', { name: f })).toHaveValue('');
  });

  await qa.step(3, async () => {
    const item = r.requestItem(patient);
    await expect(item).toContainText(REQUEST.estimate);
    for (const b of ['Confirm', 'Reject', 'Cancel']) await expect(item.getByRole('button', { name: b })).toBeVisible();
    qa.note(3, `the request reads "${(await item.innerText()).replace(/\s+/g, ' ')}" (status text TBD in the workbook)`);
  });
});

qaTest('TC-APP004-059', async ({ page, qa }) => {
  const r = new Requests(page);
  await r.open();

  await qa.step(1, async () => {
    const mark = await toastMark(page);
    await r.request({ patient: qa.name('X Pasien Tunggu 01'), ...REQUEST });
    const required = await r.typeSelect().evaluate((e) => (e as HTMLSelectElement).validity.valueMissing);
    if (required) return;
    expect(await toastsAfter(page, mark)).toContain('Choose an active admission type');
  });
});

qaTest('TC-APP004-060', async ({ page, qa }) => {
  const r = new Requests(page);
  await r.open();
  const inactive = { code: qa.code('X-AT1'), name: qa.name('X Elektif') };
  await r.addMaster('Admission types', inactive.code, inactive.name, false);
  await expect(toastLocator(page, /^Saved$/)).toBeVisible();
  await page.reload();
  const patient = qa.name('X Pasien Tunggu 01');

  await qa.step(1, async () => {
    const options = await r.typeSelect().locator('option').allInnerTexts();
    const shown = options.find((o) => o.includes(inactive.name));
    if (!shown) {
      qa.deviation(1, 'A type shown with "(No)" can be chosen', 'inactive types are not offered');
      return;
    }
    await r.request({ patient, type: inactive.name, ...REQUEST });
    await expect(toastLocator(page, /^That master is inactive$/)).toBeVisible();
    await expect(r.requestItem(patient)).toHaveCount(0);
  });
});

qaTest('TC-APP004-061', async ({ browser, qa }) => {
  // "With All branches active": U1 has one branch only, so the step runs as U2.
  const context = await browser.newContext({ storageState: authFileOf('U2') });
  const page = await context.newPage();
  await installToastRecorder(page);
  const r = new Requests(page);
  await r.open();
  qa.note(1, 'run as U2 (rs.admin, "All branches"): U1 cannot choose "All branches"');

  await qa.step(1, async () => {
    await expect(r.typeSelect().locator('option').nth(1)).toBeAttached({ timeout: 15_000 });
    const options = (await r.typeSelect().locator('option').allInnerTexts()).filter((o) => !/Choose/.test(o));
    const posts: string[] = [];
    page.on('request', (q) => {
      if (q.method() === 'POST') posts.push(q.url());
    });
    const mark = await toastMark(page);
    await r.request({ patient: qa.name('X Pasien Tunggu 01'), type: options[0], ...REQUEST });
    const toasts = await toastsAfter(page, mark);
    expect(posts, 'nothing is sent').toEqual([]);
    if (!toasts.includes('Failed to save')) qa.deviation(1, 'Toast "Failed to save"; nothing is sent', toasts.length ? `toast "${toasts.join(' / ')}"; nothing is sent` : 'nothing is sent and no message is shown');
  });
  await context.close();
});

/** Three waiting requests of this test (TC-…-062/063 Preconditions). */
async function threeRequests(r: Requests, qa: Qa): Promise<string[]> {
  const type = await newType(r, qa);
  const patients: string[] = [];
  for (let i = 0; i < 3; i++) {
    const p = qa.name('X Pasien Tunggu 01');
    await r.request({ patient: p, type: type.name, ...REQUEST });
    // Each request waits for its own row: a "Saved" toast of the one before may still be shown.
    await expect(r.requestItem(p)).toBeVisible();
    await expect(r.form.getByRole('textbox', { name: 'Patient' })).toHaveValue('');
    patients.push(p);
  }
  return patients;
}

qaTest('TC-APP004-062', async ({ page, qa }) => {
  const r = new Requests(page);
  await r.open();
  const [a, b, c] = await threeRequests(r, qa);
  const reason = qa.name('X tidak jadi dirawat');

  await qa.step(1, async () => {
    await r.requestItem(a).getByRole('button', { name: 'Confirm' }).click();
    await expect(toastLocator(page, /^Request confirmed$/)).toBeVisible();
    await expect(r.requestItem(a).getByRole('button')).toHaveCount(0);
  });

  await qa.step(2, async () => {
    await r.reason().fill(reason);
    await r.requestItem(b).getByRole('button', { name: 'Reject' }).click();
    await expect(toastLocator(page, /^Request rejected$/)).toBeVisible();
    await expect(r.reason()).toHaveValue('');
  });

  await qa.step(3, async () => {
    await r.reason().fill(reason);
    await r.requestItem(c).getByRole('button', { name: 'Cancel' }).click();
    await expect(toastLocator(page, /^Request cancelled$/)).toBeVisible();
  });
});

qaTest('TC-APP004-063', async ({ page, qa }) => {
  const r = new Requests(page);
  await r.open();
  const [a] = await threeRequests(r, qa);

  await qa.step(1, async () => {
    for (const b of ['Reject', 'Cancel']) {
      await r.reason().fill('');
      await r.requestItem(a).getByRole('button', { name: b }).click();
      await expect(toastLocator(page, /^A reason is required$/)).toBeVisible();
    }
    await page.reload();
    await expect(r.requestItem(a).getByRole('button', { name: 'Confirm' })).toBeVisible();
  });
});

qaTest('TC-APP004-064', async ({ page, browser, qa }) => {
  const r = new Requests(page);
  await r.open();
  const [a] = await threeRequests(r, qa);
  const context = await browser.newContext({ storageState: authFileOf('U1') });
  const other = await context.newPage();
  await installToastRecorder(other);
  const r2 = new Requests(other);
  await r2.open();
  await expect(async () => {
    if (!(await r2.requestItem(a).isVisible())) await other.reload();
    await expect(r2.requestItem(a)).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });

  await qa.step(1, async () => {
    await r.requestItem(a).getByRole('button', { name: 'Confirm' }).click();
    await expect(toastLocator(page, /^Request confirmed$/)).toBeVisible();
    const mark = await toastMark(other);
    await r2.requestItem(a).getByRole('button', { name: 'Confirm' }).click();
    const toasts = await toastsAfter(other, mark);
    if (!toasts.includes('That request is no longer waiting')) {
      qa.deviation(1, 'Toast "That request is no longer waiting"', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no message');
    }
  });
  await context.close();
});
