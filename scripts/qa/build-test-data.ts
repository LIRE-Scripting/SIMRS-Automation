/**
 * Converts the QA workbooks in reference/ into JSON under test-data/reference/.
 *
 * - Read-only: the workbooks are never written.
 * - Fails loudly when a sheet or a column is missing, renamed or moved, so a
 *   changed workbook cannot silently feed wrong data into the specs.
 * - Values are copied as they are (text, numbers); nothing is translated or
 *   reformatted. Source rows are kept as `row` for traceability.
 *
 * Run: npm run qa:data
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

const ROOT = path.resolve(__dirname, '..', '..');
const REF = path.join(ROOT, 'reference');
const OUT = path.join(ROOT, 'test-data', 'reference');

type Cell = string | number | boolean | null;
type Rec = Record<string, Cell> & { row: number };

let dateCells = 0;
let formulaWithoutResult = 0;

function cellValue(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) {
    dateCells++;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v && typeof v.text === 'string') return v.text; // hyperlink cell
    if ('formula' in v || 'sharedFormula' in v) {
      if ('result' in v && v.result !== undefined) return cellValue(v.result as ExcelJS.CellValue);
      formulaWithoutResult++;
      return null;
    }
    if ('error' in v) throw new Error(`Excel error value ${String(v.error)}`);
  }
  throw new Error(`Unsupported cell value: ${JSON.stringify(v)}`);
}

function rowValues(ws: ExcelJS.Worksheet, r: number): Cell[] {
  const row = ws.getRow(r);
  const out: Cell[] = [];
  for (let c = 1; c <= ws.columnCount; c++) out.push(cellValue(row.getCell(c).value));
  return out;
}

const isEmpty = (vals: Cell[]) => vals.every((v) => v === null);

/**
 * Reads a table whose header is on `headerRow`. `columns` maps every expected
 * header text (in sheet order) to a JSON key; `null` drops the column.
 */
function readTable(
  file: string,
  ws: ExcelJS.Worksheet | undefined,
  sheetName: string,
  headerRow: number,
  columns: Record<string, string | null>,
): Rec[] {
  if (!ws) throw new Error(`${file}: sheet "${sheetName}" is missing`);
  const expected = Object.keys(columns);
  const actual = rowValues(ws, headerRow).slice(0, expected.length);
  expected.forEach((h, i) => {
    if (actual[i] !== h) {
      throw new Error(
        `${file} | ${sheetName} | row ${headerRow}: column ${i + 1} is "${actual[i]}", expected "${h}"`,
      );
    }
  });
  const recs: Rec[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const vals = rowValues(ws, r);
    if (isEmpty(vals)) continue;
    const rec: Rec = { row: r };
    expected.forEach((h, i) => {
      const key = columns[h];
      if (key) rec[key] = vals[i] ?? null;
    });
    recs.push(rec);
  }
  return recs;
}

async function open(file: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(REF, file));
  return wb;
}

function write(rel: string, data: unknown): void {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
}

// ---------------------------------------------------------------- 00-files

async function prerequisites(): Promise<void> {
  const f = '00-prerequisites.xlsx';
  const wb = await open(f);
  const users = readTable(f, wb.getWorksheet('Users'), 'Users', 4, {
    No: 'key', User: 'user', 'Branch of the roles': 'branch', Rights: 'rights', 'Used for': 'usedFor',
    Journeys: 'journeys', Applications: 'applications', 'Status on the site': 'statusOnSite', Prepared: 'prepared',
  }).filter((u) => /^U\d+$/.test(String(u.key)));
  const roleAccounts = readTable(f, wb.getWorksheet('Role accounts'), 'Role accounts', 4, {
    Application: 'application', 'Working role (persona of the journeys)': 'workingRole', 'Write right': 'writeRight',
    Journeys: 'journeys', 'Branch of the roles': 'branch', 'Account (login)': 'login', Prepared: 'prepared',
  });
  const setup = readTable(f, wb.getWorksheet('Set-up and data'), 'Set-up and data', 4, {
    No: 'no', Prerequisite: 'prerequisite', Applications: 'applications', Journeys: 'journeys',
    'Why it is needed': 'why', 'What to prepare': 'whatToPrepare', Who: 'who', Status: 'status',
  });
  const journeys = readTable(f, wb.getWorksheet('Journeys'), 'Journeys', 4, {
    'Journey ID': 'journeyId', Application: 'application', 'Journey name': 'name',
    'User role in the journey': 'userRole', 'Users needed': 'usersNeeded', Branch: 'branch',
    'Needs a record from': 'needsRecordFrom', Preconditions: 'preconditions', 'Starting point': 'startingPoint',
  });
  write('prerequisites.json', { source: f, users, roleAccounts, setup, journeys });
}

