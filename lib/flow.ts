import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Primitif alur E2E lintas modul. Semua interaksi memakai label/role/field
 * nyata dari aplikasi - tidak ada data scan.
 */

/** Data pasien yang diambil dari modul Registration. */
export interface PatientRef {
  mrn: string;
  name: string;
}

/**
 * Ambil pasien dari modul lain (Registration): baris pertama daftar
 * Registered Patients. Dipakai flow yang butuh subjek pasien
 * (appointment, blood bank, clinical, OT, dll).
 */
export async function getPatientFromRegistration(page: Page): Promise<PatientRef> {
  await page.goto('/en/registration/patients', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Registered Patients' })).toBeVisible();
  const first = page.locator('main table tbody tr').first();
  const mrn = ((await first.locator('td').nth(0).textContent()) ?? '').trim();
  const name = ((await first.locator('td').nth(1).textContent()) ?? '').trim();
  expect(mrn, 'harus ada pasien terdaftar untuk dipakai flow modul lain').toMatch(/^(RM|MRN)-/);
  return { mrn, name };
}

/** Buka halaman modul dan pastikan tidak ter-redirect ke login. */
export async function openModulePage(page: Page, path: string, heading: RegExp): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_500);
  expect(page.url(), `buka ${path} tidak boleh dialihkan ke login`).not.toContain('/login');
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
}

/**
 * Klik tombol pemicu lalu tunggu dialog terbuka. Dialog yang sudah pernah
 * dirender lama ditandai data-open="false"; dialog yang baru dibuka di-mount
 * tanpa atribut tersebut.
 */
export async function openDialog(page: Page, trigger: Locator, title?: RegExp): Promise<Locator> {
  await trigger.first().click({ timeout: 10_000 });
  const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  if (title) await expect(dlg.getByText(title).first()).toBeVisible();
  return dlg;
}

/** Pilih option pada select di dalam dialog berdasarkan label yang tampil. */
export async function pickSelect(dlg: Locator, selector: string, label: string): Promise<void> {
  await dlg.locator(selector).first().selectOption({ label, timeout: 8_000 });
}

/** Isi field (input/textarea) di dalam dialog berdasarkan selector. */
export async function fillField(dlg: Locator, selector: string, value: string): Promise<void> {
  await dlg.locator(selector).first().fill(value, { timeout: 8_000 });
}

/**
 * Isi field pencarian lalu pilih saran yang memuat kueri. Aplikasi memakai
 * dua struktur panel saran: ul[role=listbox] > li > button (clinical) dan
 * div polos tanpa role (bloodbank/OT/MRD) - maka pilih elemen terdalam yang
 * memuat kueri dengan klik programatik (klik pointer kerap ter-intercept
 * overlay dialog). Sukses diverifikasi dari nilai input yang ter-commit.
 */
export async function pickSuggestion(page: Page, input: Locator, query: string): Promise<void> {
  await input.click({ timeout: 8_000 });
  await input.fill(query, { timeout: 8_000 });
  const start = Date.now();
  while (Date.now() - start < 12_000) {
    await page.waitForTimeout(500);
    const clicked = await page.evaluate((q) => {
      const els = [...document.querySelectorAll('body *')].filter((e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.tagName)) return false;
        const t = (e.textContent || '').trim();
        if (!t.includes(q) || t.length > 150) return false;
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        // hanya elemen di panel mengambang: role listbox/option, BUTTON,
        // atau leluhur dengan position absolute/fixed
        if (e.tagName === 'BUTTON') return true;
        if (e.getAttribute('role') === 'option' || e.closest('[role="listbox"]')) return true;
        let p = e.parentElement;
        while (p && p !== document.body) {
          const cls = (p.className || '').toString();
          if (/\b(absolute|fixed)\b/.test(cls)) return true;
          p = p.parentElement;
        }
        return false;
      });
      if (!els.length) return false;
      const deepest = els.filter((e) => !els.some((o) => o !== e && e.contains(o)));
      const target =
        deepest.find((e) => e.tagName === 'BUTTON') ?? deepest[0] ?? els[els.length - 1];
      (target as HTMLElement).click();
      return true;
    }, query);
    if (!clicked) continue;
    await page.waitForTimeout(400);
    const val = (await input.inputValue({ timeout: 5_000 }).catch(() => '')) ?? '';
    if (val.trim() !== query.trim()) return;
  }
  throw new Error(
    `Saran typeahead untuk "${query}" tidak muncul/tidak dapat dipilih dalam 12 detik ` +
      '(data tidak tersedia atau picker bermasalah).',
  );
}

/**
 * Pilih pasien (nama) pada kolom typeahead. Server pencarian pasien hanya
 * cocok untuk query pendek per token - pakai token pertama + awalan token
 * kedua, lalu pastikan pasien yang ter-commit memuat token unik terakhir.
 */
export async function pickPatient(page: Page, input: Locator, name: string): Promise<void> {
  const tokens = name.trim().split(/\s+/);
  const query =
    tokens.length >= 2 ? `${tokens[0]} ${tokens[1].slice(0, 6)}` : (tokens[0] ?? '');
  await pickSuggestion(page, input, query);
  const val = (await input.inputValue().catch(() => '')) ?? '';
  const unique = tokens[tokens.length - 1] ?? '';
  if (unique && !val.includes(unique)) {
    throw new Error(
      `Picker memilih pasien yang salah: "${val}" (harus memuat "${unique}").`,
    );
  }
}

/** Cari baris tabel yang memuat teks (marker unik) di mana pun posisinya. */
export function rowWithText(page: Page, text: string): Locator {
  return page.locator('main table tbody tr').filter({ hasText: text }).first();
}

/**
 * Submit dialog lewat tombolnya lalu tunggu respons POST/PATCH/PUT.
 * Keputusan sukses/gagal dari status HTTP (toast sukses kadang hilang
 * sebelum sempat dibaca). Melempar error deskriptif bila server menolak.
 */
export async function submitDialog(
  page: Page,
  dlg: Locator,
  buttonLabel: RegExp,
  urlPart: string,
): Promise<number> {
  const reqPromise = page
    .waitForResponse(
      (res) =>
        ['POST', 'PUT', 'PATCH'].includes(res.request().method()) &&
        res.url().includes(urlPart),
      { timeout: 20_000 },
    )
    .catch(() => null);
  await dlg.getByRole('button', { name: buttonLabel }).first().click();
  const res = await reqPromise;
  if (res && res.status() >= 400) {
    throw new Error(
      `Server menolak aksi: ${res.request().method()} ${urlPart} -> HTTP ${res.status()} ` +
        `(defect/validasi staging 2026-10-13).`,
    );
  }
  return res ? res.status() : 0;
}

/** Tutup dialog: Escape, fallback tombol Cancel. */
export async function closeDialog(page: Page, dlg: Locator): Promise<void> {
  if (!(await dlg.isVisible().catch(() => false))) return;
  await page.keyboard.press('Escape');
  const closed = await dlg
    .waitFor({ state: 'hidden', timeout: 4_000 })
    .then(() => true)
    .catch(async () => {
      const open = await dlg.getAttribute('data-open').catch(() => null);
      return open === 'false';
    });
  if (closed) return;
  const cancel = dlg.getByRole('button', { name: /^cancel$|^close$/i }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  await expect(dlg).toHaveAttribute('data-open', 'false', { timeout: 5_000 }).catch(() => {});
}
