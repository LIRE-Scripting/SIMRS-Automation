import { AsyncLocalStorage } from 'node:async_hooks';
import type { Browser, BrowserContext } from '@playwright/test';
import en from './messages-en.json';
import id from './messages-id.json';

/**
 * The suite runs on the Indonesian site (/id/...), the language the testers
 * read, while specs and page objects keep the English texts the reference
 * workbooks quote ("Clicks \"New Registration\""). The site's own text table
 * (messages-en.json / messages-id.json, saved by npm run qa:messages) joins
 * the two:
 *
 * - every text a locator looks for (getByRole name, getByText, getByLabel,
 *   getByPlaceholder, getByTitle, hasText, filter) and every text an
 *   expect(locator) compares (toHaveText, toContainText, toHaveAccessibleName)
 *   matches the English text or its Indonesian one(s);
 * - selectOption picks an option by its English or Indonesian label;
 * - texts read from the screen (innerText, textContent, allInnerTexts,
 *   evaluate and evaluateAll of a locator, and the recorded toasts) come back
 *   in English where they are texts of the table (line by line; an ambiguous
 *   text takes the meaning of the page's app), with dates and times in the
 *   English form ("28 Okt 2026, 09.00" -> "Oct 28, 2026, 09:00"), so the specs
 *   compare them with the reference as before.
 *
 * Texts not in the table (test data, names, numbers) pass through unchanged.
 * A check of the Indonesian texts themselves runs in asOnSite(), which turns
 * the translation off.
 */

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = '', out = new Map<string, string>()): Map<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') out.set(prefix + key, value);
    else leaves(value, `${prefix}${key}.`, out);
  }
  return out;
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/ /g, '\\s+');

interface Template {
  /** The English text with its placeholders, "{count} selected". */
  source: string;
  pattern: RegExp;
  names: string[];
  target: string;
  /** Characters outside the placeholders: of two templates that match, the one with more fixed text is meant. */
  fixed: number;
}

/**
 * Texts of one language with their counterparts in the other (each with the
 * keys of the table that give it), and the templates with {placeholders}.
 */
class Table {
  readonly exact = new Map<string, Map<string, string[]>>();
  readonly templates: Template[] = [];

