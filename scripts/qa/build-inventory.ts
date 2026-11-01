/**
 * Writes docs/qa/test-inventory.md, docs/qa/traceability/<module>.md and
 * docs/qa/_generated-open-items.md from test-data/reference/ (see
 * build-test-data.mts). Dispositions come from lib/qa-data/plan.ts, the same
 * code the specs use, so docs and tests cannot disagree.
 *
 * Run: npm run qa:inventory
 */
import fs from 'node:fs';
import path from 'node:path';
import { blockers, modules, prerequisites, testCaseRef, testData } from '../../lib/qa-data';
import { FOUND_BLOCKERS } from '../../lib/qa-data/found-blockers';
import { planFor, traceTag, type Plan } from '../../lib/qa-data/plan';
import { BLOCKER_TITLE_ID } from './blocker-titles-id';
import { BLOCKER_PROBLEM_ID } from './id/blocker-detail-id';
import { sentenceId } from './report-language';
import { reasonId, titleId, wordId } from './summary-id';

const TYPE_ID: Record<string, string> = { Positive: 'Positif', Negative: 'Negatif', Boundary: 'Batas', Security: 'Keamanan', Integration: 'Integrasi', Regression: 'Regresi', Other: 'Lainnya', Usability: 'Kegunaan', Performance: 'Performa', Concurrency: 'Konkurensi', Localization: 'Lokalisasi' };
const PRIO_ID: Record<string, string> = { Critical: 'Kritis', High: 'Tinggi', Medium: 'Sedang', Low: 'Rendah' };

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'qa');
fs.mkdirSync(path.join(OUT, 'traceability'), { recursive: true });

