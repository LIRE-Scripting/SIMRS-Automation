# Dokumen QA SIMRS (KlikMed HMIS)

Semua dokumen di folder ini berbahasa Indonesia. Kutipan dari workbook referensi (`reference/*.xlsx`) dan teks asli situs (pesan error, label tombol) tetap ditulis apa adanya.

## Mulai dari sini

| Dokumen | Isi | Untuk siapa |
|---|---|---|
| [ringkasan-hasil.md](ringkasan-hasil.md) | Angka terbaru (lulus, deviasi, terblokir, belum dijalankan), masalah utama, dan hasil per modul | Semua |
| [blocker.md](blocker.md) | Setiap blocker selain error server: **masalah**, dampak (test case dan rantai yang terhenti), **perbaikan**, penanggung jawab, dan hasil cek ulang di situs | Development, administrator situs, product owner |
| [deviations.md](deviations.md) | Setiap deviasi (langkah berjalan tetapi hasilnya beda dari referensi), dikelompokkan: **deviasi nyata** dengan saran perbaikan, **perlu keputusan** dengan keputusan yang dibutuhkan, dan **bisa dianggap lulus** dengan catatannya | Development, product owner |
| [blocker-best-practice.md](blocker-best-practice.md) | Blocker dibaca ulang sebagai arsitek HMIS dan klinisi: risiko pasien, praktik terbaik, rujukan alur HINAI, prioritas, dan keputusan yang dibutuhkan | Product owner, Development, tim klinis |
| [http-5xx.md](http-5xx.md) | Error server: jawaban HTTP 5xx yang masih terjadi, dan blocker yang penyebabnya error server (2, 3, 25, 27, 38, 41, 48, 53, 55; dipindah dari blocker.md pada 2026-11-06), dengan masalah dan perbaikannya | Development |

## Workbook hasil

| File | Isi |
|---|---|
| `reports/summary/simrs-run-summary.xlsx` | Ringkasan: sheet Ringkasan, Modul, Rantai E2E, Blocker (dengan kolom Cek ulang; tanpa blocker karena error server), Error 5xx (blocker karena error server, lalu jawaban HTTP 5xx di run ini), lalu **satu sheet per modul** (status, keterangan, tinjauan deviasi, tangkapan layar setiap test case) |
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
| [akun-uji.md](akun-uji.md) | Akun uji: best practice, akun yang dibutuhkan per role (prereq), hasil uji akun `rs.*`, pengecekan yang bisa dijalankan, dan permintaan ke admin situs (2026-11-09) |
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
