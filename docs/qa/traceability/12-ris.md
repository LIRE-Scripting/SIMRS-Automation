# Keterlacakan: 12-ris.xlsx

Dibangun oleh `npm run qa:inventory` dari `reference/12-ris.xlsx`. Jangan diubah manual.

Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.

| TC ID | Journey ID | Skenario | Jenis | Prioritas | Baris Steps | Baris Journeys | Spec | User / cabang | Disposisi | Alasan |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP012-001 | JRN-APP012-001 | Mendaftarkan order radiologi dengan semua detail | Positif | Kritis | baris 2-6 | 2 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-002 | JRN-APP012-002 | Mendaftarkan order hanya dengan pemeriksaannya | Positif | Tinggi | baris 7-8 | 3 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-003 | JRN-APP012-003 | Daftar order: urutan baris dan halaman | Positif | Tinggi | baris 9-11 | 4 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (hanya membaca) |  |
| TC-APP012-004 | JRN-APP012-004 | Radiografer yang bekerja di "All branches" | Positif | Tinggi | baris 12-16 | 5 | `tests/modules/12-ris/access.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-005 | JRN-APP012-005 | Jejak audit order radiologi | Positif | Tinggi | baris 17 | 6 | `tests/modules/12-ris/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-006 | JRN-APP012-006 | Hub, navigasi, dan bahasa Indonesia | Positif | Sedang | baris 18-20 | 7 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-007 | JRN-APP012-007 | Order radiologi tanpa pasien | Negatif | Kritis | baris 21-23 | 8 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-008 | JRN-APP012-008 | Permintaan pemeriksaan dari dokter | Negatif | Kritis | baris 24-26 | 9 | `tests/modules/12-ris/evaluation.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-009 | JRN-APP012-009 | Melengkapi atau mengoreksi order kemudian | Negatif | Kritis | baris 27-30 | 10 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-010 | JRN-APP012-010 | Status pemeriksaan dan jadwal modalitas | Negatif | Tinggi | baris 31-33 | 11 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-011 | JRN-APP012-011 | Formulir order di batasnya | Batas | Tinggi | baris 34-38 | 12 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-012 | JRN-APP012-012 | Tanggal yang tidak mungkin benar | Keamanan | Tinggi | baris 39-41 | 13 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-013 | JRN-APP012-013 | Waktu pemeriksaan yang tampil di daftar | Negatif | Tinggi | baris 42-43 | 14 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-014 | JRN-APP012-014 | Nomor referensi atau aksesi yang sama dua kali | Lainnya | Tinggi | baris 44-46 | 15 | `tests/modules/12-ris/evaluation.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-015 | JRN-APP012-015 | Mencari order | Negatif | Tinggi | baris 47-48 | 16 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-016 | JRN-APP012-016 | Tautan gambar dan laporan | Negatif | Tinggi | baris 49-51 | 17 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-017 | JRN-APP012-017 | Biaya pemeriksaan | Negatif | Kritis | baris 52-53 | 18 | `tests/modules/12-ris/evaluation.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-018 | JRN-APP012-018 | User tanpa hak radiologi | Keamanan | Kritis | baris 54-55 | 19 | `tests/modules/12-ris/access.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-019 | JRN-APP012-019 | User tanpa peran radiologi membaca order | Negatif | Tinggi | baris 56-57 | 20 | `tests/modules/12-ris/access.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-020 | JRN-APP012-020 | Order cabang lain | Keamanan | Kritis | baris 58-59 | 21 | `tests/modules/12-ris/access.spec.ts` | U1 / Dua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-021 | JRN-APP012-021 | Tenant tanpa lisensi RIS | Keamanan | Tinggi | baris 60-61 | 22 | `tests/modules/12-ris/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP012-022 | JRN-APP012-022 | Membuka order tanpa login | Negatif | Kritis | baris 62-64 | 23 | `tests/modules/12-ris/evaluation.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-023 | JRN-APP012-023 | Teks skrip di kolom isian | Negatif | Sedang | baris 65-66 | 24 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-024 | JRN-APP012-024 | Klik ganda, dua radiografer sekaligus, dan muat ulang | Lainnya | Sedang | baris 67-69 | 25 | `tests/modules/12-ris/evaluation.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-025 | JRN-APP012-025 | Jadwal dan laporan: menjadwalkan pemeriksaan, menerimanya, dan menyimpan laporan | Positif | Kritis | baris 70-75 | 26 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 6: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP012-026 | JRN-APP012-025 | Aksi tanpa input yang dibutuhkan | Negatif | Kritis | baris 76-78 | 26 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1, 2, 3: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP012-027 | JRN-APP012-026 | Jadwal dan laporan: membatalkan pemeriksaan | Positif | Tinggi | baris 79-80 | 27 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 2: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP012-028 | JRN-APP012-026 | Batal tanpa alasan | Negatif | Tinggi | baris 81 | 27 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP012-029 | JRN-APP012-027 | Order radiologi dari konsultasi sampai di RIS | Integrasi | Kritis | baris 82-84 | 28 | `tests/modules/12-ris/ris.spec.ts` | U1 / Podomoro | otomatis (rantai; butuh data dari aplikasi lain) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |
| TC-APP012-030 | JRN-APP012-028 | Layar /radiology terbuka | Regresi | Tinggi | baris 85 | 29 | `tests/modules/12-ris/ris.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-031 | JRN-APP012-028 | Layar /radiology/orders terbuka | Regresi | Sedang | baris 86 | 29 | `tests/modules/12-ris/ris.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-032 | JRN-APP012-028 | Layar /radiology/studies terbuka | Regresi | Sedang | baris 87 | 29 | `tests/modules/12-ris/ris.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-033 | JRN-APP012-029 | Tautan langsung tanpa sesi | Keamanan | Tinggi | baris 88 | 30 | `tests/modules/12-ris/not-automated.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP012-034 | JRN-APP012-029 | Tenant tanpa lisensi | Keamanan | Tinggi | baris 89-90 | 30 | `tests/modules/12-ris/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP012-035 | JRN-APP012-029 | Menulis tanpa privilege tulis | Keamanan | Tinggi | baris 91 | 30 | `tests/modules/12-ris/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |

## Jumlah

- otomatis (hanya membaca): 1
- otomatis (menyimpan data; butuh QA_ALLOW_WRITES): 31
- otomatis (rantai; butuh data dari aplikasi lain): 1
- fixme (terblokir atau menunggu prasyarat): 2
- skip (tidak diotomasi): 0
- test case dengan langkah "TBD" (dicek sebagian): 6
