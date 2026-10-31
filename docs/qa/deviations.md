# Deviasi: langkah yang berjalan tetapi hasilnya berbeda dari workbook

Dibangun 2026-10-31 17:07 UTC dari `reports/summary/run-summary.json` (hasil terbaru tiap test case dan rantai). Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

Deviasi = langkah **bisa dijalankan**, tetapi yang tampil di site tidak sama dengan *Expected Result* workbook. Di workbook hasil, langkahnya berstatus **Failed** dengan perilaku site di *Actual Result*. Blocker (langkah tidak bisa dijalankan sama sekali) ada di `docs/qa/blockers-found.md`.

**705 deviasi** di **348 test case** dan **15 rantai E2E**.

| Modul | Test case / rantai dengan deviasi | Jumlah deviasi |
|---|---:|---:|
| [01 Rawat Jalan](#01-rawat-jalan) | 34 | 67 |
| [02 Janji Temu](#02-janji-temu) | 13 | 22 |
| [03 Patient Care](#03-patient-care) | 21 | 28 |
| [04 Rawat Inap](#04-rawat-inap) | 22 | 35 |
| [05 Farmasi](#05-farmasi) | 20 | 28 |
| [06 Transfusi Darah](#06-transfusi-darah) | 9 | 13 |
| [07 Persediaan](#07-persediaan) | 21 | 37 |
| [08 Kamar Operasi](#08-kamar-operasi) | 17 | 32 |
| [09 Pengadaan](#09-pengadaan) | 18 | 42 |
| [10 SDM](#10-sdm) | 17 | 39 |
| [11 Laboratorium](#11-laboratorium) | 13 | 29 |
| [12 RIS](#12-ris) | 13 | 21 |
| [13 Diet](#13-diet) | 18 | 54 |
| [14 Hospital Accounts](#14-hospital-accounts) | 14 | 19 |
| [15 IGD](#15-igd) | 17 | 36 |
| [16 MRD](#16-mrd) | 18 | 48 |
| [17 Penggajian](#17-penggajian) | 4 | 8 |
| [18 Settings](#18-settings) | 21 | 52 |
| [19 Finance](#19-finance) | 25 | 44 |
| [20 Anggaran](#20-anggaran) | 5 | 7 |
| [21 CSSD](#21-cssd) | 4 | 11 |
| [22 Services](#22-services) | 1 | 1 |
| [23 Sourcing](#23-sourcing) | 1 | 1 |
| [24 Housekeeping](#24-housekeeping) | 2 | 2 |
| [Rantai E2E](#rantai-e2e) | 15 | 29 |

## 01 Rawat Jalan

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP001-006 | Mendaftarkan bayi baru lahir bersama ibunya | 5 | "Mother" menampilkan MRN dan nama PT-MOM sebagai tautan | "Mother" menampilkan id internal (UUID) sebagai teks biasa |
| TC-APP001-006 | Mendaftarkan bayi baru lahir bersama ibunya | 6 | Dialog berubah ke PT-MOM | tidak ada tautan ibu yang bisa diklik |
| TC-APP001-019 | Kedatangan: nomor diberikan dan pasien dipanggil | 4 | tombol diganti kata "Called" | tombol diganti "Start encounter" (aksi: Start encounter Set MLC Record document) |
| TC-APP001-026 | Hub, navigasi, dan bahasa Indonesia | 1 | tombol "New Registration" | "New Registration" adalah tautan |
| TC-APP001-027 | Orang yang sama didaftarkan dua kali saat kolom duplikat diatur | 1 | Toast "A patient already matches the duplicate fields" | toast "Registration failed" (HTTP 500) |
| TC-APP001-028 | Orang yang sama didaftarkan dua kali dengan pengaturan bawaan | 1 | Peringatan bahwa pasien dengan data ini sudah ada, sebelum atau sebagai ganti penyimpanan | tersimpan tanpa peringatan (toast "Patient registered") |
| TC-APP001-028 | Orang yang sama didaftarkan dua kali dengan pengaturan bawaan | 2 | Satu pasien | dua pasien dengan nama dan tanggal lahir yang sama |
| TC-APP001-029 | Kembar dan nama sama tertahan aturan duplikat | 1 | Petugas melihat pasien yang cocok dan bisa mengonfirmasi bahwa ini orang lain | ditolak dengan toast "Registration failed"; tidak ada cara untuk mengonfirmasi |
| TC-APP001-029 | Kembar dan nama sama tertahan aturan duplikat | 2 | Kedua bayi kembar | hanya kembar pertama (yang kedua tidak bisa disimpan) |
| TC-APP001-030 | MRN yang sudah dipakai atau salah tulis | 1 | Toast "MRN already exists for this tenant" | toast "Registration failed" (HTTP 500) |
| TC-APP001-030 | MRN yang sudah dipakai atau salah tulis | 2 | Pesan bahwa MRN harus berbentuk MRN-YYYY-XXXXXXXX | toast "Registration failed" |
| TC-APP001-031 | MRN yang sama diketik dengan huruf besar/kecil berbeda | 1 | Toast "MRN already exists for this tenant" | toast "Registration failed" (HTTP 500) |
| TC-APP001-032 | Formulir pendaftaran yang belum lengkap | 3 | Pasien tersimpan dengan nama tunggal itu | browser mewajibkan Last name; tidak ada yang tersimpan |
| TC-APP001-033 | Tanggal dan nama di batasnya | 1 | Ditolak: tanggal lahir tidak boleh di masa depan | tersimpan (toast "Patient registered") |
| TC-APP001-033 | Tanggal dan nama di batasnya | 2 | Ditolak, atau peringatan tentang umur | tersimpan tanpa peringatan |
| TC-APP001-033 | Tanggal dan nama di batasnya | 4 | Tersimpan, atau ditolak dengan pesan yang menyebut batas panjang | ditolak dengan toast "Registration failed" (HTTP 500) |
| TC-APP001-034 | Person key dipakai untuk kedua kalinya | 1 | Toast "This person already has an MRN" | toast "Registration failed" (HTTP 500) |
| TC-APP001-034 | Person key dipakai untuk kedua kalinya | 2 | Toast "This person already has an MRN" | toast "Registration failed" (HTTP 500) |
| TC-APP001-034 | Person key dipakai untuk kedua kalinya | 4 | Toast "This person already has an MRN" | tersimpan: pengecekan kunci membedakan huruf besar/kecil |
| TC-APP001-035 | Bayi baru lahir tanpa ibu yang valid | 1 | Toast "Newborn requires a mother" | toast "Registration failed" (HTTP 500) |
| TC-APP001-035 | Bayi baru lahir tanpa ibu yang valid | 2 | Toast "Newborn requires a mother" | toast "Registration failed" (HTTP 500) |
| TC-APP001-035 | Bayi baru lahir tanpa ibu yang valid | 4 | Kolom Mother kosong | kolom Mother masih menampilkan "MRN-2026-A71E4342 QA-AMB Ibu Satu MVWACOUZ008" (ibu sebelumnya) |
| TC-APP001-036 | Batch bencana yang belum lengkap | 1 | Toast "Triage color is unset" | toast "Registration failed" (HTTP 500) |
| TC-APP001-036 | Batch bencana yang belum lengkap | 2 | Pesan bahwa batch bencana butuh minimal dua pasien | toast "Registration failed" (HTTP 500) |
| TC-APP001-036 | Batch bencana yang belum lengkap | 3 | Toast "A patient already matches the duplicate fields" | toast "Registration failed" (HTTP 500) |
| TC-APP001-037 | Jenis kunjungan yang dinonaktifkan | 1 | Tidak ada yang berubah: "New Registration" masih menawarkan "Newborn" | "Newborn" tidak lagi ditawarkan padahal pengaturannya dibatalkan |
| TC-APP001-039 | Mengoreksi pasien terdaftar | 1 | Details with a way to edit | no edit function (buttons: Consent, Renew, Close) |
| TC-APP001-039 | Mengoreksi pasien terdaftar | 3 | Present, with a reason | no way to record a death or remove a record |
| TC-APP001-040 | Data identitas yang tidak ditanyakan formulir | 1 | Kolom-kolomnya ada | jenis kelamin, NIK, alamat, telepon, penjamin, dan nomor asuransi tidak ada di formulir |
| TC-APP001-040 | Data identitas yang tidak ditanyakan formulir | 2 | Ditampilkan di detail dan di daftar | tidak ditampilkan (data seperti itu tidak disimpan) |
| TC-APP001-042 | Penggabungan yang salah dibuat | 1 | Pertanyaan konfirmasi yang menyebut kedua pasien, sebelum ada yang berubah | langsung digabung (toast "Patients merged") |
| TC-APP001-042 | Penggabungan yang salah dibuat | 2 | Pembatalan atau riwayat penggabungan | keduanya tidak ada di Registered Patients |
| TC-APP001-042 | Penggabungan yang salah dibuat | 3 | Kedatangan PT-DUP-B tampil di bawah PT-DUP-A | kedatangan masih menampilkan MRN PT-DUP-B MRN-2026-707F8C2A |
| TC-APP001-043 | Pasien terdaftar di cabang lain | 1 | PT-1 is found | searching PT-1's MRN and name on Kemayoran finds nothing |
| TC-APP001-043 | Pasien terdaftar di cabang lain | 2 | PT-1 is offered | PT-1 is not offered in Book and Arrive on Kemayoran |
| TC-APP001-045 | Kuota harian habis | 2 | Toast "The daily quota is full" | toast bertuliskan "Booking failed", tanpa menyebut kuota |
| TC-APP001-046 | Dua booking di jam buka yang sama | 2 | 08:00 tidak lagi ditawarkan | 08:00 masih ditawarkan dan dipilih pertama |
| TC-APP001-046 | Dua booking di jam buka yang sama | 3 | Peringatan bahwa PT-1 sudah punya janji temu ini | dibooking untuk kedua kalinya (toast "Appointment booked") |
| TC-APP001-047 | Booking untuk hari yang sudah lewat | 1 | Hari yang sudah lewat tidak bisa dipilih, atau tidak ada jam buka yang ditawarkan | 2026-10-30 bisa dipilih dan menawarkan 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 |
| TC-APP001-048 | Formulir booking yang belum lengkap | 2 | Pesan bahwa departemen belum diisi | klik tidak berbuat apa-apa: tanpa pesan, dialog tetap terbuka |
| TC-APP001-048 | Formulir booking yang belum lengkap | 3 | Pesan bahwa departemen belum diisi | klik tidak berbuat apa-apa: tanpa pesan, dialog tetap terbuka |
| TC-APP001-049 | Penjadwalan ulang yang harus ditolak | 3 | Refused: a cancelled appointment cannot be moved | ditolak dengan toast "Booking failed" |
| TC-APP001-050 | Membatalkan tanpa konfirmasi atau alasan | 1 | Pertanyaan konfirmasi, dengan tempat untuk alasan | langsung dibatalkan: tanpa konfirmasi, tanpa alasan |
| TC-APP001-050 | Membatalkan tanpa konfirmasi atau alasan | 2 | Ada, atau catatan bahwa harus dibooking ulang | tidak ada cara mengembalikannya dan tidak ada catatan |
| TC-APP001-050 | Membatalkan tanpa konfirmasi atau alasan | 3 | Ditolak | ditolak dengan toast "Booking failed" |
| TC-APP001-051 | Pengaturan booking yang tidak valid | 1 | Ditolak dengan pesan tentang nama yang berulang | ditolak dengan toast "Booking failed" |
| TC-APP001-051 | Pengaturan booking yang tidak valid | 2 | Tombol hapus di setiap baris | tidak ada tombol hapus; baris dihapus dengan mengosongkan namanya |
| TC-APP001-051 | Pengaturan booking yang tidak valid | 3 | Ditolak dengan pesan untuk setiap baris | browser menghentikan simpan di kolom "Max per day" (minimum 1); baris jam tidak mendapat pesan |
| TC-APP001-051 | Pengaturan booking yang tidak valid | 4 | Ditolak: satu kuota per konsultan | ditolak dengan toast "" |
| TC-APP001-052 | Blokir yang salah atau harus dicabut | 1 | Ditolak dengan pesan tentang waktu | ditolak dengan toast "Booking failed" |
| TC-APP001-052 | Blokir yang salah atau harus dicabut | 2 | Peringatan bahwa PT-1 sudah dibooking di waktu itu | diblokir tanpa peringatan; PT-1 tetap terbooking |
| TC-APP001-052 | Blokir yang salah atau harus dicabut | 3 | Blokir tercantum dan bisa dihapus | tidak ada daftar blokir dan tidak ada cara menghapusnya |
| TC-APP001-054 | Rentang tanggal terlalu panjang atau terbalik | 3 | Pesan bahwa tanggal From setelah tanggal To | tidak ada pesan; daftar kosong ("No appointments in this view.") |
| TC-APP001-056 | Formulir kedatangan: pasien sudah menunggu, departemen belum dipilih | 1 | Toast "This patient is already waiting in that department". Tidak ada nomor baru | toast "Arrival failed" |
| TC-APP001-056 | Formulir kedatangan: pasien sudah menunggu, departemen belum dipilih | 3 | Tombol nonaktif sampai departemen dipilih | "Arrive" aktif; kolom yang kosong sudah berisi departemen (id terisi) |
| TC-APP001-057 | Memanggil dua kali, di luar giliran, atau karena salah | 2 | Peringatan bahwa 002 sebelum 003, atau panggilan tidak ditawarkan | 003 dipanggil tanpa peringatan |
| TC-APP001-057 | Memanggil dua kali, di luar giliran, atau karena salah | 3 | Ada: panggil lagi, tandai tidak hadir, akhiri kunjungan, batalkan panggilan | baris menawarkan Start encounter, Set MLC, Record document, Call |
| TC-APP001-060 | Yang ditampilkan papan antrean umum | 1 | Nama pasien disingkat atau disembunyikan, dan tanpa MRN | nama lengkap "QA-AMB Pasien Satu MVWK3JL2004" dan MRN ditampilkan |
| TC-APP001-060 | Yang ditampilkan papan antrean umum | 2 | Kata seperti "Waiting" | Status "A" |
| TC-APP001-060 | Yang ditampilkan papan antrean umum | 3 | Papan tidak berubah | baris untuk booking 2026-11-09 langsung muncul, dengan token, nama, dan MRN |
| TC-APP001-062 | User tanpa peran front desk membaca register | 1 | Tidak ada kartu "Ambulatory Care", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/registration |
| TC-APP001-062 | User tanpa peran front desk membaca register | 2 | Akses ditolak | U3 (tanpa hak) membaca /id/registration/patients ("Registered Patients", 10 baris) |
| TC-APP001-062 | User tanpa peran front desk membaca register | 3 | Akses ditolak | U3 (tanpa hak) membaca /id/registration/appointments ("Appointments", 1 baris) dan /id/registration/department-queue ("Arrival", 10 baris) |
| TC-APP001-065 | Membuka register tanpa login | 3 | Halaman yang diminta | setelah login: /id/login |
| TC-APP001-068 | Klik ganda, dua petugas sekaligus, dan muat ulang | 2 | Satu tersimpan; yang lain mendapat "MRN already exists for this tenant" | 0 tersimpan |
| TC-APP001-068 | Klik ganda, dua petugas sekaligus, dan muat ulang | 4 | Isian disimpan, atau petugas diberi peringatan sebelum keluar | formulir yang setengah terisi hilang tanpa peringatan |
| TC-APP001-071 | Tanpa privilege tulis: "Tambah" | 1 | Ditolak karena tidak punya hak | disimpan oleh U3 |

## 02 Janji Temu

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP002-009 | Kuota harian habis | 2 | Toast "The daily quota is full" | toast bertuliskan "Booking failed", tanpa menyebut kuota |
| TC-APP002-010 | Dua booking di jam buka yang sama | 2 | 08:00 tidak lagi ditawarkan | 08:00 masih ditawarkan dan dipilih pertama |
| TC-APP002-010 | Dua booking di jam buka yang sama | 3 | Peringatan bahwa PT-1 sudah punya janji temu ini | dibooking untuk kedua kalinya (toast "Appointment booked") |
| TC-APP002-011 | Booking untuk hari yang sudah lewat | 1 | Hari yang sudah lewat tidak bisa dipilih, atau tidak ada jam buka yang ditawarkan | 2026-10-30 bisa dipilih dan menawarkan 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 |
| TC-APP002-012 | Formulir booking yang belum lengkap | 2 | Pesan bahwa departemen belum diisi | klik tidak berbuat apa-apa: tanpa pesan, dialog tetap terbuka |
| TC-APP002-012 | Formulir booking yang belum lengkap | 3 | Pesan bahwa departemen belum diisi | klik tidak berbuat apa-apa: tanpa pesan, dialog tetap terbuka |
| TC-APP002-013 | Penjadwalan ulang yang harus ditolak | 3 | Refused: a cancelled appointment cannot be moved | ditolak dengan toast "Booking failed" |
| TC-APP002-014 | Membatalkan tanpa konfirmasi atau alasan | 1 | Pertanyaan konfirmasi, dengan tempat untuk alasan | langsung dibatalkan: tanpa konfirmasi, tanpa alasan |
| TC-APP002-014 | Membatalkan tanpa konfirmasi atau alasan | 2 | Ada, atau catatan bahwa harus dibooking ulang | tidak ada cara mengembalikannya dan tidak ada catatan |
| TC-APP002-014 | Membatalkan tanpa konfirmasi atau alasan | 3 | Ditolak | ditolak dengan toast "Booking failed" |
| TC-APP002-015 | Pengaturan booking yang tidak valid | 1 | Ditolak dengan pesan tentang nama yang berulang | ditolak dengan toast "Booking failed" |
| TC-APP002-015 | Pengaturan booking yang tidak valid | 2 | Tombol hapus di setiap baris | tidak ada tombol hapus; baris dihapus dengan mengosongkan namanya |
| TC-APP002-015 | Pengaturan booking yang tidak valid | 3 | Ditolak dengan pesan untuk setiap baris | browser menghentikan simpan di kolom "Max per day" (minimum 1); baris jam tidak mendapat pesan |
| TC-APP002-015 | Pengaturan booking yang tidak valid | 4 | Ditolak: satu kuota per konsultan | ditolak dengan toast "" |
| TC-APP002-016 | Blokir yang salah atau harus dicabut | 1 | Ditolak dengan pesan tentang waktu | ditolak dengan toast "Booking failed" |
| TC-APP002-016 | Blokir yang salah atau harus dicabut | 2 | Peringatan bahwa PT-1 sudah dibooking di waktu itu | diblokir tanpa peringatan; PT-1 tetap terbooking |
| TC-APP002-016 | Blokir yang salah atau harus dicabut | 3 | Blokir tercantum dan bisa dihapus | tidak ada daftar blokir dan tidak ada cara menghapusnya |
| TC-APP002-018 | Rentang tanggal terlalu panjang atau terbalik | 3 | Pesan bahwa tanggal From setelah tanggal To | tidak ada pesan; daftar kosong ("No appointments in this view.") |
| TC-APP002-020 | Kode atau nama sudah dipakai | 1 | Toast "That code or name is already used"; the dialog stays open; no second row | toast "Saved"; dialog closes |
| TC-APP002-021 | Kode atau nama kosong | 2 | Toast "Save failed"; tidak ada baris yang ditambahkan | toast "Saved": jenis yang kode dan namanya hanya spasi tersimpan (25 baris, sebelumnya 25) |
| TC-APP002-024 | Kode atau nama sudah dipakai | 1 | Toast "That code or name is already used"; the dialog stays open; no second row | toast "Saved"; dialog closes |
| TC-APP002-025 | Kode atau nama kosong | 2 | Toast "Save failed"; tidak ada baris yang ditambahkan | toast "Saved": jenis yang kode dan namanya hanya spasi tersimpan (25 baris, sebelumnya 25) |

## 03 Patient Care

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP003-001 | Membuka konsultasi untuk pasien | 3 | Panel kiri: nama, MRN, dan "DOB" | nama dan MRN; tanpa tanggal lahir |
| TC-APP003-002 | Order obat tunggal sampai ke farmasi | 4 | Sisa 10 | Sisa menunjukkan "10 / 10" |
| TC-APP003-014 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Open Consultation" | "Open Consultation" adalah tautan |
| TC-APP003-016 | Formulir order yang belum lengkap | 3 | Kolom yang kosong ditandai | tidak ada kolom yang ditandai dan tidak ada pesan; "Submit order" hanya nonaktif |
| TC-APP003-020 | Dokter mengotorisasi order terbatasnya sendiri | 1 | Ditolak: yang mengorder tidak boleh mengotorisasi | langsung diotorisasi (toast "Order authorised.") |
| TC-APP003-021 | Order terbatas pasien lain di daftar | 1 | Hanya order PT-1 yang menunggu | daftar juga menampilkan 3 order pasien lain, hanya dengan nama (mis. "QA-PCR Pasien Satu MVWKJZQZ002 — Meropenem 1g Injection") |
| TC-APP003-022 | Catatan SOAP saat pasien dibuka lagi | 1 | Tab SOAP menampilkan teks yang tersimpan | keempat area kosong |
| TC-APP003-022 | Catatan SOAP saat pasien dibuka lagi | 2 | Tab SOAP menampilkan teks yang tersimpan | keempat area kosong |
| TC-APP003-023 | Catatan SOAP sebagai rekam medis | 2 | Catatan kedua; catatan sebelumnya disimpan dengan tanggal dan penulisnya | Dokter 2 tidak melihat catatan sebelumnya: draf hanya tersimpan di sesi pertama |
| TC-APP003-023 | Catatan SOAP sebagai rekam medis | 3 | Kontrol tanda tangan atau finalisasi, setelah itu catatan hanya bisa dibaca | tidak ada kontrol tanda tangan atau finalisasi di SOAP |
| TC-APP003-025 | Tanda vital dan diagnosis | 2 | Formulir tanda vital | tidak ada tempat untuk mencatat tanda vital di Consultation |
| TC-APP003-025 | Tanda vital dan diagnosis | 3 | Kolom atau daftar diagnosis | tidak ada diagnosis berkode di Consultation |
| TC-APP003-026 | Mengorder obat yang membuat pasien alergi | 1 | Peringatan alergi | tidak ada peringatan alergi (toast "No drug interactions detected.") |
| TC-APP003-026 | Mengorder obat yang membuat pasien alergi | 2 | Order diblokir atau butuh pengakuan | langsung diorder (toast "Order placed.") |
| TC-APP003-027 | Dua pasien dengan nama yang sama | 2 | Baris yang menunjukkan order itu untuk pasien yang mana dari keduanya | baris hanya menyebut pasien, tanpa MRN |
| TC-APP003-028 | Nama obat salah eja | 1 | Saran dari daftar obat | tidak ada daftar obat yang cocok |
| TC-APP003-028 | Nama obat salah eja | 2 | Salah eja ditolak atau dikoreksi | order dibuat dengan "Paracetmol 500 mg tab" |
| TC-APP003-030 | Resep hanya terkirim sebagian | 1 | Kedua baris ditolak bersama, dengan alasannya | 1 baris terkirim, 1 tersisa di daftar; toast "placeOrder: 400 clinical: invalid order: strength is too long" |
| TC-APP003-031 | Membatalkan atau mengoreksi order yang salah | 1 | The order with a Cancel or Edit control | the order is listed under "Drug orders" with no Cancel or Edit |
| TC-APP003-032 | Order pasien sebelumnya | 1 | Daftar order pasien dengan tanggal, obat, jumlah, dan status | daftar menampilkan "Paracetamol 500mg Tablet" |
| TC-APP003-033 | Order yang sama dikirim dua kali | 2 | Peringatan bahwa obat yang sama baru saja diorder untuk pasien ini | diorder lagi tanpa peringatan |
| TC-APP003-033 | Order yang sama dikirim dua kali | 3 | Satu baris | 2 baris |
| TC-APP003-034 | Order lab tanpa pasien | 1 | Nama dan MRN pasien pada order | order tidak punya pasien |
| TC-APP003-036 | User tanpa peran klinis membuka konsultasi | 1 | Tidak ada kartu "Patient Care", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/clinical |
| TC-APP003-036 | User tanpa peran klinis membuka konsultasi | 2 | Akses ditolak | U3 (tanpa hak) membaca /clinical/consultation ("Consultation", 0 baris; pencarian pasien menawarkan 8 pasien) |
| TC-APP003-040 | Sesi habis atau halaman dimuat ulang saat konsultasi | 1 | Isian disimpan, atau dokter diberi peringatan sebelum keluar | halaman kembali ke layar kosong "Select patient" tanpa peringatan |
| TC-APP003-051 | Order radiologi tanpa pasien | 1 | Nama dan MRN pasien pada order | baris order tidak punya pasien: "RAD-1793461715 QA Foto toraks PA MVWKLNRE010 — — — —" |
| TC-APP003-053 | Kontrol ulang tanpa catatan | 1 | Browser meminta catatan (kolom wajib); tidak ada yang dikirim | "Save" tetap nonaktif selama Note kosong; tidak ada yang bisa dikirim |

## 04 Rawat Inap

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP004-004 | Memasukkan pasien ke tempat tidur kosong | 2 | Petunjuk "Bed no or description…" | petunjuk "No. atau deskripsi…" |
| TC-APP004-008 | Daftar rawat inap: pencarian, urutan, halaman, dan sensus | 5 | Masuk rawat terbaru di atas | daftar tetap berurutan menurut nama pasien |
| TC-APP004-012 | Memulangkan pasien | 1 | "Configured chain has 7 steps" (rantai data awal) | rantai yang dikonfigurasi punya 1 langkah |
| TC-APP004-016 | Bangsal menolak pengantaran | 2 | Baris grup yang sudah dikeluarkan diretur penuh | tidak ada baris Paracetamol 500mg Tablet di Issue Lines yang menunjukkan Issued 10 dan Returned 10 |
| TC-APP004-020 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Open admissions" | "Open admissions" adalah tautan |
| TC-APP004-021 | Memasukkan orang yang bukan pasien terdaftar | 1 | Pencarian pasien terdaftar menurut MRN atau nama, bukan kolom teks bebas | "Patient name" adalah kolom teks bebas |
| TC-APP004-021 | Memasukkan orang yang bukan pasien terdaftar | 2 | Ditolak: orang tersebut harus didaftarkan dulu | dimasukkan (toast "Patient admitted") |
| TC-APP004-021 | Memasukkan orang yang bukan pasien terdaftar | 3 | MRN ditampilkan bersama nama | rawat inap tidak punya MRN |
| TC-APP004-024 | Pasien yang sama dimasukkan dua kali | 1 | Peringatan bahwa pasien ini sudah punya rawat inap terbuka di QA-0D43DDQBW-10102 | dimasukkan untuk kedua kalinya tanpa peringatan |
| TC-APP004-024 | Pasien yang sama dimasukkan dua kali | 2 | PT-1 di satu tempat tidur | 2 rawat inap terbuka |
| TC-APP004-025 | Formulir masuk rawat yang belum lengkap | 3 | Ditolak dengan pesan yang menyebut batas panjang | ditolak dengan "failed to admit" |
| TC-APP004-028 | Nomor tempat tidur dipakai dua kali atau dibiarkan kosong | 1 | Ditolak: nomor sudah dipakai di cabang ini | tempat tidur kedua dengan nomor yang sama tersimpan (toast "Bed created") |
| TC-APP004-028 | Nomor tempat tidur dipakai dua kali atau dibiarkan kosong | 3 | Pesan bahwa nomor tempat tidur belum diisi | tidak terjadi apa-apa: tanpa pesan, dialog tetap terbuka |
| TC-APP004-030 | Centang lintas gender pada tempat tidur | 1 | Centang ditampilkan untuk setiap tempat tidur | daftar tempat tidur dan dialog masuk rawat tidak menampilkan "Cross-gender" |
| TC-APP004-030 | Centang lintas gender pada tempat tidur | 2 | Dialog menanyakan atau mengetahui jenis kelamin pasien dan mencocokkannya dengan ruangan | wizard hanya menanyakan nama dan nomor (2 kolom), tanpa jenis kelamin |
| TC-APP004-031 | Data masuk rawat yang tidak ditanyakan formulir | 1 | Kolom-kolomnya ada | hanya nama pasien, nomor masuk rawat, dan tempat tidur yang ditanyakan |
| TC-APP004-031 | Data masuk rawat yang tidak ditanyakan formulir | 2 | Waktu masuk rawat bisa diatur ke waktu sebenarnya | tidak ada kolom waktu: waktu masuk rawat adalah saat menyimpan |
| TC-APP004-032 | Masuk atau pulang yang salah dibuat | 1 | Aksi batal dengan alasan | tidak ada batal; "Discharge" nonaktif tanpa tempat tidur |
| TC-APP004-032 | Masuk atau pulang yang salah dibuat | 3 | Aksi buka kembali, atau catatan bahwa pasien harus dimasukkan lagi | hanya tombol barcode yang tersisa |
| TC-APP004-033 | Nomor masuk dan nomor pulang | 1 | Ditolak: nomor sedang dipakai | dimasukkan dengan QA-RI-84Q004 untuk kedua kalinya |
| TC-APP004-033 | Nomor masuk dan nomor pulang | 2 | Dua nomor yang berbeda | keduanya mendapat ADM-1793464796 |
| TC-APP004-038 | Tagihan ditandai lunas tanpa tagihan yang diselesaikan | 1 | Ditolak: tagihan belum lunas, atau hanya kasir yang boleh melakukan ini | perawat menandai tagihan lunas |
| TC-APP004-038 | Tagihan ditandai lunas tanpa tagihan yang diselesaikan | 3 | Ada: cara untuk menarik kembali tanda yang salah | baris menawarkan , , Discharge |
| TC-APP004-042 | Pulang berlaku sebelum disetujui | 1 | Rawat inap menunjukkan ada kepulangan yang menunggu persetujuan; pasien masih menempati tempat tidur | rawat inap langsung bertuliskan "Discharged" |
| TC-APP004-043 | Isi catatan pulang | 1 | Nama dan nomor masuk rawat pasien ditampilkan dan bisa dicari | kolom Discharge no, Admitted, Discharged, Length of stay; tanpa pencarian |
| TC-APP004-043 | Isi catatan pulang | 2 | Ditampilkan | tidak ada tempat tidur, user, atau cara keluar di daftar |
| TC-APP004-043 | Isi catatan pulang | 3 | Bisa diisi | dialog hanya menanyakan nomor pulang yang opsional |
| TC-APP004-050 | User tanpa peran bangsal membaca rawat inap | 1 | Tidak ada kartu "Inpatient", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/adt |
| TC-APP004-050 | User tanpa peran bangsal membaca rawat inap | 2 | Akses ditolak | U3 (tanpa hak) membaca /adt/admissions ("Admissions", 10 baris) |
| TC-APP004-050 | User tanpa peran bangsal membaca rawat inap | 3 | Akses ditolak | U3 (tanpa hak) membaca /adt/beds ("Bed management", 10 baris) dan /adt/discharges ("Discharges", 10 baris) |
| TC-APP004-055 | Klik ganda, dua perawat sekaligus, dan muat ulang | 3 | Isian disimpan, atau perawat diberi peringatan sebelum keluar | wizard hilang tanpa peringatan |
| TC-APP004-058 | Memasukkan pasien ke daftar tunggu masuk rawat | 1 | Kolom "Branch" | tidak ada kolom Branch (U1 bekerja di satu cabang) |
| TC-APP004-060 | Permintaan dengan jenis nonaktif | 1 | Jenis yang tampil dengan "(No)" bisa dipilih | jenis nonaktif tidak ditawarkan |
| TC-APP004-061 | Permintaan dengan semua cabang aktif | 1 | Toast "Failed to save"; tidak ada yang dikirim | tidak ada yang dikirim dan tidak ada pesan |
| TC-APP004-077 | Mencatat dosis di bangsal | 2 | "Branch", "Patient", "Order", "Status", dan "Reason" | tidak ada kolom "Branch" (U1 bekerja di satu cabang) |

## 05 Farmasi

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP005-001 | Apoteker menyerahkan resep rawat jalan secara penuh | 1 | Sisa 10 | Sisa menunjukkan "10 / 10" (sisa / diorder) |
| TC-APP005-001 | Apoteker menyerahkan resep rawat jalan secara penuh | 7 | Cabang BR-A saat Confirm | Confirm menampilkan gudang dan ringkasan; tanpa cabang |
| TC-APP005-001 | Apoteker menyerahkan resep rawat jalan secara penuh | 9 | Kembali ke Orders | Done tetap di /id/pharmacy/dispense |
| TC-APP005-005 | Suplai bangsal: perawat mengelompokkan order, apoteker menyerahkan, bangsal menerima | 4 | Memilih grup di "Ward group": hanya order yang dikelompokkan yang tercantum | pilihannya tidak menyebut grup (1 · Kelompok bangsal, 2 · Kelompok bangsal), jadi grup test ini tidak bisa dibedakan; order dibuka dari barisnya |
| TC-APP005-006 | Bangsal menolak pengantaran | 2 | Baris OR-IP menunjukkan Returned sama dengan Issued; kontrol Return menunjukkan "—" | tidak ada baris Paracetamol 500mg Tablet di Issue Lines yang menunjukkan Issued dan Returned 6 |
| TC-APP005-007 | Penjualan konter ke pasien terdaftar | 8 | Wizard kosong dan siap untuk penjualan berikutnya | item dikosongkan tetapi pasien tetap terpilih ("QA-PHA Pasien Satu MVWAEN28003 MRN MRN-2026-5A2FA4BF") |
| TC-APP005-009 | Beberapa item dalam satu penjualan, lalu label | 6 | Wizard kosong | item dikosongkan tetapi pasien tetap terpilih |
| TC-APP005-014 | Penjualan muncul di kasir dan di Finance | 3 | Satu voucher penjualan yang merujuk ke invoice RX-f248b0b5 | voucher SV- terbaru tidak menyebut RX-f248b0b5: "SV-f8763bc8-ee91-49d3-888a-833a9b519254 Sales Close Doc date 2026-10-31 Voucher value IDR 13.875,00 Party QA-PHA Pasien Satu MVW7T649003 Status Posted Narration" |
| TC-APP005-020 | Kepala apoteker yang bekerja di "All branches" | 2 | Toast "Choose a branch before confirming the dispense." | "Please select an item in the list." |
| TC-APP005-020 | Kepala apoteker yang bekerja di "All branches" | 3 | Hanya gudang BR-A | daftar Store tidak disaring menurut cabang: FI01-00-00 (BR-A) juga ditawarkan untuk Kemayoran (4 gudang untuk Podomoro, 4 untuk Kemayoran) |
| TC-APP005-022 | Seluruh alur dalam bahasa Indonesia | 1 | Judul, deskripsi, kartu, sidebar, dan breadcrumb berbahasa Indonesia | judul "Pharmacy", "Orders, dispense & issue lines" tetap berbahasa Inggris (risiko yang sudah diketahui) |
| TC-APP005-024 | Hub dan navigasi | 1 | Tombol Dispense | "Dispense" adalah tautan |
| TC-APP005-024 | Hub dan navigasi | 2 | Sidebar menampilkan 3 item | 9 item: Orders, Catalogue, Alerts, Estimate, Patient issues, Price & TPN, Dose record, Dispense, Issue Lines |
| TC-APP005-028 | Dua pasien dengan nama yang sama, salah satunya rawat inap | 3 | Penjualan untuk PT-2 berhasil | ditolak: "advanceDispense: 400 Patient has been admitted" (PT-3 dengan nama yang sama sedang rawat inap) |
| TC-APP005-030 | Pasien dengan alergi obat yang sudah tercatat | 2 | Peringatan alergi untuk Paracetamol | "Drug order alerts" bertuliskan: Tinjau blok keras dan peringatan lunak sebelum konfirmasi.sandbox No drug interactions detected for this order. |
| TC-APP005-030 | Pasien dengan alergi obat yang sudah tercatat | 3 | Confirm diblokir atau butuh pengakuan | "Confirm dispense" aktif |
| TC-APP005-033 | Stok kedaluwarsa dan hampir kedaluwarsa | 6 | Toast konfirmasi | ditolak ("advanceDispense: 400 pharmacy: not enough stock inventory: not enough stock (QA-FRZ-MVW7MXG8007)"): dengan Freeze days 29, batch yang kedaluwarsa dalam 30 hari masih ditahan |
| TC-APP005-034 | Memilih gudang | 3 | Toast "Choose a store this visit may dispense from." | "Confirm dispense" is disabled while Store is empty |
| TC-APP005-045 | User tanpa peran farmasi melihat order dan issue lines | 1 | Tidak ada kartu "Pharmacy", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/pharmacy |
| TC-APP005-045 | User tanpa peran farmasi melihat order dan issue lines | 2 | Akses ditolak | U3 (tanpa hak) membaca /pharmacy/orders ("Orders", 25 baris) |
| TC-APP005-045 | User tanpa peran farmasi melihat order dan issue lines | 3 | Akses ditolak | U3 (tanpa hak) membaca /pharmacy/issue-lines ("Issue Lines", 25 baris) |
| TC-APP005-046 | Apoteker hanya melihat dan mengubah cabangnya sendiri | 5 | Hanya gudang Podomoro | gudang Kemayoran ditawarkan ke U1: FB-DRI, FI01-01-01, FE03-00-02 |
| TC-APP005-049 | Pesan yang dilihat apoteker saat penjualan ditolak | 1 | Kalimat pendek tanpa istilah teknis | teks server mentah: advanceDispense: 400 pharmacy: not enough stock inventory: not enough stock (QA-PARA-MVWAEN2800P); advanceDispense: 400 Patient has been admitted |
| TC-APP005-049 | Pesan yang dilihat apoteker saat penjualan ditolak | 2 | Kalimat yang sama dalam bahasa Indonesia | Teks server berbahasa Inggris: advanceDispense: 400 pharmacy: not enough stock inventory: not enough stock (QA-PARA-MVWAEN2800P); advanceDispense: 400 Patient has been admitted |
| TC-APP005-051 | Menambah obat generik dan frekuensi dosis ke katalog | 1 | Farmasi punya "Catalogue" | hub Pharmacy tidak punya "Catalogue" (tautan: Home, Apps, Dispense, Orders, Dispense, Issue Lines); /pharmacy/catalogue dibuka lewat alamatnya |
| TC-APP005-054 | Menambah aturan peringatan dan jenis vaksin | 1 | Farmasi punya "Alerts" | hub Pharmacy tidak punya "Alerts" (tautan: Home, Ambulatory Care Pendaftaran pasien, check-in, MRN, Appointment Jadwal, reschedule, blok konsultan, Patient Care SOAP, vitals, diagnosis, Inpatient Admission, transfer, discharge, Pharmacy Dispense, OTC, retur, Transfusion Medicine Donor, crossmatch, issue, Inventory Stok, GRN, mutasi, Operation Theater Jadwal & konsumsi OT, Procurement PR, PO, tender, HR Karyawan & cuti, Laboratory Sampel, hasil, sertifikasi, RIS Order & jadwal modality, Dietary Diet pasien rawat inap, Hospital Accounts Invoice, deposit, kasir, Emergency Triage & bay IGD, MRD Berkas & peminjaman RM, Payroll Gaji & payslip, Settings Master Data — sites, departments, service centers, Finance Voucher & GL, Budget Ceilings, allocation, sanction, CSSD Set steril, siklus, distribusi, Services Jasa internal, tanpa stok, Sourcing Tender sampai perjanjian, Housekeeping Lokasi, kontrak, catatan, tagihan, Linen Toko, resep, sirkulasi, Maintenance Rencana, perintah kerja, AMC, Fixed assets Register, susut, penitipan); /pharmacy/alerts dibuka lewat alamatnya |
| TC-APP005-060 | Melihat apa saja yang dikeluarkan untuk satu pasien | 2 | Blok mencantumkan nama item dengan jumlah yang dikeluarkan | tidak ada yang tercantum untuk nama atau MRN ("QA-PHA Pasien Satu MVWLDNCG007": toast "Saved", Nothing here yet.; "MRN-2026-90B35B54": toast "Saved", Nothing here yet.) |
| TC-APP005-063 | Mencatat dosis di Farmasi | 2 | Kolom "Branch", "Patient", "Order", "Status", dan "Reason" | tidak ada kolom "Branch" |

## 06 Transfusi Darah

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP006-020 | Permintaan darah yang ditulis dokter | 4 | Formulir menampilkan nomor permintaan dan status "Approved" | statusnya "Pending" (butuh persetujuan lewat "Approve") |
| TC-APP006-032 | Hub, navigasi, dan bahasa Indonesia | 1 | A button "New request" | "New request" is a link |
| TC-APP006-047 | Tes infeksi mana yang melepas unit | 2 | A message that the test list must be set up first | no such message; the dialog shows no test line |
| TC-APP006-049 | Kantong masuk stok lewat penerimaan biasa | 2 | Status "Unscreened", dengan "Group" dan "Serology" belum dikerjakan | Status "Available" (tombol: Group, Serology, Separate, Discard, Convert, Send out) |
| TC-APP006-052 | Permintaan yang harus ditolak | 2 | Ditolak: "department is required" | "bloodbank: invalid input: component is required" |
| TC-APP006-052 | Permintaan yang harus ditolak | 6 | Ditolak: "component has no service mapping" | "bloodbank: invalid input: required-by date is in the past" |
| TC-APP006-053 | Permintaan disetujui oleh pembuatnya sendiri | 4 | Status langsung "Approved" | permintaan dari Doctor "Pending" seperti yang lain |
| TC-APP006-055 | Golongan darah pasien diketik manual | 1 | Golongan diisi dari sampel pasien yang sudah diperiksa, atau hanya bisa diisi dengan pemeriksaan kedua | kolom teks bebas, kosong, tersimpan dengan satu klik |
| TC-APP006-055 | Golongan darah pasien diketik manual | 2 | Ditolak, atau dicek terhadap golongan pasien ini sebelumnya | tersimpan (toast "Group saved") |
| TC-APP006-062 | Nilai kendali mutu di luar batas | 1 | Toast "Quality control saved"; baris ditandai gagal | ditolak: "bloodbank: invalid input: value is outside the limit" |
| TC-APP006-064 | User tanpa peran bank darah membaca data donor dan pasien | 1 | Tidak ada kartu "Transfusion Medicine", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/bloodbank |
| TC-APP006-064 | User tanpa peran bank darah membaca data donor dan pasien | 2 | Akses ditolak | U3 (tanpa hak) membaca /bloodbank/donors ("", 0 baris) |
| TC-APP006-064 | User tanpa peran bank darah membaca data donor dan pasien | 3 | Akses ditolak | U3 (tanpa hak) membaca /bloodbank/stock ("Stock", 10 baris) dan /bloodbank/requisitions ("Blood request", 20 baris) |

## 07 Persediaan

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP007-006 | Stok tersedia per gudang dan batch | 1 | Dua baris, masing-masing dengan kode gudang, kode batch, jumlah, dan tanggal kedaluwarsa | "Stock on hand" bertuliskan: Stock on hand No batches for this item yet. Add batch |
| TC-APP007-013 | Gudang yang bekerja di "All branches" | 4 | Toast "Choose a branch before creating a stock request." | "Please select an item in the list." |
| TC-APP007-015 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Item Master" | "Item Master" adalah tautan |
| TC-APP007-016 | Formulir item yang belum lengkap atau tidak valid | 2 | Ditolak: kode sudah dipakai | toast "Failed to save item." |
| TC-APP007-016 | Formulir item yang belum lengkap atau tidak valid | 3 | Ditolak: minimum di atas maksimum | toast "Failed to save item." |
| TC-APP007-016 | Formulir item yang belum lengkap atau tidak valid | 4 | Ditolak: nilai tidak boleh negatif | toast "Failed to save item." |
| TC-APP007-017 | Mengubah kode item, atau menonaktifkan item yang masih ada stoknya | 1 | Ditolak, atau peringatan bahwa item masih ada di stok | kode diubah tanpa peringatan |
| TC-APP007-017 | Mengubah kode item, atau menonaktifkan item yang masih ada stoknya | 2 | Peringatan bahwa 100 masih ada di stok | toast "Item updated." |
| TC-APP007-018 | Centang Batch tracked dan Serialized | 1 | Nomor seri diminta untuk setiap unit | kolom batch, kedaluwarsa, dan jumlah yang sama seperti item lain |
| TC-APP007-019 | Pencarian di daftar item yang panjang | 1 | Item tercantum | tidak tercantum: pencarian hanya menyaring baris di halaman yang tampil |
| TC-APP007-020 | Formulir batch yang belum lengkap atau tidak valid | 3 | Ditolak dengan pesan yang menyebut batas 64 | toast "receiveStockBatch: 400 inventory: invalid stock" |
| TC-APP007-021 | Batch yang sudah kedaluwarsa saat diterima | 1 | Ditolak: batch sudah kedaluwarsa | tersimpan (toast "Batch quantity added.") |
| TC-APP007-021 | Batch yang sudah kedaluwarsa saat diterima | 2 | Batch tidak tercantum | batch kedaluwarsa tercantum di bawah "Stock on hand" |
| TC-APP007-022 | Kedaluwarsa batch berubah karena diterima lagi | 1 | Ditolak: batch ini ada di stok dengan tanggal kedaluwarsa lain | diterima (toast "Batch quantity added.") |
| TC-APP007-022 | Kedaluwarsa batch berubah karena diterima lagi | 2 | QA-B002: 50, kedaluwarsa dalam 20 hari | baris bertuliskan "FI01-00-00 · QA-B002-MVWJZP2E00J 51 · 2028-10-30" |
| TC-APP007-023 | Mengoreksi stok: penyesuaian, penghapusan, dan stock opname | 1 | Penyesuaian dengan jumlah dan alasan | dialog hanya menawarkan: Add batch, Add component, Save kit, Cancel, Save |
| TC-APP007-023 | Mengoreksi stok: penyesuaian, penghapusan, dan stock opname | 2 | Pembalikan atau edit penerimaan | tidak ada pada item |
| TC-APP007-023 | Mengoreksi stok: penyesuaian, penghapusan, dan stock opname | 3 | Pelepasan dengan alasan | tidak ada pada item |
| TC-APP007-025 | Memindahkan stok antargudang | 1 | Transfer dengan asal, tujuan, batch, dan jumlah | tidak ada transfer di hub Inventory (tautan: Home, Apps, Item Master, Item Master, Stock Requests, Stores, Stock book); Store documents punya dokumen "transfer" (TC-APP007-045) |
| TC-APP007-026 | Permintaan stok tanpa baris item | 2 | Ditolak: permintaan butuh minimal satu item | dibuat dengan Remarks kosong |
| TC-APP007-026 | Permintaan stok tanpa baris item | 3 | Ditolak, atau dipenuhi sebagian: hanya 100 yang ada di stok | dipenuhi (toast "Stock request fulfilled."): tidak ada yang membaca keterangannya |
| TC-APP007-027 | Langkah permintaan stok yang harus ditolak | 1 | Ditolak: harus disetujui user lain | pembuat menyetujui permintaannya sendiri |
| TC-APP007-027 | Langkah permintaan stok yang harus ditolak | 3 | Keduanya ditawarkan | tidak ditawarkan: "Reject" pada permintaan yang menunggu dan "Cancel" pada yang terbuka |
| TC-APP007-028 | Formulir permintaan stok di batasnya | 1 | Ditolak: nomor sedang dipakai | toast "Failed to create stock request." |
| TC-APP007-028 | Formulir permintaan stok di batasnya | 2 | Ditolak dengan pesan yang menyebut batas 50 | toast "Failed to create stock request." |
| TC-APP007-028 | Formulir permintaan stok di batasnya | 3 | Ditolak: jumlah tidak boleh negatif | toast "Failed to create stock request." |
| TC-APP007-028 | Formulir permintaan stok di batasnya | 4 | Ditolak, atau dipilih dari daftar | tersimpan: mata uang berupa teks bebas |
| TC-APP007-029 | Stok minimum dan maksimum | 2 | Daftar item di bawah minimum, dengan jumlah yang perlu diorder | tidak ada daftar reorder di Persediaan |
| TC-APP007-029 | Stok minimum dan maksimum | 3 | Peringatan bahwa maksimum terlampaui | toast "Batch quantity added." |
| TC-APP007-030 | Yang paling lama diterima keluar duluan, bukan yang paling cepat kedaluwarsa | 2 | QA-NEW (B2-MVWJQCAA006), yang kedaluwarsa lebih dulu, berkurang 10 | B1-MVWJQCAA006 40, B2-MVWJQCAA006 50: batch yang diterima lebih dulu dikeluarkan lebih dulu |
| TC-APP007-031 | Hari beku di batasnya | 1 | BR-A, cabang tempat user bekerja | kolom menampilkan "BR02 Daan Mogot" |
| TC-APP007-031 | Hari beku di batasnya | 3 | Ditolak: paling banyak 3650 | toast "saveFreezeDays: 400 inventory: invalid stock" |
| TC-APP007-033 | User tanpa peran gudang membaca stok dan biaya | 1 | Tidak ada kartu "Inventory", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/inventory |
| TC-APP007-033 | User tanpa peran gudang membaca stok dan biaya | 2 | Akses ditolak | U3 (tanpa hak) membaca /inventory/items ("Item Master", 25 baris; IT-1 (QA-INV-XSS-MV8QXF17100M) terbuka beserta baris stoknya) |
| TC-APP007-034 | Gudang, stok, dan permintaan cabang lain | 2 | Hanya gudang Podomoro di bawah "Add batch" | gudang Kemayoran juga ditawarkan: FB-DRI, FI01-01-01, FE03-00-02 |
| TC-APP007-038 | Klik ganda, dua user sekaligus, dan muat ulang | 3 | Yang lain ditolak dengan "not enough stock" | yang lain bertuliskan "advanceDispense: 400 pharmacy: dispense without stock detail is not allowed inventory: dispense without stock detail is not allowed (QA-INV-PARA-L-MVWJQCAA00A)" |
| TC-APP007-038 | Klik ganda, dua user sekaligus, dan muat ulang | 5 | Isian disimpan, atau user diberi peringatan | item yang setengah terisi hilang tanpa peringatan |

## 08 Kamar Operasi

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP008-001 | Membuat permintaan kamar operasi | 2 | Petunjuk "Optional" pada "Blocked amount" | tidak ada petunjuk seperti itu; dialog bertuliskan "procedures_display required; blocked_amount optional." |
| TC-APP008-005 | Daftar permintaan dan halaman | 1 | Kolom Request no, Procedures, Blocked, List prepared, Actions | kolom Request no, Procedures, Status, Blocked, List prepared, Actions |
| TC-APP008-008 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Open requests" | "Open requests" adalah tautan |
| TC-APP008-008 | Hub, navigasi, dan bahasa Indonesia | 1 | Satu ubin "Requests" di bawah "Workflow" | ubin: Requests, Case |
| TC-APP008-008 | Hub, navigasi, dan bahasa Indonesia | 3 | Judul, nama kolom, tombol, dan toast berbahasa Indonesia ("Permintaan OT", "Jadwalkan", …) | Bahasa Inggris: "Blocked" |
| TC-APP008-009 | Permintaan kamar operasi tanpa pasien atau tim bedah | 1 | Pasien dipilih dari register atau dari pasien rawat inap | "Patient" adalah kolom teks bebas (INPUT) |
| TC-APP008-009 | Permintaan kamar operasi tanpa pasien atau tim bedah | 2 | Kolom untuk ahli bedah, ahli anestesi, diagnosis, dan jenis anestesi | tidak ada: ahli bedah, ahli anestesi, diagnosis, jenis anestesi (hanya ada "Chief surgeon") |
| TC-APP008-009 | Permintaan kamar operasi tanpa pasien atau tim bedah | 3 | Setiap baris menampilkan nama dan MRN pasien | baris hanya menampilkan nomor permintaan dan prosedur; keduanya bertuliskan teks yang sama |
| TC-APP008-010 | Menjadwalkan tanpa tanggal, waktu, atau kamar operasi | 1 | Formulir untuk tanggal, jam mulai, perkiraan lama, dan kamar operasi | "Schedule" cukup satu klik (toast "Scheduled"); "List prepared" menjadi "Yes" |
| TC-APP008-010 | Menjadwalkan tanpa tanggal, waktu, atau kamar operasi | 2 | Ditolak, atau peringatan tentang bentrok | dijadwalkan tanpa konfirmasi (tidak ada tanggal, waktu, atau kamar operasi yang bisa bentrok) |
| TC-APP008-011 | Pemakaian tanpa item, stok, atau biaya | 1 | Formulir untuk mengisi item dan jumlah yang dipakai | tidak ada formulir: "Consume" langsung mencatat ("Consumed") |
| TC-APP008-011 | Pemakaian tanpa item, stok, atau biaya | 2 | Stok berkurang sebanyak jumlah yang dipakai | tidak ada item atau jumlah yang diisi, jadi tidak ada stok gudang kamar operasi yang bisa berkurang (gudang kamar operasi juga tidak bisa dibuat, blocker temuan 26) |
| TC-APP008-011 | Pemakaian tanpa item, stok, atau biaya | 3 | Biaya operasi dan item | permintaan menyebut pasien hanya sebagai teks bebas (tanpa MRN, tanpa kunjungan), jadi tidak ada tagihan PT-1 yang bisa memuatnya |
| TC-APP008-012 | Pemakaian sebelum daftar disiapkan | 1 | Tombol "Consume" tidak ditawarkan, atau nonaktif | "Consume" ditawarkan pada permintaan yang daftarnya belum disiapkan |
| TC-APP008-013 | Pemakaian diklik dua kali atau karena salah | 1 | Pertanyaan konfirmasi sebelum ada yang berubah | langsung dipakai (toast "Consumed") |
| TC-APP008-013 | Pemakaian diklik dua kali atau karena salah | 2 | Pembatalan yang mengembalikan 3.000.000 | tidak ada pembatalan; Blocked bertuliskan "0" |
| TC-APP008-013 | Pemakaian diklik dua kali atau karena salah | 3 | Ditolak: sudah dipakai; tombolnya tidak ditawarkan lagi | dipakai lagi (toast "Consumed") |
| TC-APP008-013 | Pemakaian diklik dua kali atau karena salah | 4 | Status "Consumed" pada baris | Status "pending", Blocked "0", List prepared "Yes" |
| TC-APP008-014 | Jumlah yang diblokir di batasnya | 3 | Ditolak, atau dibulatkan ke satuan terkecil mata uang | tersimpan; Blocked bertuliskan "0.001" |
| TC-APP008-014 | Jumlah yang diblokir di batasnya | 4 | Ditolak, atau peringatan tentang ukuran | tersimpan; Blocked bertuliskan "999,999,999,999,999" |
| TC-APP008-015 | Formulir permintaan di batasnya | 2 | Pesan bahwa prosedur belum diisi | tidak terjadi apa-apa, tanpa pesan |
| TC-APP008-015 | Formulir permintaan di batasnya | 3 | Ditolak dengan pesan yang menyebut batas 1.024, atau kolomnya berhenti di sana | toast "failed to create OT request" |
| TC-APP008-016 | Mencari permintaan dan permintaan baru setelah disimpan | 1 | Permintaan baru ada di baris pertama | daftar dimulai dari nomor permintaan terkecil ("QA Appendektomi laparoskopi PRBMV8WIZEFA"); yang baru ada di halaman terakhir |
| TC-APP008-016 | Mencari permintaan dan permintaan baru setelah disimpan | 2 | Pencarian menurut nomor atau prosedur | daftar tidak punya kolom pencarian, hanya halaman |
| TC-APP008-017 | Mengubah atau membatalkan permintaan | 1 | Permintaan terbuka untuk diedit | klik pada baris tidak membuka apa pun |
| TC-APP008-017 | Mengubah atau membatalkan permintaan | 3 | Kolom keterangan | tidak ada kolom keterangan (hanya Reason, Operation note, dan Dossier id di atas daftar) |
| TC-APP008-019 | User tanpa peran kamar operasi membaca permintaan | 1 | Tidak ada kartu "Operation Theater", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/ot |
| TC-APP008-019 | User tanpa peran kamar operasi membaca permintaan | 2 | Akses ditolak | U3 (tanpa hak) membaca /ot/requests ("OT requests", 10 baris) |
| TC-APP008-024 | Klik ganda, dua perawat sekaligus, dan muat ulang | 3 | Teks disimpan, atau perawat diberi peringatan | prosedur yang setengah diketik hilang tanpa peringatan |
| TC-APP008-025 | Permintaan dengan pasien, ruang, waktu, dan ahli bedah, ditaruh di kalender | 1 | Dialog dengan "Branch", … | tidak ada kolom "Branch" (permintaan memakai cabang sesi) |
| TC-APP008-037 | Kebijakan tagihan: persentase per insisi dan jenis departemen | 2 | Dialog dengan "Branch", … | tidak ada kolom "Branch" |
| TC-APP008-038 | Kebijakan yang harus ditolak | 1 | Ditolak: "incision, department type, and percentage are required" | "Saved." dengan persentase kosong (kebijakan "QA-sama MVWJVGTP004") |

## 09 Pengadaan

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP009-001 | Membuat order pembelian | 4 | "Persetujuan Purchase Order (4 steps)"; empat langkah, yang pertama "Current", yang lain "Pending" | "PURCHASE ORDER (1 LANGKAH)": Approval Step 1 Current (blocker temuan 30) |
| TC-APP009-004 | Memajukan satu langkah persetujuan | 1 | Step 1 "Pengajuan Departemen" marked "Current" | step 1 "Approval Step 1 Current" (found blocker 30) |
| TC-APP009-005 | Order pembelian disetujui melewati keempat langkah | 1 | Row Approval "Step 2" | the chain has 1 step: the order is fully approved (found blocker 30) |
| TC-APP009-012 | Order pembelian tanpa item, jumlah, atau total | 1 | Baris item dengan item, jumlah, satuan, dan harga | tidak ada baris item; formulir berisi nomor, tanggal, vendor, departemen, mata uang, jumlah uang muka, dan jumlah dibayar |
| TC-APP009-012 | Order pembelian tanpa item, jumlah, atau total | 2 | Total yang dihitung dari baris-barisnya | tidak ada total |
| TC-APP009-012 | Order pembelian tanpa item, jumlah, atau total | 3 | Tanggal kirim, alamat kirim, dan syarat pembayaran | tidak ada satu pun kolom ini |
| TC-APP009-013 | Permintaan pembelian dan tender | 3 | Layar untuk mencatat dan membandingkan penawaran | tidak ada layar tender atau penawaran harga (sidebar: Purchase orders Supplier Purchase requests Receipts Reorder) |
| TC-APP009-013 | Permintaan pembelian dan tender | 4 | Order dibuat dari permintaan | order tidak merujuk ke permintaan |
| TC-APP009-014 | Vendor dan departemen diketik sebagai teks bebas | 1 | Daftar vendor terdaftar untuk dipilih | "Vendor / beneficiary" adalah kolom teks bebas |
| TC-APP009-014 | Vendor dan departemen diketik sebagai teks bebas | 2 | Ejaan kedua dikenali sebagai vendor yang sama, atau ditolak | kedua ejaan tersimpan seperti yang diketik |
| TC-APP009-014 | Vendor dan departemen diketik sebagai teks bebas | 3 | Ditolak: departemen tidak ada | tersimpan |
| TC-APP009-014 | Vendor dan departemen diketik sebagai teks bebas | 4 | Ditolak: vendor belum diisi | tersimpan tanpa vendor |
| TC-APP009-015 | Order pembelian yang disetujui tampak seperti yang masih menunggu | 1 | PO-DONE shows a status such as "Approved" | Approval "Step 1" |
| TC-APP009-015 | Order pembelian yang disetujui tampak seperti yang masih menunggu | 2 | All steps "Done" | the approved order shows Approval Step 1 Current (its one-step chain, found blocker 30) |
| TC-APP009-015 | Order pembelian yang disetujui tampak seperti yang masih menunggu | 3 | No approval button on an approved order | the order still offers its approval button |
| TC-APP009-018 | Satu orang membuat dan menyetujui, atau menyetujui beberapa langkah | 1 | Refused: the creator cannot approve their own order | the creator approves the order |
| TC-APP009-018 | Satu orang membuat dan menyetujui, atau menyetujui beberapa langkah | 2 | Refused: the creator cannot approve (and one person not consecutive steps) | U4 approves its own order |
| TC-APP009-019 | Menolak order pembelian atau mengembalikannya | 1 | Tombol untuk menolak, dengan alasan | tidak ada tolak (tombol: Close, Advance approval) |
| TC-APP009-019 | Menolak order pembelian atau mengembalikannya | 2 | Tombol untuk mengembalikannya agar dikoreksi | tidak ada cara mengembalikan order (tombol: Close, Advance approval) |
| TC-APP009-019 | Menolak order pembelian atau mengembalikannya | 3 | Kolom keterangan | order yang dibuka tidak punya isian keterangan |
| TC-APP009-020 | Mengubah atau membatalkan order pembelian, dan membayar uang muka kemudian | 1 | Order terbuka untuk diedit selama belum disetujui | order yang dibuka tidak bisa diedit; hanya "Advance approval" dan "Close" |
| TC-APP009-020 | Mengubah atau membatalkan order pembelian, dan membayar uang muka kemudian | 2 | Pembatalan dengan alasan | tidak ada batal |
| TC-APP009-020 | Mengubah atau membatalkan order pembelian, dan membayar uang muka kemudian | 3 | Entri pembayaran; saldo turun 1000000 | tidak ada entri pembayaran; jumlah dibayar tetap seperti yang diketik saat dibuat |
| TC-APP009-020 | Mengubah atau membatalkan order pembelian, dan membayar uang muka kemudian | 4 | Order pembelian yang bisa dicetak | tidak ada cetak atau kirim |
| TC-APP009-022 | Pembayaran uang muka dan Finance | 1 | Voucher pembayaran atau uang muka vendor untuk order tersebut | tidak ada voucher yang menyebut QA-PO-001-MVWL1MYC005 |
| TC-APP009-022 | Pembayaran uang muka dan Finance | 2 | Utang ke vendor, atau komitmen | tidak ada entri 4.000.000 untuk QA-PO-001-MVWL1MYC005 |
| TC-APP009-022 | Pembayaran uang muka dan Finance | 3 | Peringatan atau penolakan (lebih besar dari anggaran departemen) | dibuat tanpa peringatan |
| TC-APP009-023 | Jumlah di batasnya | 4 | Ditolak: order butuh jumlah | tersimpan dengan IDR 0,00 |
| TC-APP009-023 | Jumlah di batasnya | 5 | Ditolak dengan pesan tentang ukuran | toast "ERROR: numeric field overflow (SQLSTATE 22003)" |
| TC-APP009-024 | Formulir order pembelian di batasnya | 2 | Pesan bahwa mata uang belum diisi | tersimpan; Amount bertuliskan "IDR 100.000,00" |
| TC-APP009-024 | Formulir order pembelian di batasnya | 3 | Ditolak, atau mata uang dipilih dari daftar | tersimpan; Amount bertuliskan "xyz 5.000.000,00" |
| TC-APP009-024 | Formulir order pembelian di batasnya | 5 | Ditolak, atau peringatan tentang tanggal | tersimpan tanpa keterangan apa pun: 1900-01-01, 2099-12-31 |
| TC-APP009-025 | Dua order pembelian dengan nomor yang sama | 1 | Ditolak: nomor sudah dipakai | order kedua "QA-PO-001-MVWL1MYC007" dibuat |
| TC-APP009-025 | Dua order pembelian dengan nomor yang sama | 3 | Setiap nomor muncul sekali | QA-PO-001-MVWL1MYC007, PO-1793462392 muncul lebih dari sekali |
| TC-APP009-026 | Mencari order pembelian dan order yang menunggu saya | 1 | Pencarian menurut nomor dokumen atau vendor | daftar tidak punya pencarian |
| TC-APP009-026 | Mencari order pembelian dan order yang menunggu saya | 2 | Ada filter | daftar tidak punya filter menurut langkah persetujuan atau "waiting for me" |
| TC-APP009-026 | Mencari order pembelian dan order yang menunggu saya | 3 | Daftar diurutkan menurut kolom itu | klik pada judul kolom tidak mengubah apa pun |
| TC-APP009-026 | Mencari order pembelian dan order yang menunggu saya | 4 | Baris pertama daftar | baris pertama adalah QA-PO-001-MVWB83UI00B; QA-PO-001-MVWKTWSG004 ada di halaman berikutnya |
| TC-APP009-031 | User tanpa peran pengadaan membaca order pembelian | 1 | Tidak ada kartu "Procurement", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/procurement |
| TC-APP009-031 | User tanpa peran pengadaan membaca order pembelian | 2 | Akses ditolak | U3 (tanpa hak) membaca /procurement/purchase-orders ("Purchase orders", 10 baris) |
| TC-APP009-036 | Klik ganda, dua penyetuju sekaligus, dan muat ulang | 3 | Teks disimpan, atau petugas diberi peringatan | order yang setengah terisi hilang tanpa peringatan |
| TC-APP009-057 | Layar /procurement/reorder terbuka | 1 | Layar menampilkan judul dan kontrolnya | judul dan daftar baca saja; tanpa kontrol |

## 10 SDM

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP010-004 | Atasan pelapor dan akun user yang ditautkan | 3 | Berkas karyawan yang ditautkan terbuka sendiri sebagai "Edit employee" | daftar terbuka; tidak ada berkas sendiri |
| TC-APP010-004 | Atasan pelapor dan akun user yang ditautkan | 3 | Pemberitahuan "Configuration is missed" tidak ditampilkan | pemberitahuan ditampilkan ke akun yang ditautkan |
| TC-APP010-015 | Hub, navigasi, dan bahasa Indonesia | 2 | "Duty roster" mengarah ke modul Duty Roster | tautan (/id/roster) tetap di hub HR |
| TC-APP010-019 | Jumlah hari yang tidak cocok dengan tanggal | 1 | "Days" changes to 5 | "Days" stays 1 |
| TC-APP010-020 | Menyetujui cuti sendiri, dan cuti yang tidak perlu persetujuan | 3 | The approver is shown | no column names who decided (columns: Type, From, To, Days, Slot, Status, Reason, Actions) |
| TC-APP010-024 | Cuti yang disetujui di Jadwal Dinas dan Penggajian | 1 | Peringatan atau penolakan saat EMP-1 diberi shift di hari cutinya | tidak ada shift yang bisa ditetapkan: "Duty roster" membuka /id/roster dan site tidak menyimpan jadwal dinas |
| TC-APP010-025 | Karyawan yang sudah keluar: "Relieved" dan akun user | 2 | "Relieved", dengan tanggal keluar | berkas bertuliskan nonaktif (Tidak aktif): "Relieved" tidak disimpan |
| TC-APP010-025 | Karyawan yang sudah keluar: "Relieved" dan akun user | 2 | "Relieved", dengan tanggal keluar | tidak ada kolom untuk tanggal keluar |
| TC-APP010-025 | Karyawan yang sudah keluar: "Relieved" dan akun user | 4 | Kolom status atau tanda untuk karyawan yang sudah keluar | baris tidak menampilkan status |
| TC-APP010-027 | Formulir karyawan: kolom yang kosong dan teks bebas | 1 | Kolom yang kosong ditandai, atau ada pesan yang menyebutnya | "Next" hanya nonaktif; tidak ada yang menunjukkan kolom mana yang kosong |
| TC-APP010-027 | Formulir karyawan: kolom yang kosong dan teks bebas | 2 | Ditolak: karyawan butuh nama | tersimpan tanpa nama |
| TC-APP010-027 | Formulir karyawan: kolom yang kosong dan teks bebas | 3 | "Gender" adalah daftar pilihan | "Gender" adalah kolom teks bebas |
| TC-APP010-027 | Formulir karyawan: kolom yang kosong dan teks bebas | 3 | "Category" adalah daftar pilihan | "Category" adalah kolom teks bebas |
| TC-APP010-027 | Formulir karyawan: kolom yang kosong dan teks bebas | 4 | Ditolak: bukan alamat e-mail; tanggal lahir di masa depan | tersimpan |
| TC-APP010-027 | Formulir karyawan: kolom yang kosong dan teks bebas | 5 | Ditolak dengan pesan yang menyebut batas 64 | toast "Could not save employee" |
| TC-APP010-028 | Atasan pelapor dan login akun yang tidak mungkin benar | 2 | Pesan bahwa nomor karyawan ini tidak ada | toast "Could not save employee" |
| TC-APP010-028 | Atasan pelapor dan login akun yang tidak mungkin benar | 3 | Pesan bahwa user ini tidak ada | toast "Could not save employee" |
| TC-APP010-028 | Atasan pelapor dan login akun yang tidak mungkin benar | 5 | Simpan kedua ditolak: keduanya akan saling melapor | keduanya tersimpan |
| TC-APP010-029 | Pemetaan cabang dan alokasi yang tidak terlihat | 1 | Daftar pemetaan cabang dengan tombol untuk menambah | berkas tidak punya tempat untuk cabang kedua |
| TC-APP010-029 | Pemetaan cabang dan alokasi yang tidak terlihat | 2 | Daftar dengan pusat layanan, tanggal mulai, dan tanggal selesai | berkas tidak menampilkan alokasi; hanya isian "Allocation from" |
| TC-APP010-029 | Pemetaan cabang dan alokasi yang tidak terlihat | 3 | Tanggal sampai bisa diatur | tidak ada tanggal "sampai" untuk alokasi |
| TC-APP010-029 | Pemetaan cabang dan alokasi yang tidak terlihat | 4 | Alokasi dipindahkan, atau simpan kedua ditolak sebagai ganda | kedua penyimpanan diterima; tidak ada yang menunjukkan apakah alokasi dipindahkan atau ditambah |
| TC-APP010-030 | Izin praktik yang sudah kedaluwarsa | 1 | Peringatan bahwa lisensi sudah kedaluwarsa | tersimpan tanpa keterangan apa pun |
| TC-APP010-030 | Izin praktik yang sudah kedaluwarsa | 2 | Lisensi yang sudah atau hampir habis diberi tanda | daftar hanya menampilkan nomor dan nama |
| TC-APP010-030 | Izin praktik yang sudah kedaluwarsa | 3 | Laporan atau filter lisensi yang akan habis | tidak ada layar seperti itu (menu HR: Employee, Leave applications, Profile, Leave year, Attendance, Doctor fee) |
| TC-APP010-031 | Yang tidak bisa disimpan berkas karyawan | 1 | NIK dan tanggal bergabung di "File" | tidak ada: tanggal bergabung |
| TC-APP010-031 | Yang tidak bisa disimpan berkas karyawan | 2 | Kolom telepon di "Contacts" | kontak adalah alamat (Type, Address, Country, State, District, City) |
| TC-APP010-031 | Yang tidak bisa disimpan berkas karyawan | 3 | File bisa dipilih dan ditampilkan | "Photo location" adalah kolom teks; tidak ada file yang diunggah atau ditampilkan |
| TC-APP010-031 | Yang tidak bisa disimpan berkas karyawan | 4 | Hapus, atau status untuknya | tidak ada hapus; status Active, Inactive, Relieved |
| TC-APP010-033 | User tanpa hak SDM | 1 | Ditolak dengan pesan bahwa user tidak boleh melakukan ini | toast "Could not save employee" |
| TC-APP010-034 | User tanpa peran SDM membaca semua berkas karyawan | 1 | Tidak ada kartu "HR", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/hr |
| TC-APP010-034 | User tanpa peran SDM membaca semua berkas karyawan | 2 | Akses ditolak | U3 (tanpa hak) membaca /hr/employees ("Employee", 10 baris) |
| TC-APP010-034 | User tanpa peran SDM membaca semua berkas karyawan | 3 | Tidak mungkin | U3 membuka QA-EMP-001-MVWK8UBK00C dan menelusuri enam langkah berkasnya |
| TC-APP010-034 | User tanpa peran SDM membaca semua berkas karyawan | 4 | Tidak mungkin | "Download" memberi U3 file employees.csv |
| TC-APP010-034 | User tanpa peran SDM membaca semua berkas karyawan | 5 | Akses ditolak | U3 (tanpa hak) membaca /hr/leave-applications ("Leave applications", 10 baris) |
| TC-APP010-038 | Teks skrip di file dan formula di daftar yang diunduh | 3 | Nama kedua ditampilkan sebagai teks, tidak dijalankan sebagai formula | sel diawali "=" seperti yang diketik |
| TC-APP010-039 | Klik ganda, dua admin sekaligus, dan muat ulang | 1 | One employee. The button is disabled while it reads "Saving…" | 0 employees |
| TC-APP010-040 | Meja SDM, My profile: menambah karyawan, menautkan akun saya, membaca profil saya | 4 | Toast "Saved." | ditolak: "hr: invalid input: duplicate": U1 tertaut ke karyawan dari run sebelumnya test ini, dan tautannya tidak dipindah ke QA-EMP-01-MVW7XW2T001 |
| TC-APP010-045 | Meja SDM, Year balance: comp-off untuk hari libur yang dipakai kerja | 1 | Toast "Saved."; baris comp-off dengan id | "Saved.", tetapi daftar tidak menampilkan baris QA-EMP-01-MVWKC4JR001 |

## 11 Laboratorium

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP011-010 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Open worklist" | "Open worklist" adalah tautan |
| TC-APP011-011 | Order lab tanpa pasien | 1 | Nama dan MRN PT-1 di baris | baris tidak menyebut pasien; hanya keterangan yang membedakan kedua order |
| TC-APP011-011 | Order lab tanpa pasien | 2 | Label memuat nama, MRN, dan tanggal lahir pasien di samping ID sampel | tidak ada label Sample workflow yang menyebut pasien |
| TC-APP011-011 | Order lab tanpa pasien | 3 | Dialog menunjukkan hasil siapa yang sedang diketik | dialog tidak menyebut pasien |
| TC-APP011-011 | Order lab tanpa pasien | 4 | Pasien harus dipilih | dialog tidak punya kolom pasien |
| TC-APP011-012 | Hasil tidak kembali ke dokter | 1 | Order lab dan hasilnya tercantum | konsultasi tidak menampilkan hasil (maupun ordernya) |
| TC-APP011-012 | Hasil tidak kembali ke dokter | 2 | Pemberitahuan atau penanda pada pasien | tidak ada notifikasi dan tidak ada penanda bahwa hasil sudah siap |
| TC-APP011-013 | Formulir order yang belum lengkap, dan tes teks bebas | 2 | Pesan bahwa jenis hasil belum diisi | tidak terjadi apa-apa, tanpa pesan |
| TC-APP011-013 | Formulir order yang belum lengkap, dan tes teks bebas | 3 | Tes dipilih dari daftar laboratorium, sehingga nama yang salah eja tidak bisa disimpan | jenis hasil berupa teks bebas; "Hemoglobn" tersimpan |
| TC-APP011-013 | Formulir order yang belum lengkap, dan tes teks bebas | 4 | Peringatan tentang order yang berulang, atau keduanya memang sengaja disimpan | keduanya tersimpan tanpa peringatan |
| TC-APP011-015 | Langkah yang diklik karena salah | 1 | Pertanyaan konfirmasi sebelum langkah disimpan | langsung tersimpan (toast "") |
| TC-APP011-015 | Langkah yang diklik karena salah | 2 | Pembatalan, atau mundur satu langkah dengan alasan | tidak ada cara kembali di baris (tombol: LAB-20261031-1F72F9EB, Accepted, Result status, Capture result, Handover, Print barcode); Sample workflow punya "Revert latest stamp" (TC-APP011-041) |
| TC-APP011-016 | Sampel yang tidak bisa dipakai, order yang tidak diperlukan | 1 | "Reject sample" dengan alasan, yang meminta sampel baru | tidak ada "Reject sample" di baris; penolakan ada di dalam "Result status" |
| TC-APP011-016 | Sampel yang tidak bisa dipakai, order yang tidak diperlukan | 2 | Pembatalan dengan alasan | tidak ada batal di baris |
| TC-APP011-016 | Sampel yang tidak bisa dipakai, order yang tidak diperlukan | 3 | Order yang ditolak dan dibatalkan punya status sendiri | daftar status berisi All statuses, Ordered, Generated, Sent, Accepted, Resulted |
| TC-APP011-017 | Hasil dirilis tanpa pemeriksaan kedua | 1 | Hasil menunggu validasi oleh user kedua yang berwenang | langsung final: Status "Resulted", Result status "—" |
| TC-APP011-017 | Hasil dirilis tanpa pemeriksaan kedua | 3 | Kolom terpisah untuk satuan dan metode | kolom: Lab result, Result range, Remarks |
| TC-APP011-018 | Hasil diubah setelah dirilis | 1 | Alasan diminta, dan perubahan disimpan sebagai koreksi | tersimpan menimpa hasil yang sudah dirilis tanpa alasan |
| TC-APP011-018 | Hasil diubah setelah dirilis | 2 | Hasil ditandai sudah dikoreksi, dengan nilai sebelumnya, user, dan waktunya | baris hanya menampilkan 8.5 g/dL |
| TC-APP011-019 | Formulir hasil di batasnya | 2 | Pesan bahwa hasil belum diisi | tidak terjadi apa-apa, tanpa pesan |
| TC-APP011-019 | Formulir hasil di batasnya | 4 | Rentang dihapus | rentang lama kembali: "12.0 - 16.0 g/dL" |
| TC-APP011-020 | Tes dengan beberapa nilai | 1 | Satu baris per parameter, masing-masing dengan nilai, satuan, dan rentang | satu "Lab result" dan satu "Result range" masing-masing 255 karakter |
| TC-APP011-020 | Tes dengan beberapa nilai | 2 | Setiap nilai tersimpan dan bisa dibaca sendiri-sendiri | panel disimpan sebagai satu baris teks: "Hb 13.5 g/dL; Leukosit 7.2 10^3/uL; Trombosit 250 10^3/uL; Hematokrit 40 %" |
| TC-APP011-022 | Waktu sampel | 1 | Waktu setiap langkah, dan waktu hasil disimpan | tidak ada waktu yang ditampilkan di baris atau di dialog |
| TC-APP011-022 | Waktu sampel | 3 | Penanda atau urutan menurut lama menunggu | tidak ada |
| TC-APP011-023 | Dua analis pada order yang sama | 3 | Analis 2 diberi peringatan bahwa hasil sudah disimpan sementara itu | 14.0 g/dL tersimpan menimpa 13.5 g/dL tanpa peringatan (baris: 14.0 g/dL) |
| TC-APP011-023 | Dua analis pada order yang sama | 4 | Teks disimpan, atau analis diberi peringatan | hasil yang setengah diketik hilang tanpa peringatan |
| TC-APP011-025 | User tanpa peran laboratorium membaca worklist | 1 | Tidak ada kartu "Laboratory", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/laboratory |
| TC-APP011-025 | User tanpa peran laboratorium membaca worklist | 2 | Akses ditolak | U3 (tanpa hak) membaca /laboratory/orders ("Lab order worklist", 10 baris) |

## 12 RIS

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP012-006 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Open orders" | "Open orders" adalah tautan |
| TC-APP012-007 | Order radiologi tanpa pasien | 1 | Pasien harus dipilih dari register | formulir tidak punya kolom pasien |
| TC-APP012-007 | Order radiologi tanpa pasien | 2 | Setiap baris menampilkan nama dan MRN pasien | baris hanya menampilkan referensi dan pemeriksaan: RAD-1793460866 QA Thorax PA MVWK94RM003 — — — — |
| TC-APP012-009 | Melengkapi atau mengoreksi order kemudian | 1 | Order terbuka untuk diedit | baris tidak bisa dibuka |
| TC-APP012-010 | Status pemeriksaan dan jadwal modalitas | 1 | Status per order | kolom: Order ref, Study, Study date, Accession, Reported by, Links |
| TC-APP012-010 | Status pemeriksaan dan jadwal modalitas | 2 | Filter menurut status | tidak ada filter |
| TC-APP012-011 | Formulir order di batasnya | 4 | Ditolak dengan pesan yang menyebut batas 255, atau kolomnya berhenti di 255 | toast "failed to create radiology order" |
| TC-APP012-011 | Formulir order di batasnya | 5 | Ditolak dengan pesan yang menyebut batas 500 | toast "failed to create radiology order" |
| TC-APP012-012 | Tanggal yang tidak mungkin benar | 1 | Ditolak, atau peringatan | tersimpan dengan toast "Order created" |
| TC-APP012-012 | Tanggal yang tidak mungkin benar | 2 | Ditolak | tersimpan dengan toast "Order created" |
| TC-APP012-012 | Tanggal yang tidak mungkin benar | 3 | Ditolak: laporan butuh pelapor | tersimpan dengan toast "Order created" |
| TC-APP012-013 | Waktu pemeriksaan yang tampil di daftar | 2 | Hari ini 10:00 (2026-10-31) | "2026-10-31 03:00" |
| TC-APP012-014 | Nomor referensi atau aksesi yang sama dua kali | 1 | Ditolak: referensi sedang dipakai | order kedua dengan QA-RAD-0001-MVWK6IRU002 dibuat |
| TC-APP012-014 | Nomor referensi atau aksesi yang sama dua kali | 2 | Ditolak, atau peringatan | order kedua dengan QA-ACC-0001-MVWK6IRU002 dibuat tanpa peringatan |
| TC-APP012-015 | Mencari order | 1 | Pencarian menurut referensi, nomor aksesi, pemeriksaan, dan tanggal | tidak ada pencarian |
| TC-APP012-015 | Mencari order | 2 | Filter menurut tanggal dan pemeriksaan | tidak ada filter; hanya halaman, 10 baris sekaligus |
| TC-APP012-016 | Tautan gambar dan laporan | 1 | Ditolak: hanya alamat viewer rumah sakit yang diterima | tersimpan |
| TC-APP012-018 | User tanpa hak radiologi | 1 | Tombol "New order" tidak ditawarkan, atau halaman ditolak | "New order" ditampilkan ke U3 (tanpa hak) |
| TC-APP012-019 | User tanpa peran radiologi membaca order | 1 | Tidak ada kartu "RIS", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/radiology |
| TC-APP012-019 | User tanpa peran radiologi membaca order | 2 | Akses ditolak | U3 (tanpa hak) membaca /radiology/orders ("Orders", 10 baris; "Report" sebuah baris mengarah ke https://pacs.example.test/report/QA-ACC-0001) |
| TC-APP012-024 | Klik ganda, dua radiografer sekaligus, dan muat ulang | 3 | Isian disimpan, atau radiografer diberi peringatan | order yang setengah terisi hilang tanpa peringatan |

## 13 Diet

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP013-011 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "Open requests" | "Open requests" adalah tautan |
| TC-APP013-012 | Permintaan diet tanpa pasien atau diet | 1 | Pasien harus dipilih dari pasien rawat inap | tidak ada kolom pasien |
| TC-APP013-012 | Permintaan diet tanpa pasien atau diet | 2 | Kolom atau daftar untuk jenis diet, waktu makan, dan alergi | tidak ada; diet hanya bisa ditulis di "Comments" |
| TC-APP013-012 | Permintaan diet tanpa pasien atau diet | 3 | Tempat tidur Rawat Inap ditawarkan | "Bed no" diketik manual |
| TC-APP013-012 | Permintaan diet tanpa pasien atau diet | 4 | Setiap baris menampilkan pasien dan dietnya | baris hanya menampilkan nomor dan tanggal: QA-DIET-001-MVWKWOV4004 \| 2026-10-31 \| 2026-10-31 \| 1 line(s) \| Active |
| TC-APP013-013 | Permintaan diet dan masuk rawat pasien | 1 | Permintaan untuk pasien baru diusulkan, atau pasien rawat inap ditawarkan | formulir hanya punya Bed no dan Bed category berupa teks bebas: tidak ada pasien yang ditawarkan |
| TC-APP013-013 | Permintaan diet dan masuk rawat pasien | 2 | Baris menunjukkan tempat tidur baru | baris tetap QA-0D43F5LMM-RI-0102: permintaan tidak tertaut ke rawat inap |
| TC-APP013-013 | Permintaan diet dan masuk rawat pasien | 3 | Permintaan ditutup; Status bukan lagi "Active" | RQ-1 tetap "Active" setelah pulang |
| TC-APP013-014 | Mengikuti permintaan diet: disiapkan, diantar, diubah, dibatalkan | 1 | Tombol atau daftar status | tidak ada; status baris adalah yang diketik saat dibuat ("ordered") |
| TC-APP013-014 | Mengikuti permintaan diet: disiapkan, diantar, diubah, dibatalkan | 2 | Baris bisa diedit | tidak ada edit |
| TC-APP013-014 | Mengikuti permintaan diet: disiapkan, diantar, diubah, dibatalkan | 3 | Pembatalan; Status lalu menjadi "Inactive" | tidak ada batal |
| TC-APP013-014 | Mengikuti permintaan diet: disiapkan, diantar, diubah, dibatalkan | 4 | Tombol untuk menambah baris | tidak ada cara menambah baris ("One line per dialog") |
| TC-APP013-015 | Nomor permintaan diet yang sudah dipakai | 1 | Pesan bahwa nomor sudah ada | toast "failed to create diet request" |
| TC-APP013-015 | Nomor permintaan diet yang sudah dipakai | 2 | Diterima, atau pesan yang menjelaskan di mana nomor itu dipakai | ditolak dengan "failed to create diet request" |
| TC-APP013-015 | Nomor permintaan diet yang sudah dipakai | 3 | Nomor boleh dikosongkan | "Doc no" wajib diisi dan tidak menawarkan nomor otomatis |
| TC-APP013-016 | Formulir permintaan diet di batasnya | 2 | Pesan bahwa tempat tidur belum diisi | tidak terjadi apa-apa, tanpa pesan |
| TC-APP013-016 | Formulir permintaan diet di batasnya | 3 | Ditolak dengan pesan yang menyebut batas 50, atau kolomnya berhenti di sana | toast "failed to create diet request" |
| TC-APP013-016 | Formulir permintaan diet di batasnya | 4 | Ditolak dengan pesan yang menyebut batas 255 | toast "failed to create diet request" |
| TC-APP013-016 | Formulir permintaan diet di batasnya | 5 | Tanggal permintaan bisa dipilih | tidak ada kolom tanggal: tanggal dokumen dan permintaan selalu hari ini |
| TC-APP013-017 | TPN disimpan pada nama pasien yang diketik | 1 | Pencarian pasien terdaftar atau rawat inap, menurut nama atau MRN | "Patient" adalah kolom teks biasa |
| TC-APP013-017 | TPN disimpan pada nama pasien yang diketik | 2 | Baris menampilkan MRN atau tempat tidur pasien di samping nama | baris: QA-DIE Pasien Satu MVWKXN82004 \| 24.22 · Normal \| 70 g \| 388.24 g \| 200 mL \| 2.1 L |
| TC-APP013-017 | TPN disimpan pada nama pasien yang diketik | 3 | Kedua baris bisa dibedakan | dua baris yang identik |
| TC-APP013-017 | TPN disimpan pada nama pasien yang diketik | 4 | Ditolak | tersimpan pada nama yang bukan milik pasien mana pun |
| TC-APP013-018 | Mengetik angka desimal di kolom TPN | 1 | Kolom menampilkan 1.7 | kolom menampilkan "17" |
| TC-APP013-018 | Mengetik angka desimal di kolom TPN | 2 | Kolom menampilkan 1.5 | kolom menampilkan "15" |
| TC-APP013-018 | Mengetik angka desimal di kolom TPN | 3 | Kolom menampilkan 0.5 | kolom menampilkan "5" |
| TC-APP013-018 | Mengetik angka desimal di kolom TPN | 4 | Kolom menampilkan 1,7 atau 1.7, atau koma ditolak dengan petunjuk | kolom menampilkan "7" |
| TC-APP013-019 | TPN dengan nilai yang mustahil atau berbahaya | 1 | Ditolak atau ditandai: kalori protein dan lipid melebihi energi | tidak ada tanda atau peringatan |
| TC-APP013-019 | TPN dengan nilai yang mustahil atau berbahaya | 2 | Peringatan: dekstrosa di atas maksimum | tidak ada tanda atau peringatan |
| TC-APP013-019 | TPN dengan nilai yang mustahil atau berbahaya | 3 | Peringatan tentang kalium dan insulin | tidak ada tanda atau peringatan |
| TC-APP013-019 | TPN dengan nilai yang mustahil atau berbahaya | 4 | Ditolak, atau disimpan hanya setelah konfirmasi | tersimpan tanpa konfirmasi: kasus 1, 2, 3 |
| TC-APP013-020 | TPN dengan isian yang kurang | 2 | Pesan bahwa cairan belum diisi | toast "height, weight, energy, protein and fluid are required" |
| TC-APP013-020 | TPN dengan isian yang kurang | 3 | Pesan bahwa pasien belum diisi | tidak terjadi apa-apa, tanpa pesan |
| TC-APP013-020 | TPN dengan isian yang kurang | 4 | Pesan bahwa kode belum diisi | tidak terjadi apa-apa, tanpa pesan |
| TC-APP013-022 | Dasar klinis perhitungan TPN | 2 | Hanya volume dan berat emulsi lipid yang berubah | ikut berubah: Dextrose 388.24 g / 1320 kcal → 447.06 g / 1520 kcal; Dextrose rate 3.85 mg/kg/min → 4.44 mg/kg/min |
| TC-APP013-022 | Dasar klinis perhitungan TPN | 3 | Setiap kolom dan setiap hasil menyebut satuannya, misalnya mEq, mmol, atau unit | kolom bertuliskan "Sodium / L, Potassium / L, Calcium / L, Magnesium / L, Phosphate / L, MVI-12 / L, Trace metals / L, Heparin / L, Insulin / L"; hasil "Na 84 · K 42 · Ca 10.5 · Mg 8.4 · PO4 21" dan "MVI 21 · Trace 2.1 · Heparin 0 · Insulin 0" tanpa satuan |
| TC-APP013-023 | Meja racik tidak menampilkan seluruh resep | 1 | Pasien, protein, dekstrosa, lipid, volume, serta elektrolit dan aditif | baris: QA-DIE Pasien Satu MVWKXN82009 \| 24.22 · Normal \| 70 g \| 388.24 g \| 200 mL \| 2.1 L |
| TC-APP013-023 | Meja racik tidak menampilkan seluruh resep | 2 | Resep lengkap terbuka | baris tidak bisa dibuka |
| TC-APP013-023 | Meja racik tidak menampilkan seluruh resep | 3 | Tanggal, waktu, dan orang yang menyimpannya | tidak ada yang ditampilkan |
| TC-APP013-023 | Meja racik tidak menampilkan seluruh resep | 4 | Status, tombol untuk menandai sudah disiapkan, dan cetakan | tidak ada |
| TC-APP013-024 | Mengubah, membatalkan, atau menyimpan TPN dua kali | 1 | Klik kedua ditolak, atau ahli gizi ditanya apakah memang TPN kedua | baris kedua yang identik tersimpan |
| TC-APP013-024 | Mengubah, membatalkan, atau menyimpan TPN dua kali | 2 | Resep bisa diedit sebelum disiapkan | tidak ada edit |
| TC-APP013-024 | Mengubah, membatalkan, atau menyimpan TPN dua kali | 3 | Pembatalan dengan alasan | tidak ada batal |
| TC-APP013-025 | TPN tanpa peresep, pemeriksaan, atau tautan ke Farmasi | 1 | Peresep wajib diisi | formulir tidak punya peresep (kolom: Patient, Height, Weight, Energy (kcal), Protein (g/kg), Fluid (mL/kg), Sodium / L, Potassium / L, Calcium / L, Magnesium / L, Phosphate / L, MVI-12 / L, Trace metals / L, Heparin / L, Insulin / L, Template code, Description) |
| TC-APP013-025 | TPN tanpa peresep, pemeriksaan, atau tautan ke Farmasi | 2 | Resep menunggu di sana untuk diverifikasi dan disiapkan | Farmasi, Orders tidak menampilkan TPN |
| TC-APP013-026 | Template TPN: kode sama dua kali, daftar usang, tanpa perubahan | 1 | Ditolak: kode sudah ada, atau ahli gizi ditanya apakah akan menggantinya | tersimpan; "QA-TPN-STD-MVWBFJ20001" tercantum 1 kali |
| TC-APP013-026 | Template TPN: kode sama dua kali, daftar usang, tanpa perubahan | 3 | Template bisa diedit atau dihapus | tidak ada edit atau hapus |
| TC-APP013-026 | Template TPN: kode sama dua kali, daftar usang, tanpa perubahan | 4 | Ditolak dengan pesan yang menyebut batas 64 | toast "tpn failed" |
| TC-APP013-028 | User tanpa peran diet membaca permintaan dan resep TPN | 1 | Tidak ada kartu "Dietary", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/diet |
| TC-APP013-028 | User tanpa peran diet membaca permintaan dan resep TPN | 2 | Akses ditolak | U3 (tanpa hak) membaca /diet/tpn ("Total parenteral nutrition", 10 baris) |
| TC-APP013-028 | User tanpa peran diet membaca permintaan dan resep TPN | 3 | Akses ditolak | U3 (tanpa hak) membaca /diet/requests ("Diet requests", 10 baris) |
| TC-APP013-033 | Klik ganda, dua ahli gizi sekaligus, dan muat ulang | 1 | Satu request. Tombol nonaktif selama bertuliskan "Saving…" | 0 permintaan |
| TC-APP013-033 | Klik ganda, dua ahli gizi sekaligus, dan muat ulang | 4 | Isian disimpan, atau ahli gizi diberi peringatan | isian yang setengah terisi hilang tanpa peringatan |
| TC-APP013-043 | Dua pasien dengan resep | 2 | Cara memilih resep mana yang diasesmen atau diorder | tidak ada: resep pertama di daftar yang dipakai |

## 14 Hospital Accounts

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP014-007 | Diskon di atas batas: ditahan, disetujui, lalu dibayar | 1 | Badge status "Waiting for approval" | diskon 60.000 di atas batas 50.000 tidak ditahan: status "Draft", "Apply discount" nonaktif, tidak ada yang menunggu persetujuan |
| TC-APP014-016 | Pengaturan harga item dan estimasi | 3 | Memilih QA-PARA, jumlah 10 | kartu tidak punya kolom jumlah: setiap baris adalah satu unit |
| TC-APP014-016 | Pengaturan harga item dan estimasi | 4 | Pasien neto Rp 12.500, pajak Rp 1.375, total Rp 13.875 | estimasi bertuliskan "t. Nothing is saved to stock or to a charge. Patient Item code Add line QA-PARA · Paracetamol 500mg Tablet 1 Estimating…" |
| TC-APP014-017 | Klaim asuransi dari kelayakan sampai rekonsiliasi | 2 | Panel line "This charge uses that split: Rp 1.000.000 / Rp 4.000.000" | no split line |
| TC-APP014-019 | Penjualan hanya dengan keyboard | 2 | Kursor pindah ke jumlah tunai | kursor ada di "" |
| TC-APP014-023 | Membayar lebih dari jumlah tagihan | 1 | Kasir diberi tahu ada kembalian 33.500, atau kelebihannya ditolak | diterima: Deposits Rp 200.000, tidak ada kembalian yang ditampilkan |
| TC-APP014-024 | Jumlah yang diketik dengan titik sebagai pemisah ribuan | 1 | Penjualan Rp 150.000 sebelum pajak | penjualan Rp 150: titik dibaca sebagai titik desimal |
| TC-APP014-032 | Refund penuh penjualan yang sudah dibayar | 2 | Status yang menunjukkan penjualan sudah di-refund, tanpa sisa tagihan | status "Draft", Amount due Rp 166.500 |
| TC-APP014-034 | Tagihan dengan sen | 1 | Jumlah tagihan ditampilkan sampai sen, atau dibulatkan menurut aturan cabang | Rp 9.000 |
| TC-APP014-034 | Tagihan dengan sen | 2 | Jumlah yang diterima sama dengan jumlah tagihan (12.487,50) | diterima Rp 9.000 (terisi otomatis 9000) |
| TC-APP014-037 | Menutup hari dengan jumlah yang dilaporkan kosong | 1 | Layar menanyakan jumlahnya, atau meminta konfirmasi | hari U4 langsung ditutup tanpa jumlah yang dilaporkan (Variance "-Rp 2.220.000") |
| TC-APP014-040 | Memberi pasien struk | 2 | Tombol Print atau halaman yang bisa dicetak | tidak ada kontrol cetak atau unduh |
| TC-APP014-040 | Memberi pasien struk | 3 | Struk bisa ditampilkan lagi | struk tidak ditampilkan saat penjualan yang sudah dibayar dicari lagi |
| TC-APP014-046 | Menyiapkan pasien asuransi dari layar | 1 | Formulir atau tombol untuk meminta pra-otorisasi | tidak ada: panel hanya mencari yang sudah ada |
| TC-APP014-046 | Menyiapkan pasien asuransi dari layar | 2 | Formulir atau tombol untuk menambah rujukan dan nomor SEP-nya | tidak ada: "Check SEP" mengecek yang sudah ada |
| TC-APP014-048 | User tanpa peran keuangan melihat tagihan dan laci kas | 1 | Tidak ada kartu "Hospital Accounts", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/billing |
| TC-APP014-048 | User tanpa peran keuangan melihat tagihan dan laci kas | 2 | Akses ditolak | U3 (tanpa hak) membaca /billing/cashier ("Fast Cashier", 0 baris; invoice INV-1793459614-9ba2a260 ditemukan beserta jumlahnya) |
| TC-APP014-052 | Penjualan hilang di layar: Esc, sesi habis, klik ganda | 1 | Layar mempertahankan penjualan, atau bertanya sebelum mengosongkan | Esc langsung mengosongkan seluruh layar, tanpa konfirmasi |
| TC-APP014-061 | Buku besar pasien: menagih layanan rawat inap dari tarif | 4 | A row with the state "open" and "QA-RI-0001-MVWJK9A000D deposit 0" | the list without a search does not show the new invoice (it lists some invoices only) |

## 15 IGD

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP015-003 | Menempatkan bay | 3 | Prioritas 4 | Prioritas 2 |
| TC-APP015-007 | Hub, navigasi, dan bahasa Indonesia | 1 | "Triage & bay assignment (IGD)", tombol "Open visits", dan satu ubin "Visits" di bawah "Workflow" | "Register Emergency Patient, do Triage and Monitor the status."; ubin Registration, Emergency Patients, Triage di bawah "Accident & Emergency" |
| TC-APP015-007 | Hub, navigasi, dan bahasa Indonesia | 2 | Ubin dan item sidebar "Visits" membuka Visits | hub dan sidebar tidak punya "Visits"; layar hanya terbuka lewat alamatnya |
| TC-APP015-008 | Mencari pasien dan tempat tidur | 1 | Daftar pasien yang cocok untuk dipilih | "Patient ID (UUID)" hanya menerima id internal; nama ditolak ("patient_id required") |
| TC-APP015-008 | Mencari pasien dan tempat tidur | 2 | Tidak diperlukan; kalau dicari, ditampilkan | Registered patients tidak menampilkan id internal; test membacanya dari jawaban server |
| TC-APP015-008 | Mencari pasien dan tempat tidur | 3 | Daftar tempat tidur kosong untuk dipilih | "Bed ID (UUID)" hanya menerima id internal; nomor tempat tidur ditolak ("bed_id required") |
| TC-APP015-008 | Mencari pasien dan tempat tidur | 4 | Nama dan MRN pasien serta nomor tempat tidur ditampilkan | baris menampilkan 2 \| 12599094… \| — |
| TC-APP015-009 | Triase tanpa level | 1 | Formulir untuk level atau warna triase, keluhan, dan tanda vital | "Triage" cukup satu klik yang menyimpan waktunya |
| TC-APP015-009 | Triase tanpa level | 2 | Pasien nyeri dada naik di atas pasien cedera pergelangan kaki di daftar | tidak ada tingkat urgensi yang bisa disimpan; pasien cedera pergelangan kaki, yang datang lebih dulu, tetap di atas |
| TC-APP015-009 | Triase tanpa level | 3 | Level triase setiap pasien | kolom Priority adalah tahap kunjungan (1 menunggu, 2 sudah triase, 4 di bay) |
| TC-APP015-010 | Kunjungan untuk ID pasien yang salah atau tidak dikenal | 2 | Ditolak dengan pesan jelas bahwa yang diharapkan adalah ID | toast "patient_id required" |
| TC-APP015-010 | Kunjungan untuk ID pasien yang salah atau tidak dikenal | 4 | Ditolak, atau peringatan bahwa pasien milik cabang lain | "Visit created" untuk PT-B (Qonita Nugroho, Kemayoran) saat bekerja di BR-A |
| TC-APP015-010 | Kunjungan untuk ID pasien yang salah atau tidak dikenal | 5 | Ditolak: record sudah digabung | "Visit created" untuk pasien yang sudah digabung MRN-2026-E657C3B8 |
| TC-APP015-012 | Bay atau triase yang salah | 1 | Aksi "Change bay" | tidak ada tombol yang tersisa di baris |
| TC-APP015-012 | Bay atau triase yang salah | 2 | Bay dibebaskan saat pasien keluar | tidak ada yang membebaskan bay |
| TC-APP015-012 | Bay atau triase yang salah | 3 | Membatalkan klik triase | tidak ada |
| TC-APP015-013 | Pasien yang sama dengan dua kunjungan terbuka | 1 | Peringatan bahwa PT-1 sudah punya kunjungan terbuka | kunjungan kedua dibuat |
| TC-APP015-013 | Pasien yang sama dengan dua kunjungan terbuka | 2 | Satu kunjungan untuk PT-1 | 2 kunjungan |
| TC-APP015-014 | Mengakhiri kunjungan | 1 | Pulang dengan waktu dan hasil akhir | baris kunjungan "In bay" tidak punya tombol |
| TC-APP015-014 | Mengakhiri kunjungan | 2 | Serah terima ke Rawat Inap yang tetap membawa pasien dan kunjungannya | baris kunjungan "In bay" tidak punya tombol |
| TC-APP015-014 | Mengakhiri kunjungan | 3 | Hasil akhir untuk masing-masing; status "Death" untuk yang keempat | baris kunjungan "In bay" tidak punya tombol |
| TC-APP015-015 | Urutan prioritas lintas halaman | 1 | Pasien yang paling lama menunggu ada di baris pertama | pasien yang menunggu tidak ada di halaman 1 (halaman dipotong menurut waktu kedatangan, terbaru di atas) |
| TC-APP015-016 | Waktu yang tampil di daftar | 1 | Hari ini 22:53 (WIB) | "2026-10-31 15:53" (waktu UTC, tujuh jam di belakang) |
| TC-APP015-016 | Waktu yang tampil di daftar | 2 | Hari ini sekitar 22:53 (WIB) | "2026-10-31 15:53" |
| TC-APP015-017 | Rekam klinis dan biaya kunjungan IGD | 1 | Keluhan, tanda vital, dokter penanggung jawab, dan catatan bisa dicatat pada kunjungan | kunjungan tidak punya formulir: hanya prioritas, tempat tidur, waktu triase, dan status |
| TC-APP015-017 | Rekam klinis dan biaya kunjungan IGD | 2 | Kunjungan IGD ditampilkan, dan order terikat padanya | konsultasi tidak menampilkan kunjungan IGD |
| TC-APP015-019 | User tanpa peran IGD membaca kunjungan | 1 | Tidak ada kartu "Emergency", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/emergency |
| TC-APP015-019 | User tanpa peran IGD membaca kunjungan | 2 | Akses ditolak | U3 (tanpa hak) membaca /emergency/visits ("Visits", 10 baris) |
| TC-APP015-020 | Kunjungan cabang lain | 1 | Tidak ada kunjungan BR-B | U1 (Podomoro) melihat 1 kunjungan pasien Kemayoran 0dab9f2c-32a0-5946-bae7-d6890eb7c0fa |
| TC-APP015-023 | Klik ganda, dua perawat sekaligus, dan muat ulang | 2 | Perawat 2 diberi tahu bahwa triase sudah dicatat | triase dicatat untuk kedua kalinya |
| TC-APP015-023 | Klik ganda, dua perawat sekaligus, dan muat ulang | 3 | Perawat 2 diberi tahu bahwa kunjungan sudah punya bay | kunjungan dipindah ke QA-IGD-02-MVWJTWUP00C |
| TC-APP015-023 | Klik ganda, dua perawat sekaligus, dan muat ulang | 4 | Teks disimpan, atau perawat diberi peringatan | id yang setengah diketik hilang tanpa peringatan |
| TC-APP015-032 | Penerimaan yang ditolak | 1 | Toast "That registration is not valid for emergency." | "(no patient offered)" |
| TC-APP015-032 | Penerimaan yang ditolak | 2 | Toast "This visit is already received." | "(no patient offered)" |
| TC-APP015-036 | Walk-in yang ditolak atau ganda | 4 | Peringatan tentang duplikat | pasien kedua dan encounter terbuka kedua tersimpan tanpa peringatan |
| TC-APP015-058 | Layar Visits lama di samping layar baru | 4 | Pasien kedua diterima di Emergency Patients | "tidak ada toast" dan pasien tidak tercantum |

## 16 MRD

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP016-008 | Hub, navigasi, dan bahasa Indonesia | 1 | Tombol "File Requests" | "File Requests" adalah tautan |
| TC-APP016-008 | Hub, navigasi, dan bahasa Indonesia | 3 | Nama kolom, tombol, status, dan toast berbahasa Indonesia | Bahasa Inggris: No. dokumen, Tanggal, Pasien, Status, Aksi |
| TC-APP016-009 | Permintaan berkas tanpa pasien atau peminta | 1 | Pasien harus dipilih dari pasien terdaftar | formulir berisi Document number, Document date, Request type, Purpose |
| TC-APP016-009 | Permintaan berkas tanpa pasien atau peminta | 2 | Kolom untuk peminta atau departemen | tidak ada |
| TC-APP016-009 | Permintaan berkas tanpa pasien atau peminta | 3 | Setiap baris menampilkan pasien dan pemintanya | baris: QA-REQ-011-MVWL3M21007 \| 2026-10-31 \| QA Kontrol \| PKLM · Pinjam klaim \| Yes |
| TC-APP016-010 | Permintaan dan pengeluaran tidak terhubung | 1 | Permintaan bisa dipilih; pasien dan tujuan diambil darinya | dialog pengeluaran tidak menanyakan permintaan |
| TC-APP016-010 | Permintaan dan pengeluaran tidak terhubung | 2 | REQ-1 menampilkan status seperti "Fulfilled", dengan nomor record-nya | baris masih bertuliskan Active "Yes": QA-REQ-001-MVWL3M21009 \| 2026-10-31 \| QA Kontrol poli penyakit dalam \| PKLM · Pinjam klaim \| Yes |
| TC-APP016-010 | Permintaan dan pengeluaran tidak terhubung | 3 | Tombol untuk menolak atau menutup, dengan alasan | tidak ada |
| TC-APP016-011 | Mengeluarkan berkas yang sedang keluar | 1 | Peringatan bahwa berkas PT-1 sedang keluar, dengan nomor peminjaman yang terbuka | tidak ada peringatan saat pasien dipilih |
| TC-APP016-011 | Mengeluarkan berkas yang sedang keluar | 2 | Ditolak: berkas belum dikembalikan | peminjaman kedua untuk berkas yang sama dikeluarkan |
| TC-APP016-012 | Siapa yang memegang berkas dan kapan harus kembali | 1 | Kolom untuk peminjam dan tujuan | tidak ada peminjam; "From" dan "To" adalah tempat berupa teks bebas |
| TC-APP016-012 | Siapa yang memegang berkas dan kapan harus kembali | 2 | Tanggal jatuh tempo | tidak ada |
| TC-APP016-012 | Siapa yang memegang berkas dan kapan harus kembali | 3 | Tanggal kembali dan orang yang menerimanya kembali | baris tidak menampilkan keduanya |
| TC-APP016-012 | Siapa yang memegang berkas dan kapan harus kembali | 4 | Daftar atau tanda untuk berkas yang terlambat kembali | tidak ada (menu: Home, Dashboard, Preferences, Apps, Reports, Analytics, File Requests, Patient Records, Missing diagnosis codes, Visits without a document) |
| TC-APP016-014 | Tidak ada register berkas: pasien baru, lokasi, dan masa simpan | 1 | Entri berkas pasien, dibuat saat pendaftaran | pasien baru tidak tercantum; Patient Records hanya mencantumkan peminjaman |
| TC-APP016-014 | Tidak ada register berkas: pasien baru, lokasi, dan masa simpan | 2 | Lokasi atau nomor rak | kolom Doc no., Doc date, Patient, Status, Actions |
| TC-APP016-014 | Tidak ada register berkas: pasien baru, lokasi, dan masa simpan | 3 | Daftar masa simpan | tidak ada (menu: Home, Dashboard, Preferences, Apps, Reports, Analytics, File Requests, Patient Records, Missing diagnosis codes, Visits without a document) |
| TC-APP016-015 | Nomor dokumen yang sudah dipakai | 1 | Toast "Document number already exists" | toast "Failed to create request" |
| TC-APP016-015 | Nomor dokumen yang sudah dipakai | 3 | Diterima, atau pesan yang menjelaskan di mana nomor itu dipakai | toast "Document number already exists", padahal QA-MR-B01-MVWB0W48003 tidak ada di daftar BR-A (nomor unik lintas cabang) |
| TC-APP016-015 | Nomor dokumen yang sudah dipakai | 4 | Nomor boleh dikosongkan | "Document number" pada "New request" wajib diisi, tanpa nomor otomatis |
| TC-APP016-015 | Nomor dokumen yang sudah dipakai | 4 | Nomor boleh dikosongkan | "Document number" pada "Issue record" wajib diisi, tanpa nomor otomatis |
| TC-APP016-016 | Formulir permintaan dan formulir pengeluaran di batasnya | 1 | Pesan bahwa nomor belum diisi | toast "Choose an active request type. Purpose stays." |
| TC-APP016-016 | Formulir permintaan dan formulir pengeluaran di batasnya | 2 | Ditolak dengan pesan yang menyebut batas 50, atau kolomnya berhenti di sana | toast "Failed to create request" |
| TC-APP016-016 | Formulir permintaan dan formulir pengeluaran di batasnya | 3 | Ditolak dengan pesan yang menyebut batas 255 | toast "Failed to create request" |
| TC-APP016-016 | Formulir permintaan dan formulir pengeluaran di batasnya | 5 | Ditolak dengan pesan yang menyebut batas 1.000 | toast "Failed to issue record" |
| TC-APP016-016 | Formulir permintaan dan formulir pengeluaran di batasnya | 6 | Ditolak, atau peringatan tentang tanggal | tersimpan: permintaan 1900-01-01, record 2099-12-31 |
| TC-APP016-017 | Pencarian pasien yang tidak menemukan apa pun atau terlalu banyak | 1 | Teks seperti "No patients found" | tidak ada yang muncul, tanpa pesan |
| TC-APP016-017 | Pencarian pasien yang tidak menemukan apa pun atau terlalu banyak | 2 | Semua pasien yang cocok, atau 10 pertama dengan petunjuk bahwa masih ada lagi | 10 pasien tanpa petunjuk dan tanpa halaman berikutnya |
| TC-APP016-017 | Pencarian pasien yang tidak menemukan apa pun atau terlalu banyak | 3 | Tidak ada apa-apa, dengan teks yang menyatakannya | tidak ada yang muncul, tanpa pesan |
| TC-APP016-017 | Pencarian pasien yang tidak menemukan apa pun atau terlalu banyak | 4 | Pasien ditemukan lewat tanggal lahir atau NIK | tidak ada yang ditemukan: pencarian hanya melihat nama dan MRN |
| TC-APP016-018 | Mengembalikan berkas dua kali atau karena salah | 2 | Toast "Record already returned" | "Failed to return record" |
| TC-APP016-018 | Mengembalikan berkas dua kali atau karena salah | 4 | Pembatalan yang mengembalikan record ke "Issued" | baris yang sudah dikembalikan menawarkan Movement, Open review |
| TC-APP016-019 | Mengubah atau membatalkan permintaan atau catatan pengeluaran | 1 | Permintaan terbuka untuk diedit | baris tidak bisa dibuka |
| TC-APP016-019 | Mengubah atau membatalkan permintaan atau catatan pengeluaran | 2 | Pembatalan; baris lalu menunjukkan Active "No" | tidak ada batal |
| TC-APP016-019 | Mengubah atau membatalkan permintaan atau catatan pengeluaran | 3 | Record terbuka; pasien bisa dikoreksi, atau pengeluaran dibatalkan dengan alasan | hanya Movement, Open review, Return |
| TC-APP016-020 | Mencari permintaan, pinjaman, atau berkas yang sedang keluar | 1 | Pencarian menurut pasien, MRN, atau nomor dokumen | tidak ada |
| TC-APP016-020 | Mencari permintaan, pinjaman, atau berkas yang sedang keluar | 2 | Filter "Issued" | tidak ada |
| TC-APP016-020 | Mencari permintaan, pinjaman, atau berkas yang sedang keluar | 3 | Daftar diurutkan menurut kolom itu | klik pada judul kolom tidak berbuat apa-apa |
| TC-APP016-020 | Mencari permintaan, pinjaman, atau berkas yang sedang keluar | 4 | Pencarian menurut nomor atau tujuan | tidak ada |
| TC-APP016-021 | Pasien digabung setelah rekam medis dikeluarkan | 1 | Baris menampilkan PT-1, pasien yang tersisa, atau catatan tentang penggabungan | baris masih menyebut PT-2: "QA-MR-001-MVWKZMMF00B 2026-10-31 QA-MRD Pasien Dua MVWKZMMF00AMRN-2026-AA2338F5 Dipinjam Movement Open review Return" |
| TC-APP016-022 | User tanpa hak rekam medis | 1 | Ditolak dengan pesan bahwa user tidak boleh melakukan ini | toast "Failed to create request" |
| TC-APP016-023 | User tanpa peran rekam medis membaca daftar peminjaman | 1 | Tidak ada kartu "MRD", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/mrd |
| TC-APP016-023 | User tanpa peran rekam medis membaca daftar peminjaman | 2 | Akses ditolak | U3 (tanpa hak) membaca /mrd/records ("Patient Records", 10 baris) |
| TC-APP016-023 | User tanpa peran rekam medis membaca daftar peminjaman | 3 | Tidak ada pasien yang ditampilkan ke user ini | "Find" dengan kotak kosong mencantumkan 10 pasien ke U3 (mis. "QA-PCR Pasien Satu MVWKU1F1004 MRN-2026-901B9D7A") |
| TC-APP016-028 | Klik ganda, dua petugas sekaligus, dan muat ulang | 4 | Teks disimpan, atau petugas diberi peringatan | formulir yang setengah terisi hilang tanpa peringatan |
| TC-APP016-030 | Jenis dan permintaan yang ditolak | 1 | Toast "That code already exists" | toast "Failed to create request" |
| TC-APP016-030 | Jenis dan permintaan yang ditolak | 3 | Toast "Choose an active request type. Purpose stays." | browser menghentikan klik ("Please select an item in the list."); teks itu adalah baris pertama daftar |
| TC-APP016-035 | Telaah yang ditolak atau hilang | 2 | Toast "That review step is not available" | toast "Failed to issue record" |

## 17 Penggajian

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP017-014 | Periode diketik sebagai teks bebas | 1 | A month can be chosen | a text field (type "null", hint "YYYY-MM") |
| TC-APP017-020 | Komponen gaji tidak bisa dilihat atau dikelola | 1 | Daftar dengan nama, jenis, tarif atau jumlah, dan apakah penghasilan atau potongan | tidak ada layar seperti itu (hub: Batches) |
| TC-APP017-020 | Komponen gaji tidak bisa dilihat atau dikelola | 2 | Komponen bisa diedit | tidak ada layar untuk mengedit komponen (menu Payroll: Batches, Year, Payroll record, Tax, Calculate, Payslip, Reimburse) |
| TC-APP017-020 | Komponen gaji tidak bisa dilihat atau dikelola | 3 | Komponen bisa ditetapkan | tidak ada layar untuk menetapkan komponen (menu Payroll: Batches, Year, Payroll record, Tax, Calculate, Payslip, Reimburse) |
| TC-APP017-022 | User tanpa peran penggajian membuka layar penggajian | 1 | Tidak ada kartu "Payroll", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/payroll |
| TC-APP017-022 | User tanpa peran penggajian membuka layar penggajian | 2 | Akses ditolak | U3 (tanpa hak) membaca /payroll/batches ("Payroll batches", 10 baris) |
| TC-APP017-022 | User tanpa peran penggajian membuka layar penggajian | 3 | Tidak ada karyawan yang ditampilkan ke user ini | "a" menawarkan 8 karyawan ke U3 (mis. "EMP-ANDI · dr. Andi Saputra, Sp.Rad") |
| TC-APP017-047 | Pencarian yang tidak menemukan apa pun | 1 | TBD: tidak ada baris; pencarian hanya melihat nomor karyawan, periode, dan jumlah | 1 baris |

## 18 Settings

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP018-001 | Direktori Settings: grup, pencarian, dan tautan | 1 | six groups: Organization, Reference, Access, Appearance, Workflow, Trail | 7 groups: Organization, Reference, Access, Appearance, Workflow, Licensing, Trail |
| TC-APP018-001 | Direktori Settings: grup, pencarian, dan tautan | 2 | "Settings", "Jump to a group" and Organization 3 Reference 3 Access 6 Appearance 7 Workflow 1 Trail 1 | "Settings Jump to a group Organization 4 Reference 3 Access 6 Appearance 7 Workflow 1 Licensing 2 Trail 1" |
| TC-APP018-012 | Dua hub, navigasi, dan bahasa Indonesia | 2 | Direktori Settings dari langkah 1 | halaman kedua "Settings" dengan "Master Data — org hierarchy and reference packs" dan ubin Add Site, Sites, Facility time, Departments, Service Centers, Countries, Cities, Units of Measure, Tax Codes |
| TC-APP018-012 | Dua hub, navigasi, dan bahasa Indonesia | 4 | "Tambah Departemen", "Kode departemen", "Departemen ditambahkan." | "Tambah Departemen", Kode departemen, Nama departemen, toast "Department added." |
| TC-APP018-013 | User tanpa hak data master mengubah departemen dan pusat layanan | 1 | Ditolak | Menambah departemen diterima untuk U3 (tanpa hak): toast "Department added." |
| TC-APP018-013 | User tanpa hak data master mengubah departemen dan pusat layanan | 2 | Ditolak | Mengganti nama dan menonaktifkan DEP-1 diterima untuk U3 (tanpa hak): toast "Department updated." |
| TC-APP018-013 | User tanpa hak data master mengubah departemen dan pusat layanan | 3 | Ditolak | Menambah pusat layanan diterima untuk U3 (tanpa hak): toast "Service center added." |
| TC-APP018-013 | User tanpa hak data master mengubah departemen dan pusat layanan | 4 | Ditolak | Menonaktifkan SC-1 diterima untuk U3 (tanpa hak): toast "Service center updated." |
| TC-APP018-014 | User tanpa hak data master: lokasi, daftar referensi, dan kode pajak | 1 | Ditolak dengan pesan bahwa user tidak boleh melakukan ini | toast "Failed to save site." |
| TC-APP018-015 | Kode yang sudah dipakai | 1 | Pesan bahwa kode sudah ada. Tidak ada baris yang ditambahkan | toast "Failed to save site." |
| TC-APP018-015 | Kode yang sudah dipakai | 2 | Pesan bahwa kode sudah ada | toast "Failed to save department." |
| TC-APP018-015 | Kode yang sudah dipakai | 3 | Pesan bahwa kode sudah ada | toast "Failed to save country." |
| TC-APP018-016 | Kode atau nama berisi spasi saja, diapit spasi, atau sangat panjang | 3 | Yang pertama tersimpan tanpa spasi; yang kedua ditolak sebagai ganda | keduanya tersimpan: spasinya tetap ada |
| TC-APP018-016 | Kode atau nama berisi spasi saja, diapit spasi, atau sangat panjang | 4 | Ditolak dengan pesan yang menyebut batas, atau kolomnya berhenti di sana | nama 500 karakter tersimpan |
| TC-APP018-017 | Menjadikan cabang nonaktif | 1 | Peringatan yang menyebut user, departemen, dan pekerjaan terbuka di cabang, lalu meminta konfirmasi | langsung dinonaktifkan tanpa peringatan |
| TC-APP018-017 | Menjadikan cabang nonaktif | 3 | Departemen SITE-NEW ditandai milik cabang yang ditutup | tidak ada tanda cabang tutup pada departemen |
| TC-APP018-018 | Tanda kantor pusat dan cabang induk | 1 | Ditolak, atau tandanya pindah dari BR-A ke SITE-NEW | kedua site ditampilkan sebagai "Head office" |
| TC-APP018-018 | Tanda kantor pusat dan cabang induk | 2 | Ditolak: kantor pusat tidak bisa ditutup | tersimpan: kantor pusat SITE-NEW menjadi "Inactive" (toast "Site updated.") |
| TC-APP018-018 | Tanda kantor pusat dan cabang induk | 3 | Induk bisa dipilih | dialog berisi Site code, Site name, Head office, Active |
| TC-APP018-019 | Departemen nonaktif masih ditawarkan di modul lain | 1 | DEP-1 tidak ditawarkan, atau ditandai nonaktif | departemen nonaktif ditawarkan tanpa tanda |
| TC-APP018-019 | Departemen nonaktif masih ditawarkan di modul lain | 2 | Ditolak: departemen tidak aktif | karyawan tersimpan di bawah departemen nonaktif |
| TC-APP018-019 | Departemen nonaktif masih ditawarkan di modul lain | 3 | DEP-1 tidak ditawarkan | departemen nonaktif ditawarkan |
| TC-APP018-020 | Memindahkan departemen atau pusat layanan ke cabang lain | 1 | Ditolak, atau peringatan bahwa ada pusat layanan dan karyawan di bawahnya | langsung dipindah ke Kemayoran (toast "Department updated."), dengan SC-1 di bawahnya |
| TC-APP018-020 | Memindahkan departemen atau pusat layanan ke cabang lain | 2 | SC-1 masih cocok dengan departemennya | SC-1 menampilkan Site Podomoro di bawah DEP-1, yang sekarang ada di Kemayoran |
| TC-APP018-021 | Menghapus entri data master | 1 | Hapus, ditawarkan selama entri belum dipakai | tidak ada (dialog: Cancel, Save) |
| TC-APP018-021 | Menghapus entri data master | 2 | Jumlah record yang memakainya | tidak ada yang menunjukkan di mana entri dipakai |
| TC-APP018-023 | Daftar referensi: nilai janggal, dan di mana daftar dipakai | 1 | Ditolak: faktor harus di atas nol | satuan dengan faktor "0" ditambahkan |
| TC-APP018-023 | Daftar referensi: nilai janggal, dan di mana daftar dipakai | 1 | Ditolak: faktor harus di atas nol | satuan dengan faktor "-5" ditambahkan |
| TC-APP018-023 | Daftar referensi: nilai janggal, dan di mana daftar dipakai | 1 | Ditolak: faktor harus di atas nol | satuan dengan faktor "" ditambahkan |
| TC-APP018-023 | Daftar referensi: nilai janggal, dan di mana daftar dipakai | 2 | Ditolak, atau peringatan | negara ditambahkan dengan kode telepon "abc" |
| TC-APP018-023 | Daftar referensi: nilai janggal, dan di mana daftar dipakai | 3 | Negara dan kota ditawarkan | formulir pendaftaran tidak punya daftar negara, kewarganegaraan, atau kota |
| TC-APP018-023 | Daftar referensi: nilai janggal, dan di mana daftar dipakai | 4 | Unit ditawarkan | item tidak punya daftar satuan |
| TC-APP018-024 | Kode pajak: tarif dan jenis di batasnya | 1 | tarif "": toast "Rate must be between 0 and 100." | browser menghentikan klik (Rate (%): Please fill out this field.) |
| TC-APP018-024 | Kode pajak: tarif dan jenis di batasnya | 2 | Tersimpan sebagai 11.5, atau petunjuk untuk memakai titik | toast "Rate must be between 0 and 100.", yang tidak menyebut koma |
| TC-APP018-024 | Kode pajak: tarif dan jenis di batasnya | 3 | Ditolak, atau dibulatkan dengan petunjuk | tersimpan sebagai "11.5556%" tanpa petunjuk |
| TC-APP018-025 | Mengubah atau menonaktifkan kode pajak, dan di mana tarif berlaku | 1 | Tanggal berlaku mulai, agar dokumen lama tetap 11 | tidak ada tanggal: tarif berubah untuk setiap dokumen |
| TC-APP018-025 | Mengubah atau menonaktifkan kode pajak, dan di mana tarif berlaku | 2 | Tarif kode pajak, kalau penjualan memakainya | penjualan farmasi tidak menyebut kode pajak: pajaknya adalah "Tax rate (%)" di pengaturan konter Fast Cashier (11) |
| TC-APP018-025 | Mengubah atau menonaktifkan kode pajak, dan di mana tarif berlaku | 3 | Tarif kode pajak, kalau invoice memakainya | invoice kasir tidak menyebut kode pajak: pajaknya adalah "Tax rate (%)" di pengaturan konter (11) |
| TC-APP018-030 | Klik ganda, dua admin sekaligus, dan muat ulang | 2 | Yang kedua diberi tahu bahwa entri sudah diubah sementara itu | tersimpan tanpa peringatan; baris sekarang bertuliskan QA-DEP-01-MVWL5QK500G \| QA Zz Poli Admin Dua MVWL5QK500J |
| TC-APP018-030 | Klik ganda, dua admin sekaligus, dan muat ulang | 3 | Teks disimpan, atau admin diberi peringatan | formulir yang setengah terisi hilang tanpa peringatan |
| TC-APP018-031 | User: menambah user dengan role di satu cabang dan gudang | 3 | baris dengan role "perawat" | "Roles" bertuliskan "—" |
| TC-APP018-031 | User: menambah user dengan role di satu cabang dan gudang | 5 | Hanya cabang yang dipilih di header | header tidak menyebut cabang: "KlikMed Home Dashboard Preferences Apps Reports Analytics Notifications No notifications yet. ID Language ID EN AR Q QA-Perawat Uji MVWL9CEY002 QA-Perawat Uji MVWL9CEY002 perawat Profile Preferences Sign out" |
| TC-APP018-031 | User: menambah user dengan role di satu cabang dan gudang | 6 | Entri user.create dengan login-nya | entri tidak menyebut login-nya: "31/10/2026, 23.01.35 user.create platform/identity admin2 succeeded admin2" |
| TC-APP018-032 | User yang ditolak server | 2 | Toast "Failed to save user." | browser menghentikan klik (Password: Please fill out this field.) |
| TC-APP018-044 | Logo yang ditolak | 1 | Teks "The logo is over 200 KB." | file (300 KB) dibuang tanpa keterangan; "No logo yet" tetap ada |
| TC-APP018-044 | Logo yang ditolak | 2 | Teks "The logo must be PNG, JPEG, or WebP." | GIF dibuang tanpa keterangan |
| TC-APP018-044 | Logo yang ditolak | 3 | Toast "Failed to save branding." | browser menghentikan klik (Logo URL: Please enter a URL.) |
| TC-APP018-046 | Penimpaan tema dan konfigurasi dasbor: preferensi sendiri atau pengaturan rumah sakit | 1 | Layar "Theme overrides" dengan pilihan tampilan dan warna, dan di bawahnya formulir branding | layar "Settings": hanya formulir branding |
| TC-APP018-046 | Penimpaan tema dan konfigurasi dasbor: preferensi sendiri atau pengaturan rumah sakit | 2 | Layar langsung menjadi gelap untuk user ini | tidak ada tampilan gelap yang ditawarkan di layar ini |
| TC-APP018-047 | Aturan notifikasi: siapa diberi tahu saat klaim BPJS diajukan | 2 | Daftar "Alert type" dan "Severity" | kolom teks, diisi "bpjs.claim.submitted" dan "SUBMITTED" |
| TC-APP018-047 | Aturan notifikasi: siapa diberi tahu saat klaim BPJS diajukan | 3 | baris dengan ketiga nilai (role "finance") | role ditampilkan sebagai "fe3c6bd7-2d97-5d7c-a50d-03cad2a3145a" |
| TC-APP018-055 | Rantai yang ditolak atau meragukan | 1 | Teks "Add at least one approval step." | "Remove step 1" nonaktif di langkah terakhir, jadi rantai tanpa langkah tidak bisa dibuat; kalau nama satu-satunya langkah dikosongkan, "Next" nonaktif dan teksnya tidak ditampilkan |

## 19 Finance

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP019-002 | Membaca periode tahun buku | 2 | Setiap baris punya … "Open" | baris tidak menampilkan status; periode terbuka menawarkan "Lock" dan "Mark adjustment" |
| TC-APP019-004 | Bagan akun: grup dan akun daun di bawahnya | 2 | "Branch restriction" ("All branches") | daftar "Branches allowed to use this account" (tidak ada yang dipilih: "Global account") dan daftar "Users allowed to use this account" |
| TC-APP019-014 | Hub, navigasi, dan bahasa Indonesia | 1 | lima ubin: Financial years, Chart of accounts, Budget posting rules, Vouchers, ERP staging | 10 ubin di bawah MASTER, BUKU BESAR: Financial years, Chart of accounts, Branch configuration, Currency, Cost centres, Account maps, Budget posting rules, Vouchers, Journals, ERP staging |
| TC-APP019-015 | Voucher tanpa akun atau baris debit dan kredit | 1 | Formulir menanyakan rekening bank | kolom yang sama untuk setiap jenis: Doc no, Doc date, Doc type 1. Journal 2. Cash Payment 3. Cash Receipt 4. Bank Payment 5. Bank Receipt 6. Contra 7. Credit Memo 8. Debit Memo 9. Opening Balance 10. Purchase 11. Sales 12. Payroll, Currency, Voucher value, Party, Narration |
| TC-APP019-015 | Voucher tanpa akun atau baris debit dan kredit | 2 | Baris bisa ditambah; total kedua sisi ditampilkan dan harus sama | tidak ada baris, debit, maupun kredit |
| TC-APP019-015 | Voucher tanpa akun atau baris debit dan kredit | 3 | Baris-baris dengan akunnya | hanya header: "VCH-1793464166 Bank Payment Close Doc date 2026-10-31 Voucher value IDR 1.500.000,00 Party QA PT Uji MVWM87IQ003 Status " |
| TC-APP019-016 | Voucher manual tetap "Open" | 1 | Voucher bisa diedit selama masih terbuka | baris menawarkan Open |
| TC-APP019-016 | Voucher manual tetap "Open" | 2 | Langkah persetujuan dan posting; status menjadi "Posted" | baris menawarkan Open; status "VCH-1793463206 2026-10-31 Journal QA Pihak Uji MVWLN9WB003 IDR 100.000,00 Terbuka Buka" |
| TC-APP019-016 | Voucher manual tetap "Open" | 3 | Pembatalan, atau voucher pembalik | baris menawarkan Open |
| TC-APP019-017 | Voucher di tahun yang terkunci, atau di tanggal di luar semua tahun | 2 | Ditolak: tidak ada tahun buku untuk tanggal ini | voucher bertanggal 2033-12-31 dibuat |
| TC-APP019-018 | Formulir voucher di batasnya | 1 | Ditolak: voucher butuh nilai | voucher "IDR 0,00" tersimpan |
| TC-APP019-018 | Formulir voucher di batasnya | 4 | Ditolak: bukan mata uang | tersimpan; detail bertuliskan "VCH-1793445763 Journal Close Doc date 2026-10-31 Voucher value XYZ 1.000,00 Party QA PT Uji MVWBA89G" |
| TC-APP019-020 | Tahun buku yang tidak mungkin benar | 5 | Ditolak, atau peringatan | tahun QA-FY-MVWLRTBS00K tersimpan; tanggal finalisasi tidak dibandingkan dengan tahunnya |
| TC-APP019-021 | Mengubah, menghapus, atau menutup tahun buku per periode | 1 | The year can be edited while nothing is booked in it | the row offers Periods, Lock |
| TC-APP019-021 | Mengubah, menghapus, atau menutup tahun buku per periode | 2 | A delete, offered while the year is empty | the row offers Periods, Lock |
| TC-APP019-023 | Menonaktifkan akun yang dipakai aturan posting | 1 | Peringatan bahwa akun dipakai aturan posting | langsung dinonaktifkan: toast "Account updated." dan tanpa peringatan |
| TC-APP019-024 | Buku besar, saldo akun, dan laporan | 1 | Entri yang dibukukan ke akun dan saldonya | baris tidak bisa dibuka; yang ditawarkan Edit |
| TC-APP019-024 | Buku besar, saldo akun, dan laporan | 2 | Ada ubin atau laporan | hub berisi Financial years, Chart of accounts, Branch configuration, Currency, Cost centres, Account maps, Budget posting rules, Vouchers, Journals, ERP staging; "Trial balance" hanya ada di menu |
| TC-APP019-024 | Buku besar, saldo akun, dan laporan | 3 | Pencarian, filter, dan ekspor | pencarian 0, filter 0, ekspor 0 |
| TC-APP019-025 | Aturan posting cabang lain | 1 | Hanya BR-A | daftar Branch menawarkan BR02 · Daan Mogot, BR01 · Kemayoran, HO · Podomoro, QA-SITE-01 · QA Klinik Uji, QA-SITE-01-MV9FG8HL201 · QA Klinik Uji MV9FG8HL202, qa-site-01 · QA Klinik Uji MV9FG8HL50D, QA-SITE-01-MVDE6HKD4804 · QA Klinik Uji MVDE6HKD4805, QA-SITE-01-MVDHF9E5610V · QA Klinik Uji MVDHF9E5610W, QA-SITE-01-MVHTT7UV9507 · QA Klinik Uji MVHTT7UV9508, QA-SITE-01-MVTA3XMZ201 · QA Klinik Uji MVTA3XMZ202 |
| TC-APP019-027 | Staging ERP: asal baris dan apa yang bisa dilakukan | 1 | Invoice tercantum sebagai "Pending" | INV-1793445683-fdc520b1 tidak tercantum |
| TC-APP019-027 | Staging ERP: asal baris dan apa yang bisa dilakukan | 2 | Tombol untuk memposting satu invoice atau semua yang menunggu | layar menawarkan , 1, |
| TC-APP019-027 | Staging ERP: asal baris dan apa yang bisa dilakukan | 3 | Voucher untuk invoice tersebut | tidak ada voucher yang menyebut INV-1793445683-fdc520b1 |
| TC-APP019-029 | User tanpa peran keuangan membaca voucher dan invoice staging | 1 | Tidak ada kartu "Finance", atau kartunya membuka halaman "no access" | kartu ditampilkan ke U3 (tanpa hak) dan membuka /id/finance |
| TC-APP019-029 | User tanpa peran keuangan membaca voucher dan invoice staging | 2 | Akses ditolak | U3 (tanpa hak) membaca /finance/vouchers ("Vouchers", 10 baris) |
| TC-APP019-029 | User tanpa peran keuangan membaca voucher dan invoice staging | 3 | Akses ditolak | U3 (tanpa hak) membaca /finance/erp-invoice-staging ("ERP invoice staging", 1 baris) |
| TC-APP019-034 | Klik ganda, dua akuntan sekaligus, dan muat ulang | 2 | Yang kedua diberi tahu bahwa akun sudah diubah sementara itu | tersimpan tanpa peringatan; baris bertuliskan QA-5010-MVWLN9WB006 \| QA Beban Uji MVWLN9WB007 \| Expense |
| TC-APP019-034 | Klik ganda, dua akuntan sekaligus, dan muat ulang | 3 | Isian disimpan, atau akuntan diberi peringatan | voucher yang setengah diketik hilang tanpa peringatan |
| TC-APP019-035 | Konfigurasi cabang: tahun, akun kontrol, user, dan kelayakan imprest | 4 | Baris dengan user, batas, dan kotak centang "Super user" | tidak ada baris yang muncul setelah "Add user"; tidak ada isian untuk batas |
| TC-APP019-036 | Konfigurasi yang ditolak | 1 | Teks "A financial year is required." | browser menghentikan klik (Current financial year: Please select an item in the list.) |
| TC-APP019-036 | Konfigurasi yang ditolak | 2 | Teks "At least one user must be allowed to transact." | toast "Configuration saved.": tersimpan tanpa user ("Add user" tidak menambah baris, TC-APP019-035) |
| TC-APP019-036 | Konfigurasi yang ditolak | 3 | Teks bahwa kelayakan imprest butuh jenis, jumlah, akun, dan departemen, karyawan, atau pihak | baris yang hanya berisi jenis tersimpan ("Configuration saved.") |
| TC-APP019-041 | Pusat biaya yang ditolak | 1 | Teks "The shares must total 100%." | toast "Shares must total 100%." |
| TC-APP019-045 | Jurnal yang ditolak dialog | 2 | The text "A journal needs at least two lines." | "lan MVTAC7N060D QA-RJ-MVTGO7QK40F · QA-Rawat Jalan MVTGO7QK40I QA-RJ-MVWLRTBS019 · QA-Rawat Jalan MVWLRTBS01C QA-RJ-MVWLRTBS01H · QA-Rawat Jalan MVWLRTBS01K Debit 1000000.00 · Kredit 0.00 Tutup Simpan" |
| TC-APP019-045 | Jurnal yang ditolak dialog | 3 | The text "Narration is required." | "TAC7N060D QA-RJ-MVTGO7QK40F · QA-Rawat Jalan MVTGO7QK40I QA-RJ-MVWLRTBS019 · QA-Rawat Jalan MVWLRTBS01C QA-RJ-MVWLRTBS01H · QA-Rawat Jalan MVWLRTBS01K Debit 1000000.00 · Kredit 1000000.00 Tutup Simpan" |
| TC-APP019-045 | Jurnal yang ditolak dialog | 4 | The text "A reversible journal needs a reverse date." | "TAC7N060D QA-RJ-MVTGO7QK40F · QA-Rawat Jalan MVTGO7QK40I QA-RJ-MVWLRTBS019 · QA-Rawat Jalan MVWLRTBS01C QA-RJ-MVWLRTBS01H · QA-Rawat Jalan MVWLRTBS01K Debit 1000000.00 · Kredit 1000000.00 Tutup Simpan" |
| TC-APP019-051 | Dokumen yang ditolak dialog | 1 | The text "Instrument number, type, date, and validity are required." | "uaran Uji MV9H0RI460P QA-2110-MVDE6HKD580I · QA PPN Keluaran Uji MVDE6HKD580J QA-2110-MVDE6HKD580O · QA PPN Keluaran Uji MVDE6HKD580P QA-2110-MVDHF9E5710I · QA PPN Keluaran Uji MVDHF9E5710J Close Save" |
| TC-APP019-051 | Dokumen yang ditolak dialog | 2 | The text "A cash receipt needs a beneficiary." | "uaran Uji MV9H0RI460P QA-2110-MVDE6HKD580I · QA PPN Keluaran Uji MVDE6HKD580J QA-2110-MVDE6HKD580O · QA PPN Keluaran Uji MVDE6HKD580P QA-2110-MVDHF9E5710I · QA PPN Keluaran Uji MVDHF9E5710J Close Save" |
| TC-APP019-051 | Dokumen yang ditolak dialog | 3 | The text "This voucher needs a party and a reference number." | "uaran Uji MV9H0RI460P QA-2110-MVDE6HKD580I · QA PPN Keluaran Uji MVDE6HKD580J QA-2110-MVDE6HKD580O · QA PPN Keluaran Uji MVDE6HKD580P QA-2110-MVDHF9E5710I · QA PPN Keluaran Uji MVDHF9E5710J Close Save" |
| TC-APP019-055 | Pembayaran yang ditolak | 2 | Teks "A bank instrument is required." | "tidak ada toast" |
| TC-APP019-069 | Permintaan yang ditolak | 3 | Teks "An approved legal agreement is required." | "tidak ada toast" |
| TC-APP019-075 | Langkah yang ditolak | 1 | Teks "This letter of credit step is not allowed yet." | "tidak ada toast" |
| TC-APP019-077 | Perjanjian dan pinjaman di batasnya | 1 | Teks "The party needs a ledger account." | "tidak ada toast" |
| TC-APP019-078 | Lembar audit: lembar kasar, observasi, lembar bersih, dan lembar audit | 2 | Lembar disetujui; setiap observasi membuka satu tugas workflow untuk auditee-nya | "Save" tidak mencantumkan lembar kasar ("no toast"; layar tidak punya daftar) |

## 20 Anggaran

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP020-014 | Surat edaran yang ditolak | 1 | Teks "The due date is before the circular date." | "A Zz Poli Admin Dua MVTP5TF7106 QA Zz Poli Admin Dua MVWL5QK500J QA Zz Poli Cepat MVTP5TF7102 QA Zz Poli Cepat MVWL5QK500F QA Zz Poli Uji MV9FG8HL305 In-charge Departments come from MDM and employees from HR. Cancel Save" |
| TC-APP020-014 | Surat edaran yang ditolak | 7 | Teks "The circular can be changed only while it is a draft." | tidak ada "Edit" di baris surat edaran yang sudah dikirim, jadi tidak ada teks yang ditampilkan |
| TC-APP020-016 | Anggaran internal yang ditolak | 3 | Teks "The circular does not ask this department for a budget." | departemen yang tidak tercantum di surat edaran ditawarkan |
| TC-APP020-016 | Anggaran internal yang ditolak | 7 | Teks "Add at least one head" | "Internal budget BIB000023 saved as draft. / " |
| TC-APP020-017 | Jumlah | 2 | Teks "Enter an amount above zero with at most two decimals." dan tidak ada anggaran internal yang tersimpan | anggaran internal BIB000024 tersimpan dengan jumlah "150,5" |
| TC-APP020-020 | Konsolidasi yang ditolak | 5 | Anggaran internal dari permintaan yang ditolak tercantum lagi | BIB000026 tidak ditawarkan setelah ditolak |
| TC-APP020-038 | Posisi di batasnya | 1 | The text "No budget lines yet. A line is created when an allocation is approved." | "r alokasi Allocated Transferred in Transferred out Reserved Utilised Balance History OBAT · 2026 B14-OPS · Belanja obat Pharmacy · DIPA-2026 DIPA 1.000.000 0 0 0 0 1.000.000 History Showing 1–1 of 1 1" |

## 21 CSSD

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP021-004 | Master yang ditolak | 1 | Teks "Choose an indicator type." | browser menghentikan klik (Indicator Type: Please select an item in the list.) |
| TC-APP021-004 | Master yang ditolak | 2 | Teks "Choose a test name." | browser menghentikan klik (Test Name: Please select an item in the list.) |
| TC-APP021-009 | Permintaan yang ditolak | 2 | Teks "The transit store is not the requesting store." | "Request saved." |
| TC-APP021-009 | Permintaan yang ditolak | 4 | Teks "Each line needs an active packing type." | "Request saved." |
| TC-APP021-009 | Permintaan yang ditolak | 5 | Teks "That item is already on the request." | "Request saved." |
| TC-APP021-013 | Penerimaan yang ditolak | 1 | Teks "please select the document to convert." | "tidak ada yang ditampilkan" |
| TC-APP021-013 | Penerimaan yang ditolak | 3 | Teks "Received quantity cannot be negative." | "tidak ada yang ditampilkan" |
| TC-APP021-018 | Siklus yang ditolak | 1 | Teks "End is before start." | "cssd: invalid input" |
| TC-APP021-018 | Siklus yang ditolak | 2 | Teks "Expiry must be after the sterilization date." | "cssd: invalid input" |
| TC-APP021-018 | Siklus yang ditolak | 3 | Teks "Add at least one set or item." | "cssd: invalid input" |
| TC-APP021-018 | Siklus yang ditolak | 4 | Teks "That packing number is not an unsterile set." | "cssd: invalid input" |

## 22 Services

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP022-013 | Order yang ditolak | 2 | Ditolak (teks server berakhir dengan "document is missing") | tersimpan ("Saved.") |

## 23 Sourcing

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP023-021 | Sourcing tanpa hak sourcing, dan apa yang dicatat | 3 | Ditolak; penawaran tetap "opened" | "missing required privilege", penawaran bertuliskan "" |

## 24 Housekeeping

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP024-002 | Lokasi yang ditolak | 5 | Ditolak (teks server berakhir dengan "location is missing") | tersimpan ("Saved.") |
| TC-APP024-007 | Log harian: siapa membersihkan di mana, dan persetujuannya | 3 | baris dengan status "draft" | log baru bertuliskan "sent" |

## Rantai E2E

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 3 (TC-APP001-019 langkah 4) | tombol diganti kata "Called" | tombol diganti "Start encounter" (aksi: Start encounter Set MLC Record document) |
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 4 (TC-APP003-001 langkah 3) | Panel kiri: nama, MRN, dan "DOB" | nama dan MRN; tanpa tanggal lahir |
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 5 (TC-APP003-002 langkah 4) | Sisa 10 | Sisa menunjukkan "10 / 10" (sisa / diorder) |
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 6 (TC-APP005-001 langkah 7) | Cabang BR-A saat Confirm | Confirm menampilkan gudang dan ringkasan; tanpa cabang |
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 7 (TC-APP005-014 langkah 3) | One sales voucher referring to the invoice RX-a1db58a3 | the newest SV- voucher does not name RX-a1db58a3: "SV-f8763bc8-ee91-49d3-888a-833a9b519254 Sales Close Doc date 2026-10-31 Voucher value IDR 13.875,00 Party QA-PHA Pasien Satu MVW7T649003 Status Posted Narration" |
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 9 (TC-APP014-040 langkah 2) | Tombol Print atau halaman yang bisa dicetak | no print or download control on the receipt; the printout is the browser print of the screen |
| E2E-001 | Rawat jalan: pasien daftar sampai invoice dibayar, struk dicetak, dan masuk Finance | 9 (TC-APP014-040 langkah 3) | Struk bisa ditampilkan lagi | struk tidak ditampilkan saat penjualan yang sudah dibayar dicari lagi |
| E2E-004 | Rawat inap: masuk sampai pulang, tagihan dan koding | 1 (TC-APP004-058 langkah 1) | Kolom "Branch" | tidak ada kolom Branch (U1 bekerja di satu cabang) |
| E2E-006 | Kamar operasi: permintaan sampai pemakaian bahan | 1 (TC-APP008-025 langkah 1) | Dialog dengan "Branch", … | tidak ada kolom "Branch" (permintaan memakai cabang sesi) |
| E2E-011 | Anggaran: tahun anggaran sampai realisasi | 2 (TC-APP019-004 langkah 2) | "Branch restriction" ("All branches") | daftar "Branches allowed to use this account" (tidak ada yang dipilih: "Global account") dan daftar "Users allowed to use this account" |
| E2E-013 | Housekeeping: rencana kebersihan sampai tagihan vendor | 3 (TC-APP024-007 langkah 3) | baris dengan status "draft" | log baru bertuliskan "sent" |
| E2E-017 | Farmasi: terima stok, jual di kasir, retur, bayar, dan Finance | 4 (TC-APP005-009 langkah 6) | Wizard kosong | item dikosongkan tetapi pasien tetap terpilih |
| E2E-021 | Order klinis (CPOE) dari satu konsultasi | 1 (TC-APP003-001 langkah 3) | Panel kiri: nama, MRN, dan "DOB" | nama dan MRN; tanpa tanggal lahir |
| E2E-022 | IGD kasus ringan: triase, penunjang, pulang | 3 (TC-APP015-003 langkah 3) | Prioritas 4 | Prioritas 2 |
| E2E-026 | Persalinan: bayi didaftarkan bersama ibu dan dirawat | 1 (TC-APP001-006 langkah 5) | "Mother" menampilkan MRN dan nama PT-MOM sebagai tautan | "Mother" menampilkan id internal (UUID) sebagai teks biasa |
| E2E-026 | Persalinan: bayi didaftarkan bersama ibu dan dirawat | 1 (TC-APP001-006 langkah 6) | Dialog berubah ke PT-MOM | tidak ada tautan ibu yang bisa diklik |
| E2E-028 | Obat rawat inap tertutup (closed-loop) | 4 (TC-APP005-005 langkah 4) | Memilih grup di "Ward group": hanya order yang dikelompokkan yang tercantum | pilihannya tidak menyebut grup (1 · Kelompok bangsal, 2 · Kelompok bangsal), jadi grup test ini tidak bisa dibedakan; order dibuka dari barisnya |
| E2E-028 | Obat rawat inap tertutup (closed-loop) | 5 (TC-APP004-077 langkah 2) | "Branch", "Patient", "Order", "Status", dan "Reason" | tidak ada kolom "Branch" (U1 bekerja di satu cabang) |
| E2E-030 | Operasi dengan darah, instrumen steril, dan bahan | 3 (TC-APP006-020 langkah 4) | Formulir menampilkan nomor permintaan dan status "Approved" | statusnya "Pending" (butuh persetujuan lewat "Approve") |
| E2E-034 | Estimasi biaya sampai pembayaran | 1 (TC-APP014-016 langkah 3) | Memilih QA-PARA, jumlah 10 | kartu tidak punya kolom jumlah: setiap baris adalah satu unit |
| E2E-034 | Estimasi biaya sampai pembayaran | 1 (TC-APP014-016 langkah 4) | Pasien neto Rp 12.500, pajak Rp 1.375, total Rp 13.875 | estimasi bertuliskan "t. Nothing is saved to stock or to a charge. Patient Item code Add line QA-PARA · Paracetamol 500mg Tablet 1 Estimating…" |
| E2E-039 | Onboarding staf dengan akses | 4 (TC-APP010-004 langkah 3) | Berkas karyawan yang ditautkan terbuka sendiri sebagai "Edit employee" | daftar terbuka; tidak ada berkas sendiri |
| E2E-039 | Onboarding staf dengan akses | 4 (TC-APP010-004 langkah 3) | Pemberitahuan "Configuration is missed" tidak ditampilkan | pemberitahuan ditampilkan ke akun yang ditautkan |
| E2E-039 | Onboarding staf dengan akses | 5 (TC-APP018-031 langkah 3) | baris dengan role "perawat" | "Roles" bertuliskan "—" |
| E2E-039 | Onboarding staf dengan akses | 5 (TC-APP018-031 langkah 5) | Hanya cabang yang dipilih di header | header tidak menyebut cabang: "KlikMed Home Dashboard Preferences Apps Reports Analytics Notifications No notifications yet. ID Language ID EN AR Q QA-Perawat Uji MVW91ISD00K QA-Perawat Uji MVW91ISD00K perawat Profile Preferences Sign out" |
| E2E-039 | Onboarding staf dengan akses | 5 (TC-APP018-031 langkah 6) | Entri user.create dengan login-nya | entri tidak menyebut login-nya: "31/10/2026, 17.33.29 user.create platform/identity admin2 succeeded admin2" |
| E2E-039 | Onboarding staf dengan akses | 7 (TC-APP010-040 langkah 4) | Toast "Saved." | ditolak: "hr: invalid input: duplicate": U1 tertaut ke karyawan dari run sebelumnya test ini, dan tautannya tidak dipindah ke QA-EMP-01-MVW91ISD00N |
| E2E-041 | Finance: pencatatan sampai laporan | 2 (TC-APP019-004 langkah 2) | "Branch restriction" ("All branches") | daftar "Branches allowed to use this account" (tidak ada yang dipilih: "Global account") dan daftar "Users allowed to use this account" |
| E2E-048 | Tata kelola identitas pasien | 4 (TC-APP005-060 langkah 2) | Blok mencantumkan nama item dengan jumlah yang dikeluarkan | tidak ada yang tercantum untuk nama atau MRN |
