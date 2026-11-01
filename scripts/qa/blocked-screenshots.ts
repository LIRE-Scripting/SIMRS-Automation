/**
 * A screenshot for every test case of the summary that has none: those a
 * blocker keeps from running (fixme), whose body never opens a page. The
 * picture is the starting point of the test case's journey (00-prerequisites.xlsx
 * | Journeys, "Starting point"), opened as the journey's user, so the reader
 * sees the screen the blocker is about; for checklist blocker 4 (no tenant
 * without a licence) it is Settings, Tenants, which refuses the administrator.
 * Saved as reports/screenshots/blocked/<id>.png; the summary shows it as the
 * starting screen (npm run qa:run-summary).
 *
 *   npm run qa:run-summary && npm run qa:blocked-shots && npm run qa:run-summary
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { authFileOf } from '../../lib/config';
import { testCaseRef } from '../../lib/qa-data';
import { planFor } from '../../lib/qa-data/plan';

const DIR = 'reports/screenshots/blocked';
const BASE = 'https://rs.showcase.atklik.xyz';

interface Outcome { kind: string; id: string; status: string; reason: string; screenshot?: string }

async function main(): Promise<void> {
  const s = JSON.parse(fs.readFileSync('reports/summary/run-summary.json', 'utf8')) as { outcomes: Outcome[] };
  const todo = s.outcomes.filter((o) => o.kind === 'module' && !o.screenshot);
  fs.mkdirSync(DIR, { recursive: true });
  const browser: Browser = await chromium.launch();
  const pages = new Map<string, Page>();
  const pageOf = async (user: 'U1' | 'U2' | null): Promise<Page> => {
    const key = user ?? 'anonymous';
    if (!pages.has(key)) {
      const context = await browser.newContext({ baseURL: BASE, storageState: user ? authFileOf(user) : { cookies: [], origins: [] }, viewport: { width: 1440, height: 900 }, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
      pages.set(key, await context.newPage());
    }
    return pages.get(key)!;
  };
  let done = 0;
  for (const o of todo) {
    const ref = testCaseRef(o.id);
    const plan = planFor(ref);
    const start = /^Blocker 4:/.test(o.reason) ? '/id/tenants' : (ref.needs.startingPoint ?? '/id/apps').replace(/^(?!\/id\/)\/?/, '/id/');
    const page = await pageOf(plan.user);
    try {
      await page.goto(start, { timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await page.screenshot({ path: path.join(DIR, `${o.id}.png`), fullPage: false });
      done += 1;
    } catch (e) {
      console.warn(`${o.id}: ${start}: ${(e as Error).message.split('\n')[0]}`);
    }
  }
  await browser.close();
  console.log(`${DIR}: ${done} of ${todo.length} test cases without a screenshot now have their starting screen`);
}

main();
