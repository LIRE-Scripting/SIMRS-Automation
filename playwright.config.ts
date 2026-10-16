import { defineConfig, devices } from '@playwright/test';

import { AUTH_MODULES_FILE, authFileOf } from './lib/config';

const AUTH_FILE = '.auth/state.json';

// One id per run for the names of created records (lib/qa-data/names.ts).
// Set here in the main process; the workers inherit it.
process.env.QA_RUN_ID ??= Date.now().toString(36).toUpperCase();

/**
 * Pharmacy module test suite (KlikMed HMIS).
 *
 * Project "setup"    - logs in once and saves the session to AUTH_FILE.
 * Project "pharmacy" - reuses AUTH_FILE (login is encapsulated, never repeated per test).
 *
 * Journeys mutate shared branch state, so they run sequentially in workbook order.
 */
export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://rs.showcase.atklik.xyz/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /tests[\\/]auth[\\/]auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
    {
      name: 'pharmacy',
      testIgnore: /auth\.setup\.ts|modules\.setup\.ts|tests[\\/]modules[\\/]|tests[\\/]e2e[\\/]/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    {
      name: 'modules-setup',
      testMatch: /modules\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
    {
      name: 'flows',
      testMatch: /tests[\\/]flows[\\/].*\.spec\.ts/,
      dependencies: ['modules-setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_MODULES_FILE },
    },
    {
      name: 'suites',
      testMatch: /tests[\\/]suites[\\/].*\.spec\.ts/,
      dependencies: ['modules-setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_MODULES_FILE },
    },
    {
      // Workbook users U1 (rs.admin2, Podomoro) and U2 (rs.admin, All branches).
      name: 'e2e-setup',
      testMatch: /tests[\\/]e2e[\\/]auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
    {
      // Per-module specs generated from reference/*.xlsx (tests/modules/<NN-module>/).
      name: 'e2e-modules',
      testMatch: /tests[\\/]modules[\\/]\d\d-.*\.spec\.ts/,
      dependencies: ['e2e-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFileOf('U1') },
    },
    {
      // End-to-end chains across modules (tests/e2e/chains/); each test picks its user's session.
      name: 'e2e',
      testMatch: /tests[\\/]e2e[\\/].*\.spec\.ts/,
      dependencies: ['e2e-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFileOf('U1') },
    },
  ],
});
