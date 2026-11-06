/**
 * The problem reports for the team, in Indonesian, built from
 * reports/summary/run-summary.json (npm run qa:run-summary). Each one says what
 * the problem is, what it stops and what to do about it:
 *
 * - docs/qa/ringkasan-hasil.md: the figures of the newest results and the main problems;
 * - docs/qa/blocker.md: every blocker (checklist and found by automation): the problem, the
 *   test cases it stops, the fix, who, and how it was last re-checked;
 * - docs/qa/deviations.md: every deviation, grouped by review (nyata / perlu keputusan /
 *   bisa dianggap lulus), with the fix, the decision or the note;
 * - docs/qa/http-5xx.md: the HTTP 5xx answers still seen in the newest results, and the history
 *   of every 5xx endpoint since 2026-10-21 (.qa-state/**\/http-5xx.jsonl) with its status now.
 *
 *   npm run qa:findings-md
 */
import fs from 'node:fs';
import path from 'node:path';
import { blockers } from '../../lib/qa-data';
import { FOUND_BLOCKERS } from '../../lib/qa-data/found-blockers';
import { recheckOf } from './blocker-recheck';
import { BLOCKER_TITLE_ID } from './blocker-titles-id';
import { CHAIN_NAME_ID } from './chain-names-id';
import { reviewCase, reviewDeviation, type Verdict } from './deviation-review';
import { BLOCKER_PROBLEM_ID, blockerKind, blockerLink, isServerError, SERVER_ERROR_BLOCKERS } from './id/blocker-detail-id';
import { statusId } from './report-language';
import { partId, reasonId, titleId, wordId } from './summary-id';

interface Outcome {
  kind: 'module' | 'chain';
  id: string;
  title: string;
  group?: string;
  status: string;
  passedWithNotes?: boolean;
  deviations: string[];
  blockers: number[];
  http5xx: string[];
}
interface ServerError {
  at: string;
  test: string;
  status: number;
  method: string;
  url: string;
  digest?: string;
  request?: string;
  id: string;
  testType: string;
  kind: string;
  testStatus: string;
}
interface PerBlocker { no: number; title: string; source: string; fix: string; who: string; category: string; testCases: number; chains: string[]; modules: string[] }
interface Summary {
  run: { start: string; built: string; site: string; branch: string };
  totals: { modules: Record<string, number>; chains: Record<string, number>; testCases: number; chainCount: number; http5xx: number };
  perModule: ({ module: string; total: number } & Record<string, number>)[];
  perBlocker: PerBlocker[];
  outcomes: Outcome[];
  errors: ServerError[];
}

const SUMMARY = 'reports/summary/run-summary.json';
const s = JSON.parse(fs.readFileSync(SUMMARY, 'utf8')) as Summary;
const wib = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');
const built = `${wib(s.run.built)} WIB`;
const cell = (t: string) => t.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const groupOf = (o: Outcome) => (o.kind === 'chain' ? 'Rantai E2E' : wordId(o.group ?? ''));
const titleOf = (o: Outcome) => (o.kind === 'chain' ? (CHAIN_NAME_ID[o.id] ?? titleId(o.title)) : titleId(o.title));
const order = (a: string, b: string) => (a === 'Rantai E2E' ? 1 : b === 'Rantai E2E' ? -1 : a.localeCompare(b));
const anchor = (t: string) => t.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
const header = (title: string, intro: string[]) => [`# ${title}`, '', `Dibangun ${built} dari \`${SUMMARY}\` (hasil terbaru setiap test case dan rantai). Bangun ulang: \`npm run qa:run-summary && npm run qa:findings-md\`.`, '', ...intro, ''];

/** "Step 5: [TC-APP001-019 step 4: ]Excel expects "X"; the site: Y" → its parts, in Indonesian. */
function parseDeviation(text: string): { step: string; source: string; expected: string; site: string } {
  const m = text.match(/^Step (\d+): (?:(TC-APP\d{3}-\d{3} step \d+): )?Excel expects "([\s\S]*?)"; the site: ([\s\S]*)$/);
  if (!m) return { step: text.match(/^Step (\d+)/)?.[1] ?? '', source: '', expected: '', site: reasonId(text.replace(/^Step \d+: /, '')) };
  return { step: m[1], source: (m[2] ?? '').replace(' step ', ' langkah '), expected: partId(m[3]), site: partId(m[4]) };
}

