import { expect, type Locator, type Page } from '@playwright/test';
import type { Qa } from '../../../fixtures/e2e';
import { toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { escapeRe } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { typeAhead } from '../../../pages/pharmacy/PharmacyE2EPages';
import { NotOffered } from '../../../lib/not-offered';

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
    await this.page.goto('/id/adt/requests');
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
    await this.page.goto('/id/adt/ward');
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

/**
 * Admissions, tab "Ward supply": three cards. "Store" (a store type-ahead,
 * "Pending inpatient orders" as tick boxes "<patient> — <drug> · <qty>",
 * "Group for this store"), "Ward supply" (the groups, Receive or Refuse) and
 * "Stay" (a stay type-ahead, then "Request return" on the issued lines).
 * ST-IP cannot be made (found blocker 26): the seed store of the pharmacy
 * tests (STAND_IN_STORE) stands in.
 */
export class WardSupply {
  readonly main: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
  }

  async open(): Promise<void> {
    await this.page.goto('/id/adt/admissions');
    await this.main.getByRole('tab', { name: 'Ward supply' }).click();
    await expect(this.main.getByRole('heading', { level: 2, name: 'Stay' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  card(heading: 'Store' | 'Ward supply' | 'Stay'): Locator {
    // The heading sits in the card's header, next to its description.
    return this.main.getByRole('heading', { level: 2, name: heading, exact: true }).locator('xpath=../..');
  }

  store(): Locator {
    return this.card('Store').getByRole('combobox', { name: 'Store' });
  }

  async pickStore(text: string): Promise<void> {
    await typeAhead(this.page, this.store(), text);
  }

  /** The tick box of a pending order of the patient. */
  pending(patient: string): Locator {
    return this.card('Store').getByRole('checkbox', { name: new RegExp(escapeRe(patient)) });
  }

  /** Ticks the patient's pending orders and clicks "Group for this store"; returns the toasts. */
  async group(patient: string): Promise<string[]> {
    const boxes = this.pending(patient);
    for (const b of await boxes.all()) await b.check();
    const mark = await toastMark(this.page);
    await this.card('Store').getByRole('button', { name: 'Group for this store' }).click();
    await expect.poll(async () => (await toastsSince(this.page, mark)).length, { timeout: 10_000 }).toBeGreaterThan(0).catch(() => {});
    return toastsSince(this.page, mark);
  }

  /** The Receive (or Refuse) buttons of the open groups in the "Ward supply" card. */
  groupButtons(action: 'Receive' | 'Refuse'): Locator {
    return this.card('Ward supply').getByRole('button', { name: action, exact: true });
  }

  /** The row of a group button: the badge and "patient — drug, …" next to the buttons' box. */
  rowOf(button: Locator): Locator {
    return button.locator('xpath=../..');
  }

  /** Clicks Receive or Refuse on the group of the button; returns the toasts. */
  async decide(button: Locator, action: 'Receive' | 'Refuse'): Promise<string[]> {
    const mark = await toastMark(this.page);
    await button.click();
    const confirm = this.page.getByRole('dialog').getByRole('button', { name: new RegExp(`^(${action}|Confirm|Yes)`) });
    if (await confirm.first().isVisible({ timeout: 1500 }).catch(() => false)) await confirm.first().click();
    await expect.poll(async () => (await toastsSince(this.page, mark)).length, { timeout: 10_000 }).toBeGreaterThan(0).catch(() => {});
    return toastsSince(this.page, mark);
  }

  /**
   * Picks a stay in the "Stay" card by the name, else by the admission number;
   * NotOffered (found blocker 40) when neither finds it ("No matching stay").
   */
  async pickStay(patient: string, admissionNo?: string): Promise<void> {
    const field = this.card('Stay').getByRole('combobox').first();
    for (const text of [patient, admissionNo].filter((x): x is string => !!x)) {
      const list = this.page.locator(`#${await field.getAttribute('aria-controls')}`);
      await field.click();
      await field.fill('');
      await field.pressSequentially(text, { delay: 20 });
      const option = list.getByRole('option').filter({ hasText: text }).first();
      if (await option.waitFor({ timeout: 6_000 }).then(() => true, () => false)) {
        const b = option.getByRole('button');
        await ((await b.count()) ? b.first() : option).click();
        await this.page.waitForLoadState('networkidle').catch(() => {});
        return;
      }
    }
    throw new NotOffered(`the stay "${patient}"${admissionNo ? ` (${admissionNo})` : ''} is not offered by "Stay" of Ward supply (found blocker 40)`);
  }
}
