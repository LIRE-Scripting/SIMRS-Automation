/** Shared runtime configuration for the pharmacy suite. */

export const BASE_URL = process.env.BASE_URL ?? 'https://rs.showcase.atklik.xyz/';

export const USERNAME = process.env.KLIKMED_USERNAME ?? 'klikmed.superadmin';
export const PASSWORD = process.env.KLIKMED_PASSWORD ?? 'Password123';

/** Module-scan suite account (rs.admin) and its separate session file. */
export const MODULES_USERNAME = process.env.MODULES_USERNAME ?? 'rs.admin';
export const AUTH_MODULES_FILE = '.auth/modules-state.json';

/** Where the encapsulated login stores the session state for reuse. */
export const AUTH_FILE = '.auth/state.json';

/** Screenshots taken at the end of every test land here. */
export const SCREENSHOT_DIR = 'screenshots';
