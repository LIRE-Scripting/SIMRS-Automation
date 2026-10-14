import { test, expect } from '../../../fixtures/suite';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import {
  closeDialog,
  fillField,
  openDialog,
  openModulePage,
  pickSelect,
  pickSuggestion,
  rowWithText,
} from '../../../lib/flow';

/**
 * HR-JRN-001..002 dari module-journeys-QA.xlsx (data/module-journeys/hr.json).
 */
test.describe('HR journeys', () => {
  test('HR-JRN-001 · HR menambahkan karyawan baru', async ({ page }) => {
    test.setTimeout(90_000);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/hr/employees', /employee/i);

    const empNo = `QA${Date.now().toString().slice(-8)}`;
    await test.step('Step 1 · Buka wizard Create employee', async () => {
      const trigger = page
        .getByRole('button', { name: /create employee/i })
        .or(page.getByRole('button', { name: /^new$|^add$/i }))
        .first();
      await openDialog(page, trigger, /create employee/i);
    });

    const dlg = page.locator('[role="dialog"]:not([data-open="false"])').first();
    let saved = false;
    const lookupFails: string[] = [];
    await test.step('Step 2 · Langkah File: identitas + picker lalu Next', async () => {
      await pickSelect(dlg, 'select >> nth=0', 'Daan Mogot');
      await fillField(dlg, '#employee-no', empNo);
      await fillField(dlg, '#employee-name', `Karyawan Uji ${empNo}`);
      await fillField(dlg, '#employee-category', 'Umum');
      await fillField(dlg, '#employee-gender', 'L');
      await fillField(dlg, '#employee-designation', 'Staf QA');
      await fillField(dlg, '#employee-dob', '1995-05-17');
      const lookups = dlg.locator('input[placeholder*="Code or name" i]');
      const n = await lookups.count();
      for (let i = 0; i < n; i++) {
        await pickSuggestion(page, lookups.nth(i), 'Podomoro').catch((e) => {
          lookupFails.push(`lookup#${i + 1}: ${String(e).split('\n')[0]}`);
        });
      }
      const next = dlg.getByRole('button', { name: /^next$/i }).first();
      const advanced = await next
        .click({ timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!advanced) {
        await closeDialog(page, dlg).catch(() => {});
        throw new Error(
          'Wizard Create employee tidak dapat dilanjutkan (Next tidak aktif/tidak ada) - ' +
            'kemungkinan isian wajib belum lengkap. ' +
            (lookupFails.length ? `Typeahead gagal: ${lookupFails.join(' | ')}` : ''),
        );
      }
      await page.waitForTimeout(1_000);
    });

    await test.step('Step 3 · Langkah 2-6 wizard sampai Save', async () => {
      for (let i = 0; i < 6; i++) {
        const save = dlg.getByRole('button', { name: /^(save|create)$/i }).first();
        if (await save.isVisible().catch(() => false)) {
          await save.click({ timeout: 8_000 });
          await page.waitForTimeout(3_000);
          saved = true;
          break;
        }
        const next = dlg.getByRole('button', { name: /^next$/i }).first();
        if (await next.isVisible().catch(() => false)) {
          await next.click({ timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(1_000);
        } else break;
      }
      await closeDialog(page, dlg).catch(() => {});
      if (!saved) {
        throw new Error(
          'Wizard Create employee (6 langkah: File/Dependents/Contacts/Qualifications/' +
            'Employment/Licences) tidak mencapai tombol Save - isian wajib antar-langkah ' +
            'butuh pemetaan manual per langkah.',
        );
      }
    });

    await test.step('Step 4 · Karyawan baru ditemukan', async () => {
      const search = page.locator('input[type="search"]').first();
      await search.fill(empNo);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(rowWithText(page, empNo)).toBeVisible({ timeout: 15_000 });
    });
  });

  test('HR-JRN-002 · HR mencari karyawan existing', async ({ page }) => {
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await openModulePage(page, '/en/hr/employees', /employee/i);

    await test.step('Step 1 · Buka daftar karyawan', async () => {
      const rows = page.locator('main table tbody tr');
      const hasRows = await rows.first().isVisible().catch(() => false);
      if (!hasRows) {
        test.skip(true, 'Blocked data: daftar karyawan kosong pada staging - tidak ada data untuk dicari (jalankan dulu HR-JRN-001).');
      }
    });

    await test.step('Step 2 · Cari nama karyawan pertama', async () => {
      const rows = page.locator('main table tbody tr');
      const name = ((await rows.first().locator('td').nth(1).textContent()) ?? '').trim();
      expect(name.length).toBeGreaterThan(0);
      const search = page.locator('input[type="search"]').first();
      await search.fill(name);
      await search.press('Enter');
      await page.waitForTimeout(2_000);
      await expect(rowWithText(page, name)).toBeVisible({ timeout: 15_000 });
    });
  });
});
