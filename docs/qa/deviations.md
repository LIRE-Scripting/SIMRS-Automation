# Deviasi: langkah yang berjalan tetapi hasilnya berbeda dari workbook

Dibangun 2026-10-31 16:44 UTC dari `reports/summary/run-summary.json` (hasil terbaru tiap test case dan rantai). Bangun ulang: `npm run qa:run-summary && npm run qa:findings-md`.

Deviasi = langkah **bisa dijalankan**, tetapi yang tampil di site tidak sama dengan *Expected Result* workbook. Di workbook hasil, langkahnya berstatus **Failed** dengan perilaku site di *Actual Result*. Blocker (langkah tidak bisa dijalankan sama sekali) ada di `docs/qa/blockers-found.md`.

**705 deviasi** di **348 test case** dan **15 rantai E2E**.

| Modul | Test case / rantai dengan deviasi | Jumlah deviasi |
|---|---:|---:|
| [01 Ambulatory Care](#01-ambulatory-care) | 34 | 67 |
| [02 Appointment](#02-appointment) | 13 | 22 |
| [03 Patient Care](#03-patient-care) | 21 | 28 |
| [04 Inpatient](#04-inpatient) | 22 | 35 |
| [05 Pharmacy](#05-pharmacy) | 20 | 28 |
| [06 Transfusion Medicine](#06-transfusion-medicine) | 9 | 13 |
| [07 Inventory](#07-inventory) | 21 | 37 |
| [08 Operation Theater](#08-operation-theater) | 17 | 32 |
| [09 Procurement](#09-procurement) | 18 | 42 |
| [10 HR](#10-hr) | 17 | 39 |
| [11 Laboratory](#11-laboratory) | 13 | 29 |
| [12 RIS](#12-ris) | 13 | 21 |
| [13 Dietary](#13-dietary) | 18 | 54 |
| [14 Hospital Accounts](#14-hospital-accounts) | 14 | 19 |
| [15 Emergency](#15-emergency) | 17 | 36 |
| [16 MRD](#16-mrd) | 18 | 48 |
| [17 Payroll](#17-payroll) | 4 | 8 |
| [18 Settings](#18-settings) | 21 | 52 |
| [19 Finance](#19-finance) | 25 | 44 |
| [20 Budget](#20-budget) | 5 | 7 |
| [21 CSSD](#21-cssd) | 4 | 11 |
| [22 Services](#22-services) | 1 | 1 |
| [23 Sourcing](#23-sourcing) | 1 | 1 |
| [24 Housekeeping](#24-housekeeping) | 2 | 2 |
| [Rantai E2E](#rantai-e2e) | 15 | 29 |

## 01 Ambulatory Care

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP001-006 | Registering a newborn with the mother | 5 | "Mother" shows PT-MOM's MRN and name as a link | "Mother" shows an internal id (UUID) as plain text |
| TC-APP001-006 | Registering a newborn with the mother | 6 | The dialog changes to PT-MOM | there is no mother link to click |
| TC-APP001-019 | Arrival: number issued and patient called | 4 | the button is replaced by the word "Called" | the button is replaced by "Start encounter" (actions: Start encounter Set MLC Record document) |
| TC-APP001-026 | Hub, navigation and Indonesian | 1 | a button "New Registration" | "New Registration" is a link |
| TC-APP001-027 | Same person registered twice when duplicate fields are set | 1 | Toast "A patient already matches the duplicate fields" | toast "Registration failed" (HTTP 500) |
| TC-APP001-028 | Same person registered twice with the default settings | 1 | A warning that a patient with these details exists, before or instead of saving | saved without a warning (toast "Patient registered") |
| TC-APP001-028 | Same person registered twice with the default settings | 2 | One patient | two patients with the same names and date of birth |
| TC-APP001-029 | Twins and namesakes stopped by the duplicate rule | 1 | The clerk is shown the matching patient and can confirm that this is another person | refused with toast "Registration failed"; no way to confirm |
| TC-APP001-029 | Twins and namesakes stopped by the duplicate rule | 2 | Both twins | only the first twin (the second could not be saved) |
| TC-APP001-030 | MRN that is already used or wrongly written | 1 | Toast "MRN already exists for this tenant" | toast "Registration failed" (HTTP 500) |
| TC-APP001-030 | MRN that is already used or wrongly written | 2 | A message that the MRN must look like MRN-YYYY-XXXXXXXX | toast "Registration failed" |
| TC-APP001-031 | Same MRN typed in another letter case | 1 | Toast "MRN already exists for this tenant" | toast "Registration failed" (HTTP 500) |
| TC-APP001-032 | Registration form that is not complete | 3 | The patient is saved with that single name | the browser requires Last name; nothing is saved |
| TC-APP001-033 | Dates and names at their limits | 1 | Refused: the date of birth cannot be in the future | saved (toast "Patient registered") |
| TC-APP001-033 | Dates and names at their limits | 2 | Refused, or a warning about the age | saved without a warning |
| TC-APP001-033 | Dates and names at their limits | 4 | Saved, or refused with a message that names the length limit | refused with toast "Registration failed" (HTTP 500) |
| TC-APP001-034 | Person key used a second time | 1 | Toast "This person already has an MRN" | toast "Registration failed" (HTTP 500) |
| TC-APP001-034 | Person key used a second time | 2 | Toast "This person already has an MRN" | toast "Registration failed" (HTTP 500) |
| TC-APP001-034 | Person key used a second time | 4 | Toast "This person already has an MRN" | saved: the key check is case-sensitive |
| TC-APP001-035 | Newborn without a valid mother | 1 | Toast "Newborn requires a mother" | toast "Registration failed" (HTTP 500) |
| TC-APP001-035 | Newborn without a valid mother | 2 | Toast "Newborn requires a mother" | toast "Registration failed" (HTTP 500) |
| TC-APP001-035 | Newborn without a valid mother | 4 | The Mother field is empty | the Mother field still shows "MRN-2026-A71E4342 QA-AMB Ibu Satu MVWACOUZ008" (the previous mother) |
| TC-APP001-036 | Disaster batch that is not complete | 1 | Toast "Triage color is unset" | toast "Registration failed" (HTTP 500) |
| TC-APP001-036 | Disaster batch that is not complete | 2 | A message that a disaster batch needs at least two patients | toast "Registration failed" (HTTP 500) |
| TC-APP001-036 | Disaster batch that is not complete | 3 | Toast "A patient already matches the duplicate fields" | toast "Registration failed" (HTTP 500) |
| TC-APP001-037 | Visit type that is switched off | 1 | Nothing changed: "New Registration" still offers "Newborn" | "Newborn" is no longer offered although the settings were cancelled |
| TC-APP001-039 | Correcting a registered patient | 1 | Details with a way to edit | no edit function (buttons: Consent, Renew, Close) |
| TC-APP001-039 | Correcting a registered patient | 3 | Present, with a reason | no way to record a death or remove a record |
| TC-APP001-040 | Identity details the form does not ask for | 1 | Fields are present | none of sex, NIK, address, phone, payer, insurance number is on the form |
| TC-APP001-040 | Identity details the form does not ask for | 2 | Shown in the details and in the list | not shown (no such data is kept) |
| TC-APP001-042 | Merge made by mistake | 1 | A question to confirm, naming both patients, before anything changes | merged at once (toast "Patients merged") |
| TC-APP001-042 | Merge made by mistake | 2 | An undo or a merge history | neither exists on Registered Patients |
| TC-APP001-042 | Merge made by mistake | 3 | PT-DUP-B's arrival is shown under PT-DUP-A | the arrival still shows PT-DUP-B's MRN MRN-2026-707F8C2A |
| TC-APP001-043 | Patient registered at another branch | 1 | PT-1 is found | searching PT-1's MRN and name on Kemayoran finds nothing |
| TC-APP001-043 | Patient registered at another branch | 2 | PT-1 is offered | PT-1 is not offered in Book and Arrive on Kemayoran |
| TC-APP001-045 | Daily quota used up | 2 | Toast "The daily quota is full" | the toast says "Booking failed", with no word of the quota |
| TC-APP001-046 | Two bookings in the same open time | 2 | 08:00 is no longer offered | 08:00 is still offered and chosen first |
| TC-APP001-046 | Two bookings in the same open time | 3 | A warning that PT-1 already has this appointment | booked a second time (toast "Appointment booked") |
| TC-APP001-047 | Booking for a day that has passed | 1 | The past day cannot be chosen, or no open time is offered | 2026-10-30 can be chosen and offers 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 |
| TC-APP001-048 | Booking form that is not complete | 2 | A message that the department is missing | the click does nothing: no message, the dialog stays open |
| TC-APP001-048 | Booking form that is not complete | 3 | A message that the department is missing | the click does nothing: no message, the dialog stays open |
| TC-APP001-049 | Reschedule that must be refused | 3 | Refused: a cancelled appointment cannot be moved | refused with toast "Booking failed" |
| TC-APP001-050 | Cancelling without a question or a reason | 1 | A question to confirm, with a place for the reason | cancelled at once: no question, no reason |
| TC-APP001-050 | Cancelling without a question or a reason | 2 | Present, or a note that it must be booked again | no way to bring it back and no note |
| TC-APP001-050 | Cancelling without a question or a reason | 3 | Refused | refused with toast "Booking failed" |
| TC-APP001-051 | Book settings that are not valid | 1 | Refused with a message about the repeated name | refused with toast "Booking failed" |
| TC-APP001-051 | Book settings that are not valid | 2 | A remove button on each row | no remove button; the row is taken out by emptying its name |
| TC-APP001-051 | Book settings that are not valid | 3 | Refused with a message for each row | the browser stops the save at the field "Max per day" (minimum 1); the hours row gets no message |
| TC-APP001-051 | Book settings that are not valid | 4 | Refused: one quota per consultant | refused with toast "" |
| TC-APP001-052 | Block that is wrong or must be lifted | 1 | Refused with a message about the times | refused with toast "Booking failed" |
| TC-APP001-052 | Block that is wrong or must be lifted | 2 | A warning that PT-1 is booked in that time | blocked without a warning; PT-1 stays booked |
| TC-APP001-052 | Block that is wrong or must be lifted | 3 | The block is listed and can be removed | no list of blocks and no way to remove one |
| TC-APP001-054 | Date range that is too long or the wrong way round | 3 | A message that the From date is after the To date | no message; the list is empty ("No appointments in this view.") |
| TC-APP001-056 | Arrive form: patient already waiting, department not chosen | 1 | Toast "This patient is already waiting in that department". No new number | toast "Arrival failed" |
| TC-APP001-056 | Arrive form: patient already waiting, department not chosen | 3 | The button is disabled until a department is picked | "Arrive" is enabled; the empty field already holds a department (id set) |
| TC-APP001-057 | Calling twice, out of turn, or by mistake | 2 | A warning that 002 is before 003, or the call is not offered | 003 is called with no warning |
| TC-APP001-057 | Calling twice, out of turn, or by mistake | 3 | Present: call again, mark as not present, end the visit, undo a call | the rows offer Start encounter, Set MLC, Record document, Call |
| TC-APP001-060 | What the public queue board shows | 1 | The patient's name shortened or hidden, and no MRN | full name "QA-AMB Pasien Satu MVWK3JL2004" and MRN shown |
| TC-APP001-060 | What the public queue board shows | 2 | A word such as "Waiting" | Status "A" |
| TC-APP001-060 | What the public queue board shows | 3 | The board does not change | a row for the booking of 2026-11-09 appears at once, with its token, name and MRN |
| TC-APP001-062 | User with no front-desk role reads the register | 1 | No "Ambulatory Care" card, or the card opens a "no access" page | the card is shown to U3 (no rights) and opens /id/registration |
| TC-APP001-062 | User with no front-desk role reads the register | 2 | Access refused | U3 (no rights) reads /id/registration/patients ("Registered Patients", 10 rows) |
| TC-APP001-062 | User with no front-desk role reads the register | 3 | Access refused | U3 (no rights) reads /id/registration/appointments ("Appointments", 1 rows) and /id/registration/department-queue ("Arrival", 10 rows) |
| TC-APP001-065 | Opening the register without being signed in | 3 | The page that was asked for | after signing in: /id/login |
| TC-APP001-068 | Double click, two clerks at once, and reload | 2 | One is saved; the other gets "MRN already exists for this tenant" | 0 saved |
| TC-APP001-068 | Double click, two clerks at once, and reload | 4 | The entries are kept, or the clerk is warned before leaving | the half-filled form is lost with no warning |
| TC-APP001-071 | Without the write privilege: "Tambah" | 1 | Refused for lack of the right | saved by U3 |

## 02 Appointment

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP002-009 | Daily quota used up | 2 | Toast "The daily quota is full" | the toast says "Booking failed", with no word of the quota |
| TC-APP002-010 | Two bookings in the same open time | 2 | 08:00 is no longer offered | 08:00 is still offered and chosen first |
| TC-APP002-010 | Two bookings in the same open time | 3 | A warning that PT-1 already has this appointment | booked a second time (toast "Appointment booked") |
| TC-APP002-011 | Booking for a day that has passed | 1 | The past day cannot be chosen, or no open time is offered | 2026-10-30 can be chosen and offers 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 |
| TC-APP002-012 | Booking form that is not complete | 2 | A message that the department is missing | the click does nothing: no message, the dialog stays open |
| TC-APP002-012 | Booking form that is not complete | 3 | A message that the department is missing | the click does nothing: no message, the dialog stays open |
| TC-APP002-013 | Reschedule that must be refused | 3 | Refused: a cancelled appointment cannot be moved | refused with toast "Booking failed" |
| TC-APP002-014 | Cancelling without a question or a reason | 1 | A question to confirm, with a place for the reason | cancelled at once: no question, no reason |
| TC-APP002-014 | Cancelling without a question or a reason | 2 | Present, or a note that it must be booked again | no way to bring it back and no note |
| TC-APP002-014 | Cancelling without a question or a reason | 3 | Refused | refused with toast "Booking failed" |
| TC-APP002-015 | Book settings that are not valid | 1 | Refused with a message about the repeated name | refused with toast "Booking failed" |
| TC-APP002-015 | Book settings that are not valid | 2 | A remove button on each row | no remove button; the row is taken out by emptying its name |
| TC-APP002-015 | Book settings that are not valid | 3 | Refused with a message for each row | the browser stops the save at the field "Max per day" (minimum 1); the hours row gets no message |
| TC-APP002-015 | Book settings that are not valid | 4 | Refused: one quota per consultant | refused with toast "" |
| TC-APP002-016 | Block that is wrong or must be lifted | 1 | Refused with a message about the times | refused with toast "Booking failed" |
| TC-APP002-016 | Block that is wrong or must be lifted | 2 | A warning that PT-1 is booked in that time | blocked without a warning; PT-1 stays booked |
| TC-APP002-016 | Block that is wrong or must be lifted | 3 | The block is listed and can be removed | no list of blocks and no way to remove one |
| TC-APP002-018 | Date range that is too long or the wrong way round | 3 | A message that the From date is after the To date | no message; the list is empty ("No appointments in this view.") |
| TC-APP002-020 | Code or name already used | 1 | Toast "That code or name is already used"; the dialog stays open; no second row | toast "Saved"; dialog closes |
| TC-APP002-021 | Code or name empty | 2 | Toast "Save failed"; no row is added | toast "Saved": a type whose code and name are only spaces is stored (25 rows, 25 before) |
| TC-APP002-024 | Code or name already used | 1 | Toast "That code or name is already used"; the dialog stays open; no second row | toast "Saved"; dialog closes |
| TC-APP002-025 | Code or name empty | 2 | Toast "Save failed"; no row is added | toast "Saved": a type whose code and name are only spaces is stored (25 rows, 25 before) |

## 03 Patient Care

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP003-001 | Opening a consultation for a patient | 3 | Left pane: name, MRN and "DOB" | name and MRN; no date of birth |
| TC-APP003-002 | Single medication order reaches the pharmacy | 4 | Remaining 10 | Remaining reads "10 / 10" |
| TC-APP003-014 | Hub, navigation and Indonesian | 1 | Button "Open Consultation" | "Open Consultation" is a link |
| TC-APP003-016 | Order form that is not complete | 3 | The empty field is marked | no field is marked and no message is shown; "Submit order" is only disabled |
| TC-APP003-020 | Doctor authorises their own restricted order | 1 | Refused: the person who ordered cannot authorise | authorised at once (toast "Order authorised.") |
| TC-APP003-021 | Restricted orders of other patients in the list | 1 | Only PT-1's waiting orders | the list also shows 3 order(s) of other patients, by name only (e.g. "QA-PCR Pasien Satu MVWKJZQZ002 — Meropenem 1g Injection") |
| TC-APP003-022 | SOAP note when the patient is opened again | 1 | The SOAP tab shows the saved text | the four areas are empty |
| TC-APP003-022 | SOAP note when the patient is opened again | 2 | The SOAP tab shows the saved text | the four areas are empty |
| TC-APP003-023 | SOAP note as a medical record | 2 | A second note; the earlier note is kept with its date and author | Doctor 2 sees no earlier note: the draft is kept in the first session only |
| TC-APP003-023 | SOAP note as a medical record | 3 | A sign or finalise control, after which the note is read-only | no sign or finalise control on SOAP |
| TC-APP003-025 | Vitals and diagnosis | 2 | A vitals form | no place to record vital signs on Consultation |
| TC-APP003-025 | Vitals and diagnosis | 3 | A diagnosis field or list | no coded diagnosis on Consultation |
| TC-APP003-026 | Ordering a drug the patient is allergic to | 1 | An allergy warning | no allergy warning (toast "No drug interactions detected.") |
| TC-APP003-026 | Ordering a drug the patient is allergic to | 2 | The order is blocked or needs an acknowledgement | placed at once (toast "Order placed.") |
| TC-APP003-027 | Two patients with the same name | 2 | A row that shows which of the two patients the order is for | the row names the patient only, with no MRN |
| TC-APP003-028 | Misspelt drug name | 1 | Suggestions from the drug list | no list of matching drugs |
| TC-APP003-028 | Misspelt drug name | 2 | The misspelling is refused or corrected | the order is placed with "Paracetmol 500 mg tab" |
| TC-APP003-030 | Prescription only partly sent | 1 | Both lines are refused together, with the reason | 1 line(s) sent, 1 left in the list; toast "placeOrder: 400 clinical: invalid order: strength is too long" |
| TC-APP003-031 | Cancelling or correcting a wrong order | 1 | The order with a Cancel or Edit control | the order is listed under "Drug orders" with no Cancel or Edit |
| TC-APP003-032 | The patient's earlier orders | 1 | A list of the patient's orders with date, drug, quantity and status | the list shows "Paracetamol 500mg Tablet" |
| TC-APP003-033 | The same order submitted twice | 2 | A warning that the same drug was just ordered for this patient | placed again with no warning |
| TC-APP003-033 | The same order submitted twice | 3 | One row | 2 rows |
| TC-APP003-034 | Lab order without a patient | 1 | The patient's name and MRN on the order | the order has no patient |
| TC-APP003-036 | User with no clinical role opens a consultation | 1 | No "Patient Care" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/clinical |
| TC-APP003-036 | User with no clinical role opens a consultation | 2 | Access refused | U3 (no right) reads /clinical/consultation ("Consultation", 0 rows; the patient search offers 8 patients) |
| TC-APP003-040 | Session ends or the page reloads during a consultation | 1 | The entries are kept, or the doctor is warned before leaving | the page returns to the empty "Select patient" screen with no warning |
| TC-APP003-051 | Radiology order without a patient | 1 | The patient's name and MRN on the order | the order row has no patient: "RAD-1793461715 QA Foto toraks PA MVWKLNRE010 — — — —" |
| TC-APP003-053 | Follow-up without a note | 1 | The browser asks for the note (required field); nothing is sent | "Save" stays disabled while Note is empty; nothing can be sent |

## 04 Inpatient

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP004-004 | Admitting a patient into a vacant bed | 2 | Hint "Bed no or description…" | hint "No. atau deskripsi…" |
| TC-APP004-008 | Admission list: search, sort, paging and census | 5 | Newest admission first | the list stays in patient-name order |
| TC-APP004-012 | Discharging a patient | 1 | "Configured chain has 7 steps" (seed chain) | the configured chain has 1 step(s) |
| TC-APP004-016 | Ward refuses a delivery | 2 | The issued lines of the group are returned in full | no line of Paracetamol 500mg Tablet on Issue Lines shows Issued 10 and Returned 10 |
| TC-APP004-020 | Hub, navigation and Indonesian | 1 | A button "Open admissions" | "Open admissions" is a link |
| TC-APP004-021 | Admitting someone who is not a registered patient | 1 | A search of registered patients by MRN or name, not a free text field | "Patient name" is a free text field |
| TC-APP004-021 | Admitting someone who is not a registered patient | 2 | Refused: the person must be registered first | admitted (toast "Patient admitted") |
| TC-APP004-021 | Admitting someone who is not a registered patient | 3 | The MRN is shown with the name | the stay has no MRN |
| TC-APP004-024 | Same patient admitted twice | 1 | A warning that this patient already has an open stay on QA-0D43DDQBW-10102 | admitted a second time with no warning |
| TC-APP004-024 | Same patient admitted twice | 2 | PT-1 on one bed | 2 open stays |
| TC-APP004-025 | Admit form that is not complete | 3 | Refused with a message that names the length limit | refused with "failed to admit" |
| TC-APP004-028 | Bed number used twice or left empty | 1 | Refused: the number is already used in this branch | saved a second bed with the same number (toast "Bed created") |
| TC-APP004-028 | Bed number used twice or left empty | 3 | A message that the bed number is missing | nothing happens: no message, the dialog stays open |
| TC-APP004-030 | Cross-gender tick on a bed | 1 | The tick is shown for each bed | the bed list and the admit dialog do not show "Cross-gender" |
| TC-APP004-030 | Cross-gender tick on a bed | 2 | The dialog asks for or knows the patient's sex and checks it against the room | the wizard asks for name and number only (2 fields), no sex |
| TC-APP004-031 | Admission details the form does not ask for | 1 | Fields are present | only patient name, admission number and bed are asked |
| TC-APP004-031 | Admission details the form does not ask for | 2 | The admission time can be set to the real time | no time field: the admission time is the moment of saving |
| TC-APP004-032 | Admission or discharge made by mistake | 1 | A cancel action with a reason | no cancel; "Discharge" is disabled without a bed |
| TC-APP004-032 | Admission or discharge made by mistake | 3 | A reopen action, or a note that the patient must be admitted again | only the barcode button is left |
| TC-APP004-033 | Admission and discharge numbers | 1 | Refused: the number is in use | admitted with QA-RI-84Q004 a second time |
| TC-APP004-033 | Admission and discharge numbers | 2 | Two different numbers | both got ADM-1793464796 |
| TC-APP004-038 | Billing marked cleared without a settled bill | 1 | Refused: the bill is not settled, or only a cashier may do this | the nurse marks the billing cleared |
| TC-APP004-038 | Billing marked cleared without a settled bill | 3 | Present: a way to take a wrong mark back | the row offers , , Discharge |
| TC-APP004-042 | Discharge takes effect before it is approved | 1 | The stay shows that a discharge is waiting for approval; the patient still holds the bed | the stay reads "Discharged" at once |
| TC-APP004-043 | What a discharge record holds | 1 | The patient's name and admission number are shown and can be searched | columns Discharge no, Admitted, Discharged, Length of stay; no search |
| TC-APP004-043 | What a discharge record holds | 2 | Shown | no bed, user or way of leaving in the list |
| TC-APP004-043 | What a discharge record holds | 3 | They can be filled | the dialog asks only for an optional discharge number |
| TC-APP004-050 | User with no ward role reads the stays | 1 | No "Inpatient" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/adt |
| TC-APP004-050 | User with no ward role reads the stays | 2 | Access refused | U3 (no right) reads /adt/admissions ("Admissions", 10 rows) |
| TC-APP004-050 | User with no ward role reads the stays | 3 | Access refused | U3 (no right) reads /adt/beds ("Bed management", 10 rows) and /adt/discharges ("Discharges", 10 rows) |
| TC-APP004-055 | Double click, two nurses at once, and reload | 3 | The entries are kept, or the nurse is warned before leaving | the wizard is lost with no warning |
| TC-APP004-058 | Putting a patient on the admission waiting list | 1 | A field "Branch" | no Branch field (U1 works on one branch) |
| TC-APP004-060 | Request with an inactive type | 1 | A type shown with "(No)" can be chosen | inactive types are not offered |
| TC-APP004-061 | Request with all branches active | 1 | Toast "Failed to save"; nothing is sent | nothing is sent and no message is shown |
| TC-APP004-077 | Recording a dose on the ward | 2 | "Branch", "Patient", "Order", "Status" and "Reason" | no "Branch" field (U1 works on one branch) |

## 05 Pharmacy

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP005-001 | Pharmacist dispenses an outpatient prescription in full | 1 | Remaining 10 | Remaining reads "10 / 10" (left / ordered) |
| TC-APP005-001 | Pharmacist dispenses an outpatient prescription in full | 7 | Branch BR-A on Confirm | Confirm shows the store and the summary; no branch |
| TC-APP005-001 | Pharmacist dispenses an outpatient prescription in full | 9 | Back on Orders | Done stays on /id/pharmacy/dispense |
| TC-APP005-005 | Ward supply: nurse groups orders, pharmacist dispenses, ward receives | 4 | Picks the group in "Ward group": only the grouped orders are listed | the options name no group (1 · Kelompok bangsal, 2 · Kelompok bangsal), so the group of this test cannot be told apart; the order is opened from its row |
| TC-APP005-006 | Ward refuses a delivery | 2 | The line for OR-IP shows Returned equal to Issued; the Return control shows "—" | no line of Paracetamol 500mg Tablet on Issue Lines shows Issued and Returned 6 |
| TC-APP005-007 | Counter sale to a registered patient | 8 | Wizard is empty and ready for the next sale | the items are cleared but the patient stays selected ("QA-PHA Pasien Satu MVWAEN28003 MRN MRN-2026-5A2FA4BF") |
| TC-APP005-009 | Several items in one sale, then labels | 6 | Empty wizard | the items are cleared but the patient stays selected |
| TC-APP005-014 | A sale appears at the cashier and in Finance | 3 | One sales voucher referring to the invoice RX-f248b0b5 | the newest SV- voucher does not name RX-f248b0b5: "SV-f8763bc8-ee91-49d3-888a-833a9b519254 Sales Close Doc date 2026-10-31 Voucher value IDR 13.875,00 Party QA-PHA Pasien Satu MVW7T649003 Status Posted Narration" |
| TC-APP005-020 | Head pharmacist working on "All branches" | 2 | Toast "Choose a branch before confirming the dispense." | "Please select an item in the list." |
| TC-APP005-020 | Head pharmacist working on "All branches" | 3 | Stores of BR-A only | the Store list is not narrowed by the branch: FI01-00-00 (BR-A) is offered for Kemayoran too (4 stores for Podomoro, 4 for Kemayoran) |
| TC-APP005-022 | The whole journey in Indonesian | 1 | Heading, description, cards, sidebar and breadcrumb in Indonesian | heading "Pharmacy", "Orders, dispense & issue lines" stay English (known risk) |
| TC-APP005-024 | Hub and navigation | 1 | A Dispense button | "Dispense" is a link |
| TC-APP005-024 | Hub and navigation | 2 | The sidebar shows 3 items | 9 items: Orders, Catalogue, Alerts, Estimate, Patient issues, Price & TPN, Dose record, Dispense, Issue Lines |
| TC-APP005-028 | Two patients with the same name, one of them admitted | 3 | The sale goes through for PT-2 | refused: "advanceDispense: 400 Patient has been admitted" (PT-3 of the same name is admitted) |
| TC-APP005-030 | Patient with a recorded allergy to the drug | 2 | An allergy warning for Paracetamol | "Drug order alerts" reads: Tinjau blok keras dan peringatan lunak sebelum konfirmasi.sandbox No drug interactions detected for this order. |
| TC-APP005-030 | Patient with a recorded allergy to the drug | 3 | Confirm is blocked or needs an acknowledgement | "Confirm dispense" is enabled |
| TC-APP005-033 | Expired and nearly expired stock | 6 | Confirmed toast | refused ("advanceDispense: 400 pharmacy: not enough stock inventory: not enough stock (QA-FRZ-MVW7MXG8007)"): with Freeze days 29 the batch expiring in 30 days is still held back |
| TC-APP005-034 | Picking the store | 3 | Toast "Choose a store this visit may dispense from." | "Confirm dispense" is disabled while Store is empty |
| TC-APP005-045 | User with no pharmacy role looks at orders and issue lines | 1 | No "Pharmacy" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/pharmacy |
| TC-APP005-045 | User with no pharmacy role looks at orders and issue lines | 2 | Access refused | U3 (no right) reads /pharmacy/orders ("Orders", 25 rows) |
| TC-APP005-045 | User with no pharmacy role looks at orders and issue lines | 3 | Access refused | U3 (no right) reads /pharmacy/issue-lines ("Issue Lines", 25 rows) |
| TC-APP005-046 | Pharmacist sees and touches only their own branch | 5 | Stores of Podomoro only | stores of Kemayoran offered to U1: FB-DRI, FI01-01-01, FE03-00-02 |
| TC-APP005-049 | Messages the pharmacist sees when a sale is refused | 1 | A short sentence without technical words | raw server text: advanceDispense: 400 pharmacy: not enough stock inventory: not enough stock (QA-PARA-MVWAEN2800P); advanceDispense: 400 Patient has been admitted |
| TC-APP005-049 | Messages the pharmacist sees when a sale is refused | 2 | The same sentences in Indonesian | English server text: advanceDispense: 400 pharmacy: not enough stock inventory: not enough stock (QA-PARA-MVWAEN2800P); advanceDispense: 400 Patient has been admitted |
| TC-APP005-051 | Adding a generic drug and a dosing frequency to the catalogue | 1 | Pharmacy has "Catalogue" | the Pharmacy hub has no "Catalogue" (links: Home, Apps, Dispense, Orders, Dispense, Issue Lines); /pharmacy/catalogue opened by its address |
| TC-APP005-054 | Adding an alert rule and a vaccine type | 1 | Pharmacy has "Alerts" | the Pharmacy hub has no "Alerts" (links: Home, Ambulatory Care Pendaftaran pasien, check-in, MRN, Appointment Jadwal, reschedule, blok konsultan, Patient Care SOAP, vitals, diagnosis, Inpatient Admission, transfer, discharge, Pharmacy Dispense, OTC, retur, Transfusion Medicine Donor, crossmatch, issue, Inventory Stok, GRN, mutasi, Operation Theater Jadwal & konsumsi OT, Procurement PR, PO, tender, HR Karyawan & cuti, Laboratory Sampel, hasil, sertifikasi, RIS Order & jadwal modality, Dietary Diet pasien rawat inap, Hospital Accounts Invoice, deposit, kasir, Emergency Triage & bay IGD, MRD Berkas & peminjaman RM, Payroll Gaji & payslip, Settings Master Data — sites, departments, service centers, Finance Voucher & GL, Budget Ceilings, allocation, sanction, CSSD Set steril, siklus, distribusi, Services Jasa internal, tanpa stok, Sourcing Tender sampai perjanjian, Housekeeping Lokasi, kontrak, catatan, tagihan, Linen Toko, resep, sirkulasi, Maintenance Rencana, perintah kerja, AMC, Fixed assets Register, susut, penitipan); /pharmacy/alerts opened by its address |
| TC-APP005-060 | Looking up what was issued to one patient | 2 | The block lists item names with the issued quantity | nothing is listed for the name or the MRN ("QA-PHA Pasien Satu MVWLDNCG007": toast "Saved", Nothing here yet.; "MRN-2026-90B35B54": toast "Saved", Nothing here yet.) |
| TC-APP005-063 | Recording a dose in Pharmacy | 2 | Fields "Branch", "Patient", "Order", "Status" and "Reason" | no "Branch" field |

## 06 Transfusion Medicine

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP006-020 | Blood request written by a doctor | 4 | The form shows a request number and the status "Approved" | the status is "Pending" (an approval by "Approve" is needed) |
| TC-APP006-032 | Hub, navigation and Indonesian | 1 | A button "New request" | "New request" is a link |
| TC-APP006-047 | Which infection tests release a unit | 2 | A message that the test list must be set up first | no such message; the dialog shows no test line |
| TC-APP006-049 | Bag put into stock by plain intake | 2 | Status "Unscreened", with "Group" and "Serology" to be done | Status "Available" (buttons: Group, Serology, Separate, Discard, Convert, Send out) |
| TC-APP006-052 | Request that must be refused | 2 | Refused: "department is required" | "bloodbank: invalid input: component is required" |
| TC-APP006-052 | Request that must be refused | 6 | Refused: "component has no service mapping" | "bloodbank: invalid input: required-by date is in the past" |
| TC-APP006-053 | Request approved by its own author | 4 | Status "Approved" at once | the request of the Doctor is "Pending" like any other |
| TC-APP006-055 | Patient's blood group typed by hand | 1 | The group is filled from the patient's tested sample, or can only be entered with a second check | a free text field, empty, saved by one click |
| TC-APP006-055 | Patient's blood group typed by hand | 2 | Refused, or checked against an earlier group of this patient | saved (toast "Group saved") |
| TC-APP006-062 | Quality-control value outside its limit | 1 | Toast "Quality control saved"; the line is marked as failed | refused: "bloodbank: invalid input: value is outside the limit" |
| TC-APP006-064 | User with no blood bank role reads donor and patient data | 1 | No "Transfusion Medicine" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/bloodbank |
| TC-APP006-064 | User with no blood bank role reads donor and patient data | 2 | Access refused | U3 (no right) reads /bloodbank/donors ("", 0 rows) |
| TC-APP006-064 | User with no blood bank role reads donor and patient data | 3 | Access refused | U3 (no right) reads /bloodbank/stock ("Stock", 10 rows) and /bloodbank/requisitions ("Blood request", 20 rows) |

## 07 Inventory

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP007-006 | Stock on hand by store and batch | 1 | Two lines, each with store code, batch code, quantity and expiry date | "Stock on hand" reads: Stock on hand No batches for this item yet. Add batch |
| TC-APP007-013 | Warehouse working on "All branches" | 4 | Toast "Choose a branch before creating a stock request." | "Please select an item in the list." |
| TC-APP007-015 | Hub, navigation and Indonesian | 1 | A button "Item Master" | "Item Master" is a link |
| TC-APP007-016 | Item form that is not complete or not valid | 2 | Refused: the code is already in use | toast "Failed to save item." |
| TC-APP007-016 | Item form that is not complete or not valid | 3 | Refused: the minimum is above the maximum | toast "Failed to save item." |
| TC-APP007-016 | Item form that is not complete or not valid | 4 | Refused: the value cannot be negative | toast "Failed to save item." |
| TC-APP007-017 | Changing the code of an item, or switching off an item that is in stock | 1 | Refused, or a warning that the item is in stock | the code is changed with no warning |
| TC-APP007-017 | Changing the code of an item, or switching off an item that is in stock | 2 | A warning that 100 are still in stock | toast "Item updated." |
| TC-APP007-018 | Batch tracked and Serialized ticks | 1 | A serial number is asked for each piece | the same batch, expiry and quantity fields as for any item |
| TC-APP007-019 | Search on a long item list | 1 | The item is listed | not listed: the search narrows only the rows of the page on screen |
| TC-APP007-020 | Batch form that is not complete or not valid | 3 | Refused with a message that names the limit of 64 | toast "receiveStockBatch: 400 inventory: invalid stock" |
| TC-APP007-021 | Batch that is already expired when received | 1 | Refused: the batch is expired | saved (toast "Batch quantity added.") |
| TC-APP007-021 | Batch that is already expired when received | 2 | The batch is not listed | the expired batch is listed under "Stock on hand" |
| TC-APP007-022 | Expiry of a batch changed by receiving it again | 1 | Refused: this batch is in stock with another expiry date | accepted (toast "Batch quantity added.") |
| TC-APP007-022 | Expiry of a batch changed by receiving it again | 2 | QA-B002: 50, expiry in 20 days | the line reads "FI01-00-00 · QA-B002-MVWJZP2E00J 51 · 2028-10-30" |
| TC-APP007-023 | Correcting stock: adjustment, write-off and count | 1 | An adjustment with quantity and reason | the dialog offers only: Add batch, Add component, Save kit, Cancel, Save |
| TC-APP007-023 | Correcting stock: adjustment, write-off and count | 2 | A reversal or an edit of the receipt | none on the item |
| TC-APP007-023 | Correcting stock: adjustment, write-off and count | 3 | A disposal with a reason | none on the item |
| TC-APP007-025 | Moving stock between stores | 1 | A transfer with source, destination, batch and quantity | no transfer on the Inventory hub (links: Home, Apps, Item Master, Item Master, Stock Requests, Stores, Stock book); Store documents has a "transfer" document (TC-APP007-045) |
| TC-APP007-026 | Stock request without item lines | 2 | Refused: a request needs at least one item | created with empty Remarks |
| TC-APP007-026 | Stock request without item lines | 3 | Refused, or fulfilled in part: only 100 are in stock | fulfilled (toast "Stock request fulfilled."): nothing reads the remark |
| TC-APP007-027 | Stock request steps that must be refused | 1 | Refused: a different user must approve | the author approves her own request |
| TC-APP007-027 | Stock request steps that must be refused | 3 | Both are offered | not offered: "Reject" on the pending request and "Cancel" on the open one |
| TC-APP007-028 | Stock request form at its limits | 1 | Refused: the number is in use | toast "Failed to create stock request." |
| TC-APP007-028 | Stock request form at its limits | 2 | Refused with a message that names the limit of 50 | toast "Failed to create stock request." |
| TC-APP007-028 | Stock request form at its limits | 3 | Refused: the amount cannot be negative | toast "Failed to create stock request." |
| TC-APP007-028 | Stock request form at its limits | 4 | Refused, or picked from a list | saved: the currency is free text |
| TC-APP007-029 | Minimum and maximum stock | 2 | A list of items below minimum, with the quantity to order | no reorder list in Inventory |
| TC-APP007-029 | Minimum and maximum stock | 3 | A warning that the maximum is passed | toast "Batch quantity added." |
| TC-APP007-030 | Oldest received first, not first to expire | 2 | QA-NEW (B2-MVWJQCAA006), which expires first, went down by 10 | B1-MVWJQCAA006 40, B2-MVWJQCAA006 50: the batch received first is issued first |
| TC-APP007-031 | Freeze days at their limits | 1 | BR-A, the branch the user works on | the field shows "BR02 Daan Mogot" |
| TC-APP007-031 | Freeze days at their limits | 3 | Refused: at most 3650 | toast "saveFreezeDays: 400 inventory: invalid stock" |
| TC-APP007-033 | User with no warehouse role reads stock and costs | 1 | No "Inventory" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/inventory |
| TC-APP007-033 | User with no warehouse role reads stock and costs | 2 | Access refused | U3 (no right) reads /inventory/items ("Item Master", 25 rows; IT-1 (QA-INV-XSS-MV8QXF17100M) opens with its stock lines) |
| TC-APP007-034 | Stores, stock and requests of another branch | 2 | Stores of Podomoro only under "Add batch" | stores of Kemayoran are offered too: FB-DRI, FI01-01-01, FE03-00-02 |
| TC-APP007-038 | Double click, two users at once, and reload | 3 | The other is refused with "not enough stock" | the other reads "advanceDispense: 400 pharmacy: dispense without stock detail is not allowed inventory: dispense without stock detail is not allowed (QA-INV-PARA-L-MVWJQCAA00A)" |
| TC-APP007-038 | Double click, two users at once, and reload | 5 | The entries are kept, or the user is warned | the half-filled item is lost with no warning |

## 08 Operation Theater

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP008-001 | Creating an OT request | 2 | Hint "Optional" on "Blocked amount" | no such hint; the dialog reads "procedures_display required; blocked_amount optional." |
| TC-APP008-005 | Request list and paging | 1 | Columns Request no, Procedures, Blocked, List prepared, Actions | columns Request no, Procedures, Status, Blocked, List prepared, Actions |
| TC-APP008-008 | Hub, navigation and Indonesian | 1 | A button "Open requests" | "Open requests" is a link |
| TC-APP008-008 | Hub, navigation and Indonesian | 1 | One tile "Requests" under "Workflow" | tiles: Requests, Case |
| TC-APP008-008 | Hub, navigation and Indonesian | 3 | Headings, column names, buttons and toasts are Indonesian ("Permintaan OT", "Jadwalkan", …) | English: "Blocked" |
| TC-APP008-009 | OT request without a patient or a surgical team | 1 | A patient is picked from the register or from the admitted patients | "Patient" is a free text field (INPUT) |
| TC-APP008-009 | OT request without a patient or a surgical team | 2 | Fields for surgeon, anaesthetist, diagnosis and kind of anaesthesia | missing: surgeon, anaesthetist, diagnosis, kind of anaesthesia (only "Chief surgeon" exists) |
| TC-APP008-009 | OT request without a patient or a surgical team | 3 | Each row shows the patient's name and MRN | the rows show the request number and the procedure only; both read the same text |
| TC-APP008-010 | Scheduling without a date, a time or a theatre | 1 | A form for date, start time, expected length and theatre | "Schedule" is one click (toast "Scheduled"); "List prepared" becomes "Yes" |
| TC-APP008-010 | Scheduling without a date, a time or a theatre | 2 | Refused, or a warning about the clash | scheduled with no question (no date, time or theatre to clash on) |
| TC-APP008-011 | Consumption without items, stock or charge | 1 | A form to enter the items and quantities used | no form: "Consume" records at once ("Consumed") |
| TC-APP008-011 | Consumption without items, stock or charge | 2 | Stock is lower by the quantities used | no item or quantity was entered, so no stock of the theatre store can go down (the theatre store cannot be made either, found blocker 26) |
| TC-APP008-011 | Consumption without items, stock or charge | 3 | Charges for the operation and the items | the request names the patient as free text only (no MRN, no visit), so no bill of PT-1 can carry it |
| TC-APP008-012 | Consume before the list is prepared | 1 | The "Consume" button is not offered, or is disabled | "Consume" is offered on a request whose list is not prepared |
| TC-APP008-013 | Consume clicked twice or by mistake | 1 | A question to confirm before anything changes | consumed at once (toast "Consumed") |
| TC-APP008-013 | Consume clicked twice or by mistake | 2 | An undo that restores the 3,000,000 | no undo; Blocked reads "0" |
| TC-APP008-013 | Consume clicked twice or by mistake | 3 | Refused: already consumed; the button is no longer offered | consumed again (toast "Consumed") |
| TC-APP008-013 | Consume clicked twice or by mistake | 4 | A status "Consumed" on the row | Status "pending", Blocked "0", List prepared "Yes" |
| TC-APP008-014 | Blocked amount at its limits | 3 | Refused, or rounded to the currency's smallest unit | saved; Blocked reads "0.001" |
| TC-APP008-014 | Blocked amount at its limits | 4 | Refused, or a warning about the size | saved; Blocked reads "999,999,999,999,999" |
| TC-APP008-015 | Request form at its limits | 2 | A message that the procedure is missing | nothing happens, no message |
| TC-APP008-015 | Request form at its limits | 3 | Refused with a message that names the limit of 1,024, or the field stops there | toast "failed to create OT request" |
| TC-APP008-016 | Finding a request and the new request after saving | 1 | The new request is the first row | the list starts with the lowest request number ("QA Appendektomi laparoskopi PRBMV8WIZEFA"); the new one is on the last page |
| TC-APP008-016 | Finding a request and the new request after saving | 2 | A search by number or procedure | the list has no search field, only paging |
| TC-APP008-017 | Changing or cancelling a request | 1 | The request opens for editing | clicking the row opens nothing |
| TC-APP008-017 | Changing or cancelling a request | 3 | A remarks field | no remarks field (only Reason, Operation note and Dossier id above the list) |
| TC-APP008-019 | User with no theatre role reads the requests | 1 | No "Operation Theater" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/ot |
| TC-APP008-019 | User with no theatre role reads the requests | 2 | Access refused | U3 (no right) reads /ot/requests ("OT requests", 10 rows) |
| TC-APP008-024 | Double click, two nurses at once, and reload | 3 | The text is kept, or the nurse is warned | the half-typed procedure is lost with no warning |
| TC-APP008-025 | Request with patient, room, times and surgeon, placed on the calendar | 1 | A dialog with "Branch", … | no "Branch" field (the request takes the branch of the session) |
| TC-APP008-037 | Billing policy: percentage per incision and department type | 2 | A dialog with "Branch", … | no "Branch" field |
| TC-APP008-038 | Policy that must be refused | 1 | Refused: "incision, department type, and percentage are required" | "Saved." with the percentage empty (policy "QA-sama MVWJVGTP004") |

## 09 Procurement

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP009-001 | Creating a purchase order | 4 | "Persetujuan Purchase Order (4 steps)"; four steps, the first "Current", the others "Pending" | "PURCHASE ORDER (1 LANGKAH)": Approval Step 1 Current (found blocker 30) |
| TC-APP009-004 | Advancing one approval step | 1 | Step 1 "Pengajuan Departemen" marked "Current" | step 1 "Approval Step 1 Current" (found blocker 30) |
| TC-APP009-005 | Purchase order approved through all four steps | 1 | Row Approval "Step 2" | the chain has 1 step: the order is fully approved (found blocker 30) |
| TC-APP009-012 | Purchase order without items, quantities or a total | 1 | Item lines with item, quantity, unit and price | no item lines; the form has number, date, vendor, department, currency, advance amount and amount paid |
| TC-APP009-012 | Purchase order without items, quantities or a total | 2 | A total worked out from the lines | no total |
| TC-APP009-012 | Purchase order without items, quantities or a total | 3 | Delivery date, delivery address and payment terms | none of these fields |
| TC-APP009-013 | Purchase request and tender | 3 | A screen to record and compare offers | no tender or quotation screen (sidebar: Purchase orders Supplier Purchase requests Receipts Reorder) |
| TC-APP009-013 | Purchase request and tender | 4 | The order is created from the request | an order does not refer to a request |
| TC-APP009-014 | Vendor and department typed as free text | 1 | A list of registered vendors to choose from | "Vendor / beneficiary" is a free text field |
| TC-APP009-014 | Vendor and department typed as free text | 2 | The second spelling is recognised as the same vendor, or refused | both spellings are saved as typed |
| TC-APP009-014 | Vendor and department typed as free text | 3 | Refused: the department does not exist | saved |
| TC-APP009-014 | Vendor and department typed as free text | 4 | Refused: the vendor is missing | saved with no vendor |
| TC-APP009-015 | Approved purchase order looks like one that still waits | 1 | PO-DONE shows a status such as "Approved" | Approval "Step 1" |
| TC-APP009-015 | Approved purchase order looks like one that still waits | 2 | All steps "Done" | the approved order shows Approval Step 1 Current (its one-step chain, found blocker 30) |
| TC-APP009-015 | Approved purchase order looks like one that still waits | 3 | No approval button on an approved order | the order still offers its approval button |
| TC-APP009-018 | One person creates and approves, or approves several steps | 1 | Refused: the creator cannot approve their own order | the creator approves the order |
| TC-APP009-018 | One person creates and approves, or approves several steps | 2 | Refused: the creator cannot approve (and one person not consecutive steps) | U4 approves its own order |
| TC-APP009-019 | Rejecting a purchase order or sending it back | 1 | A button to reject, with a reason | no reject (buttons: Close, Advance approval) |
| TC-APP009-019 | Rejecting a purchase order or sending it back | 2 | A button to return it for correction | no way to send the order back (buttons: Close, Advance approval) |
| TC-APP009-019 | Rejecting a purchase order or sending it back | 3 | A remarks field | the opened order has no input for a remark |
| TC-APP009-020 | Changing or cancelling a purchase order, and paying the advance later | 1 | The order opens for editing while it is not yet approved | the opened order has no edit; only "Advance approval" and "Close" |
| TC-APP009-020 | Changing or cancelling a purchase order, and paying the advance later | 2 | A cancellation with a reason | no cancel |
| TC-APP009-020 | Changing or cancelling a purchase order, and paying the advance later | 3 | A payment entry; the balance drops by 1000000 | no payment entry; amount paid stays as typed at creation |
| TC-APP009-020 | Changing or cancelling a purchase order, and paying the advance later | 4 | A printable purchase order | no print or send |
| TC-APP009-022 | Advance payment and Finance | 1 | A payment voucher or a vendor advance for the order | no voucher names QA-PO-001-MVWL1MYC005 |
| TC-APP009-022 | Advance payment and Finance | 2 | An amount owed to the vendor, or a commitment | no entry of 4,000,000 for QA-PO-001-MVWL1MYC005 |
| TC-APP009-022 | Advance payment and Finance | 3 | A warning or a refusal (larger than the department's budget) | created with no warning |
| TC-APP009-023 | Amounts at their limits | 4 | Refused: an order needs an amount | saved with IDR 0,00 |
| TC-APP009-023 | Amounts at their limits | 5 | Refused with a message about the size | toast "ERROR: numeric field overflow (SQLSTATE 22003)" |
| TC-APP009-024 | Purchase order form at its limits | 2 | A message that the currency is missing | saved; Amount reads "IDR 100.000,00" |
| TC-APP009-024 | Purchase order form at its limits | 3 | Refused, or the currency is chosen from a list | saved; Amount reads "xyz 5.000.000,00" |
| TC-APP009-024 | Purchase order form at its limits | 5 | Refused, or a warning about the date | saved without a word: 1900-01-01, 2099-12-31 |
| TC-APP009-025 | Two purchase orders with the same number | 1 | Refused: the number is already in use | a second order "QA-PO-001-MVWL1MYC007" is created |
| TC-APP009-025 | Two purchase orders with the same number | 3 | Every number appears once | QA-PO-001-MVWL1MYC007, PO-1793462392 appear more than once |
| TC-APP009-026 | Finding a purchase order and the orders that wait for me | 1 | A search by document number or vendor | the list has no search |
| TC-APP009-026 | Finding a purchase order and the orders that wait for me | 2 | A filter is present | the list has no filter by approval step or "waiting for me" |
| TC-APP009-026 | Finding a purchase order and the orders that wait for me | 3 | The list sorts by that column | a click on a heading changes nothing |
| TC-APP009-026 | Finding a purchase order and the orders that wait for me | 4 | The first row of the list | the first row is QA-PO-001-MVWB83UI00B; QA-PO-001-MVWKTWSG004 is on a later page |
| TC-APP009-031 | User with no procurement role reads the purchase orders | 1 | No "Procurement" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/procurement |
| TC-APP009-031 | User with no procurement role reads the purchase orders | 2 | Access refused | U3 (no right) reads /procurement/purchase-orders ("Purchase orders", 10 rows) |
| TC-APP009-036 | Double click, two approvers at once, and reload | 3 | The text is kept, or the officer is warned | the half-filled order is lost with no warning |
| TC-APP009-057 | Screen /procurement/reorder opens | 1 | The screen shows its title and controls | the title and a read-only list; no control |

## 10 HR

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP010-004 | Reporting authority and linked user account | 3 | The file of the linked employee opens by itself as "Edit employee" | the list opens; no file of its own |
| TC-APP010-004 | Reporting authority and linked user account | 3 | The notice "Configuration is missed" is not shown | the notice is shown to the linked account |
| TC-APP010-015 | Hub, navigation and Indonesian | 2 | "Duty roster" leads to the Duty Roster module | the link (/id/roster) stays on the HR hub |
| TC-APP010-019 | Number of days that does not match the dates | 1 | "Days" changes to 5 | "Days" stays 1 |
| TC-APP010-020 | Approving one's own leave, and leave that needs no approval | 3 | The approver is shown | no column names who decided (columns: Type, From, To, Days, Slot, Status, Reason, Actions) |
| TC-APP010-024 | Approved leave in Duty Roster and Payroll | 1 | A warning or a refusal when EMP-1 is given a shift on a day of leave | no shift can be assigned: "Duty roster" opens /id/roster and the site keeps no roster |
| TC-APP010-025 | Employee who has left: "Relieved" and the user account | 2 | "Relieved", with the date of leaving | the file reads inactive (Tidak aktif): "Relieved" is not kept |
| TC-APP010-025 | Employee who has left: "Relieved" and the user account | 2 | "Relieved", with the date of leaving | no field for the date of leaving |
| TC-APP010-025 | Employee who has left: "Relieved" and the user account | 4 | A status column or a mark for employees who have left | the row shows no status |
| TC-APP010-027 | Employee form: missing fields and free text | 1 | The missing field is marked, or a message names it | "Next" is only disabled; nothing shows which field is missing |
| TC-APP010-027 | Employee form: missing fields and free text | 2 | Refused: an employee needs a name | saved without a name |
| TC-APP010-027 | Employee form: missing fields and free text | 3 | "Gender" is a list to choose from | "Gender" is a free text field |
| TC-APP010-027 | Employee form: missing fields and free text | 3 | "Category" is a list to choose from | "Category" is a free text field |
| TC-APP010-027 | Employee form: missing fields and free text | 4 | Refused: not an e-mail address; date of birth in the future | saved |
| TC-APP010-027 | Employee form: missing fields and free text | 5 | Refused with a message that names the limit of 64 | toast "Could not save employee" |
| TC-APP010-028 | Reporting authority and account login that cannot be right | 2 | A message that this employee number does not exist | toast "Could not save employee" |
| TC-APP010-028 | Reporting authority and account login that cannot be right | 3 | A message that this user does not exist | toast "Could not save employee" |
| TC-APP010-028 | Reporting authority and account login that cannot be right | 5 | The second save is refused: the two would report to each other | both saved |
| TC-APP010-029 | Branch mapping and allocations that cannot be seen | 1 | A list of branch mappings with a button to add one | the file has no place for a second branch |
| TC-APP010-029 | Branch mapping and allocations that cannot be seen | 2 | A list with service center, from date and to date | the file shows no allocations; only the input "Allocation from" |
| TC-APP010-029 | Branch mapping and allocations that cannot be seen | 3 | A to date can be set | there is no "to" date for an allocation |
| TC-APP010-029 | Branch mapping and allocations that cannot be seen | 4 | The allocation is moved, or the second save is refused as a double | both saves are accepted; nothing shows whether an allocation was moved or added |
| TC-APP010-030 | Practice licence that has expired | 1 | A warning that the licence has expired | saved without a word |
| TC-APP010-030 | Practice licence that has expired | 2 | Expired or soon-expiring licences are marked | the list shows number and name only |
| TC-APP010-030 | Practice licence that has expired | 3 | A report or a filter of licences that run out | no such screen (HR menu: Employee, Leave applications, Profile, Leave year, Attendance, Doctor fee) |
| TC-APP010-031 | What the employee file cannot hold | 1 | A national ID number and a joining date on "File" | missing: joining date |
| TC-APP010-031 | What the employee file cannot hold | 2 | A phone field on "Contacts" | a contact is an address (Type, Address, Country, State, District, City) |
| TC-APP010-031 | What the employee file cannot hold | 3 | A file can be chosen and is shown | "Photo location" is a text field; no file is uploaded or shown |
| TC-APP010-031 | What the employee file cannot hold | 4 | A delete, or a status for it | no delete; statuses Active, Inactive, Relieved |
| TC-APP010-033 | User without the HR right | 1 | Refused with a message that the user may not do this | toast "Could not save employee" |
| TC-APP010-034 | User with no HR role reads every employee file | 1 | No "HR" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/hr |
| TC-APP010-034 | User with no HR role reads every employee file | 2 | Access refused | U3 (no right) reads /hr/employees ("Employee", 10 rows) |
| TC-APP010-034 | User with no HR role reads every employee file | 3 | Not possible | U3 opens QA-EMP-001-MVWK8UBK00C and walks through the six steps of the file |
| TC-APP010-034 | User with no HR role reads every employee file | 4 | Not possible | "Download" gives U3 the file employees.csv |
| TC-APP010-034 | User with no HR role reads every employee file | 5 | Access refused | U3 (no right) reads /hr/leave-applications ("Leave applications", 10 rows) |
| TC-APP010-038 | Script text in the file and formulas in the downloaded list | 3 | The second name is shown as text, not run as a formula | the cell begins with "=" as typed |
| TC-APP010-039 | Double click, two admins at once, and reload | 1 | One employee. The button is disabled while it reads "Saving…" | 0 employees |
| TC-APP010-040 | HR desk, My profile: adding an employee, linking my account, reading my profile | 4 | Toast "Saved." | refused: "hr: invalid input: duplicate": U1 is linked to the employee of an earlier run of this test, and the link is not moved to QA-EMP-01-MVW7XW2T001 |
| TC-APP010-045 | HR desk, Year balance: comp-off for a worked day off | 1 | Toast "Saved."; a row for the comp-off with an id | "Saved.", but the list shows no row of QA-EMP-01-MVWKC4JR001 |

## 11 Laboratory

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP011-010 | Hub, navigation and Indonesian | 1 | A button "Open worklist" | "Open worklist" is a link |
| TC-APP011-011 | Lab order without a patient | 1 | PT-1's name and MRN on the row | the row names no patient; only the remark tells the two orders apart |
| TC-APP011-011 | Lab order without a patient | 2 | The label carries the patient's name, MRN and date of birth beside the sample ID | no label of the Sample workflow names the patient |
| TC-APP011-011 | Lab order without a patient | 3 | The dialog shows whose result is being typed | the dialog names no patient |
| TC-APP011-011 | Lab order without a patient | 4 | A patient must be picked | the dialog has no patient field |
| TC-APP011-012 | Result does not come back to the doctor | 1 | The lab order and its result are listed | the consultation shows no result (nor the order) |
| TC-APP011-012 | Result does not come back to the doctor | 2 | A notice or a marker on the patient | no notification and no marker that the result is ready |
| TC-APP011-013 | Order form that is not complete, and free-text tests | 2 | A message that the result type is missing | nothing happens, no message |
| TC-APP011-013 | Order form that is not complete, and free-text tests | 3 | The test is picked from the laboratory's list, so a misspelt name cannot be saved | the result type is free text; "Hemoglobn" is saved |
| TC-APP011-013 | Order form that is not complete, and free-text tests | 4 | A warning about the repeated order, or both are kept on purpose | both are saved without a warning |
| TC-APP011-015 | Step clicked by mistake | 1 | A question to confirm before the step is saved | saved at once (toast "") |
| TC-APP011-015 | Step clicked by mistake | 2 | An undo, or a step back with a reason | no way back on the row (buttons: LAB-20261031-1F72F9EB, Accepted, Result status, Capture result, Handover, Print barcode); the Sample workflow has "Revert latest stamp" (TC-APP011-041) |
| TC-APP011-016 | Sample that cannot be used, order that is not needed | 1 | "Reject sample" with a reason, which asks for a new sample | no "Reject sample" on the row; a reject is inside "Result status" |
| TC-APP011-016 | Sample that cannot be used, order that is not needed | 2 | A cancellation with a reason | no cancel on the row |
| TC-APP011-016 | Sample that cannot be used, order that is not needed | 3 | Rejected and cancelled orders have their own status | the status list holds All statuses, Ordered, Generated, Sent, Accepted, Resulted |
| TC-APP011-017 | Result released without a second check | 1 | The result waits for validation by a second, authorised user | final at once: Status "Resulted", Result status "—" |
| TC-APP011-017 | Result released without a second check | 3 | Separate fields for the unit and the method | fields: Lab result, Result range, Remarks |
| TC-APP011-018 | Result changed after it was released | 1 | A reason is asked for, and the change is saved as a correction | saved over the released result with no reason |
| TC-APP011-018 | Result changed after it was released | 2 | The result is marked as corrected, with the earlier value, the user and the time | the row shows 8.5 g/dL only |
| TC-APP011-019 | Result form at its limits | 2 | A message that the result is missing | nothing happens, no message |
| TC-APP011-019 | Result form at its limits | 4 | The range is removed | the old range comes back: "12.0 - 16.0 g/dL" |
| TC-APP011-020 | Test with several values | 1 | One line per parameter, each with value, unit and range | one "Lab result" and one "Result range" of 255 characters each |
| TC-APP011-020 | Test with several values | 2 | Every value is stored and can be read on its own | the panel is stored as one line of text: "Hb 13.5 g/dL; Leukosit 7.2 10^3/uL; Trombosit 250 10^3/uL; Hematokrit 40 %" |
| TC-APP011-022 | Times of a sample | 1 | The time of each step, and the time the result was saved | no time is shown on the row or in the dialog |
| TC-APP011-022 | Times of a sample | 3 | A marker or a sort by waiting time | none |
| TC-APP011-023 | Two analysts on the same order | 3 | Analyst 2 is warned that a result was saved meanwhile | 14.0 g/dL saved over 13.5 g/dL with no warning (row: 14.0 g/dL) |
| TC-APP011-023 | Two analysts on the same order | 4 | The text is kept, or the analyst is warned | the half-typed result is lost with no warning |
| TC-APP011-025 | User with no laboratory role reads the worklist | 1 | No "Laboratory" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/laboratory |
| TC-APP011-025 | User with no laboratory role reads the worklist | 2 | Access refused | U3 (no right) reads /laboratory/orders ("Lab order worklist", 10 rows) |

## 12 RIS

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP012-006 | Hub, navigation and Indonesian | 1 | A button "Open orders" | "Open orders" is a link |
| TC-APP012-007 | Radiology order without a patient | 1 | A patient must be picked from the register | the form has no patient field |
| TC-APP012-007 | Radiology order without a patient | 2 | Each row shows the patient's name and MRN | the rows show reference and study only: RAD-1793460866 QA Thorax PA MVWK94RM003 — — — — |
| TC-APP012-009 | Completing or correcting an order later | 1 | The order opens for editing | a row cannot be opened |
| TC-APP012-010 | Status of an examination and the modality schedule | 1 | A status per order | columns: Order ref, Study, Study date, Accession, Reported by, Links |
| TC-APP012-010 | Status of an examination and the modality schedule | 2 | A filter by status | no filter |
| TC-APP012-011 | Order form at its limits | 4 | Refused with a message that names the limit of 255, or the field stops at 255 | toast "failed to create radiology order" |
| TC-APP012-011 | Order form at its limits | 5 | Refused with a message that names the limit of 500 | toast "failed to create radiology order" |
| TC-APP012-012 | Dates that cannot be right | 1 | Refused, or a warning | saved with toast "Order created" |
| TC-APP012-012 | Dates that cannot be right | 2 | Refused | saved with toast "Order created" |
| TC-APP012-012 | Dates that cannot be right | 3 | Refused: a report needs a reporter | saved with toast "Order created" |
| TC-APP012-013 | Study time shown on the list | 2 | Today 10:00 (2026-10-31) | "2026-10-31 03:00" |
| TC-APP012-014 | Same reference or accession number twice | 1 | Refused: the reference is in use | a second order with QA-RAD-0001-MVWK6IRU002 is created |
| TC-APP012-014 | Same reference or accession number twice | 2 | Refused, or a warning | a second order with QA-ACC-0001-MVWK6IRU002 is created with no warning |
| TC-APP012-015 | Finding an order | 1 | A search by reference, accession number, study and date | no search |
| TC-APP012-015 | Finding an order | 2 | A filter by date and study | no filter; only paging, 10 rows at a time |
| TC-APP012-016 | Image and report links | 1 | Refused: only addresses of the hospital's viewer are accepted | saved |
| TC-APP012-018 | User without the radiology right | 1 | The button "New order" is not offered, or the page is refused | "New order" is shown to U3 (no right) |
| TC-APP012-019 | User with no radiology role reads the orders | 1 | No "RIS" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/radiology |
| TC-APP012-019 | User with no radiology role reads the orders | 2 | Access refused | U3 (no right) reads /radiology/orders ("Orders", 10 rows; "Report" of a row leads to https://pacs.example.test/report/QA-ACC-0001) |
| TC-APP012-024 | Double click, two radiographers at once, and reload | 3 | The entries are kept, or the radiographer is warned | the half-filled order is lost with no warning |

## 13 Dietary

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP013-011 | Hub, navigation and Indonesian | 1 | A button "Open requests" | "Open requests" is a link |
| TC-APP013-012 | Diet request without a patient or a diet | 1 | A patient must be picked from the admitted patients | no patient field |
| TC-APP013-012 | Diet request without a patient or a diet | 2 | Fields or lists for the diet type, the meal time and allergies | none; the diet can only be written into "Comments" |
| TC-APP013-012 | Diet request without a patient or a diet | 3 | The beds of Inpatient are offered | "Bed no" is typed by hand |
| TC-APP013-012 | Diet request without a patient or a diet | 4 | Each row shows the patient and the diet | the row shows numbers and dates only: QA-DIET-001-MVWKWOV4004 \| 2026-10-31 \| 2026-10-31 \| 1 line(s) \| Active |
| TC-APP013-013 | Diet request and the patient's admission | 1 | A request for the new patient is proposed, or the admitted patients are offered | the form has free-text Bed no and Bed category only: no patient is offered |
| TC-APP013-013 | Diet request and the patient's admission | 2 | The line shows the new bed | the line keeps QA-0D43F5LMM-RI-0102: the request is not linked to the stay |
| TC-APP013-013 | Diet request and the patient's admission | 3 | The request is closed; Status is no longer "Active" | RQ-1 stays "Active" after the discharge |
| TC-APP013-014 | Following a diet request: prepared, delivered, changed, cancelled | 1 | A button or a list of statuses | none; the line status is what was typed at creation ("ordered") |
| TC-APP013-014 | Following a diet request: prepared, delivered, changed, cancelled | 2 | The line can be edited | no edit |
| TC-APP013-014 | Following a diet request: prepared, delivered, changed, cancelled | 3 | A cancellation; Status then reads "Inactive" | no cancel |
| TC-APP013-014 | Following a diet request: prepared, delivered, changed, cancelled | 4 | A button to add a line | no way to add a line ("One line per dialog") |
| TC-APP013-015 | Diet request number that is already used | 1 | A message that the number already exists | toast "failed to create diet request" |
| TC-APP013-015 | Diet request number that is already used | 2 | Accepted, or a message that explains where the number is used | refused with "failed to create diet request" |
| TC-APP013-015 | Diet request number that is already used | 3 | The number can be left empty | "Doc no" is required and offers no automatic number |
| TC-APP013-016 | Diet request form at its limits | 2 | A message that the bed is missing | nothing happens, no message |
| TC-APP013-016 | Diet request form at its limits | 3 | Refused with a message that names the limit of 50, or the field stops there | toast "failed to create diet request" |
| TC-APP013-016 | Diet request form at its limits | 4 | Refused with a message that names the limit of 255 | toast "failed to create diet request" |
| TC-APP013-016 | Diet request form at its limits | 5 | A request date can be chosen | no date field: document and request date are always today |
| TC-APP013-017 | TPN saved on a typed patient name | 1 | A search of the registered or admitted patients, by name or MRN | "Patient" is a plain text field |
| TC-APP013-017 | TPN saved on a typed patient name | 2 | The row shows the patient's MRN or bed next to the name | the row: QA-DIE Pasien Satu MVWKXN82004 \| 24.22 · Normal \| 70 g \| 388.24 g \| 200 mL \| 2.1 L |
| TC-APP013-017 | TPN saved on a typed patient name | 3 | The two rows can be told apart | two identical rows |
| TC-APP013-017 | TPN saved on a typed patient name | 4 | Refused | saved on a name that belongs to no patient |
| TC-APP013-018 | Typing decimal numbers into the TPN fields | 1 | The field shows 1.7 | the field shows "17" |
| TC-APP013-018 | Typing decimal numbers into the TPN fields | 2 | The field shows 1.5 | the field shows "15" |
| TC-APP013-018 | Typing decimal numbers into the TPN fields | 3 | The field shows 0.5 | the field shows "5" |
| TC-APP013-018 | Typing decimal numbers into the TPN fields | 4 | The field shows 1,7 or 1.7, or the comma is refused with a hint | the field shows "7" |
| TC-APP013-019 | TPN with impossible or dangerous values | 1 | Refused or flagged: the protein and lipid calories exceed the energy | no mark or warning |
| TC-APP013-019 | TPN with impossible or dangerous values | 2 | A warning: the dextrose is above the maximum | no mark or warning |
| TC-APP013-019 | TPN with impossible or dangerous values | 3 | A warning about the potassium and the insulin | no mark or warning |
| TC-APP013-019 | TPN with impossible or dangerous values | 4 | Refused, or saved only after a confirmation | saved without a question: case(s) 1, 2, 3 |
| TC-APP013-020 | TPN with missing inputs | 2 | A message that the fluid is missing | toast "height, weight, energy, protein and fluid are required" |
| TC-APP013-020 | TPN with missing inputs | 3 | A message that the patient is missing | nothing happens, no message |
| TC-APP013-020 | TPN with missing inputs | 4 | A message that the code is missing | nothing happens, no message |
| TC-APP013-022 | Clinical basis of the TPN calculation | 2 | Only the volume and weight of the lipid emulsion change | also changed: Dextrose 388.24 g / 1320 kcal → 447.06 g / 1520 kcal; Dextrose rate 3.85 mg/kg/min → 4.44 mg/kg/min |
| TC-APP013-022 | Clinical basis of the TPN calculation | 3 | Each field and each result names its unit, for example mEq, mmol or units | fields read "Sodium / L, Potassium / L, Calcium / L, Magnesium / L, Phosphate / L, MVI-12 / L, Trace metals / L, Heparin / L, Insulin / L"; results "Na 84 · K 42 · Ca 10.5 · Mg 8.4 · PO4 21" and "MVI 21 · Trace 2.1 · Heparin 0 · Insulin 0" with no unit |
| TC-APP013-023 | Compounding workbench does not show the whole prescription | 1 | Patient, protein, dextrose, lipid, volume, and the electrolytes and additives | the row: QA-DIE Pasien Satu MVWKXN82009 \| 24.22 · Normal \| 70 g \| 388.24 g \| 200 mL \| 2.1 L |
| TC-APP013-023 | Compounding workbench does not show the whole prescription | 2 | The full prescription opens | a row cannot be opened |
| TC-APP013-023 | Compounding workbench does not show the whole prescription | 3 | The date, the time and the person who saved it | none is shown |
| TC-APP013-023 | Compounding workbench does not show the whole prescription | 4 | A status, a button to mark it prepared and a print-out | none |
| TC-APP013-024 | Changing, cancelling or saving a TPN twice | 1 | The second click is refused, or the dietitian is asked whether a second TPN is meant | a second, identical row is saved |
| TC-APP013-024 | Changing, cancelling or saving a TPN twice | 2 | The prescription can be edited before it is prepared | no edit |
| TC-APP013-024 | Changing, cancelling or saving a TPN twice | 3 | A cancellation with a reason | no cancel |
| TC-APP013-025 | TPN without a prescriber, a check or a link to Pharmacy | 1 | A prescriber is required | the form has no prescriber (fields: Patient, Height, Weight, Energy (kcal), Protein (g/kg), Fluid (mL/kg), Sodium / L, Potassium / L, Calcium / L, Magnesium / L, Phosphate / L, MVI-12 / L, Trace metals / L, Heparin / L, Insulin / L, Template code, Description) |
| TC-APP013-025 | TPN without a prescriber, a check or a link to Pharmacy | 2 | The prescription waits there to be verified and prepared | Pharmacy, Orders shows no TPN |
| TC-APP013-026 | TPN templates: same code twice, stale list, no change | 1 | Refused: the code exists, or the dietitian is asked whether to replace it | saved; "QA-TPN-STD-MVWBFJ20001" is listed 1 times |
| TC-APP013-026 | TPN templates: same code twice, stale list, no change | 3 | A template can be edited or removed | no edit or delete |
| TC-APP013-026 | TPN templates: same code twice, stale list, no change | 4 | Refused with a message that names the limit of 64 | toast "tpn failed" |
| TC-APP013-028 | User with no dietary role reads requests and TPN prescriptions | 1 | No "Dietary" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/diet |
| TC-APP013-028 | User with no dietary role reads requests and TPN prescriptions | 2 | Access refused | U3 (no right) reads /diet/tpn ("Total parenteral nutrition", 10 rows) |
| TC-APP013-028 | User with no dietary role reads requests and TPN prescriptions | 3 | Access refused | U3 (no right) reads /diet/requests ("Diet requests", 10 rows) |
| TC-APP013-033 | Double click, two dietitians at once, and reload | 1 | One request. The button is disabled while it reads "Saving…" | 0 requests |
| TC-APP013-033 | Double click, two dietitians at once, and reload | 4 | The inputs are kept, or the dietitian is warned | the half-filled inputs are lost with no warning |
| TC-APP013-043 | Two patients with a prescription | 2 | A way to choose which prescription is assessed or ordered | none: the first prescription of the list is used |

## 14 Hospital Accounts

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP014-007 | Discount above the cap: held, approved, then paid | 1 | Status badge "Waiting for approval" | the discount of 60,000 above the cap of 50,000 is not held: status "Draft", "Apply discount" is disabled, nothing waits for approval |
| TC-APP014-016 | Item price settings and an estimate | 3 | Picks QA-PARA, quantity 10 | the card has no quantity field: each line is one unit |
| TC-APP014-016 | Item price settings and an estimate | 4 | Patient net Rp 12.500, Tax Rp 1.375, Total Rp 13.875 | the estimate reads "t. Nothing is saved to stock or to a charge. Patient Item code Add line QA-PARA · Paracetamol 500mg Tablet 1 Estimating…" |
| TC-APP014-017 | Insurance claim from eligibility to reconciliation | 2 | Panel line "This charge uses that split: Rp 1.000.000 / Rp 4.000.000" | no split line |
| TC-APP014-019 | A sale using the keyboard only | 2 | The cursor moves to the cash amount | the cursor is in "" |
| TC-APP014-023 | Paying more than the amount due | 1 | The cashier is told that change of 33,500 is due, or the excess is refused | accepted: Deposits Rp 200.000, no change shown |
| TC-APP014-024 | Amount typed with dots as thousands separators | 1 | A sale of Rp 150.000 before tax | a sale of Rp 150: the dot is read as a decimal point |
| TC-APP014-032 | Full refund of a paid sale | 2 | A status that shows the sale was refunded, with nothing due | status "Draft", Amount due Rp 166.500 |
| TC-APP014-034 | A bill with cents | 1 | Amount due shown to the cent, or rounded by the branch rule | Rp 9.000 |
| TC-APP014-034 | A bill with cents | 2 | The amount collected equals the amount due (12,487.50) | collected Rp 9.000 (prefilled 9000) |
| TC-APP014-037 | Closing the day with the declared amount left empty | 1 | The screen asks for the amount, or asks to confirm | the day of U4 is closed at once with no declared amount (Variance "-Rp 2.220.000") |
| TC-APP014-040 | Giving the patient a receipt | 2 | A Print button or a printable page | no print or download control |
| TC-APP014-040 | Giving the patient a receipt | 3 | The receipt can be shown again | the receipt is not shown when the paid sale is found again |
| TC-APP014-046 | Preparing an insured patient from the screens | 1 | A form or button to request a pre-authorisation | none: the panel only searches existing ones |
| TC-APP014-046 | Preparing an insured patient from the screens | 2 | A form or button to add the referral and its SEP number | none: "Check SEP" checks an existing one |
| TC-APP014-048 | User with no finance role looks at bills and the drawer | 1 | No "Hospital Accounts" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/billing |
| TC-APP014-048 | User with no finance role looks at bills and the drawer | 2 | Access refused | U3 (no right) reads /billing/cashier ("Fast Cashier", 0 rows; the invoice INV-1793459614-9ba2a260 is found with its amounts) |
| TC-APP014-052 | Losing a sale on screen: Esc, session end, double click | 1 | The screen keeps the sale, or asks before clearing | Esc clears the whole screen at once, with no question |
| TC-APP014-061 | Patient ledger: billing an inpatient service from the tariff | 4 | A row with the state "open" and "QA-RI-0001-MVWJK9A000D deposit 0" | the list without a search does not show the new invoice (it lists some invoices only) |

## 15 Emergency

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP015-003 | Assigning a bay | 3 | Priority 4 | Priority 2 |
| TC-APP015-007 | Hub, navigation and Indonesian | 1 | "Triage & bay assignment (IGD)", a button "Open visits" and one tile "Visits" under "Workflow" | "Register Emergency Patient, do Triage and Monitor the status."; tiles Registration, Emergency Patients, Triage under "Accident & Emergency" |
| TC-APP015-007 | Hub, navigation and Indonesian | 2 | The tile and the sidebar item "Visits" open Visits | neither the hub nor the sidebar has "Visits"; the screen opens only by its address |
| TC-APP015-008 | Finding the patient and the bed | 1 | A list of matching patients to pick from | "Patient ID (UUID)" takes the internal id only; the name is refused ("patient_id required") |
| TC-APP015-008 | Finding the patient and the bed | 2 | Not needed; if looked for, it is shown | Registered patients shows no internal id; the test reads it from the server answer |
| TC-APP015-008 | Finding the patient and the bed | 3 | A list of free beds to pick from | "Bed ID (UUID)" takes the internal id only; the bed number is refused ("bed_id required") |
| TC-APP015-008 | Finding the patient and the bed | 4 | The patient's name and MRN and the bed number are shown | the row shows 2 \| 12599094… \| — |
| TC-APP015-009 | Triage without a level | 1 | A form for the triage level or colour, the complaint and the vital signs | "Triage" is one click that stores the time |
| TC-APP015-009 | Triage without a level | 2 | The chest-pain patient moves above the ankle patient in the list | no urgency can be saved; the ankle patient, who arrived first, stays above |
| TC-APP015-009 | Triage without a level | 3 | The triage level of each patient | the Priority column is the step of the visit (1 waiting, 2 triaged, 4 in a bay) |
| TC-APP015-010 | Visit for a wrong or unknown patient ID | 2 | Refused with a clear message that an ID is expected | toast "patient_id required" |
| TC-APP015-010 | Visit for a wrong or unknown patient ID | 4 | Refused, or a warning that the patient belongs to another branch | "Visit created" for PT-B (Qonita Nugroho, Kemayoran) while working on BR-A |
| TC-APP015-010 | Visit for a wrong or unknown patient ID | 5 | Refused: the record was merged | "Visit created" for the merged patient MRN-2026-E657C3B8 |
| TC-APP015-012 | Bay or triage by mistake | 1 | A "Change bay" action | no button is left on the row |
| TC-APP015-012 | Bay or triage by mistake | 2 | The bay is freed when the patient leaves | nothing frees the bay |
| TC-APP015-012 | Bay or triage by mistake | 3 | An undo of the triage click | none |
| TC-APP015-013 | Same patient with two open visits | 1 | A warning that PT-1 already has an open visit | a second visit is created |
| TC-APP015-013 | Same patient with two open visits | 2 | One visit for PT-1 | 2 visits |
| TC-APP015-014 | Ending a visit | 1 | A discharge with time and outcome | the row of a visit "In bay" has no button |
| TC-APP015-014 | Ending a visit | 2 | A hand-over to Inpatient that keeps the patient and the visit | the row of a visit "In bay" has no button |
| TC-APP015-014 | Ending a visit | 3 | An outcome for each; the status "Death" for the fourth | the row of a visit "In bay" has no button |
| TC-APP015-015 | Priority order across pages | 1 | The oldest waiting patient is the first row | the waiting patient is not on page 1 (pages are cut by arrival time, newest first) |
| TC-APP015-016 | Times shown on the list | 1 | Today 22:53 (WIB) | "2026-10-31 15:53" (world time, seven hours behind) |
| TC-APP015-016 | Times shown on the list | 2 | Today about 22:53 (WIB) | "2026-10-31 15:53" |
| TC-APP015-017 | Clinical record and charges of an emergency visit | 1 | The complaint, vital signs, the doctor in charge and notes can be recorded on the visit | the visit has no form: only priority, bed, triage time and status |
| TC-APP015-017 | Clinical record and charges of an emergency visit | 2 | The emergency visit is shown, and orders are tied to it | the consultation shows no emergency visit |
| TC-APP015-019 | User with no emergency role reads the visits | 1 | No "Emergency" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/emergency |
| TC-APP015-019 | User with no emergency role reads the visits | 2 | Access refused | U3 (no right) reads /emergency/visits ("Visits", 10 rows) |
| TC-APP015-020 | Visits of another branch | 1 | No visit of BR-B | U1 (Podomoro) sees 1 visit(s) of the Kemayoran patient 0dab9f2c-32a0-5946-bae7-d6890eb7c0fa |
| TC-APP015-023 | Double click, two nurses at once, and reload | 2 | Nurse 2 is told that triage was already recorded | triage is recorded a second time |
| TC-APP015-023 | Double click, two nurses at once, and reload | 3 | Nurse 2 is told that the visit already has a bay | the visit is moved to QA-IGD-02-MVWJTWUP00C |
| TC-APP015-023 | Double click, two nurses at once, and reload | 4 | The text is kept, or the nurse is warned | the half-typed id is lost with no warning |
| TC-APP015-032 | Receiving that is refused | 1 | Toast "That registration is not valid for emergency." | "(no patient offered)" |
| TC-APP015-032 | Receiving that is refused | 2 | Toast "This visit is already received." | "(no patient offered)" |
| TC-APP015-036 | Walk-in that is refused or doubled | 4 | A warning about a duplicate | a second patient and a second open encounter are saved without a warning |
| TC-APP015-058 | The old Visits screen beside the new screens | 4 | The second patient is received on Emergency Patients | "no toast" and the patient is not listed |

## 16 MRD

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP016-008 | Hub, navigation and Indonesian | 1 | A button "File Requests" | "File Requests" is a link |
| TC-APP016-008 | Hub, navigation and Indonesian | 3 | Column names, buttons, statuses and toasts are Indonesian | English: No. dokumen, Tanggal, Pasien, Status, Aksi |
| TC-APP016-009 | File request without a patient or a requester | 1 | A patient must be picked from the registered patients | the form has Document number, Document date, Request type, Purpose |
| TC-APP016-009 | File request without a patient or a requester | 2 | A field for the requester or the department | none |
| TC-APP016-009 | File request without a patient or a requester | 3 | Each row shows the patient and the requester | the row: QA-REQ-011-MVWL3M21007 \| 2026-10-31 \| QA Kontrol \| PKLM · Pinjam klaim \| Yes |
| TC-APP016-010 | Request and issue are not connected | 1 | The request can be chosen; patient and purpose are taken from it | the issue dialog does not ask for a request |
| TC-APP016-010 | Request and issue are not connected | 2 | REQ-1 shows a status such as "Fulfilled", with the record's number | the row still reads Active "Yes": QA-REQ-001-MVWL3M21009 \| 2026-10-31 \| QA Kontrol poli penyakit dalam \| PKLM · Pinjam klaim \| Yes |
| TC-APP016-010 | Request and issue are not connected | 3 | A button to reject or close, with a reason | none |
| TC-APP016-011 | Issuing a file that is already out | 1 | A warning that PT-1's file is already out, with the number of the open loan | no warning when the patient is chosen |
| TC-APP016-011 | Issuing a file that is already out | 2 | Refused: the file has not been returned | a second loan of the same file is issued |
| TC-APP016-012 | Who has the file and when it is due | 1 | Fields for the borrower and the destination | no borrower; "From" and "To" are free text places |
| TC-APP016-012 | Who has the file and when it is due | 2 | A due date | none |
| TC-APP016-012 | Who has the file and when it is due | 3 | The date of return and the person who took it back | the row shows neither |
| TC-APP016-012 | Who has the file and when it is due | 4 | A list or a mark for overdue files | none (menu: Home, Dashboard, Preferences, Apps, Reports, Analytics, File Requests, Patient Records, Missing diagnosis codes, Visits without a document) |
| TC-APP016-014 | No register of files: new patients, location and retention | 1 | An entry for the patient's file, created at registration | the new patient is not listed; Patient Records lists loans only |
| TC-APP016-014 | No register of files: new patients, location and retention | 2 | A location or rack number | columns Doc no., Doc date, Patient, Status, Actions |
| TC-APP016-014 | No register of files: new patients, location and retention | 3 | A retention list | none (menu: Home, Dashboard, Preferences, Apps, Reports, Analytics, File Requests, Patient Records, Missing diagnosis codes, Visits without a document) |
| TC-APP016-015 | Document number that is already used | 1 | Toast "Document number already exists" | toast "Failed to create request" |
| TC-APP016-015 | Document number that is already used | 3 | Accepted, or a message that explains where the number is used | toast "Document number already exists", although QA-MR-B01-MVWB0W48003 is not in the BR-A list (numbers are unique across branches) |
| TC-APP016-015 | Document number that is already used | 4 | The number can be left empty | "Document number" of "New request" is required, with no automatic number |
| TC-APP016-015 | Document number that is already used | 4 | The number can be left empty | "Document number" of "Issue record" is required, with no automatic number |
| TC-APP016-016 | Request form and issue form at their limits | 1 | A message that the number is missing | toast "Choose an active request type. Purpose stays." |
| TC-APP016-016 | Request form and issue form at their limits | 2 | Refused with a message that names the limit of 50, or the field stops there | toast "Failed to create request" |
| TC-APP016-016 | Request form and issue form at their limits | 3 | Refused with a message that names the limit of 255 | toast "Failed to create request" |
| TC-APP016-016 | Request form and issue form at their limits | 5 | Refused with a message that names the limit of 1,000 | toast "Failed to issue record" |
| TC-APP016-016 | Request form and issue form at their limits | 6 | Refused, or a warning about the date | saved: 1900-01-01 request, 2099-12-31 record |
| TC-APP016-017 | Patient search that finds nothing or too much | 1 | A text such as "No patients found" | nothing appears, with no message |
| TC-APP016-017 | Patient search that finds nothing or too much | 2 | All matching patients, or the first 10 with a hint that there are more | 10 patients with no hint and no further page |
| TC-APP016-017 | Patient search that finds nothing or too much | 3 | Nothing, with a text that says so | nothing appears, with no message |
| TC-APP016-017 | Patient search that finds nothing or too much | 4 | The patient is found by date of birth or national ID | nothing is found: the search looks at name and MRN only |
| TC-APP016-018 | Returning a file twice or by mistake | 2 | Toast "Record already returned" | "Failed to return record" |
| TC-APP016-018 | Returning a file twice or by mistake | 4 | An undo that sets the record to "Issued" again | the returned row offers Movement, Open review |
| TC-APP016-019 | Changing or cancelling a request or an issued record | 1 | The request opens for editing | a row cannot be opened |
| TC-APP016-019 | Changing or cancelling a request or an issued record | 2 | A cancellation; the row then reads Active "No" | no cancel |
| TC-APP016-019 | Changing or cancelling a request or an issued record | 3 | The record opens; the patient can be corrected, or the issue cancelled with a reason | only Movement, Open review, Return |
| TC-APP016-020 | Finding a request, a loan or the files that are out | 1 | A search by patient, MRN or document number | none |
| TC-APP016-020 | Finding a request, a loan or the files that are out | 2 | A filter "Issued" | none |
| TC-APP016-020 | Finding a request, a loan or the files that are out | 3 | The list sorts by that column | clicking a heading does nothing |
| TC-APP016-020 | Finding a request, a loan or the files that are out | 4 | A search by number or purpose | none |
| TC-APP016-021 | Patient merged after the record was issued | 1 | The row shows PT-1, the patient who remains, or a note about the merge | the row still names PT-2: "QA-MR-001-MVWKZMMF00B 2026-10-31 QA-MRD Pasien Dua MVWKZMMF00AMRN-2026-AA2338F5 Dipinjam Movement Open review Return" |
| TC-APP016-022 | User without the medical records right | 1 | Refused with a message that the user may not do this | toast "Failed to create request" |
| TC-APP016-023 | User with no records role reads the loan list | 1 | No "MRD" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/mrd |
| TC-APP016-023 | User with no records role reads the loan list | 2 | Access refused | U3 (no right) reads /mrd/records ("Patient Records", 10 rows) |
| TC-APP016-023 | User with no records role reads the loan list | 3 | No patients are shown to this user | "Find" with an empty box lists 10 patients to U3 (e.g. "QA-PCR Pasien Satu MVWKU1F1004 MRN-2026-901B9D7A") |
| TC-APP016-028 | Double click, two officers at once, and reload | 4 | The text is kept, or the officer is warned | the half-filled form is lost with no warning |
| TC-APP016-030 | Type and request that are refused | 1 | Toast "That code already exists" | toast "Failed to create request" |
| TC-APP016-030 | Type and request that are refused | 3 | Toast "Choose an active request type. Purpose stays." | the browser stops the click ("Please select an item in the list."); that text is the first line of the list |
| TC-APP016-035 | Review that is refused or lost | 2 | Toast "That review step is not available" | toast "Failed to issue record" |

## 17 Payroll

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP017-014 | Period typed as free text | 1 | A month can be chosen | a text field (type "null", hint "YYYY-MM") |
| TC-APP017-020 | Salary components cannot be seen or maintained | 1 | A list with name, kind, rate or amount, and whether it is an earning or a deduction | no such screen (hub: Batches) |
| TC-APP017-020 | Salary components cannot be seen or maintained | 2 | A component can be edited | no screen to edit a component (Payroll menu: Batches, Year, Payroll record, Tax, Calculate, Payslip, Reimburse) |
| TC-APP017-020 | Salary components cannot be seen or maintained | 3 | Components can be assigned | no screen to assign a component (Payroll menu: Batches, Year, Payroll record, Tax, Calculate, Payslip, Reimburse) |
| TC-APP017-022 | User with no payroll role opens the payroll screen | 1 | No "Payroll" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/payroll |
| TC-APP017-022 | User with no payroll role opens the payroll screen | 2 | Access refused | U3 (no right) reads /payroll/batches ("Payroll batches", 10 rows) |
| TC-APP017-022 | User with no payroll role opens the payroll screen | 3 | No employees are shown to this user | "a" offers 8 employees to U3 (e.g. "EMP-ANDI · dr. Andi Saputra, Sp.Rad") |
| TC-APP017-047 | Search that finds nothing | 1 | TBD: no row; the search looks at the employee number, the period and the amounts only | 1 row(s) |

## 18 Settings

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP018-001 | Settings directory: groups, search and links | 1 | six groups: Organization, Reference, Access, Appearance, Workflow, Trail | 7 groups: Organization, Reference, Access, Appearance, Workflow, Licensing, Trail |
| TC-APP018-001 | Settings directory: groups, search and links | 2 | "Settings", "Jump to a group" and Organization 3 Reference 3 Access 6 Appearance 7 Workflow 1 Trail 1 | "Settings Jump to a group Organization 4 Reference 3 Access 6 Appearance 7 Workflow 1 Licensing 2 Trail 1" |
| TC-APP018-012 | Two hubs, navigation and Indonesian | 2 | The Settings directory of step 1 | a second page "Settings" with "Master Data — org hierarchy and reference packs" and the tiles Add Site, Sites, Facility time, Departments, Service Centers, Countries, Cities, Units of Measure, Tax Codes |
| TC-APP018-012 | Two hubs, navigation and Indonesian | 4 | "Tambah Departemen", "Kode departemen", "Departemen ditambahkan." | "Tambah Departemen", Kode departemen, Nama departemen, toast "Department added." |
| TC-APP018-013 | User without the master data right changes departments and service centers | 1 | Refused | Adding a department is accepted for U3 (no right): toast "Department added." |
| TC-APP018-013 | User without the master data right changes departments and service centers | 2 | Refused | Renaming and retiring DEP-1 is accepted for U3 (no right): toast "Department updated." |
| TC-APP018-013 | User without the master data right changes departments and service centers | 3 | Refused | Adding a service center is accepted for U3 (no right): toast "Service center added." |
| TC-APP018-013 | User without the master data right changes departments and service centers | 4 | Refused | Retiring SC-1 is accepted for U3 (no right): toast "Service center updated." |
| TC-APP018-014 | User without the master data right: sites, reference lists and tax codes | 1 | Refused with a message that the user may not do this | toast "Failed to save site." |
| TC-APP018-015 | Code that is already used | 1 | A message that the code already exists. No row is added | toast "Failed to save site." |
| TC-APP018-015 | Code that is already used | 2 | A message that the code already exists | toast "Failed to save department." |
| TC-APP018-015 | Code that is already used | 3 | A message that the code already exists | toast "Failed to save country." |
| TC-APP018-016 | Code or name of spaces, with spaces around it, or very long | 3 | The first is saved without the spaces; the second is refused as a double | both are saved: the spaces are kept |
| TC-APP018-016 | Code or name of spaces, with spaces around it, or very long | 4 | Refused with a message that names a limit, or the field stops there | the name of 500 characters is saved |
| TC-APP018-017 | Setting a branch inactive | 1 | A warning that names the users, departments and open work of the branch, and asks for confirmation | set inactive at once with no warning |
| TC-APP018-017 | Setting a branch inactive | 3 | The departments of SITE-NEW are marked as belonging to a closed branch | no mark of a closed branch on the departments |
| TC-APP018-018 | Head office mark and parent branch | 1 | Refused, or the mark moves from BR-A to SITE-NEW | both sites are shown as "Head office" |
| TC-APP018-018 | Head office mark and parent branch | 2 | Refused: the head office cannot be closed | saved: the head office SITE-NEW is "Inactive" (toast "Site updated.") |
| TC-APP018-018 | Head office mark and parent branch | 3 | A parent can be chosen | the dialog has Site code, Site name, Head office, Active |
| TC-APP018-019 | Inactive department still offered in other modules | 1 | DEP-1 is not offered, or is marked as inactive | the inactive department is offered with no mark |
| TC-APP018-019 | Inactive department still offered in other modules | 2 | Refused: the department is not active | the employee is saved under the inactive department |
| TC-APP018-019 | Inactive department still offered in other modules | 3 | DEP-1 is not offered | the inactive department is offered |
| TC-APP018-020 | Moving a department or a service center to another branch | 1 | Refused, or a warning that a service center and an employee belong to it | moved to Kemayoran at once (toast "Department updated."), with SC-1 under it |
| TC-APP018-020 | Moving a department or a service center to another branch | 2 | SC-1 still fits its department | SC-1 shows Site Podomoro under DEP-1, which is now in Kemayoran |
| TC-APP018-021 | Removing a master data entry | 1 | A delete, offered while the entry is not in use | none (dialog: Cancel, Save) |
| TC-APP018-021 | Removing a master data entry | 2 | The number of records that use it | nothing shows where the entry is used |
| TC-APP018-023 | Reference lists: odd values, and where the lists are used | 1 | Refused: the factor must be above zero | a unit with the factor "0" is added |
| TC-APP018-023 | Reference lists: odd values, and where the lists are used | 1 | Refused: the factor must be above zero | a unit with the factor "-5" is added |
| TC-APP018-023 | Reference lists: odd values, and where the lists are used | 1 | Refused: the factor must be above zero | a unit with the factor "" is added |
| TC-APP018-023 | Reference lists: odd values, and where the lists are used | 2 | Refused, or a warning | the country is added with the phone code "abc" |
| TC-APP018-023 | Reference lists: odd values, and where the lists are used | 3 | The Country and the City are offered | the registration form has no country, nationality or city list |
| TC-APP018-023 | Reference lists: odd values, and where the lists are used | 4 | The Unit is offered | the item has no unit list |
| TC-APP018-024 | Tax code: rate and kind at their limits | 1 | rate "": toast "Rate must be between 0 and 100." | the browser stops the click (Rate (%): Please fill out this field.) |
| TC-APP018-024 | Tax code: rate and kind at their limits | 2 | Saved as 11.5, or a hint to use a point | toast "Rate must be between 0 and 100.", which does not name the comma |
| TC-APP018-024 | Tax code: rate and kind at their limits | 3 | Refused, or rounded with a hint | saved as "11.5556%" without a hint |
| TC-APP018-025 | Changing or retiring a tax code, and where rates apply | 1 | A valid-from date, so that older documents keep 11 | no date: the rate changes for every document |
| TC-APP018-025 | Changing or retiring a tax code, and where rates apply | 2 | The rate of the tax code, if the sale uses it | a pharmacy sale names no tax code: its tax is "Tax rate (%)" of the Fast Cashier counter settings (11) |
| TC-APP018-025 | Changing or retiring a tax code, and where rates apply | 3 | The rate of the tax code, if the invoice uses it | a cashier invoice names no tax code: its tax is "Tax rate (%)" of the counter settings (11) |
| TC-APP018-030 | Double click, two admins at once, and reload | 2 | The second is told that the entry was changed in the meantime | saved with no warning; the row now reads QA-DEP-01-MVWL5QK500G \| QA Zz Poli Admin Dua MVWL5QK500J |
| TC-APP018-030 | Double click, two admins at once, and reload | 3 | The text is kept, or the admin is warned | the half-filled form is lost with no warning |
| TC-APP018-031 | Users: adding a user with roles at a branch and a store | 3 | a row with the role "perawat" | "Roles" reads "—" |
| TC-APP018-031 | Users: adding a user with roles at a branch and a store | 5 | Only the chosen branch in the header | the header names no branch: "KlikMed Home Dashboard Preferences Apps Reports Analytics Notifications No notifications yet. ID Language ID EN AR Q QA-Perawat Uji MVWL9CEY002 QA-Perawat Uji MVWL9CEY002 perawat Profile Preferences Sign out" |
| TC-APP018-031 | Users: adding a user with roles at a branch and a store | 6 | An entry user.create with the login | the entry does not name the login: "31/10/2026, 23.01.35 user.create platform/identity admin2 succeeded admin2" |
| TC-APP018-032 | User the server refuses | 2 | Toast "Failed to save user." | the browser stops the click (Password: Please fill out this field.) |
| TC-APP018-044 | Logo that is refused | 1 | The text "The logo is over 200 KB." | the file (300 KB) is dropped without a word; "No logo yet" stays |
| TC-APP018-044 | Logo that is refused | 2 | The text "The logo must be PNG, JPEG, or WebP." | the GIF is dropped without a word |
| TC-APP018-044 | Logo that is refused | 3 | Toast "Failed to save branding." | the browser stops the click (Logo URL: Please enter a URL.) |
| TC-APP018-046 | Theme overrides and dashboard configuration: own preference or hospital setting | 1 | The screen "Theme overrides" with the choices of appearance and colour and, below, the branding form | the screen "Settings": the branding form only |
| TC-APP018-046 | Theme overrides and dashboard configuration: own preference or hospital setting | 2 | The screens turn dark at once for this user | no dark appearance is offered on this screen |
| TC-APP018-047 | Notification rules: who is told when a BPJS claim is submitted | 2 | The lists "Alert type" and "Severity" | text fields, filled with "bpjs.claim.submitted" and "SUBMITTED" |
| TC-APP018-047 | Notification rules: who is told when a BPJS claim is submitted | 3 | a row with the three values (role "finance") | the role is shown as "fe3c6bd7-2d97-5d7c-a50d-03cad2a3145a" |
| TC-APP018-055 | Chain that is refused or questionable | 1 | The text "Add at least one approval step." | "Remove step 1" is disabled on the last step, so a chain without steps cannot be made; with the only step's name emptied "Next" is disabled and the text is not shown |

## 19 Finance

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP019-002 | Reading the periods of a financial year | 2 | Each line has … "Open" | a line shows no status; an open period offers "Lock" and "Mark adjustment" |
| TC-APP019-004 | Chart of accounts: a group and a leaf under it | 2 | "Branch restriction" ("All branches") | a list "Branches allowed to use this account" (none chosen: "Global account") and a list "Users allowed to use this account" |
| TC-APP019-014 | Hub, navigation and Indonesian | 1 | five tiles: Financial years, Chart of accounts, Budget posting rules, Vouchers, ERP staging | 10 tiles under MASTER, BUKU BESAR: Financial years, Chart of accounts, Branch configuration, Currency, Cost centres, Account maps, Budget posting rules, Vouchers, Journals, ERP staging |
| TC-APP019-015 | Voucher without accounts or debit and credit lines | 1 | The form asks for the bank account | the same fields for every type: Doc no, Doc date, Doc type 1. Journal 2. Cash Payment 3. Cash Receipt 4. Bank Payment 5. Bank Receipt 6. Contra 7. Credit Memo 8. Debit Memo 9. Opening Balance 10. Purchase 11. Sales 12. Payroll, Currency, Voucher value, Party, Narration |
| TC-APP019-015 | Voucher without accounts or debit and credit lines | 2 | Lines can be added; the totals of both sides are shown and must be equal | no lines, no debit and no credit |
| TC-APP019-015 | Voucher without accounts or debit and credit lines | 3 | The lines with their accounts | a header only: "VCH-1793464166 Bank Payment Close Doc date 2026-10-31 Voucher value IDR 1.500.000,00 Party QA PT Uji MVWM87IQ003 Status " |
| TC-APP019-016 | Voucher made by hand stays "Open" | 1 | The voucher can be edited while it is open | the row offers Open |
| TC-APP019-016 | Voucher made by hand stays "Open" | 2 | An approval and a posting step; the status becomes "Posted" | the row offers Open; status "VCH-1793463206 2026-10-31 Journal QA Pihak Uji MVWLN9WB003 IDR 100.000,00 Terbuka Buka" |
| TC-APP019-016 | Voucher made by hand stays "Open" | 3 | A cancellation, or a reversal voucher | the row offers Open |
| TC-APP019-017 | Vouchers in a locked year, or on a date outside every year | 2 | Refused: no financial year for this date | the voucher dated 2033-12-31 is created |
| TC-APP019-018 | Voucher form at its limits | 1 | Refused: a voucher needs a value | a voucher of "IDR 0,00" is saved |
| TC-APP019-018 | Voucher form at its limits | 4 | Refused: not a currency | saved; the detail reads "VCH-1793445763 Journal Close Doc date 2026-10-31 Voucher value XYZ 1.000,00 Party QA PT Uji MVWBA89G" |
| TC-APP019-020 | Financial year that cannot be right | 5 | Refused, or a warning | the year QA-FY-MVWLRTBS00K is saved; the finalization date is not compared with the year |
| TC-APP019-021 | Changing, deleting or closing a financial year by periods | 1 | The year can be edited while nothing is booked in it | the row offers Periods, Lock |
| TC-APP019-021 | Changing, deleting or closing a financial year by periods | 2 | A delete, offered while the year is empty | the row offers Periods, Lock |
| TC-APP019-023 | Retiring an account that a posting rule uses | 1 | A warning that a posting rule uses the account | set inactive at once: toast "Account updated." and no warning |
| TC-APP019-024 | General ledger, account balances and reports | 1 | The entries booked to the account and its balance | the row cannot be opened; it offers Edit |
| TC-APP019-024 | General ledger, account balances and reports | 2 | Tiles or reports are present | the hub has Financial years, Chart of accounts, Branch configuration, Currency, Cost centres, Account maps, Budget posting rules, Vouchers, Journals, ERP staging; "Trial balance" is in the menu only |
| TC-APP019-024 | General ledger, account balances and reports | 3 | A search, filters and an export | search 0, filters 0, export 0 |
| TC-APP019-025 | Posting rules of another branch | 1 | BR-A only | the Branch list offers BR02 · Daan Mogot, BR01 · Kemayoran, HO · Podomoro, QA-SITE-01 · QA Klinik Uji, QA-SITE-01-MV9FG8HL201 · QA Klinik Uji MV9FG8HL202, qa-site-01 · QA Klinik Uji MV9FG8HL50D, QA-SITE-01-MVDE6HKD4804 · QA Klinik Uji MVDE6HKD4805, QA-SITE-01-MVDHF9E5610V · QA Klinik Uji MVDHF9E5610W, QA-SITE-01-MVHTT7UV9507 · QA Klinik Uji MVHTT7UV9508, QA-SITE-01-MVTA3XMZ201 · QA Klinik Uji MVTA3XMZ202 |
| TC-APP019-027 | ERP staging: where the rows come from and what can be done with them | 1 | The invoice is listed as "Pending" | INV-1793445683-fdc520b1 is not listed |
| TC-APP019-027 | ERP staging: where the rows come from and what can be done with them | 2 | A button to post one invoice or all pending ones | the screen offers , 1, |
| TC-APP019-027 | ERP staging: where the rows come from and what can be done with them | 3 | A voucher for the invoice | no voucher names INV-1793445683-fdc520b1 |
| TC-APP019-029 | User with no finance role reads vouchers and staged invoices | 1 | No "Finance" card, or the card opens a "no access" page | the card is shown to U3 (no right) and opens /id/finance |
| TC-APP019-029 | User with no finance role reads vouchers and staged invoices | 2 | Access refused | U3 (no right) reads /finance/vouchers ("Vouchers", 10 rows) |
| TC-APP019-029 | User with no finance role reads vouchers and staged invoices | 3 | Access refused | U3 (no right) reads /finance/erp-invoice-staging ("ERP invoice staging", 1 rows) |
| TC-APP019-034 | Double click, two accountants at once, and reload | 2 | The second is told that the account was changed in the meantime | saved with no warning; the row reads QA-5010-MVWLN9WB006 \| QA Beban Uji MVWLN9WB007 \| Expense |
| TC-APP019-034 | Double click, two accountants at once, and reload | 3 | The input is kept, or the accountant is warned | the half-typed voucher is lost with no warning |
| TC-APP019-035 | Branch configuration: year, control accounts, users and imprest eligibility | 4 | A line with the user, the limit and the tick box "Super user" | no line appears after "Add user"; there is no input for the limit |
| TC-APP019-036 | Configuration that is refused | 1 | The text "A financial year is required." | the browser stops the click (Current financial year: Please select an item in the list.) |
| TC-APP019-036 | Configuration that is refused | 2 | The text "At least one user must be allowed to transact." | toast "Configuration saved.": saved with no user ("Add user" adds no line, TC-APP019-035) |
| TC-APP019-036 | Configuration that is refused | 3 | The text that imprest eligibility needs a type, an amount, an account and a department, employee or party | the row with only a type is saved ("Configuration saved.") |
| TC-APP019-041 | Cost centre that is refused | 1 | The text "The shares must total 100%." | toast "Shares must total 100%." |
| TC-APP019-045 | Journal the dialog refuses | 2 | The text "A journal needs at least two lines." | "lan MVTAC7N060D QA-RJ-MVTGO7QK40F · QA-Rawat Jalan MVTGO7QK40I QA-RJ-MVWLRTBS019 · QA-Rawat Jalan MVWLRTBS01C QA-RJ-MVWLRTBS01H · QA-Rawat Jalan MVWLRTBS01K Debit 1000000.00 · Kredit 0.00 Tutup Simpan" |
| TC-APP019-045 | Journal the dialog refuses | 3 | The text "Narration is required." | "TAC7N060D QA-RJ-MVTGO7QK40F · QA-Rawat Jalan MVTGO7QK40I QA-RJ-MVWLRTBS019 · QA-Rawat Jalan MVWLRTBS01C QA-RJ-MVWLRTBS01H · QA-Rawat Jalan MVWLRTBS01K Debit 1000000.00 · Kredit 1000000.00 Tutup Simpan" |
| TC-APP019-045 | Journal the dialog refuses | 4 | The text "A reversible journal needs a reverse date." | "TAC7N060D QA-RJ-MVTGO7QK40F · QA-Rawat Jalan MVTGO7QK40I QA-RJ-MVWLRTBS019 · QA-Rawat Jalan MVWLRTBS01C QA-RJ-MVWLRTBS01H · QA-Rawat Jalan MVWLRTBS01K Debit 1000000.00 · Kredit 1000000.00 Tutup Simpan" |
| TC-APP019-051 | Document the dialog refuses | 1 | The text "Instrument number, type, date, and validity are required." | "uaran Uji MV9H0RI460P QA-2110-MVDE6HKD580I · QA PPN Keluaran Uji MVDE6HKD580J QA-2110-MVDE6HKD580O · QA PPN Keluaran Uji MVDE6HKD580P QA-2110-MVDHF9E5710I · QA PPN Keluaran Uji MVDHF9E5710J Close Save" |
| TC-APP019-051 | Document the dialog refuses | 2 | The text "A cash receipt needs a beneficiary." | "uaran Uji MV9H0RI460P QA-2110-MVDE6HKD580I · QA PPN Keluaran Uji MVDE6HKD580J QA-2110-MVDE6HKD580O · QA PPN Keluaran Uji MVDE6HKD580P QA-2110-MVDHF9E5710I · QA PPN Keluaran Uji MVDHF9E5710J Close Save" |
| TC-APP019-051 | Document the dialog refuses | 3 | The text "This voucher needs a party and a reference number." | "uaran Uji MV9H0RI460P QA-2110-MVDE6HKD580I · QA PPN Keluaran Uji MVDE6HKD580J QA-2110-MVDE6HKD580O · QA PPN Keluaran Uji MVDE6HKD580P QA-2110-MVDHF9E5710I · QA PPN Keluaran Uji MVDHF9E5710J Close Save" |
| TC-APP019-055 | Payment that is refused | 2 | The text "A bank instrument is required." | "no toast" |
| TC-APP019-069 | Request that is refused | 3 | The text "An approved legal agreement is required." | "no toast" |
| TC-APP019-075 | Step that is refused | 1 | The text "This letter of credit step is not allowed yet." | "no toast" |
| TC-APP019-077 | Agreement and loan at their limits | 1 | The text "The party needs a ledger account." | "no toast" |
| TC-APP019-078 | Audit sheets: rough sheet, observations, fair sheet and audit sheet | 2 | The sheet is approved; each observation opens one workflow task for its auditee | "Save" lists no rough sheet ("no toast"; the screen has no list) |

## 20 Budget

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP020-014 | Circular that is refused | 1 | The text "The due date is before the circular date." | "A Zz Poli Admin Dua MVTP5TF7106 QA Zz Poli Admin Dua MVWL5QK500J QA Zz Poli Cepat MVTP5TF7102 QA Zz Poli Cepat MVWL5QK500F QA Zz Poli Uji MV9FG8HL305 In-charge Departments come from MDM and employees from HR. Cancel Save" |
| TC-APP020-014 | Circular that is refused | 7 | The text "The circular can be changed only while it is a draft." | no "Edit" on the row of the sent circular, so no text is shown |
| TC-APP020-016 | Internal budget that is refused | 3 | The text "The circular does not ask this department for a budget." | a department the circular does not list is offered |
| TC-APP020-016 | Internal budget that is refused | 7 | The text "Add at least one head" | "Internal budget BIB000023 saved as draft. / " |
| TC-APP020-017 | Amounts | 2 | The text "Enter an amount above zero with at most two decimals." and no internal budget saved | the internal budget BIB000024 is saved with the amount "150,5" |
| TC-APP020-020 | Consolidation that is refused | 5 | The internal budgets of the rejected request are listed again | BIB000026 is not offered after the reject |
| TC-APP020-038 | Position at its limits | 1 | The text "No budget lines yet. A line is created when an allocation is approved." | "r alokasi Allocated Transferred in Transferred out Reserved Utilised Balance History OBAT · 2026 B14-OPS · Belanja obat Pharmacy · DIPA-2026 DIPA 1.000.000 0 0 0 0 1.000.000 History Showing 1–1 of 1 1" |

## 21 CSSD

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP021-004 | Master that is refused | 1 | The text "Choose an indicator type." | the browser stops the click (Indicator Type: Please select an item in the list.) |
| TC-APP021-004 | Master that is refused | 2 | The text "Choose a test name." | the browser stops the click (Test Name: Please select an item in the list.) |
| TC-APP021-009 | Request that is refused | 2 | The text "The transit store is not the requesting store." | "Request saved." |
| TC-APP021-009 | Request that is refused | 4 | The text "Each line needs an active packing type." | "Request saved." |
| TC-APP021-009 | Request that is refused | 5 | The text "That item is already on the request." | "Request saved." |
| TC-APP021-013 | Receipt that is refused | 1 | The text "please select the document to convert." | "nothing shown" |
| TC-APP021-013 | Receipt that is refused | 3 | The text "Received quantity cannot be negative." | "nothing shown" |
| TC-APP021-018 | Cycle that is refused | 1 | The text "End is before start." | "cssd: invalid input" |
| TC-APP021-018 | Cycle that is refused | 2 | The text "Expiry must be after the sterilization date." | "cssd: invalid input" |
| TC-APP021-018 | Cycle that is refused | 3 | The text "Add at least one set or item." | "cssd: invalid input" |
| TC-APP021-018 | Cycle that is refused | 4 | The text "That packing number is not an unsterile set." | "cssd: invalid input" |

## 22 Services

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP022-013 | Order that is refused | 2 | Refused (the server text ends in "document is missing") | saved ("Saved.") |

## 23 Sourcing

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP023-021 | Sourcing without the sourcing right, and what is recorded | 3 | Refused; the bid stays "opened" | "missing required privilege", the bid reads "" |

## 24 Housekeeping

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| TC-APP024-002 | Location that is refused | 5 | Refused (the server text ends in "location is missing") | saved ("Saved.") |
| TC-APP024-007 | Daily log: who cleaned where, and its approval | 3 | a row with the status "draft" | the new log reads "sent" |

## Rantai E2E

| Test case | Judul | Langkah | Workbook mengharapkan | Di site |
|---|---|---:|---|---|
| E2E-001 | Outpatient: registration to payment and Finance | 3 (TC-APP001-019 step 4) | the button is replaced by the word "Called" | the button is replaced by "Start encounter" (actions: Start encounter Set MLC Record document) |
| E2E-001 | Outpatient: registration to payment and Finance | 4 (TC-APP003-001 step 3) | Left pane: name, MRN and "DOB" | name and MRN; no date of birth |
| E2E-001 | Outpatient: registration to payment and Finance | 5 (TC-APP003-002 step 4) | Remaining 10 | Remaining reads "10 / 10" (left / ordered) |
| E2E-001 | Outpatient: registration to payment and Finance | 6 (TC-APP005-001 step 7) | Branch BR-A on Confirm | Confirm shows the store and the summary; no branch |
| E2E-001 | Outpatient: registration to payment and Finance | 7 (TC-APP005-014 step 3) | One sales voucher referring to the invoice RX-a1db58a3 | the newest SV- voucher does not name RX-a1db58a3: "SV-f8763bc8-ee91-49d3-888a-833a9b519254 Sales Close Doc date 2026-10-31 Voucher value IDR 13.875,00 Party QA-PHA Pasien Satu MVW7T649003 Status Posted Narration" |
| E2E-001 | Outpatient: registration to payment and Finance | 9 (TC-APP014-040 step 2) | A Print button or a printable page | no print or download control on the receipt; the printout is the browser print of the screen |
| E2E-001 | Outpatient: registration to payment and Finance | 9 (TC-APP014-040 step 3) | The receipt can be shown again | the receipt is not shown when the paid sale is found again |
| E2E-004 | Inpatient: admission to discharge, billing and coding | 1 (TC-APP004-058 step 1) | A field "Branch" | no Branch field (U1 works on one branch) |
| E2E-006 | Operation theatre: request to consumption | 1 (TC-APP008-025 step 1) | A dialog with "Branch", … | no "Branch" field (the request takes the branch of the session) |
| E2E-011 | Budget: financial year to utilisation | 2 (TC-APP019-004 step 2) | "Branch restriction" ("All branches") | a list "Branches allowed to use this account" (none chosen: "Global account") and a list "Users allowed to use this account" |
| E2E-013 | Housekeeping: cleaning plan to vendor bill | 3 (TC-APP024-007 step 3) | a row with the status "draft" | the new log reads "sent" |
| E2E-017 | Pharmacy: stock received, counter sale, return, payment and Finance | 4 (TC-APP005-009 step 6) | Empty wizard | the items are cleared but the patient stays selected |
| E2E-021 | Clinical orders (CPOE) from one consultation | 1 (TC-APP003-001 step 3) | Left pane: name, MRN and "DOB" | name and MRN; no date of birth |
| E2E-022 | Emergency minor case: triage, diagnostics and discharge home | 3 (TC-APP015-003 step 3) | Priority 4 | Priority 2 |
| E2E-026 | Maternity: newborn registered with the mother and admitted | 1 (TC-APP001-006 step 5) | "Mother" shows PT-MOM's MRN and name as a link | "Mother" shows an internal id (UUID) as plain text |
| E2E-026 | Maternity: newborn registered with the mother and admitted | 1 (TC-APP001-006 step 6) | The dialog changes to PT-MOM | there is no mother link to click |
| E2E-028 | Closed-loop medication for an inpatient | 4 (TC-APP005-005 step 4) | Picks the group in "Ward group": only the grouped orders are listed | the options name no group (1 · Kelompok bangsal, 2 · Kelompok bangsal), so the group of this test cannot be told apart; the order is opened from its row |
| E2E-028 | Closed-loop medication for an inpatient | 5 (TC-APP004-077 step 2) | "Branch", "Patient", "Order", "Status" and "Reason" | no "Branch" field (U1 works on one branch) |
| E2E-030 | Surgery with blood, sterile instruments and consumption | 3 (TC-APP006-020 step 4) | The form shows a request number and the status "Approved" | the status is "Pending" (an approval by "Approve" is needed) |
| E2E-034 | Cost estimate to payment | 1 (TC-APP014-016 step 3) | Picks QA-PARA, quantity 10 | the card has no quantity field: each line is one unit |
| E2E-034 | Cost estimate to payment | 1 (TC-APP014-016 step 4) | Patient net Rp 12.500, Tax Rp 1.375, Total Rp 13.875 | the estimate reads "t. Nothing is saved to stock or to a charge. Patient Item code Add line QA-PARA · Paracetamol 500mg Tablet 1 Estimating…" |
| E2E-039 | Staff onboarding with access | 4 (TC-APP010-004 step 3) | The file of the linked employee opens by itself as "Edit employee" | the list opens; no file of its own |
| E2E-039 | Staff onboarding with access | 4 (TC-APP010-004 step 3) | The notice "Configuration is missed" is not shown | the notice is shown to the linked account |
| E2E-039 | Staff onboarding with access | 5 (TC-APP018-031 step 3) | a row with the role "perawat" | "Roles" reads "—" |
| E2E-039 | Staff onboarding with access | 5 (TC-APP018-031 step 5) | Only the chosen branch in the header | the header names no branch: "KlikMed Home Dashboard Preferences Apps Reports Analytics Notifications No notifications yet. ID Language ID EN AR Q QA-Perawat Uji MVW91ISD00K QA-Perawat Uji MVW91ISD00K perawat Profile Preferences Sign out" |
| E2E-039 | Staff onboarding with access | 5 (TC-APP018-031 step 6) | An entry user.create with the login | the entry does not name the login: "31/10/2026, 17.33.29 user.create platform/identity admin2 succeeded admin2" |
| E2E-039 | Staff onboarding with access | 7 (TC-APP010-040 step 4) | Toast "Saved." | refused: "hr: invalid input: duplicate": U1 is linked to the employee of an earlier run of this test, and the link is not moved to QA-EMP-01-MVW91ISD00N |
| E2E-041 | Finance record-to-report | 2 (TC-APP019-004 step 2) | "Branch restriction" ("All branches") | a list "Branches allowed to use this account" (none chosen: "Global account") and a list "Users allowed to use this account" |
| E2E-048 | Patient identity governance | 4 (TC-APP005-060 step 2) | The block lists item names with the issued quantity | nothing is listed for the name or the MRN |
