import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';
import { pageToRow } from '../paging';

/**
 * The list screens of Settings that share one layout: Departments
 * (/id/mdm/departments), Service centers (/id/mdm/service-centers) and Users
 * (/id/identity/users). A heading, an "Add …" button, a search box, a table
 * with an "Edit <name>" button per row, and an "Add …" dialog with Save.
 * Read from the live screens on 2026-10-14.
 */
export class MasterListPage {
  readonly page: Page;
  readonly main: Locator;

  constructor(
    page: Page,
    readonly route: string,
    readonly heading: string,
    readonly addLabel: string,
  ) {
    this.page = page;
    this.main = page.getByRole('main');
  }

  static departments(page: Page): MasterListPage {
    return new MasterListPage(page, '/id/mdm/departments', 'Departments', 'Add Department');
  }

  static serviceCenters(page: Page): MasterListPage {
    return new MasterListPage(page, '/id/mdm/service-centers', 'Service Centers', 'Add Service Center');
  }

  static users(page: Page): MasterListPage {
    return new MasterListPage(page, '/id/identity/users', 'Users', 'Add User');
  }

  async open(): Promise<void> {
    await this.page.goto(this.route);
    await expect(this.main.getByRole('heading', { level: 1, name: this.heading })).toBeVisible();
  }

  /** Rows whose cell in `column` is exactly `value`, after searching for it. */
  async rowsWith(column: string, value: string): Promise<Locator> {
    await this.main.getByRole('searchbox').fill(value);
    const table = this.main.getByRole('table');
    const headers = (await table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`Column "${column}" not in ${headers.join(', ')}`);
    // The list filters as you type; wait until it shows only matches or its empty text.
    await expect(table.getByRole('row').filter({ has: this.page.getByRole('cell') }).first()).toContainText(
      // The empty text: "No users yet." (on /id "Belum ada pengguna.").
      new RegExp(`${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|yet\\.|^Belum ada`),
    );
    // The search filters only the page on screen (50 rows), so every page is looked at.
    return pageToRow(this.main, () =>
      table.getByRole('row').filter({ has: this.page.getByRole('cell').nth(i).getByText(value, { exact: true }) }),
    );
  }

  async openAdd(): Promise<Locator> {
    await this.main.getByRole('button', { name: this.addLabel }).click();
    const d = this.page.getByRole('dialog', { name: this.addLabel });
    await expect(d).toBeVisible();
    return d;
  }

  /** Clicks Save and waits until the dialog closes without an error toast. */
  async save(d: Locator): Promise<void> {
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d).toBeHidden({ timeout: 15_000 });
    await expect(toastLocator(this.page, /failed|error/i)).toHaveCount(0);
  }
}
