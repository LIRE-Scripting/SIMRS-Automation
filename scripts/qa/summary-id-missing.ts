/**
 * Lists the English texts of the summary that have no Indonesian yet
 * (scripts/qa/summary-id.ts): every title, reason, blocker fix and module name
 * of reports/summary/run-summary.json. Writes .qa-state/summary-id-missing.json
 * ({ titles: { en: "" }, texts: { en: "" } }); fill the values and merge them
 * into scripts/qa/id/titles.json and texts.json.
 *
 *   npm run qa:run-summary && npm run qa:summary-id-missing
 */
import fs from 'node:fs';
import { CHAIN_NAME_ID } from './chain-names-id';
import { missing, textId, titleId, wordId } from './summary-id';

interface Outcome { kind: string; id: string; title: string; group?: string; reason: string; cause: string }
interface Summary {
  outcomes: Outcome[];
  perBlocker: { fix: string; who: string; category: string; modules: string[] }[];
  perModule: { module: string }[];
}

const s = JSON.parse(fs.readFileSync('reports/summary/run-summary.json', 'utf8')) as Summary;
for (const o of s.outcomes) {
  if (!(o.kind === 'chain' && CHAIN_NAME_ID[o.id])) titleId(o.title);
  textId(o.reason);
  textId(o.cause);
  if (o.group) wordId(o.group);
}
for (const b of s.perBlocker) {
  wordId(b.fix);
  wordId(b.who);
  wordId(b.category);
  b.modules.forEach(wordId);
}
for (const m of s.perModule) wordId(m.module);

const out = {
  titles: Object.fromEntries([...missing.titles].sort().map((t) => [t, ''])),
  texts: Object.fromEntries([...missing.texts].sort().map((t) => [t, ''])),
};
fs.writeFileSync('.qa-state/summary-id-missing.json', `${JSON.stringify(out, null, 1)}\n`);
const chars = (o: Record<string, string>) => Object.keys(o).reduce((a, k) => a + k.length, 0);
console.log(`.qa-state/summary-id-missing.json: ${missing.titles.size} titles (${chars(out.titles)} chars), ${missing.texts.size} texts (${chars(out.texts)} chars) without Indonesian`);
