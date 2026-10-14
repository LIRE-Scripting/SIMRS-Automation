# Test inventory (Phase 1)

Generated 2026-10-14 from `reference/*.xlsx` (read-only, openpyxl). Nothing here was run against the site.
Open questions and gaps: [open-questions.md](open-questions.md). Per-test-case traceability: [traceability/](traceability/).

## 1. Source files

| File | Purpose | Sheets (data rows) |
|---|---|---|
| 00-prerequisites.xlsx | Users/roles, set-up and per-journey needs | Users (10 users U1–U10), Role accounts (27), Set-up and data (12), Journeys (1022) |
| 00-test-data.xlsx | Rules for test data, catalogue of named records, per-journey data | Overview (rules), Data catalogue (263), Journeys (1022) |
| 00-blockers-checklist-linked.xlsx | Known blockers, not named in the brief but in `reference/` | Checklist (16 blockers), Journey links (212) |

All 27 module workbooks share the same three sheets and identical headers (checked by script):
- **Summary**: app id, address, licence and write privilege, totals, screens, dialogs, write actions, test-data short names
- **Journeys** (25 columns): Journey ID, Module / Feature, User Role, Preconditions, Starting Point, Journey Steps, Expected Outcome, Priority, Automation Candidate, Verification Status, Journey Status, Required Test Data, Earlier ID, …
- **Steps** (24 columns): Test Case ID, Journey ID, Scenario Name, Test Type, Priority, Preconditions, Test Data, Step Number, Action, **Expected Result**, Observed Result, Final State, Automation Candidate, Verification Status, Execution Status, Cleanup Requirements, …

No merged cells in the module workbooks. In the 00-files only the description row (A2) of each sheet is merged.

| # | File | App | Address (Summary) | Licence; write right | Journeys | Test cases | Steps | Features | Test types (per TC) |
|---|---|---|---|---|---|---|---|---|---|
| 01 | [01-ambulatory-care.xlsx](traceability/01-ambulatory-care.md) | APP-001 Ambulatory Care | https://rs.showcase.atklik.xyz/id/registration | KLIKMED-FO; REGISTRATION_WRITE | 76 | 89 | 298 | 7 | Negative 34, Positive 32, Security 10, Regression 6, Other 5, Boundary 2 |
| 02 | [02-appointment.xlsx](traceability/02-appointment.md) | APP-002 Appointment | https://rs.showcase.atklik.xyz/id/appointment | KLIKMED-APPOINTMENT; REGISTRATION_WRITE | 24 | 33 | 101 | 5 | Negative 14, Positive 10, Regression 4, Security 3, Boundary 2 |
| 03 | [03-patient-care.xlsx](traceability/03-patient-care.md) | APP-003 Patient Care | https://rs.showcase.atklik.xyz/id/clinical | KLIKMED-EMR; CLINICAL_WRITE | 49 | 63 | 160 | 5 | Negative 31, Positive 19, Security 6, Regression 4, Other 2, Boundary 1 |
| 04 | [04-inpatient.xlsx](traceability/04-inpatient.md) | APP-004 Inpatient | https://rs.showcase.atklik.xyz/id/adt | KLIKMED-IP; ADT_WRITE | 68 | 90 | 241 | 7 | Negative 43, Positive 30, Security 6, Regression 6, Other 4, Boundary 1 |
| 05 | [05-pharmacy.xlsx](traceability/05-pharmacy.md) | APP-005 Pharmacy | https://rs.showcase.atklik.xyz/id/pharmacy | KLIKMED-PHARMACY; PHARMACY_WRITE | 58 | 78 | 258 | 11 | Positive 30, Negative 25, Regression 10, Security 7, Boundary 6 |
| 06 | [06-transfusion-medicine.xlsx](traceability/06-transfusion-medicine.md) | APP-006 Transfusion Medicine | https://rs.showcase.atklik.xyz/id/bloodbank | KLIKMED-BLOODBANK; BLOODBANK_WRITE | 74 | 81 | 281 | 6 | Positive 34, Negative 29, Security 6, Boundary 5, Regression 5, Other 2 |
| 07 | [07-inventory.xlsx](traceability/07-inventory.md) | APP-007 Inventory | https://rs.showcase.atklik.xyz/id/inventory | KLIKMED-INVENTORY; INVENTORY_WRITE | 48 | 67 | 170 | 9 | Negative 23, Positive 22, Regression 8, Security 7, Boundary 6, Other 1 |
| 08 | [08-operation-theater.xlsx](traceability/08-operation-theater.md) | APP-008 Operation Theater | https://rs.showcase.atklik.xyz/id/ot | KLIKMED-IP; OT_WRITE | 35 | 53 | 123 | 8 | Negative 18, Positive 17, Regression 7, Security 6, Other 3, Boundary 2 |
| 09 | [09-procurement.xlsx](traceability/09-procurement.md) | APP-009 Procurement | https://rs.showcase.atklik.xyz/id/procurement | KLIKMED-PROC; PROC_WRITE | 46 | 65 | 164 | 7 | Negative 30, Positive 19, Security 8, Regression 6, Boundary 1, Other 1 |
| 10 | [10-hr.xlsx](traceability/10-hr.md) | APP-010 HR | https://rs.showcase.atklik.xyz/id/hr | KLIKMED-ERP; HR_WRITE | 48 | 68 | 211 | 8 | Negative 27, Positive 21, Security 9, Regression 7, Other 3, Boundary 1 |
| 11 | [11-laboratory.xlsx](traceability/11-laboratory.md) | APP-011 Laboratory | https://rs.showcase.atklik.xyz/id/laboratory | KLIKMED-LAB; LABORATORY_WRITE | 40 | 54 | 139 | 6 | Negative 22, Positive 19, Security 6, Regression 5, Boundary 2 |
| 12 | [12-ris.xlsx](traceability/12-ris.md) | APP-012 RIS | https://rs.showcase.atklik.xyz/id/radiology | KLIKMED-RADIOLOGY; RADIOLOGY_WRITE | 29 | 35 | 90 | 4 | Negative 13, Positive 8, Security 7, Regression 3, Other 2, Boundary 1, Integration 1 |
| 13 | [13-dietary.xlsx](traceability/13-dietary.md) | APP-013 Dietary | https://rs.showcase.atklik.xyz/id/diet | KLIKMED-EMR; DIET_WRITE | 42 | 62 | 200 | 8 | Negative 27, Positive 15, Security 8, Regression 7, Other 3, Integration 2 |
| 14 | [14-hospital-accounts.xlsx](traceability/14-hospital-accounts.md) | APP-014 Hospital Accounts | https://rs.showcase.atklik.xyz/id/billing | KLIKMED-BILLING-CORE; BILLING_WRITE | 63 | 85 | 260 | 6 | Negative 39, Positive 26, Security 9, Regression 5, Boundary 4, Other 1, Integration 1 |
| 15 | [15-emergency.xlsx](traceability/15-emergency.md) | APP-015 Emergency | https://rs.showcase.atklik.xyz/id/emergency | KLIKMED-IP; EMERGENCY_WRITE | 41 | 69 | 222 | 8 | Negative 32, Positive 18, Security 9, Regression 7, Integration 2, Other 1 |
| 16 | [16-mrd.xlsx](traceability/16-mrd.md) | APP-016 MRD | https://rs.showcase.atklik.xyz/id/mrd | KLIKMED-MRD; MRD_WRITE | 36 | 49 | 162 | 6 | Negative 21, Positive 11, Security 8, Regression 5, Other 2, Integration 2 |
| 17 | [17-payroll.xlsx](traceability/17-payroll.md) | APP-017 Payroll | https://rs.showcase.atklik.xyz/id/payroll | KLIKMED-ERP; PAYROLL_WRITE | 39 | 69 | 197 | 9 | Negative 34, Positive 13, Security 8, Regression 8, Other 3, Integration 2, Boundary 1 |
| 18 | [18-settings.xlsx](traceability/18-settings.md) | APP-018 Settings | https://rs.showcase.atklik.xyz/id/settings | none; MDM_WRITE, IDENTITY_*_WRITE, WORKFLOW_WRITE | 47 | 92 | 274 | 31 | Regression 30, Negative 29, Positive 20, Security 9, Integration 2, Boundary 1, Other 1 |
| 19 | [19-finance.xlsx](traceability/19-finance.md) | APP-019 Finance | https://rs.showcase.atklik.xyz/id/finance | KLIKMED-ERP; FINANCE_WRITE, FINANCE_APPROVE | 59 | 128 | 390 | 42 | Regression 41, Negative 38, Positive 33, Security 12, Integration 3, Other 1 |
| 20 | [20-budget.xlsx](traceability/20-budget.md) | APP-020 Budget | https://rs.showcase.atklik.xyz/id/budget | KLIKMED-BUDGET; BUDGET_WRITE, BUDGET_APPROVE | 22 | 64 | 231 | 17 | Negative 26, Regression 16, Positive 12, Integration 6, Security 4 |
| 21 | [21-cssd.xlsx](traceability/21-cssd.md) | APP-021 CSSD | https://rs.showcase.atklik.xyz/id/cssd | KLIKMED-CSSD; CSSD_WRITE, CSSD_APPROVE | 16 | 57 | 175 | 21 | Negative 20, Regression 20, Positive 11, Security 4, Integration 2 |
| 22 | [22-services.xlsx](traceability/22-services.md) | APP-022 Services | https://rs.showcase.atklik.xyz/id/services | KLIKMED-IP; SERVICES_WRITE | 12 | 36 | 111 | 9 | Negative 16, Regression 8, Positive 5, Security 4, Integration 3 |
| 23 | [23-sourcing.xlsx](traceability/23-sourcing.md) | APP-023 Sourcing | https://rs.showcase.atklik.xyz/id/sourcing | KLIKMED-IP; SOURCING_WRITE | 11 | 34 | 111 | 7 | Negative 17, Regression 6, Integration 5, Security 4, Positive 2 |
| 24 | [24-housekeeping.xlsx](traceability/24-housekeeping.md) | APP-024 Housekeeping | https://rs.showcase.atklik.xyz/id/housekeeping | KLIKMED-IP; HOUSEKEEPING_WRITE | 8 | 22 | 75 | 6 | Negative 8, Regression 5, Security 4, Positive 3, Integration 2 |
| 25 | [25-linen.xlsx](traceability/25-linen.md) | APP-025 Linen | https://rs.showcase.atklik.xyz/id/linen | KLIKMED-IP; LINEN_WRITE | 7 | 21 | 70 | 5 | Negative 9, Integration 4, Security 4, Regression 4 |
| 26 | [26-maintenance.xlsx](traceability/26-maintenance.md) | APP-026 Maintenance | https://rs.showcase.atklik.xyz/id/maintenance | KLIKMED-IP; MAINTENANCE_WRITE | 8 | 20 | 89 | 5 | Negative 7, Security 4, Regression 4, Integration 3, Positive 2 |
| 27 | [27-fixed-assets.xlsx](traceability/27-fixed-assets.md) | APP-027 Fixed assets | https://rs.showcase.atklik.xyz/id/fixed-assets | KLIKMED-IP; FIXED_ASSET_WRITE | 8 | 20 | 82 | 5 | Negative 7, Integration 4, Security 4, Regression 4, Positive 1 |
| | **Total** | | | | **1014** | **1604** | **4885** | | |

## 2. Prerequisites map (00-prerequisites.xlsx)

### Users (sheet Users)

