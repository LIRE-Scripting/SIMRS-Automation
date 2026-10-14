/**
 * Blockers found while automating, in the columns of
 * 00-blockers-checklist-linked.xlsx | Checklist and numbered after its last
 * row (16). The workbook is not edited (rule 7 of the brief): this list is
 * the proposal to add to it, rendered into docs/qa/blockers-found.md by
 * `npm run qa:inventory`.
 *
 * What counts as a blocker follows the checklist's own entries: a missing
 * function or missing data that stops a step from being run at all (e.g.
 * blocker 9 "Mark as alive cannot be reached", blocker 10 "Saved items are
 * listed nowhere"). A step that runs but answers differently from the
 * workbook is a deviation (qa.deviation), not a blocker.
 *
 * A test case listed without steps is declared fixme (plan.ts). A test case
 * listed with steps runs; those steps are marked with qa.blocked(step, no).
 */
export interface FoundBlocker {
  no: number;
  blocker: string;
  category: 'Function' | 'Data' | 'Data + Function';
  scope: string;
  cause: string;
  fix: string;
  who: string;
  howFound: string;
  testCases: { id: string; steps?: number[] }[];
}

export const FOUND_BLOCKERS: FoundBlocker[] = [
  {
    no: 17,
    blocker: 'Book settings: a quota or open-hours row cannot be switched to "Unit"',
    category: 'Function',
    scope: '01 Ambulatory Care\nAppointments, /registration/appointments, dialog "Book settings", sections Daily quota and Open hours',
    cause:
      'Choosing "Unit" in the first list of a row leaves it on "Consultant" (new and existing rows, mouse and keyboard; seen 2026-10-14 with rs.admin2 on Podomoro). ' +
      'The second list then offers users only, so UNIT-1 "QA Ruang Tindakan" gets no quota and no open hours, and a unit can never be booked.',
    fix: '1. Fix the kind list of the quota and open-hours rows.\n2. Run TC-APP001-011, 013, 018, 044 and 049 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 01 Ambulatory Care)',
    testCases: [
      { id: 'TC-APP001-011', steps: [3, 4] },
      { id: 'TC-APP001-013', steps: [2, 3, 4] },
      { id: 'TC-APP001-018', steps: [4] },
      { id: 'TC-APP001-044', steps: [4] },
      { id: 'TC-APP001-049', steps: [1] },
    ],
  },
  {
    no: 18,
    blocker: 'More than 3 bookings on one day cannot be made with the shared Book settings',
    category: 'Data',
    scope:
      '01 Ambulatory Care\nAppointments, /registration/appointments: Schedule list paging, Calendar and OPD calendar "+" counts\n' +
      '00-test-data.xlsx | Catalogue, rows 16 and 17 (Book settings, D-day)',
    cause:
      'TC-APP001-014 needs more than 10 appointments on D-day and TC-APP001-015 more than four. The shared Book settings give a daily quota to DR-1 (3) and UNIT-1 (2) only; ' +
      'DR-2 has no quota, and UNIT-1 cannot be set (blocker 17). A Monday therefore holds at most 3 bookings (5 once blocker 17 is fixed).',
    fix: '1. Add to the shared data a quota that allows more than 10 bookings a day (for example DR-2 = 10), or name the days to use.\n2. Run TC-APP001-014 and 015 again.',
    who: 'Requester (test data), then Tester',
    howFound: 'Workbook data checked against the site (automation of 01 Ambulatory Care)',
    testCases: [
      { id: 'TC-APP001-014', steps: [2, 6] },
      { id: 'TC-APP001-015', steps: [2, 4] },
    ],
  },
  {
    no: 19,
    blocker: 'A patient cannot be marked deceased',
    category: 'Function',
    scope: '01 Ambulatory Care\nRegistered Patients, /registration/patients, details dialog (buttons Consent, Renew, Close)',
    cause:
      'Nothing on Registered Patients records a death (no edit, no "deceased" action; TC-APP001-039 step 3). The precondition "a patient marked deceased" of ' +
      'TC-APP001-076 cannot be made, so the refusal of "Renew" for a deceased patient cannot be checked.',
    fix: '1. Name the screen that records a death (another module?), or add it.\n2. Run TC-APP001-076.',
    who: 'Product owner, then Development',
    howFound: 'Seen on the site (automation of 01 Ambulatory Care)',
    testCases: [{ id: 'TC-APP001-076' }],
  },
  {
    no: 20,
    blocker: 'A registered patient cannot be edited',
    category: 'Function',
    scope: '01 Ambulatory Care\nRegistered Patients, /registration/patients, details dialog',
    cause: 'The details dialog offers Consent, Renew and Close only; there is no edit. A wrong date of birth cannot be corrected, so the correction and its audit entry cannot be checked.',
    fix: '1. Add an edit to the details dialog (or name where corrections are made).\n2. Run TC-APP001-039 again.',
    who: 'Product owner, then Development',
    howFound: 'Seen on the site (automation of 01 Ambulatory Care)',
    testCases: [{ id: 'TC-APP001-039', steps: [2] }],
  },
];

export function foundBlocker(no: number): FoundBlocker {
  const b = FOUND_BLOCKERS.find((x) => x.no === no);
  if (!b) throw new Error(`No found blocker ${no} in lib/qa-data/found-blockers.ts`);
  return b;
}

/** Found blockers that stop a whole test case. */
export function foundBlockersOf(testCaseId: string): FoundBlocker[] {
  return FOUND_BLOCKERS.filter((b) => b.testCases.some((t) => t.id === testCaseId && !t.steps));
}
