import { addDays, todayWib } from '../../../lib/dates';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder } from '../../../lib/assertions';
import { userPage } from '../shared/access';
import { Desk, SAVED } from '../shared/desk';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of punch.spec.ts, shared with the end-to-end chains (chain.run). */

export const punch = (p: import('@playwright/test').Page) => new Desk(p, '/hr/desk/attendance', 'Punch', 'Punch');

export const TC_APP010_049: QaBody = async ({ qa, browser }) => {
  const u7 = await userPage(browser, 'U7');
  try {
    await installToastRecorder(u7);
    const d = punch(u7);
    await qa.step(1, async () => {
      await u7.goto('/id/hr');
      await u7.getByRole('complementary').getByRole('link', { name: 'Attendance' }).first().click();
      await expect(d.main.getByRole('heading', { level: 1, name: 'Punch' })).toBeVisible();
      await expect(d.main.getByRole('button', { name: 'Punch', exact: true })).toBeVisible();
    });
    await qa.step(2, async () => {
      await d.openDialog();
      for (const f of ['Employee no', 'Name / location / kind', 'From', 'To', 'Note']) {
        if (!(await d.dialog.getByRole('textbox', { name: f, exact: true }).count())) qa.deviation(2, `A field "${f}"`, `no field "${f}" in the dialog`);
      }
      await expect(d.dialog.getByRole('combobox', { name: 'Action' }).locator('option')).toHaveText(['Punch', 'Onsite']);
    });
    await qa.step(3, async () => {
      expect(await d.save({ 'Name / location / kind': 'IN' }, 'Punch')).toContain(SAVED);
      const rows = (await d.main.getByRole('table').getByRole('row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' '));
      qa.note(3, `the list after the punch: ${rows.slice(1, 3).join(' | ') || 'no row'}`);
      if (rows.length < 2 || /No rows yet|Belum ada data/.test(rows.join(' '))) qa.deviation(3, 'Toast "Saved."; a row for the punch', 'saved, but the list shows no row');
    });
    await qa.step(4, async () => {
      expect(await d.save({ 'Name / location / kind': 'OUT' }, 'Punch')).toContain(SAVED);
    });
    await qa.step(5, async () => {
      const today = todayWib();
      expect(await d.save({ 'Employee no': 'X-EMP-QA-PEGAWAI', 'Name / location / kind': qa.prefix('X Lokasi onsite'), From: today, To: today }, 'Onsite')).toContain(SAVED);
    });
  } finally {
    await u7.context().close();
  }
};

export const TC_APP010_050: QaBody = async ({ qa, browser }) => {
  const u4 = await userPage(browser, 'U4');
  const u7 = await userPage(browser, 'U7');
  try {
    await installToastRecorder(u4);
    await installToastRecorder(u7);
    await qa.step(1, async () => {
      const toasts = await punch(u4).save({ 'Name / location / kind': 'IN' }, 'Punch');
      qa.note(1, `U4 (not linked to an employee): "${toasts.join(' / ') || 'no toast'}" (the text is TBD in the workbook)`);
      expect(toasts).not.toContain(SAVED);
    });
    await qa.step(2, async () => {
      const toasts = await punch(u7).save({ 'Name / location / kind': 'in' }, 'Punch');
      qa.note(2, `"in" in small letters: "${toasts.join(' / ') || 'no toast'}" (the text is TBD in the workbook)`);
      if (toasts.includes(SAVED)) qa.deviation(2, 'Refused: "punch type is required"', '"in" in small letters is saved');
    });
  } finally {
    await u4.context().close();
    await u7.context().close();
  }
};

export const TC_APP010_051: QaBody = async ({ qa, browser }) => {
  const u7 = await userPage(browser, 'U7');
  try {
    await installToastRecorder(u7);
    const d = punch(u7);
    await qa.step(1, async () => {
      const tomorrow = addDays(todayWib(), 1);
      const toasts = await d.save({ 'Employee no': 'X-EMP-QA-PEGAWAI', 'Name / location / kind': qa.prefix('X Lokasi onsite'), From: tomorrow, To: tomorrow }, 'Onsite');
      qa.note(1, `"From" tomorrow: "${toasts.join(' / ') || 'no toast'}" (the text is TBD in the workbook)`);
      if (toasts.includes(SAVED)) qa.deviation(1, 'Refused: "date is in the future"', 'an onsite day of tomorrow is saved');
    });
    await qa.step(2, async () => {
      const toasts = await d.save({ 'Employee no': 'X-EMP-QA-PEGAWAI', From: todayWib(), To: todayWib() }, 'Onsite');
      qa.note(2, `"Name / location / kind" empty: "${toasts.join(' / ') || 'no toast'}" (the text is TBD in the workbook)`);
      if (toasts.includes(SAVED)) qa.deviation(2, 'Refused: "employee and location are required"', 'saved without a location');
    });
  } finally {
    await u7.context().close();
  }
};
