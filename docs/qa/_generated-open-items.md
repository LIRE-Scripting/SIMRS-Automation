# Generated open items (appendix to open-questions.md)

Produced by the Phase 1 script from the workbooks. Row numbers are Excel rows.

## A. Journeys in 00-prerequisites/00-test-data with no row in any module workbook (8)

| 00-prereq Journeys row | Journey ID | Name | Users | Preconditions |
|---|---|---|---|---|
| 354 | JRN-APP006-075 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 403 | JRN-APP007-049 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 485 | JRN-APP009-047 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 534 | JRN-APP010-049 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 709 | JRN-APP014-064 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 826 | JRN-APP017-040 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 983 | JRN-APP022-013 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |
| 995 | JRN-APP023-012 | Opening the lists as a user with roles at one branch, without choosing a branch | U1 | Signed in with an account whose roles are given at one branch only. The branch list of the header is not touched. |

## B. Steps whose Expected Result contains "TBD" (881)

| File | Steps row | TC | Step | Expected Result (truncated) |
|---|---|---|---|---|
| 01-ambulatory-care.xlsx | 265 | TC-APP001-069 | 2 | TBD: confirmation text. TBD: which API route this dialog calls was not resolved; the screen's write routes are in the column API / Backend Operations. |
| 01-ambulatory-care.xlsx | 268 | TC-APP001-071 | 1 | TBD: the write route was not resolved. |
| 01-ambulatory-care.xlsx | 270 | TC-APP001-072 | 2 | TBD: confirmation text. TBD: which API route this dialog calls was not resolved; the screen's write routes are in the column API / Backend Operations. |
| 01-ambulatory-care.xlsx | 273 | TC-APP001-074 | 1 | TBD: the write route was not resolved. |
| 01-ambulatory-care.xlsx | 277 | TC-APP001-075 | 4 | A later date than before. TBD: from which date the year is counted (to be read in the registration use case) |
| 01-ambulatory-care.xlsx | 285 | TC-APP001-078 | 3 | TBD: where the recorded document is shown (not found in the screen code read so far) |
| 01-ambulatory-care.xlsx | 289 | TC-APP001-080 | 3 | Toast "Visit closed"; the status reads "Closed"; TBD: whether any button is left on the row |
| 01-ambulatory-care.xlsx | 299 | TC-APP001-089 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 02-appointment.xlsx | 102 | TC-APP002-033 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 03-patient-care.xlsx | 130 | TC-APP003-045 | 1 | TBD: no requirement found. As coded the entry is saved: the server does not look the code up |
| 03-patient-care.xlsx | 133 | TC-APP003-046 | 3 | TBD: whether the order is stopped or warned; see the earlier journey on ordering a drug the patient is allergic to (PCR-JRN-026) |
| 03-patient-care.xlsx | 137 | TC-APP003-048 | 3 | A new order with the study text. TBD: which columns show it |
| 03-patient-care.xlsx | 139 | TC-APP003-050 | 1 | TBD: the code shows the text of the branch field as a toast and sends nothing when a branch is required and none is set (emr-order-tab.tsx, requireBranch); the |
| 03-patient-care.xlsx | 147 | TC-APP003-054 | 1 | TBD: the patient input carries no required marker; expected a refusal, by the screen or by toast "Follow-up could not be saved." |
| 03-patient-care.xlsx | 161 | TC-APP003-063 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 04-inpatient.xlsx | 195 | TC-APP004-058 | 3 | A row with the patient, the type, the estimate and a status, and the buttons "Confirm", "Reject" and "Cancel". TBD: the status text of a waiting request |
| 04-inpatient.xlsx | 232 | TC-APP004-081 | 4 | Toast "That bed is blocked"; the patient is not admitted to it. TBD: whether a blocked bed is offered in the bed list at all |
| 04-inpatient.xlsx | 242 | TC-APP004-090 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 05-pharmacy.xlsx | 218 | TC-APP005-052 | 1 | TBD: the text shown. The server refuses with "generic needs a name plus a strength, a route, and a form"; nothing is added |
| 05-pharmacy.xlsx | 219 | TC-APP005-053 | 1 | TBD: the text shown. The server refuses with "frequency needs a code and a positive value" |
| 05-pharmacy.xlsx | 224 | TC-APP005-054 | 4 | TBD: whether the new rule makes the wizard warn or stop; see the earlier journey on a warning the pharmacist must acknowledge (PHA-JRN-012) |
| 05-pharmacy.xlsx | 225 | TC-APP005-055 | 1 | TBD: the text shown. The server refuses with "alert needs a level, a type, and an item"; nothing is added |
| 05-pharmacy.xlsx | 226 | TC-APP005-056 | 1 | TBD: the text shown. The server refuses with "vaccine type needs a code and a name" |
| 05-pharmacy.xlsx | 227 | TC-APP005-057 | 1 | TBD: no requirement found. As coded the rule is saved: the server only refuses empty values |
| 05-pharmacy.xlsx | 230 | TC-APP005-058 | 3 | TBD: whether the total is quantity times amount or the amount (to be read in the repository code) |
| 05-pharmacy.xlsx | 231 | TC-APP005-059 | 1 | TBD: the text shown. The server refuses with "estimate needs a patient and at least one item" |
| 05-pharmacy.xlsx | 232 | TC-APP005-059 | 2 | TBD: the text shown. The server refuses with "each line needs an item, a quantity, and an amount"; nothing is added |
| 05-pharmacy.xlsx | 234 | TC-APP005-060 | 2 | The block lists item names with the issued quantity. TBD: whether the patient is matched by name, MRN or id, and how two patients with the same name are told ap |
| 05-pharmacy.xlsx | 236 | TC-APP005-061 | 1 | TBD: the text shown. The server refuses with "patient required" |
| 05-pharmacy.xlsx | 259 | TC-APP005-078 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 06-transfusion-medicine.xlsx | 267 | TC-APP006-070 | 3 | TBD: whether the old number is free again or kept as used |
| 06-transfusion-medicine.xlsx | 268 | TC-APP006-071 | 1 | TBD: the refusal text; the screen shows the server's message |
| 06-transfusion-medicine.xlsx | 270 | TC-APP006-072 | 2 | TBD: the confirmation text |
| 06-transfusion-medicine.xlsx | 281 | TC-APP006-080 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 06-transfusion-medicine.xlsx | 282 | TC-APP006-081 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 07-inventory.xlsx | 125 | TC-APP007-040 | 1 | TBD: the text shown. The server refuses with "code and name are required" |
| 07-inventory.xlsx | 126 | TC-APP007-040 | 2 | TBD: the text shown. The server refuses with "category cannot parent itself" |
| 07-inventory.xlsx | 127 | TC-APP007-041 | 1 | TBD: the text shown. The server refuses with "lane needs two different stores" |
| 07-inventory.xlsx | 130 | TC-APP007-042 | 3 | TBD: whether the opening stock shows here (the earlier journeys receive a batch on this dialog) |
| 07-inventory.xlsx | 131 | TC-APP007-043 | 1 | TBD: the text shown. The server refuses with "batch and expiry are required" |
| 07-inventory.xlsx | 133 | TC-APP007-044 | 1 | TBD: the text shown. The server needs one branch and refuses; the screen has no branch field |
| 07-inventory.xlsx | 138 | TC-APP007-045 | 5 | TBD: the stock per store after each step (to be read in the repository code) |
| 07-inventory.xlsx | 139 | TC-APP007-046 | 1 | TBD: the text shown. The server refuses with "indent is open only" |
| 07-inventory.xlsx | 140 | TC-APP007-046 | 2 | TBD: the text shown. The server refuses with "quantity must be positive" (the same text as for 0) |
| 07-inventory.xlsx | 141 | TC-APP007-047 | 1 | TBD: the text shown. The server refuses with "issue the indent first" |
| 07-inventory.xlsx | 142 | TC-APP007-047 | 2 | TBD: the text shown. The server refuses with "receive the issue first" |
| 07-inventory.xlsx | 145 | TC-APP007-048 | 3 | TBD: whether the request is visible there and how it is issued |
| 07-inventory.xlsx | 146 | TC-APP007-049 | 1 | TBD: the text shown. The server refuses with "department is required" |
| 07-inventory.xlsx | 147 | TC-APP007-049 | 2 | TBD: the text shown. The server refuses with "other branch is required" |
| 07-inventory.xlsx | 149 | TC-APP007-050 | 2 | TBD: on which screen the new purchase request appears and what it shows (item and quantity come from the indent) |
| 07-inventory.xlsx | 150 | TC-APP007-051 | 1 | TBD: the text shown. The server refuses with "document is missing" |
| 07-inventory.xlsx | 168 | TC-APP007-064 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 07-inventory.xlsx | 169 | TC-APP007-065 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 07-inventory.xlsx | 170 | TC-APP007-066 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 07-inventory.xlsx | 171 | TC-APP007-067 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 08-operation-theater.xlsx | 74 | TC-APP008-026 | 1 | TBD: the text shown. The server refuses with "room, start, and end are required" |
| 08-operation-theater.xlsx | 76 | TC-APP008-027 | 2 | The phase shows pre-anaesthesia done. TBD: the phase text |
| 08-operation-theater.xlsx | 79 | TC-APP008-028 | 1 | TBD: the text shown. The server refuses with "validate only from pending" |
| 08-operation-theater.xlsx | 80 | TC-APP008-028 | 2 | TBD: the text shown. The server refuses with "pre-anesthesia needs a validated request" |
| 08-operation-theater.xlsx | 81 | TC-APP008-028 | 3 | TBD: the text shown. The server refuses with "pre-anesthesia required" |
| 08-operation-theater.xlsx | 82 | TC-APP008-028 | 4 | TBD: the text shown. The server refuses with "start the surgery first" |
| 08-operation-theater.xlsx | 83 | TC-APP008-028 | 5 | TBD: the text shown. The server refuses with "surgery is not in progress" |
| 08-operation-theater.xlsx | 84 | TC-APP008-029 | 1 | TBD: the text shown. The server refuses with "operation note required" |
| 08-operation-theater.xlsx | 88 | TC-APP008-031 | 1 | TBD: the text shown. The server refuses with "reason required" each time |
| 08-operation-theater.xlsx | 89 | TC-APP008-032 | 1 | TBD: the text shown. The server refuses with "resume only a deferred request" |
| 08-operation-theater.xlsx | 90 | TC-APP008-032 | 2 | TBD: the text shown. The server refuses with "defer refused" |
| 08-operation-theater.xlsx | 91 | TC-APP008-032 | 3 | TBD: the text shown. The server refuses with "cancel refused after completed" |
| 08-operation-theater.xlsx | 92 | TC-APP008-033 | 1 | Toast for success. TBD: what the row shows afterwards |
| 08-operation-theater.xlsx | 93 | TC-APP008-033 | 2 | TBD: the dossier's items as orders for the patient (the code hands them to the pharmacy queue) |
| 08-operation-theater.xlsx | 94 | TC-APP008-034 | 1 | TBD: the text shown. The server refuses with "dossier required" |
| 08-operation-theater.xlsx | 95 | TC-APP008-034 | 2 | TBD: the text shown. The server refuses with "patient name required" |
| 08-operation-theater.xlsx | 104 | TC-APP008-038 | 1 | TBD: the text shown. The server refuses with "incision, department type, and percentage are required" |
| 08-operation-theater.xlsx | 111 | TC-APP008-041 | 1 | TBD: the text shown. The server refuses with "patient required" |
| 08-operation-theater.xlsx | 124 | TC-APP008-053 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 09-procurement.xlsx | 121 | TC-APP009-038 | 1 | TBD: the text shown. The server refuses with "supplier name is required" |
| 09-procurement.xlsx | 124 | TC-APP009-039 | 3 | Toast "Saved."; TBD: the status text shown for an approved request |
| 09-procurement.xlsx | 125 | TC-APP009-040 | 1 | TBD: the text shown. The server refuses with "item and quantity are required" |
| 09-procurement.xlsx | 126 | TC-APP009-041 | 1 | TBD: the text shown. The server refuses with "document is missing" |
| 09-procurement.xlsx | 127 | TC-APP009-042 | 1 | Toast "Saved."; TBD: the status shown; whether a reason is asked (the screen has no reason field here) |
| 09-procurement.xlsx | 131 | TC-APP009-043 | 4 | Toast "Saved."; TBD: whether the earlier number is kept |
| 09-procurement.xlsx | 133 | TC-APP009-044 | 1 | TBD: the text shown. The server refuses with "supplier, tax, terms, item, quantity and rate are required" |
| 09-procurement.xlsx | 134 | TC-APP009-045 | 1 | TBD: the text shown. The server refuses with "a new number is required" |
| 09-procurement.xlsx | 135 | TC-APP009-045 | 2 | TBD: the text shown. The server refuses with "follow-up date and note are required" |
| 09-procurement.xlsx | 139 | TC-APP009-046 | 4 | TBD: where the received batch shows (Item Master stock on hand, or Store documents) |
| 09-procurement.xlsx | 140 | TC-APP009-047 | 1 | TBD: the text shown. The server refuses with "document is missing" |
| 09-procurement.xlsx | 141 | TC-APP009-047 | 2 | TBD: the text shown. The server refuses with "quantity must be positive" |
| 09-procurement.xlsx | 142 | TC-APP009-048 | 1 | TBD: the text shown. The server refuses with "store, batch and expiry are required" |
| 09-procurement.xlsx | 144 | TC-APP009-049 | 2 | TBD: on which screen the supplier bill appears and with what account |
| 09-procurement.xlsx | 145 | TC-APP009-050 | 1 | TBD: the text shown. The server refuses with "amount must be positive" |
| 09-procurement.xlsx | 146 | TC-APP009-050 | 2 | TBD: the text shown. The server refuses with "document is missing" |
| 09-procurement.xlsx | 149 | TC-APP009-051 | 3 | TBD: the stock is lower by the returned quantity |
| 09-procurement.xlsx | 150 | TC-APP009-052 | 1 | TBD: the text shown. The server refuses with "reason is required" |
| 09-procurement.xlsx | 151 | TC-APP009-052 | 2 | TBD: the text shown. The server refuses with "quantity must be positive" |
| 09-procurement.xlsx | 162 | TC-APP009-062 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 09-procurement.xlsx | 163 | TC-APP009-063 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 09-procurement.xlsx | 164 | TC-APP009-064 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 09-procurement.xlsx | 165 | TC-APP009-065 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 10-hr.xlsx | 158 | TC-APP010-040 | 5 | TBD: what is shown (the code reads the profile of the linked employee) |
| 10-hr.xlsx | 159 | TC-APP010-041 | 1 | TBD: the text shown. The server refuses with "code and name are required" |
| 10-hr.xlsx | 160 | TC-APP010-041 | 2 | TBD: the text shown. The server refuses with "notmapped" |
| 10-hr.xlsx | 166 | TC-APP010-042 | 6 | Toast "Saved."; TBD: whether the days return to the balance |
| 10-hr.xlsx | 167 | TC-APP010-043 | 1 | TBD: the text shown. The server refuses with "defineresetdate" |
| 10-hr.xlsx | 168 | TC-APP010-043 | 2 | TBD: the text shown. The server refuses with "to date is before from" |
| 10-hr.xlsx | 169 | TC-APP010-043 | 3 | TBD: the text shown. The server refuses with "employee, type and days are required" |
| 10-hr.xlsx | 170 | TC-APP010-043 | 4 | TBD: the text shown. The server refuses with "pending approval" |
| 10-hr.xlsx | 171 | TC-APP010-044 | 1 | TBD: the text shown. The server refuses with "document is missing" |
| 10-hr.xlsx | 173 | TC-APP010-045 | 2 | Toast "Saved."; TBD: whether a day is added to the balance |
| 10-hr.xlsx | 174 | TC-APP010-046 | 1 | TBD: the text shown. The server refuses with "date is in the future" |
| 10-hr.xlsx | 175 | TC-APP010-046 | 2 | TBD: the text shown. The server refuses with "worked day is older than 7 days" |
| 10-hr.xlsx | 176 | TC-APP010-046 | 3 | TBD: accepted or refused at the limit (the code compares with 7 times 24 hours from now) |
| 10-hr.xlsx | 177 | TC-APP010-047 | 1 | Toast "Saved."; TBD: the balance shown is 2 days higher |
| 10-hr.xlsx | 179 | TC-APP010-048 | 1 | TBD: the text shown. The server refuses with "employee, type and days are required". The text does not say that the word is wrong |
| 10-hr.xlsx | 186 | TC-APP010-050 | 1 | TBD: the text shown. The server refuses with "userdoesntmapped" |
| 10-hr.xlsx | 187 | TC-APP010-050 | 2 | TBD: the text shown. The server refuses with "punch type is required" |
| 10-hr.xlsx | 188 | TC-APP010-051 | 1 | TBD: the text shown. The server refuses with "date is in the future" |
| 10-hr.xlsx | 189 | TC-APP010-051 | 2 | TBD: the text shown. The server refuses with "employee and location are required" |
| 10-hr.xlsx | 196 | TC-APP010-054 | 1 | TBD: the text shown. The server refuses with "code and name are required" |
| 10-hr.xlsx | 197 | TC-APP010-054 | 2 | TBD: the text shown. The server refuses with "name is required" |
| 10-hr.xlsx | 208 | TC-APP010-064 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 10-hr.xlsx | 209 | TC-APP010-065 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 10-hr.xlsx | 210 | TC-APP010-066 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 10-hr.xlsx | 211 | TC-APP010-067 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 10-hr.xlsx | 212 | TC-APP010-068 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 11-laboratory.xlsx | 98 | TC-APP011-030 | 4 | TBD: whether the range is offered in "Result range" and whether a value outside it is marked |
| 11-laboratory.xlsx | 99 | TC-APP011-031 | 1 | TBD: the text shown. The server refuses with "specimen, container, or test needs a code and a name" |
| 11-laboratory.xlsx | 100 | TC-APP011-032 | 1 | TBD: the text shown. The server refuses with "reference range needs a test and a high above the low" |
| 11-laboratory.xlsx | 106 | TC-APP011-034 | 1 | TBD: the text shown. The server refuses with "result required" |
| 11-laboratory.xlsx | 107 | TC-APP011-034 | 2 | TBD: the text shown. The server refuses with "accepted order required" |
| 11-laboratory.xlsx | 109 | TC-APP011-035 | 2 | The order shows rejected. TBD: whether a new sample can be asked for from here (Recollect needs a certified or stored result) |
| 11-laboratory.xlsx | 111 | TC-APP011-036 | 2 | TBD: the text shown. The server refuses with "result stored" |
| 11-laboratory.xlsx | 114 | TC-APP011-037 | 3 | Toast "Saved"; TBD: how the panic flag shows on the worklist and whether anyone is notified |
| 11-laboratory.xlsx | 115 | TC-APP011-038 | 1 | TBD: the text shown. The server refuses with "certify or a stored result" (the message is longer) |
| 11-laboratory.xlsx | 116 | TC-APP011-038 | 2 | TBD: the text shown. The server refuses with "panic needs a stored result" |
| 11-laboratory.xlsx | 119 | TC-APP011-040 | 1 | TBD: the text shown. The server refuses with "culture note required" |
| 11-laboratory.xlsx | 120 | TC-APP011-040 | 2 | TBD: the text shown. The server refuses with "external lab required" |
| 11-laboratory.xlsx | 125 | TC-APP011-043 | 2 | TBD: the text shown. The server refuses with "qc needs a test and a value" |
| 11-laboratory.xlsx | 140 | TC-APP011-054 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 12-ris.xlsx | 75 | TC-APP012-025 | 6 | TBD: what the lists show for a scheduled, accepted and reported order |
| 12-ris.xlsx | 76 | TC-APP012-026 | 1 | TBD: the text shown. The server refuses with "room and start required" |
| 12-ris.xlsx | 77 | TC-APP012-026 | 2 | TBD: the text shown. The server refuses with "report text required" |
| 12-ris.xlsx | 78 | TC-APP012-026 | 3 | TBD: the text shown. The server refuses with "file name required" |
| 12-ris.xlsx | 80 | TC-APP012-027 | 2 | TBD: how a cancelled order shows, and whether it can still be scheduled or reported |
| 12-ris.xlsx | 81 | TC-APP012-028 | 1 | TBD: the text shown. The server refuses with "cancel needs a reason" |
| 12-ris.xlsx | 82 | TC-APP012-029 | 1 | A new order with the doctor's study text. TBD: which reference and accession number it gets |
| 12-ris.xlsx | 91 | TC-APP012-035 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 13-dietary.xlsx | 129 | TC-APP013-034 | 5 | The three new entries are still in the line. TBD: how a user tells a code from a session or a menu, since the line joins all of them |
| 13-dietary.xlsx | 130 | TC-APP013-035 | 1 | TBD: the text shown. The server refuses with "to time must be greater than from time" |
| 13-dietary.xlsx | 131 | TC-APP013-035 | 2 | TBD: the text shown. The server refuses with "separator must be colon" |
| 13-dietary.xlsx | 132 | TC-APP013-035 | 3 | TBD: the text shown. The server refuses with "hour must be between 0 and 23" |
| 13-dietary.xlsx | 133 | TC-APP013-035 | 4 | TBD: the text shown. The server refuses with "minute must be between 0 and 59" |
| 13-dietary.xlsx | 134 | TC-APP013-036 | 1 | TBD: the text shown. The server refuses with "duplicate" |
| 13-dietary.xlsx | 135 | TC-APP013-036 | 2 | TBD: the text shown. The server refuses with "duplicate" |
| 13-dietary.xlsx | 136 | TC-APP013-036 | 3 | TBD: the text shown. The server refuses with "duplicate" |
| 13-dietary.xlsx | 138 | TC-APP013-037 | 2 | TBD: the text shown. The server refuses with "code required" |
| 13-dietary.xlsx | 143 | TC-APP013-039 | 1 | TBD: the text shown. The server refuses with "body-mass rule not found" |
| 13-dietary.xlsx | 144 | TC-APP013-039 | 2 | TBD: the text shown. The server refuses with "weight and height required" |
| 13-dietary.xlsx | 145 | TC-APP013-039 | 3 | TBD: the text shown. The server refuses with "reference height and weight required" |
| 13-dietary.xlsx | 146 | TC-APP013-039 | 4 | TBD: the text shown. The server refuses with "duplicate" |
| 13-dietary.xlsx | 149 | TC-APP013-040 | 3 | Toast "Saved"; the first row of the list reads "assessed" with a BMI. TBD: the row meant is always the first one (sorted by patient name), and the values sent a |
| 13-dietary.xlsx | 152 | TC-APP013-040 | 6 | TBD: the order itself (menu, start, end) is shown nowhere; only the state of the prescription changes |
| 13-dietary.xlsx | 153 | TC-APP013-041 | 1 | TBD: the text shown. The server refuses with "end date before start date" |
| 13-dietary.xlsx | 154 | TC-APP013-041 | 2 | TBD: the text shown. The server refuses with "prescription is not pending" |
| 13-dietary.xlsx | 155 | TC-APP013-041 | 3 | TBD: the text shown. The server refuses with "body-mass rule not found" |
| 13-dietary.xlsx | 156 | TC-APP013-041 | 4 | TBD: the text shown. The server refuses with "patient required". The name input is not marked as required, so the browser does not stop the click |
| 13-dietary.xlsx | 157 | TC-APP013-042 | 1 | The browser stops the click at the branch list, or the server refuses with "branch is required". TBD: which of the two |
| 13-dietary.xlsx | 158 | TC-APP013-043 | 1 | TBD: the order carries B's name but is tied to A's prescription (the first of the list), and A's row turns to "ordered" |
| 13-dietary.xlsx | 159 | TC-APP013-043 | 2 | TBD: there is none |
| 13-dietary.xlsx | 164 | TC-APP013-045 | 1 | TBD: the text shown. The server refuses with "diet request doesn't exist for this patient and timing" |
| 13-dietary.xlsx | 165 | TC-APP013-045 | 2 | TBD: the same refusal, because the name must match letter for letter |
| 13-dietary.xlsx | 166 | TC-APP013-045 | 3 | TBD: the text shown. The server refuses with "late meal is not waiting" |
| 13-dietary.xlsx | 167 | TC-APP013-046 | 1 | TBD: the text shown. The server refuses with "select diet time then patient". The button has no inputs of its own, so the browser does not stop it: in this pass |
| 13-dietary.xlsx | 168 | TC-APP013-046 | 2 | TBD: the text shown. The server refuses with "reason required" |
| 13-dietary.xlsx | 173 | TC-APP013-047 | 4 | TBD: where it shows. From the code: number "DIET-" followed by digits, today's date, party = the contractor, narration "diet contractor" with the two dates, cur |
| 13-dietary.xlsx | 174 | TC-APP013-047 | 5 | TBD: the value is the number of confirmations billed (1 for one session), not an amount of money; the screen asks for no price |
| 13-dietary.xlsx | 175 | TC-APP013-048 | 1 | TBD: the text shown. The server refuses with "no approved diet request for the day" |
| 13-dietary.xlsx | 176 | TC-APP013-048 | 2 | TBD: the text shown. The server refuses with "duplicate" |
| 13-dietary.xlsx | 177 | TC-APP013-049 | 1 | TBD: the text shown. The server refuses with "nothing served to bill" |
| 13-dietary.xlsx | 178 | TC-APP013-049 | 2 | TBD: the text shown. The server refuses with "nothing served to bill". No second voucher in Finance |
| 13-dietary.xlsx | 179 | TC-APP013-050 | 1 | TBD: both confirmations are billed on the voucher of Daan Mogot, because the count ignores the branch |
| 13-dietary.xlsx | 180 | TC-APP013-050 | 2 | TBD: the text shown. The server refuses with "nothing served to bill": the screen always bills today only, so a confirmation not billed on its day can never be |
| 13-dietary.xlsx | 181 | TC-APP013-050 | 3 | TBD: the screen sends the UTC date, which is still yesterday, while the confirmation carries the date of the database. The bill may be refused with "nothing ser |
| 13-dietary.xlsx | 182 | TC-APP013-051 | 1 | TBD: expected is a list of the meals to prepare per session from the diet orders. From the code, the list holds late meals only; the order is not shown |
| 13-dietary.xlsx | 183 | TC-APP013-051 | 2 | TBD: expected is that the ordered meal is confirmed. From the code, the server refuses with "no approved diet request for the day" unless a late meal was typed |
| 13-dietary.xlsx | 184 | TC-APP013-051 | 3 | TBD: the request list and the order are not linked; the order shows on no list |
| 13-dietary.xlsx | 185 | TC-APP013-051 | 4 | TBD: the text shown. The server refuses with "nothing served to bill" when only diet orders exist |
| 13-dietary.xlsx | 186 | TC-APP013-052 | 1 | TBD: the screens open and the lists are filled, with patient names on Diet orders and Kitchen; the read routes ask for the licence only |
| 13-dietary.xlsx | 187 | TC-APP013-052 | 2 | TBD: the text shown. The server refuses for lack of the right; nothing is stored |
| 13-dietary.xlsx | 188 | TC-APP013-052 | 3 | TBD: refused as well, although calculating stores nothing |
| 13-dietary.xlsx | 189 | TC-APP013-052 | 4 | TBD: refused; the state stays "waiting" |
| 13-dietary.xlsx | 190 | TC-APP013-052 | 5 | TBD: refused; no voucher in Finance |
| 13-dietary.xlsx | 201 | TC-APP013-062 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 14-hospital-accounts.xlsx | 172 | TC-APP014-054 | 1 | TBD: the text shown. The server refuses with a text ending in "code and name are required" |
| 14-hospital-accounts.xlsx | 173 | TC-APP014-054 | 2 | TBD: the text shown. The server refuses with a text ending in "DuplicateEntry" |
| 14-hospital-accounts.xlsx | 174 | TC-APP014-054 | 3 | TBD: the text shown. The server refuses with a text ending in "select the tariff group" |
| 14-hospital-accounts.xlsx | 175 | TC-APP014-054 | 4 | TBD: the text shown. The server refuses with a text ending in "serviceGrpOrType" |
| 14-hospital-accounts.xlsx | 176 | TC-APP014-054 | 5 | TBD: the text shown. The server refuses with a text ending in "serviceGrpOrType" |
| 14-hospital-accounts.xlsx | 177 | TC-APP014-054 | 6 | TBD: the text shown. From the code the database refuses and the server answers with the general text "hospital accounts failed" |
| 14-hospital-accounts.xlsx | 178 | TC-APP014-055 | 1 | TBD: the price is stored as 150, because the dot is read as a decimal point |
| 14-hospital-accounts.xlsx | 179 | TC-APP014-055 | 2 | TBD: the text shown. The server refuses with a text ending in "serviceGrpOrType", because the text is not read as a number |
| 14-hospital-accounts.xlsx | 180 | TC-APP014-055 | 3 | TBD: the text shown. The server refuses with a text ending in "serviceGrpOrType" |
| 14-hospital-accounts.xlsx | 181 | TC-APP014-056 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 14-hospital-accounts.xlsx | 182 | TC-APP014-056 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 14-hospital-accounts.xlsx | 186 | TC-APP014-057 | 4 | TBD: there is none; the id must be copied from elsewhere. Where a billing officer gets it is TBD |
| 14-hospital-accounts.xlsx | 188 | TC-APP014-058 | 1 | TBD: the text shown. The server refuses with a text ending in "noPatPlanAvail" |
| 14-hospital-accounts.xlsx | 189 | TC-APP014-058 | 2 | TBD: the text shown. The server refuses with a text ending in "code is required" |
| 14-hospital-accounts.xlsx | 190 | TC-APP014-058 | 3 | TBD: the text shown. The server refuses with a text ending in "DuplicateEntry" |
| 14-hospital-accounts.xlsx | 191 | TC-APP014-058 | 4 | TBD: the plan is saved; nothing checks that the patient exists |
| 14-hospital-accounts.xlsx | 192 | TC-APP014-059 | 1 | TBD: the text shown. The server refuses with a text ending in "noPatPlanAvail" |
| 14-hospital-accounts.xlsx | 193 | TC-APP014-059 | 2 | TBD: the text shown. The server refuses with a text ending in "pre-authorization is not approved" |
| 14-hospital-accounts.xlsx | 194 | TC-APP014-059 | 3 | TBD: "Patient / source" holds the id of the plan, not of the patient, so the check is refused with a text ending in "noPatPlanAvail" although the patient is eli |
| 14-hospital-accounts.xlsx | 195 | TC-APP014-060 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 14-hospital-accounts.xlsx | 196 | TC-APP014-060 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 14-hospital-accounts.xlsx | 202 | TC-APP014-061 | 6 | TBD: the invoice is found with Rp 300.000 due and can be paid like any other sale. TBD: tax and discount of the cashier settings on this bill |
| 14-hospital-accounts.xlsx | 203 | TC-APP014-062 | 1 | TBD: the text shown. The server refuses with a text ending in "Tariff is not defined for this service" |
| 14-hospital-accounts.xlsx | 204 | TC-APP014-062 | 2 | TBD: the text shown. The server refuses with a text ending in "Tariff is not defined for this service", which does not name the quantity |
| 14-hospital-accounts.xlsx | 205 | TC-APP014-062 | 3 | TBD: the text shown. The server refuses with a text ending in "Tariff is not defined for this service", which does not name the invoice number |
| 14-hospital-accounts.xlsx | 206 | TC-APP014-062 | 4 | TBD: the text shown. The server refuses with a text ending in "patient is required" |
| 14-hospital-accounts.xlsx | 207 | TC-APP014-063 | 1 | TBD: a second invoice with the same number is created; the number is not unique |
| 14-hospital-accounts.xlsx | 208 | TC-APP014-063 | 2 | TBD: the bill is 150000; the input "Amount" is ignored for this action without a hint |
| 14-hospital-accounts.xlsx | 209 | TC-APP014-063 | 3 | TBD: the bill is created for the id of that invoice as if it were a patient; nothing checks that the patient exists |
| 14-hospital-accounts.xlsx | 210 | TC-APP014-063 | 4 | TBD: nothing is found, because the search matches the internal id only; the table then shows the open invoices whose text holds the typed words |
| 14-hospital-accounts.xlsx | 211 | TC-APP014-064 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 14-hospital-accounts.xlsx | 212 | TC-APP014-064 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 14-hospital-accounts.xlsx | 217 | TC-APP014-065 | 5 | TBD: "Deposits" and "Available" of both sales show the new amounts |
| 14-hospital-accounts.xlsx | 218 | TC-APP014-066 | 1 | TBD: the text shown. The server refuses with a text ending in "PlsSelSrcSite" |
| 14-hospital-accounts.xlsx | 219 | TC-APP014-066 | 2 | TBD: the text shown. The server refuses with a text ending in "SelDest" |
| 14-hospital-accounts.xlsx | 220 | TC-APP014-066 | 3 | TBD: the text shown. The server refuses with a text ending in "SelDest" |
| 14-hospital-accounts.xlsx | 221 | TC-APP014-066 | 4 | TBD: the text shown. The server refuses with a text ending in "TransferAmntZero" |
| 14-hospital-accounts.xlsx | 222 | TC-APP014-066 | 5 | TBD: the text shown. The server refuses with a text ending in "AmntLinked" |
| 14-hospital-accounts.xlsx | 223 | TC-APP014-066 | 6 | TBD: the text shown. The server refuses with a text ending in "invoice is not open" |
| 14-hospital-accounts.xlsx | 224 | TC-APP014-066 | 7 | TBD: the text shown. The server refuses with a text ending in "SelDest" |
| 14-hospital-accounts.xlsx | 225 | TC-APP014-067 | 1 | TBD: the first is saved, the second is refused with a text ending in "AmntLinked"; the deposit never goes below 0 |
| 14-hospital-accounts.xlsx | 229 | TC-APP014-068 | 4 | TBD: where it shows. From the code a card receipt with the state failed is stored for the invoice and no list of this screen reads it |
| 14-hospital-accounts.xlsx | 230 | TC-APP014-069 | 1 | TBD: the text shown. The server refuses with a text ending in "UnableCancelNullTrans". The word must be typed exactly; the input is free text |
| 14-hospital-accounts.xlsx | 231 | TC-APP014-069 | 2 | TBD: the text shown. The server refuses with a text ending in "UnableCancelNullTrans" |
| 14-hospital-accounts.xlsx | 232 | TC-APP014-069 | 3 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 14-hospital-accounts.xlsx | 233 | TC-APP014-069 | 4 | TBD: the text shown. The server refuses with a text ending in "invoice is not open" |
| 14-hospital-accounts.xlsx | 237 | TC-APP014-070 | 4 | TBD: what the pharmacist sees after an approval and after a rejection, and how the patient's bill shows the discount |
| 14-hospital-accounts.xlsx | 238 | TC-APP014-071 | 1 | TBD: refused by the approval steps, with the server's text in red under the list |
| 14-hospital-accounts.xlsx | 239 | TC-APP014-071 | 2 | TBD: the second click is refused; the dispense stays issued |
| 14-hospital-accounts.xlsx | 240 | TC-APP014-071 | 3 | TBD: seen once in this pass; a cashier cannot tell what is being approved |
| 14-hospital-accounts.xlsx | 241 | TC-APP014-072 | 1 | TBD: the screens open and the lists are filled, with invoice numbers, charges and deposits on Patient ledger; the list route asks for the licence only |
| 14-hospital-accounts.xlsx | 242 | TC-APP014-072 | 2 | TBD: the text shown. The server refuses for lack of the right; no row is added |
| 14-hospital-accounts.xlsx | 243 | TC-APP014-072 | 3 | TBD: refused as well, although the check stores nothing |
| 14-hospital-accounts.xlsx | 244 | TC-APP014-072 | 4 | TBD: refused; both deposits are unchanged |
| 14-hospital-accounts.xlsx | 246 | TC-APP014-073 | 2 | TBD: the panel is shown. Searching a pre-authorisation, saving the sponsor shares and marking a claim as reconciled are refused by the server for lack of the li |
| 14-hospital-accounts.xlsx | 247 | TC-APP014-073 | 3 | TBD: works, because the eligibility route needs KLIKMED-BPJS |
| 14-hospital-accounts.xlsx | 248 | TC-APP014-073 | 4 | TBD: no payment type switch and no insurance tile, although the tenant holds the licence for pre-authorisations and claims |
| 14-hospital-accounts.xlsx | 257 | TC-APP014-081 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 14-hospital-accounts.xlsx | 258 | TC-APP014-082 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 14-hospital-accounts.xlsx | 259 | TC-APP014-083 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 14-hospital-accounts.xlsx | 260 | TC-APP014-084 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 14-hospital-accounts.xlsx | 261 | TC-APP014-085 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 15-emergency.xlsx | 82 | TC-APP015-025 | 3 | The browser stops the click, or toast "Could not save the triage category." TBD: which of the two |
| 15-emergency.xlsx | 84 | TC-APP015-026 | 1 | TBD: the category is still offered there. Saving is refused with toast "That triage category is not active." |
| 15-emergency.xlsx | 89 | TC-APP015-027 | 5 | TBD: the patient is there with the MRN, the estimated age turned into a date of birth, and no gender |
| 15-emergency.xlsx | 97 | TC-APP015-029 | 1 | TBD: a second patient record with a second MRN is created; nothing warns of a possible duplicate |
| 15-emergency.xlsx | 99 | TC-APP015-030 | 2 | TBD: the row has no button at all. The encounter is closed and was never received, so neither "Receive" nor "Outcome" is shown |
| 15-emergency.xlsx | 100 | TC-APP015-030 | 3 | TBD: there is none on the screens. "Mark as alive" sits in the Outcome dialog, which this row cannot open |
| 15-emergency.xlsx | 101 | TC-APP015-030 | 4 | TBD: whether the patient record shows the death |
| 15-emergency.xlsx | 113 | TC-APP015-033 | 1 | TBD: toast "This encounter is closed." The patient cannot be received a second time; a new registration creates a second patient record |
| 15-emergency.xlsx | 114 | TC-APP015-034 | 1 | TBD: where the discount and the plan are used. Both a percentage and an amount are accepted together, with no upper limit |
| 15-emergency.xlsx | 120 | TC-APP015-036 | 2 | The browser stops the click, or toast "Could not save." TBD: which of the two |
| 15-emergency.xlsx | 121 | TC-APP015-036 | 3 | TBD: the list "Service centre" is empty and the walk-in cannot be saved; nothing says why |
| 15-emergency.xlsx | 122 | TC-APP015-036 | 4 | TBD: a second patient record and a second open encounter; nothing warns of a duplicate |
| 15-emergency.xlsx | 126 | TC-APP015-037 | 4 | The row shows the new category. TBD: the earlier assessment is kept on the server and shown nowhere |
| 15-emergency.xlsx | 130 | TC-APP015-038 | 2 | TBD: the later save is the current category; no warning for the first nurse |
| 15-emergency.xlsx | 132 | TC-APP015-039 | 1 | TBD: overdue is counted from the time of reception, 10:00, not from the new triage; the patient is overdue at 10:30 |
| 15-emergency.xlsx | 138 | TC-APP015-040 | 6 | TBD: where the charge shows and with which amount. From the code it is posted through the cashier's price rules at each bed assignment and again when the encoun |
| 15-emergency.xlsx | 142 | TC-APP015-041 | 4 | TBD: whether the bed is assigned without a charge or refused |
| 15-emergency.xlsx | 151 | TC-APP015-043 | 3 | TBD: accepted; no date is checked |
| 15-emergency.xlsx | 152 | TC-APP015-043 | 4 | TBD: the text shown. The server refuses with a text ending in "discharge type, department, unit, expected date, reason, and next review are required" |
| 15-emergency.xlsx | 156 | TC-APP015-044 | 4 | TBD: Inpatient does not show the request from Emergency; the clerk admits the patient as any other. Where the clerk reads the internal id of the admission is TB |
| 15-emergency.xlsx | 158 | TC-APP015-045 | 1 | TBD: the text shown. The server refuses with a text ending in "admission id is required" |
| 15-emergency.xlsx | 159 | TC-APP015-045 | 2 | TBD: the text shown. The server refuses with a text ending in "admission not found" |
| 15-emergency.xlsx | 160 | TC-APP015-045 | 3 | TBD: accepted. The server only checks that the admission exists in the tenant |
| 15-emergency.xlsx | 161 | TC-APP015-045 | 4 | TBD: there is none. The visit can no longer be closed with "Close visit"; it ends by discharge, admission or death |
| 15-emergency.xlsx | 165 | TC-APP015-046 | 4 | TBD: the text shown. The server refuses for lack of the right; the button is shown to every user all the same |
| 15-emergency.xlsx | 167 | TC-APP015-046 | 6 | TBD: the bed was released and the bed charge posted when the death was saved; neither is taken back |
| 15-emergency.xlsx | 168 | TC-APP015-047 | 1 | TBD: the text shown. The server refuses with a text ending in "death time cannot be in the future" |
| 15-emergency.xlsx | 169 | TC-APP015-047 | 2 | TBD: the text shown. The server refuses with a text ending in "death time is before the visit" |
| 15-emergency.xlsx | 170 | TC-APP015-047 | 3 | TBD: accepted; only the day is compared, not the hour |
| 15-emergency.xlsx | 171 | TC-APP015-048 | 1 | TBD: saved without a confirmation; only a user with EMERGENCY_DEATH can undo it |
| 15-emergency.xlsx | 175 | TC-APP015-050 | 2 | TBD: the text shown. The server refuses with a text ending in "a reason is required to close the visit" |
| 15-emergency.xlsx | 176 | TC-APP015-050 | 3 | TBD: the text shown. The server refuses with a text ending in "close visit is for an outpatient encounter" |
| 15-emergency.xlsx | 179 | TC-APP015-051 | 3 | TBD: no screen lists the files of an encounter |
| 15-emergency.xlsx | 182 | TC-APP015-052 | 3 | TBD: no file type is checked |
| 15-emergency.xlsx | 188 | TC-APP015-053 | 6 | TBD: Patient Care opens on its start page; the patient is not passed on |
| 15-emergency.xlsx | 191 | TC-APP015-054 | 2 | TBD: the text shown. The server refuses with a text ending in "date of birth or age is required" |
| 15-emergency.xlsx | 192 | TC-APP015-054 | 3 | TBD: the text shown. The server refuses with a text ending in "a name or an existing MRN is required" |
| 15-emergency.xlsx | 193 | TC-APP015-054 | 4 | TBD: the text shown. The server refuses with a text ending in "patient not found" |
| 15-emergency.xlsx | 194 | TC-APP015-054 | 5 | TBD: the text shown. The server refuses with a text ending in "this patient already has an open encounter" |
| 15-emergency.xlsx | 195 | TC-APP015-054 | 6 | TBD: the text shown. The server refuses with a text ending in "date of birth cannot be in the future" |
| 15-emergency.xlsx | 201 | TC-APP015-057 | 1 | TBD: the text shown. The server refuses with a text ending in "two beds cannot share a cell" |
| 15-emergency.xlsx | 202 | TC-APP015-057 | 2 | TBD: the text shown. The server refuses with a text ending in "a bed plot cannot be negative" |
| 15-emergency.xlsx | 203 | TC-APP015-057 | 3 | TBD: accepted; the board then gets as wide as the highest column |
| 15-emergency.xlsx | 204 | TC-APP015-058 | 1 | TBD: neither has it. The screen opens only by typing its address /emergency/visits |
| 15-emergency.xlsx | 206 | TC-APP015-058 | 3 | TBD: the patient is on neither. A visit of the old screen has no encounter, so it cannot be received, triaged with a category, or ended |
| 15-emergency.xlsx | 207 | TC-APP015-058 | 4 | TBD: a visit row exists for that patient too; whether its priority and status follow the new triage and the outcome is TBD |
| 15-emergency.xlsx | 208 | TC-APP015-059 | 1 | TBD: the screens open and show patient names, MRN, triage and beds; the read routes ask for the licence only |
| 15-emergency.xlsx | 210 | TC-APP015-059 | 3 | TBD: the text shown. The server refuses for lack of the right; the encounter stays open |
| 15-emergency.xlsx | 212 | TC-APP015-059 | 5 | TBD: a file with the patient names and MRN of the page is downloaded; the export is made in the browser and is not recorded in Audit |
| 15-emergency.xlsx | 223 | TC-APP015-069 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 16-mrd.xlsx | 109 | TC-APP016-030 | 2 | The browser stops the click, or toast "Failed to create request". TBD: which of the two |
| 16-mrd.xlsx | 112 | TC-APP016-031 | 1 | TBD: there is none; the dialog only creates |
| 16-mrd.xlsx | 113 | TC-APP016-031 | 2 | TBD: there is none; a new code is needed |
| 16-mrd.xlsx | 121 | TC-APP016-033 | 1 | TBD: saved; the movement line then shows no place |
| 16-mrd.xlsx | 123 | TC-APP016-033 | 3 | TBD: whether 10:00 or 03:00 (UTC) is shown |
| 16-mrd.xlsx | 128 | TC-APP016-034 | 4 | TBD: the note is stored and shown nowhere on the screen; the reviewer is in Audit only (REVIEW_PATIENT_RECORD) |
| 16-mrd.xlsx | 131 | TC-APP016-035 | 3 | TBD: the review is opened and the note is not stored; only the note of the completion is kept |
| 16-mrd.xlsx | 132 | TC-APP016-035 | 4 | TBD: both are accepted; the review does not look at where the file is |
| 16-mrd.xlsx | 134 | TC-APP016-036 | 2 | TBD: a row shows the discharge number and the time only. No name, MRN or ward tells the coder whose stay it is |
| 16-mrd.xlsx | 137 | TC-APP016-036 | 5 | TBD: whether the code shows there. From the code it is stored on the stay without the patient |
| 16-mrd.xlsx | 142 | TC-APP016-038 | 1 | TBD: accepted. The code is not checked against the catalogue |
| 16-mrd.xlsx | 143 | TC-APP016-038 | 2 | TBD: stored as typed |
| 16-mrd.xlsx | 144 | TC-APP016-038 | 3 | TBD: the row is gone from the list and MRD offers no correction |
| 16-mrd.xlsx | 145 | TC-APP016-039 | 1 | TBD: all rows are on one page; there is no paging, search or sorting (37 rows in this pass) |
| 16-mrd.xlsx | 146 | TC-APP016-039 | 2 | TBD: whether 11:00 or 04:00 (UTC) is shown |
| 16-mrd.xlsx | 149 | TC-APP016-040 | 3 | TBD: nothing happens; the list has no link to the visit and no button |
| 16-mrd.xlsx | 150 | TC-APP016-040 | 4 | TBD: where the document is recorded, and that the row then leaves the list |
| 16-mrd.xlsx | 152 | TC-APP016-041 | 2 | TBD: the text shown. The server refuses for lack of the right |
| 16-mrd.xlsx | 153 | TC-APP016-041 | 3 | TBD: refused; the button still reads "Open review" |
| 16-mrd.xlsx | 154 | TC-APP016-041 | 4 | TBD: both lists are shown, the first with MRN and patient names; the read routes ask for the licence only |
| 16-mrd.xlsx | 163 | TC-APP016-049 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 17-payroll.xlsx | 92 | TC-APP017-028 | 5 | TBD: it is listed nowhere; the table shows the year links only |
| 17-payroll.xlsx | 94 | TC-APP017-029 | 1 | TBD: the text shown. The server refuses with a text ending in "financial year is missing" |
| 17-payroll.xlsx | 95 | TC-APP017-029 | 2 | TBD: the text shown. The server refuses with a text ending in "Financial Year already exists" |
| 17-payroll.xlsx | 96 | TC-APP017-029 | 3 | TBD: the text shown. The server refuses with a text ending in "Gross From Should be greater than Previous Gross To" |
| 17-payroll.xlsx | 97 | TC-APP017-029 | 4 | TBD: the text shown. The server refuses with a text ending in "Either Salary From or Salary To are overlapping" |
| 17-payroll.xlsx | 98 | TC-APP017-029 | 5 | TBD: the text shown. The server refuses with a text ending in "statutory slabs are not salary components" |
| 17-payroll.xlsx | 99 | TC-APP017-029 | 6 | TBD: the text shown. The server refuses with a text ending in "Gross From Should be greater than Previous Gross To", which does not name the code |
| 17-payroll.xlsx | 100 | TC-APP017-030 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 17-payroll.xlsx | 101 | TC-APP017-030 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 17-payroll.xlsx | 105 | TC-APP017-031 | 4 | TBD: it is listed nowhere; the table shows payslips |
| 17-payroll.xlsx | 107 | TC-APP017-031 | 6 | Toast "Saved."; TBD: the inputs are listed nowhere either |
| 17-payroll.xlsx | 108 | TC-APP017-032 | 1 | TBD: the text shown. The server refuses with a text ending in "Employee not found" |
| 17-payroll.xlsx | 109 | TC-APP017-032 | 2 | TBD: the text shown. The server refuses with a text ending in "unknown EMPCODE" with the number; no row is saved, the first one neither |
| 17-payroll.xlsx | 110 | TC-APP017-032 | 3 | TBD: the text shown. The server refuses with a text ending in "unknown EMPCODE" |
| 17-payroll.xlsx | 111 | TC-APP017-032 | 4 | TBD: the text shown. The server refuses with a text ending in "period and rows are required" |
| 17-payroll.xlsx | 112 | TC-APP017-033 | 1 | TBD: saved with the amount 0; a text that is not a number is not refused |
| 17-payroll.xlsx | 113 | TC-APP017-033 | 2 | TBD: saved as typed; the period is free text |
| 17-payroll.xlsx | 114 | TC-APP017-033 | 3 | TBD: saved; the salary is not checked |
| 17-payroll.xlsx | 115 | TC-APP017-033 | 4 | TBD: the text shown. The server refuses with a text ending in "Employee not found". The input offers no search by name |
| 17-payroll.xlsx | 116 | TC-APP017-034 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 17-payroll.xlsx | 117 | TC-APP017-034 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 17-payroll.xlsx | 120 | TC-APP017-035 | 3 | Toast "Saved."; TBD: the declaration is listed nowhere |
| 17-payroll.xlsx | 122 | TC-APP017-035 | 5 | TBD: the instalment is not deducted; no payslip reads the loan |
| 17-payroll.xlsx | 123 | TC-APP017-036 | 1 | TBD: the text shown. The server refuses with a text ending in "Amount exceeded the allowed limit of 12". The limit is whatever the user types in "To / months" |
| 17-payroll.xlsx | 124 | TC-APP017-036 | 2 | TBD: the text shown. The server refuses with a text ending in "amount and months are required" |
| 17-payroll.xlsx | 125 | TC-APP017-036 | 3 | TBD: the text shown. The server refuses with a text ending in "Employee not found" |
| 17-payroll.xlsx | 126 | TC-APP017-037 | 1 | TBD: stored as 2 months with an instalment of 4800000; the two do not add up |
| 17-payroll.xlsx | 127 | TC-APP017-037 | 2 | TBD: accepted; nothing limits the loans of an employee |
| 17-payroll.xlsx | 128 | TC-APP017-037 | 3 | TBD: accepted; the limit is not taken from a rule |
| 17-payroll.xlsx | 129 | TC-APP017-038 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 17-payroll.xlsx | 130 | TC-APP017-038 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 17-payroll.xlsx | 135 | TC-APP017-039 | 5 | Toast "Saved."; the row is unchanged. TBD: the re-run takes nothing from the payroll record, the bulk input, the loan, the tax declaration or the slabs |
| 17-payroll.xlsx | 137 | TC-APP017-039 | 7 | TBD: the text shown. The server refuses with a text ending in "month is locked" |
| 17-payroll.xlsx | 138 | TC-APP017-040 | 1 | TBD: the text shown. The server refuses with a text ending in "period is required" |
| 17-payroll.xlsx | 139 | TC-APP017-040 | 2 | TBD: the text shown. The server refuses with a text ending in "Employee not found" |
| 17-payroll.xlsx | 140 | TC-APP017-040 | 3 | TBD: the text shown. The server refuses with a text ending in "month is locked" |
| 17-payroll.xlsx | 141 | TC-APP017-041 | 1 | TBD: saved; the payslip then shows a net of 0 or below |
| 17-payroll.xlsx | 142 | TC-APP017-041 | 2 | TBD: toast "Saved." although nothing was calculated |
| 17-payroll.xlsx | 143 | TC-APP017-041 | 3 | TBD: there is none on the screens |
| 17-payroll.xlsx | 144 | TC-APP017-041 | 4 | TBD: accepted; the period is free text |
| 17-payroll.xlsx | 145 | TC-APP017-041 | 5 | TBD: no reason is asked and no audit entry is written |
| 17-payroll.xlsx | 146 | TC-APP017-042 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 17-payroll.xlsx | 147 | TC-APP017-042 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 17-payroll.xlsx | 150 | TC-APP017-043 | 3 | TBD: where it shows. From the code: a number "DC-" with eight characters, today's date, the value 2500000, IDR, the employee number as party and the narration " |
| 17-payroll.xlsx | 151 | TC-APP017-043 | 4 | TBD: the account of the payroll record is only checked to exist; the voucher is written without lines |
| 17-payroll.xlsx | 152 | TC-APP017-044 | 1 | TBD: the text shown. The server refuses with a text ending in "Account is not mapped for Employee" with the number |
| 17-payroll.xlsx | 153 | TC-APP017-044 | 2 | TBD: the text shown. The server refuses with a text ending in "employee and amount are required" |
| 17-payroll.xlsx | 154 | TC-APP017-045 | 1 | TBD: a second voucher for the same amount; nothing guards against a double booking |
| 17-payroll.xlsx | 155 | TC-APP017-045 | 2 | TBD: booked; the lock does not cover "Doctor fee" |
| 17-payroll.xlsx | 156 | TC-APP017-045 | 3 | TBD: the text shown. The server refuses with a text ending in "Account is not mapped for Employee"; the employee itself is not looked up |
| 17-payroll.xlsx | 160 | TC-APP017-046 | 4 | TBD: none of them. The slip has three amounts and no name |
| 17-payroll.xlsx | 161 | TC-APP017-047 | 1 | TBD: no row; the search looks at the employee number, the period and the amounts only |
| 17-payroll.xlsx | 162 | TC-APP017-047 | 2 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 17-payroll.xlsx | 166 | TC-APP017-048 | 4 | TBD: it is listed nowhere; the table shows payslips. No screen lets an employee claim against it |
| 17-payroll.xlsx | 167 | TC-APP017-049 | 1 | TBD: the text shown. The server refuses with a text ending in "Monthly Limit should be less than or equal to 2000000" |
| 17-payroll.xlsx | 168 | TC-APP017-049 | 2 | TBD: the text shown. The server refuses with a text ending in "Monthly Limit should be less than or equal to" and the amount, which does not name the missing co |
| 17-payroll.xlsx | 169 | TC-APP017-049 | 3 | TBD: the text shown. The server refuses with a text ending in "Code already exists" |
| 17-payroll.xlsx | 170 | TC-APP017-049 | 4 | TBD: the text shown. The server refuses with a text ending in "Monthly Limit should be less than or equal to -1" |
| 17-payroll.xlsx | 171 | TC-APP017-050 | 1 | TBD: expected is a request to choose one branch. On 2026-10-12 the list showed the empty-list text and its request failed |
| 17-payroll.xlsx | 172 | TC-APP017-050 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 17-payroll.xlsx | 173 | TC-APP017-051 | 1 | TBD: expected is that "Base amount" proposes the basic salary of the payroll record. From the code it starts at 10000000 as before |
| 17-payroll.xlsx | 175 | TC-APP017-051 | 3 | TBD: expected is a payslip with the net of the batch. From the code a batch creates no payslip |
| 17-payroll.xlsx | 176 | TC-APP017-051 | 4 | TBD: the two amounts are independent; nothing compares them |
| 17-payroll.xlsx | 177 | TC-APP017-052 | 1 | TBD: the screens open and list the payslips with earning, deduction and net per employee number, and the loans with their instalment; the list route asks for th |
| 17-payroll.xlsx | 178 | TC-APP017-052 | 2 | TBD: the slip is shown |
| 17-payroll.xlsx | 179 | TC-APP017-052 | 3 | TBD: the text shown. The server refuses for lack of the right; the payslip is unchanged |
| 17-payroll.xlsx | 180 | TC-APP017-052 | 4 | TBD: both refused; no month is locked and no voucher is created in Finance |
| 17-payroll.xlsx | 192 | TC-APP017-063 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 17-payroll.xlsx | 193 | TC-APP017-064 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 17-payroll.xlsx | 194 | TC-APP017-065 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 17-payroll.xlsx | 195 | TC-APP017-066 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 17-payroll.xlsx | 196 | TC-APP017-067 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 17-payroll.xlsx | 197 | TC-APP017-068 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 17-payroll.xlsx | 198 | TC-APP017-069 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 18-settings.xlsx | 127 | TC-APP018-032 | 1 | The browser stops the click, or toast "Failed to save user." TBD: which of the two |
| 18-settings.xlsx | 130 | TC-APP018-033 | 1 | TBD: accepted. No length or complexity is asked for |
| 18-settings.xlsx | 131 | TC-APP018-033 | 2 | TBD: accepted |
| 18-settings.xlsx | 133 | TC-APP018-034 | 2 | TBD: the role is limited to that store; what the user then sees in Pharmacy and Inventory |
| 18-settings.xlsx | 139 | TC-APP018-035 | 6 | TBD: whether the open session ends at once or lives on until it expires |
| 18-settings.xlsx | 140 | TC-APP018-036 | 1 | TBD: whether this is refused. If it is saved, nobody may be left who can undo it |
| 18-settings.xlsx | 141 | TC-APP018-036 | 2 | TBD: as above |
| 18-settings.xlsx | 142 | TC-APP018-036 | 3 | TBD: saved without a warning |
| 18-settings.xlsx | 143 | TC-APP018-036 | 4 | TBD: there is none; the account can only be set inactive or blocked |
| 18-settings.xlsx | 149 | TC-APP018-037 | 6 | TBD: whether the inactive role is still offered as a tick box, and what a user who holds it may still do |
| 18-settings.xlsx | 152 | TC-APP018-038 | 3 | TBD: whether this is refused; every administrator of the hospital holds it |
| 18-settings.xlsx | 157 | TC-APP018-039 | 5 | TBD: refused at once, or only after the next sign-in |
| 18-settings.xlsx | 158 | TC-APP018-039 | 6 | TBD: each privilege shows its code twice (for example DIET_WRITE DIET_WRITE) and no description of what it allows |
| 18-settings.xlsx | 159 | TC-APP018-040 | 1 | TBD: nothing is said. In this pass the click tried to send and was held back |
| 18-settings.xlsx | 160 | TC-APP018-040 | 2 | TBD: whether this is refused. If it is saved, no administrator can grant rights any more |
| 18-settings.xlsx | 161 | TC-APP018-040 | 3 | TBD: the later save wins; the first change is lost without a warning |
| 18-settings.xlsx | 166 | TC-APP018-041 | 5 | TBD: none of them; 50 rows are shown and the list cannot be searched |
| 18-settings.xlsx | 168 | TC-APP018-042 | 2 | TBD: what the user sees on the next click |
| 18-settings.xlsx | 169 | TC-APP018-042 | 3 | TBD: the failed attempts are not in the log; the audit trail shows sign-ins with their result |
| 18-settings.xlsx | 173 | TC-APP018-043 | 4 | TBD: the screens come up in English |
| 18-settings.xlsx | 178 | TC-APP018-044 | 4 | TBD: saved; the name falls back to "KlikMed" |
| 18-settings.xlsx | 179 | TC-APP018-045 | 1 | TBD: the colour changes at once for the signed-in user only (it is sent to the user's own preferences), not for the hospital |
| 18-settings.xlsx | 183 | TC-APP018-046 | 4 | TBD: a dialog with all widgets opens; the widget is hidden on this user's dashboard |
| 18-settings.xlsx | 184 | TC-APP018-046 | 5 | TBD: the second user still sees the light theme and all widgets. Both settings are saved on the account, not for the hospital |
| 18-settings.xlsx | 188 | TC-APP018-047 | 4 | TBD: a new notice about the claim |
| 18-settings.xlsx | 189 | TC-APP018-047 | 5 | The row is gone. TBD: removed at once, with no question |
| 18-settings.xlsx | 191 | TC-APP018-048 | 2 | TBD: whether a second row appears and the role is told twice |
| 18-settings.xlsx | 192 | TC-APP018-048 | 3 | TBD: the list cannot be read; reading the rules needs the write right |
| 18-settings.xlsx | 196 | TC-APP018-049 | 4 | TBD: none of them. The directory describes the item as "Password rules." |
| 18-settings.xlsx | 200 | TC-APP018-051 | 1 | TBD: accepted |
| 18-settings.xlsx | 201 | TC-APP018-051 | 2 | TBD: accepted |
| 18-settings.xlsx | 202 | TC-APP018-051 | 3 | TBD: saved as typed; with no second input the user is locked out and needs an administrator |
| 18-settings.xlsx | 206 | TC-APP018-052 | 4 | TBD: the booking is refused or warned of; the appointment rules read the holidays (backend/internal/usecase/registration/holiday.go) |
| 18-settings.xlsx | 209 | TC-APP018-053 | 2 | TBD: whether a second row appears |
| 18-settings.xlsx | 210 | TC-APP018-053 | 3 | TBD: saved without a warning; the appointments stay |
| 18-settings.xlsx | 211 | TC-APP018-053 | 4 | TBD: accepted |
| 18-settings.xlsx | 216 | TC-APP018-054 | 5 | TBD: the order now waits for two approvals, in the order of the chain |
| 18-settings.xlsx | 217 | TC-APP018-054 | 6 | TBD: it names discharge and purchase order as the available process keys, while the list also holds nine budget processes |
| 18-settings.xlsx | 219 | TC-APP018-055 | 2 | TBD: what happens to the waiting document |
| 18-settings.xlsx | 220 | TC-APP018-055 | 3 | TBD: whether new documents are then approved at once or cannot be approved at all |
| 18-settings.xlsx | 225 | TC-APP018-056 | 5 | TBD: none of them |
| 18-settings.xlsx | 227 | TC-APP018-057 | 2 | TBD: the text shown; the list must not be readable |
| 18-settings.xlsx | 228 | TC-APP018-057 | 3 | TBD: whether part of a name is enough, and whether the search itself is recorded |
| 18-settings.xlsx | 230 | TC-APP018-058 | 2 | TBD: neither is shown. The directory describes the item as "How long the trail is kept." |
| 18-settings.xlsx | 231 | TC-APP018-058 | 3 | The screen "Facility time" with one paragraph of text and no input. TBD: where the time zone of a branch is set |
| 18-settings.xlsx | 233 | TC-APP018-058 | 5 | TBD: empty in this pass. What a feature is, and what hiding one does, cannot be tested until the list holds rows |
| 18-settings.xlsx | 237 | TC-APP018-059 | 4 | TBD: both screens open; on Tenants the edition of a hospital can be changed |
| 18-settings.xlsx | 238 | TC-APP018-060 | 1 | TBD: whether the card is shown, and which groups of the directory |
| 18-settings.xlsx | 239 | TC-APP018-060 | 2 | TBD: the text shown. The lists must not be readable without the read rights for users and roles |
| 18-settings.xlsx | 240 | TC-APP018-060 | 3 | TBD: refused for lack of BRANDING_WRITE; the name is unchanged |
| 18-settings.xlsx | 241 | TC-APP018-060 | 4 | TBD: refused for lack of WORKFLOW_WRITE. The list of chains is readable by every user |
| 18-settings.xlsx | 243 | TC-APP018-060 | 6 | TBD: refused for lack of AUDIT_READ |
| 18-settings.xlsx | 275 | TC-APP018-092 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 19-finance.xlsx | 135 | TC-APP019-038 | 4 | TBD: the rates are listed nowhere, and the screen states that vouchers stay in IDR and the rate is only stored |
| 19-finance.xlsx | 136 | TC-APP019-039 | 1 | TBD: refused, or the base currency is renamed |
| 19-finance.xlsx | 137 | TC-APP019-039 | 2 | TBD: whether it is refused |
| 19-finance.xlsx | 138 | TC-APP019-039 | 3 | TBD: whether the code must have three letters |
| 19-finance.xlsx | 152 | TC-APP019-042 | 5 | TBD: whether the screen shows what is mapped already, and how a map is changed or removed |
| 19-finance.xlsx | 153 | TC-APP019-043 | 1 | TBD: replaced without a question, or refused |
| 19-finance.xlsx | 173 | TC-APP019-047 | 3 | The text "This posting would make cash or bank negative." TBD: at the save or at the approval |
| 19-finance.xlsx | 174 | TC-APP019-048 | 1 | The row shows "Rejected". TBD: whether a rejected journal can be changed and sent again; no reason is asked |
| 19-finance.xlsx | 176 | TC-APP019-048 | 3 | A second set of ledger rows with debit and credit swapped. TBD: on which date, and how the two journals point at each other in the list |
| 19-finance.xlsx | 178 | TC-APP019-048 | 5 | The column "Document" shows "Pre-closed". TBD: what pre-closing means for the journal |
| 19-finance.xlsx | 179 | TC-APP019-049 | 1 | Refused. TBD: the text shown |
| 19-finance.xlsx | 182 | TC-APP019-049 | 4 | TBD: the text shown; the server refuses for lack of the approval right |
| 19-finance.xlsx | 188 | TC-APP019-050 | 6 | TBD: whether the documents are also rows of the voucher register, with which type |
| 19-finance.xlsx | 198 | TC-APP019-052 | 5 | Opening debit equals opening credit, and movement debit equals movement credit. TBD: the screen shows no totals and no closing balance |
| 19-finance.xlsx | 199 | TC-APP019-053 | 1 | TBD: accepted and added, or refused |
| 19-finance.xlsx | 201 | TC-APP019-053 | 3 | TBD: the rows of every branch, or a request to choose one |
| 19-finance.xlsx | 202 | TC-APP019-053 | 4 | TBD: there is none |
| 19-finance.xlsx | 218 | TC-APP019-056 | 4 | The advance is spread over the open bills. TBD: in which order |
| 19-finance.xlsx | 224 | TC-APP019-057 | 4 | TBD: nothing is said. In this pass the click tried to send and was held back |
| 19-finance.xlsx | 230 | TC-APP019-058 | 6 | TBD: whether the payment appears by itself, or only receipts recorded through the connector form do |
| 19-finance.xlsx | 232 | TC-APP019-059 | 2 | TBD: the button is greyed out or the click is refused |
| 19-finance.xlsx | 235 | TC-APP019-060 | 1 | TBD: no voucher is created; the rows go to ERP staging, and the screen says so |
| 19-finance.xlsx | 236 | TC-APP019-061 | 1 | TBD: refused, or posted twice |
| 19-finance.xlsx | 237 | TC-APP019-061 | 2 | TBD: accepted; the form does not look the patient up |
| 19-finance.xlsx | 241 | TC-APP019-062 | 4 | TBD: accepted; the code is typed text and is not checked against Hospital Accounts |
| 19-finance.xlsx | 242 | TC-APP019-062 | 5 | TBD: there is none; a service maps once |
| 19-finance.xlsx | 249 | TC-APP019-064 | 4 | Rows and lines with the same amount are ticked as cleared, with the clearing date. TBD: what else must agree for a match |
| 19-finance.xlsx | 261 | TC-APP019-066 | 6 | TBD: the employee pays back 200000, or is paid the shortfall when the bills exceed the advance |
| 19-finance.xlsx | 265 | TC-APP019-067 | 4 | TBD: accepted, or held until the bills of the first are in |
| 19-finance.xlsx | 284 | TC-APP019-071 | 3 | TBD: the receipt is not offered in the list |
| 19-finance.xlsx | 285 | TC-APP019-071 | 4 | TBD: one posting; the second is refused |
| 19-finance.xlsx | 286 | TC-APP019-071 | 5 | TBD: nothing is said, or the click is refused |
| 19-finance.xlsx | 292 | TC-APP019-073 | 2 | TBD: refused, since both together exceed the guarantee |
| 19-finance.xlsx | 294 | TC-APP019-073 | 4 | TBD: accepted; the validity is stored and not checked |
| 19-finance.xlsx | 299 | TC-APP019-074 | 5 | TBD: empty; the screen says purchase orders show when Procurement publishes them |
| 19-finance.xlsx | 308 | TC-APP019-076 | 6 | TBD: the form has one instalment and one due date; neither the principal nor a schedule is asked |
| 19-finance.xlsx | 310 | TC-APP019-077 | 2 | TBD: not offered, or refused |
| 19-finance.xlsx | 311 | TC-APP019-077 | 3 | TBD: a second copy, or refused because the row is marked "Renewed" |
| 19-finance.xlsx | 312 | TC-APP019-077 | 4 | TBD: accepted or refused |
| 19-finance.xlsx | 321 | TC-APP019-079 | 3 | TBD: accepted or refused |
| 19-finance.xlsx | 327 | TC-APP019-080 | 6 | TBD: the file that is downloaded |
| 19-finance.xlsx | 333 | TC-APP019-082 | 1 | TBD: whether the close locks the year, or journals can still be posted into it |
| 19-finance.xlsx | 334 | TC-APP019-082 | 2 | TBD: there is none |
| 19-finance.xlsx | 337 | TC-APP019-083 | 3 | TBD: a header only; no accounts and no debit and credit lines |
| 19-finance.xlsx | 338 | TC-APP019-083 | 4 | TBD: none is listed; they are not journals |
| 19-finance.xlsx | 339 | TC-APP019-083 | 5 | TBD: none of the three amounts shows. From the code the trial balance is summed from ledger rows, and these vouchers have none |
| 19-finance.xlsx | 340 | TC-APP019-083 | 6 | TBD: there is none |
| 19-finance.xlsx | 341 | TC-APP019-084 | 1 | TBD: the button is shown; a click is refused for lack of the approval right, with a text that is TBD |
| 19-finance.xlsx | 343 | TC-APP019-084 | 3 | TBD: accepted. The server does not compare the author with the approver |
| 19-finance.xlsx | 344 | TC-APP019-084 | 4 | TBD: all three are accepted; posting needs the write right only |
| 19-finance.xlsx | 345 | TC-APP019-084 | 5 | TBD: the lists are shown, patient collections with names and MRN; the read routes ask for the licence only |
| 19-finance.xlsx | 346 | TC-APP019-084 | 6 | TBD: the text shown; nothing is saved |
| 19-finance.xlsx | 391 | TC-APP019-128 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 20-budget.xlsx | 57 | TC-APP020-013 | 5 | TBD: a notice of the circular |
| 20-budget.xlsx | 98 | TC-APP020-021 | 6 | TBD: the allocation journal on the accounts of the posting rule, and its state |
| 20-budget.xlsx | 127 | TC-APP020-027 | 5 | TBD: the bank receipt of 25000000.00 on the bank account |
| 20-budget.xlsx | 151 | TC-APP020-033 | 2 | TBD: a form with the sanction, the payment voucher, the amount and lines with a utilisation type and an amount each. In this pass the click tried to send a requ |
| 20-budget.xlsx | 160 | TC-APP020-034 | 6 | The text "Choose an approved bank or cash payment voucher." TBD: whether such a voucher is offered at all |
| 20-budget.xlsx | 175 | TC-APP020-037 | 3 | Balance = allocated + transferred in - transferred out - reserved - utilised. TBD: confirm the formula with a line that has all five |
| 20-budget.xlsx | 179 | TC-APP020-038 | 2 | TBD: one entry of the kind "opening data" |
| 20-budget.xlsx | 180 | TC-APP020-038 | 3 | TBD: the document lists have "Download CSV"; the position has none |
| 20-budget.xlsx | 187 | TC-APP020-040 | 1 | TBD: whether an approved circular is cancelled, or the text that the action is not allowed in the current state |
| 20-budget.xlsx | 189 | TC-APP020-040 | 3 | TBD: accepted or refused; no rule against it was found |
| 20-budget.xlsx | 193 | TC-APP020-042 | 1 | TBD: whether Procurement asks for a budget head at all, and at which step it reserves |
| 20-budget.xlsx | 194 | TC-APP020-042 | 2 | TBD: the amount of the order under "Reserved" |
| 20-budget.xlsx | 195 | TC-APP020-042 | 3 | TBD: an entry of the kind "Reservation (other module)" naming the purchase order |
| 20-budget.xlsx | 196 | TC-APP020-042 | 4 | TBD: the reservation is released |
| 20-budget.xlsx | 197 | TC-APP020-042 | 5 | TBD: refused for lack of budget, or approved without a check |
| 20-budget.xlsx | 200 | TC-APP020-043 | 3 | TBD: one journal of 1000000.00 on the accounts of the rule; who approves it in Finance, if anyone |
| 20-budget.xlsx | 204 | TC-APP020-044 | 1 | TBD: how long a posting may wait, and what the officer can do meanwhile |
| 20-budget.xlsx | 205 | TC-APP020-044 | 2 | TBD: "Finance posting" reads "Reversal failed"; whether "Post again" also repeats a reversal |
| 20-budget.xlsx | 206 | TC-APP020-044 | 3 | TBD: one journal in Finance, not two |
| 20-budget.xlsx | 207 | TC-APP020-045 | 1 | TBD: the text shown; the server refuses for lack of the approval right |
| 20-budget.xlsx | 210 | TC-APP020-045 | 4 | TBD: whether the card is shown |
| 20-budget.xlsx | 211 | TC-APP020-045 | 5 | TBD: the lists are shown with amounts, departments and requesters; the read routes ask for the licence only |
| 20-budget.xlsx | 212 | TC-APP020-045 | 6 | TBD: the file is downloaded |
| 20-budget.xlsx | 232 | TC-APP020-064 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 21-cssd.xlsx | 21 | TC-APP021-004 | 4 | TBD: a result type has a code and a name only; the cycle form has its own Pass and Fail |
| 21-cssd.xlsx | 25 | TC-APP021-005 | 4 | TBD: an item of the form KIT in the category KITS with the name of the set |
| 21-cssd.xlsx | 49 | TC-APP021-011 | 3 | TBD: refused, or the stock in transit is returned |
| 21-cssd.xlsx | 62 | TC-APP021-014 | 1 | Toast "Cancelled. An approved receipt puts the request back open for receipt."; TBD: the stock is back in the transit store |
| 21-cssd.xlsx | 63 | TC-APP021-014 | 2 | TBD: refused, or the sterile stock is left without a receipt |
| 21-cssd.xlsx | 71 | TC-APP021-016 | 3 | TBD: accepted, and the cycles of the day are open; whether the failed test stays on record |
| 21-cssd.xlsx | 72 | TC-APP021-016 | 4 | TBD: accepted or refused |
| 21-cssd.xlsx | 73 | TC-APP021-016 | 5 | TBD: there is none |
| 21-cssd.xlsx | 115 | TC-APP021-025 | 4 | TBD: the lines of a sterile receipt take the issue whole; a pack lost on the way cannot be recorded |
| 21-cssd.xlsx | 117 | TC-APP021-026 | 2 | Toast "Cancelled. The sterile issue is pending again."; TBD: the stock is back in the transit store |
| 21-cssd.xlsx | 121 | TC-APP021-027 | 4 | TBD: both cycles are shown, the failed one first |
| 21-cssd.xlsx | 122 | TC-APP021-028 | 1 | TBD: nothing is said. In this pass the click tried to send and was held back |
| 21-cssd.xlsx | 123 | TC-APP021-028 | 2 | TBD: a text that nothing was found |
| 21-cssd.xlsx | 124 | TC-APP021-028 | 3 | TBD: not shown; the trace ends at the ward's store |
| 21-cssd.xlsx | 134 | TC-APP021-030 | 3 | It cannot be issued; TBD: how it gets back into a new cycle |
| 21-cssd.xlsx | 135 | TC-APP021-030 | 4 | TBD: whether Operation Theater knows sterile sets and their packing numbers at all |
| 21-cssd.xlsx | 140 | TC-APP021-031 | 5 | TBD: the values of "Document Status" (open, cancelled) and "Approval Status" (draft, sent, approved, rejected) and how they combine |
| 21-cssd.xlsx | 142 | TC-APP021-032 | 2 | TBD: all rows that match, or only the page on screen |
| 21-cssd.xlsx | 143 | TC-APP021-032 | 3 | TBD: the documents of every branch, or only of the branches the user may see |
| 21-cssd.xlsx | 147 | TC-APP021-034 | 1 | TBD: the text shown; the server refuses for lack of the approval right, and no stock moves |
| 21-cssd.xlsx | 149 | TC-APP021-034 | 3 | TBD: accepted or refused; no rule against it was found in the route table |
| 21-cssd.xlsx | 150 | TC-APP021-034 | 4 | TBD: refused; approving a cycle needs the approval right |
| 21-cssd.xlsx | 151 | TC-APP021-034 | 5 | TBD: shown; the read routes ask for the licence only |
| 21-cssd.xlsx | 152 | TC-APP021-034 | 6 | TBD: refused for lack of the write right |
| 21-cssd.xlsx | 176 | TC-APP021-057 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 22-services.xlsx | 8 | TC-APP022-002 | 1 | TBD: the text shown. The server refuses with a text ending in "code, name, account and center are required" |
| 22-services.xlsx | 9 | TC-APP022-002 | 2 | TBD: the text shown. The server refuses with a text ending in "category cannot parent itself" |
| 22-services.xlsx | 10 | TC-APP022-002 | 3 | TBD: the text shown. The server refuses with a text ending in "parent is missing" |
| 22-services.xlsx | 11 | TC-APP022-002 | 4 | TBD: the text shown. The server refuses with a text ending in "duplicate" |
| 22-services.xlsx | 12 | TC-APP022-002 | 5 | TBD: the text shown. The server refuses with a text ending in "children exist" |
| 22-services.xlsx | 13 | TC-APP022-002 | 6 | TBD: the text shown. The server refuses with a text ending in "category is missing" |
| 22-services.xlsx | 14 | TC-APP022-002 | 7 | TBD: accepted; the account is not looked up |
| 22-services.xlsx | 19 | TC-APP022-004 | 1 | TBD: the text shown. The server refuses with a text ending in "accounts are required", also when the code or the name is the empty one |
| 22-services.xlsx | 20 | TC-APP022-004 | 2 | TBD: the text shown. The server refuses with a text ending in "category is missing" |
| 22-services.xlsx | 21 | TC-APP022-004 | 3 | TBD: the text shown. The server refuses with a text ending in "duplicate" |
| 22-services.xlsx | 22 | TC-APP022-004 | 4 | TBD: the list "Action" is not shown, since the screen has one action only |
| 22-services.xlsx | 29 | TC-APP022-006 | 1 | TBD: the text shown. The server refuses with a text ending in "number, category, item, center and department are required" |
| 22-services.xlsx | 30 | TC-APP022-006 | 2 | TBD: the text shown. The server refuses with a text ending in "item is missing" |
| 22-services.xlsx | 31 | TC-APP022-006 | 3 | TBD: the text shown. The server refuses with a text ending in "send the request first" |
| 22-services.xlsx | 32 | TC-APP022-006 | 4 | TBD: the text shown. The server refuses with a text ending in "complete only from approved" |
| 22-services.xlsx | 33 | TC-APP022-006 | 5 | TBD: the text shown. The server refuses with a text ending in "document is missing". The number is not accepted; only the internal id is |
| 22-services.xlsx | 36 | TC-APP022-007 | 3 | TBD: the text shown. The server refuses with a text ending in "complete only from approved". TBD: a partly delivered request can then never be completed |
| 22-services.xlsx | 37 | TC-APP022-007 | 4 | TBD: accepted; one right covers both |
| 22-services.xlsx | 38 | TC-APP022-008 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 22-services.xlsx | 39 | TC-APP022-008 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 22-services.xlsx | 45 | TC-APP022-010 | 1 | TBD: the text shown. The server refuses with a text ending in "item, store and quantity are required" |
| 22-services.xlsx | 46 | TC-APP022-010 | 2 | TBD: the text shown. The server refuses with a text ending in "item is missing" |
| 22-services.xlsx | 47 | TC-APP022-010 | 3 | TBD: the text shown. The server refuses with a text ending in "send the request first" |
| 22-services.xlsx | 48 | TC-APP022-010 | 4 | TBD: accepted; the store is typed text |
| 22-services.xlsx | 49 | TC-APP022-011 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 22-services.xlsx | 50 | TC-APP022-011 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 22-services.xlsx | 55 | TC-APP022-012 | 5 | TBD: a second order row with the new number; what happens to the first |
| 22-services.xlsx | 56 | TC-APP022-013 | 1 | TBD: the text shown. The server refuses with a text ending in "approve the request first" |
| 22-services.xlsx | 57 | TC-APP022-013 | 2 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 22-services.xlsx | 58 | TC-APP022-013 | 3 | TBD: the text shown. The server refuses with a text ending in "vendor, tax, terms, item, quantity and rate are required" |
| 22-services.xlsx | 59 | TC-APP022-013 | 4 | TBD: the text shown. The server refuses with a text ending in "a new number is required" |
| 22-services.xlsx | 60 | TC-APP022-013 | 5 | TBD: the text shown. The server refuses with a text ending in "approve the order first" |
| 22-services.xlsx | 61 | TC-APP022-013 | 6 | TBD: accepted; a rate below 0 is refused |
| 22-services.xlsx | 62 | TC-APP022-014 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 22-services.xlsx | 63 | TC-APP022-014 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 22-services.xlsx | 67 | TC-APP022-015 | 4 | TBD: the table stays empty; the screen never lists receipts |
| 22-services.xlsx | 68 | TC-APP022-015 | 5 | TBD: the id is shown nowhere, so the receipt cannot be approved from the screens |
| 22-services.xlsx | 69 | TC-APP022-015 | 6 | TBD: toast "Saved."; a Finance voucher "service expense" for quantity x rate, with the vendor as party |
| 22-services.xlsx | 70 | TC-APP022-016 | 1 | TBD: the text shown. The server refuses with a text ending in "approve the order first" |
| 22-services.xlsx | 71 | TC-APP022-016 | 2 | TBD: the text shown. The server refuses with a text ending in "quantity, invoice and tax are required" |
| 22-services.xlsx | 72 | TC-APP022-016 | 3 | TBD: the text shown. The server refuses with a text ending in "receive the service first" |
| 22-services.xlsx | 73 | TC-APP022-017 | 1 | TBD: accepted; the quantity is not compared with the order |
| 22-services.xlsx | 74 | TC-APP022-017 | 2 | TBD: accepted; nothing counts what was received before |
| 22-services.xlsx | 78 | TC-APP022-018 | 4 | TBD: the table stays empty; the screen never lists bills |
| 22-services.xlsx | 79 | TC-APP022-018 | 5 | TBD: a voucher "service bill" for the amount, with the vendor as party; a second voucher "service expense" if the receipt of the same order was approved |
| 22-services.xlsx | 80 | TC-APP022-019 | 1 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 22-services.xlsx | 81 | TC-APP022-019 | 2 | TBD: the text shown. The server refuses with a text ending in "amount, tax and terms are required" |
| 22-services.xlsx | 82 | TC-APP022-019 | 3 | TBD: the text shown. The server refuses with a text ending in "approve the order first" |
| 22-services.xlsx | 83 | TC-APP022-020 | 1 | TBD: accepted; a second voucher in Finance |
| 22-services.xlsx | 84 | TC-APP022-020 | 2 | TBD: accepted; the amount is not compared with the order |
| 22-services.xlsx | 85 | TC-APP022-020 | 3 | TBD: a bill of 1500 is booked; the dialog starts with a sample amount |
| 22-services.xlsx | 87 | TC-APP022-021 | 2 | TBD: nothing links it to the service request |
| 22-services.xlsx | 89 | TC-APP022-021 | 4 | TBD: saved and not shown anywhere |
| 22-services.xlsx | 91 | TC-APP022-021 | 6 | The request reads "completed". TBD: nothing checks that the service was received or billed |
| 22-services.xlsx | 92 | TC-APP022-021 | 7 | TBD: no screen shows the chain; the documents know each other by internal ids only |
| 22-services.xlsx | 93 | TC-APP022-022 | 1 | TBD: the lists are shown; the read routes ask for the licence only |
| 22-services.xlsx | 94 | TC-APP022-022 | 2 | TBD: the text shown; the server refuses for lack of the right |
| 22-services.xlsx | 95 | TC-APP022-022 | 3 | TBD: refused; the order stays "sent" |
| 22-services.xlsx | 96 | TC-APP022-022 | 4 | TBD: refused; no voucher in Finance |
| 22-services.xlsx | 97 | TC-APP022-022 | 5 | TBD: no entry. The actions of Services write no audit entry, so who approved is not recorded |
| 22-services.xlsx | 109 | TC-APP022-033 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 22-services.xlsx | 110 | TC-APP022-034 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 22-services.xlsx | 111 | TC-APP022-035 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 22-services.xlsx | 112 | TC-APP022-036 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 23-sourcing.xlsx | 5 | TC-APP023-001 | 4 | Toast "Saved."; TBD: the checklist is listed nowhere on this screen |
| 23-sourcing.xlsx | 7 | TC-APP023-001 | 6 | TBD: categories and bidders stand in one list; only the status column tells them apart |
| 23-sourcing.xlsx | 8 | TC-APP023-002 | 1 | TBD: the text shown. The server refuses with a text ending in "code and name are required" |
| 23-sourcing.xlsx | 9 | TC-APP023-002 | 2 | TBD: the text shown. The server refuses with a text ending in "duplicate" |
| 23-sourcing.xlsx | 10 | TC-APP023-002 | 3 | TBD: there is none |
| 23-sourcing.xlsx | 12 | TC-APP023-003 | 2 | TBD: a supplier with the name of the bidder |
| 23-sourcing.xlsx | 14 | TC-APP023-004 | 1 | TBD: the text shown. The server refuses with a text ending in "bidder is already a supplier" |
| 23-sourcing.xlsx | 15 | TC-APP023-004 | 2 | TBD: the text shown. The server refuses with a text ending in "bidder is missing" |
| 23-sourcing.xlsx | 16 | TC-APP023-004 | 3 | TBD: the text shown. The server refuses with a text ending in "code is required" |
| 23-sourcing.xlsx | 17 | TC-APP023-004 | 4 | TBD: a second supplier of the same name, or refused |
| 23-sourcing.xlsx | 22 | TC-APP023-005 | 5 | Toast "Saved."; TBD: where the advert shows |
| 23-sourcing.xlsx | 23 | TC-APP023-005 | 6 | Toast "Saved."; TBD: where the corrigendum shows, and whether it may move the close date |
| 23-sourcing.xlsx | 24 | TC-APP023-006 | 1 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 23-sourcing.xlsx | 25 | TC-APP023-006 | 2 | TBD: the text shown; the tender needs an approved purchase request |
| 23-sourcing.xlsx | 26 | TC-APP023-006 | 3 | TBD: the text shown. The server refuses with a text ending in "at least one vendor is required" |
| 23-sourcing.xlsx | 27 | TC-APP023-006 | 4 | TBD: the text shown. The server refuses with a text ending in "number, category and close date are required" |
| 23-sourcing.xlsx | 28 | TC-APP023-006 | 5 | TBD: the text shown. The server refuses with a text ending in "category is missing" |
| 23-sourcing.xlsx | 29 | TC-APP023-006 | 6 | TBD: the text shown. The server refuses with a text ending in "send the tender first" |
| 23-sourcing.xlsx | 30 | TC-APP023-006 | 7 | TBD: the text shown. The server refuses with a text ending in "media and text are required" |
| 23-sourcing.xlsx | 31 | TC-APP023-006 | 8 | TBD: accepted; the date is typed text |
| 23-sourcing.xlsx | 32 | TC-APP023-007 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 23-sourcing.xlsx | 33 | TC-APP023-007 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 23-sourcing.xlsx | 39 | TC-APP023-008 | 6 | Toast "Saved."; TBD: where the comparison sheet can be read |
| 23-sourcing.xlsx | 41 | TC-APP023-009 | 1 | TBD: the text shown. The server refuses with a text ending in "publish the tender first" |
| 23-sourcing.xlsx | 42 | TC-APP023-009 | 2 | TBD: the text shown. The server refuses with a text ending in "bidder is missing" |
| 23-sourcing.xlsx | 43 | TC-APP023-009 | 3 | TBD: the text shown. The server refuses with a text ending in "submit the bid first" |
| 23-sourcing.xlsx | 44 | TC-APP023-009 | 4 | TBD: the text shown. The server refuses with a text ending in "last date is not completed" |
| 23-sourcing.xlsx | 45 | TC-APP023-009 | 5 | TBD: the text shown. The server refuses with a text ending in "open the bid first" |
| 23-sourcing.xlsx | 46 | TC-APP023-009 | 6 | TBD: the text shown. The server refuses with a text ending in "reason is required" |
| 23-sourcing.xlsx | 47 | TC-APP023-009 | 7 | TBD: the text shown. The server refuses with a text ending in "grade is required" |
| 23-sourcing.xlsx | 48 | TC-APP023-009 | 8 | TBD: the text shown. The server refuses with a text ending in "bidder and rating are required". Only accepted, rejected and waiting are taken |
| 23-sourcing.xlsx | 49 | TC-APP023-010 | 1 | TBD: accepted; only the acceptance looks at the date |
| 23-sourcing.xlsx | 50 | TC-APP023-010 | 2 | TBD: accepted or refused |
| 23-sourcing.xlsx | 51 | TC-APP023-010 | 3 | TBD: accepted or refused |
| 23-sourcing.xlsx | 52 | TC-APP023-011 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 23-sourcing.xlsx | 53 | TC-APP023-011 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 23-sourcing.xlsx | 59 | TC-APP023-012 | 6 | TBD: the amount under "Reserved", with a history entry of a reservation by another module |
| 23-sourcing.xlsx | 60 | TC-APP023-012 | 7 | TBD: a new agreement row with the new number |
| 23-sourcing.xlsx | 61 | TC-APP023-013 | 1 | TBD: the text shown. The server refuses with a text ending in "accept a bidder on the sheet first" |
| 23-sourcing.xlsx | 62 | TC-APP023-013 | 2 | TBD: the text shown. The server refuses with a text ending in "number, vendor, item and rate are required" |
| 23-sourcing.xlsx | 63 | TC-APP023-013 | 3 | TBD: the text shown. The server refuses with a text ending in "send the agreement first" |
| 23-sourcing.xlsx | 64 | TC-APP023-013 | 4 | TBD: the text shown. The server refuses with a text ending in "approve the agreement first" |
| 23-sourcing.xlsx | 65 | TC-APP023-013 | 5 | TBD: the text shown. The server refuses with a text ending in "head and amount are required" |
| 23-sourcing.xlsx | 66 | TC-APP023-013 | 6 | TBD: the text shown; Budget refuses the hold |
| 23-sourcing.xlsx | 67 | TC-APP023-013 | 7 | TBD: the text shown. The server refuses with a text ending in "a new number is required" |
| 23-sourcing.xlsx | 68 | TC-APP023-014 | 1 | TBD: accepted; the vendor is typed text and is not compared with the accepted bidder |
| 23-sourcing.xlsx | 69 | TC-APP023-014 | 2 | TBD: budget is held twice |
| 23-sourcing.xlsx | 70 | TC-APP023-015 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 23-sourcing.xlsx | 71 | TC-APP023-015 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 23-sourcing.xlsx | 76 | TC-APP023-016 | 5 | TBD: two vouchers with the bidder as party, "tender fee" and "emd" |
| 23-sourcing.xlsx | 78 | TC-APP023-017 | 1 | TBD: the text shown. The server refuses with a text ending in "bidder and amount are required" |
| 23-sourcing.xlsx | 79 | TC-APP023-017 | 2 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 23-sourcing.xlsx | 80 | TC-APP023-017 | 3 | TBD: the text shown. The server refuses with a text ending in "collect the deposit first" |
| 23-sourcing.xlsx | 81 | TC-APP023-018 | 1 | TBD: both are booked; nothing marks a deposit as disposed |
| 23-sourcing.xlsx | 82 | TC-APP023-018 | 2 | TBD: two vouchers |
| 23-sourcing.xlsx | 83 | TC-APP023-018 | 3 | TBD: accepted; the code is used as the party of the voucher as typed |
| 23-sourcing.xlsx | 85 | TC-APP023-019 | 1 | TBD: expected is a request to choose one branch. In the pass with "All branches" the table was empty and its list request failed |
| 23-sourcing.xlsx | 86 | TC-APP023-019 | 2 | TBD: the text shown. The server refuses with a text ending in "branch is required" |
| 23-sourcing.xlsx | 93 | TC-APP023-020 | 7 | TBD: whether the request shows its tender and its agreement, and whether the order takes the agreed price |
| 23-sourcing.xlsx | 94 | TC-APP023-021 | 1 | TBD: the lists are shown, bids with their prices; the read route asks for the licence only |
| 23-sourcing.xlsx | 95 | TC-APP023-021 | 2 | TBD: the text shown; the server refuses for lack of the right |
| 23-sourcing.xlsx | 96 | TC-APP023-021 | 3 | TBD: refused; the bid stays "opened" |
| 23-sourcing.xlsx | 97 | TC-APP023-021 | 4 | TBD: shown to any user of the tenant; nothing keeps bids sealed until they are opened |
| 23-sourcing.xlsx | 98 | TC-APP023-021 | 5 | TBD: no entry; the actions of Sourcing write no audit entry |
| 23-sourcing.xlsx | 108 | TC-APP023-030 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 23-sourcing.xlsx | 109 | TC-APP023-031 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 23-sourcing.xlsx | 110 | TC-APP023-032 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 23-sourcing.xlsx | 111 | TC-APP023-033 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 23-sourcing.xlsx | 112 | TC-APP023-034 | 1 | HTTP 200; the list loads, or the screen asks for one branch; no request of the page fails. TBD: which of the two is intended. |
| 24-housekeeping.xlsx | 9 | TC-APP024-001 | 8 | TBD: the table lists locations only; what was saved for a location is shown nowhere |
| 24-housekeeping.xlsx | 10 | TC-APP024-002 | 1 | TBD: the text shown. The server refuses with a text ending in "code, name, center and manpower are required" |
| 24-housekeeping.xlsx | 11 | TC-APP024-002 | 2 | TBD: the text shown. The server refuses with a text ending in "location, shift and people are required" |
| 24-housekeeping.xlsx | 12 | TC-APP024-002 | 3 | TBD: the text shown. The server refuses with a text ending in "location, activity and frequency are required". Only daily, weekly, monthly and yearly are taken |
| 24-housekeeping.xlsx | 13 | TC-APP024-002 | 4 | TBD: the text shown. The server refuses with a text ending in "The Material is Already Added" |
| 24-housekeeping.xlsx | 14 | TC-APP024-002 | 5 | TBD: the text shown. The server refuses with a text ending in "location is missing" |
| 24-housekeeping.xlsx | 15 | TC-APP024-002 | 6 | TBD: the text shown. The server refuses with a text ending in "duplicate" |
| 24-housekeeping.xlsx | 16 | TC-APP024-003 | 1 | TBD: the text shown. The server refuses with a text ending in "shift manpower and total manpower are not Matching" |
| 24-housekeeping.xlsx | 17 | TC-APP024-003 | 2 | TBD: the text shown. The server refuses with a text ending in "at least one activity is required" |
| 24-housekeeping.xlsx | 21 | TC-APP024-004 | 4 | Toast "Saved."; TBD: where the price lines of a contract can be read |
| 24-housekeeping.xlsx | 23 | TC-APP024-005 | 1 | TBD: the text shown. The server refuses with a text ending in "number, vendor, start and end are required" |
| 24-housekeeping.xlsx | 24 | TC-APP024-005 | 2 | TBD: the text shown. The server refuses with a text ending in "end is before start" |
| 24-housekeeping.xlsx | 25 | TC-APP024-005 | 3 | TBD: the text shown. The server refuses with a text ending in "send the contract first" |
| 24-housekeeping.xlsx | 26 | TC-APP024-005 | 4 | TBD: the text shown. The server refuses with a text ending in "price line is required" |
| 24-housekeeping.xlsx | 27 | TC-APP024-005 | 5 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 24-housekeeping.xlsx | 28 | TC-APP024-006 | 1 | TBD: accepted as text; the two are compared as text, so the order may come out wrong |
| 24-housekeeping.xlsx | 29 | TC-APP024-006 | 2 | TBD: accepted or refused |
| 24-housekeeping.xlsx | 30 | TC-APP024-006 | 3 | TBD: refused with a text ending in "duplicate", or accepted |
| 24-housekeeping.xlsx | 35 | TC-APP024-008 | 1 | TBD: the text shown. The server refuses with a text ending in "Please Select the Shift and Date" |
| 24-housekeeping.xlsx | 36 | TC-APP024-008 | 2 | TBD: the text shown. The server refuses with a text ending in "The Shift is Already Added in the Selected Date" |
| 24-housekeeping.xlsx | 37 | TC-APP024-008 | 3 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 24-housekeeping.xlsx | 38 | TC-APP024-009 | 1 | TBD: accepted; the shift is typed text |
| 24-housekeeping.xlsx | 39 | TC-APP024-009 | 2 | TBD: accepted |
| 24-housekeeping.xlsx | 40 | TC-APP024-009 | 3 | TBD: accepted |
| 24-housekeeping.xlsx | 41 | TC-APP024-009 | 4 | TBD: refused, or toast "Saved." again |
| 24-housekeeping.xlsx | 45 | TC-APP024-010 | 4 | TBD: a voucher for 9000000 with the vendor of the contract as party |
| 24-housekeeping.xlsx | 47 | TC-APP024-010 | 6 | The bills are printed as text below the table. TBD: no file is downloaded |
| 24-housekeeping.xlsx | 48 | TC-APP024-011 | 1 | TBD: the text shown. The server refuses with a text ending in "approve the contract first" |
| 24-housekeeping.xlsx | 49 | TC-APP024-011 | 2 | TBD: the text shown. The server refuses with a text ending in "amount must be positive" |
| 24-housekeeping.xlsx | 50 | TC-APP024-011 | 3 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 24-housekeeping.xlsx | 51 | TC-APP024-012 | 1 | TBD: accepted; the bill is not compared with the logs |
| 24-housekeeping.xlsx | 52 | TC-APP024-012 | 2 | TBD: accepted; the amount is typed and not calculated |
| 24-housekeeping.xlsx | 53 | TC-APP024-012 | 3 | TBD: two vouchers in Finance |
| 24-housekeeping.xlsx | 54 | TC-APP024-012 | 4 | TBD: accepted |
| 24-housekeeping.xlsx | 60 | TC-APP024-013 | 5 | TBD: nothing on the screens shows the logs of a contract, their total or a proposed bill amount |
| 24-housekeeping.xlsx | 61 | TC-APP024-013 | 6 | TBD: a contract names no location; the two are not linked |
| 24-housekeeping.xlsx | 62 | TC-APP024-014 | 1 | TBD: the lists are shown, contracts with vendor and bills with amounts; the read routes ask for the licence only |
| 24-housekeeping.xlsx | 63 | TC-APP024-014 | 2 | TBD: the text shown; the server refuses for lack of the right |
| 24-housekeeping.xlsx | 64 | TC-APP024-014 | 3 | TBD: refused; the contract stays "sent" |
| 24-housekeeping.xlsx | 65 | TC-APP024-014 | 4 | TBD: refused; no voucher in Finance |
| 24-housekeeping.xlsx | 66 | TC-APP024-014 | 5 | TBD: the export is shown; it needs no right |
| 24-housekeeping.xlsx | 67 | TC-APP024-014 | 6 | TBD: no entry; the actions of Housekeeping write no audit entry. The same user may save, send and approve |
| 24-housekeeping.xlsx | 76 | TC-APP024-022 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 25-linen.xlsx | 6 | TC-APP025-001 | 5 | TBD: added to the recipe, or refused with a text ending in "finished item already exists" |
| 25-linen.xlsx | 7 | TC-APP025-002 | 1 | TBD: the text shown. The server refuses with a text ending in "store is missing" |
| 25-linen.xlsx | 8 | TC-APP025-002 | 2 | TBD: the text shown; the store is looked up in Inventory |
| 25-linen.xlsx | 9 | TC-APP025-002 | 3 | TBD: the text shown. The server refuses with a text ending in "finished item, component and quantity are required" |
| 25-linen.xlsx | 10 | TC-APP025-002 | 4 | TBD: the text shown; both items are looked up in Inventory |
| 25-linen.xlsx | 11 | TC-APP025-002 | 5 | TBD: replaced, or refused with a text ending in "duplicate" |
| 25-linen.xlsx | 12 | TC-APP025-003 | 1 | TBD: the text shown; the stores are named per branch, so the save needs one branch |
| 25-linen.xlsx | 19 | TC-APP025-004 | 7 | Toast "Saved."; TBD: a voucher in Finance for 750000 with the contractor as party |
| 25-linen.xlsx | 20 | TC-APP025-005 | 1 | TBD: the text shown. The server refuses with a text ending in "recipe is missing" |
| 25-linen.xlsx | 21 | TC-APP025-005 | 2 | TBD: the text shown. The server refuses with a text ending in "number, contractor, item and quantity are required" |
| 25-linen.xlsx | 22 | TC-APP025-005 | 3 | TBD: the text shown. The server refuses with a text ending in "send the order first" |
| 25-linen.xlsx | 23 | TC-APP025-005 | 4 | TBD: the text shown. The server refuses with a text ending in "batch is required" |
| 25-linen.xlsx | 24 | TC-APP025-005 | 5 | TBD: the text shown. The server refuses with a text ending in "not enough stock" |
| 25-linen.xlsx | 25 | TC-APP025-005 | 6 | TBD: the text shown. The server refuses with a text ending in "approve the order first" |
| 25-linen.xlsx | 26 | TC-APP025-005 | 7 | TBD: the text shown. The server refuses with a text ending in "batch, expiry and quantity are required" |
| 25-linen.xlsx | 27 | TC-APP025-005 | 8 | TBD: the text shown. The server refuses with a text ending in "amount must be positive" |
| 25-linen.xlsx | 28 | TC-APP025-005 | 9 | TBD: the text shown. The server refuses with a text ending in "stores are not named" |
| 25-linen.xlsx | 29 | TC-APP025-006 | 1 | TBD: accepted; the receipt is not compared with the order |
| 25-linen.xlsx | 30 | TC-APP025-006 | 2 | TBD: accepted; the stock is added again |
| 25-linen.xlsx | 31 | TC-APP025-006 | 3 | TBD: two vouchers in Finance |
| 25-linen.xlsx | 32 | TC-APP025-006 | 4 | TBD: refused; one batch is typed for all components |
| 25-linen.xlsx | 33 | TC-APP025-007 | 1 | TBD: the text shown; the stores are named per branch, so the save needs one branch |
| 25-linen.xlsx | 41 | TC-APP025-009 | 1 | TBD: the text shown. The server refuses with a text ending in "item, batch and quantity are required" |
| 25-linen.xlsx | 42 | TC-APP025-009 | 2 | TBD: the text shown; Inventory refuses for lack of stock |
| 25-linen.xlsx | 43 | TC-APP025-009 | 3 | TBD: the text shown. The server refuses with a text ending in "store is missing" |
| 25-linen.xlsx | 44 | TC-APP025-009 | 4 | TBD: the text shown. The server refuses with a text ending in "issue the linen first" |
| 25-linen.xlsx | 45 | TC-APP025-009 | 5 | TBD: the text shown. The server refuses with a text ending in "issue the linen first" |
| 25-linen.xlsx | 46 | TC-APP025-009 | 6 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 25-linen.xlsx | 47 | TC-APP025-010 | 1 | TBD: accepted if the store exists in Inventory; any store may be typed |
| 25-linen.xlsx | 48 | TC-APP025-010 | 2 | TBD: a receipt takes the whole issue; a loss cannot be recorded |
| 25-linen.xlsx | 49 | TC-APP025-010 | 3 | TBD: 2099-01-01; each receipt of the circulation sets this fixed date |
| 25-linen.xlsx | 50 | TC-APP025-010 | 4 | TBD: not possible; a soiled issue can only be received by the laundry |
| 25-linen.xlsx | 51 | TC-APP025-011 | 1 | TBD: the text shown; the stores are named per branch, so the save needs one branch |
| 25-linen.xlsx | 55 | TC-APP025-012 | 4 | TBD: six entries, an out or an in per step, each naming Linen as its source |
| 25-linen.xlsx | 57 | TC-APP025-013 | 1 | TBD: the 4 pieces stay out of every store; the open issue is a row on Circulation, with nothing that flags it as overdue |
| 25-linen.xlsx | 58 | TC-APP025-013 | 2 | TBD: there is none; the stock can only be brought back by receiving it somewhere |
| 25-linen.xlsx | 59 | TC-APP025-014 | 1 | TBD: the lists are shown; the read route asks for the licence only |
| 25-linen.xlsx | 60 | TC-APP025-014 | 2 | TBD: the text shown; the server refuses for lack of the right, and no stock moves |
| 25-linen.xlsx | 61 | TC-APP025-014 | 3 | TBD: refused; the order stays "sent" and no component is taken |
| 25-linen.xlsx | 62 | TC-APP025-014 | 4 | TBD: refused; no voucher in Finance |
| 25-linen.xlsx | 63 | TC-APP025-014 | 5 | TBD: no entry; the actions of Linen write no audit entry. The same user may save, send and approve |
| 25-linen.xlsx | 71 | TC-APP025-021 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 26-maintenance.xlsx | 7 | TC-APP026-001 | 6 | Toast "Saved."; TBD: what the daily status records, since no state can be typed |
| 26-maintenance.xlsx | 8 | TC-APP026-001 | 7 | TBD: a work row is opened for each schedule that is due today |
| 26-maintenance.xlsx | 9 | TC-APP026-002 | 1 | TBD: the text shown. The server refuses with a text ending in "code and name are required" |
| 26-maintenance.xlsx | 10 | TC-APP026-002 | 2 | TBD: the text shown. The server refuses with a text ending in "Please enter job card" |
| 26-maintenance.xlsx | 11 | TC-APP026-002 | 3 | TBD: the text shown. The server refuses with a text ending in "Please enter job card" |
| 26-maintenance.xlsx | 12 | TC-APP026-002 | 4 | TBD: the text shown. The server refuses with a text ending in "asset is required" |
| 26-maintenance.xlsx | 13 | TC-APP026-002 | 5 | TBD: the text shown. The server refuses with a text ending in "asset and date are required" |
| 26-maintenance.xlsx | 14 | TC-APP026-002 | 6 | TBD: the text shown. The server refuses with a text ending in "nothing is due" |
| 26-maintenance.xlsx | 15 | TC-APP026-002 | 7 | TBD: the text shown. The server refuses with a text ending in "duplicate" |
| 26-maintenance.xlsx | 16 | TC-APP026-003 | 1 | TBD: accepted; the asset is typed text |
| 26-maintenance.xlsx | 17 | TC-APP026-003 | 2 | TBD: accepted or refused; the dialog starts with daily |
| 26-maintenance.xlsx | 18 | TC-APP026-003 | 3 | TBD: the due work is opened twice, or the second save reads "nothing is due" |
| 26-maintenance.xlsx | 26 | TC-APP026-004 | 8 | Toast "Saved."; TBD: a voucher "work invoice" in Finance with the vendor as party |
| 26-maintenance.xlsx | 27 | TC-APP026-005 | 1 | TBD: the text shown. The server refuses with a text ending in "number and asset are required" |
| 26-maintenance.xlsx | 28 | TC-APP026-005 | 2 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 26-maintenance.xlsx | 29 | TC-APP026-005 | 3 | TBD: the text shown. The server refuses with a text ending in "report the incident first" |
| 26-maintenance.xlsx | 30 | TC-APP026-005 | 4 | TBD: the text shown. The server refuses with a text ending in "vendor is required" |
| 26-maintenance.xlsx | 31 | TC-APP026-005 | 5 | TBD: the text shown. The server refuses with a text ending in "send the order first" |
| 26-maintenance.xlsx | 32 | TC-APP026-005 | 6 | TBD: the text shown; Budget refuses the hold and the order stays "sent" |
| 26-maintenance.xlsx | 33 | TC-APP026-005 | 7 | TBD: the text shown. The server refuses with a text ending in "approve the order first" |
| 26-maintenance.xlsx | 34 | TC-APP026-005 | 8 | TBD: the text shown. The server refuses with a text ending in "Not enough stock for :" and the item |
| 26-maintenance.xlsx | 35 | TC-APP026-005 | 9 | TBD: the text shown. The server refuses with a text ending in "note is required" |
| 26-maintenance.xlsx | 36 | TC-APP026-005 | 10 | TBD: the text shown. The server refuses with a text ending in "complete the work first" |
| 26-maintenance.xlsx | 37 | TC-APP026-005 | 11 | TBD: the text shown. The server refuses with a text ending in "amount must be positive" |
| 26-maintenance.xlsx | 38 | TC-APP026-006 | 1 | TBD: accepted; the invoice is not compared with the order or with the budget held |
| 26-maintenance.xlsx | 39 | TC-APP026-006 | 2 | TBD: two vouchers in Finance |
| 26-maintenance.xlsx | 40 | TC-APP026-006 | 3 | TBD: whether the held amount turns into utilised, stays reserved or is released |
| 26-maintenance.xlsx | 41 | TC-APP026-006 | 4 | TBD: budget is held for internal work as well |
| 26-maintenance.xlsx | 50 | TC-APP026-007 | 8 | Toast "Saved."; TBD: a voucher "amc instalment" in Finance with the vendor as party |
| 26-maintenance.xlsx | 51 | TC-APP026-008 | 1 | TBD: the text shown. The server refuses with a text ending in "number, asset and amount are required" |
| 26-maintenance.xlsx | 52 | TC-APP026-008 | 2 | TBD: the text shown. The server refuses with a text ending in "send the indent first" |
| 26-maintenance.xlsx | 53 | TC-APP026-008 | 3 | TBD: the text shown. The server refuses with a text ending in "approve the indent first" |
| 26-maintenance.xlsx | 54 | TC-APP026-008 | 4 | TBD: the text shown. The server refuses with a text ending in "number, vendor, start and end are required" |
| 26-maintenance.xlsx | 55 | TC-APP026-008 | 5 | TBD: the text shown. The server refuses with a text ending in "end is before start" |
| 26-maintenance.xlsx | 56 | TC-APP026-008 | 6 | TBD: the text shown. The server refuses with a text ending in "send the contract first" |
| 26-maintenance.xlsx | 57 | TC-APP026-008 | 7 | TBD: the text shown. The server refuses with a text ending in "Please enter job card" |
| 26-maintenance.xlsx | 58 | TC-APP026-008 | 8 | TBD: the text shown. The server refuses with a text ending in "approve the contract first" |
| 26-maintenance.xlsx | 59 | TC-APP026-008 | 9 | TBD: the text shown. The server refuses with a text ending in "amount must be positive" |
| 26-maintenance.xlsx | 60 | TC-APP026-009 | 1 | TBD: accepted; the instalments are not counted against the contract |
| 26-maintenance.xlsx | 61 | TC-APP026-009 | 2 | TBD: accepted or refused |
| 26-maintenance.xlsx | 62 | TC-APP026-009 | 3 | TBD: the text shown. The server refuses with a text ending in "end is before start" |
| 26-maintenance.xlsx | 67 | TC-APP026-010 | 5 | TBD: where they can be read; the AMC table lists indents and contracts |
| 26-maintenance.xlsx | 68 | TC-APP026-011 | 1 | TBD: the text shown. The server refuses with a text ending in "asset, type and date are required". Only extend and terminate are taken |
| 26-maintenance.xlsx | 69 | TC-APP026-011 | 2 | TBD: the text shown. The server refuses with a text ending in "asset, type and date are required" |
| 26-maintenance.xlsx | 70 | TC-APP026-011 | 3 | TBD: the text shown. The server refuses with a text ending in "asset is required" |
| 26-maintenance.xlsx | 71 | TC-APP026-011 | 4 | TBD: the text shown. The server refuses with a text ending in "reason is required" |
| 26-maintenance.xlsx | 72 | TC-APP026-012 | 1 | TBD: saved; whether the code is checked against the register |
| 26-maintenance.xlsx | 73 | TC-APP026-012 | 2 | TBD: saved as well, or refused |
| 26-maintenance.xlsx | 74 | TC-APP026-012 | 3 | TBD: whether its breakdowns, work orders or AMC contract are shown there |
| 26-maintenance.xlsx | 75 | TC-APP026-012 | 4 | TBD: an entry of a reservation by a work order, with the order's number |
| 26-maintenance.xlsx | 76 | TC-APP026-012 | 5 | TBD: an entry that names Maintenance as its source |
| 26-maintenance.xlsx | 77 | TC-APP026-012 | 6 | TBD: the voucher "work invoice"; a header without lines, as for the other applications |
| 26-maintenance.xlsx | 78 | TC-APP026-013 | 1 | TBD: the lists are shown; the read route asks for the licence only |
| 26-maintenance.xlsx | 79 | TC-APP026-013 | 2 | TBD: the text shown. Whether a ward nurse without the right can report a breakdown at all is a question for the product owner |
| 26-maintenance.xlsx | 80 | TC-APP026-013 | 3 | TBD: refused; no budget is held |
| 26-maintenance.xlsx | 81 | TC-APP026-013 | 4 | TBD: refused; no voucher in Finance |
| 26-maintenance.xlsx | 82 | TC-APP026-013 | 5 | TBD: no entry; the actions of Maintenance write no audit entry. The same user may save, send and approve |
| 26-maintenance.xlsx | 90 | TC-APP026-020 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |
| 27-fixed-assets.xlsx | 7 | TC-APP027-001 | 6 | TBD: the table lists sub categories only |
| 27-fixed-assets.xlsx | 8 | TC-APP027-002 | 1 | TBD: the text shown. The server refuses with a text ending in "code and name are required" |
| 27-fixed-assets.xlsx | 9 | TC-APP027-002 | 2 | TBD: the text shown. The server refuses with a text ending in "Please Select the asset account" |
| 27-fixed-assets.xlsx | 10 | TC-APP027-002 | 3 | TBD: the text shown; the account is looked up in Finance |
| 27-fixed-assets.xlsx | 11 | TC-APP027-002 | 4 | TBD: the text shown. The server refuses with a text ending in "category is missing" |
| 27-fixed-assets.xlsx | 12 | TC-APP027-002 | 5 | TBD: the text shown. The server refuses with a text ending in "duplicate" |
| 27-fixed-assets.xlsx | 13 | TC-APP027-002 | 6 | TBD: the text shown. The server refuses with a text ending in "sub category has assets" |
| 27-fixed-assets.xlsx | 20 | TC-APP027-004 | 1 | TBD: the text shown. The server refuses with a text ending in "document is missing" |
| 27-fixed-assets.xlsx | 21 | TC-APP027-004 | 2 | TBD: the text shown; Procurement must confirm the order |
| 27-fixed-assets.xlsx | 22 | TC-APP027-004 | 3 | TBD: the text shown. The server refuses with a text ending in "number, item and quantity are required" |
| 27-fixed-assets.xlsx | 23 | TC-APP027-004 | 4 | TBD: the text shown. The server refuses with a text ending in "asset and sub category are required" |
| 27-fixed-assets.xlsx | 24 | TC-APP027-004 | 5 | TBD: the text shown. The server refuses with a text ending in "Please Add the Serial Nos Up to the install Quantity" |
| 27-fixed-assets.xlsx | 25 | TC-APP027-004 | 6 | TBD: the text shown. The server refuses with a text ending in "The Available Stock Qty is Only" and the quantity in stock |
| 27-fixed-assets.xlsx | 26 | TC-APP027-004 | 7 | TBD: the text shown. The server refuses with a text ending in "sub category is missing" |
| 27-fixed-assets.xlsx | 27 | TC-APP027-004 | 8 | TBD: the text shown. The server refuses with a text ending in "install the asset first" |
| 27-fixed-assets.xlsx | 28 | TC-APP027-005 | 1 | TBD: two purchases; nothing counts what was registered against the order |
| 27-fixed-assets.xlsx | 29 | TC-APP027-005 | 2 | TBD: accepted or refused |
| 27-fixed-assets.xlsx | 30 | TC-APP027-005 | 3 | TBD: how several serial numbers are separated in the one input |
| 27-fixed-assets.xlsx | 32 | TC-APP027-006 | 2 | Toast "Saved."; TBD: a voucher "asset depreciation" in Finance with the asset code as party |
| 27-fixed-assets.xlsx | 33 | TC-APP027-006 | 3 | TBD: none is shown; the table has code, status and holder |
| 27-fixed-assets.xlsx | 34 | TC-APP027-006 | 4 | Toast "Saved."; the asset shows the state sold; TBD: a voucher "asset sale" in Finance |
| 27-fixed-assets.xlsx | 36 | TC-APP027-007 | 1 | TBD: the text shown. The server refuses with a text ending in "end date is in the future" |
| 27-fixed-assets.xlsx | 37 | TC-APP027-007 | 2 | TBD: the text shown. The server refuses with a text ending in "commission the asset first" |
| 27-fixed-assets.xlsx | 38 | TC-APP027-007 | 3 | TBD: the text shown. The server refuses with a text ending in "asset, date and amount are required" |
| 27-fixed-assets.xlsx | 39 | TC-APP027-007 | 4 | TBD: the text shown. The server refuses with a text ending in "asset and amount are required" |
| 27-fixed-assets.xlsx | 40 | TC-APP027-007 | 5 | TBD: the text shown. The server refuses with a text ending in "asset and reason are required" |
| 27-fixed-assets.xlsx | 41 | TC-APP027-008 | 1 | TBD: two vouchers; nothing guards against a double run |
| 27-fixed-assets.xlsx | 42 | TC-APP027-008 | 2 | TBD: accepted; the amount is typed and not compared with anything |
| 27-fixed-assets.xlsx | 43 | TC-APP027-008 | 3 | TBD: accepted or refused |
| 27-fixed-assets.xlsx | 44 | TC-APP027-008 | 4 | TBD: accepted or refused |
| 27-fixed-assets.xlsx | 45 | TC-APP027-008 | 5 | TBD: there is none; one save by one user ends the asset |
| 27-fixed-assets.xlsx | 46 | TC-APP027-008 | 6 | TBD: the asset is sold for 1000 |
| 27-fixed-assets.xlsx | 52 | TC-APP027-009 | 6 | Toast "Saved."; TBD: what a gate pass records and whether it can be printed |
| 27-fixed-assets.xlsx | 54 | TC-APP027-010 | 1 | TBD: the text shown. The server refuses with a text ending in "asset and location are required" |
| 27-fixed-assets.xlsx | 55 | TC-APP027-010 | 2 | TBD: the text shown. The server refuses with a text ending in "asset, holder and date are required" |
| 27-fixed-assets.xlsx | 56 | TC-APP027-010 | 3 | TBD: the text shown. The server refuses with a text ending in "The FixedAsset is Already issued, and that documents are Still Pending" |
| 27-fixed-assets.xlsx | 57 | TC-APP027-010 | 4 | TBD: the text shown. The server refuses with a text ending in "commission the asset first" |
| 27-fixed-assets.xlsx | 58 | TC-APP027-010 | 5 | TBD: the text shown. The server refuses with a text ending in "issue the asset first" |
| 27-fixed-assets.xlsx | 59 | TC-APP027-010 | 6 | TBD: the text shown. The server refuses with a text ending in "The Return Date Should not be Less than the Issue Date" |
| 27-fixed-assets.xlsx | 60 | TC-APP027-010 | 7 | TBD: the text shown. The server refuses with a text ending in "number, asset and vendor are required" |
| 27-fixed-assets.xlsx | 61 | TC-APP027-010 | 8 | TBD: the text shown. The server refuses with a text ending in "asset is missing" |
| 27-fixed-assets.xlsx | 62 | TC-APP027-011 | 1 | TBD: both ask for an asset and a location; what tells them apart, for example another branch, is not shown |
| 27-fixed-assets.xlsx | 63 | TC-APP027-011 | 2 | TBD: accepted; the holder is typed text |
| 27-fixed-assets.xlsx | 64 | TC-APP027-011 | 3 | TBD: accepted or refused |
| 27-fixed-assets.xlsx | 68 | TC-APP027-012 | 4 | TBD: saved in Maintenance; whether the Register shows it |
| 27-fixed-assets.xlsx | 70 | TC-APP027-012 | 6 | TBD: the Register row shows code, status and holder only; no screen shows the history of one asset |
| 27-fixed-assets.xlsx | 71 | TC-APP027-013 | 1 | TBD: the lists are shown, with holders; the read route asks for the licence only |
| 27-fixed-assets.xlsx | 72 | TC-APP027-013 | 2 | TBD: the text shown; the server refuses for lack of the right |
| 27-fixed-assets.xlsx | 73 | TC-APP027-013 | 3 | TBD: refused; the asset keeps its state |
| 27-fixed-assets.xlsx | 74 | TC-APP027-013 | 4 | TBD: refused; no voucher in Finance |
| 27-fixed-assets.xlsx | 75 | TC-APP027-013 | 5 | TBD: no entry; the actions of Fixed assets write no audit entry, so who wrote off an asset is not recorded |
| 27-fixed-assets.xlsx | 83 | TC-APP027-020 | 1 | The API answers 403 "missing required privilege"; nothing is saved. TBD: the text the screen shows. |

## C. Steps whose Expected Result describes "Current behaviour" (spec vs actual) (4)

| File | Steps row | TC | Step | Expected Result (truncated) |
|---|---|---|---|---|
| 05-pharmacy.xlsx | 181 | TC-APP005-040 | 3 | Current behaviour: 16,650.00, the new price, not the 13,875.00 that was charged |
| 05-pharmacy.xlsx | 183 | TC-APP005-040 | 5 | Current behaviour: toast "That quantity cannot be returned." The stock is not put back |
| 05-pharmacy.xlsx | 185 | TC-APP005-041 | 2 | Current behaviour: OR-OP does not come back to the queue |
| 05-pharmacy.xlsx | 186 | TC-APP005-041 | 3 | Current behaviour: total still 13,875.00 and still open |

## D. Quoted UI texts the workbook script did not find on the site (13)

| File | Steps row | TC | Step | Texts not found |
|---|---|---|---|---|
| 01-ambulatory-care.xlsx | 2 | TC-APP001-001 | 1 | "MRN or name…" |
| 01-ambulatory-care.xlsx | 3 | TC-APP001-001 | 2 | "Leave blank to auto-assign MRN-YYYY-XXXXXXXX" |
| 01-ambulatory-care.xlsx | 35 | TC-APP001-008 | 1 | "Record an intake", "Waiting for a form" |
| 01-ambulatory-care.xlsx | 67 | TC-APP001-014 | 1 | "No appointments in this view." |
| 02-appointment.xlsx | 18 | TC-APP002-004 | 1 | "No appointments in this view." |
| 03-patient-care.xlsx | 17 | TC-APP003-004 | 1 | "No prescription lines yet.", "Prescription lines are checked for drug interactions before they are sent." |
| 03-patient-care.xlsx | 40 | TC-APP003-009 | 1 | "This SOAP draft stays in the current session." |
| 05-pharmacy.xlsx | 33 | TC-APP005-006 | 1 | "Delivery refused. The pharmacy return is posted." |
| 05-pharmacy.xlsx | 176 | TC-APP005-039 | 1 | "Returned." |
| 05-pharmacy.xlsx | 206 | TC-APP005-048 | 1 | "No pending orders." |
| 09-procurement.xlsx | 93 | TC-APP009-027 | 1 | "Approval advanced" |
| 15-emergency.xlsx | 21 | TC-APP015-007 | 1 | "Open visits", "Visits", "Workflow" |
| 19-finance.xlsx | 11 | TC-APP019-004 | 2 | "All branches" |

## E. Journeys with Verification Status = Discrepancy Found (45)

| File | Journeys row | Journey | Name |
|---|---|---|---|
| 01-ambulatory-care.xlsx | 17 | JRN-APP001-016 | Rescheduling appointments |
| 02-appointment.xlsx | 7 | JRN-APP002-006 | Rescheduling appointments |
| 03-patient-care.xlsx | 25 | JRN-APP003-024 | Allergies and problem list of the patient |
| 03-patient-care.xlsx | 26 | JRN-APP003-025 | Vitals and diagnosis |
| 04-inpatient.xlsx | 33 | JRN-APP004-032 | Admission or discharge made by mistake |
| 06-transfusion-medicine.xlsx | 73 | JRN-APP006-072 | Opening Transfusion Medicine and every screen of its menu |
| 06-transfusion-medicine.xlsx | 75 | JRN-APP006-074 | Opening the lists with "All branches" in the header (failed on 2026-10-12; kept on record) |
| 07-inventory.xlsx | 24 | JRN-APP007-023 | Correcting stock: adjustment, write-off and count |
| 07-inventory.xlsx | 26 | JRN-APP007-025 | Moving stock between stores |
| 07-inventory.xlsx | 49 | JRN-APP007-048 | Opening the lists with "All branches" in the header (failed on 2026-10-12; kept on record) |
| 08-operation-theater.xlsx | 10 | JRN-APP008-009 | OT request without a patient or a surgical team |
| 08-operation-theater.xlsx | 11 | JRN-APP008-010 | Scheduling without a date, a time or a theatre |
| 08-operation-theater.xlsx | 18 | JRN-APP008-017 | Changing or cancelling a request |
| 09-procurement.xlsx | 14 | JRN-APP009-013 | Purchase request and tender |
| 09-procurement.xlsx | 22 | JRN-APP009-021 | Goods receipt and stock for an approved purchase order |
| 09-procurement.xlsx | 23 | JRN-APP009-022 | Advance payment and Finance |
| 09-procurement.xlsx | 47 | JRN-APP009-046 | Opening the lists with "All branches" in the header (failed on 2026-10-12; kept on record) |
| 10-hr.xlsx | 49 | JRN-APP010-048 | Opening the lists with "All branches" in the header (failed on 2026-10-12; kept on record) |
| 11-laboratory.xlsx | 16 | JRN-APP011-015 | Step clicked by mistake |
| 11-laboratory.xlsx | 17 | JRN-APP011-016 | Sample that cannot be used, order that is not needed |
| 11-laboratory.xlsx | 18 | JRN-APP011-017 | Result released without a second check |
| 12-ris.xlsx | 9 | JRN-APP012-008 | Doctor's request for an examination |
| 12-ris.xlsx | 10 | JRN-APP012-009 | Completing or correcting an order later |
| 12-ris.xlsx | 11 | JRN-APP012-010 | Status of an examination and the modality schedule |
| 13-dietary.xlsx | 12 | JRN-APP013-011 | Hub, navigation and Indonesian |
| 14-hospital-accounts.xlsx | 22 | JRN-APP014-021 | Hub, navigation and Indonesian |
| 14-hospital-accounts.xlsx | 51 | JRN-APP014-050 | Tenant licences |
| 14-hospital-accounts.xlsx | 64 | JRN-APP014-063 | Opening the lists with "All branches" in the header (failed on 2026-10-12; kept on record) |
| 15-emergency.xlsx | 2 | JRN-APP015-001 | Creating an emergency visit |
| 15-emergency.xlsx | 8 | JRN-APP015-007 | Hub, navigation and Indonesian |
| 15-emergency.xlsx | 15 | JRN-APP015-014 | Ending a visit |
| 16-mrd.xlsx | 2 | JRN-APP016-001 | Creating a file request |
| 16-mrd.xlsx | 4 | JRN-APP016-003 | Returning a patient record |
| 16-mrd.xlsx | 9 | JRN-APP016-008 | Hub, navigation and Indonesian |
| 17-payroll.xlsx | 8 | JRN-APP017-007 | Hub, navigation and Indonesian |
| 17-payroll.xlsx | 40 | JRN-APP017-039 | Opening the lists with "All branches" in the header (failed on 2026-10-12; kept on record) |
| 18-settings.xlsx | 45 | JRN-APP018-044 | Licensing links of the Settings directory |
| 18-settings.xlsx | 47 | JRN-APP018-046 | Opening Settings and every screen of its menu |
| 19-finance.xlsx | 6 | JRN-APP019-005 | Editing an account: branch restriction and inactive |
| 19-finance.xlsx | 15 | JRN-APP019-014 | Hub, navigation and Indonesian |
| 19-finance.xlsx | 25 | JRN-APP019-024 | General ledger, account balances and reports |
| 21-cssd.xlsx | 9 | JRN-APP021-008 | Sterile issue: CSSD sends sterile packs to the ward |
| 21-cssd.xlsx | 16 | JRN-APP021-015 | Opening CSSD and every screen of its menu |
| 22-services.xlsx | 13 | JRN-APP022-012 | Opening the lists with "All branches" in the header (failed on 2026-10-13; kept on record) |
| 23-sourcing.xlsx | 12 | JRN-APP023-011 | Opening the lists with "All branches" in the header (failed on 2026-10-13; kept on record) |

## F. Journeys with Automation Candidate = Needs Evaluation (189)

| File | Journeys row | Journey | Name |
|---|---|---|---|
| 01-ambulatory-care.xlsx | 24 | JRN-APP001-023 | New patient is found in the other screens |
| 01-ambulatory-care.xlsx | 38 | JRN-APP001-037 | Visit type that is switched off |
| 01-ambulatory-care.xlsx | 39 | JRN-APP001-038 | Pre-registration opened twice or in the wrong branch |
| 01-ambulatory-care.xlsx | 42 | JRN-APP001-041 | Merge that must be refused |
| 01-ambulatory-care.xlsx | 46 | JRN-APP001-045 | Daily quota used up |
| 01-ambulatory-care.xlsx | 58 | JRN-APP001-057 | Calling twice, out of turn, or by mistake |
| 01-ambulatory-care.xlsx | 66 | JRN-APP001-065 | Opening the register without being signed in |
| 01-ambulatory-care.xlsx | 69 | JRN-APP001-068 | Double click, two clerks at once, and reload |
| 01-ambulatory-care.xlsx | 70 | JRN-APP001-069 | Adding an entry on the screen "Aturan prioritas ("Priority rule")" with "Tambah" |
| 01-ambulatory-care.xlsx | 71 | JRN-APP001-070 | Adding an entry on the screen "Bendera pasien ("Patient flags")" with "Tambah" |
| 01-ambulatory-care.xlsx | 77 | JRN-APP001-076 | Access to Ambulatory Care: session, licence and write privilege |
| 02-appointment.xlsx | 10 | JRN-APP002-009 | Daily quota used up |
| 02-appointment.xlsx | 25 | JRN-APP002-024 | Access to Appointment: session, licence and write privilege |
| 03-patient-care.xlsx | 3 | JRN-APP003-002 | Single medication order reaches the pharmacy |
| 03-patient-care.xlsx | 4 | JRN-APP003-003 | Quantity worked out from dose, clock times and days |
| 03-patient-care.xlsx | 5 | JRN-APP003-004 | Prescription with several drugs |
| 03-patient-care.xlsx | 7 | JRN-APP003-006 | Restricted drug: ordered, authorised, then visible to the pharmacy |
| 03-patient-care.xlsx | 8 | JRN-APP003-007 | Medication order for an inpatient |
| 03-patient-care.xlsx | 11 | JRN-APP003-010 | Lab order from the consultation |
| 03-patient-care.xlsx | 20 | JRN-APP003-019 | Authorising without a remark, or twice |
| 03-patient-care.xlsx | 24 | JRN-APP003-023 | SOAP note as a medical record |
| 03-patient-care.xlsx | 26 | JRN-APP003-025 | Vitals and diagnosis |
| 03-patient-care.xlsx | 28 | JRN-APP003-027 | Two patients with the same name |
| 03-patient-care.xlsx | 29 | JRN-APP003-028 | Misspelt drug name |
| 03-patient-care.xlsx | 34 | JRN-APP003-033 | The same order submitted twice |
| 03-patient-care.xlsx | 35 | JRN-APP003-034 | Lab order without a patient |
| 03-patient-care.xlsx | 40 | JRN-APP003-039 | Opening a consultation without being signed in |
| 03-patient-care.xlsx | 42 | JRN-APP003-041 | Script text in notes and remarks |
| 03-patient-care.xlsx | 50 | JRN-APP003-049 | Access to Patient Care: session, licence and write privilege |
| 04-inpatient.xlsx | 15 | JRN-APP004-014 | Inpatient order from the doctor reaches the ward |
| 04-inpatient.xlsx | 16 | JRN-APP004-015 | Ward supply: group, pharmacy delivers, ward receives |
| 04-inpatient.xlsx | 17 | JRN-APP004-016 | Ward refuses a delivery |
| 04-inpatient.xlsx | 18 | JRN-APP004-017 | Return request for medicine issued to a stay |
| 04-inpatient.xlsx | 23 | JRN-APP004-022 | Name typed differently from the register |
| 04-inpatient.xlsx | 24 | JRN-APP004-023 | Two patients with the same name on the ward |
| 04-inpatient.xlsx | 25 | JRN-APP004-024 | Same patient admitted twice |
| 04-inpatient.xlsx | 27 | JRN-APP004-026 | Bed taken by a colleague a moment ago |
| 04-inpatient.xlsx | 34 | JRN-APP004-033 | Admission and discharge numbers |
| 04-inpatient.xlsx | 36 | JRN-APP004-035 | Transfer that must be refused |
| 04-inpatient.xlsx | 37 | JRN-APP004-036 | History of a patient's beds |
| 04-inpatient.xlsx | 39 | JRN-APP004-038 | Billing marked cleared without a settled bill |
| 04-inpatient.xlsx | 40 | JRN-APP004-039 | Discharge while a return request is pending |
| 04-inpatient.xlsx | 41 | JRN-APP004-040 | Discharge that must be refused |
| 04-inpatient.xlsx | 42 | JRN-APP004-041 | Discharge when the approval chain is missing or switched off |
| 04-inpatient.xlsx | 43 | JRN-APP004-042 | Discharge takes effect before it is approved |
| 04-inpatient.xlsx | 46 | JRN-APP004-045 | Receipt before the pharmacy has delivered |
| 04-inpatient.xlsx | 54 | JRN-APP004-053 | Opening admissions without being signed in |
| 04-inpatient.xlsx | 56 | JRN-APP004-055 | Double click, two nurses at once, and reload |
| 04-inpatient.xlsx | 69 | JRN-APP004-068 | Access to Inpatient: session, licence and write privilege |
| 05-pharmacy.xlsx | 4 | JRN-APP005-003 | Restricted drug waits for the doctor's authorisation |
| 05-pharmacy.xlsx | 6 | JRN-APP005-005 | Ward supply: nurse groups orders, pharmacist dispenses, ward receives |
| 05-pharmacy.xlsx | 7 | JRN-APP005-006 | Ward refuses a delivery |
| 05-pharmacy.xlsx | 14 | JRN-APP005-013 | Stock comes off the right batch |
| 05-pharmacy.xlsx | 15 | JRN-APP005-014 | A sale appears at the cashier and in Finance |
| 05-pharmacy.xlsx | 17 | JRN-APP005-016 | Discount above the limit: held, approved, then issued |
| 05-pharmacy.xlsx | 19 | JRN-APP005-018 | Nurse asks for a return, pharmacist posts it |
| 05-pharmacy.xlsx | 20 | JRN-APP005-019 | Setting which lines may be returned |
| 05-pharmacy.xlsx | 36 | JRN-APP005-035 | Item that cannot be priced, or would sell below cost |
| 05-pharmacy.xlsx | 37 | JRN-APP005-036 | Discount rejected: sale goes ahead at full price |
| 05-pharmacy.xlsx | 38 | JRN-APP005-037 | Who may approve a discount |
| 05-pharmacy.xlsx | 39 | JRN-APP005-038 | Returning more than was issued |
| 05-pharmacy.xlsx | 40 | JRN-APP005-039 | Refund for a discounted sale |
| 05-pharmacy.xlsx | 41 | JRN-APP005-040 | Return after the price list changed |
| 05-pharmacy.xlsx | 42 | JRN-APP005-041 | What a return does to the order and the bill |
| 05-pharmacy.xlsx | 44 | JRN-APP005-043 | Opening Pharmacy without being signed in |
| 05-pharmacy.xlsx | 48 | JRN-APP005-047 | Tenant without the Pharmacy licence |
| 05-pharmacy.xlsx | 59 | JRN-APP005-058 | Access to Pharmacy: session, licence and write privilege |
| 06-transfusion-medicine.xlsx | 14 | JRN-APP006-013 | Blood group: reactions, authorisation and confirmation |
| 06-transfusion-medicine.xlsx | 15 | JRN-APP006-014 | Serology negative and validated: the unit becomes available |
| 06-transfusion-medicine.xlsx | 16 | JRN-APP006-015 | Separating a bag into components |
| 06-transfusion-medicine.xlsx | 22 | JRN-APP006-021 | Request written by a nurse and approved by another user |
| 06-transfusion-medicine.xlsx | 27 | JRN-APP006-026 | Ward: returning a unit that was not used |
| 06-transfusion-medicine.xlsx | 45 | JRN-APP006-044 | Blood group that must be refused |
| 06-transfusion-medicine.xlsx | 46 | JRN-APP006-045 | Reactive serology result |
| 06-transfusion-medicine.xlsx | 47 | JRN-APP006-046 | Reactive result found after the unit was matched or issued |
| 06-transfusion-medicine.xlsx | 48 | JRN-APP006-047 | Which infection tests release a unit |
| 06-transfusion-medicine.xlsx | 49 | JRN-APP006-048 | Separation that must be refused |
| 06-transfusion-medicine.xlsx | 54 | JRN-APP006-053 | Request approved by its own author |
| 06-transfusion-medicine.xlsx | 55 | JRN-APP006-054 | Cross-match and issue that must be refused |
| 06-transfusion-medicine.xlsx | 62 | JRN-APP006-061 | Charge for issued blood |
| 06-transfusion-medicine.xlsx | 68 | JRN-APP006-067 | Opening the blood bank without being signed in |
| 06-transfusion-medicine.xlsx | 70 | JRN-APP006-069 | Double click, two technicians at once, and reload |
| 06-transfusion-medicine.xlsx | 74 | JRN-APP006-073 | Access to Transfusion Medicine: session, licence and write privilege |
| 07-inventory.xlsx | 9 | JRN-APP007-008 | Stock after a pharmacy dispense and a return |
| 07-inventory.xlsx | 10 | JRN-APP007-009 | Freeze days: a batch near its expiry is not issued |
| 07-inventory.xlsx | 18 | JRN-APP007-017 | Changing the code of an item, or switching off an item that is in stock |
| 07-inventory.xlsx | 25 | JRN-APP007-024 | Goods receipt against a purchase order |
| 07-inventory.xlsx | 28 | JRN-APP007-027 | Stock request steps that must be refused |
| 07-inventory.xlsx | 31 | JRN-APP007-030 | Oldest received first, not first to expire |
| 07-inventory.xlsx | 37 | JRN-APP007-036 | Opening inventory without being signed in |
| 07-inventory.xlsx | 39 | JRN-APP007-038 | Double click, two users at once, and reload |
| 07-inventory.xlsx | 48 | JRN-APP007-047 | Access to Inventory: session, licence and write privilege |
| 08-operation-theater.xlsx | 12 | JRN-APP008-011 | Consumption without items, stock or charge |
| 08-operation-theater.xlsx | 17 | JRN-APP008-016 | Finding a request and the new request after saving |
| 08-operation-theater.xlsx | 23 | JRN-APP008-022 | Opening the requests without being signed in |
| 08-operation-theater.xlsx | 25 | JRN-APP008-024 | Double click, two nurses at once, and reload |
| 08-operation-theater.xlsx | 36 | JRN-APP008-035 | Access to Operation Theater: session, licence and write privilege |
| 09-procurement.xlsx | 6 | JRN-APP009-005 | Purchase order approved through all four steps |
| 09-procurement.xlsx | 10 | JRN-APP009-009 | Home tiles count the approvals that wait |
| 09-procurement.xlsx | 18 | JRN-APP009-017 | Approver who holds the step's role but not the procurement right |
| 09-procurement.xlsx | 19 | JRN-APP009-018 | One person creates and approves, or approves several steps |
| 09-procurement.xlsx | 22 | JRN-APP009-021 | Goods receipt and stock for an approved purchase order |
| 09-procurement.xlsx | 23 | JRN-APP009-022 | Advance payment and Finance |
| 09-procurement.xlsx | 26 | JRN-APP009-025 | Two purchase orders with the same number |
| 09-procurement.xlsx | 29 | JRN-APP009-028 | Approval chain switched off or missing |
| 09-procurement.xlsx | 30 | JRN-APP009-029 | Approval chain changed while purchase orders wait |
| 09-procurement.xlsx | 35 | JRN-APP009-034 | Opening the purchase orders without being signed in |
| 09-procurement.xlsx | 37 | JRN-APP009-036 | Double click, two approvers at once, and reload |
| 09-procurement.xlsx | 46 | JRN-APP009-045 | Access to Procurement: session, licence and write privilege |
| 10-hr.xlsx | 5 | JRN-APP010-004 | Reporting authority and linked user account |
| 10-hr.xlsx | 22 | JRN-APP010-021 | Changing a leave decision and deciding from an outdated list |
| 10-hr.xlsx | 25 | JRN-APP010-024 | Approved leave in Duty Roster and Payroll |
| 10-hr.xlsx | 26 | JRN-APP010-025 | Employee who has left: "Relieved" and the user account |
| 10-hr.xlsx | 38 | JRN-APP010-037 | Opening HR without being signed in |
| 10-hr.xlsx | 40 | JRN-APP010-039 | Double click, two admins at once, and reload |
| 10-hr.xlsx | 48 | JRN-APP010-047 | Access to HR: session, licence and write privilege |
| 11-laboratory.xlsx | 8 | JRN-APP011-007 | Lab order made in a consultation arrives on the worklist |
| 11-laboratory.xlsx | 12 | JRN-APP011-011 | Lab order without a patient |
| 11-laboratory.xlsx | 13 | JRN-APP011-012 | Result does not come back to the doctor |
| 11-laboratory.xlsx | 19 | JRN-APP011-018 | Result changed after it was released |
| 11-laboratory.xlsx | 22 | JRN-APP011-021 | Charge for a lab test |
| 11-laboratory.xlsx | 24 | JRN-APP011-023 | Two analysts on the same order |
| 11-laboratory.xlsx | 29 | JRN-APP011-028 | Opening the worklist without being signed in |
| 11-laboratory.xlsx | 41 | JRN-APP011-040 | Access to Laboratory: session, licence and write privilege |
| 12-ris.xlsx | 9 | JRN-APP012-008 | Doctor's request for an examination |
| 12-ris.xlsx | 15 | JRN-APP012-014 | Same reference or accession number twice |
| 12-ris.xlsx | 18 | JRN-APP012-017 | Charge for an examination |
| 12-ris.xlsx | 23 | JRN-APP012-022 | Opening the orders without being signed in |
| 12-ris.xlsx | 25 | JRN-APP012-024 | Double click, two radiographers at once, and reload |
| 12-ris.xlsx | 30 | JRN-APP012-029 | Access to RIS: session, licence and write privilege |
| 13-dietary.xlsx | 14 | JRN-APP013-013 | Diet request and the patient's admission |
| 13-dietary.xlsx | 23 | JRN-APP013-022 | Clinical basis of the TPN calculation |
| 13-dietary.xlsx | 26 | JRN-APP013-025 | TPN without a prescriber, a check or a link to Pharmacy |
| 13-dietary.xlsx | 32 | JRN-APP013-031 | Opening Dietary without being signed in |
| 13-dietary.xlsx | 34 | JRN-APP013-033 | Double click, two dietitians at once, and reload |
| 13-dietary.xlsx | 43 | JRN-APP013-042 | Access to Dietary: session, licence and write privilege |
| 14-hospital-accounts.xlsx | 8 | JRN-APP014-007 | Discount above the cap: held, approved, then paid |
| 14-hospital-accounts.xlsx | 10 | JRN-APP014-009 | Refund above the limit: held, then approved |
| 14-hospital-accounts.xlsx | 15 | JRN-APP014-014 | Rounding of the amount to pay |
| 14-hospital-accounts.xlsx | 16 | JRN-APP014-015 | Large cash payment with an identity document |
| 14-hospital-accounts.xlsx | 17 | JRN-APP014-016 | Item price settings and an estimate |
| 14-hospital-accounts.xlsx | 27 | JRN-APP014-026 | Cash rules: missing identity document and the cash limit |
| 14-hospital-accounts.xlsx | 29 | JRN-APP014-028 | The wrong person tries to approve |
| 14-hospital-accounts.xlsx | 33 | JRN-APP014-032 | Full refund of a paid sale |
| 14-hospital-accounts.xlsx | 52 | JRN-APP014-051 | Opening the cashier without being signed in |
| 14-hospital-accounts.xlsx | 63 | JRN-APP014-062 | Access to Hospital Accounts: session, licence and write privilege |
| 15-emergency.xlsx | 12 | JRN-APP015-011 | Bay that is occupied, switched off or in another branch |
| 15-emergency.xlsx | 14 | JRN-APP015-013 | Same patient with two open visits |
| 15-emergency.xlsx | 18 | JRN-APP015-017 | Clinical record and charges of an emergency visit |
| 15-emergency.xlsx | 23 | JRN-APP015-022 | Opening the visits without being signed in |
| 15-emergency.xlsx | 24 | JRN-APP015-023 | Double click, two nurses at once, and reload |
| 15-emergency.xlsx | 42 | JRN-APP015-041 | Access to Emergency: session, licence and write privilege |
| 16-mrd.xlsx | 12 | JRN-APP016-011 | Issuing a file that is already out |
| 16-mrd.xlsx | 14 | JRN-APP016-013 | Loan and access to the patient's chart |
| 16-mrd.xlsx | 19 | JRN-APP016-018 | Returning a file twice or by mistake |
| 16-mrd.xlsx | 22 | JRN-APP016-021 | Patient merged after the record was issued |
| 16-mrd.xlsx | 27 | JRN-APP016-026 | Opening the records without being signed in |
| 16-mrd.xlsx | 29 | JRN-APP016-028 | Double click, two officers at once, and reload |
| 16-mrd.xlsx | 37 | JRN-APP016-036 | Access to MRD: session, licence and write privilege |
| 17-payroll.xlsx | 10 | JRN-APP017-009 | Payslip |
| 17-payroll.xlsx | 18 | JRN-APP017-017 | Unpaid leave, overtime and shifts in a payroll run |
| 17-payroll.xlsx | 19 | JRN-APP017-018 | No review, approval, correction or run for a whole branch |
| 17-payroll.xlsx | 20 | JRN-APP017-019 | Payroll in Finance, bank and tax reports |
| 17-payroll.xlsx | 26 | JRN-APP017-025 | Opening Payroll without being signed in |
| 17-payroll.xlsx | 28 | JRN-APP017-027 | Double click, two officers at once, and reload |
| 17-payroll.xlsx | 39 | JRN-APP017-038 | Access to Payroll: session, licence and write privilege |
| 18-settings.xlsx | 18 | JRN-APP018-017 | Setting a branch inactive |
| 18-settings.xlsx | 20 | JRN-APP018-019 | Inactive department still offered in other modules |
| 18-settings.xlsx | 24 | JRN-APP018-023 | Reference lists: odd values, and where the lists are used |
| 18-settings.xlsx | 26 | JRN-APP018-025 | Changing or retiring a tax code, and where rates apply |
| 18-settings.xlsx | 29 | JRN-APP018-028 | Opening Settings without being signed in |
| 18-settings.xlsx | 31 | JRN-APP018-030 | Double click, two admins at once, and reload |
| 18-settings.xlsx | 48 | JRN-APP018-047 | Access to Settings: session, licence and write privilege |
| 19-finance.xlsx | 11 | JRN-APP019-010 | Pharmacy sale and return in the voucher register |
| 19-finance.xlsx | 17 | JRN-APP019-016 | Voucher made by hand stays "Open" |
| 19-finance.xlsx | 18 | JRN-APP019-017 | Vouchers in a locked year, or on a date outside every year |
| 19-finance.xlsx | 20 | JRN-APP019-019 | Document number that is already used |
| 19-finance.xlsx | 28 | JRN-APP019-027 | ERP staging: where the rows come from and what can be done with them |
| 19-finance.xlsx | 33 | JRN-APP019-032 | Opening Finance without being signed in |
| 19-finance.xlsx | 35 | JRN-APP019-034 | Double click, two accountants at once, and reload |
| 19-finance.xlsx | 60 | JRN-APP019-059 | Access to Finance: session, licence and write privilege |
| 20-budget.xlsx | 23 | JRN-APP020-022 | Access to Budget: session, licence and write privilege |
| 21-cssd.xlsx | 17 | JRN-APP021-016 | Access to CSSD: session, licence and write privilege |
| 22-services.xlsx | 12 | JRN-APP022-011 | Access to Services: session, licence and write privilege |
| 23-sourcing.xlsx | 11 | JRN-APP023-010 | Access to Sourcing: session, licence and write privilege |
| 24-housekeeping.xlsx | 9 | JRN-APP024-008 | Access to Housekeeping: session, licence and write privilege |
| 25-linen.xlsx | 8 | JRN-APP025-007 | Access to Linen: session, licence and write privilege |
| 26-maintenance.xlsx | 9 | JRN-APP026-008 | Access to Maintenance: session, licence and write privilege |
| 27-fixed-assets.xlsx | 9 | JRN-APP027-008 | Access to Fixed assets: session, licence and write privilege |

## G. Role accounts "Journeys" vs journeys in the module workbook (8)

| Role accounts row | Application | Stated | In workbook |
|---|---|---|---|
| 10 | 06 Transfusion Medicine | 75 | 74 |
| 11 | 07 Inventory | 49 | 48 |
| 13 | 09 Procurement | 47 | 46 |
| 14 | 10 HR | 49 | 48 |
| 18 | 14 Hospital Accounts | 64 | 63 |
| 21 | 17 Payroll | 40 | 39 |
| 26 | 22 Services | 13 | 12 |
| 27 | 23 Sourcing | 12 | 11 |

## H. Data catalogue "Journeys" count vs journeys found via "Short names used" (0)

| Catalogue row | Application | Short name | Stated | Found |
|---|---|---|---|---|

## I. Summary sheet totals vs actual rows (0)

| File | Total | Summary says | Actual |
|---|---|---|---|

