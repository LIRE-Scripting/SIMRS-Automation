import type { Browser, Page } from '@playwright/test';
import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { registerPatient } from '../../../lib/ambulatory-data';
import { installToastRecorder, toastLocator, toastMark, toastsSince } from '../../../lib/assertions';
import { CLINICAL, orderFor, PT1_DATE_OF_BIRTH } from '../../../lib/clinical-data';
import { authFileOf, PASSWORD } from '../../../lib/config';
import { userLogin } from '../../../lib/qa-data';
import { ConsultationPage, type DrugOrder } from '../../../pages/clinical/ConsultationPage';
import { LoginPage } from '../../../pages/LoginPage';
import { addLine, newPt1, Patient, TC_APP003_005 } from './cases';

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

/** Toasts shown after `mark`, waiting up to 8 s for the first ([] when none came). */
async function toastsAfter(page: Page, mark: number): Promise<string[]> {
  try {
    await expect.poll(async () => (await toastsSince(page, mark)).length, { timeout: 8_000 }).toBeGreaterThan(0);
  } catch {
    // no toast
  }
  return toastsSince(page, mark);
}

/** A page signed in afresh as U1 in a new context (no sign-out of the shared session). */
async function freshSession(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await new LoginPage(page).signIn(userLogin('U1')!, PASSWORD);
  return page;
}

qaTest('TC-APP003-001', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);

  await qa.step(1, async () => {
    await page.goto('/en/apps');
    await page.getByRole('link', { name: /^Patient Care\b/ }).first().click();
    await page.getByRole('main').getByRole('link', { name: 'Open Consultation' }).click();
    await expect(c.heading).toBeVisible();
    await expect(c.patientField).toHaveAttribute('placeholder', 'MRN or name…');
  });

  await qa.step(2, async () => {
    await c.patientField.fill(pt1.fullName.split(' ').slice(-2).join(' '));
    await expect(c.suggestions().filter({ hasText: `${pt1.mrn} · ${pt1.fullName}` })).toHaveCount(1);
  });

  await qa.step(3, async () => {
    await c.suggestions().filter({ hasText: pt1.mrn }).getByRole('button').click();
    await expect(c.pane.getByRole('heading', { level: 2, name: pt1.fullName })).toBeVisible();
    await expect(c.pane).toContainText(pt1.mrn);
    if (!(await c.pane.getByText(/DOB/).count())) qa.deviation(3, 'Left pane: name, MRN and "DOB"', 'name and MRN; no date of birth');
    await expect(c.paneSection('Problem list')).toHaveText('Nothing recorded yet.');
    await expect(c.paneSection('Allergies')).toHaveText('Nothing recorded yet.');
  });

  await qa.step(4, async () => {
    for (const t of ['Order', 'SOAP', 'Prescription'] as const) await expect(c.tab(t)).toBeVisible();
    await expect(c.tab('Order')).toHaveAttribute('aria-selected', 'true');
    await expect(c.changePatient).toBeVisible();
  });

  await qa.step(5, async () => {
    await c.changePatient.click();
    await expect(c.patientField).toBeVisible();
  });
});

qaTest('TC-APP003-005', TC_APP003_005);

