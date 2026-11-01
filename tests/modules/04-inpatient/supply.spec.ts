import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { CLINICAL } from '../../../lib/clinical-data';
import { toastsAfter } from '../05-pharmacy/helpers';
import { dispensedGroup, groupButton, postRequest, requestReturn, stayLine } from '../05-pharmacy/ward';
import { WardSupply } from './helpers';
import { AdmissionsPage } from '../../../pages/inpatient/InpatientPages';

/**
 * 04-inpatient.xlsx, Admissions tab "Ward supply" (group, receipt or refusal,
 * return requests). Their preconditions are records of other applications:
 * inpatient orders OR-1/OR-2 (03 Patient Care), stores ST-IP/ST-OP
 * (07 Inventory) and medicine dispensed and issued to a stay (05 Pharmacy).
 * What the screen shows without them is checked here; the rest is not run
 * until those modules are automated (open question Q20).
 */

qaTest('TC-APP004-044', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await adm.open();
  await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
  qa.notRun(1, 'needs ST-OP "a store allowed for outpatient only" (00-test-data.xlsx | Catalogue, row 60; made in 07 Inventory)');
  qa.notRun(2, 'needs ST-IP "QA Depo Rawat Inap" (Catalogue row 59; 07 Inventory)');
  await qa.step(3, async () => {
    await expect(adm.main.getByText('Pending inpatient orders', { exact: true })).toBeVisible();
    qa.note(3, 'OR-1/OR-2 (Catalogue row 61) are not made yet; only the block is checked');
  });
  qa.notRun(4, 'needs OR-1 in an open group and OR-2 pending (03 Patient Care, 05 Pharmacy)');
});

test.beforeEach(async ({ page }) => {
  await installToastRecorder(page);
});

const RAISED = 'Return request raised. The pharmacist posts it from issue lines.';
const REFUSED = 'Quantity must be a whole number greater than zero, and already returned plus this request cannot exceed issued.';

qaTest('TC-APP004-046', async ({ page, qa }) => {
  test.slow();
  // Precondition: an open group of the test dispensed in full (made through 05 Pharmacy).
  const { group } = await dispensedGroup(page, qa);
  qa.note(1, `precondition: the group "${group}" of the test, dispensed in full (05 Pharmacy)`);
  const ws = new WardSupply(page);
  await qa.step(1, async () => {
    await ws.open();
    const refuse = await groupButton(ws, group, 'Refuse');
    await expect(refuse).toBeVisible();
    const mark = await toastMark(page);
    await refuse.click();
    const d = page.getByRole('dialog').last();
    if (await d.waitFor({ timeout: 3_000 }).then(() => true, () => false)) {
      qa.note(1, `the dialog: "${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 160)}"`);
      const reason = d.getByRole('textbox');
      if (await reason.count()) await reason.first().fill(qa.prefix('QA obat tidak sesuai'));
      else qa.deviation(1, 'A question to confirm, with a place for the reason', 'a question to confirm without a place for the reason');
      await d.getByRole('button', { name: /^(Refuse|Confirm|Yes)/ }).first().click();
    } else {
      qa.deviation(1, 'A question to confirm, with a place for the reason', 'the delivery is refused at the click: no question to confirm and no place for the reason');
    }
    const toasts = await toastsAfter(page, mark);
    qa.note(1, `Refuse: "${toasts.join(' / ')}"`);
    expect(toasts.some((t) => t.startsWith('Delivery refused.'))).toBe(true);
  });
  await qa.step(2, async () => {
    await ws.open();
    const card = ws.card('Ward supply');
    const back = card.getByRole('button', { name: /undo|take back|reopen|cancel refusal/i });
    const note = await card.getByText(/group(ed)? again/i).count();
    qa.note(2, `Ward supply after the refusal: "${(await card.innerText()).replace(/\s+/g, ' ').slice(0, 200)}"`);
    if (!(await back.count()) && !note) qa.deviation(2, 'A way to take the refusal back, or a note that the orders must be grouped again', 'neither: the group is listed as "Refused" with no button to take the refusal back, and no note says the orders must be grouped again');
  });
});

qaTest('TC-APP004-047', async ({ page, qa }) => {
  test.slow();
  // Precondition: a stay of the test with 10 issued, 4 returned and a pending request of 3. "Stay" of Ward supply holds
  // the first stays only (found blocker 40): a stay of the test is not offered, and the steps are then blocked.
  const { pt, group } = await dispensedGroup(page, qa, CLINICAL.standardOrder);
  const ws = new WardSupply(page);
  await ws.open();
  await ws.decide(await groupButton(ws, group, 'Receive'), 'Receive');
  await ws.open();
  await ws.pickStay(pt.fullName, pt.admissionNo);
  expect(await requestReturn(ws, '4')).toContain(RAISED);
  expect(await postRequest(page, '4')).toContain('Returned.');
  await ws.open();
  await ws.pickStay(pt.fullName, pt.admissionNo);
  expect(await requestReturn(ws, '3')).toContain(RAISED);
  qa.note(1, `precondition: ${pt.fullName} (${pt.admissionNo}): 10 issued, 4 returned (posted on Issue Lines), a request of 3 pending`);
  await ws.open();
  await ws.pickStay(pt.fullName, pt.admissionNo);
  for (const [step, qty] of [[1, '0'], [2, '1.5'], [3, '7'], [4, '4']] as const) {
    await qa.step(step, async () => {
      const toasts = await requestReturn(ws, qty);
      qa.note(step, `${qty}: "${toasts.join(' / ') || 'no toast'}"`);
      expect(toasts).not.toContain(RAISED);
      if (!toasts.includes(REFUSED)) {
        const invalid = await stayLine(ws).getByRole('spinbutton').first().evaluate((e) => !(e as HTMLInputElement).validity.valid);
        if (!invalid) qa.deviation(step, `Refused: toast "${REFUSED}" or the browser points at the field`, `"${toasts.join(' / ') || 'nothing shown'}"`);
      }
    });
  }
  await qa.step(5, async () => {
    expect(await requestReturn(ws, '3')).toContain(RAISED);
  });
});

qaTest('TC-APP004-048', async ({ page, qa }) => {
  const adm = new AdmissionsPage(page);
  await qa.step(1, async () => {
    await adm.open();
    await adm.main.getByRole('tab', { name: 'Ward supply' }).click();
    for (const h of ['Store', 'Ward supply', 'Stay']) await expect(adm.main.getByRole('heading', { level: 2, name: h })).toBeVisible();
  });
  qa.notRun(2, 'needs "QA-INP Zulkifli" on page 2 with issued medicine (05 Pharmacy)');
});
