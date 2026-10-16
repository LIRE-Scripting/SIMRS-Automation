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

const TEMPLATE = 'reference/14-hospital-accounts.xlsx';
const OUT_DIR = 'reports/e2e-chains';
const OUT = `${OUT_DIR}/e2e-journeys.xlsx`;

type Status = 'Passed' | 'Failed' | 'Blocked' | 'Not Run';

/** Cause ids that are not in a blocker list: defined here. */
const STATES: Record<string, { title: string; cause: string; fix: string; who: string }> = {
  'NEEDS-EVALUATION': {
    title: 'The journey is marked "Needs Evaluation" in its workbook',
    cause: 'Column "Automation Candidate" of the journey reads "Needs Evaluation"; the chain does not run a journey that is not cleared for automation.',
    fix: 'Decide whether the journey can be automated and set "Automation Candidate" to Yes.',
    who: 'QA / Product owner',
  },
  'STEP-NOT-RUN': {
    title: 'A step of the source test case cannot be run',
    cause: 'The source test case leaves a step out (its reason is in the Actual Result: another user, a second window, a record no screen shows).',
    fix: 'Provide what the reason names, then run the chain again.',
    who: 'QA',
  },
  'NOT-RUN': {
    title: 'The chain has not been run yet',
    cause: 'No result of this chain in reports/e2e-chains/results*.json.',
    fix: 'Run the chain (tests/e2e/chains/).',
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
  const files = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR).filter((f) => /^results.*\.json$/.test(f)).sort() : [];
  for (const f of files) {
    const report = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8')) as { suites: PwSuite[] };
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
  const stopCause = Number.isFinite(stopAt) ? stops.get(stopAt)![0].match(/^(Blocker \d+|User U\d+|NEEDS-EVALUATION|STEP-NOT-RUN)/)![1] : '';
  let failedAt = 0;
  return chain.steps.map((s, i) => {
    const n = i + 1;
    const ref = testCaseRef(s.tc);
    const source = s.steps ? ref.testCase.steps.filter((x) => s.steps!.includes(x.step)) : ref.testCase.steps;
    const base = { n, tc: s.tc, role: s.role, ref, source };
    const date = run ? `${run.date} chain run: ` : '';
    // A source test case that records its blocker and then skips (test.skip) leaves a skipped run with a stop: that run counts.
    if (!run || (run.status === 'skipped' && !Number.isFinite(stopAt))) {
      return { ...base, status: 'Not Run', causes: ['NOT-RUN'], actual: run ? `${date}skipped` : 'The chain has not been run yet.' };
    }
    if (n >= stopAt) {
      const actual = n === stopAt ? `${date}the chain stops here: ${stops.get(n)!.join(' / ')}` : `${date}not reached: the chain stops at step ${stopAt} (${stopCause}).`;
      return { ...base, status: 'Blocked', causes: [stopCause], actual };
    }
    if (failedAt) {
      return { ...base, status: 'Blocked', causes: ['SITE-DEFECT'], actual: `${date}not reached: step ${failedAt} failed.` };
    }
    const ran = run.steps.get(n);
    const err = ran ? errorOf(ran) : '';
    if (!ran || err) {
      failedAt = n;
      const seen = run.notes('note').get(n) ?? [];
      return { ...base, status: 'Failed', causes: ['SITE-DEFECT'], actual: `${date}${err || run.error || 'the step did not run'}${seen.length ? `. Seen: ${seen.join(' / ')}` : ''}` };
    }
    const devs = run.notes('deviation').get(n) ?? [];
    const notes = run.notes('note').get(n) ?? [];
    const actual = `${date}${source.length} source step(s) passed.${devs.length ? ` Deviation (the flow goes on): ${devs.join(' / ')}.` : ''}${notes.length ? ` Notes: ${notes.join(' / ')}` : ''}`;
    return { ...base, status: 'Passed', causes: devs.length ? ['DEVIATION'] : [], actual };
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
    if (c) return { id, type: `Checklist (00-blockers-checklist-linked.xlsx, row ${c.row})`, title: c.blocker, cause: c.cause, fix: c.fix, who: c.who };
    const f = FOUND_BLOCKERS.find((b) => b.no === n);
    if (f) return { id, type: 'Found while automating (docs/qa/blockers-found.md)', title: f.blocker, cause: f.cause, fix: f.fix, who: f.who };
  }
  const user = id.match(/^User (U\d+)$/)?.[1];
  if (user) {
    const u = prerequisites().users.find((x) => x.key === user)!;
    return {
      id,
      type: `Missing user (00-prerequisites.xlsx | Users | row ${u.row})`,
      title: `${user}: ${u.user}`,
      cause: `The step needs ${user} ("${u.user}"); on the site: ${u.statusOnSite}.`,
      fix: `Create ${user} as described in 00-prerequisites.xlsx (${u.usedFor}) and put its login in "Status on the site".`,
      who: 'Site administrator',
    };
  }
  if (id === 'DEVIATION') {
    return {
      id,
      type: 'Deviation (does not stop the flow)',
      title: 'The step works, but differs from the wording or a detail of the workbook',
      cause: [...deviations.entries()].map(([tc, a]) => `${tc}: ${a.join(' / ')}`).join('\n'),
      fix: 'Decide per case: change the site, or change the Expected Result of the workbook.',
      who: 'Product owner',
    };
  }
  if (id === 'SITE-DEFECT') {
    return {
      id,
      type: 'Site defect (the run saw another behaviour than the workbook)',
      title: 'The site does not do what the Expected Result says',
      cause: [...defects.entries()].map(([tc, a]) => `${tc}: ${a.join(' / ')}`).join('\n'),
      fix: 'Fix the behaviour on the site, or change the Expected Result if the site is right (each case is in the Actual Result of its chain step).',
      who: 'Development / Product owner',
    };
  }
  const s = STATES[id];
  return { id, type: 'Site state / test design', ...s };
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
  const applyLists = (x: { ws: ExcelJS.Worksheet; lists: [string, ExcelJS.DataValidation][] }) => {
    for (const [k, v] of x.lists) for (let r = 2; r <= x.ws.rowCount; r++) x.ws.getCell(`${k.replace('2', '')}${r}`).dataValidation = v;
    x.ws.eachRow((row, i) => i > 1 && (row.alignment = { wrapText: true, vertical: 'top' }));
  };
  const J = fromTemplate('Journeys');
  const S = fromTemplate('Steps');
  const journeys = J.ws;
  const steps = S.ws;

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
        chain.name,
        s.role,
        'Integration',
        chain.priority,
        s.n === 1 ? chain.preconditions : `Step ${s.n - 1} of ${chain.id} done (${chain.steps[s.n - 2].tc}).`,
        s.ref.testCase.testData ?? '',
        s.n,
        `${s.role}: run ${s.tc} "${s.ref.testCase.scenario}"${chain.steps[s.n - 1].steps ? `, steps ${chain.steps[s.n - 1].steps!.join(', ')}` : ''}.`,
        src[src.length - 1].expected,
        null,
        s.n === cs.length ? chain.outcome : null,
        `${fileOf(s.tc)} | Steps | ${rows} | ${s.tc}`,
        'Yes',
        VERIFICATION[s.status],
        s.status,
        s.actual,
        specOf.get(chain.id) ?? 'no spec yet',
        'reports/e2e-chains/results*.json (Playwright JSON of the chain run, with trace and final screenshot)',
        s.causes.join('; ') || null,
        'As in the source test case.',
      ]);
    }
  }

  // ---------------------------------------------------------------- Journeys
  for (const { chain, steps: cs } of evaluated) {
    const breakAt = cs.find((s) => s.status !== 'Passed');
    const causes = [...new Set(cs.flatMap((s) => s.causes))];
    const status = !breakAt ? 'Passed' : breakAt.status === 'Not Run' ? 'Not run yet' : `${breakAt.status} at step ${breakAt.n}`;
    journeys.addRow([
      chain.id,
      'E2E',
      [...new Set(chain.steps.map((s) => appOf(s.tc)))].join(', '),
      'Cross-application chain',
      chain.name,
      chain.objective,
      chain.roles,
      chain.preconditions,
      chain.start,
      cs.map((s) => `${s.n}. ${s.role} (${s.tc})`).join('\n'),
      chain.outcome,
      breakAt
        ? `${breakAt.n === 1 ? 'Stops at the first step' : `Runs through step ${breakAt.n - 1} of ${cs.length}`}; step ${breakAt.n} (${breakAt.tc}) is ${breakAt.status}: ${breakAt.causes.filter((c) => !NON_STOPPING.has(c)).join('; ')}.`
        : `The chain run went through all ${cs.length} steps${causes.length ? ` (with ${causes.join('; ')})` : ''}.`,
      'Each source test case keeps its own alternative paths (see its workbook).',
      'See the negative test cases of each source workbook.',
      [...new Set(chain.steps.map((s) => fileOf(s.tc)))].join(', '),
      chain.priority,
      'Yes',
      breakAt ? VERIFICATION[breakAt.status] : 'UI Verified',
      chain.steps.map((s) => s.tc).join(', '),
      specOf.get(chain.id) ?? 'no spec yet',
      breakAt ? 'Needs Review' : 'Ready',
      `${chain.practice ? `Practice: ${chain.practice} ` : ''}${status}. Steps Passed ${cs.filter((s) => s.status === 'Passed').length}, Failed ${cs.filter((s) => s.status === 'Failed').length}, Blocked ${cs.filter((s) => s.status === 'Blocked').length}. Blockers: ${causes.filter((c) => !NON_STOPPING.has(c)).join('; ') || 'none'}. Notes: ${causes.filter((c) => NON_STOPPING.has(c)).join('; ') || 'none'}.`,
      chain.data,
      'As in the source test cases.',
      null,
    ]);
  }

  applyLists(J);
  applyLists(S);

  // ---------------------------------------------------------------- Blockers
  const sheet = wb.addWorksheet('Blockers');
  sheet.columns = [
    { header: 'Blocker ID', width: 16 },
    { header: 'Type', width: 34 },
    { header: 'Blocker', width: 44 },
    { header: 'Cause', width: 70 },
    { header: 'Fix', width: 50 },
    { header: 'Who', width: 20 },
    { header: 'Chains', width: 22 },
    { header: 'Stops the flow', width: 12 },
    { header: 'Chain steps', width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  const order = (id: string) => (id.startsWith('Blocker') ? Number(id.split(' ')[1]) : id.startsWith('User') ? 100 + Number(id.slice(6)) : NON_STOPPING.has(id) ? 300 : 200);
  for (const id of [...usedBy.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b))) {
    const d = defineBlocker(id, defects, deviations);
    const where = [...usedBy.get(id)!];
    sheet.addRow([d.id, d.type, d.title, d.cause, d.fix, d.who, [...new Set(where.map((w) => w.slice(0, 7)))].join(', '), NON_STOPPING.has(id) ? 'No' : 'Yes', where.join('\n')]);
  }
  sheet.eachRow((r) => (r.alignment = { wrapText: true, vertical: 'top' }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ---------------------------------------------------------------- Summary
  const add = (...v: unknown[]) => summary.addRow(v);
  add('End-to-end chains across applications: happy paths and their blockers');
  summary.getRow(1).font = { bold: true, size: 14 };
  add('Purpose', 'End-to-end (cross-application) happy paths, composed only from test cases that already exist in the 27 module workbooks. Each chain is one automated test that hands the records of a step (patient, order, invoice, document) on to the next.');
  add('Built', `${new Date().toISOString().slice(0, 10)} by npm run qa:e2e-chains (scripts/qa/build-e2e-chains.ts) from lib/qa-data/e2e-chains.ts and the chain runs reports/e2e-chains/results*.json (tests/e2e/chains/).`);
  add('Sheets', 'Journeys: one row per chain. Steps: one row per chain step, each pointing to its source test case (file, rows). Blockers: every blocker a chain meets, with its cause and fix.');
  add('Step status', 'Passed: the chain step ran on the record of the steps before it (a deviation from the wording is noted but does not stop the flow). Failed: the site did not do what the step needs. Blocked: the chain stops at this step or before it; Defect Reference names the cause (see sheet Blockers). Not Run: the chain has not been run.');
  add('Blocker IDs', '"Blocker N": checklist blockers 1-16 (00-blockers-checklist-linked.xlsx) and blockers found while automating (17 and up, docs/qa/blockers-found.md). "User Ux": a user of 00-prerequisites.xlsx that does not exist yet. DEVIATION, SITE-DEFECT, NEEDS-EVALUATION, NOT-RUN: see sheet Blockers.');
  add('Chain design', 'The chains follow the usual hospital-system flows: outpatient, emergency, inpatient and surgical pathways; order-to-result; closed-loop medication; vein-to-vein blood; revenue cycle and cash control; procure-to-pay with three-way match; inventory control; budget commitment control; hire-to-pay; record-to-report; asset, maintenance and support services. Column "Hospital-system practice checked" names the practice of each chain.');
  add('Tests', 'tests/e2e/chains/ (one spec per chain, fixtures/chain.ts). A chain runs up to the first step that a blocker stops; the steps from there are Blocked with that cause.');
  add();
  const head = add('Chain', 'Name', 'Applications', 'Steps', 'Passed', 'Failed', 'Blocked', 'Not Run', 'Status', 'First stop', 'Blockers that stop the flow', 'Notes that do not stop it', 'Hospital-system practice checked');
  head.font = { bold: true };
  for (const { chain, steps: cs } of evaluated) {
    const breakAt = cs.find((s) => s.status !== 'Passed');
    const n = (x: Status) => cs.filter((s) => s.status === x).length;
    add(
      chain.id,
      chain.name,
      [...new Set(chain.steps.map((x) => x.tc.slice(7, 9)))].join(', '),
      cs.length,
      n('Passed'),
      n('Failed'),
      n('Blocked'),
      n('Not Run'),
      !breakAt ? 'Passed' : breakAt.status === 'Not Run' ? 'Not Run' : `${breakAt.status} at step ${breakAt.n}`,
      breakAt ? `Step ${breakAt.n} ${breakAt.tc} (${breakAt.status}): ${breakAt.causes.filter((c) => !NON_STOPPING.has(c)).join('; ')}` : '—',
      [...new Set(cs.flatMap((s) => (s.status === 'Passed' ? [] : s.causes.filter((c) => !NON_STOPPING.has(c)))))].join('; ') || 'none',
      [...new Set(cs.flatMap((s) => s.causes.filter((c) => NON_STOPPING.has(c))))].join('; ') || 'none',
      chain.practice ?? '',
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
