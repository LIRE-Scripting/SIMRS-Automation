# Traceability: 25-linen.xlsx

Source: `reference/25-linen.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP025-001 | JRN-APP025-001 | Stores and recipe: the three linen stores and what a finished item is made of | Integration | High | rows 2-6 | 2 | `tests/e2e/25-linen/stores.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 5 |
| TC-APP025-002 | JRN-APP025-001 | Stores and recipe that are refused | Negative | High | rows 7-11 | 2 | `tests/e2e/25-linen/stores.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 |
| TC-APP025-003 | JRN-APP025-001 | Saving with "All branches" | Negative | High | row 12 | 2 | `tests/e2e/25-linen/stores.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP025-004 | JRN-APP025-002 | Work order: having finished linen made, receiving it and charging the contractor's bill | Integration | Critical | rows 13-19 | 3 | `tests/e2e/25-linen/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 7 |
| TC-APP025-005 | JRN-APP025-002 | Work order that is refused | Negative | Critical | rows 20-28 | 3 | `tests/e2e/25-linen/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| TC-APP025-006 | JRN-APP025-002 | Work order that should be refused or asked | Negative | Critical | rows 29-32 | 3 | `tests/e2e/25-linen/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4 |
| TC-APP025-007 | JRN-APP025-002 | Saving with "All branches" | Negative | Critical | row 33 | 3 | `tests/e2e/25-linen/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP025-008 | JRN-APP025-003 | Circulation: clean linen to the ward, soiled linen to the laundry and back | Integration | Critical | rows 34-40 | 4 | `tests/e2e/25-linen/moves.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP025-009 | JRN-APP025-003 | Movement that is refused | Negative | Critical | rows 41-46 | 4 | `tests/e2e/25-linen/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6 |
| TC-APP025-010 | JRN-APP025-003 | Movement that should be refused or asked | Negative | Critical | rows 47-50 | 4 | `tests/e2e/25-linen/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4 |
| TC-APP025-011 | JRN-APP025-003 | Saving with "All branches" | Negative | Critical | row 51 | 4 | `tests/e2e/25-linen/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP025-012 | JRN-APP025-004 | Linen stock in Inventory after a full round | Integration | High | rows 52-56 | 5 | `tests/e2e/25-linen/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4 |
| TC-APP025-013 | JRN-APP025-004 | Round that is broken off | Negative | High | rows 57-58 | 5 | `tests/e2e/25-linen/moves.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2 |
| TC-APP025-014 | JRN-APP025-005 | Linen without the linen right, and what is recorded | Security | High | rows 59-63 | 6 | `tests/e2e/25-linen/orders.spec.ts` | U1, U3 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 / Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP025-015 | JRN-APP025-006 | Screen /linen opens | Regression | High | row 64 | 7 | `tests/e2e/25-linen/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP025-016 | JRN-APP025-006 | Screen /linen/moves opens | Regression | Medium | row 65 | 7 | `tests/e2e/25-linen/moves.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP025-017 | JRN-APP025-006 | Screen /linen/orders opens | Regression | Medium | row 66 | 7 | `tests/e2e/25-linen/orders.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP025-018 | JRN-APP025-006 | Screen /linen/stores opens | Regression | Medium | row 67 | 7 | `tests/e2e/25-linen/stores.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP025-019 | JRN-APP025-007 | Deep link without a session | Security | High | row 68 | 8 | `tests/e2e/25-linen/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP025-020 | JRN-APP025-007 | Tenant without the licence | Security | High | rows 69-70 | 8 | `tests/e2e/25-linen/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP025-021 | JRN-APP025-007 | Write without the write privilege | Security | High | row 71 | 8 | `tests/e2e/25-linen/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-WRITE: 5
- FIXME: 16
