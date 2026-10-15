import { catalogueOf } from './qa-data';

/**
 * Shared data of 11 Laboratory (00-test-data.xlsx | Catalogue, application
 * "11 Laboratory"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('11').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 11 row "${shortName}"`);
  return r;
}

const test = row('Test').what.match(/Result type "([^"]+)", remark "([^"]+)"/)!;
const result = row('Result').what.match(/Lab result "([^"]+)", Result range "([^"]+)", note "([^"]+)"/)!;

export const LAB = {
  type: test[1],
  remark: test[2],
  result: result[1],
  range: result[2],
  note: result[3],
} as const;
