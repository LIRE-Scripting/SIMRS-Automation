import { test, expect } from '../../../fixtures/pharmacy';
import { ensureSignedIn } from '../../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../../lib/config';
import { closeDialog, submitDialog } from '../../../lib/flow';
import { RegistrationPatientsPage } from '../../../pages/RegistrationPage';

/** Tanggal ISO (YYYY-MM-DD) untuk offset hari dari sekarang (UTC). */
function isoDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * Nama manusia realistis (Indonesia) agar mirip data dunia nyata. Tiap test
 * punya kumpulan nama sendiri sehingga pasien antar test selalu berbeda;
 * pilihan acak membuat antar run pun jarang sama.
 */
const NAME_POOLS = {
  create: {
    first: ['Budi', 'Siti', 'Agus', 'Dewi', 'Rizky', 'Putri'],
    last: ['Santoso', 'Wijayanti', 'Pratama', 'Hidayat', 'Kusumawati', 'Nugroho'],
  },
  pre: {
    first: ['Andini', 'Fajar', 'Maya', 'Hendra', 'Lestari', 'Bayu'],
    last: ['Rahmawati', 'Setiawan', 'Purnomo', 'Anggraini', 'Firmansyah', 'Saputra'],
  },
} as const;

function personName(pool: keyof typeof NAME_POOLS): { firstName: string; lastName: string } {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
  return { firstName: pick(NAME_POOLS[pool].first), lastName: pick(NAME_POOLS[pool].last) };
}

/**
 * Pilih nama yang BELUM ada di Registered Patients: acak dari pool, cari di
 * staging, ulangi sampai tidak ada pasien dengan nama depan + belakang itu.
 * Bila 15 kombinasi pool semuanya terpakai, tambahkan nama tengah realistis
 * sebagai pembeda (nama depan + belakang tetap nama manusia).
 */
async function uniquePersonName(
  patients: RegistrationPatientsPage,
  pool: keyof typeof NAME_POOLS,
): Promise<{ firstName: string; lastName: string }> {
  const exists = async (n: { firstName: string; lastName: string }) => {
    await patients.search(n.lastName);
    await patients.page.waitForTimeout(1_500);
    return (
      (await patients
        .rows()
        .filter({ hasText: n.firstName })
        .filter({ hasText: n.lastName })
        .count()) > 0
    );
  };
  for (let i = 0; i < 15; i++) {
    const n = personName(pool);
    if (!(await exists(n))) {
      await patients.clearSearch();
      return n;
    }
  }
  const extra = ['Adi', 'Eka', 'Tri', 'Dwi', 'Sri', 'Nur'];
  const n = personName(pool);
  const unique = { firstName: `${n.firstName} ${extra[Date.now() % extra.length]}`, lastName: n.lastName };
  await patients.clearSearch();
  return unique;
}

/**
 * TC-REG-E2E-002 - Registrasi pasien baru (create pasien E2E).
 *
 * Test case: module-test-cases-QA.xlsx. Form "Register patient" dengan
 * MRN kosong (auto-assign MRN-YYYY-XXXXXXXX). Registrasi memodifikasi
 * data staging: setiap run membuat satu pasien bertanda QAE2E.
 */
