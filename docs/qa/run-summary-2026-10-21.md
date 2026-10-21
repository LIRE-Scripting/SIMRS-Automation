# SIMRS run summary – full run of 2026-10-21

Site: https://rs.showcase.atklik.xyz · branch **Podomoro** (U2 for "All branches") · writes: `QA_ALLOW_WRITES=1` (go-ahead of 2026-10-21)

The detail is in these files:

| File | Contents |
|---|---|
| `reports/summary/simrs-run-summary.xlsx` | Overview, Modules, E2E chains, Failures (cause, next action, owner), Blockers, HTTP 5xx (every request with its body and digest), Test cases |
| `reports/e2e/<NN-module>.xlsx` | Module workbooks: every step with Execution Status, Actual Result, Defect Reference, Automation notes and a screenshot link |
| `reports/e2e-chains/e2e-journeys.xlsx` | The 50 E2E chains, step by step |
| `docs/qa/blockers-found.md` | Every blocker found by the automation, including the new blocker 40 |

## 1. Summary

### Modules (27 applications, 1,604 workbook test cases)

| Status | 2026-10-21 | 2026-10-18 | Meaning |
|---|---|---|---|
| Passed | **576** | 545 | every step met its Expected Result |
| Deviation | **200** | 170 | the test ran to the end; a step differs from its Expected Result (the site's behaviour is recorded) |
| Failed | **74** | 82 | the test stopped on an error |
| Blocked | **276** | 256 | a known blocker stopped steps |
| Not run | **478** | 551 | Automation Candidate = No, waits for a user or role, or **has no test yet (191)** |

Of the 850 test cases that ran to a result (Passed + Deviation + Failed), **576 (68%) passed in full**.

### E2E chains (50 cross-application chains)

| Status | 2026-10-21 | 2026-10-18 |
|---|---|---|
| Passed | 2 (E2E-024, E2E-046) | 2 |
| Deviation | 3 (E2E-006, 022, 023) | 4 |
| Failed | 24 | 17 |
| Blocked | 21 | 27 |

The rise in failed chains has two main sources:

- **5 chains now fail on the automation** (E2E-009, 011, 040, 042, 050). Since users U3–U7 were made (2026-10-20), steps that used to "stop as planned" should now run.
- **Capped pickers and lists** (blocker 40, section 3.1), which show now that the shared data has grown.

### Conclusions

1. **The largest new defect is blocker 40: pickers and lists reach only their first records.**
   - Type-ahead pickers (Department, Bed, Employee, Account) search only the first 50 records the page loaded.
   - The desk lists (Housekeeping, Maintenance, Fixed assets, Services) show 22 rows with no paging.
   - The search of Users, Departments and Branch map filters only the page on screen.
   - Once the data grows past these limits, a new record is "not found".

   About 80 test cases and 16 chains failed on it. For 01/02, the departments "QA Poli Uji …" were renamed (with your approval); the 01/02 rerun went from 50 failed to 8.
2. **HTTP 500 on valid input** remains on dispense confirm, lab revert, diet calculate, paying with deposits, housekeeping contracts, AMC and a few more (section 3.2).
3. **Wrong input is refused with HTTP 500 instead of a validation message** in 106 negative/boundary tests. Examples: a duplicate patient or MRN, a duplicate appointment type, a service order without a document. The wrong data is not saved, but the user gets no proper message.
4. **Old blockers** stop the most test cases:

   | Blocker | Problem | Test cases |
   |---|---|---|
   | 2 / 25 | Donor and blood request in Transfusion Medicine | 46 + 7 |
   | 13 | Branch set-up | 39 |
   | 5 | "All branches" lists | 29 |
   | 14 | Records from another application | 20 |
   | 10 | Saved items are listed nowhere | 14 |
   | 39 | A tender cannot be created (HTTP 500) | 12 |
   | 23 | Ward care does not offer the stays of the branch | 12 |
5. **Automation gap**: 191 test cases are now "automate" but have no test yet. 6 tests in 01 fail with "write its test", and 5 chains stop in a way that no longer applies.

## 2. The run and the data guarantees

| Stage | Time (WIB) | Result |
|---|---|---|
| Modules 01–27 (1 worker, without TC-APP014-011) | 15:04–17:57 | 836 passed, 116 failed, 471 skipped (Playwright statuses) |
| 49 E2E chains (without E2E-033) | 17:57–18:17 | |
| TC-APP014-011 (closes the cashier day), then E2E-033 | 18:17–18:18 | 014-011 passed; E2E-033 failed on the run order (see the chains) |
| Rename of 39 departments "QA Poli Uji …" → "QA Zz Poli Uji …" | 18:18 | all HTTP 200; the booking picker offers `QA-DEP-1 · QA Poli Umum` again |
| Rerun of 01 + 02 | 18:19–18:34 | 93 passed, 8 failed, 28 skipped |

The first run was stopped in its first minutes and started again (see 2.1, point 2).

### 2.1 No duplicate data

1. **Every saved value carries the prefix `QA-` and a token new per run** (`lib/qa-data/names.ts`: run id + worker + counter). Each Playwright invocation has its own run id, so no name or code repeats across runs.
2. **Shared data (DEP-1, DR-1, pharmacy items, leave types, …) is looked up before it is made.**
   - In the first minute, the lookup of `QA-DEP-1` did not find it: the Departments search filters only the page on screen, and the record was on page 2. The test tried to make it again, and **the site refused, so nothing was saved**.
   - The run was stopped at once. `MasterListPage.rowsWith` and `Mdm.row` now look at every page, and the run was started again.
3. **`ensureLeaveTypes` is fixed.** It could read the leave types before they had loaded.
   - The site holds **4× "QA-Annual" and 4× "QA-Lama"** with identical names. There were already 4 on 2026-10-18 and still 4 today, so **they are not from this run**.
   - The site does not refuse a repeated leave type name either: missing validation, to report to Dev.
4. **The deliberate duplicate tests save nothing.** TC-APP001-027 registers the same patient twice. The site refuses it (with HTTP 500), and step 3 checks there are exactly 2 rows: the original patient and the one with another date of birth.
5. **The department rename** changed only the names of QA's own test departments (codes and tokens unchanged). No production department and not `QA Poli Umum` itself were touched.

### 2.2 HTTP 500

The fixture (`fixtures/e2e.ts`, `serverErrors`) records every 5xx answer of the site with its method, URL, request body and Next.js digest. All of them are in sheet **HTTP 5xx**.

| Group | Requests | Tests | Meaning |
|---|---|---|---|
| Known blocker | 72 | 47 | a 500 already recorded as a blocker (2, 25, 26, 31, 39, 38, …) |
| Negative/boundary test | 240 | 106 | input wrong on purpose or at a limit; the site refuses it, but with a 500, not a message |
| Positive test | 40 | 34 | input meant to be valid; a server error not yet recorded as a blocker |
| From the first run of 01/02, superseded by the rerun | 19 | 13 | not counted |

The groups come from the test type, so the request bodies still need a look in the sheet. Cases checked by hand:

- **Not wrong input:**
  - Dispense confirm (TC-APP005-028/033): item QA-PARA, quantity 1, the right store and site.
  - Lab revert (011-041), diet Calculate (013-040) and Pay with deposits (014-004/010).
- **Wrong input on purpose, answered with a 500:**
  - Duplicate patient or MRN (001-027/029/030): the workbook expects the toast "A patient already matches…" or "MRN already exists…".
  - Duplicate appointment type (001-051, 002-015).

A run cannot keep the site from answering 500, since that is a server defect. What it does guarantee: every 500 is recorded with its input, so Dev can find it in the server log by its digest.

## 3. Cross-module blockers and defects

### 3.1 Blocker 40: pickers and lists reach only their first records

Registered in `lib/qa-data/found-blockers.ts` and `docs/qa/blockers-found.md`, with the failing step of each test case. The tests keep running, so they pass by themselves once the defect is fixed.

| Where | Symptom | Tests affected |
|---|---|---|
| Department (Book, Arrival, queues) | only the first 50 departments; `QA Poli Umum` was number 51+ | 01/02 (42 TC before the rename), E2E-001/018/025/048 |
| Bed (ADT) | the new bed `QA-103/199-…` is not offered | 04-034, E2E-026/029 |
| Employee (Leave, Payroll) | the new employees `QA-EMP-…` and `X QA Pegawai` are not offered | 10 (12 TC), 17 (11 TC), E2E-010 |
| Account (Budget posting rules) | the run's QA-XSS account is not in the select | 19-033 |
| Housekeeping/Maintenance/Fixed assets/Services desk lists | the first 22 rows, no paging or search | 22-001/003, 24-004, 26-004/007, 27-003, E2E-012/013/014/032/044 |
| Users/Departments/Branch map search | filters only the page on screen | 18-031/041/042 |
| RIS "Schedule and report", Inventory items | a new order or item cannot be chosen or found; probably the same defect, to confirm | 03-048/051, E2E-003/008/027/035 |

The workbook already expects this: steps 2–3 of TC-APP001-053 test the pickers with more than 50 users and more than 50 departments.

**Next action:**
- **Dev:** search pickers and lists on the server (or load everything), and give the desk lists paging or a search, newest first.
- **QA:** once fixed, rerun modules 03/04/10/17/18/19/22/24/26/27 and the chains concerned.

### 3.2 HTTP 500 on valid input (not yet a blocker)

| Action | Tests | Request |
|---|---|---|
| Dispense confirm (walk-in) | 05-028, 05-033 (05-042 follows) | `POST /en/pharmacy/dispense`, step confirm |
| Revert latest stamp (lab) | 11-041 | `POST /en/laboratory/work` |
| Diet "Calculate" (assessment) | 13-040, E2E-045 | `POST /en/diet/orders` |
| Pay a bill already covered by deposits | 14-004, 14-010 | `POST /en/billing/cashier` |
| Save a housekeeping contract | 24-010…013 | `POST /en/housekeeping/contracts` |
| Save an AMC document | 26-009 | `POST /en/maintenance/amc` |
| Others (once per test) | see sheet HTTP 5xx, group "Positive test" | |

**Next action Dev:** look up the digest in the server log, fix the action, then rerun its tests.

### 3.3 Refusals answered with HTTP 500 (validation without a message)

106 tests. Examples:
- duplicate patient registration and duplicate MRN (01)
- duplicate appointment type (01/02)
- OT requests (08, 9 tests)
- goods receipt (09)
- housekeeping locations and logs (24)
- maintenance plans, work and AMC (26)
- service orders and requests (22)
- diet catalogue (13)
- tariffs and plans (14)

**Next action Dev:** validate the input and answer with the message the workbook names.

### 3.4 Missing validation (wrong data is saved)

| Case | Test |
|---|---|
| A pain policy without a number is saved | 08-038 |
| An imprest row without an amount is saved | 19-036 |
| A repeated leave type name is accepted | site: 4× QA-Annual, 4× QA-Lama |

## 4. E2E chains

A chain stops at its first blocker; the steps after it are Blocked. The step detail is in `reports/e2e-chains/e2e-journeys.xlsx`.

| Chain | Name | Status | 2026-10-18 | Cause / stopped at | Next action |
|---|---|---|---|---|---|
| E2E-001 | Outpatient: registration to payment and Finance | Failed | Failed | [site] The chain books or queues the patient in QA Poli Umum; the Department picker searches only the first 50 departments (found blocker 40). | Departments renamed 2026-10-21; rerun these chains after 07:00 WIB (E2E-033 closes the U1 cashier day until then). Dev: picker search on the server. |
| E2E-002 | Laboratory: order from the consultation to the certified result | Blocked | Blocked | Step 1: NEEDS-EVALUATION: 03-patient-care.xlsx / Journeys / row 11: Automation Candidate = Needs Evaluation | see sheet E2E chains |
| E2E-003 | Radiology: order from the consultation to the report | Failed | Failed | [site] The radiology order made in the chain is not offered in RIS "Schedule and report" (the order list does not reach it); same as TC-APP003-048/051. | Dev: RIS order list for the branch (all open orders, newest included); then rerun. |
| E2E-004 | Inpatient: admission to discharge, billing and coding | Blocked | Blocked | Step 4: Blocker 23: TC-APP004-065 step 2, blocker 23 (found by automation, docs/qa/blockers-found.md): Ward care does not offer the stays of the branch; Step 5: NEEDS-EVALUATION: 03-patient-care.xlsx / Journeys / row 8: Automation Candidate | Fix blocker 23 |
| E2E-005 | Emergency: walk-in to admission | Blocked | Blocked | Step 3: Blocker 13: TC-APP015-040 step 2, blocker 13 (00-blockers-checklist-linked.xlsx / Checklist / row 17): Set-up missing on the branch | Fix blocker 13 |
| E2E-006 | Operation theatre: request to consumption | Deviation | Deviation | Step 1: TC-APP008-025 step 1: Excel expects "A dialog with "Branch", …"; the site: no "Branch" field (the request takes the branch of the session) | see sheet E2E chains |
| E2E-007 | Blood: donor to transfusion | Blocked | Blocked | Step 1: Blocker 2: blocker 2 (00-blockers-checklist-linked.xlsx / Checklist / row 6): Donor screen answers HTTP 500 | Fix blocker 2 |
| E2E-008 | Supply: purchase to stock to use | Failed | Failed | [site] The inventory item saved in the chain (QA-INV-PARA-…) is not found in the item list afterwards: the list does not reach the new item (capped list, probably found blocker 40, to confirm). | Dev: item list search/paging that reaches new items; QA: confirm by hand once. |
| E2E-009 | Sourcing: tender to agreement and payment | Failed | Blocked | [automation] The chain still stops "as planned" at a test case that became runnable when users U3-U7 were made (2026-10-20): "is planned to run; stop the chain with its blocked step instead". | QA automation: run that chain step (write the step from the workbook) instead of stopping. |
| E2E-010 | People: employee to payslip and Finance | Failed | Blocked | [site] The Employee picker searches only the records the page loaded first (the new QA-EMP-001 of the chain is not offered); a record past them is "not found" although it exists. Shows since the data grew past the limit. | Dev: search the Employee list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). |
| E2E-011 | Budget: financial year to utilisation | Failed | Blocked | [automation] The chain still stops "as planned" at a test case that became runnable when users U3-U7 were made (2026-10-20): "is planned to run; stop the chain with its blocked step instead". | QA automation: run that chain step (write the step from the workbook) instead of stopping. |
| E2E-012 | Assets: purchase to maintenance to disposal | Failed | Blocked | [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories). | Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. |
| E2E-013 | Housekeeping: cleaning plan to vendor bill | Failed | Failed | [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories). | Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. |
| E2E-014 | Internal services: request to vendor bill | Failed | Failed | [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories). | Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. |
| E2E-015 | Sterile supply: ward request to sterile packs back on the ward | Blocked | Blocked | Step 2: Blocker 13: blocker 13 (00-blockers-checklist-linked.xlsx / Checklist / row 17): Set-up missing on the branch | Fix blocker 13 |
| E2E-016 | Linen: making linen and its circulation | Blocked | Blocked | Step 1: Blocker 14: TC-APP025-001 step 4, blocker 14 (00-blockers-checklist-linked.xlsx / Checklist / row 18): 34 journeys need a record made in another application; Step 1: Blocker 14: TC-APP025-001 step 5, blocker 14 (00-blockers-checklis | Fix blocker 14 |
| E2E-017 | Pharmacy: stock received, counter sale, return, payment and Finance | Blocked | Blocked | Step 5: NEEDS-EVALUATION: 05-pharmacy.xlsx / Journeys / row 14: Automation Candidate = Needs Evaluation | see sheet E2E chains |
| E2E-018 | Medical records: visit document to file loan and return | Failed | Failed | [site] The chain books or queues the patient in QA Poli Umum; the Department picker searches only the first 50 departments (found blocker 40). | Departments renamed 2026-10-21; rerun these chains after 07:00 WIB (E2E-033 closes the U1 cashier day until then). Dev: picker search on the server. |
| E2E-019 | Set-up: branch, units and staff access to the first booking | Blocked | Blocked | Step 4: Blocker 38: TC-APP018-039 step 3, blocker 38 (found by automation, docs/qa/blockers-found.md): Saving the rights of a role answers HTTP 500 ("Failed to save rights."); Step 4: STEP-NOT-RUN: TC-APP018-039 step 4 is not run: a diet re | Fix blocker 38 |
| E2E-020 | Outpatient follow-up: pre-registration, referral, visit and control appointment | Failed | Failed | [site] Blocker 24: the referral/cross-consult type saved in the chain is not listed (the list shows the first rows only, no paging or search). | Dev: blocker 24; then rerun. |
| E2E-021 | Clinical orders (CPOE) from one consultation | Blocked | Blocked | Step 3: Blocker 22: TC-APP003-005 step 1, blocker 22 (found by automation, docs/qa/blockers-found.md): The drug interaction pairs of the shared data are not on the site; Step 3: Blocker 22: TC-APP003-005 step 2, blocker 22 (found by automat | Fix blocker 22 |
| E2E-022 | Emergency minor case: triage, diagnostics and discharge home | Deviation | Failed | Step 3: TC-APP015-003 step 3: Excel expects "Priority 4"; the site: Priority 2 | see sheet E2E chains |
| E2E-023 | Emergency to surgery to ward | Deviation | Deviation | Step 9: TC-APP004-012 step 1: Excel expects ""Configured chain has 7 steps" (seed chain)"; the site: the configured chain has 1 step(s) | see sheet E2E chains |
| E2E-024 | Mass casualty: batch registration to admission | Passed | Passed |  | - |
| E2E-025 | Medico-legal case: flag, evidence and record custody | Failed | Failed | [site] The chain books or queues the patient in QA Poli Umum; the Department picker searches only the first 50 departments (found blocker 40). | Departments renamed 2026-10-21; rerun these chains after 07:00 WIB (E2E-033 closes the U1 cashier day until then). Dev: picker search on the server. |
| E2E-026 | Maternity: newborn registered with the mother and admitted | Failed | Deviation | [site] The Bed picker searches only the records the page loaded first (the new bed QA-103-… of the chain is not offered); a record past them is "not found" although it exists. Shows since the data grew past the limit. | Dev: search the Bed list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). |
| E2E-027 | Inpatient diagnostics and nutrition | Failed | Failed | [site] The radiology order made in the chain is not offered in RIS "Schedule and report" (the order list does not reach it); same as TC-APP003-048/051. | Dev: RIS order list for the branch (all open orders, newest included); then rerun. |
| E2E-028 | Closed-loop medication for an inpatient | Blocked | Blocked | Step 1: NEEDS-EVALUATION: 03-patient-care.xlsx / Journeys / row 8: Automation Candidate = Needs Evaluation | see sheet E2E chains |
| E2E-029 | Bed management and turnover | Failed | Deviation | [site] The Bed picker searches only the records the page loaded first (the new bed QA-103-… of the chain is not offered); a record past them is "not found" although it exists. Shows since the data grew past the limit. | Dev: search the Bed list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). |
| E2E-030 | Surgery with blood, sterile instruments and consumption | Blocked | Blocked | Blocker 25 (found by automation, docs/qa/blockers-found.md): a request cannot be approved (HTTP 500) | Fix blocker 2, 25 |
| E2E-031 | Blood: emergency release and return | Blocked | Blocked | Step 1: Blocker 2: blocker 2 (00-blockers-checklist-linked.xlsx / Checklist / row 6): Donor screen answers HTTP 500. needs a screened, available unit (a bag is numbered on Donors) | Fix blocker 2 |
| E2E-032 | Insurance revenue cycle | Failed | Failed | [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories). | Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. |
| E2E-033 | Cashier day: payments, discounts, refunds and close | Failed | Failed | [environment] The chain needs an open U1 cashier day; TC-APP014-011 (run just before it) had closed the day until 07:00 WIB. Run order of this run, not the site. | QA automation: run E2E-033 before TC-APP014-011 (both close the day), after 07:00 WIB. |
| E2E-034 | Cost estimate to payment | Blocked | Blocked | Step 1: NEEDS-EVALUATION: 14-hospital-accounts.xlsx / Journeys / row 17: Automation Candidate = Needs Evaluation | see sheet E2E chains |
| E2E-035 | Internal stock distribution | Failed | Failed | [site] The inventory item saved in the chain (QA-INV-PARA-…) is not found in the item list afterwards: the list does not reach the new item (capped list, probably found blocker 40, to confirm). | Dev: item list search/paging that reaches new items; QA: confirm by hand once. |
| E2E-036 | Procure-to-pay: reorder to payment and supplier return | Blocked | Blocked | Step 1: Blocker 13: blocker 13 (00-blockers-checklist-linked.xlsx / Checklist / row 17): Set-up missing on the branch | Fix blocker 13 |
| E2E-037 | Budget-controlled purchasing | Blocked | Blocked | Step 1: Blocker 13: blocker 13 (00-blockers-checklist-linked.xlsx / Checklist / row 17): Set-up missing on the branch | Fix blocker 13 |
| E2E-038 | Doctor fee: plan to payout | Blocked | Blocked | Step 2: Blocker 7: blocker 7 (00-blockers-checklist-linked.xlsx / Checklist / row 11): "Calculate fee" cannot succeed | Fix blocker 7 |
| E2E-039 | Staff onboarding with access | Blocked | Blocked | Step 4: NEEDS-EVALUATION: 10-hr.xlsx / Journeys / row 5: Automation Candidate = Needs Evaluation | see sheet E2E chains |
| E2E-040 | Leave and attendance to payroll | Failed | Blocked | [automation] The chain still stops "as planned" at a test case that became runnable when users U3-U7 were made (2026-10-20): "is planned to run; stop the chain with its blocked step instead". | QA automation: run that chain step (write the step from the workbook) instead of stopping. |
| E2E-041 | Finance record-to-report | Blocked | Blocked | Step 4: STEP-NOT-RUN: TC-APP019-040 step 5 is not run: a journal with a cost centre needs the Journals flow (U5) | see sheet E2E chains |
| E2E-042 | Treasury: imprest, payment requests and guarantees | Failed | Blocked | [automation] The chain still stops "as planned" at a test case that became runnable when users U3-U7 were made (2026-10-20): "is planned to run; stop the chain with its blocked step instead". | QA automation: run that chain step (write the step from the workbook) instead of stopping. |
| E2E-043 | Sourcing to asset life | Blocked | Blocked | Step 1: STEP-NOT-RUN: TC-APP023-020 step 1 is not run: the approval of a purchase request is the 09 Procurement flow; Step 1: Blocker 39: TC-APP023-020 step 2, blocker 39 (found by automation, docs/qa/blockers-found.md): A tender cannot be  | Fix blocker 39 |
| E2E-044 | Maintenance of equipment across applications | Failed | Failed | [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories). | Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. |
| E2E-045 | Dietary service: catalogue to contractor bill | Failed | Failed | [site] Diet order "Calculate" (assessment) answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx). | Dev: look up the digest in the server log and fix the action; then rerun the test. |
| E2E-046 | Laboratory quality and exception handling | Passed | Passed |  | - |
| E2E-047 | Linen and cleaning of a ward | Blocked | Blocked | Step 1: Blocker 14: TC-APP025-001 step 4, blocker 14 (00-blockers-checklist-linked.xlsx / Checklist / row 18): 34 journeys need a record made in another application; Step 1: Blocker 14: TC-APP025-001 step 5, blocker 14 (00-blockers-checklis | Fix blocker 14 |
| E2E-048 | Patient identity governance | Failed | Failed | [site] The chain books or queues the patient in QA Poli Umum; the Department picker searches only the first 50 departments (found blocker 40). | Departments renamed 2026-10-21; rerun these chains after 07:00 WIB (E2E-033 closes the U1 cashier day until then). Dev: picker search on the server. |
| E2E-049 | Clinic calendar: holidays, open hours and bookings | Blocked | Failed | Step 1: STEP-NOT-RUN: TC-APP018-052 step 4 is not run: TBD: booking on 2026-11-15 needs the appointment flow of 02 on a day DR-1 does not work (Sunday, chosen so the shared appointment Mondays stay open) | see sheet E2E chains |
| E2E-050 | Approval chains configured and used | Failed | Blocked | [automation] The chain still stops "as planned" at a test case that became runnable when users U3-U7 were made (2026-10-20): "is planned to run; stop the chain with its blocked step instead". | QA automation: run that chain step (write the step from the workbook) instead of stopping. |

## 5. Per module

The figures include the 01/02 rerun. **Blockers** are the blockers that stopped test cases of the module (number of test cases). **Failures** are the failures with their cause and next action: [site] a site defect, [automation] a test problem, [environment] the order of the run. Deviations (differences from the Expected Result) are recorded per step in `reports/e2e/<NN>.xlsx`, column Actual Result.

### 01 Ambulatory Care

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 89 | 27 | 23 | 7 | 9 | 23 (0) | 18 |

**Blockers:** 17 (5 TC) – Book settings: a quota or open-hours row cannot be switched to "Unit"; 18 (2 TC) – More than 3 bookings on one day cannot be made with the shared Book settings; 19 (1 TC) – A patient cannot be marked deceased; 20 (1 TC) – A registered patient cannot be edited.

**Failures (7):**

- 024, 035, 043, 061, 062, 063 — [automation] The test case became runnable when users U3-U7 were made (2026-10-20); its test is not written yet ("write its test").
  - Next: QA automation: write the test from the workbook steps. (QA automation)
- 053 — [automation] Rerun after the rename: typing the cashier's name in "Consultant or unit" shows an empty list with no "no match" text; the test waits for an option or that text. An empty list means "not offered", as the workbook expects. Steps 2-3 of this test case (pickers with more than 50 users or departments) are now runnable: Users 107, Departments 75; the site fails them (pickers capped at 50).
  - Next: QA automation: accept the empty list in step 1 and automate steps 2-3 (they will fail on found blocker 40 until Dev fixes the pickers). (QA automation)

### 02 Appointment

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 33 | 9 | 7 | 1 | 12 | 4 (0) | 10 |

**Blockers:** 17 (4 TC) – Book settings: a quota or open-hours row cannot be switched to "Unit"; 18 (2 TC) – More than 3 bookings on one day cannot be made with the shared Book settings; 24 (6 TC) – Referral types and Cross-consult types list only the first rows, with no paging or search.

**Failures (1):**

- 017 — [automation] Rerun after the rename: typing the cashier's name in "Consultant or unit" shows an empty list with no "no match" text; the test waits for an option or that text. An empty list means "not offered", as the workbook expects. Steps 2-3 of this test case (pickers with more than 50 users or departments) are now runnable: Users 107, Departments 75; the site fails them (pickers capped at 50).
  - Next: QA automation: accept the empty list in step 1 and automate steps 2-3 (they will fail on found blocker 40 until Dev fixes the pickers). (QA automation)

### 03 Patient Care

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 63 | 17 | 11 | 2 | 9 | 24 (4) | 1 |

**Blockers:** 12 (5 TC) – Terminology search finds no code; 21 (1 TC) – A placed drug order cannot be cancelled or corrected; 22 (3 TC) – The drug interaction pairs of the shared data are not on the site.

**Failures (2):**

- 048, 051 — [site] The radiology order made in the consultation does not show in RIS Orders (same on 2026-10-18).
  - Next: Dev: check that consultation radiology orders reach RIS for the branch; then rerun. (Dev)

### 04 Inpatient

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 90 | 31 | 17 | 1 | 12 | 29 (4) | 6 |

**Blockers:** 23 (12 TC) – Ward care does not offer the stays of the branch.

**Failures (1):**

- 034 — [site] The Bed picker searches only the records the page loaded first (the bed list of the ward; the new bed QA-199-… is not offered); a record past them is "not found" although it exists. Shows since the data grew past the limit.
  - Next: Dev: search the Bed list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). (Dev)