// ------------------------------------------------------------------ blockers

interface BlockerInfo { no: number; title: string; problem: string; fix: string; who: string; source: string; resolved: boolean; stops?: PerBlocker }

function allBlockers(): BlockerInfo[] {
  const stop = new Map(s.perBlocker.map((b) => [b.no, b]));
  const checklist = blockers().blockers.map((b) => ({ no: b.no, en: b.blocker, fix: b.fix, who: b.who, source: `00-blockers-checklist-linked.xlsx baris ${b.row}` }));
  const found = FOUND_BLOCKERS.map((b) => ({ no: b.no, en: b.blocker, fix: b.fix, who: b.who, source: 'ditemukan otomasi (lib/qa-data/found-blockers.ts)' }));
  return [...checklist, ...found]
    .sort((a, b) => a.no - b.no)
    .map((b) => ({
      no: b.no,
      title: BLOCKER_TITLE_ID[b.no] ?? b.en,
      problem: BLOCKER_PROBLEM_ID[b.no] ?? '',
      fix: wordId(b.fix ?? ''),
      who: wordId(b.who ?? ''),
      source: b.source,
      resolved: /\(resolved/.test(b.en) || [15, 16].includes(b.no),
      stops: stop.get(b.no),
    }));
}

/** The test cases a blocker stops (newest results), by id. */
const stoppedBy = (no: number) => s.outcomes.filter((o) => o.status === 'Blocked' && o.blockers.includes(no)).map((o) => o.id).sort();

/** The paragraphs of one blocker (blocker.md, or http-5xx.md for a server error). */
function blockerDetail(b: BlockerInfo, kind: string): string[] {
  const ids = stoppedBy(b.no);
  return [
    `### Blocker ${b.no}`,
    '',
    `**${b.title}**`,
    '',
    `- **Jenis:** ${kind || '—'}`,
    `- **Masalah:** ${b.problem || '—'}`,
    ...(b.stops ? [`- **Dampak:** ${b.stops.testCases} test case${b.stops.chains.length ? ` dan rantai ${b.stops.chains.join(', ')}` : ''} terhenti (${b.stops.modules.map(wordId).join(', ')}).`] : ['- **Dampak:** tidak ada test yang terhenti olehnya di hasil terbaru.']),
    `- **Perbaikan:** ${cell(b.fix) || '—'}`,
    `- **Penanggung jawab:** ${b.who || '—'}`,
    `- **Cek ulang:** ${recheckOf(b.no, b.source.startsWith('ditemukan') ? 'docs/' : b.source) || '—'}`,
    `- **Sumber:** ${b.source}`,
    ...(ids.length ? [`- **Test case terhenti:** ${ids.length > 40 ? `${ids.slice(0, 40).join(', ')} … (+${ids.length - 40})` : ids.join(', ')}`] : []),
    '',
  ];
}

/** The test cases stopped by a blocker that is not a server error. */
const blockedByBlockers = () => s.outcomes.filter((o) => o.kind === 'module' && o.status === 'Blocked' && o.blockers.some((n) => !isServerError(n))).length;
const blockedByServer = () => s.outcomes.filter((o) => o.kind === 'module' && o.status === 'Blocked' && o.blockers.some(isServerError)).length;

function blockerMd(): string {
  const all = allBlockers().filter((b) => !isServerError(b.no));
  const active = all.filter((b) => b.stops);
  const quiet = all.filter((b) => !b.stops);
  const blockedCases = blockedByBlockers();
  const out = header('Blocker: masalah yang menghentikan pengujian', [
    'Blocker = masalah di situs (atau data/set-up yang belum ada) yang membuat sebuah langkah **tidak bisa dijalankan sama sekali**. Langkah itu dan langkah sesudahnya berstatus **Terblokir**, tidak dihitung lulus maupun gagal. Perbedaan hasil pada langkah yang bisa dijalankan ada di [deviations.md](deviations.md); error server ada di [http-5xx.md](http-5xx.md).',
    '',
    `Saat ini **${active.length} blocker** masih menghentikan **${blockedCases} test case**; ${quiet.length} blocker lainnya sudah selesai atau tidak lagi menghentikan test.`,
    '',
    `Blocker yang penyebabnya **error server** (${SERVER_ERROR_BLOCKERS.join(', ')}) dipindah ke [http-5xx.md](http-5xx.md#error-server-yang-menghentikan-test) (keputusan 2026-11-06); test case-nya tetap berstatus Terblokir.`,
    '',
    'Kolom **Jenis** menunjukkan siapa yang harus bergerak: **Bug situs** (fiturnya ada tetapi gagal; Development), **Fitur belum ada** (situs belum punya fiturnya; product owner memutuskan, lalu Development), atau **Set-up & data uji** (data, akun, atau konfigurasi yang belum ada di situs bersama; administrator situs atau tester).',
    '',
    'Blocker 1–16 berasal dari checklist `reference/00-blockers-checklist-linked.xlsx`; blocker 17 dan seterusnya ditemukan oleh otomasi. Kolom **Cek ulang** menyebut kapan dan bagaimana blocker terakhir diperiksa di situs (pengawas blocker `tests/modules/00-access/blocker-watch.spec.ts` berjalan di setiap run).',
  ]);
  out.push('## Ringkasan blocker yang masih aktif', '', '| No | Blocker | Jenis | Test case | Rantai | Modul | Penanggung jawab |', '|---:|---|---|---:|---|---|---|');
  for (const b of [...active].sort((x, y) => (y.stops!.testCases + y.stops!.chains.length) - (x.stops!.testCases + x.stops!.chains.length))) {
    out.push(`| [${b.no}](#blocker-${b.no}) | ${cell(b.title)} | ${blockerKind(b.no)} | ${b.stops!.testCases} | ${b.stops!.chains.join(', ')} | ${cell(b.stops!.modules.map(wordId).join(', '))} | ${cell(b.who)} |`);
  }
  out.push('', '## Rincian blocker yang masih aktif', '');
  for (const b of active) out.push(...blockerDetail(b, blockerKind(b.no)));
  out.push('## Blocker yang sudah selesai atau tidak lagi menghentikan test', '', '| No | Blocker | Keterangan |', '|---:|---|---|');
  for (const b of quiet) out.push(`| ${b.no} | ${cell(b.title)} | ${cell(b.problem || (b.resolved ? 'Selesai.' : 'Tidak ada test yang terhenti olehnya di hasil terbaru.'))} |`);
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------- deviations

const VERDICTS: { v: Verdict; title: string; what: string; col: string }[] = [
  { v: 'Deviasi nyata', title: 'Deviasi nyata: perlu diperbaiki', what: 'cacat di situs: validasi tidak ada, data ganda tersimpan, hak akses tidak ditegakkan, error server, atau angka/waktu salah.', col: 'Perbaikan yang disarankan' },
  { v: 'Perlu keputusan', title: 'Perlu keputusan product owner', what: 'situs bekerja dengan cara lain atau fiturnya belum ada. Sejak keputusan 2026-11-06 ("jika keadaan site seperti itu maka as is saja jadikan passed") deviasi seperti ini diterima apa adanya dan masuk kelompok Bisa dianggap lulus dengan catatan "Diterima apa adanya"; kelompok ini kosong.', col: 'Keputusan yang dibutuhkan' },
  { v: 'Bisa dianggap lulus', title: 'Bisa dianggap lulus (Lulus dengan catatan)', what: 'tujuan langkah tercapai; hanya bentuk atau teksnya yang beda dari referensi. Test case yang semua deviasinya masuk kelompok ini dihitung **Lulus (dengan catatan)** di ringkasan.', col: 'Catatan' },
];

function deviationsMd(): string {
  const withDev = s.outcomes.filter((o) => o.deviations.length);
  const total = withDev.reduce((a, o) => a + o.deviations.length, 0);
  const count = (v: Verdict) => withDev.reduce((a, o) => a + o.deviations.filter((d) => reviewDeviation(o.id, d).verdict === v).length, 0);
  const out = header('Deviasi: langkah yang berjalan tetapi hasilnya berbeda dari referensi', [
    'Deviasi = langkah **bisa dijalankan**, tetapi hasil di situs tidak sama dengan *Expected Result* di workbook referensi. Setiap deviasi sudah ditinjau (scripts/qa/deviation-review.ts, 2026-11-01) dan diberi saran: perbaikan, keputusan yang dibutuhkan, atau catatan.',
    '',
    `**${total} deviasi** di **${withDev.filter((o) => o.kind === 'module').length} test case** dan **${withDev.filter((o) => o.kind === 'chain').length} rantai E2E**.`,
    '',
    '| Tinjauan | Deviasi | Test case / rantai (menurut deviasi terberatnya) | Arti |',
    '|---|---:|---:|---|',
    ...VERDICTS.map((x) => `| [${x.v}](#${anchor(x.title)}) | ${count(x.v)} | ${withDev.filter((o) => reviewCase(o.id, o.deviations) === x.v).length} | ${x.what} |`),
  ]);
  const byModule = new Map<string, number[]>();
  for (const o of withDev) {
    const g = groupOf(o);
    const c = byModule.get(g) ?? [0, 0, 0];
    for (const d of o.deviations) c[VERDICTS.findIndex((x) => x.v === reviewDeviation(o.id, d).verdict)] += 1;
    byModule.set(g, c);
  }
  out.push('## Per modul', '', '| Modul | Nyata | Perlu keputusan | Bisa dianggap lulus |', '|---|---:|---:|---:|');
  for (const g of [...byModule.keys()].sort(order)) out.push(`| ${g} | ${byModule.get(g)!.join(' | ')} |`);
  out.push('');
  for (const x of VERDICTS) {
    out.push(`## ${x.title}`, '', `Arti: ${x.what}`, '');
    const groups = new Map<string, string[]>();
    for (const o of [...withDev].sort((a, b) => a.id.localeCompare(b.id))) {
      for (const d of o.deviations) {
        const r = reviewDeviation(o.id, d);
        if (r.verdict !== x.v) continue;
        const p = parseDeviation(d);
        const step = p.source ? `${p.step} (${p.source})` : p.step;
        const rows = groups.get(groupOf(o)) ?? [];
        rows.push(`| ${o.id} | ${cell(titleOf(o))} | ${step} | ${cell(p.expected)} | ${cell(p.site)} | ${cell(x.v === 'Bisa dianggap lulus' ? r.note : `${r.note} ${r.fix}`)} |`);
        groups.set(groupOf(o), rows);
      }
    }
    for (const g of [...groups.keys()].sort(order)) {
      out.push(`### ${g} (${x.v.toLowerCase()})`, '', `| Test case | Judul | Langkah | Referensi mengharapkan | Di situs | ${x.col} |`, '|---|---|---:|---|---|---|', ...groups.get(g)!, '');
    }
  }
  return out.join('\n');
}

// ------------------------------------------------------------------ HTTP 5xx

interface Logged { at: string; test: string; status: number; method: string; url: string; digest?: string }

/** Every HTTP 5xx the runs logged (.qa-state/**\/http-5xx.jsonl and the default log), once each. */
function history(): Logged[] {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory() && !/^out-|node_modules/.test(f.name)) walk(p);
      else if (f.name === 'http-5xx.jsonl') files.push(p);
    }
  };
  walk('.qa-state');
  const seen = new Map<string, Logged>();
  for (const f of files) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as Logged;
        seen.set(`${e.at}|${e.url}|${e.test}`, e);
      } catch {
        // a torn line
      }
    }
  }
  return [...seen.values()];
}

