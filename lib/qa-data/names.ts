/**
 * Values of records the tests create.
 *
 * - Prefix (Q5): every made-up record carries "QA-". The workbooks write some
 *   names as "X …" (e.g. "X Pasien OT 01"); those become "QA-Pasien OT 01".
 * - Unique per save (answer of 2026-10-14; Steps, column Cleanup
 *   Requirements: "use a new QA- identifier per run"): every call returns a
 *   new token made of the run id and a counter, so no two saves share a value,
 *   within a run or across runs.
 *
 * QA_RUN_ID is set once in playwright.config.ts and inherited by the workers.
 */

let counter = 0;

export function runId(): string {
  const id = process.env.QA_RUN_ID;
  if (!id) throw new Error('QA_RUN_ID is not set (it is set in playwright.config.ts)');
  return id;
}

/** A new token for every call: run id + worker index + counter, e.g. "MGB7K2Q0A3". */
export function uniqueToken(): string {
  counter += 1;
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${runId()}${worker}${counter.toString(36).toUpperCase().padStart(2, '0')}`;
}

/** "X Pasien OT 01" -> "QA-Pasien OT 01", code "X-01" -> "QA-01"; values already starting with "QA" stay as they are. */
export function qaPrefix(excelValue: string): string {
  const value = excelValue.trim();
  if (/^QA[- ]/.test(value)) return value;
  if (value.startsWith('X ') || value.startsWith('X-')) return `QA-${value.slice(2)}`;
  throw new Error(`"${excelValue}" is not a made-up value from the workbooks (no "QA", "X " or "X-" prefix)`);
}

/** The value a test saves: the workbook value with the QA- prefix and a new token. */
export function qaName(excelValue: string): string {
  return `${qaPrefix(excelValue)} ${uniqueToken()}`;
}

/**
 * A new MRN in the pattern the workbook gives for typed MRNs
 * (01-ambulatory-care.xlsx | Summary, "Typed MRN": MRN-2026-0A1B2C3D):
 * "MRN-", the year, "-", 8 characters 0-9/A-F.
 */
export function uniqueMrn(year = new Date().getFullYear()): string {
  counter += 1;
  const n = (Date.now() * 16 + counter) % 0xffffffff;
  return `MRN-${year}-${n.toString(16).toUpperCase().padStart(8, '0')}`;
}

/** A code the workbook writes as "X-01", made unique per save: "QA-01-<token>". */
export function qaCode(excelValue: string): string {
  return `${qaPrefix(excelValue)}-${uniqueToken()}`;
}
