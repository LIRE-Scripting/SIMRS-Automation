# Dokumen QA SIMRS (KlikMed HMIS)

Semua dokumen di folder ini berbahasa Indonesia. Kutipan dari workbook referensi (`reference/*.xlsx`) dan teks asli situs (pesan error, label tombol) tetap ditulis apa adanya.

## Mulai dari sini

| Dokumen | Isi | Untuk siapa |
|---|---|---|
| [ringkasan-hasil.md](ringkasan-hasil.md) | Angka terbaru (lulus, deviasi, terblokir, belum dijalankan), masalah utama, dan hasil per modul | Semua |
| [blocker.md](blocker.md) | Setiap blocker: **masalah**, dampak (test case dan rantai yang terhenti), **perbaikan**, penanggung jawab, dan hasil cek ulang di situs | Development, administrator situs, product owner |
| [deviations.md](deviations.md) | Setiap deviasi (langkah berjalan tetapi hasilnya beda dari referensi), dikelompokkan: **deviasi nyata** dengan saran perbaikan, **perlu keputusan** dengan keputusan yang dibutuhkan, dan **bisa dianggap lulus** dengan catatannya | Development, product owner |
| [http-5xx.md](http-5xx.md) | Error server (HTTP 5xx) yang masih terjadi, dengan masalah dan perbaikannya (yang sudah diperbaiki tidak dicantumkan) | Development |

## Workbook hasil

| File | Isi |
|---|---|
| `reports/summary/simrs-run-summary.xlsx` | Ringkasan: sheet Ringkasan, Modul, Rantai E2E, **satu sheet per modul** (status, keterangan, tinjauan deviasi, tangkapan layar setiap test case), Blocker (dengan kolom Cek ulang), HTTP 5xx |
| `reports/e2e/<NN-modul>.xlsx` | Salinan workbook referensi per modul dengan hasil setiap langkah (Execution Status, Actual Result, catatan otomasi) |
| `reports/e2e-chains/e2e-journeys.xlsx` | Hasil 50 rantai end-to-end per langkah |

## Arti status

| Status | Arti |
|---|---|
| Lulus | Setiap langkah memenuhi hasil yang diharapkan |
| Lulus (dengan catatan) | Semua perbedaannya dari referensi bisa diterima (hanya bentuk atau teks yang beda); dihitung Lulus |
| Deviasi | Berjalan sampai akhir, tetapi ada langkah yang hasilnya berbeda dari referensi (lihat deviations.md) |
| Gagal | Berhenti karena error yang tidak dikenal |
| Terblokir | Ada langkah yang tidak bisa dijalankan karena blocker (lihat blocker.md) |
| Belum dijalankan | Belum dijalankan (terikat jam atau hari kerja, dijadwalkan di run pagi) |

## Dokumen pendukung

| Dokumen | Isi |
|---|---|
| [open-questions.md](open-questions.md) | Keputusan dan pertanyaan terbuka (Q1–Q40) tentang data, user, dan cara pengujian |
| [prereq-users-and-blockers.md](prereq-users-and-blockers.md) | Hasil penyiapan user test (U1–U10) dan prasyarat pada 2026-10-20 |
| [blockers-found.md](blockers-found.md) | Blocker temuan otomasi (17 dan seterusnya) dalam bentuk usulan baris checklist |
| [test-inventory.md](test-inventory.md) | Inventaris file referensi, user, data uji, dan rencana per test case |
| [traceability/](traceability/) | Keterlacakan per modul: setiap test case dengan spec, user, disposisi, dan alasannya |
| [_generated-open-items.md](_generated-open-items.md) | Daftar per baris: langkah TBD, "Current behaviour", teks yang tidak ditemukan, dan lainnya |

## Cara membangun ulang

```bash
npm run qa:e2e-workbook && npm run qa:e2e-chains && npm run qa:run-summary
npm run qa:findings-md     # ringkasan-hasil, blocker, deviations, http-5xx
npm run qa:inventory       # test-inventory, traceability, blockers-found, _generated-open-items
```
