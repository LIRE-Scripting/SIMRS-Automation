# Keterlacakan: 26-maintenance.xlsx

Dibangun oleh `npm run qa:inventory` dari `reference/26-maintenance.xlsx`. Jangan diubah manual.

Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.

| TC ID | Journey ID | Skenario | Jenis | Prioritas | Baris Steps | Baris Journeys | Spec | User / cabang | Disposisi | Alasan |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP026-001 | JRN-APP026-001 | Rencana: job card, rencana, jadwal aset, status harian, dan yang jatuh tempo | Positif | Tinggi | baris 2-8 | 2 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 6, 7: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-002 | JRN-APP026-001 | Rencana yang ditolak | Negatif | Tinggi | baris 9-15 | 2 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6, 7: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-003 | JRN-APP026-001 | Rencana yang seharusnya ditolak atau dikonfirmasi | Negatif | Tinggi | baris 16-18 | 2 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-004 | JRN-APP026-002 | Kerusakan sampai invoice: work order, anggaran, suku cadang, dan penyelesaian | Integrasi | Kritis | baris 19-26 | 3 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 8: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-005 | JRN-APP026-002 | Pekerjaan yang ditolak | Negatif | Kritis | baris 27-37 | 3 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-006 | JRN-APP026-002 | Pekerjaan yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 38-42 | 3 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-007 | JRN-APP026-003 | AMC: indent, kontrak, jadwal, dan cicilan | Integrasi | Kritis | baris 43-50 | 4 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 8: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-008 | JRN-APP026-003 | AMC yang ditolak | Negatif | Kritis | baris 51-59 | 4 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6, 7, 8, 9: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-009 | JRN-APP026-003 | AMC yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 60-62 | 4 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-010 | JRN-APP026-004 | Garansi dan sertifikat aset | Positif | Sedang | baris 63-67 | 5 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-011 | JRN-APP026-004 | Garansi dan sertifikat yang ditolak | Negatif | Sedang | baris 68-71 | 5 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-012 | JRN-APP026-005 | Pemeliharaan dan aplikasi lain: aset, anggaran, stok, dan Finance | Integrasi | Tinggi | baris 72-77 | 6 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3, 4, 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-013 | JRN-APP026-006 | Pemeliharaan tanpa hak pemeliharaan, dan apa yang dicatat | Keamanan | Tinggi | baris 78-82 | 7 | `tests/modules/26-maintenance/maintenance.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP026-014 | JRN-APP026-007 | Layar /maintenance terbuka | Regresi | Tinggi | baris 83 | 8 | `tests/modules/26-maintenance/maintenance.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP026-015 | JRN-APP026-007 | Layar /maintenance/amc terbuka | Regresi | Sedang | baris 84 | 8 | `tests/modules/26-maintenance/maintenance.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP026-016 | JRN-APP026-007 | Layar /maintenance/plans terbuka | Regresi | Sedang | baris 85 | 8 | `tests/modules/26-maintenance/maintenance.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP026-017 | JRN-APP026-007 | Layar /maintenance/work terbuka | Regresi | Sedang | baris 86 | 8 | `tests/modules/26-maintenance/maintenance.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP026-018 | JRN-APP026-008 | Tautan langsung tanpa sesi | Keamanan | Tinggi | baris 87 | 9 | `tests/modules/26-maintenance/not-automated.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP026-019 | JRN-APP026-008 | Tenant tanpa lisensi | Keamanan | Tinggi | baris 88-89 | 9 | `tests/modules/26-maintenance/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP026-020 | JRN-APP026-008 | Menulis tanpa privilege tulis | Keamanan | Tinggi | baris 90 | 9 | `tests/modules/26-maintenance/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |

## Jumlah

- otomatis (hanya membaca): 0
- otomatis (menyimpan data; butuh QA_ALLOW_WRITES): 15
- otomatis (rantai; butuh data dari aplikasi lain): 4
- fixme (terblokir atau menunggu prasyarat): 1
- skip (tidak diotomasi): 0
- test case dengan langkah "TBD" (dicek sebagian): 14
