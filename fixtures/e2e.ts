import fs from 'node:fs';
import path from 'node:path';
import { test as base, type Page, type TestInfo } from '@playwright/test';
import { authFileOf, SCREENSHOT_DIR } from '../lib/config';
import { blockers, testCaseRef, type TestCaseRef } from '../lib/qa-data';
import { foundBlocker } from '../lib/qa-data/found-blockers';
import { qaCode, qaName, qaPrefix, uniqueMrn, uniqueToken } from '../lib/qa-data/names';
import { journeyTag, planFor, traceTag, type Plan } from '../lib/qa-data/plan';

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

type Fixtures = { qa: Qa; finalScreenshot: void };

const ANONYMOUS = { cookies: [], origins: [] };

function stepTitle(ref: TestCaseRef, n: number): string {
  const s = ref.testCase.steps.find((x) => x.step === n);
  if (!s) throw new Error(`${ref.testCase.id} has no step ${n}`);
  return `Step ${n} [${ref.module.source} | Steps | row ${s.row}]: ${s.action} → ${s.expected}`;
}

const test = base.extend<Fixtures & { qaId: string }>({
  qaId: ['', { option: true }],

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
        const title = stepTitle(ref, n);
        if (plan.partialSteps.includes(n)) {
          testInfo.annotations.push({
            type: 'partial-expected',
            description: `Step ${n}: Expected Result has "TBD"; only the stated part is asserted (Q8)`,
          });
        }
        return base.step(title, body);
      },
      name: qaName,
      code: qaCode,
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

  finalScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();
      await attachScreenshot(page, testInfo);
    },
    { auto: true },
  ],
});

async function attachScreenshot(page: Page, testInfo: TestInfo): Promise<void> {
  const id = testInfo.title.match(/TC-APP\d{3}-\d{3}/)?.[0] ?? testInfo.title.replace(/\W+/g, '-');
  const file = path.join(SCREENSHOT_DIR, `${id}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  if (fs.existsSync(file)) await testInfo.attach('final screenshot', { path: file, contentType: 'image/png' });
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
    test(title, details, body);
  });
}

export { test };
export { expect } from '@playwright/test';