/** "/id/billing/cashier/<uuid>" → "/billing/cashier/<id>". */
const route = (url: string) => new URL(url).pathname.replace(/^\/(id|en)(?=\/)/, '').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>');

/** The blockers whose scope or cause names a route. */
function blockersOfRoute(r: string): number[] {
  const base = r.replace(/\/<id>$/, '');
  const hits = [
    ...FOUND_BLOCKERS.filter((b) => `${b.scope} ${b.cause}`.includes(base)).map((b) => b.no),
    ...blockers().blockers.filter((b) => `${b.scope ?? ''} ${b.cause ?? ''}`.includes(base)).map((b) => b.no),
  ];
  return [...new Set(hits)].sort((a, b) => a - b);
}

/** Known problems behind the 5xx still seen, by route (looked at on the site). */
const STILL: Record<string, { problem: string; fix: string }> = {
  '/emergency/patients': {
    problem: 'Melampirkan file sekitar 1 MB pada pasien IGD (TC-APP015-052 langkah 1) dijawab HTTP 500; layar hanya menampilkan "Could not save.". Dicek ulang 2026-11-01: masih terjadi (digest 527308963).',
    fix: 'Batasi ukuran lampiran di server dan tolak file yang terlalu besar dengan pesan yang menyebut batasnya, alih-alih error server.',
  },
};

