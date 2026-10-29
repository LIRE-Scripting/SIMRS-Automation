import type { Locator, Page } from '@playwright/test';
import { expect, type Qa } from '../../../fixtures/e2e';
import { toastMark } from '../../../lib/assertions';
import { toastsAfter } from './helpers';

/**
 * Settings > Process definitions (/workflow/process-definitions): the
 * approval chains of the hospital (18-settings.xlsx TC-APP018-054, 055 and
 * the chain E2E-050). A chain applies to every user of the hospital, so a
 * test reads the chain first and puts it back afterwards (restoreChain).
 */
export type CaseArgs = { page: Page; qa: Qa };

export const PROCESS = 'purchase_order';
const ROUTE = '/id/workflow/process-definitions';

export interface Chain {
  name: string;
  active: boolean;
  steps: string[];
}

export class Processes {
  readonly main: Locator;
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.dialog = page.getByRole('dialog');
  }
  async open(): Promise<void> {
    await this.page.goto(ROUTE);
    await expect(this.main.getByRole('heading', { level: 1, name: 'Process definitions' })).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  row(key: string): Locator {
    return this.main.getByRole('row').filter({ has: this.page.getByRole('cell', { name: key, exact: true }) }).first();
  }
  /** [key, name, steps, status] of a process. */
  async cells(key: string): Promise<string[]> {
    await this.open();
    return (await this.row(key).getByRole('cell').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim());
  }
  /** Opens the edit dialog of a process on its first step "Identity". */
  async edit(key: string): Promise<void> {
    await this.open();
    await this.row(key).getByRole('button', { name: /^(Edit chain|Ubah rantai)/ }).click();
    await expect(this.dialog).toBeVisible();
  }
  next(): Locator {
    return this.dialog.getByRole('button', { name: 'Next', exact: true });
  }
  /** The step name inputs ("Step name 1", "Step name 2", …). */
  stepInputs(): Locator {
    return this.dialog.getByLabel(/^(Step name|Nama langkah) \d+$/);
  }
  async readChain(key: string): Promise<Chain> {
    await this.edit(key);
    const name = await this.dialog.getByLabel('Display name', { exact: true }).inputValue();
    const active = await this.dialog.getByRole('checkbox', { name: 'Active', exact: true }).isChecked();
    await this.next().click();
    const steps: string[] = [];
    for (const i of await this.stepInputs().all()) steps.push(await i.inputValue());
    await this.page.keyboard.press('Escape');
    return { name, active, steps };
  }
  /** On the step "Steps": exactly these step names (rows added or removed). */
  async setSteps(names: string[]): Promise<void> {
    while ((await this.stepInputs().count()) < names.length) await this.dialog.getByRole('button', { name: 'Add step' }).click();
    while ((await this.stepInputs().count()) > names.length) {
      await this.dialog.getByRole('button', { name: `Remove step ${await this.stepInputs().count()}` }).click();
    }
    for (const [i, n] of names.entries()) await this.stepInputs().nth(i).fill(n);
  }
  /** "Next" to "Review", then "Save"; returns the toasts. */
  async save(): Promise<string[]> {
    await this.next().click();
    const mark = await toastMark(this.page);
    await this.dialog.getByRole('button', { name: /^(Save|Saving…)$/ }).click();
    return toastsAfter(this.page, mark);
  }
  /** Writes a whole chain (name, active, steps). */
  async write(key: string, c: Chain): Promise<string[]> {
    await this.edit(key);
    await this.dialog.getByLabel('Display name', { exact: true }).fill(c.name);
    await this.dialog.getByRole('checkbox', { name: 'Active', exact: true }).setChecked(c.active);
    await this.next().click();
    await this.setSteps(c.steps);
    return this.save();
  }
}

/** Puts a chain back as it was read; checks the step count of its row. */
export async function restoreChain(page: Page, key: string, was: Chain): Promise<void> {
  const p = new Processes(page);
  expect(await p.write(key, was)).toContain('Approval chain saved.');
  expect((await p.cells(key))[2]).toBe(String(was.steps.length));
}

/**
 * TC-APP018-054: the purchase order chain changed to two steps ("X Kepala
 * gudang", "X Direktur"). The module test puts the chain back at the end; a
 * chain (E2E-050) passes `keep` and restores it after its purchase order
 * steps, with the returned chain as it was.
 */