### 05 Pharmacy

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 78 | 24 | 11 | 4 | 7 | 32 (11) | 22 |

**Blockers:** 22 (2 TC) – The drug interaction pairs of the shared data are not on the site; 26 (1 TC) – No store can be made, and "Branch and stores" cannot save; 27 (1 TC) – Saving a kit answers HTTP 500; 29 (3 TC) – A dispense opened from an order cannot change Issued, Requested or Generic.

**Failures (4):**

- 023 — [site] Searching Issue Lines for an item or remark ("generik") gives "No issue lines yet." (same on 2026-10-18).
  - Next: Dev: the Issue Lines search should match item and remarks. (Dev)
- 028, 033 — [site] Dispense confirm (walk-in sale of QA-PARA, quantity 1) answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).
  - Next: Dev: look up the digest in the server log and fix the action; then rerun the test. (Dev)
- 042 — [site] Issue Lines search "Paracetamol" lists one of the two sales of the test (same on 2026-10-18); the second sale was not confirmed (dispense confirm HTTP 500).
  - Next: Dev: fix dispense confirm (see TC-APP005-028); then rerun. (Dev)

### 06 Transfusion Medicine

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 81 | 7 | 3 | 0 | 51 | 20 (1) | 13 |

**Blockers:** 2 (46 TC) – Donor screen answers HTTP 500; 5 (1 TC) – 28 lists do not load with "All branches"; 25 (7 TC) – Saving an external bag or a quality-control record, and approving a blood request, answer HTTP 500.

