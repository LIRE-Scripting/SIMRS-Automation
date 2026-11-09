# HTTP 5xx: jawaban error dari server situs

Dibangun 2026-11-09 11:28 WIB dari `reports/summary/run-summary.json` (hasil terbaru setiap test case dan rantai). Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

HTTP 5xx = server situs gagal memproses permintaan (error di sisi server), bukan penolakan biasa. Setiap jawaban 5xx dicatat oleh `fixtures/e2e.ts` (fixture `serverErrors`) ke `.qa-state/**/http-5xx.jsonl`. Dokumen ini hanya memuat 5xx yang **masih terjadi** di hasil terbaru; yang sudah diperbaiki tidak dicantumkan.

**4 jawaban 5xx** masih terjadi, dari 3 test.

| Endpoint | Test | Terlihat pertama | Terakhir (WIB) | Digest | Masalah | Perbaikan yang disarankan | Blocker terkait |
|---|---|---|---|---|---|---|---|
| `POST /emergency/patients` | TC-APP015-052 (Terblokir) | 2026-10-21 | 2026-11-09 09:52 | 527308963 | Melampirkan file sekitar 1 MB pada pasien IGD (TC-APP015-052 langkah 1) dijawab HTTP 500; layar hanya menampilkan "Could not save.". Dicek ulang 2026-11-01: masih terjadi (digest 527308963). | Batasi ukuran lampiran di server dan tolak file yang terlalu besar dengan pesan yang menyebut batasnya, alih-alih error server. | [9](blocker.md#blocker-9), [54](blocker.md#blocker-54) |
| `POST /emergency/patients` | TC-APP015-052 (Terblokir) | 2026-10-21 | 2026-11-08 23:56 | 527308963 | Melampirkan file sekitar 1 MB pada pasien IGD (TC-APP015-052 langkah 1) dijawab HTTP 500; layar hanya menampilkan "Could not save.". Dicek ulang 2026-11-01: masih terjadi (digest 527308963). | Batasi ukuran lampiran di server dan tolak file yang terlalu besar dengan pesan yang menyebut batasnya, alih-alih error server. | [9](blocker.md#blocker-9), [54](blocker.md#blocker-54) |
| `POST /payroll/batches` | TC-APP017-014 (Deviasi) | 2026-11-09 | 2026-11-09 08:22 | 3677213673 | Server menjawab 500 untuk permintaan ini. | Tangani permintaan ini tanpa error server; kembalikan pesan yang jelas bila input ditolak. | [37](blocker.md#blocker-37) |
| `POST /payroll/batches` | TC-APP017-015 (Deviasi) | 2026-11-09 | 2026-11-09 08:22 | 2036059728 | Server menjawab 500 untuk permintaan ini. | Tangani permintaan ini tanpa error server; kembalikan pesan yang jelas bila input ditolak. | [37](blocker.md#blocker-37) |

## Error server yang menghentikan test

Blocker yang penyebabnya error server: situs menjawab HTTP 500/504 (sampai 2026-10-30) atau error server untuk permintaan yang benar. Langkahnya tidak bisa dijalankan, jadi test case-nya berstatus **Terblokir**; sekarang **9** masih menghentikan **81 test case**. Dipindah dari [blocker.md](blocker.md) atas keputusan 2026-11-06.

| No | Masalah | Cabang | Test case | Rantai | Modul | Penanggung jawab |
|---:|---|---|---:|---|---|---|
| [2](#blocker-2) | Halaman Donor tidak memuat daftar donor ("failed to list donors"; sampai 2026-10-30 HTTP 500) | Podomoro | 58 | E2E-007, E2E-030, E2E-031 | 06 Transfusi Darah | Development |
| [3](#blocker-3) | Halaman baru pengeluaran steril gagal ("cssd request failed"; sampai 2026-10-30 HTTP 500) | Podomoro | 9 |  | 21 Sterilisasi (CSSD) | Tester, lalu Development |
| [48](#blocker-48) | Penerimaan unsteril yang tersimpan tidak bisa dibuka: halamannya time-out (504 nginx sampai 2026-10-30, "The operation was aborted due to timeout" sejak) | Podomoro | 7 |  | 21 Sterilisasi (CSSD) | Development |
| [25](#blocker-25) | Menyimpan kantong darah luar atau catatan kontrol mutu gagal ("failed to receive external unit", "failed to save quality control") | Podomoro | 2 |  | 06 Transfusi Darah | Development |
| [27](#blocker-27) | Menyimpan kit gagal ("saveKitComponents: 500 stock update failed") | Podomoro | 2 |  | 05 Farmasi, 07 Persediaan | Development |
| [38](#blocker-38) | Menyimpan hak akses role gagal ("Failed to save rights.") | Podomoro | 1 | E2E-019 | 18 Pengaturan | Development |
| [41](#blocker-41) | Pasien tidak bisa didaftarkan di Kemayoran (BR-B): "Register" menjawab "Registration failed" | Kemayoran (U6) | 2 |  | 01 Rawat Jalan | Development |
| [53](#blocker-53) | "Revert latest stamp" di meja kerja laboratorium gagal ("bad_request") | Podomoro | 1 |  | 11 Laboratorium | Development |
| [55](#blocker-55) | "Simpan branding" dengan logo yang diunggah gagal ("Failed to save branding.") | Podomoro | 1 |  | 18 Pengaturan | Development |

### Blocker 2

**Halaman Donor tidak memuat daftar donor ("failed to list donors"; sampai 2026-10-30 HTTP 500)**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** Halaman Donor memuat daftar donor tanpa penanganan error. Permintaan daftar gagal di server, sehingga seluruh halaman tidak tampil (sampai 2026-10-30 HTTP 500, sejak itu "failed to list donors"). Semua alur donor, skrining, kantong, dan camp tidak bisa dimulai.
- **Dampak:** 58 test case dan rantai E2E-007, E2E-030, E2E-031 terhenti (06 Transfusi Darah).
- **Perbaikan:** 1. Cari request daftar donor yang gagal di log server dan perbaiki. 2. Tampilkan layar dengan pesan saat daftar gagal, bukan halaman error. 3. Baca lagi layarnya dan tinjau ke-27 alur.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): failed to list donors
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 6
- **Test case terhenti:** E2E-007, E2E-030, E2E-031, TC-APP006-001, TC-APP006-002, TC-APP006-003, TC-APP006-004, TC-APP006-005, TC-APP006-006, TC-APP006-007, TC-APP006-008, TC-APP006-009, TC-APP006-010, TC-APP006-011, TC-APP006-012, TC-APP006-013, TC-APP006-014, TC-APP006-015, TC-APP006-022, TC-APP006-023, TC-APP006-024, TC-APP006-025, TC-APP006-026, TC-APP006-027, TC-APP006-028, TC-APP006-030, TC-APP006-032, TC-APP006-033, TC-APP006-034, TC-APP006-035, TC-APP006-036, TC-APP006-037, TC-APP006-038, TC-APP006-039, TC-APP006-040, TC-APP006-041, TC-APP006-042, TC-APP006-043, TC-APP006-044, TC-APP006-045 … (+21)

### Blocker 3

**Halaman baru pengeluaran steril gagal ("cssd request failed"; sampai 2026-10-30 HTTP 500)**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** Halaman pengeluaran steril baru memuat sumber pengeluaran dan daftar store sekaligus tanpa penanganan error. Salah satunya gagal, jadi halaman tidak tampil ("cssd request failed").
- **Dampak:** 9 test case terhenti (21 Sterilisasi (CSSD)).
- **Perbaikan:** 1. Buka halaman lagi dengan satu cabang dipilih. 2. Kalau masih gagal: cari request yang gagal di log server; perbaiki atau tambahkan fallback. 3. Pastikan sumber pengeluaran dan gudang ada untuk cabang tersebut.
- **Penanggung jawab:** Tester, lalu Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): cssd request failed
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 7
- **Test case terhenti:** TC-APP021-021, TC-APP021-022, TC-APP021-023, TC-APP021-024, TC-APP021-025, TC-APP021-026, TC-APP021-029, TC-APP021-030, TC-APP021-043

### Blocker 25

**Menyimpan kantong darah luar atau catatan kontrol mutu gagal ("failed to receive external unit", "failed to save quality control")**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** Menyimpan kantong darah dari luar atau catatan kontrol mutu gagal (sampai 2026-10-30 HTTP 500). Permintaan darah tetap "Pending", jadi tidak ada yang masuk antrean sebagai "approved".
- **Dampak:** 2 test case terhenti (06 Transfusi Darah).
- **Perbaikan:** 1. Cari request yang gagal di log server (digest 1431275565 dan 2743853802 tanggal 2026-10-15) dan perbaiki. 2. Jalankan lagi TC-APP006-016, 022, 029, 055, 057, dan 062.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP006-016, TC-APP006-029

### Blocker 27

**Menyimpan kit gagal ("saveKitComponents: 500 stock update failed")**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** Menyimpan kit gagal ("saveKitComponents: 500 stock update failed"), jadi item kit tidak bisa dibuat.
- **Dampak:** 2 test case terhenti (05 Farmasi, 07 Persediaan).
- **Perbaikan:** 1. Perbaiki penyimpanan kit. 2. Jalankan lagi TC-APP007-007 dan TC-APP005-010.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): saveKitComponents: 500 stock update failed
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP005-010, TC-APP007-007

### Blocker 38

**Menyimpan hak akses role gagal ("Failed to save rights.")**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** Hak akses role tidak bisa disimpan ("Failed to save rights."). Akibatnya 4 akun uji tidak bisa dibuat: Perawat Rawat Inap, Admin Pengaturan, Petugas Layanan Jasa, dan Petugas Tender.
- **Dampak:** 1 test case dan rantai E2E-019 terhenti (18 Pengaturan).
- **Perbaikan:** 1. Perbaiki penyimpanan hak role (log server, digest 2696407390). 2. Ulangi prereq untuk keempat role (PREREQ_RETRY=blocked npm run test:prereq): keempat akun lalu bisa dibuat. 3. Jalankan lagi TC-APP018-039 dan alur 04, 18, 22, dan 23 dengan akun-akun itu.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (2026-11-09): dicek setiap run oleh TC-APP018-039, dan dicoba manual di User Rights; tetap "Failed to save rights.".
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-019, TC-APP018-039

### Blocker 41

**Pasien tidak bisa didaftarkan di Kemayoran (BR-B): "Register" menjawab "Registration failed"**

- **Jenis:** Error server
- **Cabang:** Kemayoran (U6)
- **Masalah:** Pasien tidak bisa didaftarkan di Kemayoran (BR-B): "Register" menjawab "Registration failed", padahal formulir yang sama di Podomoro berhasil.
- **Dampak:** 2 test case terhenti (01 Rawat Jalan).
- **Perbaikan:** 1. Perbaiki pendaftaran pasien di Kemayoran (kemungkinan set-up cabang yang dibutuhkan aksinya, mis. penomoran MRN). 2. Jalankan lagi TC-APP001-024 dan TC-APP001-043.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP001-024, TC-APP001-043

### Blocker 48

**Penerimaan unsteril yang tersimpan tidak bisa dibuka: halamannya time-out (504 nginx sampai 2026-10-30, "The operation was aborted due to timeout" sejak)**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** Penerimaan unsteril yang tersimpan tidak bisa dibuka: halamannya tidak pernah selesai dimuat dan time-out (504 sampai 2026-10-30), dan selama itu halaman lain ikut melambat.
- **Dampak:** 7 test case terhenti (21 Sterilisasi (CSSD)).
- **Perbaikan:** 1. Perbaiki halaman penerimaan tidak steril yang sudah disimpan (seharusnya terbuka dengan "Send for Approval"). 2. Jalankan lagi TC-APP021-012, 014, 017, 019, dan 029.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP021-012, TC-APP021-014, TC-APP021-017, TC-APP021-019, TC-APP021-020, TC-APP021-029, TC-APP021-030

### Blocker 53

**"Revert latest stamp" di meja kerja laboratorium gagal ("bad_request")**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** "Revert latest stamp" di meja kerja laboratorium gagal ("bad_request"; sebelumnya HTTP 500): langkah terakhir sebuah order tidak bisa dibatalkan.
- **Dampak:** 1 test case terhenti (11 Laboratorium).
- **Perbaikan:** 1. Perbaiki "Revert latest stamp" di Work desk laboratorium. 2. Jalankan lagi TC-APP011-041.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP011-041

### Blocker 55

**"Simpan branding" dengan logo yang diunggah gagal ("Failed to save branding.")**

- **Jenis:** Error server
- **Cabang:** Podomoro
- **Masalah:** "Simpan branding" dengan logo yang diunggah gagal ("Failed to save branding."), jadi branding baru tidak bisa tampil di header dan halaman login.
- **Dampak:** 1 test case terhenti (18 Pengaturan).
- **Perbaikan:** 1. Perbaiki penyimpanan branding dengan logo yang diunggah. 2. Jalankan lagi TC-APP018-043.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP018-043
