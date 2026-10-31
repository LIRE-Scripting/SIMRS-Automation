/**
 * Builds the summary of one full run of the suite:
 *   reports/summary/simrs-run-summary.xlsx  in Indonesian (scripts/qa/report-language.ts): sheets
 *                                           Ringkasan, Modul, Rantai E2E, Gagal & Deviasi, Blocker,
 *                                           HTTP 5xx, Kasus uji, Tangkapan layar
 *   reports/summary/run-summary.json        the same figures, for docs/qa/run-summary-*.md
 *
 * Inputs: the Playwright JSON of the run (reports/e2e/results*.json for the
 * modules, reports/e2e-chains/results*.json for the chains; a later report wins
 * for a test), the HTTP 5xx answers recorded by fixtures/e2e.ts (QA_SERVER_ERRORS),
 * the run before it for the comparison (PREVIOUS_RESULTS, a folder of results*.json),
 * and the reviewed failures of scripts/qa/run-triage.ts.
 *
 * Statuses of a test:
 *   Passed     every step met its Expected Result
 *   Deviation  the test ran to the end, but a step differs from the workbook's Expected Result (C2)
 *   Failed     the test stopped on an error
 *   Blocked    a blocker stopped steps (blocker annotation, or a fixme with a blocker reason)
 *   Not run    skipped for another reason (Automation Candidate No, needs a user, ...)
 *
 * Before writing, each test case's status is checked against the steps of its
 * result workbook (reports/e2e/<NN-module>.xlsx, npm run qa:e2e-workbook): a
 * workbook older than the newest results file, or a test case whose steps say
 * otherwise, stops the build. QA_SKIP_WORKBOOK_CHECK=1 writes anyway.
 *
 * Usage: npm run qa:run-summary
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { blockers, modules, testCaseRef } from '../../lib/qa-data';
import { CHAINS } from '../../lib/qa-data/e2e-chains';
import { FOUND_BLOCKERS } from '../../lib/qa-data/found-blockers';
import { planFor } from '../../lib/qa-data/plan';
import { BLOCKER_TITLE_ID } from './blocker-titles-id';
import { CHAIN_NAME_ID } from './chain-names-id';
import { sentenceId, statusFromId, statusId } from './report-language';
import { TRIAGE, type Triage } from './run-triage';

const OUT_DIR = 'reports/summary';
const THUMBS = '.qa-state/summary-thumbs';
const SERVER_ERRORS = process.env.QA_SERVER_ERRORS ?? '.qa-state/http-5xx.jsonl';
const PREVIOUS = process.env.PREVIOUS_RESULTS ?? '.qa-state/old-results/2026-10-18';

type Status = 'Passed' | 'Deviation' | 'Failed' | 'Blocked' | 'Not run';
const STATUSES: Status[] = ['Passed', 'Deviation', 'Failed', 'Blocked', 'Not run'];

/** The columns of sheet Modul (Lulus, Deviasi and Gagal side by side: the formulas sum them as a range). */
const MODULE_COLUMNS = [
  { header: 'Modul', key: 'module', width: 30 },
  { header: 'Kasus uji', key: 'total', width: 11 },
  ...STATUSES.map((x) => ({ header: statusId(x), key: x, width: 10 })),
  { header: 'Dari Belum dijalankan: belum ada test', key: 'noTest', width: 10 },
  { header: 'Dari Belum dijalankan: sudah ditulis, belum dijalankan', key: 'notRunYet', width: 12 },
  { header: 'Tingkat lulus (Lulus / kasus uji)', key: 'rate', width: 13 },
  { header: 'Cakupan (dijalankan / kasus uji)', key: 'coverage', width: 13 },
  { header: 'Blocker', key: 'blockers', width: 30 },
  { header: 'HTTP 5xx', key: 'http5xx', width: 9 },
];

interface PwStep { title: string; error?: { message?: string }; steps?: PwStep[] }
interface PwResult {
  status: string;
  duration: number;
  startTime: string;
  steps?: PwStep[];
  errors?: { message?: string }[];
  annotations?: { type: string; description?: string }[];
  attachments?: { name: string; contentType?: string; path?: string }[];
}
interface PwTest { annotations?: { type: string; description?: string }[]; results: PwResult[] }
interface PwSpec { title: string; tests: PwTest[] }
interface PwSuite { specs?: PwSpec[]; suites?: PwSuite[] }
interface PwReport { suites: PwSuite[]; stats: { startTime: string; duration: number } }

export interface ServerError {
  at: string;
  test: string;
  status: number;
  method: string;
  url: string;
  action?: string;
  request: string;
  digest?: string;
  response: string;
}

export interface TestOutcome {
  kind: 'module' | 'chain';
  id: string;
  group: string;
  title: string;
  status: Status;
  blockers: number[];
  reason: string;
  failedStep: string;
  error: string;
  cause: string;
  deviations: string[];
  notRun: string[];
  http5xx: string[];
  seconds: number;
  previous?: Status;
  triage?: Triage;
  /** The workbook test case has no test in the suite. */
  noTest?: boolean;
  /** A spec declares it, but no results file has it yet (written after the last run). */
  notRunYet?: boolean;
  /** The screenshot of the moment it failed, else the one at its end. */
  screenshot?: string;
}

