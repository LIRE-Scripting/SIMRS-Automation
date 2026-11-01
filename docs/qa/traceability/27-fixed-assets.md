# Keterlacakan: 27-fixed-assets.xlsx

Dibangun oleh `npm run qa:inventory` dari `reference/27-fixed-assets.xlsx`. Jangan diubah manual.

Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.

| TC ID | Journey ID | Skenario | Jenis | Prioritas | Baris Steps | Baris Journeys | Spec | User / cabang | Disposisi | Alasan |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP027-001 | JRN-APP027-001 | Klasifikasi: kategori, subkategori dengan akun asetnya, nonaktifkan | Integrasi | Tinggi | baris 2-7 | 2 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-002 | JRN-APP027-001 | Klasifikasi yang ditolak | Negatif | Tinggi | baris 8-13 | 2 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3, 4, 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-003 | JRN-APP027-002 | Register: membeli, memasang, dan mengoperasikan aset | Integrasi | Kritis | baris 14-19 | 3 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) |  |
| TC-APP027-004 | JRN-APP027-002 | Entri register yang ditolak | Negatif | Kritis | baris 20-27 | 3 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3, 4, 5, 6, 7, 8: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-005 | JRN-APP027-002 | Entri register yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 28-30 | 3 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-006 | JRN-APP027-003 | Penyusutan, penjualan, dan penghapusan, dibukukan di Finance | Integrasi | Kritis | baris 31-35 | 4 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-007 | JRN-APP027-003 | Entri yang ditolak | Negatif | Kritis | baris 36-40 | 4 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-008 | JRN-APP027-003 | Entri yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 41-46 | 4 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-009 | JRN-APP027-004 | Perpindahan: pindah, transfer, serahkan ke pemegang, kembali, gate pass, dan sewa | Positif | Tinggi | baris 47-53 | 5 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-010 | JRN-APP027-004 | Perpindahan yang ditolak | Negatif | Tinggi | baris 54-61 | 5 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6, 7, 8: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-011 | JRN-APP027-004 | Perpindahan yang seharusnya ditolak atau dikonfirmasi | Negatif | Tinggi | baris 62-64 | 5 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-012 | JRN-APP027-005 | Satu aset dari order pembelian sampai pelepasan, lintas aplikasi | Integrasi | Tinggi | baris 65-70 | 6 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 4, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-013 | JRN-APP027-006 | Aset tetap tanpa hak aset tetap, dan apa yang dicatat | Keamanan | Tinggi | baris 71-75 | 7 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP027-014 | JRN-APP027-007 | Layar /fixed-assets terbuka | Regresi | Tinggi | baris 76 | 8 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP027-015 | JRN-APP027-007 | Layar /fixed-assets/masters terbuka | Regresi | Sedang | baris 77 | 8 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP027-016 | JRN-APP027-007 | Layar /fixed-assets/moves terbuka | Regresi | Sedang | baris 78 | 8 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP027-017 | JRN-APP027-007 | Layar /fixed-assets/register terbuka | Regresi | Sedang | baris 79 | 8 | `tests/modules/27-fixed-assets/fixed-assets.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP027-018 | JRN-APP027-008 | Tautan langsung tanpa sesi | Keamanan | Tinggi | baris 80 | 9 | `tests/modules/27-fixed-assets/not-automated.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP027-019 | JRN-APP027-008 | Tenant tanpa lisensi | Keamanan | Tinggi | baris 81-82 | 9 | `tests/modules/27-fixed-assets/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP027-020 | JRN-APP027-008 | Menulis tanpa privilege tulis | Keamanan | Tinggi | baris 83 | 9 | `tests/modules/27-fixed-assets/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |

## Jumlah

- otomatis (hanya membaca): 0
- otomatis (menyimpan data; butuh QA_ALLOW_WRITES): 13
- otomatis (rantai; butuh data dari aplikasi lain): 6
- fixme (terblokir atau menunggu prasyarat): 1
- skip (tidak diotomasi): 0
- test case dengan langkah "TBD" (dicek sebagian): 13
