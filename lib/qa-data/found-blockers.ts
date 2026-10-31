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
    blocker: 'Saving an external bag or a quality-control record fails ("failed to receive external unit", "failed to save quality control")',
    category: 'Function',
    scope:
      '06 Transfusion Medicine\nStock, dialog "Receive an external bag" (Save); Quality control, dialog "Record" (Save); ' +
      'Blood request, request dialog (Approve); Stock, dialog "Blood group chart" (Save chart)',
    cause:
      'With valid values these requests answer HTTP 500 and the screen shows "Minified React error #441" (seen 2026-10-15). ' +
      'Saving the participant settings, the QC limits and a request works; the bag and the QC document are not saved, and a request stays ' +
      '"Pending", so no request reaches the queue as "approved" (also when its author approves it: whether the author may approve is ' +
      'TC-APP006-053, but the answer is a server error, not a refusal). Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; the bag and the QC record still fail, now with the toasts "failed to receive external unit" and "failed to save quality control". A request is approved by a second user ("Request approved"; the author is refused with "a different user must approve", TC-APP006-021 and 053), and the blood group chart saves (its columns and an O Positive row are on the branch): those parts are resolved.',
    fix:
      '1. Find the failing requests in the server log (digests 1431275565 and 2743853802 of 2026-10-15) and fix them.\n' +
      '2. Run TC-APP006-016, 022, 029, 055, 057 and 062 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 06 Transfusion Medicine)',
    testCases: [
      { id: 'TC-APP006-016', steps: [3, 4] },
      { id: 'TC-APP006-029', steps: [3, 4] },
      { id: 'TC-APP006-062', steps: [1, 2] },
      { id: 'TC-APP006-022', steps: [1, 2, 3, 4] },
      { id: 'TC-APP006-054', steps: [1] },
      { id: 'TC-APP006-055', steps: [1, 2] },
      { id: 'TC-APP006-057', steps: [1, 2] },
      { id: 'TC-APP006-072', steps: [3] },
    ],
  },
  {
    no: 26,
    blocker: 'No store can be made on the site (Stores has no "Add")',
    category: 'Data + Function',
    scope:
      '07 Inventory\nStores, /inventory/stores (no "Add"); Branch and stores, /inventory/setup (Save answers HTTP 500)\n' +
      '00-test-data.xlsx | Catalogue: ST-1 "QA Gudang Farmasi", ST-OFF, ST-B (07); ST-OP, ST-IP (05)',
    cause:
      'The Stores screen lists the seed stores and has no button to add one; Settings has no store screen either. The three forms of ' +
      '"Branch and stores" (category, store, lane) answer HTTP 500 ("Minified React error #441", seen 2026-10-15). The QA stores of the ' +
      'catalogue, an inactive store and the stores "X-ST1"/"X-ST2" of the setup journeys cannot be made. On Store documents an ' +
      'opening stock is saved, but an indent, a departmental or an inter-branch request between two stores answers HTTP 500 too ' +
      '(no lane can be saved between them; whether a lane is required is TBD in the workbook). Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; "Branch and stores" saves a category, a store and a lane for stores that exist ("Saved."; a store that does not exist is refused with "store is missing"), and with the lanes FI01-00-00 ↔ FI01-01-01 indents, issues, receipts and returns between the two seed stores save (TC-APP007-039 … 050). Still no store can be made, so the inactive store ST-OFF and the inpatient store ST-IP do not exist.',
    fix: '1. Name the screen that makes a store, or add one.\n2. Make the catalogue stores and run TC-APP007-020 and TC-APP005-034 again.',
    who: 'Development; Site administrator for the stores',
    howFound: 'Seen on the site (automation of 07 Inventory)',
    testCases: [
      { id: 'TC-APP007-020', steps: [4] },
      { id: 'TC-APP005-034', steps: [2] },
    ],
  },
  {
    no: 27,
    blocker: 'Saving a kit fails ("saveKitComponents: 500 stock update failed")',
    category: 'Function',
    scope: '07 Inventory\nItem Master, dialog "Edit Item", section "Kit components" (Save kit)',
    cause:
      'With two components picked from the list and quantities 1 and 2, "Save kit" answers HTTP 500 ("Minified React error #441", seen ' +
      '2026-10-15). No item can be made a kit, so IT-KIT (07) and QA-KIT (05) cannot exist. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; "Save kit" now shows the toast "saveKitComponents: 500 stock update failed"; the kit is still not saved.',
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
      { id: 'TC-APP004-045', steps: [3] },
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
      { id: 'TC-APP009-005', steps: [2, 3, 4] },
      { id: 'TC-APP009-017', steps: [1, 2] },
      { id: 'TC-APP009-018', steps: [2, 3] },
      { id: 'TC-APP009-021', steps: [4] },
      { id: 'TC-APP009-004', steps: [3, 4] },
      { id: 'TC-APP009-006' },
      { id: 'TC-APP009-015', steps: [1] },
      { id: 'TC-APP009-016' },
    ],
  },
  {
    no: 31,
    blocker: 'Goods receipt, supplier invoice and returns cannot be saved: "grn" answers "receive at the gate first" after a saved gate',
    category: 'Function',
    scope: '09 Procurement\nReceipts and returns, /procurement/receipts, buttons "grn", "invoice", "vendor_return", "expiry_return"',
    cause:
      'For an order made, sent and approved on /procurement/requests, "gate" saves ("Saved."), but "grn" answers HTTP 500 ("Minified React ' +
      'error #441") with the store typed as its code, its id, its name or the default "127-CART"; "invoice", "vendor_return" and ' +
      '"expiry_return" answer HTTP 500 too (seen 2026-10-15). No goods can be received, billed or returned. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; "gate" answers "Saved." but nothing is listed on Receipts and returns, and "grn" for the same order answers "procurement: invalid input: receive at the gate first"; "invoice" and "vendor_return" answer "receive the goods first". No goods can be received, billed or returned.',
    fix: '1. Fix the four actions (or name the store value "Store" expects).\n2. Run TC-APP009-046, 049 and 051 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 09 Procurement)',
    testCases: [
      { id: 'TC-APP009-021', steps: [1, 2, 3] },
      { id: 'TC-APP007-024', steps: [2, 3] },
      { id: 'TC-APP009-046', steps: [3, 4] },
      { id: 'TC-APP009-049', steps: [1, 2] },
      { id: 'TC-APP009-051', steps: [1, 2, 3] },
    ],
  },
  {
    no: 32,
    blocker: 'Shifting an operating theatre slot by one hour answered HTTP 500 (resolved 2026-10-31)',
    category: 'Function',
    scope: '08 Operation Theater\nCalendar, /ot/calendar, drop zone "Shift one hour"',
    cause:
      'A slot placed on the calendar through "Place on calendar" (room, start and end tomorrow) is dragged onto "Shift one hour"; the ' +
      'answer is HTTP 500 ("Minified React error #441", seen 2026-10-15) and the slot keeps its time. Resolved on 2026-10-31: for a validated request the drag onto "Shift one hour" answers "Saved" and the slot moves to 09:00 (TC-APP008-039 passes); a request that is not validated is refused with "ot: invalid input: drag reschedules a validated request".',
    fix: '1. Fix the shift.\n2. Run TC-APP008-039 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 08 Operation Theater)',
    testCases: [],
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
    blocker: 'A discount above the cashier cap cannot wait for approval: no billing discount chain is set up',
    category: 'Data',
    scope:
      '14 Hospital Accounts\nFast Cashier, /billing/cashier, "Apply discount" above "Discount cap (IDR)"\n' +
      '00-test-data.xlsx | Catalogue, 14 row "Approval chain" (billing discount chain with one step, approver Head cashier)',
    cause:
      'With the counter settings of the catalogue (cap 50,000), a discount of 60,000 answers HTTP 500 ("Minified React error #441", seen ' +
      '2026-10-15); the sale stays Draft and no approval starts. No billing discount chain is set up, and none can be checked from the ' +
      'cashier screens. A sale cannot be brought to "Waiting for approval". Seen again on 2026-10-31: a dispense above the maximum line discount answers "workflow: chain not found: \\"billingdiscount\\"" (found blocker 47), so the billing discount chain of the catalogue is still missing; a refund above the refund limit shows the red box "this amount waits for the billing discount approval chain" and is neither made nor held (TC-APP014-009). The chain cannot be made on the site (checked 2026-10-31 with the go-ahead of the tester): Workflow, Process definitions lists 11 processes and no billing discount process, has no button to add one, and its "Edit chain" dialog keeps the process key read-only ("Available process keys: discharge and purchase order").',
    fix: '1. Add the process "billingdiscount" to Workflow (Development: the screen offers only discharge and purchase_order), then give it one step, approver Head cashier.\n2. Run TC-APP014-007, 028 and 029 again.',
    who: 'Development (the process), then Site administrator (its step)',
    howFound: 'Seen on the site (automation of 14 Hospital Accounts)',
    testCases: [{ id: 'TC-APP014-029' }, { id: 'TC-APP014-009', steps: [1, 2, 3, 4] }],
  },
  {
    no: 35,
    blocker: 'The item price of a branch (margin and tax) could not be saved (resolved 2026-10-31)',
    category: 'Function',
    scope:
      '14 Hospital Accounts\nFast Cashier, /billing/cashier, section "Item price" (Save price)\n' +
      '00-test-data.xlsx | Catalogue, 05 row "Rules for BR-A" (outpatient price: site margin 25%, tax 11%)',
    cause:
      '"Save price" with Visit Outpatient, Method "Cost plus margin", Site margin 25 and Tax 11 answers HTTP 500 ("Minified React error ' +
      '#441", seen 2026-10-15); the fields go back to 0 and 0. Pharmacy sales are priced at the last cost with no tax (QA-PARA x 10 is ' +
      'Rp 10.000 instead of the reference 13,875.00). Resolved on 2026-10-31: no HTTP 500 any more, and "Save price" keeps the values once "Site margin" is typed as a fraction (0.25 for 25 %; a margin of 25 is not saved, without a message, while "Tax (%)" takes 11). QA-PARA × 10 is priced Rp 12.500 + tax Rp 1.375 = Rp 13.875, as the workbook says. The tests type the margin as a fraction (tests/modules/14-hospital-accounts/helpers.ts, marginOnSite).',
    fix: '1. Fix the item price save.\n2. Run TC-APP014-002 and 033 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 14 Hospital Accounts)',
    testCases: [],
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
      { id: 'TC-APP014-067', steps: [1] },
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
    blocker: 'Saving the rights of a role fails ("Failed to save rights.")',
    category: 'Function',
    scope: '18 Settings\nUser Rights, /identity/rights, "Save rights"; 00-prerequisites.xlsx | Role accounts (U8 of 04 Inpatient, 18 Settings, 22 Services, 23 Sourcing)',
    cause:
      'With a new test role picked ("0 / 40") and DIET_WRITE ticked, "Save rights" posts to /identity/rights and gets HTTP 500; ' +
      'the toast is "Failed to save rights." (seen 2026-10-15, TC-APP018-039). The prerequisites run of 2026-10-20 met it again for the ' +
      'four roles qa_rawat_inap (ADT_WRITE), qa_settings (7 Settings rights), qa_services (SERVICES_WRITE) and qa_sourcing (SOURCING_WRITE), ' +
      'twice each, digest 2696407390: the role ids and privilege ids were valid (the same request loaded the role with HTTP 200), so the server ' +
      'fails on storing the role-privilege link. No role but admin holds those rights, so the four U8 accounts qa.perawat.ri, qa.settings, ' +
      'qa.services and qa.sourcing were not made (their roles exist with 0 rights); 22 of the 26 U8 accounts and U3–U7 were made and sign in ' +
      '(docs/qa/prereq-users-and-blockers.md). The journeys of those four applications run as U1 (admin): the flows are proven, the limits ' +
      'of a role are not. Steps that need a user with only some rights of an application (a writer-only or an approver-only user, a ' +
      'pharmacist without the cashier role) are not run for the same reason. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; "Save rights" still shows "Failed to save rights." and the role keeps 0 rights.',
    fix: '1. Fix the save of role privileges (server log, digest 2696407390, 2026-10-15 and 2026-10-20).\n2. PREREQ_RETRY=blocked npm run test:prereq, then npm run qa:prereq-evidence: the four roles get their rights and the four accounts are made.\n3. Run TC-APP018-039 again (and steps 4 and 5 with the 13 Dietary flow), and the journeys of 04, 18, 22 and 23 with their role accounts.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 18 Settings, 2026-10-15; prerequisites run, 2026-10-20)',
    testCases: [{ id: 'TC-APP018-039', steps: [3] }],
  },
  {
    no: 39,
    blocker: 'A tender cannot be created: "Create tender" answers HTTP 500 for every approved purchase request (holds on 2026-10-29 only for a request that already has a tender)',
    category: 'Function',
    scope: '23 Sourcing\nTenders, /sourcing/tenders, "Create tender" (Document = id of an approved purchase request)',
    cause:
      'With a category, the type "open", a close date and the internal id of an approved purchase request of Procurement ' +
      '(/procurement/requests: the requests of 09 and the seed requests PO-001 and PO-USG), "Save" posts and gets HTTP 500, toast ' +
      '"Minified React error #441" (seen 2026-10-15). Without a tender no bid, agreement or deposit can be recorded. On 2026-10-29 the save answers "Saved." for a request that has no tender yet (a request raised and approved just before), and the tender is listed as draft; a second tender for the same request still answers HTTP 500 (digest 3536862028) instead of a refusal. The tests start each tender from its own new request.',
    fix: '1. Fix the creation of a tender from an approved purchase request.\n2. Run TC-APP023-005, 006, 008 … 010, 012 … 014, 016 … 018 and 020 again.',
    who: 'Development',
    howFound: 'Seen on the site (automation of 23 Sourcing)',
    // Since 2026-10-29 a tender saves for a request with no tender yet (TC-APP023-005 "Saved.", draft); the sourcing tests run again.
    testCases: [],
  },
  {
    no: 40,
    blocker: 'Pickers and lists reach only their first records: a record past them cannot be chosen or found',
    category: 'Function',
    scope:
      'Type-ahead pickers: Department (01/02 Book, Arrival, queues), Bed (04 Admissions), Employee (10 Leave, 17 Payroll), ' +
      'Account (19 Budget posting rules, the account lists of Journals, documents and Finance desks), Order (12 "Schedule and report", its first 20)\nDesk lists: /billing/plans (14 Patient plan), /housekeeping/*, /maintenance/*, /fixed-assets/*, /services/*\n' +
      'Search of Users and Departments and the User Site Mapping list (18 Settings), filter of the Item list (07)',
    cause:
      'A type-ahead picker filters the records the page loaded once (the first 50 by name) and never asks the server: typing the ' +
      'full name of a record past them gives "No matching department" (QA Poli Umum, number 51+ of 75 departments) or no hit ' +
      '(new employees QA-EMP-…, X QA Pegawai, all present among the 297 employees; new bed QA-199-…, present on Beds; account QA-XSS-…). The desk lists show their first 22 rows with no ' +
      'paging and no search, and the server sends them only its first 40 records, so a document saved now is never listed (its status cannot be read; its id ' +
      'is taken from the answer of the save). The search of Users and ' +
      'Departments and the status filter of the Item list narrow only the page on screen. User Site Mapping draws only 24 rows of each page of 50 ("Showing 51–100 of 127" lists 24 ' +
      'logins), so the line of a new user is often never shown. Seen 2026-10-21 once the shared site held more than 50 records ' +
      '(Users 107, Departments 75); the same tests passed on 2026-10-18. Workaround used on 2026-10-21 for 01/02: the 39 test ' +
      'departments "QA Poli Uji …" renamed "QA Zz Poli Uji …" so that QA Poli Umum is among the first 50 again.',
    fix:
      '1. Search pickers and lists on the server (or load all records); give the desk lists paging or a search, newest first.\n' +
      '2. Run the listed test cases and the chains E2E-001, 003, 008, 010, 012, 013, 014, 018, 025, 026, 027, 029, 032, 035, 044 and 048 again.',
    who: 'Development',
    howFound: 'Seen on the site (full run of 2026-10-21, docs/qa/run-summary-2026-10-21.md)',
    testCases: [
      { id: 'TC-APP005-017', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP007-008', steps: [3, 4] },
      { id: 'TC-APP005-038', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP015-011', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP017-009', steps: [1, 2] },
      { id: 'TC-APP017-017', steps: [1, 2, 3] },
      { id: 'TC-APP017-018', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP017-019', steps: [1, 2, 3] },
      { id: 'TC-APP017-027', steps: [1, 2, 3] },
      { id: 'TC-APP013-013', steps: [1, 2, 3] },
      { id: 'TC-APP010-021', steps: [1, 2, 3, 4] },
      { id: 'TC-APP010-039', steps: [2, 3, 4] },
      { id: 'TC-APP004-017', steps: [1, 2, 3, 4] },
      { id: 'TC-APP004-022', steps: [2] },
      { id: 'TC-APP004-023', steps: [1, 2, 3] },
      { id: 'TC-APP004-039', steps: [1, 2, 3, 4] },
      { id: 'TC-APP005-018', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP004-033', steps: [2] },
      { id: 'TC-APP004-035', steps: [2] },
      { id: 'TC-APP001-053', steps: [2, 3] },
      { id: 'TC-APP002-017', steps: [2, 3] },
      { id: 'TC-APP004-018', steps: [3, 6] },
      { id: 'TC-APP004-034', steps: [2, 3] },
      { id: 'TC-APP010-008', steps: [2, 3, 4] },
      { id: 'TC-APP010-009', steps: [1, 2] },
      { id: 'TC-APP010-010', steps: [1, 2] },
      { id: 'TC-APP010-011', steps: [1, 2] },
      { id: 'TC-APP010-012', steps: [1, 2, 3] },
      { id: 'TC-APP010-016', steps: [1, 2, 3] },
      { id: 'TC-APP010-017', steps: [1, 2, 3] },
      { id: 'TC-APP010-018', steps: [1, 2, 3] },
      { id: 'TC-APP010-019', steps: [2, 3, 4, 5] },
      { id: 'TC-APP010-022', steps: [2, 3, 4, 5] },
      { id: 'TC-APP010-023', steps: [2, 3] },
      { id: 'TC-APP010-013', steps: [6, 7, 8] },
      { id: 'TC-APP010-020', steps: [1, 2] },
      { id: 'TC-APP010-032', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP026-013', steps: [3, 4] },
      { id: 'TC-APP012-029', steps: [2] },
      { id: 'TC-APP012-025', steps: [2] },
      { id: 'TC-APP014-057', steps: [3] },
      { id: 'TC-APP004-010', steps: [2, 3] },
      { id: 'TC-APP004-006', steps: [4] },
      { id: 'TC-APP004-074', steps: [1, 2] },
      { id: 'TC-APP026-005', steps: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { id: 'TC-APP005-042', steps: [1, 2] },
      { id: 'TC-APP019-042', steps: [2, 3, 4, 5] },
      { id: 'TC-APP019-043', steps: [1, 2] },
      { id: 'TC-APP001-023', steps: [2] },
      { id: 'TC-APP022-007', steps: [1, 2, 3, 4] },
      { id: 'TC-APP019-002', steps: [1, 2] },
      { id: 'TC-APP019-003', steps: [1, 2] },
      { id: 'TC-APP019-021', steps: [1, 2, 3, 4] },
      { id: 'TC-APP026-006', steps: [4, 5] },
      { id: 'TC-APP026-012', steps: [2, 3, 4, 5, 6] },
      { id: 'TC-APP010-033', steps: [3, 4] },
      { id: 'TC-APP017-001', steps: [2, 3, 4, 5] },
      { id: 'TC-APP017-003', steps: [1, 2, 3, 4] },
      { id: 'TC-APP017-005', steps: [3, 4, 5] },
      { id: 'TC-APP017-008', steps: [1, 2, 3] },
      { id: 'TC-APP017-010', steps: [1, 2, 3] },
      { id: 'TC-APP017-012', steps: [1, 2, 3, 4] },
      { id: 'TC-APP017-013', steps: [1, 2] },
      { id: 'TC-APP017-014', steps: [2, 3, 4, 5] },
      { id: 'TC-APP017-015', steps: [1, 2, 3, 4] },
      { id: 'TC-APP017-016', steps: [1, 2, 3] },
      { id: 'TC-APP017-026', steps: [1, 2, 3] },
      { id: 'TC-APP017-051', steps: [1, 2, 3, 4] },
      { id: 'TC-APP018-031', steps: [4] },
      { id: 'TC-APP018-041', steps: [1, 2, 3] },
      { id: 'TC-APP018-042', steps: [1, 2] },
      { id: 'TC-APP019-033', steps: [3] },
      { id: 'TC-APP022-001', steps: [3, 4, 5, 6] },
      { id: 'TC-APP022-003', steps: [4] },
      { id: 'TC-APP024-004', steps: [3, 4, 5] },
      { id: 'TC-APP024-013', steps: [2, 5] },
      { id: 'TC-APP026-004', steps: [3, 4, 5, 6, 7, 8] },
      { id: 'TC-APP026-007', steps: [5, 6, 7, 8] },
      { id: 'TC-APP027-003', steps: [3, 4, 5, 6] },
    ],
  },
  {
    no: 41,
    blocker: 'No patient can be registered in Kemayoran (BR-B): "Register" answers "Registration failed"',
    category: 'Function',
    scope: '01 Ambulatory Care\nRegistered Patients, /registration/patients, "New Registration" on branch Kemayoran',
    cause:
      'A complete registration (visit type Outpatient, names, with or without a date of birth) on Kemayoran posts and gets HTTP 500 ' +
      '(digest 2980747901), toast "Registration failed": for U6 qa.kemayoran (admin of Kemayoran) and for U2 choosing Branch ' +
      '"Kemayoran". The same form on Podomoro saves ("Patient registered"). Kemayoran holds only its 40 seed patients ' +
      '(seen 2026-10-21). PT-B ("QA-AMB Pasien Cabang", BR-B) cannot be made; the tests use a seed patient of Kemayoran instead where they can. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; the registration on Kemayoran still ends with the toast "Registration failed".',
    fix: '1. Fix the registration of a patient on Kemayoran (probably a set-up of the branch the action needs, e.g. its MRN numbering).\n2. Run TC-APP001-024 and TC-APP001-043 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP001-024 and 063, written 2026-10-21)',
    testCases: [
      { id: 'TC-APP001-024', steps: [3, 6] },
      { id: 'TC-APP001-043', steps: [3] },
    ],
  },
  {
    no: 42,
    blocker: 'No imprest advance can be requested: no imprest eligibility can be set up for the branch',
    category: 'Data + Function',
    scope: '19 Finance\nImprest, /finance/imprest, "Advance request" (Save); Branch configuration, /finance/configuration, imprest eligibility ("Add row")',
    cause:
      'Saving an advance of 2000000 for a QA employee with the QA-ATK type answers "The amount exceeds the employee\'s imprest eligibility." ' +
      '(seen 2026-10-28). The precondition is an eligibility row for the employee or the department in the branch configuration, but ' +
      '"Add row" there adds no row to fill (TC-APP019-035, TC-APP019-036 step 3), so no advance, payment of an advance, bill or settlement can follow.',
    fix: '1. Make the imprest eligibility row of the branch configuration usable (or set one for the QA employees of Podomoro).\n2. Run TC-APP019-066 and E2E-042 again.',
    who: 'Site administrator, then Development',
    howFound: 'Seen on the site (TC-APP019-066, written 2026-10-28)',
    testCases: [
      { id: 'TC-APP019-066', steps: [2, 3, 4, 5] },
      { id: 'TC-APP019-067', steps: [1] },
    ],
  },
  {
    no: 43,
    blocker: 'A year balance cannot be saved on the HR desk: "Year balance" answers "pending approval"',
    category: 'Function',
    scope: '10 HR\nHR desk, /hr/desk/leave, dialog "Year balance", action "Year balance" (Save)',
    cause:
      'Saving a year balance 2027 (2027-01-01 to 2027-12-31, 12 days) for an employee of the test answers HTTP 500 (digest 3646853607), ' +
      'toast "Minified React error #441", with the typed leave type and with the code of a leave type made just before (seen 2026-10-28; ' +
      'the same answer on every run since 2026-10-18, TC-APP010-047 and 048). No balance, so no application against it, no approval and no cancellation. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; the year balance of a new employee of the test, with no application of any kind, is refused with "hr: invalid input: pending approval" (the text the workbook gives for a second balance while an application waits, TC-APP010-043 step 4).',
    fix: '1. Fix the save of a year balance on the HR desk.\n2. Run TC-APP010-042, TC-APP010-043 and E2E-040 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP010-042, written 2026-10-22, run 2026-10-28)',
    testCases: [
      { id: 'TC-APP010-042', steps: [3, 4, 5, 6] },
      { id: 'TC-APP010-043', steps: [4] },
    ],
  },
  {
    no: 44,
    blocker: 'A purchase order on Purchase requests needs an existing supplier ("supplier is missing"; was HTTP 500, resolved 2026-10-31)',
    category: 'Function',
    scope: '09 Procurement\nPurchase requests (titled "Purchase orders"), /procurement/requests, button "order"',
    cause:
      'An order of supplier, item (X-ITM1 of Inventory), quantity 50, rate 1000, tax PPN and terms "30 hari" answers HTTP 500 (digest 1569332509), ' +
      'toast "Minified React error #441": as in the workbook, with the id of an approved purchase request of the test in "Document", and with ' +
      'the existing vendor "QA PT Medika Uji" (seen 2026-10-28). No order, so no send, approval, amendment or follow-up can be tried. Resolved on 2026-10-31: the order is refused with "procurement: invalid input: supplier is missing" for the made-up supplier of the workbook and for "QA PT Medika Uji", and saves with the seed supplier "PT Enseval" (as on Receipts, TC-APP009-046); the tests order with the seed supplier.',
    fix: '1. Fix the save of an order on /procurement/requests (or name what it needs).\n2. Run TC-APP009-043 and TC-APP009-045 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP009-043, written 2026-10-22, run 2026-10-28)',
    testCases: [],
  },
  {
    no: 45,
    blocker: 'The financial year 2026 of Podomoro has no periods: no journal, voucher or payment dated today can be saved',
    category: 'Data',
    scope: '19 Finance\nFinancial years, /finance/financial-years (year 2026: "Periods 0"); Journals, the documents and Payments (Save)',
    cause:
      'The open year 2026 (2026-01-01 to 2026-12-31, monthly) lists 0 periods. A manual journal dated today answers "No financial period covers ' +
      'this date." and a payment "no period for the voucher date" (seen 2026-10-28). The site checks the period first, so the other refusals of ' +
      'the dialog (balance, lines, narration, dates) are not reached either. The periods are made by "Periods" on the year, a set-up of the ' +
      'books for every user, left to the finance administrator.',
    fix: '1. Generate the periods of the financial year 2026 (Financial years, "Periods").\n2. Run TC-APP019-044 to 055 again.',
    who: 'Finance administrator',
    howFound: 'Seen on the site (TC-APP019-044, written 2026-10-28)',
    testCases: [
      { id: 'TC-APP019-044', steps: [3, 4, 5, 6, 7] },
      { id: 'TC-APP019-045', steps: [1, 2, 3, 4] },
      { id: 'TC-APP019-046', steps: [1, 5] },
      { id: 'TC-APP019-048', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP019-049', steps: [1, 2, 3] },
      { id: 'TC-APP019-050', steps: [3, 4, 5, 6] },
      { id: 'TC-APP019-051', steps: [1, 2, 3, 4, 5] },
      { id: 'TC-APP019-052', steps: [2, 3, 4] },
      { id: 'TC-APP019-054', steps: [3, 4] },
      { id: 'TC-APP019-055', steps: [2] },
    ],
  },
  {
    no: 46,
    blocker: 'No user can approve a finance document: "Approve" answers "missing required privilege" (the tenant has no FINANCE_APPROVE)',
    category: 'Data + Function',
    scope: '19 Finance\nLegal agreements, Loans, Security receipts, Bank guarantees, Letters of credit, Payment requests, Rough sheets ("Approve" on a row)',
    cause:
      '"Send" moves a document of the test to "Pending"; "Approve" then answers "missing required privilege" for U1 rs.admin2 and for U5 ' +
      'qa.approver (roles finance, budget, cssd, procurement), seen 2026-10-28. 00-prerequisites.xlsx records that the right FINANCE_APPROVE ' +
      'does not exist on the tenant, so no role can be given it. Nothing that follows an approval (posting, disposal, encashment, renewal, ' +
      'payment of a request) can be tried; "Source document" of a payment request from an agreement offers no approved agreement.',
    fix: '1. Add the finance approval right to the tenant and to the approver role (U5 qa.approver).\n2. Run TC-APP019-068 to 078 again.',
    who: 'Development, then Site administrator',
    howFound: 'Seen on the site (TC-APP019-070, written 2026-10-28)',
    testCases: [
      { id: 'TC-APP019-068', steps: [2, 3] },
      { id: 'TC-APP019-069', steps: [3] },
      { id: 'TC-APP019-070', steps: [2, 3, 4] },
      { id: 'TC-APP019-071', steps: [2] },
      { id: 'TC-APP019-072', steps: [2, 3, 4] },
      { id: 'TC-APP019-073', steps: [1] },
      { id: 'TC-APP019-074', steps: [2, 3, 4] },
      { id: 'TC-APP019-075', steps: [1] },
      { id: 'TC-APP019-076', steps: [2, 3, 5] },
      { id: 'TC-APP019-078', steps: [2, 3, 4] },
    ],
  },
  {
    no: 47,
    blocker: 'A dispense with a line discount above the maximum cannot wait for the cashier: "chain not found: billingdiscount"',
    category: 'Data + Function',
    scope: '05 Pharmacy\nDispense, /pharmacy/dispense, "Confirm dispense" with a line discount above "Maximum line discount (%)"; 14 Hospital Accounts, Fast Cashier, "Dispense discounts"',
    cause:
      'With "Maximum line discount (%)" 10 (05 catalogue), a counter sale of QA-PARA x 2 with a line discount of 20 answers HTTP 500 ' +
      '(digest 2492312887), toast "Minified React error #441" (seen 2026-10-28). The panel "Dispense discounts" of Fast Cashier stays empty, ' +
      'so no discount can be approved or rejected. Seen again on 2026-10-31: no HTTP 500 any more; the dispense is refused with "advanceDispense: 400 pharmacy: this discount needs the approval chain: workflow: chain not found: \\"billingdiscount\\"". The discount approval chain is not set up (as for found blocker 34), so still no discount waits. The chain cannot be made on the site (checked 2026-10-31 with the go-ahead of the tester): Workflow, Process definitions lists 11 processes and no billing discount process, has no button to add one, and its "Edit chain" dialog keeps the process key read-only ("Available process keys: discharge and purchase order").',
    fix: '1. Add the process "billingdiscount" to Workflow (Development: the screen offers only discharge and purchase_order), give it its step, then check that a line above the maximum waits in "Dispense discounts".\n2. Run TC-APP005-016, 036, 037 and TC-APP014-070, 071 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP014-070, written 2026-10-28)',
    testCases: [
      { id: 'TC-APP005-016', steps: [1, 2, 3, 4, 5, 6] },
      { id: 'TC-APP005-036', steps: [1, 2, 3, 4] },
      { id: 'TC-APP005-037', steps: [1, 2, 3, 4] },
      { id: 'TC-APP014-070', steps: [1, 2, 3] },
      { id: 'TC-APP014-071', steps: [2, 3] },
    ],
  },
  {
    no: 48,
    blocker: 'A saved unsterile receipt does not open: its page never loads and times out (nginx 504 until 2026-10-30, "The operation was aborted due to timeout" since)',
    category: 'Function',
    scope: '21 CSSD\nUnsterile Receipt, /cssd/receipts/<id> ("Open" on a row of the list)',
    cause:
      'A receipt of the test is saved (toast "Receipt saved.") and listed ("Pending", "With the writer"), but "Open" on its row never ' +
      'shows the document: GET /id/cssd/receipts/<id> answers 504 after a minute, and while it hangs other pages of the site ' +
      '(/api/notifications, /id/cssd) answer 504 too. Seen in every run of 2026-10-28 and 2026-10-29, and in a read-only check on an idle ' +
      'site on 2026-10-29 (UR-0014 did not open within 120 s, while the list opened in 0.7 s). A saved receipt cannot be sent, approved or ' +
      'cancelled, so no set reaches the CSSD store unsterile and no cycle can load it. Seen again on 2026-10-31: no 504 any more, but the page of a saved receipt reads "The operation was aborted due to timeout" and shows no action (TC-APP021-012, 014, 017, 019, 029).',
    fix: '1. Fix the page of a saved unsterile receipt (it should open with "Send for Approval").\n2. Run TC-APP021-012, 014, 017, 019 and 029 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP021-012, 2026-10-29)',
    testCases: [
      { id: 'TC-APP021-012', steps: [4, 5, 6] },
      { id: 'TC-APP021-014', steps: [1] },
      { id: 'TC-APP021-017', steps: [3, 4, 5, 6, 7] },
      { id: 'TC-APP021-019', steps: [1] },
      { id: 'TC-APP021-029', steps: [3] },
    ],
  },
  {
    no: 49,
    blocker: '"Calculate" on Diet orders answered HTTP 500 (resolved 2026-10-31)',
    category: 'Function',
    scope: '13 Dietary\nDiet orders, /diet/orders, button "Calculate"',
    cause:
      '"Calculate" posts the assessment of the first prescription of the list (female, 60 kg, 160 cm, as the workbook says) and gets HTTP 500 ' +
      '(digest 3479685728), toast "Minified React error #441"; seen on every run since 2026-10-21 (E2E-045 and TC-APP013-040, on /en and on /id). ' +
      'The first line stays "pending", so no BMI is shown and the order of step 4 is not tied to an assessed prescription. Resolved on 2026-10-31: "Calculate" answers; it acts on the first prescription of the list (sorted by patient name), and an assessed or ordered first line is refused with "diet: invalid input: prescription is not pending". TC-APP013-040 names its patient so that its prescription is the first.',
    fix: '1. Fix the assessment of "Calculate" on Diet orders.\n2. Run TC-APP013-040 and E2E-045 again.',
    who: 'Development',
    howFound: 'Seen on the site (E2E-045, 2026-10-21; TC-APP013-040, 2026-10-29)',
    testCases: [],
  },
  {
    no: 50,
    blocker: 'A sourcing agreement cannot be saved: "accept a bidder on the sheet first" for a tender with an accepted bidder',
    category: 'Function',
    scope: '23 Sourcing\nAgreements, /sourcing/agreements, dialog "Agreements", action "Agreement" (Document = id of the tender)',
    cause:
      'For a published tender (closed the day before) whose bid of the test is submitted, opened, evaluated (grade A), rated "accepted" on the ' +
      'sheet and accepted, the agreement with number, vendor, item, price 1450000 and the tender id answers HTTP 500 (digest 3681885900), toast ' +
      '"Minified React error #441"; the same with a budget head of the test and an amount on the second step (seen 2026-10-29, TC-APP023-012, ' +
      '013, 014, 020 and E2E-009). With no agreement there is no approval, sanction (budget reservation) or amendment. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; the agreement is refused with "sourcing: invalid input: accept a bidder on the sheet first", although the bid of the test is accepted ("Saved.") and its bidder rated "accepted" on the sheet; the same with the bidder\'s name or code as vendor (checked 2026-10-31).',
    fix: '1. Fix the save of an agreement from a tender (or name what it still needs).\n2. Run TC-APP023-012, 013, 014, 020 and E2E-009 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP023-012, written 2026-10-29)',
    testCases: [
      { id: 'TC-APP023-012', steps: [3, 4, 5, 6, 7] },
      { id: 'TC-APP023-013', steps: [3, 4, 5, 6, 7] },
      { id: 'TC-APP023-014', steps: [2] },
      { id: 'TC-APP023-020', steps: [5] },
    ],
  },
  {
    no: 51,
    blocker: 'Lists leave new records out for a while: a new item of Item Master, and a new dispense line of Pharmacy Issue Lines',
    category: 'Function',
    scope: '07 Inventory\nItem Master, /inventory/items, dialog "Add Item" (Minimum stock 20, Maximum stock 500), the list paged to the end; 05 Pharmacy, Issue Lines, /pharmacy/issue-lines (Return)',
    cause:
      'Saving item IT-1 of the catalogue (code QA-INV-PARA-…, minimum 20, maximum 500) posts and gets HTTP 200 and the toast "Item added.", ' +
      'but the code is on none of the pages of the list right after, nor an hour later (seen 2026-10-29 06:20–08:00 in TC-APP007-001, ' +
      'E2E-008 and E2E-035, 324 items paged to the end). At 12:40 the same items are listed (page 5), and an item saved at 12:30 was listed ' +
      'at once. The item is stored; the list leaves new items out for a while, so the step that reads, edits or stocks it cannot go on. On 2026-10-31 a new item was listed at once at 16:15 but not at 16:45, also two minutes later (TC-APP007-001). The same holds for Pharmacy Issue Lines: at 16:50 its 263 lines (paged to the end) held none of the sales of the hour before, so a line sold by TC-APP005-040 could not be returned; at 16:15 the same return worked.',
    fix: '1. Find why the list leaves out new items for a while (a cache of the item list?) and fix it.\n2. Run TC-APP007-001, E2E-008 and E2E-035 again.',
    who: 'Development',
    howFound: 'Seen on the site (E2E-008, 2026-10-29)',
    testCases: [
      { id: 'TC-APP007-001', steps: [4] },
      { id: 'TC-APP005-040', steps: [2, 5] },
    ],
  },
  {
    no: 52,
    blocker: '"Confirm dispense" answered HTTP 500 with Freeze days set or for a namesake (resolved 2026-10-31: now refusals)',
    category: 'Function',
    scope: '05 Pharmacy\nDispense, /pharmacy/dispense, step "Confirm" (counter sale)',
    cause:
      'Two cases, each on every run since 2026-10-15 (2026-10-21 on /en, 2026-10-29 on /id): (1) with "Freeze days" 30 for Podomoro, a sale ' +
      'of QA-FRZ × 5 from a batch that expires in 400 days answers HTTP 500 (digest 1783668951), toast "Minified React error #441", and so ' +
      'does the sale after Freeze days is set to 29; (2) a sale to PT-2 while PT-3 of the same name is admitted answers HTTP 500 too. ' +
      'The workbook expects the sale to be confirmed; a refusal would be a message, not a server error. Resolved on 2026-10-31 as a blocker: the sale with Freeze days 30 is confirmed from the right batch (TC-APP007-009, TC-APP005-033 steps 2 and 3); after Freeze days 29 the batch expiring in 30 days is refused ("not enough stock"), and the sale to PT-2 is refused with "Patient has been admitted": both recorded as deviations.',
    fix: '1. Fix "Confirm" of a counter sale with Freeze days set, and for a patient whose namesake is admitted.\n2. Run TC-APP005-028 and TC-APP005-033 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP005-033 and 028, since 2026-10-15)',
    testCases: [],
  },
  {
    no: 53,
    blocker: '"Revert latest stamp" on the laboratory Work desk fails ("bad_request")',
    category: 'Function',
    scope: '11 Laboratory\nWork, /laboratory/work, action "Revert latest stamp" on an order',
    cause:
      'For an order of the test whose last step ("Review") was made a moment before, "Revert latest stamp" posts the order id to ' +
      '/id/laboratory/work and gets HTTP 500 (digest 3196244996), toast "Minified React error #441"; the same on 2026-10-21 (/en) and ' +
      '2026-10-29 (/id). The latest step of an order cannot be undone. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; "Revert latest stamp" now answers the toast "bad_request" and the step is not undone.',
    fix: '1. Fix "Revert latest stamp" on the laboratory Work desk.\n2. Run TC-APP011-041 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP011-041, 2026-10-21 and 2026-10-29)',
    testCases: [{ id: 'TC-APP011-041', steps: [1] }],
  },
  {
    no: 54,
    blocker: 'The Triage dialog of Emergency Patients offers no triage category',
    category: 'Function',
    scope: '15 Emergency\nEmergency Patients, /emergency/patients, "Triage" on a row, list "Triage category"',
    cause:
      'For a received patient of the test, the dialog "Triage" opens with the lists "Patient condition" and "Patient status" filled, but ' +
      '"Triage category" holds only its placeholder, also after 15 s (seen 2026-10-29 on /id; the same test saved a triage on 2026-10-21). ' +
      'The categories exist (Triage categories screen, TC-APP015 categories tests pass), so no triage can be saved and nothing that ' +
      'follows it (overdue mark, second triage, flag) can be checked.',
    fix: '1. Make the Triage dialog load the categories of the branch.\n2. Run TC-APP015-037 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP015-037, 2026-10-29)',
    testCases: [{ id: 'TC-APP015-037', steps: [2, 3, 4, 5, 6] }],
  },
  {
    no: 55,
    blocker: '"Save branding" with an uploaded logo fails ("Failed to save branding.")',
    category: 'Function',
    scope: '18 Settings\nTenant Branding, /identity/branding, "Upload logo" then "Save branding"',
    cause:
      'With the product name of the test, a PNG logo of 320 × 80 px uploaded ("This file is 320 × 80 px.") and the locale en, "Save branding" ' +
      'posts the logo as a data URL and gets HTTP 500, toast "Failed to save branding." (seen 2026-10-29; the screen now also has a radio ' +
      'group "Tampilan" Text/Logo). The new branding cannot be saved, so the header and sign-in page cannot show it. Seen again on 2026-10-31 after the fixes of 2026-10-30: no HTTP 500 is recorded any more; "Save branding" with the logo still shows "Failed to save branding.".',
    fix: '1. Fix the save of the branding with an uploaded logo.\n2. Run TC-APP018-043 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP018-043, 2026-10-29)',
    testCases: [{ id: 'TC-APP018-043', steps: [2, 3, 4] }],
  },
  {
    no: 56,
    blocker: '"Pay" with nothing more to collect fails with a database error',
    category: 'Function',
    scope: '14 Hospital Accounts\nFast Cashier, /billing/cashier: "Pay" with cash 0 on a sale whose deposits cover the bill; "Refund payment" above "Refund limit (IDR)"',
    cause:
      'Seen 2026-10-30 (the cashier cases passed on 2026-10-21): a walk-in sale of 150,000 (net 166,500) with deposits of 166,500, "Pay" with ' +
      'the cash amount 0 shows the red box "Minified React error #441" (HTTP 500) and the sale stays Draft; the same after a reopened sale ' +
      'was discounted. "Refund payment" of 150,000 on a paid sale (limit 100,000) answers HTTP 500 too, instead of holding the refund for approval. Seen again on 2026-10-31: no HTTP 500; "Pay" with cash 0 shows the red box "ERROR: new row for relation \\"tender_receipts\\" violates check constraint \\"tender_receipts_amount_pos\\" (SQLSTATE 23514)" and the sale stays Draft (TC-APP014-004, 010). The refund above the limit (TC-APP014-009) no longer fails with a server error: it waits for the missing billing discount chain (found blocker 34).',
    fix: '1. Fix "Pay" when nothing more is due, and the refund above the limit.\n2. Run TC-APP014-004, 009 and 010 again.',
    who: 'Development',
    howFound: 'Seen on the site (TC-APP014-004, 009, 010, 2026-10-30)',
    testCases: [
      { id: 'TC-APP014-004', steps: [2] },
      { id: 'TC-APP014-010', steps: [3, 4] },
    ],
  },
  {
    no: 57,
    blocker: '"Link me" on HR, My profile answered HTTP 500 for an account already linked (resolved 2026-10-31: refused "duplicate")',
    category: 'Function',
    scope: '10 HR\nMy profile, /hr/desk, dialog "My profile" with the action "Link me"',
    cause:
      'Seen 2026-10-30 (chain E2E-039 step 7, TC-APP010-040 step 4): "Link me" with the number of a new employee of the test answers HTTP 500, ' +
      'toast "Minified React error #441". The account U1 was linked to an employee of an earlier run of the same test; moving the link to a ' +
      'new employee, or telling the user that the account is already linked, does not happen. Resolved on 2026-10-31: the account is refused with "hr: invalid input: duplicate" (fix option 2, a refusal); the link is not moved, recorded as a deviation of TC-APP010-040 step 4.',
    fix: '1. Let "Link me" move the link, or refuse with a message.\n2. Run TC-APP010-040 and the chain E2E-039 again.',
    who: 'Development',
    howFound: 'Seen on the site (E2E-039, 2026-10-30)',
    testCases: [],
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
