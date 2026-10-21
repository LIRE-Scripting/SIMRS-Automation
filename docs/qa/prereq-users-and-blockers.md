# Prasyarat: user test dan blocker

Kondisi per **2026-10-20**. Site `https://rs.showcase.atklik.xyz`, cabang uji **Podomoro** (kode `HO`).

Dokumen ini menjelaskan hasil eksekusi `reference/00-prerequisites.xlsx`: akun apa saja yang sudah ada, untuk apa masing-masing, apa yang tidak bisa dibuat, dan alasannya.

| Sumber | Isi |
|---|---|
| `reference/00-prerequisites.xlsx` | Workbook prasyarat: status per user/aplikasi sudah diperbarui, kolom **Evidence** di tiap baris, sheet **Evidence** berisi screenshot |
| `reports/prereq/00-prerequisites-evidence.xlsx` | Workbook evidence terpisah: catatan, hasil dan screenshot per item (sheet *Screenshots*) |
| `reports/prereq/results.json` | Hasil mentah run (dibaca oleh `npm run qa:prereq-evidence`) |
| `tests/prereq/prereq.spec.ts` | Script yang menjalankan prasyarat (`npm run test:prereq`) |
| `lib/qa-data/found-blockers.ts`, `docs/qa/blockers-found.md` | Daftar blocker yang ditemukan otomasi (termasuk blocker 38) |

---

## 1. Ringkasan

| Bagian | Hasil |
|---|---|
| User U3–U7 | **5 dari 5 dibuat**, semuanya berhasil login |
| User U8 (satu akun per aplikasi) | **22 dari 26 dibuat**; **4 tertahan blocker 38** (04 Inpatient, 18 Settings, 22 Services, 23 Sourcing) |
| User U9 | Tidak bisa: hak `LICENSING_WRITE` tidak ada di tenant |
| User U10 | Ditunda (keputusan workbook: perlu tenant kedua) |
| Role baru | 5 dibuat; 1 dipakai (`qa_staff`), **4 kosong tanpa hak karena blocker 38** |
| Set-up data | Finance configuration dan budget posting rule Podomoro, Bowie Dick hari ini, kategori KITS: **selesai**. Kode diagnosis, konfigurasi registrasi IGD, drug form KIT: **tidak ada layarnya** |

Total 49 item: 33 Done, 1 Already present, 8 Blocked, 4 Not possible, 3 Not done, 0 Failed.

---

## 2. Cara hak akses bekerja di site ini

Hak tidak dipasang langsung ke akun. Polanya bertingkat:

```
Akun (login)  ──punya──▶  Role  ──punya──▶  Hak (privilege)
qa.kasir                 kasir             BILLING_WRITE
```

1. **Hak (privilege)**: izin teknis seperti `BILLING_WRITE` (boleh menyimpan di Hospital Accounts) atau `BUDGET_APPROVE` (boleh menyetujui dokumen budget). Tenant ini punya **40 hak** (lihat Settings → User Rights).
2. **Role**: kumpulan hak. Dibuat di Settings → Roles, haknya diatur di Settings → User Rights → *Save rights*.
3. **Akun**: dibuat di Settings → Users. Saat membuat akun dipilih **Branch** dan **Roles**; role itu berlaku **hanya di branch tersebut** (terlihat di Settings → Branch map).

Akibatnya:

- Akun hanya bisa menyimpan di sebuah aplikasi bila salah satu role-nya memegang hak tulis aplikasi itu.
- Bila role-nya kosong (0 hak), akun bisa login dan melihat layar, tapi setiap simpan ditolak.
- Role diberi branch per akun, jadi akun yang sama bisa punya role berbeda di cabang berbeda.

### Role yang sudah ada di site dan haknya

Diperiksa di User Rights pada 2026-10-20:

