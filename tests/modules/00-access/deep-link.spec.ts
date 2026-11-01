import { expect, qaTest } from '../../../fixtures/e2e';
import { modules } from '../../../lib/qa-data';

/**
 * "Deep link without a session" of every workbook (journey "Access to
 * <application>: session, licence and write privilege"): in a browser without
 * a session the address of the application leads to the sign-in page, the
 * target kept in "next". The journey names U10 for its licence case; this
 * case is run signed out (lib/qa-data/plan.ts, usersOfCase).
 *
 * Step: "In a browser without a session, opens https://…/id/maintenance"
 * → "Redirect to /id/login?next=%2Fmaintenance".
 */
for (const m of modules()) {
  for (const t of m.testCases.filter((x) => x.scenario === 'Deep link without a session')) {
    const step = t.steps[0];
    const path = /https?:\/\/[^/\s]+(\/\S+)/.exec(step.action)?.[1];
    const target = /(\/id\/login\?next=\S+)/.exec(step.expected)?.[1];
    if (!path || !target) throw new Error(`${t.id}: no address in "${step.action}" / "${step.expected}"`);
    qaTest(t.id, async ({ page, qa }) => {
      await qa.step(step.step, async () => {
        await page.goto(path);
        await expect(page).toHaveURL((url) => url.pathname + url.search === target, { timeout: 20_000 });
      });
    });
  }
}