**Failures:** none.

### 07 Inventory

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 67 | 23 | 13 | 1 | 13 | 17 (4) | 24 |

**Blockers:** 5 (3 TC) – 28 lists do not load with "All branches"; 26 (9 TC) – No store can be made, and "Branch and stores" cannot save; 27 (1 TC) – Saving a kit answers HTTP 500.

**Failures (1):**

- 003 — [site] Status filter "Inactive" on the item list shows no inactive item (same on 2026-10-18).
  - Next: Dev: the status filter of the item list. (Dev)

### 08 Operation Theater

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 53 | 27 | 11 | 1 | 1 | 13 (4) | 20 |

**Blockers:** 32 (1 TC) – Shifting an operating theatre slot by one hour answers HTTP 500.

**Failures (1):**

- 038 — [site] A pain policy with an empty number is saved ("Saved"); the workbook expects a refusal ("incision, department type, and percentage are required"). Same on 2026-10-18.
  - Next: Dev: require the number; Product: confirm the rule. (Dev)

### 09 Procurement

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 65 | 16 | 8 | 2 | 10 | 29 (13) | 14 |

**Blockers:** 5 (3 TC) – 28 lists do not load with "All branches"; 13 (1 TC) – Set-up missing on the branch; 30 (3 TC) – The purchase order approval chain has one step, not the four of the shared data; 31 (3 TC) – Goods receipt, supplier invoice and returns answer HTTP 500.

