import { catalogueOf } from './qa-data';

/**
 * Shared data of 09 Procurement (00-test-data.xlsx | Catalogue, application
 * "09 Procurement"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('09').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 09 row "${shortName}"`);
  return r;
}

const amounts = row('Amounts').what.match(/Advance amount (\d+), amount paid (\d+)/);
if (!amounts) throw new Error('00-test-data.xlsx | Catalogue "Amounts" (09) has another wording');

export const PROCUREMENT = {
  vendor: row('Vendor').what.match(/"([^"]+)"/)![1],
  dept: row('Department').what.match(/"([^"]+)"/)![1],
  advance: amounts[1],
  paid: amounts[2],
  chain: row('Chain').what.match(/"([^"]+)"/)![1],
} as const;
