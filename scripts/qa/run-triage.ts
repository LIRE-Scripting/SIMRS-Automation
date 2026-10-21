/**
 * Reviewed failures of the full run of 2026-10-21 (scripts/qa/build-run-summary.ts):
 * per test case or chain, what the failure is and what to do next. Filled by
 * reading the error, the page snapshot and the recorded HTTP 5xx of each failure.
 */
export interface Triage {
  /** site = the site does not do what the workbook asks; automation = the test is wrong or missing; data = shared data on the site; environment = order or timing of the run. */
  cause: 'site' | 'automation' | 'data' | 'environment';
  finding: string;
  next: string;
  owner: 'Dev' | 'QA automation' | 'Site admin' | 'Product';
}

const group = (ids: string[], t: Triage): Record<string, Triage> => Object.fromEntries(ids.map((id) => [id, t]));
const range = (prefix: string, nos: number[]) => nos.map((n) => `${prefix}-${String(n).padStart(3, '0')}`);

/** Type-ahead pickers filter a list the page loaded once (the first N records); they never ask the server. */
const PICKER = (what: string, detail: string): Triage => ({
  cause: 'site',
  finding: `The ${what} picker searches only the records the page loaded first (${detail}); a record past them is "not found" although it exists. Shows since the data grew past the limit.`,
  next: `Dev: search the ${what} list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped).`,
  owner: 'Dev',
});

/** Desk lists (housekeeping, maintenance, fixed assets, services) show 22 rows, no paging, no search. */
const DESK_LIST: Triage = {
  cause: 'site',
  finding: 'The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories).',
  next: 'Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40.',
  owner: 'Dev',
};

const SERVER_500 = (what: string): Triage => ({
  cause: 'site',
  finding: `${what} answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).`,
  next: 'Dev: look up the digest in the server log and fix the action; then rerun the test.',
  owner: 'Dev',
});

const REFUSED_500 = (what: string): Triage => ({
  cause: 'site',
  finding: `${what}: the input is wrong on purpose (negative test). The site refuses it, but with HTTP 500 instead of a message; nothing is saved.`,
  next: 'Dev: validate the input and answer a message (the workbook names the text); then rerun.',
  owner: 'Dev',
});

