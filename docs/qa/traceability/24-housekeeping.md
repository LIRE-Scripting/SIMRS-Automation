# Keterlacakan: 24-housekeeping.xlsx

Dibangun oleh `npm run qa:inventory` dari `reference/24-housekeeping.xlsx`. Jangan diubah manual.

Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.

| TC ID | Journey ID | Skenario | Jenis | Prioritas | Baris Steps | Baris Journeys | Spec | User / cabang | Disposisi | Alasan |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP024-001 | JRN-APP024-001 | Lokasi: tenaga kerja, shift, aktivitas, dan bahan | Positif | Tinggi | baris 2-9 | 2 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 8: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-002 | JRN-APP024-001 | Lokasi yang ditolak | Negatif | Tinggi | baris 10-15 | 2 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-003 | JRN-APP024-001 | Pencocokan yang gagal | Negatif | Tinggi | baris 16-17 | 2 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-004 | JRN-APP024-002 | Kontrak dengan vendor kebersihan: simpan, baris harga, kirim, dan setujui | Positif | Kritis | baris 18-22 | 3 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-005 | JRN-APP024-002 | Kontrak yang ditolak | Negatif | Kritis | baris 23-27 | 3 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-006 | JRN-APP024-002 | Kontrak yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 28-30 | 3 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-007 | JRN-APP024-003 | Log harian: siapa membersihkan di mana, dan persetujuannya | Positif | Tinggi | baris 31-34 | 4 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-008 | JRN-APP024-003 | Log yang ditolak | Negatif | Tinggi | baris 35-37 | 4 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-009 | JRN-APP024-003 | Log yang seharusnya ditolak atau dikonfirmasi | Negatif | Tinggi | baris 38-41 | 4 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-010 | JRN-APP024-004 | Tagihan vendor kebersihan, dibukukan di Finance | Integrasi | Kritis | baris 42-47 | 5 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 4, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-011 | JRN-APP024-004 | Tagihan yang ditolak | Negatif | Kritis | baris 48-50 | 5 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-012 | JRN-APP024-004 | Tagihan yang seharusnya ditolak | Negatif | Kritis | baris 51-55 | 5 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-013 | JRN-APP024-005 | Dari rencana kebersihan sampai tagihan: satu bulan, dari awal sampai akhir | Integrasi | Tinggi | baris 56-61 | 6 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-014 | JRN-APP024-006 | Housekeeping tanpa hak housekeeping, dan apa yang dicatat | Keamanan | Tinggi | baris 62-67 | 7 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP024-015 | JRN-APP024-007 | Layar /housekeeping terbuka | Regresi | Tinggi | baris 68 | 8 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-016 | JRN-APP024-007 | Layar /housekeeping/bills terbuka | Regresi | Sedang | baris 69 | 8 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-017 | JRN-APP024-007 | Layar /housekeeping/contracts terbuka | Regresi | Sedang | baris 70 | 8 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-018 | JRN-APP024-007 | Layar /housekeeping/locations terbuka | Regresi | Sedang | baris 71 | 8 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-019 | JRN-APP024-007 | Layar /housekeeping/logs terbuka | Regresi | Sedang | baris 72 | 8 | `tests/modules/24-housekeeping/housekeeping.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-020 | JRN-APP024-008 | Tautan langsung tanpa sesi | Keamanan | Tinggi | baris 73 | 9 | `tests/modules/24-housekeeping/not-automated.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP024-021 | JRN-APP024-008 | Tenant tanpa lisensi | Keamanan | Tinggi | baris 74-75 | 9 | `tests/modules/24-housekeeping/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP024-022 | JRN-APP024-008 | Menulis tanpa privilege tulis | Keamanan | Tinggi | baris 76 | 9 | `tests/modules/24-housekeeping/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |

## Jumlah

- otomatis (hanya membaca): 0
- otomatis (menyimpan data; butuh QA_ALLOW_WRITES): 21
- otomatis (rantai; butuh data dari aplikasi lain): 0
- fixme (terblokir atau menunggu prasyarat): 1
- skip (tidak diotomasi): 0
- test case dengan langkah "TBD" (dicek sebagian): 14
