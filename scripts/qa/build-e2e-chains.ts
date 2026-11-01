/**
 * Builds reports/e2e-chains/e2e-journeys.xlsx: the cross-application
 * end-to-end chains of lib/qa-data/e2e-chains.ts, in the layout of the
 * reference workbooks (sheets Summary, Journeys and Steps with the same
 * headers, lists and widths; the template is reference/14-hospital-accounts.xlsx,
 * which is only read), plus a sheet Blockers that defines every blocker a chain meets.
 *
 * Each chain is one test (tests/e2e/chains/, fixtures/chain.ts) that hands the
 * records of a step on to the next. The result columns of sheet Steps come
 * from the Playwright JSON of the chain runs (reports/e2e-chains/results*.json,
 * a later file wins for a chain):
 *   Passed   the chain step ran (a deviation from the workbook's wording is noted)
 *   Failed   the chain step ran and the site did not do what the step needs
 *   Blocked  the chain stopped at this step or before it (Defect Reference names the cause)
 *   Not Run  the chain was not run
 *
 * Usage:
 *   PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e-chains/results-chains.json \
 *     npx playwright test --project=e2e tests/e2e/chains/ --reporter=list,json
 *   npm run qa:e2e-chains
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { CHAINS, type Chain } from '../../lib/qa-data/e2e-chains';
import { FOUND_BLOCKERS } from '../../lib/qa-data/found-blockers';
import { blockers, prerequisites, testCaseRef, type TestCaseRef } from '../../lib/qa-data';
import { BLOCKER_TITLE_ID } from './blocker-titles-id';
import { sentenceId, statusId } from './report-language';
import { CHAIN_NAME_ID } from './chain-names-id';
import { CHAIN_TEXT_ID } from './id/chains-id';
import { BLOCKER_PROBLEM_ID } from './id/blocker-detail-id';
import { reasonId, titleId, wordId } from './summary-id';

/** A test note or deviation in Indonesian (scripts/qa/summary-id.ts). */
const noteId = (t: string): string => sentenceId(reasonId(t));
/** The Indonesian texts of a chain (scripts/qa/id/chains-id.ts), its English ones where none. */
const textOf = (c: Chain) => {
  const t = CHAIN_TEXT_ID[c.id];
  return { name: CHAIN_NAME_ID[c.id] ?? c.name, objective: t?.objective ?? c.objective, roles: t?.roles ?? c.roles, preconditions: t?.preconditions ?? c.preconditions, outcome: t?.outcome ?? c.outcome, data: t?.data ?? c.data, practice: t?.practice ?? c.practice ?? '', role: (i: number) => t?.steps[i] ?? c.steps[i].role };
};
const PRIO_ID: Record<string, string> = { Critical: 'Kritis', High: 'Tinggi', Medium: 'Sedang' };
import { addNotesColumn, evidenceCell, probableCause } from './run-notes';

const TEMPLATE = 'reference/14-hospital-accounts.xlsx';
const OUT_DIR = 'reports/e2e-chains';
const OUT = `${OUT_DIR}/e2e-journeys.xlsx`;

type Status = 'Passed' | 'Failed' | 'Blocked' | 'Not Run';

/** Cause ids that are not in a blocker list: defined here. */
const STATES: Record<string, { title: string; cause: string; fix: string; who: string }> = {
  'NEEDS-EVALUATION': {
    title: 'Journey bertanda "Needs Evaluation" di workbook-nya',
    cause: 'Kolom "Automation Candidate" journey ini berisi "Needs Evaluation"; rantai tidak menjalankan journey yang belum disetujui untuk otomasi.',
    fix: 'Putuskan apakah journey ini bisa diotomasi, lalu isi "Automation Candidate" dengan Yes.',
    who: 'QA / Product owner',
  },
  'NOT-AUTOMATED': {
    title: 'Journey tidak untuk diotomasi (Automation Candidate = No)',
    cause: 'Kolom "Automation Candidate" journey ini berisi "No": langkahnya diuji manual, jadi rantai tidak menjalankannya.',
    fix: 'Jalankan langkah itu secara manual, atau isi "Automation Candidate" dengan Yes dan tulis test-nya.',
    who: 'QA / Product owner',
  },
  'STEP-NOT-RUN': {
    title: 'Sebuah langkah test case sumber tidak bisa dijalankan',
    cause: 'Test case sumber melewati sebuah langkah (alasannya ada di Actual Result: user lain, jendela kedua, data yang tidak tampil di layar mana pun).',
    fix: 'Sediakan yang disebut alasannya, lalu jalankan rantai lagi.',
    who: 'QA',
  },
  'NOT-RUN': {
    title: 'Rantai belum dijalankan',
    cause: 'Belum ada hasil rantai ini di reports/e2e-chains/results*.json.',
    fix: 'Jalankan rantainya (tests/e2e/chains/).',
    who: 'QA',
  },
};

