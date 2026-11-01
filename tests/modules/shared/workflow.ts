import { expect, type Page } from '@playwright/test';
import { asOnSite } from '../../../lib/i18n';

/**
 * Workflow, Process Definitions (/id/workflow/process-definitions): the
 * approval chains of the tenant (discharge, purchase_order, budget_*). The
 * administrator U1 edits a chain with "Ubah rantai: <key>" (seen 2026-11-01):
 * a wizard of three parts, Identitas (key, name, "Aktif"), Langkah (the
 * steps) and Tinjau ("Simpan"). The texts are those of the site (Indonesian):
 * the wizard is driven untranslated.
 */
export async function chainActive(page: Page, key: string): Promise<boolean> {
  return asOnSite(async () => {
    await page.goto('/id/workflow/process-definitions');
    const row = page.locator('table tbody tr').filter({ has: page.getByRole('cell', { name: key, exact: true }) }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    return /\bAktif\b/.test(await row.innerText());
  });
}

/** Switches the chain `key` on or off ("Aktif"); returns the toasts of "Simpan". */
export async function setChainActive(page: Page, key: string, active: boolean): Promise<string[]> {
  return asOnSite(async () => {
    await page.goto('/id/workflow/process-definitions');
    // The button is named after the chain's display name ("Ubah rantai: Purchase order"): it is found on the row of the key.
    await page.locator('table tbody tr').filter({ has: page.getByRole('cell', { name: key, exact: true }) }).first().getByRole('button', { name: /^Ubah rantai: / }).click();
    const d = page.getByRole('dialog').last();
    await expect(d.getByText('Identitas', { exact: true }).first()).toBeVisible();
    await d.getByRole('checkbox').setChecked(active);
    await d.getByRole('button', { name: 'Lanjut' }).click();
    await d.getByRole('button', { name: 'Lanjut' }).click();
    await expect(d.getByText(`Status: ${active ? 'Aktif' : 'Nonaktif'}`)).toBeVisible();
    const seen: string[] = [];
    const recorder = (t: string) => seen.push(t);
    const toast = page.locator('[data-sonner-toast], [role="status"]');
    await d.getByRole('button', { name: 'Simpan' }).click();
    await expect(d).toBeHidden({ timeout: 15_000 });
    for (const t of await toast.allInnerTexts().catch(() => [] as string[])) recorder(t.trim());
    await expect.poll(() => chainActive(page, key), { timeout: 20_000 }).toBe(active);
    return seen.filter((t) => t && !/^Tenant branding/.test(t));
  });
}

export const PO_CHAIN_STEPS = ['Pengajuan Departemen', 'Verifikasi Gudang', 'Persetujuan Manajer Keuangan', 'Persetujuan Direktur'];

/**
 * Sets the step names of the chain `key` (part "Langkah" of "Ubah rantai"); returns the review text and whether the editor
 * offered a role for a step (it names steps only, seen 2026-11-01).
 */
export async function setChainSteps(page: Page, key: string, names: string[]): Promise<{ review: string; roleAsked: boolean }> {
  return asOnSite(async () => {
    await page.goto('/id/workflow/process-definitions');
    await page.locator('table tbody tr').filter({ has: page.getByRole('cell', { name: key, exact: true }) }).first().getByRole('button', { name: /^Ubah rantai: / }).click();
    const d = page.getByRole('dialog').last();
    await expect(d.getByText('Identitas', { exact: true }).first()).toBeVisible();
    await d.getByRole('button', { name: 'Lanjut' }).click();
    const boxes = d.getByRole('textbox', { name: 'Nama langkah' });
    await expect(boxes.first()).toBeVisible();
    while ((await boxes.count()) < names.length) await d.getByRole('button', { name: 'Tambah langkah' }).click();
    while ((await boxes.count()) > names.length) await d.getByRole('button', { name: `Remove step ${await boxes.count()}` }).click();
    for (const [i, n] of names.entries()) await boxes.nth(i).fill(n);
    const roleAsked = (await d.getByRole('combobox').count()) > 0 || (await d.getByText(/peran|role/i).count()) > 0;
    await d.getByRole('button', { name: 'Lanjut' }).click();
    const review = (await d.innerText()).replace(/\s+/g, ' ');
    await d.getByRole('button', { name: 'Simpan' }).click();
    await expect(d).toBeHidden({ timeout: 15_000 });
    return { review, roleAsked };
  });
}
