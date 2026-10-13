import { defineConfig, devices } from '@playwright/test';

import { AUTH_MODULES_FILE } from './lib/config';

const AUTH_FILE = '.auth/state.json';

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
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
    {
      name: 'pharmacy',
      testIgnore: /auth\.setup\.ts|modules\.setup\.ts|tests[\\/]modules[\\/]/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    {
      name: 'modules-setup',
      testMatch: /modules\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
    {
      name: 'modules',
      testMatch: /tests[\\/]modules[\\/].*\.spec\.ts/,
      dependencies: ['modules-setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_MODULES_FILE },
    },
  ],
});
