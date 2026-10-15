import { expect, type Locator, type Page } from '@playwright/test';
import { toastMark, toastsSince } from '../../../lib/assertions';
import { DIET } from '../../../lib/diet-data';

/** Shared steps of 13-dietary.xlsx. Requests, patients and templates carry a token. */

export async function toastsAfter(page: Page, mark: number, timeout = 8_000): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

export async function click(page: Page, button: Locator): Promise<string[]> {
  const mark = await toastMark(page);
  await button.click();
  return toastsAfter(page, mark);
}

export class RequestsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Diet requests' });
    this.table = this.main.getByRole('table');
    this.dialog = page.getByRole('dialog', { name: 'New diet request' });
  }
  async open(): Promise<void> {
    await this.page.goto('/en/diet/requests');
    await expect(this.heading).toBeVisible();
  }
  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  pager(): Locator {
    return this.main.getByText(/^Showing \d+–\d+ of \d+$/);
  }
  /** The row of a request by its number, paging through the list. */
  async row(docNo: string): Promise<Locator> {
    await this.open();
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: docNo, exact: true }) });
    await expect(this.rows().first()).toBeVisible();
    const next = this.main.getByRole('button', { name: 'Next page' });
    for (let i = 0; i < 100; i++) {
      if (await match().count()) return match();
      if (!(await next.isVisible()) || (await next.isDisabled())) break;
      const first = await this.rows().first().innerText();
      await next.press('Enter');
      await expect(this.rows().first()).not.toHaveText(first);
    }
    return match();
  }
  async create(v: Partial<Record<'Doc no' | 'Bed no' | 'Bed category' | 'Comments' | 'Status', string>>): Promise<string[]> {
    await this.open();
    await this.main.getByRole('button', { name: 'New request' }).click();
    await expect(this.dialog).toBeVisible();
    for (const [k, val] of Object.entries(v)) await this.dialog.getByRole('textbox', { name: k, exact: true }).fill(val ?? '');
    return click(this.page, this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }));
  }
}

export type TpnInputs = Partial<Record<'Patient' | 'Height' | 'Weight' | 'Energy (kcal)' | 'Protein (g/kg)' | 'Fluid (mL/kg)' | 'Sodium / L' | 'Potassium / L' | 'Calcium / L' | 'Magnesium / L' | 'Phosphate / L' | 'MVI-12 / L' | 'Trace metals / L' | 'Heparin / L' | 'Insulin / L' | 'Template code' | 'Description', string>> & {
  heightUnit?: string;
  weightUnit?: string;
  lipid?: string;
};

/** TPN-A of the catalogue. */
export const TPN_A: TpnInputs = {
  Height: DIET.tpn.height,
  heightUnit: DIET.tpn.heightUnit,
  Weight: DIET.tpn.weight,
  weightUnit: DIET.tpn.weightUnit,
  'Energy (kcal)': DIET.tpn.energy,
  'Protein (g/kg)': DIET.tpn.protein,
  'Fluid (mL/kg)': DIET.tpn.fluid,
  lipid: DIET.tpn.lipid,
  'Sodium / L': DIET.tpn.sodium,
  'Potassium / L': DIET.tpn.potassium,
  'Calcium / L': DIET.tpn.calcium,
  'Magnesium / L': DIET.tpn.magnesium,
  'Phosphate / L': DIET.tpn.phosphate,
  'MVI-12 / L': DIET.tpn.mvi,
  'Trace metals / L': DIET.tpn.trace,
};

export class TpnPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly workbench: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Total parenteral nutrition' });
    this.workbench = this.main.getByRole('table');
  }
  async open(): Promise<void> {
    await this.page.goto('/en/diet/tpn');
    await expect(this.heading).toBeVisible();
  }
  field(name: string): Locator {
    return this.main.getByRole('textbox', { name, exact: true });
  }
  /**
   * Fills the inputs. Number fields are filled at once (a value typed key by key
   * may lose its decimal point, TC-APP013-018).
   */
  async fill(v: TpnInputs): Promise<void> {
    const { heightUnit, weightUnit, lipid, ...fields } = v;
    if (heightUnit) await this.main.getByRole('combobox', { name: 'Height unit' }).selectOption(heightUnit);
    if (weightUnit) await this.main.getByRole('combobox', { name: 'Weight unit' }).selectOption(weightUnit);
    if (lipid) await this.main.getByRole('combobox', { name: 'Lipid %' }).selectOption(lipid);
    for (const [k, val] of Object.entries(fields)) await this.field(k).fill(val ?? '');
  }
  button(name: 'Calculate' | 'Save on patient' | 'Save template' | 'Reset'): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }
  /** The value of a result term ("BMI", "Protein", …): a term / definition pair. */
  result(label: string): Locator {
    return this.main.getByRole('term').filter({ hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::*[1]');
  }

  /** All result terms and values, label -> value. */
  async results(): Promise<Record<string, string>> {
    const terms = await this.main.getByRole('term').allInnerTexts();
    const defs = await this.main.getByRole('definition').allInnerTexts();
    return Object.fromEntries(terms.map((t, i) => [t.trim(), (defs[i] ?? '').trim()]));
  }
  rows(): Locator {
    return this.workbench.getByRole('rowgroup').nth(1).getByRole('row');
  }
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
  pager(): Locator {
    return this.main.getByText(/^Showing \d+(–\d+)? of \d+$/);
  }
}