/** Causes that do not stop the flow of a chain. */
const NON_STOPPING = new Set(['DEVIATION']);

/** The values of the template's lists (sheet Journeys and Steps). */
const VERIFICATION: Record<Status, string> = { Passed: 'UI Verified', Failed: 'Discrepancy Found', Blocked: 'Blocked', 'Not Run': 'Not Verified' };

// ---------------------------------------------------------------- chain runs (Playwright JSON)
interface PwStep {
  title: string;
  error?: { message?: string };
  steps?: PwStep[];
}
interface PwResult {
  status: string;
  startTime: string;
  steps?: PwStep[];
  errors?: { message?: string }[];
  annotations?: { type: string; description?: string }[];
}
interface PwSpec {
  title: string;
  tests: { annotations?: { type: string; description?: string }[]; results: PwResult[] }[];
}
interface PwSuite {
  specs?: PwSpec[];
  suites?: PwSuite[];
}
function* specsOf(suites: PwSuite[] = []): Generator<PwSpec> {
  for (const s of suites) {
    yield* s.specs ?? [];
    yield* specsOf(s.suites);
  }
}
const firstLine = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim())?.trim() ?? '';

interface ChainRun {
  date: string;
  status: string;
  /** Top-level "Chain step k" test.steps of the run. */
  steps: Map<number, PwStep>;
  /** Annotations by type, then chain step. */
  notes: (type: string) => Map<number, string[]>;
  error: string;
}

function loadRuns(): Map<string, ChainRun> {
  const runs = new Map<string, ChainRun>();
  // The chain runs (reports/e2e-chains) and plain runs of the suite (reports/e2e, playwright.config.ts), oldest first: the newest result of a chain wins.
  const files = [OUT_DIR, 'reports/e2e']
    .flatMap((dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^results.*\.json$/.test(f)).map((f) => path.join(dir, f)) : []))
    .map((file) => ({ file, report: JSON.parse(fs.readFileSync(file, 'utf8')) as { suites: PwSuite[]; stats?: { startTime?: string } } }))
    .sort((a, b) => (a.report.stats?.startTime ?? '').localeCompare(b.report.stats?.startTime ?? ''));
  for (const { report } of files) {
    for (const spec of specsOf(report.suites)) {
      const id = spec.title.match(/^(E2E-\d{3}) /)?.[1];
      const t = spec.tests[0];
      const r = t?.results[t.results.length - 1];
      if (!id || !r) continue;
      const seen = new Set<string>();
      const all = [...(t.annotations ?? []), ...(r.annotations ?? [])].filter((a) => {
        const key = `${a.type}\u0000${a.description ?? ''}`;
        return !seen.has(key) && !!seen.add(key);
      });
      const steps = new Map<number, PwStep>();
      const walk = (list: PwStep[] = []) => {
        for (const s of list) {
          const k = Number(s.title.match(/^Chain step (\d+) \[/)?.[1]);
          if (k) steps.set(k, s);
          else walk(s.steps);
        }
      };
      walk(r.steps);
      runs.set(id, {
        date: r.startTime.slice(0, 10),
        status: r.status,
        steps,
        error: firstLine(r.errors?.[0]?.message),
        notes: (type) => {
          const m = new Map<number, string[]>();
          for (const a of all.filter((x) => x.type === type)) {
            const k = Number(a.description?.match(/^Step (\d+):/)?.[1]);
            if (k) m.set(k, [...(m.get(k) ?? []), a.description!.replace(/^Step \d+: /, '')]);
          }
          return m;
        },
      });
    }
  }
  return runs;
}

/** The first error inside a step tree. */
function errorOf(s: PwStep): string {
  if (s.error?.message) return firstLine(s.error.message);
  for (const c of s.steps ?? []) {
    const e = errorOf(c);
    if (e) return e;
  }
  return '';
}

