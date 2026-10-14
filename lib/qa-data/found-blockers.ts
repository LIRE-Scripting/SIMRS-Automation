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
    scope:
      '01 Ambulatory Care and 02 Appointment\nAppointments, /registration/appointments and /appointment/schedule, dialog "Book settings", sections Daily quota and Open hours',
    cause:
      'Choosing "Unit" in the first list of a row leaves it on "Consultant" (new and existing rows, mouse and keyboard; seen 2026-10-14 with rs.admin2 on Podomoro). ' +
      'The second list then offers users only, so UNIT-1 "QA Ruang Tindakan" gets no quota and no open hours, and a unit can never be booked.',
    fix: '1. Fix the kind list of the quota and open-hours rows.\n2. Run TC-APP001-011, 013, 018, 044, 049 and TC-APP002-001, 003, 008, 013 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 01 Ambulatory Care)',
    testCases: [
      { id: 'TC-APP001-011', steps: [3, 4] },
      { id: 'TC-APP001-013', steps: [2, 3, 4] },
      { id: 'TC-APP001-018', steps: [4] },
      { id: 'TC-APP001-044', steps: [4] },
      { id: 'TC-APP001-049', steps: [1] },
      { id: 'TC-APP002-001', steps: [3, 4] },
      { id: 'TC-APP002-003', steps: [2, 3, 4] },
      { id: 'TC-APP002-008', steps: [4] },
      { id: 'TC-APP002-013', steps: [1] },
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
      { id: 'TC-APP002-004', steps: [2, 6] },
      { id: 'TC-APP002-005', steps: [2, 4] },
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
  {
    no: 21,
    blocker: 'A placed drug order cannot be cancelled or corrected',
    category: 'Function',
    scope: '03 Patient Care\nConsultation, /clinical/consultation, left pane "Drug orders"',
    cause:
      'Orders are listed under "Drug orders" but have no Cancel or Edit control, and the order tabs have none either. ' +
      'A wrong order stays in the pharmacy queue until it is dispensed, so "Cancels it" (TC-APP003-031 step 2) cannot be done.',
    fix: '1. Add cancel (and correction) of a pending order, or name the screen where it is done.\n2. Run TC-APP003-031 again.',
    who: 'Product owner, then Development',
    howFound: 'Seen on the site (automation of 03 Patient Care)',
    testCases: [{ id: 'TC-APP003-031', steps: [2] }],
  },
  {
    no: 22,
    blocker: 'The drug interaction pairs of the shared data are not on the site',
    category: 'Data',
    scope:
      '03 Patient Care\nConsultation, /clinical/consultation, "Check interactions" (Order and Prescription tabs)\n' +
      '00-test-data.xlsx | Catalogue, row 45 "Interaction pairs" (status To create)',
    cause:
      '"Check interactions" flags neither the warning pair (Paracetamol 500mg Tablet with Omeprazole 20mg Kapsul) nor the blocking pair ' +
      '(Ibuprofen 400mg Tablet with Amlodipine 5mg Tablet): no warning, no alert (seen 2026-10-15). No screen found to create pairs.',
    fix: '1. Load the two pairs (or name the screen or seed that does it).\n2. Run TC-APP003-005, 015 and 029 again.',
    who: 'Site administrator, then Tester',
    howFound: 'Seen on the site (automation of 03 Patient Care)',
    testCases: [
      { id: 'TC-APP003-005', steps: [1, 2] },
      { id: 'TC-APP003-015', steps: [1, 2] },
      { id: 'TC-APP003-029', steps: [1] },
    ],
  },
  {
    no: 23,
    blocker: 'Ward care does not offer the stays of the branch',
    category: 'Function',
    scope: '04 Inpatient\nWard care, /adt/ward, list "Ward care"',
    cause:
      'The list "Ward care" offers only "—", also right after a patient is admitted on Admissions (seen 2026-10-15 with rs.admin2 on Podomoro). ' +
      'No stay can be chosen, so Receive, Note, Doctor, Swap and Exceptional exit cannot be used.',
    fix: '1. Make the list load the stays of the branch (or name what must exist first).\n2. Run TC-APP004-065 to 076 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 04 Inpatient)',
    testCases: [
      { id: 'TC-APP004-065', steps: [2, 3] },
      { id: 'TC-APP004-066', steps: [1] },
      { id: 'TC-APP004-067', steps: [1] },
      { id: 'TC-APP004-068', steps: [1, 2] },
      { id: 'TC-APP004-069', steps: [1] },
      { id: 'TC-APP004-070', steps: [1] },
      { id: 'TC-APP004-071', steps: [1] },
      { id: 'TC-APP004-072', steps: [1] },
      { id: 'TC-APP004-073', steps: [1, 2] },
      { id: 'TC-APP004-074', steps: [1, 2] },
      { id: 'TC-APP004-075', steps: [1] },
      { id: 'TC-APP004-076', steps: [1] },
    ],
  },
  {
    no: 24,
    blocker: 'Referral types and Cross-consult types list only the first rows, with no paging or search',
    category: 'Function',
    scope: '02 Appointment\nReferral types, /appointment/referral-types, and Cross-consult types, /appointment/cross-consult-types',
    cause:
      'Each list shows 24 types and stops, with no paging, search or count (seen 2026-10-15). A type saved after that is offered in the booking ' +
      'dialog but never appears in the list, so its row ("Yes"/"No" under Active) and a repeated code cannot be checked there.',
    fix: '1. Add paging or a search to both lists.\n2. Run TC-APP002-019, 020, 022, 023, 024 and 026 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 02 Appointment)',
    testCases: [
      { id: 'TC-APP002-019', steps: [4] },
      { id: 'TC-APP002-020', steps: [1] },
      { id: 'TC-APP002-022', steps: [1] },
      { id: 'TC-APP002-023', steps: [4] },
      { id: 'TC-APP002-024', steps: [1] },
      { id: 'TC-APP002-026', steps: [1] },
    ],
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