function http5xxMd(): string {
  const errs = s.errors;
  const all = history();
  // Only the 5xx still seen in the newest results; the endpoints fixed since are left out (the user's ask of 2026-11-01).
  const out = header('HTTP 5xx: jawaban error dari server situs', [
    'HTTP 5xx = server situs gagal memproses permintaan (error di sisi server), bukan penolakan biasa. Setiap jawaban 5xx dicatat oleh `fixtures/e2e.ts` (fixture `serverErrors`) ke `.qa-state/**/http-5xx.jsonl`. Dokumen ini hanya memuat 5xx yang **masih terjadi** di hasil terbaru; yang sudah diperbaiki tidak dicantumkan.',
    '',
    `**${errs.length} jawaban 5xx** masih terjadi, dari ${new Set(errs.map((e) => e.id)).size} test.`,
  ]);
  if (!errs.length) out.push('Tidak ada HTTP 5xx dalam hasil terbaru semua test.', '');
  else out.push(...http5xxRows(errs, all));
  out.push(...serverErrorBlockers());
  return out.join('\n');
}

/** Server errors that stop test steps: the blockers moved here from blocker.md (the user's decision of 2026-11-06). */
function serverErrorBlockers(): string[] {
  const list = allBlockers().filter((b) => isServerError(b.no));
  const active = list.filter((b) => b.stops).sort((x, y) => (y.stops!.testCases + y.stops!.chains.length) - (x.stops!.testCases + x.stops!.chains.length));
  const out = [
    '## Error server yang menghentikan test',
    '',
    `Blocker yang penyebabnya error server: situs menjawab HTTP 500/504 (sampai 2026-10-30) atau error server untuk permintaan yang benar. Langkahnya tidak bisa dijalankan, jadi test case-nya berstatus **Terblokir**; sekarang **${active.length}** masih menghentikan **${blockedByServer()} test case**. Dipindah dari [blocker.md](blocker.md) atas keputusan 2026-11-06.`,
    '',
    '| No | Masalah | Test case | Rantai | Modul | Penanggung jawab |',
    '|---:|---|---:|---|---|---|',
    ...active.map((b) => `| [${b.no}](#blocker-${b.no}) | ${cell(b.title)} | ${b.stops!.testCases} | ${b.stops!.chains.join(', ')} | ${cell(b.stops!.modules.map(wordId).join(', '))} | ${cell(b.who)} |`),
    '',
  ];
  for (const b of list) out.push(...blockerDetail(b, 'Error server'));
  return out;
}