async function testData(): Promise<void> {
  const f = '00-test-data.xlsx';
  const wb = await open(f);
  const overview = readTable(f, wb.getWorksheet('Overview'), 'Overview', 4, { Topic: 'topic', Rule: 'rule' });
  const catalogue = readTable(f, wb.getWorksheet('Data catalogue'), 'Data catalogue', 4, {
    Application: 'application', 'Short name': 'shortName', 'What it is': 'what', Kind: 'kind', 'Made in': 'madeIn',
    Branch: 'branch', Journeys: 'journeys', 'Journey IDs': 'journeyIds', 'Id on the site': 'siteId', Status: 'status',
  });
  const journeys = readTable(f, wb.getWorksheet('Journeys'), 'Journeys', 4, {
    'Journey ID': 'journeyId', Application: 'application', 'Journey name': 'name',
    'Required Test Data': 'requiredTestData', 'Short names used': 'shortNamesUsed',
    'Needs a record from': 'needsRecordFrom', 'Data status': 'dataStatus',
  });
  write('test-data.json', { source: f, overview, catalogue, journeys });
}

async function blockers(): Promise<void> {
  const f = '00-blockers-checklist-linked.xlsx';
  const wb = await open(f);
  const list = readTable(f, wb.getWorksheet('Checklist'), 'Checklist', 4, {
    Done: 'done', No: 'no', Blocker: 'blocker', Category: 'category',
    'Applications, screens and journeys': 'scope', 'Journeys (click for the list)': 'journeys', Cause: 'cause',
    'What needs fixing': 'fix', Who: 'who', 'How it was found': 'howFound',
  }).filter((b) => typeof b.no === 'number');
  const links = readTable(f, wb.getWorksheet('Journey links'), 'Journey links', 4, {
    'Blocker No': 'blockerNo', Blocker: 'blocker', Category: 'category', Application: 'application',
    'Journey ID (click to open)': 'journeyId', 'Journey name': 'name', 'Starting point': 'startingPoint',
    'Verification status': 'verificationStatus', 'Journey status': 'journeyStatus', Workbook: 'workbook',
  });
  write('blockers.json', { source: f, blockers: list, links });
}

// ---------------------------------------------------------- module workbooks

const JOURNEY_COLUMNS = {
  'Journey ID': 'id', 'Application ID': 'appId', 'Application Name': 'appName', 'Module / Feature': 'feature',
  'Journey Name': 'name', 'Business Objective': 'objective', 'User Role': 'userRole', Preconditions: 'preconditions',
  'Starting Point': 'startingPoint', 'Journey Steps': 'steps', 'Expected Outcome': 'expectedOutcome',
  'Observed Outcome': 'observedOutcome', 'Alternative Paths': 'alternativePaths', 'Failure Scenarios': 'failureScenarios',
  Dependencies: 'dependencies', Priority: 'priority', 'Automation Candidate': 'automationCandidate',
  'Verification Status': 'verificationStatus', 'Source Code References': null, 'Evidence References': 'evidence',
  'Journey Status': 'status', 'Validation Notes': 'validationNotes', 'Required Test Data': 'requiredTestData',
  'API / Backend Operations': 'apiOperations', 'Earlier ID': 'earlierId',
} as const;

const STEP_COLUMNS = {
  'Test Case ID': 'testCaseId', 'Journey ID': 'journeyId', 'Application Name': 'appName', 'Module / Feature': 'feature',
  'Scenario Name': 'scenario', 'Test Objective': 'objective', 'Test Type': 'testType', Priority: 'priority',
  Preconditions: 'preconditions', 'Test Data': 'testData', 'Step Number': 'step', Action: 'action',
  'Expected Result': 'expected', 'Observed Result': 'observed', 'Final State': 'finalState', Dependencies: 'dependencies',
  'Automation Candidate': 'automationCandidate', 'Verification Status': 'verificationStatus',
  'Execution Status': 'executionStatus', 'Actual Result': 'actualResult', 'Source Code Reference': null,
  'Evidence Reference': 'evidence', 'Defect Reference': 'defect', 'Cleanup Requirements': 'cleanup',
} as const;

