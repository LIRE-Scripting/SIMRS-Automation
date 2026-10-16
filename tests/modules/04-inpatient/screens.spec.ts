import { qaTest } from '../../../fixtures/e2e';
import { screenOpens } from '../shared/screen-opens';

/** 04-inpatient.xlsx, the screen check of every route (TC-APP004-082 … 087, run as U2 on "All branches"). */
const SCREENS: [string, string, string][] = [
  ['TC-APP004-082', '/adt', 'Inpatient'],
  ['TC-APP004-083', '/adt/admissions', 'Admissions'],
  ['TC-APP004-084', '/adt/beds', 'Bed management'],
  ['TC-APP004-085', '/adt/discharges', 'Discharges'],
  ['TC-APP004-086', '/adt/requests', 'Admission requests'],
  ['TC-APP004-087', '/adt/ward', 'Ward care'],
];

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