export const TRIAGE: Record<string, Triage> = {
  // 01/02: department picker of Book, Arrival and the queue screens.
  ...group(
    [...range('TC-APP001', [10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 42, 44, 46, 47, 48, 49, 50, 52, 54, 55, 56, 60, 67, 77, 78, 79, 80]),
      ...range('TC-APP002', [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 18])],
    PICKER('Department', '50 departments; QA Poli Umum (DEP-1) was number 51+ after the "QA Poli Uji" departments of the Settings runs'),
  ),
  ...group(['TC-APP001-053', 'TC-APP002-017'], {
    cause: 'automation',
    finding: 'Rerun after the rename: typing the cashier\'s name in "Consultant or unit" shows an empty list with no "no match" text; the test waits for an option or that text. An empty list means "not offered", as the workbook expects. Steps 2-3 of this test case (pickers with more than 50 users or departments) are now runnable: Users 107, Departments 75; the site fails them (pickers capped at 50).',
    next: 'QA automation: accept the empty list in step 1 and automate steps 2-3 (they will fail on found blocker 40 until Dev fixes the pickers).',
    owner: 'QA automation',
  }),
  ...group(range('TC-APP001', [24, 35, 43, 61, 62, 63]), {
    cause: 'automation',
    finding: 'The test case became runnable when users U3-U7 were made (2026-10-20); its test is not written yet ("write its test").',
    next: 'QA automation: write the test from the workbook steps.',
    owner: 'QA automation',
  }),
  'TC-APP004-034': PICKER('Bed', 'the bed list of the ward; the new bed QA-199-… is not offered'),
  ...group(range('TC-APP010', [8, 9, 10, 11, 12, 16, 17, 18, 19, 22, 23, 32]), PICKER('Employee (leave)', 'employees made by earlier runs fill it; the new QA-EMP-… and X QA Pegawai are not offered')),
  ...group([...range('TC-APP017', [1, 3, 8, 10, 12, 13, 14, 15, 51])], PICKER('Employee (payroll)', 'the new QA-EMP-… of the run is not offered')),
  ...group(['TC-APP017-016', 'TC-APP017-026'], PICKER('Employee (payroll)', 'QA-EMP-NONAKTIF-… / QA-EMP-XSS-… of the run are not offered, so the check on inactive or script names cannot be made')),
  'TC-APP019-033': PICKER('Account (Budget posting rules)', 'the select lists the first accounts; the QA-XSS account of the run is not among them'),
  ...group(['TC-APP022-001', 'TC-APP022-003', 'TC-APP024-004', 'TC-APP026-004', 'TC-APP026-007', 'TC-APP027-003'], DESK_LIST),

  // HTTP 500 on well-formed input.
  ...group(['TC-APP005-028', 'TC-APP005-033'], SERVER_500('Dispense confirm (walk-in sale of QA-PARA, quantity 1)')),
  'TC-APP011-041': SERVER_500('"Revert latest stamp" of a lab order'),
  'TC-APP013-040': SERVER_500('Diet order "Calculate" (assessment)'),
  ...group(['TC-APP014-004', 'TC-APP014-010'], SERVER_500('Cashier "Pay" of a bill already covered by deposits')),
  ...group(['TC-APP024-010', 'TC-APP024-011', 'TC-APP024-012', 'TC-APP024-013'], SERVER_500('Saving a housekeeping contract')),
  'TC-APP026-009': SERVER_500('Saving an AMC document'),
  // HTTP 500 on wrong input (negative tests).
  'TC-APP022-013': REFUSED_500('Service order without a document'),
  'TC-APP024-002': REFUSED_500('Shift for a location code that does not exist'),
  'TC-APP026-005': REFUSED_500('Work order above the budget balance'),
  'TC-APP026-008': REFUSED_500('AMC instalment with amount 0'),

  // Known checklist blockers still present; the screen test asserts HTTP 200.
  ...group(['TC-APP018-062', 'TC-APP018-088'], {
    cause: 'site',
    finding: 'Blocker 4 still present: /entitlements and /tenants answer HTTP 500 for the hospital administrator.',
    next: 'Dev: blocker 4 (hide the links or allow the screens); QA: the screen test stays failed until then.',
    owner: 'Dev',
  }),
  'TC-APP021-043': {
    cause: 'site',
    finding: 'Blocker 3 still present: /cssd/issues/new answers HTTP 500.',
    next: 'Dev: blocker 3; then rerun.',
    owner: 'Dev',
  },

  // Validation the workbook asks for is missing.
  'TC-APP008-038': {
    cause: 'site',
    finding: 'A pain policy with an empty number is saved ("Saved"); the workbook expects a refusal ("incision, department type, and percentage are required"). Same on 2026-10-18.',
    next: 'Dev: require the number; Product: confirm the rule.',
    owner: 'Dev',
  },
  'TC-APP019-036': {
    cause: 'site',
    finding: 'An imprest row with a type and no amount is saved ("Configuration saved."); the workbook expects a refusal. Same on 2026-10-18.',
    next: 'Dev: validate imprest rows (type, amount, account, holder).',
    owner: 'Dev',
  },
  'TC-APP019-026': {
    cause: 'automation',
    finding: 'Precondition changed by the prerequisite run (S09, 2026-10-20): "Allocation — operating" now has its accounts, so "Save" without choosing saves. The site is right.',
    next: 'QA automation: clear the debit and credit accounts before the save, or use a rule without accounts.',
    owner: 'QA automation',
  },

  // Failed on 2026-10-18 as well.
  ...group(['TC-APP003-048', 'TC-APP003-051'], {
    cause: 'site',
    finding: 'The radiology order made in the consultation does not show in RIS Orders (same on 2026-10-18).',
    next: 'Dev: check that consultation radiology orders reach RIS for the branch; then rerun.',
    owner: 'Dev',
  }),
  'TC-APP005-023': {
    cause: 'site',
    finding: 'Searching Issue Lines for an item or remark ("generik") gives "No issue lines yet." (same on 2026-10-18).',
    next: 'Dev: the Issue Lines search should match item and remarks.',
    owner: 'Dev',
  },
  'TC-APP005-042': {
    cause: 'site',
    finding: 'Issue Lines search "Paracetamol" lists one of the two sales of the test (same on 2026-10-18); the second sale was not confirmed (dispense confirm HTTP 500).',
    next: 'Dev: fix dispense confirm (see TC-APP005-028); then rerun.',
    owner: 'Dev',
  },
  'TC-APP007-003': {
    cause: 'site',
    finding: 'Status filter "Inactive" on the item list shows no inactive item (same on 2026-10-18).',
    next: 'Dev: the status filter of the item list.',
    owner: 'Dev',
  },
  'TC-APP009-007': {
    cause: 'site',
    finding: 'Orders without a date are not at the end with "—": the last page shows a date (same on 2026-10-18).',
    next: 'Product: confirm the sort; Dev: sort orders without a date last.',
    owner: 'Product',
  },
  'TC-APP009-015': {
    cause: 'site',
    finding: 'Blocker 30: the approval chain has one step, so PO-DONE cannot show four "Done" steps.',
    next: 'Dev/Product: blocker 30 (four-step approval chain).',
    owner: 'Dev',
  },
  'TC-APP018-031': {
    cause: 'site',
    finding: 'Branch map search finds no line for the new user (list "Showing 51–100 of 107"): the search filters the page on screen only.',
    next: 'Dev: Branch map search on the server. QA automation: page through the list as a workaround.',
    owner: 'Dev',
  },
  'TC-APP018-042': {
    cause: 'site',
    finding: 'As TC-APP018-041: the test user\'s line in Branch map is past the first page and the search covers one page only.',
    next: 'Dev: Branch map search on the server; then rerun.',
    owner: 'Dev',
  },
  'TC-APP018-041': {
    cause: 'site',
    finding: 'The branch input of the test user\'s line in Branch map is not reachable: the user is past the first page and the search covers one page only.',
    next: 'Dev: Branch map search on the server; then rerun.',
    owner: 'Dev',
  },
  'TC-APP018-008': {
    cause: 'automation',
    finding: 'After the edit, the row was looked up before the search had filtered the list (timing). The tax code is saved with the new rate.',
    next: 'Fixed 2026-10-21 (Mdm.row waits for the search); rerun.',
    owner: 'QA automation',
  },
  ...group(['TC-APP015-024', 'TC-APP015-025'], {
    cause: 'automation',
    finding: 'Refused with "An active category already uses that description or colour.": the triage category of the run of 2026-10-18 is still active with the same description/colour. The site is right.',
    next: 'QA automation: unique description per run and retire the category at the end of the test.',
    owner: 'QA automation',
  }),
  'TC-APP014-036': {
    cause: 'environment',
    finding: 'Needs the counter closed for the day; the day is closed only at the end of the run (TC-APP014-011, E2E-033).',
    next: 'QA automation: run TC-APP014-036 after TC-APP014-011.',
    owner: 'QA automation',
  },

  // E2E chains.
  ...group(['E2E-001', 'E2E-018', 'E2E-025', 'E2E-048'], {
    cause: 'site',
    finding: 'The chain books or queues the patient in QA Poli Umum; the Department picker searches only the first 50 departments (found blocker 40).',
    next: 'Departments renamed 2026-10-21; rerun these chains after 07:00 WIB (E2E-033 closes the U1 cashier day until then). Dev: picker search on the server.',
    owner: 'QA automation',
  }),
  ...group(['E2E-009', 'E2E-011', 'E2E-040', 'E2E-042', 'E2E-050'], {
    cause: 'automation',
    finding: 'The chain still stops "as planned" at a test case that became runnable when users U3-U7 were made (2026-10-20): "is planned to run; stop the chain with its blocked step instead".',
    next: 'QA automation: run that chain step (write the step from the workbook) instead of stopping.',
    owner: 'QA automation',
  }),
  ...group(['E2E-003', 'E2E-027'], {
    cause: 'site',
    finding: 'The radiology order made in the chain is not offered in RIS "Schedule and report" (the order list does not reach it); same as TC-APP003-048/051.',
    next: 'Dev: RIS order list for the branch (all open orders, newest included); then rerun.',
    owner: 'Dev',
  }),
  ...group(['E2E-008', 'E2E-035'], {
    cause: 'site',
    finding: 'The inventory item saved in the chain (QA-INV-PARA-…) is not found in the item list afterwards: the list does not reach the new item (capped list, probably found blocker 40, to confirm).',
    next: 'Dev: item list search/paging that reaches new items; QA: confirm by hand once.',
    owner: 'Dev',
  }),
  'E2E-010': PICKER('Employee', 'the new QA-EMP-001 of the chain is not offered'),
  ...group(['E2E-026', 'E2E-029'], PICKER('Bed', 'the new bed QA-103-… of the chain is not offered')),
  ...group(['E2E-012', 'E2E-013', 'E2E-014', 'E2E-044', 'E2E-032'], DESK_LIST),
  'E2E-020': {
    cause: 'site',
    finding: 'Blocker 24: the referral/cross-consult type saved in the chain is not listed (the list shows the first rows only, no paging or search).',
    next: 'Dev: blocker 24; then rerun.',
    owner: 'Dev',
  },
  'E2E-045': SERVER_500('Diet order "Calculate" (assessment)'),
  'E2E-033': {
    cause: 'environment',
    finding: 'The chain needs an open U1 cashier day; TC-APP014-011 (run just before it) had closed the day until 07:00 WIB. Run order of this run, not the site.',
    next: 'QA automation: run E2E-033 before TC-APP014-011 (both close the day), after 07:00 WIB.',
    owner: 'QA automation',
  },
};
