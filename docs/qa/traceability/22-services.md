# Traceability: 22-services.xlsx

Source: `reference/22-services.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP022-001 | JRN-APP022-001 | Service category: save, parent, deactivate and delete | Positive | High | rows 2-7 | 2 | `tests/e2e/22-services/categories.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-002 | JRN-APP022-001 | Category that is refused | Negative | High | rows 8-14 | 2 | `tests/e2e/22-services/categories.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6, 7 |
| TC-APP022-003 | JRN-APP022-002 | Service item with its three accounts | Positive | High | rows 15-18 | 3 | `tests/e2e/22-services/items.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-004 | JRN-APP022-002 | Item that is refused | Negative | High | rows 19-22 | 3 | `tests/e2e/22-services/items.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4 |
| TC-APP022-005 | JRN-APP022-003 | Service request: create, send, approve and complete | Positive | Critical | rows 23-28 | 4 | `tests/e2e/22-services/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-006 | JRN-APP022-003 | Request that is refused | Negative | Critical | rows 29-33 | 4 | `tests/e2e/22-services/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 |
| TC-APP022-007 | JRN-APP022-003 | Reject, cancel and what follows | Negative | Critical | rows 34-37 | 4 | `tests/e2e/22-services/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 3, 4 |
| TC-APP022-008 | JRN-APP022-003 | Saving with "All branches" | Negative | Critical | rows 38-39 | 4 | `tests/e2e/22-services/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2 |
| TC-APP022-009 | JRN-APP022-004 | Service purchase request | Positive | High | rows 40-44 | 5 | `tests/e2e/22-services/purchase-requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-010 | JRN-APP022-004 | Purchase request that is refused | Negative | High | rows 45-48 | 5 | `tests/e2e/22-services/purchase-requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4 |
| TC-APP022-011 | JRN-APP022-004 | Saving with "All branches" | Negative | High | rows 49-50 | 5 | `tests/e2e/22-services/purchase-requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2 |
| TC-APP022-012 | JRN-APP022-005 | Service purchase order: create, send, approve and amend | Positive | Critical | rows 51-55 | 6 | `tests/e2e/22-services/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 5 |
| TC-APP022-013 | JRN-APP022-005 | Order that is refused | Negative | Critical | rows 56-61 | 6 | `tests/e2e/22-services/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5, 6 |
| TC-APP022-014 | JRN-APP022-005 | Saving with "All branches" | Negative | Critical | rows 62-63 | 6 | `tests/e2e/22-services/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2 |
| TC-APP022-015 | JRN-APP022-006 | Service receipt: confirming that a service was delivered | Integration | Critical | rows 64-69 | 7 | `tests/e2e/22-services/receipts.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 4, 5, 6 |
| TC-APP022-016 | JRN-APP022-006 | Receipt that is refused | Negative | Critical | rows 70-72 | 7 | `tests/e2e/22-services/receipts.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP022-017 | JRN-APP022-006 | Receipt that should be refused | Negative | Critical | rows 73-74 | 7 | `tests/e2e/22-services/receipts.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 1, 2 |
| TC-APP022-018 | JRN-APP022-007 | Vendor bill | Integration | Critical | rows 75-79 | 8 | `tests/e2e/22-services/bills.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 4, 5 |
| TC-APP022-019 | JRN-APP022-007 | Bill that is refused | Negative | Critical | rows 80-82 | 8 | `tests/e2e/22-services/bills.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP022-020 | JRN-APP022-007 | Bill that should be refused | Negative | Critical | rows 83-85 | 8 | `tests/e2e/22-services/bills.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP022-021 | JRN-APP022-008 | From a request to the vendor bill: one service, end to end | Integration | Critical | rows 86-92 | 9 | `tests/e2e/22-services/requests.spec.ts` | U1 | FIXME | Blocker 11: Service receipt and Vendor bill are never listed / Expected Result TBD at step(s) 2, 4, 6, 7 |
| TC-APP022-022 | JRN-APP022-009 | Services without the services right, and what is recorded | Security | High | rows 93-97 | 10 | `tests/e2e/22-services/requests.spec.ts` | U1, U3 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 / Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP022-023 | JRN-APP022-010 | Screen /services opens | Regression | High | row 98 | 11 | `tests/e2e/22-services/hub.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-024 | JRN-APP022-010 | Screen /services/bills opens | Regression | Medium | row 99 | 11 | `tests/e2e/22-services/bills.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-025 | JRN-APP022-010 | Screen /services/categories opens | Regression | Medium | row 100 | 11 | `tests/e2e/22-services/categories.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-026 | JRN-APP022-010 | Screen /services/items opens | Regression | Medium | row 101 | 11 | `tests/e2e/22-services/items.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-027 | JRN-APP022-010 | Screen /services/orders opens | Regression | Medium | row 102 | 11 | `tests/e2e/22-services/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-028 | JRN-APP022-010 | Screen /services/purchase-requests opens | Regression | Medium | row 103 | 11 | `tests/e2e/22-services/purchase-requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-029 | JRN-APP022-010 | Screen /services/receipts opens | Regression | Medium | row 104 | 11 | `tests/e2e/22-services/receipts.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-030 | JRN-APP022-010 | Screen /services/requests opens | Regression | Medium | row 105 | 11 | `tests/e2e/22-services/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP022-031 | JRN-APP022-011 | Deep link without a session | Security | High | row 106 | 12 | `tests/e2e/22-services/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP022-032 | JRN-APP022-011 | Tenant without the licence | Security | High | rows 107-108 | 12 | `tests/e2e/22-services/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP022-033 | JRN-APP022-011 | Write without the write privilege | Security | High | row 109 | 12 | `tests/e2e/22-services/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP022-034 | JRN-APP022-012 | List of /services/orders with "All branches" | Negative | High | row 110 | 13 | `tests/e2e/22-services/orders.spec.ts` | U2 | FIXME | Blocker 5: 28 lists do not load with "All branches" / Expected Result TBD at step(s) 1 |
| TC-APP022-035 | JRN-APP022-012 | List of /services/purchase-requests with "All branches" | Negative | High | row 111 | 13 | `tests/e2e/22-services/purchase-requests.spec.ts` | U2 | FIXME | Blocker 5: 28 lists do not load with "All branches" / Expected Result TBD at step(s) 1 |
| TC-APP022-036 | JRN-APP022-012 | List of /services/requests with "All branches" | Negative | High | row 112 | 13 | `tests/e2e/22-services/requests.spec.ts` | U2 | FIXME | Blocker 5: 28 lists do not load with "All branches" / Expected Result TBD at step(s) 1 |

## Disposition counts

- AUTOMATE-WRITE: 12
- FIXME: 24