qaTest('TC-APP003-008', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  const other = c.panel.getByRole('textbox', { name: 'Other generics' });

  await qa.step(1, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    await c.panel.getByRole('checkbox', { name: 'Combination' }).check();
    await expect(other).toBeVisible();
    await expect(c.submitOrder()).toBeDisabled();
  });

  await qa.step(2, async () => {
    await other.fill('Caffeine');
    await c.submitOrder().click();
    await expect(toastLocator(page, /^Order placed\.$/)).toBeVisible();
    // The form clears itself after a placed order; the next order is filled after that.
    await expect(c.field('Drug')).toHaveValue('');
  });

  await qa.step(3, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    if (await c.panel.getByRole('checkbox', { name: 'Combination' }).isChecked()) await c.panel.getByRole('checkbox', { name: 'Combination' }).uncheck();
    await c.panel.getByRole('checkbox', { name: 'Mixture' }).check();
    // Test Data: mixture components "Syrup base, Paracetamol" (one field, comma-separated).
    await c.panel.getByRole('textbox', { name: 'Mixture components' }).fill('Syrup base, Paracetamol');
    await expect(c.submitOrder()).toBeEnabled();
  });

  await qa.step(4, async () => {
    await c.submitOrder().click();
    await expect(toastLocator(page, /^Order placed\.$/)).toBeVisible();
    await expect(c.field('Drug')).toHaveValue('');
  });

  await qa.step(5, async () => {
    await c.fillOrder(CLINICAL.standardOrder);
    if (await c.panel.getByRole('checkbox', { name: 'Mixture' }).isChecked()) await c.panel.getByRole('checkbox', { name: 'Mixture' }).uncheck();
    await c.field('Vaccine code').fill(qa.prefix('QA-VAC-01'));
    await c.field('Vaccine name').fill(qa.prefix('QA Vaccine'));
    await c.submitOrder().click();
    await expect(toastLocator(page, /^Order placed\.$/)).toBeVisible();
  });
});

qaTest('TC-APP003-009', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  const texts = { Subjective: qa.name('QA S'), Objective: qa.name('QA O'), Assessment: qa.name('QA A'), Plan: qa.name('QA P') };

  await qa.step(1, async () => {
    await c.showTab('SOAP');
    await expect(c.panel.getByText('This SOAP draft stays in the current session.')).toBeVisible();
    for (const f of Object.keys(texts)) await expect(c.panel.getByRole('textbox', { name: f })).toBeVisible();
  });

  await qa.step(2, async () => {
    for (const [f, v] of Object.entries(texts)) await c.panel.getByRole('textbox', { name: f }).fill(v);
    await c.panel.getByRole('button', { name: 'Save draft' }).click();
    await expect(toastLocator(page, /^SOAP draft kept in session\.$/)).toBeVisible();
  });

  await qa.step(3, async () => {
    await c.showTab('Order');
    await c.showTab('SOAP');
    for (const [f, v] of Object.entries(texts)) await expect(c.panel.getByRole('textbox', { name: f })).toHaveValue(v);
  });
});

qaTest('TC-APP003-011', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const t = qa.token();
  const pt1 = await registerPatient(page, CLINICAL.pt1.name, t, PT1_DATE_OF_BIRTH);
  // PT-2: the catalogue's PT-2 is a twin of PT-3 ("QA-PCR Pasien Kembar"); any second patient serves here.
  const pt2 = await registerPatient(page, CLINICAL.twins.name, t);
  await c.openFor(pt1);
  const soap = qa.name('QA S');

  await qa.step(1, async () => {
    await c.fillOrder({ Drug: CLINICAL.standardOrder.Drug, Generic: CLINICAL.standardOrder.Generic });
    await c.showTab('SOAP');
    await c.panel.getByRole('textbox', { name: 'Subjective' }).fill(soap);
    await c.showTab('Prescription');
    await addLine(c, CLINICAL.standardOrder);
  });

  await qa.step(2, async () => {
    await c.showTab('Order');
    await expect(c.field('Drug')).toHaveValue(CLINICAL.standardOrder.Drug);
    await c.showTab('SOAP');
    await expect(c.panel.getByRole('textbox', { name: 'Subjective' })).toHaveValue(soap);
    await c.showTab('Prescription');
    await expect(c.panel.getByText(CLINICAL.standardOrder.Drug).first()).toBeVisible();
  });

  await qa.step(3, async () => {
    await c.changePatient.click();
    await c.pickPatient(pt2.mrn);
    await c.showTab('Order');
    await expect(c.field('Drug')).toHaveValue('');
    await c.showTab('SOAP');
    await expect(c.panel.getByRole('textbox', { name: 'Subjective' })).toHaveValue('');
    await c.showTab('Prescription');
    await expect(c.panel.getByText('No prescription lines yet.')).toBeVisible();
  });
});

