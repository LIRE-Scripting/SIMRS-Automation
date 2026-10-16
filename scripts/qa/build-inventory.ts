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
  RO: 'automate (read-only)',
  WRITE: 'automate (saves; needs QA_ALLOW_WRITES)',
  CHAIN: 'automate (chain; needs a record from another app)',
  FIXME: 'fixme',
  SKIP: 'skip',
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
  return na && fs.existsSync(path.join(ROOT, na)) ? `\`${na}\`` : '`(not declared)`';
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
      tc.id, tc.journeyId, tc.scenario, tc.testType, tc.priority,
      traceTag(ref).replace(/^\[|\]$/g, '').split(' | ')[2], ref.journey.row,
      specOf(tc.id),
      `${plan.user ?? 'signed out'} / ${plan.branch}`,
      KIND_TEXT[k],
      [...plan.reasons, ...(plan.partialSteps.length ? [`TBD in step(s) ${plan.partialSteps.join(', ')}: stated part only (Q8)`] : [])].join(' / '),
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
      `# Traceability: ${m.source}`,
      '',
      `Generated by \`npm run qa:inventory\` from \`reference/${m.source}\`. Do not edit by hand.`,
      '',
      'Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.',
      '',
      ...table(['TC ID', 'Journey ID', 'Scenario', 'Type', 'Prio', 'Steps rows', 'Journeys row', 'Spec', 'User / branch', 'Disposition', 'Reason'], rows),
      '',
      '## Counts',
      '',
      ...(Object.keys(counts) as Kind[]).map((k) => `- ${KIND_TEXT[k]}: ${counts[k]}`),
      `- test cases with a "TBD" step (asserted partially): ${partial}`,
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
  '# Test inventory',
  '',
  'Generated by `npm run qa:inventory` from `reference/*.xlsx` (via `npm run qa:data`). Do not edit by hand.',
  'Questions, answers and gaps: [open-questions.md](open-questions.md). Row-level lists: [_generated-open-items.md](_generated-open-items.md).',
  '',
  '## 1. Source files',
  '',
  ...table(['File', 'Purpose', 'Sheets (data rows)'], [
    ['00-prerequisites.xlsx', 'Users/roles, set-up, per-journey needs', `Users (${pre.users.length}), Role accounts (${pre.roleAccounts.length}), Set-up and data (${pre.setup.length}), Journeys (${pre.journeys.length})`],
    ['00-test-data.xlsx', 'Data rules, catalogue of named records, per-journey data', `Overview (${td.overview.length}), Data catalogue (${td.catalogue.length}), Journeys (${td.journeys.length})`],
    ['00-blockers-checklist-linked.xlsx', 'Known blockers and their journeys', `Checklist (${bl.blockers.length}), Journey links (${bl.links.length})`],
  ]),
  '',
  'The 27 module workbooks share the sheets Summary, Journeys (25 columns) and Steps (24 columns) with identical headers; `npm run qa:data` fails when a header differs.',
  '',
  ...table(
    ['File', 'App', 'Address (Summary)', 'Licence; write right', 'Journeys', 'Test cases', 'Steps'],
    modules().map((m) => [
      `[${m.source}](traceability/${m.slug}.md)`, `${m.appId} ${m.appName}`, m.summary.Address,
      m.summary['Licence and write privilege'], m.journeys.length, m.testCases.length,
      m.testCases.reduce((k, t) => k + t.steps.length, 0),
    ]),
  ),
  `| **Total** | | | | **${allJourneys}** | **${allTcs}** | **${allSteps}** |`,
  '',
  '## 2. Prerequisites (00-prerequisites.xlsx)',
  '',
  '### Users',
  '',
  ...table(['Key', 'User', 'Branch', 'Rights', 'Journeys', 'Status on site', 'Prepared'],
    pre.users.map((u) => [u.key, u.user, u.branch, u.rights, u.journeys, u.statusOnSite, u.prepared])),
  '',
  'Password: shared by all accounts, read from `QA_PASSWORD` in `.env` (Q2). Sessions: `tests/e2e/auth.setup.ts` → `.auth/U1.json`, `.auth/U2.json`.',
  '',
  '### Working role per application (U8)',
  '',
  ...table(['Application', 'Working role', 'Write right', 'Journeys (stated)', 'Account', 'Prepared'],
    pre.roleAccounts.map((r) => [r.application, r.workingRole, r.writeRight, r.journeys, r.login ?? '—', r.prepared])),
  '',
  '### Set-up and data',
  '',
  ...table(['No', 'Prerequisite', 'Applications', 'Journeys', 'What to prepare', 'Who', 'Status'],
    pre.setup.map((r) => [r.no, r.prerequisite, r.applications, r.journeys, r.whatToPrepare, r.who, r.status])),
  '',
  '## 3. Test data (00-test-data.xlsx)',
  '',
  '### Rules',
  '',
  ...td.overview.filter((r) => typeof r.rule === 'string' && r.row <= 12).map((r) => `- **${cell(r.topic)}**: ${cell(r.rule)}`),
  '- **Applied (Q5)**: names of created records use the prefix "QA-" ("X Pasien OT 01" → "QA-Pasien OT 01") plus a run id (`lib/qa-data/names.ts`).',
  '',
  '### Dataset → journeys',
  '',
  ...table(['Row', 'Application', 'Short name', 'What it is', 'Kind', 'Journeys', 'Journey IDs (from sheet Journeys)', 'Status'],
    td.catalogue.map((c) => {
      const ids = td.journeys
        .filter((j) => j.application === c.application && (j.shortNamesUsed ?? '').split(';').map((s) => s.trim()).includes(c.shortName))
        .map((j) => j.journeyId.replace('JRN-APP', ''));
      return [c.row, c.application, c.shortName, cut(c.what, 160), c.kind, c.journeys, ids.join(', ') || '—', c.status];
    })),
  '',
  'Journey IDs are shortened: `001-003` = `JRN-APP001-003`.',
  '',
  '## 4. Modules and features',
  '',
  ...modules().map((m) => {
    const f = new Map<string, number>();
    for (const t of m.testCases) f.set(t.feature, (f.get(t.feature) ?? 0) + 1);
    return `- **${m.slug.slice(0, 2)} ${m.appName}**: ${[...f].map(([k, v]) => `${k} (${v} TC)`).join('; ')}`;
  }),
  '',
  '## 5. Plan per test case',
  '',
  '- Specs: `tests/modules/<NN-module>/<feature>.spec.ts`, one `qaTest(<TC ID>)` per test case (`fixtures/e2e.ts`); the file of each case is in its row above; Excel steps become `qa.step(n)`; assertions follow the Expected Result column, adjusted to the live site where the workbook contradicts it (C2).',
  '- User: U2 when the journey needs U2 or its Branch is "All branches", otherwise U1 (Podomoro); signed out for "None (not signed in)".',
  '- Tags: `@<module>`, `@<test type>`, `@<priority>`, `@regression`, `@smoke` (Critical + Positive), `@u<n>`.',
  '- Disposition (lib/qa-data/plan.ts): skip = Automation Candidate No; fixme = specific blocker (5 only for "All branches" journeys), Needs Evaluation, or a user U3–U10 not prepared; otherwise automate. Saving test cases run only with `QA_ALLOW_WRITES=1` (Q1).',
  '',
  ...table(['Module', 'TCs', 'read-only', 'saves', 'chain', 'fixme', 'skip', 'with TBD step'],
    perModule.map((m) => [`[${m.app}](traceability/${m.slug}.md)`, m.tcs, m.counts.RO, m.counts.WRITE, m.counts.CHAIN, m.counts.FIXME, m.counts.SKIP, m.partial])),
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
const g: string[] = ['# Generated open items', '', 'Generated by `npm run qa:inventory`. Row numbers are Excel rows.', ''];
const section = (title: string, head: string[], rows: unknown[][]) => g.push(`## ${title} (${rows.length})`, '', ...table(head, rows), '');
section('A. Journeys in the 00-files without a row in any module workbook', ['00-prerequisites Journeys row', 'Journey ID', 'Name', 'Users', 'Branch', 'Preconditions'],
  missing.map((j) => [j.row, j.journeyId, j.name, j.usersNeeded, j.branch, j.preconditions]));
