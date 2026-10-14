# Traceability: 12-ris.xlsx

Source: `reference/12-ris.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP012-001 | JRN-APP012-001 | Registering a radiology order with all details | Positive | Critical | rows 2-6 | 2 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-002 | JRN-APP012-002 | Registering an order with the study only | Positive | High | rows 7-8 | 3 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-003 | JRN-APP012-003 | Order list: order of rows and paging | Positive | High | rows 9-11 | 4 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-RO | Read-only per Final State |
| TC-APP012-004 | JRN-APP012-004 | Radiographer working on "All branches" | Positive | High | rows 12-16 | 5 | `tests/e2e/12-ris/orders.spec.ts` | U2, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP012-005 | JRN-APP012-005 | Audit trail of radiology orders | Positive | High | row 17 | 6 | `tests/e2e/12-ris/hub.spec.ts` | U1, U10 | FIXME | Needs user(s) U10 (00-prerequisites: Open) |
| TC-APP012-006 | JRN-APP012-006 | Hub, navigation and Indonesian | Positive | Medium | rows 18-20 | 7 | `tests/e2e/12-ris/hub.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-007 | JRN-APP012-007 | Radiology order without a patient | Negative | Critical | rows 21-23 | 8 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-008 | JRN-APP012-008 | Doctor's request for an examination | Negative | Critical | rows 24-26 | 9 | `tests/e2e/12-ris/hub.spec.ts` | U1 | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP012-009 | JRN-APP012-009 | Completing or correcting an order later | Negative | Critical | rows 27-30 | 10 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-010 | JRN-APP012-010 | Status of an examination and the modality schedule | Negative | High | rows 31-33 | 11 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-011 | JRN-APP012-011 | Order form at its limits | Boundary | High | rows 34-38 | 12 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-012 | JRN-APP012-012 | Dates that cannot be right | Security | High | rows 39-41 | 13 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-013 | JRN-APP012-013 | Study time shown on the list | Negative | High | rows 42-43 | 14 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-014 | JRN-APP012-014 | Same reference or accession number twice | Other | High | rows 44-46 | 15 | `tests/e2e/12-ris/orders.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP012-015 | JRN-APP012-015 | Finding an order | Negative | High | rows 47-48 | 16 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-016 | JRN-APP012-016 | Image and report links | Negative | High | rows 49-51 | 17 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-017 | JRN-APP012-017 | Charge for an examination | Negative | Critical | rows 52-53 | 18 | `tests/e2e/12-ris/orders.spec.ts` | U1 | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP012-018 | JRN-APP012-018 | User without the radiology right | Security | Critical | rows 54-55 | 19 | `tests/e2e/12-ris/orders.spec.ts` | U1, U3 | FIXME | Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP012-019 | JRN-APP012-019 | User with no radiology role reads the orders | Negative | High | rows 56-57 | 20 | `tests/e2e/12-ris/hub.spec.ts` | U1, U3 | FIXME | Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP012-020 | JRN-APP012-020 | Orders of another branch | Security | Critical | rows 58-59 | 21 | `tests/e2e/12-ris/orders.spec.ts` | U1, U6 | FIXME | Needs user(s) U6 (00-prerequisites: Open) |
| TC-APP012-021 | JRN-APP012-021 | Tenant without the RIS licence | Security | High | rows 60-61 | 22 | `tests/e2e/12-ris/hub.spec.ts` | U1, U10 | FIXME | Needs user(s) U10 (00-prerequisites: Open) |
| TC-APP012-022 | JRN-APP012-022 | Opening the orders without being signed in | Negative | Critical | rows 62-64 | 23 | `tests/e2e/12-ris/orders.spec.ts` | None (not signed in) | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP012-023 | JRN-APP012-023 | Script text in the fields | Negative | Medium | rows 65-66 | 24 | `tests/e2e/12-ris/orders.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-024 | JRN-APP012-024 | Double click, two radiographers at once, and reload | Other | Medium | rows 67-69 | 25 | `tests/e2e/12-ris/orders.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP012-025 | JRN-APP012-025 | Schedule and report: scheduling a study, accepting it and saving the report | Positive | Critical | rows 70-75 | 26 | `tests/e2e/12-ris/studies.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 6 |
| TC-APP012-026 | JRN-APP012-025 | Actions with their input missing | Negative | Critical | rows 76-78 | 26 | `tests/e2e/12-ris/studies.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP012-027 | JRN-APP012-026 | Schedule and report: cancelling a study | Positive | High | rows 79-80 | 27 | `tests/e2e/12-ris/studies.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2 |
| TC-APP012-028 | JRN-APP012-026 | Cancel without a reason | Negative | High | row 81 | 27 | `tests/e2e/12-ris/studies.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP012-029 | JRN-APP012-027 | Radiology order from a consultation arrives in RIS | Integration | Critical | rows 82-84 | 28 | `tests/e2e/12-ris/orders.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP012-030 | JRN-APP012-028 | Screen /radiology opens | Regression | High | row 85 | 29 | `tests/e2e/12-ris/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-031 | JRN-APP012-028 | Screen /radiology/orders opens | Regression | Medium | row 86 | 29 | `tests/e2e/12-ris/orders.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-032 | JRN-APP012-028 | Screen /radiology/studies opens | Regression | Medium | row 87 | 29 | `tests/e2e/12-ris/studies.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP012-033 | JRN-APP012-029 | Deep link without a session | Security | High | row 88 | 30 | `tests/e2e/12-ris/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP012-034 | JRN-APP012-029 | Tenant without the licence | Security | High | rows 89-90 | 30 | `tests/e2e/12-ris/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP012-035 | JRN-APP012-029 | Write without the write privilege | Security | High | row 91 | 30 | `tests/e2e/12-ris/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-RO: 1
- AUTOMATE-WRITE: 15
- FIXME: 19
