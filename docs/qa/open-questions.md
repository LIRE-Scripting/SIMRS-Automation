# Pertanyaan terbuka dan keputusan

Catatan keputusan pengujian (Q = pertanyaan, C = keputusan atas konflik, E = lingkungan). Nomor Q dirujuk di kode dan catatan test ("open question Q16"). Kondisi hasil terbaru ada di [ringkasan-hasil.md](ringkasan-hasil.md), masalah situs di [blocker.md](blocker.md), [deviations.md](deviations.md), dan [http-5xx.md](http-5xx.md).

Daftar per baris (langkah TBD, ketidaksesuaian, …): [_generated-open-items.md](_generated-open-items.md), dibangun ulang oleh `npm run qa:inventory`.

## Jawaban 2026-10-14 (sudah diterapkan)

| # | Pertanyaan | Jawaban | Penerapan |
|---|---|---|---|
| Q1 | Menyimpan data di situs bersama | "Don't save to Excel": hasil tidak pernah ditulis kembali ke workbook referensi. Menyimpan di situs: lihat Q1b. | `fixtures/e2e.ts`: test yang menyimpan data dilewati kecuali `QA_ALLOW_WRITES=1` |
| Q2 | Kredensial | Semua akun memakai satu kata sandi | `.env` → `QA_PASSWORD` (tidak masuk git; contoh di `.env.example`); kata sandi bawaan dihapus dari `lib/config.ts` |
| Q3 | User utama | U1 = `rs.admin2` | `tests/e2e/auth.setup.ts` membaca login dari 00-prerequisites \| Users ("Exists: …") |
| Q5 | Awalan nama | Pakai "QA-" | `lib/qa-data/names.ts`: "X Nama" → "QA-Nama", ditambah id run (data baru setiap run) |
| Q6 | Bahasa | Inggris. **Pembaruan 2026-10-28:** test berjalan di `/id` (bahasa Indonesia) lewat `lib/i18n`; laporan berbahasa Indonesia | Login di `/id/login?next=%2Fapps`; spec membuka `/id/...` |
| Q8 | TBD di Expected Result | Cek hanya bagian yang tertulis | `plan.partialSteps`; langkah mendapat anotasi `partial-expected` |
| Q12 | Blocker 5 / cabang | Sesuai Excel: Podomoro dan Semua cabang | Journey dengan cabang "All branches" atau user U2 → U2 (rs.admin, Semua cabang); selain itu U1 (Podomoro). Blocker 5 hanya membuat journey "All branches" menjadi fixme |
| C1 | 8 journey hanya ada di file 00 | Ikuti situs | Langkah ditulis dari layar situs, dirujuk ke `00-prerequisites.xlsx \| Journeys \| row n` |
| C2 | Expected bertentangan dengan situs | Ikuti situs | Bila situs berbeda dari Expected Result, pengecekan mengikuti situs dan test mencatat anotasi `deviation` yang mengutip teks Excel |
| Q1b | Menyimpan di situs | "yes boleh save ke site … data setiap save ke site atau run itu unique" | `QA_ALLOW_WRITES=1` di `.env`; setiap nilai yang disimpan memakai token baru (`qa.name`, `qa.token`, `qa.mrn`) |
| Q14a | Data master bersama modul 01 (DEP-1/2, DR-1/2, UNIT-1) | "a, buat sekali lalu reuse" | `lib/ambulatory-data.ts` `ensureMasterData()`: dicari atau dibuat sekali, dipakai ulang setiap run; pasien, booking, dan kedatangan tetap unik per run. Setiap test janji temu memakai hari-H sendiri (Senin yang masih kosong; penunjuk di `.qa-state/d-day.json`) |
| Q15 | Blocker | "cek 00-blockers-checklist-linked.xlsx, kalau termasuk blocker mark as blocker" | Blocker yang ditemukan saat otomasi dicatat di [blockers-found.md](blockers-found.md) (bernomor mulai 17); semua blocker dibahas di [blocker.md](blocker.md). Seluruh test case → fixme, satu langkah → anotasi `blocker` (`qa.blocked`) |
| Q16a | Workbook E2E | "make excel the template like reference for e2e" | `npm run qa:e2e-workbook`: `reports/e2e/<modul>.xlsx` = salinan workbook referensi dengan Steps → Execution Status / Actual Result / Defect Reference diisi dari run |
| Q9 | Suite lama | Migrasi dan sesuaikan | Per modul: spec dan page object lama dipindah ke `tests/modules/<NN-modul>/`, dipetakan lewat kolom Earlier ID; project lama dihapus setelah modulnya dimigrasi (2026-10-16: `tests/pharmacy`, `tests/flows`, `tests/suites` beserta data dan tooling-nya dihapus) |

