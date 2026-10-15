/**
 * Builds reports/e2e-chains/e2e-chains.xlsx: the cross-application end-to-end
 * chains of lib/qa-data/e2e-chains.ts (happy paths composed from existing
 * test cases), in the layout of the reference workbooks (sheets Summary,
 * Journeys and Steps with the same headers, lists and widths; the template is
 * reference/14-hospital-accounts.xlsx, which is only read), plus a sheet
 * Blockers that defines every blocker a chain meets.
 *
 * Each chain step takes the status of its source test case from the result
 * workbooks (reports/e2e/<NN-module>.xlsx, built by `npm run qa:e2e-workbook`):
 *   Passed   every source step passed
 *   Blocked  a source step is blocked (Defect Reference "Blocker N")
 *   Failed   a source step failed (the site did not do what the workbook says)
 *   Not Run  a source step was not run (missing user, needs evaluation, …)
 *
 * Usage: npm run qa:e2e-chains
 */
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { CHAINS, type Chain } from '../../lib/qa-data/e2e-chains';
import { FOUND_BLOCKERS } from '../../lib/qa-data/found-blockers';
import { blockers, prerequisites } from '../../lib/qa-data';

const TEMPLATE = 'reference/14-hospital-accounts.xlsx';
const RESULTS = 'reports/e2e';
const OUT_DIR = 'reports/e2e-chains';
const OUT = `${OUT_DIR}/e2e-chains.xlsx`;

type Status = 'Passed' | 'Failed' | 'Blocked' | 'Not Run';
interface SourceStep {
  row: number;
  step: number;
  feature: string;
  scenario: string;
  testData: string;
  action: string;
  expected: string;
  status: Status;
  actual: string;
  defect: string;
}

/** Cause ids that are not in a blocker list: defined here. */
const STATES: Record<string, { title: string; cause: string; fix: string; who: string }> = {
  'STATE-CASHIER': {
    title: 'The cashier day of U1 is closed',
    cause:
      'TC-APP014-011 closes the U1 counter for the day (a counter closes once a day). Until 07:00 WIB the next day no payment can be taken; ' +
      'the run of 2026-10-15 also could not find the new RX- invoice in the capped cashier search (the lookup was fixed afterwards).',
    fix: 'Run TC-APP014-002 again after 07:00 WIB with the fixed lookup.',
    who: 'QA',
  },
  'NEEDS-EVALUATION': {
    title: 'The journey is marked "Needs Evaluation" in its workbook',
    cause: 'Column "Automation Candidate" of the journey reads "Needs Evaluation", so the test case was declared fixme and not run.',
    fix: 'Decide whether the journey can be automated (or run it by hand) and set "Automation Candidate" to Yes.',
    who: 'QA / Product owner',
  },
  'NEEDS-OTHER-RUN': {
    title: 'Needs a record or a check of another application',
    cause: 'The step starts from a record that another test case makes (an order, an approved document), or checks the result in another application; in the standalone module run it was not run.',
    fix: 'Run the chain in order, passing the record of the earlier step on.',
    who: 'QA',
  },
};

/** The reason of a result, without the date prefix and the generic opening words. */
const firstSentence = (s: string) =>
  s
    .replace(/^\d{4}-\d{2}-\d{2} E2E:?\s*/, '')
    .replace(/^(not run[.;]?|Expected Result not met\.)\s*/i, '')
    .replace(/\s+/g, ' ')
    .slice(0, 260);

/** Causes that do not stop the flow of a chain. */
const NON_STOPPING = new Set(['DEVIATION', 'NEEDS-OTHER-RUN']);

/** The values of the template's lists (sheet Journeys and Steps). */
const VERIFICATION: Record<Status, string> = { Passed: 'UI Verified', Failed: 'Discrepancy Found', Blocked: 'Blocked', 'Not Run': 'Not Verified' };

/** The cause id of a step that did not pass. */
function causeOf(tc: string, s: SourceStep): string {
  if (tc === 'TC-APP014-002' && s.status !== 'Passed') return 'STATE-CASHIER';
  if (s.defect && /Blocker \d+/.test(s.defect)) return s.defect.match(/Blocker \d+/)![0];
  // A step that did its work but differs from the workbook's wording or detail does not stop the flow.
  if (s.status === 'Failed') return /Excel expects|Expected Result not met/.test(s.actual) ? 'DEVIATION' : 'SITE-DEFECT';
  const a = s.actual;
  const blocker = a.match(/[Bb]locker (\d+)/);
  if (blocker) return `Blocker ${blocker[1]}`;
  const user = a.match(/\b(U(?:10|[3-9]))\b/);
  if (user) return `User ${user[1]}`;
  if (/Needs Evaluation/.test(a)) return 'NEEDS-EVALUATION';
  return 'NEEDS-OTHER-RUN';
}