/** A hint from the error text of a failed test; the reviewed cause is in scripts/qa/run-triage.ts. */
function probableCause(error: string): string {
  if (/React error #441|HTTP 500|server error|Failed to save/i.test(error)) return 'site defect (the server answered with an error)';
  if (/strict mode violation|resolved to 0 elements|element\(s\) not found|toBeVisible|toBeAttached|toHaveCount|toHaveText|toContainText/i.test(error)) return 'check: locator or screen content (automation or site)';
  if (/Timeout \d+ms exceeded|Test timeout/i.test(error)) return 'check: timeout (slow page or a missing wait)';
  if (/expect\(received\)|expect\(actual\)/i.test(error)) return 'check: the value on screen differs from the expected one';
  return 'check: see the error';
}

const clean = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '');
const firstLine = (s = '') => clean(s).split('\n').find((l) => l.trim())?.trim() ?? '';

function* specsOf(suites: PwSuite[]): Generator<PwSpec> {
  for (const s of suites) {
    yield* s.specs ?? [];
    yield* specsOf(s.suites ?? []);
  }
}

function readReports(dir: string): PwReport[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^results.*\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as PwReport);
}

/** Newest result per test id (TC-APP… or E2E-…), with the report's start time. */
function byId(reports: PwReport[]): Map<string, { spec: PwSpec; start: string }> {
  const out = new Map<string, { spec: PwSpec; start: string }>();
  for (const r of reports) {
    for (const spec of specsOf(r.suites)) {
      const id = spec.title.match(/^(TC-APP\d{3}-\d{3}|E2E-\d{3}) /)?.[1];
      if (id && !((out.get(id)?.start ?? '') > r.stats.startTime)) out.set(id, { spec, start: r.stats.startTime });
    }
  }
  return out;
}

function failedStepOf(steps: PwStep[] = []): string {
  for (const s of steps) {
    const inner = failedStepOf(s.steps);
    if (inner) return inner;
    if (s.error && /^(Chain step|Step) \d+/.test(s.title)) return s.title;
  }
  return '';
}

function outcome(kind: TestOutcome['kind'], id: string, spec: PwSpec, errors: ServerError[]): Omit<TestOutcome, 'group'> {
  const test = spec.tests[0];
  const result = test.results.at(-1);
  const seen = new Set<string>();
  const notes = [...(test.annotations ?? []), ...(result?.annotations ?? [])].filter((a) => {
    const key = `${a.type}\u0000${a.description ?? ''}`;
    return !seen.has(key) && !!seen.add(key);
  });
  const of = (...types: string[]) => notes.filter((a) => types.includes(a.type)).map((a) => a.description ?? '');
  const blockerNos = new Set<number>();
  for (const d of [...of('blocker', 'fixme', 'skip', 'chain-stop')]) {
    for (const m of d.matchAll(/[Bb]locker (\d+)/g)) blockerNos.add(Number(m[1]));
  }
  const title = spec.title.replace(/^(TC-APP\d{3}-\d{3}|E2E-\d{3}) /, '').replace(/ \[[^\]]+\]$/, '');
  const base = {
    kind,
    id,
    title,
    blockers: [...blockerNos].sort((a, b) => a - b),
    deviations: of('deviation'),
    notRun: of('not-run'),
    http5xx: errors.filter((e) => e.test.startsWith(`${id} `) && e.at >= (result?.startTime ?? '')).map((e) => `${e.status} ${e.method} ${new URL(e.url).pathname}${e.digest ? ` (digest ${e.digest})` : ''}`),
    seconds: Math.round((result?.duration ?? 0) / 1000),
    screenshot: ['screenshot', 'final screenshot'].map((n) => result?.attachments?.find((a) => a.name === n && a.path && fs.existsSync(a.path))?.path).find(Boolean),
    failedStep: '',
    error: '',
    cause: '',
    reason: '',
  };
  const status = result?.status ?? 'skipped';
  if (status === 'skipped') {
    const reasons = of('fixme', 'skip');
    return { ...base, status: reasons.some((r) => /^Blocker \d+/.test(r)) ? 'Blocked' : 'Not run', reason: reasons.join('; ') || 'skipped' };
  }
  if (status !== 'passed') {
    const error = firstLine(result?.errors?.[0]?.message) || status;
    return { ...base, status: 'Failed', error, cause: probableCause(error), failedStep: failedStepOf(result?.steps).slice(0, 300) };
  }
  const stops = of('blocker', 'chain-stop');
  if (stops.length) return { ...base, status: 'Blocked', reason: stops.join('; ') };
  if (base.deviations.length) return { ...base, status: 'Deviation', reason: base.deviations.join('; ') };
  return { ...base, status: 'Passed', reason: base.notRun.length ? `Passed; not run: ${base.notRun.join('; ')}` : '' };
}

/**
 * The HTTP 5xx answers of every run (each .qa-state/**\/http-5xx.jsonl, and
 * QA_SERVER_ERRORS): an answer counts for a test when it came during the
 * test's newest result (see outcome), so older runs do not inflate a figure.
 */
