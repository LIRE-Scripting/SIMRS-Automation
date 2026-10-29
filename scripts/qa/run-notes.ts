/**
 * Helpers shared by the result workbook builders (build-e2e-workbook.ts and
 * build-e2e-chains.ts): the "Automation notes" column and the link from each
 * test case to its screenshot. The screenshots are written by the fixture
 * (fixtures/e2e.ts) to SCREENSHOT_DIR, one PNG per test case or chain.
 */
import fs from 'node:fs';
import path from 'node:path';
import type ExcelJS from 'exceljs';
import { SCREENSHOT_DIR } from '../../lib/config';

/** A hint for the reviewer, from the error text of a failed step. It does not decide whether the site or the automation is wrong. */
export function probableCause(error: string): string {
  if (/React error #441|HTTP 500|server error|Failed to save/i.test(error)) return 'site defect (the server answered with an error)';
  if (/strict mode violation|resolved to 0 elements|element\(s\) not found|toBeVisible|toBeAttached|toHaveCount|toHaveText|toContainText/i.test(error)) return 'check: locator or screen content (automation or site)';
  if (/Timeout \d+ms exceeded|Test timeout/i.test(error)) return 'check: timeout (slow page or a missing wait)';
  if (/expect\(received\)|expect\(actual\)/i.test(error)) return 'check: the value on screen differs from the expected one';
  return 'check: see the error';
}

/** The screenshot of a test case or chain, when the run wrote one. */
export function screenshotOf(id: string): string | undefined {
  const file = path.join(SCREENSHOT_DIR, `${id}.png`);
  return fs.existsSync(file) ? file : undefined;
}

/** Cell value: a link to the screenshot (relative to the workbook's folder), or the given text. */
export function evidenceCell(id: string, workbookDir: string, fallback: string): ExcelJS.CellValue {
  const file = screenshotOf(id);
  if (!file) return fallback;
  const rel = path.posix.relative(workbookDir, file.split(path.sep).join('/'));
  return { text: `${id}.png`, hyperlink: rel };
}

/** Appends the "Catatan otomasi" (automation notes) column to a Steps sheet; returns its column number. */
export function addNotesColumn(ws: ExcelJS.Worksheet): number {
  const head = ws.getRow(1);
  let last = 0;
  head.eachCell({ includeEmpty: false }, (_c, i) => (last = Math.max(last, i)));
  const idx = last + 1;
  const cell = head.getCell(idx);
  cell.value = 'Catatan otomasi';
  cell.style = JSON.parse(JSON.stringify(head.getCell(last).style));
  ws.getColumn(idx).width = 70;
  return idx;
}
