import { expect, test } from '../../../fixtures/e2e';
import { SITE_ROLES, type SiteRoleKey } from '../../../lib/site-roles';
import { siteRolePage } from '../shared/access';

/**
 * The role accounts of the site (lib/site-roles.ts, given 2026-11-09) sign in with the shared password, and each
 * sees its apps. Read-only: the apps each role is offered are noted for the tests that need the role.
 */
for (const key of Object.keys(SITE_ROLES) as SiteRoleKey[]) {
  const r = SITE_ROLES[key];
  test(`Site role ${r.login} (${r.name}) signs in`, async ({ browser }, testInfo) => {
    const page = await siteRolePage(browser, key);
    try {
      await page.goto('/id/apps');
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.getByRole('banner').getByRole('button', { name: /not signed in/i })).toHaveCount(0);
      const apps = (await page.getByRole('main').getByRole('link').allInnerTexts()).map((t) => t.split('\n')[0].trim()).filter(Boolean);
      testInfo.annotations.push({ type: 'note', description: `${r.login}: ${apps.length} app(s): ${apps.join(', ')}` });
      console.log(`${r.login}: ${apps.length} app(s): ${apps.join(', ')}`);
    } finally {
      await page.context().close();
    }
  });
}
