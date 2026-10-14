# Open questions (Phase 1)

Status 2026-10-14. Every item cites its source. Machine-generated lists (row-level) are in
[_generated-open-items.md](_generated-open-items.md). Nothing below has been assumed in the plan:
each item maps to `test.fixme()`/`test.skip()` until answered.

## Blocking: needed before Phase 2

**Q1. Go-ahead to save data on the shared site.**
`00-prerequisites.xlsx | Set-up and data | row 5` and `00-blockers | Checklist | row 19 (blocker 15)` say nothing may be saved without a written go-ahead, and the approval of 2026-10-08 is used up. 721 test cases are `AUTOMATE-WRITE` (they register patients, post vouchers, move stock, …). Is there a go-ahead, and for which applications, and may Finance vouchers, stock movements, budget holds and pay data be created? Until then I would generate those tests as `test.fixme('Q1: no go-ahead to save on the shared site')` and only the 31 `AUTOMATE-RO` test cases could run.

**Q2. Credentials.**
The workbooks name the logins `rs.admin2` (U1) and `rs.admin` (U2) (`00-prerequisites | Users | rows 5-6`) but no passwords. There is no `.env`. `lib/config.ts` falls back to a hard-coded password literal, which breaks the "no secrets in code" rule. Proposal: new env vars per user key (`QA_U1_USERNAME`/`QA_U1_PASSWORD`, …), no fallback, and the setup fails loudly when they're missing. Should the existing `lib/config.ts` fallback also be removed (it affects the current suites)?

**Q3. Which user runs the main path?**
The workbooks say U1 = `rs.admin2` (Podomoro only) for 958 journeys. The existing suites use `rs.admin` (= U2, All branches) and `klikmed.superadmin`, which the workbooks don't mention. Confirm that the new suites sign in as U1 `rs.admin2`. `klikmed.superadmin` is not in the Excel, so it would not be used.

**Q4. Patients: are the site's patients made up?**
`Set-up and data | row 6`: not confirmed. The healthcare-data rule means I won't open or assert on existing patient records until you confirm. All patients I would create come from the catalogue (`00-test-data | Data catalogue`, e.g. PT-1 "QA-AMB Pasien Satu", DOB 1990-05-17).

**Q5. Test data prefix and uniqueness.**
These sources conflict:
- `00-test-data | Overview | row 8`: keep the names the journeys use ("QA-…" in 01–19, "X …" in 20–27).
- `Set-up and data | row 5`: "test data with the prefix "X "".
- The Steps sheets' Cleanup Requirements: "use a new QA- identifier per run".

The brief also asks for a unique per-run suffix. Proposal: keep the Excel name and append a run suffix (e.g. `QA-AMB Pasien Satu 7F3A`), recorded in a run data list, since records can't be deleted (`Overview | row 12`). Is that acceptable? Some expected results assert the exact name ("Full name "QA-AMB Pasien Satu"", TC-APP001-001 step 4). With a suffix, the assertion would check the generated name.

**Q6. UI language.**
Expected results quote English labels ("New Registration", "Patient registered"). Starting points are `/id/...`, and the evidence was captured in an Indonesian session (Summary row 6 of each workbook). The existing page objects use `/en/...` with English names. Proposal: run in English (`/en/` + the language switch the repo already has), because the Expected Result column is in English. Confirm.

## Scope and policy

**Q7. Tag mapping.**
The Excel has Priority (Critical/High/Medium/Low) and Test Type (Positive/Negative/Boundary/Security/Integration/Regression/Other), but nothing called "smoke". Proposal: `@smoke` = Priority Critical + Test Type Positive. `@regression` = all. Role tags = `@u1`…`@u10` from "Users needed". Also `@<NN-module>`, `@<test-type>`, `@<priority>`. Confirm, or tell me the smoke rule.

**Q8. "TBD" in Expected Result (881 steps, appendix B).**
Most are "TBD: the text shown. The server refuses with a text ending …" or "The API answers 403 …; nothing is saved. TBD: the text the screen shows". The strict rule makes the whole test case `fixme`, which covers 418 test cases. Alternative: automate the test case and assert only the stated part (e.g. "nothing is saved", HTTP 403 via `waitForResponse`), with that one step annotated `TBD`. Which do you want?