qaTest('TC-APP003-015', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const [a, b] = CLINICAL.blockingPair;
  await c.openFor(await newPt1(page, qa));
  await c.showTab('Prescription');
  const alert = c.panel.getByText(`Hard interaction (sandbox): ${a} with ${b} — remove one item before dispense can proceed.`);

  await addLine(c, orderFor(a));
  await addLine(c, orderFor(b));
  await c.checkInteractions().click();
  if (!(await alert.isVisible())) {
    // The pair is not on the site (found blocker 22): no alert to keep or clear.
    qa.blocked(1, 22);
    qa.blocked(2, 22);
    await c.lines().filter({ hasText: b }).getByRole('button', { name: 'Remove' }).click();
  } else {
    await qa.step(1, () => expect(c.submitPrescription()).toBeDisabled());
    await qa.step(2, async () => {
      await c.lines().filter({ hasText: b }).getByRole('button', { name: 'Remove' }).click();
      await expect(c.lines().filter({ hasText: b })).toHaveCount(0);
      await expect(alert).toBeVisible();
      await expect(c.submitPrescription()).toBeDisabled();
    });
  }

  await qa.step(3, async () => {
    const mark = await toastMark(page);
    await c.checkInteractions().click();
    const toasts = await toastsAfter(page, mark);
    if (!toasts.includes('No drug interactions detected.')) {
      qa.deviation(3, 'Toast "No drug interactions detected."', toasts.length ? `toast "${toasts.join(' / ')}"` : 'no toast on the Prescription tab');
    }
    await expect(c.submitPrescription()).toBeEnabled();
  });

  await qa.step(4, async () => {
    await c.submitPrescription().click();
    await expect(toastLocator(page, /^Prescription order placed\.$/)).toBeVisible();
  });
});

qaTest('TC-APP003-016', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));

  await qa.step(1, async () => {
    await c.fillOrder({ ...CLINICAL.standardOrder, Route: '' });
    expect(await c.quantity()).toBe(CLINICAL.standardQuantity);
    await expect(c.submitOrder()).toBeDisabled();
  });

  await qa.step(2, async () => {
    await c.field('Route').fill(CLINICAL.standardOrder.Route!);
    await c.field('Clock times').fill('');
    expect(await c.quantity()).toBe('—');
    await expect(c.submitOrder()).toBeDisabled();
  });

  await qa.step(3, async () => {
    const marked = await c.panel.locator('[aria-invalid="true"], :invalid').count();
    if (!marked) qa.deviation(3, 'The empty field is marked', 'no field is marked and no message is shown; "Submit order" is only disabled');
  });
});

qaTest('TC-APP003-017', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  await c.fillOrder(CLINICAL.standardOrder);
  const refused = async () => {
    expect(await c.quantity()).toBe('—');
    await expect(c.submitOrder()).toBeDisabled();
  };

  await qa.step(1, async () => {
    for (const v of ['25:00', '08:60', '0800', '8']) {
      await c.field('Clock times').fill(v);
      await refused();
    }
  });

  await qa.step(2, async () => {
    await c.field('Clock times').fill(CLINICAL.standardOrder['Clock times']!);
    for (const v of ['0', '-1']) {
      await c.field('Dose').fill(v);
      await refused();
    }
  });

  await qa.step(3, async () => {
    await c.field('Dose').fill(CLINICAL.standardOrder.Dose!);
    for (const v of ['0', '-2']) {
      await c.field('Days').fill(v);
      await refused();
    }
  });
});

