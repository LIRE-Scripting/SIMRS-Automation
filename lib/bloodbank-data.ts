import { expect, type Page } from '@playwright/test';
import { MasterListPage } from '../pages/settings/MasterListPage';
import { catalogueOf } from './qa-data';

/**
 * Shared data of 06 Transfusion Medicine (00-test-data.xlsx | Catalogue,
 * application "06 Transfusion Medicine"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('06').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 06 row "${shortName}"`);
  return r;
}

const components = row('Components').what.match(
  /PRC "(.+?)", (\d+) storage days, cross-match required, return limit ([\d.]+) hours; FFP "(.+?)", (\d+) days, no cross-match, return limit ([\d.]+) hours/,
);
if (!components) throw new Error('00-test-data.xlsx | Catalogue "Components" has another wording');

export const BLOODBANK = {
  pt1: { name: row('PT-1').what.match(/"([^"]+)"/)![1] },
  dep1: { name: row('DEP-1').what.match(/"([^"]+)"/)![1], code: 'QA-DEP-BB1' },
  components: {
    PRC: { code: 'PRC', name: components[1], storageDays: components[2], crossMatch: true, returnHours: components[3] },
    FFP: { code: 'FFP', name: components[4], storageDays: components[5], crossMatch: false, returnHours: components[6] },
  },
  /** "patient O Positive with PRC from donor O Positive" */
  compatibility: [...row('Compatibility').what.matchAll(/patient (\w+ \w+) with (\w+) from donor (\w+ \w+)/g)].map((m) => ({
    patient: m[1],
    component: m[2],
    donor: m[3],
  })),
  serology: row('Serology tests').what.replace(/^BR-A:\s*/, '').split(',').map((s) => s.trim()),
} as const;

/** DEP-1 "QA Bangsal Dalam" (made once and reused; code derived from the short name, Q14). */
export async function ensureBloodbankDepartment(page: Page): Promise<void> {
  const deps = MasterListPage.departments(page);
  await deps.open();
  if ((await (await deps.rowsWith('Name', BLOODBANK.dep1.name)).count()) > 0) return;
  const d = await deps.openAdd();
  await d.getByRole('textbox', { name: 'Department code' }).fill(BLOODBANK.dep1.code);
  await d.getByRole('textbox', { name: 'Department name' }).fill(BLOODBANK.dep1.name);
  await deps.save(d);
  await expect(await deps.rowsWith('Name', BLOODBANK.dep1.name)).toHaveCount(1);
}
