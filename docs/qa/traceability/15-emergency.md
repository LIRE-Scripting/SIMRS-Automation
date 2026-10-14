# Traceability: 15-emergency.xlsx

Source: `reference/15-emergency.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP015-001 | JRN-APP015-001 | Creating an emergency visit | Positive | Critical | rows 2-5 | 2 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-002 | JRN-APP015-002 | Recording triage | Positive | Critical | rows 6-7 | 3 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-003 | JRN-APP015-003 | Assigning a bay | Positive | Critical | rows 8-10 | 4 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-004 | JRN-APP015-004 | Visit list: priority order, statuses and paging | Positive | High | rows 11-13 | 5 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-RO | Read-only per Final State |
| TC-APP015-005 | JRN-APP015-005 | Nurse working on "All branches" | Positive | High | rows 14-18 | 6 | `tests/e2e/15-emergency/visits.spec.ts` | U2, U5 | FIXME | Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP015-006 | JRN-APP015-006 | Audit trail of emergency visits | Positive | High | rows 19-20 | 7 | `tests/e2e/15-emergency/hub.spec.ts` | U1, U10 | FIXME | Needs user(s) U10 (00-prerequisites: Open) |
| TC-APP015-007 | JRN-APP015-007 | Hub, navigation and Indonesian | Positive | Medium | rows 21-23 | 8 | `tests/e2e/15-emergency/hub.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-008 | JRN-APP015-008 | Finding the patient and the bed | Negative | Critical | rows 24-27 | 9 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-009 | JRN-APP015-009 | Triage without a level | Negative | Critical | rows 28-30 | 10 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-010 | JRN-APP015-010 | Visit for a wrong or unknown patient ID | Negative | High | rows 31-35 | 11 | `tests/e2e/15-emergency/visits.spec.ts` | U1, U6 | FIXME | Needs user(s) U6 (00-prerequisites: Open) |
| TC-APP015-011 | JRN-APP015-011 | Bay that is occupied, switched off or in another branch | Security | Critical | rows 36-40 | 12 | `tests/e2e/15-emergency/visits.spec.ts` | U1, U4, U6 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4, U6 (00-prerequisites: Open) |
| TC-APP015-012 | JRN-APP015-012 | Bay or triage by mistake | Negative | High | rows 41-43 | 13 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-013 | JRN-APP015-013 | Same patient with two open visits | Negative | High | rows 44-45 | 14 | `tests/e2e/15-emergency/visits.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP015-014 | JRN-APP015-014 | Ending a visit | Negative | Critical | rows 46-49 | 15 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-015 | JRN-APP015-015 | Priority order across pages | Negative | High | rows 50-51 | 16 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-016 | JRN-APP015-016 | Times shown on the list | Negative | High | rows 52-53 | 17 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-017 | JRN-APP015-017 | Clinical record and charges of an emergency visit | Negative | Critical | rows 54-56 | 18 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP015-018 | JRN-APP015-018 | User without the emergency right | Security | Critical | rows 57-59 | 19 | `tests/e2e/15-emergency/visits.spec.ts` | U1, U3 | FIXME | Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP015-019 | JRN-APP015-019 | User with no emergency role reads the visits | Negative | High | rows 60-61 | 20 | `tests/e2e/15-emergency/hub.spec.ts` | U1, U3 | FIXME | Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP015-020 | JRN-APP015-020 | Visits of another branch | Security | Critical | rows 62-64 | 21 | `tests/e2e/15-emergency/visits.spec.ts` | U1, U6 | FIXME | Needs user(s) U6 (00-prerequisites: Open) |
| TC-APP015-021 | JRN-APP015-021 | Tenant without the Emergency licence | Security | High | rows 65-66 | 22 | `tests/e2e/15-emergency/hub.spec.ts` | U1, U10 | FIXME | Needs user(s) U10 (00-prerequisites: Open) |
| TC-APP015-022 | JRN-APP015-022 | Opening the visits without being signed in | Negative | Critical | rows 67-69 | 23 | `tests/e2e/15-emergency/visits.spec.ts` | None (not signed in) | FIXME | Excel: Automation Candidate = Needs Evaluation |
| TC-APP015-023 | JRN-APP015-023 | Double click, two nurses at once, and reload | Other | High | rows 70-73 | 24 | `tests/e2e/15-emergency/visits.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP015-024 | JRN-APP015-024 | Triage category: create, change, deactivate and delete | Positive | High | rows 74-79 | 25 | `tests/e2e/15-emergency/triage-categories.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-025 | JRN-APP015-024 | Categories the server refuses | Negative | High | rows 80-83 | 25 | `tests/e2e/15-emergency/triage-categories.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 3 |
| TC-APP015-026 | JRN-APP015-024 | An inactive category on the board | Negative | High | row 84 | 25 | `tests/e2e/15-emergency/triage-categories.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP015-027 | JRN-APP015-025 | Accident/Emergency registration with a name and an estimated age | Positive | Critical | rows 85-91 | 26 | `tests/e2e/15-emergency/registration.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch / Expected Result TBD at step(s) 5 |
| TC-APP015-028 | JRN-APP015-025 | Registration that is refused | Negative | Critical | rows 92-96 | 26 | `tests/e2e/15-emergency/registration.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch |
| TC-APP015-029 | JRN-APP015-025 | The same person registered twice | Negative | Critical | row 97 | 26 | `tests/e2e/15-emergency/registration.spec.ts` | U1 | FIXME | Blocker 13: Set-up missing on the branch / Expected Result TBD at step(s) 1 |
| TC-APP015-030 | JRN-APP015-026 | A patient brought dead | Positive | Critical | rows 98-101 | 27 | `tests/e2e/15-emergency/registration.spec.ts` | U1 | FIXME | Blocker 9: A closed emergency encounter cannot be received again; "Mark as alive" cannot be reached; Blocker 13: Set-up missing on the branch / Expected Result TBD at step(s) 2, 3, 4 |
| TC-APP015-031 | JRN-APP015-027 | Receiving a registered emergency patient | Positive | Critical | rows 102-107 | 28 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-032 | JRN-APP015-027 | Receiving that is refused | Negative | Critical | rows 108-112 | 28 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-033 | JRN-APP015-027 | A returning patient | Negative | Critical | row 113 | 28 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP015-034 | JRN-APP015-027 | Discount and plan typed at reception | Negative | Critical | row 114 | 28 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP015-035 | JRN-APP015-028 | Walk-in ER: registering and receiving in one step | Positive | High | rows 115-118 | 29 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-036 | JRN-APP015-028 | Walk-in that is refused or doubled | Negative | High | rows 119-122 | 29 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2, 3, 4 |
| TC-APP015-037 | JRN-APP015-029 | Triage assessment and the overdue timer | Positive | Critical | rows 123-128 | 30 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4 |
| TC-APP015-038 | JRN-APP015-029 | Triage that is refused | Negative | Critical | rows 129-131 | 30 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2 |
| TC-APP015-039 | JRN-APP015-029 | The clock of the overdue mark | Negative | Critical | row 132 | 30 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1 |
| TC-APP015-040 | JRN-APP015-030 | Assigning a bed and a consultant | Integration | Critical | rows 133-138 | 31 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 6 |
| TC-APP015-041 | JRN-APP015-030 | Assignment that is refused | Negative | Critical | rows 139-142 | 31 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4 |
| TC-APP015-042 | JRN-APP015-031 | Outcome: discharge from Emergency | Positive | Critical | rows 143-148 | 32 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-043 | JRN-APP015-031 | Discharge that is refused or questionable | Negative | Critical | rows 149-152 | 32 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 3, 4 |
| TC-APP015-044 | JRN-APP015-032 | Outcome: admission to a ward | Integration | Critical | rows 153-157 | 33 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 4 |
| TC-APP015-045 | JRN-APP015-032 | Admission that is refused or questionable | Negative | Critical | rows 158-161 | 33 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3, 4 |
| TC-APP015-046 | JRN-APP015-033 | Outcome: death, and reversing a death recorded by mistake | Security | Critical | rows 162-167 | 34 | `tests/e2e/15-emergency/patients.spec.ts` | U1, U5 | FIXME | Blocker 9: A closed emergency encounter cannot be received again; "Mark as alive" cannot be reached / Expected Result TBD at step(s) 4, 6 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP015-047 | JRN-APP015-033 | Death record the server refuses | Negative | Critical | rows 168-170 | 34 | `tests/e2e/15-emergency/patients.spec.ts` | U1, U5 | FIXME | Blocker 9: A closed emergency encounter cannot be received again; "Mark as alive" cannot be reached / Expected Result TBD at step(s) 1, 2, 3 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP015-048 | JRN-APP015-033 | Wrong row | Negative | Critical | row 171 | 34 | `tests/e2e/15-emergency/patients.spec.ts` | U1, U5 | FIXME | Blocker 9: A closed emergency encounter cannot be received again; "Mark as alive" cannot be reached / Expected Result TBD at step(s) 1 / Needs user(s) U5 (00-prerequisites: Open) |
| TC-APP015-049 | JRN-APP015-034 | Outcome: closing an outpatient emergency visit | Positive | High | rows 172-173 | 35 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-050 | JRN-APP015-034 | Close that is refused | Negative | High | rows 174-176 | 35 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2, 3 |
| TC-APP015-051 | JRN-APP015-035 | Attaching a file to an encounter | Positive | Medium | rows 177-179 | 36 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 3 |
| TC-APP015-052 | JRN-APP015-035 | File that is refused | Negative | Medium | rows 180-182 | 36 | `tests/e2e/15-emergency/patients.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 3 |
| TC-APP015-053 | JRN-APP015-036 | Emergency Layout: the board, a new registration and the tile menu | Positive | High | rows 183-189 | 37 | `tests/e2e/15-emergency/layout.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 6 |
| TC-APP015-054 | JRN-APP015-036 | Board registration that is refused | Negative | High | rows 190-195 | 37 | `tests/e2e/15-emergency/layout.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 2, 3, 4, 5, 6 |
| TC-APP015-055 | JRN-APP015-036 | Without a service centre | Negative | High | row 196 | 37 | `tests/e2e/15-emergency/layout.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-056 | JRN-APP015-037 | Emergency Layout Design: placing the beds of a service centre | Positive | Medium | rows 197-200 | 38 | `tests/e2e/15-emergency/layout-design.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-057 | JRN-APP015-037 | Layout the server refuses | Negative | Medium | rows 201-203 | 38 | `tests/e2e/15-emergency/layout-design.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 2, 3 |
| TC-APP015-058 | JRN-APP015-038 | The old Visits screen beside the new screens | Negative | High | rows 204-207 | 39 | `tests/e2e/15-emergency/visits.spec.ts` | U1 | FIXME | Expected Result TBD at step(s) 1, 3, 4 |
| TC-APP015-059 | JRN-APP015-039 | New Emergency screens for a user without the emergency right | Security | High | rows 208-212 | 40 | `tests/e2e/15-emergency/patients.spec.ts` | U1, U3 | FIXME | Expected Result TBD at step(s) 1, 3, 5 / Needs user(s) U3 (00-prerequisites: Open) |
| TC-APP015-060 | JRN-APP015-040 | Screen /emergency opens | Regression | High | row 213 | 41 | `tests/e2e/15-emergency/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-061 | JRN-APP015-040 | Screen /emergency/layout opens | Regression | Medium | row 214 | 41 | `tests/e2e/15-emergency/layout.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-062 | JRN-APP015-040 | Screen /emergency/layout-design opens | Regression | Medium | row 215 | 41 | `tests/e2e/15-emergency/layout-design.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-063 | JRN-APP015-040 | Screen /emergency/patients opens | Regression | Medium | row 216 | 41 | `tests/e2e/15-emergency/patients.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-064 | JRN-APP015-040 | Screen /emergency/registration opens | Regression | Medium | row 217 | 41 | `tests/e2e/15-emergency/registration.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-065 | JRN-APP015-040 | Screen /emergency/triage-categories opens | Regression | Medium | row 218 | 41 | `tests/e2e/15-emergency/triage-categories.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-066 | JRN-APP015-040 | Screen /emergency/visits opens | Regression | Medium | row 219 | 41 | `tests/e2e/15-emergency/visits.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP015-067 | JRN-APP015-041 | Deep link without a session | Security | High | row 220 | 42 | `tests/e2e/15-emergency/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP015-068 | JRN-APP015-041 | Tenant without the licence | Security | High | rows 221-222 | 42 | `tests/e2e/15-emergency/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP015-069 | JRN-APP015-041 | Write without the write privilege | Security | High | row 223 | 42 | `tests/e2e/15-emergency/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-RO: 1
- AUTOMATE-WRITE: 25
- FIXME: 43
