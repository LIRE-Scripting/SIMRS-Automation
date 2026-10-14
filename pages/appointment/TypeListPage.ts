import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Appointment > Referral types (/en/appointment/referral-types) and
 * Cross-consult types (/en/appointment/cross-consult-types): one layout, a
 * list (Code, Name, Active) and a dialog "Add" (Code, Name, Active).
 * Read from the live screens on 2026-10-15.
 */
export type TypeKind = 'Referral types' | 'Cross-consult types';

export const TYPE_ROUTES: Record<TypeKind, string> = {
  'Referral types': '/en/appointment/referral-types',
  'Cross-consult types': '/en/appointment/cross-consult-types',
};

/** The list in the booking dialog that offers this kind of type. */
export const BOOKING_LIST: Record<TypeKind, string> = {
  'Referral types': 'Referral type',
  'Cross-consult types': 'Cross-consult type',
};

export class TypeListPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly dialog: Locator;

  constructor(
    page: Page,
    readonly kind: TypeKind,
  ) {
    this.page = page;
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: kind });
    this.addButton = this.main.getByRole('button', { name: 'Add', exact: true });
    this.table = this.main.getByRole('table');
    this.dialog = page.getByRole('dialog', { name: 'Add' });
  }

  async open(): Promise<void> {
    await this.page.goto(TYPE_ROUTES[this.kind]);
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') }).filter({
      hasNot: this.page.getByText('Nothing here yet.'),
    });
  }

  row(code: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  async openAdd(): Promise<Locator> {
    await this.addButton.click();
    await expect(this.dialog).toBeVisible();
    return this.dialog;
  }

  code(): Locator {
    return this.dialog.getByRole('textbox', { name: 'Code' });
  }

  name(): Locator {
    return this.dialog.getByRole('textbox', { name: 'Name' });
  }

  active(): Locator {
    return this.dialog.getByRole('checkbox', { name: 'Active' });
  }

  saveButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Save', exact: true });
  }

  async fill(code: string, name: string, active = true): Promise<void> {
    await this.code().fill(code);
    await this.name().fill(name);
    await this.active().setChecked(active);
  }
}
