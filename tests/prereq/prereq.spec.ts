import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { installToastRecorder, toastMark } from '../../lib/assertions';
import { PASSWORD, SCREENSHOT_DIR } from '../../lib/config';
import { todayWib } from '../../lib/dates';
import { Desk } from '../modules/shared/desk';
import { createUser, pick, roles, signInAs, toastsAfter, users } from '../modules/18-settings/helpers';
import { BR_A, clickFor, PostingRules } from '../modules/19-finance/helpers';

/**
 * Prepares the site as 00-prerequisites.xlsx asks (sheets Users, Role
 * accounts, Set-up and data), once: the go-ahead of 2026-10-20 covers one
 * run. A finished run leaves reports/prereq/results.json; while that file
 * exists the spec saves nothing, except with PREREQ_RETRY=1: then only the
 * items recorded as Failed run again (their earlier result stays in the
 * notes) and every other item keeps its record. Every item checks the site first and only
 * saves what is missing. Each item records its result, notes and a
 * screenshot; npm run qa:prereq-evidence turns them into
 * reports/prereq/00-prerequisites-evidence.xlsx.
 *
 * All accounts made here share QA_PASSWORD, so a session can be saved for
 * them like for U1 and U2.
 */

const OUT_DIR = 'reports/prereq';
const RESULTS = path.join(OUT_DIR, 'results.json');
const SHOTS = path.join(SCREENSHOT_DIR, 'prereq');
const BRANCH = 'Podomoro';
const SECOND_BRANCH = 'Kemayoran';

type Result = 'Done' | 'Already present' | 'Failed' | 'Blocked' | 'Not possible' | 'Not done';
export type PrereqItem = {
  id: string;
  sheet: 'Users' | 'Role accounts' | 'Roles' | 'Set-up and data';
  ref: string;
  item: string;
  action: string;
  login?: string;
  roles?: string;
  branch?: string;
  result: Result;
  notes: string[];
  screenshots: string[];
  at: string;
};

const done: PrereqItem[] = [];
const RETRY = process.env.PREREQ_RETRY === '1';
const earlier = new Map<string, PrereqItem>(
  RETRY && fs.existsSync(RESULTS) ? (JSON.parse(fs.readFileSync(RESULTS, 'utf8')).items as PrereqItem[]).map((i) => [i.id, i]) : [],
);

/** Runs one item: records its result and notes; an error ends the item as Failed, not the run. On a retry only a Failed item runs again. */
async function item(page: Page, base: Omit<PrereqItem, 'result' | 'notes' | 'screenshots' | 'at'>, fn: (r: PrereqItem) => Promise<void>): Promise<void> {
  const before = earlier.get(base.id);
  if (before && before.result !== 'Failed') {
    done.push(before);
    return;
  }
  const r: PrereqItem = { ...base, result: 'Done', notes: [], screenshots: [...(before?.screenshots ?? [])], at: new Date().toISOString() };
  if (before) r.notes.push(`first run ${before.at.slice(0, 16)}: Failed (${before.notes.join('; ')}); run again`);
  try {
    await fn(r);
  } catch (e) {
    r.result = 'Failed';
    r.notes.push(`error: ${String((e as Error).message).replace(/\x1b\[[0-9;]*m/g, '').split('\n')[0]}`);
    await shot(page, r, 'error').catch(() => {});
  }
  done.push(r);
}