const MODULE_FILES = fs.readdirSync('reference').filter((f) => /^\d\d-.*\.xlsx$/.test(f));
const fileOf = (tc: string) => MODULE_FILES.find((f) => f.startsWith(tc.slice(7, 9)))!;
const appOf = (tc: string) => {
  const f = fileOf(tc).replace('.xlsx', '');
  return `${f.slice(0, 2)} ${f.slice(3).split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}`;
};

interface ChainStepResult {
  n: number;
  /** Automation notes of the step (see the column of the same name). */
  note: string;
  tc: string;
  role: string;
  ref: TestCaseRef;
  /** Source steps of the test case used by the chain step. */
  source: TestCaseRef['testCase']['steps'];
  status: Status;
  causes: string[];
  actual: string;
}

function evaluate(chain: Chain, run: ChainRun | undefined): ChainStepResult[] {
  const stops = run?.notes('chain-stop') ?? new Map<number, string[]>();
  const stopAt = Math.min(...[...stops.keys()], Infinity);
  const stopCause = Number.isFinite(stopAt) ? stops.get(stopAt)![0].match(/^(Blocker \d+|User U\d+|NEEDS-EVALUATION|NOT-AUTOMATED|STEP-NOT-RUN)/)![1] : '';
  let failedAt = 0;
  return chain.steps.map((s, i) => {
    const n = i + 1;
    const ref = testCaseRef(s.tc);
    const source = s.steps ? ref.testCase.steps.filter((x) => s.steps!.includes(x.step)) : ref.testCase.steps;
    const base = { n, tc: s.tc, role: s.role, ref, source };
    const date = run ? `${run.date} run rantai: ` : '';
    // A source test case that records its blocker and then skips (test.skip) leaves a skipped run with a stop: that run counts.
    if (!run || (run.status === 'skipped' && !Number.isFinite(stopAt))) {
      return { ...base, status: 'Not Run', causes: ['NOT-RUN'], actual: run ? `${date}dilewati` : 'Rantai belum dijalankan.', note: run ? 'Rantai dilewati di run-nya.' : 'Belum ada hasil rantai ini.' };
    }
    if (n >= stopAt) {
      const why = stops.get(n)?.map(noteId).join(' / ') ?? '';
      const actual = n === stopAt ? `${date}rantai berhenti di sini: ${why}` : `${date}tidak tercapai: rantai berhenti di langkah ${stopAt} (${stopCause}).`;
      return { ...base, status: 'Blocked', causes: [stopCause], actual, note: n === stopAt ? `Dihentikan oleh ${why}` : `Tidak tercapai: rantai berhenti di langkah ${stopAt} (${stopCause}).` };
    }
    if (failedAt) {
      return { ...base, status: 'Blocked', causes: ['SITE-DEFECT'], actual: `${date}tidak tercapai: langkah ${failedAt} gagal.`, note: `Tidak tercapai: langkah ${failedAt} gagal.` };
    }
    const ran = run.steps.get(n);
    const err = ran ? errorOf(ran) : '';
    if (!ran || err) {
      failedAt = n;
      const seen = (run.notes('note').get(n) ?? []).map(noteId);
      const error = err || run.error || 'langkah tidak berjalan';
      return { ...base, status: 'Failed', causes: ['SITE-DEFECT'], actual: `${date}${error}${seen.length ? `. Terlihat: ${seen.join(' / ')}` : ''}`, note: [`Error: ${error}`, `Kemungkinan penyebab: ${probableCause(error)}`, seen.length ? `Terlihat: ${seen.join(' / ')}` : ''].filter(Boolean).join('. ') };
    }
    const devs = (run.notes('deviation').get(n) ?? []).map(noteId);
    const notes = (run.notes('note').get(n) ?? []).map(noteId);
    const actual = `${date}${source.length} langkah sumber lulus.${devs.length ? ` Deviasi (alur tetap berjalan): ${devs.join(' / ')}.` : ''}${notes.length ? ` Catatan: ${notes.join(' / ')}` : ''}`;
    return { ...base, status: 'Passed', causes: devs.length ? ['DEVIATION'] : [], actual, note: [devs.length ? `Deviasi dari workbook: ${devs.join(' / ')}` : '', notes.length ? `Catatan: ${notes.join(' / ')}` : ''].filter(Boolean).join('. ') };
  });
}

interface BlockerDef {
  id: string;
  type: string;
  title: string;
  cause: string;
  fix: string;
  who: string;
}

