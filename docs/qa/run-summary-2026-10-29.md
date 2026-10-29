# SIMRS run summary, 2026-10-29

Site: https://rs.showcase.atklik.xyz/id (Indonesian), branch Podomoro (U1 rs.admin2; U2 rs.admin for the "All branches" cases).
Workbook: `reports/summary/simrs-run-summary.xlsx` (sheet **Ringkasan**: main figures, every chain with its screenshot, one line per module, the top blockers; the other sheets hold the details). It is rebuilt after every Playwright run (`scripts/qa/summary-reporter.ts`, off with `QA_SUMMARY=0`).

Each test case and chain counts with its newest result from any run. Since 2026-10-28 the suite runs on /id (`lib/i18n`). Today every test case whose newest result was still from /en was run again on /id (modules 01–08 whole, then 580 test cases of 08–27), and every failure was fixed or registered. Left on an /en result: the 23 test cases of `14-hospital-accounts/cashier.spec.ts` that need the U1 cashier counter open (it was closed for the day by TC-APP014-011); they run after 07:00 WIB.

## Figures

| | Passed | Deviation | Failed | Blocked | Not run | Total |
|---|---|---|---|---|---|---|
| Module test cases | 657 | 259 | **0** | 382 | 306 | 1604 |
| E2E chains | 4 | 5 | **0** | 41 | 0 | 50 |

Pass rate (passed / all test cases) 41%; coverage (passed + deviation + failed / all) 57%. HTTP 5xx answers in the newest results: 489.

"Not run" holds the cases the plan does not automate (Automation Candidate No / Needs Evaluation), cases that need a user who is not prepared (blocker 38), and steps marked TBD. No planned test case is without a test.

## The patient up to the invoice (E2E-001)

Steps 1–9 run: registration (automatic MRN), appointment, arrival and call, consultation, prescription, dispense, the RX invoice at the cashier, payment, and the receipt shown and printed (evidence `reports/screenshots/E2E-001-receipt.png` and `E2E-001-receipt-printout.pdf`). Step 10 (the sale and the receipt as Finance vouchers) is blocked by checklist blocker 13 (set-up missing on the branch). Deviations: the item is priced at cost with no tax (blocker 35), the receipt has no print control (browser print), and the receipt is not shown again when the paid sale is found later.

Inpatient to bill (E2E-004) stops at step 4: Ward care does not offer the stays of the branch (blocker 23).

## Chains

Passed: E2E-018, 024, 025, 046. Deviation (every step ran): E2E-006, 013, 022, 023, 048. The other 41 run up to a registered blocker; sheet Ringkasan names the step and the blocker of each. Fixed today and now reaching their blocker instead of failing: E2E-008, 009, 010, 011, 012, 013, 014, 018, 020, 025, 026, 027, 029, 032, 033 (last, closes the cashier day), 035, 044, 045.

## Blockers found today

| No | Blocker |
|---|---|
| 48 | A saved unsterile receipt does not open (504) and stalls the site for minutes |
| 49 | "Calculate" on Diet orders answers HTTP 500 (since 2026-10-21) |
| 50 | A sourcing agreement cannot be saved (HTTP 500), also with a budget head |
| 51 | Item Master does not list a new item for a long time after "Item added." (the item is stored) |
| 52 | "Confirm dispense" answers HTTP 500 with Freeze days set, or for a patient whose namesake is admitted |
| 53 | "Revert latest stamp" on the laboratory Work desk answers HTTP 500 |
| 54 | The Triage dialog of Emergency Patients offers no triage category (seen once; a rerun picked one) |
| 55 | "Save branding" with an uploaded logo answers HTTP 500 ("Failed to save branding.") |

Changed: 39 (a tender is now saved for a purchase request with no tender yet; a second tender of a request still answers HTTP 500), 38 (now with the prerequisites run of 2026-10-20: 4 of 26 role accounts not made), 40 (more lists and pickers: Patient plan, bed picker on transfer, Issue Lines search, User Site Mapping, the account lists, the maintenance and services desks). Register: `docs/qa/blockers-found.md`; Indonesian titles in the workbook.

## Sourcing (23) reopened

With blocker 39 lifted, TC-APP023-005 … 021 and E2E-009 were written to the reference: tender created, sent, published, advertised and corrected; fees, deposits and refunds; bids submitted, opened, evaluated, rated and accepted (a tender of the tests closes yesterday, as acceptance needs the close date passed); the agreement stops at blocker 50. Site rules met: one tender per purchase request, one bid per bidder and tender (a second answers HTTP 500).

## Next actions

1. Development: blockers 13, 23, 40 and 50–53 stop the most steps; 38 (role rights) keeps four role accounts from being made.
2. When a blocker is fixed, rerun its test cases (the "fix" line of each blocker names them); the workbook updates itself.
3. After 07:00 WIB: run the 23 cashier test cases on /id (`tests/modules/14-hospital-accounts/cashier.spec.ts`, then `zz-close-day.spec.ts` last).
