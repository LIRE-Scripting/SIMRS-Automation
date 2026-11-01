# KlikMed HMIS — suite test Playwright

Test end-to-end untuk KlikMed HMIS (`https://rs.showcase.atklik.xyz/id`). Workbook di `reference/`
adalah sumber kebenaran; workbook itu hanya dibaca, tidak pernah diubah.

Hasil dan masalah terbaru: [docs/qa/README.md](docs/qa/README.md).

## Susunan

```
fixtures/
  e2e.ts            qaTest(): satu test case workbook (judul, tag, sesi, fixme/skip, langkah)
  chain.ts          chainTest(): satu rantai end-to-end (data diteruskan, berhenti di blocker)
lib/                data workbook (lib/qa-data), data bersama, tanggal, assertion, i18n
pages/              page object, satu file per aplikasi
tests/
  e2e/              rantai end-to-end lintas modul (50 rantai)
    auth.setup.ts   login U1–U7 untuk test workbook
    chains/         satu spec per rantai; steps/ berisi langkah rantai bersama
  modules/          test workbook per modul, satu folder per modul (00 akses, 01 … 27)
    shared/         helper yang dipakai beberapa modul
scripts/qa/         generator dokumen dan workbook hasil
docs/qa/            dokumen hasil dan masalah (blocker, deviasi, HTTP 5xx), inventaris, keterlacakan
reports/            workbook hasil (reports/e2e, reports/e2e-chains, reports/summary)
```

Spec per modul: `tests/modules/<NN-modul>/<fitur>.spec.ts`, satu `qaTest('TC-APP…')` per test case.
Setiap folder modul punya `cases.ts` bila test case dipakai juga oleh rantai, dan
`not-automated.spec.ts` yang mendeklarasikan test case fixme dan skip modul itu.

## Project

| Project | Spec | Sesi |
|---|---|---|
| `e2e-setup` | `tests/e2e/auth.setup.ts` | login U1–U7 sekali |
| `e2e-modules` | `tests/modules/**` | U1 (per test: U2 atau user lain bila workbook membutuhkannya) |
| `e2e` | `tests/e2e/chains/**` | U1 |

User: U1 `rs.admin2` (Podomoro), U2 `rs.admin` (Semua cabang), U3–U7 akun `qa.*` (lihat
`docs/qa/prereq-users-and-blockers.md`). Kata sandi dari `.env` (`QA_PASSWORD`); jangan pernah ditulis di kode.

## Perintah

```bash
cp .env.example .env              # isi QA_PASSWORD
npm run qa:data                   # reference/*.xlsx -> test-data (gagal bila kolom berubah)
npm run qa:inventory              # docs/qa: inventaris, keterlacakan per modul, blockers-found

npm run test:e2e-modules          # test workbook per modul
npm run test:e2e                  # rantai end-to-end
QA_ALLOW_WRITES=1 npm run test:e2e-modules   # termasuk test yang menyimpan data
npx playwright test --project=e2e-modules --grep @smoke

# workbook hasil (satu laporan JSON per run; semua reports/e2e/results*.json dibaca)
PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e/results-02-appointment.json \
  npx playwright test --project=e2e-modules tests/modules/02-appointment/ --reporter=list,json
npm run qa:e2e-workbook           # -> reports/e2e/<NN-modul>.xlsx

PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e-chains/results-chains.json \
  npx playwright test --project=e2e tests/e2e/chains/ --reporter=list,json
npm run qa:e2e-chains             # -> reports/e2e-chains/e2e-journeys.xlsx

npm run qa:run-summary            # -> reports/summary/simrs-run-summary.xlsx (satu sheet per modul)
npm run qa:findings-md            # -> docs/qa: ringkasan-hasil, blocker, deviations, http-5xx
npm run qa:blocked-shots          # tangkapan layar awal untuk test case yang terblokir
npm run typecheck
```

Jalankan rantai dengan `--workers=1`. Rantai berbagi data run-nya, dan E2E-033 menutup hari kasir
U1 sampai 07:00 WIB besok, jadi dijalankan terakhir. Test yang terikat jam (TC-APP001-058/059,
TC-APP014-011/038) hanya dideklarasikan di run pagi (`QA_MORNING=1`).

Jangan menjalankan `npx playwright test --list` tanpa `PLAYWRIGHT_JSON_OUTPUT_NAME=/dev/null`:
perintah itu menulis laporan berisi semua test "skipped" yang menimpa hasil di ringkasan.

## Aturan

- Judul test membawa tag keterlacakan `[<workbook> | <sheet> | row n | <id kasus>]`.
- Locator berdasarkan role, label, atau test id; tanpa `waitForTimeout` kecuali untuk menunggu jam;
  tanpa `force: true` tanpa komentar.
- Data yang dibuat test memakai awalan `QA-` dan token, jadi unik per run.
- Langkah yang hasilnya berbeda dari situs dicatat dengan `qa.deviation(...)`; langkah yang terhenti
  blocker dicatat `qa.blocked(step, n)` (daftar blocker: `docs/qa/blocker.md`); hal yang masih
  terbuka di `docs/qa/open-questions.md`.
- Data kesehatan: hanya data sintetis dari workbook; tidak ada identitas pasien sungguhan di spec,
  laporan, atau output konsol.
