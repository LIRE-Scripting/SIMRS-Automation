import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP018_052 } from '../../modules/18-settings/cases';
import { CASES } from '../../modules/shared/appointment-cases';
import { bookSettingsReady, SCHEDULE } from './steps/outpatient-steps';

/**
 * E2E-049: a holiday is added and the book settings (types, daily quota, open
 * hours) are written. Both run their module cases. The chain stops at the
 * first step a blocker stops; the cause is recorded by the run. The book
 * settings of the shared data are written back at the end (the case empties
 * them first, as in the appointment specs).
 */
chainTest('E2E-049', async ({ page, chain }) => {
  await installToastRecorder(page);
  try {
    await chain.step(1, (qa) => TC_APP018_052({ page, qa }));
    await chain.step(2, (qa) => CASES.bookSettings({ page, qa }, SCHEDULE));
  } finally {
    await bookSettingsReady(page);
  }
});