function serverErrors(): ServerError[] {
  const files = new Set<string>(fs.existsSync(SERVER_ERRORS) ? [SERVER_ERRORS] : []);
  for (const f of fs.readdirSync('.qa-state', { recursive: true }) as string[]) if (f.endsWith('http-5xx.jsonl')) files.add(path.join('.qa-state', f));
  const seen = new Set<string>();
  return [...files].flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)).filter((l) => !seen.has(l) && !!seen.add(l)).map((l) => JSON.parse(l) as ServerError);
}

const blockerTitle = (no: number): { title: string; source: string; fix: string; who: string; category: string } => {
  const c = blockers().blockers.find((b) => b.no === no);
  if (c) return { title: BLOCKER_TITLE_ID[no] ?? c.blocker, source: `00-blockers-checklist-linked.xlsx row ${c.row}`, fix: c.fix, who: c.who, category: c.category };
  const f = FOUND_BLOCKERS.find((b) => b.no === no);
  if (f) return { title: BLOCKER_TITLE_ID[no] ?? f.blocker, source: 'docs/qa/blockers-found.md', fix: f.fix, who: f.who, category: f.category };
  return { title: '(unknown)', source: '', fix: '', who: '', category: '' };
};

/** The test case ids a spec under tests/modules declares with qaTest(). */
function declaredTests(dir = 'tests/modules'): Set<string> {
  const ids = new Set<string>();
  for (const f of fs.readdirSync(dir, { recursive: true }) as string[]) {
    if (!f.endsWith('.spec.ts')) continue;
    for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/qaTest\(\s*['"`](TC-APP\d{3}-\d{3})/g)) ids.add(m[1]);
  }
  return ids;
}

function count(rows: TestOutcome[]): Record<Status, number> {
  const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const r of rows) c[r.status] += 1;
  return c;
}

function main(): void {
  const errors = serverErrors();
  const dirs = (process.env.RESULTS_DIRS ?? 'reports/e2e,reports/e2e-chains').split(',');
  const now = byId(dirs.flatMap(readReports));
  const before = byId(readReports(PREVIOUS));
  const runStart = [...now.values()].map((v) => v.start).sort()[0] ?? '';
  const outcomes: TestOutcome[] = [];
  const declared = declaredTests();

  for (const m of modules()) {
    for (const tc of m.testCases) {
      const r = now.get(tc.id);
      const prev = before.get(tc.id);
      if (!r) {
        // No result: either no spec declares it yet, or a spec declares it but was written after the last run.
        const written = declared.has(tc.id);
        outcomes.push({
          kind: 'module', id: tc.id, group: `${m.slug.slice(0, 2)} ${m.appName}`, title: tc.scenario, status: 'Not run', blockers: [],
          reason: written
            ? 'Test written, not run yet: a spec in tests/modules declares it, but no results file of this run has it'
            : `No test: the plan makes it "automate" (${planFor(testCaseRef(tc.id)).user ?? 'signed out'}) but no spec in tests/modules declares it yet`,
          failedStep: '', error: '', cause: '', deviations: [], notRun: [], http5xx: [], seconds: 0, noTest: !written, notRunYet: written,
          previous: prev ? outcome('module', tc.id, prev.spec, []).status : undefined, triage: TRIAGE[tc.id],
        });
        continue;
      }
      const o = outcome('module', tc.id, r.spec, errors);
      // Passed with every step of the workbook "not run": nothing of it was checked (the result workbook shows all Not Run).
      const notRunSteps = new Set(o.notRun.map((d) => Number(d.match(/^Step (\d+):/)?.[1])));
      if (o.status === 'Passed' && tc.steps.every((st) => notRunSteps.has(st.step))) Object.assign(o, { status: 'Not run', reason: `Every step not run: ${o.notRun.join('; ')}` });
      outcomes.push({
        ...o,
        group: `${m.slug.slice(0, 2)} ${m.appName}`,
        previous: prev ? outcome('module', tc.id, prev.spec, []).status : undefined,
        triage: TRIAGE[tc.id],
      });
    }
  }
  for (const c of CHAINS) {
    const r = now.get(c.id);
    if (!r) continue;
    const prev = before.get(c.id);
    outcomes.push({
      ...outcome('chain', c.id, r.spec, errors),
      group: 'E2E chains',
      previous: prev ? outcome('chain', c.id, prev.spec, []).status : undefined,
      triage: TRIAGE[c.id],
    });
  }

  const mods = outcomes.filter((o) => o.kind === 'module');
  const chains = outcomes.filter((o) => o.kind === 'chain');
  const groups = [...new Set(mods.map((o) => o.group))];
  const perModule = groups.map((g) => {
    const rows = mods.filter((o) => o.group === g);
    const c = count(rows);
    const blockerNos = [...new Set(rows.flatMap((o) => (o.status === 'Blocked' ? o.blockers : [])))].sort((a, b) => a - b);
    return { module: g, total: rows.length, ...c, noTest: rows.filter((o) => o.noTest).length, notRunYet: rows.filter((o) => o.notRunYet).length, ran: rows.length - c['Not run'] - rows.filter((o) => o.status === 'Blocked' && !o.seconds).length, blockers: blockerNos, http5xx: rows.reduce((a, o) => a + o.http5xx.length, 0) };
  });

  const blockerNos = [...new Set(outcomes.flatMap((o) => o.blockers))].sort((a, b) => a - b);
  const perBlocker = blockerNos.map((no) => {
    const hit = outcomes.filter((o) => o.blockers.includes(no) && o.status === 'Blocked');
    const t = blockerTitle(no);
    return {
      no,
      ...t,
      testCases: hit.filter((o) => o.kind === 'module').length,
      chains: hit.filter((o) => o.kind === 'chain').map((o) => o.id),
      modules: [...new Set(hit.filter((o) => o.kind === 'module').map((o) => o.group))],
      seenHttp5xx: hit.some((o) => o.http5xx.length > 0),
    };
  }).filter((b) => b.testCases || b.chains.length);

  // Each 5xx with the kind of input that caused it: the test type of its test case and the blockers its test met.
  const byOutcome = new Map(outcomes.map((o) => [o.id, o]));
  const classified = errors.map((e) => {
    const id = e.test.match(/^(TC-APP\d{3}-\d{3}|E2E-\d{3}) /)?.[1] ?? '';
    const o = byOutcome.get(id);
    const testType = id.startsWith('TC-') ? testCaseRef(id).testCase.testType : 'Chain';
    const counted = !!o && o.http5xx.length > 0 && e.at >= (now.get(id)?.start ?? '');
    const kind = o?.blockers.length
      ? `Known: blocker ${o.blockers.join(', ')}`
      : /Negative|Boundary/.test(testType)
        ? 'Negative/boundary test (input wrong on purpose or at a limit; check the request): a refusal should be a message, not HTTP 500'
        : 'Positive test (input meant to be valid): server error, not a known blocker';
    return { ...e, id, testType, kind, testStatus: o?.status ?? '', counted: counted ? '' : 'earlier run of the test (rerun later)' };
  }).filter((e) => !e.counted);

  const summary = {
    run: { start: runStart, built: new Date().toISOString(), site: 'https://rs.showcase.atklik.xyz', branch: 'Podomoro', serverErrors: SERVER_ERRORS, previous: PREVIOUS },
    totals: { modules: count(mods), chains: count(chains), testCases: mods.length, noTest: mods.filter((o) => o.noTest).length, notRunYet: mods.filter((o) => o.notRunYet).length, chainCount: chains.length, http5xx: classified.length },
    perModule,
    perBlocker,
    outcomes,
    errors: classified,
  };
  void checkResultWorkbooks(mods, dirs).then(async (problems) => {
    if (problems.length) {
      console.error(`The summary and the result workbooks disagree (${problems.length}):\n  ${problems.slice(0, 40).join('\n  ')}`);
      if (process.env.QA_SKIP_WORKBOOK_CHECK !== '1') {
        console.error('Nothing written. Run npm run qa:e2e-workbook first, or set QA_SKIP_WORKBOOK_CHECK=1 to write anyway.');
        process.exitCode = 1;
        return;
      }
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'run-summary.json'), JSON.stringify(summary, null, 2));
    await writeWorkbook(summary);
    console.log(`${OUT_DIR}/simrs-run-summary.xlsx: ${mods.length} test cases, ${chains.length} chains, ${classified.length} HTTP 5xx`);
  });
}