  constructor(from: Map<string, string>, to: Map<string, string>) {
    for (const [key, source] of from) {
      const target = to.get(key);
      if (target === undefined) continue;
      const s = norm(source);
      const t = norm(target);
      if (!s) continue;
      // A text that reads the same in both languages is kept: it weighs against a rarer meaning ("Status" is mostly "Status", not "State").
      if (/\{\w+\}/.test(s)) {
        if (s === t) continue;
        const names = [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
        const body = s.split(/\{\w+\}/).map(escape).join('(.+?)');
        const fixed = s.replace(/\{\w+\}/g, '').length;
        if (fixed >= 3) this.templates.push({ source: s, pattern: new RegExp(`^${body}$`), names, target: t, fixed });
      } else {
        if (!this.exact.has(s)) this.exact.set(s, new Map());
        const targets = this.exact.get(s)!;
        targets.set(t, [...(targets.get(t) ?? []), key]);
      }
    }
    this.templates.sort((a, b) => b.fixed - a.fixed);
  }

  /**
   * The counterparts of a whole text, without those that the page's sections
   * use for another text ("Amount" may be "Nilai" or "Jumlah", but in Fixed
   * assets "Jumlah" is "Quantity"). `reverse` is the table the other way round.
   */
  lookupOn(text: string, sections: string[], reverse?: Table): string[] {
    const all = this.lookup(text, sections);
    if (!sections.length || !reverse) return all;
    const inSections = (keys: string[]) => keys.some((k) => sections.some((x) => k.startsWith(`${x}.`)));
    // Kept unless every meaning the sections give it is another text.
    const mine = all.filter((t) => {
      const there = [...(reverse.exact.get(t) ?? new Map<string, string[]>())].filter(([, keys]) => inSections(keys)).map(([en]) => en);
      return !there.length || there.includes(norm(text));
    });
    return mine.length ? mine : all;
  }

  /**
   * The counterparts of a whole text, or [] when the table has none: first
   * those of the sections in `sections` (the app of the page), then the most
   * used meaning ("Menunggu" is "Waiting" in registration, else "Pending").
   */
  lookup(text: string, sections: string[] = []): string[] {
    const s = norm(text);
    const hit = this.exact.get(s);
    if (hit) {
      const score = (keys: string[]) => (keys.some((k) => sections.some((x) => k.startsWith(`${x}.`))) ? 1e6 : 0) + keys.length;
      return [...hit].sort((a, b) => score(b[1]) - score(a[1])).map(([t]) => t);
    }
    const out = new Set<string>();
    for (const t of this.templates) {
      const m = t.pattern.exec(s);
      if (!m) continue;
      let filled = t.target;
      t.names.forEach((name, i) => {
        const value = m[i + 1];
        // A filled-in value takes its meaning of the page's app ("Dikirim" is "Sent" in Laboratory).
        const counterpart = this.exact.has(value) ? this.lookup(value, sections)[0] : undefined;
        filled = filled.replace(`{${name}}`, counterpart ?? value);
      });
      out.add(filled);
    }
    return [...out];
  }
}

const EN = leaves(en as Tree);
const ID = leaves(id as Tree);
// Texts the page payload does not carry as messages, seen on the site: the label before a medical record number.
EN.set('qa.site.mrn', 'MRN');
ID.set('qa.site.mrn', 'RM');
const toId = new Table(EN, ID);
const toEn = new Table(ID, EN);

const cache = new Map<string, string | RegExp>();

const untranslated = new AsyncLocalStorage<boolean>();

/** Runs body with the translation off: locators and reads see the site's own (Indonesian) texts. */
export function asOnSite<T>(body: () => Promise<T>): Promise<T> {
  return untranslated.run(true, body);
}

const off = (): boolean => untranslated.getStore() === true;

/**
 * A text to look for on the Indonesian site: the text itself when the table
 * has no translation, else a RegExp matching the English text or any of its
 * Indonesian ones, whole when `exact`; else the English text as a
 * case-insensitive part and the Indonesian ones whole.
 */
export function onSite(text: string, exact = false, sections: string[] = []): string | RegExp {
  const key = `${exact ? 1 : 0}${sections.join(',')}\u0000${text}`;
  if (!cache.has(key)) {
    const ids = toId.lookupOn(text, sections, toEn);
    // A text that is no text of the table, made of some ("<name> MRN <number>", "<label> <description>" of a radio): its pieces.
    const pieces = ids.length || !/\s/.test(norm(text)) ? null : regexPartsOnSite(new RegExp(exact ? `^${escape(norm(text))}$` : escape(norm(text)), exact ? '' : 'i'));
    if (!ids.length && pieces && pieces.source !== (exact ? `^${escape(norm(text))}$` : escape(norm(text)))) cache.set(key, pieces);
    else if (!ids.length) cache.set(key, text);
    else if (exact) cache.set(key, new RegExp(`^(?:${[...new Set([norm(text), ...ids])].map(escape).join('|')})$`));
    else {
      // The English text keeps Playwright's part match; its Indonesian texts are whole labels, matched whole
      // ("Tax (%)" must not find "Tarif pajak (%)").
      const others = ids.filter((t) => t !== norm(text));
      cache.set(key, new RegExp(`(?:${escape(norm(text))}${others.length ? `|^\\s*(?:${others.map(escape).join('|')})\\s*$` : ''})`, 'i'));
    }
  }
  return cache.get(key)!;
}

/**
 * The source of a RegExp that matches `text` or one of its Indonesian texts,
 * to build a pattern of several parts ("<type> · Accepted · <sample>", where
 * the site writes "Diterima" in the middle).
 */
export function sourceOnSite(text: string): string {
  const r = onSite(text, true);
  return typeof r === 'string' ? escape(r) : r.source.replace(/^\^/, '').replace(/\$$/, '');
}
export const escapeText = (text: string): string => escape(text);

/**
 * A RegExp of the specs made of plain alternatives, such as /^(Save|Simpan)$/i,
 * /Saved/ or /^Patient Care\b/: the same RegExp with the Indonesian texts of
 * each alternative added. Any other RegExp is returned unchanged.
 */
/**
 * A RegExp that is a text of the table with patterns in its placeholders,
 * such as /^\d+ selected$/ for "{count} selected" or /^Configured chain has
 * \d+ steps — started on discharge\.$/: the same RegExp or its Indonesian
 * text with the same patterns in the placeholders. Null when no template fits.
 */
function templateOnSite(re: RegExp): RegExp | null {
  let src = re.source;
  const head = src.startsWith('^') ? '^' : '';
  const tail = src.endsWith('$') && !src.endsWith('\\$') ? '$' : '';
  src = src.slice(head.length, src.length - tail.length);
  // The patterns that stand for a value: \d+, \S+, .+, [...]+, \d{1,2}, a group of one of them.
  const token = /\((?:\?:)?(?:\\[dDsSwW]|\.|\[[^\]]*\])(?:[+*]|\{\d+(?:,\d*)?\})\??\)|(?:\\[dDSwW]|\.|\[[^\]]*\])(?:[+*]|\{\d+(?:,\d*)?\})\??/g;
  const tokens: string[] = [];
  let english = '';
  let last = 0;
  for (const m of src.matchAll(token)) {
    english += src.slice(last, m.index) + `\u0000${tokens.length}\u0000`;
    tokens.push(m[0]);
    last = m.index! + m[0].length;
  }
  english += src.slice(last);
  if (!tokens.length) return null;
  // Between the patterns only plain text may stand (escaped punctuation and \s, \s+, \s* count as text).
  // The syntax check runs on the source with its escapes removed, so an escaped "(" counts as text ("(\d+ steps)").
  const bare = english.replace(/\\s[+*]?/g, ' ').replace(/\\[.()\[\]/?*+\-:,!'"&%]/g, '');
  const plain = english.replace(/\\s[+*]?/g, ' ').replace(/\\([.()\[\]/?*+\-:,!'"&%])/g, '$1');
  if (/[\\()[\]{}*+?|^$]/.test(bare.replace(/\u0000\d+\u0000/g, '')) || !/\p{L}{3}/u.test(plain)) return null;
  const shape = norm(plain.replace(/\u0000\d+\u0000/g, '{}'));
  const t = toId.templates.find((x) => x.source.replace(/\{\w+\}/g, '{}') === shape);
  if (!t) return null;
  // The Indonesian text, its placeholders filled with the patterns in the order of the English ones.
  const order = [...t.source.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const target = t.target.split(/(\{\w+\})/).map((part) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return name ? (tokens[order.indexOf(name)] ?? '.+?') : escape(part);
  }).join('');
  return new RegExp(`${head}(?:${src}|${target})${tail}`, re.flags);
}

export function regexOnSite(re: RegExp): RegExp {
  const fromTemplate = templateOnSite(re);
  if (fromTemplate) return fromTemplate;
  // Each character has one way to match (a space is part of the class), so a long source that does not fit fails fast.
  const m = /^(\^?)(?:\(\?:|\()?((?:[^\\()[\]{}*+?.$^|]|\\[.()\[\]?*+/-]|\|)+?)\)?(\\b)?(\$?)$/.exec(re.source);
  if (!m) return regexPartsOnSite(re);
  const alternatives = m[2].split('|').map((a) => a.replace(/\\(.)/g, '$1'));
  const added = alternatives.flatMap((a) => (re.flags.includes('i') ? lookupIgnoringCase(a) : toId.lookup(a)));
  if (!added.length) return regexPartsOnSite(re);
  const body = [...new Set([...alternatives, ...added])].map(escape).join('|');
  return new RegExp(`${m[1]}(?:${body})${m[3] ?? ''}${m[4]}`, re.flags);
}

/**
 * A RegExp that mixes texts and patterns, such as /Draft\s*(INV|RX)-/ or
 * /^Restricted order saved\./: each run of plain text that is a whole text
 * of the table gets its Indonesian texts as alternatives; a run at the start
 * of an anchored RegExp that only begins a text of the table gets the whole
 * Indonesian texts of the texts it begins ("Restricted order saved." of a
 * longer toast). Classes, groups and quantified characters are kept as they are.
 */
function regexPartsOnSite(re: RegExp): RegExp {
  const src = re.source;
  const out: string[] = [];
  let run = ''; // the raw source of the current run of plain text
  let text = ''; // its text
  let changed = false;
  const lookup = (t: string) => (re.flags.includes('i') ? lookupIgnoringCase(t) : toId.lookup(t)).filter((x) => x !== t);
  /** The raw source of the first `n` characters of the run's text (escapes and \s count as one). */
  const rawOf = (n: number): string => {
    let k = 0;
    let r = 0;
    while (k < n && r < run.length) {
      if (run[r] === '\\') r += /^[*+?]/.test(run[r + 2] ?? '') && run[r + 1] === 's' ? 3 : 2;
      else r += 1;
      k += 1;
    }
    return run.slice(0, r);
  };
  const flush = (atStart: boolean) => {
    // The run is cut into its longest pieces of whole words that are texts of the table, left to right
    // ("Home / Inpatient" is "Home", "/", "Inpatient"; " selected" after "\d+" keeps its space). A run at
    // the start of an anchored RegExp that only begins a text gets the whole texts it begins.
    const words = [...text.matchAll(/[^\s,;:]+/g)].map((m) => ({ s: m.index!, e: m.index! + m[0].length }));
    const raw = (from: number, to: number) => run.slice(rawOf(from).length, rawOf(to).length);
    const parts: string[] = [];
    let cursor = 0;
    for (let i = 0; i < words.length; ) {
      let found = false;
      for (let j = words.length; j > i && !found; j--) {
        const head = text.slice(words[i].s, words[j - 1].e).replace(/\s+/g, ' ');
        // Two letters only as an abbreviation in capitals ("HR" is "SDM").
        if ((head.length < 3 && !/^[A-Z]{2}$/.test(head)) || !/\p{L}/u.test(head)) continue;
        let alts = lookup(head);
        if (!alts.length && atStart && i === 0 && j === words.length && words[0].s === 0) {
          for (const [source, targets] of toId.exact) if (source !== head && source.startsWith(head)) alts.push(...targets.keys());
          alts = alts.slice(0, 12);
        }
        if (!alts.length) continue;
        parts.push(raw(cursor, words[i].s), `(?:${raw(words[i].s, words[j - 1].e)}|${[...new Set(alts)].map(escape).join('|')})`);
        cursor = words[j - 1].e;
        i = j;
        found = true;
      }
      if (!found) i += 1;
    }
    if (parts.length) {
      out.push(...parts, run.slice(rawOf(cursor).length));
      changed = true;
    } else out.push(run);
    run = '';
    text = '';
  };
  let i = 0;
  let start = true; // the run begins right after "^"
  if (src.startsWith('^')) {
    out.push('^');
    i = 1;
  } else start = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1] ?? '';
    if (c === '\\') {
      const esc = src.slice(i, i + 2);
      if (/^\\s$/.test(esc)) {
        const q = /^[*+?]/.test(src[i + 2] ?? '') ? src[i + 2] : '';
        run += esc + q;
        text += ' ';
        i += 2 + q.length;
        continue;
      }
      if (/^\\[.()\[\]/?*+\-:,!'"&%]$/.test(esc) && !/^[*+?{]/.test(src[i + 2] ?? '')) {
        run += esc;
        text += esc[1];
        i += 2;
        continue;
      }
      flush(start);
      start = false;
      out.push(esc);
      i += 2;
      continue;
    }
    if (/[^\\()[\]{}*+?.$^|]/.test(c) && !/^[*+?{]/.test(next)) {
      run += c;
      text += c;
      i += 1;
      continue;
    }
    flush(start);
    start = false;
    if (c === '[') {
      // A character class is kept whole.
      let j = i + 1;
      while (j < src.length && src[j] !== ']') j += src[j] === '\\' ? 2 : 1;
      out.push(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    out.push(c);
    i += 1;
  }
  flush(start);
  if (!changed) return re;
  try {
    return new RegExp(out.join(''), re.flags);
  } catch {
    return re;
  }
}

function lookupIgnoringCase(text: string): string[] {
  const direct = toId.lookup(text);
  if (direct.length) return direct;
  const lower = norm(text).toLowerCase();
  for (const [source, targets] of toId.exact) if (source.toLowerCase() === lower) return [...targets.keys()];
  return [];
}

/**
 * The Indonesian texts of every English text that is `start` or starts with
 * it and a space or "(" (an option picked by the start of its label:
 * "Operating" for "Operating (Belanja Operasional)").
 */
export function onSiteStartingWith(start: string): string[] {
  const n = norm(start);
  const out = new Set<string>();
  for (const [source, targets] of toId.exact) {
    if (source === n || source.startsWith(`${n} `) || source.startsWith(`${n}(`)) for (const t of targets.keys()) out.add(t);
  }
  return [...out];
}

/** The sections of the text table of a page (its app), from its address: /id/billing/cashier -> billing, hospitalAccounts. */
export function sectionsOf(url = ''): string[] {
  const first = (/^\/(?:id|en)\/([^/?#]+)/.exec(url.replace(/^https?:\/\/[^/]+/, ''))?.[1] ?? '').replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
  const more: Record<string, string[]> = {
    billing: ['hospitalAccounts'],
    finance: ['hisfinance'],
    hr: ['hrDesk', 'roster', 'rosterDesk'],
    payroll: ['payrollDesk'],
    fixedAssets: ['fixedAsset'],
    appointment: ['registration'],
    settings: ['mdm', 'identity', 'audit'],
  };
  return first ? [first, ...(more[first] ?? []), 'deskChrome'] : [];
}

/** A text read from the Indonesian site, in English when it is a whole text of the table (the meaning of the page's app first). */
export function inEnglish(text: string, sections: string[] = []): string {
  const ens = toEn.lookup(text, sections);
  return ens.length ? ens[0] : text;
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_ID_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Dates and times in the English form of the site: "28 Okt 2026" -> "Oct 28,
 * 2026", "28 Oktober 2026" -> "October 28, 2026", "09.00" -> "09:00" (the
 * Indonesian site writes times with a dot and 24 hours).
 */
export function formatsInEnglish(text: string): string {
  return text
    .replace(new RegExp(`\\b(\\d{1,2}) (${MONTHS_ID_LONG.join('|')}) (\\d{4})\\b`, 'g'), (_, d: string, m: string, y: string) => `${MONTHS_EN_LONG[MONTHS_ID_LONG.indexOf(m)]} ${Number(d)}, ${y}`)
    .replace(new RegExp(`\\b(\\d{1,2}) (${MONTHS_ID.join('|')}) (\\d{4})\\b`, 'g'), (_, d: string, m: string, y: string) => `${MONTHS_EN[MONTHS_ID.indexOf(m)]} ${Number(d)}, ${y}`)
    // A time "09.00"; not a value after a one-letter label ("L 19.05" of a nutrient line).
    .replace(/(?<![\d.,])(?<!\b\p{L}\s)([01]\d|2[0-3])\.([0-5]\d)(?![\d.,])/gu, '$1:$2');
}

/** A text read from the site in English: its lines (texts of the table, labels, statuses) and its dates and times. */
export function fromSite(text: string, url = ''): string {
  return formatsInEnglish(linesInEnglish(text, sectionsOf(url)));
}

/** fromSite for every string inside a value read with evaluate (arrays and plain objects are walked). */
function valueFromSite(value: unknown, url: string): unknown {
  if (typeof value === 'string') return fromSite(value, url);
  if (Array.isArray(value)) return value.map((v) => valueFromSite(v, url));
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, valueFromSite(v, url)]));
  }
  return value;
}

/**
 * A text of several lines read from the site (innerText), each line in
 * English when it is a whole text of the table, a "label: value" whose label
 * is one, or a status followed by a document number ("Draf RX-1a2b3c4d").
 */
export function linesInEnglish(text: string, sections: string[] = []): string {
  const whole = inEnglish(text, sections);
  if (whole !== text || !text.includes('\n')) return whole === text ? lineInEnglish(text, sections) : whole;
  return text.split('\n').map((l) => lineInEnglish(l, sections)).join('\n');
}

function lineInEnglish(line: string, sections: string[]): string {
  const t = line.trim();
  if (!t) return line;
  const whole = inEnglish(t, sections);
  if (whole !== t) return whole;
  const labelled = /^([^:]{2,60}?):\s*(.*)$/.exec(t);
  if (labelled) {
    const label = inEnglish(labelled[1], sections);
    if (label !== labelled[1]) return `${label}: ${labelled[2]}`;
  }
  const numbered = /^(.+?)\s+([A-Z][A-Z0-9]*-\S+)$/.exec(t);
  if (numbered) {
    const words = inEnglish(numbered[1], sections);
    if (words !== numbered[1]) return `${words} ${numbered[2]}`;
  }
  return line;
}

/**
 * A toast read from the Indonesian site, in English: a whole text of the table
 * is translated, else each Indonesian text of the table it contains (the
 * longest first; a toast joins its title and its description).
 */
export function toastInEnglish(text: string, url = ''): string {
  const sections = sectionsOf(url);
  const whole = inEnglish(text, sections);
  if (whole !== text) return whole;
  let out = text;
  for (const source of toastSources()) if (out.includes(source)) out = out.split(source).join(toEn.lookup(source, sections)[0]);
  return out;
}

let sources: string[] | undefined;
function toastSources(): string[] {
  sources ??= [...toEn.exact.keys()].filter((s) => s.length >= 6 && /\s/.test(s)).sort((a, b) => b.length - a.length);
  return sources;
}

/** The expect(locator) checks of a text (toHaveText and toContainText of one text or a list, accessible names, attribute values such as a placeholder). */
const TEXT_EXPECTS = new Set([
  'to.have.text',
  'to.contain.text',
  'to.have.text.array',
  'to.contain.text.array',
  'to.have.accessible.name',
  'to.have.accessible.description',
  'to.have.accessible.error.message',
  'to.have.attribute.value',
]);

type Fn = (...args: any[]) => any;
interface ExpectedText {
  string?: string;
  regexSource?: string;
  regexFlags?: string;
  matchSubstring?: boolean;
  ignoreCase?: boolean;
  normalizeWhiteSpace?: boolean;
}

/** The Indonesian texts of a whole English text, the English one first. */
function bothLanguages(text: string): string[] {
  return [...new Set([norm(text), ...toId.lookup(text)])];
}

/**
 * A selector string with the texts it names on the site too: an XPath
 * normalize-space()="Save" accepts "Simpan" as well, and :text-is("Party")
 * becomes :text-matches matching either language.
 */
export function selectorOnSite(selector: string): string {
  return selector
    .replace(/normalize-space\(\)="([^"]+)"/g, (whole, text: string) => {
      const all = bothLanguages(text);
      return all.length > 1 ? `(${all.map((t) => `normalize-space()="${t}"`).join(' or ')})` : whole;
    })
    .replace(/:text-is\("([^"]+)"\)/g, (whole, text: string) => {
      const all = bothLanguages(text);
      return all.length > 1 ? `:text-matches("^(?:${all.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')).join('|')})$")` : whole;
    });
}

/** Replaces a text option (name, hasText, hasNotText) by its form on the site. */
function withSiteTexts<T extends Record<string, unknown> | undefined>(options: T, keys: string[], exactKey: string | undefined, sections: string[]): T {
  if (!options) return options;
  const out: Record<string, unknown> = { ...options };
  for (const key of keys) {
    const v = out[key];
    // hasText / hasNotText match a part of an element's text, in either language.
    if (typeof v === 'string') out[key] = exactKey ? onSite(v, out[exactKey] === true, sections) : partOnSite(v, sections);
    else if (v instanceof RegExp) out[key] = regexOnSite(v);
  }
  return out as T;
}

/** A text looked for as a part of an element's text (hasText, toContainText): the English text or any of its Indonesian ones, case-insensitive. */
function partOnSite(text: string, sections: string[] = []): string | RegExp {
  let ids = toId.lookupOn(text, sections, toEn).filter((t) => t !== norm(text));
  // A sentence that is only the start of a longer text of the table ("Moves every selected row to one open
  // time." of a two-sentence note): the Indonesian texts of the texts it begins.
  if (!ids.length && norm(text).length >= 20 && /\p{L}/u.test(text)) {
    const start = norm(text);
    ids = [...toId.exact].filter(([source]) => source !== start && source.startsWith(start)).flatMap(([, targets]) => [...targets.keys()]).slice(0, 8);
  }
  return ids.length ? new RegExp(`(?:${[norm(text), ...ids].map(escape).join('|')})`, 'i') : text;
}

function patch(proto: Record<string, Fn>, name: string, wrap: (original: Fn) => Fn): void {
  const original = proto[name];
  if (typeof original !== 'function' || (original as { __qaI18n?: boolean }).__qaI18n) return;
  const translated = wrap(original);
  const wrapped = function (this: unknown, ...args: unknown[]) {
    return off() ? original.apply(this, args) : translated.apply(this, args);
  };
  (wrapped as { __qaI18n?: boolean }).__qaI18n = true;
  proto[name] = wrapped;
}

/** The sections of the page a Frame or Locator belongs to ([] when it cannot be told, e.g. a FrameLocator). */
function sectionsOfOwner(owner: unknown): string[] {
  try {
    return sectionsOf((owner as { page(): { url(): string } }).page().url());
  } catch {
    return [];
  }
}

/**
 * The roles of form fields. Their labels take the meaning of the page's app
 * ("Amount" is "Nilai" in Fixed assets, where "Jumlah" is "Quantity"); other
 * locators take every Indonesian text, because page objects create them
 * before the page they are used on is open.
 */
const FIELD_ROLES = new Set(['textbox', 'spinbutton', 'combobox', 'searchbox', 'checkbox', 'radio', 'slider']);

function patchLookups(proto: Record<string, Fn>): void {
  patch(proto, 'getByRole', (o) => function (this: unknown, role: string, options?: Record<string, unknown>) {
    return o.call(this, role, withSiteTexts(options, ['name'], 'exact', FIELD_ROLES.has(role) ? sectionsOfOwner(this) : []));
  });
  for (const name of ['getByText', 'getByLabel', 'getByPlaceholder', 'getByTitle']) {
    patch(proto, name, (o) => function (this: unknown, text: string | RegExp, options?: { exact?: boolean }) {
      const sections = name === 'getByLabel' || name === 'getByPlaceholder' ? sectionsOfOwner(this) : [];
      const t = typeof text === 'string' ? onSite(text, options?.exact === true, sections) : regexOnSite(text);
      return o.call(this, t, options);
    });
  }
  patch(proto, 'locator', (o) => function (this: unknown, selector: unknown, options?: Record<string, unknown>) {
    return o.call(this, typeof selector === 'string' ? selectorOnSite(selector) : selector, withSiteTexts(options, ['hasText', 'hasNotText'], undefined, []));
  });
}

/**
 * The language is a preference of each account, and the app moves a page to
 * it after load (U2 rs.admin is saved on English). The preference is read
 * again on every page, so each context of the suite is told "id" when it
 * reads it; the account is not changed.
 */
async function pinSiteLanguage(context: BrowserContext): Promise<void> {
  await context.route('**/api/me/preferences', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    // A read still in flight when the test or its context ends is dropped: the route throws "Test ended" / "closed".
    try {
      const response = await route.fetch();
      const body = (await response.json().catch(() => null)) as { preferences?: { locale?: string } } | null;
      if (!body?.preferences) return await route.fulfill({ response });
      body.preferences.locale = 'id';
      return await route.fulfill({ response, json: body });
    } catch (e) {
      if (/Test ended|closed|disposed/i.test(String(e))) return;
      throw e;
    }
  });
}

