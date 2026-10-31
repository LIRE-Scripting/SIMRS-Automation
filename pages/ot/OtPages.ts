import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRe } from '../ambulatory/RegisteredPatientsPage';
import { pageToRow } from '../paging';

/**
 * Operation Theater (/id/ot): OT requests, Dossiers, Billing policy,
 * Calendar, Pain and Surgical case. Read from the live screens on 2026-10-15.
 */

export interface OtRequest {
  procedure: string;
  patient?: string;
  room?: string;
  /** datetime-local value, "yyyy-mm-ddThh:mm" */
  start?: string;
  end?: string;
  surgeon?: string;
  amount?: string;
}

export type RowAction =
  | 'Schedule'
  | 'Consume'
  | 'Validate'
  | 'Defer'
  | 'Resume'
  | 'Cancel request'
  | 'Pre-anesthesia'
  | 'Start'
  | 'In progress'
  | 'Complete'
  | 'Record dossier'
  | 'Place on calendar';

export class OtRequestsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  readonly dialog: Locator;
  readonly reason: Locator;
  readonly note: Locator;
  readonly dossier: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'OT requests' });
    this.table = this.main.getByRole('table');
    this.dialog = page.getByRole('dialog', { name: 'New OT request' });
    this.reason = this.main.getByRole('textbox', { name: 'Reason' });
    this.note = this.main.getByRole('textbox', { name: 'Operation note' });
    this.dossier = this.main.getByRole('textbox', { name: 'Dossier id' });
  }

  async open(): Promise<void> {
    await this.page.goto('/id/ot/requests');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  /** Cells: Request no, Procedures, Status, Blocked, List prepared, Actions. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  pager(): Locator {
    return this.main.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  async openNew(): Promise<Locator> {
    await this.main.getByRole('button', { name: 'New request' }).click();
    await expect(this.dialog).toBeVisible();
    return this.dialog;
  }

  field(name: 'Procedures display' | 'Patient' | 'Room' | 'Start' | 'End' | 'Chief surgeon'): Locator {
    return this.dialog.getByRole('textbox', { name, exact: true });
  }

  amount(): Locator {
    return this.dialog.getByRole('spinbutton', { name: 'Blocked amount' });
  }

  async fill(r: Partial<OtRequest>): Promise<void> {
    if (r.procedure !== undefined) await this.field('Procedures display').fill(r.procedure);
    if (r.patient !== undefined) await this.field('Patient').fill(r.patient);
    if (r.room !== undefined) await this.field('Room').fill(r.room);
    if (r.start !== undefined) await this.field('Start').fill(r.start);
    if (r.end !== undefined) await this.field('End').fill(r.end);
    if (r.surgeon !== undefined) await this.field('Chief surgeon').fill(r.surgeon);
    if (r.amount !== undefined) await this.amount().fill(r.amount);
  }

  save(): Locator {
    return this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ });
  }

  /**
   * The row of a request by its procedure text (unique per test), paging
   * through the list (10 rows a page, lowest request number first).
   */
  async row(procedure: string): Promise<Locator> {
    const match = () => this.rows().filter({ has: this.page.getByRole('cell', { name: procedure, exact: true }) });
    await expect(this.rows().first()).toBeVisible();
    return pageToRow(this.main, match);
  }

  action(row: Locator, name: RowAction): Locator {
    return row.getByRole('button', { name, exact: true });
  }
}

/** Dossiers (/ot/dossiers), Billing policy (/ot/policies), Calendar (/ot/calendar), Pain (/ot/pain), Surgical case (/ot/case). */
export class OtDeskPage {
  readonly main: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
  }

  async open(route: 'dossiers' | 'policies' | 'calendar' | 'pain' | 'case', heading: string): Promise<void> {
    await this.page.goto(`/id/ot/${route}`);
    await expect(this.main.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }

  /** The dialog opened by "Save" (no accessible name; found by its inputs). */
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  text(t: string): Locator {
    return this.main.getByText(new RegExp(escapeRe(t)));
  }
}
