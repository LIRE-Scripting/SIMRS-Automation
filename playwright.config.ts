import { defineConfig, devices } from '@playwright/test';

import { authFileOf } from './lib/config';

// One id per run for the names of created records (lib/qa-data/names.ts).
// Set here in the main process; the workers inherit it.
process.env.QA_RUN_ID ??= Date.now().toString(36).toUpperCase();

/**
 * KlikMed HMIS end-to-end suite, generated from reference/*.xlsx.
 *
 * Project "e2e-setup"   - signs in U1 and U2 once and saves each session (tests/e2e/auth.setup.ts).
 * Project "e2e-modules" - per-module test cases (tests/modules/<NN-module>/), session U1.
 * Project "e2e"         - end-to-end chains across modules (tests/e2e/chains/), session U1.
 * Project "prereq"      - one-time set-up of 00-prerequisites.xlsx (tests/prereq/), session U1.
 *
 * Tests save data on the shared site and share branch state, so they run with one worker.
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
      name: 'e2e-setup',
      testMatch: /tests[\\/]e2e[\\/]auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
    {
      name: 'e2e-modules',
      testMatch: /tests[\\/]modules[\\/]\d\d-.*\.spec\.ts/,
      dependencies: ['e2e-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFileOf('U1') },
    },
    {
      name: 'e2e',
      testMatch: /tests[\\/]e2e[\\/].*\.spec\.ts/,
      dependencies: ['e2e-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFileOf('U1') },
    },
    {
      name: 'prereq',
      testMatch: /tests[\\/]prereq[\\/].*\.spec\.ts/,
      dependencies: ['e2e-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFileOf('U1') },
    },
  ],
});