| Role | Hak | | Role | Hak |
|---|---|---|---|---|
| `admin` | **semua 40 hak** | | `hrd` | HR_WRITE |
| `pendaftaran` | REGISTRATION_WRITE | | `analis` | LABORATORY_WRITE |
| `dokter` | CLINICAL_WRITE | | `radiografer` | RADIOLOGY_WRITE |
| `perawat` | CLINICAL_WRITE | | `dokter_radiologi` | RADIOLOGY_WRITE |
| `bidan` | CLINICAL_WRITE | | `gizi` | DIET_WRITE |
| `apoteker` | PHARMACY_WRITE | | `kasir` | BILLING_WRITE |
| `bankdarah` | BLOODBANK_WRITE | | `igd` | EMERGENCY_WRITE, EMERGENCY_DEATH |
| `gudang` | INVENTORY_WRITE | | `rekammedis` | MRD_WRITE |
| `ok` | OT_WRITE | | `payroll` | PAYROLL_WRITE |
| `procurement` | PROC_WRITE | | `finance` | FINANCE_WRITE |
| `budget` | BUDGET_WRITE, BUDGET_APPROVE | | `cssd` | CSSD_WRITE, CSSD_APPROVE |
| `housekeeping` | HOUSEKEEPING_WRITE | | `linen` | LINEN_WRITE |
| `ipsrs` | MAINTENANCE_WRITE | | `aset` | FIXED_ASSET_WRITE |
| `bpjs` | BPJS_WRITE | | `roster` | ROSTER_WRITE |
| `arsip` | (tidak ada, role non-aktif) | | `qa_uji_*` | (tidak ada; sisa test lama) |

Hak yang **hanya dimiliki `admin`**: `ADT_WRITE`, `MDM_WRITE`, `IDENTITY_*`, `WORKFLOW_WRITE`, `SERVICES_WRITE`, `SOURCING_WRITE`, `REVENUECYCLE_WRITE`, `AUDIT_READ`, `TENANT_BRANDING_WRITE`. Inilah sumber masalah empat akun U8 (bagian 5).

Hak yang **tidak ada sama sekali** di tenant: `FINANCE_APPROVE` dan `LICENSING_WRITE`, walau workbook menyebutnya.

---

## 3. Daftar akun

Semua akun baru memakai password bersama dari `.env` (`QA_PASSWORD`), sama seperti U1 dan U2. Email berbentuk `<login>@example.test`. Nama lengkap diawali `X QA ...` supaya mudah dikenali sebagai data uji.

### 3.1 Users (sheet *Users*)

| Key | Login | Role | Branch | Status | Dipakai untuk |
|---|---|---|---|---|---|
| U1 | `rs.admin2` | admin | Podomoro | Sudah ada sebelumnya | Jalur utama semua journey; menjalankan set-up |
| U2 | `rs.admin` | admin | Semua branch | Sudah ada sebelumnya | Journey dengan prasyarat "All branches" |
| U3 | `qa.staff` | `qa_staff` (0 hak) | Podomoro | **Dibuat** | Journey negatif: user tanpa hak tulis tidak bisa menyimpan. Satu akun untuk semua aplikasi |
| U4 | `qa.admin3` | admin | Podomoro | **Dibuat** | Orang kedua di record yang sama (dua sesi, melanjutkan/memeriksa pekerjaan) |
| U5 | `qa.approver` | finance, budget, cssd, procurement | Podomoro | **Dibuat** | Langkah persetujuan; pembuat tidak boleh menyetujui dokumennya sendiri |
| U6 | `qa.kemayoran` | admin | **Kemayoran** | **Dibuat** | Memeriksa bahwa cabang lain tidak melihat/mengubah data Podomoro |
| U7 | `qa.pegawai` | hrd, payroll | Podomoro | **Dibuat + ditautkan ke pegawai** | HR Punch (absensi diri sendiri), slip gaji pegawai |
| U8 | `qa.<role>` | lihat 3.2 | Podomoro | **22 dari 26** | Membuktikan setiap role bisa mengerjakan tugasnya dan tidak lebih |
| U9 | — | — | — | Tidak bisa dibuat | Layar Tenants dan Entitlements (lihat 6.3) |
| U10 | — | — | — | Ditunda | Tenant kedua, tenant tanpa lisensi, superadmin platform |