## Masih terbuka atau dicatat

**Q4. Apakah pasien yang sudah ada di situs adalah data rekaan?** (`Set-up and data | row 6`). Sampai dipastikan, test hanya membaca atau mengecek pasien yang dibuatnya sendiri (nama QA-).

**Q7. Tag.** Diterapkan sesuai usulan: `@smoke` = Critical + Positive; `@regression` = semua; `@u1`… dari "Users needed".

**Q10. Automation Candidate = Needs Evaluation** (189 journey, lampiran F). **Pembaruan 2026-10-29:** diotomasi juga (keputusan user); `QA_NEEDS_EVALUATION=fixme` mengembalikannya ke fixme.

**Q11. User U3–U10 berstatus "Open".** **Pembaruan 2026-10-20:** akun U3–U8 dibuat (`qa.staff`, `qa.admin3`, `qa.approver`, `qa.kemayoran`, `qa.pegawai`, akun per peran); U9 (hak lisensi) dan U10 (tenant kedua) masih belum ada, lihat blocker 4.

**Q13. Langkah "Current behaviour"** (lampiran C, 4 langkah di 05 Farmasi): dengan C2, langkah ini mengecek perilaku situs dan mencatat deviasi.

**C3.** Teks UI yang dikutip workbook tetapi tidak ditemukan di situs (lampiran D): dicek di situs langsung (aturan C2).

**C4.** Journey berstatus Needs Review tetap diotomasi (tidak terbatas pada Ready).

**C5.** `00-blockers-checklist-linked.xlsx` dipakai sebagai sumber (blocker → alasan fixme).

**Q14. Nilai yang diminta situs tetapi tidak diberikan workbook** (data bersama 01). Diterapkan: kode departemen `QA-DEP-1`, `QA-DEP-2`; kode service center `QA-UNIT-1` (tanpa departemen); user `qa.dr1` "QA Dokter Satu" dan `qa.dr2` "QA Dokter Dua", e-mail `<login>@klikmed.local`, peran `dokter`, cabang Podomoro, kata sandi bersama; jam buka Senin DR-2 08:00–17:00 (baris bawaan situs).

**Q16. Test yang butuh jam tertentu atau hari kedua.** TC-APP001-058 (kedatangan 06:50 dan 07:05 WIB), TC-APP001-059 (kedatangan kemarin), TC-APP014-038 (06:30 dan 07:30), TC-APP015-039 (triase 4 menit setelah penerimaan), TC-APP001-055 (hari kerja). **Pembaruan 2026-11-01:** test ini dijalankan di run pagi terjadwal (`.qa-state/morning-run-*.sh`, `QA_MORNING=1`); TC-APP015-039 memakai waktu relatif dan lulus. Jam server tidak bisa disimulasikan dengan jam browser (hari situs berganti pukul 07:00 WIB = tengah malam UTC).

**Q17. Locale browser.** Awalnya `locale: 'en-US'`, sehingga daftar menampilkan "08:00 AM–08:30 AM". Test mengubahnya ke format 24 jam; tidak dihitung sebagai deviasi. Sejak 2026-10-28 situs dibuka dalam bahasa Indonesia.

**Q18. Hari-H pada DR-1 bersama (diubah 2026-10-15).** Situs hanya menerima booking paling lama satu tahun ke depan, jadi "satu Senin baru per test" cepat habis. Sekarang (`lib/ambulatory-data.ts`): setiap test janji temu membatalkan booking-nya sendiri di DEP-1/DEP-2 sesudahnya (booking yang dibatalkan tidak dihitung kuota), sebagian besar test memakai Senin pertama yang kosong, test kalender dan blokir memakai Senin yang belum pernah dipakai. Blokir tidak bisa dihapus di situs (TC-…-052), jadi setiap run 01 + 02 memakai sekitar empat Senin baru. Sisa booking run lama (hanya departemen QA) dibatalkan sekali pada 2026-10-15. Pertanyaan: apakah membatalkan booking test sendiri setelah setiap test bisa diterima, atau perlu fungsi hapus blokir / konsultan terpisah untuk test blokir?

