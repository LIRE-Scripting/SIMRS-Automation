import type { Locator, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { authFileOf } from '../../../lib/config';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { png } from './png';
import { createUser, fillUser, invalidFields, newPassword, pick, roles, signInAs, toastsAfter, users, type NewUser } from './helpers';
import { TC_APP018_037, TC_APP018_039 } from './cases';

/**
 * 18-settings.xlsx: Users, Roles, Rights, Branch map, Sign-in log, Brand,
 * Theme, Dashboard, Notifications, Password and the Audit trail. Test
 * accounts and roles carry a token; passwords of test accounts are random
 * per run and never reported; each test account is blocked at the end of its
 * test. Steps that would lock out the shared administrator (blocking the own
 * account, taking away the role admin or its right to grant rights) are not
 * run. Branding is put back to what it was at the end of each test.
 */

test.use({ actionTimeout: 15_000 });

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const BRANCH = 'Daan Mogot';
const ROLE = 'perawat';

function userData(qa: Qa, roles = [ROLE]): NewUser {
  const login = `qa.perawat1.${qa.token().toLowerCase()}`;
  return { login, fullName: qa.name('X Perawat Uji'), email: `${login}@example.test`, password: newPassword(), branch: BRANCH, roles };
}

async function newUser(page: Page, qa: Qa, roleNames?: string[]): Promise<NewUser> {
  const u = userData(qa, roleNames);
  expect(await createUser(page, u)).toContain('User added.');
  return u;
}

/** Blocks a test account (end of a test). */
async function block(page: Page, login: string): Promise<void> {
  const u = users(page);
  await u.edit(login).catch(() => {});
  if (!(await u.dialog.isVisible())) return;
  await u.advanced();
  await u.dialog.getByRole('checkbox', { name: 'Blocked' }).check();
  await u.save();
}

const cellsOf = async (row: Locator) => (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());

/** The lines of a login on Branch map. */
async function mapLines(page: Page, login: string): Promise<Locator> {
  await page.goto('/en/identity/site-maps');
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'User Site Mapping' })).toBeVisible();
  return page.getByRole('main').getByRole('row').filter({ has: page.getByRole('cell', { name: login, exact: true }) });
}