function http5xxRows(errs: typeof s.errors, all: ReturnType<typeof history>): string[] {
  const out: string[] = [];
  out.push('| Endpoint | Test | Terlihat pertama | Terakhir (WIB) | Digest | Masalah | Perbaikan yang disarankan | Blocker terkait |', '|---|---|---|---|---|---|---|---|');
  for (const e of [...errs].sort((x, y) => x.id.localeCompare(y.id))) {
    const r = route(e.url);
    const k = STILL[r];
    const same = all.filter((x) => route(x.url) === r && x.method === e.method);
    const first = same.reduce((m, x) => (x.at < m ? x.at : m), e.at);
    out.push(`| \`${e.method} ${r}\` | ${e.id} (${statusId(e.testStatus)}) | ${wib(first).slice(0, 10)} | ${wib(e.at)} | ${e.digest ?? ''} | ${cell(k?.problem ?? 'Server menjawab 500 untuk permintaan ini.')} | ${cell(k?.fix ?? 'Tangani permintaan ini tanpa error server; kembalikan pesan yang jelas bila input ditolak.')} | ${blockersOfRoute(r).map((n) => `[${n}](${blockerLink(n).replace('http-5xx.md', '')})`).join(', ') || '—'} |`);
  }
  out.push('');
  return out;
}

// ------------------------------------------------------------------ summary

