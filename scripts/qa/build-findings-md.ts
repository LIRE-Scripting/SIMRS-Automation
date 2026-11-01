/**
 * Two Markdown reports for the testers, in Indonesian, built from
 * reports/summary/run-summary.json (npm run qa:run-summary):
 *
 * - docs/qa/deviations.md: every deviation of the newest result of each test
 *   case and chain: the step, what the workbook expects and what the site does;
 * - docs/qa/http-5xx.md: every HTTP 5xx counted in the newest result of a test
 *   (fixtures/e2e.ts records them into QA_SERVER_ERRORS), with its endpoint,
 *   digest and the kind of input that caused it.
 *
 *   npm run qa:findings-md
 */
import { reviewCase, reviewDeviation } from './deviation-review';
import fs from 'node:fs';
import { CHAIN_NAME_ID } from './chain-names-id';
import { statusId } from './report-language';
import { partId, reasonId, titleId, wordId } from './summary-id';

interface Outcome {
  kind: 'module' | 'chain';
  id: string;
  title: string;
  group?: string;
  status: string;
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
interface Summary {
  run: { start: string; built: string; site: string; branch: string };
  totals: { modules: Record<string, number>; chains: Record<string, number>; testCases: number; chainCount: number; http5xx: number };
  outcomes: Outcome[];
  errors: ServerError[];
}

const SUMMARY = 'reports/summary/run-summary.json';
const s = JSON.parse(fs.readFileSync(SUMMARY, 'utf8')) as Summary;
const built = s.run.built.slice(0, 16).replace('T', ' ') + ' UTC';
const cell = (t: string) => t.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const groupOf = (o: Outcome) => (o.kind === 'chain' ? 'Rantai E2E' : wordId(o.group ?? ''));
const titleOf = (o: Outcome) => (o.kind === 'chain' ? (CHAIN_NAME_ID[o.id] ?? titleId(o.title)) : titleId(o.title));
const order = (a: string, b: string) => (a === 'Rantai E2E' ? 1 : b === 'Rantai E2E' ? -1 : a.localeCompare(b));

/** "Step 5: [TC-APP001-019 step 4: ]Excel expects "X"; the site: Y" → its parts. */
function parseDeviation(text: string): { step: string; source: string; expected: string; site: string } {
  const m = text.match(/^Step (\d+): (?:(TC-APP\d{3}-\d{3} step \d+): )?Excel expects "([\s\S]*?)"; the site: ([\s\S]*)$/);
  if (!m) return { step: text.match(/^Step (\d+)/)?.[1] ?? '', source: '', expected: '', site: reasonId(text.replace(/^Step \d+: /, '')) };
  return { step: m[1], source: (m[2] ?? '').replace(' step ', ' langkah '), expected: partId(m[3]), site: partId(m[4]) };
}

function deviationsMd(): string {
  const withDev = s.outcomes.filter((o) => o.deviations.length);
  const byGroup = new Map<string, Outcome[]>();
  for (const o of withDev) byGroup.set(groupOf(o), [...(byGroup.get(groupOf(o)) ?? []), o]);
  const groups = [...byGroup.keys()].sort(order);
  const total = withDev.reduce((a, o) => a + o.deviations.length, 0);
  const out: string[] = [
    '# Deviasi: langkah yang berjalan tetapi hasilnya berbeda dari workbook',
    '',
    `Dibangun ${built} dari \`${SUMMARY}\` (hasil terbaru tiap test case dan rantai). Bangun ulang: \`npm run qa:run-summary && npm run qa:findings-md\`.`,
    '',
    'Deviasi = langkah **bisa dijalankan**, tetapi yang tampil di site tidak sama dengan *Expected Result* workbook. Di workbook hasil, langkahnya berstatus **Failed** dengan perilaku site di *Actual Result*. Blocker (langkah tidak bisa dijalankan sama sekali) ada di `docs/qa/blockers-found.md`.',
    '',
    `**${total} deviasi** di **${withDev.filter((o) => o.kind === 'module').length} test case** dan **${withDev.filter((o) => o.kind === 'chain').length} rantai E2E**.`,
    '',
    'Kolom **Tinjauan** (scripts/qa/deviation-review.ts, ditinjau 2026-11-01): **Bisa dianggap lulus** = tujuan langkah tercapai, hanya bentuk atau teksnya beda dari referensi; **Perlu keputusan** = situs bekerja dengan cara lain atau fiturnya tidak ada, perlu keputusan product owner; **Deviasi nyata** = cacat (validasi tidak ada, data ganda, hak akses, server error, angka/waktu salah).',
    '',
    `| Tinjauan | Deviasi | Test case / rantai (semua deviasinya) |`,
    '|---|---:|---:|',
    ...(['Bisa dianggap lulus', 'Perlu keputusan', 'Deviasi nyata'] as const).map((v) => `| ${v} | ${withDev.reduce((a, o) => a + o.deviations.filter((d) => reviewDeviation(o.id, d).verdict === v).length, 0)} | ${withDev.filter((o) => reviewCase(o.id, o.deviations) === v).length} |`),
    '',
    '| Modul | Test case / rantai dengan deviasi | Jumlah deviasi |',
    '|---|---:|---:|',
    ...groups.map((g) => `| [${g}](#${g.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')}) | ${byGroup.get(g)!.length} | ${byGroup.get(g)!.reduce((a, o) => a + o.deviations.length, 0)} |`),
    '',
  ];
  for (const g of groups) {
    out.push(`## ${g}`, '', '| Test case | Judul | Langkah | Workbook mengharapkan | Di site | Tinjauan | Catatan |', '|---|---|---:|---|---|---|---|');
    for (const o of byGroup.get(g)!.sort((a, b) => a.id.localeCompare(b.id))) {
      for (const d of o.deviations) {
        const p = parseDeviation(d);
        const step = p.source ? `${p.step} (${p.source})` : p.step;
        const r = reviewDeviation(o.id, d);
        out.push(`| ${o.id} | ${cell(titleOf(o))} | ${step} | ${cell(p.expected)} | ${cell(p.site)} | ${r.verdict} | ${cell(r.note)} |`);
      }
    }
    out.push('');
  }
  return out.join('\n');
}

function http5xxMd(): string {
  const errs = s.errors;
  const byDate = new Map<string, number>();
  for (const e of errs) byDate.set(e.at.slice(0, 10), (byDate.get(e.at.slice(0, 10)) ?? 0) + 1);
  const path = (e: ServerError) => new URL(e.url).pathname;
  const byPath = new Map<string, ServerError[]>();
  for (const e of errs) byPath.set(path(e), [...(byPath.get(path(e)) ?? []), e]);
  const kindShort = (k: string) => (k.startsWith('Known') ? k.replace('Known: blocker', 'blocker') : k.startsWith('Negative') ? 'input salah/batas (negatif)' : 'input valid (positif)');
  const byKind = new Map<string, number>();
  for (const e of errs) byKind.set(kindShort(e.kind).replace(/^blocker .*/, 'blocker yang sudah dikenal'), (byKind.get(kindShort(e.kind).replace(/^blocker .*/, 'blocker yang sudah dikenal')) ?? 0) + 1);
  const tests = [...new Set(errs.map((e) => e.id))];
  const out: string[] = [
    '# HTTP 5xx dari site',
    '',
    `Dibangun ${built} dari \`${SUMMARY}\`. Bangun ulang: \`npm run qa:run-summary && npm run qa:findings-md\`.`,
    '',
    'Setiap jawaban 5xx dicatat oleh `fixtures/e2e.ts` (fixture `serverErrors`) ke `.qa-state/**/http-5xx.jsonl`. Di sini hanya yang terjadi **dalam hasil terbaru** sebuah test: 5xx dari run lama yang test-nya sudah diulang tidak dihitung.',
    '',
    `**${errs.length} jawaban 5xx** dari **${tests.length} test** (${tests.filter((t) => t.startsWith('TC-')).length} test case, ${tests.filter((t) => t.startsWith('E2E')).length} rantai).`,
    '',
    '| Tanggal | Jumlah 5xx |',
    '|---|---:|',
    ...[...byDate.entries()].sort().map(([d, n]) => `| ${d} | ${n} |`),
    '',
    'Jenis input yang memicunya:',
    '',
    '| Jenis | Jumlah |',
    '|---|---:|',
    ...[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `| ${k} | ${n} |`),
    '',
    '- **input salah/batas (negatif)**: test sengaja mengirim data salah; seharusnya site menolak dengan pesan, bukan HTTP 500.',
    '- **input valid (positif)**: data yang seharusnya diterima malah membuat server error.',
    '- **blocker yang sudah dikenal**: test-nya juga menemui blocker (lihat `docs/qa/blockers-found.md`).',
    '',
  ];
  if (!errs.length) {
    out.push('Tidak ada HTTP 5xx dalam hasil terbaru semua test.', '');
    return out.join('\n');
  }
  out.push('## Per endpoint', '', '| Endpoint | Jumlah | Test | Digest |', '|---|---:|---|---|');
  for (const [p, es] of [...byPath.entries()].sort((a, b) => b[1].length - a[1].length)) {
    out.push(`| \`${p}\` | ${es.length} | ${[...new Set(es.map((e) => e.id))].join(', ')} | ${[...new Set(es.map((e) => e.digest).filter(Boolean))].slice(0, 6).join(', ')} |`);
  }
  out.push('', '## Per test', '', '| Test | Status test | Waktu (UTC) | Jawaban | Endpoint | Digest | Jenis |', '|---|---|---|---|---|---|---|');
  for (const e of [...errs].sort((a, b) => a.id.localeCompare(b.id) || a.at.localeCompare(b.at))) {
    out.push(`| ${e.id} | ${statusId(e.testStatus)} | ${e.at.slice(0, 16).replace('T', ' ')} | ${e.status} ${e.method} | \`${path(e)}\` | ${e.digest ?? ''} | ${cell(kindShort(e.kind))} |`);
  }
  out.push('');
  return out.join('\n');
}

fs.writeFileSync('docs/qa/deviations.md', deviationsMd());
fs.writeFileSync('docs/qa/http-5xx.md', http5xxMd());
console.log(`docs/qa/deviations.md: ${s.outcomes.reduce((a, o) => a + o.deviations.length, 0)} deviations; docs/qa/http-5xx.md: ${s.errors.length} HTTP 5xx`);
