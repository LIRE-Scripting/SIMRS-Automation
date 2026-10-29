import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { authFileOf, BASE_URL } from '../../lib/config';

/**
 * Saves the site's text table (the next-intl messages that every page of the
 * app carries in its payload) in English and in Indonesian to
 * lib/i18n/messages-<lang>.json. Read-only: signs in with the saved session
 * of U3 (no rights) and opens one page per language; nothing is clicked or
 * saved. Run after a release that changes texts: npm run qa:messages.
 */

const OUT = path.resolve(__dirname, '../../lib/i18n');
const ROUTE = '/registration/patients';

/** The RSC payload of a page: the strings of its self.__next_f.push([1, "…"]) scripts, joined. */
function payloadOf(html: string): string {
  const parts = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)<\/script>/g)];
  return parts.map((m) => JSON.parse(m[1]) as string).join('');
}

/** The largest object after a "messages" key in the payload. */
function messagesOf(payload: string): Record<string, unknown> {
  let best: Record<string, unknown> | undefined;
  for (const m of payload.matchAll(/"messages":\{/g)) {
    const start = m.index! + m[0].length - 1;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < payload.length; i++) {
      const c = payload[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        const found = JSON.parse(payload.slice(start, i + 1)) as Record<string, unknown>;
        if (!best || JSON.stringify(found).length > JSON.stringify(best).length) best = found;
        break;
      }
    }
  }
  if (!best) throw new Error('no "messages" object in the page payload');
  return best;
}

function countLeaves(o: unknown): number {
  return o && typeof o === 'object' ? Object.values(o).reduce<number>((n, v) => n + countLeaves(v), 0) : 1;
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const lang of ['en', 'id'] as const) {
      const context = await browser.newContext({ storageState: authFileOf('U3') });
      const response = await context.request.get(`${BASE_URL}${lang}${ROUTE}`);
      if (!response.ok()) throw new Error(`${lang}${ROUTE}: HTTP ${response.status()}`);
      const messages = messagesOf(payloadOf(await response.text()));
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, `messages-${lang}.json`), `${JSON.stringify(messages, null, 1)}\n`);
      console.log(`${lang}: ${countLeaves(messages)} texts -> lib/i18n/messages-${lang}.json`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})();
