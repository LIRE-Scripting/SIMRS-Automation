import { defineAppointmentCases } from '../shared/appointment-cases';

/**
 * 02-appointment.xlsx, feature "Appointments (/appointment/schedule)".
 * The steps are word for word those of 01-ambulatory-care.xlsx
 * (TC-APP001-011 … 054); the cases are written once in
 * tests/modules/shared/appointment-cases.ts and run here on /appointment/schedule.
 */
defineAppointmentCases('/id/appointment/schedule', {
  bookSettings: 'TC-APP002-001',
  bookConsultant: 'TC-APP002-002',
  bookUnit: 'TC-APP002-003',
  scheduleList: 'TC-APP002-004',
  calendars: 'TC-APP002-005',
  reschedule: 'TC-APP002-006',
  cancel: 'TC-APP002-007',
  block: 'TC-APP002-008',
  sameTime: 'TC-APP002-010',
  pastDay: 'TC-APP002-011',
  incompleteForm: 'TC-APP002-012',
  rescheduleRefused: 'TC-APP002-013',
  cancelWithoutQuestion: 'TC-APP002-014',
  settingsInvalid: 'TC-APP002-015',
  blockWrong: 'TC-APP002-016',
  whoCanBeChosen: 'TC-APP002-017',
  dateRange: 'TC-APP002-018',
});