**Failures (2):**

- 007 — [site] Orders without a date are not at the end with "—": the last page shows a date (same on 2026-10-18).
  - Next: Product: confirm the sort; Dev: sort orders without a date last. (Product)
- 015 — [site] Blocker 30: the approval chain has one step, so PO-DONE cannot show four "Done" steps.
  - Next: Dev/Product: blocker 30 (four-step approval chain). (Dev)

### 10 HR

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 68 | 15 | 6 | 12 | 10 | 25 (14) | 2 |

**Blockers:** 5 (4 TC) – 28 lists do not load with "All branches"; 7 (3 TC) – "Calculate fee" cannot succeed; 13 (3 TC) – Set-up missing on the branch.

**Failures (12):**

- 008, 009, 010, 011, 012, 016, 017, 018, 019, 022, 023, 032 — [site] The Employee (leave) picker searches only the records the page loaded first (employees made by earlier runs fill it; the new QA-EMP-… and X QA Pegawai are not offered); a record past them is "not found" although it exists. Shows since the data grew past the limit.
  - Next: Dev: search the Employee (leave) list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). (Dev)

### 11 Laboratory

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 54 | 26 | 10 | 1 | 0 | 17 (4) | 14 |

**Blockers:** none.

**Failures (1):**

- 041 — [site] "Revert latest stamp" of a lab order answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).
  - Next: Dev: look up the digest in the server log and fix the action; then rerun the test. (Dev)

