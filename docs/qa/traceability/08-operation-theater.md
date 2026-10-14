# Traceability: 08-operation-theater.xlsx

Source: `reference/08-operation-theater.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP008-001 | JRN-APP008-001 | Creating an OT request | Positive | Critical | rows 2-5 | 2 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-002 | JRN-APP008-002 | Request with a blocked amount | Positive | High | rows 6-7 | 3 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-003 | JRN-APP008-003 | Marking the OT list as prepared | Positive | Critical | rows 8-9 | 4 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-004 | JRN-APP008-004 | Recording consumption | Positive | Critical | rows 10-11 | 5 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-005 | JRN-APP008-005 | Request list and paging | Positive | High | rows 12-14 | 6 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-RO | Read-only per Final State |
| TC-APP008-006 | JRN-APP008-006 | Theatre nurse working on "All branches" | Positive | High | rows 15-19 | 7 | `tests/e2e/08-operation-theater/requests.spec.ts` | U2, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP008-007 | JRN-APP008-007 | Audit trail of OT requests | Positive | High | rows 20-21 | 8 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1, U10 | FIXME | Needs user(s) U10 (00-prerequisites: Open) |
| TC-APP008-008 | JRN-APP008-008 | Hub, navigation and Indonesian | Positive | Medium | rows 22-24 | 9 | `tests/e2e/08-operation-theater/hub.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-009 | JRN-APP008-009 | OT request without a patient or a surgical team | Negative | Critical | rows 25-27 | 10 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-010 | JRN-APP008-010 | Scheduling without a date, a time or a theatre | Negative | Critical | rows 28-30 | 11 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-011 | JRN-APP008-011 | Consumption without items, stock or charge | Negative | Critical | rows 31-33 | 12 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP008-012 | JRN-APP008-012 | Consume before the list is prepared | Negative | High | rows 34-35 | 13 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-013 | JRN-APP008-013 | Consume clicked twice or by mistake | Other | High | rows 36-39 | 14 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-014 | JRN-APP008-014 | Blocked amount at its limits | Boundary | High | rows 40-43 | 15 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-015 | JRN-APP008-015 | Request form at its limits | Boundary | High | rows 44-46 | 16 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-016 | JRN-APP008-016 | Finding a request and the new request after saving | Other | High | rows 47-49 | 17 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP008-017 | JRN-APP008-017 | Changing or cancelling a request | Negative | High | rows 50-52 | 18 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-018 | JRN-APP008-018 | User without the operation theater right | Security | Critical | rows 53-55 | 19 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1, U3 | FIXME | Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP008-019 | JRN-APP008-019 | User with no theatre role reads the requests | Negative | High | rows 56-57 | 20 | `tests/e2e/08-operation-theater/hub.spec.ts` | U1, U3 | FIXME | Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP008-020 | JRN-APP008-020 | Requests of another branch | Security | Critical | rows 58-59 | 21 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1, U6 | FIXME | Needs user(s) U6 (00-prerequisites: Open) |
| TC-APP008-021 | JRN-APP008-021 | Tenant without the Operation Theater licence | Security | High | rows 60-61 | 22 | `tests/e2e/08-operation-theater/hub.spec.ts` | U1, U10 | FIXME | Needs user(s) U10 (00-prerequisites: Open) |
| TC-APP008-022 | JRN-APP008-022 | Opening the requests without being signed in | Negative | Critical | rows 62-64 | 23 | `tests/e2e/08-operation-theater/requests.spec.ts` | None (not signed in) | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP008-023 | JRN-APP008-023 | Script text in the procedures field | Negative | Medium | rows 65-66 | 24 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-024 | JRN-APP008-024 | Double click, two nurses at once, and reload | Other | Medium | rows 67-69 | 25 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP008-025 | JRN-APP008-025 | Request with patient, room, times and surgeon, placed on the calendar | Positive | Critical | rows 70-73 | 26 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-026 | JRN-APP008-025 | Place on calendar without room or times | Negative | Critical | row 74 | 26 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP008-027 | JRN-APP008-026 | Surgical case from validation to completion | Positive | Critical | rows 75-78 | 27 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2 |
| TC-APP008-028 | JRN-APP008-026 | Steps out of order | Negative | Critical | rows 79-83 | 27 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4, 5 |
| TC-APP008-029 | JRN-APP008-026 | Complete without an operation note | Negative | Critical | row 84 | 27 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP008-030 | JRN-APP008-027 | Deferring, resuming and cancelling a request | Positive | High | rows 85-87 | 28 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-031 | JRN-APP008-027 | Defer or cancel without a reason | Negative | High | row 88 | 28 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP008-032 | JRN-APP008-027 | Resume, defer and cancel that must be refused | Negative | High | rows 89-91 | 28 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP008-033 | JRN-APP008-028 | Recording a dossier on a request: items go to the pharmacy | Positive | Critical | rows 92-93 | 29 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2 |
| TC-APP008-034 | JRN-APP008-028 | Dossier that must be refused | Negative | Critical | rows 94-95 | 29 | `tests/e2e/08-operation-theater/requests.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2 |
| TC-APP008-035 | JRN-APP008-029 | Dossier: adding one and linking it to a procedure | Positive | High | rows 96-99 | 30 | `tests/e2e/08-operation-theater/dossiers.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-036 | JRN-APP008-029 | Dossier without name or item | Negative | High | row 100 | 30 | `tests/e2e/08-operation-theater/dossiers.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-037 | JRN-APP008-030 | Billing policy: percentage per incision and department type | Positive | High | rows 101-103 | 31 | `tests/e2e/08-operation-theater/policies.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-038 | JRN-APP008-030 | Policy that must be refused | Negative | High | row 104 | 31 | `tests/e2e/08-operation-theater/policies.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP008-039 | JRN-APP008-031 | Calendar: reading a day and shifting a slot by one hour | Positive | High | rows 105-107 | 32 | `tests/e2e/08-operation-theater/calendar.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-040 | JRN-APP008-032 | Pain: chronic pain note and acute pain medication | Positive | High | rows 108-110 | 33 | `tests/e2e/08-operation-theater/pain.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-041 | JRN-APP008-032 | Chronic pain note without a patient | Negative | High | row 111 | 33 | `tests/e2e/08-operation-theater/pain.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP008-042 | JRN-APP008-032 | Acute pain without medication or dose | Negative | High | row 112 | 33 | `tests/e2e/08-operation-theater/pain.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-043 | JRN-APP008-033 | Case: reading the page | Positive | Low | row 113 | 34 | `tests/e2e/08-operation-theater/case.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-044 | JRN-APP008-034 | Screen /ot opens | Regression | High | row 114 | 35 | `tests/e2e/08-operation-theater/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-045 | JRN-APP008-034 | Screen /ot/calendar opens | Regression | Medium | row 115 | 35 | `tests/e2e/08-operation-theater/calendar.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-046 | JRN-APP008-034 | Screen /ot/case opens | Regression | Medium | row 116 | 35 | `tests/e2e/08-operation-theater/case.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-047 | JRN-APP008-034 | Screen /ot/dossiers opens | Regression | Medium | row 117 | 35 | `tests/e2e/08-operation-theater/dossiers.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-048 | JRN-APP008-034 | Screen /ot/pain opens | Regression | Medium | row 118 | 35 | `tests/e2e/08-operation-theater/pain.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-049 | JRN-APP008-034 | Screen /ot/policies opens | Regression | Medium | row 119 | 35 | `tests/e2e/08-operation-theater/policies.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-050 | JRN-APP008-034 | Screen /ot/requests opens | Regression | Medium | row 120 | 35 | `tests/e2e/08-operation-theater/requests.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP008-051 | JRN-APP008-035 | Deep link without a session | Security | High | row 121 | 36 | `tests/e2e/08-operation-theater/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP008-052 | JRN-APP008-035 | Tenant without the licence | Security | High | rows 122-123 | 36 | `tests/e2e/08-operation-theater/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP008-053 | JRN-APP008-035 | Write without the write privilege | Security | High | row 124 | 36 | `tests/e2e/08-operation-theater/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-RO: 1
- AUTOMATE-WRITE: 29
- FIXME: 23
