import fs from 'node:fs';
import path from 'node:path';
import { test as base } from '@playwright/test';
import { SCREENSHOT_DIR } from '../lib/config';
import { journeyById } from '../lib/journeys';
import { AppHeader } from '../pages/AppHeader';
import { DispensePage } from '../pages/DispensePage';
import { IssueLinesPage } from '../pages/IssueLinesPage';
import { OrdersPage } from '../pages/OrdersPage';
import { PharmacyHubPage } from '../pages/PharmacyHubPage';

export interface PharmacyPages {
  header: AppHeader;
  hub: PharmacyHubPage;
  orders: OrdersPage;
  dispense: DispensePage;
  issueLines: IssueLinesPage;
}

export const test = base.extend<{ pharmacy: PharmacyPages; journeyChecklist: void; finalScreenshot: void }>({
  pharmacy: async ({ page }, use) => {
    await use({
      header: new AppHeader(page),
      hub: new PharmacyHubPage(page),
      orders: new OrdersPage(page),
      dispense: new DispensePage(page),
      issueLines: new IssueLinesPage(page),
    });
  },

  /** Attaches the workbook checklist (steps, expected results) of this journey to the report. */
  journeyChecklist: [
    async ({}, use, testInfo) => {
      const id = testInfo.title.match(/PHA-JRN-\d+/)?.[0];
      if (id) {
        testInfo.attach('journey-checklist.json', {
          body: JSON.stringify(journeyById(id), null, 2),
          contentType: 'application/json',
        });
      }
      await use();
    },
    { auto: true },
  ],

  /** Screenshot at the end: every test finishes with a full-page screenshot. */
  finalScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();
      const id = testInfo.title.match(/PHA-JRN-\d+/)?.[0] ?? testInfo.title.replace(/\W+/g, '-');
      const file = path.join(SCREENSHOT_DIR, `${id}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      if (fs.existsSync(file)) {
        testInfo.attach('final screenshot', { path: file, contentType: 'image/png' });
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