/**
 * Checks the module outcomes against the result workbooks of reports/e2e:
 * each workbook is newer than the newest results file, and the step statuses
 * of each test case agree with its status here (a Deviation is a step "Failed"
 * with "Expected Result not met"; a Failed test has a step "E2E failed").
 */
async function checkResultWorkbooks(mods: TestOutcome[], dirs: string[]): Promise<string[]> {
  const dir = 'reports/e2e';
  if (!dirs.includes(dir)) return [];
  const newest = Math.max(...fs.readdirSync(dir).filter((f) => /^results.*\.json$/.test(f)).map((f) => fs.statSync(path.join(dir, f)).mtimeMs));
  const byId = new Map(mods.map((o) => [o.id, o]));
  const problems: string[] = [];
  for (const m of modules()) {
    const file = path.join(dir, m.source);
    if (!fs.existsSync(file)) {
      problems.push(`${file}: missing`);
      continue;
    }
    if (fs.statSync(file).mtimeMs < newest) {
      problems.push(`${file}: older than the newest results file`);
      continue;
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.getWorksheet('Steps')!;
    const header = (ws.getRow(1).values as unknown[]).map(String);
    const [idCol, statusCol, actualCol] = ['Test Case ID', 'Execution Status', 'Actual Result'].map((h) => header.indexOf(h));
    const steps = new Map<string, { status: string; actual: string }[]>();
    ws.eachRow((row, i) => {
      const id = row.getCell(idCol).text;
      if (i > 1 && id) steps.set(id, [...(steps.get(id) ?? []), { status: statusFromId(row.getCell(statusCol).text), actual: row.getCell(actualCol).text }]);
    });
    for (const [id, st] of steps) {
      const has = (x: string) => st.some((s) => s.status === x);
      const status = byId.get(id)?.status;
      const agrees = {
        Passed: has('Passed') && !has('Failed') && !has('Blocked'),
        Deviation: has('Failed') && !st.some((s) => /E2E (failed|gagal)/.test(s.actual)),
        Failed: st.some((s) => /E2E (failed|gagal)/.test(s.actual)),
        Blocked: has('Blocked'),
        'Not run': st.every((s) => s.status === 'Not Run' || !s.status),
      }[status ?? 'Not run'];
      if (!agrees) problems.push(`${id}: ${status ?? 'not in the summary'} here, steps ${[...new Set(st.map((s) => s.status || '(empty)'))].join('/')} in ${m.source}`);
    }
  }
  return problems;
}

type Summary = {
  run: Record<string, string>;
  totals: { modules: Record<Status, number>; chains: Record<Status, number>; testCases: number; chainCount: number; http5xx: number };
  perModule: { module: string; total: number; ran: number; blockers: number[]; http5xx: number }[] & Record<Status, number>[];
  perBlocker: { no: number; title: string; source: string; fix: string; who: string; category: string; testCases: number; chains: string[]; modules: string[]; seenHttp5xx: boolean }[];
  outcomes: TestOutcome[];
  errors: (ServerError & { id: string; testType: string; kind: string; testStatus: string; counted: string })[];
};

const FILL_EN: Record<string, string> = { Passed: 'FFD9EAD3', Deviation: 'FFFFF2CC', Failed: 'FFF4CCCC', Blocked: 'FFFCE5CD', 'Not run': 'FFEFEFEF' };
/** The fill of a status cell, by its Indonesian (or English) status. */
const FILL: Record<string, string> = { ...FILL_EN, ...Object.fromEntries(Object.entries(FILL_EN).map(([k, v]) => [statusId(k), v])) };

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[], statusKey?: string): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns;
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  ws.eachRow((row, i) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (i > 1 && statusKey) {
      const cell = row.getCell(statusKey);
      const fill = FILL[String(cell.value)];
      if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    }
  });
  return ws;
}