### 12 RIS

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 35 | 12 | 9 | 0 | 0 | 14 (4) | 7 |

**Blockers:** none.

**Failures:** none.

### 13 Dietary

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 62 | 24 | 13 | 1 | 8 | 16 (6) | 23 |

**Blockers:** 8 (8 TC) – A diet order never reaches Kitchen or Service and bill.

**Failures (1):**

- 040 — [site] Diet order "Calculate" (assessment) answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).
  - Next: Dev: look up the digest in the server log and fix the action; then rerun the test. (Dev)

### 14 Hospital Accounts

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 85 | 28 | 11 | 3 | 19 | 24 (9) | 32 |

**Blockers:** 5 (5 TC) – 28 lists do not load with "All branches"; 33 (5 TC) – The insured patient PT-BPJS is not on the site and no screen can prepare one; 34 (1 TC) – A discount above the cashier cap answers HTTP 500 instead of waiting for approval; 35 (2 TC) – The item price of a branch (margin and tax) cannot be saved; 36 (6 TC) – Patient ledger cannot show a chosen invoice: "Find patient" shows no rows, the list holds 22 invoices.

**Failures (3):**

- 004, 010 — [site] Cashier "Pay" of a bill already covered by deposits answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).
  - Next: Dev: look up the digest in the server log and fix the action; then rerun the test. (Dev)