**Diterapkan di 02 Janji Temu (2026-10-15).** TC-APP002-001 … 018 punya langkah yang sama persis dengan TC-APP001-011 … 054; keduanya menjalankan kode yang sama (`tests/modules/shared/appointment-cases.ts`) di `/appointment/schedule`, dan blocker 17 serta 18 mencantumkannya. Kode tipe "X-01"/"X-02" menjadi "QA-01-<token>"/"QA-02-<token>" (Q5), nama "X Tipe uji 01" → "QA-Tipe uji 01 <token>".

**Q19. Data 03 Pelayanan Pasien yang tidak diberikan workbook** (diterapkan):
- Formularium lengkap untuk obat yang hanya disebut labelnya ("Omeprazole 20mg Kapsul", "Ibuprofen 400mg Tablet", "Amlodipine 5mg Tablet", "Meropenem 1g Injection"): generik, kekuatan, dan bentuk dibaca dari label, sisanya dari order standar (`lib/clinical-data.ts`).
- PT-1 "dengan tanggal lahir": memakai tanggal PT-1 modul 01 (1990-05-17).
- TC-APP003-022 langkah 2 dan TC-APP003-040 langkah 2 meminta keluar (sign out): itu bisa mengakhiri sesi U1 yang dipakai test lain, jadi 022 login ulang di konteks browser baru dan 040 langkah 2 tidak dijalankan.
- TC-APP003-050 dan TC-APP004-061 butuh "Semua cabang": dijalankan sebagai U2 di dalam test.

**Q20. Pasokan bangsal 04 Rawat Inap (TC-APP004-044, 046, 047, 048)** butuh order rawat inap (03), store rawat inap/jalan (07), dan obat yang sudah diserahkan ke rawat inap (05). **Pembaruan 2026-11-01:** TC-APP004-046 dan 047 membuat datanya sendiri lewat alur farmasi; 047 terhenti di blocker 40 (picker "Stay").

**Q21. 06 Transfusi Darah.** Tidak ada kantong yang bisa dibuat siap pakai: kantong diberi nomor di Donor (blocker 2) dan dirilis user kedua. Setiap langkah yang butuh UNIT-1/UNIT-2/UNIT-F, kantong hasil pengambilan, atau unit yang sudah dikeluarkan berstatus Terblokir dengan blocker 2. Kekuatan reaksi untuk TC-APP006-072 (0 / 4) adalah asumsi. DEP-1 "QA Bangsal Dalam" dibuat sekali (kode QA-DEP-BB1).

**Q22. Store 07 Persediaan.** Store tidak bisa dibuat (blocker 26). Store seed Podomoro dipakai sebagai pengganti: FI01-00-00 "GUDANG FARMASI RUMAH SAKIT" untuk ST-1 / "X-ST1", FI01-01-01 "FARMASI REGULER" untuk "X-ST2"; setiap test mencatatnya. Langkah yang butuh store nonaktif atau store cabang BR-B terblokir. Pertanyaan: apakah memakai store seed ini bisa diterima, atau store perlu dibuat administrator lebih dulu?

**Q23. Data 05 Farmasi** (diterapkan):
- ST-OP dan ST-IP tidak bisa dibuat (blocker 26); store pengganti FI01-00-00 dipakai untuk keduanya. Langkah yang butuh store khusus satu jenis kunjungan terblokir.
- QA-PARA, QA-OMEP, QA-IBU, dan QA-AMLO dibuat sekali dengan nama persis seperti katalog dan dipakai ulang, karena order dari Pelayanan Pasien menyebut nama obat. Setiap test menerima batch-nya sendiri. Stok dicek sebagai penurunan total item.
- TC-APP005-032, 033, dan 049 butuh stok tepat; mereka memakai item khusus test (QA-PARA-<token>, QA-EXP-<token>, QA-FRZ-<token>).
- PT-3 "dirawat inap" adalah pasien terdaftar yang dirawat inap di modul 04 dengan bed baru.
- "Aturan BR-A" (margin 25%, pajak 11%, diskon baris maksimum 10%) dan "Counter settings BR-A" diatur di Fast Cashier sebelum test farmasi.

**Q24. Data 08 Kamar Operasi dan 09 Pengadaan** (diterapkan):
- 08: setiap permintaan memakai prosedur workbook ditambah token. Pasien permintaan berupa teks bebas ("QA-Pasien OT 01 <token>").
- 09: **Pembaruan 2026-11-01:** rantai persetujuan PO diatur menjadi empat langkah sesuai workbook (blocker 30 selesai; editor tidak punya peran per langkah). Order yang disetujui untuk Penerimaan dibuat di /procurement/requests dengan pemasok seed "PT Enseval". 25 order seed QA-PO- tidak ada di situs; TC-APP009-027 memakai order buatan test di Step 1 dan Step 4.