| Key | User | Branch | Rights | Used for | Journeys | Status on site | Prepared |
|---|---|---|---|---|---|---|---|
| U1 | Administrator with roles at one branch | Podomoro only | All rights (role admin) | Runs the main path of every journey without the "All branches" failure; prepares set-up and test data. | 958 | Exists: rs.admin2 | Done |
| U2 | Administrator with roles at all branches | All branches | All rights (role admin) | Journeys whose precondition is "All branches", and the eight journeys kept as failed with "All branches". | 46 | Exists: rs.admin | Done |
| U3 | User without write rights ("Staff") | Podomoro only | Read only; no *_WRITE or *_APPROVE right | Negative journeys: a user without the right of the application cannot save. One account serves all applications. | 80 | To create | Open |
| U4 | Second user of the same role | Podomoro only | Same rights as the first user (a second administrator is enough to run the flow) | Two sessions on one record, a second person who continues or checks the work. | 53 | To create | Open |
| U5 | Approvers and heads | Podomoro only | FINANCE_APPROVE, BUDGET_APPROVE, CSSD_APPROVE; approvers of the procurement chain (Approver 2, Approver 3, Director); head roles | Approval steps, and that the maker cannot approve their own document. | 85 | To create | Open |
| U6 | User at a second branch only | Kemayoran only (or Daan Mogot) | Same rights as U1 or the working role | Checks that one branch does not see or change the data of another. | 34 | To create | Open |
| U7 | User linked to an employee | Podomoro only | HR or Payroll right; linked with "Link me" on My profile | HR Punch (own employee number), the employee's payslip. | 9 | To prepare: link an account | Open |
| U8 | One account per working role | Podomoro only | The write right of each application (sheet Role accounts) | Proves that each role can do its own work and nothing else. Until these exist, a run with administrators shows that the flow works, not that rights are enforced. | 1022 | To create or adjust: rs.<role> accounts exist, check their Branch (default is all branches) | Open |
| U9 | Account with the licensing right | Any | LICENSING_WRITE | The screens Tenants and Entitlements of Settings. | 1 | To create, if these screens are in scope | Open |
| U10 | Second tenant, tenant without a licence, platform superadmin | Other tenant | Platform rights | Access journeys: no licence, data of another tenant. Not on this site today. | 68 | Deferred: needs a decision and a second tenant | Open |

No passwords are given in the workbooks. See open question Q2.

### Working role per application (sheet Role accounts, U8)

| Application | Working role | Write right | Journeys (as stated) | Account | Prepared |
|---|---|---|---|---|---|
| 01 Ambulatory Care | Clerk | REGISTRATION_WRITE | 76 | — | Open |
| 02 Appointment | Clerk | REGISTRATION_WRITE | 24 | — | Open |
| 03 Patient Care | Doctor | CLINICAL_WRITE | 49 | — | Open |
| 04 Inpatient | Nurse | ADT_WRITE | 68 | — | Open |
| 05 Pharmacy | Pharmacist | PHARMACY_WRITE | 58 | — | Open |
| 06 Transfusion Medicine | Tech | BLOODBANK_WRITE | 75 | — | Open |
| 07 Inventory | Warehouse | INVENTORY_WRITE | 49 | — | Open |
| 08 Operation Theater | Theatre nurse | OT_WRITE | 35 | — | Open |
| 09 Procurement | Officer | PROC_WRITE | 47 | — | Open |
| 10 HR | HR admin | HR_WRITE | 49 | — | Open |
| 11 Laboratory | Analyst | LABORATORY_WRITE | 40 | — | Open |
| 12 RIS | Radiographer | RADIOLOGY_WRITE | 29 | — | Open |
| 13 Dietary | Dietitian | DIET_WRITE | 42 | — | Open |
| 14 Hospital Accounts | Cashier | BILLING_WRITE | 64 | — | Open |
| 15 Emergency | Nurse | EMERGENCY_WRITE | 41 | — | Open |
| 16 MRD | Records officer | MRD_WRITE | 36 | — | Open |
| 17 Payroll | Payroll officer | PAYROLL_WRITE | 40 | — | Open |
| 18 Settings | Hospital administrator | MDM_WRITE, IDENTITY_*_WRITE, WORKFLOW_WRITE | 47 | — | Open |
| 19 Finance | Accountant | FINANCE_WRITE, FINANCE_APPROVE | 59 | — | Open |
| 20 Budget | Budget officer | BUDGET_WRITE, BUDGET_APPROVE | 22 | — | Open |
| 21 CSSD | CSSD officer | CSSD_WRITE, CSSD_APPROVE | 16 | — | Open |
| 22 Services | Services officer | SERVICES_WRITE | 13 | — | Open |
| 23 Sourcing | Sourcing officer | SOURCING_WRITE | 12 | — | Open |
| 24 Housekeeping | Housekeeping supervisor | HOUSEKEEPING_WRITE | 8 | — | Open |
| 25 Linen | Linen supervisor | LINEN_WRITE | 7 | — | Open |
| 26 Maintenance | Maintenance officer | MAINTENANCE_WRITE | 8 | — | Open |
| 27 Fixed assets | Asset administrator | FIXED_ASSET_WRITE | 8 | — | Open |

### Set-up and data (sheet Set-up and data)

| No | Prerequisite | Applications | Journeys | What to prepare | Who | Status |
|---|---|---|---|---|---|---|
| 1 | Go-ahead to create data on the site | All |  | A written go-ahead: which applications, branch Podomoro, test data with the prefix "X ", and whether Finance vouchers, stock movements, budget holds and pay data may be created. | Requester | Open |
| 2 | Patients for testing | 01 to 05, 11 to 16 |  | Confirm that the patient data is made-up, or create test patients with the prefix "X " (needs the go-ahead). | Requester | Open |
| 3 | Branch for testing | All |  | Podomoro, with users whose roles are given at Podomoro only (tested with rs.admin2 on 2026-10-13). | Requester | Done |
| 4 | Diagnosis code version | 03 Patient Care | JRN-APP003-042, JRN-APP003-047 | Import and activate a diagnosis code version (API or seed; no screen does it). | Site administrator | Open |
| 5 | Item below its minimum stock | 09 Procurement | JRN-APP009-043 | One item of a Podomoro store below its minimum stock. | Tester (go-ahead) | Open |
| 6 | User linked to an employee | 10 HR, 17 Payroll | JRN-APP010-044 | "Link me" on My profile for the test user (U7). | Tester (go-ahead) | Open |
| 7 | Emergency registration configuration | 15 Emergency | JRN-APP015-025, JRN-APP015-026 | A registration configuration for type 7 (emergency) at Podomoro. | Site administrator | Open |
| 8 | Finance configuration of the branch | 19 Finance, and every application that books a voucher | JRN-APP019-045, JRN-APP019-055 | The finance configuration of Podomoro: control accounts (the screen offers "Open configuration"); a test financial year. | Site administrator | Open |
| 9 | Budget posting rule and approvers | 20 Budget | JRN-APP020-010 to 012 | A Budget posting rule for Podomoro; an approver (U5) in each approval chain of Settings, Process definitions. | Site administrator | Open |
| 10 | CSSD start-of-day and kit set-up | 21 CSSD | JRN-APP021-003, JRN-APP021-006 | A passed Bowie Dick test for the autoclave; KIT and KITS in Inventory. | Tester (go-ahead) | Open |
| 11 | Records made in another application | 12, 14 to 21, 23, 25 to 27 | 34 journeys (sheet Journeys, column Needs a record from) | Run the feeding journeys first, in Podomoro, and note the ids: Settings, then HR, Inventory, Procurement and Finance, then the others. | Tester (go-ahead) | Open |
| 12 | Defects that stop journeys | 06, 18, 21 and others |  | See 00-blockers-checklist-linked.xlsx. | Development | Open |

### Users and branch needed per module (sheet Journeys, columns "Users needed", "Branch", "Needs a record from")

| Module | Journeys | Users needed (journeys) | Branch | Needs a record from |
|---|---|---|---|---|
| 01 Ambulatory Care | 76 | None (not signed in) 1, U1 73, U10 3, U2 2, U3 3, U4 6, U5 1, U6 3 | Podomoro 71, All branches 2, Two branches 3 | — |
| 02 Appointment | 24 | U1 23, U10 1, U2 1, U3 1, U4 1 | Podomoro 23, All branches 1 | — |
| 03 Patient Care | 49 | None (not signed in) 1, U1 46, U10 3, U2 2, U3 3, U4 3, U5 1, U6 1 | Podomoro 46, All branches 2, Two branches 1 | — |
| 04 Inpatient | 68 | None (not signed in) 1, U1 65, U10 5, U2 2, U3 3, U4 6, U5 1, U6 1 | Podomoro 65, All branches 2, Two branches 1 | — |
| 05 Pharmacy | 58 | None (not signed in) 1, U1 55, U10 3, U2 2, U3 4, U4 1, U5 4, U6 2 | Podomoro 54, Two branches 2, All branches 2 | — |
| 06 Transfusion Medicine | 75 | None (not signed in) 1, U1 72, U10 3, U2 2, U3 3, U4 10, U5 1, U6 2 | Podomoro 71, All branches 2, Two branches 2 | — |
| 07 Inventory | 49 | None (not signed in) 1, U1 46, U10 3, U2 2, U3 3, U4 2, U5 1, U6 1 | Podomoro 46, All branches 2, Two branches 1 | — |
| 08 Operation Theater | 35 | None (not signed in) 1, U1 32, U10 3, U2 2, U3 3, U4 2, U5 1, U6 1 | Podomoro 32, All branches 2, Two branches 1 | — |
| 09 Procurement | 47 | None (not signed in) 1, U1 44, U10 5, U2 2, U3 3, U4 5, U5 10, U6 2 | Podomoro 44, All branches 2, Two branches 1 | — |
| 10 HR | 49 | None (not signed in) 1, U1 46, U10 3, U2 2, U3 3, U4 2, U5 3, U6 3, U7 7 | Podomoro 44, All branches 2, Two branches 3 | — |
| 11 Laboratory | 40 | None (not signed in) 1, U1 37, U10 3, U2 2, U3 3, U4 2, U5 1, U6 1 | Podomoro 37, All branches 2, Two branches 1 | — |
| 12 RIS | 29 | None (not signed in) 1, U1 26, U10 3, U2 2, U3 3, U4 2, U5 1, U6 1 | Podomoro 26, All branches 2, Two branches 1 | 03-patient-care (1) |
| 13 Dietary | 42 | None (not signed in) 1, U1 39, U10 3, U2 2, U3 4, U4 1, U5 1, U6 2 | Podomoro 38, All branches 2, Two branches 2 | — |
| 14 Hospital Accounts | 64 | None (not signed in) 1, U1 61, U10 4, U2 2, U3 4, U4 1, U5 12, U6 3 | Podomoro 60, All branches 2, Two branches 2 | 05-pharmacy (1) |
| 15 Emergency | 41 | None (not signed in) 1, U1 38, U10 3, U2 2, U3 4, U4 3, U5 2, U6 3 | Podomoro 36, All branches 2, Two branches 3 | 04-inpatient (1) |
| 16 MRD | 36 | None (not signed in) 1, U1 33, U10 3, U2 2, U3 4, U4 3, U5 2, U6 3 | Podomoro 31, All branches 2, Two branches 3 | 04-inpatient (1); 01-ambulatory-care (1) |
| 17 Payroll | 40 | None (not signed in) 1, U1 37, U10 3, U2 2, U3 4, U4 1, U5 2, U6 1, U7 1 | Podomoro 37, All branches 2, Two branches 1 | 19-finance (1); 10-hr (4) |
| 18 Settings | 47 | None (not signed in) 1, U1 43, U10 3, U2 3, U3 5, U5 5, U6 2, U9 1 | Podomoro 42, All branches 3, Two branches 2 | 09-procurement (1) |
| 19 Finance | 59 | None (not signed in) 1, U1 56, U10 3, U2 2, U3 4, U4 2, U5 16, U6 2, U7 1 | Podomoro 55, All branches 2, Two branches 2 | 17-payroll, 18-settings (1); 14-hospital-accounts (2); 10-hr (1); 05-pharmacy, 13-dietary, 17-payroll (1) |
| 20 Budget | 22 | U1 21, U10 1, U2 1, U3 2, U5 13 | Podomoro 21, All branches 1 | 19-finance (3); 18-settings (1); 10-hr (1); 10-hr, 18-settings (1); 09-procurement (1) |
| 21 CSSD | 16 | U1 15, U10 1, U2 1, U3 2, U5 7 | Podomoro 15, All branches 1 | 07-inventory (2) |
| 22 Services | 13 | U1 12, U10 1, U2 1, U3 2 | Podomoro 12, All branches 1 | — |
| 23 Sourcing | 12 | U1 11, U10 1, U2 1, U3 2 | Podomoro 11, All branches 1 | 09-procurement (2); 20-budget (1) |
| 24 Housekeeping | 8 | U1 7, U10 1, U2 1, U3 2 | Podomoro 7, All branches 1 | — |
| 25 Linen | 7 | U1 6, U10 1, U2 1, U3 2 | Podomoro 6, All branches 1 | 07-inventory (1) |
| 26 Maintenance | 8 | U1 7, U10 1, U2 1, U3 2 | Podomoro 7, All branches 1 | 07-inventory, 20-budget (1); 27-fixed-assets (1) |
| 27 Fixed assets | 8 | U1 7, U10 1, U2 1, U3 2 | Podomoro 7, All branches 1 | 19-finance (1); 07-inventory, 09-procurement (1); 09-procurement, 26-maintenance (1) |