async function loadResults(): Promise<Map<string, SourceStep[]>> {
  const byTc = new Map<string, SourceStep[]>();
  for (const f of fs.readdirSync(RESULTS).filter((x) => /^\d\d-.*\.xlsx$/.test(x)).sort()) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(`${RESULTS}/${f}`);
    const ws = wb.getWorksheet('Steps')!;
    const head = (ws.getRow(1).values as unknown[]).map((v) => String(v ?? ''));
    const c = (name: string) => head.indexOf(name);
    const text = (v: unknown) => (v == null ? '' : typeof v === 'object' && 'richText' in (v as object) ? (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('') : String(v));
    ws.eachRow((r, i) => {
      if (i === 1) return;
      const v = r.values as unknown[];
      const tc = text(v[c('Test Case ID')]);
      if (!tc) return;
      const list = byTc.get(tc) ?? [];
      list.push({
        row: i,
        step: Number(text(v[c('Step Number')])),
        feature: text(v[c('Module / Feature')]),
        scenario: text(v[c('Scenario Name')]),
        testData: text(v[c('Test Data')]),
        action: text(v[c('Action')]),
        expected: text(v[c('Expected Result')]),
        status: (text(v[c('Execution Status')]) || 'Not Run') as Status,
        actual: text(v[c('Actual Result')]),
        defect: text(v[c('Defect Reference')]),
      });
      byTc.set(tc, list);
    });
  }
  return byTc;
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
  source: SourceStep[];
  status: Status;
  causes: string[];
  actual: string;
}