qaTest('TC-APP003-018', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  await c.fillOrder(CLINICAL.standardOrder);
  const r = CLINICAL.restricted;
  const check = (name: string) => c.panel.getByRole('checkbox', { name, exact: true });

  await qa.step(1, async () => {
    await c.field('Restriction level').fill(r.level);
    await expect(c.submitOrder()).toBeDisabled();
  });

  await qa.step(2, async () => {
    await c.field('Restriction type').fill(r.type);
    await c.field('Restriction item').fill(r.item);
    await expect(c.submitOrder()).toBeEnabled();
  });

  await qa.step(3, async () => {
    for (const f of ['Restriction level', 'Restriction type', 'Restriction item'] as const) await c.field(f).fill('');
    await check('Combination').check();
    await expect(c.submitOrder()).toBeDisabled();
  });

  await qa.step(4, async () => {
    await check('Combination').uncheck();
    await check('Mixture').check();
    await c.panel.getByRole('textbox', { name: 'Mixture components' }).fill('Syrup base');
    await expect(c.submitOrder()).toBeDisabled();
  });

  await qa.step(5, async () => {
    await check('Mixture').uncheck();
    await c.field('Vaccine code').fill(qa.prefix('QA-VAC-01'));
    await expect(c.submitOrder()).toBeDisabled();
  });
});

/** Places the workbook's restricted order for the open patient and returns its row in "Authorise restricted orders". */
async function placeRestricted(c: ConsultationPage, p: Patient) {
  const r = CLINICAL.restricted;
  await c.fillOrder(orderFor(r.drug));
  await c.field('Restriction level').fill(r.level);
  await c.field('Restriction type').fill(r.type);
  await c.field('Restriction item').fill(r.item);
  await c.submitOrder().click();
  await expect(toastLocator(c.page, /^Restricted order saved\. Authorise it on this screen before pharmacy can see it\.$/)).toBeVisible();
  const row = c.restrictedList().getByRole('listitem').filter({ hasText: p.fullName });
  await expect(row.first()).toBeVisible();
  return row.first();
}

qaTest('TC-APP003-020', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  const row = await placeRestricted(c, pt1);

  await qa.step(1, async () => {
    await row.getByRole('textbox', { name: 'Remark' }).fill(qa.name('QA kultur positif'));
    const mark = await toastMark(page);
    await row.getByRole('button', { name: 'Authorise' }).click();
    const toasts = await toastsAfter(page, mark);
    if (toasts.some((x) => /authoris/i.test(x)) && !toasts.some((x) => /cannot|not allowed|refus/i.test(x))) {
      qa.deviation(1, 'Refused: the person who ordered cannot authorise', `authorised at once (toast "${toasts.join(' / ')}")`);
    } else {
      expect(toasts.join(' ')).toMatch(/cannot|not allowed|refus/i);
    }
  });
});

qaTest('TC-APP003-021', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  await placeRestricted(c, pt1);

  await qa.step(1, async () => {
    const rows = (await c.restrictedList().getByRole('listitem').allInnerTexts()).map((x) => x.split('\n')[0]);
    const others = rows.filter((x) => !x.startsWith(pt1.fullName));
    if (others.length) {
      qa.deviation(1, "Only PT-1's waiting orders", `the list also shows ${others.length} order(s) of other patients, by name only (e.g. "${others[0]}")`);
    }
    expect(rows.some((x) => x.startsWith(pt1.fullName))).toBe(true);
  });
});

