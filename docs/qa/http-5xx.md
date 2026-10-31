# HTTP 5xx dari site

Dibangun 2026-10-31 12:33 UTC dari `reports/summary/run-summary.json`. Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

Setiap jawaban 5xx dicatat oleh `fixtures/e2e.ts` (fixture `serverErrors`) ke `.qa-state/**/http-5xx.jsonl`. Di sini hanya yang terjadi **dalam hasil terbaru** sebuah test: 5xx dari run lama yang test-nya sudah diulang tidak dihitung.

**3 jawaban 5xx** dari **3 test** (2 test case, 1 rantai).

| Tanggal | Jumlah 5xx |
|---|---:|
| 2026-10-29 | 1 |
| 2026-10-30 | 1 |
| 2026-10-31 | 1 |

Jenis input yang memicunya:

| Jenis | Jumlah |
|---|---:|
| input valid (positif) | 2 |
| blocker yang sudah dikenal | 1 |

- **input salah/batas (negatif)**: test sengaja mengirim data salah; seharusnya site menolak dengan pesan, bukan HTTP 500.
- **input valid (positif)**: data yang seharusnya diterima malah membuat server error.
- **blocker yang sudah dikenal**: test-nya juga menemui blocker (lihat `docs/qa/blockers-found.md`).

## Per endpoint

| Endpoint | Jumlah | Test | Digest |
|---|---:|---|---|
| `/id/billing/cashier` | 2 | E2E-033, TC-APP014-011 |  |
| `/id/emergency/patients` | 1 | TC-APP015-052 |  |

## Per test

| Test | Status test | Waktu (UTC) | Jawaban | Endpoint | Digest | Jenis |
|---|---|---|---|---|---|---|
| E2E-033 | Blocked | 2026-10-29 00:23 | 500 POST | `/id/billing/cashier` |  | input valid (positif) |
| TC-APP014-011 | Passed | 2026-10-30 01:48 | 500 POST | `/id/billing/cashier` |  | input valid (positif) |
| TC-APP015-052 | Blocked | 2026-10-31 11:14 | 500 POST | `/id/emergency/patients` |  | blocker 13 |