- 036 — [environment] Needs the counter closed for the day; the day is closed only at the end of the run (TC-APP014-011, E2E-033).
  - Next: QA automation: run TC-APP014-036 after TC-APP014-011. (QA automation)

### 15 Emergency

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 69 | 24 | 9 | 2 | 18 | 16 (6) | 3 |

**Blockers:** 9 (4 TC) – A closed emergency encounter cannot be received again; "Mark as alive" cannot be reached; 13 (15 TC) – Set-up missing on the branch.

**Failures (2):**

- 024, 025 — [automation] Refused with "An active category already uses that description or colour.": the triage category of the run of 2026-10-18 is still active with the same description/colour. The site is right.
  - Next: QA automation: unique description per run and retire the category at the end of the test. (QA automation)

### 16 MRD

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 49 | 16 | 9 | 0 | 4 | 20 (9) | 4 |

**Blockers:** 6 (4 TC) – "Record code" cannot be saved with "All branches".

**Failures:** none.

### 17 Payroll

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 69 | 13 | 3 | 11 | 22 | 20 (9) | 3 |

**Blockers:** 5 (6 TC) – 28 lists do not load with "All branches"; 10 (14 TC) – Saved items are listed nowhere; 37 (2 TC) – The 12 salary components of the workbook are not on the site, and no screen makes them.

