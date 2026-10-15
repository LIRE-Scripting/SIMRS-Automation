import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Laboratory (/en/laboratory): the Lab order worklist, the Sample workflow
 * (/laboratory/work) and Specimens and tests (/laboratory/catalogue). Read
 * from the live screens on 2026-10-15.
 */

export type LabStep = 'Generated' | 'Sent' | 'Accepted';

export class WorklistPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly table: Locator;
  readonly search: Locator;
  readonly status: Locator;
  readonly scan: Locator;
  readonly capture: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Lab order worklist' });
    this.table = this.main.getByRole('table');
    this.search = this.main.getByRole('searchbox', { name: 'Search' });
    this.status = this.main.getByRole('combobox', { name: 'Status' });
    this.scan = this.main.getByRole('textbox', { name: 'Scan or type sample ID…' });
    this.capture = page.getByRole('dialog', { name: 'Capture Result' });
  }

  async open(): Promise<void> {
    await this.page.goto('/en/laboratory/orders');
    await expect(this.heading).toBeVisible();
  }

  rows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  /** Cells: Sample ID, Result type, Status, Result, Result range, Result status, Remarks, Actions. */
  async cells(row: Locator): Promise<string[]> {
    return (await row.getByRole('cell').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  /** The row of an order by its result type (unique per test), after searching for it. */
  async row(type: string): Promise<Locator> {
    await this.open();
    await this.search.fill(type);
    await this.main.getByRole('button', { name: 'Search', exact: true }).click();
    const row = this.rows().filter({ has: this.page.getByRole('cell', { name: type, exact: true }) });
    await expect(row).toHaveCount(1);
    return row;
  }

  pager(): Locator {
    return this.main.getByText(/^Showing \d+–\d+ of \d+$/);
  }

  /**
   * Buttons of a row are pressed with the keyboard (the action cell runs past
   * the screen edge). The list renders twice after a search, so when `until`
   * is given the press is repeated until it shows.
   */
  async press(row: Locator, name: string, until?: Locator): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await row.getByRole('button', { name, exact: true }).press('Enter');
      if (!until || (await until.waitFor({ timeout: 4_000 }).then(() => true, () => false))) return;
    }
    await expect(until!).toBeVisible();
  }

  /**
   * The order's id and sample ID, read from the answer of the worklist search
   * for its result type (the "Result status" dialog also shows the id, but
   * opening it from the keyboard is not reliable).
   */
  async orderOf(type: string): Promise<{ id: string; sampleId: string }> {
    // Registered before the page opens: the first list load may already carry the order.
    const answer = this.page
      .waitForResponse(async (r) => r.request().method() === 'POST' && (await r.text().catch(() => '')).includes(JSON.stringify(type).slice(1, -1)), { timeout: 10_000 })
      .catch(() => null);
    await this.open();
    await this.search.fill(type);
    await this.main.getByRole('button', { name: 'Search', exact: true }).click();
    const response = await answer;
    if (response) {
      const body = await response.text();
      const items = JSON.parse(body.split('\n').find((l) => l.startsWith('1:'))!.slice(2)).items as { id: string; sample_id: string; result_type: string }[];
      const it = items.find((i) => i.result_type === type);
      if (it) return { id: it.id, sampleId: it.sample_id };
    }
    // Otherwise the "Result status" dialog of the row shows "<sample ID or order id> · <result status>".
    const row = this.rows().filter({ has: this.page.getByRole('cell', { name: type, exact: true }) });
    const d = this.page.getByRole('dialog', { name: 'Result status' });
    await this.press(row, 'Result status', d);
    const first = (await d.getByText(/^(LAB-\S+|[0-9a-f-]{36}) · /).innerText()).split(' · ')[0].trim();
    await d.getByRole('button', { name: 'Cancel' }).click();
    return first.startsWith('LAB-') ? { id: '', sampleId: first } : { id: first, sampleId: '' };
  }

  field(name: 'Lab result' | 'Result range' | 'Remarks'): Locator {
    return this.capture.getByRole('textbox', { name, exact: true });
  }
}

export type WorkAction = 'Reject' | 'Review' | 'Certify' | 'Rectify' | 'Retest' | 'Recollect' | 'Panic' | 'Culture' | 'Send out' | 'Revert latest stamp';

export class SampleWorkflowPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly order: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1, name: 'Sample workflow' });
    this.order = this.main.getByRole('combobox', { name: 'Order' });
  }

  async open(): Promise<void> {
    await this.page.goto('/en/laboratory/work');
    await expect(this.heading).toBeVisible();
  }

  input(name: 'Reason' | 'Culture note' | 'External lab'): Locator {
    return this.main.getByRole('textbox', { name, exact: true });
  }

  button(name: WorkAction): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  /** The line of an order above the list: "<status> <label> [result]". */
  line(label: string): Locator {
    return this.main.getByRole('paragraph').filter({ hasText: new RegExp(`^\\S+ ${label}( |$)`) });
  }
}

/** The label of an order on the Sample workflow: its sample ID, or the first 8 characters of its id. */
export function workLabel(o: { id: string; sampleId: string }): string {
  return o.sampleId && o.sampleId !== '—' ? o.sampleId : o.id.slice(0, 8);
}