## 3. Test data map (00-test-data.xlsx)

### Rules (sheet Overview)

- **Go-ahead first**: Creating any of this data is a save on the shared site and needs the requester's written go-ahead (00-prerequisites.xlsx, Set-up and data, row 1).
- **Nothing of the earlier data exists**: The test records of 2026-10-08 (names starting with "QA-") were removed when the site was seeded again. Every record in the catalogue must be created anew.
- **Branches**: The journeys call the branches BR-A and BR-B. Use BR-A = Podomoro and BR-B = Kemayoran (proposal; Podomoro is the branch tested with rs.admin2).
- **Names**: Keep the names the journeys use ("QA-..." in applications 01 to 19, "X ..." in 20 to 27) so that steps and data match; both mark the records as made-up.
- **Order of creation**: 1. Settings: departments, service centres, approval chains, tax codes. 2. HR: employees. 3. Inventory: stores, items, stock. 4. Finance: financial year, accounts, posting rules, branch configuration. 5. Ambulatory Care: patients. 6. Patient Care: clinical orders. 7. The other applications, which use these records (sheet Journeys, column Needs a record from).
- **Records made by journeys**: Many records are made by running an earlier journey (for example a voucher made in Finance is used by Budget). Where a journey names its own data it creates it in its first steps; only the records of the catalogue must exist beforehand.
- **Ids typed by hand**: The desk screens (Inventory, Pharmacy, HR, Payroll, Procurement, Services, Sourcing, Housekeeping, Linen, Maintenance, Fixed assets) take a record by its internal id typed into "Document". Note the id of each record when it is created.
- **Clean-up**: Most records cannot be deleted on the screens (sheet Journeys of each workbook, column Cleanup Requirements in Steps). Keep a list of what was created, with its id and the journey that made it.
- **Catalogue by kind**: Records

### Dataset → journeys (sheet Data catalogue, inverted from sheet Journeys column "Short names used")