**Q25. Data 10 SDM** (diterapkan):
- Pegawai dibuat per test ("QA-EMP-001-<token>") dengan DEP-A "QA Poli Umum" (QA-DEP-1). Service center dan store pengganti: QA-UNIT-1 dan FI01-00-00.
- Jenis cuti "QA-Annual" dan "QA-Lama" (nonaktif) dibuat sekali dan dipakai ulang.
- Pengajuan cuti tidak punya kolom pegawai; pengajuan setiap test dicari lewat alasan yang memuat token.
- TC-APP010-028 langkah 4 tidak dijalankan: menautkan akun admin U1/U2 ke pegawai test akan mengubah akun sungguhan.
- Saldo tahunan (TC-APP010-047/048): ditolak "pending approval" (blocker 43).

**Q26. Data 11 Laboratorium dan 12 Radiologi** (diterapkan):
- 11: setiap order memakai jenis hasil workbook ditambah token; Sample workflow hanya menampilkan sepuluh order terbaru, jadi setiap test memakai order yang baru dibuatnya.
- 12: order memakai token di teks pemeriksaan, referensi, dan nomor accession. "Schedule and report" hanya menampilkan 20 order pertama (yang bertanggal dulu), jadi order test diberi tanggal besok 23:00.

**Q27. 14 Kasir & Tagihan** (diterapkan):
- "Counter settings BR-A" diatur sekali oleh test di Fast Cashier (pengaturan cabang).
- Id internal pasien test tidak tampil di layar; test membacanya dari jawaban pencarian pasien.
- Seorang kasir hanya bisa menutup hari sekali: TC-APP014-011 menutup kasir U1, sesudahnya test kasir tidak bisa berjalan sampai 07:00 WIB besok. **Pembaruan 2026-11-01:** TC-APP014-011 hanya dijalankan di run pagi (`QA_MORNING=1`), terpisah dari hari E2E-033.
- PT-BPJS tidak bisa dibuat (blocker 33).

**Q28. Data 16 Rekam Medis** (diterapkan): nomor dokumen dan pasien memakai token; permintaan berkas butuh "Request type" (jenis aktif pertama dipilih bila workbook tidak menyebut). Daftar Patient Records hanya berisi peminjaman; harapan workbook tentang register berkas, peminjam, tanggal kembali, pencarian, dan pengurutan dicatat sebagai deviasi.

**Q29. Data 17 Penggajian** (diterapkan): pegawai dibuat per test di SDM. Situs punya komponen GAPOK, POTBPJS, dan TUNJAB, bukan 12 komponen workbook (blocker 37). Dokter untuk honor dokter adalah pegawai test dengan rekam gaji pada akun "QA-6101". TC-APP017-045 mengunci bulan "2090-01" yang tidak dipakai test lain.

**Q30. Data dan keamanan 18 Pengaturan** (diterapkan):
- SITE-NEW "QA-SITE-01" dibuat sekali dan dipakai ulang (cabang tidak bisa dihapus). Departemen, service center, negara, kota, satuan, kode pajak, dan peran memakai token; departemen dan peran test dinonaktifkan di akhir test.
- Akun test ("qa.perawat1.<token>") mendapat kata sandi acak per run yang tidak dilaporkan, dan diblokir di akhir test.
- Tidak dijalankan karena akan mengunci administrator bersama: memblokir akun sendiri, mencabut peran admin, menonaktifkan dokter seed, menonaktifkan peran admin, mencabut hak memberi hak.
- Branding, warna, dan widget dasbor dikembalikan seperti semula di akhir test. Hari libur dibuat di hari Minggu tiga atau empat minggu ke depan dan dinonaktifkan di akhir.

**Q31. Data 19 Keuangan** (diterapkan):
- Akun memakai token dan dinonaktifkan di akhir test; aturan posting Podomoro dikembalikan seperti semula.
- FY-NEXT "QA-FY-NEXT" dibuat sekali dan dipakai ulang (tahun tidak bisa diubah atau dihapus); TC-APP019-021 langkah 4 mengunci FY-NEXT, bukan tahun berjalan.
- Konfigurasi Daan Mogot disimpan oleh TC-APP019-035. "Add user" tidak menambah baris.
- Jurnal, dokumen, dan pembayaran bertanggal hari ini tidak bisa disimpan karena tahun 2026 tidak punya periode (blocker 45), dan dokumen tidak bisa disetujui (blocker 46).

