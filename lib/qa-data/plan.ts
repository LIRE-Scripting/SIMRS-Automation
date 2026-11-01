import { foundBlockersOf } from './found-blockers';
import { blockers, blockersOfJourney, prerequisites, type TestCaseRef } from './index';

/**
 * How a test case is run, derived only from workbook fields and the answers
 * recorded in docs/qa/open-questions.md ("Answers of 2026-10-14").
 */
export type Disposition = 'automate' | 'fixme' | 'skip';

export interface Plan {
  disposition: Disposition;
  reasons: string[];
  /** U1 (one branch, Podomoro) or U2 (All branches); null = not signed in. */
  user: 'U1' | 'U2' | null;
  /** Branch of the journey, as in 00-prerequisites.xlsx | Journeys. */
  branch: 'Podomoro' | 'All branches' | 'Two branches';
  /** Every step's Final State says "No data was changed". */
  readOnly: boolean;
  /** Needs a record made by another application (serial chain). */
  needsRecordFrom: string | null;
  /** Steps whose Expected Result has a "TBD": only the stated part is asserted (Q8). */
  partialSteps: number[];
  tags: string[];
}

/**
 * Blockers that do not turn a test case into fixme:
 * 1  sign-in redirect: worked around in LoginPage.signIn (target /apps, per the blocker text)
 * 14 records from another application: handled as a chain (needsRecordFrom)
 * 15 go-ahead to save: handled by QA_ALLOW_WRITES (Q1)
 * 16 only the admin account was used: a condition of the earlier run
 * 5  "All branches" lists: only for journeys whose Branch is "All branches" (Q12)
 */
const NON_BLOCKING = new Set([1, 14, 15, 16]);

/**
 * The users a test case needs when its own steps need fewer than its journey
 * names (00-prerequisites.xlsx | Journeys lists the users of every case of the
 * journey). Seen on the site 2026-11-01: a deep link is opened signed out;
 * a write without the write privilege is tried by U3 (qa.staff, no
 * privilege); the Audit Log (/id/audit) and the approval chains of Workflow
 * (Process Definitions) are open to the administrator U1, so the audit and
 * chain cases need no platform superadmin (U10).
 */
function usersOfCase(ref: TestCaseRef): string[] | null {
  const s = ref.testCase.scenario;
  if (s === 'Deep link without a session') return ['Not signed in'];
  if (s === 'Write without the write privilege') return ['U1', 'U3'];
  if (/^Audit trail of /.test(s) || s === "History of a patient's beds") return ['U1'];
  // The "Superadmin" of these journeys switches or edits an approval chain in Workflow: U1 does it (Process Definitions, "Ubah rantai").
  if (['Discharge when the approval chain is missing or switched off', 'Approval chain switched off or missing', 'Approval chain changed while purchase orders wait'].includes(s)) return ['U1'];
  return null;
}

/**
 * Journeys marked "Automation Candidate = No" that are run by simulation
 * (the user's decision of 2026-11-01, "bisa di simulasi"): the print preview
 * is the page under the print media type, and "Scans the printed barcode" is
 * the barcode read from its bars (lib/barcode.ts); the camp journey needs no
 * device at all.
 */
const SIMULATED = new Set(['TC-APP001-004', 'TC-APP004-009', 'TC-APP006-011', 'TC-APP011-002']);

/**
 * Checklist blockers that stop a test case whose journey the checklist does not
 * link (00-blockers-checklist-linked.xlsx links journeys only). Blocker 4,
 * "Tenants and Entitlements answer HTTP 500 for the hospital administrator":
 * seen 2026-11-01 they answer "missing required privilege" for U1 and U2, so
 * no tenant without a licence can be made or reached; the cases "Tenant without
 * the licence" of every workbook, the pharmacy-only tenant, the small edition
 * and the licences of Hospital Accounts wait for it (with U10).
 */
const CHECKLIST_EXTRA: Record<number, string[]> = {
  4: [
  'TC-APP001-064', 'TC-APP001-088', 'TC-APP002-032', 'TC-APP003-038', 'TC-APP003-062', 'TC-APP004-052',
  'TC-APP004-089', 'TC-APP005-047', 'TC-APP005-048', 'TC-APP005-077', 'TC-APP006-066', 'TC-APP006-079',
  'TC-APP007-035', 'TC-APP007-063', 'TC-APP008-021', 'TC-APP008-052', 'TC-APP009-033', 'TC-APP009-061',
  'TC-APP010-036', 'TC-APP010-063', 'TC-APP011-027', 'TC-APP011-053', 'TC-APP012-021', 'TC-APP012-034',
  'TC-APP013-030', 'TC-APP013-061', 'TC-APP014-050', 'TC-APP014-073', 'TC-APP014-080', 'TC-APP015-021',
  'TC-APP015-068', 'TC-APP016-025', 'TC-APP016-048', 'TC-APP017-024', 'TC-APP017-062', 'TC-APP018-027',
  'TC-APP019-031', 'TC-APP019-127', 'TC-APP020-063', 'TC-APP021-056', 'TC-APP022-032', 'TC-APP023-029',
  'TC-APP024-021', 'TC-APP025-020', 'TC-APP026-019', 'TC-APP027-019',
  ],
};

