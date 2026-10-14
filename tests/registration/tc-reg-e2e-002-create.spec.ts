import { test, expect } from '../../fixtures/pharmacy';
import { ensureSignedIn } from '../../lib/auth';
import { MODULES_USERNAME, PASSWORD } from '../../lib/config';
import { RegistrationPatientsPage } from '../../pages/RegistrationPage';

/** Tanggal ISO (YYYY-MM-DD) untuk offset hari dari sekarang (UTC). */
function isoDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
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

    const lastName = `QAE2E${Date.now().toString().slice(-10)}`;
    const firstName = 'Probe';

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
      const firstRow = patients.rows().first();
      await expect(firstRow).toContainText(firstName, { timeout: 15_000 });
      await expect(firstRow).toContainText(lastName);
    });

    await test.step('MRN auto-assign, visit Outpatient, dan valid until sekitar 1 tahun', async () => {
      const rowText = (await patients.rows().first().textContent()) ?? '';
      expect(rowText).toMatch(/MRN-\d{4}-[0-9A-Fa-f]{8}/);
      expect(rowText).toContain('Outpatient');
      // Valid until = tanggal registrasi + 1 tahun; toleransi +/- 1 hari
      // untuk selisih zona waktu server.
      const candidates = [isoDate(365), isoDate(364), isoDate(366)];
      expect(candidates.some((d) => rowText.includes(d))).toBe(true);
    });
  });
});
