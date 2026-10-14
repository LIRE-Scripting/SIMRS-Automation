import fs from 'node:fs';
import path from 'node:path';
import { test as base } from '@playwright/test';
import { SCREENSHOT_DIR } from '../lib/config';
import { moduleJourneyById } from '../lib/module-journeys';

/**
 * Fixture umum untuk suite per modul (pola pharmacy): checklist journey
 * dari workbook dilampirkan ke report, dan tiap test ditutup screenshot
 * full-page.
 */
export const test = base.extend<{ journeyChecklist: void; finalScreenshot: void }>({
  /** Attaches the workbook checklist (steps, expected results) of this journey. */
  journeyChecklist: [
    async ({}, use, testInfo) => {
      const id = testInfo.title.match(/[A-Z]{2,4}-JRN-\d+/)?.[0];
      if (id) {
        testInfo.attach('journey-checklist.json', {
          body: JSON.stringify(moduleJourneyById(id), null, 2),
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
      const id = testInfo.title.match(/[A-Z]{2,4}-JRN-\d+/)?.[0] ?? testInfo.title.replace(/\W+/g, '-');
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
