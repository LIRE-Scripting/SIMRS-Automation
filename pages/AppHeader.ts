import { type Page, type Locator } from '@playwright/test';

/** Top application banner: signed-in state, branch selector, language, sign out. */
export class AppHeader {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private banner(): Locator {
    return this.page.getByRole('banner');
  }

  /** The user chip; reads "Not signed in" when the session was dropped. */
  profileButton(): Locator {
    return this.banner().locator('button').filter({
      hasText: /superadmin|not signed in|belum masuk/i,
    });
  }

  async isSignedIn(): Promise<boolean> {
    return (await this.profileButton().filter({ hasText: /not signed in|belum masuk/i }).count()) === 0;
  }

  branchButton(): Locator {
    return this.banner().getByRole('button', { name: /^(branch|cabang)$/i });
  }

  async selectBranch(name: string): Promise<void> {
    await this.branchButton().click();
    await this.page.getByRole('menuitemradio', { name, exact: true }).click();
    // Changing branch reloads the app shell; let that navigation settle.
    await this.page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
  }

  async selectLanguage(lang: 'EN' | 'ID'): Promise<void> {
    await this.banner().getByRole('button', { name: /^(language|bahasa)$/i }).click();
    await this.page.getByRole('menuitemradio', { name: lang, exact: true }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async signOut(): Promise<void> {
    await this.profileButton().click();
    await this.page.getByRole('menuitem', { name: /^(sign out|keluar)$/i }).click();
  }
}
