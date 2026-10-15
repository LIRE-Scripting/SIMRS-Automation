import { catalogueOf } from './qa-data';

/**
 * Shared data of 10 HR (00-test-data.xlsx | Catalogue, application "10 HR"),
 * read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('10').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 10 row "${shortName}"`);
  return r;
}

const emp1 = row('EMP-1').what.match(
  /Employee "([^"]+)", name "([^"]+)", BR-A, DEP-A, status (\w+), category "([^"]+)", gender "([^"]+)", designation "([^"]+)", date of birth (\d{4}-\d{2}-\d{2})/,
);
if (!emp1) throw new Error('00-test-data.xlsx | Catalogue "EMP-1" (10) has another wording');
const emp2 = row('EMP-2').what.match(/Employee "([^"]+)", name "([^"]+)"/)!;
const places = row('DEP-A, SC-A, ST-A').what.match(/department "([^"]+)", service center "([^"]+)", store "([^"]+)"/)!;
const annual = row('LT-ANNUAL').what.match(/Leave type "([^"]+)" \(type "([^"]+)"\), number of leaves (\d+)/)!;

export const HR = {
  emp1: { no: emp1[1], name: emp1[2], status: emp1[3] as 'Active', category: emp1[4], gender: emp1[5], designation: emp1[6], dob: emp1[7] },
  emp2: { no: emp2[1], name: emp2[2] },
  depA: places[1],
  scA: places[2],
  stA: places[3],
  annual: { name: annual[1], type: annual[2], leaves: annual[3] },
  off: { name: row('LT-OFF').what.match(/Leave type "([^"]+)"/)![1] },
} as const;

/** DEP-A exists on the site as "QA-DEP-1 · QA Poli Umum" (made by 01, Q14). */
export const DEP_A_HIT = HR.depA;
/** SC-A and ST-A are not on the site; QA-UNIT-1 and the 07 stand-in store stand in (Q25). */
export const SC_STAND_IN = { code: 'QA-UNIT-1', name: 'QA Ruang Tindakan' } as const;
