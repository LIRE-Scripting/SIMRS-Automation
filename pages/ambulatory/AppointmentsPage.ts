import { expect, type Locator, type Page } from '@playwright/test';
import { toastLocator } from '../../lib/assertions';
import type { BookSettings } from '../../lib/ambulatory-data';
import { escapeRe } from './RegisteredPatientsPage';

/**
 * Ambulatory Care > Appointments (/en/registration/appointments).
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

/** The week label the calendars show for the week of `iso`: "Oct 25 – Oct 31". */
export function weekLabelOf(iso: string): string {
  const sun = new Date(`${sundayOfIso(iso)}T00:00:00Z`);
  const sat = new Date(sun.getTime() + 6 * 86_400_000);
  const f = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return `${f(sun)} – ${f(sat)}`;
}

/** The Sunday (yyyy-mm-dd) of a shown label, taking the year nearest to `near`. */
function sundayFromLabel(label: string, near: string): string {
  const [m, d] = label.split(' – ')[0].split(' ');
  const year = Number(near.slice(0, 4));
  const candidates = [year - 1, year, year + 1].map(
    (y) => `${y}-${String(MONTHS.indexOf(m) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`,
  );
  const t = Date.parse(near);
  return candidates.sort((a, b) => Math.abs(Date.parse(a) - t) - Math.abs(Date.parse(b) - t))[0];
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

  constructor(page: Page) {
    this.page = page;
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
    await this.page.goto('/en/registration/appointments');
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
    if ((await this.fromDate.inputValue()) !== from || (await this.toDate.inputValue()) !== to) {
      const loaded = this.page.waitForResponse((r) => {
        const body = r.request().postData() ?? '';
        return (
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname === '/en/registration/appointments' &&
          body.includes(`"${from}T`) &&
          body.includes(`"${dayAfter(to)}T`)
        );
      });
      if (from > (await this.toDate.inputValue())) {
        await this.toDate.fill(to);
        await this.fromDate.fill(from);
      } else {
        await this.fromDate.fill(from);
        await this.toDate.fill(to);
      }
      await loaded;
    }
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
    const out: Record<string, string>[] = [];
    for (const r of await this.rows().all()) {
      const cells = (await r.getByRole('cell').allInnerTexts()).map((c) => c.trim());
      out.push(Object.fromEntries(headers.map((h, i) => [h, to24h(cells[i] ?? '')])));
    }
    return out;
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
    return this.main.getByText(/^[A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}$/);
  }

  /** "3 appointments" beside the week buttons. */
  weekBadge(): Locator {
    return this.main.getByText(/^\d+ appointments?$/);
  }

  weekButton(name: 'Previous week' | 'Today' | 'Next week'): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  /** Clicks "Next week"/"Previous week" until the week of `iso` is shown. */
  async goToWeekOf(iso: string): Promise<void> {
    const label = weekLabelOf(iso);
    for (let i = 0; i < 600 && (await this.weekLabel().innerText()) !== label; i++) {
      const shown = await this.weekLabel().innerText();
      await this.weekButton(sundayFromLabel(shown, iso) < sundayOfIso(iso) ? 'Next week' : 'Previous week').click();
      await expect(this.weekLabel()).not.toHaveText(shown);
    }
    await expect(this.weekLabel()).toHaveText(label);
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
