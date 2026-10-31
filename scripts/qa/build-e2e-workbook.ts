/**
 * Builds the E2E result workbooks: a copy of each reference workbook that has
 * results (reference/<NN-module>.xlsx -> reports/e2e/<NN-module>.xlsx), same
 * sheets and columns, with the template's own result columns of sheet Steps
 * filled from a Playwright JSON report, in Indonesian (scripts/qa/report-language.ts):
 *
 *   Execution Status  Lulus / Gagal / Terblokir / Belum dijalankan (the sheet's list, in Indonesian)
 *   Actual Result     what the run saw, per step
 *   Defect Reference  the blocker number for Blocked steps
 *
 * Sheet Summary gets an "E2E run" block at the end. reference/ is only read.
 *
 * Usage (one JSON report per module run; every reports/e2e/results-*.json is read):
 *   PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e/results-02-appointment.json \
 *     npx playwright test --project=e2e-modules tests/modules/02-appointment/ --reporter=list,json
 *   npm run qa:e2e-workbook [-- <report.json> ...]
 *
 * Step status rules (docs/qa/open-questions.md, answers C2 and Q8):
 * - a step that passed with a "deviation" did not meet the workbook's
 *   Expected Result: Failed, with the site's behaviour in Actual Result;
 * - "blocker" annotation or a blocker reason of a fixme test: Blocked;
 * - "not-run" annotation, skipped test, or a step after a failure: Not Run.
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { modules } from '../../lib/qa-data';
import { sentenceId, statusId } from './report-language';
import { reasonId, saveMissing } from './summary-id';

/** The reasons and notes the tests record (English), in Indonesian (scripts/qa/summary-id.ts). */
const idList = (xs: string[]): string => xs.map((x) => sentenceId(reasonId(x))).join('; ');
import { addNotesColumn, evidenceCell, probableCause } from './run-notes';

const OUT = 'reports/e2e';
const REPORTS = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.readdirSync(OUT).filter((f) => /^results.*\.json$/.test(f)).sort().map((f) => path.join(OUT, f));

interface PwStep {
  title: string;
  error?: { message?: string };
  steps?: PwStep[];
}
interface PwResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  startTime: string;
  steps?: PwStep[];
  errors?: { message?: string }[];
  annotations?: { type: string; description?: string }[];
}
interface PwTest {
  annotations?: { type: string; description?: string }[];
  results: PwResult[];
  status: string;
}
interface PwSpec {
  title: string;
  tests: PwTest[];
}
interface PwSuite {
  specs?: PwSpec[];
  suites?: PwSuite[];
}

type Status = 'Passed' | 'Failed' | 'Blocked' | 'Not Run';
interface StepOutcome {
  status: Status;
  actual: string;
  defect?: string;
  /** Automation notes: the blocker, the error and its probable cause, the deviation or the reason not run. */
  note?: string;
}

type Report = { suites: PwSuite[]; stats?: { startTime?: string } };
const reports = REPORTS.map((file) => ({ file, report: JSON.parse(fs.readFileSync(file, 'utf8')) as Report }));
let runDate = new Date().toISOString().slice(0, 10);

function* specsOf(suites: PwSuite[]): Generator<PwSpec> {
  for (const s of suites) {
    yield* s.specs ?? [];
    yield* specsOf(s.suites ?? []);
  }
}

const firstLine = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim())?.trim() ?? '';