/** Fields that describe the whole test case; they must be equal on every step row. */
const TC_FIELDS = [
  'journeyId', 'appName', 'feature', 'scenario', 'objective', 'testType', 'priority',
  'preconditions', 'testData', 'finalState', 'dependencies', 'cleanup',
] as const;
const STEP_FIELDS = [
  'row', 'step', 'action', 'expected', 'observed', 'automationCandidate',
  'verificationStatus', 'executionStatus', 'actualResult', 'evidence', 'defect',
] as const;

async function moduleWorkbook(f: string): Promise<{ journeys: number; testCases: number; steps: number }> {
  const wb = await open(f);
  const sumWs = wb.getWorksheet('Summary');
  if (!sumWs) throw new Error(`${f}: sheet "Summary" is missing`);
  const meta: Record<string, Cell> = {};
  const shortNames: { name: Cell; what: Cell; row: number }[] = [];
  let inShortNames = false;
  for (let r = 1; r <= sumWs.rowCount; r++) {
    const [a, b] = rowValues(sumWs, r);
    if (a === null) continue;
    if (String(a).startsWith('Test data short names')) {
      inShortNames = true;
      continue;
    }
    if (inShortNames) shortNames.push({ name: a, what: b ?? null, row: r });
    else if (r <= 8) meta[String(a)] = b ?? null;
  }
  for (const k of ['Application', 'Address', 'Licence and write privilege']) {
    if (!(k in meta)) throw new Error(`${f} | Summary: "${k}" not found in rows 1-8`);
  }

  const journeys = readTable(f, wb.getWorksheet('Journeys'), 'Journeys', 1, JOURNEY_COLUMNS);
  const steps = readTable(f, wb.getWorksheet('Steps'), 'Steps', 1, STEP_COLUMNS);

  const journeyIds = new Set(journeys.map((j) => j.id));
  const byTc = new Map<string, Rec[]>();
  for (const s of steps) {
    const id = String(s.testCaseId);
    if (!journeyIds.has(s.journeyId)) throw new Error(`${f} | Steps | row ${s.row}: unknown journey ${s.journeyId}`);
    byTc.set(id, [...(byTc.get(id) ?? []), s]);
  }
  const testCases = [...byTc].map(([id, rows]) => {
    for (const field of TC_FIELDS) {
      const values = new Set(rows.map((r) => r[field]));
      if (values.size > 1) throw new Error(`${f} | Steps | ${id}: "${field}" differs between its rows`);
    }
    const numbers = rows.map((r) => r.step);
    if (numbers.some((n, i) => n !== i + 1)) throw new Error(`${f} | Steps | ${id}: step numbers ${numbers.join(',')}`);
    const tc: Record<string, unknown> = { id, rows: [rows[0].row, rows[rows.length - 1].row] };
    for (const field of TC_FIELDS) tc[field] = rows[0][field];
    tc.steps = rows.map((r) => Object.fromEntries(STEP_FIELDS.map((k) => [k, r[k]])));
    return tc;
  });

  const slug = f.replace(/\.xlsx$/, '');
  write(`modules/${slug}.json`, {
    source: f,
    slug,
    appId: journeys[0]?.appId ?? null,
    appName: journeys[0]?.appName ?? null,
    summary: meta,
    shortNames,
    journeys,
    testCases,
  });
  return { journeys: journeys.length, testCases: testCases.length, steps: steps.length };
}

// --------------------------------------------------------------------- main

async function main(): Promise<void> {
  fs.rmSync(OUT, { recursive: true, force: true });
  await prerequisites();
  await testData();
  await blockers();
  const files = fs.readdirSync(REF).filter((n) => /^(0[1-9]|[12]\d)-.*\.xlsx$/.test(n)).sort();
  if (files.length === 0) throw new Error('No module workbooks in reference/');
  const totals = { journeys: 0, testCases: 0, steps: 0 };
  for (const f of files) {
    const t = await moduleWorkbook(f);
    totals.journeys += t.journeys;
    totals.testCases += t.testCases;
    totals.steps += t.steps;
  }
  write('index.json', { modules: files.map((n) => n.replace(/\.xlsx$/, '')), totals });
  console.log(`modules ${files.length}, journeys ${totals.journeys}, test cases ${totals.testCases}, steps ${totals.steps}`);
  if (formulaWithoutResult) console.warn(`warning: ${formulaWithoutResult} formula cells had no cached result (read as empty)`);
  if (dateCells) console.warn(`warning: ${dateCells} date-typed cells were written as YYYY-MM-DD`);
}

main().catch((e: unknown) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
