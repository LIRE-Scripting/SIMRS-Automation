import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Hospital Accounts > Fast Cashier (/en/billing/cashier). The screen has no
 * <main> landmark; its parts are found by their headings and labels. Read from
 * the live screen on 2026-10-15.
 */
export class CashierPage {
  readonly heading: Locator;
  readonly bar: Locator;
  readonly search: Locator;
  readonly charge: Locator;
  readonly remark: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Fast Cashier' });
    this.bar = page.getByRole('status', { name: 'Deposit / PED' });
    this.search = page.getByRole('textbox', { name: 'Invoice / patient / MRN' });
    this.charge = page.getByRole('textbox', { name: 'Charge (IDR)' });
    this.remark = page.getByRole('textbox', { name: 'Remark' });
  }

  async open(): Promise<void> {
    await this.page.goto('/en/billing/cashier');
    await expect(this.heading).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  button(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  field(name: 'Deposits' | 'Cash amount (IDR)' | 'Discount (IDR)' | 'Refund (IDR)' | 'Declared cash (IDR)' | 'EDC terminal' | 'EDC approval'): Locator {
    return this.page.getByRole('textbox', { name, exact: true });
  }

  tender(): Locator {
    return this.page.getByRole('combobox', { name: 'Tender' });
  }

  /** "Available", "Amount due", "Deposits" of the bar. */
  async barValue(label: 'Available' | 'Amount due' | 'Deposits'): Promise<string> {
    const text = (await this.bar.innerText()).replace(/\s+/g, ' ');
    return text.match(new RegExp(`${label}: (Rp [\\d.,-]+)`))?.[1] ?? '';
  }

  /** "Draft INV-…" / "Paid INV-…" at the end of the bar. */
  async barState(): Promise<{ status: string; invoice: string }> {
    const text = (await this.bar.innerText()).replace(/\s+/g, ' ');
    const m = text.match(/Deposits: Rp [\d.,-]+ (.+?) ?((?:INV|RX)-\S+)?$/);
    return { status: (m?.[1] ?? '').trim(), invoice: m?.[2] ?? '' };
  }

  /** A term / definition pair of the screen (Gross, Tax, Patient net, Paid, System cash, …), the first one with that term. */
  value(term: string): Locator {
    return this.page.getByRole('term').filter({ hasText: new RegExp(`^${term}$`) }).first().locator('xpath=following-sibling::*[1]');
  }

  /** Values of the lines under "2. Payment": Gross, Discount, Tax, Patient net. */
  async lines(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const t of ['Gross', 'Discount', 'Tax', 'Patient net']) out[t] = norm(await this.value(t).innerText());
    return out;
  }

  receipt(): Locator {
    return this.page.getByRole('heading', { level: 2, name: '3. Receipt' }).locator('xpath=..');
  }

  async receiptValue(term: 'Invoice' | 'Tender' | 'Paid' | 'Remaining due' | 'Status'): Promise<string> {
    return norm(await this.receipt().getByRole('term').filter({ hasText: new RegExp(`^${term}$`) }).locator('xpath=following-sibling::*[1]').innerText());
  }

  async systemCash(): Promise<number> {
    return rupiah((await this.value('System cash').innerText()).trim());
  }

  /** The red message of the screen (an alert that holds text). */
  error(): Locator {
    // The route announcer of the app is an alert too; it is left out.
    return this.page.locator('[role="alert"]:not(#__next-route-announcer__)').filter({ hasText: /\S/ });
  }

  closedBanner(): Locator {
    return this.page.getByText('Your counter is closed for today.');
  }
}

/** Amounts on the screen use a non-breaking space ("Rp\u00a0166.500"); compared with a plain space. */
export function norm(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** "Rp 166.500" -> 166500; "-Rp 3.000" or "Rp -3.000" -> -3000 */
export function rupiah(text: string): number {
  const neg = /-/.test(text);
  const n = Number(text.replace(/[^\d,]/g, '').replace(',', '.'));
  return neg ? -n : n;
}

