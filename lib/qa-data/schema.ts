import { z } from 'zod';

/**
 * Schemas of the JSON that scripts/qa/build-test-data.mts writes from the
 * workbooks in reference/. `.strict()` makes a renamed or added key fail
 * loudly instead of being ignored.
 */

const text = z.string().nullable();
const num = z.number().nullable();
const row = z.number().int().positive();

export const UserSchema = z
  .object({
    row,
    key: z.string().regex(/^U\d+$/),
    user: z.string(),
    branch: z.string(),
    rights: z.string(),
    usedFor: z.string(),
    journeys: z.number(),
    applications: z.number(),
    statusOnSite: z.string(),
    prepared: z.string(),
  })
  .strict();

export const PrerequisitesSchema = z
  .object({
    source: z.literal('00-prerequisites.xlsx'),
    users: z.array(UserSchema).min(1),
    roleAccounts: z.array(
      z
        .object({
          row,
          application: z.string(),
          workingRole: z.string(),
          writeRight: z.string(),
          journeys: z.number(),
          branch: z.string(),
          login: text,
          prepared: z.string(),
        })
        .strict(),
    ),
    setup: z.array(
      z
        .object({
          row,
          no: z.number(),
          prerequisite: z.string(),
          applications: z.string(),
          journeys: text,
          why: z.string(),
          whatToPrepare: z.string(),
          who: z.string(),
          status: z.string(),
        })
        .strict(),
    ),
    journeys: z.array(
      z
        .object({
          row,
          journeyId: z.string().regex(/^JRN-APP\d{3}-\d{3}$/),
          application: z.string(),
          name: z.string(),
          userRole: text,
          usersNeeded: z.string(),
          branch: z.enum(['Podomoro', 'All branches', 'Two branches']),
          needsRecordFrom: text,
          preconditions: text,
          startingPoint: text,
        })
        .strict(),
    ),
  })
  .strict();

export const TestDataSchema = z
  .object({
    source: z.literal('00-test-data.xlsx'),
    overview: z.array(z.object({ row, topic: z.union([z.string(), z.number()]).nullable(), rule: z.union([z.string(), z.number()]).nullable() }).strict()),
    catalogue: z.array(
      z
        .object({
          row,
          application: z.string(),
          shortName: z.string(),
          what: z.string(),
          kind: z.string(),
          madeIn: text,
          branch: text,
          journeys: z.number(),
          journeyIds: text,
          siteId: z.union([z.string(), z.number()]).nullable(),
          status: z.string(),
        })
        .strict(),
    ),
    journeys: z.array(
      z
        .object({
          row,
          journeyId: z.string(),
          application: z.string(),
          name: z.string(),
          requiredTestData: text,
          shortNamesUsed: text,
          needsRecordFrom: text,
          dataStatus: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export const BlockersSchema = z
  .object({
    source: z.literal('00-blockers-checklist-linked.xlsx'),
    blockers: z.array(
      z
        .object({
          row,
          done: z.string(),
          no: z.number(),
          blocker: z.string(),
          category: z.string(),
          scope: z.string(),
          journeys: z.string(),
          cause: z.string(),
          fix: z.string(),
          who: z.string(),
          howFound: z.string(),
        })
        .strict(),
    ),
    links: z.array(
      z
        .object({
          row,
          blockerNo: z.number(),
          blocker: z.string(),
          category: z.string(),
          application: z.string(),
          journeyId: z.string(),
          name: z.string(),
          startingPoint: text,
          verificationStatus: text,
          journeyStatus: text,
          workbook: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

const Priority = z.enum(['Critical', 'High', 'Medium', 'Low']);
const AutomationCandidate = z.enum(['Yes', 'No', 'Needs Evaluation']);

export const JourneySchema = z
  .object({
    row,
    id: z.string().regex(/^JRN-APP\d{3}-\d{3}$/),
    appId: z.string(),
    appName: z.string(),
    feature: z.string(),
    name: z.string(),
    objective: text,
    userRole: text,
    preconditions: text,
    startingPoint: text,
    steps: text,
    expectedOutcome: text,
    observedOutcome: text,
    alternativePaths: text,
    failureScenarios: text,
    dependencies: text,
    priority: Priority,
    automationCandidate: AutomationCandidate,
    verificationStatus: z.string(),
    evidence: text,
    status: z.string(),
    validationNotes: text,
    requiredTestData: text,
    apiOperations: text,
    earlierId: text,
  })
  .strict();

export const StepSchema = z
  .object({
    row,
    step: z.number().int().positive(),
    action: z.string(),
    expected: z.string(),
    observed: text,
    automationCandidate: text,
    verificationStatus: text,
    executionStatus: text,
    actualResult: text,
    evidence: text,
    defect: text,
  })
  .strict();

export const TestCaseSchema = z
  .object({
    id: z.string().regex(/^TC-APP\d{3}-\d{3}$/),
    rows: z.tuple([row, row]),
    journeyId: z.string(),
    appName: z.string(),
    feature: z.string(),
    scenario: z.string(),
    objective: text,
    testType: z.enum(['Positive', 'Negative', 'Boundary', 'Security', 'Integration', 'Regression', 'Other']),
    priority: Priority,
    preconditions: text,
    testData: text,
    finalState: text,
    dependencies: text,
    cleanup: text,
    steps: z.array(StepSchema).min(1),
  })
  .strict();

export const ModuleSchema = z
  .object({
    source: z.string().regex(/^\d{2}-[a-z-]+\.xlsx$/),
    slug: z.string(),
    appId: z.string(),
    appName: z.string(),
    summary: z.record(z.string(), z.union([z.string(), z.number()]).nullable()),
    shortNames: z.array(z.object({ name: z.union([z.string(), z.number()]).nullable(), what: text, row }).strict()),
    journeys: z.array(JourneySchema).min(1),
    testCases: z.array(TestCaseSchema).min(1),
  })
  .strict();

export const IndexSchema = z
  .object({
    modules: z.array(z.string()).min(1),
    totals: z.object({ journeys: z.number(), testCases: z.number(), steps: z.number() }).strict(),
  })
  .strict();

export type User = z.infer<typeof UserSchema>;
export type Prerequisites = z.infer<typeof PrerequisitesSchema>;
export type TestData = z.infer<typeof TestDataSchema>;
export type Blockers = z.infer<typeof BlockersSchema>;
export type Journey = z.infer<typeof JourneySchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Module = z.infer<typeof ModuleSchema>;
