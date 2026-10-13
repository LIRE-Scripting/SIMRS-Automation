import { test } from '@playwright/test';

/**
 * TC-APO-001 & TC-KLI-001 - Login tenant Apotek dan Klinik.
 *
 * Test case: module-test-cases-QA.xlsx (journey APO-001 / KLI-001,
 * sheet Steps). Keduanya diblokir oleh auth staging: percobaan login
 * berulang ditolak tanpa pesan error apa pun, sehingga scan modul
 * tenant tersebut belum bisa dijalankan.
 */
test.describe('TC-APO-001 / TC-KLI-001 - Login tenant lain (diblokir auth staging)', () => {
  test('TC-APO-001 - login apotek.admin untuk scan modul Apotek', async () => {
    test.skip(true,
      'Login apotek.admin ditolak server: 15+ percobaan (3 run) gagal tanpa pesan error. ' +
      'Jalankan ulang saat auth staging normal.');
  });

  test('TC-KLI-001 - login klinik.admin untuk scan modul Klinik', async () => {
    test.skip(true,
      'Login klinik.admin ditolak server: 19+ percobaan, 0 sukses, tanpa pesan error (temuan UX). ' +
      'Jalankan ulang saat auth staging normal.');
  });
});
