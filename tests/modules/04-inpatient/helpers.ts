import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastLocator } from '../../../lib/assertions';

/** Shared screens of 04-inpatient.xlsx: admission requests and Ward care. */

export class Requests {
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
export async function optionLabel(select: Locator, text: string): Promise<string> {
  const option = select.locator('option').filter({ hasText: text }).first();
  await expect(option, `an option with "${text}"`).toBeAttached({ timeout: 15_000 });
  return (await option.innerText()).trim();
}

/** An active admission type of this test (Preconditions: "An active admission type exists"). */
export async function newType(r: Requests, qa: Qa): Promise<{ code: string; name: string }> {
  const t = { code: qa.code('X-AT1'), name: qa.name('X Elektif') };
  await r.addMaster('Admission types', t.code, t.name);
  await expect(toastLocator(r.page, /^Saved$/)).toBeVisible();
  await r.page.reload();
  return t;
}

export const REQUEST = { estimate: '2500000', note: 'X estimasi 3 hari' };

export class Ward {
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
