import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { PROCUREMENT } from '../../../lib/procurement-data';
import { PurchaseOrdersPage, type PurchaseOrder } from '../../../pages/procurement/ProcurementPages';
import { setChainActive } from '../shared/workflow';
import { createOrder, docNo, poToastsAfter } from './cases';

/**
 * 09-procurement.xlsx, the approval chain of purchase orders switched off or
 * changed (journeys JRN-APP009-028 and 029). U1 is the superadmin of the
 * journeys: the chain "purchase_order" of Workflow is edited in Process
 * Definitions ("Ubah rantai"). It is switched off only while the steps need
 * it and switched on again whatever happens. Run on its own (workers=1).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

const CREATED = 'Purchase order created';
const order = (qa: Parameters<Parameters<typeof qaTest>[1]>[0]['qa']): PurchaseOrder => ({
  docNumber: docNo(qa),
  docDate: todayWib(),
  vendor: PROCUREMENT.vendor,
  dept: PROCUREMENT.dept,
  advance: PROCUREMENT.advance,
});

qaTest('TC-APP009-028', async ({ page, qa }) => {
  // PO-S1: an order of the test waiting at step 1, made while the chain is on.
  const s1 = order(qa);
  expect(await createOrder(page, s1)).toContain(CREATED);
  const p = new PurchaseOrdersPage(page);
  const other = order(qa);

  const off = await setChainActive(page, 'purchase_order', false);
  qa.note(1, `precondition: the chain "purchase_order" switched off in Workflow by U1 ("${off.join(' / ') || 'saved'}"); PO-S1 is ${s1.docNumber}`);
  try {
    await qa.step(1, async () => {
      const toasts = await createOrder(page, other);
      qa.note(1, `New PO with the chain off: "${toasts.join(' / ') || 'no toast'}"`);
      if (toasts.includes(CREATED)) {
        qa.deviation(1, 'Refused with a clear message that the approval chain is switched off. No order is added', `the order ${other.docNumber} is created: "${toasts.join(' / ')}"`);
      } else if (!toasts.some((t) => /chain|rantai|approval|persetujuan|switched off|inactive|nonaktif/i.test(t))) {
        qa.deviation(1, 'Refused with a clear message that the approval chain is switched off', `refused with "${toasts.join(' / ') || 'no text'}"`);
      }
    });

    // The opened order: its dialog, with or without the list "Approval chain".
    const opened = page.getByRole('dialog').last();
    await qa.step(2, async () => {
      await p.open();
      await (await p.find(s1.docNumber!)).getByRole('button', { name: 'Open' }).click();
      await expect(opened).toBeVisible();
      await page.waitForLoadState('networkidle').catch(() => {});
      const steps = (await p.view.count()) ? await p.steps() : [];
      const text = (await opened.innerText()).replace(/\s+/g, ' ');
      qa.note(2, `PO-S1 with the chain off: ${steps.length ? steps.map((x) => x.join(' ')).join('; ') : `no approval chain shown; the dialog: "${text.slice(0, 200)}"`}`);
      if (!steps.length && !/chain|rantai|approval|persetujuan|not active|nonaktif/i.test(text)) {
        qa.deviation(2, 'The steps of the chain as before, or a clear note that the chain is switched off', 'neither: the order shows no approval chain and no note');
      }
    });

    await qa.step(3, async () => {
      const advance = opened.getByRole('button', { name: /^(Advance approval|Advancing…)$/ });
      if (!(await advance.count())) {
        qa.note(3, '"Advance approval" is not offered on PO-S1 while the chain is off (the rule is TBD in the workbook)');
        return;
      }
      const mark = await toastMark(page);
      await advance.click();
      const toasts = await poToastsAfter(page, mark);
      // The rule is not known (TBD in the workbook): what happens is recorded.
      qa.note(3, `"Advance approval" on PO-S1 with the chain off: "${toasts.join(' / ') || 'no toast'}" (${toasts.includes('Approval advanced') ? 'allowed' : 'refused'})`);
    });
  } finally {
    await setChainActive(page, 'purchase_order', true);
  }

  await qa.step(4, async () => {
    expect(await createOrder(page, order(qa))).toContain(CREATED);
  });
});

qaTest('TC-APP009-029', async ({ qa }) => {
  // Steps 3 and 4 of the four-step chain, PO-S3 and step 5: the chain of the site has one step (found blocker 30).
  for (const s of [1, 2, 3]) qa.blocked(s, 30);
});
