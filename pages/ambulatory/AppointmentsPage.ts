import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';
import type { BookSettings } from '../../lib/ambulatory-data';
import { escapeRe } from './RegisteredPatientsPage';

/**
 * Appointments: the same screen under Ambulatory Care
 * (/id/registration/appointments) and under Appointment (/id/appointment/schedule).
 * Read from the live screen on 2026-10-14. The type-ahead fields
 * (Patient, Department, Consultant or unit) are comboboxes whose listbox
 * offers buttons "MRN · name" / "code · name".
 */

export interface Booking {
  /** Text typed into Patient and the suggestion to pick (by default the same). */
  patient: string;
  department: string;
  /** Default "Consultant". */
  kind?: 'Consultant' | 'Unit';
  resource: string;
  type?: string;
  /** yyyy-mm-dd */
  date: string;
  /** "08:00"; by default the time the dialog chooses. */
  time?: string;
}

/**
 * The browser runs with locale en-US (playwright.config.ts), so the lists
 * show "08:00 AM–08:30 AM" where the workbook writes 08:00–08:30. Times are
 * compared in 24-hour form.
 */
export function to24h(text: string): string {
  return text.replace(/\b(\d{1,2}):(\d{2})\s*([AP]M)\b/g, (_, h: string, m: string, ap: string) => {
    const hour = (Number(h) % 12) + (ap === 'PM' ? 12 : 0);
    return `${String(hour).padStart(2, '0')}:${m}`;
  });
}

/** The "When" cell for a date and time, as the en-US list shows it: "Oct 26, 2026, 08:00". */
export function whenText(iso: string, hhmm: string): string {
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
  return `${date}, ${hhmm}`;
}

