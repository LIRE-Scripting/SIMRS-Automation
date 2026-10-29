import { chainTest } from '../../../fixtures/chain';
import { releaseWeek } from '../../../lib/ambulatory-data';
import { installToastRecorder } from '../../../lib/assertions';
import { arriveSteps, bookSettingsReady, bookSteps, consultSteps, registerSteps } from './steps/outpatient-steps';
import { dispenseSteps, orderSteps, paySteps, receiptSteps, saleSteps } from './steps/pharmacy-billing-steps';

/**
 * E2E-001: a new outpatient is registered, booked with DR-1, arrives and is
 * called; the doctor opens the consultation and orders the standard drug;
 * the pharmacist dispenses it; the sale is an RX- invoice at the cashier, paid
 * in cash, and its receipt is printed (the browser print: the site has no
 * print control). The collections of step 10 (TC-APP019-058) wait for the
 * branch set-up (blocker 13), so the chain stops there.
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
  } finally {
    // The QA bookings of the claimed week are cancelled, as in the appointment specs.
    if (dDay) await releaseWeek(page, dDay);
  }
  await chain.step(5, (qa) => orderSteps(page, qa, pt));
  const sale = await chain.step(6, (qa) => dispenseSteps(page, qa, pt));
  const rx = await chain.step(7, (qa) => saleSteps(page, qa, sale));
  await chain.step(8, (qa) => paySteps(page, qa, rx));
  await chain.step(9, (qa) => receiptSteps(page, qa, rx, chain.chain.id));
  chain.stopAsPlanned(10);
});
