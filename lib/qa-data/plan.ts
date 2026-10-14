import { foundBlockersOf } from './found-blockers';
import { blockersOfJourney, prerequisites, type TestCaseRef } from './index';

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

export function planFor(ref: TestCaseRef): Plan {
  const { module, testCase, journey, needs } = ref;
  const users = needs.usersNeeded.split(',').map((u) => u.trim());
  const signedOut = /not signed in/i.test(needs.usersNeeded) && !users.some((u) => /^U\d+$/.test(u));
  const user: Plan['user'] = signedOut ? null : users.includes('U2') || needs.branch === 'All branches' ? 'U2' : 'U1';
  const readOnly = /No data was changed/.test(testCase.finalState ?? '');
  const partialSteps = testCase.steps.filter((s) => s.expected.includes('TBD')).map((s) => s.step);

  const reasons: string[] = [];
  let disposition: Disposition = 'automate';
  if (journey.automationCandidate === 'No') {
    disposition = 'skip';
    reasons.push(`${module.source} | Journeys | row ${journey.row}: Automation Candidate = No`);
  } else {
    for (const b of blockersOfJourney(journey.id)) {
      if (NON_BLOCKING.has(b.no)) continue;
      if (b.no === 5 && needs.branch !== 'All branches') continue;
      reasons.push(`Blocker ${b.no}: ${b.blocker} (00-blockers-checklist-linked.xlsx | Checklist | row ${b.row})`);
    }
    for (const b of foundBlockersOf(testCase.id)) {
      reasons.push(`Blocker ${b.no} (found by automation, docs/qa/blockers-found.md): ${b.blocker}`);
    }
    if (journey.automationCandidate === 'Needs Evaluation') {
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