/** A JPEG of a screenshot at most 640 x 540 (ImageMagick), so a few hundred fit in the workbook; made once per screenshot. */
function thumbnail(png: string): { file: string; width: number; height: number } {
  const file = path.join(THUMBS, `${createHash('sha1').update(png).digest('hex').slice(0, 16)}.jpg`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(THUMBS, { recursive: true });
    execFileSync('magick', [png, '-resize', '640x540>', '-quality', '70', file]);
  }
  const [width, height] = execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().split(' ').map(Number);
  return { file, width, height };
}

/** Sheet names of the workbook (Indonesian). */
const SHEET = {
  overview: 'Ringkasan',
  modules: 'Modul',
  chains: 'Rantai E2E',
  failures: 'Gagal & Deviasi',
  blockers: 'Blocker',
  http5xx: 'HTTP 5xx',
  testCases: 'Kasus uji',
  screenshots: 'Tangkapan layar',
};

/** Sheet Tangkapan layar: one row per failed test, test with a deviation and chain not passed (row i + 2), with its screenshot. */
function screenshots(wb: ExcelJS.Workbook, rows: TestOutcome[]): void {
  const ws = sheet(wb, SHEET.screenshots, [
    { header: 'Id', key: 'id', width: 15 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Kasus uji / rantai', key: 'title', width: 36 },
    { header: 'Penyebab / alasan', key: 'cause', width: 50 },
    { header: 'Tangkapan layar (saat gagal, selain itu di akhir test)', key: 'shot', width: 92 },
  ], rows.map((o) => ({
    id: o.id,
    status: statusId(o.status),
    title: o.title,
    cause: [o.triage ? `${o.triage.cause}: ${o.triage.finding}` : o.error || sentenceId(o.reason).slice(0, 600), o.triage?.next ? `Berikutnya: ${o.triage.next}` : ''].filter(Boolean).join('\n\n'),
    shot: o.screenshot ? '' : sentenceId('no screenshot'),
  })), 'status');
  rows.forEach((o, i) => {
    const row = i + 2;
    if (!o.screenshot) return;
    const t = thumbnail(o.screenshot);
    ws.getRow(row).height = Math.max(60, t.height * 0.75 + 6);
    ws.addImage(wb.addImage({ filename: t.file, extension: 'jpeg' }), { tl: { col: 4, row: row - 1 }, ext: { width: t.width, height: t.height }, editAs: 'oneCell' });
  });
}

/** The evidence picture of a chain: a screenshot it saved itself (reports/screenshots/E2E-001-receipt.png), else its last screenshot. */
function chainPicture(o: TestOutcome): string | undefined {
  const dir = 'reports/screenshots';
  const own = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith(`${o.id}-`) && f.endsWith('.png')).sort() : [];
  return own.length ? path.join(dir, own[0]) : o.screenshot;
}

