# Traceability: 21-cssd.xlsx

Source: `reference/21-cssd.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP021-001 | JRN-APP021-001 | Masters: autoclave, cycle type and packing type | Positive | High | rows 2-8 | 2 | `tests/e2e/21-cssd/autoclaves.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-002 | JRN-APP021-001 | Master that is refused | Negative | High | rows 9-11 | 2 | `tests/e2e/21-cssd/autoclaves.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-003 | JRN-APP021-002 | Masters: indicator type, test name and result type | Positive | High | rows 12-17 | 3 | `tests/e2e/21-cssd/indicator-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-004 | JRN-APP021-002 | Master that is refused | Negative | High | rows 18-21 | 3 | `tests/e2e/21-cssd/indicator-types.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4 |
| TC-APP021-005 | JRN-APP021-003 | Set: a tray of items and child sets, with its inventory kit | Integration | Critical | rows 22-26 | 4 | `tests/e2e/21-cssd/sets.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch / Expected Result TBD at step(s) 4 |
| TC-APP021-006 | JRN-APP021-003 | Set that is refused | Negative | Critical | rows 27-29 | 4 | `tests/e2e/21-cssd/sets.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch |
| TC-APP021-007 | JRN-APP021-003 | Inventory not prepared | Negative | Critical | rows 30-32 | 4 | `tests/e2e/21-cssd/sets.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch |
| TC-APP021-008 | JRN-APP021-004 | Sterile request: a ward sends sets and items to CSSD | Positive | Critical | rows 33-38 | 5 | `tests/e2e/21-cssd/requests-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-009 | JRN-APP021-004 | Request that is refused | Negative | Critical | rows 39-44 | 5 | `tests/e2e/21-cssd/requests-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-010 | JRN-APP021-004 | Serials and batches | Negative | Critical | rows 45-46 | 5 | `tests/e2e/21-cssd/requests-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-011 | JRN-APP021-004 | Reject and cancel | Negative | Critical | rows 47-49 | 5 | `tests/e2e/21-cssd/requests-new.spec.ts` | U1, U5 | FIXME | Expected Result TBD at step(s) 3 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-012 | JRN-APP021-005 | Unsterile receipt: CSSD takes in what the ward sent | Positive | Critical | rows 50-55 | 6 | `tests/e2e/21-cssd/receipts-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-013 | JRN-APP021-005 | Receipt that is refused | Negative | Critical | rows 56-61 | 6 | `tests/e2e/21-cssd/receipts-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-014 | JRN-APP021-005 | Cancelling an approved receipt | Negative | Critical | rows 62-63 | 6 | `tests/e2e/21-cssd/receipts-new.spec.ts` | U1, U5 | FIXME | Expected Result TBD at step(s) 1, 2 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-015 | JRN-APP021-006 | Bowie Dick: the daily test of an autoclave | Positive | Critical | rows 64-68 | 7 | `tests/e2e/21-cssd/bowie-tests.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch |
| TC-APP021-016 | JRN-APP021-006 | Test and cycle that are refused | Negative | Critical | rows 69-73 | 7 | `tests/e2e/21-cssd/bowie-tests.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch / Expected Result TBD at step(s) 3, 4, 5 |
| TC-APP021-017 | JRN-APP021-007 | Sterilization cycle: a load, its quality checks and the approval | Positive | Critical | rows 74-80 | 8 | `tests/e2e/21-cssd/cycles-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-018 | JRN-APP021-007 | Cycle that is refused | Negative | Critical | rows 81-86 | 8 | `tests/e2e/21-cssd/cycles-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-019 | JRN-APP021-007 | Approval that is refused | Negative | Critical | rows 87-88 | 8 | `tests/e2e/21-cssd/cycles-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-020 | JRN-APP021-007 | Running a load again | Negative | Critical | rows 89-91 | 8 | `tests/e2e/21-cssd/cycles-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-021 | JRN-APP021-008 | Sterile issue: CSSD sends sterile packs to the ward | Positive | Critical | rows 92-97 | 9 | `tests/e2e/21-cssd/issues.spec.ts` | U1, U5 | FIXME | Blocker 3: New sterile issue page answers HTTP 500 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-022 | JRN-APP021-008 | Issue that is refused | Negative | Critical | rows 98-104 | 9 | `tests/e2e/21-cssd/issues.spec.ts` | U1, U5 | FIXME | Blocker 3: New sterile issue page answers HTTP 500 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-023 | JRN-APP021-008 | Reject and cancel | Negative | Critical | rows 105-106 | 9 | `tests/e2e/21-cssd/issues.spec.ts` | U1, U5 | FIXME | Blocker 3: New sterile issue page answers HTTP 500 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-024 | JRN-APP021-009 | Sterile receipt: the ward takes the sterile packs back | Positive | Critical | rows 107-111 | 10 | `tests/e2e/21-cssd/sterile-receipts-new.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-025 | JRN-APP021-009 | Receipt that is refused | Negative | Critical | rows 112-115 | 10 | `tests/e2e/21-cssd/sterile-receipts-new.spec.ts` | U1, U5 | FIXME | Expected Result TBD at step(s) 4 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-026 | JRN-APP021-009 | Reject and cancel | Negative | Critical | rows 116-117 | 10 | `tests/e2e/21-cssd/sterile-receipts-new.spec.ts` | U1, U5 | FIXME | Expected Result TBD at step(s) 2 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-027 | JRN-APP021-010 | Pack Trace: where a pack is and what happened to it | Positive | High | rows 118-121 | 11 | `tests/e2e/21-cssd/trace.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4 |
| TC-APP021-028 | JRN-APP021-010 | Trace at its limits | Negative | High | rows 122-124 | 11 | `tests/e2e/21-cssd/trace.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP021-029 | JRN-APP021-011 | The whole loop of one set, from the theatre and back | Integration | Critical | rows 125-131 | 12 | `tests/e2e/21-cssd/requests.spec.ts` | U1, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-030 | JRN-APP021-011 | Loop that is broken on the way | Negative | Critical | rows 132-135 | 12 | `tests/e2e/21-cssd/requests.spec.ts` | U1, U5 | FIXME | Expected Result TBD at step(s) 3, 4 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP021-031 | JRN-APP021-012 | Document lists: search, states and CSV | Positive | Medium | rows 136-140 | 13 | `tests/e2e/21-cssd/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 5 |
| TC-APP021-032 | JRN-APP021-012 | Lists at their limits | Negative | Medium | rows 141-143 | 13 | `tests/e2e/21-cssd/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2, 3 |
| TC-APP021-033 | JRN-APP021-013 | Hub and menu of CSSD | Positive | Low | rows 144-146 | 14 | `tests/e2e/21-cssd/hub.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-034 | JRN-APP021-014 | CSSD rights: writer, approver and reader | Security | Critical | rows 147-152 | 15 | `tests/e2e/21-cssd/requests.spec.ts` | U1, U3, U5 | FIXME | Expected Result TBD at step(s) 1, 3, 4, 5, 6 / Needs user(s) U3, U5 (00-prerequisites: Open) |
| TC-APP021-035 | JRN-APP021-015 | Screen /cssd opens | Regression | High | row 153 | 16 | `tests/e2e/21-cssd/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-036 | JRN-APP021-015 | Screen /cssd/autoclaves opens | Regression | Medium | row 154 | 16 | `tests/e2e/21-cssd/autoclaves.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-037 | JRN-APP021-015 | Screen /cssd/bowie-tests opens | Regression | Medium | row 155 | 16 | `tests/e2e/21-cssd/bowie-tests.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-038 | JRN-APP021-015 | Screen /cssd/cycle-types opens | Regression | Medium | row 156 | 16 | `tests/e2e/21-cssd/cycle-types.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-039 | JRN-APP021-015 | Screen /cssd/cycles opens | Regression | Medium | row 157 | 16 | `tests/e2e/21-cssd/cycles.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-040 | JRN-APP021-015 | Screen /cssd/cycles/new opens | Regression | Medium | row 158 | 16 | `tests/e2e/21-cssd/cycles-new.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-041 | JRN-APP021-015 | Screen /cssd/indicator-types opens | Regression | Medium | row 159 | 16 | `tests/e2e/21-cssd/indicator-types.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-042 | JRN-APP021-015 | Screen /cssd/issues opens | Regression | Medium | row 160 | 16 | `tests/e2e/21-cssd/issues.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-043 | JRN-APP021-015 | Screen /cssd/issues/new opens | Regression | Medium | row 161 | 16 | `tests/e2e/21-cssd/issues-new.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-044 | JRN-APP021-015 | Screen /cssd/packing-types opens | Regression | Medium | row 162 | 16 | `tests/e2e/21-cssd/packing-types.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-045 | JRN-APP021-015 | Screen /cssd/receipts opens | Regression | Medium | row 163 | 16 | `tests/e2e/21-cssd/receipts.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-046 | JRN-APP021-015 | Screen /cssd/receipts/new opens | Regression | Medium | row 164 | 16 | `tests/e2e/21-cssd/receipts-new.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-047 | JRN-APP021-015 | Screen /cssd/requests opens | Regression | Medium | row 165 | 16 | `tests/e2e/21-cssd/requests.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-048 | JRN-APP021-015 | Screen /cssd/requests/new opens | Regression | Medium | row 166 | 16 | `tests/e2e/21-cssd/requests-new.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-049 | JRN-APP021-015 | Screen /cssd/result-types opens | Regression | Medium | row 167 | 16 | `tests/e2e/21-cssd/result-types.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-050 | JRN-APP021-015 | Screen /cssd/sets opens | Regression | Medium | row 168 | 16 | `tests/e2e/21-cssd/sets.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-051 | JRN-APP021-015 | Screen /cssd/sterile-receipts opens | Regression | Medium | row 169 | 16 | `tests/e2e/21-cssd/sterile-receipts.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-052 | JRN-APP021-015 | Screen /cssd/sterile-receipts/new opens | Regression | Medium | row 170 | 16 | `tests/e2e/21-cssd/sterile-receipts-new.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-053 | JRN-APP021-015 | Screen /cssd/test-names opens | Regression | Medium | row 171 | 16 | `tests/e2e/21-cssd/test-names.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-054 | JRN-APP021-015 | Screen /cssd/trace opens | Regression | Medium | row 172 | 16 | `tests/e2e/21-cssd/trace.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP021-055 | JRN-APP021-016 | Deep link without a session | Security | High | row 173 | 17 | `tests/e2e/21-cssd/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP021-056 | JRN-APP021-016 | Tenant without the licence | Security | High | rows 174-175 | 17 | `tests/e2e/21-cssd/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP021-057 | JRN-APP021-016 | Write without the write privilege | Security | High | row 176 | 17 | `tests/e2e/21-cssd/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-WRITE: 24
- FIXME: 33