function summaryMd(): string {
  const m = s.totals.modules;
  const c = s.totals.chains;
  const withNotes = s.outcomes.filter((o) => o.kind === 'module' && o.passedWithNotes).length;
  const devCases = s.outcomes.filter((o) => o.kind === 'module' && (o.status === 'Deviation' || o.passedWithNotes));
  const verdict = (v: Verdict) => devCases.filter((o) => reviewCase(o.id, o.deviations) === v).length;
  const top = allBlockers().filter((b) => b.stops && !isServerError(b.no)).sort((x, y) => y.stops!.testCases - x.stops!.testCases).slice(0, 8);
  const out = header('Ringkasan hasil pengujian SIMRS', [
    `Situs ${s.run.site}/id (bahasa Indonesia), cabang uji ${s.run.branch}. Setiap test case dan rantai dihitung dengan hasil terbarunya dari semua run. Rincian per test case, dengan tangkapan layar, ada di \`reports/summary/simrs-run-summary.xlsx\` (satu sheet per modul).`,
  ]);
  out.push(
    '## Angka utama',
    '',
    '| Status | Test case modul | Rantai E2E |',
    '|---|---:|---:|',
    ...['Passed', 'Deviation', 'Failed', 'Blocked', 'Not run'].map((x) => `| ${statusId(x)} | ${m[x] ?? 0} | ${c[x] ?? 0} |`),
    `| **Total** | **${s.totals.testCases}** | **${s.totals.chainCount}** |`,
    '',
    `- Tingkat lulus: **${Math.round(((m.Passed ?? 0) / s.totals.testCases) * 100)}%** (termasuk ${withNotes} test case **Lulus dengan catatan**: semua perbedaannya dari referensi bisa diterima).`,
    `- Cakupan (test case yang dijalankan): **${Math.round((((m.Passed ?? 0) + (m.Deviation ?? 0) + (m.Failed ?? 0)) / s.totals.testCases) * 100)}%**.`,
    `- HTTP 5xx di hasil terbaru: **${s.totals.http5xx}** ([http-5xx.md](http-5xx.md)).`,
    '',
    '## Masalah utama',
    '',
    `1. **Blocker** ([blocker.md](blocker.md)): ${allBlockers().filter((b) => b.stops && !isServerError(b.no)).length} blocker masih menghentikan ${blockedByBlockers()} test case. Yang terbesar:`,
    ...top.map((b) => `   - Blocker ${b.no}: ${b.title} (${b.stops!.testCases} test case). Perbaikan: ${cell(b.fix).slice(0, 220)}`),
    `2. **Deviasi** ([deviations.md](deviations.md)): dari ${devCases.length} test case dengan deviasi, ${verdict('Deviasi nyata')} berisi **deviasi nyata** (perlu diperbaiki), ${verdict('Perlu keputusan')} **perlu keputusan** product owner, dan ${verdict('Bisa dianggap lulus')} **bisa dianggap lulus**.`,
    `3. **HTTP 5xx dan error server** ([http-5xx.md](http-5xx.md)): ${s.totals.http5xx} jawaban HTTP 5xx masih terjadi; ${allBlockers().filter((b) => b.stops && isServerError(b.no)).length} blocker karena error server (${SERVER_ERROR_BLOCKERS.join(', ')}) menghentikan ${blockedByServer()} test case.`,
    `4. **Belum dijalankan:** ${m['Not run'] ?? 0} test case yang terikat jam atau hari kerja, dijadwalkan di run pagi (\`.qa-state/morning-run-*.sh\`).`,
    '',
    '## Per modul',
    '',
    '| Modul | Total | Lulus | Deviasi | Gagal | Terblokir | Belum dijalankan |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...s.perModule.map((p) => `| ${wordId(p.module)} | ${p.total} | ${p.Passed ?? 0} | ${p.Deviation ?? 0} | ${p.Failed ?? 0} | ${p.Blocked ?? 0} | ${p['Not run'] ?? 0} |`),
    '',
  );
  return out.join('\n');
}

fs.writeFileSync('docs/qa/ringkasan-hasil.md', summaryMd());
fs.writeFileSync('docs/qa/blocker.md', blockerMd());
fs.writeFileSync('docs/qa/deviations.md', deviationsMd());
fs.writeFileSync('docs/qa/http-5xx.md', http5xxMd());
console.log(`docs/qa: ringkasan-hasil.md, blocker.md, deviations.md (${s.outcomes.reduce((a, o) => a + o.deviations.length, 0)} deviasi), http-5xx.md (${s.errors.length} masih terjadi)`);