Catatan per akun:

- **U3 `qa.staff`**: role `qa_staff` sengaja dibuat **tanpa hak**. Role tanpa hak tidak perlu "Save rights", jadi tidak terkena blocker 38.
- **U5 `qa.approver`**: workbook meminta `FINANCE_APPROVE`, tapi hak itu tidak ada di tenant, jadi persetujuan Finance belum bisa diuji dengan role terpisah. Approval chain di Settings → Process definitions juga hanya berisi **nama langkah**, tanpa kolom "siapa approver". Penyetuju budget adalah siapa saja yang memegang `BUDGET_APPROVE` (U5 dan `qa.budget`). Chain purchase order hanya 1 langkah (blocker 30), jadi Approver 2/3/Director belum bisa dipisahkan.
- **U6 `qa.kemayoran`**: role admin di **BR01 Kemayoran** saja (Branch map: `qa.kemayoran | admin | BR01 Kemayoran`).
- **U7 `qa.pegawai`**: setelah akun dibuat, script login sebagai `qa.pegawai`, membuka HR → desk → *Employee*, membuat pegawai `X-EMP-QA-PEGAWAI` ("X QA Pegawai"), lalu *Link me* (toast "Saved."). Punch sekarang bisa dicoba dengan akun ini.
- **Branch aktif "—"**: di My profile semua akun baru menampilkan *Active branch "—"*. Ini bukan salah mapping. Branch aktif adalah pilihan per sesi di Preferences yang belum pernah dipilih oleh akun baru. Branch map sudah benar (dicek untuk qa.admin3, qa.approver, qa.dokter, qa.kasir dan qa.kemayoran).

Sesi U1–U7 disimpan oleh `tests/e2e/auth.setup.ts` ke `.auth/U<n>.json`. Login diambil dari kata pertama setelah `Exists:` di kolom *Status on the site*, dan hanya untuk baris dengan *Prepared = Done*. Ketujuhnya berhasil login pada 2026-10-20.

### 3.2 Role accounts (U8, sheet *Role accounts*)