qaTest('TC-APP003-022', async ({ page, browser, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  const text = qa.name('QA S');
  await c.openFor(pt1);
  await c.showTab('SOAP');
  await c.panel.getByRole('textbox', { name: 'Subjective' }).fill(text);
  await c.panel.getByRole('button', { name: 'Save draft' }).click();
  await expect(toastLocator(page, /^SOAP draft kept in session\.$/)).toBeVisible();

  const soapShows = async (cp: ConsultationPage, step: number) => {
    await cp.showTab('SOAP');
    const value = await cp.panel.getByRole('textbox', { name: 'Subjective' }).inputValue();
    if (value !== text) qa.deviation(step, 'The SOAP tab shows the saved text', value ? `it shows "${value}"` : 'the four areas are empty');
  };

  await qa.step(1, async () => {
    await c.changePatient.click();
    await c.pickPatient(pt1.mrn);
    await soapShows(c, 1);
  });

  await qa.step(2, async () => {
    // The shared U1 session is not signed out (other tests use it): a new sign-in in a fresh context.
    qa.note(2, 'signed in afresh in a new browser context instead of signing the shared session out');
    const other = await freshSession(browser);
    const c2 = new ConsultationPage(other);
    await c2.openFor(pt1);
    await soapShows(c2, 2);
    await other.context().close();
  });
});

qaTest('TC-APP003-024', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  // Precondition "PT-1 is known to be allergic to Paracetamol": recorded with the left pane's own input.
  const allergy = c.pane.getByRole('textbox', { name: 'Allergy' });
  await allergy.fill(CLINICAL.standardOrder.Generic!);
  await allergy.locator('xpath=following::button[normalize-space()="Save"][1]').click();
  await expect(toastLocator(page, /^Allergy recorded on this patient$/)).toBeVisible();

  await qa.step(1, async () => {
    await c.openFor(pt1);
    await expect(c.paneSection('Allergies')).toContainText(CLINICAL.standardOrder.Generic!);
  });

  await qa.step(2, async () => {
    await expect(c.pane.getByRole('textbox', { name: 'Allergy' })).toBeVisible();
    await expect(c.pane.getByRole('textbox', { name: 'Code' })).toBeVisible();
  });
});

qaTest('TC-APP003-026', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  const allergy = c.pane.getByRole('textbox', { name: 'Allergy' });
  await allergy.fill(CLINICAL.standardOrder.Generic!);
  await allergy.locator('xpath=following::button[normalize-space()="Save"][1]').click();
  await expect(toastLocator(page, /^Allergy recorded on this patient$/)).toBeVisible();
  await c.fillOrder(CLINICAL.standardOrder);

  await qa.step(1, async () => {
    const mark = await toastMark(page);
    await c.checkInteractions().click();
    const toasts = await toastsAfter(page, mark);
    const warned = (await c.panel.getByText(/allerg/i).count()) > 0 || toasts.some((x) => /allerg/i.test(x));
    if (!warned) qa.deviation(1, 'An allergy warning', `no allergy warning (toast "${toasts.join(' / ')}")`);
  });

  await qa.step(2, async () => {
    if (await c.submitOrder().isDisabled()) return; // blocked: as expected
    const mark = await toastMark(page);
    await c.submitOrder().click();
    const toasts = await toastsAfter(page, mark);
    if (toasts.includes('Order placed.')) qa.deviation(2, 'The order is blocked or needs an acknowledgement', 'placed at once (toast "Order placed.")');
  });
});

qaTest('TC-APP003-029', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const [ibuprofen, amlodipine] = CLINICAL.blockingPair;
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  await c.placeOrder(orderFor(ibuprofen));

  // The expected alert needs the blocking pair on the site (found blocker 22); what the check says is noted.
  await c.fillOrder(orderFor(amlodipine));
  const mark = await toastMark(page);
  await c.checkInteractions().click();
  const toasts = await toastsAfter(page, mark);
  qa.note(1, `"Check interactions" answered: ${toasts.join(' / ') || 'nothing'}`);
  qa.blocked(1, 22);
});

qaTest('TC-APP003-030', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  await c.showTab('Prescription');
  const long = orderFor(CLINICAL.blockingPair[1]);

  await qa.step(1, async () => {
    await addLine(c, CLINICAL.standardOrder);
    await addLine(c, { ...long, Strength: '5'.repeat(70) });
    const mark = await toastMark(page);
    await c.submitPrescription().click();
    const toasts = await toastsAfter(page, mark);
    const left = await c.lines().count();
    if (left < 2) {
      qa.deviation(1, 'Both lines are refused together, with the reason', `${2 - left} line(s) sent, ${left} left in the list; toast "${toasts.join(' / ')}"`);
    } else {
      expect(toasts.join(' ')).not.toContain('Prescription order placed.');
    }
  });
});

