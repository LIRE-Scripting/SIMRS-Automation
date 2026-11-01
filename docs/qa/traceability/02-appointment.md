# Keterlacakan: 02-appointment.xlsx

Dibangun oleh `npm run qa:inventory` dari `reference/02-appointment.xlsx`. Jangan diubah manual.

Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.

| TC ID | Journey ID | Skenario | Jenis | Prioritas | Baris Steps | Baris Journeys | Spec | User / cabang | Disposisi | Alasan |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP002-001 | JRN-APP002-001 | Pengaturan booking: jenis janji temu, kuota harian, dan jam buka | Positif | Tinggi | baris 2-7 | 2 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-002 | JRN-APP002-002 | Membuat janji temu dengan konsultan | Positif | Kritis | baris 8-13 | 3 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-003 | JRN-APP002-003 | Membuat janji temu dengan unit | Positif | Tinggi | baris 14-17 | 4 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-004 | JRN-APP002-004 | Daftar jadwal: rentang tanggal, halaman, dan pilihan | Positif | Tinggi | baris 18-23 | 5 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (hanya membaca) |  |
| TC-APP002-005 | JRN-APP002-005 | Kalender, kalender OPD, dan panel jam buka | Positif | Sedang | baris 24-28 | 6 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (hanya membaca) |  |
| TC-APP002-006 | JRN-APP002-006 | Menjadwal ulang janji temu | Positif | Tinggi | baris 29-32 | 7 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-007 | JRN-APP002-007 | Membatalkan janji temu | Positif | Tinggi | baris 33-36 | 8 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-008 | JRN-APP002-008 | Memblokir waktu konsultan | Positif | Tinggi | baris 37-40 | 9 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-009 | JRN-APP002-009 | Kuota harian habis | Negatif | Tinggi | baris 41-44 | 10 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-010 | JRN-APP002-010 | Dua booking di jam buka yang sama | Negatif | Tinggi | baris 45-47 | 11 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-011 | JRN-APP002-011 | Booking untuk hari yang sudah lewat | Batas | Tinggi | baris 48-49 | 12 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-012 | JRN-APP002-012 | Formulir booking yang belum lengkap | Negatif | Tinggi | baris 50-53 | 13 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-013 | JRN-APP002-013 | Penjadwalan ulang yang harus ditolak | Negatif | Tinggi | baris 54-56 | 14 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-014 | JRN-APP002-014 | Membatalkan tanpa konfirmasi atau alasan | Negatif | Tinggi | baris 57-59 | 15 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-015 | JRN-APP002-015 | Pengaturan booking yang tidak valid | Negatif | Tinggi | baris 60-63 | 16 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-016 | JRN-APP002-016 | Blokir yang salah atau harus dicabut | Negatif | Tinggi | baris 64-66 | 17 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-017 | JRN-APP002-017 | Siapa dan apa yang bisa dipilih saat booking | Negatif | Tinggi | baris 67-69 | 18 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-018 | JRN-APP002-018 | Rentang tanggal terlalu panjang atau terbalik | Batas | Sedang | baris 70-72 | 19 | `tests/modules/02-appointment/appointments.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-019 | JRN-APP002-019 | Menambah jenis rujukan | Positif | Sedang | baris 73-77 | 20 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-020 | JRN-APP002-019 | Kode atau nama sudah dipakai | Negatif | Sedang | baris 78 | 20 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-021 | JRN-APP002-019 | Kode atau nama kosong | Negatif | Sedang | baris 79-80 | 20 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-022 | JRN-APP002-020 | Jenis rujukan nonaktif tidak ditawarkan dan ditolak saat booking | Negatif | Tinggi | baris 81-83 | 21 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-023 | JRN-APP002-021 | Menambah jenis konsul silang | Positif | Sedang | baris 84-88 | 22 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-024 | JRN-APP002-021 | Kode atau nama sudah dipakai | Negatif | Sedang | baris 89 | 22 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-025 | JRN-APP002-021 | Kode atau nama kosong | Negatif | Sedang | baris 90-91 | 22 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-026 | JRN-APP002-022 | Jenis konsul silang nonaktif tidak ditawarkan dan ditolak saat booking | Negatif | Tinggi | baris 92-94 | 23 | `tests/modules/02-appointment/types.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-027 | JRN-APP002-023 | Layar /appointment terbuka | Regresi | Tinggi | baris 95 | 24 | `tests/modules/02-appointment/screens.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-028 | JRN-APP002-023 | Layar /appointment/cross-consult-types terbuka | Regresi | Sedang | baris 96 | 24 | `tests/modules/02-appointment/screens.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-029 | JRN-APP002-023 | Layar /appointment/referral-types terbuka | Regresi | Sedang | baris 97 | 24 | `tests/modules/02-appointment/screens.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-030 | JRN-APP002-023 | Layar /appointment/schedule terbuka | Regresi | Sedang | baris 98 | 24 | `tests/modules/02-appointment/screens.spec.ts` | U2 / Semua cabang | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-031 | JRN-APP002-024 | Tautan langsung tanpa sesi | Keamanan | Tinggi | baris 99 | 25 | `tests/modules/02-appointment/not-automated.spec.ts` | tanpa login / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) |  |
| TC-APP002-032 | JRN-APP002-024 | Tenant tanpa lisensi | Keamanan | Tinggi | baris 100-101 | 25 | `tests/modules/02-appointment/not-automated.spec.ts` | U1 / Podomoro | fixme (terblokir atau menunggu prasyarat) | blocker 4 – Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) / Butuh user U10 "Second tenant, tenant without a licence, platform superadmin" (00-prerequisites.xlsx \| Users \| baris 14: ditunda, butuh keputusan dan tenant kedua) |
| TC-APP002-033 | JRN-APP002-024 | Menulis tanpa privilege tulis | Keamanan | Tinggi | baris 102 | 25 | `tests/modules/02-appointment/not-automated.spec.ts` | U1 / Podomoro | otomatis (menyimpan data; butuh QA_ALLOW_WRITES) | TBD di langkah 1: hanya bagian yang tertulis yang dicek (Q8) |

## Jumlah

- otomatis (hanya membaca): 2
- otomatis (menyimpan data; butuh QA_ALLOW_WRITES): 30
- otomatis (rantai; butuh data dari aplikasi lain): 0
- fixme (terblokir atau menunggu prasyarat): 1
- skip (tidak diotomasi): 0
- test case dengan langkah "TBD" (dicek sebagian): 1
