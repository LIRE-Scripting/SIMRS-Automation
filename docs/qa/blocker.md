# Blocker: masalah yang menghentikan pengujian

Dibangun 2026-11-09 10:41 WIB dari `reports/summary/run-summary.json` (hasil terbaru setiap test case dan rantai). Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

Blocker = masalah di situs (atau data/set-up yang belum ada) yang membuat sebuah langkah **tidak bisa dijalankan sama sekali**. Langkah itu dan langkah sesudahnya berstatus **Terblokir**, tidak dihitung lulus maupun gagal. Perbedaan hasil pada langkah yang bisa dijalankan ada di [deviations.md](deviations.md); error server ada di [http-5xx.md](http-5xx.md).

Saat ini **33 blocker** masih menghentikan **273 test case**; 15 blocker lainnya sudah selesai atau tidak lagi menghentikan test.

Blocker yang penyebabnya **error server** (2, 3, 25, 27, 38, 41, 48, 53, 55) dipindah ke [http-5xx.md](http-5xx.md#error-server-yang-menghentikan-test) (keputusan 2026-11-06); test case-nya tetap berstatus Terblokir.

Semua test berjalan sebagai U1 di cabang **Podomoro** (cabang dengan data terlengkap), kecuali yang memang diminta workbook di konteks lain: "Semua cabang" (U2), Kemayoran (U6), atau level tenant. Kolom **Cabang** menyebut di mana blocker itu terlihat.

Kolom **Jenis** menunjukkan siapa yang harus bergerak: **Bug situs** (fiturnya ada tetapi gagal; Development), **Fitur belum ada** (situs belum punya fiturnya; product owner memutuskan, lalu Development), atau **Set-up & data uji** (data, akun, atau konfigurasi yang belum ada di situs bersama; administrator situs atau tester).

Blocker 1–16 berasal dari checklist `reference/00-blockers-checklist-linked.xlsx`; blocker 17 dan seterusnya ditemukan oleh otomasi. Kolom **Cek ulang** menyebut kapan dan bagaimana blocker terakhir diperiksa di situs (pengawas blocker `tests/modules/00-access/blocker-watch.spec.ts` berjalan di setiap run).

## Ringkasan blocker yang masih aktif

| No | Blocker | Jenis | Cabang | Test case | Rantai | Modul | Penanggung jawab |
|---:|---|---|---|---:|---|---|---|
| [4](#blocker-4) | Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) | Set-up & data uji | Level tenant (semua cabang) | 50 |  | 01 Rawat Jalan, 02 Janji Temu, 03 Pelayanan Pasien, 04 Rawat Inap, 05 Farmasi, 06 Transfusi Darah, 07 Persediaan, 08 Kamar Operasi, 09 Pengadaan, 10 SDM, 11 Laboratorium, 12 Radiologi (RIS), 13 Diet, 14 Kasir & Tagihan, 15 IGD, 16 Rekam Medis (MRD), 17 Penggajian, 18 Pengaturan, 19 Keuangan, 20 Anggaran, 21 Sterilisasi (CSSD), 22 Layanan Jasa, 23 Tender & Kontrak, 24 Tata Graha, 25 Linen, 26 Pemeliharaan, 27 Aset Tetap | Development; peminta untuk akunnya |
| [13](#blocker-13) | Set-up cabang belum ada | Set-up & data uji | Podomoro; konfigurasi IGD juga tidak ada di cabang lain | 28 | E2E-001, E2E-005, E2E-015 | 05 Farmasi, 15 IGD, 19 Keuangan, 21 Sterilisasi (CSSD) | Tester, dengan persetujuan blocker 15 |
| [5](#blocker-5) | 28 daftar tidak termuat dengan "Semua cabang" | Bug situs | Semua cabang (U2) | 29 |  | 06 Transfusi Darah, 07 Persediaan, 09 Pengadaan, 10 SDM, 14 Kasir & Tagihan, 17 Penggajian, 22 Layanan Jasa, 23 Tender & Kontrak | Development; tester untuk solusi sementara |
| [40](#blocker-40) | Picker dan daftar hanya menjangkau data awal: data di luarnya tidak bisa dipilih atau ditemukan | Bug situs | Podomoro | 21 | E2E-003, E2E-010, E2E-012, E2E-014, E2E-027, E2E-032, E2E-039, E2E-044 | 01 Rawat Jalan, 02 Janji Temu, 04 Rawat Inap, 05 Farmasi, 10 SDM, 12 Radiologi (RIS), 17 Penggajian, 19 Keuangan, 24 Tata Graha, 26 Pemeliharaan | Development |
| [10](#blocker-10) | Item yang disimpan tidak tampil di daftar mana pun | Bug situs | Podomoro | 14 |  | 17 Penggajian | Development |
| [23](#blocker-23) | Ward care tidak menampilkan pasien rawat inap cabang | Bug situs | Podomoro | 12 | E2E-004 | 04 Rawat Inap | Development |
| [45](#blocker-45) | Tahun buku 2026 tidak punya periode, dan periodenya tidak bisa dibuat lewat layar: jurnal, voucher, atau pembayaran bertanggal hari ini tidak bisa disimpan | Fitur belum ada | Podomoro | 12 |  | 19 Keuangan | Development |
| [46](#blocker-46) | Tidak ada user yang bisa menyetujui dokumen keuangan: "Approve" menjawab "missing required privilege" (tenant tidak punya FINANCE_APPROVE) | Set-up & data uji | Podomoro | 11 |  | 19 Keuangan, 20 Anggaran | Development, lalu administrator site |
| [8](#blocker-8) | Order diet tidak pernah sampai ke Dapur atau Layanan dan tagihan | Fitur belum ada | Podomoro | 8 | E2E-045 | 13 Diet | Product owner, lalu Development |
| [17](#blocker-17) | Pengaturan buku: baris kuota atau jam buka tidak bisa diubah ke "Unit" | Bug situs | Podomoro | 9 |  | 01 Rawat Jalan, 02 Janji Temu | Development |
| [11](#blocker-11) | Penerimaan layanan dan tagihan vendor tidak pernah tampil di daftar | Bug situs | Podomoro | 7 |  | 22 Layanan Jasa | Development |
| [24](#blocker-24) | Tipe rujukan dan tipe konsul silang hanya menampilkan baris awal, tanpa halaman atau pencarian | Bug situs | Podomoro | 6 | E2E-020 | 02 Janji Temu | Development |
| [36](#blocker-36) | Buku besar pasien tidak bisa menampilkan invoice pilihan: "Cari pasien" kosong, daftar hanya 22 invoice | Bug situs | Podomoro | 7 |  | 14 Kasir & Tagihan | Development |
| [22](#blocker-22) | Pasangan interaksi obat dari data bersama tidak ada di situs | Fitur belum ada | Podomoro | 5 | E2E-021 | 03 Pelayanan Pasien, 05 Farmasi | Administrator site, lalu tester |
| [31](#blocker-31) | Penerimaan barang, faktur pemasok, dan retur tidak bisa disimpan: "grn" menjawab "receive at the gate first" setelah gate tersimpan | Bug situs | Podomoro | 5 | E2E-008 | 07 Persediaan, 09 Pengadaan | Development |
| [50](#blocker-50) | Perjanjian sourcing tidak bisa disimpan: "accept a bidder on the sheet first" untuk tender yang pemenangnya sudah diterima | Bug situs | Podomoro | 4 | E2E-009, E2E-043 | 23 Tender & Kontrak | Development |
| [12](#blocker-12) | Pencarian terminologi tidak menemukan kode | Set-up & data uji | Podomoro | 5 |  | 03 Pelayanan Pasien | Administrator site |
| [33](#blocker-33) | Pasien asuransi PT-BPJS tidak ada di situs dan tidak ada layar untuk menyiapkannya | Fitur belum ada | Podomoro | 5 |  | 14 Kasir & Tagihan | Administrator site (pemuatan data) |
| [43](#blocker-43) | Saldo cuti tahunan tidak bisa disimpan di HR desk: "Year balance" menjawab "pending approval" | Bug situs | Podomoro | 4 | E2E-040 | 10 SDM | Development |
| [47](#blocker-47) | Penyerahan obat dengan diskon baris di atas maksimum tidak bisa menunggu kasir: "chain not found: billingdiscount" | Fitur belum ada | Podomoro | 5 |  | 05 Farmasi, 14 Kasir & Tagihan | Development |
| [6](#blocker-6) | "Record code" tidak bisa disimpan dengan "Semua cabang" | Bug situs | Semua cabang (U2) | 4 |  | 16 Rekam Medis (MRD) | Development |
| [7](#blocker-7) | "Hitung jasa" tidak pernah berhasil | Bug situs | Podomoro | 3 | E2E-038 | 10 SDM | Development |
| [9](#blocker-9) | Kunjungan IGD yang sudah ditutup tidak bisa diterima lagi; "Tandai hidup" tidak bisa dicapai | Fitur belum ada | Podomoro | 4 |  | 15 IGD | Product owner, lalu Development |
| [29](#blocker-29) | Penyerahan obat dari order tidak bisa mengubah Diserahkan, Diminta, atau Generik | Fitur belum ada | Podomoro | 3 |  | 05 Farmasi | Development |
| [37](#blocker-37) | 12 komponen gaji dari workbook tidak ada di situs, dan tidak ada layar untuk membuatnya | Fitur belum ada | Podomoro | 3 |  | 17 Penggajian | Development / Product owner |
| [42](#blocker-42) | Uang muka (imprest) tidak bisa diajukan: kelayakan imprest cabang tidak bisa diatur | Bug situs | Podomoro | 2 | E2E-042 | 19 Keuangan | Administrator site, lalu Development |
| [51](#blocker-51) | Daftar lama menampilkan data baru: item baru di Master Item, dan baris penyerahan baru di Issue Lines farmasi | Bug situs | Podomoro | 1 | E2E-008, E2E-035 | 05 Farmasi | Development |
| [26](#blocker-26) | Gudang tidak bisa dibuat di situs (Gudang tidak punya tombol "Tambah") | Fitur belum ada | Podomoro | 2 |  | 05 Farmasi, 07 Persediaan | Development; administrator site untuk gudangnya |
| [34](#blocker-34) | Diskon di atas batas kasir tidak bisa menunggu persetujuan: rantai persetujuan diskon billing belum diatur | Fitur belum ada | Podomoro | 2 |  | 14 Kasir & Tagihan | Development (prosesnya), lalu administrator site (langkahnya) |
| [56](#blocker-56) | "Bayar" saat tidak ada lagi yang ditagih gagal dengan error database | Bug situs | Podomoro | 2 |  | 14 Kasir & Tagihan | Development |
| [19](#blocker-19) | Pasien tidak bisa ditandai meninggal | Fitur belum ada | Podomoro | 1 |  | 01 Rawat Jalan | Product owner, lalu Development |
| [20](#blocker-20) | Pasien terdaftar tidak bisa diubah | Fitur belum ada | Podomoro | 1 |  | 01 Rawat Jalan | Product owner, lalu Development |
| [21](#blocker-21) | Order obat yang sudah dibuat tidak bisa dibatalkan atau dikoreksi | Fitur belum ada | Podomoro | 1 |  | 03 Pelayanan Pasien | Product owner, lalu Development |

## Rincian blocker yang masih aktif

### Blocker 4

**Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500)**

- **Jenis:** Set-up & data uji
- **Cabang:** Level tenant (semua cabang)
- **Masalah:** Halaman Tenant dan Entitlement membutuhkan hak LICENSING_WRITE yang tidak dimiliki administrator rumah sakit, dan halaman tidak menangani penolakan itu ("missing required privilege"). Akibatnya tidak ada tenant tanpa lisensi yang bisa dibuat atau dijangkau, sehingga semua kasus "tenant tanpa lisensi" tidak bisa diuji.
- **Dampak:** 50 test case terhenti (01 Rawat Jalan, 02 Janji Temu, 03 Pelayanan Pasien, 04 Rawat Inap, 05 Farmasi, 06 Transfusi Darah, 07 Persediaan, 08 Kamar Operasi, 09 Pengadaan, 10 SDM, 11 Laboratorium, 12 Radiologi (RIS), 13 Diet, 14 Kasir & Tagihan, 15 IGD, 16 Rekam Medis (MRD), 17 Penggajian, 18 Pengaturan, 19 Keuangan, 20 Anggaran, 21 Sterilisasi (CSSD), 22 Layanan Jasa, 23 Tender & Kontrak, 24 Tata Graha, 25 Linen, 26 Pemeliharaan, 27 Aset Tetap).
- **Perbaikan:** Fungsi: sembunyikan tautan untuk user tanpa hak, atau tampilkan "no access" alih-alih halaman error. Data: akun dengan LICENSING_WRITE untuk menguji kedua layar.
- **Penanggung jawab:** Development; peminta untuk akunnya
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): missing required privilege / missing required privilege
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 8
- **Test case terhenti:** TC-APP001-064, TC-APP001-088, TC-APP002-032, TC-APP003-038, TC-APP003-062, TC-APP004-052, TC-APP004-089, TC-APP005-047, TC-APP005-048, TC-APP005-077, TC-APP006-066, TC-APP006-079, TC-APP007-035, TC-APP007-063, TC-APP008-021, TC-APP008-052, TC-APP009-033, TC-APP009-061, TC-APP010-036, TC-APP010-063, TC-APP011-027, TC-APP011-053, TC-APP012-021, TC-APP012-034, TC-APP013-030, TC-APP013-061, TC-APP014-050, TC-APP014-073, TC-APP014-080, TC-APP015-021, TC-APP015-068, TC-APP016-025, TC-APP016-048, TC-APP017-024, TC-APP017-062, TC-APP018-001, TC-APP018-027, TC-APP018-059, TC-APP018-062, TC-APP018-088 … (+10)

### Blocker 5

**28 daftar tidak termuat dengan "Semua cabang"**

- **Jenis:** Bug situs
- **Cabang:** Semua cabang (U2)
- **Masalah:** Sesi dimulai dengan "Semua cabang", padahal server butuh satu cabang untuk 28 daftar dan layar itu tidak punya isian cabang. Daftarnya tampil kosong tanpa pesan, seolah tidak ada data (sampai 2026-10-30 dengan HTTP 500).
- **Dampak:** 29 test case terhenti (06 Transfusi Darah, 07 Persediaan, 09 Pengadaan, 10 SDM, 14 Kasir & Tagihan, 17 Penggajian, 22 Layanan Jasa, 23 Tender & Kontrak).
- **Perbaikan:** 1. Putuskan: layar meminta cabang, atau daftar dimuat untuk semua cabang. 2. Di kedua kasus, tampilkan pesan, bukan HTTP 500 dan tabel kosong. 3. Jalankan lagi delapan alur yang dipertahankan dengan "All branches". Solusi sementara: pilih satu cabang di header (ke-28 daftar termuat dengan Podomoro).
- **Penanggung jawab:** Development; tester untuk solusi sementara
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): 9 of 12 lists empty with All branches: /hr/desk/attendance, /hr/desk/fee, /billing/plans, /billing/ledger, /services/req
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 9
- **Test case terhenti:** TC-APP006-081, TC-APP007-065, TC-APP007-066, TC-APP007-067, TC-APP009-063, TC-APP009-064, TC-APP009-065, TC-APP010-065, TC-APP010-066, TC-APP010-067, TC-APP010-068, TC-APP014-018, TC-APP014-082, TC-APP014-083, TC-APP014-084, TC-APP014-085, TC-APP017-064, TC-APP017-065, TC-APP017-066, TC-APP017-067, TC-APP017-068, TC-APP017-069, TC-APP022-034, TC-APP022-035, TC-APP022-036, TC-APP023-031, TC-APP023-032, TC-APP023-033, TC-APP023-034

### Blocker 6

**"Record code" tidak bisa disimpan dengan "Semua cabang"**

- **Jenis:** Bug situs
- **Cabang:** Semua cabang (U2)
- **Masalah:** "Catat kode" di layar Pulang tanpa kode diagnosis butuh satu cabang, tetapi layarnya tidak punya pilihan cabang; dengan "Semua cabang" ditolak ("The code could not be recorded"). Kode juga disimpan apa adanya tanpa dicek ke katalog diagnosis.
- **Dampak:** 4 test case terhenti (16 Rekam Medis (MRD)).
- **Perbaikan:** 1. Seperti blocker 5: minta cabang atau pakai cabang rawat inapnya. 2. Putuskan apakah kode harus ada di katalog diagnosis. Solusi sementara: pilih satu cabang di header.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): a diagnosis code and a branch are required
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 10
- **Test case terhenti:** TC-APP016-036, TC-APP016-037, TC-APP016-038, TC-APP016-039

### Blocker 7

**"Hitung jasa" tidak pernah berhasil**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** "Hitung jasa" di HR selalu ditolak: server meminta sebuah nomor yang tidak pernah dikirim oleh dialognya ("number and amount are required").
- **Dampak:** 3 test case dan rantai E2E-038 terhenti (10 SDM).
- **Perbaikan:** Kirim nomor dari dialog, atau hapus syarat itu di server. Lalu jalankan JRN-APP010-045.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): number and amount are required
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 11
- **Test case terhenti:** E2E-038, TC-APP010-052, TC-APP010-053, TC-APP010-054

### Blocker 8

**Order diet tidak pernah sampai ke Dapur atau Layanan dan tagihan**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Dapur dan Saji & tagihan hanya membaca makan terlambat. Order diet biasa seorang pasien tidak pernah sampai ke kedua layar itu.
- **Dampak:** 8 test case dan rantai E2E-045 terhenti (13 Diet).
- **Perbaikan:** 1. Putuskan apakah order diet harus muncul di dapur dan di tagihan. 2. Kalau ya: tambahkan. Kalau tidak: tulis ulang JRN-APP013-039 khusus untuk makanan terlambat.
- **Penanggung jawab:** Product owner, lalu Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): Kitchen: Dapur Siti Aminah pagi waiting Setujui Makan terlambat Batalkan makan
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 12
- **Test case terhenti:** E2E-045, TC-APP013-044, TC-APP013-045, TC-APP013-046, TC-APP013-047, TC-APP013-048, TC-APP013-049, TC-APP013-050, TC-APP013-051

### Blocker 9

**Kunjungan IGD yang sudah ditutup tidak bisa diterima lagi; "Tandai hidup" tidak bisa dicapai**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Server menolak menerima lagi pasien yang kunjungan IGD sebelumnya sudah ditutup (hanya registrasi baru yang bisa, dan itu membuat rekam pasien kedua). Registrasi "Datang meninggal" langsung menutup kunjungan, dan baris yang ditutup tidak punya tombol, jadi "Tandai hidup" tidak bisa dijangkau.
- **Dampak:** 4 test case terhenti (15 IGD).
- **Perbaikan:** a) Putuskan bagaimana pasien yang sudah dikenal datang lagi; izinkan encounter baru untuk record yang sama. b) Tawarkan "Mark as alive" pada baris tertutup pasien yang datang sudah meninggal.
- **Penanggung jawab:** Product owner, lalu Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): QA-Pasien Walk-in MW8PIFT5001: discharged, not offered by Registration
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 13
- **Test case terhenti:** TC-APP015-030, TC-APP015-046, TC-APP015-047, TC-APP015-048

### Blocker 10

**Item yang disimpan tidak tampil di daftar mana pun**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Data Penggajian yang disimpan (tahun, rekam gaji, input massal, deklarasi pajak, jenis reimburse) tidak ditampilkan di layar mana pun, jadi penguji tidak bisa memastikan penyimpanan berhasil.
- **Dampak:** 14 test case terhenti (17 Penggajian).
- **Perbaikan:** Tambahkan daftar untuk kelima jenis record, atau tampilkan di layarnya setelah disimpan.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): Tax lists: Deklarasi pajak Deklarasi pajak Status Uraian Kode EMP-WULAN emi 500000.00 e6c78b0b-a581-52b1-87df-8
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 14
- **Test case terhenti:** TC-APP017-028, TC-APP017-029, TC-APP017-030, TC-APP017-031, TC-APP017-032, TC-APP017-033, TC-APP017-034, TC-APP017-035, TC-APP017-036, TC-APP017-037, TC-APP017-038, TC-APP017-048, TC-APP017-049, TC-APP017-050

### Blocker 11

**Penerimaan layanan dan tagihan vendor tidak pernah tampil di daftar**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Layar Penerimaan jasa dan Tagihan vendor selalu kosong: daftar dikosongkan di kode dan server tidak punya rute untuk membacanya. Id penerimaan yang dibutuhkan "Setujui penerimaan" tidak bisa dibaca di mana pun.
- **Dampak:** 7 test case terhenti (22 Layanan Jasa).
- **Perbaikan:** Tambahkan route dan daftar untuk penerimaan dan tagihan, dengan id setiap baris. Setelah itu alur end-to-end JRN-APP022-008 bisa dijalankan.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): Penerimaan jasa Penerimaan jasa tidak menambah stok. Terima  / Tagihan vendor Tagih Status Uraian Kode Belum ada data. T
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 15
- **Test case terhenti:** TC-APP022-015, TC-APP022-016, TC-APP022-017, TC-APP022-018, TC-APP022-019, TC-APP022-020, TC-APP022-021

### Blocker 12

**Pencarian terminologi tidak menemukan kode**

- **Jenis:** Set-up & data uji
- **Cabang:** Podomoro
- **Masalah:** Pencarian Terminologi tidak menemukan satu kode pun (I10, J06.9, "hipertensi"): tampaknya belum ada versi kode diagnosis yang aktif, dan tidak ada layar untuk mengimpor atau mengaktifkannya.
- **Dampak:** 5 test case terhenti (03 Pelayanan Pasien).
- **Perbaikan:** Impor dan aktifkan versi kode diagnosis di site (API atau seed; tidak ada layar untuk itu). Lalu jalankan lagi JRN-APP003-047.
- **Penanggung jawab:** Administrator site
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): I10: Hasil Tidak ada kode yang cocok. Antrean koding Tidak ada ra
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 16
- **Test case terhenti:** TC-APP003-042, TC-APP003-043, TC-APP003-044, TC-APP003-045, TC-APP003-056

### Blocker 13

**Set-up cabang belum ada**

- **Jenis:** Set-up & data uji
- **Cabang:** Podomoro; konfigurasi IGD juga tidak ada di cabang lain
- **Masalah:** Set-up cabang belum lengkap. Yang masih kurang: konfigurasi registrasi IGD (tipe 6 dan 7) di semua cabang, tanpa layar untuk membuatnya; dan periode tahun buku 2026 untuk tutup tahun serta penerimaan pasien di Keuangan (blocker 45). Sudah dibuka 2026-11-01 oleh tester: Anggaran (alokasi bisa disetujui dan diposting; aturan posting "Pencairan dana" dan "Penarikan dana" Podomoro disimpan dengan akun uji QA), uji Bowie Dick CSSD (disimpan setiap hari untuk autoklaf bawaan), daftar Reorder Podomoro, dan Punch untuk user yang tertaut ke pegawai.
- **Dampak:** 28 test case dan rantai E2E-001, E2E-005, E2E-015 terhenti (05 Farmasi, 15 IGD, 19 Keuangan, 21 Sterilisasi (CSSD)).
- **Perbaikan:** 09: item di bawah stok minimum di cabang. 10: "Link me" di My profile untuk user uji. 15 dan 19: buka lagi dengan satu cabang dipilih; kalau masih tidak ada, tambahkan konfigurasi untuk cabang itu. 20: Budget posting rule yang bisa dipakai di Finance untuk cabang, dan penyetuju untuk setiap rantai. 21: uji Bowie Dick yang lulus untuk autoklaf; KIT dan KITS di Persediaan.
- **Penanggung jawab:** Tester, dengan persetujuan blocker 15
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): Podomoro belum punya konfigurasi registrasi untuk tipe 7.
- **Sumber:** 00-blockers-checklist-linked.xlsx baris 17
- **Test case terhenti:** E2E-001, E2E-005, E2E-015, TC-APP005-039, TC-APP005-040, TC-APP015-027, TC-APP015-028, TC-APP015-029, TC-APP015-030, TC-APP015-031, TC-APP015-032, TC-APP015-034, TC-APP015-037, TC-APP015-040, TC-APP015-041, TC-APP015-042, TC-APP015-052, TC-APP015-053, TC-APP015-056, TC-APP015-057, TC-APP019-010, TC-APP019-058, TC-APP019-059, TC-APP019-060, TC-APP019-061, TC-APP019-080, TC-APP019-081, TC-APP019-082, TC-APP021-005, TC-APP021-006, TC-APP021-007

### Blocker 17

**Pengaturan buku: baris kuota atau jam buka tidak bisa diubah ke "Unit"**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Di Pengaturan buku, baris kuota atau jam buka tidak bisa diubah ke "Unit" (tetap "Konsultan"), sehingga unit tidak pernah mendapat kuota atau jam buka dan tidak pernah bisa dibooking.
- **Dampak:** 9 test case terhenti (01 Rawat Jalan, 02 Janji Temu).
- **Perbaikan:** 1. Perbaiki daftar jenis pada baris kuota dan jam buka. 2. Jalankan lagi TC-APP001-011, 013, 018, 044, 049 dan TC-APP002-001, 003, 008, 013.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP001-011, TC-APP001-013, TC-APP001-018, TC-APP001-044, TC-APP001-049, TC-APP002-001, TC-APP002-003, TC-APP002-008, TC-APP002-013

### Blocker 19

**Pasien tidak bisa ditandai meninggal**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Di Pasien terdaftar tidak ada cara mencatat kematian pasien, jadi prekondisi "pasien meninggal" tidak bisa dibuat.
- **Dampak:** 1 test case terhenti (01 Rawat Jalan).
- **Perbaikan:** 1. Sebutkan layar yang mencatat kematian (modul lain?), atau tambahkan. 2. Jalankan lagi TC-APP001-076.
- **Penanggung jawab:** Product owner, lalu Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP001-076

### Blocker 20

**Pasien terdaftar tidak bisa diubah**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Pasien terdaftar tidak bisa diubah (hanya Consent, Renew, Close), jadi koreksi data seperti tanggal lahir dan jejak auditnya tidak bisa diuji.
- **Dampak:** 1 test case terhenti (01 Rawat Jalan).
- **Perbaikan:** 1. Tambahkan edit di dialog detail (atau sebutkan tempat koreksi dilakukan). 2. Jalankan lagi TC-APP001-039.
- **Penanggung jawab:** Product owner, lalu Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): details buttons: Consent, Renew, Close
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP001-039

### Blocker 21

**Order obat yang sudah dibuat tidak bisa dibatalkan atau dikoreksi**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Order obat yang sudah dibuat tidak punya tombol Batal atau Ubah; order yang salah tetap di antrean farmasi sampai diserahkan.
- **Dampak:** 1 test case terhenti (03 Pelayanan Pasien).
- **Perbaikan:** 1. Tambahkan batal (dan koreksi) untuk order yang menunggu, atau sebutkan layar tempat melakukannya. 2. Jalankan lagi TC-APP003-031.
- **Penanggung jawab:** Product owner, lalu Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP003-031

### Blocker 22

**Pasangan interaksi obat dari data bersama tidak ada di situs**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Pasangan interaksi obat dari data bersama tidak ada di situs: "Check interactions" tidak memberi peringatan maupun blokir, dan tidak ada layar untuk membuat pasangan interaksi.
- **Dampak:** 5 test case dan rantai E2E-021 terhenti (03 Pelayanan Pasien, 05 Farmasi).
- **Perbaikan:** 1. Muat kedua pasangan (atau sebutkan layar atau seed yang melakukannya). 2. Jalankan lagi TC-APP003-005, 015, 029 dan TC-APP005-012, 029.
- **Penanggung jawab:** Administrator site, lalu tester
- **Cek ulang:** Sebagian test menandainya tanpa mencoba langkahnya dan belum ada pengawas: belum dicek ulang sejak ditemukan.
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-021, TC-APP003-005, TC-APP003-015, TC-APP003-029, TC-APP005-012, TC-APP005-029

### Blocker 23

**Ward care tidak menampilkan pasien rawat inap cabang**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Daftar "Ward care" hanya berisi "—", juga tepat setelah pasien dirawat inap; tidak ada rawat inap yang bisa dipilih, jadi Terima, Catatan, Dokter, Tukar, dan Keluar khusus tidak bisa dipakai.
- **Dampak:** 12 test case dan rantai E2E-004 terhenti (04 Rawat Inap).
- **Perbaikan:** 1. Buat daftar memuat rawat inap cabang (atau sebutkan apa yang harus ada lebih dulu). 2. Jalankan lagi TC-APP004-065 sampai 076.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-004, TC-APP004-065, TC-APP004-066, TC-APP004-067, TC-APP004-068, TC-APP004-069, TC-APP004-070, TC-APP004-071, TC-APP004-072, TC-APP004-073, TC-APP004-074, TC-APP004-075, TC-APP004-076

### Blocker 24

**Tipe rujukan dan tipe konsul silang hanya menampilkan baris awal, tanpa halaman atau pencarian**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Daftar Tipe rujukan dan Tipe konsul silang berhenti di 24 baris tanpa halaman atau pencarian; tipe yang disimpan sesudahnya tidak pernah tampil di daftar.
- **Dampak:** 6 test case dan rantai E2E-020 terhenti (02 Janji Temu).
- **Perbaikan:** 1. Tambahkan halaman atau pencarian di kedua daftar. 2. Jalankan lagi TC-APP002-019, 020, 022, 023, 024, dan 026.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-020, TC-APP002-019, TC-APP002-020, TC-APP002-022, TC-APP002-023, TC-APP002-024, TC-APP002-026

### Blocker 26

**Gudang tidak bisa dibuat di situs (Gudang tidak punya tombol "Tambah")**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Gudang (store) tidak bisa dibuat: layar Gudang tidak punya tombol Tambah dan form "Cabang dan gudang" gagal. Store QA dari katalog dan store nonaktif tidak bisa disiapkan.
- **Dampak:** 2 test case terhenti (05 Farmasi, 07 Persediaan).
- **Perbaikan:** 1. Sebutkan layar yang membuat gudang, atau tambahkan. 2. Buat gudang katalog dan jalankan lagi TC-APP007-020 dan TC-APP005-034.
- **Penanggung jawab:** Development; administrator site untuk gudangnya
- **Cek ulang:** Sebagian test menandainya tanpa mencoba langkahnya dan belum ada pengawas: belum dicek ulang sejak ditemukan.
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP005-034, TC-APP007-020

### Blocker 29

**Penyerahan obat dari order tidak bisa mengubah Diserahkan, Diminta, atau Generik**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Pada penyerahan obat yang dibuka dari order, Diminta, Diserahkan, dan Generik tidak bisa diubah, jadi penyerahan sebagian dan obat generik tidak bisa dicatat.
- **Dampak:** 3 test case terhenti (05 Farmasi).
- **Perbaikan:** 1. Biarkan baris order menerima jumlah yang diketik dan centang Generic. 2. Jalankan lagi TC-APP005-002, 004, dan 025.
- **Penanggung jawab:** Development
- **Cek ulang:** Sebagian test menandainya tanpa mencoba langkahnya dan belum ada pengawas: belum dicek ulang sejak ditemukan.
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP005-002, TC-APP005-004, TC-APP005-025

### Blocker 31

**Penerimaan barang, faktur pemasok, dan retur tidak bisa disimpan: "grn" menjawab "receive at the gate first" setelah gate tersimpan**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Penerimaan barang (grn), faktur pemasok, dan retur tidak bisa disimpan: "grn" menjawab "receive at the gate first" walaupun gate sudah tersimpan (sebelumnya HTTP 500). Barang tidak bisa diterima, ditagih, atau diretur.
- **Dampak:** 5 test case dan rantai E2E-008 terhenti (07 Persediaan, 09 Pengadaan).
- **Perbaikan:** 1. Perbaiki keempat aksi (atau sebutkan nilai gudang yang diharapkan "Store"). 2. Jalankan lagi TC-APP009-046, 049, dan 051.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): grn after a saved gate: "procurement: invalid input: receive at the gate first"
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-008, TC-APP007-024, TC-APP009-021, TC-APP009-046, TC-APP009-049, TC-APP009-051

### Blocker 33

**Pasien asuransi PT-BPJS tidak ada di situs dan tidak ada layar untuk menyiapkannya**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Pasien asuransi PT-BPJS tidak ada di situs, dan tidak ada layar untuk menyiapkan pra-otorisasi atau rujukan dengan nomor SEP.
- **Dampak:** 5 test case terhenti (14 Kasir & Tagihan).
- **Perbaikan:** 1. Muat PT-BPJS dengan pra-otorisasinya (disetujui, 2.000.000) dan rujukannya (SEP QA-SEP-0001). 2. Jalankan lagi TC-APP014-017, 041 sampai 044.
- **Penanggung jawab:** Administrator site (pemuatan data)
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP014-017, TC-APP014-041, TC-APP014-042, TC-APP014-043, TC-APP014-044

### Blocker 34

**Diskon di atas batas kasir tidak bisa menunggu persetujuan: rantai persetujuan diskon billing belum diatur**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Diskon di atas batas kasir tidak bisa menunggu persetujuan: rantai persetujuan diskon tagihan (billingdiscount) tidak ada dan tidak bisa dibuat di Workflow (hanya discharge dan purchase_order). Penjualan tidak pernah berstatus "Menunggu persetujuan".
- **Dampak:** 2 test case terhenti (14 Kasir & Tagihan).
- **Perbaikan:** 1. Tambahkan proses "billingdiscount" ke Workflow (Development: layar hanya menawarkan discharge dan purchase_order), lalu beri satu langkah dengan penyetuju Head cashier. 2. Jalankan lagi TC-APP014-007, 028, dan 029.
- **Penanggung jawab:** Development (prosesnya), lalu administrator site (langkahnya)
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP014-028, TC-APP014-029

### Blocker 36

**Buku besar pasien tidak bisa menampilkan invoice pilihan: "Cari pasien" kosong, daftar hanya 22 invoice**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Buku besar pasien tidak bisa menampilkan invoice pilihan: "Cari pasien" mengembalikan data tetapi tabel kosong, dan tanpa pencarian hanya 22 invoice pertama yang tampil.
- **Dampak:** 7 test case terhenti (14 Kasir & Tagihan).
- **Perbaikan:** 1. Tampilkan baris "Find patient" (dan beri halaman atau pencarian di daftarnya). 2. Jalankan lagi TC-APP014-061, 063, 065, 066, 068, dan 069.
- **Penanggung jawab:** Development
- **Cek ulang:** Sebagian test menandainya tanpa mencoba langkahnya dan belum ada pengawas: belum dicek ulang sejak ditemukan.
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP014-061, TC-APP014-063, TC-APP014-065, TC-APP014-066, TC-APP014-067, TC-APP014-068, TC-APP014-069

### Blocker 37

**12 komponen gaji dari workbook tidak ada di situs, dan tidak ada layar untuk membuatnya**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** 12 komponen gaji dari workbook tidak ada di situs (yang ada GAPOK, POTBPJS, TUNJAB), dan tidak ada layar untuk melihat atau membuat komponen gaji.
- **Dampak:** 3 test case terhenti (17 Penggajian).
- **Perbaikan:** 1. Muat 12 komponen workbook ke tenant uji (atau berikan angka untuk GAPOK, POTBPJS, dan TUNJAB). 2. Jalankan lagi TC-APP017-002, 003, dan 011.
- **Penanggung jawab:** Development / Product owner
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): batch lines: GAPOK, POTBPJS, TUNJAB
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP017-002, TC-APP017-003, TC-APP017-011

### Blocker 40

**Picker dan daftar hanya menjangkau data awal: data di luarnya tidak bisa dipilih atau ditemukan**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Picker dan daftar hanya menjangkau data awal: picker menyaring data yang dimuat sekali (50 pertama menurut nama) dan daftar desk hanya 22 baris tanpa halaman. Data baru di luar itu tidak bisa dipilih atau ditemukan. Test menyiasatinya dengan kode yang terurut paling awal bila memungkinkan.
- **Dampak:** 21 test case dan rantai E2E-003, E2E-010, E2E-012, E2E-014, E2E-027, E2E-032, E2E-039, E2E-044 terhenti (01 Rawat Jalan, 02 Janji Temu, 04 Rawat Inap, 05 Farmasi, 10 SDM, 12 Radiologi (RIS), 17 Penggajian, 19 Keuangan, 24 Tata Graha, 26 Pemeliharaan).
- **Perbaikan:** 1. Cari di picker dan daftar lewat server (atau muat semua record); beri daftar desk halaman atau pencarian, terbaru di atas. 2. Jalankan lagi test case yang tercantum dan rantai E2E-001, 003, 008, 010, 012, 013, 014, 018, 025, 026, 027, 029, 032, 035, 044, dan 048.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-003, E2E-010, E2E-012, E2E-014, E2E-027, E2E-032, E2E-039, E2E-044, TC-APP001-023, TC-APP001-053, TC-APP002-017, TC-APP004-017, TC-APP004-022, TC-APP004-023, TC-APP004-039, TC-APP004-047, TC-APP005-018, TC-APP005-042, TC-APP010-020, TC-APP010-033, TC-APP012-029, TC-APP017-005, TC-APP019-021, TC-APP024-013, TC-APP026-004, TC-APP026-005, TC-APP026-006, TC-APP026-012, TC-APP026-013

### Blocker 42

**Uang muka (imprest) tidak bisa diajukan: kelayakan imprest cabang tidak bisa diatur**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Uang muka (imprest) tidak bisa diajukan karena kelayakan imprest cabang tidak bisa diatur ("Add row" tidak menambah baris).
- **Dampak:** 2 test case dan rantai E2E-042 terhenti (19 Keuangan).
- **Perbaikan:** 1. Jadikan baris kelayakan imprest di konfigurasi cabang bisa dipakai (atau atur satu untuk karyawan QA Podomoro). 2. Jalankan lagi TC-APP019-066 dan E2E-042.
- **Penanggung jawab:** Administrator site, lalu Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): advance request: "The amount exceeds the employee's imprest eligibility."
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-042, TC-APP019-066, TC-APP019-067

### Blocker 43

**Saldo cuti tahunan tidak bisa disimpan di HR desk: "Year balance" menjawab "pending approval"**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Saldo cuti tahunan tidak bisa disimpan di meja HR: "Year balance" menjawab "pending approval" untuk pegawai baru (sebelumnya HTTP 500). Tanpa saldo, pengajuan dan persetujuan cuti tidak bisa diuji.
- **Dampak:** 4 test case dan rantai E2E-040 terhenti (10 SDM).
- **Perbaikan:** 1. Perbaiki penyimpanan saldo tahunan di meja HR. 2. Jalankan lagi TC-APP010-042, TC-APP010-043, TC-APP010-047, TC-APP010-048, dan E2E-040.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-040, TC-APP010-042, TC-APP010-043, TC-APP010-047, TC-APP010-048

### Blocker 45

**Tahun buku 2026 tidak punya periode, dan periodenya tidak bisa dibuat lewat layar: jurnal, voucher, atau pembayaran bertanggal hari ini tidak bisa disimpan**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Tahun buku 2026 tidak punya periode, jadi jurnal, voucher, atau pembayaran bertanggal hari ini tidak bisa disimpan ("No financial period covers this date"). Periode tidak bisa dibuat lewat layar: dialog Periode hanya menampilkan daftar, dan baris 2026 tidak tampil di tabel (blocker 40).
- **Dampak:** 12 test case terhenti (19 Keuangan).
- **Perbaikan:** 1. Buat periode tahun buku 2026 di server (atau sediakan "Generate periods" untuk tahun tanpa periode). 2. Jalankan lagi TC-APP019-037 dan TC-APP019-044 sampai 055.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): 2026: periods [] (none)
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP019-037, TC-APP019-044, TC-APP019-045, TC-APP019-046, TC-APP019-047, TC-APP019-048, TC-APP019-049, TC-APP019-050, TC-APP019-051, TC-APP019-052, TC-APP019-054, TC-APP019-084

### Blocker 46

**Tidak ada user yang bisa menyetujui dokumen keuangan: "Approve" menjawab "missing required privilege" (tenant tidak punya FINANCE_APPROVE)**

- **Jenis:** Set-up & data uji
- **Cabang:** Podomoro
- **Masalah:** Tidak ada user yang bisa menyetujui dokumen keuangan: "Approve" menjawab "missing required privilege" karena hak FINANCE_APPROVE tidak ada di tenant.
- **Dampak:** 11 test case terhenti (19 Keuangan, 20 Anggaran).
- **Perbaikan:** 1. Tambahkan hak persetujuan keuangan ke tenant dan ke role penyetuju (U5 qa.approver). 2. Jalankan lagi TC-APP019-068 sampai 078.
- **Penanggung jawab:** Development, lalu administrator site
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP019-068, TC-APP019-070, TC-APP019-071, TC-APP019-072, TC-APP019-073, TC-APP019-074, TC-APP019-076, TC-APP019-084, TC-APP020-032, TC-APP020-033, TC-APP020-034

### Blocker 47

**Penyerahan obat dengan diskon baris di atas maksimum tidak bisa menunggu kasir: "chain not found: billingdiscount"**

- **Jenis:** Fitur belum ada
- **Cabang:** Podomoro
- **Masalah:** Penyerahan obat dengan diskon baris di atas maksimum tidak bisa menunggu kasir: "chain not found: billingdiscount" (sebelumnya HTTP 500). Panel "Dispense discounts" di kasir selalu kosong.
- **Dampak:** 5 test case terhenti (05 Farmasi, 14 Kasir & Tagihan).
- **Perbaikan:** 1. Tambahkan proses "billingdiscount" ke Workflow (Development: layar hanya menawarkan discharge dan purchase_order), beri langkahnya, lalu pastikan baris di atas maksimum menunggu di "Dispense discounts". 2. Jalankan lagi TC-APP005-016, 036, 037 dan TC-APP014-070, 071.
- **Penanggung jawab:** Development
- **Cek ulang:** Masih berlaku (pengawas blocker, 2026-11-09): discount 20%: "advanceDispense: 400 pharmacy: this discount needs the approval chain: workflow: chain not found: "billin
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP005-016, TC-APP005-036, TC-APP005-037, TC-APP014-070, TC-APP014-071

### Blocker 50

**Perjanjian sourcing tidak bisa disimpan: "accept a bidder on the sheet first" untuk tender yang pemenangnya sudah diterima**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Perjanjian tender tidak bisa disimpan: "accept a bidder on the sheet first" walaupun penawar sudah diterima di lembar evaluasi (sebelumnya HTTP 500).
- **Dampak:** 4 test case dan rantai E2E-009, E2E-043 terhenti (23 Tender & Kontrak).
- **Perbaikan:** 1. Perbaiki penyimpanan perjanjian dari tender (atau sebutkan apa yang masih dibutuhkan). 2. Jalankan lagi TC-APP023-012, 013, 014, 020, dan E2E-009.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-009, E2E-043, TC-APP023-012, TC-APP023-013, TC-APP023-014, TC-APP023-020

### Blocker 51

**Daftar lama menampilkan data baru: item baru di Master Item, dan baris penyerahan baru di Issue Lines farmasi**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** Daftar kadang tidak memuat data baru untuk sementara: item baru di Master item dan baris penyerahan baru di Issue Lines baru tampil berjam-jam kemudian.
- **Dampak:** 1 test case dan rantai E2E-008, E2E-035 terhenti (05 Farmasi).
- **Perbaikan:** 1. Cari tahu kenapa daftar sementara tidak memuat item baru (cache daftar item?) dan perbaiki. 2. Jalankan lagi TC-APP007-001, E2E-008, dan E2E-035.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** E2E-008, E2E-035, TC-APP005-040

### Blocker 56

**"Bayar" saat tidak ada lagi yang ditagih gagal dengan error database**

- **Jenis:** Bug situs
- **Cabang:** Podomoro
- **Masalah:** "Bayar" saat tidak ada lagi yang harus ditagih gagal dengan error database, dan refund di atas batas juga gagal alih-alih menunggu persetujuan.
- **Dampak:** 2 test case terhenti (14 Kasir & Tagihan).
- **Perbaikan:** 1. Perbaiki "Pay" saat tidak ada lagi yang harus dibayar, dan refund di atas batas. 2. Jalankan lagi TC-APP014-004, 009, dan 010.
- **Penanggung jawab:** Development
- **Cek ulang:** Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).
- **Sumber:** ditemukan otomasi (lib/qa-data/found-blockers.ts)
- **Test case terhenti:** TC-APP014-004, TC-APP014-010

## Blocker yang sudah selesai atau tidak lagi menghentikan test

| No | Blocker | Keterangan |
|---:|---|---|
| 1 | Login tetap di halaman login | Login dari alamat bawaan tidak berlanjut ke halaman awal walaupun server menerima login dan cookie sudah terpasang; dengan tujuan /apps langsung berhasil. Test memakai /apps sebagai jalan keluar. |
| 14 | 34 journey butuh data yang dibuat di aplikasi lain | 34 journey dimulai dari data yang dibuat aplikasi lain (pegawai, item stok, PR/PO yang disetujui, voucher, rawat inap). Situs tidak menyediakan data uji itu, dan di layar desk data dirujuk dengan id internal yang diketik manual. Sejak 2026-11-01 test Linen dan Aset Tetap membuat sendiri item Inventory-nya (X-SPREI/X-KAIN dengan stok di gudang linen GLB, X-USG-01 dengan batch di gudang umum GU05-00-00), sehingga perintah kerja, sirkulasi, pemasangan, aktivasi, penyusutan, dan perpindahan aset dijalankan. |
| 15 | Belum ada izin membuat data; pasien belum dipastikan fiktif | Belum ada izin membuat data di situs bersama, dan belum dipastikan data pasien di situs adalah data rekaan. Sudah dijawab: izin menulis diberikan 2026-10-21 (QA_ALLOW_WRITES). |
| 16 | Hanya akun administrator yang dipakai | Hanya akun administrator yang diizinkan, jadi pembatasan per peran tidak bisa diuji. Sudah dijawab: akun per peran (U3–U8) dibuat 2026-10-20. |
| 18 | Lebih dari 3 booking dalam satu hari tidak bisa dibuat dengan pengaturan buku bersama | Pengaturan buku bersama hanya memberi kuota harian ke DR-1 (3) dan UNIT-1 (2), jadi satu hari paling banyak 3 booking; test yang butuh lebih dari 10 booking sehari (halaman daftar) atau lebih dari 4 dalam satu kotak kalender tidak bisa disiapkan. Sejak 2026-11-01 otomasi menambah konsultan uji DR-3 (qa.dr3, "QA dr. Kuota Besar") dengan kuota 12 per hari dan jam buka Senin–Jumat 13:00–17:00; DR-1 dan DR-2 tetap sesuai workbook. |
| 30 | Rantai persetujuan purchase order hanya satu langkah, bukan empat seperti data bersama (selesai 2026-11-01) | Rantai persetujuan PO hanya satu langkah, bukan empat seperti data bersama. Selesai 2026-11-01: rantai diatur menjadi empat langkah sesuai workbook (editor hanya memberi nama langkah, tanpa peran). |
| 32 | Menggeser slot kamar operasi satu jam menjawab HTTP 500 (selesai 2026-10-31) | Menggeser jadwal kamar operasi satu jam menjawab HTTP 500. Selesai 2026-10-31: untuk permintaan yang sudah divalidasi, jadwal bergeser ("Saved"). |
| 35 | Harga item cabang (margin dan pajak) tidak bisa disimpan (selesai 2026-10-31) | Harga item cabang (margin dan pajak) tidak bisa disimpan. Selesai 2026-10-31: tersimpan bila margin diketik sebagai pecahan. |
| 39 | Tender tidak bisa dibuat: "Create tender" menjawab HTTP 500 (sejak 2026-10-29 hanya untuk permintaan pembelian yang sudah punya tender) | Tender tidak bisa dibuat untuk PR yang sudah disetujui (dulu HTTP 500; sejak 2026-10-29 hanya ditolak bila PR sudah punya tender). |
| 44 | Purchase order di Purchase requests butuh pemasok yang sudah ada ("supplier is missing"; dulu HTTP 500, selesai 2026-10-31) | PO di Permintaan pembelian butuh pemasok yang sudah ada ("supplier is missing"; sebelumnya HTTP 500). Selesai 2026-10-31: test memakai pemasok seed. |
| 49 | "Hitung" di Order diet menjawab HTTP 500 (selesai 2026-10-31) | "Hitung" di Order diet menjawab HTTP 500. Selesai 2026-10-31: perhitungan berjalan. |
| 52 | "Konfirmasi penyerahan" menjawab HTTP 500 dengan freeze days atau untuk pasien bernama sama (selesai 2026-10-31: kini penolakan) | "Confirm dispense" menjawab HTTP 500 bila Freeze days diatur atau untuk pasien bernama sama. Selesai 2026-10-31: kini berupa penolakan dengan pesan. |
| 54 | Dialog Triase di Pasien IGD tidak menawarkan kategori triase | Dialog Triage di Pasien IGD tidak menawarkan kategori triase, jadi triase tidak bisa disimpan. Muncul 2026-10-29; sejak 2026-11-01 kategori tampil lagi dan test triase berjalan. |
| 57 | "Link me" di SDM, Profil saya menjawab HTTP 500 untuk akun yang sudah ditautkan (selesai 2026-10-31: ditolak "duplicate") | "Link me" di Profil saya menjawab HTTP 500 untuk akun yang sudah tertaut. Selesai 2026-10-31: kini ditolak dengan "duplicate". |
| 58 | Kadang pasien kedua dengan nama lengkap yang sama tidak bisa didaftarkan: "Register" menjawab "Registration failed" | Kadang pasien kedua dengan nama lengkap yang sama tidak bisa didaftarkan ("Registration failed") tanpa alasan; duplikat dan pasien bernama sama dari workbook tidak selalu bisa disiapkan. |