qaTest('TC-APP003-031', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  await c.placeOrder({ ...CLINICAL.standardOrder, Dose: '2' });

  await qa.step(1, async () => {
    await c.openFor(pt1);
    const orders = c.paneSection('Drug orders');
    await expect(orders).toContainText(CLINICAL.standardOrder.Drug);
    const controls = await c.pane.getByRole('button', { name: /cancel|edit/i }).count();
    if (!controls) qa.deviation(1, 'The order with a Cancel or Edit control', 'the order is listed under "Drug orders" with no Cancel or Edit');
  });

  qa.blocked(2, 21);
});

qaTest('TC-APP003-032', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  await c.openFor(pt1);
  await c.placeOrder(CLINICAL.standardOrder);

  await qa.step(1, async () => {
    await c.openFor(pt1);
    const orders = c.paneSection('Drug orders');
    await expect(orders).toContainText(CLINICAL.standardOrder.Drug);
    const text = await orders.innerText();
    qa.note(1, `"Drug orders" reads: ${text.replace(/\s+/g, ' ').slice(0, 200)}`);
    if (!/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/.test(text) || !/pending|dispensed/i.test(text)) {
      qa.deviation(1, 'A list of the patient\'s orders with date, drug, quantity and status', `the list shows "${text.replace(/\s+/g, ' ').slice(0, 120)}"`);
    }
    qa.note(1, 'precondition "three orders this week, one dispensed" reduced to one order: dispensing is done in 05 Pharmacy');
  });
});

qaTest('TC-APP003-040', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  await c.fillOrder({ Drug: CLINICAL.standardOrder.Drug });
  await c.showTab('SOAP');
  await c.panel.getByRole('textbox', { name: 'Subjective' }).fill(qa.name('QA S'));

  await qa.step(1, async () => {
    let warned = false;
    page.once('dialog', async (d) => {
      warned = true;
      await d.dismiss();
    });
    await page.reload();
    if (warned) return;
    const kept = (await c.pane.count()) > 0 && (await c.panel.getByRole('textbox', { name: 'Subjective' }).count()) > 0;
    if (!kept) qa.deviation(1, 'The entries are kept, or the doctor is warned before leaving', 'the page returns to the empty "Select patient" screen with no warning');
    await expect(c.patientField.or(c.pane)).toBeVisible();
  });

  qa.notRun(2, 'signing out in a second tab would end the session the other tests share (one U1 account); not run');
});

qaTest('TC-APP003-046', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  const note = qa.name('QA Amoksisilin');
  await c.openFor(pt1);
  const input = c.pane.getByRole('textbox', { name: 'Allergy' });
  const save = input.locator('xpath=following::button[normalize-space()="Save"][1]');

  await qa.step(1, async () => {
    await expect(c.paneSection('Allergies')).toHaveText('Nothing recorded yet.');
    await expect(input).toHaveAttribute('placeholder', /Allergy/);
    await expect(save).toBeVisible();
  });

  await qa.step(2, async () => {
    await input.fill(note);
    await save.click();
    await expect(toastLocator(page, /^Allergy recorded on this patient$/)).toBeVisible();
    await expect(c.paneSection('Allergies')).toContainText(note);
    await expect(input).toHaveValue('');
  });

  qa.notRun(3, 'Expected Result is TBD (Q8) and needs a full formulary for the drug in the note, which the workbook does not give');
});

qaTest('TC-APP003-047', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  const input = c.pane.getByRole('textbox', { name: 'Allergy' });

  await qa.step(1, async () => {
    const posts: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') posts.push(r.url());
    });
    await input.locator('xpath=following::button[normalize-space()="Save"][1]').click();
    await expect(toastLocator(page, /^An allergy note is required$/)).toBeVisible();
    expect(posts).toEqual([]);
  });
});