/** Outcome of every step of one test case, keyed by step number. */
function outcomes(spec: PwSpec, stepNumbers: number[]): Map<number, StepOutcome> {
  const test = spec.tests[0];
  const result = test.results[test.results.length - 1];
  // Playwright reports the annotations on the test and again on the result: keep each once.
  const seen = new Set<string>();
  const notes = [...(test.annotations ?? []), ...(result?.annotations ?? [])].filter((a) => {
    const key = `${a.type}\u0000${a.description ?? ''}`;
    return !seen.has(key) && !!seen.add(key);
  });
  const byStep = (type: string) => {
    const m = new Map<number, string[]>();
    for (const a of notes.filter((x) => x.type === type)) {
      const n = Number(a.description?.match(/^Step (\d+):/)?.[1]);
      if (n) m.set(n, [...(m.get(n) ?? []), a.description!.replace(/^Step \d+: /, '')]);
    }
    return m;
  };
  const out = new Map<number, StepOutcome>();

  if (!result || result.status === 'skipped') {
    const reasons = notes.filter((a) => ['fixme', 'skip'].includes(a.type)).map((a) => a.description ?? '');
    const blocker = reasons.find((r) => /^Blocker \d+/.test(r));
    for (const n of stepNumbers) {
      out.set(n, blocker
        ? { status: 'Blocked', actual: `${runDate} E2E: tidak dijalankan. ${idList([blocker])}`, defect: blocker.match(/^Blocker \d+/)![0], note: `Test dilewati: ${idList(reasons)}` }
        : { status: 'Not Run', actual: `${runDate} E2E: tidak dijalankan. ${idList(reasons) || 'dilewati'}`, note: idList(reasons) || 'dilewati' });
    }
    return out;
  }

  const ran = new Map<number, PwStep>();
  const walk = (steps: PwStep[] = []) => {
    for (const s of steps) {
      const n = Number(s.title.match(/^Step (\d+) \[/)?.[1]);
      if (n && !ran.has(n)) ran.set(n, s);
      walk(s.steps);
    }
  };
  walk(result.steps);
  const deviations = byStep('deviation');
  const notRun = byStep('not-run');
  const blocked = byStep('blocker');
  const testNotes = byStep('note');
  const testError = firstLine(result.errors?.[0]?.message);
  // A failure outside every step (set-up, or between two steps) is put on the first step not reached.
  const failedAt = [...ran].find(([, s]) => s.error)?.[0]
    ?? (result.status !== 'passed' ? stepNumbers.find((n) => !ran.has(n) && !blocked.has(n) && !notRun.has(n)) : undefined);

  for (const n of stepNumbers) {
    const note = testNotes.has(n) ? idList(testNotes.get(n)!) : undefined;
    const extra = note ? ` Catatan: ${note}.` : '';
    const ownNote = note ? `Catatan: ${note}` : undefined;
    if (blocked.has(n)) {
      const text = blocked.get(n)!.join('; ');
      const shown = idList(blocked.get(n)!);
      out.set(n, { status: 'Blocked', actual: `${runDate} E2E: ${shown}.${extra}`, defect: text.match(/blocker (\d+)/)?.[0].replace('blocker', 'Blocker'), note: [`Dihentikan oleh ${shown}`, ownNote].filter(Boolean).join('. ') });
    } else if (failedAt === n) {
      const error = firstLine(ran.get(n)?.error?.message) || testError;
      out.set(n, { status: 'Failed', actual: `${runDate} E2E gagal: ${error}.${extra}`, note: [`Error: ${error}`, `Kemungkinan penyebab: ${sentenceId(probableCause(error))}`, ownNote].filter(Boolean).join('. ') });
    } else if (deviations.has(n) && (failedAt === undefined || n < failedAt)) {
      // A deviation was seen on the screen, even on a step partly "not run".
      const dev = idList(deviations.get(n)!);
      out.set(n, { status: 'Failed', actual: `${runDate} E2E: Expected Result tidak terpenuhi. ${dev}.${extra}`, note: [`Deviasi dari workbook: ${dev}`, ownNote].filter(Boolean).join('. ') });
    } else if (notRun.has(n)) {
      out.set(n, { status: 'Not Run', actual: `${runDate} E2E: tidak dijalankan. ${idList(notRun.get(n)!)}.${extra}`, note: idList(notRun.get(n)!) });
    } else if (!ran.has(n) || (failedAt !== undefined && n > failedAt)) {
      const why = result.status === 'passed' ? 'langkah tidak dicapai oleh test' : `test berhenti lebih awal (${testError})`;
      out.set(n, { status: 'Not Run', actual: `${runDate} E2E: tidak dijalankan; ${why}.${extra}`, note: [`Tidak dicapai: ${why}`, ownNote].filter(Boolean).join('. ') });
    } else {
      out.set(n, { status: 'Passed', actual: `${runDate} E2E: sesuai harapan.${extra}`, note: ownNote });
    }
  }
  return out;
}

const STATUS_LIST_EN = '"Not Run,Passed,Failed,Blocked"';
const STATUS_LIST_ID = `"${['Not Run', 'Passed', 'Failed', 'Blocked'].map(statusId).join(',')}"`;

/** The list of column Execution Status in Indonesian, like the statuses written. */
function statusListInIndonesian(ws: ExcelJS.Worksheet): void {
  const dv = (ws as unknown as { dataValidations: { model: Record<string, { formulae?: string[] }> } }).dataValidations;
  for (const rule of Object.values(dv.model)) if (rule.formulae?.[0] === STATUS_LIST_EN) rule.formulae = [STATUS_LIST_ID];
}

/**
 * exceljs 4.4 reads each list validation as one entry per cell and, when
 * writing, sorts the cells as text ("G10" before "G2"), which yields two
 * overlapping ranges per column. The cells of one column with one rule are
 * put back into the single range of the template; its writer keeps range
 * keys as they are.
 */
function compactValidations(ws: ExcelJS.Worksheet): void {
  const dv = (ws as unknown as { dataValidations: { model: Record<string, unknown> } }).dataValidations;
  const groups = new Map<string, { col: string; rows: number[]; rule: unknown }>();
  const rest: Record<string, unknown> = {};
  for (const [address, rule] of Object.entries(dv.model)) {
    const cell = address.match(/^([A-Z]+)(\d+)$/);
    if (!cell) {
      rest[address] = rule;
      continue;
    }
    const key = `${cell[1]}\u0000${JSON.stringify(rule)}`;
    const g = groups.get(key) ?? { col: cell[1], rows: [], rule };
    g.rows.push(Number(cell[2]));
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    const rows = g.rows.sort((a, b) => a - b);
    const [first, last] = [rows[0], rows[rows.length - 1]];
    if (rows.length === last - first + 1) rest[first === last ? `${g.col}${first}` : `${g.col}${first}:${g.col}${last}`] = g.rule;
    else for (const r of rows) rest[`${g.col}${r}`] = g.rule;
  }
  dv.model = rest;
}

async function main(): Promise<void> {
  // A test case's newest result wins (by the report's start time): a rerun of a few tests overrides the full run.
  const byTc = new Map<string, PwSpec>();
  const source = new Map<string, { file: string; date: string; start: string }>();
  for (const { file, report } of reports) {
    const start = report.stats?.startTime ?? new Date().toISOString();
    for (const spec of specsOf(report.suites)) {
      const id = spec.title.match(/^(TC-APP\d{3}-\d{3}) /)?.[1];
      if (id && !((source.get(id)?.start ?? '') > start)) {
        byTc.set(id, spec);
        source.set(id, { file, date: start.slice(0, 10), start });
      }
    }
  }
  fs.mkdirSync(OUT, { recursive: true });

  for (const m of modules()) {
    const tcs = m.testCases.filter((t) => byTc.has(t.id));
    if (!tcs.length) continue;
    const files = [...new Set(tcs.map((t) => source.get(t.id)!.file))];
    runDate = tcs.map((t) => source.get(t.id)!.date).sort().at(-1)!;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join('reference', m.source));
    const ws = wb.getWorksheet('Steps')!;
    const head = new Map<string, number>();
    ws.getRow(1).eachCell((c, i) => head.set(String(c.value).trim(), i));
    const col = (name: string) => {
      const i = head.get(name);
      if (!i) throw new Error(`${m.source} | Steps has no column "${name}"`);
      return i;
    };
    const notesCol = addNotesColumn(ws);
    const evidenceCol = col('Evidence Reference');
    const workbookDir = path.posix.dirname(`${OUT}/${m.source}`);
    const count: Record<Status, number> = { Passed: 0, Failed: 0, Blocked: 0, 'Not Run': 0 };
    const cache = new Map<string, Map<number, StepOutcome>>();

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const id = String(row.getCell(col('Test Case ID')).value ?? '');
      const n = Number(row.getCell(col('Step Number')).value);
      if (!id || !n) continue;
      const spec = byTc.get(id);
      let o: StepOutcome;
      if (!spec) {
        o = { status: 'Not Run', actual: `${runDate} E2E: belum ada test otomatis untuk kasus uji ini dalam run.` };
      } else {
        if (!cache.has(id)) {
          const tc = m.testCases.find((t) => t.id === id)!;
          cache.set(id, outcomes(spec, tc.steps.map((s) => s.step)));
        }
        o = cache.get(id)!.get(n)!;
      }
      row.getCell(col('Execution Status')).value = statusId(o.status);
      row.getCell(col('Actual Result')).value = o.actual;
      if (o.defect) row.getCell(col('Defect Reference')).value = o.defect;
      row.getCell(notesCol).value = o.note ?? null;
      row.getCell(notesCol).alignment = { wrapText: true, vertical: 'top' };
      if (spec) row.getCell(evidenceCol).value = evidenceCell(id, workbookDir, String(row.getCell(evidenceCol).value ?? ''));
      count[o.status] += 1;
    }

    const summary = wb.getWorksheet('Summary');
    if (summary) {
      const start = summary.rowCount + 2;
      const lines: [string, string][] = [
        ['Run E2E', `${runDate}, project Playwright "e2e-modules" (tests/modules/${m.slug}/), di situs berbahasa Indonesia (/id), laporan ${files.join(', ')}`],
        ['Langkah E2E', `${statusId('Passed')} ${count.Passed}, ${statusId('Failed')} ${count.Failed}, ${statusId('Blocked')} ${count.Blocked}, ${statusId('Not Run')} ${count['Not Run']}`],
        ['Kasus uji E2E dalam run', `${tcs.length} dari ${m.testCases.length}`],
        ['Aturan E2E', `${statusId('Failed')} = Expected Result tidak terpenuhi (juga saat test memeriksa perilaku situs saat ini). ${statusId('Blocked')} = docs/qa/blockers-found.md atau 00-blockers-checklist-linked.xlsx.`],
      ];
      lines.forEach(([k, v], i) => {
        summary.getCell(start + i, 1).value = k;
        summary.getCell(start + i, 2).value = v;
        summary.getCell(start + i, 1).font = { bold: true };
      });
    }

    statusListInIndonesian(ws);
    for (const sheet of wb.worksheets) compactValidations(sheet);
    const file = path.join(OUT, m.source);
    await wb.xlsx.writeFile(file);
    console.log(`${file}: ${tcs.length} test cases;`, count);
  }
  const untranslated = saveMissing(MISSING);
  if (untranslated) console.log(`${MISSING}: ${untranslated} texts without Indonesian (add them to scripts/qa/id/texts.json)`);
}

/** Texts of the result workbooks without a translation yet. */
const MISSING = '.qa-state/workbook-id-missing.json';

void main();