async function shot(page: Page, r: PrereqItem, label: string): Promise<void> {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `${r.id}-${r.screenshots.length + 1}-${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  r.screenshots.push(file);
}

// ------------------------------------------------------------ roles

/** Picks a role on User Rights (the typed list of role names). */
async function pickRole(page: Page, name: string): Promise<void> {
  await page.goto('/en/identity/rights');
  await pick(page.getByRole('main').getByRole('combobox', { name: 'Role' }), name);
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** Role names known on User Rights that start with the text. */
async function roleExists(page: Page, name: string): Promise<boolean> {
  await page.goto('/en/identity/rights');
  const box = page.getByRole('main').getByRole('combobox', { name: 'Role' });
  await box.fill(name);
  const list = page.locator('#rights-role-list').getByRole('option');
  await list.first().waitFor({ timeout: 3_000 }).catch(() => {});
  return (await list.allInnerTexts()).some((t) => t.trim().split('\n')[0] === name);
}

type NewRole = { key: string; name: string; description: string; rights: string[]; ref: string };

/** Roles the workbook needs that the site lacks (sheet Role accounts: no role holds the right). */
const NEW_ROLES: NewRole[] = [
  { key: 'R1', name: 'qa_staff', description: 'X QA staff tanpa hak tulis (U3)', rights: [], ref: 'Users | U3' },
  { key: 'R2', name: 'qa_rawat_inap', description: 'X QA perawat rawat inap (04 Inpatient)', rights: ['ADT_WRITE'], ref: 'Role accounts | 04 Inpatient' },
  {
    key: 'R3',
    name: 'qa_settings',
    description: 'X QA administrator settings (18 Settings)',
    rights: ['MDM_WRITE', 'IDENTITY_ROLES_READ', 'IDENTITY_ROLES_WRITE', 'IDENTITY_ROLE_PRIVILEGES_WRITE', 'IDENTITY_USERS_READ', 'IDENTITY_USERS_WRITE', 'WORKFLOW_WRITE'],
    ref: 'Role accounts | 18 Settings',
  },
  { key: 'R4', name: 'qa_services', description: 'X QA services officer (22 Services)', rights: ['SERVICES_WRITE'], ref: 'Role accounts | 22 Services' },
  { key: 'R5', name: 'qa_sourcing', description: 'X QA sourcing officer (23 Sourcing)', rights: ['SOURCING_WRITE'], ref: 'Role accounts | 23 Sourcing' },
];

/** Roles whose rights could not be given (blocker 38): their accounts are not made. */
const unusableRoles = new Set<string>();

// ------------------------------------------------------------ users

type NewAccount = { id: string; sheet: PrereqItem['sheet']; ref: string; login: string; fullName: string; roles: string[]; branch: string; linkEmployee?: boolean };

const USERS: NewAccount[] = [
  { id: 'U3', sheet: 'Users', ref: 'Users | U3', login: 'qa.staff', fullName: 'X QA Staff Tanpa Hak Tulis', roles: ['qa_staff'], branch: BRANCH },
  { id: 'U4', sheet: 'Users', ref: 'Users | U4', login: 'qa.admin3', fullName: 'X QA Admin Kedua', roles: ['admin'], branch: BRANCH },
  { id: 'U5', sheet: 'Users', ref: 'Users | U5', login: 'qa.approver', fullName: 'X QA Approver', roles: ['finance', 'budget', 'cssd', 'procurement'], branch: BRANCH },
  { id: 'U6', sheet: 'Users', ref: 'Users | U6', login: 'qa.kemayoran', fullName: 'X QA Admin Kemayoran', roles: ['admin'], branch: SECOND_BRANCH },
  { id: 'U7', sheet: 'Users', ref: 'Users | U7', login: 'qa.pegawai', fullName: 'X QA Pegawai', roles: ['hrd', 'payroll'], branch: BRANCH, linkEmployee: true },
];

/** U8: one account per application (sheet Role accounts); 01 and 02 share the clerk. */
const ROLE_ACCOUNTS: [app: string, login: string, persona: string, role: string][] = [
  ['01 Ambulatory Care, 02 Appointment', 'qa.pendaftaran', 'Petugas Pendaftaran', 'pendaftaran'],
  ['03 Patient Care', 'qa.dokter', 'Dokter', 'dokter'],
  ['04 Inpatient', 'qa.perawat.ri', 'Perawat Rawat Inap', 'qa_rawat_inap'],
  ['05 Pharmacy', 'qa.apoteker', 'Apoteker', 'apoteker'],
  ['06 Transfusion Medicine', 'qa.bankdarah', 'Petugas Bank Darah', 'bankdarah'],
  ['07 Inventory', 'qa.gudang', 'Petugas Gudang', 'gudang'],
  ['08 Operation Theater', 'qa.ok', 'Perawat Kamar Operasi', 'ok'],
  ['09 Procurement', 'qa.procurement', 'Petugas Pengadaan', 'procurement'],
  ['10 HR', 'qa.hrd', 'Admin HR', 'hrd'],
  ['11 Laboratory', 'qa.analis', 'Analis Lab', 'analis'],
  ['12 RIS', 'qa.radiografer', 'Radiografer', 'radiografer'],
  ['13 Dietary', 'qa.gizi', 'Ahli Gizi', 'gizi'],
  ['14 Hospital Accounts', 'qa.kasir', 'Kasir', 'kasir'],
  ['15 Emergency', 'qa.igd', 'Perawat IGD', 'igd'],
  ['16 MRD', 'qa.rekammedis', 'Petugas Rekam Medis', 'rekammedis'],
  ['17 Payroll', 'qa.payroll', 'Petugas Payroll', 'payroll'],
  ['18 Settings', 'qa.settings', 'Admin Settings', 'qa_settings'],
  ['19 Finance', 'qa.finance', 'Akuntan', 'finance'],
  ['20 Budget', 'qa.budget', 'Petugas Anggaran', 'budget'],
  ['21 CSSD', 'qa.cssd', 'Petugas CSSD', 'cssd'],
  ['22 Services', 'qa.services', 'Petugas Services', 'qa_services'],
  ['23 Sourcing', 'qa.sourcing', 'Petugas Sourcing', 'qa_sourcing'],
  ['24 Housekeeping', 'qa.housekeeping', 'Supervisor Housekeeping', 'housekeeping'],
  ['25 Linen', 'qa.linen', 'Supervisor Linen', 'linen'],
  ['26 Maintenance', 'qa.ipsrs', 'Petugas IPSRS', 'ipsrs'],
  ['27 Fixed assets', 'qa.aset', 'Admin Aset', 'aset'],
];

const ACCOUNTS: NewAccount[] = [
  ...USERS,
  ...ROLE_ACCOUNTS.map(([app, login, persona, role], i) => ({
    id: `U8-${String(i + 1).padStart(2, '0')}`,
    sheet: 'Role accounts' as const,
    ref: `Role accounts | ${app}`,
    login,
    fullName: `X QA ${persona}`,
    roles: [role],
    branch: BRANCH,
  })),
];

/** The row of a login on Users, found by the search box (a search lists far fewer than one page). */
async function userRow(page: Page, login: string) {
  const u = users(page);
  await u.open();
  await u.search.fill(login);
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(u.main.getByText(/^Showing \d+[–-]\d+ of \d+$|No users yet\./).first()).toBeVisible();
  await expect.poll(async () => (await u.rows().allInnerTexts()).every((t) => t.includes(login) || /No users yet/.test(t)), { timeout: 10_000 }).toBe(true).catch(() => {});
  return u.rows().filter({ has: page.getByRole('cell', { name: login, exact: true }) });
}

/** Signs in as the account and shows My profile (roles, active branch) as the evidence; returns the signed-in page. */
async function proveSignIn(browser: Browser, a: NewAccount, r: PrereqItem): Promise<Page | null> {
  const s = await signInAs(browser, a.login, PASSWORD);
  if (!s.ok) {
    r.result = 'Failed';
    r.notes.push(`sign-in refused: "${s.message}"`);
    await s.page.screenshot({ path: path.join(SHOTS, `${r.id}-signin-refused.png`), fullPage: true });
    r.screenshots.push(path.join(SHOTS, `${r.id}-signin-refused.png`));
    await s.context.close();
    return null;
  }
  await s.page.goto('/en/me');
  await expect(s.page.getByRole('main').getByText(/active branch/i)).toBeVisible();
  const profile = (await s.page.getByRole('main').innerText()).replace(/\s+/g, ' ');
  const m = profile.match(/ROLES (.*?) ACTIVE BRANCH (.*?) ACTIVE STORE/i);
  r.notes.push(`sign-in OK; My profile: roles "${m?.[1] ?? '?'}", active branch "${m?.[2] ?? '?'}"`);
  if (m && !m[2].includes(a.branch)) r.notes.push(`active branch on My profile is "${m[2]}": a new account has not chosen its branch yet (Preferences); Branch map holds the roles at ${a.branch}`);
  await shot(s.page, r, 'my-profile');
  return s.page;
}

/** U7: the employee record and "Link me" on the HR desk, as the account itself. */
async function linkEmployee(me: Page, r: PrereqItem): Promise<void> {
  await installToastRecorder(me);
  const desk = new Desk(me, '/hr/desk', 'My profile', 'Employee');
  const no = 'X-EMP-QA-PEGAWAI';
  const rows = await desk.list(no).catch(() => [] as string[][]);
  if (!rows.some((row) => row.join(' ').includes(no))) {
    const t1 = await desk.save({ 'Employee no': no, 'Name / location / kind': 'X QA Pegawai' }, 'Employee');
    r.notes.push(`employee ${no}: toast "${t1.join(' / ')}"`);
  } else r.notes.push(`employee ${no} already on the desk`);
  const t2 = await desk.save({ 'Employee no': no }, 'Link me');
  r.notes.push(`Link me: toast "${t2.join(' / ')}"`);
  if (!t2.includes('Saved.')) r.result = 'Failed';
  await desk.open();
  await shot(me, r, 'hr-desk-linked');
  await me.goto('/en/hr/desk/attendance');
  await me.waitForLoadState('networkidle').catch(() => {});
  await shot(me, r, 'punch-screen');
}

// ------------------------------------------------------------ the run

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  test.skip(process.env.QA_ALLOW_WRITES !== '1', 'needs the go-ahead: QA_ALLOW_WRITES=1');
  test.skip(fs.existsSync(RESULTS) && !RETRY, `${RESULTS} exists: the one run allowed by the go-ahead is done (PREREQ_RETRY=1 runs its Failed items again)`);
  await installToastRecorder(page);
});

test.afterAll(() => {
  if (done.length) fs.writeFileSync(RESULTS, JSON.stringify({ site: 'https://rs.showcase.atklik.xyz', runAt: new Date().toISOString(), runBy: 'U1 rs.admin2', items: done }, null, 1));
});

test('00 go-ahead, patients, deferred users', async ({ page }) => {
  await item(page, { id: 'S01', sheet: 'Set-up and data', ref: 'Set-up and data | 1', item: 'Go-ahead to create data on the site', action: 'Recorded' }, async (r) => {
    r.notes.push('go-ahead given in the session of 2026-10-20 for one run: users, roles and the set-up of this sheet, branch Podomoro, test data with the prefix "X "/"qa."');
  });
  await item(page, { id: 'S02', sheet: 'Set-up and data', ref: 'Set-up and data | 2', item: 'Patients for testing', action: 'None' }, async (r) => {
    r.result = 'Not done';
    r.notes.push('needs the requester to confirm that the patients on the site are made up; the journeys make their own "X " patients');
  });
  await item(page, { id: 'U9', sheet: 'Users', ref: 'Users | U9', item: 'Account with the licensing right', action: 'Checked User Rights' }, async (r) => {
    await page.goto('/en/identity/rights');
    await page.waitForLoadState('networkidle').catch(() => {});
    const has = await page.getByRole('main').getByRole('checkbox', { name: /^LICENSING_WRITE\b/ }).count();
    await shot(page, r, 'rights-list');
    r.result = has ? 'Not done' : 'Not possible';
    r.notes.push(has ? 'LICENSING_WRITE exists; not made (screens Tenants and Entitlements are out of scope)' : 'the tenant offers no privilege LICENSING_WRITE on User Rights (40 privileges); a platform role is needed');
  });
  await item(page, { id: 'U10', sheet: 'Users', ref: 'Users | U10', item: 'Second tenant, tenant without a licence, platform superadmin', action: 'None' }, async (r) => {
    r.result = 'Not done';
    r.notes.push('deferred in the workbook: needs a decision and a second tenant');
  });
});

test('01 roles the site lacks', async ({ page }) => {
  for (const role of NEW_ROLES) {
    await item(page, { id: role.key, sheet: 'Roles', ref: role.ref, item: `Role ${role.name}`, action: 'Add Role, then Save rights', roles: role.rights.join(', ') || '(no privilege)' }, async (r) => {
      if (await roleExists(page, role.name)) {
        r.result = 'Already present';
        r.notes.push('the role exists');
      } else {
        const rl = roles(page);
        const t = await rl.add({ 'Role name': role.name, Description: role.description });
        r.notes.push(`Add Role: toast "${t.join(' / ')}"`);
        if (!t.includes('Role added.')) {
          r.result = 'Failed';
          unusableRoles.add(role.name);
          await shot(page, r, 'add-role');
          return;
        }
      }
      await pickRole(page, role.name);
      const main = page.getByRole('main');
      if (role.rights.length) {
        for (const right of role.rights) await main.getByRole('checkbox', { name: new RegExp(`^${right}\\b`) }).check();
        const mark = await toastMark(page);
        await main.getByRole('button', { name: 'Save rights' }).click();
        const t = await toastsAfter(page, mark);
        r.notes.push(`Save rights (${role.rights.join(', ')}): toast "${t.join(' / ')}"`);
        if (!t.includes('Rights updated.')) {
          r.result = t.includes('Failed to save rights.') ? 'Blocked' : 'Failed';
          if (r.result === 'Blocked') r.notes.push('blocker 38: saving the rights of a role answers HTTP 500; the accounts of this role are not made');
          unusableRoles.add(role.name);
        }
        await pickRole(page, role.name);
      }
      const counter = await main.getByText(/^\d+ \/ \d+$/).innerText();
      r.notes.push(`privileges on User Rights: ${counter}`);
      await shot(page, r, 'rights');
    });
  }
});

test('02 users and role accounts', async ({ page, browser }) => {
  test.setTimeout(30 * 60_000);
  for (const a of ACCOUNTS) {
    await item(page, { id: a.id, sheet: a.sheet, ref: a.ref, item: a.fullName, action: 'Add User, sign in, My profile', login: a.login, roles: a.roles.join(', '), branch: a.branch }, async (r) => {
      const blocked = a.roles.filter((x) => unusableRoles.has(x));
      if (blocked.length) {
        r.result = 'Blocked';
        r.notes.push(`not made: the role ${blocked.join(', ')} has no usable rights (see sheet Roles)`);
        return;
      }
      const row = await userRow(page, a.login);
      if (await row.count()) {
        r.result = 'Already present';
        r.notes.push(`the login exists: ${(await users(page).cells(row)).join(' | ')}`);
      } else {
        const t = await createUser(page, { login: a.login, fullName: a.fullName, email: `${a.login}@example.test`, password: PASSWORD, branch: a.branch, roles: a.roles });
        r.notes.push(`Add User (branch ${a.branch}, roles ${a.roles.join(', ')}): toast "${t.join(' / ')}"`);
        if (!t.includes('User added.')) {
          r.result = 'Failed';
          await shot(page, r, 'add-user');
          return;
        }
      }
      await shot(page, r, 'users-list');
      const me = await proveSignIn(browser, a, r);
      if (me && a.linkEmployee) await linkEmployee(me, r);
      await me?.context().close();
    });
  }
});

test('03 set-up and data', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const main = page.getByRole('main');

  await item(page, { id: 'S04', sheet: 'Set-up and data', ref: 'Set-up and data | 4', item: 'Diagnosis code version', action: 'None' }, async (r) => {
    r.result = 'Not possible';
    r.notes.push('no screen imports or activates a code version (API or seed by the site administrator)');
  });

  await item(page, { id: 'S05', sheet: 'Set-up and data', ref: 'Set-up and data | 5', item: 'Item below its minimum stock (Reorder, Podomoro)', action: 'Checked Reorder' }, async (r) => {
    await page.goto('/en/procurement/reorder');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = (await main.innerText()).replace(/\s+/g, ' ');
    const items = text.match(/[A-Z0-9-]+ \d+ ·/g) ?? [];
    await shot(page, r, 'reorder');
    r.result = items.length ? 'Already present' : 'Not done';
    r.notes.push(items.length ? `Reorder lists ${items.length}+ items below their minimum (e.g. ${items.slice(0, 3).join(' ')}); nothing saved` : 'Reorder is empty; an item below its minimum needs a stock set-up');
  });

  await item(page, { id: 'S06', sheet: 'Set-up and data', ref: 'Set-up and data | 6', item: 'User linked to an employee', action: 'See U7' }, async (r) => {
    const u7 = done.find((d) => d.id === 'U7');
    r.result = u7?.result ?? 'Not done';
    r.notes.push(`done with U7 (${u7?.login ?? 'qa.pegawai'}): ${u7?.notes.filter((n) => /Link me|employee/.test(n)).join('; ') ?? 'U7 did not run'}`);
  });

  await item(page, { id: 'S07', sheet: 'Set-up and data', ref: 'Set-up and data | 7', item: 'Emergency registration configuration (type 7, Podomoro)', action: 'Checked the screen' }, async (r) => {
    await page.goto('/en/emergency/registration?type=7');
    await page.waitForLoadState('networkidle').catch(() => {});
    const msg = await main.getByText(/registration configuration/).allInnerTexts();
    await shot(page, r, 'emergency-registration');
    r.result = msg.length ? 'Not possible' : 'Already present';
    r.notes.push(msg.length ? `"${msg[0]}"; no screen of Settings or Registration makes a registration configuration (site administrator)` : 'the form shows: a configuration exists');
  });

  await item(page, { id: 'S08', sheet: 'Set-up and data', ref: 'Set-up and data | 8', item: 'Finance configuration of Podomoro', action: 'Finance configuration, Save' }, async (r) => {
    await page.goto('/en/finance/configuration');
    await expect(main.getByRole('heading', { level: 1, name: 'Finance configuration' })).toBeVisible();
    await main.getByRole('combobox', { name: 'Branch' }).selectOption({ label: BR_A });
    await page.waitForLoadState('networkidle').catch(() => {});
    const state = (await main.getByText(/This branch (has no|already has a)/).first().innerText()).trim();
    r.notes.push(`before: "${state}"`);
    if (/already has/.test(state)) {
      r.result = 'Already present';
      await shot(page, r, 'finance-configuration');
      return;
    }
    const year = todayWib().slice(0, 4);
    await main.getByRole('combobox', { name: 'Current financial year' }).selectOption({ label: year });
    await main.getByRole('textbox', { name: 'Back-dated days' }).fill('3');
    await main.getByRole('textbox', { name: 'Instrument validity (days)' }).fill('90');
    const chosen: string[] = [];
    // The site has only these accounts: 1101 Kas, 4101 Pendapatan and the "QA ..." accounts of earlier runs (newest used).
    const plan: [string, RegExp][] = [
      ['Cash', /^1101 /],
      ['Bank', /^QA-1010-/],
      ['Patient cash', /^1101 /],
      ['Patient bank', /^QA-1010-/],
      ['Patient control', /^1101 /],
      ['Revenue', /^4101 /],
      ['Surplus / deficit', /^QA-3010-/],
    ];
    for (const [box, re] of plan) {
      const sel = main.getByRole('combobox', { name: box, exact: true });
      const label = (await sel.locator('option').allInnerTexts()).filter((o) => re.test(o)).pop();
      if (!label) throw new Error(`no account for ${box}`);
      await sel.selectOption({ label });
      chosen.push(`${box}: ${label}`);
    }
    r.notes.push(`year ${year}; back-dated 3 days; instrument validity 90 days; ${chosen.join('; ')}`);
    const who = main.getByRole('combobox', { name: 'Users allowed to transact' });
    for (const login of ['rs.admin2', 'qa.finance']) {
      const label = (await who.locator('option').allInnerTexts()).find((o) => o.endsWith(`· ${login}`));
      if (!label) continue;
      await who.selectOption({ label });
      await main.getByRole('button', { name: 'Add user' }).click();
      r.notes.push(`user allowed to transact: ${label}`);
    }
    const t = await clickFor(page, main.getByRole('button', { name: 'Save' }).last());
    r.notes.push(`Save: toast "${t.join(' / ')}"`);
    if (!t.includes('Configuration saved.')) r.result = 'Failed';
    await shot(page, r, 'finance-configuration');
    await page.goto('/en/finance/collections');
    await page.waitForLoadState('networkidle').catch(() => {});
    const still = await main.getByText(/has no finance configuration/).count();
    r.notes.push(`Patient collections (Podomoro): ${still ? 'still "This branch has no finance configuration."' : 'no longer says the branch has no finance configuration'}`);
    await shot(page, r, 'patient-collections');
  });

  await item(page, { id: 'S09', sheet: 'Set-up and data', ref: 'Set-up and data | 9', item: 'Budget posting rules of Podomoro and approvers', action: 'Budget posting rules, Save; read Process definitions' }, async (r) => {
    const rules = new PostingRules(page);
    await rules.open(BR_A);
    const plan: [string, RegExp, RegExp][] = [
      ['Allocation — capital', /^QA-1501-/, /^QA-3010-/],
      ['Allocation — operating', /^QA-5010-/, /^QA-3010-/],
    ];
    for (const [kind, debit, credit] of plan) {
      // Saving one row redraws the table and clears the choices of the others: open the screen again for each rule.
      await rules.open(BR_A);
      const status = await rules.status(kind);
      if (status !== 'Not set') {
        r.notes.push(`${kind}: already "${status}"`);
        continue;
      }
      const d = (await rules.debit(kind).locator('option').allInnerTexts()).filter((o) => debit.test(o)).pop()!;
      const c = (await rules.credit(kind).locator('option').allInnerTexts()).filter((o) => credit.test(o)).pop()!;
      await rules.debit(kind).selectOption({ label: d });
      await rules.credit(kind).selectOption({ label: c });
      const t = await rules.save(kind);
      r.notes.push(`${kind}: debit ${d}, credit ${c}: toast "${t.join(' / ')}"`);
      if (!t.includes(`${kind} rule saved.`)) r.result = 'Failed';
    }
    await rules.open(BR_A);
    await shot(page, r, 'posting-rules');
    await page.goto('/en/workflow/process-definitions');
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot(page, r, 'process-definitions');
    r.notes.push('Process definitions: each budget chain has 1 step ("Persetujuan"); the chain editor names steps only and has no field for an approver, so the approver is whoever holds BUDGET_APPROVE (U5 qa.approver, U8 qa.budget)');
  });

  await item(page, { id: 'S10', sheet: 'Set-up and data', ref: 'Set-up and data | 10', item: 'CSSD: passed Bowie Dick today, category KITS, drug form KIT', action: 'Bowie Dick, Save; Inventory set-up, category' }, async (r) => {
    const today = todayWib();
    await page.goto('/en/cssd/bowie-tests');
    await page.waitForLoadState('networkidle').catch(() => {});
    const autoclave = await main.getByRole('combobox', { name: 'Autoclave' }).evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.text ?? '');
    const passedToday = main.locator('tr').filter({ hasText: today }).filter({ hasText: autoclave }).filter({ hasText: 'Pass' });
    const already = await passedToday.count();
    if (already) r.notes.push(`Bowie Dick: ${autoclave} already passed on ${today}`);
    else {
      const date = main.getByLabel('Date', { exact: true });
      if ((await date.inputValue()) !== today) await date.fill(today);
      await main.getByLabel('Batch', { exact: true }).fill(`X-BD-${today.replace(/-/g, '')}`);
      await main.getByLabel('Load number', { exact: true }).fill('1');
      await main.getByRole('combobox', { name: 'Result' }).selectOption({ label: 'Pass' });
      const indicator = await main.getByRole('combobox', { name: 'Indicator type' }).evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.text ?? '');
      const t = await clickFor(page, main.getByRole('button', { name: 'Save' }).first());
      r.notes.push(`Bowie Dick ${today}, ${autoclave}, indicator ${indicator}, Pass: toast "${t.join(' / ')}" (valid for today only; the first cycle of each later day needs its own test)`);
      if (!(await passedToday.count())) r.result = 'Failed';
    }
    await shot(page, r, 'bowie-dick');

    await page.goto('/en/inventory/setup');
    await page.waitForLoadState('networkidle').catch(() => {});
    if (/\bKITS\b/.test(await main.innerText())) r.notes.push('item category KITS already on Inventory set-up');
    else {
      await main.getByRole('textbox', { name: 'Code' }).first().fill('KITS');
      await main.getByRole('textbox', { name: 'Name' }).first().fill('KITS');
      const t = await clickFor(page, main.getByRole('button', { name: 'Save' }).first());
      r.notes.push(`item category KITS: toast "${t.join(' / ')}"`);
      await page.reload();
      await page.waitForLoadState('networkidle').catch(() => {});
      if (!/\bKITS\b/.test(await main.innerText())) r.result = 'Failed';
    }
    await shot(page, r, 'inventory-setup');
    r.notes.push('drug form KIT: no screen of Inventory or Pharmacy keeps drug forms; left to the site administrator');
    if (r.result === 'Done') r.notes.push('partly done: drug form KIT open');
  });

  await item(page, { id: 'S11', sheet: 'Set-up and data', ref: 'Set-up and data | 11', item: 'Records made in another application', action: 'None' }, async (r) => {
    r.result = 'Not done';
    r.notes.push('made by the feeding journeys themselves (E2E chains, npm run test:e2e), not by this set-up run');
  });
  await item(page, { id: 'S12', sheet: 'Set-up and data', ref: 'Set-up and data | 12', item: 'Defects that stop journeys', action: 'None' }, async (r) => {
    r.result = 'Not possible';
    r.notes.push('for Development; see 00-blockers-checklist-linked.xlsx');
  });
});
