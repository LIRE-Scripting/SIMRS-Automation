/**
 * Calendar dates as the site shows them (yyyy-mm-dd), in the branch's time
 * zone: Western Indonesia (01-ambulatory-care.xlsx | Steps, TC-APP001-058
 * Preconditions).
 */
export const BRANCH_TZ = 'Asia/Jakarta';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Today (plus `offsetDays`) in the branch's time zone. */
export function todayWib(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: BRANCH_TZ }).format(d);
}

/** The hour (0-23) now in the branch's time zone. */
export function hourWib(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: BRANCH_TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** The first `weekday` strictly after `iso`. */
export function nextWeekday(iso: string, weekday: number): string {
  const diff = (weekday - weekdayOf(iso) + 7) % 7 || 7;
  return addDays(iso, diff);
}

/** The Sunday that starts the week of `iso` (the Calendar tab shows Sunday to Saturday). */
export function sundayOf(iso: string): string {
  return addDays(iso, -weekdayOf(iso));
}
