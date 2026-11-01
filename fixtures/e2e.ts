import fs from 'node:fs';
import path from 'node:path';
import { test as base, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { authFileOf, SCREENSHOT_DIR } from '../lib/config';
import { installSiteLanguage } from '../lib/i18n';
import { blockers, testCaseRef, type TestCaseRef } from '../lib/qa-data';
import { foundBlocker } from '../lib/qa-data/found-blockers';
import { firstCode, qaCode, qaName, qaPrefix, uniqueMrn, uniqueToken } from '../lib/qa-data/names';
import { journeyTag, planFor, traceTag, type Plan } from '../lib/qa-data/plan';
import { NotOffered } from '../lib/not-offered';

/**
 * Workbook-driven tests. A spec names a test case id; everything else comes
 * from the workbook data (title with traceability tag, tags, user session,
 * fixme/skip reasons, step texts):
 *
 *   qaTest('TC-APP001-003', async ({ page, qa }) => {
 *     await qa.step(1, async () => { ... assertions from Expected Result ... });
 *   });
 */

export interface Qa {
  ref: TestCaseRef;
  plan: Plan;
  /** Runs Excel step n as a test.step titled with its Action and Expected Result. */
  step<T>(n: number, body: () => Promise<T>): Promise<T>;
  /** Name for a record this test creates: "QA-" prefix plus the run id. */
  name(excelName: string): string;
  /** A code ("X-01" in the workbook) with the prefix and a new token: "QA-01-<token>". */
  code(excelValue: string): string;
  /** A bed number (workbook "QA-101") that sorts before the earlier test beds (lib/qa-data/names.ts firstCode). */
  bed(excelValue: string): string;
  /** Only the "QA-" prefix rule, for fields that cannot take a token. */
  prefix(excelName: string): string;
  /** A new token for every call (run id + counter): makes each saved value unique. */
  token(): string;
  /** A new MRN in the workbook's pattern MRN-YYYY-XXXXXXXX. */
  mrn(): string;
  /**
   * C2: the live site differs from the Expected Result. The test asserts what
   * the site does and records the workbook text next to it.
   */
  deviation(step: number, excelExpected: string, onSite: string): void;
  /** A step (or part of it) that cannot be run yet, with the reason. Never counted as passed. */
  notRun(step: number, reason: string): void;
  /**
   * A step stopped by a blocker: a checklist blocker (1-16) or one found while
   * automating (lib/qa-data/found-blockers.ts, which must list this test case and step).
   * Never counted as passed.
   */
  blocked(step: number, blockerNo: number): void;
  /** A remark on how a step was run, e.g. a precondition the shared site cannot guarantee. */
  note(step: number, text: string): void;
}

type Fixtures = { qa: Qa; finalScreenshot: void; serverErrors: void };

/** Every HTTP 5xx answer of the site, one JSON line each (method, URL, request body, digest), for the run report. */
const SERVER_ERRORS = process.env.QA_SERVER_ERRORS ?? '.qa-state/http-5xx.jsonl';

const ANONYMOUS = { cookies: [], origins: [] };

function stepTitle(ref: TestCaseRef, n: number): string {
  const s = ref.testCase.steps.find((x) => x.step === n);
  if (!s) throw new Error(`${ref.testCase.id} has no step ${n}`);
  return `Step ${n} [${ref.module.source} | Steps | row ${s.row}]: ${s.action} → ${s.expected}`;
}

const test = base.extend<Fixtures & { qaId: string }, { siteLanguage: void }>({
  qaId: ['', { option: true }],

  // The site runs in Indonesian (/id/...); the specs keep the English texts of the reference (lib/i18n).
  siteLanguage: [
    async ({ browser }, use) => {
      await installSiteLanguage(browser);
      await use();
    },
    { scope: 'worker', auto: true },
  ],

  qa: async ({ qaId }, use, testInfo) => {
    const ref = testCaseRef(qaId);
    const plan = planFor(ref);
    testInfo.attach('workbook-test-case.json', {
      body: JSON.stringify({ journey: ref.journey, testCase: ref.testCase, needs: ref.needs, plan }, null, 2),
      contentType: 'application/json',
    });
    await use({
      ref,
      plan,
      step: (n, body) => {
        const at = testInfo as { qaStep?: number; qaInStep?: boolean; qaFailed?: number };
        at.qaStep = n;
        at.qaInStep = true;
        const title = stepTitle(ref, n);
        if (plan.partialSteps.includes(n)) {
          testInfo.annotations.push({
            type: 'partial-expected',
            description: `Step ${n}: Expected Result has "TBD"; only the stated part is asserted (Q8)`,
          });
        }
        return base
          .step(title, body)
          .catch((e: unknown) => {
            at.qaFailed ??= n;
            throw e;
          })
          .finally(() => (at.qaInStep = false));
      },
      name: qaName,
      code: qaCode,
      bed: firstCode,
      prefix: qaPrefix,
      token: uniqueToken,
      mrn: () => uniqueMrn(),
      deviation: (step, excelExpected, onSite) => {
        testInfo.annotations.push({
          type: 'deviation',
          description: `Step ${step}: Excel expects "${excelExpected}"; the site: ${onSite}`,
        });
      },
      notRun: (step, reason) => {
        testInfo.annotations.push({ type: 'not-run', description: `Step ${step}: ${reason}` });
      },
      note: (step, text) => {
        testInfo.annotations.push({ type: 'note', description: `Step ${step}: ${text}` });
      },
      blocked: (step, blockerNo) => {
        // Checklist blockers (1-16, 00-blockers-checklist-linked.xlsx) may stop steps of journeys the checklist
        // does not link (a precondition made on a blocked screen); found blockers must list the step.
        const listed = blockers().blockers.find((b) => b.no === blockerNo);
        if (listed) {
          testInfo.annotations.push({
            type: 'blocker',
            description: `Step ${step}: blocker ${blockerNo} (00-blockers-checklist-linked.xlsx | Checklist | row ${listed.row}): ${listed.blocker}`,
          });
          return;
        }
        const b = foundBlocker(blockerNo);
        if (!b.testCases.some((t) => t.id === ref.testCase.id && t.steps?.includes(step))) {
          throw new Error(`Blocker ${blockerNo} does not list ${ref.testCase.id} step ${step}`);
        }
        testInfo.annotations.push({
          type: 'blocker',
          description: `Step ${step}: blocker ${blockerNo} (found by automation, docs/qa/blockers-found.md): ${b.blocker}`,
        });
      },
    });
  },

  serverErrors: [
    async ({ context }, use, testInfo) => {
      const seen: Promise<void>[] = [];
      context.on('response', (res) => {
        if (res.status() < 500) return;
        seen.push((async () => {
          const req = res.request();
          // A streamed answer may never end: its body is read for 10 s at most.
          const body = await Promise.race([res.text().catch(() => ''), new Promise<string>((r) => setTimeout(() => r(''), 10_000))]);
          const entry = {
            at: new Date().toISOString(),
            test: testInfo.title,
            status: res.status(),
            method: req.method(),
            url: res.url(),
            action: req.headers()['next-action'],
            request: (req.postData() ?? '').slice(0, 2000),
            digest: body.match(/"digest":"?([\w-]+)/)?.[1],
            response: body.slice(0, 500),
          };
          fs.mkdirSync(path.dirname(SERVER_ERRORS), { recursive: true });
          fs.appendFileSync(SERVER_ERRORS, `${JSON.stringify(entry)}\n`);
          testInfo.annotations.push({ type: 'http-5xx', description: `${entry.status} ${entry.method} ${new URL(entry.url).pathname}${entry.digest ? ` digest ${entry.digest}` : ''}` });
        })());
      });
      await use();
      await Promise.race([Promise.all(seen), new Promise((r) => setTimeout(r, 15_000))]);
    },
    { auto: true },
  ],

  // The evidence picture of the test: the page it worked on last, taken when its body ends (before afterEach hooks
  // move the page, e.g. backToIndonesian), or as late as possible when the body never ends (a timeout).
  finalScreenshot: [
    async ({ page, browser }, use, testInfo) => {
      const ev = startEvidence(page, browser, testInfo);
      try {
        await use();
      } finally {
        delete (browser as unknown as Record<string, unknown>).newContext;
      }
      await finishEvidence(testInfo);
    },
    { auto: true },
  ],
});

/** The pages a test opened, with the time each last loaded an address (0: never, still about:blank). */
interface Evidence {
  file: string;
  pages: { page: Page; at: number }[];
  /** The time of the page saved last (a page of a context the test closed). */
  savedAt: number;
  done: boolean;
}
const EVIDENCE = new WeakMap<TestInfo, Evidence>();

function startEvidence(page: Page, browser: Browser, testInfo: TestInfo): Evidence {
  // A module test case is named by its id (TC-APP001-003), a chain by its id (E2E-003).
  const id = testInfo.title.match(/TC-APP\d{3}-\d{3}|^E2E-\d{3}/)?.[0] ?? testInfo.title.replace(/\W+/g, '-');
  const ev: Evidence = { file: path.join(SCREENSHOT_DIR, `${id}.png`), pages: [], savedAt: 0, done: false };
  const track = (p: Page) => {
    const entry = { page: p, at: 0 };
    ev.pages.push(entry);
    p.on('framenavigated', (frame) => {
      if (frame === p.mainFrame() && p.url() !== 'about:blank') entry.at = Date.now();
    });
  };
  const watch = (context: BrowserContext) => {
    context.on('page', track);
    // A test that works as another user (U2, U3, signed out) closes that context in the end: its last page is saved first.
    const close = context.close.bind(context);
    context.close = async (...args: Parameters<BrowserContext['close']>) => {
      if (!ev.done) await saveLatest(ev, context.pages()).catch(() => {});
      return close(...args);
    };
  };
  track(page);
  page.context().on('page', (p) => p !== page && track(p));
  // The language pin (lib/i18n) sits on the prototype; this per-test wrapper is removed after the test.
  const newContext = browser.newContext.bind(browser);
  (browser as unknown as Record<string, unknown>).newContext = async (...args: Parameters<Browser['newContext']>) => {
    const context = await newContext(...args);
    watch(context);
    return context;
  };
  EVIDENCE.set(testInfo, ev);
  return ev;
}

/** Saves the page that loaded an address last, when it is one of `among` (or any open page). */
async function saveLatest(ev: Evidence, among?: Page[]): Promise<boolean> {
  const open = ev.pages.filter((e) => e.at > 0 && !e.page.isClosed());
  const latest = open.sort((a, b) => b.at - a.at)[0];
  if (!latest || (among && !among.includes(latest.page)) || latest.at < ev.savedAt) return false;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await latest.page.screenshot({ path: ev.file, fullPage: true, timeout: 15_000 });
  ev.savedAt = latest.at;
  return true;
}

/** The final picture of the test: once, at the end of its body (qaTest) or in the fixture's teardown. */
async function finishEvidence(testInfo: TestInfo): Promise<void> {
  const ev = EVIDENCE.get(testInfo);
  if (!ev || ev.done) return;
  ev.done = true;
  const saved = (await saveLatest(ev).catch(() => false)) || ev.savedAt > 0;
  // A test that never opened a page (blocked before its first screen) keeps no picture: no blank one, no stale one
  // of an earlier run. The summary then shows its starting screen (reports/screenshots/blocked).
  if (!saved) fs.rmSync(ev.file, { force: true });
  else if (fs.existsSync(ev.file)) await testInfo.attach('final screenshot', { path: ev.file, contentType: 'image/png' });
}

type Body = Parameters<typeof test>[2];

/**
 * Declares the test of one workbook test case. Runs as the journey's user
 * (U1 Podomoro / U2 All branches, or signed out), and is declared as fixme
 * or skip when the workbook data says so.
 */
export function qaTest(id: string, body: Body): void {
  const ref = testCaseRef(id);
  const plan = planFor(ref);
  const title = `${id} ${ref.testCase.scenario} ${traceTag(ref)}`;
  const annotation = [
    { type: 'journey', description: journeyTag(ref) },
    { type: 'user', description: `${plan.user ?? 'not signed in'} (${plan.branch})` },
    ...(plan.needsRecordFrom ? [{ type: 'needs-record-from', description: plan.needsRecordFrom }] : []),
    ...plan.reasons.map((r) => ({ type: plan.disposition, description: r })),
  ];
  const details = { tag: plan.tags, annotation };

  test.describe(() => {
    test.use({ qaId: id, storageState: plan.user ? authFileOf(plan.user) : ANONYMOUS });

    if (plan.disposition === 'skip') return test.skip(title, details, body);
    if (plan.disposition === 'fixme') return test.fixme(title, details, body);
    if (!plan.readOnly && process.env.QA_ALLOW_WRITES !== '1') {
      annotation.push({
        type: 'skip',
        description: 'Saves data on the shared site; set QA_ALLOW_WRITES=1 once there is a go-ahead (Q1, 00-prerequisites.xlsx | Set-up and data | row 5)',
      });
      return test.skip(title, details, body);
    }
    test(title, details, notOfferedIsBlocked(id, body));
  });
}

/**
 * A picker that does not offer a record of the test (NotOffered: it filters
 * only the first 50 records it loaded) stops the step it happened in and
 * the steps after it: they are blocked by found blocker 40 (or the blocker
 * the NotOffered names) when its list names them for the test case, else
 * the error stands.
 */
function notOfferedIsBlocked(id: string, body: Body): Body {
  const wrapped = async (args: Parameters<Body>[0], testInfo: Parameters<Body>[1]) => {
    try {
      try {
        await (body as (a: unknown, t: unknown) => Promise<void>)(args, testInfo);
      } finally {
        // The picture is taken before afterEach hooks run (they may leave the screen, e.g. backToIndonesian).
        await finishEvidence(testInfo as TestInfo);
      }
    } catch (e) {
      if (!(e instanceof NotOffered)) throw e;
      // Inside a step that step; between steps (a precondition of the next ones) the next step.
      const at = testInfo as { qaStep?: number; qaInStep?: boolean; qaFailed?: number };
      const from = at.qaFailed ?? (at.qaInStep ? (at.qaStep ?? 1) : (at.qaStep ?? 0) + 1);
      const listed = foundBlocker(e.blocker).testCases.find((t) => t.id === id)?.steps?.filter((st) => st >= from) ?? [];
      if (!listed.includes(from)) throw e;
      const qa = (args as { qa: Qa }).qa;
      qa.note(from, e.message);
      for (const st of listed) qa.blocked(st, e.blocker);
    }
  };
  // Playwright reads the fixtures a test asks for from the text of its function: the wrapper asks for the body's.
  wrapped.toString = () => (body as () => void).toString();
  return wrapped as unknown as Body;
}

export { test };
export { expect } from '@playwright/test';
