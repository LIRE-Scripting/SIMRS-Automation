import { NotOffered } from '../lib/not-offered';
import { test as base } from '@playwright/test';
import { authFileOf } from '../lib/config';
import { blockers, prerequisites, testCaseRef } from '../lib/qa-data';
import { CHAINS, type Chain } from '../lib/qa-data/e2e-chains';
import { foundBlocker } from '../lib/qa-data/found-blockers';
import { firstCode, qaCode, qaName, qaPrefix, uniqueMrn, uniqueToken } from '../lib/qa-data/names';
import { planFor, traceTag } from '../lib/qa-data/plan';
import { test as e2e, type Qa } from './e2e';

/**
 * End-to-end chains (lib/qa-data/e2e-chains.ts, workbook
 * reports/e2e-chains/e2e-journeys.xlsx): one test per chain, the records of
 * each step handed on to the next. A chain step runs (part of) a module test
 * case; inside it, `qa` is that test case's Qa, so its steps carry the same
 * titles and traceability as in the module specs:
 *
 *   chainTest('E2E-003', async ({ page, chain }) => {
 *     const study = await chain.step(1, async (qa) => { await qa.step(1, ...); return name; });
 *     await chain.step(2, async (qa) => { ... study ... });
 *     chain.stop(3, 'Blocker 14');   // steps 3 … end are Blocked, the chain ends here
 *   });
 *
 * Annotations carry "Step <chain step>: …"; npm run qa:e2e-chains turns them
 * into the result columns of sheet Steps.
 */

export interface ChainRun {
  chain: Chain;
  /**
   * Runs chain step k (its source test case) as a test.step; `qa` is the source
   * test case's Qa. Once the chain has stopped, the step is not run (it returns undefined).
   */
  step<T>(k: number, body: (qa: Qa) => Promise<T>): Promise<T>;
  /**
   * The chain cannot go on from step k: steps k … end are Blocked by `cause`
   * ("Blocker N", "User Ux" or "NEEDS-EVALUATION"; checked against the
   * blocker lists, the users and the journey of the step).
   */
  stop(k: number, cause: string, detail?: string): void;
  /**
   * The source test case of step k cannot run as planned from its workbook
   * (lib/qa-data/plan.ts: a blocker, a missing user or "Needs Evaluation"):
   * the chain stops there with the first reason as its cause.
   */
  stopAsPlanned(k: number): void;
  /** A remark on chain step k. */
  note(k: number, text: string): void;
}

/** Sheet rows of a chain in e2e-journeys.xlsx (built in the order of CHAINS). */
export function chainRows(id: string): { journey: number; steps: [number, number] } {
  const i = CHAINS.findIndex((c) => c.id === id);
  if (i < 0) throw new Error(`${id} is not in lib/qa-data/e2e-chains.ts`);
  const before = CHAINS.slice(0, i).reduce((a, c) => a + c.steps.length, 0);
  return { journey: i + 2, steps: [before + 2, before + 1 + CHAINS[i].steps.length] };
}

export const chainTag = (id: string) => {
  const r = chainRows(id);
  return `[e2e-journeys.xlsx | Steps | rows ${r.steps[0]}-${r.steps[1]} | TC-${id}]`;
};

function checkCause(chain: Chain, k: number, cause: string): string {
  const tc = chain.steps[k - 1]?.tc;
  if (!tc) throw new Error(`${chain.id} has no step ${k}`);
  const n = Number(cause.match(/^Blocker (\d+)$/)?.[1]);
  if (n) {
    const listed = blockers().blockers.find((b) => b.no === n);
    if (listed) return `blocker ${n} (00-blockers-checklist-linked.xlsx | Checklist | row ${listed.row}): ${listed.blocker}`;
    const f = foundBlocker(n);
    if (!f.testCases.some((t) => t.id === tc)) throw new Error(`Blocker ${n} does not list ${tc} (${chain.id} step ${k})`);
    return `blocker ${n} (found by automation, docs/qa/blockers-found.md): ${f.blocker}`;
  }
  const user = cause.match(/^User (U\d+)$/)?.[1];
  if (user) {
    const u = prerequisites().users.find((x) => x.key === user);
    if (!u || u.prepared === 'Done') throw new Error(`${cause} is not a missing user of 00-prerequisites.xlsx`);
    return `needs user ${user} "${u.user}" (00-prerequisites.xlsx | Users | row ${u.row}: ${u.statusOnSite})`;
  }
  if (cause === 'NEEDS-EVALUATION') {
    const ref = testCaseRef(tc);
    if (ref.journey.automationCandidate !== 'Needs Evaluation') throw new Error(`${tc} is not marked Needs Evaluation`);
    return `${ref.module.source} | Journeys | row ${ref.journey.row}: Automation Candidate = Needs Evaluation`;
  }
  if (cause === 'NOT-AUTOMATED') {
    const ref = testCaseRef(tc);
    if (ref.journey.automationCandidate !== 'No') throw new Error(`${tc} is not marked Automation Candidate = No`);
    return `${ref.module.source} | Journeys | row ${ref.journey.row}: Automation Candidate = No`;
  }
  throw new Error(`Unknown chain stop cause "${cause}"`);
}