**Failures (11):**

- 001, 003, 008, 010, 012, 013, 014, 015, 051 — [site] The Employee (payroll) picker searches only the records the page loaded first (the new QA-EMP-… of the run is not offered); a record past them is "not found" although it exists. Shows since the data grew past the limit.
  - Next: Dev: search the Employee (payroll) list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). (Dev)
- 016, 026 — [site] The Employee (payroll) picker searches only the records the page loaded first (QA-EMP-NONAKTIF-… / QA-EMP-XSS-… of the run are not offered, so the check on inactive or script names cannot be made); a record past them is "not found" although it exists. Shows since the data grew past the limit.
  - Next: Dev: search the Employee (payroll) list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). (Dev)

### 18 Settings

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 92 | 52 | 14 | 6 | 2 | 18 (8) | 10 |

**Blockers:** 4 (1 TC) – Tenants and Entitlements answer HTTP 500 for the hospital administrator; 38 (1 TC) – Saving the rights of a role answers HTTP 500 ("Failed to save rights.").

**Failures (6):**

- 008 — [automation] After the edit, the row was looked up before the search had filtered the list (timing). The tax code is saved with the new rate.
  - Next: Fixed 2026-10-21 (Mdm.row waits for the search); rerun. (QA automation)
- 031 — [site] Branch map search finds no line for the new user (list "Showing 51–100 of 107"): the search filters the page on screen only.
  - Next: Dev: Branch map search on the server. QA automation: page through the list as a workaround. (Dev)
- 041 — [site] The branch input of the test user's line in Branch map is not reachable: the user is past the first page and the search covers one page only.
  - Next: Dev: Branch map search on the server; then rerun. (Dev)
- 042 — [site] As TC-APP018-041: the test user's line in Branch map is past the first page and the search covers one page only.
  - Next: Dev: Branch map search on the server; then rerun. (Dev)
- 062, 088 — [site] Blocker 4 still present: /entitlements and /tenants answer HTTP 500 for the hospital administrator.
  - Next: Dev: blocker 4 (hide the links or allow the screens); QA: the screen test stays failed until then. (Dev)

### 19 Finance

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 128 | 62 | 10 | 3 | 7 | 46 (34) | 2 |

**Blockers:** 13 (7 TC) – Set-up missing on the branch.

**Failures (3):**

- 026 — [automation] Precondition changed by the prerequisite run (S09, 2026-10-20): "Allocation — operating" now has its accounts, so "Save" without choosing saves. The site is right.
  - Next: QA automation: clear the debit and credit accounts before the save, or use a rule without accounts. (QA automation)
- 033 — [site] The Account (Budget posting rules) picker searches only the records the page loaded first (the select lists the first accounts; the QA-XSS account of the run is not among them); a record past them is "not found" although it exists. Shows since the data grew past the limit.
  - Next: Dev: search the Account (Budget posting rules) list on the server (or load all); then rerun. Found blocker 40 (pickers and lists capped). (Dev)
- 036 — [site] An imprest row with a type and no amount is saved ("Configuration saved."); the workbook expects a refusal. Same on 2026-10-18.
  - Next: Dev: validate imprest rows (type, amount, account, holder). (Dev)

### 20 Budget

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 64 | 29 | 0 | 0 | 8 | 27 (24) | 0 |

**Blockers:** 13 (8 TC) – Set-up missing on the branch.

**Failures:** none.

### 21 CSSD

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 57 | 27 | 1 | 1 | 8 | 20 (17) | 1 |

**Blockers:** 3 (3 TC) – New sterile issue page answers HTTP 500; 13 (5 TC) – Set-up missing on the branch.

**Failures (1):**

- 043 — [site] Blocker 3 still present: /cssd/issues/new answers HTTP 500.
  - Next: Dev: blocker 3; then rerun. (Dev)

### 22 Services

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 36 | 19 | 0 | 3 | 10 | 4 (1) | 20 |

**Blockers:** 5 (3 TC) – 28 lists do not load with "All branches"; 11 (7 TC) – Service receipt and Vendor bill are never listed.

**Failures (3):**

- 001, 003 — [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories).
  - Next: Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. (Dev)
- 013 — [site] Service order without a document: the input is wrong on purpose (negative test). The site refuses it, but with HTTP 500 instead of a message; nothing is saved.
  - Next: Dev: validate the input and answer a message (the workbook names the text); then rerun. (Dev)

### 23 Sourcing

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 34 | 14 | 0 | 0 | 16 | 4 (1) | 14 |

**Blockers:** 5 (4 TC) – 28 lists do not load with "All branches"; 39 (12 TC) – A tender cannot be created: "Create tender" answers HTTP 500 for every approved purchase request.

**Failures:** none.