function defineBlocker(id: string, defects: Map<string, string[]>, deviations: Map<string, string[]>): BlockerDef {
  const n = Number(id.match(/^Blocker (\d+)$/)?.[1]);
  if (n) {
    const c = blockers().blockers.find((b) => b.no === n);
    if (c) return { id, type: `Checklist (00-blockers-checklist-linked.xlsx, baris ${c.row})`, title: BLOCKER_TITLE_ID[n] ?? c.blocker, cause: BLOCKER_PROBLEM_ID[n] ?? c.cause, fix: wordId(c.fix), who: wordId(c.who) };
    const f = FOUND_BLOCKERS.find((b) => b.no === n);
    if (f) return { id, type: 'Ditemukan saat otomasi (docs/qa/blocker.md)', title: BLOCKER_TITLE_ID[n] ?? f.blocker, cause: BLOCKER_PROBLEM_ID[n] ?? f.cause, fix: wordId(f.fix), who: wordId(f.who) };
  }
  const user = id.match(/^User (U\d+)$/)?.[1];
  if (user) {
    const u = prerequisites().users.find((x) => x.key === user)!;
    return {
      id,
      type: `User belum ada (00-prerequisites.xlsx | Users | baris ${u.row})`,
      title: `${user}: ${u.user}`,
      cause: `Langkah ini butuh ${user} ("${u.user}"); di situs: ${u.statusOnSite}.`,
      fix: `Buat ${user} sesuai 00-prerequisites.xlsx (${u.usedFor}) dan catat loginnya di "Status on the site".`,
      who: 'Administrator situs',
    };
  }
  if (id === 'DEVIATION') {
    return {
      id,
      type: 'Deviasi (tidak menghentikan alur)',
      title: 'Langkah berjalan, tetapi berbeda dari teks atau rincian workbook',
      cause: [...deviations.entries()].map(([tc, a]) => `${tc.replace(' step ', ' langkah ')}: ${a.join(' / ')}`).join('\n'),
      fix: 'Putuskan per kasus: ubah situs, atau ubah Expected Result di workbook (tinjauan per deviasi ada di docs/qa/deviations.md).',
      who: 'Product owner',
    };
  }
  if (id === 'SITE-DEFECT') {
    return {
      id,
      type: 'Cacat situs (perilaku situs berbeda dari workbook)',
      title: 'Situs tidak melakukan yang disebut Expected Result',
      cause: [...defects.entries()].map(([tc, a]) => `${tc.replace(' step ', ' langkah ')}: ${a.join(' / ')}`).join('\n'),
      fix: 'Perbaiki perilaku situs, atau ubah Expected Result bila situs yang benar (setiap kasus ada di Actual Result langkah rantainya).',
      who: 'Development / Product owner',
    };
  }
  const s = STATES[id];
  return { id, type: 'Kondisi situs / desain test', ...s };
}

/** The spec file of each chain (tests/e2e/chains/). */
function chainSpecs(): Map<string, string> {
  const dir = 'tests/e2e/chains';
  const m = new Map<string, string>();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.spec.ts')) : []) {
    for (const id of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/chainTest\('(E2E-\d{3})'/g)) m.set(id[1], `${dir}/${f}`);
  }
  return m;
}