| Row | Application | Short name | What it is | Kind | Branch | Journeys (catalogue / found) | Journey IDs | Status |
|---|---|---|---|---|---|---|---|---|
| 5 | 01 Ambulatory Care | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 6 | 01 Ambulatory Care | PT-1 | Patient "QA-AMB Pasien Satu", date of birth 1990-05-17, Outpatient, registered in BR-A | Patient | BR-A = Podomoro | 31 / 31 | 001-003, 001-004, 001-012, 001-016, 001-019, 001-020, 001-021, 001-023, 001-024, 001-027, 001-028, 001-030, 001-043, 001-044, 001-046, 001-047, 001-048, 001-049, 001-052, 001-055, 001-056, 001-057, 001-058, 001-059, 001-060, 001-061, 001-062, 001-071, 001-072, 001-073, 001-074 | To create |
| 7 | 01 Ambulatory Care | PT-2, PT-3 | Two more BR-A outpatients, "QA-AMB Pasien Dua" and "QA-AMB Pasien Tiga" | Patient | BR-A = Podomoro | 14 / 14 | 001-003, 001-013, 001-017, 001-019, 001-020, 001-041, 001-045, 001-046, 001-049, 001-056, 001-057, 001-058, 001-060, 001-068 | To create |
| 8 | 01 Ambulatory Care | PT-DUP-A, PT-DUP-B | Two BR-A patients both named "QA-AMB Pasien Ganda", date of birth 1985-03-02, with different MRNs. PT-DUP-B has one booked appointment | Patient | BR-A = Podomoro | 2 / 2 | 001-010, 001-042 | To create |
| 9 | 01 Ambulatory Care | PT-MOM | BR-A patient "QA-AMB Ibu Satu", date of birth 1995-08-09 | Patient | BR-A = Podomoro | 2 / 2 | 001-006, 001-035 | To create |
| 10 | 01 Ambulatory Care | PT-B | Patient "QA-AMB Pasien Cabang" registered in BR-B | Patient | BR-B = Kemayoran | 3 / 3 | 001-024, 001-035, 001-063 | To create |
| 11 | 01 Ambulatory Care | Typed MRN | MRN-2026-0A1B2C3D, not used by any patient | Patient |  | 2 / 2 | 001-002, 001-068 | To create |
| 12 | 01 Ambulatory Care | Person key | QA-EMP-0001 | Patient |  | 2 / 2 | 001-005, 001-034 | To create |
| 13 | 01 Ambulatory Care | DEP-1, DEP-2 | Departments "QA Poli Umum" and "QA Poli Gigi" in BR-A | Master data of the hospital | BR-A = Podomoro | 16 / 16 | 001-012, 001-013, 001-015, 001-019, 001-020, 001-021, 001-044, 001-048, 001-055, 001-056, 001-057, 001-058, 001-059, 001-060, 001-061, 001-068 | To create |
| 14 | 01 Ambulatory Care | DR-1, DR-2 | Users "QA Dokter Satu" and "QA Dokter Dua" | User |  | 0 / 0 | — | See Users |
| 15 | 01 Ambulatory Care | UNIT-1 | Service center "QA Ruang Tindakan" in BR-A | Master data of the hospital | BR-A = Podomoro | 5 / 5 | 001-011, 001-013, 001-018, 001-044, 001-049 | To create |
| 16 | 01 Ambulatory Care | Book settings | Types "QA Konsultasi" 30 minutes and "QA Kontrol" 15 minutes. Daily quota: DR-1 = 3, UNIT-1 = 2. Open hours: DR-1 Monday to Friday 08:00 to 12:00; UNIT-1 Monday 09:00 to 11:00. DR-2 has open hours on Monday and no quota | Master data of the hospital |  | 8 / 8 | 001-011, 001-012, 001-013, 001-044, 001-048, 001-051, 001-060, 001-061 | To create |
| 17 | 01 Ambulatory Care | D-day | A Monday in the future with no bookings for DR-1 or UNIT-1 | Master data of the hospital |  | 15 / 15 | 001-012, 001-013, 001-014, 001-015, 001-016, 001-017, 001-018, 001-044, 001-045, 001-046, 001-048, 001-049, 001-050, 001-052, 001-054 | To create |
| 18 | 01 Ambulatory Care | Clerk, Clerk 2 | Users in BR-A who may register, book and call | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 19 | 01 Ambulatory Care | Head clerk | Clerk with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 20 | 01 Ambulatory Care | Doctor | BR-A user who may open a consultation in Patient Care | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 21 | 01 Ambulatory Care | Staff | User of the tenant without the registration right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 22 | 01 Ambulatory Care | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 23 | 02 Appointment | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 24 | 02 Appointment | PT-1 | Patient "QA-AMB Pasien Satu", date of birth 1990-05-17, Outpatient, registered in BR-A | Patient | BR-A = Podomoro | 7 / 7 | 002-002, 002-006, 002-010, 002-011, 002-012, 002-013, 002-016 | To create |
| 25 | 02 Appointment | PT-2, PT-3 | Two more BR-A outpatients, "QA-AMB Pasien Dua" and "QA-AMB Pasien Tiga" | Patient | BR-A = Podomoro | 5 / 5 | 002-003, 002-007, 002-009, 002-010, 002-013 | To create |
| 26 | 02 Appointment | PT-DUP-A, PT-DUP-B | Two BR-A patients both named "QA-AMB Pasien Ganda", date of birth 1985-03-02, with different MRNs. PT-DUP-B has one booked appointment | Patient | BR-A = Podomoro | 0 / 0 | — | To create |
| 27 | 02 Appointment | PT-MOM | BR-A patient "QA-AMB Ibu Satu", date of birth 1995-08-09 | Patient | BR-A = Podomoro | 0 / 0 | — | To create |
| 28 | 02 Appointment | PT-B | Patient "QA-AMB Pasien Cabang" registered in BR-B | Patient | BR-B = Kemayoran | 0 / 0 | — | To create |
| 29 | 02 Appointment | Typed MRN | MRN-2026-0A1B2C3D, not used by any patient | Patient |  | 0 / 0 | — | To create |
| 30 | 02 Appointment | Person key | QA-EMP-0001 | Patient |  | 0 / 0 | — | To create |
| 31 | 02 Appointment | DEP-1, DEP-2 | Departments "QA Poli Umum" and "QA Poli Gigi" in BR-A | Master data of the hospital | BR-A = Podomoro | 4 / 4 | 002-002, 002-003, 002-005, 002-012 | To create |
| 32 | 02 Appointment | DR-1, DR-2 | Users "QA Dokter Satu" and "QA Dokter Dua" | User |  | 0 / 0 | — | See Users |
| 33 | 02 Appointment | UNIT-1 | Service center "QA Ruang Tindakan" in BR-A | Master data of the hospital | BR-A = Podomoro | 4 / 4 | 002-001, 002-003, 002-008, 002-013 | To create |
| 34 | 02 Appointment | Book settings | Types "QA Konsultasi" 30 minutes and "QA Kontrol" 15 minutes. Daily quota: DR-1 = 3, UNIT-1 = 2. Open hours: DR-1 Monday to Friday 08:00 to 12:00; UNIT-1 Monday 09:00 to 11:00. DR-2 has open hours on Monday and no quota | Master data of the hospital |  | 5 / 5 | 002-001, 002-002, 002-003, 002-012, 002-015 | To create |
| 35 | 02 Appointment | D-day | A Monday in the future with no bookings for DR-1 or UNIT-1 | Master data of the hospital |  | 14 / 14 | 002-002, 002-003, 002-004, 002-005, 002-006, 002-007, 002-008, 002-009, 002-010, 002-012, 002-013, 002-014, 002-016, 002-018 | To create |
| 36 | 02 Appointment | Clerk, Clerk 2 | Users in BR-A who may register, book and call | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 37 | 02 Appointment | Head clerk | Clerk with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 38 | 02 Appointment | Doctor | BR-A user who may open a consultation in Patient Care | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 39 | 02 Appointment | Staff | User of the tenant without the registration right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 40 | 02 Appointment | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 41 | 03 Patient Care | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 42 | 03 Patient Care | PT-1 | Registered patient "QA-PCR Pasien Satu" with a date of birth | Patient |  | 37 / 37 | 003-001, 003-002, 003-003, 003-004, 003-005, 003-006, 003-007, 003-008, 003-009, 003-010, 003-011, 003-012, 003-015, 003-016, 003-017, 003-018, 003-021, 003-022, 003-023, 003-024, 003-025, 003-026, 003-028, 003-029, 003-030, 003-032, 003-033, 003-034, 003-035, 003-036, 003-040, 003-041, 003-042, 003-043, 003-044, 003-045, 003-046 | To create |
| 43 | 03 Patient Care | PT-2, PT-3 | Two registered patients both named "QA-PCR Pasien Kembar", with different MRNs | Patient |  | 2 / 2 | 003-011, 003-027 | To create |
| 44 | 03 Patient Care | Standard order | Drug Paracetamol 500mg Tablet; Generic Paracetamol; Form Tablet; Strength 500; Strength unit mg; Route Oral; Age band Adult; Dose 1; Dose unit tablet; Dose type fixed; Frequency BID; Clock times "08:00, 20:00"; Days 5. Quantity 10 | Clinical order |  | 0 / 0 | — | To create |
| 45 | 03 Patient Care | Interaction pairs | Warning pair: Paracetamol 500mg Tablet with Omeprazole 20mg Kapsul. Blocking pair: Ibuprofen 400mg Tablet with Amlodipine 5mg Tablet. The names must be typed exactly | Clinical order |  | 0 / 0 | — | To create |
| 46 | 03 Patient Care | Restricted order | Drug Meropenem 1g Injection with Restriction level "High", Restriction type "Antibiotic", Restriction item "Meropenem" | Clinical order |  | 0 / 0 | — | To create |
| 47 | 03 Patient Care | Doctor | User in BR-A who may write orders and notes | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 48 | 03 Patient Care | Doctor 2 | A second doctor in BR-A | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 49 | 03 Patient Care | Head doctor | Doctor with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 50 | 03 Patient Care | Pharmacist | User in BR-A who works the Pharmacy order queue | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 51 | 03 Patient Care | Lab analyst | User in BR-A who works the Laboratory worklist | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 52 | 03 Patient Care | Staff | User of the tenant with no clinical rights, for example HR Admin | User |  | 0 / 0 | — | See Users |
| 53 | 04 Inpatient | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 54 | 04 Inpatient | BED-1, BED-2, BED-3 | Active, vacant beds QA-101, QA-102, QA-103 in BR-A, description "QA Kelas 1" | Bed | BR-A = Podomoro | 14 / 14 | 004-002, 004-003, 004-004, 004-005, 004-006, 004-009, 004-010, 004-024, 004-026, 004-028, 004-029, 004-030, 004-035, 004-036 | To create |
| 55 | 04 Inpatient | BED-X | Vacant bed QA-199 in BR-A with the Active tick off | Bed | BR-A = Podomoro | 2 / 2 | 004-027, 004-034 | To create |
| 56 | 04 Inpatient | BED-B | Bed QA-B01 in BR-B | Bed | BR-B = Kemayoran | 2 / 2 | 004-018, 004-051 | To create |
| 57 | 04 Inpatient | PT-1, PT-2, PT-3 | Registered BR-A patients "QA-INP Pasien Satu", "QA-INP Pasien Dua", "QA-INP Pasien Tiga" | Patient | BR-A = Podomoro | 30 / 30 | 004-003, 004-004, 004-006, 004-009, 004-010, 004-011, 004-012, 004-014, 004-017, 004-022, 004-024, 004-029, 004-032, 004-035, 004-036, 004-037, 004-038, 004-039, 004-040, 004-041, 004-042, 004-043, 004-047, 004-050, 004-059, 004-060, 004-061, 004-062, 004-063, 004-064 | To create |
| 58 | 04 Inpatient | PT-K1, PT-K2 | Two registered BR-A patients both named "QA-INP Pasien Kembar", with different MRNs | Patient | BR-A = Podomoro | 1 / 1 | 004-023 | To create |
| 59 | 04 Inpatient | ST-IP | Store "QA Depo Rawat Inap", allowed for inpatient | Item, store or stock |  | 3 / 3 | 004-015, 004-016, 004-044 | To create |
| 60 | 04 Inpatient | ST-OP | Store allowed for outpatient only | Item, store or stock |  | 1 / 1 | 004-044 | To create |
| 61 | 04 Inpatient | OR-1, OR-2 | Pending inpatient drug orders placed in Patient Care with Visit "Inpatient": Paracetamol 500mg Tablet, quantity 10, for PT-1 and for PT-2 | Clinical order |  | 5 / 5 | 004-015, 004-017, 004-022, 004-044, 004-045 | To create |
| 62 | 04 Inpatient | Discharge chain | The approval chain with process key discharge is active (seed: "Proses Pulang Pasien Rawat Inap", 7 steps) | Master data of the hospital |  | 0 / 0 | — | To create |
| 63 | 04 Inpatient | Nurse, Nurse 2 | Users in BR-A who hold the inpatient right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 64 | 04 Inpatient | Head nurse | Nurse with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 65 | 04 Inpatient | Doctor | BR-A user who places orders in Patient Care | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 66 | 04 Inpatient | Pharmacist | BR-A user who dispenses and posts returns in Pharmacy | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 67 | 04 Inpatient | Staff | User of the tenant without the inpatient right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 68 | 04 Inpatient | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 69 | 05 Pharmacy | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 70 | 05 Pharmacy | ST-OP | Active store in BR-A, visit type Outpatient | Item, store or stock | BR-A = Podomoro | 14 / 14 | 005-001, 005-002, 005-007, 005-009, 005-010, 005-012, 005-015, 005-020, 005-027, 005-028, 005-029, 005-030, 005-032, 005-034 | To create |
| 71 | 05 Pharmacy | ST-IP | Active store in BR-A, visit type Inpatient | Item, store or stock | BR-A = Podomoro | 2 / 2 | 005-005, 005-034 | To create |
| 72 | 05 Pharmacy | QA-PARA | Item named exactly Paracetamol 500mg Tablet, last cost 1,000 | Item, store or stock |  | 26 / 26 | 005-001, 005-005, 005-007, 005-008, 005-009, 005-010, 005-011, 005-012, 005-013, 005-014, 005-015, 005-016, 005-017, 005-020, 005-021, 005-026, 005-027, 005-028, 005-030, 005-032, 005-034, 005-035, 005-039, 005-040, 005-042, 005-044 | To create |
| 73 | 05 Pharmacy | QA-OMEP | Item named exactly Omeprazole 20mg Kapsul, last cost 2,000 | Item, store or stock |  | 2 / 2 | 005-010, 005-012 | To create |
| 74 | 05 Pharmacy | QA-IBU | Item named exactly Ibuprofen 400mg Tablet, last cost 1,500 | Item, store or stock |  | 5 / 5 | 005-009, 005-010, 005-029, 005-031, 005-040 | To create |
| 75 | 05 Pharmacy | QA-AMLO | Item named exactly Amlodipine 5mg Tablet, last cost 1,200 | Item, store or stock |  | 2 / 2 | 005-029, 005-031 | To create |
| 76 | 05 Pharmacy | QA-KIT | Kit item made of 2 × QA-PARA and 1 × QA-OMEP | Item, store or stock |  | 1 / 1 | 005-010 | To create |
| 77 | 05 Pharmacy | QA-NOCOST | Item in stock with no last cost and no sales price | Item, store or stock |  | 1 / 1 | 005-035 | To create |
| 78 | 05 Pharmacy | QA-EXP | Item whose only batch in ST-OP expired yesterday, quantity 20 | Item, store or stock |  | 1 / 1 | 005-033 | To create |
| 79 | 05 Pharmacy | QA-FRZ | Item with two batches in ST-OP: one expiring in exactly 30 days, one in 31 days, 5 each | Item, store or stock |  | 1 / 1 | 005-033 | To create |
| 80 | 05 Pharmacy | Batches of QA-PARA in ST-OP | BT-1 received 10 days ago, quantity 10, expiry in 400 days. BT-2 received 5 days ago, quantity 10, expiry in 60 days | Item, store or stock |  | 0 / 0 | — | To create |
| 81 | 05 Pharmacy | Rules for BR-A | Freeze days 30 (Inventory, Stores). Outpatient price: site margin 25%, tax 11%, "Block a price below cost" on. "Maximum line discount (%)" 10 (Fast Cashier). One-step approval chain for billing discounts. Return rule unset | Master data of the hospital | BR-A = Podomoro | 0 / 0 | — | To create |
| 82 | 05 Pharmacy | PT-1 | Registered patient "QA-PHA Pasien Satu", no admission | Patient |  | 24 / 24 | 005-002, 005-007, 005-009, 005-010, 005-011, 005-012, 005-013, 005-014, 005-015, 005-016, 005-017, 005-020, 005-021, 005-029, 005-031, 005-032, 005-033, 005-034, 005-035, 005-039, 005-042, 005-044, 005-054, 005-056 | To create |
| 83 | 05 Pharmacy | PT-2, PT-3 | Two registered patients both named "QA-PHA Pasien Kembar". PT-3 has an open admission in BR-A | Patient | BR-A = Podomoro | 5 / 5 | 005-005, 005-018, 005-027, 005-028, 005-042 | To create |
| 84 | 05 Pharmacy | PT-4 | Registered patient "QA-PHA Pasien Alergi" with a recorded allergy to Paracetamol | Patient |  | 1 / 1 | 005-030 | To create |
| 85 | 05 Pharmacy | OR-OP | Outpatient drug order for PT-1: QA-PARA, quantity 10, written in Patient Care | Clinical order |  | 7 / 7 | 005-001, 005-002, 005-004, 005-025, 005-032, 005-041, 005-045 | To create |
| 86 | 05 Pharmacy | OR-IP | Inpatient drug order for PT-3: QA-PARA, quantity 6 | Clinical order |  | 2 / 2 | 005-005, 005-018 | To create |
| 87 | 05 Pharmacy | OR-RX | Drug order for a restricted drug, not yet authorised | Clinical order |  | 1 / 1 | 005-003 | To create |
| 88 | 05 Pharmacy | Pharmacist | User in BR-A who may dispense and return | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 89 | 05 Pharmacy | Cashier | User in BR-A who may work the Fast Cashier and is the approver for billing discounts | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 90 | 05 Pharmacy | Cashier 2 | Cashier in BR-A who is not an approver | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 91 | 05 Pharmacy | Nurse | Inpatient nurse in BR-A | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 92 | 05 Pharmacy | Staff | User of the tenant with no pharmacy or cashier rights, for example HR Admin | User |  | 0 / 0 | — | See Users |
| 93 | 05 Pharmacy | Head pharmacist | User with the "All branches" grant who may dispense | User |  | 0 / 0 | — | See Users |
| 94 | 05 Pharmacy | Reference amounts | QA-PARA × 10 in BR-A: unit 1,250.00, charges 12,500.00, tax 1,375.00, total 13,875.00. With a 10% discount: discount 1,250.00, tax 1,237.50, total 12,487.50. With 15%: discount 1,875.00, tax 1,168.75, total 11,793.75. | Reference value (nothing to create) | BR-A = Podomoro | 0 / 0 | — | Not needed |
| 95 | 06 Transfusion Medicine | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 96 | 06 Transfusion Medicine | Age limits | BR-A: Minimum 17, Maximum 60 | Setting of the application | BR-A = Podomoro | 3 / 3 | 006-001, 006-003, 006-034 | To create |
| 97 | 06 Transfusion Medicine | Vital limits | BR-A, for Male and for Female: age 17 to 60, systolic 100 to 160, diastolic 60 to 100, pulse 50 to 100, temperature 36 to 37.5, weight 45 to 150, haemoglobin 12.5 to 17 | Setting of the application | BR-A = Podomoro | 4 / 4 | 006-001, 006-006, 006-007, 006-038 | To create |
| 98 | 06 Transfusion Medicine | Bag settings | BR-A: Blood centre code QA1; "Consume the bag from inventory" not ticked; series Voluntary / Whole blood with Prefix QAWB- and 5 digits; Replacement / Whole blood QARP-; Voluntary / Platelet pheresis QAPL- | Setting of the application | BR-A = Podomoro | 3 / 3 | 006-002, 006-010, 006-011 | To create |
| 99 | 06 Transfusion Medicine | Serology tests | BR-A: HIV, HBsAg, HCV, Syphilis | Setting of the application | BR-A = Podomoro | 2 / 2 | 006-012, 006-047 | To create |
| 100 | 06 Transfusion Medicine | Group chart | BR-A: columns anti-A, anti-B, anti-AB, anti-D and A, B, O cells; chart rows for kind CellSerum that give O Positive and A Positive | Setting of the application | BR-A = Podomoro | 0 / 0 | — | To create |
| 101 | 06 Transfusion Medicine | Components | PRC "Packed red cells", 35 storage days, cross-match required, return limit 0.5 hours; FFP "Fresh frozen plasma", 365 days, no cross-match, return limit 0.5 hours. Both have a service mapping | Employee data |  | 3 / 3 | 006-015, 006-019, 006-048 | To create |
| 102 | 06 Transfusion Medicine | Compatibility | BR-A: patient O Positive with PRC from donor O Positive; patient O Positive with FFP from donor O Positive | Patient | BR-A = Podomoro | 3 / 3 | 006-019, 006-022, 006-054 | To create |
| 103 | 06 Transfusion Medicine | DN-1, DN-2 | Donors "QA-TRF Donor Satu" (male, born 1990-04-12) and "QA-TRF Donor Dua" (female, born 1992-09-03) | Other record |  | 22 / 22 | 006-003, 006-004, 006-005, 006-006, 006-007, 006-008, 006-009, 006-010, 006-012, 006-013, 006-028, 006-035, 006-036, 006-037, 006-038, 006-039, 006-040, 006-041, 006-042, 006-045, 006-064, 006-070 | To create |
| 104 | 06 Transfusion Medicine | PT-1 | Registered patient "QA-TRF Pasien Satu" | Patient |  | 12 / 12 | 006-004, 006-020, 006-021, 006-022, 006-025, 006-028, 006-052, 006-054, 006-055, 006-058, 006-059, 006-061 | To create |
| 105 | 06 Transfusion Medicine | DEP-1 | Department "QA Bangsal Dalam" in BR-A | Master data of the hospital | BR-A = Podomoro | 4 / 4 | 006-020, 006-021, 006-028, 006-052 | To create |
| 106 | 06 Transfusion Medicine | UNIT-1, UNIT-2 | Two PRC units of group O Positive, status "Available", screened, not expired | Master data of the hospital |  | 7 / 7 | 006-022, 006-024, 006-025, 006-026, 006-027, 006-051, 006-054 | To create |
| 107 | 06 Transfusion Medicine | UNIT-F | One FFP unit of group O Positive, "Available" | Master data of the hospital |  | 1 / 1 | 006-023 | To create |
| 108 | 06 Transfusion Medicine | Tech, Tech 2 | Blood bank users in BR-A who hold the blood bank right; two are needed for the second-person steps | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 109 | 06 Transfusion Medicine | Doctor | BR-A user with the doctor role and the blood bank right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 110 | 06 Transfusion Medicine | Nurse | BR-A user who holds the blood bank right and works the Ward tab | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 111 | 06 Transfusion Medicine | Head tech | Technician with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 112 | 06 Transfusion Medicine | Staff | User of the tenant without the blood bank right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 113 | 06 Transfusion Medicine | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 114 | 07 Inventory | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 115 | 07 Inventory | IT-1 | Item QA-INV-PARA, "QA Paracetamol 500 mg", active | Item, store or stock |  | 23 / 23 | 007-001, 007-002, 007-003, 007-004, 007-005, 007-006, 007-008, 007-009, 007-011, 007-013, 007-016, 007-017, 007-020, 007-021, 007-024, 007-025, 007-026, 007-029, 007-030, 007-032, 007-033, 007-034, 007-038 | To create |
| 116 | 07 Inventory | IT-A, IT-B | Items QA-INV-SET "QA Infus set" and QA-INV-NACL "QA NaCl 500 ml" | Other record |  | 1 / 1 | 007-007 | To create |
| 117 | 07 Inventory | IT-KIT | Item QA-INV-KIT "QA Paket Infus", a kit of 1 × IT-A and 2 × IT-B | Item, store or stock |  | 1 / 1 | 007-007 | To create |
| 118 | 07 Inventory | ST-1 | Active store "QA Gudang Farmasi" in BR-A, dispenses for Outpatient and Inpatient | Item, store or stock | BR-A = Podomoro | 12 / 12 | 007-004, 007-006, 007-008, 007-009, 007-010, 007-017, 007-022, 007-025, 007-026, 007-030, 007-032, 007-038 | To create |
| 119 | 07 Inventory | ST-OFF | An inactive store in BR-A | Item, store or stock | BR-A = Podomoro | 1 / 1 | 007-020 | To create |
| 120 | 07 Inventory | ST-B | A store in BR-B | Item, store or stock | BR-B = Kemayoran | 2 / 2 | 007-013, 007-034 | To create |
| 121 | 07 Inventory | Batch 1 | IT-1 in ST-1, batch QA-B001, expiry 180 days ahead, quantity 100, received first | Item, store or stock |  | 6 / 6 | 007-004, 007-005, 007-006, 007-008, 007-009, 007-023 | To create |
| 122 | 07 Inventory | Batch 2 | IT-1 in ST-1, batch QA-B002, expiry 20 days ahead, quantity 50, received second | Item, store or stock |  | 3 / 3 | 007-006, 007-009, 007-022 | To create |
| 123 | 07 Inventory | Freeze days | BR-A: 30 | Item, store or stock | BR-A = Podomoro | 4 / 4 | 007-008, 007-009, 007-030, 007-031 | To create |
| 124 | 07 Inventory | Request | Document number QA-SR-0001, department "QA Bangsal Dalam", Routine, remarks "[QA-INV-PARA] QA Paracetamol 500 mg x 20" | Master data of the hospital |  | 6 / 6 | 007-011, 007-012, 007-013, 007-026, 007-028, 007-032 | To create |
| 125 | 07 Inventory | Warehouse, Warehouse 2 | Users in BR-A who hold the inventory right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 126 | 07 Inventory | Head of warehouse | Warehouse user with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 127 | 07 Inventory | Pharmacist | BR-A user who dispenses in Pharmacy | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 128 | 07 Inventory | Staff | User of the tenant without the inventory right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 129 | 07 Inventory | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 130 | 08 Operation Theater | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 131 | 08 Operation Theater | Procedure | "QA Appendektomi laparoskopi" | Other record |  | 9 / 9 | 008-001, 008-002, 008-006, 008-016, 008-018, 008-023, 008-024, 008-025, 008-029 | To create |
| 132 | 08 Operation Theater | Amount | Blocked amount 5000000 | Reference value (nothing to create) |  | 1 / 1 | 008-002 | Not needed |
| 133 | 08 Operation Theater | RQ-NEW | A request in BR-A with "List prepared" "No" and blocked amount 5000000 | Reference value (nothing to create) | BR-A = Podomoro | 4 / 4 | 008-003, 008-012, 008-018, 008-024 | Not needed |
| 134 | 08 Operation Theater | RQ-PREP | A request in BR-A with "List prepared" "Yes" and blocked amount 5000000 | Reference value (nothing to create) | BR-A = Podomoro | 4 / 4 | 008-004, 008-011, 008-013, 008-018 | Not needed |
| 135 | 08 Operation Theater | RQ-B | A request in BR-B | Other record | BR-B = Kemayoran | 1 / 1 | 008-020 | To create |
| 136 | 08 Operation Theater | PT-1 | Registered patient "QA-OTH Pasien Satu", admitted in Inpatient, used where a patient is expected | Patient |  | 2 / 2 | 008-009, 008-011 | To create |
| 137 | 08 Operation Theater | Theatre nurse, Theatre nurse 2 | Users in BR-A who hold the operation theater right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 138 | 08 Operation Theater | Head theatre nurse | Theatre nurse with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 139 | 08 Operation Theater | Staff | User of the tenant without the operation theater right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 140 | 08 Operation Theater | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 141 | 09 Procurement | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 142 | 09 Procurement | Chain | The approval chain purchase_order "Persetujuan Purchase Order", active, with the four steps and roles of the seed data (see the table above) | Master data of the hospital |  | 3 / 3 | 009-001, 009-002, 009-003 | To create |
| 143 | 09 Procurement | Vendor | "QA PT Medika Uji" | Purchasing data |  | 8 / 8 | 009-001, 009-002, 009-008, 009-012, 009-014, 009-028, 009-030, 009-036 | To create |
| 144 | 09 Procurement | Department | "QA-DEPT-01" | Master data of the hospital |  | 1 / 1 | 009-001 | To create |
| 145 | 09 Procurement | Amounts | Advance amount 5000000, amount paid 1000000 | Reference value (nothing to create) |  | 0 / 0 | — | Not needed |
| 146 | 09 Procurement | PO-S1, PO-S2, PO-S3, PO-S4 | Purchase orders in BR-A, created through the screen, that wait at step 1, 2, 3 and 4 | Purchasing data | BR-A = Podomoro | 12 / 12 | 009-004, 009-005, 009-006, 009-015, 009-016, 009-017, 009-019, 009-021, 009-028, 009-029, 009-030, 009-036 | To create |
| 147 | 09 Procurement | PO-DONE | A purchase order in BR-A whose approval was completed through the screen | Purchasing data | BR-A = Podomoro | 2 / 2 | 009-015, 009-021 | To create |
| 148 | 09 Procurement | PO-B | A purchase order in BR-B | Purchasing data | BR-B = Kemayoran | 1 / 1 | 009-032 | To create |
| 149 | 09 Procurement | Officer | Procurement officer in BR-A: holds the procurement right and the Admin role | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 150 | 09 Procurement | Approver 2 | User in BR-A who holds the procurement right and the Pharmacist role | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 151 | 09 Procurement | Approver 3 | User in BR-A who holds the procurement right and the Cashier role | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 152 | 09 Procurement | Director | A second user in BR-A who holds the procurement right and the Admin role | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 153 | 09 Procurement | Head officer | Officer with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 154 | 09 Procurement | Staff | User of the tenant without the procurement right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 155 | 09 Procurement | Superadmin | User who can open Audit and Workflow | User |  | 0 / 0 | — | See Users |
| 156 | 10 HR | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 157 | 10 HR | DEP-A, SC-A, ST-A | In BR-A: department "QA Poli Umum", service center "QA Layanan Rawat Jalan", store "QA Gudang Farmasi" | Master data of the hospital | BR-A = Podomoro | 5 / 5 | 010-001, 010-005, 010-027, 010-029, 010-038 | To create |
| 158 | 10 HR | EMP-1 | Employee "QA-EMP-001", name "QA-HRM Karyawan Satu", BR-A, DEP-A, status Active, category "QA Perawat", gender "Perempuan", designation "QA Perawat Pelaksana", date of birth 1990-01-15 | Employee data | BR-A = Podomoro | 20 / 20 | 010-001, 010-002, 010-003, 010-004, 010-005, 010-008, 010-016, 010-017, 010-020, 010-022, 010-024, 010-025, 010-026, 010-028, 010-029, 010-030, 010-031, 010-033, 010-034, 010-039 | To create |
| 159 | 10 HR | EMP-2 | Employee "QA-EMP-002", name "QA-HRM Karyawan Dua", BR-A, DEP-A, status Active | Employee data | BR-A = Podomoro | 10 / 10 | 010-004, 010-010, 010-011, 010-017, 010-018, 010-019, 010-020, 010-026, 010-028, 010-039 | To create |
| 160 | 10 HR | EMP-B | Employee "QA-EMP-B01" in BR-B | Employee data | BR-B = Kemayoran | 3 / 3 | 010-013, 010-026, 010-035 | To create |
| 161 | 10 HR | LT-ANNUAL | Leave type "QA-Annual" (type "ANNUAL"), number of leaves 12, active, in BR-A, as in the seed data | Employee data | BR-A = Podomoro | 8 / 8 | 010-008, 010-011, 010-016, 010-018, 010-019, 010-020, 010-022, 010-032 | To create |
| 162 | 10 HR | LT-OFF | Leave type "QA-Lama" in BR-A, not active | Employee data | BR-A = Podomoro | 1 / 1 | 010-032 | To create |
| 163 | 10 HR | LV-PEND | A pending leave application of EMP-1 for 2027-03-01 to 2027-03-03, Full day, type LT-ANNUAL | Other record |  | 3 / 3 | 010-009, 010-016, 010-033 | To create |
| 164 | 10 HR | LV-APPR, LV-REJ | An approved and a rejected leave application of EMP-2 | Other record |  | 1 / 1 | 010-021 | To create |
| 165 | 10 HR | USR-1 | A user account of the tenant that is linked to no employee; its login name comes with the test-data set-up | User |  | 0 / 0 | — | See Users |
| 166 | 10 HR | HR admin, HR admin 2 | Users in BR-A who hold the HR right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 167 | 10 HR | Head HR admin | HR admin with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 168 | 10 HR | Staff | User of the tenant without the HR right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 169 | 10 HR | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 170 | 11 Laboratory | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 171 | 11 Laboratory | Test | Result type "QA Hemoglobin", remark "QA puasa 8 jam" | Setting of the application |  | 3 / 3 | 011-001, 011-030, 011-036 | To create |
| 172 | 11 Laboratory | Result | Lab result "13.5 g/dL", Result range "12.0 - 16.0 g/dL", note "QA diperiksa ulang" | Other record |  | 10 / 10 | 011-004, 011-007, 011-008, 011-013, 011-014, 011-017, 011-019, 011-029, 011-031, 011-037 | To create |
| 173 | 11 Laboratory | OR-1 | A lab order of type "QA Hemoglobin" in BR-A with status "Ordered" | Setting of the application | BR-A = Podomoro | 2 / 2 | 011-002, 011-014 | To create |
| 174 | 11 Laboratory | OR-ACC | A lab order in BR-A with status "Accepted" | Other record | BR-A = Podomoro | 3 / 3 | 011-004, 011-017, 011-019 | To create |
| 175 | 11 Laboratory | OR-RES | A lab order in BR-A with status "Resulted" | Other record | BR-A = Podomoro | 3 / 3 | 011-005, 011-018, 011-019 | To create |
| 176 | 11 Laboratory | OR-B | A lab order in BR-B | Other record | BR-B = Kemayoran | 1 / 1 | 011-026 | To create |
| 177 | 11 Laboratory | PT-1 | Registered patient "QA-LAB Pasien Satu", used when an order is made from a consultation | Patient |  | 4 / 4 | 011-007, 011-011, 011-012, 011-021 | To create |
| 178 | 11 Laboratory | Analyst, Analyst 2 | Users in BR-A who hold the laboratory right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 179 | 11 Laboratory | Head analyst | Analyst with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 180 | 11 Laboratory | Doctor | BR-A user who may create lab orders from a consultation | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 181 | 11 Laboratory | Staff | User of the tenant without the laboratory right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 182 | 11 Laboratory | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 183 | 12 RIS | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 184 | 12 RIS | Full order | Order ref QA-RAD-0001; Accession no QA-ACC-0001; Study description "QA Thorax PA"; Study date today 10:00; Reported by "dr. QA Radiolog"; Reported date today 11:00; Image link https://pacs.example.test/study/QA-ACC-0001; Report link https://pacs.example.test/report/QA-ACC-0001 | Setting of the application |  | 3 / 3 | 012-001, 012-014, 012-019 | To create |
| 185 | 12 RIS | Short order | Study description "QA USG Abdomen" and nothing else | Other record |  | 2 / 2 | 012-002, 012-009 | To create |
| 186 | 12 RIS | OR-B | An order registered in BR-B | Other record | BR-B = Kemayoran | 1 / 1 | 012-020 | To create |
| 187 | 12 RIS | PT-1 | Registered patient "QA-RIS Pasien Satu", used where a patient is expected | Patient |  | 3 / 3 | 012-007, 012-008, 012-017 | To create |
| 188 | 12 RIS | Radiographer, Radiographer 2 | Users in BR-A who hold the radiology right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 189 | 12 RIS | Head radiographer | Radiographer with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 190 | 12 RIS | Doctor | BR-A user who works in Patient Care | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 191 | 12 RIS | Staff | User of the tenant without the radiology right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 192 | 12 RIS | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 193 | 13 Dietary | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 194 | 13 Dietary | Bed | Bed number "QA-RI-01", bed category "QA Kelas 1" | Bed |  | 4 / 4 | 013-001, 013-012, 013-013, 013-016 | To create |
| 195 | 13 Dietary | RQ-1 | Diet request "QA-DIET-001" in BR-A with one line for the Bed | Bed | BR-A = Podomoro | 4 / 4 | 013-002, 013-013, 013-014, 013-015 | To create |
| 196 | 13 Dietary | RQ-B | Diet request "QA-DIET-B01" in BR-B | Other record | BR-B = Kemayoran | 2 / 2 | 013-015, 013-029 | To create |
| 197 | 13 Dietary | PT-1 | Patient "QA-DIE Pasien Satu", admitted in Inpatient on the Bed, used where a patient is expected | Patient |  | 4 / 4 | 013-012, 013-013, 013-017, 013-025 | To create |
| 198 | 13 Dietary | TPN-A | Patient name "QA-DIE Pasien Satu"; height 170 with unit cm; weight 70 with unit kg; energy 2000; protein 1; fluid 30; lipid 20; sodium 40; potassium 20; calcium 5; magnesium 4; phosphate 10; MVI-12 10; trace metals 1; heparin and insulin empty | Master data of the hospital |  | 11 / 11 | 013-004, 013-005, 013-007, 013-009, 013-017, 013-019, 013-020, 013-022, 013-024, 013-027, 013-033 | To create |
| 199 | 13 Dietary | TPL-1 | Template "QA-TPN-STD" in BR-A, saved from the inputs of TPN-A | Setting of the application | BR-A = Podomoro | 1 / 1 | 013-026 | To create |
| 200 | 13 Dietary | Dietitian, Dietitian 2 | Users in BR-A who hold the diet right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 201 | 13 Dietary | Head dietitian | Dietitian with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 202 | 13 Dietary | Staff | User of the tenant without the diet right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 203 | 13 Dietary | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 204 | 14 Hospital Accounts | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 205 | 14 Hospital Accounts | Counter settings BR-A | Tax rate 11%, Discount cap 50,000, Rounding 1, Refund limit 100,000, Cash limit 0 (off), Identity threshold 0 (off) | Setting of the application | BR-A = Podomoro | 2 / 2 | 014-001, 014-003 | To create |
| 206 | 14 Hospital Accounts | Approval chain | Billing discount chain with one step; the approver is the Head cashier | Master data of the hospital |  | 1 / 1 | 014-007 | To create |
| 207 | 14 Hospital Accounts | Cashier | User in BR-A who may work the Fast Cashier | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 208 | 14 Hospital Accounts | Cashier 2 | A second cashier in BR-A, not an approver | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 209 | 14 Hospital Accounts | Head cashier | Cashier in BR-A who is the approver for discounts and refunds | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 210 | 14 Hospital Accounts | Insurance officer | Cashier in BR-A who may also use the Insurance / BPJS panel | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 211 | 14 Hospital Accounts | Head office cashier | Cashier with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 212 | 14 Hospital Accounts | Staff | User of the tenant with no cashier rights, for example HR Admin | User |  | 0 / 0 | — | See Users |
| 213 | 14 Hospital Accounts | PT-BPJS | Registered patient "QA-HAC Pasien BPJS" with an approved pre-authorisation valid today (approved amount 2,000,000) and a referral carrying SEP number QA-SEP-0001. Both must be prepared as data; the screens cannot create them | Patient |  | 3 / 3 | 014-017, 014-041, 014-043 | To create |
| 214 | 14 Hospital Accounts | PT-NONE | Registered patient "QA-HAC Pasien Umum" with no pre-authorisation and no claim | Patient |  | 1 / 1 | 014-041 | To create |
| 215 | 14 Hospital Accounts | CBG codes | M-1-10-I (Demam Berdarah Dengue Ringan, tariff 2,800,000) and E-2-10-I (tariff 3,200,000), from the fixed list in the code | Other record |  | 0 / 0 | — | To create |
| 216 | 14 Hospital Accounts | RX invoice | A pharmacy invoice RX-… from the Pharmacy journeys: charges 12,500, tax 1,375, total 13,875 | Reference value (nothing to create) |  | 4 / 4 | 014-002, 014-033, 014-034, 014-035 | Not needed |
| 217 | 14 Hospital Accounts | Reference amounts | In BR-A: a charge of 150,000 gives tax 16,500 and patient net 166,500. With a discount of 20,000: tax 14,300, net 144,300. With a discount of 60,000: tax 9,900, net 99,900. Amounts on screen are shown as rupiah without decimals, for example "Rp 166.500". | Reference value (nothing to create) | BR-A = Podomoro | 0 / 0 | — | Not needed |
| 218 | 15 Emergency | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 219 | 15 Emergency | PT-1, PT-2, PT-3 | Registered BR-A patients "QA-EMG Pasien Satu", "QA-EMG Pasien Dua", "QA-EMG Pasien Tiga", each with its internal patient ID supplied by the test-data set-up | Patient | BR-A = Podomoro | 10 / 10 | 015-001, 015-002, 015-003, 015-008, 015-011, 015-012, 015-013, 015-017, 015-018, 015-023 | To create |
| 220 | 15 Emergency | PT-B | A patient registered in BR-B, with internal ID | Patient | BR-B = Kemayoran | 2 / 2 | 015-005, 015-010 | To create |
| 221 | 15 Emergency | BED-1, BED-2 | Vacant beds QA-IGD-01 and QA-IGD-02 in BR-A, each with its internal bed ID supplied by the test-data set-up | Bed | BR-A = Podomoro | 6 / 6 | 015-003, 015-008, 015-011, 015-012, 015-018, 015-023 | To create |
| 222 | 15 Emergency | BED-OCC | A BR-A bed on which an inpatient is admitted, with internal ID | Bed | BR-A = Podomoro | 1 / 1 | 015-011 | To create |
| 223 | 15 Emergency | BED-B | A bed in BR-B, with internal ID | Bed | BR-B = Kemayoran | 2 / 2 | 015-011, 015-020 | To create |
| 224 | 15 Emergency | Nurse, Nurse 2 | Users in BR-A who hold the emergency right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 225 | 15 Emergency | Head nurse | Nurse with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 226 | 15 Emergency | Staff | User of the tenant without the emergency right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 227 | 15 Emergency | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 228 | 16 MRD | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 229 | 16 MRD | PT-1, PT-2 | Patients registered in BR-A: "QA-MRD Pasien Satu" and "QA-MRD Pasien Dua", each with an MRN | Patient | BR-A = Podomoro | 14 / 14 | 016-002, 016-004, 016-009, 016-010, 016-011, 016-013, 016-015, 016-016, 016-019, 016-020, 016-021, 016-022, 016-027, 016-028 | To create |
| 230 | 16 MRD | PT-B | A patient registered in BR-B | Patient | BR-B = Kemayoran | 3 / 3 | 016-006, 016-017, 016-024 | To create |
| 231 | 16 MRD | REQ-1 | File request "QA-REQ-001" in BR-A with the purpose "QA Kontrol poli penyakit dalam" | Other record | BR-A = Podomoro | 2 / 2 | 016-010, 016-015 | To create |
| 232 | 16 MRD | REC-OUT | Record "QA-MR-001" in BR-A, issued for PT-1, status "Issued" | Other record | BR-A = Podomoro | 6 / 6 | 016-003, 016-011, 016-012, 016-015, 016-018, 016-022 | To create |
| 233 | 16 MRD | REC-BACK | Record "QA-MR-002" in BR-A, issued for PT-2 and returned, status "Returned" | Other record | BR-A = Podomoro | 1 / 1 | 016-012 | To create |
| 234 | 16 MRD | REC-B | A record issued in BR-B with the number "QA-MR-B01" | Other record | BR-B = Kemayoran | 2 / 2 | 016-015, 016-024 | To create |
| 235 | 16 MRD | Records officer, Records officer 2 | Users in BR-A who hold the medical records right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 236 | 16 MRD | Head records officer | Records officer with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 237 | 16 MRD | Staff | User of the tenant without the medical records right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 238 | 16 MRD | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 239 | 17 Payroll | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 240 | 17 Payroll | Components | The 12 salary components of the seed data, all active, as listed in the table above. If the test tenant has other components, the figures in this file have to be worked out again | Employee data |  | 7 / 7 | 017-001, 017-002, 017-003, 017-010, 017-011, 017-012, 017-020 | To create |
| 241 | 17 Payroll | EMP-1, EMP-2 | Employees "QA-EMP-001" "QA-HRM Karyawan Satu" and "QA-EMP-002" "QA-HRM Karyawan Dua" in BR-A, created in HR (HRM-JRN-001) | Employee data | BR-A = Podomoro | 16 / 16 | 017-001, 017-002, 017-003, 017-006, 017-008, 017-009, 017-010, 017-011, 017-012, 017-013, 017-014, 017-015, 017-017, 017-018, 017-021, 017-027 | To create |
| 242 | 17 Payroll | EMP-OFF | Employee "QA-EMP-NONAKTIF" in BR-A with the employment status "Inactive" | Employee data | BR-A = Podomoro | 1 / 1 | 017-016 | To create |
| 243 | 17 Payroll | EMP-B | Employee "QA-EMP-B01" in BR-B | Employee data | BR-B = Kemayoran | 2 / 2 | 017-005, 017-023 | To create |
| 244 | 17 Payroll | Payroll officer, Payroll officer 2 | Users in BR-A who hold the payroll right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 245 | 17 Payroll | Head payroll officer | Payroll officer with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 246 | 17 Payroll | Staff | User of the tenant without the payroll right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 247 | 17 Payroll | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 248 | 18 Settings | BR-A, BR-B | Two branches (sites) of the test tenant | Setting of the application | BR-A = Podomoro, BR-B = Kemayoran | 12 / 12 | 018-001, 018-004, 018-006, 018-009, 018-010, 018-013, 018-015, 018-016, 018-018, 018-020, 018-026, 018-029 | To create |
| 249 | 18 Settings | SITE-NEW | Site with the code "QA-SITE-01" and the name "QA Klinik Uji" | Other record |  | 6 / 6 | 018-002, 018-003, 018-014, 018-015, 018-017, 018-018 | To create |
| 250 | 18 Settings | DEP-1 | Department "QA-DEP-01" "QA Poli Uji" in BR-A | Master data of the hospital | BR-A = Podomoro | 8 / 8 | 018-004, 018-005, 018-006, 018-013, 018-015, 018-019, 018-020, 018-030 | To create |
| 251 | 18 Settings | SC-1 | Service center "QA-SC-01" "QA Loket Uji" in BR-A, under DEP-1 | Master data of the hospital | BR-A = Podomoro | 3 / 3 | 018-006, 018-013, 018-020 | To create |
| 252 | 18 Settings | Country, City, Unit | Country "QA" "QA Negara Uji" with phone code "+00" and nationality "QA Warga Uji"; city "QA-KOTA" "QA Kota Uji"; unit "QA-BOX" "QA Kotak" with conversion factor 10, derived | Master data of the hospital |  | 4 / 4 | 018-007, 018-014, 018-015, 018-023 | To create |
| 253 | 18 Settings | TAX-1 | Tax code "QA-PPN11" "QA PPN 11 persen", kind PPN, rate 11 | Master data of the hospital |  | 4 / 4 | 018-008, 018-014, 018-015, 018-025 | To create |
| 254 | 18 Settings | Admin | User in BR-A who holds the master data right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 255 | 18 Settings | Head admin | Admin with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 256 | 18 Settings | Staff | User of the tenant without the master data right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 257 | 18 Settings | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |
| 258 | 19 Finance | BR-A, BR-B | Two branches of the test tenant | Branch | BR-A = Podomoro, BR-B = Kemayoran | 0 / 0 | — | Exists |
| 259 | 19 Finance | FY-OPEN | A financial year that is open and contains today's date | Finance data |  | 3 / 3 | 019-020, 019-021, 019-028 | To create |
| 260 | 19 Finance | FY-NEXT | A financial year with the code "QA-FY-NEXT", created to follow the latest year | Finance data |  | 3 / 3 | 019-002, 019-003, 019-021 | To create |
| 261 | 19 Finance | ACC-GRP | Group account "QA-1000" "QA Aset Lancar", kind Asset | Finance data |  | 3 / 3 | 019-004, 019-022, 019-026 | To create |
| 262 | 19 Finance | ACC-BANK, ACC-EXP | Leaf accounts "QA-1010" "QA Bank Uji" (kind Bank) and "QA-5010" "QA Beban Uji" (kind Expense), active, for all branches | Finance data |  | 10 / 10 | 019-004, 019-005, 019-007, 019-015, 019-022, 019-023, 019-024, 019-026, 019-028, 019-034 | To create |
| 263 | 19 Finance | VCH-1 | A voucher created by hand in BR-A: type Journal, value 1500000, currency IDR, party "QA PT Uji", narration "QA Jurnal uji" | Finance data | BR-A = Podomoro | 2 / 2 | 019-008, 019-016 | To create |
| 264 | 19 Finance | Accountant, Accountant 2 | Users in BR-A who hold the finance right | User | BR-A = Podomoro | 0 / 0 | — | See Users |
| 265 | 19 Finance | Head accountant | Accountant with the "All branches" grant | User |  | 0 / 0 | — | See Users |
| 266 | 19 Finance | Staff | User of the tenant without the finance right, for example the Cashier role of the seed data | User |  | 0 / 0 | — | See Users |
| 267 | 19 Finance | Superadmin | User who can open Audit | User |  | 0 / 0 | — | See Users |

