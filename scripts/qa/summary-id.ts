/**
 * Indonesian texts of the summary (simrs-run-summary.xlsx, docs/qa/deviations.md,
 * docs/qa/http-5xx.md). The tests write their notes in English (the reference
 * workbooks are English); the summary gives them in Indonesian:
 *
 * - titles of test cases: scripts/qa/id/titles.json (English title → Indonesian);
 * - the texts the tests record (deviations, not-run and blocked reasons, blocker
 *   fixes, module names): scripts/qa/id/texts.json, by the smallest part that
 *   carries words. Structure is translated here: "Step 5: Excel expects "A";
 *   the site: B" becomes "Langkah 5: workbook mengharapkan "A'"; di situs: B'",
 *   with A and B looked up on their own; "Blocker 40: … (found by automation …):
 *   <English title>" becomes "blocker 40 – <BLOCKER_TITLE_ID[40]>".
 *
 * A text without a translation stays English and is remembered in `missing`;
 * `npm run qa:summary-id-missing` lists those of the summary
 * (.qa-state/summary-id-missing.json) and `npm run qa:e2e-workbook` those of the
 * result workbooks (Actual Result and Catatan otomasi of sheet Steps,
 * .qa-state/workbook-id-missing.json), so they can be added to the two files.
 * The notes of the tests carry values of the run (tokens, ids, numbers): they
 * are kept as templates with {0}, {1}, … (templateOf). The columns copied from
 * the reference workbooks (Action, Expected Result, …) stay as written there.
 */
import fs from 'node:fs';
import { blockers } from '../../lib/qa-data';
import { FOUND_BLOCKERS } from '../../lib/qa-data/found-blockers';
import { BLOCKER_TITLE_ID } from './blocker-titles-id';

const TITLES_FILE = 'scripts/qa/id/titles.json';
const TEXTS_FILE = 'scripts/qa/id/texts.json';
const load = (f: string): Record<string, string> => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, string>) : {});
const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
const TITLES = new Map(Object.entries(load(TITLES_FILE)).map(([k, v]) => [norm(k), v]));
const TEXTS = new Map(Object.entries(load(TEXTS_FILE)).map(([k, v]) => [norm(k), v]));

/** English texts met without a translation, by kind. */
export const missing = { titles: new Set<string>(), texts: new Set<string>() };

/** The English title of each blocker (to find it inside a reason). */
const BLOCKER_EN = new Map<number, string>([
  ...blockers().blockers.map((b) => [b.no, b.blocker] as [number, string]),
  ...FOUND_BLOCKERS.map((b) => [b.no, b.blocker] as [number, string]),
]);

/** The Indonesian title of a test case (or chain title without a CHAIN_NAME_ID). */
export function titleId(en: string): string {
  const hit = TITLES.get(norm(en));
  if (hit) return hit;
  if (en) missing.titles.add(norm(en));
  return en;
}

/**
 * The values that change from run to run, replaced by {0}, {1}, … in a template: a UUID, a QA token
 * (letters and digits, 8 or more, e.g. MVWK3JL2004) and any number. A text of the notes recorded by the
 * tests ("2 patient(s) named QA-AMB Calon Dua MVWK3JL2004") is kept in texts.json as its template
 * ("{0} patient(s) named QA-AMB Calon Dua {1}"), so its translation holds for every run.
 */
const VALUE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,}\b|\d+(?:[.,]\d+)*/g;
export function templateOf(text: string): { key: string; values: string[] } {
  const values: string[] = [];
  const key = text.replace(VALUE, (v) => `{${values.push(v) - 1}}`);
  return { key, values };
}
const fill = (template: string, values: string[]) => template.replace(/\{(\d+)\}/g, (m, i: string) => values[Number(i)] ?? m);

/** A word-carrying part looked up in texts.json (as it is, else as its template); English when it has none. */
export function partId(en: string): string {
  const t = norm(en);
  if (!t) return en;
  const hit = TEXTS.get(t);
  if (hit !== undefined) return hit;
  const { key, values } = templateOf(t);
  const tpl = TEXTS.get(key);
  if (tpl !== undefined) return fill(tpl, values);
  if (/[a-z]{3}/i.test(t)) missing.texts.add(values.length ? key : t);
  return en;
}