async function main(): Promise<void> {
  const runs = loadRuns();
  const evaluated = CHAINS.map((c) => ({ chain: c, steps: evaluate(c, runs.get(c.id)) }));
  const specOf = chainSpecs();

  const template = new ExcelJS.Workbook();
  await template.xlsx.readFile(TEMPLATE);
  const wb = new ExcelJS.Workbook();
  const summary = wb.addWorksheet('Summary');
  /** A sheet with the template's header row (values, style), widths and lists; the lists are applied by applyLists. */
  const fromTemplate = (name: string) => {
    const t = template.getWorksheet(name)!;
    const ws = wb.addWorksheet(name);
    ws.columns = t.columns.map((c) => ({ width: c.width }));
    const head = ws.getRow(1);
    t.getRow(1).eachCell((cell, col) => {
      head.getCell(col).value = cell.value;
      head.getCell(col).style = JSON.parse(JSON.stringify(cell.style));
    });
    head.height = t.getRow(1).height;
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    return { ws, lists: Object.entries((t as unknown as { dataValidations: { model: Record<string, ExcelJS.DataValidation> } }).dataValidations.model).filter(([k]) => /^[A-Z]+2$/.test(k)) };
  };
  // The status list in Indonesian, like the statuses written (scripts/qa/report-language.ts).
  const STATUS_LIST_EN = '"Not Run,Passed,Failed,Blocked"';
  const STATUS_LIST_ID = `"${['Not Run', 'Passed', 'Failed', 'Blocked'].map(statusId).join(',')}"`;
  const applyLists = (x: { ws: ExcelJS.Worksheet; lists: [string, ExcelJS.DataValidation][] }) => {
    for (const [k, rule] of x.lists) {
      const v = rule.formulae?.[0] === STATUS_LIST_EN ? { ...rule, formulae: [STATUS_LIST_ID] } : rule;
      for (let r = 2; r <= x.ws.rowCount; r++) x.ws.getCell(`${k.replace('2', '')}${r}`).dataValidation = v;
    }
    x.ws.eachRow((row, i) => i > 1 && (row.alignment = { wrapText: true, vertical: 'top' }));
  };
  const J = fromTemplate('Journeys');
  const S = fromTemplate('Steps');
  const journeys = J.ws;
  const steps = S.ws;
  const notesCol = addNotesColumn(steps);
  const workbookDir = path.posix.dirname(OUT);

  // ---------------------------------------------------------------- Steps
  const defects = new Map<string, string[]>();
  const deviations = new Map<string, string[]>();
  const usedBy = new Map<string, Set<string>>();
  for (const { chain, steps: cs } of evaluated) {
    for (const s of cs) {
      for (const c of s.causes) (usedBy.get(c) ?? usedBy.set(c, new Set()).get(c)!).add(`${chain.id} step ${s.n} (${s.tc})`);
      if (s.status === 'Failed') defects.set(`${chain.id} step ${s.n}`, [s.actual]);
      if (s.causes.includes('DEVIATION')) deviations.set(`${chain.id} step ${s.n}`, [s.actual]);
      const src = s.source;
      const rows = `rows ${src[0].row}-${src[src.length - 1].row}`;
      const feature = s.ref.testCase.feature;
      steps.addRow([
        `TC-${chain.id}`,
        chain.id,
        [...new Set(chain.steps.map((x) => appOf(x.tc)))].join(', '),
        `${appOf(s.tc)} / ${feature}`,
        textOf(chain).name,
        textOf(chain).role(s.n - 1),
        'Integrasi',
        PRIO_ID[chain.priority] ?? chain.priority,
        s.n === 1 ? textOf(chain).preconditions : `Langkah ${s.n - 1} ${chain.id} selesai (${chain.steps[s.n - 2].tc}).`,
        s.ref.testCase.testData ?? '',
        s.n,
        `${textOf(chain).role(s.n - 1)}: jalankan ${s.tc} "${titleId(s.ref.testCase.scenario)}"${chain.steps[s.n - 1].steps ? `, langkah ${chain.steps[s.n - 1].steps!.join(', ')}` : ''}.`,
        src[src.length - 1].expected,
        null,
        s.n === cs.length ? textOf(chain).outcome : null,
        `${fileOf(s.tc)} | Steps | ${rows} | ${s.tc}`,
        'Ya',
        VERIFICATION[s.status],
        statusId(s.status),
        s.actual,
        specOf.get(chain.id) ?? 'belum ada spec',
        evidenceCell(`E2E-${chain.id.slice(4)}`, workbookDir, 'reports/e2e-chains/results*.json (JSON Playwright dari run rantai, dengan trace dan tangkapan layar akhir)'),
        s.causes.join('; ') || null,
        'Sama seperti test case sumber.',
        s.note,
      ]);
    }
  }

  // ---------------------------------------------------------------- Journeys
  for (const { chain, steps: cs } of evaluated) {
    const breakAt = cs.find((s) => s.status !== 'Passed');
    const causes = [...new Set(cs.flatMap((s) => s.causes))];
    const status = !breakAt ? statusId('Passed') : breakAt.status === 'Not Run' ? 'Belum dijalankan' : `${statusId(breakAt.status)} di langkah ${breakAt.n}`;
    journeys.addRow([
      chain.id,
      'E2E',
      [...new Set(chain.steps.map((s) => appOf(s.tc)))].join(', '),
      'Rantai lintas aplikasi',
      textOf(chain).name,
      textOf(chain).objective,
      textOf(chain).roles,
      textOf(chain).preconditions,
      chain.start,
      cs.map((s) => `${s.n}. ${textOf(chain).role(s.n - 1)} (${s.tc})`).join('\n'),
      textOf(chain).outcome,
      breakAt
        ? `${breakAt.n === 1 ? 'Berhenti di langkah pertama' : `Berjalan sampai langkah ${breakAt.n - 1} dari ${cs.length}`}; langkah ${breakAt.n} (${breakAt.tc}) berstatus ${statusId(breakAt.status)}: ${breakAt.causes.filter((c) => !NON_STOPPING.has(c)).join('; ')}.`
        : `Rantai berjalan melewati ke-${cs.length} langkah${causes.length ? ` (dengan ${causes.join('; ')})` : ''}.`,
      'Setiap test case sumber punya jalur alternatifnya sendiri (lihat workbook-nya).',
      'Lihat test case negatif di setiap workbook sumber.',
      [...new Set(chain.steps.map((s) => fileOf(s.tc)))].join(', '),
      PRIO_ID[chain.priority] ?? chain.priority,
      'Ya',
      breakAt ? VERIFICATION[breakAt.status] : 'UI Verified',
      chain.steps.map((s) => s.tc).join(', '),
      specOf.get(chain.id) ?? 'belum ada spec',
      breakAt ? 'Needs Review' : 'Ready',
      `${textOf(chain).practice ? `Praktik: ${textOf(chain).practice} ` : ''}${status}. Langkah ${statusId('Passed')} ${cs.filter((s) => s.status === 'Passed').length}, ${statusId('Failed')} ${cs.filter((s) => s.status === 'Failed').length}, ${statusId('Blocked')} ${cs.filter((s) => s.status === 'Blocked').length}. Blocker: ${causes.filter((c) => !NON_STOPPING.has(c)).join('; ') || 'tidak ada'}. Catatan: ${causes.filter((c) => NON_STOPPING.has(c)).join('; ') || 'tidak ada'}.`,
      textOf(chain).data,
      'Sama seperti test case sumber.',
      null,
    ]);
  }

  applyLists(J);
  applyLists(S);

  // ---------------------------------------------------------------- Blockers
  const sheet = wb.addWorksheet('Blockers');
  sheet.columns = [
    { header: 'ID blocker', width: 16 },
    { header: 'Jenis', width: 34 },
    { header: 'Blocker', width: 44 },
    { header: 'Penyebab', width: 70 },
    { header: 'Perbaikan', width: 50 },
    { header: 'Siapa', width: 20 },
    { header: 'Rantai', width: 22 },
    { header: 'Menghentikan alur', width: 12 },
    { header: 'Langkah rantai', width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  const order = (id: string) => (id.startsWith('Blocker') ? Number(id.split(' ')[1]) : id.startsWith('User') ? 100 + Number(id.slice(6)) : NON_STOPPING.has(id) ? 300 : 200);
  for (const id of [...usedBy.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b))) {
    const d = defineBlocker(id, defects, deviations);
    const where = [...usedBy.get(id)!];
    sheet.addRow([d.id, d.type, d.title, d.cause, d.fix, d.who, [...new Set(where.map((w) => w.slice(0, 7)))].join(', '), NON_STOPPING.has(id) ? 'Tidak' : 'Ya', where.join('\n')]);
  }
  sheet.eachRow((r) => (r.alignment = { wrapText: true, vertical: 'top' }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ---------------------------------------------------------------- Summary
  const add = (...v: unknown[]) => summary.addRow(v);
  add('Rantai end-to-end lintas aplikasi: alur utama dan blocker-nya');
  summary.getRow(1).font = { bold: true, size: 14 };
  add('Tujuan', 'Alur utama end-to-end (lintas aplikasi), disusun hanya dari kasus uji yang sudah ada di 27 workbook modul. Setiap rantai adalah satu test otomatis yang meneruskan record satu langkah (pasien, order, invoice, dokumen) ke langkah berikutnya. Test berjalan di situs berbahasa Indonesia (/id).');
  add('Dibangun', `${new Date().toISOString().slice(0, 10)} oleh npm run qa:e2e-chains (scripts/qa/build-e2e-chains.ts) dari lib/qa-data/e2e-chains.ts dan run rantai reports/e2e-chains/results*.json (tests/e2e/chains/).`);
  add('Sheet', 'Journeys: satu baris per rantai. Steps: satu baris per langkah rantai, masing-masing merujuk test case sumbernya (file, baris). Blockers: setiap blocker yang ditemui rantai, dengan masalah dan perbaikannya. Kolom Expected Result dan Test Data menyalin workbook modul referensi (bahasa Inggris).');
  add('Status langkah', `${statusId('Passed')}: langkah rantai berjalan pada record langkah sebelumnya (deviasi dari teks dicatat tetapi tidak menghentikan alur). ${statusId('Failed')}: situs tidak melakukan yang dibutuhkan langkah. ${statusId('Blocked')}: rantai berhenti di langkah ini atau sebelumnya; Defect Reference menyebut penyebabnya (lihat sheet Blockers). ${statusId('Not Run')}: rantai belum dijalankan.`);
  add('ID blocker', '"Blocker N": blocker checklist 1-16 (00-blockers-checklist-linked.xlsx) dan blocker yang ditemukan saat otomasi (17 dan seterusnya, docs/qa/blocker.md). "User Ux": user dari 00-prerequisites.xlsx yang belum ada. DEVIATION, SITE-DEFECT, NEEDS-EVALUATION, NOT-RUN: lihat sheet Blockers.');
  add('Desain rantai', 'Rantai mengikuti alur umum sistem rumah sakit: alur rawat jalan, IGD, rawat inap, dan bedah; order sampai hasil; pemberian obat loop tertutup; darah dari donor sampai pasien; siklus pendapatan dan kontrol kas; pengadaan sampai pembayaran dengan pencocokan tiga arah; kontrol persediaan; kontrol komitmen anggaran; rekrut sampai gaji; pencatatan sampai pelaporan; aset, pemeliharaan, dan layanan penunjang. Kolom "Praktik sistem rumah sakit yang dicek" menyebut praktik setiap rantai.');
  add('Test', 'tests/e2e/chains/ (satu spec per rantai, fixtures/chain.ts). Rantai berjalan sampai langkah pertama yang dihentikan blocker; langkah sesudahnya Terblokir dengan penyebab itu.');
  add();
  const head = add('Rantai', 'Nama', 'Aplikasi', 'Langkah', statusId('Passed'), statusId('Failed'), statusId('Blocked'), statusId('Not Run'), 'Status', 'Berhenti pertama', 'Blocker yang menghentikan alur', 'Catatan yang tidak menghentikan', 'Praktik sistem rumah sakit yang dicek');
  head.font = { bold: true };
  for (const { chain, steps: cs } of evaluated) {
    const breakAt = cs.find((s) => s.status !== 'Passed');
    const n = (x: Status) => cs.filter((s) => s.status === x).length;
    add(
      chain.id,
      textOf(chain).name,
      [...new Set(chain.steps.map((x) => x.tc.slice(7, 9)))].join(', '),
      cs.length,
      n('Passed'),
      n('Failed'),
      n('Blocked'),
      n('Not Run'),
      !breakAt ? statusId('Passed') : breakAt.status === 'Not Run' ? statusId('Not Run') : `${statusId(breakAt.status)} di langkah ${breakAt.n}`,
      breakAt ? `Langkah ${breakAt.n} ${breakAt.tc} (${statusId(breakAt.status)}): ${breakAt.causes.filter((c) => !NON_STOPPING.has(c)).join('; ')}` : '—',
      [...new Set(cs.flatMap((s) => (s.status === 'Passed' ? [] : s.causes.filter((c) => !NON_STOPPING.has(c)))))].join('; ') || 'tidak ada',
      [...new Set(cs.flatMap((s) => s.causes.filter((c) => NON_STOPPING.has(c))))].join('; ') || 'tidak ada',
      textOf(chain).practice,
    );
  }
  summary.columns.forEach((c, i) => (c.width = [12, 52, 18, 7, 8, 8, 8, 8, 18, 44, 44, 30, 60][i] ?? 12));
  summary.eachRow((r) => (r.alignment = { wrapText: true, vertical: 'top' }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(OUT);
  for (const { chain, steps: cs } of evaluated) {
    console.log(`${chain.id} ${cs.map((s) => s.status[0]).join('')}  ${[...new Set(cs.flatMap((s) => s.causes))].join('; ')}`);
  }
  console.log(`${OUT}: ${CHAINS.length} chains, ${evaluated.reduce((a, e) => a + e.steps.length, 0)} steps, ${usedBy.size} blockers`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