/** One line on how far a chain got: every step, the step and blocker it stopped at, its deviations, or its error. */
function chainLine(o: TestOutcome): string {
  if (o.status === 'Passed') return 'Semua langkah lulus';
  if (o.status === 'Failed') return `Gagal${o.failedStep ? ` di ${o.failedStep.replace(/^Chain step (\d+).*$/, 'langkah $1')}` : ''}: ${o.error.slice(0, 160)}`;
  const stop = o.reason.match(/Step (\d+): (?:Blocker (\d+)|User (U\d+)|([A-Z-]+))(?::\s*([^;]*))?/);
  if (o.status === 'Blocked' && stop) {
    const detail = (stop[5] ?? '').replace(/^TC-APP\d{3}-\d{3} step \d+( is not run)?:?\s*/, '').slice(0, 140);
    const why = stop[2]
      ? `blocker ${stop[2]} – ${blockerTitle(Number(stop[2])).title}`
      : stop[3]
        ? `butuh user ${stop[3]} yang belum disiapkan`
        : stop[4] === 'NEEDS-EVALUATION'
          ? 'langkah ini di referensi bertanda "Needs Evaluation" (belum diputuskan untuk otomasi)'
          : stop[4] === 'NOT-AUTOMATED'
            ? 'langkah ini di referensi bertanda "Automation Candidate = No" (diuji manual)'
            : `langkah tidak dijalankan${detail ? `: ${sentenceId(detail)}` : ''}`;
    const dev = o.deviations.length ? `; ${o.deviations.length} deviasi sebelumnya` : '';
    const n = Number(stop[1]);
    const ran = n > 2 ? `Langkah 1–${n - 1} berjalan, berhenti` : n === 2 ? 'Langkah 1 berjalan, berhenti' : 'Berhenti';
    return `${ran} di langkah ${n}: ${why}${dev}`;
  }
  if (o.status === 'Deviation') return `Semua langkah berjalan; ${o.deviations.length} deviasi, mis. ${sentenceId(o.deviations[0] ?? '').slice(0, 160)}`;
  return sentenceId(o.reason).slice(0, 200);
}

/**
 * Sheet Ringkasan: the main figures (formulas over sheet Modul), every chain
 * with its screenshot, one line per module and the blockers that stop the
 * most test cases. The other sheets hold the details.
 */