/**
 * Checklist blockers seen resolved on the site for a journey (re-checked 2026-11-01): the journey runs again.
 * 13 "Set-up missing on the branch": the Reorder list of Podomoro lists items (JRN-APP009-043), and Punch saves for
 * a user linked to an employee, U7 (JRN-APP010-044).
 */
const CHECKLIST_RESOLVED: Record<string, number[]> = {
  'JRN-APP009-043': [13],
  'JRN-APP010-044': [13],
  // Budget allocation, fund release, fund withdrawal: an approved request is allocated, approved and posted on Podomoro since 2026-11-01.
  'JRN-APP020-010': [13],
  'JRN-APP020-011': [13],
  'JRN-APP020-012': [13],
  // Bowie Dick: the daily test of an autoclave is saved on Podomoro since 2026-11-01.
  'JRN-APP021-006': [13],
};

export function planFor(ref: TestCaseRef): Plan {
  const { module, testCase, journey, needs } = ref;
  const users = usersOfCase(ref) ?? needs.usersNeeded.split(',').map((u) => u.trim());
  const signedOut = users.some((u) => /not signed in/i.test(u)) && !users.some((u) => /^U\d+$/.test(u));
  const user: Plan['user'] = signedOut ? null : users.includes('U2') || needs.branch === 'All branches' ? 'U2' : 'U1';
  const readOnly = /No data was changed/.test(testCase.finalState ?? '');
  const partialSteps = testCase.steps.filter((s) => s.expected.includes('TBD')).map((s) => s.step);

  const reasons: string[] = [];
  let disposition: Disposition = 'automate';
  if (journey.automationCandidate === 'No' && !SIMULATED.has(testCase.id)) {
    disposition = 'skip';
    reasons.push(`${module.source} | Journeys | row ${journey.row}: Automation Candidate = No`);
  } else {
    const extra = Object.entries(CHECKLIST_EXTRA).filter(([, ids]) => ids.includes(testCase.id)).map(([no]) => Number(no));
    const linked = blockersOfJourney(journey.id);
    const resolved = CHECKLIST_RESOLVED[journey.id] ?? [];
    for (const b of [...linked, ...blockers().blockers.filter((x) => extra.includes(x.no) && !linked.some((l) => l.no === x.no))].filter((x) => !resolved.includes(x.no))) {
      if (NON_BLOCKING.has(b.no)) continue;
      if (b.no === 5 && needs.branch !== 'All branches') continue;
      reasons.push(`Blocker ${b.no}: ${b.blocker} (00-blockers-checklist-linked.xlsx | Checklist | row ${b.row})`);
    }
    for (const b of foundBlockersOf(testCase.id)) {
      reasons.push(`Blocker ${b.no} (found by automation, docs/qa/blockers-found.md): ${b.blocker}`);
    }
    // "Needs Evaluation" is automated since 2026-10-29 (the user's decision, open question Q10); a blocker or a
    // missing user still keeps the test case fixme. QA_NEEDS_EVALUATION=fixme turns it back.
    if (journey.automationCandidate === 'Needs Evaluation' && process.env.QA_NEEDS_EVALUATION === 'fixme') {
      reasons.push(`${module.source} | Journeys | row ${journey.row}: Automation Candidate = Needs Evaluation`);
    }
    const prepared = new Map(prerequisites().users.map((u) => [u.key, u]));
    for (const u of users.filter((x) => /^U\d+$/.test(x))) {
      const p = prepared.get(u);
      if (p && p.prepared !== 'Done') {
        reasons.push(`Needs user ${u} "${p.user}" (00-prerequisites.xlsx | Users | row ${p.row}: ${p.statusOnSite})`);
      }
    }
    if (reasons.length) disposition = 'fixme';
  }

  const tags = [
    `@${module.slug}`,
    `@${testCase.testType.toLowerCase()}`,
    `@${testCase.priority.toLowerCase()}`,
    '@regression',
    ...(testCase.priority === 'Critical' && testCase.testType === 'Positive' ? ['@smoke'] : []),
    ...users.filter((u) => /^U\d+$/.test(u)).map((u) => `@${u.toLowerCase()}`),
  ];

  return {
    disposition,
    reasons,
    user,
    branch: needs.branch,
    readOnly,
    needsRecordFrom: needs.needsRecordFrom,
    partialSteps,
    tags: [...new Set(tags)],
  };
}

/** The traceability tag every test title carries (rule 2 of the brief). */
export function traceTag(ref: TestCaseRef): string {
  const [a, b] = ref.testCase.rows;
  const rows = a === b ? `row ${a}` : `rows ${a}-${b}`;
  return `[${ref.module.source} | Steps | ${rows} | ${ref.testCase.id}]`;
}

export function journeyTag(ref: TestCaseRef): string {
  return `[${ref.module.source} | Journeys | row ${ref.journey.row} | ${ref.journey.id}]`;
}
