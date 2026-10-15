import { qaTest } from '../../../fixtures/e2e';
import { screenOpens } from '../shared/screen-opens';

/** 18-settings.xlsx: the screen check of every route (TC-APP018-061 … 090, U2). */

const SCREENS: [string, string, string][] = [
  ['TC-APP018-061', '/audit', 'Audit Log'],
  ['TC-APP018-062', '/entitlements', 'Entitlements'],
  ['TC-APP018-063', '/identity', 'Security / Settings'],
  ['TC-APP018-064', '/identity/audit-retention', 'Audit retention'],
  ['TC-APP018-065', '/identity/branding', 'Tenant Branding'],
  ['TC-APP018-066', '/identity/dashboard', 'Configure dashboard'],
  ['TC-APP018-067', '/identity/features', 'Feature Branch Mapping'],
  ['TC-APP018-068', '/identity/login-log', 'User Login Log'],
  ['TC-APP018-069', '/identity/notifications', 'Notification config'],
  ['TC-APP018-070', '/identity/password', 'Password Configuration'],
  ['TC-APP018-071', '/identity/rights', 'User Rights'],
  ['TC-APP018-072', '/identity/roles', 'Roles'],
  ['TC-APP018-073', '/identity/second-level', 'Second-level security'],
  ['TC-APP018-074', '/identity/site-maps', 'User Site Mapping'],
  ['TC-APP018-075', '/identity/theme-overrides', 'Tenant Branding'],
  ['TC-APP018-076', '/identity/users', 'Users'],
  ['TC-APP018-077', '/mdm', 'Settings'],
  ['TC-APP018-078', '/mdm/departments', 'Departments'],
  ['TC-APP018-079', '/mdm/facility-time', 'Facility time'],
  ['TC-APP018-080', '/mdm/holidays', 'Holidays'],
  ['TC-APP018-081', '/mdm/packs/cities', 'Cities'],
  ['TC-APP018-082', '/mdm/packs/countries', 'Countries'],
  ['TC-APP018-083', '/mdm/packs/units-of-measure', 'Units of Measure'],
  ['TC-APP018-084', '/mdm/service-centers', 'Service Centers'],
  ['TC-APP018-085', '/mdm/sites', 'Sites'],
  ['TC-APP018-086', '/mdm/tax-codes', 'Tax Codes'],
  ['TC-APP018-087', '/settings', 'Settings'],
  ['TC-APP018-088', '/tenants', 'Tenants'],
  ['TC-APP018-089', '/workflow', 'Workflow'],
  ['TC-APP018-090', '/workflow/process-definitions', 'Process Definitions'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading, qa));
  });
}
