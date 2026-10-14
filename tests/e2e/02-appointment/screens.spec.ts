import { qaTest } from '../../../fixtures/e2e';
import { screenOpens } from '../shared/screen-opens';

/** 02-appointment.xlsx, the screen check of every route (TC-APP002-027 … 030, run as U2 on "All branches"). */
const SCREENS: [string, string, string][] = [
  ['TC-APP002-027', '/appointment', 'Appointment'],
  ['TC-APP002-028', '/appointment/cross-consult-types', 'Cross-consult types'],
  ['TC-APP002-029', '/appointment/referral-types', 'Referral types'],
  ['TC-APP002-030', '/appointment/schedule', 'Appointments'],
];

for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