export const TC_APP018_054 = async ({ page, qa }: CaseArgs, keep = false): Promise<Chain> => {
  const p = new Processes(page);
  const was = await p.readChain(PROCESS);
  qa.note(1, `${PROCESS} before the test: "${was.name}", ${was.active ? 'active' : 'inactive'}, steps ${was.steps.map((s) => `"${s}"`).join(', ')}`);
  let changed = false;
  try {
    await qa.step(1, async () => {
      await page.goto('/id/settings');
      await page.getByRole('main').getByRole('link', { name: /Process definitions/ }).first().click();
      await expect(p.main.getByRole('heading', { level: 1, name: 'Process definitions' })).toBeVisible();
      await expect(p.main.getByText('Approval chains configured for this hospital.', { exact: true })).toBeVisible();
      await expect(p.main.getByRole('columnheader')).toHaveText(['Process key', 'Name', 'Steps', 'Status', 'Actions']);
    });
    await qa.step(2, async () => {
      await p.row(PROCESS).getByRole('button', { name: /^(Edit chain|Ubah rantai)/ }).click();
      await expect(p.dialog.getByText('Configure this approval chain in three short steps, then save.', { exact: true })).toBeVisible();
      const marks = (await p.dialog.getByRole('listitem').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      qa.note(2, `wizard steps: ${marks.join(', ')}`);
    });
    await qa.step(3, async () => {
      await expect(p.dialog.getByLabel('Display name', { exact: true })).toHaveValue(was.name);
      await p.next().click();
      await expect(p.dialog.getByRole('button', { name: 'Add step' })).toBeVisible();
      await expect(p.stepInputs()).toHaveCount(was.steps.length);
    });
    await qa.step(4, async () => {
      changed = true;
      await p.setSteps([qa.prefix('X Kepala gudang'), qa.prefix('X Direktur')]);
      expect(await p.save()).toContain('Approval chain saved.');
      expect((await p.cells(PROCESS))[2]).toBe('2');
    });
    qa.notRun(5, 'TBD in the workbook: the purchase order of 09 Procurement against the two-step chain is chain E2E-050 (steps 2 and 3)');
    await qa.step(6, async () => {
      await p.edit(PROCESS);
      const hint = (await p.dialog.innerText()).match(/(Available process keys|Kunci proses yang tersedia)[^.\n]*/)?.[0] ?? '';
      await page.keyboard.press('Escape');
      const keys = (await p.main.getByRole('row').allInnerTexts()).map((r) => r.trim().split(/\s+/)[0]).filter((k) => /^[a-z_]+$/.test(k));
      qa.note(6, `hint "${hint}"; the list holds ${keys.length} processes (${keys.filter((k) => k.startsWith('budget_')).length} budget processes)`);
    });
  } catch (e) {
    // A failure hands nothing back to a chain: the chain is put back here, kept or not.
    if (changed) await restoreChain(page, PROCESS, was);
    throw e;
  }
  if (changed && !keep) await restoreChain(page, PROCESS, was);
  return was;
};

/**
 * TC-APP018-055: a chain without steps is refused before saving; the
 * purchase order chain made inactive is saved and then put back.
 */
export const TC_APP018_055 = async ({ page, qa }: CaseArgs): Promise<void> => {
  const p = new Processes(page);
  const was = await p.readChain(PROCESS);
  let changed = false;
  try {
    await qa.step(1, async () => {
      await p.edit(PROCESS);
      await p.next().click();
      while ((await p.stepInputs().count()) > 1) await p.dialog.getByRole('button', { name: `Remove step ${await p.stepInputs().count()}` }).click();
      const removeLast = p.dialog.getByRole('button', { name: 'Remove step 1' });
      if (await removeLast.isDisabled()) {
        // The last step cannot be removed: the nearest refusal is a step without a name.
        await p.stepInputs().first().fill('');
        const nextOff = await p.next().isDisabled();
        const shown = (await p.dialog.getByText('Add at least one approval step.').count()) > 0;
        qa.deviation(1, 'The text "Add at least one approval step."', `"Remove step 1" is disabled on the last step, so a chain without steps cannot be made; with the only step's name emptied "Next" is ${nextOff ? 'disabled' : 'enabled'} and the text is ${shown ? '' : 'not '}shown`);
      } else {
        await removeLast.click();
        await p.next().click();
        await expect(p.dialog.getByText('Add at least one approval step.', { exact: true })).toBeVisible();
      }
      await page.keyboard.press('Escape');
    });
    qa.notRun(2, 'TBD in the workbook: needs a document waiting at step 2 of a two-step chain (chain E2E-050)');
    await qa.step(3, async () => {
      changed = true;
      const toasts = await p.write(PROCESS, { ...was, active: false });
      const row = await p.cells(PROCESS);
      qa.note(3, `saved inactive: "${toasts.join(' / ')}"; the row reads ${row.join(' | ')} (TBD in the workbook: whether new documents are approved at once or cannot be approved)`);
    });
  } finally {
    if (changed) await restoreChain(page, PROCESS, was);
  }
};
