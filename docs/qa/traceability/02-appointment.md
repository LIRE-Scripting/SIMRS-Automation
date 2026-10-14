# Traceability: 02-appointment.xlsx

Source: `reference/02-appointment.xlsx` (sheets Journeys, Steps). Generated read-only; do not edit by hand.

Test title = `<TC ID> <Scenario Name> [<file> | Steps | rows a-b | <TC ID>]`; annotation `journey` = `[<file> | Journeys | row n | <Journey ID>]`.

| TC ID | Journey ID | Scenario | Type | Prio | Steps rows | Journeys row | Planned spec | Users | Disposition | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-APP002-001 | JRN-APP002-001 | Book settings: appointment types, daily quota and open hours | Positive | High | rows 2-7 | 2 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-002 | JRN-APP002-002 | Booking an appointment with a consultant | Positive | Critical | rows 8-13 | 3 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-003 | JRN-APP002-003 | Booking an appointment with a unit | Positive | High | rows 14-17 | 4 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-004 | JRN-APP002-004 | Schedule list: date range, paging and selection | Positive | High | rows 18-23 | 5 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-RO | Read-only per Final State |
| TC-APP002-005 | JRN-APP002-005 | Calendar, OPD calendar and the open-hours panel | Positive | Medium | rows 24-28 | 6 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-RO | Read-only per Final State |
| TC-APP002-006 | JRN-APP002-006 | Rescheduling appointments | Positive | High | rows 29-32 | 7 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-007 | JRN-APP002-007 | Cancelling appointments | Positive | High | rows 33-36 | 8 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-008 | JRN-APP002-008 | Blocking a consultant's time | Positive | High | rows 37-40 | 9 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-009 | JRN-APP002-009 | Daily quota used up | Negative | High | rows 41-44 | 10 | `tests/e2e/02-appointment/schedule.spec.ts` | U1, U4 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U4 (00-prerequisites: Open) |
| TC-APP002-010 | JRN-APP002-010 | Two bookings in the same open time | Negative | High | rows 45-47 | 11 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-011 | JRN-APP002-011 | Booking for a day that has passed | Boundary | High | rows 48-49 | 12 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-012 | JRN-APP002-012 | Booking form that is not complete | Negative | High | rows 50-53 | 13 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-013 | JRN-APP002-013 | Reschedule that must be refused | Negative | High | rows 54-56 | 14 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-014 | JRN-APP002-014 | Cancelling without a question or a reason | Negative | High | rows 57-59 | 15 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-015 | JRN-APP002-015 | Book settings that are not valid | Negative | High | rows 60-63 | 16 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-016 | JRN-APP002-016 | Block that is wrong or must be lifted | Negative | High | rows 64-66 | 17 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-017 | JRN-APP002-017 | Who and what can be chosen in a booking | Negative | High | rows 67-69 | 18 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-018 | JRN-APP002-018 | Date range that is too long or the wrong way round | Boundary | Medium | rows 70-72 | 19 | `tests/e2e/02-appointment/schedule.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-019 | JRN-APP002-019 | Adding a referral type | Positive | Medium | rows 73-77 | 20 | `tests/e2e/02-appointment/referral-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-020 | JRN-APP002-019 | Code or name already used | Negative | Medium | row 78 | 20 | `tests/e2e/02-appointment/referral-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-021 | JRN-APP002-019 | Code or name empty | Negative | Medium | rows 79-80 | 20 | `tests/e2e/02-appointment/referral-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-022 | JRN-APP002-020 | Inactive referral type is not offered and is refused in a booking | Negative | High | rows 81-83 | 21 | `tests/e2e/02-appointment/referral-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-023 | JRN-APP002-021 | Adding a cross-consult type | Positive | Medium | rows 84-88 | 22 | `tests/e2e/02-appointment/cross-consult-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-024 | JRN-APP002-021 | Code or name already used | Negative | Medium | row 89 | 22 | `tests/e2e/02-appointment/cross-consult-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-025 | JRN-APP002-021 | Code or name empty | Negative | Medium | rows 90-91 | 22 | `tests/e2e/02-appointment/cross-consult-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-026 | JRN-APP002-022 | Inactive cross-consult type is not offered and is refused in a booking | Negative | High | rows 92-94 | 23 | `tests/e2e/02-appointment/cross-consult-types.spec.ts` | U1 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-027 | JRN-APP002-023 | Screen /appointment opens | Regression | High | row 95 | 24 | `tests/e2e/02-appointment/hub.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-028 | JRN-APP002-023 | Screen /appointment/cross-consult-types opens | Regression | Medium | row 96 | 24 | `tests/e2e/02-appointment/cross-consult-types.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-029 | JRN-APP002-023 | Screen /appointment/referral-types opens | Regression | Medium | row 97 | 24 | `tests/e2e/02-appointment/referral-types.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-030 | JRN-APP002-023 | Screen /appointment/schedule opens | Regression | Medium | row 98 | 24 | `tests/e2e/02-appointment/schedule.spec.ts` | U2 | AUTOMATE-WRITE | Saves data: gated on go-ahead (Set-up row 1) |
| TC-APP002-031 | JRN-APP002-024 | Deep link without a session | Security | High | row 99 | 25 | `tests/e2e/02-appointment/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP002-032 | JRN-APP002-024 | Tenant without the licence | Security | High | rows 100-101 | 25 | `tests/e2e/02-appointment/access-control.spec.ts` | U1, U3, U10 | FIXME | Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |
| TC-APP002-033 | JRN-APP002-024 | Write without the write privilege | Security | High | row 102 | 25 | `tests/e2e/02-appointment/access-control.spec.ts` | U1, U3, U10 | FIXME | Expected Result TBD at step(s) 1 / Excel: Automation Candidate = Needs Evaluation / Needs user(s) U3, U10 (00-prerequisites: Open) |

## Disposition counts

- AUTOMATE-RO: 2
- AUTOMATE-WRITE: 27
- FIXME: 4
