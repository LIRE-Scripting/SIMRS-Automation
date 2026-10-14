import { defineAppointmentCases } from '../shared/appointment-cases';

/**
 * 01-ambulatory-care.xlsx, feature "Appointments (/registration/appointments)".
 * The cases are shared with 02-appointment.xlsx (same steps, same screen):
 * tests/e2e/shared/appointment-cases.ts.
 */
defineAppointmentCases('/en/registration/appointments', {
  bookSettings: 'TC-APP001-011',
  bookConsultant: 'TC-APP001-012',
  bookUnit: 'TC-APP001-013',
  scheduleList: 'TC-APP001-014',
  calendars: 'TC-APP001-015',
  reschedule: 'TC-APP001-016',
  cancel: 'TC-APP001-017',
  block: 'TC-APP001-018',
  noOpenTime: 'TC-APP001-044',
  sameTime: 'TC-APP001-046',
  pastDay: 'TC-APP001-047',
  incompleteForm: 'TC-APP001-048',
  rescheduleRefused: 'TC-APP001-049',
  cancelWithoutQuestion: 'TC-APP001-050',
  settingsInvalid: 'TC-APP001-051',
  blockWrong: 'TC-APP001-052',
  whoCanBeChosen: 'TC-APP001-053',
  dateRange: 'TC-APP001-054',
});
