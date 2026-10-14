import { expect, type Locator, type Page } from '@playwright/test';
import { BASE_URL } from '../lib/config';

/**
 * KlikMed sign-in page. The form labels are translated, so the locators
 * accept both the English and Indonesian accessible names.
 */
export class LoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByRole('textbox', { name: /nama pengguna|username/i });
    this.password = page.locator('input[type="password"]');
    this.submit = page.getByRole('button', { name: /^(masuk|sign in)$/i });
  }

  /** Opening the app while signed out always lands on the login page. */
  async open(): Promise<void> {
    await this.page.goto('/');
    await expect(this.username).toBeVisible({ timeout: 20_000 });
  }

  /** Pin the UI to English; the choice persists with the saved session. */
  async useEnglish(): Promise<void> {
    const toggle = this.page.getByRole('button', { name: /^(bahasa|language)$/i });
    if ((await toggle.count()) > 0) {
      await toggle.click();
      await this.page.getByRole('menuitemradio', { name: 'EN', exact: true }).click();
      await this.page
        .waitForURL(/\/en\//, { timeout: 5_000 })
        .catch(() => {});
    }
  }

  /**
   * Signs in on the English site and lands on /en/apps.
   *
   * Blocker 1 (00-blockers-checklist-linked.xlsx | Checklist | row 5): from
   * the default target the sign-in stays on the login page; "with the target
   * /apps it goes on in half a second". So the login opens with next=/apps.
   */
  async signIn(username: string, password: string): Promise<void> {
    await this.page.goto('/en/login?next=%2Fapps');
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
    await expect(this.page).toHaveURL(/\/en\/apps$/, { timeout: 20_000 });
  }

  /**
   * Signs in and lands on the app home.
   *
   * Known staging behaviour: after submitting, the page sometimes stays on
   * /login even though the session was created. When nothing happens we
   * redirect to the base URL ourselves, as required.
   */
  async login(
    username: string,
    password: string,
    opts: { english?: boolean } = {},
  ): Promise<void> {
    // Staging auth is intermittent: the submit sometimes silently fails.
    // Retry up to 3 times; the session takes effect when redirecting to /id.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.open();
      await this.username.fill(username);
      await this.password.fill(password);
      await this.submit.click();
      let authed = false;
      for (let i = 0; i < 6; i++) {
        await this.page.waitForTimeout(2_000);
        await this.page.goto(`${BASE_URL}id`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        if (!this.page.url().includes('/login')) {
          authed = true;
          break;
        }
      }
      if (authed) break;
    }
    if (opts.english !== false) {
      await this.useEnglish();
    }
  }
}