qaTest('TC-APP003-048', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));
  const study = qa.name('QA Foto toraks PA');
  const field = c.panel.getByRole('textbox', { name: 'Study' });
  const create = c.panel.getByRole('button', { name: /^(Create radiology order|Creating…)$/ });

  await qa.step(1, async () => {
    await expect(field).toBeVisible();
    await expect(create).toBeVisible();
  });

  await qa.step(2, async () => {
    await field.fill(study);
    await create.click();
    await expect(toastLocator(page, /^Radiology order created\. It is worked on the radiology screen\.$/)).toBeVisible();
    await expect(field).toHaveValue('');
  });

  await qa.step(3, async () => {
    await page.goto('/en/radiology/orders');
    await expect(page.getByRole('main').getByText(study).first()).toBeVisible();
    qa.note(3, `the order row reads: ${(await page.getByRole('main').getByRole('row').filter({ hasText: study }).first().innerText().catch(() => '')).replace(/\s+/g, ' ')}`);
  });
});

qaTest('TC-APP003-049', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  await c.openFor(await newPt1(page, qa));

  await qa.step(1, async () => {
    const posts: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') posts.push(r.url());
    });
    await c.panel.getByRole('button', { name: 'Create radiology order' }).click();
    await expect(toastLocator(page, /^A study is required$/)).toBeVisible();
    expect(posts).toEqual([]);
  });
});

qaTest('TC-APP003-050', async ({ page, browser, qa }) => {
  // "With All branches active": U1 has one branch only, so the step runs as U2 (All branches).
  const pt1 = await newPt1(page, qa);
  const context = await browser.newContext({ storageState: authFileOf('U2') });
  const u2 = await context.newPage();
  await installToastRecorder(u2);
  const c = new ConsultationPage(u2);
  qa.note(1, 'run as U2 (rs.admin, "All branches"): U1 cannot choose "All branches"');

  await qa.step(1, async () => {
    await c.openFor(pt1);
    await c.panel.getByRole('textbox', { name: 'Study' }).fill(qa.name('QA Foto toraks PA'));
    const posts: string[] = [];
    u2.on('request', (r) => {
      if (r.method() === 'POST' && !/_next|login/.test(r.url())) posts.push(r.url());
    });
    const mark = await toastMark(u2);
    await c.panel.getByRole('button', { name: 'Create radiology order' }).click();
    const toasts = await toastsAfter(u2, mark);
    expect(toasts.length, 'a toast is shown').toBeGreaterThan(0);
    expect(toasts).not.toContain('Radiology order created. It is worked on the radiology screen.');
    qa.note(1, `toast "${toasts.join(' / ')}" (the workbook leaves the text TBD)`);
  });
  await context.close();
});

qaTest('TC-APP003-051', async ({ page, qa }) => {
  const c = new ConsultationPage(page);
  const pt1 = await newPt1(page, qa);
  const study = qa.name('QA Foto toraks PA');
  await c.openFor(pt1);
  await c.panel.getByRole('textbox', { name: 'Study' }).fill(study);
  await c.panel.getByRole('button', { name: 'Create radiology order' }).click();
  await expect(toastLocator(page, /^Radiology order created\. It is worked on the radiology screen\.$/)).toBeVisible();

  await qa.step(1, async () => {
    await page.goto('/en/radiology/orders');
    const row = page.getByRole('main').getByRole('row').filter({ hasText: study }).first();
    await expect(row).toBeVisible();
    const text = await row.innerText();
    if (!text.includes(pt1.fullName) || !text.includes(pt1.mrn)) {
      qa.deviation(1, "The patient's name and MRN on the order", `the order row has no patient: "${text.replace(/\s+/g, ' ')}"`);
    }
  });
});
