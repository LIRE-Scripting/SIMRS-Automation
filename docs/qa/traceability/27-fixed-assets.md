# Traceability: 27-fixed-assets.xlsx

Source: `reference/27-fixed-assets.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP027-001 | JRN-APP027-001 | Classification: category, sub category with its asset account, deactivate | Integration | High | rows 2-7 | 2 | `tests/e2e/27-fixed-assets/masters.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 6 |
| TC-APP027-002 | JRN-APP027-001 | Classification that is refused | Negative | High | rows 8-13 | 2 | `tests/e2e/27-fixed-assets/masters.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6 |
| TC-APP027-003 | JRN-APP027-002 | Register: buying, installing and commissioning an asset | Integration | Critical | rows 14-19 | 3 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | AUTOMATE-CHAIN | Needs a record from: 07-inventory, 09-procurement |
| TC-APP027-004 | JRN-APP027-002 | Register entry that is refused | Negative | Critical | rows 20-27 | 3 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6, 7, 8 |
| TC-APP027-005 | JRN-APP027-002 | Register entry that should be refused or asked | Negative | Critical | rows 28-30 | 3 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP027-006 | JRN-APP027-003 | Depreciation, sale and write-off, booked in Finance | Integration | Critical | rows 31-35 | 4 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2, 3, 4 |
| TC-APP027-007 | JRN-APP027-003 | Entry that is refused | Negative | Critical | rows 36-40 | 4 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 |
| TC-APP027-008 | JRN-APP027-003 | Entry that should be refused or asked | Negative | Critical | rows 41-46 | 4 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6 |
| TC-APP027-009 | JRN-APP027-004 | Movement: move, transfer, issue to a holder, return, gate pass and lease | Positive | High | rows 47-53 | 5 | `tests/e2e/27-fixed-assets/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 6 |
| TC-APP027-010 | JRN-APP027-004 | Movement that is refused | Negative | High | rows 54-61 | 5 | `tests/e2e/27-fixed-assets/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6, 7, 8 |
| TC-APP027-011 | JRN-APP027-004 | Movement that should be refused or asked | Negative | High | rows 62-64 | 5 | `tests/e2e/27-fixed-assets/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP027-012 | JRN-APP027-005 | One asset from the purchase order to its disposal, across the applications | Integration | High | rows 65-70 | 6 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4, 6 |
| TC-APP027-013 | JRN-APP027-006 | Fixed assets without the fixed asset right, and what is recorded | Security | High | rows 71-75 | 7 | `tests/e2e/27-fixed-assets/register.spec.ts` | U1, U3 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 / Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP027-014 | JRN-APP027-007 | Screen /fixed-assets opens | Regression | High | row 76 | 8 | `tests/e2e/27-fixed-assets/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP027-015 | JRN-APP027-007 | Screen /fixed-assets/masters opens | Regression | Medium | row 77 | 8 | `tests/e2e/27-fixed-assets/masters.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP027-016 | JRN-APP027-007 | Screen /fixed-assets/moves opens | Regression | Medium | row 78 | 8 | `tests/e2e/27-fixed-assets/moves.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP027-017 | JRN-APP027-007 | Screen /fixed-assets/register opens | Regression | Medium | row 79 | 8 | `tests/e2e/27-fixed-assets/register.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP027-018 | JRN-APP027-008 | Deep link without a session | Security | High | row 80 | 9 | `tests/e2e/27-fixed-assets/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP027-019 | JRN-APP027-008 | Tenant without the licence | Security | High | rows 81-82 | 9 | `tests/e2e/27-fixed-assets/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP027-020 | JRN-APP027-008 | Write without the write privilege | Security | High | row 83 | 9 | `tests/e2e/27-fixed-assets/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-CHAIN: 1
- AUTOMATE-WRITE: 4
- FIXME: 15
