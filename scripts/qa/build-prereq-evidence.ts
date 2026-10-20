/**
 * Evidence workbook of the one-time prerequisite run (tests/prereq/prereq.spec.ts):
 * reads reports/prereq/results.json and writes reports/prereq/00-prerequisites-evidence.xlsx.
 * One sheet per sheet of 00-prerequisites.xlsx (Users, Role accounts, Set-up and data)
 * plus Roles, each row with its result, notes and links to its screenshots; the sheet
 * Screenshots holds the pictures themselves so the workbook can travel alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import type { PrereqItem } from '../../tests/prereq/prereq.spec';

const DIR = 'reports/prereq';
const IN = path.join(DIR, 'results.json');
const OUT = path.join(DIR, '00-prerequisites-evidence.xlsx');

const FILL: Record<PrereqItem['result'], string> = {
  Done: 'FFC6EFCE',
  'Already present': 'FFDDEBF7',
  Failed: 'FFFFC7CE',
  Blocked: 'FFFFEB9C',
  'Not possible': 'FFEDEDED',
  'Not done': 'FFFFF2CC',
};

const run = JSON.parse(fs.readFileSync(IN, 'utf8')) as { site: string; runAt: string; runBy: string; items: PrereqItem[] };
const wb = new ExcelJS.Workbook();
wb.creator = 'KlikMed QA automation';

const head = (ws: ExcelJS.Worksheet, row: number) => {
  ws.getRow(row).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
};

// ------------------------------------------------------------ summary

const sum = wb.addWorksheet('Summary');
sum.columns = [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }];
sum.addRow(['KlikMed: evidence of the prerequisite run (00-prerequisites.xlsx)']).font = { bold: true, size: 14 };
sum.addRow([`Site ${run.site}; run ${run.runAt.replace('T', ' ').slice(0, 16)} UTC by ${run.runBy}; one run under the go-ahead of 2026-10-20. Accounts use the shared password QA_PASSWORD (.env).`]);
sum.addRow([]);
const results = Object.keys(FILL) as PrereqItem['result'][];
sum.addRow(['Sheet', ...results, 'Total']);
head(sum, 4);
for (const sheet of ['Users', 'Role accounts', 'Roles', 'Set-up and data'] as const) {
  const items = run.items.filter((i) => i.sheet === sheet);
  sum.addRow([sheet, ...results.map((r) => items.filter((i) => i.result === r).length), items.length]);
}
sum.addRow(['Total', ...results.map((r) => run.items.filter((i) => i.result === r).length), run.items.length]).font = { bold: true };
sum.addRow([]);
sum.addRow(['Result', 'Meaning']).font = { bold: true };
const meaning: Record<PrereqItem['result'], string> = {
  Done: 'Made by this run and checked (toast, then sign-in or the screen afterwards).',
  'Already present': 'Found on the site before saving; nothing saved.',
  Failed: 'Tried; the site refused or the check after saving failed (see Notes).',
  Blocked: 'Stopped by a known defect (blocker number in Notes).',
  'Not possible': 'No screen does it, or the site lacks what it needs; left to the site administrator or Development.',
  'Not done': 'Out of this run by decision (see Notes).',
};
for (const r of results) {
  const row = sum.addRow([r, meaning[r]]);
  row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[r] } };
}

// ------------------------------------------------------------ one sheet per prerequisite sheet

const shotIds = new Map<string, string>();
let shotNo = 0;
for (const i of run.items) for (const s of i.screenshots) shotIds.set(s, `SS-${String(++shotNo).padStart(3, '0')}`);

for (const sheet of ['Users', 'Role accounts', 'Roles', 'Set-up and data'] as const) {
  const ws = wb.addWorksheet(sheet);
  ws.columns = [
    { header: 'ID', width: 8 },
    { header: '00-prerequisites.xlsx', width: 30 },
    { header: 'Item', width: 34 },
    { header: 'Login', width: 18 },
    { header: 'Roles / rights', width: 26 },
    { header: 'Branch', width: 12 },
    { header: 'Action', width: 26 },
    { header: 'Result', width: 15 },
    { header: 'Notes', width: 90 },
    { header: 'Screenshots', width: 40 },
    { header: 'Time (UTC)', width: 17 },
  ];
  head(ws, 1);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const i of run.items.filter((x) => x.sheet === sheet)) {
    const row = ws.addRow([i.id, i.ref, i.item, i.login ?? '', i.roles ?? '', i.branch ?? '', i.action, i.result, i.notes.map((n) => `• ${n}`).join('\n'), '', i.at.replace('T', ' ').slice(0, 16)]);
    row.alignment = { vertical: 'top', wrapText: true };
    row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[i.result] } };
    // One cell holds one link: the first screenshot is linked, every one is named (sheet Screenshots shows them all).
    if (i.screenshots.length) {
      const names = i.screenshots.map((s) => `${shotIds.get(s)} ${path.basename(s)}`).join('\n');
      const rel = path.posix.relative(DIR, i.screenshots[0].split(path.sep).join('/'));
      row.getCell(10).value = { text: names, hyperlink: rel };
      row.getCell(10).font = { color: { argb: 'FF0563C1' }, underline: true };
    }
  }
  ws.autoFilter = { from: 'A1', to: 'K1' };
}

// ------------------------------------------------------------ screenshots

const pics = wb.addWorksheet('Screenshots');
pics.columns = [{ width: 12 }, { width: 10 }, { width: 60 }, { width: 140 }];
pics.addRow(['Screenshot', 'Item', 'File', 'Picture']);
head(pics, 1);
let at = 2;
const WIDTH = 960;
for (const i of run.items) {
  for (const s of i.screenshots) {
    if (!fs.existsSync(s)) continue;
    const row = pics.getRow(at);
    row.values = [shotIds.get(s), i.id, { text: path.basename(s), hyperlink: path.posix.relative(DIR, s.split(path.sep).join('/')) }];
    row.alignment = { vertical: 'top' };
    const png = fs.readFileSync(s);
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const height = Math.round((h / w) * WIDTH);
    const img = wb.addImage({ buffer: png as unknown as ExcelJS.Buffer, extension: 'png' });
    pics.addImage(img, { tl: { col: 3, row: at - 1 }, ext: { width: WIDTH, height } });
    // Rows are 20 px high: leave room for the picture.
    const rows = Math.ceil(height / 20) + 1;
    for (let k = 0; k < rows; k++) pics.getRow(at + k).height = 15;
    at += rows;
  }
}

wb.xlsx.writeFile(OUT).then(() => console.log(`${OUT}: ${run.items.length} items, ${shotNo} screenshots`));