Journey IDs above are shortened: `001-003` = `JRN-APP001-003`.

Per-journey data status (sheet Journeys): To prepare 942, None needed 80.

## 4. Modules and features (only those present in the Excel)

- **01 Ambulatory Care** (APP-001): Registered Patients (/registration/patients) (168 steps); Appointments (/registration/appointments) (75 steps); Arrival (/registration/department-queue) (21 steps); Ambulatory Care (/registration) (18 steps); Priority rule (/registration/priority-rules) (6 steps); Patient flags (/registration/patient-flags) (6 steps); Access control (4 steps)
- **02 Appointment** (APP-002): Appointments (/appointment/schedule) (72 steps); Referral type (/appointment/referral-types) (12 steps); Cross-consult type (/appointment/cross-consult-types) (12 steps); Access control (4 steps); Appointment (/appointment) (1 steps)
- **03 Patient Care** (APP-003): Consultation (/clinical/consultation) (135 steps); Follow-up (/clinical/follow-ups) (9 steps); Patient Care (/clinical) (6 steps); Terminology (/clinical/terminology) (6 steps); Access control (4 steps)
- **04 Inpatient** (APP-004): Admissions (/adt/admissions) (149 steps); Bed management (/adt/beds) (32 steps); Ward care (/adt/ward) (23 steps); Admission requests (/adt/requests) (17 steps); Discharges (/adt/discharges) (10 steps); Inpatient (/adt) (6 steps); Access control (4 steps)
- **05 Pharmacy** (APP-005): Dispense (/pharmacy/dispense) (117 steps); Order (/pharmacy/orders) (60 steps); Issue Lines (/pharmacy/issue-lines) (29 steps); Pharmacy (/pharmacy) (11 steps); Alerts and vaccines (/pharmacy/alerts) (8 steps); Drug catalogue (/pharmacy/catalogue) (7 steps); Dose record (/pharmacy/doses) (7 steps); Cost estimate (/pharmacy/estimate) (6 steps); Issues for one patient (/pharmacy/issues) (5 steps); Price and TPN (/pharmacy/stays) (4 steps); Access control (4 steps)
- **06 Transfusion Medicine** (APP-006): Stock (/bloodbank/stock) (123 steps); /bloodbank/donors (106 steps); Blood request (/bloodbank/requisitions) (26 steps); Transfusion Medicine (/bloodbank) (15 steps); Quality control (/bloodbank/qc) (7 steps); Access control (4 steps)
- **07 Inventory** (APP-007): Item Master (/inventory/items) (71 steps); Stores (/inventory/stores) (25 steps); Store documents (/inventory/documents) (25 steps); Stock Requests (/inventory/stock-requests) (17 steps); Inventory (/inventory) (10 steps); Branch and stores (/inventory/setup) (9 steps); Stock desk (/inventory/stock-desk) (7 steps); Access control (4 steps); Stock book (/inventory/ledger) (2 steps)
- **08 Operation Theater** (APP-008): OT requests (/ot/requests) (88 steps); Operation Theater (/ot) (8 steps); Dossiers (/ot/dossiers) (6 steps); Pain (/ot/pain) (6 steps); Billing policy (/ot/policies) (5 steps); Calendar (/ot/calendar) (4 steps); Access control (4 steps); Surgical case (/ot/case) (2 steps)
- **09 Procurement** (APP-009): Purchase orders (/procurement/purchase-orders) (105 steps); Receipts and returns (/procurement/receipts) (17 steps); Procurement (/procurement) (14 steps); Suppliers and requests (/procurement/suppliers) (11 steps); Purchase orders (/procurement/requests) (10 steps); Access control (4 steps); Reorder (/procurement/reorder) (3 steps)
- **10 HR** (APP-010): Employees (/hr/employees) (94 steps); Leave applications (/hr/leave-applications) (55 steps); Year balance (/hr/desk/leave) (22 steps); Punch (/hr/desk/attendance) (11 steps); Fee plan (/hr/desk/fee) (10 steps); My profile (/hr/desk) (9 steps); HR (/hr) (6 steps); Access control (4 steps)
- **11 Laboratory** (APP-011): Lab order worklist (/laboratory/orders) (86 steps); Sample workflow (/laboratory/work) (25 steps); Laboratory (/laboratory) (14 steps); Specimens and tests (/laboratory/catalogue) (8 steps); Access control (4 steps); BMHP (/laboratory/bmhp) (2 steps)
- **12 RIS** (APP-012): Orders (/radiology/orders) (61 steps); Schedule and report (/radiology/studies) (13 steps); Radiology (RIS) (/radiology) (12 steps); Access control (4 steps)
- **13 Dietary** (APP-013): Total parenteral nutrition (/diet/tpn) (64 steps); Diet requests (/diet/requests) (50 steps); Catalogue (/diet/catalogue) (28 steps); Kitchen (/diet/kitchen) (15 steps); Diet orders (/diet/orders) (14 steps); Service and bill (/diet/service) (13 steps); Dietary (/diet) (12 steps); Access control (4 steps)
- **14 Hospital Accounts** (APP-014): 1. Charge lookup (/billing/cashier) (164 steps); Patient ledger (/billing/ledger) (39 steps); Tariff group (/billing/tariffs) (23 steps); Patient plan (/billing/plans) (16 steps); Hospital Accounts (/billing) (14 steps); Access control (4 steps)
- **15 Emergency** (APP-015): Emergency Patients (/emergency/patients) (87 steps); Visits (/emergency/visits) (68 steps); Accident/Emergency Registration (/emergency/registration) (18 steps); Emergency Layout (/emergency/layout) (15 steps); Triage Category (/emergency/triage-categories) (12 steps); Emergency (/emergency) (10 steps); Emergency Layout Design (/emergency/layout-design) (8 steps); Access control (4 steps)
- **16 MRD** (APP-016): Patient Records (/mrd/records) (69 steps); Patient File Requests (/mrd/requests) (54 steps); Discharged stays missing a diagnosis code (/mrd/coding) (19 steps); MRD (/mrd) (11 steps); Outpatient visits without a document (/mrd/outpatient) (5 steps); Access control (4 steps)
- **17 Payroll** (APP-017): Payroll (/payroll) (55 steps); Payroll batches (/payroll/batches) (37 steps); Re-run (/payroll/desk/run) (32 steps); Payroll record (/payroll/desk/pay) (18 steps); Finance year (/payroll/desk) (16 steps); Tax declaration (/payroll/desk/tax) (15 steps); Reimburse (/payroll/desk/reimburse) (12 steps); Payroll desk (/payroll/desk/slip) (8 steps); Access control (4 steps)
- **18 Settings** (APP-018): Departments (/mdm/departments) (39 steps); Sites (/mdm/sites) (30 steps); Users (/identity/users) (30 steps); Settings (/settings) (21 steps); Tax Codes (/mdm/tax-codes) (14 steps); /audit (11 steps); Tenant Branding (/identity/branding) (11 steps); Password Configuration (/identity/password) (11 steps); Service Centers (/mdm/service-centers) (10 steps); Roles (/identity/roles) (10 steps); User Rights (/identity/rights) (10 steps); Holidays (/mdm/holidays) (10 steps); Process Definitions (/workflow/process-definitions) (10 steps); User Site Mapping (/identity/site-maps) (9 steps); Notification config (/identity/notifications) (9 steps); Countries (/mdm/packs/countries) (6 steps); Theme overrides (/identity/theme-overrides) (6 steps); Audit retention (/identity/audit-retention) (6 steps); Units of Measure (/mdm/packs/units-of-measure) (5 steps); Cities (/mdm/packs/cities) (4 steps); Access control (2 steps); /entitlements (1 steps); Security / Settings (/identity) (1 steps); Configure dashboard (/identity/dashboard) (1 steps); Feature Branch Mapping (/identity/features) (1 steps); User Login Log (/identity/login-log) (1 steps); Second-level security (/identity/second-level) (1 steps); Settings (/mdm) (1 steps); Facility time (/mdm/facility-time) (1 steps); /tenants (1 steps); Workflow (/workflow) (1 steps)
- **19 Finance** (APP-019): Vouchers (/finance/vouchers) (58 steps); Journals (/finance/journals) (35 steps); Chart of accounts (/finance/accounts) (25 steps); Financial years (/finance/financial-years) (18 steps); Finance configuration (/finance/configuration) (14 steps); Patient collections (/finance/collections) (14 steps); Year end (/finance/year-end) (14 steps); Payments (/finance/payments) (13 steps); Bank receipt (/finance/documents/bank-receipt) (12 steps); Security receipts (/finance/security-receipts) (12 steps); Finance (/finance) (11 steps); Bill adjustment (/finance/bill-adjustments) (11 steps); Bank reconciliation (/finance/reconciliation) (11 steps); Imprest (/finance/imprest) (11 steps); Payment requests (/finance/payment-requests) (11 steps); Agreements (/finance/legal-agreements) (11 steps); Budget posting rules (/finance/posting-rules) (10 steps); Cost centres (/finance/cost-centres) (10 steps); Opening balance (/finance/documents/opening-balance) (10 steps); Rough sheets (/finance/rough-sheets) (10 steps); Tariff mapping (/finance/tariff-maps) (9 steps); Bank guarantees (/finance/bank-guarantees) (9 steps); Letters of credit (/finance/letters-of-credit) (9 steps); Currencies (/finance/currencies) (8 steps); Account maps (/finance/account-maps) (8 steps); ERP invoice staging (/finance/erp-invoice-staging) (7 steps); Access control (4 steps); Audit sheets (/finance/audit-sheets) (1 steps); Encashment requests (/finance/bank-guarantee-settlement-requests) (1 steps); Guarantee settlements (/finance/bank-guarantee-settlements) (1 steps); Cash receipt (/finance/documents/cash-receipt) (1 steps); Contra (/finance/documents/contra) (1 steps); Credit memo (/finance/documents/credit-memo) (1 steps); Debit memo (/finance/documents/debit-memo) (1 steps); Purchase (/finance/documents/purchase) (1 steps); Sales (/finance/documents/sales) (1 steps); Fair sheets (/finance/fair-sheets) (1 steps); Loans (/finance/loans) (1 steps); Security accounting (/finance/security-accounting) (1 steps); Security disposal (/finance/security-disposal) (1 steps); Disposal requests (/finance/security-disposal-requests) (1 steps); Trial balance (/finance/trial-balance) (1 steps)
- **20 Budget** (APP-020): Budget circulars (/budget/circulars) (26 steps); Budget allocation (/budget/allocations) (24 steps); Sanction proposals (/budget/sanctions) (24 steps); Fund release (/budget/fund-releases) (22 steps); Internal budgets (/budget/internal-budgets) (17 steps); Budget chart (/budget/chart) (13 steps); Budget utilisation (/budget/utilisations) (13 steps); Budget requests (/budget/requests) (12 steps); Budget transfer (/budget/transfers) (12 steps); Fund withdrawal (/budget/fund-withdrawals) (11 steps); Budget books (/budget/books) (10 steps); Budget heads (/budget/heads) (9 steps); Projects (/budget/projects) (9 steps); Budget (/budget) (9 steps); Utilisation types (/budget/util-types) (8 steps); Sanction checklist (/budget/sanction-checklists) (8 steps); Access control (4 steps)
- **21 CSSD** (APP-021): Sterile Request (/cssd/requests) (26 steps); New (/cssd/cycles/new) (19 steps); New (/cssd/requests/new) (18 steps); Sterile Issue (/cssd/issues) (16 steps); New (/cssd/receipts/new) (15 steps); Set (/cssd/sets) (12 steps); New (/cssd/sterile-receipts/new) (12 steps); Autoclave (/cssd/autoclaves) (11 steps); Indicator Type (/cssd/indicator-types) (11 steps); Bowie Dick (/cssd/bowie-tests) (11 steps); Pack Trace (/cssd/trace) (8 steps); CSSD (/cssd) (4 steps); Access control (4 steps); Cycle Type (/cssd/cycle-types) (1 steps); Sterilization Cycle (/cssd/cycles) (1 steps); /cssd/issues/new (1 steps); Packing Type (/cssd/packing-types) (1 steps); Unsterile Receipt (/cssd/receipts) (1 steps); Result Type (/cssd/result-types) (1 steps); Sterile Receipt (/cssd/sterile-receipts) (1 steps); Test Name (/cssd/test-names) (1 steps)
- **22 Services** (APP-022): Service request (/services/requests) (31 steps); Service purchase order (/services/orders) (15 steps); Service category (/services/categories) (14 steps); Service purchase request (/services/purchase-requests) (13 steps); Service receipt (/services/receipts) (12 steps); Vendor bill (/services/bills) (12 steps); Service item (/services/items) (9 steps); Access control (4 steps); Services (/services) (1 steps)
- **23 Sourcing** (APP-023): Tenders (/sourcing/tenders) (30 steps); Bids (/sourcing/bids) (22 steps); Agreements (/sourcing/agreements) (20 steps); Masters (/sourcing/masters) (17 steps); Deposits (/sourcing/money) (17 steps); Access control (4 steps); Sourcing (/sourcing) (1 steps)
- **24 Housekeeping** (APP-024): Locations (/housekeeping/locations) (23 steps); Contracts (/housekeeping/contracts) (20 steps); Bills (/housekeeping/bills) (15 steps); Daily logs (/housekeeping/logs) (12 steps); Access control (4 steps); Housekeeping (/housekeeping) (1 steps)
- **25 Linen** (APP-025): Work orders (/linen/orders) (27 steps); Circulation (/linen/moves) (26 steps); Stores and recipe (/linen/stores) (12 steps); Access control (4 steps); Linen (/linen) (1 steps)
- **26 Maintenance** (APP-026): Work (/maintenance/work) (36 steps); AMC (/maintenance/amc) (30 steps); Plans (/maintenance/plans) (18 steps); Access control (4 steps); Maintenance (/maintenance) (1 steps)
- **27 Fixed assets** (APP-027): Register (/fixed-assets/register) (45 steps); Movement (/fixed-assets/moves) (19 steps); Classification (/fixed-assets/masters) (13 steps); Access control (4 steps); Fixed assets (/fixed-assets) (1 steps)

