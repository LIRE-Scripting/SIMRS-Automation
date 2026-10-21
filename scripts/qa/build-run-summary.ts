/**
 * Builds the summary of one full run of the suite:
 *   reports/summary/simrs-run-summary.xlsx  sheets Overview, Modules, E2E chains,
 *                                           Failures, Blockers, HTTP 5xx, Test cases
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
import { TRIAGE, type Triage } from './run-triage';

const OUT_DIR = 'reports/summary';
const THUMBS = '.qa-state/summary-thumbs';
const SERVER_ERRORS = process.env.QA_SERVER_ERRORS ?? '.qa-state/run-2026-10-21/http-5xx.jsonl';
const PREVIOUS = process.env.PREVIOUS_RESULTS ?? '.qa-state/old-results/2026-10-18';

type Status = 'Passed' | 'Deviation' | 'Failed' | 'Blocked' | 'Not run';
const STATUSES: Status[] = ['Passed', 'Deviation', 'Failed', 'Blocked', 'Not run'];

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

function serverErrors(): ServerError[] {
  if (!fs.existsSync(SERVER_ERRORS)) return [];
  return fs.readFileSync(SERVER_ERRORS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as ServerError);
}

const blockerTitle = (no: number): { title: string; source: string; fix: string; who: string; category: string } => {
  const c = blockers().blockers.find((b) => b.no === no);
  if (c) return { title: c.blocker, source: `00-blockers-checklist-linked.xlsx row ${c.row}`, fix: c.fix, who: c.who, category: c.category };
  const f = FOUND_BLOCKERS.find((b) => b.no === no);
  if (f) return { title: f.blocker, source: 'docs/qa/blockers-found.md', fix: f.fix, who: f.who, category: f.category };
  return { title: '(unknown)', source: '', fix: '', who: '', category: '' };
};

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

  for (const m of modules()) {
    for (const tc of m.testCases) {
      const r = now.get(tc.id);
      const prev = before.get(tc.id);
      if (!r) {
        // No test declared: the plan made it runnable (e.g. a user of 00-prerequisites.xlsx became ready) but no spec runs it yet.
        outcomes.push({
          kind: 'module', id: tc.id, group: `${m.slug.slice(0, 2)} ${m.appName}`, title: tc.scenario, status: 'Not run', blockers: [],
          reason: `No test: the plan makes it "automate" (${planFor(testCaseRef(tc.id)).user ?? 'signed out'}) but no spec in tests/modules declares it yet`,
          failedStep: '', error: '', cause: '', deviations: [], notRun: [], http5xx: [], seconds: 0, noTest: true,
          previous: prev ? outcome('module', tc.id, prev.spec, []).status : undefined, triage: TRIAGE[tc.id],
        });
        continue;
      }
      outcomes.push({
        ...outcome('module', tc.id, r.spec, errors),
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
    return { module: g, total: rows.length, ...c, noTest: rows.filter((o) => o.noTest).length, ran: rows.length - c['Not run'] - rows.filter((o) => o.status === 'Blocked' && !o.seconds).length, blockers: blockerNos, http5xx: rows.reduce((a, o) => a + o.http5xx.length, 0) };
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
  });

  const summary = {
    run: { start: runStart, built: new Date().toISOString(), site: 'https://rs.showcase.atklik.xyz', branch: 'Podomoro', serverErrors: SERVER_ERRORS, previous: PREVIOUS },
    totals: { modules: count(mods), chains: count(chains), testCases: mods.length, noTest: mods.filter((o) => o.noTest).length, chainCount: chains.length, http5xx: errors.length },
    perModule,
    perBlocker,
    outcomes,
    errors: classified,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'run-summary.json'), JSON.stringify(summary, null, 2));
  void writeWorkbook(summary).then(() => console.log(`${OUT_DIR}/simrs-run-summary.xlsx: ${mods.length} test cases, ${chains.length} chains, ${errors.length} HTTP 5xx`));
}

type Summary = {
  run: Record<string, string>;
  totals: { modules: Record<Status, number>; chains: Record<Status, number>; testCases: number; chainCount: number; http5xx: number };
  perModule: { module: string; total: number; ran: number; blockers: number[]; http5xx: number }[] & Record<Status, number>[];
  perBlocker: { no: number; title: string; source: string; fix: string; who: string; category: string; testCases: number; chains: string[]; modules: string[]; seenHttp5xx: boolean }[];
  outcomes: TestOutcome[];
  errors: (ServerError & { id: string; testType: string; kind: string; testStatus: string; counted: string })[];
};

const FILL: Record<string, string> = { Passed: 'FFD9EAD3', Deviation: 'FFFFF2CC', Failed: 'FFF4CCCC', Blocked: 'FFFCE5CD', 'Not run': 'FFEFEFEF' };

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

/** Sheet Screenshots: one row per failed test, test with a deviation and chain not passed (row i + 2), with its screenshot. */
function screenshots(wb: ExcelJS.Workbook, rows: TestOutcome[]): void {
  const ws = sheet(wb, 'Screenshots', [
    { header: 'Id', key: 'id', width: 15 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Test case / chain', key: 'title', width: 36 },
    { header: 'Cause / why', key: 'cause', width: 50 },
    { header: 'Screenshot (at the failure, else at the end of the test)', key: 'shot', width: 92 },
  ], rows.map((o) => ({
    id: o.id,
    status: o.status,
    title: o.title,
    cause: [o.triage ? `${o.triage.cause}: ${o.triage.finding}` : o.error || o.reason.slice(0, 600), o.triage?.next ? `Next: ${o.triage.next}` : ''].filter(Boolean).join('\n\n'),
    shot: o.screenshot ? '' : 'no screenshot',
  })), 'status');
  rows.forEach((o, i) => {
    const row = i + 2;
    if (!o.screenshot) return;
    const t = thumbnail(o.screenshot);
    ws.getRow(row).height = Math.max(60, t.height * 0.75 + 6);
    ws.addImage(wb.addImage({ filename: t.file, extension: 'jpeg' }), { tl: { col: 4, row: row - 1 }, ext: { width: t.width, height: t.height }, editAs: 'oneCell' });
  });
}

async function writeWorkbook(s: Summary): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ov = wb.addWorksheet('Overview');
  ov.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const add = (...v: unknown[]) => ov.addRow(v);
  add('SIMRS (KlikMed HMIS) – full run summary').font = { bold: true, size: 14 };
  add('Site', s.run.site);
  add('Branch', s.run.branch);
  add('Run started', s.run.start);
  add('Built', s.run.built);
  add('Writes', 'QA_ALLOW_WRITES=1; every saved value carries "QA-" and a token new per run (lib/qa-data/names.ts)');
  add();
  add('', ...STATUSES, 'Total').font = { bold: true };
  add('Module test cases', ...STATUSES.map((x) => s.totals.modules[x]), s.totals.testCases);
  add('  of Not run: no test written yet', '', '', '', '', (s.totals as unknown as { noTest: number }).noTest);
  add('E2E chains', ...STATUSES.map((x) => s.totals.chains[x]), s.totals.chainCount);
  add('HTTP 5xx answers of the site', s.totals.http5xx);
  add();
  add('Status meanings').font = { bold: true };
  add('Passed', 'every step met the Expected Result of the workbook');
  add('Deviation', 'ran to the end, a step differs from the Expected Result (site behaviour noted)');
  add('Failed', 'stopped on an error: see sheet Failures for the cause and next action, and sheet Screenshots for what the screen showed');
  add('Blocked', 'a known blocker stopped steps: see sheet Blockers');
  add('Not run', 'not run for another reason (Automation Candidate = No, needs a user/role that is not ready, ...)');
  ov.getColumn(2).alignment = { wrapText: false };

  sheet(wb, 'Modules', [
    { header: 'Module', key: 'module', width: 30 },
    { header: 'Test cases', key: 'total', width: 11 },
    ...STATUSES.map((x) => ({ header: x, key: x, width: 10 })),
    { header: 'Of Not run: no test yet', key: 'noTest', width: 10 },
    { header: 'Pass rate of run tests', key: 'rate', width: 12 },
    { header: 'Blockers', key: 'blockers', width: 30 },
    { header: 'HTTP 5xx', key: 'http5xx', width: 9 },
  ], (s.perModule as unknown as Record<string, unknown>[]).map((m) => {
    const ran = Number(m.Passed) + Number(m.Deviation) + Number(m.Failed);
    return { ...m, rate: ran ? `${Math.round((Number(m.Passed) / ran) * 100)}%` : '-', blockers: (m.blockers as number[]).join(', ') };
  }));

  const outcomeRow = (o: TestOutcome) => ({
    id: o.id,
    group: o.group,
    title: o.title,
    status: o.status,
    previous: o.previous ?? '',
    blockers: o.blockers.join(', '),
    reason: o.reason.slice(0, 2000),
    failedStep: o.failedStep,
    error: o.error.slice(0, 1000),
    cause: o.triage ? `${o.triage.cause}: ${o.triage.finding}` : o.cause,
    next: o.triage?.next ?? '',
    owner: o.triage?.owner ?? '',
    http5xx: o.http5xx.join('\n'),
    seconds: o.seconds,
  });
  const cols = [
    { header: 'Id', key: 'id', width: 15 },
    { header: 'Module', key: 'group', width: 24 },
    { header: 'Test case / chain', key: 'title', width: 44 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Status 2026-10-18', key: 'previous', width: 11 },
    { header: 'Blockers', key: 'blockers', width: 10 },
  ];
  const shotRows = s.outcomes.filter((o) => (o.kind === 'chain' && o.status !== 'Passed') || (o.kind === 'module' && (o.status === 'Failed' || o.status === 'Deviation')));
  const shotAt = new Map(shotRows.map((o, i) => [o.id, i + 2]));
  const link = (o: TestOutcome) => (shotAt.has(o.id) ? { text: o.screenshot ? 'screenshot' : 'none', hyperlink: `#'Screenshots'!E${shotAt.get(o.id)}` } : '');
  sheet(wb, 'E2E chains', [...cols, { header: 'Screenshot', key: 'shot', width: 12 }, { header: 'Why (stop / deviation)', key: 'reason', width: 70 }, { header: 'Failed step', key: 'failedStep', width: 40 }, { header: 'Error', key: 'error', width: 50 }, { header: 'Cause', key: 'cause', width: 50 }, { header: 'Next action', key: 'next', width: 50 }, { header: 'HTTP 5xx', key: 'http5xx', width: 40 }], s.outcomes.filter((o) => o.kind === 'chain').map((o) => ({ ...outcomeRow(o), shot: link(o) })), 'status');
  sheet(wb, 'Failures', [...cols, { header: 'Screenshot', key: 'shot', width: 12 }, { header: 'Failed step', key: 'failedStep', width: 50 }, { header: 'Error', key: 'error', width: 60 }, { header: 'Cause', key: 'cause', width: 60 }, { header: 'Next action', key: 'next', width: 60 }, { header: 'Owner', key: 'owner', width: 16 }, { header: 'HTTP 5xx', key: 'http5xx', width: 40 }], s.outcomes.filter((o) => o.status === 'Failed' || o.status === 'Deviation').map((o) => ({ ...outcomeRow(o), shot: link(o), error: o.error || o.reason })), 'status');
  sheet(wb, 'Blockers', [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Blocker', key: 'title', width: 60 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Defined in', key: 'source', width: 26 },
    { header: 'Test cases blocked', key: 'testCases', width: 10 },
    { header: 'Chains stopped', key: 'chains', width: 22 },
    { header: 'Modules', key: 'modules', width: 40 },
    { header: 'HTTP 5xx seen in this run', key: 'seen', width: 10 },
    { header: 'Fix (next action)', key: 'fix', width: 70 },
    { header: 'Who', key: 'who', width: 24 },
  ], s.perBlocker.map((b) => ({ ...b, chains: b.chains.join(', '), modules: b.modules.join('\n'), seen: b.seenHttp5xx ? 'Yes' : '' })));
  sheet(wb, 'HTTP 5xx', [
    { header: 'At', key: 'at', width: 22 },
    { header: 'Test', key: 'test', width: 50 },
    { header: 'Test type', key: 'testType', width: 10 },
    { header: 'Test status', key: 'testStatus', width: 10 },
    { header: 'Kind', key: 'kind', width: 50 },
    { header: 'Note', key: 'counted', width: 20 },
    { header: 'Status', key: 'status', width: 7 },
    { header: 'Method', key: 'method', width: 7 },
    { header: 'Path', key: 'path', width: 40 },
    { header: 'Digest', key: 'digest', width: 14 },
    { header: 'Request body', key: 'request', width: 70 },
    { header: 'Response', key: 'response', width: 50 },
  ], s.errors.map((e) => ({ ...e, test: e.test.replace(/ \[[^\]]+\].*$/, ''), path: new URL(e.url).pathname })));
  sheet(wb, 'Test cases', [...cols, { header: 'Why', key: 'reason', width: 70 }, { header: 'Error', key: 'error', width: 50 }, { header: 'Seconds', key: 'seconds', width: 9 }], s.outcomes.filter((o) => o.kind === 'module').map(outcomeRow), 'status');
  screenshots(wb, shotRows);
  await wb.xlsx.writeFile(path.join(OUT_DIR, 'simrs-run-summary.xlsx'));
}

main();