qaTest('TC-APP018-031', async ({ page, qa, browser }) => {
  const u = users(page);
  const v = userData(qa);
  try {
    await qa.step(1, async () => {
      await page.goto('/en/settings');
      await page.getByRole('main').getByRole('link', { name: /^Users\b/ }).click();
      await expect(u.main.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
      await expect(u.main.getByText('Users of this hospital.', { exact: true })).toBeVisible();
      await expect(u.search).toBeVisible();
      await expect(u.status).toBeVisible();
      await expect(u.main.getByRole('button', { name: 'Add User' })).toBeVisible();
      await expect(u.main.getByRole('columnheader')).toHaveText(['Login', 'Full name', 'Email', 'Roles', 'Status', 'Actions']);
    });
    await qa.step(2, async () => {
      await u.main.getByRole('button', { name: 'Add User' }).click();
      await expect(u.dialog).toHaveAccessibleName('Add User');
      await expect(u.dialog.getByText('Create or update a tenant user and assign roles.')).toBeVisible();
      for (const f of ['Login', 'Full name', 'Email', 'Password']) await expect(u.dialog.getByRole('textbox', { name: f })).toBeVisible();
      for (const f of ['Branch', 'Store']) await expect(u.dialog.getByRole('combobox', { name: f })).toBeVisible();
      await expect(u.dialog.getByRole('checkbox', { name: ROLE, exact: true })).toBeVisible();
      for (const b of ['Cancel', 'Save']) await expect(u.dialog.getByRole('button', { name: b })).toBeVisible();
    });
    await qa.step(3, async () => {
      expect(await fillUser(u, v)).toContain('User added.');
      const c = await u.cells(await u.row(v.login));
      expect([c[0], c[1], c[2], c[4]]).toEqual([v.login, v.fullName, v.email, 'Active']);
      if (c[3] !== ROLE) qa.deviation(3, `a row with the role "${ROLE}"`, `"Roles" reads "${c[3]}"`);
    });
    await qa.step(4, async () => {
      const lines = await mapLines(page, v.login);
      await expect(lines).toHaveCount(1);
      expect((await cellsOf(lines)).slice(0, 3)).toEqual([v.login, v.fullName, ROLE]);
      const branch = await lines.getByRole('combobox', { name: 'Branch' }).inputValue();
      if (!branch.includes(BRANCH)) qa.deviation(4, `the branch that was chosen (${BRANCH})`, `the line's branch is empty ("every branch")`);
    });
    await qa.step(5, async () => {
      const s = await signInAs(browser, v.login, v.password);
      try {
        expect(s.ok, s.message).toBe(true);
        const apps = (await s.page.getByRole('main').getByRole('link').allInnerTexts()).map((t) => t.split('\n')[0].trim()).filter(Boolean);
        const banner = (await s.page.getByRole('banner').first().innerText()).replace(/\s+/g, ' ');
        qa.note(5, `apps: ${apps.join(', ')}; header: "${banner}"`);
        if (!banner.includes(BRANCH)) qa.deviation(5, 'Only the chosen branch in the header', `the header names no branch: "${banner}"`);
      } finally {
        await s.context.close();
      }
    });
    await qa.step(6, async () => {
      await page.goto('/en/audit');
      await page.getByRole('textbox', { name: 'Action' }).fill('user.create');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle').catch(() => {});
      const first = (await page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row').first().innerText()).replace(/\s+/g, ' ');
      qa.note(6, `newest user.create: "${first}"`);
      expect(first).toContain('user.create');
      if (!first.includes(v.login)) qa.deviation(6, 'An entry user.create with the login', `the entry does not name the login: "${first}"`);
    });
  } finally {
    await block(page, v.login);
  }
});

qaTest('TC-APP018-032', async ({ page, qa }) => {
  const u = users(page);
  const existing = await newUser(page, qa);
  try {
    await qa.step(1, async () => {
      const v = userData(qa);
      await u.openAdd();
      const toasts = await fillUser(u, { ...v, fullName: '' });
      expect(toasts).not.toContain('User added.');
      const invalid = await invalidFields(u.dialog);
      qa.note(1, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
    });
    await qa.step(2, async () => {
      const v = userData(qa);
      await u.openAdd();
      const toasts = await fillUser(u, { ...v, password: '' });
      expect(toasts).not.toContain('User added.');
      if (!toasts.includes('Failed to save user.')) {
        const invalid = await invalidFields(u.dialog);
        qa.deviation(2, 'Toast "Failed to save user."', invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
      }
    });
    await qa.step(3, async () => {
      const v = { ...userData(qa), login: existing.login };
      await u.openAdd();
      const toasts = await fillUser(u, v);
      expect(toasts).toContain('Failed to save user.');
      expect(toasts.join(' ')).not.toMatch(/taken|exists/i);
    });
  } finally {
    await block(page, existing.login);
  }
});

qaTest('TC-APP018-033', async ({ page, qa }) => {
  const made: string[] = [];
  try {
    await qa.step(1, async () => {
      const v = { ...userData(qa), password: '1' };
      const toasts = await createUser(page, v);
      if (toasts.includes('User added.')) made.push(v.login);
      expect(toasts).toContain('User added.');
    });
    await qa.step(2, async () => {
      const v = userData(qa);
      const toasts = await createUser(page, { ...v, password: v.login });
      if (toasts.includes('User added.')) made.push(v.login);
      expect(toasts).toContain('User added.');
    });
  } finally {
    for (const l of made) await block(page, l);
  }
});

qaTest('TC-APP018-034', async ({ page, qa }) => {
  const u = users(page);
  const v = await newUser(page, qa);
  try {
    await qa.step(1, async () => {
      await u.edit(v.login);
      await expect(u.dialog.getByText("The roles below apply at this branch only. Saving leaves the user's grants at other branches untouched.")).toBeVisible();
      expect(await fillUser(u, { branch: 'Kemayoran', roles: ['bidan'] })).toContain('User updated.');
      const lines = await mapLines(page, v.login);
      const n = await lines.count();
      qa.note(1, `Branch map: ${n} line(s): ${(await Promise.all((await lines.all()).map(async (l) => `${(await cellsOf(l))[2]} @ ${await l.getByRole('combobox').inputValue()}`))).join('; ')}`);
      if (n !== 2) qa.deviation(1, 'Branch map then shows two lines', `${n} line(s)`);
    });
    await qa.step(2, async () => {
      await u.edit(v.login);
      await pick(u.dialog.getByRole('combobox', { name: 'Branch' }), BRANCH);
      const stores = (await u.dialog.getByRole('combobox', { name: 'Store' }).locator('option').allInnerTexts()).filter((o) => o !== 'All stores');
      const toasts = await fillUser(u, { store: stores[0] });
      qa.note(2, `store "${stores[0]}": toast "${toasts.join(' / ')}"; TBD what the user then sees in Pharmacy and Inventory`);
      expect(toasts).toContain('User updated.');
    });
  } finally {
    await block(page, v.login);
  }
});

qaTest('TC-APP018-035', async ({ page, qa, browser }) => {
  const u = users(page);
  const v = await newUser(page, qa);
  const second = newPassword();
  let open: Awaited<ReturnType<typeof signInAs>> | undefined;
  try {
    await qa.step(1, async () => {
      await u.edit(v.login);
      await expect(u.dialog).toHaveAccessibleName('Edit User');
      await expect(u.dialog.getByRole('textbox', { name: 'Login' })).toHaveValue(v.login);
      await expect(u.dialog.getByRole('textbox', { name: 'Full name' })).toHaveValue(v.fullName);
      await expect(u.dialog.getByRole('textbox', { name: 'Password' })).toHaveValue('');
      await expect(u.dialog.getByRole('textbox', { name: 'Password' })).toHaveAttribute('placeholder', 'Leave blank to keep current password');
    });
    await qa.step(2, async () => {
      const renamed = qa.name('X Perawat Uji Dua');
      expect(await fillUser(u, { fullName: renamed })).toContain('User updated.');
      expect((await u.cells(await u.row(v.login)))[1]).toBe(renamed);
      const s = await signInAs(browser, v.login, v.password);
      await s.context.close();
      expect(s.ok, s.message).toBe(true);
    });
    await qa.step(3, async () => {
      await u.edit(v.login);
      expect(await fillUser(u, { password: second })).toContain('User updated.');
      const old = await signInAs(browser, v.login, v.password);
      await old.context.close();
      expect(old.ok).toBe(false);
      open = await signInAs(browser, v.login, second);
      expect(open.ok, open.message).toBe(true);
    });
    let wrong = '';
    await qa.step(4, async () => {
      const w = await signInAs(browser, v.login, `${second}x`);
      wrong = w.message;
      await w.context.close();
      await u.edit(v.login);
      await u.advanced();
      await u.dialog.getByRole('checkbox', { name: 'Blocked' }).check();
      await u.save();
      expect((await u.cells(await u.row(v.login)))[4]).toBe('Blocked');
    });
    await qa.step(5, async () => {
      const s = await signInAs(browser, v.login, second);
      await s.context.close();
      expect(s.ok).toBe(false);
      qa.note(5, `blocked: "${s.message}"; wrong password: "${wrong}"`);
      expect(s.message).toBe(wrong);
    });
    await qa.step(6, async () => {
      const p = open!.page;
      await p.getByRole('navigation', { name: 'Primary' }).first().getByRole('link', { name: 'Apps' }).click();
      await p.waitForLoadState('networkidle').catch(() => {});
      const where = p.url();
      const shown = (await p.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).trim();
      qa.note(6, `the open session after the block: ${where} ("${shown}")`);
    });
  } finally {
    await open?.context.close();
    await block(page, v.login);
  }
});

qaTest('TC-APP018-036', async ({ page, qa }) => {
  const u = users(page);
  const v = await newUser(page, qa);
  qa.notRun(1, 'blocking the own account would lock out the shared administrator U1');
  qa.notRun(2, 'taking the role admin from the own account would lock out the shared administrator U1');
  qa.notRun(3, 'needs a doctor with consultations; switching a seed doctor off would stop the other modules');
  try {
    await qa.step(4, async () => {
      await u.edit(v.login);
      await u.advanced();
      const buttons = (await u.dialog.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
      const rowButtons = await (await u.row(v.login)).getByRole('button').count();
      expect(buttons.some((b) => /delete|remove/i.test(b))).toBe(false);
      qa.note(4, `the dialog offers ${buttons.join(', ')}; the row has ${rowButtons} button(s): no delete (as the workbook says)`);
    });
  } finally {
    await block(page, v.login);
  }
});

qaTest('TC-APP018-037', TC_APP018_037);

qaTest('TC-APP018-038', async ({ page, qa }) => {
  const r = roles(page);
  await qa.step(1, async () => {
    const toasts = await r.add({ 'Role name': '', Description: qa.name('X Peran uji') });
    expect(toasts).not.toContain('Role added.');
    const invalid = await invalidFields(r.dialog);
    qa.note(1, invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
  });
  await qa.step(2, async () => {
    const toasts = await r.add({ 'Role name': 'admin', Description: qa.name('X Peran uji') });
    expect(toasts).toContain('Failed to save role.');
  });
  qa.notRun(3, 'setting the role admin inactive would take the rights of every administrator, U1 and U2 among them');
});

qaTest('TC-APP018-039', TC_APP018_039);

qaTest('TC-APP018-040', async ({ page, qa }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/identity/rights');
    const box = main.getByRole('combobox', { name: 'Role' });
    const before = await main.getByText(/^\d+ \/ \d+$/).innerText();
    await box.fill('');
    await expect(main.getByRole('button', { name: 'Save rights' })).toBeDisabled();
    qa.note(1, `with no role (counter was "${before}") "Save rights" is disabled; nothing is said`);
  });
  qa.notRun(2, 'taking the right to write role privileges from the role admin would leave no administrator who can grant rights');
  qa.notRun(3, 'needs two administrators saving the same role at once');
});

qaTest('TC-APP018-041', async ({ page, qa }) => {
  const v = await newUser(page, qa);
  const main = page.getByRole('main');
  const setBranch = async (text: string): Promise<string[]> => {
    const line = await mapLines(page, v.login);
    const box = line.getByRole('combobox', { name: 'Branch' });
    const mark = await toastMark(page);
    if (text) await pick(box, text);
    else {
      await box.fill('');
      await box.press('Enter');
      await box.blur();
    }
    return toastsAfter(page, mark);
  };
  try {
    await qa.step(1, async () => {
      await page.goto('/en/settings');
      await main.getByRole('link', { name: /^Branch map\b/ }).click();
      await expect(main.getByRole('heading', { level: 1, name: 'User Site Mapping' })).toBeVisible();
      await expect(main.getByText('Branch where each role applies. Empty means every branch.', { exact: true })).toBeVisible();
      await expect(main.getByRole('columnheader')).toHaveText(['Login', 'Name', 'Role', 'Branch']);
    });
    await qa.step(2, async () => {
      expect(await setBranch('Kemayoran')).toContain('Site mapping updated.');
      await expect((await mapLines(page, v.login)).getByRole('combobox', { name: 'Branch' })).toHaveValue(/Kemayoran/);
    });
    await qa.step(3, async () => {
      const toasts = await setBranch('');
      qa.note(3, `emptied: toast "${toasts.join(' / ')}"`);
      expect(toasts).toContain('Site mapping updated.');
      await expect((await mapLines(page, v.login)).getByRole('combobox', { name: 'Branch' })).toHaveValue('');
    });
    await qa.step(4, async () => {
      await page.goto('/en/settings');
      await main.getByRole('link', { name: /^Sign-in log\b/ }).click();
      await expect(main.getByRole('heading', { level: 1, name: 'User Login Log' })).toBeVisible();
      await expect(main.getByText('Login events for users of this hospital.', { exact: true })).toBeVisible();
      await expect(main.getByRole('columnheader')).toHaveText(['When', 'User', 'Full name', 'Entry point']);
      const when = await main.getByRole('rowgroup').nth(1).getByRole('row').evaluateAll((rs) => rs.map((r) => r.querySelector('td')?.textContent ?? ''));
      const key = (t: string) => t.replace(/^(\d{2})\/(\d{2})\/(\d{4}), (\d{2})\.(\d{2})\.(\d{2})$/, '$3$2$1$4$5$6');
      expect(when.map(key)).toEqual([...when.map(key)].sort().reverse());
    });
    await qa.step(5, async () => {
      const rows = await main.getByRole('rowgroup').nth(1).getByRole('row').count();
      const filters = await main.locator('input, select').count();
      qa.note(5, `${rows} rows, ${filters} filter input(s); no failed sign-ins and no device address are shown`);
      expect(filters).toBe(0);
    });
  } finally {
    await block(page, v.login);
  }
});

qaTest('TC-APP018-042', async ({ page, qa, browser }) => {
  const v = await newUser(page, qa);
  try {
    await qa.step(1, async () => {
      const line = await mapLines(page, v.login);
      const mark = await toastMark(page);
      await line.getByRole('combobox', { name: 'Branch' }).fill('QA Cabang Tidak Ada');
      await expect(page.getByText('No matching branch')).toBeVisible();
      expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
    });
    await qa.step(2, async () => {
      const s = await signInAs(browser, v.login, v.password);
      try {
        expect(s.ok, s.message).toBe(true);
        const line = await mapLines(page, v.login);
        await pick(line.getByRole('combobox', { name: 'Branch' }), 'Kemayoran');
        await s.page.getByRole('navigation', { name: 'Primary' }).first().getByRole('link', { name: 'Apps' }).click();
        await s.page.waitForLoadState('networkidle').catch(() => {});
        const apps = (await s.page.getByRole('main').getByRole('link').allInnerTexts()).map((t) => t.split('\n')[0].trim()).filter(Boolean);
        qa.note(2, `after the move the user sees ${s.page.url()}: ${apps.join(', ') || 'no apps'}`);
      } finally {
        await s.context.close();
      }
    });
    await qa.step(3, async () => {
      for (let i = 0; i < 3; i++) await (await signInAs(browser, v.login, `${v.password}x`)).context.close();
      await page.goto('/en/identity/login-log');
      const mine = await page.getByRole('main').getByRole('row').filter({ hasText: v.login }).count();
      await page.goto('/en/audit');
      await page.getByRole('textbox', { name: 'Action' }).fill('identity.login');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.waitForLoadState('networkidle').catch(() => {});
      const failed = await page.getByRole('table').getByRole('row').filter({ hasText: v.login }).allInnerTexts();
      qa.note(3, `Sign-in log: ${mine} line(s) of the user (one good sign-in); audit: ${failed.map((t) => t.replace(/\s+/g, ' ')).join(' ; ') || 'no entry of the user'}`);
    });
  } finally {
    await block(page, v.login);
  }
});

/** The accessible name of a colour button (its label). */
const radioName = (r: Locator) => r.evaluate((e) => (e.getAttribute('aria-label') ?? (e as HTMLInputElement).labels?.[0]?.textContent ?? e.textContent ?? '').trim());

type Brand = { name: string; url: string; locale: string; colour: string; complete: boolean; logo: boolean };

async function brandNow(page: Page): Promise<Brand> {
  await page.goto('/en/identity/branding');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Tenant Branding' })).toBeVisible();
  await page.waitForLoadState('networkidle').catch(() => {});
  return {
    name: await main.getByRole('textbox', { name: 'Product name' }).inputValue(),
    url: await main.getByRole('textbox', { name: 'Logo URL' }).inputValue(),
    locale: await main.getByRole('combobox', { name: 'Default locale' }).inputValue(),
    colour: await radioName(main.getByRole('radio', { checked: true })),
    complete: await main.getByRole('checkbox', { name: 'Branding complete' }).isChecked(),
    logo: (await main.getByRole('button', { name: 'Remove logo' }).count()) > 0,
  };
}

async function saveBranding(page: Page): Promise<string[]> {
  const mark = await toastMark(page);
  await page.getByRole('main').getByRole('button', { name: 'Save branding' }).click();
  return toastsAfter(page, mark);
}

/** Puts the branding back as it was. */
async function restoreBrand(page: Page, b: Brand): Promise<void> {
  await brandNow(page);
  const main = page.getByRole('main');
  await main.getByRole('textbox', { name: 'Product name' }).fill(b.name);
  if (!b.logo && (await main.getByRole('button', { name: 'Remove logo' }).count())) await main.getByRole('button', { name: 'Remove logo' }).click();
  await main.getByRole('textbox', { name: 'Logo URL' }).fill(b.url);
  await main.getByRole('combobox', { name: 'Default locale' }).selectOption(b.locale);
  await main.getByRole('checkbox', { name: 'Branding complete' }).setChecked(b.complete);
  await saveBranding(page);
}

qaTest('TC-APP018-043', async ({ page, qa, browser }) => {
  const main = page.getByRole('main');
  const before = await brandNow(page);
  const product = qa.prefix('X RS Uji');
  try {
    await qa.step(1, async () => {
      await page.goto('/en/settings');
      await main.getByRole('link', { name: /^Brand\b/ }).click();
      await expect(main.getByRole('heading', { level: 1, name: 'Tenant Branding' })).toBeVisible();
      await expect(main.getByText('Product name, logo, colors, and default language.', { exact: true })).toBeVisible();
      for (const f of ['Product name', 'Logo URL']) await expect(main.getByRole('textbox', { name: f })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Upload logo' })).toBeAttached();
      await expect(main.getByRole('radiogroup', { name: 'Primary color' }).getByRole('radio')).toHaveCount(3);
      await expect(main.getByRole('combobox', { name: 'Default locale' }).locator('option')).toHaveText(['id', 'en', 'ar']);
      await expect(main.getByRole('checkbox', { name: 'Branding complete' })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Save branding' })).toBeVisible();
    });
    await qa.step(2, async () => {
      await main.getByRole('textbox', { name: 'Product name' }).fill(product);
      await main.getByRole('button', { name: 'Upload logo' }).setInputFiles({ name: 'qa-logo.png', mimeType: 'image/png', buffer: png(320, 80) });
      await expect(main.getByText('This file is 320 × 80 px.')).toBeVisible();
      await main.getByRole('combobox', { name: 'Default locale' }).selectOption('en');
      expect(await saveBranding(page)).toContain('Branding updated.');
    });
    await qa.step(3, async () => {
      await page.reload();
      const header = (await page.getByRole('banner').first().innerText()).replace(/\s+/g, ' ');
      const logo = await page.getByRole('banner').first().locator('img').count();
      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const p = await anon.newPage();
      await p.goto('/en/login');
      const signIn = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160);
      const signInLogo = await p.locator('img').count();
      await anon.close();
      qa.note(3, `header "${header.slice(0, 80)}" (${logo} image); sign-in page "${signIn}" (${signInLogo} image)`);
      if (!header.includes(product)) qa.deviation(3, 'The new name and logo are shown', `the header reads "${header.slice(0, 60)}"`);
    });
    await qa.step(4, async () => {
      const anon = await browser.newContext({ storageState: { cookies: [], origins: [] }, locale: 'de-DE' });
      const p = await anon.newPage();
      await p.goto('/');
      await p.waitForLoadState('networkidle').catch(() => {});
      const where = p.url();
      await anon.close();
      qa.note(4, `a browser with no saved language lands on ${where}`);
    });
    await qa.step(5, async () => {
      await restoreBrand(page, before);
      const after = await brandNow(page);
      expect({ name: after.name, locale: after.locale, logo: after.logo }).toEqual({ name: before.name, locale: before.locale, logo: before.logo });
    });
  } finally {
    const now = await brandNow(page);
    if (now.name !== before.name || now.locale !== before.locale || now.logo !== before.logo) await restoreBrand(page, before);
  }
});

qaTest('TC-APP018-044', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const before = await brandNow(page);
  try {
    await qa.step(1, async () => {
      await main.getByRole('button', { name: 'Upload logo' }).setInputFiles({ name: 'qa-big.png', mimeType: 'image/png', buffer: png(320, 320, true) });
      await expect(main.getByRole('button', { name: 'Remove logo' })).toHaveCount(0);
      if (!(await main.getByText('The logo is over 200 KB.').isVisible({ timeout: 3_000 }).catch(() => false))) {
        qa.deviation(1, 'The text "The logo is over 200 KB."', 'the file (300 KB) is dropped without a word; "No logo yet" stays');
      }
    });
    await qa.step(2, async () => {
      await brandNow(page);
      const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
      await main.getByRole('button', { name: 'Upload logo' }).setInputFiles({ name: 'qa-logo.gif', mimeType: 'image/gif', buffer: gif });
      await expect(main.getByRole('button', { name: 'Remove logo' })).toHaveCount(0);
      if (!(await main.getByText('The logo must be PNG, JPEG, or WebP.').isVisible({ timeout: 3_000 }).catch(() => false))) {
        qa.deviation(2, 'The text "The logo must be PNG, JPEG, or WebP."', 'the GIF is dropped without a word');
      }
    });
    await qa.step(3, async () => {
      await brandNow(page);
      await main.getByRole('textbox', { name: 'Logo URL' }).fill('bukan alamat web');
      const toasts = await saveBranding(page);
      expect(toasts).not.toContain('Branding updated.');
      if (!toasts.includes('Failed to save branding.')) {
        const invalid = await invalidFields(main);
        qa.deviation(3, 'Toast "Failed to save branding."', invalid.length ? `the browser stops the click (${invalid.join('; ')})` : `toast "${toasts.join(' / ')}"`);
      }
      expect((await brandNow(page)).url).toBe(before.url);
    });
    await qa.step(4, async () => {
      await brandNow(page);
      await main.getByRole('textbox', { name: 'Product name' }).fill('');
      const toasts = await saveBranding(page);
      await page.reload();
      const header = (await page.getByRole('banner').first().innerText()).replace(/\s+/g, ' ');
      qa.note(4, `toast "${toasts.join(' / ')}"; header "${header.slice(0, 40)}"`);
    });
  } finally {
    await restoreBrand(page, before);
  }
});

qaTest('TC-APP018-045', async ({ page, qa, browser }) => {
  const main = page.getByRole('main');
  const before = await brandNow(page);
  const other = main.getByRole('radiogroup', { name: 'Primary color' }).getByRole('radio', { checked: false }).first();
  const otherName = await radioName(other);
  try {
    await qa.step(1, async () => {
      const sent: string[] = [];
      page.on('request', (r) => {
        if (r.method() !== 'GET') sent.push(new URL(r.url()).pathname);
      });
      const look = () => page.evaluate(() => JSON.stringify(document.documentElement.dataset));
      const was = await look();
      await other.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      const now = await look();
      const u2 = await browser.newContext({ storageState: authFileOf('U2') });
      const p2 = await u2.newPage();
      await p2.goto('/en/identity/branding');
      const u2Colour = await radioName(p2.getByRole('main').getByRole('radio', { checked: true }));
      await u2.close();
      qa.note(1, `"${otherName}" clicked, not saved: page ${was === now ? 'unchanged' : `"${was}" -> "${now}"`}; sent ${sent.join(', ') || 'nothing'}; U2 sees "${u2Colour}"`);
    });
  } finally {
    await brandNow(page);
    await main.getByRole('radiogroup', { name: 'Primary color' }).getByRole('radio', { name: before.colour }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
});

qaTest('TC-APP018-046', async ({ page, qa, browser }) => {
  const main = page.getByRole('main');
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await main.getByRole('link', { name: /^Theme\b/ }).click();
    const h1 = (await main.getByRole('heading', { level: 1 }).innerText()).trim();
    const appearance = await main.getByRole('radio', { name: /dark|light|system/i }).count();
    if (h1 !== 'Theme overrides' || !appearance) qa.deviation(1, 'The screen "Theme overrides" with the choices of appearance and colour and, below, the branding form', `the screen "${h1}": the branding form only`);
  });
  await qa.step(2, async () => {
    const dark = main.getByRole('radio', { name: /dark/i }).or(main.getByRole('button', { name: /dark/i }));
    if (!(await dark.count())) qa.deviation(2, 'The screens turn dark at once for this user', 'no dark appearance is offered on this screen');
  });
  let widget = '';
  await qa.step(3, async () => {
    await page.goto('/en/settings');
    await main.getByRole('link', { name: /^Dashboard\b/ }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Configure dashboard' })).toBeVisible();
    await expect(main.getByText('Show or hide dashboard widgets.', { exact: true })).toBeVisible();
    const switches = main.getByRole('list').first().getByRole('button', { name: 'Visible' });
    expect(await switches.count()).toBeGreaterThan(0);
    widget = (await main.getByRole('list').first().getByRole('listitem').first().innerText()).split('\n')[0].trim();
  });
  try {
    await qa.step(4, async () => {
      await main.getByRole('list').first().getByRole('listitem').first().getByRole('button').click();
      const dialog = await page.getByRole('dialog').count();
      const state = (await main.getByRole('list').first().getByRole('listitem').first().getByRole('button').innerText()).trim();
      qa.note(4, `"${widget}": ${dialog ? 'a dialog is open' : 'no dialog'}; the switch reads "${state}"`);
    });
    await qa.step(5, async () => {
      const u2 = await browser.newContext({ storageState: authFileOf('U2') });
      const p2 = await u2.newPage();
      await p2.goto('/en/identity/dashboard');
      const state = (await p2.getByRole('main').getByRole('list').first().getByRole('listitem').first().getByRole('button').innerText()).trim();
      await u2.close();
      qa.note(5, `U2 sees "${widget}" as "${state}"`);
    });
  } finally {
    await page.goto('/en/identity/dashboard');
    const first = main.getByRole('list').first().getByRole('listitem').first().getByRole('button');
    if ((await first.innerText()).trim() !== 'Visible') await first.click();
  }
});

async function addRule(page: Page, role: string | null): Promise<string[]> {
  await page.goto('/en/identity/notifications');
  await page.getByRole('main').getByRole('button', { name: 'Add rule' }).click();
  const d = page.getByRole('dialog');
  const box = d.getByRole('combobox', { name: 'Role' });
  if ((await box.evaluate((e) => e.tagName)) === 'SELECT') {
    if (role === null) await box.selectOption({ index: 0 }).catch(() => {});
    else await box.selectOption({ label: role });
  } else if (role === null) await box.fill('');
  else await pick(box, role);
  const mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save' }).click();
  return toastsAfter(page, mark);
}

const ruleRows = (page: Page) => page.getByRole('main').getByRole('rowgroup').nth(1).getByRole('row').filter({ has: page.getByRole('button', { name: 'Remove' }) });

async function ruleCount(page: Page): Promise<number> {
  await page.goto('/en/identity/notifications');
  await page.waitForLoadState('networkidle').catch(() => {});
  return ruleRows(page).count();
}

/** Removes the rules a test added (the newest rows, down to the count before the test). */
async function removeRules(page: Page, keep: number): Promise<void> {
  for (let i = 0; i < 6 && (await ruleCount(page)) > keep; i++) {
    await ruleRows(page).last().getByRole('button', { name: 'Remove' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
}

qaTest('TC-APP018-047', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const keep = await ruleCount(page);
  try {
    await qa.step(1, async () => {
      await page.goto('/en/settings');
      await main.getByRole('link', { name: /^Notifications\b/ }).click();
      await expect(main.getByRole('heading', { level: 1, name: 'Notification config' })).toBeVisible();
      await expect(main.getByText('Who receives an in-app notice when a BPJS claim is submitted.', { exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Add rule' })).toBeVisible();
      await expect(main.getByRole('columnheader')).toHaveText(['Alert type', 'Severity', 'Role', 'Actions']);
    });
    await qa.step(2, async () => {
      await main.getByRole('button', { name: 'Add rule' }).click();
      const d = page.getByRole('dialog');
      await expect(d).toHaveAccessibleName('Add rule');
      const boxes = await d.locator('input, select').evaluateAll((es) => es.map((e) => `${e.tagName}:${(e as HTMLInputElement).value}`));
      qa.note(2, `fields: ${boxes.join(', ')}`);
      if ((await d.locator('select').count()) < 2) qa.deviation(2, 'The lists "Alert type" and "Severity"', `text fields, filled with "bpjs.claim.submitted" and "SUBMITTED"`);
      await expect(d.getByRole('combobox', { name: 'Role' })).toBeVisible();
    });
    await qa.step(3, async () => {
      expect(await addRule(page, 'finance')).toContain('Rule saved.');
      expect(await ruleCount(page)).toBe(keep + 1);
      const row = ruleRows(page).last();
      const c = await cellsOf(row);
      expect(c.slice(0, 2)).toEqual(['bpjs.claim.submitted', 'SUBMITTED']);
      if (c[2] !== 'finance') qa.deviation(3, 'a row with the three values (role "finance")', `the role is shown as "${c[2]}"`);
      await expect(row.getByRole('button', { name: 'Remove' })).toBeVisible();
    });
    qa.notRun(4, 'needs a BPJS claim submitted by a BPJS officer and a user of the role finance');
    await qa.step(5, async () => {
      const n = await ruleRows(page).count();
      await ruleRows(page).last().getByRole('button', { name: 'Remove' }).click();
      const asked = await page.getByRole('alertdialog').or(page.getByRole('dialog')).count();
      await expect(ruleRows(page)).toHaveCount(n - 1);
      qa.note(5, asked ? 'a question is asked first' : 'removed at once, with no question');
    });
  } finally {
    await removeRules(page, keep);
  }
});

qaTest('TC-APP018-048', async ({ page, qa }) => {
  const keep = await ruleCount(page);
  try {
    await qa.step(1, async () => {
      const toasts = await addRule(page, null);
      expect(toasts).toContain('Choose a role.');
    });
    await qa.step(2, async () => {
      expect(await addRule(page, 'finance')).toContain('Rule saved.');
      const toasts = await addRule(page, 'finance');
      qa.note(2, `second save: "${toasts.join(' / ')}"; ${(await ruleCount(page)) - keep} row(s) added`);
    });
    qa.notRun(3, 'needs user U3 (read users but not write them)');
  } finally {
    await removeRules(page, keep);
  }
});

/** A test account signed in on its own browser, on Password Configuration. */
async function passwordScreen(page: Page, qa: Qa, browser: import('@playwright/test').Browser) {
  const v = await newUser(page, qa);
  const s = await signInAs(browser, v.login, v.password);
  expect(s.ok, s.message).toBe(true);
  await s.page.goto('/en/identity/password');
  return { v, s };
}

async function change(p: Page, current: string, next: string): Promise<string[]> {
  const main = p.getByRole('main');
  await main.getByRole('textbox', { name: 'Current password' }).fill(current);
  await main.getByRole('textbox', { name: 'New password' }).fill(next);
  const mark = await toastMark(p);
  await main.getByRole('button', { name: 'Change password' }).click();
  return toastsAfter(p, mark);
}

qaTest('TC-APP018-049', async ({ page, qa, browser }) => {
  const { v, s } = await passwordScreen(page, qa, browser);
  const next = newPassword();
  try {
    await qa.step(1, async () => {
      const main = s.page.getByRole('main');
      await expect(main.getByRole('heading', { level: 1, name: 'Password Configuration' })).toBeVisible();
      await expect(main.getByText('Change the password of the signed-in account.', { exact: true })).toBeVisible();
      for (const f of ['Current password', 'New password']) await expect(main.getByRole('textbox', { name: f })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Change password' })).toBeVisible();
    });
    await qa.step(2, async () => {
      expect(await change(s.page, v.password, next)).toContain('Password updated.');
    });
    await qa.step(3, async () => {
      const old = await signInAs(browser, v.login, v.password);
      await old.context.close();
      const fresh = await signInAs(browser, v.login, next);
      await fresh.context.close();
      expect(old.ok).toBe(false);
      expect(fresh.ok, fresh.message).toBe(true);
    });
    await qa.step(4, async () => {
      await s.page.goto('/en/identity/password');
      const inputs = await s.page.getByRole('main').getByRole('textbox').count();
      const text = await s.page.getByRole('main').innerText();
      expect(inputs).toBe(2);
      qa.note(4, `${inputs} inputs; rules shown: ${/length|character|expir|reuse/i.test(text) ? 'yes' : 'none'}`);
    });
    await qa.step(5, async () => {
      await page.goto('/en/settings');
      await page.getByRole('main').getByRole('link', { name: /^Second-level security\b/ }).click();
      await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Second-level security' })).toBeVisible();
      await expect(page.getByRole('main').getByText('Second-level security is not available yet.', { exact: true })).toBeVisible();
    });
  } finally {
    await s.context.close();
    await block(page, v.login);
  }
});

qaTest('TC-APP018-050', async ({ page, qa, browser }) => {
  const { v, s } = await passwordScreen(page, qa, browser);
  try {
    await qa.step(1, async () => {
      expect(await change(s.page, `${v.password}x`, newPassword())).toContain('Could not change password.');
    });
    await qa.step(2, async () => {
      await s.page.goto('/en/identity/password');
      const toasts = await change(s.page, v.password, '');
      expect(toasts).not.toContain('Password updated.');
      const invalid = await invalidFields(s.page.getByRole('main'));
      expect(invalid.length).toBeGreaterThan(0);
    });
  } finally {
    await s.context.close();
    await block(page, v.login);
  }
});

qaTest('TC-APP018-051', async ({ page, qa, browser }) => {
  const { v, s } = await passwordScreen(page, qa, browser);
  let current = v.password;
  try {
    await qa.step(1, async () => {
      const toasts = await change(s.page, current, '1');
      qa.note(1, `"1": toast "${toasts.join(' / ')}"`);
      if (toasts.includes('Password updated.')) current = '1';
    });
    await qa.step(2, async () => {
      await s.page.goto('/en/identity/password');
      const toasts = await change(s.page, current, current);
      qa.note(2, `the current password again: toast "${toasts.join(' / ')}"`);
    });
    await qa.step(3, async () => {
      const meant = newPassword();
      const typed = `${meant}x`;
      await s.page.goto('/en/identity/password');
      const toasts = await change(s.page, current, typed);
      const tryMeant = await signInAs(browser, v.login, meant);
      await tryMeant.context.close();
      qa.note(3, `a mistyped password: toast "${toasts.join(' / ')}"; the meant one ${tryMeant.ok ? 'works' : 'is refused'}; there is no second input to repeat it`);
      expect(await s.page.getByRole('main').getByRole('textbox').count()).toBe(2);
    });
  } finally {
    await s.context.close();
    await block(page, v.login);
  }
});

const auditRows = (page: Page) => page.getByRole('table').getByRole('rowgroup').nth(1).getByRole('row').filter({ has: page.getByRole('cell').nth(1) });

async function auditSearch(page: Page, v: { module?: string; action?: string; patient?: string }): Promise<void> {
  await page.goto('/en/audit');
  if (v.module !== undefined) await page.getByRole('textbox', { name: 'Module' }).fill(v.module);
  if (v.action !== undefined) await page.getByRole('textbox', { name: 'Action' }).fill(v.action);
  if (v.patient !== undefined) await page.getByRole('textbox', { name: 'Patient name' }).fill(v.patient);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

qaTest('TC-APP018-056', async ({ page, qa }) => {
  const col = async (n: number) => auditRows(page).evaluateAll((rs, i) => rs.map((r) => r.querySelectorAll('td')[i]?.textContent?.trim() ?? ''), n);
  await qa.step(1, async () => {
    await page.goto('/en/settings');
    await page.getByRole('main').getByRole('link', { name: /^Audit trail\b/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Audit Log' })).toBeVisible();
    for (const f of ['Patient name', 'Module', 'Action', 'Hospital']) await expect(page.getByRole('textbox', { name: f })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    const cols = (await page.getByRole('columnheader').allInnerTexts()).map((t) => t.trim());
    for (const c of ['When', 'Action', 'Module', 'Hospital', 'Patient', 'MRN', 'User', 'Full name']) expect(cols).toContain(c);
    const text = (await page.getByText(/Filter/).first().innerText()).trim();
    if (text !== 'Actions that cannot be changed. Filters and pages load from the server.') qa.deviation(1, 'The text "Actions that cannot be changed. Filters and pages load from the server."', `"${text}" (Indonesian on the English screen)`);
  });
  let page1: string[] = [];
  await qa.step(2, async () => {
    await auditSearch(page, { module: 'platform/identity' });
    const modules = await col(2);
    expect(modules.length).toBeGreaterThan(0);
    expect(new Set(modules)).toEqual(new Set(['platform/identity']));
    page1 = await col(0);
    const key = (t: string) => t.replace(/^(\d{2})\/(\d{2})\/(\d{4}), (\d{2})\.(\d{2})\.(\d{2})$/, '$3$2$1$4$5$6');
    expect(page1.map(key)).toEqual([...page1.map(key)].sort().reverse());
  });
  await qa.step(3, async () => {
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect.poll(async () => (await col(0)).join()).not.toBe(page1.join());
    expect(new Set(await col(2))).toEqual(new Set(['platform/identity']));
  });
  await qa.step(4, async () => {
    const row = auditRows(page).filter({ hasText: 'identity.login' }).first();
    const c = await cellsOf(row);
    qa.note(4, `entry: ${c.join(' | ')}`);
    expect(c[1]).toBe('identity.login');
    expect(c[6]).not.toBe('');
    expect(c[8]).not.toBe('');
  });
  await qa.step(5, async () => {
    const inputs = (await page.locator('input').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).type))).filter((t) => t !== 'hidden');
    const exportButton = await page.getByRole('button', { name: /export|download|csv/i }).count();
    expect(inputs.includes('date')).toBe(false);
    expect(exportButton).toBe(0);
    qa.note(5, 'no filter by date or user and no export (as the workbook says)');
  });
});

qaTest('TC-APP018-057', async ({ page, qa }) => {
  await qa.step(1, async () => {
    await auditSearch(page, { module: 'qa/tidak-ada' });
    await expect(page.getByText('No audit rows match these filters.')).toBeVisible();
  });
  qa.notRun(2, 'needs user U3 (no AUDIT_READ)');
  await qa.step(3, async () => {
    await auditSearch(page, { patient: 'QA-' });
    const n = await auditRows(page).filter({ has: page.getByRole('cell') }).count();
    qa.note(3, `"QA-" in "Patient name": ${n} row(s)`);
  });
});
