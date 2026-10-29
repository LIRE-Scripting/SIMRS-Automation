import { chainTest } from '../../../fixtures/chain';
import { installToastRecorder } from '../../../lib/assertions';
import { TC_APP009_039 } from '../../modules/09-procurement/cases';
import { TC_APP019_068 } from '../../modules/19-finance/cases';
import { master, TC_APP023_001, TC_APP023_003, TC_APP023_005, TC_APP023_008, TC_APP023_012, TC_APP023_016, YESTERDAY } from '../../modules/23-sourcing/cases';

/**
 * E2E-009: Sourcing: tender to agreement and payment. A purchase request is
 * raised and approved in Procurement, the sourcing masters are made, and the
 * tender is created from the approved request, sent and published. The
 * bidder of step 2 pays the tender fee and the deposit and bids with a second
 * bidder; the bids are opened, evaluated and rated, and the first accepted.
 * A bid is accepted only after the close date, so the tender of the chain
 * closes yesterday (a typed date in the past is accepted, TC-APP023-006 step
 * 8). The winner gets the agreement and becomes a supplier; the payment
 * request runs on Finance (TC-APP019-068).
 */
chainTest('E2E-009', async ({ page, chain }) => {
  await installToastRecorder(page);
  const request = await chain.step(1, (qa) => TC_APP009_039({ page, qa }));
  const masters = await chain.step(2, (qa) => TC_APP023_001({ page, qa }));
  const tender = await chain.step(3, (qa) => TC_APP023_005({ page, qa }, { request, category: masters?.category, close: YESTERDAY() }));
  await chain.step(4, (qa) => TC_APP023_016({ page, qa }, { tender: tender?.tender, bidder: masters?.bidder }));
  await chain.step(5, async (qa) => {
    const second = await master(page, qa, 'Bidder', 'X-BDR2', 'X PT Penawar Dua');
    return TC_APP023_008({ page, qa }, { tender: tender?.tender, bidders: [masters!.bidder, second] });
  });
  await chain.step(6, (qa) => TC_APP023_012({ page, qa }, { tender: tender?.tender, vendor: masters?.bidderName }));
  await chain.step(7, (qa) => TC_APP023_003({ page, qa }, masters?.bidder));
  await chain.step(8, (qa) => TC_APP019_068({ page, qa }));
});
