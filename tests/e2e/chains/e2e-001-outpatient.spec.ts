import { chainTest } from '../../../fixtures/chain';
import { releaseWeek } from '../../../lib/ambulatory-data';
import { installToastRecorder } from '../../../lib/assertions';
import { arriveSteps, bookSettingsReady, bookSteps, consultSteps, registerSteps } from './outpatient-steps';

/**
 * E2E-001: a new outpatient is registered, booked with DR-1, arrives and is
 * called, and the doctor opens the consultation. The medication order of
 * step 5 (TC-APP003-002) is marked "Needs Evaluation" in its workbook, so the
 * chain stops there.
 */
chainTest('E2E-001', async ({ page, chain }) => {
  await installToastRecorder(page);
  await bookSettingsReady(page);
  const pt = await chain.step(1, (qa) => registerSteps(page, qa));
  let dDay = '';
  try {
    dDay = await chain.step(2, (qa) => bookSteps(page, qa, pt));
    await chain.step(3, (qa) => arriveSteps(page, qa, pt));
    await chain.step(4, (qa) => consultSteps(page, qa, pt));
    chain.stopAsPlanned(5);
  } finally {
    // The QA bookings of the claimed week are cancelled, as in the appointment specs.
    if (dDay) await releaseWeek(page, dDay);
  }
});
