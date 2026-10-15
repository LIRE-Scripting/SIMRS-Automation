import { catalogueOf } from './qa-data';

/**
 * Shared data of 08 Operation Theater (00-test-data.xlsx | Catalogue,
 * application "08 Operation Theater"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('08').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 08 row "${shortName}"`);
  return r;
}

export const OT = {
  procedure: row('Procedure').what.match(/"([^"]+)"/)![1],
  amount: row('Amount').what.match(/(\d+)/)![1],
  pt1: { name: row('PT-1').what.match(/"([^"]+)"/)![1] },
} as const;