function overview(wb: ExcelJS.Workbook, s: Summary): void {
  const ws = wb.addWorksheet(SHEET.overview, { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 30 }, { width: 58 }, { width: 14 }, { width: 62 }, { width: 50 }];
  const bold = (row: ExcelJS.Row, size = 11) => (row.font = { bold: true, size });
  const header = (row: ExcelJS.Row) => {
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
    });
  };
  const fillStatus = (cell: ExcelJS.Cell) => {
    const f = FILL[String(cell.value)];
    if (f) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f } };
  };
  const wib = new Date(Date.now() + 7 * 3600_000).toISOString().replace('T', ' ').slice(0, 16);

  bold(ws.addRow(['Ringkasan pengujian SIMRS (KlikMed HMIS)']), 16);
  ws.addRow(['Diperbarui', `${wib} WIB (otomatis setelah setiap run)`]);
  ws.addRow(['Situs', `${s.run.site}/id (bahasa Indonesia), cabang ${s.run.branch}`]);
  ws.addRow(['Hasil yang dipakai', 'hasil terbaru setiap kasus uji dan rantai dari semua run']);
  ws.addRow([]);

  bold(ws.addRow(['Angka utama']), 13);
  header(ws.addRow(['Status', 'Kasus uji modul', 'Rantai E2E']));
  for (const x of STATUSES) {
    const row = ws.addRow([statusId(x), s.totals.modules[x], s.totals.chains[x]]);
    fillStatus(row.getCell(1));
  }
  bold(ws.addRow(['Total', s.totals.testCases, s.totals.chainCount]));
  const letter = (key: string) => String.fromCharCode(65 + MODULE_COLUMNS.findIndex((c) => c.key === key));
  const sum = (key: string) => `SUM(${SHEET.modules}!${letter(key)}:${letter(key)})`;
  const m = s.totals.modules;
  ws.addRow(['Tingkat lulus (lulus / semua kasus uji)', { formula: `${sum('Passed')}/${sum('total')}`, result: m.Passed / s.totals.testCases }]).getCell(2).numFmt = '0%';
  ws.addRow(['Cakupan (dijalankan / semua kasus uji)', { formula: `(${sum('Passed')}+${sum('Deviation')}+${sum('Failed')})/${sum('total')}`, result: (m.Passed + m.Deviation + m.Failed) / s.totals.testCases }]).getCell(2).numFmt = '0%';
  ws.addRow(['Jawaban HTTP 5xx dari situs', s.totals.http5xx]);
  for (let r = 8; r <= ws.rowCount; r++) ws.getRow(r).getCell(2).alignment = { horizontal: 'left' };
  ws.addRow([]);

  bold(ws.addRow(['Skenario end-to-end (rantai)']), 13);
  const outpatient = s.outcomes.find((o) => o.kind === 'chain' && o.id === 'E2E-001');
  if (outpatient) {
    const row = ws.addRow(['Pasien sampai invoice (E2E-001)', `${chainLine(outpatient)}. Langkah 1–9: daftar, janji temu, kedatangan, konsultasi, resep, obat diserahkan, invoice RX di kasir, dibayar, struk dicetak (gambar struk di baris E2E-001).`]);
    row.font = { bold: true };
    row.alignment = { vertical: 'top', wrapText: true };
  }
  header(ws.addRow(['Rantai', 'Skenario', 'Status', 'Sampai mana', 'Tangkapan layar']));
  const chains = s.outcomes.filter((o) => o.kind === 'chain').sort((x, y) => x.id.localeCompare(y.id));
  for (const o of chains) {
    const row = ws.addRow([o.id, CHAIN_NAME_ID[o.id] ?? o.title, statusId(o.status), chainLine(o), '']);
    row.alignment = { vertical: 'top', wrapText: true };
    fillStatus(row.getCell(3));
    const pic = chainPicture(o);
    if (!pic) {
      row.getCell(5).value = 'tidak ada';
      continue;
    }
    const t = thumbnail(pic);
    const width = Math.min(340, t.width);
    const height = Math.round((t.height * width) / t.width);
    row.height = Math.max(40, height * 0.75 + 6);
    ws.addImage(wb.addImage({ filename: t.file, extension: 'jpeg' }), { tl: { col: 4, row: row.number - 1 }, ext: { width, height }, editAs: 'oneCell' });
  }
  ws.addRow([]);

  bold(ws.addRow(['Per modul']), 13);
  header(ws.addRow(['Modul', 'Hasil kasus uji', 'Tingkat lulus', 'Blocker yang menghentikan langkah']));
  for (const pm of s.perModule as unknown as (Record<Status, number> & { module: string; total: number; blockers: number[] })[]) {
    const parts = STATUSES.filter((x) => pm[x]).map((x) => `${pm[x]} ${statusId(x).toLowerCase()}`);
    const row = ws.addRow([pm.module, `${parts.join(' · ')} (dari ${pm.total})`, pm.total ? pm.Passed / pm.total : 0, pm.blockers.join(', ')]);
    row.getCell(3).numFmt = '0%';
    row.alignment = { vertical: 'top', wrapText: true };
  }
  ws.addRow([]);

  bold(ws.addRow(['Blocker yang paling banyak menghentikan pengujian']), 13);
  header(ws.addRow(['Blocker', 'Masalah', 'Kasus uji terblokir', 'Perbaikan', 'Rantai yang berhenti']));
  for (const b of [...s.perBlocker].sort((x, y) => y.testCases + y.chains.length - (x.testCases + x.chains.length)).slice(0, 10)) {
    ws.addRow([`Blocker ${b.no}`, b.title, b.testCases, b.fix, b.chains.join(', ')]).alignment = { vertical: 'top', wrapText: true };
  }
  ws.addRow([]);
  bold(ws.addRow(['Arti status']), 13);
  for (const [x, text] of [
    ['Passed', 'setiap langkah memenuhi hasil yang diharapkan'],
    ['Deviation', 'berjalan sampai akhir, ada langkah yang hasilnya berbeda dari referensi (dicatat)'],
    ['Failed', `berhenti karena error; rinciannya di sheet ${SHEET.failures}`],
    ['Blocked', `berhenti karena masalah situs yang sudah diketahui; rinciannya di sheet ${SHEET.blockers}`],
    ['Not run', 'tidak dijalankan (butuh user/role yang belum siap, atau tidak diotomasi)'],
  ] as [Status, string][]) {
    fillStatus(ws.addRow([statusId(x), text]).getCell(1));
  }
}