| Aplikasi | Persona | Hak tulis | Login | Role | Status |
|---|---|---|---|---|---|
| 01 Ambulatory Care, 02 Appointment | Clerk | REGISTRATION_WRITE | `qa.pendaftaran` | pendaftaran | Dibuat |
| 03 Patient Care | Doctor | CLINICAL_WRITE | `qa.dokter` | dokter | Dibuat |
| **04 Inpatient** | Nurse | **ADT_WRITE** | (`qa.perawat.ri`) | `qa_rawat_inap` | **Blocked (38)** |
| 05 Pharmacy | Pharmacist | PHARMACY_WRITE | `qa.apoteker` | apoteker | Dibuat |
| 06 Transfusion Medicine | Tech | BLOODBANK_WRITE | `qa.bankdarah` | bankdarah | Dibuat |
| 07 Inventory | Warehouse | INVENTORY_WRITE | `qa.gudang` | gudang | Dibuat |
| 08 Operation Theater | Theatre nurse | OT_WRITE | `qa.ok` | ok | Dibuat |
| 09 Procurement | Officer | PROC_WRITE | `qa.procurement` | procurement | Dibuat |
| 10 HR | HR admin | HR_WRITE | `qa.hrd` | hrd | Dibuat |
| 11 Laboratory | Analyst | LABORATORY_WRITE | `qa.analis` | analis | Dibuat |
| 12 RIS | Radiographer | RADIOLOGY_WRITE | `qa.radiografer` | radiografer | Dibuat |
| 13 Dietary | Dietitian | DIET_WRITE | `qa.gizi` | gizi | Dibuat |
| 14 Hospital Accounts | Cashier | BILLING_WRITE | `qa.kasir` | kasir | Dibuat |
| 15 Emergency | Nurse | EMERGENCY_WRITE | `qa.igd` | igd | Dibuat |
| 16 MRD | Records officer | MRD_WRITE | `qa.rekammedis` | rekammedis | Dibuat |
| 17 Payroll | Payroll officer | PAYROLL_WRITE | `qa.payroll` | payroll | Dibuat |
| **18 Settings** | Hospital administrator | **MDM_WRITE, IDENTITY_\*, WORKFLOW_WRITE** | (`qa.settings`) | `qa_settings` | **Blocked (38)** |
| 19 Finance | Accountant | FINANCE_WRITE (FINANCE_APPROVE tidak ada) | `qa.finance` | finance | Dibuat |
| 20 Budget | Budget officer | BUDGET_WRITE, BUDGET_APPROVE | `qa.budget` | budget | Dibuat |
| 21 CSSD | CSSD officer | CSSD_WRITE, CSSD_APPROVE | `qa.cssd` | cssd | Dibuat |
| **22 Services** | Services officer | **SERVICES_WRITE** | (`qa.services`) | `qa_services` | **Blocked (38)** |
| **23 Sourcing** | Sourcing officer | **SOURCING_WRITE** | (`qa.sourcing`) | `qa_sourcing` | **Blocked (38)** |
| 24 Housekeeping | Housekeeping supervisor | HOUSEKEEPING_WRITE | `qa.housekeeping` | housekeeping | Dibuat |
| 25 Linen | Linen supervisor | LINEN_WRITE | `qa.linen` | linen | Dibuat |
| 26 Maintenance | Maintenance officer | MAINTENANCE_WRITE | `qa.ipsrs` | ipsrs | Dibuat |
| 27 Fixed assets | Asset administrator | FIXED_ASSET_WRITE | `qa.aset` | aset | Dibuat |

Login dalam kurung belum ada di site, hanya nama yang disiapkan.

Akun `rs.<role>` yang sudah ada (rs.kasir, rs.gudang, dst.) **tidak diubah**. Akun-akun itu dipakai orang lain dan role-nya berlaku di semua branch. Akun `qa.*` dibuat terpisah dengan role **hanya di Podomoro**.

---

## 4. Apa arti status di evidence

| Status | Arti |
|---|---|
| **Done** | Dibuat oleh run ini dan dicek: toast sukses, lalu login atau layar sesudahnya |
| **Already present** | Sudah ada di site sebelum disimpan; tidak ada yang disimpan |
| **Failed** | Dicoba, ditolak site atau pengecekan sesudahnya gagal |
| **Blocked** | Tertahan defect yang sudah dikenal (nomor blocker di catatan). Bukan salah input; menunggu perbaikan |
| **Not possible** | Tidak ada layar untuk itu, atau site tidak punya yang dibutuhkan; untuk site admin atau Development |
| **Not done** | Sengaja di luar run ini (alasannya di catatan) |

---

## 5. Blocker 38: hak role baru tidak bisa disimpan

### 5.1 Apa yang terjadi

| | |
|---|---|
| Layar | Settings → User Rights (`/identity/rights`), tombol **Save rights** |
| Langkah | Pilih role → centang hak → *Save rights* |
| Yang diharapkan | Toast "Rights updated.", counter jadi mis. "1 / 40" |
| Yang terjadi | Toast **"Failed to save rights."**, server menjawab **HTTP 500**, counter tetap **"0 / 40"** |
| Pertama terlihat | 2026-10-15 (TC-APP018-039, centang DIET_WRITE pada role uji) |
| Terlihat lagi | 2026-10-20, 4 role × 2 kali (run awal dan retry), selalu sama |
| Digest error server | `2696407390` (sama di semua percobaan) |

### 5.2 Bukan karena role sudah ada, dan bukan salah input