const test = e2e.extend<{ chain: ChainRun; chainId: string }>({
  chainId: ['', { option: true }],

  chain: async ({ chainId }, use, testInfo) => {
    const chain = CHAINS.find((c) => c.id === chainId)!;
    const note = (type: string, k: number, text: string) => testInfo.annotations.push({ type, description: `Step ${k}: ${text}` });
    let stoppedAt = 0;

    const qaOf = (k: number): Qa => {
      const cs = chain.steps[k - 1];
      const ref = testCaseRef(cs.tc);
      const prefix = (n: number) => `${cs.tc} step ${n}`;
      return {
        ref,
        plan: planFor(ref),
        step: (n, body) => {
          if (cs.steps && !cs.steps.includes(n)) throw new Error(`${chain.id} step ${k} uses only steps ${cs.steps.join(', ')} of ${cs.tc}`);
          const s = ref.testCase.steps.find((x) => x.step === n);
          if (!s) throw new Error(`${cs.tc} has no step ${n}`);
          return base.step(`Step ${n} [${ref.module.source} | Steps | row ${s.row}]: ${s.action} → ${s.expected}`, body);
        },
        name: qaName,
        code: qaCode,
        bed: firstCode,
        prefix: qaPrefix,
        token: uniqueToken,
        mrn: () => uniqueMrn(),
        deviation: (n, excelExpected, onSite) => note('deviation', k, `${prefix(n)}: Excel expects "${excelExpected}"; the site: ${onSite}`),
        note: (n, text) => note('note', k, `${prefix(n)}: ${text}`),
        notRun: (n, reason) => {
          // A step of the source test case that cannot be run stops the chain here.
          stoppedAt ||= k;
          note('chain-stop', k, `STEP-NOT-RUN: ${prefix(n)} is not run: ${reason}`);
        },
        blocked: (n, no) => {
          stoppedAt ||= k;
          note('chain-stop', k, `Blocker ${no}: ${prefix(n)}, ${checkCause(chain, k, `Blocker ${no}`)}`);
        },
      };
    };

    await use({
      chain,
      step: async (k, body) => {
        // Steps after a stop are not run: the workbook reports them Blocked by the cause of the stop.
        if (stoppedAt) return undefined as never;
        const cs = chain.steps[k - 1];
        if (!cs) throw new Error(`${chain.id} has no step ${k}`);
        return base.step(`Chain step ${k} ${traceTag(testCaseRef(cs.tc))}: ${cs.role}`, async () => {
          try {
            return await body(qaOf(k));
          } catch (e) {
            // A record no list or picker offers (found blocker 40, or the one the NotOffered names) stops the chain here, as it blocks the module test.
            if (!(e instanceof NotOffered)) throw e;
            stoppedAt ||= k;
            note('chain-stop', k, `Blocker ${e.blocker}: ${cs.tc}, ${checkCause(chain, k, `Blocker ${e.blocker}`)}. ${e.message}`);
            return undefined as never;
          }
        });
      },
      stop: (k, cause, detail) => {
        stoppedAt ||= k;
        note('chain-stop', k, `${cause}: ${checkCause(chain, k, cause)}${detail ? `. ${detail}` : ''}`);
      },
      stopAsPlanned: (k) => {
        const tc = chain.steps[k - 1]?.tc;
        if (!tc) throw new Error(`${chain.id} has no step ${k}`);
        // A chain already stopped by a blocker of an earlier step does not reach this one.
        if (stoppedAt) return;
        const plan = planFor(testCaseRef(tc));
        if (plan.disposition === 'automate') throw new Error(`${tc} is planned to run; stop the chain with its blocked step instead`);
        const causes = plan.reasons.map((r) =>
          r.match(/^Blocker \d+/)?.[0] ??
            (r.match(/^Needs user (U\d+)/) ? `User ${r.match(/^Needs user (U\d+)/)![1]}` : /Needs Evaluation/.test(r) ? 'NEEDS-EVALUATION' : /Automation Candidate = No\b/.test(r) ? 'NOT-AUTOMATED' : r),
        );
        stoppedAt ||= k;
        note('chain-stop', k, `${causes[0]}: ${checkCause(chain, k, causes[0])}${causes.length > 1 ? `. Also: ${plan.reasons.slice(1).join('; ')}` : ''}`);
      },
      note: (k, text) => note('note', k, text),
    });
  },
});

/** Declares the test of one chain, run as U1 (Podomoro) unless a step asks for another session. */
export function chainTest(id: string, body: Parameters<typeof test>[2]): void {
  const chain = CHAINS.find((c) => c.id === id);
  if (!chain) throw new Error(`${id} is not in lib/qa-data/e2e-chains.ts`);
  const title = `${id} ${chain.name} ${chainTag(id)}`;
  const details = {
    tag: ['@e2e-chain', `@${chain.priority.toLowerCase()}`, ...new Set(chain.steps.map((s) => `@${testCaseRef(s.tc).module.slug}`))],
    annotation: [{ type: 'chain', description: `${chain.steps.length} steps: ${chain.steps.map((s) => s.tc).join(' → ')}` }],
  };
  test.describe(() => {
    test.use({ chainId: id, storageState: authFileOf('U1'), actionTimeout: 15_000 });
    // A chain runs several test cases in a row: two minutes for the set-up, one and a half for each step.
    test.describe.configure({ timeout: 120_000 + chain.steps.length * 90_000 });
    if (process.env.QA_ALLOW_WRITES !== '1') {
      return test.skip(title, details, body);
    }
    test(title, details, body);
  });
}

export { expect } from '@playwright/test';
export type { Qa };
