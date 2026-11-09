# Akun uji

Situs https://rs.showcase.atklik.xyz/id, cabang Podomoro. Diperbarui 2026-11-09.

## Blocker yang menyangkut akun

| Blocker | Singkatnya | Akun yang tertahan |
|---|---|---|
| [38](#blocker-38-hak-role-tidak-bisa-disimpan) | Hak role tidak bisa disimpan | 4 akun role (U8) |
| [46](#blocker-46-tidak-ada-hak-persetujuan-keuangan) | Tenant tidak punya hak persetujuan keuangan | Approver (U5) |
| [4](#blocker-4-tenants-dan-entitlements-menolak-admin) | Tenants dan Entitlements butuh hak lisensi | Akun lisensi (U9) |

### Blocker 38: hak role tidak bisa disimpan

- **Masalah:** hak akses tidak bisa ditambahkan ke role mana pun. Role baru tetap tanpa hak, dan role yang sudah ada tidak bisa diubah haknya.
- **Cara mengulangi:**
  1. Login sebagai admin (rs.admin2).
  2. Buka Pengaturan → User Rights.
  3. Pilih sebuah role, misalnya `qa_rawat_inap` ("0 / 40").
  4. Centang satu hak, misalnya ADT_WRITE, lalu klik "Simpan hak".
- **Yang diharapkan:** muncul toast sukses, dan role menunjukkan "1 / 40".
- **Yang terjadi:** muncul toast "Failed to save rights.", dan role tetap "0 / 40". Dulu server menjawab HTTP 500 (digest 2696407390). Sejak 2026-10-31 jawabannya tidak lagi 500, tetapi tetap gagal.
- **Sejak:** 2026-10-15. Masih terjadi pada 2026-11-09: dicek otomatis setiap run oleh TC-APP018-039, dan dicoba manual.
- **Akibat:** 4 akun uji tidak bisa dibuat. Aplikasinya hanya diuji dengan admin, jadi alurnya terbukti jalan tetapi batas hak aksesnya belum teruji.

  | Akun | Aplikasi | Hak yang dibutuhkan |
  |---|---|---|
  | Perawat Rawat Inap | 04 Rawat Inap | ADT_WRITE |
  | Admin Pengaturan (bukan admin penuh) | 18 Pengaturan | MDM_WRITE, IDENTITY_*_WRITE, WORKFLOW_WRITE |
  | Petugas Layanan Jasa | 22 Layanan Jasa | SERVICES_WRITE |
  | Petugas Tender | 23 Tender | SOURCING_WRITE |

  Akun `rs.*` yang ada juga tidak bisa menggantikan, karena role-nya tidak punya hak tersebut. rs.perawat dan rs.procurement ditolak dengan "missing required privilege".
- **Perbaikan:**
  1. Development memperbaiki penyimpanan hak role.
  2. Sementara itu, admin situs memberi hak di atas langsung lewat database atau seed ke role yang sudah ada. Misalnya ADT_WRITE ke role `perawat`, serta SERVICES_WRITE dan SOURCING_WRITE ke role `procurement` atau ke role baru.
  3. Setelah itu, prereq diulang untuk keempat role (`PREREQ_RETRY=blocked npm run test:prereq`), dan alur aplikasi 04, 18, 22, serta 23 dijalankan dengan akun role-nya.

### Blocker 46: tidak ada hak persetujuan keuangan

- **Masalah:** dokumen keuangan tidak bisa disetujui oleh siapa pun, termasuk admin dan approver.
- **Cara mengulangi:**
  1. Buat dokumen keuangan, misalnya perjanjian di Keuangan → Legal agreements.
  2. Klik "Send". Status menjadi "Pending".
  3. Login sebagai approver (qa.approver) atau admin (rs.admin2), lalu klik "Approve".
- **Yang diharapkan:** dokumen menjadi "Approved".
- **Yang terjadi:** muncul toast "missing required privilege", dan dokumen tetap "Pending". Hak FINANCE_APPROVE tidak ada di tenant, jadi tidak bisa diberikan ke role mana pun.
- **Sejak:** 2026-10-28. Masih terjadi pada 2026-11-09 (TC-APP019-068 dan 076).
- **Akibat:** approver (U5) ada tetapi tidak bisa bekerja. Semua langkah setelah persetujuan keuangan tidak bisa diuji: posting, pembayaran permintaan, pencairan, perpanjangan, dan pelepasan aset. Pengecekan "pembuat tidak bisa menyetujui dokumennya sendiri" juga tidak bisa dijalankan.
- **Perbaikan:**
  1. Tambahkan hak FINANCE_APPROVE ke tenant (Development).
  2. Berikan hak itu ke role approver qa.approver (admin situs).
  3. Jalankan lagi TC-APP019-068 sampai 078.

### Blocker 4: Tenants dan Entitlements menolak admin

- **Masalah:** halaman Tenants dan Entitlements di Pengaturan tidak bisa dibuka oleh admin rumah sakit.
- **Cara mengulangi:** login sebagai rs.admin2, lalu buka Pengaturan → Tenants atau Entitlements.
- **Yang diharapkan:** daftar tenant dan katalog lisensi tampil, atau halaman "tidak punya akses" yang jelas.
- **Yang terjadi:** halaman error dengan pesan "missing required privilege". Kedua halaman membutuhkan hak LICENSING_WRITE. Admin rumah sakit tidak punya hak itu, dan tenant juga tidak menawarkannya di User Rights.
- **Sejak:** checklist awal. Masih terjadi pada 2026-11-09 (pengawas blocker).
- **Akibat:** akun lisensi (U9) tidak bisa dibuat, dan 50 test case yang memakai kedua halaman ini Blocked.
- **Perbaikan:**
  1. Fungsi: sembunyikan kedua menu untuk user tanpa hak, atau tampilkan "tidak punya akses" alih-alih halaman error (Development).
  2. Data: buat satu akun dengan hak LICENSING_WRITE, lewat role platform (admin situs).

## Akun yang ada

| Key | Kebutuhan | Akun | Status |
|---|---|---|---|
| U1 | Admin, cabang Podomoro | rs.admin2 | ✅ |
| U2 | Admin, semua cabang | rs.admin | ✅ |
| U3 | Tanpa hak tulis (test negatif) | qa.staff | ✅ |
| U4 | Admin kedua (dua sesi pada satu record) | qa.admin3 | ✅ |
| U5 | Approver | qa.approver | ⚠️ Tenant tidak punya FINANCE_APPROVE (blocker 46) |
| U6 | Hanya cabang Kemayoran | qa.kemayoran | ✅ |
| U7 | Terhubung ke data karyawan | qa.pegawai | ✅ |
| U8 | Satu akun per role kerja | 22 akun `qa.<role>` | ⚠️ 4 kurang (blocker 38) |
| U9 | Hak lisensi | – | ❌ Perlu role platform (blocker 4) |
| U10 | Tenant kedua, superadmin platform | – | ❌ Menunggu keputusan |

**Akun `rs.*` dari situs** (11 akun, `lib/site-roles.ts`): roster, bpjs, budget, radiografer, procurement, gudang, pendaftaran, ok, igd, perawat, gizi. Semua bisa login. Tetapi tidak ada yang bisa menggantikan 4 akun di atas: rs.perawat tidak bisa merawat-inapkan pasien, dan rs.procurement tidak bisa menyimpan di Layanan Jasa maupun Tender ("missing required privilege").

## Best practice

1. Satu akun per role, hanya dengan hak aplikasinya sendiri.
2. Pembuat dan penyetuju dokumen memakai akun yang berbeda.
3. Ada akun tanpa hak, akun kedua dengan role yang sama, akun cabang lain, dan akun yang terhubung ke data karyawan.
4. Akun uji hanya dipakai automation, tidak dipakai orang secara manual.
5. Akun dan haknya dibuat admin situs lewat seed atau skrip. Password disimpan di `.env`.
6. Cukup satu set akun per role. Sekarang `qa.*` dan `rs.*` dobel untuk 8 role, jadi pilih salah satu.

## Yang bisa dicek automation

| Pengecekan | Status |
|---|---|
| Setiap akun bisa login | ✅ Ada (`site-roles.spec.ts`, `auth.setup.ts`) |
| Menu per role | ✅ Dicatat: semua akun melihat 28 aplikasi. Perlu keputusan apakah ini deviasi. |
| Role bisa menyimpan di aplikasinya sendiri | Usulan |
| Role ditolak di aplikasi lain | Usulan. Sebagian sudah lewat qa.staff (U3). |
| Pembuat tidak bisa menyetujui dokumennya sendiri | Sebagian ada. Tertahan blocker 46. |
| Isolasi cabang (U6) | ✅ Ada di beberapa test |
| Dua sesi pada satu record (U4) | ✅ Ada (TC-APP010-039, Deviasi) |
| Hak role tersimpan (blocker 38) | ✅ Dicek setiap run, masih gagal |

## Yang dibutuhkan

1. **Development:** perbaiki blocker 38 (simpan hak role) dan blocker 46 (FINANCE_APPROVE).
2. **Admin situs:** sementara itu, beri hak keempat akun di atas ke role yang sudah ada. Siapkan juga akun lisensi (U9).
3. **Keputusan:**
   - pakai `qa.*` atau `rs.*`;
   - apakah menu Apps harus dibatasi per role;
   - apakah tenant kedua (U10) akan disiapkan.