## 5. Planned spec layout and disposition

- One spec per module feature: `tests/e2e/<NN-module>/<feature-route>.spec.ts` (route taken from the "Module / Feature" column). One `test()` per Test Case ID; Excel steps become `test.step()`s; assertions only from the Expected Result column.
- Tags: `@<NN-module>`, `@<test-type>` (from Test Type), `@<priority>` (from Priority), `@u1`… (from "Users needed"). `@smoke` / `@regression` mapping is open (Q7).
- Disposition is derived only from workbook fields, in this order:
  - `SKIP`: Journeys.Automation Candidate = No
  - `FIXME`: journey linked to a specific blocker (00-blockers Journey links; blockers 1, 14, 15, 16 apply to all or are handled separately; blocker 5 only for journeys run as U2, because the workbook names U1 at Podomoro as its workaround), an Expected Result containing "TBD", Automation Candidate = Needs Evaluation, or a needed user U3–U10 that is still Open
  - `AUTOMATE-CHAIN`: needs a record made by another application (00-prerequisites Journeys, "Needs a record from"): a serial chain
  - `AUTOMATE-RO`: every step's Final State says "No data was changed": can run without the go-ahead
  - `AUTOMATE-WRITE`: saves data on the shared site: gated on the written go-ahead (Set-up and data row 1 / blocker 15)