/** Writes the texts met without a translation (titles and texts) to `file`, as { en: "" } for filling in. */
export function saveMissing(file: string): number {
  const out = {
    titles: Object.fromEntries([...missing.titles].sort().map((t) => [t, ''])),
    texts: Object.fromEntries([...missing.texts].sort().map((t) => [t, ''])),
  };
  fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
  return missing.titles.size + missing.texts.size;
}

/** "Excel expects "A"; the site: B" → its parts, else null. */
export function deviationParts(text: string): { expected: string; site: string } | null {
  const m = /^Excel expects "([\s\S]*?)"; the site: ([\s\S]*)$/.exec(text.trim());
  return m ? { expected: m[1], site: m[2] } : null;
}

const SOURCE = String.raw`\((?:found by automation, docs/qa/blockers-found\.md|00-blockers-checklist-linked\.xlsx \| Checklist \| row \d+)\)`;
/**
 * The forms a blocker takes in a reason: "Blocker 40: [TC-… step 3, ]blocker 40 (<source>): <title>[…]",
 * "Blocker 19 (<source>): <title>;", "Blocker 13: <title> (<source>);", "blocker 17 (<source>): <title>"
 * → "blocker 40 – <judul>[; <more>]".
 */
function blockerPart(text: string): string | null {
  const m = new RegExp(String.raw`^(?:Blocker (\d+):? )?(?:TC-APP\d{3}-\d{3} step \d+, )?(?:blocker (\d+) )?(${SOURCE})?:?\s*([\s\S]*)$`).exec(text.trim());
  const no = Number(m?.[1] ?? m?.[2]);
  if (!m || !no || (!m[1] && !m[3])) return null;
  let rest = m[4];
  const en = BLOCKER_EN.get(no) ?? '';
  if (en && rest.startsWith(en)) rest = rest.slice(en.length);
  rest = rest.replace(new RegExp(String.raw`^\s*${SOURCE}`), '').replace(/^[\s:;.,]+|[\s;]+$/g, '');
  const title = BLOCKER_TITLE_ID[no] ?? en;
  return `blocker ${no} – ${title}${rest ? `; ${partId(rest)}` : ''}`;
}

/** One reason without its "Step N: " (a deviation, a blocker, a not-run reason). */
export function reasonId(text: string): string {
  const t = text.trim();
  const tc = /^(TC-APP\d{3}-\d{3}) step (\d+)(?: is not run)?: ([\s\S]*)$/.exec(t);
  if (tc) return `${tc[1]} langkah ${tc[2]}: ${reasonId(tc[3])}`;
  const dev = deviationParts(t);
  if (dev) return `workbook mengharapkan "${partId(dev.expected)}"; di situs: ${partId(dev.site)}`;
  const b = blockerPart(t);
  if (b) return b;
  const user = /^User (U\d+): ([\s\S]*)$/.exec(t);
  if (user) return `user ${user[1]}: ${reasonId(user[2])}`;
  const code = /^(STEP-NOT-RUN|NOT-AUTOMATED|NEEDS-EVALUATION|NOT-RUN): ([\s\S]*)$/.exec(t);
  if (code) return `${code[1]}: ${reasonId(code[2])}`;
  return partId(t);
}

/**
 * A reason as the summary records it: "Step 5: …; Step 7: …", maybe after
 * "Every step not run: " or "Passed; not run: ".
 */
export function textId(text: string): string {
  if (!text) return text;
  const lead = /^(Every step not run|Passed; not run): ([\s\S]*)$/.exec(text);
  if (lead) return `${lead[1] === 'Every step not run' ? 'Semua langkah tidak dijalankan' : 'Lulus; tidak dijalankan'}: ${textId(lead[2])}`;
  const parts = text.split(/; (?=Step \d+: )/);
  if (parts.length === 1 && !/^Step \d+: /.test(text)) return reasonId(text);
  return parts.map((p) => p.replace(/^Step (\d+): ([\s\S]*)$/, (_, n: string, r: string) => `Langkah ${n}: ${reasonId(r)}`)).join('; ');
}

/** Module names ("01 Ambulatory Care", "E2E chains") and the short words of the blocker sheet. */
export const wordId = (en: string): string => partId(en);