test.describe('TC-REG-E2E-002 - Registrasi pasien baru (E2E)', () => {
  test('Create pasien - toast, MRN auto-assign, dan muncul di hasil search', async ({ page }) => {
    const patients = new RegistrationPatientsPage(page);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await patients.open();

    const { firstName, lastName } = await uniquePersonName(patients, 'create');
    const newRow = () =>
      patients.rows().filter({ hasText: firstName }).filter({ hasText: lastName }).first();

    await test.step('Buka dialog New Registration', async () => {
      await patients.openRegisterDialog();
    });

    await test.step('Isi form (Outpatient, Daan Mogot, DOB) lalu Register - toast "Patient registered"', async () => {
      await patients.fillRegisterForm({
        visitType: 'Outpatient',
        branch: 'Daan Mogot',
        firstName,
        lastName,
        dateOfBirth: '1990-01-01',
      });
      await patients.submitRegister(/patient registered/i);
    });

    await test.step('Tutup dialog lalu cari pasien baru berdasarkan nama', async () => {
      await patients.closeRegisterDialog();
      await patients.search(lastName);
      // nama manusia bisa kembar dengan pasien lama - cocokkan nama depan DAN belakang
      await expect(newRow()).toBeVisible({ timeout: 15_000 });
    });

    await test.step('MRN auto-assign, visit Outpatient, dan valid until sekitar 1 tahun', async () => {
      const rowText = (await newRow().textContent()) ?? '';
      expect(rowText).toMatch(/MRN-\d{4}-[0-9A-Fa-f]{8}/);
      expect(rowText).toContain('Outpatient');
      // Valid until = tanggal registrasi + 1 tahun; toleransi +/- 1 hari
      // untuk selisih zona waktu server.
      const candidates = [isoDate(365), isoDate(364), isoDate(366)];
      expect(candidates.some((d) => rowText.includes(d))).toBe(true);
    });
  });

  test('Pre-registration: Add to worklist, Open form, lalu Register menjadi pasien terdaftar', async ({ page }) => {
    const patients = new RegistrationPatientsPage(page);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await patients.open();

    const { firstName, lastName } = await uniquePersonName(patients, 'pre');
    // Worklist "Waiting for a form" berupa daftar kartu (bukan tabel).
    const worklistItem = () =>
      page
        .locator('main')
        .getByText(new RegExp(`${firstName}.*${lastName}`))
        .first()
        .locator('xpath=ancestor::*[.//button[normalize-space()="Open form"]][1]');

    await test.step('Buka tab Pre-registration', async () => {
      await page.getByRole('tab', { name: 'Pre-registration' }).click();
      await expect(page.getByRole('button', { name: 'Add to worklist' })).toBeVisible();
    });

    await test.step('Isi Branch, Source, nama + DOB lalu Add to worklist - pasien masuk worklist', async () => {
      // Form intake memakai satu combobox (Branch) dan radio Source Online/External.
      await page.getByRole('combobox').first().selectOption({ label: 'Daan Mogot' });
      await page.getByRole('radio', { name: 'External' }).click();
      await page.getByRole('radio', { name: 'Online' }).click();
      await page.getByRole('textbox', { name: 'First name' }).fill(firstName);
      await page.getByRole('textbox', { name: 'Middle name' }).fill('QA');
      await page.getByRole('textbox', { name: 'Last name' }).fill(lastName);
      await page.getByRole('textbox', { name: 'Date of birth' }).fill('2005-01-14');
      await page.getByRole('button', { name: 'Add to worklist' }).click();
      await expect(worklistItem()).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Open form pada baris worklist, pilih Branch, lalu Register', async () => {
      await worklistItem().getByRole('button', { name: 'Open form' }).click();
      const dlg = patients.registerDialog();
      await expect(dlg).toBeVisible();
      await dlg.locator('#reg-branch').selectOption({ label: 'Daan Mogot' });
      await patients.submitRegister(/patient registered/i);
      await patients.closeRegisterDialog();
    });

    await test.step('Pasien muncul di tab Registered', async () => {
      await page.getByRole('tab', { name: 'Registered' }).click();
      await patients.search(lastName);
      await expect(
        patients.rows().filter({ hasText: firstName }).filter({ hasText: lastName }).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Form settings: simpan Default visit type untuk satu branch lalu verifikasi pada branch yang sama', async ({ page }) => {
    const patients = new RegistrationPatientsPage(page);
    await ensureSignedIn(page, MODULES_USERNAME, PASSWORD);
    await patients.open();

    // Satu branch saja untuk simpan sekaligus verifikasi. Option value di
    // select adalah UUID, jadi pilih lewat UUID (stabil) dan cocokkan label-nya.
    const BRANCH = { id: '362f90c1-de31-50b6-b792-9e94d87309c2', label: 'Podomoro' };

    const openSettings = async () => {
      await page.getByRole('button', { name: 'Form settings' }).click();
      const dlg = page.getByRole('dialog', { name: 'Form settings' });
      await expect(dlg).toBeVisible();
      const branch = dlg.locator('select').first();
      await branch.selectOption(BRANCH.id);
      // pastikan UUID memang branch yang dimaksud, bukan branch lain
      await expect(branch).toHaveValue(BRANCH.id);
      await expect(branch.locator('option:checked')).toHaveText(BRANCH.label);
      await page.waitForTimeout(1_000);
      return dlg;
    };

    let chosen = '';
    await test.step(`Buka Form settings, pilih branch ${BRANCH.label}, ubah Default visit type, Save settings`, async () => {
      const dlg = await openSettings();
      const def = dlg.getByLabel('Default visit');
      const current = await def.inputValue();
      chosen = current === 'newborn' ? 'staff' : 'newborn';
      await def.selectOption(chosen);
      await expect(def).toHaveValue(chosen);
      await submitDialog(page, dlg, /^save settings$/i, '/en/registration');
      await closeDialog(page, dlg);
    });

    await test.step(`Buka lagi Form settings, pilih branch ${BRANCH.label} - Default visit type sesuai yang disimpan`, async () => {
      const dlg = await openSettings();
      await expect(dlg.getByLabel('Default visit')).toHaveValue(chosen);
      await closeDialog(page, dlg);
    });

    await test.step('Muat ulang halaman - nilai tetap tersimpan untuk branch yang sama', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      const dlg = await openSettings();
      await expect(dlg.getByLabel('Default visit')).toHaveValue(chosen);
      await closeDialog(page, dlg);
    });
  });
});