| Module | TCs | AUTOMATE-RO | AUTOMATE-WRITE | AUTOMATE-CHAIN | FIXME | SKIP |
|---|---|---|---|---|---|---|
| [01 Ambulatory Care](traceability/01-ambulatory-care.md) | 89 | 3 | 57 | 0 | 28 | 1 |
| [02 Appointment](traceability/02-appointment.md) | 33 | 2 | 27 | 0 | 4 | 0 |
| [03 Patient Care](traceability/03-patient-care.md) | 63 | 1 | 29 | 0 | 33 | 0 |
| [04 Inpatient](traceability/04-inpatient.md) | 90 | 2 | 57 | 0 | 30 | 1 |
| [05 Pharmacy](traceability/05-pharmacy.md) | 78 | 0 | 42 | 0 | 36 | 0 |
| [06 Transfusion Medicine](traceability/06-transfusion-medicine.md) | 81 | 1 | 31 | 0 | 48 | 1 |
| [07 Inventory](traceability/07-inventory.md) | 67 | 2 | 33 | 0 | 32 | 0 |
| [08 Operation Theater](traceability/08-operation-theater.md) | 53 | 1 | 29 | 0 | 23 | 0 |
| [09 Procurement](traceability/09-procurement.md) | 65 | 2 | 22 | 0 | 41 | 0 |
| [10 HR](traceability/10-hr.md) | 68 | 2 | 29 | 0 | 37 | 0 |
| [11 Laboratory](traceability/11-laboratory.md) | 54 | 1 | 26 | 0 | 26 | 1 |
| [12 RIS](traceability/12-ris.md) | 35 | 1 | 15 | 0 | 19 | 0 |
| [13 Dietary](traceability/13-dietary.md) | 62 | 3 | 26 | 0 | 33 | 0 |
| [14 Hospital Accounts](traceability/14-hospital-accounts.md) | 85 | 0 | 40 | 0 | 45 | 0 |
| [15 Emergency](traceability/15-emergency.md) | 69 | 1 | 25 | 0 | 43 | 0 |
| [16 MRD](traceability/16-mrd.md) | 49 | 2 | 19 | 0 | 28 | 0 |
| [17 Payroll](traceability/17-payroll.md) | 69 | 1 | 22 | 0 | 46 | 0 |
| [18 Settings](traceability/18-settings.md) | 92 | 2 | 47 | 0 | 43 | 0 |
| [19 Finance](traceability/19-finance.md) | 128 | 4 | 62 | 1 | 61 | 0 |
| [20 Budget](traceability/20-budget.md) | 64 | 0 | 22 | 6 | 36 | 0 |
| [21 CSSD](traceability/21-cssd.md) | 57 | 0 | 24 | 0 | 33 | 0 |
| [22 Services](traceability/22-services.md) | 36 | 0 | 12 | 0 | 24 | 0 |
| [23 Sourcing](traceability/23-sourcing.md) | 34 | 0 | 6 | 0 | 28 | 0 |
| [24 Housekeeping](traceability/24-housekeeping.md) | 22 | 0 | 6 | 0 | 16 | 0 |
| [25 Linen](traceability/25-linen.md) | 21 | 0 | 5 | 0 | 16 | 0 |
| [26 Maintenance](traceability/26-maintenance.md) | 20 | 0 | 4 | 0 | 16 | 0 |
| [27 Fixed assets](traceability/27-fixed-assets.md) | 20 | 0 | 4 | 1 | 15 | 0 |
| **Total** | **1604** | **31** | **721** | **8** | **840** | **4** |

