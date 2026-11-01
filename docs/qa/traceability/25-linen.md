# Keterlacakan: 25-linen.xlsx

Dibangun oleh `npm run qa:inventory` dari `reference/25-linen.xlsx`. Jangan diubah manual.

Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.

| TC ID | Journey ID | Skenario | Jenis | Prioritas | Baris Steps | Baris Journeys | Spec | User / cabang | Disposisi | Alasan |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP025-001 | JRN-APP025-001 | Gudang dan resep: tiga gudang linen dan bahan barang jadi | Integrasi | Tinggi | baris 2-6 | 2 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-002 | JRN-APP025-001 | Gudang dan resep yang ditolak | Negatif | Tinggi | baris 7-11 | 2 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1, 2, 3, 4, 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-003 | JRN-APP025-001 | Menyimpan dengan "All branches" | Negatif | Tinggi | baris 12 | 2 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-004 | JRN-APP025-002 | Work order: membuat linen jadi, menerimanya, dan menagih kontraktor | Integrasi | Kritis | baris 13-19 | 3 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 7: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-005 | JRN-APP025-002 | Work order yang ditolak | Negatif | Kritis | baris 20-28 | 3 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6, 7, 8, 9: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-006 | JRN-APP025-002 | Work order yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 29-32 | 3 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-007 | JRN-APP025-002 | Menyimpan dengan "All branches" | Negatif | Kritis | baris 33 | 3 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-008 | JRN-APP025-003 | Sirkulasi: linen bersih ke bangsal, linen kotor ke laundry dan kembali | Integrasi | Kritis | baris 34-40 | 4 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP025-009 | JRN-APP025-003 | Perpindahan yang ditolak | Negatif | Kritis | baris 41-46 | 4 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5, 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-010 | JRN-APP025-003 | Perpindahan yang seharusnya ditolak atau dikonfirmasi | Negatif | Kritis | baris 47-50 | 4 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-011 | JRN-APP025-003 | Menyimpan dengan "All branches" | Negatif | Kritis | baris 51 | 4 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-012 | JRN-APP025-004 | Stok linen di Persediaan setelah satu putaran penuh | Integrasi | Tinggi | baris 52-56 | 5 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 4: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-013 | JRN-APP025-004 | Putaran yang terputus | Negatif | Tinggi | baris 57-58 | 5 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-014 | JRN-APP025-005 | Linen tanpa hak linen, dan apa yang dicatat | Keamanan | Tinggi | baris 59-63 | 6 | `tests/modules/25-linen/linen.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3, 4, 5: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP025-015 | JRN-APP025-006 | Layar /linen terbuka | Regresi | Tinggi | baris 64 | 7 | `tests/modules/25-linen/linen.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP025-016 | JRN-APP025-006 | Layar /linen/moves terbuka | Regresi | Sedang | baris 65 | 7 | `tests/modules/25-linen/linen.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP025-017 | JRN-APP025-006 | Layar /linen/orders terbuka | Regresi | Sedang | baris 66 | 7 | `tests/modules/25-linen/linen.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP025-018 | JRN-APP025-006 | Layar /linen/stores terbuka | Regresi | Sedang | baris 67 | 7 | `tests/modules/25-linen/linen.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP025-019 | JRN-APP025-007 | Tautan langsung tanpa sesi | Keamanan | Tinggi | baris 68 | 8 | `tests/modules/25-linen/not-automated.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP025-020 | JRN-APP025-007 | Tenant tanpa lisensi | Keamanan | Tinggi | baris 69-70 | 8 | `tests/modules/25-linen/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP025-021 | JRN-APP025-007 | Menulis tanpa privilege tulis | Keamanan | Tinggi | baris 71 | 8 | `tests/modules/25-linen/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |

## Jumlah

- otomatis (hanya membaca): 0
- otomatis (menyimpan data; butuh QA_ALLOW_WRITES): 17
- otomatis (rantai; butuh data dari aplikasi lain): 3
- fixme (terblokir atau menunggu prasyarat): 1
- skip (tidak diotomasi): 0
- test case dengan langkah "TBD" (dicek sebagian): 14
