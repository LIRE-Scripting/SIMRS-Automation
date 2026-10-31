/** Shared runtime configuration. Secrets come from the environment (.env), never from code. */

// Loads .env when present (Node >= 20.12). CI can set the variables directly.
try {
  process.loadEnvFile('.env');
} catch {
  // no .env file: rely on the process environment
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is not set (see .env.example)`);
  return value;
}

export const BASE_URL = process.env.BASE_URL ?? 'https://rs.showcase.atklik.xyz/';

/** All site accounts share one password (answer to Q2, 2026-10-14). */
export const PASSWORD = requiredEnv('QA_PASSWORD');

/** Session files of the workbook users (00-prerequisites.xlsx | Users). */
export const authFileOf = (userKey: string): string => `.auth/${userKey}.json`;

/** Screenshots taken at the end of every test (named by test case or chain) land here; linked from the result workbooks. */
export const SCREENSHOT_DIR = 'reports/screenshots';