Request yang dikirim browser ditangkap langsung (2026-10-20, role `qa_services`):

```
1) Memuat hak role (berhasil)
   POST /en/identity/rights   body: ["cb23390a-63e1-4371-b0f2-9ace9ff82697"]
   → HTTP 200  {"privilege_ids":[],"role_id":"cb23390a-63e1-4371-b0f2-9ace9ff82697"}

2) Menyimpan hak (gagal)
   POST /en/identity/rights   body: ["cb23390a-63e1-4371-b0f2-9ace9ff82697",
                                     ["9ff595c7-2bd0-5e68-af79-7d2cb31f95dd"]]
   → HTTP 500  E{"digest":"2696407390"}
```

- **Role id valid**: id yang sama baru saja dipakai server untuk memuat hak role itu (langkah 1, HTTP 200). Role-nya ada dan dikenali.
- **Privilege id valid**: id diambil dari daftar 40 hak yang diberikan server sendiri.
- **Format benar**: `[role_id, [privilege_id, ...]]`, persis yang dikirim tombol *Save rights* di layar.
- **Role tidak dobel**: setiap nama role hanya satu (dicek di daftar role sebelum dibuat; "Role added." sekali).
- **Jumlah hak tidak berpengaruh**: gagal dengan 1 hak (ADT_WRITE, SERVICES_WRITE, SOURCING_WRITE) maupun 7 hak (role Settings).

Kesimpulan: server crash saat menyimpan relasi role ↔ hak. Ini defect di sisi server, bukan data atau cara input kita.

### 5.3 Kenapa akunnya tidak dibuat

Rantai akses untuk empat aplikasi itu:

```
qa.perawat.ri ──▶ qa_rawat_inap ──▶ (kosong, seharusnya ADT_WRITE)
                                     ▲
                                     └── Save rights → HTTP 500 (blocker 38)
```

- Di site **tidak ada role selain `admin`** yang memegang ADT_WRITE, SERVICES_WRITE, SOURCING_WRITE atau hak Settings (lihat bagian 2).
- Jadi perlu role baru, dan role baru hanya berguna kalau haknya bisa disimpan.
- Membuat akun dengan role kosong memang bisa, tapi akun itu tidak bisa menyimpan apa pun di aplikasinya. Test dengan akun seperti itu akan gagal karena hak, bukan karena alur yang diuji, sehingga hasilnya menyesatkan.
- Memakai role `admin` untuk akun U8 menghilangkan tujuan U8 (membuktikan role terbatas bekerja dan tidak lebih).

Karena itu script **sengaja tidak membuat** keempat akun dan menandainya **Blocked**, sementara keempat role-nya sudah dibuat (masih 0 hak).

| Aplikasi | Role (sudah ada, 0 hak) | Hak yang belum bisa dipasang | Akun yang menunggu |
|---|---|---|---|
| 04 Inpatient | `qa_rawat_inap` | ADT_WRITE | `qa.perawat.ri` |
| 18 Settings | `qa_settings` | MDM_WRITE, IDENTITY_ROLES_READ, IDENTITY_ROLES_WRITE, IDENTITY_ROLE_PRIVILEGES_WRITE, IDENTITY_USERS_READ, IDENTITY_USERS_WRITE, WORKFLOW_WRITE | `qa.settings` |
| 22 Services | `qa_services` | SERVICES_WRITE | `qa.services` |
| 23 Sourcing | `qa_sourcing` | SOURCING_WRITE | `qa.sourcing` |

Dampak: 68 + 47 + 13 + 12 = **140 journey** dari empat aplikasi ini tetap dijalankan dengan administrator (U1). Alurnya bisa dibuktikan, tapi pembatasan haknya belum.

### 5.4 Cara menyelesaikan

