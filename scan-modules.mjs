/**
 * Scans every reachable KlikMed module for a set of admin accounts.
 * For each module: opens the hub and its sub screens, records headings,
 * tables, empty states, and takes a screenshot.
 * Writes data/module-scan/<admin>.json
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://rs.showcase.atklik.xyz/';
const OUT_DIR = 'data/module-scan';
const SHOT_DIR = 'screenshots-scan';
const PASSWORD = process.env.SCAN_PASSWORD ?? 'Password123';
const ADMINS = [
  { key: 'rs', user: process.env.SCAN_RS ?? 'rs.admin' },
  { key: 'apotek', user: process.env.SCAN_APOTEK ?? 'apotek.admin' },
  { key: 'klinik', user: process.env.SCAN_KLINIK ?? 'klinik.admin' },
].map((a) => ({ ...a, pass: PASSWORD }));

const KNOWN_NON_MODULES = new Set([
  '/', '/en', '/id', '/ar',
  '/en/apps', '/en/dashboard', '/en/preferences', '/en/reporting', '/en/settings',
  '/en/home', '/en/login', '/id/apps', '/id/dashboard', '/id/preferences',
  '/id/reporting', '/id/settings', '/id/home',
]);
const MAX_SUBPAGES_PER_MODULE = 10;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SHOT_DIR, { recursive: true });

const only = process.argv[2];
const browser = await chromium.launch();

for (const admin of ADMINS) {
  if (only && admin.key !== only) continue;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const result = { admin: admin.key, username: admin.user, loginOk: false, modules: [] };

  async function login() {
    // Staging auth is intermittent: the submit sometimes silently fails.
    // Retry up to 6 times; success = /en stays off /login.
    for (let attempt = 1; attempt <= 6; attempt++) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      if (!page.url().includes('/login')) break;
      await page.getByRole('textbox', { name: /nama pengguna|username/i }).fill(admin.user);
      await page.locator('input[type="password"]').fill(admin.pass);
      const remember = page.getByRole('checkbox', { name: /ingat saya|remember me/i });
      if ((await remember.count()) > 0) await remember.check().catch(() => {});
      await page.getByRole('button', { name: /^(masuk|sign in)$/i }).click();
      let authed = false;
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(2_000);
        // The session takes effect when redirecting to the Indonesian home.
        await page.goto(`${BASE}id`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        if (!page.url().includes('/login')) {
          authed = true;
          break;
        }
      }
      if (authed) {
        console.log(`[${admin.key}] login OK pada percobaan ke-${attempt}`);
        break;
      }
      console.log(`[${admin.key}] login gagal (percobaan ${attempt}/6), mencoba ulang...`);
    }
    const lang = page.getByRole('button', { name: /^(bahasa|language)$/i });
    if ((await lang.count()) > 0) {
      await lang.click().catch(() => {});
      await page.getByRole('menuitemradio', { name: 'EN', exact: true }).click().catch(() => {});
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
  }

  const signedOut = async () =>
    (await page.getByRole('banner').getByRole('button', { name: /not signed in|belum masuk/i }).count()) > 0;

  const ensureSignedIn = async () => {
    if (await signedOut()) await login();
  };

  async function scrape(url, shotName) {
    await ensureSignedIn();
    let ok = true;
    await page
      .goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch(() => { ok = false; });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const data = ok
      ? await page
          .evaluate(() => {
            const txt = (el) => (el ? el.textContent.trim().replace(/\s+/g, ' ') : '');
            const main = document.querySelector('main') || document.body;
            const headings = [...main.querySelectorAll('h1,h2')].slice(0, 8).map((h) => txt(h));
            const links = [...main.querySelectorAll('a')]
              .map((a) => ({ text: txt(a), href: a.getAttribute('href') || '' }))
              .filter((l) => l.text && l.href.startsWith('/') && !l.href.includes('login'))
              .slice(0, 60);
            const tables = [...main.querySelectorAll('table')].map((t) => ({
              rows: t.querySelectorAll('tbody tr').length,
              headers: [...t.querySelectorAll('th')].slice(0, 10).map(txt),
              sample: txt(t.querySelector('tbody tr')).slice(0, 200),
            }));
            const empty = [...main.querySelectorAll('p,td,div')]
              .map(txt)
              .find((t) => t && t.length > 3 && t.length < 140 && /^(no |belum |tidak ada )/i.test(t));
            return { path: location.pathname + location.search, headings, links, tables, empty: empty ?? null };
          })
          .catch(() => null)
      : null;
    const out = await signedOut();
    const shot = path.join(SHOT_DIR, `${admin.key}-${shotName}.png`.replace(/[^\w./-]+/g, '-'));
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    return { requested: url, shot, ...data, redirectedToLogin: page.url().includes('/login') || out };
  }

  await login();
  result.loginOk = !(await signedOut());

  // 1. Discover modules on the Apps page.
  const apps = await scrape(`${BASE}en/apps`, 'apps');
  const moduleLinks = (apps?.links ?? []).filter(
    (l) => /^\/(en|id)\/[a-z0-9-]+\/?$/.test(l.href) && !KNOWN_NON_MODULES.has(l.href.replace(/\/$/, '')),
  );
  const seen = new Map();
  for (const l of moduleLinks) {
    const slug = l.href.replace(/^\/(en|id)\//, '').replace(/\/$/, '');
    if (!seen.has(slug)) seen.set(slug, { slug, name: l.text, href: l.href });
  }
  result.moduleSlugs = [...seen.values()];

  // 2. Visit each module hub + its sub screens.
  for (const mod of result.moduleSlugs) {
    const hub = await scrape(`${BASE}${mod.href.replace(/^\//, '')}`, `${mod.slug}-hub`);
    const subs = (hub?.links ?? [])
      .filter((l) => l.href.startsWith(mod.href.replace(/\/$/, '') + '/') && l.href !== mod.href)
      .slice(0, MAX_SUBPAGES_PER_MODULE);
    const subSeen = new Set();
    const screens = [{ label: `${mod.slug} (hub)`, data: hub }];
    for (const s of subs) {
      if (subSeen.has(s.href)) continue;
      subSeen.add(s.href);
      const label = `${mod.slug}-${s.href.split('/').filter(Boolean).pop()}`;
      screens.push({ label, data: await scrape(`${BASE}${s.href.replace(/^\//, '')}`, label) });
    }
    result.modules.push({ ...mod, screens });
    console.log(`[${admin.key}] ${mod.slug}: ${screens.length} screens`);
  }

  fs.writeFileSync(path.join(OUT_DIR, `${admin.key}.json`), JSON.stringify(result, null, 2));
  await ctx.close();
}

await browser.close();
console.log('scan complete');
