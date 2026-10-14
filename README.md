# KlikMed HMIS — Playwright Test Suite

Suites in one project:

- **Pharmacy** (`tests/pharmacy/`) — generated from `pharmacy-test-journeys-QA.xlsx`
  (50 journeys / 213 steps, kept verbatim in `data/journeys.json`). Runs as
  `klikmed.superadmin`.
- **Registration** (`tests/registration/`) — patient search & registration E2E.
- **Flows** (`tests/flows/`) — per-module feature E2E (2 per module).
- **Suites** (`tests/suites/`) — pharmacy-style journeys per module
  (`data/module-journeys/*.json`, workbook `module-journeys-QA.xlsx`). Runs as `rs.admin`.

## How it works

- **Login once, encapsulated.** The `setup` project (`tests/auth/auth.setup.ts`) signs in
  with `klikmed.superadmin` and saves the session to `.auth/state.json`. Every pharmacy test
  reuses it through `storageState` — no test ever logs in again. If staging drops the session
  mid-run, the pages re-authenticate transparently.
- **Redirect fallback.** On this environment the sign-in button sometimes does nothing
  (the page stays on `/login` even though the session was created). When that happens the
  login helper redirects to `https://rs.showcase.atklik.xyz/` itself.
- **Screenshot at the end.** An auto fixture takes a full-page screenshot after every test
  (pass or fail) into `screenshots/`, and attaches it to the report.
- **Sequential journeys.** Journeys share branch state (stock, invoices), so they run in
  workbook order with one worker.

## Run

```bash
npm install
npx playwright install chromium
npm test                # setup (login) + all pharmacy journeys
npm run test:modules    # login rs.admin (shared setup for module suites)
npm run test:suites     # pharmacy-style journeys per module
```

Useful variants:

```bash
npm run setup                 # login only, refresh .auth/state.json
npm run test:headed           # watch the browser
npx playwright test --grep "PHA-JRN-001"   # a single journey
npm run report                # open the HTML report
```

Credentials and URL can be overridden with env vars: `BASE_URL`, `KLIKMED_USERNAME`,
`KLIKMED_PASSWORD`.

## Layout

```
playwright.config.ts      projects: setup -> pharmacy (storageState)
data/journeys.json        all 50 journeys + 213 steps from the workbook
lib/config.ts             base URL, credentials, output paths
lib/journeys.ts           typed loader for the workbook data
lib/auth.ts               ensureSignedIn() - transparent re-login guard
pages/                    AppHeader, LoginPage, PharmacyHubPage, OrdersPage,
                          DispensePage, IssueLinesPage
fixtures/pharmacy.ts      page objects + end-of-test screenshot fixture
tests/auth/               the single encapsulated login
tests/pharmacy/           one spec per 10 journeys (PHA-JRN-001..050)
screenshots/              end-of-test screenshots
```

## Notes on the journeys

Steps that depend on seeded branch data (patients `QA-PHA …`, orders `OR-…`, items `QA-PARA`
…) are guarded: when the data is not present in the environment the journey is **skipped**
with an explicit reason instead of failing noisily. Structural checks (screens, wizard
steps, tables, search behaviour, toasts) always run.
