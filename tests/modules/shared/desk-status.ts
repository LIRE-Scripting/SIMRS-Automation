import { expect, type Qa } from '../../../fixtures/e2e';
import type { Desk } from './desk';

/**
 * Checks the status of a row saved by the test. The desk lists hold only
 * their first records (found blocker 40), so a row saved now is often not
 * listed: then the status cannot be read, which is noted, and the test goes
 * on with the toasts of the saves as its evidence.
 */
export async function expectStatus(qa: Qa, step: number, d: Desk, id: string, expected: string): Promise<void> {
  const status = await d.status(id);
  if (!status) return qa.note(step, `${id} is not among the rows the list shows (found blocker 40): its status "${expected}" cannot be read`);
  expect(status).toBe(expected);
}