**Q9. Existing suites vs new workbooks.**
`tests/pharmacy`, `tests/suites`, `tests/flows` and `tests/ambulatory-care` trace to workbooks that are deleted in the working tree. The new workbooks keep their old ids in the column Earlier ID (all 50 PHA-JRN map 1:1 to JRN-APP005-001..050). Should the new `tests/e2e/` replace them, sit beside them, or should I migrate the existing specs and page objects in place? Page objects will be reused in any case.

**Q10. "Automation Candidate = Needs Evaluation" (189 journeys, appendix F).**
Planned as `fixme`. Do you want to decide them now, or keep them as fixme?

**Q11. Users U3–U10 are "Open" (`00-prerequisites | Users | rows 7-14`).**
Negative/RBAC journeys need U3 (read-only), U4 (second user), U5 (approvers), U6 (second branch), U7 (linked employee), U10 (other tenant). They are planned as `fixme('needs U<n>')`. Will any of these accounts be created? U8 (role accounts) has no logins listed (`Role accounts | column F` empty).

**Q12. Blocker 5 workaround.**
The workbook says choosing one branch (U1 at Podomoro) avoids the "All branches" failure (`00-blockers | Checklist | row 9`, `Users | row 5`). I planned the 105 linked journeys as automatable when run as U1, and as `fixme` only when they must run as U2. Confirm.

**Q13. Expected behaviour vs "Current behaviour" (appendix C, 4 steps in 05-pharmacy).**
Example: TC-APP005-040 step 3 expects "Current behaviour: 16,650.00, the new price, not the 13,875.00 that was charged". Should the test assert the documented current (defective) behaviour, or the intended behaviour as `test.fail()`? The Excel doesn't state the intended value explicitly.

## Data conflicts found in the workbooks

**C1. 8 journeys exist only in the 00-files** (appendix A): `JRN-APP006-075, 007-049, 009-047, 010-049, 014-064, 017-040, 022-013, 023-012` ("Opening the lists as a user with roles at one branch, without choosing a branch"). They have no Steps rows and so no Expected Result. Planned: `fixme` until steps are added. This is also why `Role accounts` counts are +1 for those 8 apps (appendix G).

**C2. Expected Result contradicts Observed Result.** Example: `01-ambulatory-care | Steps | row 3 | TC-APP001-001 step 2` expects "No Branch field", but the observed result lists the field "Cabang" (required). Summary row 53 also lists Cabang as a required field. Appendix E lists 45 journeys marked "Discrepancy Found". Per the rules I assert the Expected Result column. Where that's contradicted by the workbook's own observations, the test will likely fail. Should these be `test.fail()` with a defect reference, or must the workbook be corrected first?

**C3. Quoted UI texts not found on the site** (appendix D, 13 steps): e.g. "MRN or name…", "Leave blank to auto-assign MRN-YYYY-XXXXXXXX". The workbook itself says to check by hand. Planned: assertion kept and marked `// TODO(verify-selector)`.

**C4. Workbook evidence is from 2026-10-12/13 against source commit 32d4519**, while many journeys were written at d9d4e98 and are "Needs Review" (e.g. 01 Summary row 7). Only 1 journey per module is "Ready". I treat Needs Review as automatable but not trusted. Tell me if only "Ready"/"Partially Verified" journeys are in scope.

**C5. `00-blockers-checklist-linked.xlsx`** is not named in the brief but sits in `reference/`. I used it as a source (blocker → fixme reason). Confirm it is in scope.

## Environment

**E1.** `tsc` cannot run: `node_modules` misses `@typescript/typescript-linux-x64`, the native package of TypeScript 7. It looks like it was installed on another OS. Phase 2 needs `npm install` (or `npm ci`) on this machine. May I run it?
**E2.** No ESLint config exists. The "must pass lint" rule can only mean `tsc` until a linter is added. Should I add ESLint (+ `eslint-plugin-playwright`) in Phase 2? That's a new dev-dependency.
**E3.** Phase 2 needs new dev-dependencies for the data layer: `zod` and an xlsx reader (`exceljs`), or a checked-in JSON generated from the workbooks. Which do you prefer?
**E4.** Not checked: whether the site is reachable from here. Nothing was executed against it in Phase 0/1.