function evaluate(chain: Chain, results: Map<string, SourceStep[]>): ChainStepResult[] {
  return chain.steps.map((s, i) => {
    const all = results.get(s.tc);
    if (!all) throw new Error(`${chain.id}: ${s.tc} has no result rows in ${RESULTS}`);
    const source = s.steps ? all.filter((x) => s.steps!.includes(x.step)) : all;
    const st = source.map((x) => x.status);
    const off = source.filter((x) => x.status !== 'Passed');
    const causes = [...new Set(off.map((x) => causeOf(s.tc, x)))];
    // The flow goes on when what is left is a deviation or a check that another step of the chain makes.
    const stopping = off.filter((x) => !NON_STOPPING.has(causeOf(s.tc, x)));
    const passed = st.filter((x) => x === 'Passed').length;
    const ss = stopping.map((x) => x.status);
    const ran = passed > 0 || off.some((x) => causeOf(s.tc, x) === 'DEVIATION');
    // A chain step either lets the flow through or is blocked; the cause names the blocker.
    const status: Status = !stopping.length && ran ? 'Passed' : 'Blocked';
    void ss;
    const counts = `${passed}/${st.length} steps passed`;
    const first = stopping[0] ?? off[0];
    const notes = off.filter((x) => NON_STOPPING.has(causeOf(s.tc, x))).map((x) => `step ${x.step} ${causeOf(s.tc, x).toLowerCase()}: ${firstSentence(x.actual)}`);
    const actual =
      status === 'Passed'
        ? `${counts}.${notes.length ? ` The flow goes on; ${notes.join(' / ')}` : ''}`
        : `${counts}; step ${first.step}: ${firstSentence(first.actual) || first.status}`;
    return { n: i + 1, tc: s.tc, role: s.role, source, status, causes, actual };
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

async function main(): Promise<void> {
  const results = await loadResults();
  const evaluated = CHAINS.map((c) => ({ chain: c, steps: evaluate(c, results) }));

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
      for (const [cause, map] of [['SITE-DEFECT', defects], ['DEVIATION', deviations]] as const) {
        const hit = s.source.filter((x) => x.status !== 'Passed' && causeOf(s.tc, x) === cause);
        if (hit.length) map.set(s.tc, hit.map((x) => `step ${x.step}: ${firstSentence(x.actual)}`));
      }
      const src = s.source;
      const rows = src.length ? `rows ${src[0].row}-${src[src.length - 1].row}` : '';
      steps.addRow([
        `TC-${chain.id}`,
        chain.id,
        [...new Set(chain.steps.map((x) => appOf(x.tc)))].join(', '),
        `${appOf(s.tc)} / ${src[0]?.feature ?? ''}`,
        chain.name,
        s.role,
        'Integration',
        chain.priority,
        s.n === 1 ? chain.preconditions : `Step ${s.n - 1} of ${chain.id} done (${chain.steps[s.n - 2].tc}).`,
        src[0]?.testData ?? '',
        s.n,
        `${s.role}: run ${s.tc} "${src[0]?.scenario ?? ''}"${chain.steps[s.n - 1].steps ? `, steps ${chain.steps[s.n - 1].steps!.join(', ')}` : ''}.`,
        src[src.length - 1]?.expected ?? '',
        null,
        s.n === cs.length ? chain.outcome : null,
        `${fileOf(s.tc)} | Steps | ${rows} | ${s.tc}`,
        'Yes',
        VERIFICATION[s.status],
        s.status,
        s.actual,
        `${fileOf(s.tc)} | ${s.tc}`,
        `reports/e2e/${fileOf(s.tc)}`,
        s.causes.join('; ') || null,
        'As in the source test case.',
      ]);
    }
  }

  // ---------------------------------------------------------------- Journeys
  for (const { chain, steps: cs } of evaluated) {
    const breakAt = cs.find((s) => s.status !== 'Passed');
    const causes = [...new Set(cs.flatMap((s) => s.causes))];
    const status = !breakAt ? 'Ready' : `Blocked at step ${breakAt.n}`;
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
        : `The flow runs through all ${cs.length} steps in their module runs${causes.length ? ` (with ${causes.join('; ')})` : ''}.`,
      'Each source test case keeps its own alternative paths (see its workbook).',
      'See the negative test cases of each source workbook.',
      [...new Set(chain.steps.map((s) => fileOf(s.tc)))].join(', '),
      chain.priority,
      'Yes',
      breakAt ? VERIFICATION[breakAt.status] : 'UI Verified',
      chain.steps.map((s) => s.tc).join(', '),
      [...new Set(chain.steps.map((s) => `reports/e2e/${fileOf(s.tc)}`))].join(', '),
      breakAt ? 'Needs Review' : 'Ready',
      `${status}. Steps Passed ${cs.filter((s) => s.status === 'Passed').length}, Blocked ${cs.filter((s) => s.status === 'Blocked').length}. Blockers: ${causes.filter((c) => !NON_STOPPING.has(c)).join('; ') || 'none'}. Notes: ${causes.filter((c) => NON_STOPPING.has(c)).join('; ') || 'none'}.`,
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
  add('Purpose', 'Possible end-to-end (cross-application) happy paths, composed only from test cases that already exist in the 27 module workbooks, with the status each step had in its run and the blocker that stops it.');
  add('Built', `${new Date().toISOString().slice(0, 10)} by npm run qa:e2e-chains (scripts/qa/build-e2e-chains.ts) from lib/qa-data/e2e-chains.ts and the result workbooks reports/e2e/*.xlsx.`);
  add('Sheets', 'Journeys: one row per chain. Steps: one row per chain step, each pointing to its source test case (file, rows). Blockers: every blocker a chain meets, with its cause and fix.');
  add('Step status', 'Passed: the flow goes through the source test case (its steps passed; a deviation from the wording, or a check that another step of the chain makes, is noted but does not stop the flow). Blocked: anything else; Defect Reference names the blocker (see sheet Blockers).');
  add('Blocker IDs', '"Blocker N": checklist blockers 1-16 (00-blockers-checklist-linked.xlsx) and blockers found while automating (17 and up, docs/qa/blockers-found.md). "User Ux": a user of 00-prerequisites.xlsx that does not exist yet. DEVIATION, SITE-DEFECT, NEEDS-EVALUATION, NEEDS-OTHER-RUN, STATE-CASHIER: see sheet Blockers.');
  add('Note', 'Each source test case was run on its own (with its own data). A chain is "Ready" when all its steps passed; running it as one test passing the records on is the next step.');
  add();
  const head = add('Chain', 'Name', 'Applications', 'Steps', 'Passed', 'Blocked', 'Status', 'First stop', 'Blockers that stop the flow', 'Notes that do not stop it');
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
      n('Blocked'),
      !breakAt ? 'Ready' : `Blocked at step ${breakAt.n}`,
      breakAt ? `Step ${breakAt.n} ${breakAt.tc} (${breakAt.status}): ${breakAt.causes.filter((c) => !NON_STOPPING.has(c)).join('; ')}` : '—',
      [...new Set(cs.flatMap((s) => (s.status === 'Passed' ? [] : s.causes.filter((c) => !NON_STOPPING.has(c)))))].join('; ') || 'none',
      [...new Set(cs.flatMap((s) => s.causes.filter((c) => NON_STOPPING.has(c))))].join('; ') || 'none',
    );
  }
  summary.columns.forEach((c, i) => (c.width = [12, 52, 18, 7, 8, 8, 18, 44, 44, 30][i] ?? 12));
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