let installed = false;

/** Installs the translation on Playwright's Frame, Locator and FrameLocator, and the language pin on new contexts (once per worker). */
export async function installSiteLanguage(browser: Browser): Promise<void> {
  if (installed) return;
  const browserProto = Object.getPrototypeOf(browser) as Record<string, Fn>;
  const newContext = browserProto.newContext;
  if (!(newContext as { __qaI18n?: boolean }).__qaI18n) {
    const pinned = async function (this: Browser, ...args: unknown[]) {
      const context = (await newContext.apply(this, args)) as BrowserContext;
      await pinSiteLanguage(context);
      return context;
    };
    (pinned as { __qaI18n?: boolean }).__qaI18n = true;
    browserProto.newContext = pinned;
  }
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    // After a page reads the account's preferences the app navigates once more (to the same address); a goto that
    // starts meanwhile is aborted (net::ERR_ABORTED). It is waited for and the goto made once more.
    const pageProto = Object.getPrototypeOf(page) as Record<string, Fn>;
    if (!(pageProto.goto as { __qaI18n?: boolean }).__qaI18n) {
      const goto = pageProto.goto;
      const settled = async function (this: { waitForLoadState(s: string, o?: object): Promise<void> }, ...args: unknown[]) {
        try {
          return await goto.apply(this, args);
        } catch (e) {
          if (!/net::ERR_ABORTED|interrupted by another navigation/.test(String(e))) throw e;
          await this.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
          return goto.apply(this, args);
        }
      };
      (settled as { __qaI18n?: boolean }).__qaI18n = true;
      pageProto.goto = settled;
    }
    const frame = Object.getPrototypeOf(page.mainFrame()) as Record<string, Fn>;
    const locator = Object.getPrototypeOf(page.locator('html')) as Record<string, Fn>;
    const frameLocator = Object.getPrototypeOf(page.frameLocator('iframe')) as Record<string, Fn>;
    for (const proto of [frame, locator, frameLocator]) patchLookups(proto);

    patch(locator, 'filter', (o) => function (this: unknown, options?: Record<string, unknown>) {
      return o.call(this, withSiteTexts(options, ['hasText', 'hasNotText'], undefined, []));
    });

    patch(locator, '_expect', (o) => function (this: unknown, expression: string, options: { expectedText?: ExpectedText[] }) {
      if (!TEXT_EXPECTS.has(expression) || !options?.expectedText) return o.call(this, expression, options);
      const sections = sectionsOfOwner(this);
      const expectedText = options.expectedText.map((e) => {
        if (e.string !== undefined) {
          // toContainText: a part of the text in either language; toHaveText: the whole text.
          const t = e.matchSubstring ? partOnSite(e.string, sections) : onSite(e.string, true, sections);
          if (typeof t === 'string') return e;
          return { ...e, string: undefined, regexSource: t.source, regexFlags: e.ignoreCase ? 'i' : t.flags.replace('i', e.matchSubstring ? 'i' : '') };
        }
        if (e.regexSource !== undefined) {
          const re = regexOnSite(new RegExp(e.regexSource, e.regexFlags));
          return { ...e, regexSource: re.source, regexFlags: re.flags };
        }
        return e;
      });
      return o.call(this, expression, { ...options, expectedText });
    });

    patch(locator, 'selectOption', (o) => async function (this: { locator(s: string): { evaluateAll<R>(f: (es: Element[]) => R): Promise<R> } }, values: unknown, options?: unknown) {
      // The labels as the site shows them (read with the translation off).
      const labels = (await asOnSite(() => this.locator('option').evaluateAll((es) => es.map((e) => e.textContent ?? ''))).catch(() => [] as string[])).map(norm);
      const pick = (v: string): string | { label: string } => {
        if (labels.includes(norm(v))) return v;
        const t = onSite(v, true);
        const found = typeof t === 'string' ? undefined : labels.find((l) => t.test(l));
        return found ? { label: found } : v;
      };
      const mapped = typeof values === 'string'
        ? pick(values)
        : Array.isArray(values)
          ? values.map((v) => (typeof v === 'string' ? pick(v) : v))
          : values && typeof values === 'object' && typeof (values as { label?: unknown }).label === 'string'
            ? pick((values as { label: string }).label)
            : values;
      return o.call(this, mapped, options);
    });

    type Read = { page(): { url(): string } };
    const urlOf = (l: unknown): string => (l as Read).page().url();
    patch(locator, 'innerText', (o) => async function (this: unknown, ...args: unknown[]) {
      return fromSite(await o.apply(this, args), urlOf(this));
    });
    patch(locator, 'textContent', (o) => async function (this: unknown, ...args: unknown[]) {
      const t = await o.apply(this, args);
      return t === null ? t : formatsInEnglish(inEnglish(t, sectionsOf(urlOf(this))));
    });
    patch(locator, 'allInnerTexts', (o) => async function (this: unknown, ...args: unknown[]) {
      const url = urlOf(this);
      return ((await o.apply(this, args)) as string[]).map((t) => fromSite(t, url));
    });
    patch(locator, 'allTextContents', (o) => async function (this: unknown, ...args: unknown[]) {
      const sections = sectionsOf(urlOf(this));
      return ((await o.apply(this, args)) as string[]).map((t) => formatsInEnglish(inEnglish(t, sections)));
    });
    // Texts read in the page (cells, labels, values) come back the same way.
    for (const name of ['evaluate', 'evaluateAll']) {
      patch(locator, name, (o) => async function (this: unknown, ...args: unknown[]) {
        return valueFromSite(await o.apply(this, args), urlOf(this));
      });
    }
    installed = true;
  } finally {
    await context.close();
  }
}