async function writeWorkbook(s: Summary): Promise<void> {
  const wb = new ExcelJS.Workbook();
  overview(wb, s);

  const modules = sheet(wb, SHEET.modules, MODULE_COLUMNS, (s.perModule as unknown as Record<string, unknown>[]).map((m) => {
    const all = Number(m.total);
    const ran = Number(m.Passed) + Number(m.Deviation) + Number(m.Failed);
    return { ...m, rate: all ? Number(m.Passed) / all : '-', coverage: all ? ran / all : '-', blockers: (m.blockers as number[]).join(', ') };
  }));
  // As formulas over every test case of the module, written or not:
  // Pass rate = Passed / Test cases; Coverage = (Passed + Deviation + Failed) / Test cases.
  const col = (key: string) => modules.getColumn(key).letter;
  const [total, passedCol, failedCol] = [col('total'), col('Passed'), col('Failed')];
  for (const key of ['rate', 'coverage']) modules.getColumn(key).numFmt = '0%';
  modules.eachRow((row, i) => {
    if (i === 1) return;
    const formula = (top: string) => ({ formula: `IF(${total}${i}=0,"-",${top}/${total}${i})` });
    row.getCell('rate').value = { ...formula(`${passedCol}${i}`), result: row.getCell('rate').value as number | string };
    row.getCell('coverage').value = { ...formula(`SUM(${passedCol}${i}:${failedCol}${i})`), result: row.getCell('coverage').value as number | string };
  });

  const outcomeRow = (o: TestOutcome) => ({
    id: o.id,
    group: o.group,
    title: o.title,
    status: statusId(o.status),
    previous: o.previous ? statusId(o.previous) : '',
    blockers: o.blockers.join(', '),
    reason: sentenceId(o.reason).slice(0, 2000),
    failedStep: o.failedStep,
    error: o.error.slice(0, 1000),
    cause: o.triage ? `${o.triage.cause}: ${o.triage.finding}` : sentenceId(o.cause),
    next: o.triage?.next ?? '',
    owner: o.triage?.owner ?? '',
    http5xx: o.http5xx.join('\n'),
    seconds: o.seconds,
  });
  const cols = [
    { header: 'Id', key: 'id', width: 15 },
    { header: 'Modul', key: 'group', width: 24 },
    { header: 'Kasus uji / rantai', key: 'title', width: 44 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Status run sebelumnya', key: 'previous', width: 11 },
    { header: 'Blocker', key: 'blockers', width: 10 },
  ];
  const shotRows = s.outcomes.filter((o) => (o.kind === 'chain' && o.status !== 'Passed') || (o.kind === 'module' && (o.status === 'Failed' || o.status === 'Deviation')));
  const shotAt = new Map(shotRows.map((o, i) => [o.id, i + 2]));
  const link = (o: TestOutcome) => (shotAt.has(o.id) ? { text: o.screenshot ? 'tangkapan layar' : 'tidak ada', hyperlink: `#'${SHEET.screenshots}'!E${shotAt.get(o.id)}` } : '');
  sheet(wb, SHEET.chains, [...cols, { header: 'Tangkapan layar', key: 'shot', width: 12 }, { header: 'Alasan (berhenti / deviasi)', key: 'reason', width: 70 }, { header: 'Langkah gagal', key: 'failedStep', width: 40 }, { header: 'Pesan error', key: 'error', width: 50 }, { header: 'Penyebab', key: 'cause', width: 50 }, { header: 'Tindak lanjut', key: 'next', width: 50 }, { header: 'HTTP 5xx', key: 'http5xx', width: 40 }], s.outcomes.filter((o) => o.kind === 'chain').map((o) => ({ ...outcomeRow(o), shot: link(o) })), 'status');
  sheet(wb, SHEET.failures, [...cols, { header: 'Tangkapan layar', key: 'shot', width: 12 }, { header: 'Langkah gagal', key: 'failedStep', width: 50 }, { header: 'Pesan error', key: 'error', width: 60 }, { header: 'Penyebab', key: 'cause', width: 60 }, { header: 'Tindak lanjut', key: 'next', width: 60 }, { header: 'Penanggung jawab', key: 'owner', width: 16 }, { header: 'HTTP 5xx', key: 'http5xx', width: 40 }], s.outcomes.filter((o) => o.status === 'Failed' || o.status === 'Deviation').map((o) => ({ ...outcomeRow(o), shot: link(o), error: o.error || o.reason })), 'status');
  sheet(wb, SHEET.blockers, [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Blocker', key: 'title', width: 60 },
    { header: 'Kategori', key: 'category', width: 14 },
    { header: 'Didefinisikan di', key: 'source', width: 26 },
    { header: 'Kasus uji terblokir', key: 'testCases', width: 10 },
    { header: 'Rantai berhenti', key: 'chains', width: 22 },
    { header: 'Modul', key: 'modules', width: 40 },
    { header: 'HTTP 5xx terlihat di run ini', key: 'seen', width: 10 },
    { header: 'Perbaikan (tindak lanjut)', key: 'fix', width: 70 },
    { header: 'Siapa', key: 'who', width: 24 },
  ], s.perBlocker.map((b) => ({ ...b, chains: b.chains.join(', '), modules: b.modules.join('\n'), seen: b.seenHttp5xx ? 'Ya' : '' })));
  sheet(wb, SHEET.http5xx, [
    { header: 'Waktu', key: 'at', width: 22 },
    { header: 'Test', key: 'test', width: 50 },
    { header: 'Jenis test', key: 'testType', width: 10 },
    { header: 'Status test', key: 'testStatus', width: 10 },
    { header: 'Jenis', key: 'kind', width: 50 },
    { header: 'Catatan', key: 'counted', width: 20 },
    { header: 'Status', key: 'status', width: 7 },
    { header: 'Metode', key: 'method', width: 7 },
    { header: 'Path', key: 'path', width: 40 },
    { header: 'Digest', key: 'digest', width: 14 },
    { header: 'Isi request', key: 'request', width: 70 },
    { header: 'Respons', key: 'response', width: 50 },
  ], s.errors.map((e) => ({ ...e, test: e.test.replace(/ \[[^\]]+\].*$/, ''), path: new URL(e.url).pathname, testStatus: e.testStatus ? statusId(e.testStatus) : '', kind: sentenceId(e.kind), counted: sentenceId(e.counted) })));
  sheet(wb, SHEET.testCases, [...cols, { header: 'Alasan', key: 'reason', width: 70 }, { header: 'Pesan error', key: 'error', width: 50 }, { header: 'Detik', key: 'seconds', width: 9 }], s.outcomes.filter((o) => o.kind === 'module').map(outcomeRow), 'status');
  screenshots(wb, shotRows);
  await wb.xlsx.writeFile(path.join(OUT_DIR, 'simrs-run-summary.xlsx'));
}

main();