### 24 Housekeeping

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 22 | 11 | 1 | 6 | 0 | 4 (1) | 24 |

**Blockers:** none.

**Failures (6):**

- 002 — [site] Shift for a location code that does not exist: the input is wrong on purpose (negative test). The site refuses it, but with HTTP 500 instead of a message; nothing is saved.
  - Next: Dev: validate the input and answer a message (the workbook names the text); then rerun. (Dev)
- 004 — [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories).
  - Next: Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. (Dev)
- 010, 011, 012, 013 — [site] Saving a housekeeping contract answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).
  - Next: Dev: look up the digest in the server log and fix the action; then rerun the test. (Dev)

### 25 Linen

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 21 | 7 | 0 | 0 | 10 | 4 (1) | 7 |

**Blockers:** 14 (10 TC) – 34 journeys need a record made in another application.

**Failures:** none.

### 26 Maintenance

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 20 | 11 | 0 | 5 | 0 | 4 (1) | 33 |

**Blockers:** none.

**Failures (5):**

- 004, 007 — [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories).
  - Next: Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. (Dev)
- 005 — [site] Work order above the budget balance: the input is wrong on purpose (negative test). The site refuses it, but with HTTP 500 instead of a message; nothing is saved.
  - Next: Dev: validate the input and answer a message (the workbook names the text); then rerun. (Dev)
- 008 — [site] AMC instalment with amount 0: the input is wrong on purpose (negative test). The site refuses it, but with HTTP 500 instead of a message; nothing is saved.
  - Next: Dev: validate the input and answer a message (the workbook names the text); then rerun. (Dev)
- 009 — [site] Saving an AMC document answers HTTP 500 (server action error, digest in sheet HTTP 5xx). The request carries well-formed values from the workbook (see the request body in sheet HTTP 5xx).
  - Next: Dev: look up the digest in the server log and fix the action; then rerun the test. (Dev)

### 27 Fixed assets

| Test cases | Passed | Deviation | Failed | Blocked | Not run (no test yet) | HTTP 5xx |
|---|---|---|---|---|---|---|
| 20 | 5 | 0 | 1 | 10 | 4 (1) | 17 |

**Blockers:** 14 (10 TC) – 34 journeys need a record made in another application.

**Failures (1):**

- 003 — [site] The desk list shows its first 22 rows only, with no paging and no search; the record saved now is past them, so its status or id cannot be read (checked 2026-10-21 on /housekeeping/contracts, /maintenance/work, /maintenance/amc, /fixed-assets/register, /services/categories).
  - Next: Dev: add paging or a search (newest first) to the desk lists; then rerun. Found blocker 40. (Dev)

## 6. Next actions by owner

### Dev

1. **Blocker 40**: search pickers and lists on the server, and give the desk lists paging or a search (3.1). The largest impact: about 80 test cases and 16 chains.
2. **HTTP 500 on valid input** (3.2): dispense confirm, lab revert, diet calculate, pay with deposits, housekeeping contracts, AMC.
3. **Refusals answered with 500** (3.3): answer with a validation message instead.
4. **Missing validation** (3.4): pain policy, imprest, repeated leave type names.
5. **Old blockers with the largest impact**: 2/25 (Transfusion Medicine), 13 (branch set-up), 5 (All branches), 14 (records across applications), 10, 39 (tender), 23 (ward care), and 38 (saving the rights of a role, which also holds 4 U8 accounts).
6. Blockers 3 and 4 (screens `/cssd/issues/new`, `/entitlements`, `/tenants`) still answer HTTP 500.

### QA automation

1. **Write the tests of the 191 test cases that are now "automate"** (since U3–U7 are ready), including 6 in 01: 024, 035, 043, 061, 062, 063.
2. Chains E2E-009/011/040/042/050: run the steps that are now "automate" instead of stopping.
3. TC-APP001-053 and 002-017: accept the empty list in step 1, then automate steps 2–3.
4. TC-APP019-026: clear the accounts of the operating rule first (its precondition changed with prerequisite S09). TC-APP015-024/025: a triage category description that is unique per run, and retire the category at the end of the test.
5. Run order: E2E-033 before TC-APP014-011, and TC-APP014-036 after TC-APP014-011. All of them after 07:00 WIB.
6. **Rerun chains E2E-001/018/025/048 tomorrow after 07:00 WIB.** The departments are renamed, but the U1 cashier day is closed until 07:00.
7. The Settings tests (TC-APP018) make new "QA Poli Uji …" departments on every run. Consider names that sort after "QA Poli Umum" (for example "QA Zz …"), so DEP-1 is not pushed out of the first 50 again while blocker 40 is open.

### Product / Site admin

- Confirm the rules still TBD in the workbook: the order of purchase orders without a date (09-007), and the four-step approval chain (blocker 30).
- Blocker 38: the rights of a role must be saved directly by the site admin (see `docs/qa/prereq-users-and-blockers.md`).

## 7. How to run it again

```bash
# full run (writes): modules, chains, then the cashier (E2E-033 first, then TC-APP014-011), after 07:00 WIB
QA_ALLOW_WRITES=1 QA_SERVER_ERRORS=.qa-state/run-<date>/http-5xx.jsonl \
  PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e/results-1-modules.json \
  npx playwright test --workers=1 --reporter=list,json --project=e2e-modules --grep-invert TC-APP014-011 tests/modules
# … chains: --project=e2e tests/e2e/chains (PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e-chains/results-1-chains.json)
npm run qa:e2e-workbook && npm run qa:e2e-chains && npm run qa:run-summary
```

The raw Playwright results of the run of 2026-10-18 are in `.qa-state/old-results/2026-10-18/` (used for the "2026-10-18" columns). The 5xx recording of this run is `.qa-state/run-2026-10-21/http-5xx.jsonl`.
