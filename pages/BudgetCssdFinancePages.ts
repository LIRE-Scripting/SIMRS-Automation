import { expect, type Locator, type Page } from '@playwright/test';
import { gotoStable } from '../lib/navigation';

function dialogAfterClick(page: Page, trigger: Locator): Promise<Locator> {
  return (async () => {
    await trigger.first().click();
    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    await expect(dlg).toBeVisible();
    return dlg;
  })();
}

/** Budget > Books. */
export class BudgetBooksPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly search: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /book/i });
    this.search = page.locator('input[type="search"]').first();
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/budget/books');
    await expect(this.heading).toBeVisible();
  }

  rowWithCode(code: string): Locator {
    return this.rows.filter({ hasText: code }).first();
  }

  openNewBook(): Promise<Locator> {
    return dialogAfterClick(this.page, this.page.getByRole('button', { name: /new book/i }));
  }
}

/** Budget > Heads. */
export class BudgetHeadsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly search: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /head/i });
    this.search = page.locator('input[type="search"]').first();
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/budget/heads');
    await expect(this.heading).toBeVisible();
  }

  rowWithCode(code: string): Locator {
    return this.rows.filter({ hasText: code }).first();
  }

  openNewHead(): Promise<Locator> {
    return dialogAfterClick(this.page, this.page.getByRole('button', { name: /new head/i }));
  }
}

/** Budget > Sanction checklists. */
export class BudgetChecklistsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /checklist|question/i });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/budget/sanction-checklists');
    await expect(this.heading).toBeVisible();
  }

  openNewQuestion(): Promise<Locator> {
    return dialogAfterClick(this.page, this.page.getByRole('button', { name: /new question/i }));
  }
}

/** Layar master CSSD (autoclaves, cycle-types, indicator-types, test-names, ...). */
export class CssdMasterPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page, path: string, heading: RegExp) {
    this.page = page;
    this.path = path;
    this.heading = page.getByRole('heading', { level: 1, name: heading });
    this.rows = page.locator('main table tbody tr');
  }

  readonly path: string;

  async open(): Promise<void> {
    await gotoStable(this.page, this.path);
    await expect(this.heading).toBeVisible();
  }

  rowWithCode(code: string): Locator {
    return this.rows.filter({ hasText: code }).first();
  }

  openNew(): Promise<Locator> {
    return dialogAfterClick(this.page, this.page.getByRole('button', { name: /^new$/i }));
  }
}

/** Finance > Journals. */
export class FinanceJournalsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /journal/i });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/finance/journals');
    await expect(this.heading).toBeVisible();
  }

  openNewJournal(): Promise<Locator> {
    return dialogAfterClick(this.page, this.page.getByRole('button', { name: /new journal/i }));
  }
}

/** Finance > Accounts. */
export class FinanceAccountsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /account/i });
    this.rows = page.locator('main table tbody tr');
  }

  async open(): Promise<void> {
    await gotoStable(this.page, '/en/finance/accounts');
    await expect(this.heading).toBeVisible();
  }
}