const cell = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v).replace(/\r?\n/g, ' / ').replace(/\|/g, '\\|').trim();
const cut = (v: unknown, n: number): string => {
  const s = cell(v);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const table = (head: string[], rows: unknown[][]): string[] => [
  `| ${head.join(' | ')} |`,
  `|${head.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
];

type Kind = 'RO' | 'WRITE' | 'CHAIN' | 'FIXME' | 'SKIP';
function kind(p: Plan): Kind {
  if (p.disposition === 'skip') return 'SKIP';
  if (p.disposition === 'fixme') return 'FIXME';
  if (p.needsRecordFrom) return 'CHAIN';
  return p.readOnly ? 'RO' : 'WRITE';
}
const KIND_TEXT: Record<Kind, string> = {
  RO: 'otomatis (hanya membaca)',
  WRITE: 'otomatis (menyimpan data; butuh QA_ALLOW_WRITES)',
  CHAIN: 'otomatis (rantai; butuh data dari aplikasi lain)',
  FIXME: 'fixme (terblokir atau menunggu prasyarat)',
  SKIP: 'skip (tidak diotomasi)',
};

// --------------------------------------------------------- per module matrix
/**
 * The spec file that declares each test case: the module folder's spec that
 * holds the quoted id ('TC-APP…' in qaTest, or in a case map). Read from the
 * code, so the docs name the file that runs the test.
 */
const SPEC_OF = new Map<string, string>();
for (const m of modules()) {
  const dir = path.join(ROOT, 'tests', 'modules', m.slug);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.spec.ts')).sort()) {
    for (const id of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/'(TC-APP\d{3}-\d{3})'/g)) {
      if (!SPEC_OF.has(id[1])) SPEC_OF.set(id[1], `tests/modules/${m.slug}/${f}`);
    }
  }
}
/** Module folder of a test case ("TC-APP011-001" -> tests/modules/11-laboratory); its not-automated spec declares the fixme and skip cases. */
function specOf(id: string): string {
  const hit = SPEC_OF.get(id);
  if (hit) return `\`${hit}\``;
  const dir = fs.readdirSync(path.join(ROOT, 'tests', 'modules')).find((d) => d.startsWith(`${id.slice(7, 9)}-`));
  const na = dir && `tests/modules/${dir}/not-automated.spec.ts`;
  return na && fs.existsSync(path.join(ROOT, na)) ? `\`${na}\`` : '`(belum dideklarasikan)`';
}

const totals: Record<Kind, number> = { RO: 0, WRITE: 0, CHAIN: 0, FIXME: 0, SKIP: 0 };
const perModule: { slug: string; app: string; tcs: number; counts: Record<Kind, number>; partial: number }[] = [];
const tbdRows: unknown[][] = [];
const notFound: unknown[][] = [];
const currentBehaviour: unknown[][] = [];
const discrepancies: unknown[][] = [];
const needsEval: unknown[][] = [];

for (const m of modules()) {
  const counts: Record<Kind, number> = { RO: 0, WRITE: 0, CHAIN: 0, FIXME: 0, SKIP: 0 };
  let partial = 0;
  const rows: unknown[][] = [];
  for (const tc of m.testCases) {
    const ref = testCaseRef(tc.id);
    const plan = planFor(ref);
    const k = kind(plan);
    counts[k]++;
    if (plan.partialSteps.length) partial++;
    rows.push([
      tc.id, tc.journeyId, titleId(tc.scenario), TYPE_ID[tc.testType] ?? tc.testType, PRIO_ID[tc.priority] ?? tc.priority,
      traceTag(ref).replace(/^\[|\]$/g, '').split(' | ')[2].replace(/^rows? /, 'baris '), ref.journey.row,
      specOf(tc.id),
      `${plan.user ?? 'tanpa login'} / ${plan.branch === 'All branches' ? 'Semua cabang' : plan.branch === 'Two branches' ? 'Dua cabang' : plan.branch}`,
      KIND_TEXT[k],
      [...plan.reasons.map((r) => sentenceId(reasonId(r))), ...(plan.partialSteps.length ? [`TBD di langkah ${plan.partialSteps.join(', ')}: hanya bagian yang tertulis yang dicek (Q8)`] : [])].join(' / '),
    ]);
    for (const s of tc.steps) {
      if (s.expected.includes('TBD')) tbdRows.push([m.source, s.row, tc.id, s.step, cut(s.expected, 160)]);
      if (/Current behaviour/.test(s.expected)) currentBehaviour.push([m.source, s.row, tc.id, s.step, cut(s.expected, 240)]);
      const nf = (s.observed ?? '').match(/not found: (.*?)(\. They|$)/);
      if (nf) notFound.push([m.source, s.row, tc.id, s.step, nf[1]]);
    }
  }
  for (const j of m.journeys) {
    if (j.verificationStatus === 'Discrepancy Found') discrepancies.push([m.source, j.row, j.id, j.name]);
    if (j.automationCandidate === 'Needs Evaluation') needsEval.push([m.source, j.row, j.id, j.name]);
  }
  for (const k of Object.keys(totals) as Kind[]) totals[k] += counts[k];
  perModule.push({ slug: m.slug, app: `${m.slug.slice(0, 2)} ${m.appName}`, tcs: m.testCases.length, counts, partial });

  fs.writeFileSync(
    path.join(OUT, 'traceability', `${m.slug}.md`),
    [
      `# Keterlacakan: ${m.source}`,
      '',
      `Dibangun oleh \`npm run qa:inventory\` dari \`reference/${m.source}\`. Jangan diubah manual.`,
      '',
      'Judul test = `<TC ID> <Nama skenario> [<file> | Steps | rows a-b | <TC ID>]`; anotasi `journey` = `[<file> | Journeys | row n | <Journey ID>]`. Judul skenario ditulis dalam bahasa Indonesia; teks asli workbook referensi berbahasa Inggris.',
      '',
      ...table(['TC ID', 'Journey ID', 'Skenario', 'Jenis', 'Prioritas', 'Baris Steps', 'Baris Journeys', 'Spec', 'User / cabang', 'Disposisi', 'Alasan'], rows),
      '',
      '## Jumlah',
      '',
      ...(Object.keys(counts) as Kind[]).map((k) => `- ${KIND_TEXT[k]}: ${counts[k]}`),
      `- test case dengan langkah "TBD" (dicek sebagian): ${partial}`,
      '',
    ].join('\n'),
  );
}

// ------------------------------------------------------------- inventory.md
const pre = prerequisites();
const td = testData();
const bl = blockers();
const allTcs = perModule.reduce((n, m) => n + m.tcs, 0);
const allJourneys = modules().reduce((n, m) => n + m.journeys.length, 0);
const allSteps = modules().reduce((n, m) => n + m.testCases.reduce((k, t) => k + t.steps.length, 0), 0);

const o: string[] = [];
o.push(
  '# Inventaris test',
  '',
  'Dibangun oleh `npm run qa:inventory` dari `reference/*.xlsx` (lewat `npm run qa:data`). Jangan diubah manual.',
  'Pertanyaan, jawaban, dan celah: [open-questions.md](open-questions.md). Daftar per baris: [_generated-open-items.md](_generated-open-items.md).',
  '',
  'Isi kolom yang dikutip langsung dari workbook referensi (deskripsi user, katalog data, set-up, nama fitur) tetap dalam bahasa aslinya (Inggris), sama seperti di workbook.',
  '',
  '## 1. File sumber',
  '',
  ...table(['File', 'Kegunaan', 'Sheet (baris data)'], [
    ['00-prerequisites.xlsx', 'User/peran, set-up, kebutuhan per journey', `Users (${pre.users.length}), Role accounts (${pre.roleAccounts.length}), Set-up and data (${pre.setup.length}), Journeys (${pre.journeys.length})`],
    ['00-test-data.xlsx', 'Aturan data, katalog data bernama, data per journey', `Overview (${td.overview.length}), Data catalogue (${td.catalogue.length}), Journeys (${td.journeys.length})`],
    ['00-blockers-checklist-linked.xlsx', 'Blocker yang sudah diketahui dan journey-nya', `Checklist (${bl.blockers.length}), Journey links (${bl.links.length})`],
  ]),
  '',
  '27 workbook modul memakai sheet Summary, Journeys (25 kolom), dan Steps (24 kolom) dengan header yang sama; `npm run qa:data` gagal bila ada header yang berbeda.',
  '',
  ...table(
    ['File', 'Aplikasi', 'Alamat (Summary)', 'Lisensi; hak tulis', 'Journey', 'Test case', 'Langkah'],
    modules().map((m) => [
      `[${m.source}](traceability/${m.slug}.md)`, `${m.appId} ${wordId(`${m.slug.slice(0, 2)} ${m.appName}`).slice(3)}`, m.summary.Address,
      m.summary['Licence and write privilege'], m.journeys.length, m.testCases.length,
      m.testCases.reduce((k, t) => k + t.steps.length, 0),
    ]),
  ),
  `| **Total** | | | | **${allJourneys}** | **${allTcs}** | **${allSteps}** |`,
  '',
  '## 2. Prasyarat (00-prerequisites.xlsx)',
  '',
  '### User',
  '',
  ...table(['Kode', 'User', 'Cabang', 'Hak', 'Journey', 'Status di situs', 'Disiapkan'],
    pre.users.map((u) => [u.key, u.user, u.branch, u.rights, u.journeys, u.statusOnSite, u.prepared])),
  '',
  'Kata sandi: sama untuk semua akun, dibaca dari `QA_PASSWORD` di `.env` (Q2). Sesi: `tests/e2e/auth.setup.ts` → `.auth/U1.json` … `.auth/U7.json`.',
  '',
  '### Peran kerja per aplikasi (U8)',
  '',
  ...table(['Aplikasi', 'Peran kerja', 'Hak tulis', 'Journey (tertulis)', 'Akun', 'Disiapkan'],
    pre.roleAccounts.map((r) => [r.application, r.workingRole, r.writeRight, r.journeys, r.login ?? '—', r.prepared])),
  '',
  '### Set-up dan data',
  '',
  ...table(['No', 'Prasyarat', 'Aplikasi', 'Journey', 'Yang disiapkan', 'Siapa', 'Status'],
    pre.setup.map((r) => [r.no, r.prerequisite, r.applications, r.journeys, r.whatToPrepare, r.who, r.status])),
  '',
  '## 3. Data uji (00-test-data.xlsx)',
  '',
  '### Aturan',
  '',
  ...td.overview.filter((r) => typeof r.rule === 'string' && r.row <= 12).map((r) => `- **${cell(r.topic)}**: ${cell(r.rule)}`),
  '- **Diterapkan (Q5)**: nama data yang dibuat test memakai awalan "QA-" ("X Pasien OT 01" → "QA-Pasien OT 01") ditambah id run (`lib/qa-data/names.ts`).',
  '',
  '### Data → journey',
  '',
  ...table(['Baris', 'Aplikasi', 'Nama singkat', 'Isi', 'Jenis', 'Journey', 'ID journey (dari sheet Journeys)', 'Status'],
    td.catalogue.map((c) => {
      const ids = td.journeys
        .filter((j) => j.application === c.application && (j.shortNamesUsed ?? '').split(';').map((s) => s.trim()).includes(c.shortName))
        .map((j) => j.journeyId.replace('JRN-APP', ''));
      return [c.row, c.application, c.shortName, cut(c.what, 160), c.kind, c.journeys, ids.join(', ') || '—', c.status];
    })),
  '',
  'ID journey disingkat: `001-003` = `JRN-APP001-003`.',
  '',
  '## 4. Modul dan fitur',
  '',
  ...modules().map((m) => {
    const f = new Map<string, number>();
    for (const t of m.testCases) f.set(t.feature, (f.get(t.feature) ?? 0) + 1);
    return `- **${wordId(`${m.slug.slice(0, 2)} ${m.appName}`)}**: ${[...f].map(([k, v]) => `${k} (${v} TC)`).join('; ')}`;
  }),
  '',
  '## 5. Rencana per test case',
  '',
  '- Spec: `tests/modules/<NN-modul>/<fitur>.spec.ts`, satu `qaTest(<TC ID>)` per test case (`fixtures/e2e.ts`); file tiap test case ada di barisnya di traceability; langkah Excel menjadi `qa.step(n)`; pengecekan mengikuti kolom Expected Result, disesuaikan dengan situs bila workbook bertentangan (C2).',
  '- User: U2 bila journey butuh U2 atau cabangnya "All branches", selain itu U1 (Podomoro); tanpa login untuk "None (not signed in)". Kasus akses memakai user per test case (lib/qa-data/plan.ts, usersOfCase).',
  '- Tag: `@<modul>`, `@<jenis test>`, `@<prioritas>`, `@regression`, `@smoke` (Critical + Positive), `@u<n>`.',
  '- Disposisi (lib/qa-data/plan.ts): skip = Automation Candidate No (kecuali yang disimulasikan); fixme = blocker tertentu (5 hanya untuk journey "All branches"), atau user U3–U10 yang belum disiapkan; selain itu otomatis. Test case yang menyimpan data hanya jalan dengan `QA_ALLOW_WRITES=1` (Q1).',
  '',
  ...table(['Modul', 'TC', 'hanya membaca', 'menyimpan', 'rantai', 'fixme', 'skip', 'dengan langkah TBD'],
    perModule.map((m) => [`[${wordId(m.app)}](traceability/${m.slug}.md)`, m.tcs, m.counts.RO, m.counts.WRITE, m.counts.CHAIN, m.counts.FIXME, m.counts.SKIP, m.partial])),
  `| **Total** | **${allTcs}** | **${totals.RO}** | **${totals.WRITE}** | **${totals.CHAIN}** | **${totals.FIXME}** | **${totals.SKIP}** | **${perModule.reduce((n, m) => n + m.partial, 0)}** |`,
  '',
);
fs.writeFileSync(path.join(OUT, 'test-inventory.md'), o.join('\n'));

// ------------------------------------------------------- generated open items
const moduleJourneys = new Set(modules().flatMap((m) => m.journeys.map((j) => j.id)));
const missing = pre.journeys.filter((j) => !moduleJourneys.has(j.journeyId));
const roleMismatch = pre.roleAccounts.flatMap((r) => {
  const m = modules().find((x) => x.slug.startsWith(r.application.slice(0, 2)));
  return m && m.journeys.length !== r.journeys ? [[r.row, r.application, r.journeys, m.journeys.length]] : [];
});
const g: string[] = ['# Daftar hal terbuka (dibangun otomatis)', '', 'Dibangun oleh `npm run qa:inventory`. Nomor baris = baris Excel. Teks Expected Result dan nama journey dikutip dari workbook referensi (bahasa Inggris).', ''];
const section = (title: string, head: string[], rows: unknown[][]) => g.push(`## ${title} (${rows.length})`, '', ...table(head, rows), '');
section('A. Journey di file 00 yang tidak punya baris di workbook modul mana pun', ['Baris Journeys 00-prerequisites', 'ID journey', 'Nama', 'User', 'Cabang', 'Prekondisi'],
  missing.map((j) => [j.row, j.journeyId, j.name, j.usersNeeded, j.branch, j.preconditions]));
section('B. Langkah yang Expected Result-nya berisi "TBD" (dicek sebagian, Q8)', ['File', 'Baris Steps', 'TC', 'Langkah', 'Expected Result'], tbdRows);
section('C. Expected Result yang menggambarkan "Current behaviour"', ['File', 'Baris Steps', 'TC', 'Langkah', 'Expected Result'], currentBehaviour);
section('D. Teks UI yang dikutip workbook tetapi tidak ditemukan skrip workbook di situs', ['File', 'Baris Steps', 'TC', 'Langkah', 'Teks yang tidak ditemukan'], notFound);
section('E. Journey dengan Verification Status = Discrepancy Found', ['File', 'Baris Journeys', 'Journey', 'Nama'], discrepancies);
section('F. Journey dengan Automation Candidate = Needs Evaluation', ['File', 'Baris Journeys', 'Journey', 'Nama'], needsEval);
section('G. Kolom "Journeys" di Role accounts dibanding jumlah journey di workbook', ['Baris Role accounts', 'Aplikasi', 'Tertulis', 'Di workbook'], roleMismatch);
fs.writeFileSync(path.join(OUT, '_generated-open-items.md'), g.join('\n'));

// ------------------------------------------------------------ blockers found
const fb: string[] = [
  '# Blocker yang ditemukan saat otomasi',
  '',
  'Dibangun oleh `npm run qa:inventory` dari `lib/qa-data/found-blockers.ts`. Jangan diubah manual. Gambaran semua blocker (checklist dan temuan) beserta perbaikan dan cek ulangnya ada di [blocker.md](blocker.md).',
  '',
  'Usulan baris untuk `reference/00-blockers-checklist-linked.xlsx` (tidak diubah oleh otomasi), bernomor sesudah blocker terakhirnya',
  `(${Math.max(...bl.blockers.map((b) => b.no))}). Test case tanpa daftar langkah berstatus \`fixme\`; langkah yang tercantum ditandai \`blocker\` di laporan dan tidak pernah dihitung lulus.`,
  '',
  ...table(
    ['No', 'Blocker', 'Kategori', 'Masalah', 'Test case (langkah)', 'Perbaikan', 'Siapa'],
    FOUND_BLOCKERS.map((b) => [
      b.no, BLOCKER_TITLE_ID[b.no] ?? b.blocker, wordId(b.category), BLOCKER_PROBLEM_ID[b.no] ?? '',
      b.testCases.map((t) => `${t.id}${t.steps ? ` (langkah ${t.steps.join(', ')})` : ' (seluruh test case)'}`).join('; ') || '—',
      wordId(b.fix), wordId(b.who),
    ]),
  ),
  '',
];
fs.writeFileSync(path.join(OUT, 'blockers-found.md'), fb.join('\n'));

console.log(`test cases ${allTcs}:`, totals);
