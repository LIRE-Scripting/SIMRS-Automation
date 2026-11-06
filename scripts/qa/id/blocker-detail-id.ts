/**
 * The problem of each blocker in Indonesian, written from its cause in
 * lib/qa-data/found-blockers.ts (found blockers) and test-data/reference/blockers.json
 * (checklist 00-blockers-checklist-linked.xlsx), for docs/qa/blocker.md and the
 * summary's sheet Blocker. A new blocker needs a line here (and a title in
 * blocker-titles-id.ts); the fix is translated through texts.json.
 */
export const BLOCKER_PROBLEM_ID: Record<number, string> = {
  1: 'Login dari alamat bawaan tidak berlanjut ke halaman awal walaupun server menerima login dan cookie sudah terpasang; dengan tujuan /apps langsung berhasil. Test memakai /apps sebagai jalan keluar.',
  2: 'Halaman Donor memuat daftar donor tanpa penanganan error. Permintaan daftar gagal di server, sehingga seluruh halaman tidak tampil (sampai 2026-10-30 HTTP 500, sejak itu "failed to list donors"). Semua alur donor, skrining, kantong, dan camp tidak bisa dimulai.',
  3: 'Halaman pengeluaran steril baru memuat sumber pengeluaran dan daftar store sekaligus tanpa penanganan error. Salah satunya gagal, jadi halaman tidak tampil ("cssd request failed").',
  4: 'Halaman Tenant dan Entitlement membutuhkan hak LICENSING_WRITE yang tidak dimiliki administrator rumah sakit, dan halaman tidak menangani penolakan itu ("missing required privilege"). Akibatnya tidak ada tenant tanpa lisensi yang bisa dibuat atau dijangkau, sehingga semua kasus "tenant tanpa lisensi" tidak bisa diuji.',
  5: 'Sesi dimulai dengan "Semua cabang", padahal server butuh satu cabang untuk 28 daftar dan layar itu tidak punya isian cabang. Daftarnya tampil kosong tanpa pesan, seolah tidak ada data (sampai 2026-10-30 dengan HTTP 500).',
  6: '"Catat kode" di layar Pulang tanpa kode diagnosis butuh satu cabang, tetapi layarnya tidak punya pilihan cabang; dengan "Semua cabang" ditolak ("The code could not be recorded"). Kode juga disimpan apa adanya tanpa dicek ke katalog diagnosis.',
  7: '"Hitung jasa" di HR selalu ditolak: server meminta sebuah nomor yang tidak pernah dikirim oleh dialognya ("number and amount are required").',
  8: 'Dapur dan Saji & tagihan hanya membaca makan terlambat. Order diet biasa seorang pasien tidak pernah sampai ke kedua layar itu.',
  9: 'Server menolak menerima lagi pasien yang kunjungan IGD sebelumnya sudah ditutup (hanya registrasi baru yang bisa, dan itu membuat rekam pasien kedua). Registrasi "Datang meninggal" langsung menutup kunjungan, dan baris yang ditutup tidak punya tombol, jadi "Tandai hidup" tidak bisa dijangkau.',
  10: 'Data Penggajian yang disimpan (tahun, rekam gaji, input massal, deklarasi pajak, jenis reimburse) tidak ditampilkan di layar mana pun, jadi penguji tidak bisa memastikan penyimpanan berhasil.',
  11: 'Layar Penerimaan jasa dan Tagihan vendor selalu kosong: daftar dikosongkan di kode dan server tidak punya rute untuk membacanya. Id penerimaan yang dibutuhkan "Setujui penerimaan" tidak bisa dibaca di mana pun.',
  12: 'Pencarian Terminologi tidak menemukan satu kode pun (I10, J06.9, "hipertensi"): tampaknya belum ada versi kode diagnosis yang aktif, dan tidak ada layar untuk mengimpor atau mengaktifkannya.',
  13: 'Set-up cabang belum lengkap. Yang masih kurang: konfigurasi registrasi IGD (tipe 6 dan 7) di semua cabang, tanpa layar untuk membuatnya; dan periode tahun buku 2026 untuk tutup tahun serta penerimaan pasien di Keuangan (blocker 45). Sudah dibuka 2026-11-01 oleh tester: Anggaran (alokasi bisa disetujui dan diposting; aturan posting "Pencairan dana" dan "Penarikan dana" Podomoro disimpan dengan akun uji QA), uji Bowie Dick CSSD (disimpan setiap hari untuk autoklaf bawaan), daftar Reorder Podomoro, dan Punch untuk user yang tertaut ke pegawai.',
  14: '34 journey dimulai dari data yang dibuat aplikasi lain (pegawai, item stok, PR/PO yang disetujui, voucher, rawat inap). Situs tidak menyediakan data uji itu, dan di layar desk data dirujuk dengan id internal yang diketik manual. Sejak 2026-11-01 test Linen dan Aset Tetap membuat sendiri item Inventory-nya (X-SPREI/X-KAIN dengan stok di gudang linen GLB, X-USG-01 dengan batch di gudang umum GU05-00-00), sehingga perintah kerja, sirkulasi, pemasangan, aktivasi, penyusutan, dan perpindahan aset dijalankan.',
  15: 'Belum ada izin membuat data di situs bersama, dan belum dipastikan data pasien di situs adalah data rekaan. Sudah dijawab: izin menulis diberikan 2026-10-21 (QA_ALLOW_WRITES).',
  16: 'Hanya akun administrator yang diizinkan, jadi pembatasan per peran tidak bisa diuji. Sudah dijawab: akun per peran (U3–U8) dibuat 2026-10-20.',
  17: 'Di Pengaturan buku, baris kuota atau jam buka tidak bisa diubah ke "Unit" (tetap "Konsultan"), sehingga unit tidak pernah mendapat kuota atau jam buka dan tidak pernah bisa dibooking.',
  18: 'Pengaturan buku bersama hanya memberi kuota harian ke DR-1 (3) dan UNIT-1 (2), jadi satu hari paling banyak 3 booking; test yang butuh lebih dari 10 booking sehari (halaman daftar) atau lebih dari 4 dalam satu kotak kalender tidak bisa disiapkan. Sejak 2026-11-01 otomasi menambah konsultan uji DR-3 (qa.dr3, "QA dr. Kuota Besar") dengan kuota 12 per hari dan jam buka Senin–Jumat 13:00–17:00; DR-1 dan DR-2 tetap sesuai workbook.',
  19: 'Di Pasien terdaftar tidak ada cara mencatat kematian pasien, jadi prekondisi "pasien meninggal" tidak bisa dibuat.',
  20: 'Pasien terdaftar tidak bisa diubah (hanya Consent, Renew, Close), jadi koreksi data seperti tanggal lahir dan jejak auditnya tidak bisa diuji.',
  21: 'Order obat yang sudah dibuat tidak punya tombol Batal atau Ubah; order yang salah tetap di antrean farmasi sampai diserahkan.',
  22: 'Pasangan interaksi obat dari data bersama tidak ada di situs: "Check interactions" tidak memberi peringatan maupun blokir, dan tidak ada layar untuk membuat pasangan interaksi.',
  23: 'Daftar "Ward care" hanya berisi "—", juga tepat setelah pasien dirawat inap; tidak ada rawat inap yang bisa dipilih, jadi Terima, Catatan, Dokter, Tukar, dan Keluar khusus tidak bisa dipakai.',
  24: 'Daftar Tipe rujukan dan Tipe konsul silang berhenti di 24 baris tanpa halaman atau pencarian; tipe yang disimpan sesudahnya tidak pernah tampil di daftar.',
  25: 'Menyimpan kantong darah dari luar atau catatan kontrol mutu gagal (sampai 2026-10-30 HTTP 500). Permintaan darah tetap "Pending", jadi tidak ada yang masuk antrean sebagai "approved".',
  26: 'Gudang (store) tidak bisa dibuat: layar Gudang tidak punya tombol Tambah dan form "Cabang dan gudang" gagal. Store QA dari katalog dan store nonaktif tidak bisa disiapkan.',
  27: 'Menyimpan kit gagal ("saveKitComponents: 500 stock update failed"), jadi item kit tidak bisa dibuat.',
  29: 'Pada penyerahan obat yang dibuka dari order, Diminta, Diserahkan, dan Generik tidak bisa diubah, jadi penyerahan sebagian dan obat generik tidak bisa dicatat.',
  30: 'Rantai persetujuan PO hanya satu langkah, bukan empat seperti data bersama. Selesai 2026-11-01: rantai diatur menjadi empat langkah sesuai workbook (editor hanya memberi nama langkah, tanpa peran).',
  31: 'Penerimaan barang (grn), faktur pemasok, dan retur tidak bisa disimpan: "grn" menjawab "receive at the gate first" walaupun gate sudah tersimpan (sebelumnya HTTP 500). Barang tidak bisa diterima, ditagih, atau diretur.',
  32: 'Menggeser jadwal kamar operasi satu jam menjawab HTTP 500. Selesai 2026-10-31: untuk permintaan yang sudah divalidasi, jadwal bergeser ("Saved").',
  33: 'Pasien asuransi PT-BPJS tidak ada di situs, dan tidak ada layar untuk menyiapkan pra-otorisasi atau rujukan dengan nomor SEP.',
  34: 'Diskon di atas batas kasir tidak bisa menunggu persetujuan: rantai persetujuan diskon tagihan (billingdiscount) tidak ada dan tidak bisa dibuat di Workflow (hanya discharge dan purchase_order). Penjualan tidak pernah berstatus "Menunggu persetujuan".',
  35: 'Harga item cabang (margin dan pajak) tidak bisa disimpan. Selesai 2026-10-31: tersimpan bila margin diketik sebagai pecahan.',
  36: 'Buku besar pasien tidak bisa menampilkan invoice pilihan: "Cari pasien" mengembalikan data tetapi tabel kosong, dan tanpa pencarian hanya 22 invoice pertama yang tampil.',
  37: '12 komponen gaji dari workbook tidak ada di situs (yang ada GAPOK, POTBPJS, TUNJAB), dan tidak ada layar untuk melihat atau membuat komponen gaji.',
  38: 'Menyimpan hak akses sebuah peran gagal ("Failed to save rights."), jadi peran uji untuk Rawat Inap, Pengaturan, Layanan Jasa, dan Tender tidak bisa diberi hak.',
  39: 'Tender tidak bisa dibuat untuk PR yang sudah disetujui (dulu HTTP 500; sejak 2026-10-29 hanya ditolak bila PR sudah punya tender).',
  40: 'Picker dan daftar hanya menjangkau data awal: picker menyaring data yang dimuat sekali (50 pertama menurut nama) dan daftar desk hanya 22 baris tanpa halaman. Data baru di luar itu tidak bisa dipilih atau ditemukan. Test menyiasatinya dengan kode yang terurut paling awal bila memungkinkan.',
  41: 'Pasien tidak bisa didaftarkan di Kemayoran (BR-B): "Register" menjawab "Registration failed", padahal formulir yang sama di Podomoro berhasil.',
  42: 'Uang muka (imprest) tidak bisa diajukan karena kelayakan imprest cabang tidak bisa diatur ("Add row" tidak menambah baris).',
  43: 'Saldo cuti tahunan tidak bisa disimpan di meja HR: "Year balance" menjawab "pending approval" untuk pegawai baru (sebelumnya HTTP 500). Tanpa saldo, pengajuan dan persetujuan cuti tidak bisa diuji.',
  44: 'PO di Permintaan pembelian butuh pemasok yang sudah ada ("supplier is missing"; sebelumnya HTTP 500). Selesai 2026-10-31: test memakai pemasok seed.',
  45: 'Tahun buku 2026 tidak punya periode, jadi jurnal, voucher, atau pembayaran bertanggal hari ini tidak bisa disimpan ("No financial period covers this date"). Periode tidak bisa dibuat lewat layar: dialog Periode hanya menampilkan daftar, dan baris 2026 tidak tampil di tabel (blocker 40).',
  46: 'Tidak ada user yang bisa menyetujui dokumen keuangan: "Approve" menjawab "missing required privilege" karena hak FINANCE_APPROVE tidak ada di tenant.',
  47: 'Penyerahan obat dengan diskon baris di atas maksimum tidak bisa menunggu kasir: "chain not found: billingdiscount" (sebelumnya HTTP 500). Panel "Dispense discounts" di kasir selalu kosong.',
  48: 'Penerimaan unsteril yang tersimpan tidak bisa dibuka: halamannya tidak pernah selesai dimuat dan time-out (504 sampai 2026-10-30), dan selama itu halaman lain ikut melambat.',
  49: '"Hitung" di Order diet menjawab HTTP 500. Selesai 2026-10-31: perhitungan berjalan.',
  50: 'Perjanjian tender tidak bisa disimpan: "accept a bidder on the sheet first" walaupun penawar sudah diterima di lembar evaluasi (sebelumnya HTTP 500).',
  51: 'Daftar kadang tidak memuat data baru untuk sementara: item baru di Master item dan baris penyerahan baru di Issue Lines baru tampil berjam-jam kemudian.',
  52: '"Confirm dispense" menjawab HTTP 500 bila Freeze days diatur atau untuk pasien bernama sama. Selesai 2026-10-31: kini berupa penolakan dengan pesan.',
  53: '"Revert latest stamp" di meja kerja laboratorium gagal ("bad_request"; sebelumnya HTTP 500): langkah terakhir sebuah order tidak bisa dibatalkan.',
  54: 'Dialog Triage di Pasien IGD tidak menawarkan kategori triase, jadi triase tidak bisa disimpan. Muncul 2026-10-29; sejak 2026-11-01 kategori tampil lagi dan test triase berjalan.',
  55: '"Simpan branding" dengan logo yang diunggah gagal ("Failed to save branding."), jadi branding baru tidak bisa tampil di header dan halaman login.',
  56: '"Bayar" saat tidak ada lagi yang harus ditagih gagal dengan error database, dan refund di atas batas juga gagal alih-alih menunggu persetujuan.',
  57: '"Link me" di Profil saya menjawab HTTP 500 untuk akun yang sudah tertaut. Selesai 2026-10-31: kini ditolak dengan "duplicate".',
  58: 'Kadang pasien kedua dengan nama lengkap yang sama tidak bisa didaftarkan ("Registration failed") tanpa alasan; duplikat dan pasien bernama sama dari workbook tidak selalu bisa disiapkan.',
};