1. **Development memperbaiki *Save rights*** (cari digest `2696407390` di log server tanggal 2026-10-15 dan 2026-10-20).
2. Setelah diperbaiki, jalankan:
   ```
   PREREQ_RETRY=blocked npm run test:prereq
   npm run qa:prereq-evidence
   ```
   Script memasang hak ke empat role yang sudah ada, membuat empat akunnya, mencoba login dan memperbarui evidence. Item yang sudah Done tidak disentuh lagi.
3. Isi login keempat akun di `reference/00-prerequisites.xlsx` (sheet *Role accounts*), lalu `npm run qa:data`.

Alternatif bila perbaikan lama:

- **Site admin memasang haknya langsung** (database/API, tanpa layar User Rights), lalu langkah 2–3 di atas.
- **Sementara memakai akun dengan role `admin`** untuk empat aplikasi itu. Alur berjalan, tapi pembatasan hak tidak terbukti (sama seperti sekarang dengan U1). Perlu izin baru karena menyimpan data di site.

---

## 6. Blocker dan kendala lain yang menyentuh prasyarat

### 6.1 Tidak ada layarnya (Not possible)

| No | Prasyarat | Apa yang dicek | Siapa |
|---|---|---|---|
| S04 | Versi kode diagnosis | Tidak ada layar untuk mengimpor/mengaktifkan versi kode; pencarian terminologi tidak menemukan kode | Site administrator (API/seed) |
| S07 | Konfigurasi registrasi IGD type 7 | Layar Emergency → Registration: "Podomoro has no registration configuration for type 7."; tidak ada layar di Settings atau Registration yang membuatnya | Site administrator |
| S10 (sebagian) | Drug form **KIT** | Tidak ada layar Inventory/Pharmacy yang mengelola drug form. Kategori **KITS** berhasil dibuat | Site administrator |
| S12 | Defect yang menghentikan journey | Untuk Development; lihat `00-blockers-checklist-linked.xlsx` dan `docs/qa/blockers-found.md` | Development |

### 6.2 Hak yang tidak ada di tenant

| Hak | Diminta oleh | Akibat |
|---|---|---|
| `FINANCE_APPROVE` | U5, 19 Finance | Tidak ada di 40 hak tenant. Persetujuan voucher belum bisa dipisah dari pembuatnya lewat role |
| `LICENSING_WRITE` | U9 | Tidak ada. Layar Tenants/Entitlements butuh role platform, bukan role tenant |

### 6.3 Approval chain

- **Process definitions** (Settings) hanya menyimpan nama langkah. Tidak ada kolom approver, jadi "approver di setiap chain" (prasyarat 9) tidak bisa diisi. Persetujuan diberikan ke siapa saja dengan hak `*_APPROVE`.
- **Blocker 30**: chain purchase order hanya 1 langkah ("Persetujuan"), bukan 4 seperti di data uji. Approver 2/3/Director (U5) belum bisa diuji terpisah.

### 6.4 Catatan untuk blocker 26

Blocker 26 menyebut form *Branch and stores* (`/inventory/setup`) menjawab HTTP 500. Pada 2026-10-20 form **kategori** berhasil menyimpan KITS (toast "Saved.", KITS muncul di daftar). Form store dan lane tidak dicoba di run ini.

---

## 7. Set-up data yang dikerjakan