**Q32. Data 20 Anggaran** (diterapkan): buku, mata anggaran, jenis utilisasi, proyek, dan pertanyaan checklist memakai token. Baris anggaran butuh alokasi yang disetujui, yang tidak dimungkinkan set-up cabang (blocker 13); TC-APP020-042 terblokir olehnya.

**Q33. Data 21 Sterilisasi (CSSD)** (diterapkan): master (autoklaf, siklus, kemasan, indikator, nama uji, jenis hasil) memakai token. /cssd/issues/new gagal dimuat (blocker 3).

**Q34. Data 22 Layanan Jasa** (diterapkan): kategori, item, permintaan, dan order memakai token. Penerimaan jasa dan tagihan vendor tidak pernah tampil di daftar (blocker 11).

**Q35. Data 23 Tender & Kontrak** (diterapkan): master memakai token; tender memakai id internal PR yang disetujui di Pengadaan. Perjanjian tidak bisa disimpan (blocker 50).

**Q36. Data 24 Tata Graha** (diterapkan): lokasi, kontrak, catatan harian, dan tagihan memakai token; service center lokasi adalah QA-UNIT-1. Kontrak berlaku 2026-11-01 sampai 2027-10-31 sesuai workbook.

**Q37. Data 25 Linen** (diterapkan): cabang sudah menamai store linennya GLB / LDR / GST; "Save stores" dijalankan dengan nama itu. Item "X-SPREI" dan "X-KAIN" beserta stoknya tidak ada di Persediaan, jadi resep, perintah kerja, dan sirkulasi merujuk blocker checklist 14. Pertanyaan: apakah item ini perlu dibuat di 07, atau item seed SET-LINEN boleh dipakai?

**Q38. Data 26 Pemeliharaan** (diterapkan): kartu kerja, aset, kerusakan, order, indent, dan kontrak memakai token; kartu kerja dan aset memakai kode yang terurut paling awal (blocker 40). Tidak ada mata anggaran yang bersaldo, jadi penyelesaian order kerja, suku cadang, dan invoice tidak dijalankan.

**Q39. Data 27 Aset Tetap** (diterapkan): kategori, sub kategori, dan pembelian memakai token; sub kategori memakai akun aset test ("QA-1501-<token>"). Item "X-USG-01" tidak ada di Persediaan, jadi aset test tidak bisa dipasang; penyusutan, penjualan, penghapusan, dan mutasi merujuk blocker checklist 14.

**Q40. Rantai end-to-end sebagai test** (diterapkan 2026-10-16): setiap rantai di `lib/qa-data/e2e-chains.ts` adalah satu test di `tests/e2e/chains/` (fixture `fixtures/chain.ts`); `npm run qa:e2e-chains` mengisi `reports/e2e-chains/e2e-journeys.xlsx`. Rantai berjalan sampai langkah pertama yang terhenti blocker; langkah sesudahnya Terblokir dengan penyebab itu. Pilihan untuk rantai:
- Data diteruskan antarlangkah di E2E-001, 003-006, 013, 017, 018, 020, 022-027, 029, 046, 048: satu pasien, order, permintaan, bed, atau kontrak melewati semua langkah. Rantai lain menjalankan test case modul setiap langkah dengan datanya sendiri, sesuai urutan rantai.
- Urutan diubah bila sebuah langkah butuh data langkah berikutnya: E2E-018, E2E-029, E2E-046, E2E-027.
- Hanya langkah alur utama sebuah test case yang dipakai (misalnya TC-APP001-019 langkah 1, 2, 4 di E2E-020).
- Bila situs tidak bisa menghubungkan dua aplikasi, langkah memakai data yang dimungkinkan situs dan mencatatnya: order lab dan radiologi tidak membawa pasien; pasien terdaftar tidak bisa diterima di Pasien IGD (blocker 13), jadi kunjungan berupa walk-in.
- E2E-033 dijalankan terakhir karena menutup hari kasir U1 sampai 07:00 WIB besok.

## Lingkungan

- **E1 (selesai).** `node_modules` dipasang ulang dengan `npm ci`; `npm run typecheck` berjalan.
- **E2.** Belum ada konfigurasi ESLint; "lint" = `npm run typecheck`.
- **E3 (selesai).** Lapisan data: `exceljs` → JSON di `test-data/reference/`, divalidasi `zod` saat dimuat. `tsx` menjalankan skrip build.
- **E4 (selesai).** Situs bisa dijangkau; login U1 dan U2 diverifikasi 2026-10-14.
