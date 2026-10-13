import { expect, type Locator, type Page } from '@playwright/test';
import { ensureSignedIn } from '../lib/auth';
import { gotoStable } from '../lib/navigation';

/** The Pharmacy hub: heading, cards, sidebar and breadcrumb. */
export class PharmacyHubPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly description: Locator;
  readonly sidebar: Locator;
  readonly breadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Pharmacy' });
    this.description = page.getByText('Orders, dispense & issue lines');
    this.sidebar = page.getByRole('navigation', { name: 'Pharmacy' });
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  }

  async open(): Promise<void> {
    await ensureSignedIn(this.page);
    await gotoStable(this.page, '/en/pharmacy');
  }

  /** A screen card in the hub body (several share their name with a sidebar link). */
  card(name: string): Locator {
    return this.page.getByRole('main').getByRole('link', { name, exact: true }).first();
  }

  sidebarLink(name: string): Locator {
    return this.sidebar.getByRole('link', { name, exact: true });
  }

  async expectCardsVisible(): Promise<void> {
    await expect(this.card('Orders')).toBeVisible();
    await expect(this.card('Dispense')).toBeVisible();
    await expect(this.card('Issue Lines')).toBeVisible();
  }
}
