import { qaTest } from '../../../fixtures/e2e';
import { screenOpens } from '../shared/screen-opens';

/** 03-patient-care.xlsx, the screen check of every route (TC-APP003-057 … 060, run as U2 on "All branches"). */
const SCREENS: [string, string, string][] = [
  ['TC-APP003-057', '/clinical', 'Patient Care'],
  ['TC-APP003-058', '/clinical/consultation', 'Consultation'],
  ['TC-APP003-059', '/clinical/follow-ups', 'Follow-up'],
  ['TC-APP003-060', '/clinical/terminology', 'Terminology'],
];

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