function dayAfter(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sundayOfIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

/** The months as the Indonesian site writes them ("25 Okt – 31 Okt"). */
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** The week label the calendars show for the week of `iso`: "Oct 25 – Oct 31", on /id "25 Okt – 31 Okt". */
export function weekLabelOf(iso: string): RegExp {
  const sun = new Date(`${sundayOfIso(iso)}T00:00:00Z`);
  const sat = new Date(sun.getTime() + 6 * 86_400_000);
  const en = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const id = (d: Date) => `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]}`;
  return new RegExp(`^(?:${en(sun)} – ${en(sat)}|${id(sun)} – ${id(sat)})$`);
}

export class AppointmentsPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly bookButton: Locator;
  readonly bookSettingsButton: Locator;
  readonly blockTimeButton: Locator;
  readonly fromDate: Locator;
  readonly toDate: Locator;
  readonly table: Locator;
  readonly selectAll: Locator;
  readonly pagingSummary: Locator;
  readonly nextPageButton: Locator;
  readonly openHours: Locator;

  /** Route of the screen; the list reloads with a POST to this path. */
  readonly route: string;

  constructor(page: Page, route = '/id/registration/appointments') {
    this.page = page;
    this.route = route;
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Appointments' });
    this.bookButton = this.main.getByRole('button', { name: 'Book', exact: true });
    this.bookSettingsButton = this.main.getByRole('button', { name: 'Book settings', exact: true });
    this.blockTimeButton = this.main.getByRole('button', { name: 'Block time', exact: true });
    this.fromDate = this.main.getByRole('textbox', { name: 'From date' });
    this.toDate = this.main.getByRole('textbox', { name: 'To date' });
    this.table = this.main.getByRole('table');
    this.selectAll = this.table.getByRole('checkbox', { name: 'Select all on this page' });
    this.pagingSummary = this.main.getByText(/^Showing \d+(–\d+)? of \d+$/);
    this.nextPageButton = this.main.getByRole('button', { name: 'Next page' });
    this.openHours = this.main.getByRole('complementary');
  }

  async open(): Promise<void> {
    await this.page.goto(this.route);
    await expect(this.heading).toBeVisible();
  }

  tab(name: 'Schedule' | 'Calendar' | 'OPD calendar'): Locator {
    return this.main.getByRole('tab', { name, exact: true });
  }

  // ------------------------------------------------------------- schedule

  /**
   * Sets the Schedule range and waits for the list to load it. The list
   * reloads with a server action (a POST to this page) whose body carries
   * From and the day after To (e.g. [10,0,"2026-11-16T00:00:00+07:00",
   * "2026-11-23T00:00:00+07:00"]); an intermediate state (From after To, or
   * more than 30 days) sends nothing, so the wait is for the final pair.
   */
  async showRange(from: string, to: string = from): Promise<void> {
    // Right after a load the page may still reset the fields while it hydrates;
    // the fill is repeated until the list request with the final pair is seen.
    for (let attempt = 1; ; attempt++) {
      // Already shown (first pass), or set by an earlier pass whose request came before the wait.
      if ((await this.fromDate.inputValue()) === from && (await this.toDate.inputValue()) === to) break;
      const loaded = this.page
        .waitForResponse(
          (r) => {
            const body = r.request().postData() ?? '';
            return (
              r.request().method() === 'POST' &&
              new URL(r.url()).pathname === this.route &&
              body.includes(`"${from}T`) &&
              body.includes(`"${dayAfter(to)}T`)
            );
          },
          { timeout: 10_000 },
        )
        .catch(() => null);
      if (from > (await this.toDate.inputValue())) {
        await this.toDate.fill(to);
        await this.fromDate.fill(from);
      } else {
        await this.fromDate.fill(from);
        await this.toDate.fill(to);
      }
      if (await loaded) break;
      if (attempt === 3) throw new Error(`The Schedule list did not load ${from} to ${to}`);
    }
    await expect(this.fromDate).toHaveValue(from);
    await expect(this.toDate).toHaveValue(to);
    await expect(this.pagingSummary).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('checkbox') }).filter({
      hasNot: this.page.getByRole('columnheader'),
    });
  }

  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  async cell(row: Locator, column: string): Promise<Locator> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`Column "${column}" not in ${headers.join(', ')}`);
    return row.getByRole('cell').nth(i);
  }

  /** Every row of the current page as { column: text }, times in 24-hour form. */
  async rowTexts(): Promise<Record<string, string>[]> {
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    // One read for the whole page (the rows' cells in order).
    const rows = await this.rows().evaluateAll((trs) =>
      trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td as HTMLElement).innerText.trim())),
    );
    return rows.map((cells) => Object.fromEntries(headers.map((h, i) => [h, to24h(cells[i] ?? '')])));
  }

  /**
   * Every row of the shown range, page by page, as { column: text }. Ends on
   * the last page. Mondays are reused by the tests, so a day may hold more
   * than one page of rows (cancelled rows stay listed).
   */
  async allRowTexts(): Promise<Record<string, string>[]> {
    await this.firstPage();
    const out = await this.rowTexts();
    while (await this.nextPage()) out.push(...(await this.rowTexts()));
    return out;
  }

  /** Goes to the page that lists every one of `patients` (they must share a page). */
  async pageWith(patients: string[]): Promise<void> {
    await this.firstPage();
    for (;;) {
      const names = (await this.rowTexts()).map((r) => r.Patient);
      if (patients.every((p) => names.includes(p))) return;
      if (!(await this.nextPage())) throw new Error(`No page lists all of ${patients.join(', ')}`);
    }
  }

  /** Clicks "Next page" when it is enabled and waits for the rows to change; false on the last page. */
  async nextPage(): Promise<boolean> {
    if (!(await this.nextPageButton.isVisible()) || (await this.nextPageButton.isDisabled())) return false;
    const first = await this.rows().first().innerText();
    await this.nextPageButton.click({ timeout: 15_000 });
    await expect(this.rows().first()).not.toHaveText(first);
    return true;
  }

  async firstPage(): Promise<void> {
    const one = this.main.getByRole('button', { name: '1', exact: true });
    if (!(await one.isVisible()) || (await this.pagingSummary.innerText()).match(/^Showing (0|1)\b/)) return;
    const first = await this.rows().first().innerText();
    await one.click();
    await expect(this.rows().first()).not.toHaveText(first);
  }

  selectionBar(): Locator {
    return this.main.getByText(/^\d+ selected$/);
  }

  rescheduleButton(): Locator {
    return this.main.getByRole('button', { name: 'Reschedule', exact: true });
  }

  cancelSelectedButton(): Locator {
    return this.main.getByRole('button', { name: 'Cancel selected', exact: true });
  }

  // ------------------------------------------------------------ calendars

  /** "Oct 25 – Oct 31" between the week buttons. */
  weekLabel(): Locator {
    return this.main.getByText(/^(?:[A-Z][a-z]{2} \d{1,2}|\d{1,2} [A-Z][a-z]{2}) – (?:[A-Z][a-z]{2} \d{1,2}|\d{1,2} [A-Z][a-z]{2})$/);
  }

  /** "3 appointments" beside the week buttons. */
  /** The badge text for `n` bookings, in either language. */
  static badge(n: number): RegExp {
    return new RegExp(`^${n} (?:appointments?|janji(?: temu)?)$`);
  }

  weekBadge(): Locator {
    // On /id "17 janji".
    return this.main.getByText(/^\d+ (?:appointments?|janji(?: temu)?)$/);
  }

  weekButton(name: 'Previous week' | 'Today' | 'Next week'): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  /**
   * Shows the week of `iso`: "Today", then "Next week"/"Previous week" as many
   * times as there are weeks between (the label has no year to steer by).
   */
  async goToWeekOf(iso: string, today: string): Promise<void> {
    await this.weekButton('Today').click();
    await expect(this.weekLabel()).toHaveText(weekLabelOf(today));
    const weeks = Math.round((Date.parse(sundayOfIso(iso)) - Date.parse(sundayOfIso(today))) / (7 * 86_400_000));
    const button = this.weekButton(weeks > 0 ? 'Next week' : 'Previous week');
    for (let i = 0; i < Math.abs(weeks); i++) {
      const shown = await this.weekLabel().innerText();
      await button.click();
      await expect(this.weekLabel()).not.toHaveText(shown);
    }
    await expect(this.weekLabel()).toHaveText(weekLabelOf(iso));
  }

  /**
   * The seven day boxes of the Calendar tab, Sunday first. The boxes have no
   * roles or labels; this is the grid structure read from the live screen.
   */
  calendarDays(): Locator {
    return this.main.locator('xpath=.//section[contains(@class,"card")]/div[contains(@class,"grid-cols-7")]/div');
  }

  /** Bookings in a day box (Calendar) or day cell (OPD calendar): a time and a patient name each. */
  dayItems(box: Locator): Locator {
    return box.locator('xpath=./div[count(p)=2]');
  }

  /** One line per department in the OPD calendar (structure read from the live screen). */
  opdLines(): Locator {
    return this.main.locator('xpath=.//section[contains(@class,"card")]/div/div[contains(@class,"gap-2")][div/p]');
  }

  opdLine(department: string): Locator {
    return this.opdLines().filter({ has: this.page.getByText(department, { exact: true }) });
  }

  /** The seven day cells of an OPD calendar line. */
  opdCells(line: Locator): Locator {
    return line.locator('xpath=./div[contains(@class,"grid-cols-7")]/div');
  }

  // ------------------------------------------------------------- booking

  bookDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Book appointment' });
  }

  async openBook(): Promise<Locator> {
    await this.bookButton.click();
    const d = this.bookDialog();
    await expect(d).toBeVisible();
    return d;
  }

  /** Types into a type-ahead field and picks the suggestion that contains `choose`. */
  async pick(field: Locator, typed: string, choose: string = typed): Promise<void> {
    await field.fill(typed);
    const list = this.page.locator(`#${await field.getAttribute('aria-controls')}`);
    await list.getByRole('option').filter({ hasText: new RegExp(escapeRe(choose)) }).first().getByRole('button').click();
  }

  field(d: Locator, name: 'Patient' | 'Department' | 'Consultant or unit'): Locator {
    return d.getByRole('combobox', { name, exact: true });
  }

  kindRadio(d: Locator, kind: 'Consultant' | 'Unit'): Locator {
    return d.getByRole('radiogroup', { name: 'Consultant or unit' }).getByRole('radio', { name: kind });
  }

  typeSelect(d: Locator): Locator {
    return d.getByRole('combobox', { name: 'Appointment type' });
  }

  dateField(d: Locator): Locator {
    return d.getByRole('textbox', { name: 'Date', exact: true });
  }

  openTime(d: Locator): Locator {
    return d.getByRole('combobox', { name: 'Open time' });
  }

  /** Texts of the "Open time" options. */
  async openTimes(d: Locator): Promise<string[]> {
    return (await this.openTime(d).locator('option').allInnerTexts()).map((o) => o.trim());
  }

  /**
   * The "Open time" options once the times for the chosen resource and date
   * have loaded. "No open time inside the quota" is also what the list shows
   * before they load, so it is accepted only after it stayed for 5 s.
   */
  async settledOpenTimes(d: Locator): Promise<string[]> {
    try {
      await expect.poll(() => this.openTimes(d), { timeout: 5_000 }).toContainEqual(expect.stringMatching(/^\d\d:\d\d/));
    } catch {
      // no time offered
    }
    return this.openTimes(d);
  }

  submitBook(d: Locator): Locator {
    return d.getByRole('button', { name: 'Book', exact: true });
  }

  async fillBook(b: Booking, d: Locator): Promise<void> {
    await this.pick(this.field(d, 'Patient'), b.patient);
    await this.pick(this.field(d, 'Department'), b.department);
    // The radios are visually hidden inputs inside their labels.
    if ((b.kind ?? 'Consultant') === 'Unit') await d.getByRole('radiogroup').getByText('Unit', { exact: true }).click();
    await this.pick(this.field(d, 'Consultant or unit'), b.resource);
    if (b.type) await this.typeSelect(d).selectOption({ label: b.type });
    await this.dateField(d).fill(b.date);
    if (b.time) await this.openTime(d).selectOption({ label: b.time });
  }

  /** Books and waits for the toast; the dialog closes. */
  async book(b: Booking): Promise<void> {
    const d = await this.openBook();
    await this.fillBook(b, d);
    await this.submitBook(d).click();
    await expect(toastLocator(this.page, /^Appointment booked$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  // -------------------------------------------------------- book settings

  bookSettingsDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Book settings' });
  }

  async openBookSettings(): Promise<Locator> {
    await this.bookSettingsButton.click();
    const d = this.bookSettingsDialog();
    await expect(d).toBeVisible();
    return d;
  }

  /**
   * A section of the Book settings dialog and its rows. The rows have no
   * labels of their own; they are the <div>s under the section's title
   * (structure read from the live dialog).
   */
  section(d: Locator, title: 'Appointment types' | 'Daily quota' | 'Open hours'): Locator {
    return d.locator(`xpath=.//div[p[normalize-space()="${title}"]]`);
  }

  settingRows(d: Locator, title: 'Appointment types' | 'Daily quota' | 'Open hours'): Locator {
    return this.section(d, title).locator('xpath=./div');
  }

  /** Adds rows with the section's "Add …" button until it has `n`. */
  private async rowsAtLeast(d: Locator, title: 'Appointment types' | 'Daily quota' | 'Open hours', n: number) {
    const add = { 'Appointment types': 'Add type', 'Daily quota': 'Add quota', 'Open hours': 'Add hours' }[title];
    const rows = this.settingRows(d, title);
    while ((await rows.count()) < n) {
      const before = await rows.count();
      await this.section(d, title).getByRole('button', { name: add }).click();
      await expect(rows).toHaveCount(before + 1);
    }
    return rows;
  }

  async setTypeRow(row: Locator, name: string, minutes?: number): Promise<void> {
    await row.getByPlaceholder('Type name').fill(name);
    if (minutes !== undefined) await row.getByRole('spinbutton', { name: 'Minutes' }).fill(String(minutes));
  }

  /**
   * Chooses the kind of a quota or hours row. Returns false when the row
   * stays on the other kind (found blocker 17: "Unit" is not taken).
   */
  async setKind(row: Locator, kind: 'Consultant' | 'Unit'): Promise<boolean> {
    const select = row.locator('select').nth(0);
    await select.selectOption({ label: kind });
    return (await select.inputValue()) === kind.toLowerCase();
  }

  /** Kind and resource selects of a quota or hours row ("Select…" empties it). */
  async setResource(row: Locator, kind: 'Consultant' | 'Unit', resource: string): Promise<void> {
    if (!(await this.setKind(row, kind))) throw new Error(`The row does not take the kind "${kind}" (blocker 17)`);
    await row.locator('select').nth(1).selectOption({ label: resource });
  }

  /**
   * Writes the whole set: existing rows are reused, the rest emptied (a type
   * by emptying its name, a quota or hours row by "Select…"; the dialog has
   * no remove button, TC-APP001-051 known risk).
   */
  async fillBookSettings(d: Locator, s: BookSettings): Promise<void> {
    const types = await this.rowsAtLeast(d, 'Appointment types', s.types.length);
    for (let i = 0; i < (await types.count()); i++) {
      const t = s.types[i];
      await this.setTypeRow(types.nth(i), t?.name ?? '', t?.minutes);
    }
    const quota = await this.rowsAtLeast(d, 'Daily quota', s.quota.length);
    for (let i = 0; i < (await quota.count()); i++) {
      const q = s.quota[i];
      const row = quota.nth(i);
      if (!q) {
        await row.locator('select').nth(1).selectOption({ label: 'Select…' });
        continue;
      }
      await this.setResource(row, q.kind, q.resource);
      await row.getByRole('spinbutton', { name: 'Max per day' }).fill(String(q.max));
    }
    const hours = await this.rowsAtLeast(d, 'Open hours', s.hours.length);
    for (let i = 0; i < (await hours.count()); i++) {
      const h = s.hours[i];
      const row = hours.nth(i);
      if (!h) {
        await row.locator('select').nth(1).selectOption({ label: 'Select…' });
        continue;
      }
      await this.setResource(row, h.kind, h.resource);
      await row.getByRole('combobox', { name: 'Weekday' }).selectOption({ label: h.weekday });
      await row.getByRole('textbox', { name: 'From' }).fill(h.from);
      await row.getByRole('textbox', { name: 'To' }).fill(h.to);
    }
  }

  async saveBookSettings(d: Locator): Promise<void> {
    await d.getByRole('button', { name: 'Save settings' }).click();
    await expect(toastLocator(this.page, /^Book settings saved$/)).toBeVisible();
    await expect(d).toBeHidden();
  }

  /** Sets the branch's book settings to `s` (replaces the earlier set). */
  async writeBookSettings(s: BookSettings): Promise<void> {
    const d = await this.openBookSettings();
    await this.fillBookSettings(d, s);
    await this.saveBookSettings(d);
  }

  // ---------------------------------------------------------------- block

  blockDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Block consultant' });
  }

  async openBlock(): Promise<Locator> {
    await this.blockTimeButton.click();
    const d = this.blockDialog();
    await expect(d).toBeVisible();
    return d;
  }

  /** from/to as yyyy-mm-ddThh:mm */
  async fillBlock(d: Locator, consultant: string, from: string, to: string): Promise<void> {
    await d.getByRole('combobox', { name: 'Consultant' }).selectOption({ label: consultant });
    await d.getByRole('textbox', { name: 'From' }).fill(from);
    await d.getByRole('textbox', { name: 'To' }).fill(to);
  }

  async block(consultant: string, from: string, to: string): Promise<void> {
    const d = await this.openBlock();
    await this.fillBlock(d, consultant, from, to);
    await d.getByRole('button', { name: 'Block', exact: true }).click();
    await expect(toastLocator(this.page, /^Consultant blocked$/)).toBeVisible();
    await expect(d).toBeHidden();
  }
}