| No | Prasyarat | Hasil | Rincian |
|---|---|---|---|
| S01 | Izin membuat data | Done | Izin 2026-10-20 untuk satu run (sudah terpakai) |
| S02 | Pasien uji | Not done | Perlu konfirmasi requester bahwa pasien di site fiktif; journey membuat pasien "X " sendiri |
| S03 | Branch uji | (sudah Done sebelumnya) | Podomoro |
| S05 | Item di bawah stok minimum | Already present | Reorder Podomoro sudah berisi 29+ item; tidak ada yang disimpan |
| S06 | User tertaut pegawai | Done | `qa.pegawai` ↔ `X-EMP-QA-PEGAWAI` |
| S08 | Finance configuration Podomoro | Done | Tahun 2026; back-dated 3 hari; validitas instrumen 90 hari; Cash/Patient cash/Patient control `1101 Kas`; Bank/Patient bank `QA-1010-MVDHF9E56815`; Revenue `4101 Pendapatan`; Surplus/deficit `QA-3010-MVDHF9E5680Z`; user boleh bertransaksi: `rs.admin2`. Patient collections tidak lagi bilang "no finance configuration" |
| S09 | Budget posting rule + approver | Done | Allocation — capital: debit `QA-1501-MVDHF9E57408`, credit `QA-3010-MVDHF9E5680Z` (Ready). Allocation — operating: debit `QA-5010-MVDHF9E5710K`, credit `QA-3010-MVDHF9E5680Z`. Approver: lihat 6.3 |
| S10 | CSSD | Done (sebagian) | Bowie Dick 2026-10-20, Autoklaf 1 CSSD, indikator kelas 5, Pass (berlaku **hari itu saja**); kategori KITS dibuat; drug form KIT tidak ada layarnya |
| S11 | Record dari aplikasi lain | Not done | Dibuat oleh journey pengumpan sendiri (chain E2E) |

Akun finance dan budget belum pernah ada di site, jadi script memilih sendiri akun yang tersedia: `1101 Kas`, `4101 Pendapatan` dan akun `QA-*` terbaru dari test sebelumnya. Workbook tidak menyebut akun mana yang harus dipakai. `qa.finance` belum ditambahkan ke *Users allowed to transact* karena akunnya dibuat sesudah konfigurasi disimpan.

---

## 8. Riwayat run

| Waktu (UTC) | Run | Hasil |
|---|---|---|
| 2026-10-20 08:50 | Run pertama | Role, finance, budget capital, Bowie Dick dan KITS tersimpan. **Semua akun gagal sebelum dibuat**: pengecekan "login sudah ada?" di script salah (daftar Users pindah ke halaman 2 lalu kosong). Tidak ada akun yang tersimpan. Hasil: `results.first-run.json` |
| 2026-10-20 08:59 | Retry item Failed (`PREREQ_RETRY=1`) | Pengecekan login diperbaiki; 25 akun dibuat dan login; U7 ditautkan; Allocation — operating disimpan. Hasil: `results.before-blocked-retry.json` |
| 2026-10-20 09:13 | Retry item Blocked (`PREREQ_RETRY=blocked`) | Empat role tetap HTTP 500 (digest 2696407390); catatan sekarang memuat status HTTP dan digest. Hasil: `results.json` |

Run aman diulang: setiap item mengecek site dulu dan hanya menyimpan yang belum ada. Tanpa `PREREQ_RETRY`, spec menolak berjalan selama `reports/prereq/results.json` ada, sesuai izin satu kali.

Di evidence, blok akun masih memuat screenshot error dari run pertama. Ini sengaja dibiarkan sebagai jejak.

---

## 9. Yang masih terbuka

| Item | Menunggu | Lalu |
|---|---|---|
| 4 akun U8 (04, 18, 22, 23) | Perbaikan blocker 38 (Development) atau hak dipasang langsung oleh site admin | `PREREQ_RETRY=blocked npm run test:prereq` |
| FINANCE_APPROVE | Keputusan produk: apakah hak ini akan ada | Tambah ke role approver |
| Approver per langkah chain | Fitur approver di Process definitions, dan chain PO 4 langkah (blocker 30) | Pisahkan U5 per langkah |
| Kode diagnosis, konfigurasi IGD type 7, drug form KIT | Site administrator | Tandai Done di workbook |
| Pasien uji | Konfirmasi requester | — |
| U9, U10 | Keputusan scope dan tenant kedua | — |
| `qa.finance` di Users allowed to transact | Izin menyimpan lagi | Tambah di Finance configuration Podomoro |
| Branch aktif akun baru | Pilih Podomoro sekali di Preferences (atau dilakukan saat test login) | — |