## 6. Existing codebase (Phase 0)

- **Stack**: `@playwright/test` ^1.64, TypeScript ^7 (strict, `noEmit`), CommonJS package. **No ESLint/Prettier config**, no zod, no xlsx/exceljs package. No `.env`.
- **playwright.config.ts**: `testDir: tests`, `workers: 1`, `fullyParallel: false`, `retries: 0`, `timeout: 120s`, `expect 10s`, trace `retain-on-failure`, screenshot `only-on-failure`, `locale: en-US`, baseURL `https://rs.showcase.atklik.xyz/`. Projects: `setup` → `pharmacy`; `modules-setup` → `modules`, `ambulatory-care`, `flows`, `suites`. Every project selects its tests by folder (`testMatch`), so `tests/e2e/` would need a new project (a config change, to be agreed in Phase 2).
- **Auth**: `tests/auth/auth.setup.ts` (klikmed.superadmin → `.auth/state.json`) and `tests/modules/modules.setup.ts` (rs.admin → `.auth/modules-state.json`). `lib/config.ts` reads `BASE_URL`, `KLIKMED_USERNAME`, `KLIKMED_PASSWORD`, `MODULES_USERNAME` from env **but falls back to a hard-coded password literal** (see Q2).
- **Page objects** (`pages/`): LoginPage (EN/ID labels, language switch, redirect fallback for blocker 1), AppHeader, PharmacyHubPage, OrdersPage, DispensePage, IssueLinesPage, RegistrationPage, AmbulatoryPages (priority rules, patient flags, appointments, arrival; `/en/...` routes and English names), InventoryPages, RisDietPages, BudgetCssdFinancePages. Helpers: `lib/navigation.ts` (`gotoStable`), `lib/assertions.ts`, `lib/flow.ts`, `lib/auth.ts` (`ensureSignedIn`). Fixtures: `fixtures/pharmacy.ts`, `fixtures/suite.ts` (end-of-test screenshot, journey checklist attachment). No `getByTestId` / `data-testid` is used anywhere in the repo.
- **Existing tests** trace to workbooks that are **deleted in the working tree** (`pharmacy-test-journeys-QA.xlsx`, `module-journeys-QA.xlsx`, `module-test-cases-QA.xlsx`, `module-scan-QA.xlsx`): `tests/pharmacy/` (PHA-JRN-001..050 from `data/journeys.json`), `tests/suites/` and `tests/flows/` (per-module journeys from `data/module-journeys/*.json`), `tests/ambulatory-care/` (TC-REG-E2E-001..006). The new workbooks keep the old ids in the column **Earlier ID** (AMB-, PHA-, INP-, TRF-, … 718 journeys; 296 have none); all 50 PHA-JRN ids map to JRN-APP005-001..050 with the same journey name. See Q9.
- **Checks**: `tsc` cannot run in this checkout: `node_modules` lacks the platform package `@typescript/typescript-linux-x64` (`node_modules/.bin/tsc` also lacks the exec bit). No lint script exists.