section('B. Steps whose Expected Result contains "TBD" (asserted partially, Q8)', ['File', 'Steps row', 'TC', 'Step', 'Expected Result'], tbdRows);
section('C. Expected Results that describe "Current behaviour"', ['File', 'Steps row', 'TC', 'Step', 'Expected Result'], currentBehaviour);
section('D. Quoted UI texts the workbook script did not find on the site', ['File', 'Steps row', 'TC', 'Step', 'Texts not found'], notFound);
section('E. Journeys with Verification Status = Discrepancy Found', ['File', 'Journeys row', 'Journey', 'Name'], discrepancies);
section('F. Journeys with Automation Candidate = Needs Evaluation', ['File', 'Journeys row', 'Journey', 'Name'], needsEval);
section('G. Role accounts "Journeys" vs journeys in the workbook', ['Role accounts row', 'Application', 'Stated', 'In workbook'], roleMismatch);
fs.writeFileSync(path.join(OUT, '_generated-open-items.md'), g.join('\n'));

// ------------------------------------------------------------ blockers found
const fb: string[] = [
  '# Blockers found while automating',
  '',
  'Generated by `npm run qa:inventory` from `lib/qa-data/found-blockers.ts`. Do not edit by hand.',
  '',
  'Proposed rows for `reference/00-blockers-checklist-linked.xlsx` (not edited by the automation), numbered after its last blocker',
  `(${Math.max(...bl.blockers.map((b) => b.no))}). The checklist itself links no journey of 01 Ambulatory Care.`,
  'A test case listed without steps is `fixme`; listed steps are marked `blocker` in the report and never count as passed.',
  '',
  ...table(
    ['No', 'Blocker', 'Category', 'Where', 'Test cases (steps)', 'Why it blocks', 'What to do', 'Who', 'How found'],
    FOUND_BLOCKERS.map((b) => [
      b.no, b.blocker, b.category, b.scope,
      b.testCases.map((t) => `${t.id}${t.steps ? ` (step ${t.steps.join(', ')})` : ' (whole test case)'}`).join('; '),
      b.cause, b.fix, b.who, b.howFound,
    ]),
  ),
  '',
];
fs.writeFileSync(path.join(OUT, 'blockers-found.md'), fb.join('\n'));

console.log(`test cases ${allTcs}:`, totals);
