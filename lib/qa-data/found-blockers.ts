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
    fix: '1. Load the two pairs (or name the screen or seed that does it).\n2. Run TC-APP003-005, 015, 029 and TC-APP005-012, 029 again.',
    who: 'Site administrator, then Tester',
    howFound: 'Seen on the site (automation of 03 Patient Care)',
    testCases: [
      { id: 'TC-APP003-005', steps: [1, 2] },
      { id: 'TC-APP003-015', steps: [1, 2] },
      { id: 'TC-APP003-029', steps: [1] },
      { id: 'TC-APP005-012', steps: [1, 2, 3] },
      { id: 'TC-APP005-029', steps: [1, 2] },
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
  {
    no: 25,
    blocker: 'Saving an external bag or a quality-control record, and approving a blood request, answer HTTP 500',
    category: 'Function',
    scope:
      '06 Transfusion Medicine\nStock, dialog "Receive an external bag" (Save); Quality control, dialog "Record" (Save); ' +
      'Blood request, request dialog (Approve); Stock, dialog "Blood group chart" (Save chart)',
    cause:
      'With valid values these requests answer HTTP 500 and the screen shows "Minified React error #441" (seen 2026-10-15). ' +
      'Saving the participant settings, the QC limits and a request works; the bag and the QC document are not saved, and a request stays ' +
      '"Pending", so no request reaches the queue as "approved" (also when its author approves it: whether the author may approve is ' +
      'TC-APP006-053, but the answer is a server error, not a refusal).',
    fix:
      '1. Find the failing requests in the server log (digests 1431275565 and 2743853802 of 2026-10-15) and fix them.\n' +
      '2. Run TC-APP006-016, 022, 029, 055, 057 and 062 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 06 Transfusion Medicine)',
    testCases: [
      { id: 'TC-APP006-016', steps: [3, 4] },
      { id: 'TC-APP006-022', steps: [1, 2, 3, 4] },
      { id: 'TC-APP006-029', steps: [3, 4] },
      { id: 'TC-APP006-055', steps: [1, 2] },
      { id: 'TC-APP006-057', steps: [1, 2] },
      { id: 'TC-APP006-062', steps: [1, 2] },
      { id: 'TC-APP006-072', steps: [3] },
    ],
  },
  {
    no: 26,
    blocker: 'No store can be made, and "Branch and stores" cannot save',
    category: 'Data + Function',
    scope:
      '07 Inventory\nStores, /inventory/stores (no "Add"); Branch and stores, /inventory/setup (Save answers HTTP 500)\n' +
      '00-test-data.xlsx | Catalogue: ST-1 "QA Gudang Farmasi", ST-OFF, ST-B (07); ST-OP, ST-IP (05)',
    cause:
      'The Stores screen lists the seed stores and has no button to add one; Settings has no store screen either. The three forms of ' +
      '"Branch and stores" (category, store, lane) answer HTTP 500 ("Minified React error #441", seen 2026-10-15). The QA stores of the ' +
      'catalogue, an inactive store and the stores "X-ST1"/"X-ST2" of the setup journeys cannot be made. On Store documents an ' +
      'opening stock is saved, but an indent, a departmental or an inter-branch request between two stores answers HTTP 500 too ' +
      '(no lane can be saved between them; whether a lane is required is TBD in the workbook).',
    fix: '1. Name the screen that makes a store, or add one; fix the saves of "Branch and stores".\n2. Make the catalogue stores and run the 07 journeys again.',
    who: 'Development; Site administrator for the stores',
    howFound: 'Seen on the site (automation of 07 Inventory)',
    testCases: [
      { id: 'TC-APP007-020', steps: [4] },
      { id: 'TC-APP007-039', steps: [2, 3, 4] },
      { id: 'TC-APP007-040', steps: [1, 2] },
      { id: 'TC-APP007-041', steps: [1] },
      { id: 'TC-APP007-045', steps: [1, 2, 3, 4] },
      { id: 'TC-APP007-046', steps: [1, 2] },
      { id: 'TC-APP007-047', steps: [1, 2] },
      { id: 'TC-APP007-048', steps: [1, 2] },
      { id: 'TC-APP007-050', steps: [1] },
      { id: 'TC-APP005-034', steps: [2] },
    ],
  },
  {
    no: 27,
    blocker: 'Saving a kit answers HTTP 500',
    category: 'Function',
    scope: '07 Inventory\nItem Master, dialog "Edit Item", section "Kit components" (Save kit)',
    cause:
      'With two components picked from the list and quantities 1 and 2, "Save kit" answers HTTP 500 ("Minified React error #441", seen ' +
      '2026-10-15). No item can be made a kit, so IT-KIT (07) and QA-KIT (05) cannot exist.',
    fix: '1. Fix the kit save.\n2. Run TC-APP007-007 and TC-APP005-010 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 07 Inventory)',
    testCases: [{ id: 'TC-APP007-007', steps: [3, 4] }, { id: 'TC-APP005-010' }],
  },
  // 28 was withdrawn on 2026-10-15: the discounted dispense answered HTTP 500 only because "Maximum line
  // discount (%)" of the 05 catalogue ("Rules for BR-A") had not been set; the tests now set it first.
  {
    no: 29,
    blocker: 'A dispense opened from an order cannot change Issued, Requested or Generic',
    category: 'Function',
    scope: '05 Pharmacy\nDispense, /pharmacy/dispense?order=…, step "Set quantities" (Requested, Issued, Discount %, Generic)',
    cause:
      'On a line that comes from an order, typing in Requested or Issued and ticking Generic change nothing: the fields keep the ' +
      'ordered quantity and the box stays unticked (seen 2026-10-15; at the counter the same fields work). A part of an order ' +
      'cannot be issued, a generic cannot be recorded and Issued cannot be set to 0.',
    fix: '1. Let the order line take the typed quantities and the Generic tick.\n2. Run TC-APP005-002, 004 and 025 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 05 Pharmacy)',
    testCases: [
      { id: 'TC-APP005-002', steps: [2, 3, 4, 5, 6, 7] },
      { id: 'TC-APP005-004', steps: [2, 3, 4] },
      { id: 'TC-APP005-025', steps: [4] },
    ],
  },
  {
    no: 30,
    blocker: 'The purchase order approval chain has one step, not the four of the shared data',
    category: 'Data',
    scope:
      '09 Procurement\nPurchase orders, /procurement/purchase-orders, the opened order ("Approval chain")\n' +
      '00-test-data.xlsx | Catalogue, 09 row "Chain" (purchase_order "Persetujuan Purchase Order", four steps with roles)',
    cause:
      'A new purchase order shows "Purchase order (1 steps)" with the single step "Persetujuan"; one "Advance approval" completes it ' +
      '(seen 2026-10-15). No order can wait at step 2, 3 or 4, so PO-S2, PO-S3 and PO-S4 cannot exist and the role of each step cannot be checked.',
    fix: '1. Load the four-step chain of the shared data (or name the Workflow screen that does it).\n2. Run TC-APP009-001, 004, 006, 015 and 016 again.',
    who: 'Site administrator (Workflow)',
    howFound: 'Seen on the site (automation of 09 Procurement)',
    testCases: [
      { id: 'TC-APP009-004', steps: [3, 4] },
      { id: 'TC-APP009-006' },
      { id: 'TC-APP009-015', steps: [1] },
      { id: 'TC-APP009-016' },
    ],
  },
  {
    no: 31,
    blocker: 'Goods receipt, supplier invoice and returns answer HTTP 500',
    category: 'Function',
    scope: '09 Procurement\nReceipts and returns, /procurement/receipts, buttons "grn", "invoice", "vendor_return", "expiry_return"',
    cause:
      'For an order made, sent and approved on /procurement/requests, "gate" saves ("Saved."), but "grn" answers HTTP 500 ("Minified React ' +
      'error #441") with the store typed as its code, its id, its name or the default "127-CART"; "invoice", "vendor_return" and ' +
      '"expiry_return" answer HTTP 500 too (seen 2026-10-15). No goods can be received, billed or returned.',
    fix: '1. Fix the four actions (or name the store value "Store" expects).\n2. Run TC-APP009-046, 049 and 051 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 09 Procurement)',
    testCases: [
      { id: 'TC-APP009-046', steps: [3, 4] },
      { id: 'TC-APP009-049', steps: [1, 2] },
      { id: 'TC-APP009-051', steps: [1, 2, 3] },
    ],
  },
  {
    no: 32,
    blocker: 'Shifting an operating theatre slot by one hour answers HTTP 500',
    category: 'Function',
    scope: '08 Operation Theater\nCalendar, /ot/calendar, drop zone "Shift one hour"',
    cause:
      'A slot placed on the calendar through "Place on calendar" (room, start and end tomorrow) is dragged onto "Shift one hour"; the ' +
      'answer is HTTP 500 ("Minified React error #441", seen 2026-10-15) and the slot keeps its time.',
    fix: '1. Fix the shift.\n2. Run TC-APP008-039 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 08 Operation Theater)',
    testCases: [{ id: 'TC-APP008-039', steps: [3] }],
  },
  {
    no: 33,
    blocker: 'The insured patient PT-BPJS is not on the site and no screen can prepare one',
    category: 'Data',
    scope:
      '14 Hospital Accounts\nFast Cashier, /billing/cashier, panel "Insurance / BPJS" (Check eligibility, Submit claim, Check SEP)\n' +
      '00-test-data.xlsx | Catalogue, 14 row "PT-BPJS" ("Both must be prepared as data; the screens cannot create them")',
    cause:
      '"Check eligibility" offers no patient "QA-HAC Pasien BPJS" (seen 2026-10-15): no approved pre-authorisation and no referral with ' +
      'SEP QA-SEP-0001 exist, and the panel can only search existing ones (TC-APP014-046).',
    fix: '1. Load PT-BPJS with its pre-authorisation (approved, 2,000,000) and its referral (SEP QA-SEP-0001).\n2. Run TC-APP014-017, 041 to 044 again.',
    who: 'Site administrator (data load)',
    howFound: 'Seen on the site (automation of 14 Hospital Accounts)',
    testCases: [
      { id: 'TC-APP014-017', steps: [3, 4, 5, 6, 7, 8, 9] },
      { id: 'TC-APP014-041', steps: [3, 4, 5] },
      { id: 'TC-APP014-042' },
      { id: 'TC-APP014-043', steps: [3] },
      { id: 'TC-APP014-044' },
    ],
  },
  {
    no: 34,
    blocker: 'A discount above the cashier cap answers HTTP 500 instead of waiting for approval',
    category: 'Data + Function',
    scope:
      '14 Hospital Accounts\nFast Cashier, /billing/cashier, "Apply discount" above "Discount cap (IDR)"\n' +
      '00-test-data.xlsx | Catalogue, 14 row "Approval chain" (billing discount chain with one step, approver Head cashier)',
    cause:
      'With the counter settings of the catalogue (cap 50,000), a discount of 60,000 answers HTTP 500 ("Minified React error #441", seen ' +
      '2026-10-15); the sale stays Draft and no approval starts. No billing discount chain is set up, and none can be checked from the ' +
      'cashier screens. A sale cannot be brought to "Waiting for approval".',
    fix: '1. Set up the billing discount chain (or fix the request that starts it).\n2. Run TC-APP014-029 again.',
    who: 'Site administrator (Workflow), then Development',
    howFound: 'Seen on the site (automation of 14 Hospital Accounts)',
    testCases: [{ id: 'TC-APP014-029' }],
  },
  {
    no: 35,
    blocker: 'The item price of a branch (margin and tax) cannot be saved',
    category: 'Function',
    scope:
      '14 Hospital Accounts\nFast Cashier, /billing/cashier, section "Item price" (Save price)\n' +
      '00-test-data.xlsx | Catalogue, 05 row "Rules for BR-A" (outpatient price: site margin 25%, tax 11%)',
    cause:
      '"Save price" with Visit Outpatient, Method "Cost plus margin", Site margin 25 and Tax 11 answers HTTP 500 ("Minified React error ' +
      '#441", seen 2026-10-15); the fields go back to 0 and 0. Pharmacy sales are priced at the last cost with no tax (QA-PARA x 10 is ' +
      'Rp 10.000 instead of the reference 13,875.00).',
    fix: '1. Fix the item price save.\n2. Run TC-APP014-002 and 033 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 14 Hospital Accounts)',
    testCases: [
      { id: 'TC-APP014-002', steps: [1, 2] },
      { id: 'TC-APP014-033' },
    ],
  },
  {
    no: 36,
    blocker: 'Patient ledger cannot show a chosen invoice: "Find patient" shows no rows, the list holds 22 invoices',
    category: 'Function',
    scope: '14 Hospital Accounts\nPatient ledger, /billing/ledger, "Find patient" and the button "Use" of a row',
    cause:
      '"Find patient" with a patient id gets the invoices back from the server ("QA-RI-… charge 300000 deposit 0 refund 0") but the ' +
      'table reads "No rows yet." (seen 2026-10-15). Without a search the table shows only the first 22 invoices by number, so an ' +
      'invoice made today is not on it and cannot be chosen with "Use" for a deposit move or a failed card.',
    fix: '1. Show the rows of "Find patient" (and page or search the list).\n2. Run TC-APP014-061, 063, 065, 066, 068 and 069 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 14 Hospital Accounts)',
    testCases: [
      { id: 'TC-APP014-061', steps: [5] },
      { id: 'TC-APP014-063', steps: [3] },
      { id: 'TC-APP014-065' },
      { id: 'TC-APP014-066', steps: [2, 3, 4, 5] },
      { id: 'TC-APP014-068' },
      { id: 'TC-APP014-069', steps: [1, 2, 4] },
    ],
  },
  {
    no: 37,
    blocker: 'The 12 salary components of the workbook are not on the site, and no screen makes them',
    category: 'Data',
    scope: '17 Payroll\nPayroll batches, /payroll/batches, "Batch result" (lines, Gross and Net)',
    cause:
      'The figures of the workbook come from the 12 seed components "QA-BASIC" … "QA-PF" (00-test-data.xlsx | Catalogue, "Components"). ' +
      'A batch on the site lists three other components, "GAPOK", "POTBPJS" and "TUNJAB" (PassthroughAgent, IDR 10.000.000,00 each), ' +
      'Gross and Net "IDR 40.000.000,00" for a base of 10000000 (seen 2026-10-15). No screen shows or changes components (TC-APP017-020), ' +
      'so the components of the workbook cannot be made.',
    fix: '1. Load the 12 components of the workbook into the test tenant (or give the figures for GAPOK, POTBPJS and TUNJAB).\n2. Run TC-APP017-002, 003 and 011 again.',
    who: 'Development / Product owner',
    howFound: 'Seen on the site (automation of 17 Payroll)',
    testCases: [
      { id: 'TC-APP017-002' },
      { id: 'TC-APP017-003', steps: [2, 3, 4] },
      { id: 'TC-APP017-011' },
    ],
  },
  {
    no: 38,
    blocker: 'Saving the rights of a role answers HTTP 500 ("Failed to save rights.")',
    category: 'Function',
    scope: '18 Settings\nUser Rights, /identity/rights, "Save rights"',
    cause:
      'With a new test role picked ("0 / 40") and DIET_WRITE ticked, "Save rights" posts to /identity/rights and gets HTTP 500; ' +
      'the toast is "Failed to save rights." (seen 2026-10-15). No privilege can be granted to a role, so a role made on Roles ' +
      'cannot be given any right. The shared role admin was not tried.',
    fix: '1. Fix the save of role privileges.\n2. Run TC-APP018-039 again (and steps 4 and 5 with the 13 Dietary flow).',
    who: 'Development',
    howFound: 'Seen on the site (automation of 18 Settings)',
    testCases: [{ id: 'TC-APP018-039', steps: [3] }],
  },
  {
    no: 39,
    blocker: 'A tender cannot be created: "Create tender" answers HTTP 500 for every approved purchase request',
    category: 'Function',
    scope: '23 Sourcing\nTenders, /sourcing/tenders, "Create tender" (Document = id of an approved purchase request)',
    cause:
      'With a category, the type "open", a close date and the internal id of an approved purchase request of Procurement ' +
      '(/procurement/requests: the requests of 09 and the seed requests PO-001 and PO-USG), "Save" posts and gets HTTP 500, toast ' +
      '"Minified React error #441" (seen 2026-10-15). Without a tender no bid, agreement or deposit can be recorded.',
    fix: '1. Fix the creation of a tender from an approved purchase request.\n2. Run TC-APP023-005, 006, 008 … 010, 012 … 014, 016 … 018 and 020 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 23 Sourcing)',
    testCases: [
      { id: 'TC-APP023-005', steps: [3, 4, 5, 6] },
      { id: 'TC-APP023-006', steps: [6, 7] },
      { id: 'TC-APP023-008' },
      { id: 'TC-APP023-009' },
      { id: 'TC-APP023-010' },
      { id: 'TC-APP023-012' },
      { id: 'TC-APP023-013' },
      { id: 'TC-APP023-014' },
      { id: 'TC-APP023-016' },
      { id: 'TC-APP023-017' },
      { id: 'TC-APP023-018', steps: [1, 2, 3] },
      { id: 'TC-APP023-020', steps: [2, 3, 4, 5, 6] },
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
