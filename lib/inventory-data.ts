import { catalogueOf } from './qa-data';

/**
 * Shared data of 07 Inventory (00-test-data.xlsx | Catalogue, application
 * "07 Inventory"), read from the catalogue text. Items are made per test with
 * a new token (codes cannot be used twice).
 */
function row(shortName: string) {
  const r = catalogueOf('07').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 07 row "${shortName}"`);
  return r;
}

/** `Item QA-INV-PARA, "QA Paracetamol 500 mg"` -> { code, name } */
function items(shortName: string) {
  return [...row(shortName).what.matchAll(/(QA-INV-[A-Z]+) "([^"]+)"|(QA-INV-[A-Z]+), "([^"]+)"/g)].map((m) => ({ code: m[1] ?? m[3], name: m[2] ?? m[4] }));
}

const batch = (shortName: string) => {
  const m = row(shortName).what.match(/batch (QA-B\d+), expiry (\d+) days ahead, quantity (\d+)/);
  if (!m) throw new Error(`00-test-data.xlsx | Catalogue "${shortName}" has another wording`);
  return { batch: m[1], daysAhead: Number(m[2]), quantity: m[3] };
};

export const INVENTORY = {
  it1: items('IT-1')[0],
  itA: items('IT-A, IT-B')[0],
  itB: items('IT-A, IT-B')[1],
  kit: items('IT-KIT')[0],
  st1: { name: row('ST-1').what.match(/"([^"]+)"/)![1] },
  batch1: batch('Batch 1'),
  batch2: batch('Batch 2'),
  freezeDays: row('Freeze days').what.match(/(\d+)/)![1],
  request: {
    docNo: row('Request').what.match(/Document number (\S+),/)![1],
    department: row('Request').what.match(/department "([^"]+)"/)![1],
    remarks: row('Request').what.match(/remarks "(.+)"$/)![1],
  },
} as const;

/**
 * ST-1 "QA Gudang Farmasi" cannot be made: Stores has no "Add" and "Branch
 * and stores" answers HTTP 500 (found blocker 26). An active store of BR-A
 * from the seed data stands in for it (open question Q22); the test notes it.
 */
export const STAND_IN_STORE = { code: 'FI01-00-00', name: 'GUDANG FARMASI RUMAH SAKIT' } as const;
/** A second active store of BR-A from the seed data, for documents between two stores. */
export const STAND_IN_STORE_2 = { code: 'FI01-01-01', name: 'FARMASI REGULER' } as const;
