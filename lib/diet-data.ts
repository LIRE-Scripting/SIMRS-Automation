import { catalogueOf } from './qa-data';

/**
 * Shared data of 13 Dietary (00-test-data.xlsx | Catalogue, application
 * "13 Dietary"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('13').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 13 row "${shortName}"`);
  return r;
}

const bed = row('Bed').what.match(/Bed number "([^"]+)", bed category "([^"]+)"/)!;
const tpn = row('TPN-A').what;
const num = (label: string) => {
  const m = tpn.match(new RegExp(`${label} (\\d+(?:\\.\\d+)?)`));
  if (!m) throw new Error(`00-test-data.xlsx | Catalogue "TPN-A" has no ${label}`);
  return m[1];
};

export const DIET = {
  request: { docNo: row('RQ-1').what.match(/"([^"]+)"/)![1], bedNo: bed[1], bedCategory: bed[2] },
  pt1: { name: row('PT-1').what.match(/"([^"]+)"/)![1] },
  tpn: {
    patient: tpn.match(/Patient name "([^"]+)"/)![1],
    height: num('height'),
    heightUnit: tpn.match(/height \d+ with unit (\w+)/)![1],
    weight: num('weight'),
    weightUnit: tpn.match(/weight \d+ with unit (\w+)/)![1],
    energy: num('energy'),
    protein: num('protein'),
    fluid: num('fluid'),
    lipid: num('lipid'),
    sodium: num('sodium'),
    potassium: num('potassium'),
    calcium: num('calcium'),
    magnesium: num('magnesium'),
    phosphate: num('phosphate'),
    mvi: num('MVI-12'),
    trace: num('trace metals'),
  },
  template: row('TPL-1').what.match(/Template "([^"]+)"/)![1],
} as const;