/**
 * What kind of problem a blocker is, so a reader sees who has to act:
 * a defect of the site, a feature the site does not have yet (a product decision first),
 * or set-up and test data the shared site lacks.
 */
export type BlockerKind = 'Bug situs' | 'Fitur belum ada' | 'Set-up & data uji';
const KIND_OF: Record<BlockerKind, number[]> = {
  'Bug situs': [1, 2, 3, 5, 6, 7, 10, 11, 15, 16, 17, 23, 24, 25, 27, 28, 30, 31, 32, 35, 36, 38, 39, 40, 41, 42, 43, 44, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58],
  'Fitur belum ada': [8, 9, 19, 20, 21, 22, 26, 29, 33, 34, 37, 45, 47],
  'Set-up & data uji': [4, 12, 13, 14, 18, 46],
};
export const blockerKind = (no: number): BlockerKind | '' =>
  (Object.keys(KIND_OF) as BlockerKind[]).find((k) => KIND_OF[k].includes(no)) ?? '';

/**
 * Blockers whose cause is a server error: the site answers HTTP 500/504 (until 2026-10-30) or an error of the server
 * for a request that is correct ("failed to list donors", "500 stock update failed", time-out, "bad_request").
 * The user's decision of 2026-11-06 ("yang di blocker semisal ada http 500 move ke http 500"): they are reported in
 * docs/qa/http-5xx.md and the summary sheet "HTTP 5xx", not among the blockers. Their test cases stay Blocked.
 */
export const SERVER_ERROR_BLOCKERS = [2, 3, 25, 27, 38, 41, 48, 53, 55];
export const isServerError = (no: number): boolean => SERVER_ERROR_BLOCKERS.includes(no);
/** Where a blocker is described: blocker.md, or http-5xx.md for a server error. */
export const blockerLink = (no: number): string => `${isServerError(no) ? 'http-5xx.md' : 'blocker.md'}#blocker-${no}`;
