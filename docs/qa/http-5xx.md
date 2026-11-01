# HTTP 5xx: jawaban error dari server situs

Dibangun 2026-11-01 17:21 WIB dari `reports/summary/run-summary.json` (hasil terbaru setiap test case dan rantai). Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

HTTP 5xx = server situs gagal memproses permintaan (error di sisi server), bukan penolakan biasa. Setiap jawaban 5xx dicatat oleh `fixtures/e2e.ts` (fixture `serverErrors`) ke `.qa-state/**/http-5xx.jsonl`. Dokumen ini hanya memuat 5xx yang **masih terjadi** di hasil terbaru; yang sudah diperbaiki tidak dicantumkan.

**1 jawaban 5xx** masih terjadi, dari 1 test.

| Endpoint | Test | Terlihat pertama | Terakhir (WIB) | Digest | Masalah | Perbaikan yang disarankan | Blocker terkait |
|---|---|---|---|---|---|---|---|
| `POST /emergency/patients` | TC-APP015-052 (Terblokir) | 2026-10-21 | 2026-11-01 15:04 | 527308963 | Melampirkan file sekitar 1 MB pada pasien IGD (TC-APP015-052 langkah 1) dijawab HTTP 500; layar hanya menampilkan "Could not save.". Dicek ulang 2026-11-01: masih terjadi (digest 527308963). | Batasi ukuran lampiran di server dan tolak file yang terlalu besar dengan pesan yang menyebut batasnya, alih-alih error server. | [9](blocker.md#blocker-9), [54](blocker.md#blocker-54) |
