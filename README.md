# KlikMed HMIS — Playwright test suite

End-to-end tests for the KlikMed HMIS (`https://rs.showcase.atklik.xyz/`). The
workbooks in `reference/` are the source of truth; they are read, never edited.

## Layout

```
fixtures/
  e2e.ts            qaTest(): one workbook test case (title, tags, session, fixme/skip, steps)
  chain.ts          chainTest(): one end-to-end chain (records handed on, stops at a blocker)
lib/                workbook data (lib/qa-data), shared data, dates, assertions
pages/              page objects, one file per application
tests/
  auth/             login for the legacy suites (klikmed.superadmin)
  e2e/              end-to-end chains across modules (50 chains)
    auth.setup.ts   login of U1 and U2 for the workbook tests
    chains/         one spec per chain; steps/ holds the shared chain steps
  modules/          per-module workbook tests, one folder per module (01 … 27)
    shared/         helpers used by several modules
  pharmacy/ flows/ suites/   legacy suites (see below)
scripts/qa/         generators for the docs and the result workbooks
docs/qa/            test inventory, traceability per module, open questions
reports/            generated result workbooks (reports/e2e, reports/e2e-chains)
```

Per-module specs: `tests/modules/<NN-module>/<feature>.spec.ts`, one `qaTest('TC-APP…')`
per test case. Each module folder has `cases.ts` where a test case is shared with a chain,
and `not-automated.spec.ts`, which declares the fixme and skip cases of the module.

## Projects

| Project | Specs | Session |
|---|---|---|
| `e2e-setup` | `tests/e2e/auth.setup.ts` | signs in U1 and U2 |
| `e2e-modules` | `tests/modules/**` | U1 (per test: U2 when the workbook needs it) |
| `e2e` | `tests/e2e/chains/**` | U1 |
| `setup`, `pharmacy` | `tests/auth/`, `tests/pharmacy/` | `klikmed.superadmin` (legacy) |
| `modules-setup`, `flows`, `suites` | `tests/flows/`, `tests/suites/` | `MODULES_USERNAME` (legacy) |

Users: U1 `rs.admin2` (Podomoro), U2 `rs.admin` (All branches). Passwords come from `.env`
(`QA_PASSWORD`); never hard-code them.

## Commands

```bash
cp .env.example .env              # set QA_PASSWORD
npm run qa:data                   # reference/*.xlsx -> test-data (fails on changed columns)
npm run qa:inventory              # docs/qa: inventory, traceability per module, open questions

npm run test:e2e-modules          # per-module workbook tests
npm run test:e2e                  # end-to-end chains
QA_ALLOW_WRITES=1 npm run test:e2e-modules   # also the cases that save data (needs a go-ahead)
npx playwright test --project=e2e-modules --grep @smoke

# result workbooks (one JSON report per run; every reports/e2e/results*.json is read)
PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e/results-02-appointment.json \
  npx playwright test --project=e2e-modules tests/modules/02-appointment/ --reporter=list,json
npm run qa:e2e-workbook           # -> reports/e2e/<NN-module>.xlsx

PLAYWRIGHT_JSON_OUTPUT_NAME=reports/e2e-chains/results-chains.json \
  npx playwright test --project=e2e tests/e2e/chains/ --reporter=list,json
npm run qa:e2e-chains             # -> reports/e2e-chains/e2e-journeys.xlsx

npm run typecheck
```

Run the chains with `--workers=1`. A chain shares the records of its run, and E2E-033 closes
the U1 cashier day until 07:00 WIB the next day, so it runs last.

## Conventions

- Test titles carry the traceability tag `[<workbook> | <sheet> | row n | <case id>]`.
- Locators by role, label or test id; no `waitForTimeout`; no `force: true` without a comment.
- Records made by a test carry the `QA-` prefix and a token, so they are unique per run.
- A step the site does not match is recorded with `qa.deviation(...)`; a step a blocker stops
  is `qa.blocked(step, n)` (blocker list: `docs/qa/blockers-found.md`); the workbook's open
  points are in `docs/qa/open-questions.md`.
- Healthcare data: only the synthetic data of the workbooks; no real patient identifiers in
  specs, reports or console output.

## Legacy suites

`tests/pharmacy/`, `tests/flows/` and `tests/suites/` are the earlier suites, generated from
the pharmacy and module journey workbooks. They are kept until their cases are covered by
`tests/modules/` and `tests/e2e/chains/`; then they can be removed.
