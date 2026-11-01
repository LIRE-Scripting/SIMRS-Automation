# Blocker dari sudut pandang arsitek HMIS dan klinisi

Dokumen ini membaca ulang 44 blocker aktif ([blocker.md](blocker.md), 2026-11-01) dengan dua pertanyaan:

- **Klinisi:** apa risikonya bagi pasien dan bagi pekerjaan dokter, perawat, apoteker, dan kasir bila perilaku ini sampai ke produksi?
- **Arsitek HMIS:** bagaimana praktik terbaiknya, dan pola desain apa yang sebaiknya dipakai supaya masalah sejenis tidak muncul di modul lain?

Rujukan pembanding adalah alur SIMRS HINAI (Petunjuk Teknis HINAI Web, ringkasannya di `hinai-test-flow/`). KlikMed adalah turunan HINAI, jadi alur HINAI menunjukkan perilaku yang sudah dipakai rumah sakit sehari-hari.

Praktik terbaik di dokumen ini diperkuat dengan regulasi dan literatur; sumbernya ada di bagian [Sumber](#sumber), diberi nomor [S1], [S2], dan seterusnya. Pasal PMK 24/2022 dikutip langsung dari teks resmi JDIH Kemenkes. Sumber lain yang hanya sekunder (blog vendor, ringkasan, skripsi) ditandai, dan perlu dicek tim mutu atau legal sebelum dipakai sebagai syarat formal.

## Ringkasan

Hampir semua blocker berasal dari enam pola. Memperbaiki polanya lebih murah daripada memperbaiki blocker satu per satu.

| Pola | Blocker | Inti masalah |
|---|---|---|
| A. Koreksi dan pembatalan klinis tidak ada | 9, 19, 20, 21, 29, 53 | Data klinis yang salah tidak bisa diperbaiki, dibatalkan, atau ditandai (meninggal), padahal dunia nyata selalu butuh koreksi. |
| B. Pendukung keputusan klinis tanpa data acuan | 12, 22, 6, 8 | Terminologi ICD-10 belum aktif, interaksi obat kosong, dan kode tidak divalidasi, sehingga pengaman klinis tidak bekerja. |
| C. Persetujuan (maker-checker) tidak lengkap | 34, 47, 46, 56, 42, 43, 50 | Mesin workflow hanya mengenal discharge dan purchase_order. Diskon, refund, keuangan, cuti, dan tender tidak punya rantai atau hak setuju. |
| D. Konteks cabang dan hak akses | 5, 6, 4, 38, 41 | "Semua cabang" dipakai untuk menulis data, hak akses tidak bisa disimpan, dan penolakan tidak ditangani di layar. |
| E. Baca setelah tulis dan pencarian | 40, 10, 11, 23, 24, 36, 51 | Data yang tersimpan tidak bisa ditemukan lagi: picker hanya memuat 50 data pertama, daftar tidak ber-halaman, dan sebagian daftar tidak punya rute baca. |
| F. Fondasi operasional dan data master | 2, 3, 13, 14, 17, 18, 25, 26, 27, 31, 33, 37, 45, 48, 55, 7 | Periode fiskal, gudang, komponen gaji, dan pasien BPJS tidak bisa disiapkan lewat layar. Halaman juga gagal total bila satu request error. |

## Prioritas

Urutan ini memakai lensa keselamatan pasien lebih dulu, lalu kepatuhan dan pendapatan, lalu dampak ke pengujian. Kolom "Test" adalah jumlah test case yang terhenti.

| Prioritas | Blocker | Test | Alasan |
|---|---|---:|---|
| **P0 – keselamatan pasien** | 21 order obat tidak bisa dibatalkan | 1 | Obat salah tetap di antrean farmasi dan bisa diserahkan ke pasien. |
| | 22 interaksi obat kosong, 12 terminologi tidak aktif | 10 | Pengaman interaksi dan diagnosis terkode tidak bekerja; dokter merasa dilindungi padahal tidak. |
| | 9 IGD, 20 ubah pasien, 19 tandai meninggal | 6 | Identitas pasien ganda atau salah (Sasaran Keselamatan Pasien 1: identifikasi pasien). Pasien meninggal masih bisa dijadwalkan. |
| | 2, 25 bank darah | 60 | Penelusuran kantong darah dan kontrol mutu tidak tercatat; permintaan darah tidak pernah disetujui. |
| | 23 Ward care kosong | 12 | Perawat tidak bisa menerima pasien di ruangan dan mencatat pemberian obat (MAR). |
| | 29 penyerahan sebagian dan generik, 53 koreksi hasil lab, 8 diet ke dapur | 12 | Praktik harian farmasi, laboratorium, dan gizi tidak bisa dicatat dengan jujur. |
| | 3, 48 CSSD, 13 (uji Bowie-Dick) | 14 | Alat steril tidak tertelusur ke pasien; pelepasan muatan tanpa uji harian. |
| **P1 – kepatuhan dan pendapatan** | 45 periode fiskal, 46 hak setuju keuangan | 18 | Tidak ada transaksi keuangan bertanggal hari ini yang bisa disimpan atau disetujui. |
| | 33 pasien BPJS (SEP) | 5 | Mayoritas pasien rumah sakit di Indonesia adalah peserta JKN; tanpa SEP, klaim INA-CBG tidak bisa dibuat. |
| | 34, 47 persetujuan diskon, 56 bayar nol dan refund, 36 buku besar pasien | 16 | Diskon dan refund tanpa persetujuan adalah celah kecurangan; kasir tidak bisa melihat tagihan pasien. |
| **P2 – fondasi platform** | 40 picker dan daftar | 67 | Blocker dengan dampak terbesar: data ke-51 dan seterusnya tidak bisa dipilih. Di produksi dengan ribuan pasien dan item, ini langsung terasa. |
| | 5, 6 "Semua cabang", 4, 38 hak akses | 85 | Layar kosong tanpa pesan; administrator tidak bisa mengatur hak. |
| | 10, 11, 24, 51 data tidak tampil | 23 | Pengguna tidak bisa memastikan simpanannya berhasil, lalu menyimpan dua kali. |
| **P3 – operasional** | 31 GRN, 50 sourcing, 26 gudang, 27 kit | 13 | Barang tidak bisa diterima dan ditagih, sehingga stok obat tidak bertambah. |
| | 7, 37, 43 SDM dan gaji, 42 imprest, 17, 18 buku janji temu, 41 Kemayoran, 55 branding, 14 data lintas aplikasi | 51 | Penting untuk operasional, tetapi tidak langsung menyentuh pasien. |

## A. Koreksi dan pembatalan klinis

**Prinsip.** Rekam medis harus bisa dikoreksi, dan koreksinya harus berjejak. Setiap koreksi menyimpan nilai lama, nilai baru, siapa, kapan, dan alasannya (prinsip integritas data ALCOA: attributable, legible, contemporaneous, original, accurate).

**Dasar regulasi (PMK 24/2022 tentang Rekam Medis) [S1]:**
- Pasal 16 ayat (4): bila terjadi kesalahan pencatatan informasi klinis, tenaga kesehatan pemberi pelayanan *dapat melakukan perbaikan*. Artinya sistem **wajib menyediakan** jalan koreksi.
- Pasal 29 ayat (3): integritas berarti perubahan data *hanya boleh dilakukan oleh orang yang diberi hak akses untuk mengubah*.
- Pasal 30 ayat (3): hak akses terdiri atas penginputan, **perbaikan data**, dan melihat data.
- Pasal 30 ayat (6)–(7): perbaikan oleh tenaga kesehatan atau petugas administrasi paling lama **2×24 jam** sejak data diinput. Kesalahan data administratif yang diketahui setelah itu diperbaiki **dengan persetujuan Perekam Medis dan Informasi Kesehatan dan/atau pimpinan** fasilitas.
- Pasal 39 ayat (1): data rekam medis elektronik disimpan paling singkat **25 tahun** sejak kunjungan terakhir. Data yang salah tidak bisa "dibuang"; yang benar adalah mengoreksinya dan menyimpan riwayatnya. Sistem yang tidak menyediakan koreksi tidak menjadi lebih aman. Pengguna justru akan mencari jalan pintas: membuat pasien baru, membuat order baru, atau mencatat di kertas.

### Blocker 20: pasien terdaftar tidak bisa diubah

- **Risiko klinis:** salah ketik tanggal lahir atau nama tidak bisa diperbaiki. Gelang identitas, label sampel, dan klaim ikut salah. Petugas akan mendaftarkan pasien baru, sehingga satu orang punya dua rekam medis dan riwayat alergi serta obatnya terpecah.
- **HINAI:** FO-TC-002 mengizinkan perubahan data pasien. Setelah Save, sistem meminta **Reason for modification** (misalnya "Data Correction"), lalu mencetak bukti.
- **Praktik terbaik:**
  - Ikuti PMK 24/2022 Pasal 30 [S1]: dalam 2×24 jam sejak diinput, petugas yang berhak boleh memperbaiki dengan alasan. Lewat dari itu, perbaikan masuk antrean persetujuan Perekam Medis (PMIK) atau pimpinan.
  - Field identitas (NIK, nama, tanggal lahir, jenis kelamin) butuh hak yang lebih tinggi atau verifikasi kedua, dengan jejak audit yang terlihat di layar.
  - Sediakan **gabung rekam medis** (merge) untuk duplikat, dengan hak khusus dan bisa dibatalkan.
  - Pencarian duplikat (NIK, nama + tanggal lahir) dilakukan saat registrasi, sebelum MRN baru dibuat. AHIMA menargetkan tingkat duplikat rekam medis **≤1%**, dan menekankan bahwa duplikat menyebabkan keputusan klinis dibuat dengan data yang tidak lengkap [S7].
  - Identifikasi pasien dengan minimal dua identitas adalah Sasaran Keselamatan Pasien 1 dalam standar akreditasi rumah sakit [S8, sekunder]. Data identitas yang salah dan tidak bisa dikoreksi langsung merusak sasaran ini.
- **Usulan:** tombol Ubah di Pasien terdaftar dengan dialog alasan wajib, batas 2×24 jam untuk perbaikan langsung, persetujuan PMIK setelahnya, riwayat perubahan per pasien, dan cek duplikat saat registrasi.

### Blocker 19: pasien tidak bisa ditandai meninggal

- **Risiko klinis:**
  - Pasien meninggal masih menerima janji temu, SMS pengingat, tagihan, dan resep ulang. Bagi keluarga ini menyakitkan, dan bagi rumah sakit ini risiko reputasi.
  - Data kematian dibutuhkan untuk laporan mortalitas (angka kematian rumah sakit, misalnya GDR/NDR), surat keterangan kematian, dan pelaporan ke SATUSEHAT. Rekam medis elektronik wajib terhubung ke platform interoperabilitas Kemenkes (PMK 24/2022 Pasal 21 [S1]).
- **Praktik terbaik:**
  - Status meninggal dicatat sekali di master pasien: tanggal dan jam, tempat, sebab (ICD-10), dan dokter yang menyatakan.
  - Status itu menyebar ke semua modul: blokir janji temu baru, hentikan order aktif, tutup kunjungan, dan tandai di semua daftar.
  - Pembatalan status meninggal (salah input) hanya oleh peran tertentu, dengan alasan.
- **Usulan:** aksi "Catat kematian" di Pasien terdaftar dan di pemulangan (jenis pulang "Meninggal"), dengan efek ke modul lain seperti di atas.

### Blocker 9: kunjungan IGD yang ditutup tidak bisa diterima lagi

- **Risiko klinis:**
  - Pasien yang kembali ke IGD (misalnya 48 jam setelah pulang) terpaksa diregistrasi ulang dan mendapat **rekam pasien kedua**. Riwayat kunjungan pertama tidak terlihat oleh dokter jaga.
  - Kunjungan ulang IGD dalam 72 jam dipakai luas sebagai pemicu telaah kasus (bukan ukuran mutu langsung) [S9]. Pemicu ini hanya bisa dihitung bila kunjungan ulang tercatat pada MRN yang sama.
  - "Datang meninggal" (DOA) yang salah input tidak bisa dikoreksi.
- **HINAI:** FO-TC-008 memisahkan **registrasi** (sekali, MRN tetap) dari **penerimaan di IGD** ("walkin ER": cari pasien dengan MRN, pilih unit, dokter, dan triase). Pasien lama selalu diterima sebagai kunjungan baru pada MRN yang sama.
- **Praktik terbaik:**
  - Satu pasien punya satu MRN (master pasien tunggal), dan setiap datang membuat kunjungan (encounter) baru.
  - DOA adalah disposisi kunjungan, bukan penutupan permanen.
  - Membuka kembali kunjungan yang sudah ditutup hanya oleh peran tertentu, dengan alasan dan jejak audit.
- **Usulan:** "Terima pasien lama" di IGD berdasarkan MRN, dan aksi "Buka kembali kunjungan" berhak khusus. Keputusan product owner dibutuhkan untuk batas waktu dan peran yang boleh membuka kembali.

### Blocker 21: order obat tidak bisa dibatalkan atau dikoreksi

- **Risiko klinis:** salah obat, salah dosis, atau salah pasien adalah kesalahan medikasi paling umum. Tanpa tombol Batal, order salah tetap di antrean farmasi dan **bisa diserahkan**. Dokter yang sadar salah hanya bisa menelepon farmasi, sehingga koreksinya tidak tercatat.
- **HINAI:** sisa order bisa di-**Reject** oleh farmasi (FAR-TC-008), dan obat yang sudah diserahkan dikembalikan lewat retur (FAR-TC-009 dan FAR-TC-010).
- **Praktik terbaik (CPOE):**
  - Sebelum diverifikasi farmasi, dokter bisa **batal** atau **ubah** order (ubah = batal + order baru yang tertaut), dengan alasan.
  - Setelah diverifikasi tetapi belum diserahkan: **hentikan** (discontinue), dan farmasi mendapat notifikasi.
  - Setelah diserahkan: hentikan untuk dosis berikutnya dan retur untuk sisa obat.
  - Semua tercatat di riwayat order, dan order yang dibatalkan tetap terlihat dengan coretan.
  - Literatur menunjukkan bahwa obat yang sudah dihentikan di rekam medis **tetap diserahkan** oleh apotek bila penghentiannya tidak dikirim ke sistem farmasi. Satu studi menemukan 1,5% obat yang dihentikan masih diserahkan setidaknya sekali. Rekomendasinya: bedakan dengan jelas obat aktif dan yang dihentikan, catat alasan penghentian, dan kirim notifikasi ke farmasi [S5].
- **Usulan:** Batal dan Hentikan di order obat Pelayanan Pasien, notifikasi ke antrean farmasi, dan status order yang jelas.

### Blocker 29: penyerahan sebagian dan obat generik tidak bisa dicatat

- **Risiko klinis:**
  - Stok kurang adalah kejadian harian. Bila jumlah yang diserahkan tidak bisa diubah, sistem mencatat obat yang **tidak pernah diterima pasien**: stok dan tagihan salah, dan perawat mengira pasien sudah mendapat semua dosis.
  - Penggantian ke generik (sesuai formularium dan kebijakan JKN) juga tidak bisa dicatat.
- **HINAI:**
  - FAR-TC-003: order berstatus **Partially Processed** dan sisanya ditebus kemudian dengan salinan resep.
  - Petunjuk resep menyebut substitusi lewat kolom **item issued** dan penyesuaian jumlah.
- **Praktik terbaik:**
  - Jumlah diserahkan ≤ jumlah diminta; sisanya tetap terbuka dan bisa ditebus kemudian.
  - Substitusi hanya ke item yang setara (zat aktif dan kekuatan sama, atau sesuai formularium) dan dicatat sebagai substitusi.
  - Penulis resep dapat melihat substitusi itu.
- **Usulan:** buka kembali isian Diserahkan dan Generik pada penyerahan dari order, dengan validasi di server.

### Blocker 53: koreksi hasil laboratorium gagal

- **Risiko klinis:** hasil lab yang salah dan sudah disahkan bisa memicu terapi yang salah.
- **Praktik terbaik:**
  - Hasil yang sudah disahkan tidak dihapus. Koreksi dibuat sebagai **hasil revisi (amended)** dengan alasan, dan versi sebelumnya tetap tersimpan.
  - Dokter pengirim mendapat notifikasi. Untuk nilai kritis, ada konfirmasi bahwa notifikasinya sudah diterima.
- **Usulan:** perbaiki "Revert latest stamp", dan tampilkan versi hasil di laporan.

## B. Pendukung keputusan klinis butuh data acuan

### Blocker 12 (terminologi) dan 6 (catat kode)

- **Risiko klinis dan administrasi:**
  - Tanpa daftar ICD-10 yang aktif, diagnosis ditulis bebas. Grouper INA-CBG (E-Klaim) memakai **ICD-10 versi WHO 2010** untuk diagnosis dan **ICD-9-CM** untuk tindakan, bukan ICD-10-CM versi Amerika [S10, sekunder]. Laporan morbiditas (RL) juga berbasis kode.
  - Blocker 6 menunjukkan kode disimpan **tanpa dicek** ke katalog. Kode yang salah format akan ditolak saat klaim, berminggu-minggu kemudian.
- **HINAI:** CMX-TC-004 dan CMX-TC-005 mengedit diagnosis ICD-10 untuk e-klaim. Data master dikelola terpusat lewat **Central Data Master** (CDM-TC-003): unit mengajukan perubahan, lalu tim TI memverifikasi.
- **Praktik terbaik:**
  - Terminologi adalah data master **berversi** yang dimuat dan diaktifkan oleh administrator (impor ICD-10 versi WHO atau Kemenkes, ICD-9-CM, dan kode yang dipakai SATUSEHAT), bukan diketik per rumah sakit.
  - Setiap input kode divalidasi terhadap versi aktif.
- **Usulan:** layar impor dan aktivasi versi terminologi, validasi kode di "Catat kode", dan satu versi aktif per tenant.

### Blocker 22: interaksi obat kosong

- **Risiko klinis:** "Check interactions" yang selalu lolos lebih berbahaya daripada tidak ada pengecekan sama sekali, karena dokter dan apoteker mengira sudah dicek. Contoh nyata: warfarin dengan NSAID, atau dua obat pemanjang QT.
- **Praktik terbaik:**
  - Basis pengetahuan obat (interaksi, alergi silang, dosis maksimum) berasal dari sumber yang dikurasi dan berversi.
  - Ada tingkat keparahan: info, peringatan, atau blokir. **Blokir (hard stop) hanya untuk interaksi paling berat**; peringatan yang tidak bisa ditindaklanjuti dibuang, karena peringatan yang terlalu banyak diabaikan (alert fatigue). Studi dua rumah sakit menunjukkan peringatan bertingkat dengan hard stop untuk yang terberat membuat interaksi serius lebih dipatuhi [S11].
  - Melewati peringatan wajib diberi **alasan terstruktur** (pilihan, bukan teks bebas), dan tercatat. Studi VA menemukan 53% peringatan interaksi kritis dilewati tanpa alasan, dan alasan teks bebas sering tidak membantu apoteker menilai risiko [S12]. Data alasan ini dipakai untuk menyetel ulang peringatan yang tidak bernilai.
  - Cek alergi pasien memakai data yang dicatat perawat (HINAI PWT-TC-003 mencatat alergi saat pasien diterima di ruangan).
  - Bila basis data kosong, layar harus **mengatakannya** ("Data interaksi belum dimuat"), bukan diam.
- **Usulan:** layar kelola pasangan interaksi (atau impor), status "data belum dimuat" di dialog cek, dan cek alergi.

### Blocker 8: order diet tidak sampai ke dapur

- **Risiko klinis:** pasien diabetes, gagal ginjal, alergi makanan, atau puasa pra-operasi mendapat makanan yang salah. Ini kejadian tidak diharapkan yang sering terjadi di rumah sakit.
- **Praktik terbaik:** setiap order diet aktif menghasilkan daftar saji per ruangan dan per jam makan. Perubahan order (puasa, ganti diet) membatalkan saji berikutnya. Alergi makanan ikut tercetak di label saji.
- **Usulan:** dapur membaca semua order diet aktif, bukan hanya makan terlambat. Keputusan product owner dibutuhkan untuk jadwal jam makan.

## C. Persetujuan (maker-checker)

**Prinsip.** Transaksi yang mengurangi pendapatan atau mengeluarkan uang (diskon, pembatalan, refund, uang muka) dan dokumen keuangan butuh **pemisahan tugas**: pembuat tidak menyetujui sendiri, dan batas nominal menentukan siapa yang harus menyetujui.

**HINAI:**
- KEU-TC-005 dan 006: kasir mengajukan pembatalan dengan alasan ("Request for Cancel Approval"), lalu atasan menyetujui dari **Pending Task**.
- KEU-TC-010: diskon disimpan dengan "Save and Send for Approval".
- Dokumen persediaan dan pengadaan (stock indent, issue, receipt, GRN) semuanya memakai "Send for Approval" lalu "Approve".

**Masalah di KlikMed:**
- Mesin workflow hanya mengenal `discharge` dan `purchase_order` (blocker 34 dan 47: `billingdiscount` tidak ada).
- Hak `FINANCE_APPROVE` tidak ada di tenant (blocker 46).
- Refund di atas batas gagal, bukan menunggu persetujuan (blocker 56).
- Cuti (43) dan tender (50) tertahan di status persetujuan yang tidak bisa diselesaikan.

**Praktik terbaik (arsitektur):**
- **Satu mesin persetujuan generik:** jenis dokumen, langkah, peran atau user per langkah, dan ambang nominal per cabang, semuanya diatur di Workflow tanpa kode baru per jenis dokumen.
- **Satu kotak masuk "Tugas menunggu"** untuk semua jenis persetujuan, seperti Pending Task di HINAI.
- Status dokumen eksplisit: Draf, Menunggu persetujuan, Disetujui, Ditolak, Dibatalkan. Transaksi ke kasir atau buku besar hanya terjadi setelah Disetujui.
- Bila rantai belum diatur, tampilkan pesan yang jelas kepada pengguna ("Rantai persetujuan diskon belum diatur; hubungi administrator"), bukan "chain not found".

**Usulan:** daftarkan `billingdiscount`, `refund`, `invoice_cancel`, `finance_voucher`, `leave`, dan `imprest` sebagai jenis dokumen di Workflow, dan tambahkan `FINANCE_APPROVE` ke tenant.

## D. Konteks cabang dan hak akses

**Masalah:** sesi "Semua cabang" dipakai untuk menulis data yang harus milik satu cabang (blocker 6), dan 28 daftar tampil kosong tanpa pesan (blocker 5). Hak akses role gagal disimpan (38), dan halaman lisensi menolak tanpa penanganan (4).

**Praktik terbaik:**
- **Membaca** dengan "Semua cabang" boleh, dengan kolom Cabang di setiap daftar.
- **Menulis** selalu butuh satu cabang. Bila sesi "Semua cabang", form menampilkan pilihan cabang yang wajib diisi, atau tombol Simpan menjelaskan bahwa cabang harus dipilih dulu.
- Daftar yang memang hanya untuk satu cabang menampilkan pesan "Pilih cabang untuk melihat data ini", bukan tabel kosong.
- Penolakan hak (403) ditampilkan sebagai "Anda tidak punya hak X; hubungi administrator", dan halaman tetap terbuka.
- Hak akses di-cache per sesi, dan perubahannya tercatat di audit.

**Usulan:** satu komponen "pemilih cabang" yang dipakai semua form tulis, dan aturan di server untuk menolak tulis tanpa cabang dengan pesan yang bisa diterjemahkan. Blocker 41 (registrasi di Kemayoran gagal) kemungkinan besar adalah konfigurasi cabang yang belum lengkap. Validasi konfigurasi cabang sebaiknya dijalankan saat cabang dibuat, bukan saat transaksi pertama gagal.

## E. Baca setelah tulis dan pencarian

**Masalah:**
- Picker hanya menyaring 50 data pertama yang dimuat sekali (blocker 40, 67 test case).
- Sebagian daftar berhenti di 22 atau 24 baris tanpa halaman (24, 36).
- Sebagian data tersimpan tidak punya daftar sama sekali (10, 11).
- Ward care tidak membaca rawat inap cabang (23).
- Daftar menampilkan data lama selama berjam-jam (51).

**Risiko klinis:** rumah sakit menengah punya puluhan ribu pasien dan ribuan item obat. Picker yang hanya menjangkau 50 data pertama berarti obat yang dibutuhkan **tidak bisa dipilih**. Pengguna akan memilih obat lain yang mirip namanya. Ini sumber kesalahan LASA (look-alike sound-alike). ISMP mencatat bahwa pencarian dengan 2–4 huruf pertama menampilkan nama obat yang mirip berdampingan, dan sudah menyebabkan salah pilih obat [S6].

**Praktik terbaik:**
- **Pencarian di server** untuk semua picker: server mencari (nama, kode, barcode) di seluruh data, bukan di 50 data yang sudah dimuat. Hasilnya dibatasi, tetapi bisa dipersempit sampai unik.
- **Untuk picker obat** (rekomendasi ISMP [S6]): idealnya pencarian dinamis yang menampilkan hasil sampai tinggal satu nama obat yang unik. Bila belum ada, wajibkan **minimal 5 huruf pertama** nama obat. Pakai *tall man lettering* untuk pasangan nama yang mirip (misalnya hidrOXYzine dan hydrALAzine), dan tampilkan kekuatan serta bentuk sediaan di setiap baris hasil.
- **Halaman di server** (cursor atau offset) untuk semua daftar, dengan total data dan filter.
- **Baca setelah tulis:** setiap entitas yang bisa disimpan punya layar daftar atau detail. Setelah simpan, layar langsung menampilkan data itu (redirect ke detail, atau baris baru ditandai).
- Cache daftar dibatalkan saat ada tulis. Bila memakai cache, waktu kedaluwarsanya hitungan detik, bukan jam.
- Worklist klinis (Ward care, antrean farmasi, worklist lab) adalah query berdasarkan status (HINAI PWT-TC-003: cari pasien dengan status "billing cleared" lalu "under IP"), bukan daftar statis.

**Usulan:** satu komponen picker dan satu komponen tabel dengan pencarian dan halaman di server, dipakai di semua modul. Ini menyelesaikan blocker 40, 24, dan 36 sekaligus.

## F. Fondasi operasional dan data master

### Halaman gagal total bila satu request error (2, 3, 48)

- **Praktik terbaik:** satu panel yang gagal menampilkan pesan dan tombol "Coba lagi". Bagian lain halaman tetap jalan. Request lambat diberi batas waktu dan dibatalkan. Pesan error untuk pengguna tidak memuat teks teknis; detail teknis dan id korelasi dicatat di log.
- **Klinis:** bank darah (2, 25) dan CSSD (3, 48) adalah layanan penelusuran.
  - Kantong darah harus tertelusur dari donor sampai pasien penerima, dan kontrol mutu wajib tercatat. Di Indonesia rujukannya Permenkes 91/2015 tentang Standar Pelayanan Transfusi Darah, yang mencakup sistem manajemen mutu pelayanan darah [S3]. Sebagai pembanding, regulasi Uni Eropa mewajibkan setiap donasi dan setiap kantong bisa ditelusuri ke donor dan ke penerima [S4].
  - Set steril harus tertelusur dari siklus sterilisasi sampai pasien. AAMI ST79 mewajibkan uji Bowie-Dick setiap hari sterilisator pra-vakum dipakai, **sebelum muatan pertama** [S13, sekunder]. Sistem sebaiknya menolak pelepasan muatan bila uji hari itu belum lulus (blocker 13).
  - Bila layar ini tidak jalan, rumah sakit kembali ke buku catatan, dan penelusuran saat ada kejadian (reaksi transfusi, infeksi luka operasi) tidak bisa dilakukan.

### Data master dan set-up yang tidak bisa dibuat lewat layar (13, 26, 33, 37, 45)

- **Masalah:** periode fiskal 2026 (45), gudang (26), komponen gaji (37), pasien BPJS dan SEP (33), dan konfigurasi cabang (13) tidak bisa disiapkan dari aplikasi.
- **HINAI:**
  - Bed, karyawan, dan lisensi tenaga medis disiapkan lewat IT Support (ITS-TC-001 sampai 006).
  - Data master lain lewat Central Data Master (CDM-TC-003).
  - BPJS punya alur eligibility dengan nomor SEP dari VClaim (CMX-TC-001), SEP rawat inap dan IGD (FO-TC-012 sampai 014), dan pembuatan tagihan BPJS (CMX-TC-006 dan 007).
- **Praktik terbaik:**
  - Setiap data master punya pemilik dan layar kelola (atau impor) dengan riwayat perubahan.
  - Periode fiskal dibuat otomatis per tahun buku (12 periode) dan dibuka atau ditutup oleh peran keuangan. Transaksi ke periode tertutup ditolak dengan pesan yang jelas.
  - Integrasi **BPJS VClaim** (SEP, rujukan, rencana kontrol) dan **INA-CBG** adalah kebutuhan inti rumah sakit di Indonesia, bukan fitur tambahan. Untuk pengujian, sediakan mode sandbox atau data peserta uji.
  - Integrasi **SATUSEHAT** (kunjungan, diagnosis, obat) diwajibkan: rekam medis elektronik harus terhubung ke platform interoperabilitas Kemenkes (PMK 24/2022 Pasal 21), dan semua fasilitas wajib menyelenggarakan RME paling lambat 31 Desember 2023 (Pasal 45) [S1].
  - Bridging **VClaim** membuat SIMRS bisa memverifikasi kepesertaan dan menerbitkan SEP tanpa membuka dua aplikasi, dan data SEP terisi otomatis di E-Klaim [S10, sekunder].
- **Usulan:** layar Periode (buat tahun buku dan 12 periodenya, buka/tutup), tombol Tambah di Gudang, layar Komponen gaji, dan alur Eligibilitas/SEP di Kasir & Tagihan (mode uji dulu).

### Penerimaan barang (31) dan tender (50)

- **HINAI:** PRC-TC-003 membuat GRN **dari PO** dalam satu dokumen. Gate Entry Date dan Gate Entry No adalah isian di GRN itu sendiri, dan batch, tanggal kedaluwarsa, serta nomor faktur wajib diisi sebelum dikirim untuk persetujuan.
- **Masalah di KlikMed:** gate adalah langkah terpisah, dan GRN tidak mengenali gate yang sudah tersimpan ("receive at the gate first").
- **Praktik terbaik:**
  - Bila gate dipisah, GRN memilih gate dari daftar gate yang terbuka untuk PO itu, dan server memeriksa tautannya, bukan mencari ulang dengan kriteria lain.
  - Batch dan tanggal kedaluwarsa wajib untuk obat. Keduanya dasar FEFO (yang kedaluwarsa duluan keluar duluan) dan penarikan obat (recall).
- **Usulan:** samakan cara GRN mencari gate dengan cara gate menyimpan tautan ke PO. Masalah yang sama terjadi pada sourcing (50): perjanjian tidak mengenali penawar yang sudah diterima.

## Pola desain yang disarankan

| Pola | Isi | Menyelesaikan |
|---|---|---|
| Koreksi berjejak | Ubah, batal, hentikan, dan revisi dengan alasan wajib; nilai lama disimpan; riwayat terlihat di layar | 19, 20, 21, 29, 53, 9 |
| Data acuan berversi | Terminologi, interaksi obat, dan formularium diimpor dan diaktifkan per versi; input divalidasi; layar memberi tahu bila data kosong | 12, 22, 6 |
| Mesin persetujuan generik | Jenis dokumen, langkah, peran, dan ambang diatur di Workflow; satu kotak "Tugas menunggu" | 34, 47, 46, 56, 42, 43, 50 |
| Konteks cabang untuk menulis | Pemilih cabang wajib di form tulis; daftar per cabang memberi pesan bila cabang belum dipilih | 5, 6, 41 |
| Picker dan tabel dengan pencarian di server | Pencarian, halaman, dan total dari server; setiap data tersimpan punya daftar atau detail | 40, 10, 11, 23, 24, 36, 51 |
| Penanganan error per panel | Pesan untuk pengguna, tombol coba lagi, batas waktu; detail teknis di log dengan id korelasi | 2, 3, 4, 48, dan deviasi "teks server mentah" |
| Layar set-up dan data uji | Periode, gudang, komponen gaji, peserta BPJS uji; tenant uji dengan data master lengkap yang bisa di-reset | 13, 14, 26, 33, 37, 45, 17, 18 |

## Yang perlu diputuskan product owner

1. **Koreksi identitas pasien (20):** field mana yang boleh diubah petugas pendaftaran, dan mana yang butuh verifikasi kedua. Apakah gabung rekam medis disediakan?
2. **Status meninggal (19):** siapa yang boleh mencatat dan membatalkan, dan efeknya ke janji temu, order, dan tagihan.
3. **IGD (9):** batas waktu dan peran untuk membuka kembali kunjungan; perlakuan DOA.
4. **Order obat (21):** sampai status apa dokter boleh membatalkan sendiri, dan kapan harus lewat farmasi.
5. **Diet (8):** apakah dapur membaca semua order diet aktif per jam makan.
6. **Persetujuan (34, 46, 56):** ambang nominal diskon dan refund per peran dan per cabang.
7. **BPJS (33):** apakah integrasi VClaim dan INA-CBG masuk lingkup KlikMed, dan kapan.

## Catatan

- Dokumen ini ditulis tangan (tidak dibangun ulang otomatis). Angka blocker dan jumlah test case diambil dari [blocker.md](blocker.md) 2026-11-01; untuk angka terbaru lihat dokumen itu.
- Alur HINAI di `hinai-test-flow/` hanya berisi jalur positif (happy path), jadi untuk skenario koreksi dan penolakan, rujukannya adalah regulasi dan literatur di bawah, bukan HINAI.

## Sumber

Sumber primer (teks regulasi, jurnal, atau lembaga) tidak diberi tanda. Sumber sekunder (blog vendor, ringkasan, skripsi) ditandai *sekunder*; isinya perlu dicek ke dokumen aslinya sebelum dipakai sebagai syarat formal.

| No | Sumber | Dipakai untuk |
|---|---|---|
| S1 | [Permenkes No. 24 Tahun 2022 tentang Rekam Medis, JDIH Kemenkes](https://jdih.kemkes.go.id/storage/documents/pdfs/2022permenkes024.pdf) (dikutip dari teks resmi: Pasal 16, 21, 29, 30, 39, 45) | Koreksi berjejak, batas 2×24 jam, hak akses, masa simpan 25 tahun, SATUSEHAT |
| S2 | [Kemenkes: Fasyankes wajib terapkan rekam medis elektronik](https://kemkes.go.id/id/fasyankes-wajib-terapkan-rekam-medis-elektronik) | Kewajiban RME |
| S3 | [Permenkes No. 91 Tahun 2015 tentang Standar Pelayanan Transfusi Darah, JDIH BPK](https://peraturan.bpk.go.id/Download/107583/Permenkes%20Nomor%2091%20Tahun%202015.pdf) (pasal ketertelusuran belum dicek) | Bank darah |
| S4 | [Directive 2002/98/EC, bab V (ketertelusuran)](https://www.legislation.gov.uk/eudr/2002/98/chapter/V/data.htm?view=plain) | Pembanding ketertelusuran darah donor sampai penerima |
| S5 | [Patient Safety Tip of the Week: "Thought You Discontinued That Medication?"](https://www.patientsafetysolutions.com/docs/August_28_2018_Thought_You_Discontinued_That_Medication_Think_Again.htm); [Appl Clin Inform 2025, CancelRx](https://www.thieme-connect.com/products/ejournals/html/10.1055/a-2518-0194) | Pembatalan order obat sampai ke farmasi |
| S6 | [ISMP: Call to action, smarter logic to prevent drug name selection errors](https://home.ecri.org/blogs/ismp-alerts-and-articles-library/call-to-action-standardization-and-smarter-logic-needed-to-prevent-drug-name-selection-errors); [ISMP Electronic Guidelines](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_Electronic_Guidelines.pdf) | Picker obat: pencarian dinamis, minimal 5 huruf, tall man lettering |
| S7 | [AHIMA white paper: patient identity management, target duplikat 1%](https://ahima.org/media/m1pldevh/ahima-pim-whitepaper.pdf) | Duplikat rekam medis |
| S8 | [Panduan akreditasi RSUD Buleleng (SKP)](https://rsud.bulelengkab.go.id/informasi/download/belajar-snars-ver-11-63.pdf); [PELS: SKP 1 STARKES 2024](https://pels.umsida.ac.id/index.php/PELS/article/view/2539) (*sekunder*) | Sasaran Keselamatan Pasien 1 dan 3 |
| S9 | [Kunjungan ulang IGD 72 jam sebagai indikator (PMC4971448)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4971448); [NEJM Journal Watch](https://clinician.nejm.org/EM201105200000004) | Kunjungan ulang IGD |
| S10 | [Medminutes: bridging BPJS VClaim](https://medminutes.io/blog/bridging-bpjs-rumah-sakit-panduan-teknis/); [Medminutes: panduan eClaim](https://medminutes.io/blog/panduan-eclaim-bpjs-rumah-sakit/); [RIGGS: integrasi SIMRS dan E-Klaim](https://journal.ilmudata.co.id/index.php/RIGGS/article/view/10480) (*sekunder*) | INA-CBG (ICD-10 2010, ICD-9-CM), SEP |
| S11 | [Studi dua rumah sakit: tiered drug-drug interaction alerts (PMC2605599)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2605599) | Peringatan interaksi bertingkat |
| S12 | [AHRQ: override reasons for critical drug interaction alerts](https://git.lsit.ucsb.edu/publicdata/ahrq-gov/raw/commit/58222b51ed2ca5fbc109e641d86b5c7039a3725c/archive.ahrq.gov/research/apr08/0408RA18.htm) | Alasan melewati peringatan |
| S13 | [Infection Control Today: using the Bowie-Dick test correctly](https://www.infectioncontroltoday.com/view/using-bowie-dick-test-correctly); [Terragene: Bowie-Dick good practices](https://terragene.com/wp-content/uploads/Archivos/productflyers/BUENAS%20PRACTICAS%20BOWIE%20DICK/Bowie%20Dick%20Good%20Practices.pdf) (*sekunder*, mengutip AAMI ST79) | Uji Bowie-Dick harian |
