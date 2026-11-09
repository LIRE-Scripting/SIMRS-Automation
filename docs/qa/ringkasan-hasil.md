# Ringkasan hasil pengujian SIMRS

Dibangun 2026-11-09 07:55 WIB dari `reports/summary/run-summary.json` (hasil terbaru setiap test case dan rantai). Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

Situs https://rs.showcase.atklik.xyz/id (bahasa Indonesia), cabang uji Podomoro. Setiap test case dan rantai dihitung dengan hasil terbarunya dari semua run. Rincian per test case, dengan tangkapan layar, ada di `reports/summary/simrs-run-summary.xlsx` (satu sheet per modul).

## Angka utama

| Status | Test case modul | Rantai E2E |
|---|---:|---:|
| Lulus | 1109 | 14 |
| Deviasi | 101 | 0 |
| Gagal | 2 | 0 |
| Terblokir | 391 | 36 |
| Belum dijalankan | 1 | 0 |
| **Total** | **1604** | **50** |

- Tingkat lulus: **69%** (termasuk 266 test case **Lulus dengan catatan**: semua perbedaannya dari referensi bisa diterima).
- Cakupan (test case yang dijalankan): **76%**.
- HTTP 5xx di hasil terbaru: **1** ([http-5xx.md](http-5xx.md)).

## Masalah utama

1. **Blocker** ([blocker.md](blocker.md)): 33 blocker masih menghentikan 310 test case. Yang terbesar:
   - Blocker 40: Picker dan daftar hanya menjangkau data awal: data di luarnya tidak bisa dipilih atau ditemukan (62 test case). Perbaikan: 1. Cari di picker dan daftar lewat server (atau muat semua record); beri daftar desk halaman atau pencarian, terbaru di atas. 2. Jalankan lagi test case yang tercantum dan rantai E2E-001, 003, 008, 010, 012, 013, 014, 01
   - Blocker 4: Tenants dan Entitlements menolak administrator rumah sakit ("missing required privilege"; sampai 2026-10-30 HTTP 500) (50 test case). Perbaikan: Fungsi: sembunyikan tautan untuk user tanpa hak, atau tampilkan "no access" alih-alih halaman error. Data: akun dengan LICENSING_WRITE untuk menguji kedua layar.
   - Blocker 5: 28 daftar tidak termuat dengan "Semua cabang" (29 test case). Perbaikan: 1. Putuskan: layar meminta cabang, atau daftar dimuat untuk semua cabang. 2. Di kedua kasus, tampilkan pesan, bukan HTTP 500 dan tabel kosong. 3. Jalankan lagi delapan alur yang dipertahankan dengan "All branches". Solus
   - Blocker 13: Set-up cabang belum ada (27 test case). Perbaikan: 09: item di bawah stok minimum di cabang. 10: "Link me" di My profile untuk user uji. 15 dan 19: buka lagi dengan satu cabang dipilih; kalau masih tidak ada, tambahkan konfigurasi untuk cabang itu. 20: Budget posting rul
   - Blocker 10: Item yang disimpan tidak tampil di daftar mana pun (14 test case). Perbaikan: Tambahkan daftar untuk kelima jenis record, atau tampilkan di layarnya setelah disimpan.
   - Blocker 23: Ward care tidak menampilkan pasien rawat inap cabang (12 test case). Perbaikan: 1. Buat daftar memuat rawat inap cabang (atau sebutkan apa yang harus ada lebih dulu). 2. Jalankan lagi TC-APP004-065 sampai 076.
   - Blocker 45: Tahun buku 2026 tidak punya periode, dan periodenya tidak bisa dibuat lewat layar: jurnal, voucher, atau pembayaran bertanggal hari ini tidak bisa disimpan (12 test case). Perbaikan: 1. Buat periode tahun buku 2026 di server (atau sediakan "Generate periods" untuk tahun tanpa periode). 2. Jalankan lagi TC-APP019-037 dan TC-APP019-044 sampai 055.
   - Blocker 17: Pengaturan buku: baris kuota atau jam buka tidak bisa diubah ke "Unit" (9 test case). Perbaikan: 1. Perbaiki daftar jenis pada baris kuota dan jam buka. 2. Jalankan lagi TC-APP001-011, 013, 018, 044, 049 dan TC-APP002-001, 003, 008, 013.
2. **Deviasi** ([deviations.md](deviations.md)): dari 367 test case dengan deviasi, 101 berisi **deviasi nyata** (perlu diperbaiki), 0 **perlu keputusan** product owner, dan 266 **bisa dianggap lulus**.
3. **HTTP 5xx dan error server** ([http-5xx.md](http-5xx.md)): 1 jawaban HTTP 5xx masih terjadi; 9 blocker karena error server (2, 3, 25, 27, 38, 41, 48, 53, 55) menghentikan 81 test case.
4. **Belum dijalankan:** 1 test case yang terikat jam atau hari kerja, dijadwalkan di run pagi (`.qa-state/morning-run-*.sh`).

## Per modul

| Modul | Total | Lulus | Deviasi | Gagal | Terblokir | Belum dijalankan |
|---|---:|---:|---:|---:|---:|---:|
| 01 Rawat Jalan | 89 | 64 | 12 | 0 | 13 | 0 |
| 02 Janji Temu | 33 | 17 | 4 | 0 | 12 | 0 |
| 03 Pelayanan Pasien | 63 | 49 | 3 | 0 | 11 | 0 |
| 04 Rawat Inap | 90 | 65 | 6 | 0 | 19 | 0 |
| 05 Farmasi | 78 | 58 | 3 | 0 | 17 | 0 |
| 06 Transfusi Darah | 81 | 16 | 2 | 0 | 63 | 0 |
| 07 Persediaan | 67 | 52 | 7 | 0 | 8 | 0 |
| 08 Kamar Operasi | 53 | 47 | 4 | 0 | 2 | 0 |
| 09 Pengadaan | 65 | 48 | 8 | 0 | 9 | 0 |
| 10 SDM | 68 | 33 | 5 | 0 | 30 | 0 |
| 11 Laboratorium | 54 | 47 | 4 | 0 | 3 | 0 |
| 12 Radiologi (RIS) | 35 | 27 | 5 | 0 | 3 | 0 |
| 13 Diet | 62 | 46 | 6 | 0 | 10 | 0 |
| 14 Kasir & Tagihan | 85 | 56 | 2 | 0 | 27 | 0 |
| 15 IGD | 69 | 41 | 7 | 0 | 21 | 0 |
| 16 Rekam Medis (MRD) | 49 | 40 | 3 | 0 | 6 | 0 |
| 17 Penggajian | 69 | 27 | 1 | 0 | 41 | 0 |
| 18 Pengaturan | 92 | 78 | 7 | 0 | 7 | 0 |
| 19 Keuangan | 128 | 89 | 5 | 2 | 32 | 0 |
| 20 Anggaran | 64 | 56 | 3 | 0 | 4 | 1 |
| 21 Sterilisasi (CSSD) | 57 | 38 | 1 | 0 | 18 | 0 |
| 22 Layanan Jasa | 36 | 19 | 1 | 0 | 16 | 0 |
| 23 Tender & Kontrak | 34 | 25 | 0 | 0 | 9 | 0 |
| 24 Tata Graha | 22 | 19 | 1 | 0 | 2 | 0 |
| 25 Linen | 21 | 20 | 0 | 0 | 1 | 0 |
| 26 Pemeliharaan | 20 | 14 | 0 | 0 | 6 | 0 |
| 27 Aset Tetap | 20 | 18 | 1 | 0 | 1 | 0 |
