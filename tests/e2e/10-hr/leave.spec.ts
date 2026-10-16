import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { HR } from '../../../lib/hr-data';
import { LeavePage } from '../../../pages/hr/HrPages';
import { createEmployee, decide, employee, employeeData, ensureLeaveTypes, leaveCells, submitLeave, toastsAfter } from './helpers';
import { pending, reason, TC_APP010_007, TC_APP010_008, TC_APP010_009 } from './cases';

/**
 * 10-hr.xlsx, feature "Leave applications (/hr/leave-applications)". Each
 * test makes its own employees, so the workbook's dates never clash with an
 * earlier run; applications are found by a reason carrying the token.
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
  await ensureLeaveTypes(page);
});

qaTest('TC-APP010-007', TC_APP010_007);

qaTest('TC-APP010-008', TC_APP010_008);

qaTest('TC-APP010-009', TC_APP010_009);

qaTest('TC-APP010-010', async ({ page, qa }) => {
  const { r } = await pending(page, qa, HR.emp2);
  await qa.step(1, async () => {
    expect(await decide(page, r, 'Reject')).toContain('Leave rejected');
  });
  await qa.step(2, async () => {
    const c = await leaveCells(page, r);
    expect([c[5], c[7]]).toEqual(['REJECTED', '—']);
  });
});

qaTest('TC-APP010-011', async ({ page, qa }) => {
  const emp = await employee(page, qa, HR.emp2);
  for (const [step, slot] of [[1, 'Morning'], [2, 'Afternoon']] as const) {
    await qa.step(step, async () => {
      const r = reason(qa);
      expect(await submitLeave(page, { employee: emp.no, from: '2027-04-12', to: '2027-04-12', days: '0.5', slot, reason: r })).toContain('Leave submitted');
      const c = await leaveCells(page, r);
      expect([c[3], c[4]]).toEqual(['0.5', slot]);
    });
  }
});

qaTest('TC-APP010-012', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const last = await pending(page, qa);

  await qa.step(1, async () => {
    await l.open();
    await expect(l.table.getByRole('columnheader')).toHaveText(['Type', 'From', 'To', 'Days', 'Slot', 'Status', 'Reason', 'Actions']);
    const total = Number((await l.pager().innerText()).match(/of (\d+)$/)![1]);
    await expect(l.rows()).toHaveCount(Math.min(10, total));
    qa.note(1, `${total} application(s) in the branch`);
  });

  await qa.step(2, async () => {
    const first = await l.cells(l.rows().first());
    if (first[6] !== last.r) qa.deviation(2, 'The application submitted last is first', `the first row is "${first.join(' | ')}"`);
  });

  await qa.step(3, async () => {
    for (const r of await l.rows().all()) {
      const c = await l.cells(r);
      if (c[5] === 'PENDING') expect(c[7]).toBe('Approve Reject');
      else expect(c[7]).toBe('—');
    }
  });
});

qaTest('TC-APP010-016', async ({ page, qa }) => {
  const { r, emp } = await pending(page, qa);
  const l = new LeavePage(page);

  await qa.step(1, async () => {
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-03-03', to: '2027-03-05', days: '3', reason: reason(qa) });
    expect(toasts).not.toContain('Leave submitted');
    qa.note(1, `refusal: "${toasts.join(' / ')}"`);
    expect(toasts.join(' ')).toContain(emp.name);
    await expect(l.submitDialog).toBeVisible();
  });

  await qa.step(2, async () => {
    await l.fillLeave({ from: '2027-03-02', to: '2027-03-02', days: '0.5', slot: 'Morning' });
    const mark = await toastMark(page);
    await l.submit().click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).not.toContain('Leave submitted');
  });

  await qa.step(3, async () => {
    expect(await decide(page, r, 'Reject')).toContain('Leave rejected');
    expect(await submitLeave(page, { employee: emp.no, from: '2027-03-03', to: '2027-03-05', days: '3', reason: reason(qa) })).toContain('Leave submitted');
  });
});

qaTest('TC-APP010-017', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const one = await employee(page, qa);
  const two = await employee(page, qa, HR.emp2);
  const text = reason(qa);
  for (const e of [one, two]) expect(await submitLeave(page, { employee: e.no, from: '2027-08-02', to: '2027-08-03', days: '2', reason: text })).toContain('Leave submitted');

  await qa.step(1, async () => {
    await l.open();
    const rows = l.rows().filter({ has: page.getByRole('cell', { name: text, exact: true }) });
    await l.row(text);
    const texts = await rows.allInnerTexts();
    if (!texts.some((t) => t.includes(one.no) || t.includes(one.name))) qa.deviation(1, 'Each row names the employee, by number and name', 'no employee column; the two rows read the same');
  });

  await qa.step(2, async () => {
    if (!(await page.getByRole('searchbox').count()) && !(await page.getByRole('combobox').count())) qa.deviation(2, 'A search and a filter are present', 'neither');
  });

  await qa.step(3, async () => {
    await l.open();
    const row = await l.row(text);
    await row.first().getByRole('cell').first().click();
    if (!(await page.getByRole('dialog').count())) qa.deviation(3, 'The application opens with the employee, the dates and the full reason', 'a row cannot be opened');
  });
});

qaTest('TC-APP010-018', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const emp = await employee(page, qa, HR.emp2);
  const a = reason(qa);
  const b = reason(qa);

  await qa.step(1, async () => {
    await l.open();
    await l.openSubmit();
    await l.fillLeave({ employee: emp.no, type: HR.annual.name });
    if (!(await l.submitDialog.getByText(/balance|remaining|sisa/i).count())) qa.deviation(1, 'The balance of the chosen type is shown', 'no balance is shown');
  });

  await qa.step(2, async () => {
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-05-03', to: '2027-05-22', days: '20', reason: a });
    if (toasts.includes('Leave submitted')) qa.deviation(2, `Refused: more than the ${HR.annual.leaves} leaves of the type`, 'submitted');
  });

  await qa.step(3, async () => {
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-06-07', to: '2027-06-26', days: '20', reason: b });
    let approved = 0;
    if (toasts.includes('Leave submitted')) {
      for (const r of [a, b]) {
        const c = await leaveCells(page, r).catch(() => null);
        if (c && c[5] === 'PENDING' && (await decide(page, r, 'Approve')).includes('Leave approved')) approved++;
      }
    }
    if (approved) qa.deviation(3, 'Refused', `both submitted and ${approved} approved: 40 days against ${HR.annual.leaves}`);
  });
});

qaTest('TC-APP010-019', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const emp = await employee(page, qa, HR.emp2);
  const s = l.submitDialog;

  await qa.step(1, async () => {
    await l.open();
    await l.openSubmit();
    await l.fillLeave({ from: '2027-07-05', to: '2027-07-09' });
    const days = await s.getByRole('spinbutton', { name: 'Days' }).inputValue();
    if (days !== '5') qa.deviation(1, '"Days" changes to 5', `"Days" stays ${days}`);
  });

  await qa.step(2, async () => {
    const r = reason(qa);
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-07-05', to: '2027-07-09', reason: r });
    if (toasts.includes('Leave submitted')) {
      const days = (await leaveCells(page, r))[3];
      if (days !== '5') qa.deviation(2, 'Refused, or saved with 5 days', `saved with ${days} day(s)`);
    }
  });

  await qa.step(3, async () => {
    const r = reason(qa);
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-07-16', to: '2027-07-19', days: '0', reason: r });
    if (toasts.includes('Leave submitted')) {
      const days = (await leaveCells(page, r))[3];
      if (days !== '2') qa.deviation(3, 'Saved with 2 working days, or the weekend is pointed out', `saved with ${days} day(s)`);
    } else qa.note(3, `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(4, async () => {
    await l.open();
    await l.openSubmit();
    const days = s.getByRole('spinbutton', { name: 'Days' });
    await days.fill('0.3');
    const valid = await days.evaluate((e) => (e as HTMLInputElement).validity.valid);
    if (valid) qa.deviation(4, 'The browser points at the field: steps of 0.5 only', `0.3 is accepted (step="${await days.getAttribute('step')}")`);
  });

  await qa.step(5, async () => {
    const r = reason(qa);
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-07-23', to: '2027-07-23', days: '1', slot: 'Morning', reason: r });
    if (toasts.includes('Leave submitted')) {
      const days = (await leaveCells(page, r))[3];
      if (days !== '0.5') qa.deviation(5, 'Refused, or saved with 0.5', `saved with ${days} day(s)`);
    }
  });
});

qaTest('TC-APP010-022', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const emp = await employee(page, qa);
  const s = l.submitDialog;

  await qa.step(1, async () => {
    await l.open();
    await l.openSubmit();
    await l.fillLeave({ type: HR.annual.name, reason: reason(qa) });
    const mark = await toastMark(page);
    await l.submit().click();
    expect(await toastsAfter(page, mark)).toContain('Choose an employee on this branch.');
  });

  await qa.step(2, async () => {
    await l.fillLeave({ employee: emp.no });
    await s.getByRole('combobox', { name: 'Leave type' }).selectOption({ label: 'Select an active type' });
    const mark = await toastMark(page);
    await l.submit().click();
    expect(await s.getByRole('combobox', { name: 'Leave type' }).evaluate((e) => (e as HTMLSelectElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).not.toContain('Leave submitted');
  });

  await qa.step(3, async () => {
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-09-10', to: '2027-09-09', reason: reason(qa) });
    expect(toasts).not.toContain('Leave submitted');
    if (!toasts.some((t) => /before|after|date/i.test(t))) qa.deviation(3, 'A message that the to date is before the from date', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(4, async () => {
    const saved: string[] = [];
    for (const [from, to] of [['1900-01-01', '1900-01-01'], [todayWib(), '2099-12-31']]) {
      if ((await submitLeave(page, { employee: emp.no, from, to, reason: reason(qa) })).includes('Leave submitted')) saved.push(`${from}–${to}`);
    }
    if (saved.length) qa.deviation(4, 'Refused, or a warning about the dates', `saved: ${saved.join(', ')}`);
  });

  await qa.step(5, async () => {
    const long = `${reason(qa)} ${'x'.repeat(600)}`.slice(0, 501);
    const toasts = await submitLeave(page, { employee: emp.no, from: '2027-10-04', to: '2027-10-04', reason: long });
    expect(toasts).not.toContain('Leave submitted');
    if (!toasts.some((t) => /500|long|limit/i.test(t))) qa.deviation(5, 'Refused with a message that names the limit of 500, or the field stops there', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP010-023', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const off = employeeData(qa, { no: 'QA-EMP-NONAKTIF', name: 'QA-HRM Karyawan Nonaktif' });
  expect(await createEmployee(page, { ...off, status: 'Inactive' })).toContain('Employee saved');
  qa.note(1, `the inactive employee is made by this test: ${off.no}`);

  await qa.step(1, async () => {
    await l.open();
    await l.openSubmit();
    const field = l.submitDialog.getByRole('combobox', { name: 'Employee' });
    await field.fill(off.no);
    const list = page.locator(`#${await field.getAttribute('aria-controls')}`);
    const hits = await list.getByRole('option').allInnerTexts().catch(() => []);
    if (hits.some((h) => h.includes(off.no) && !/inactive/i.test(h))) qa.deviation(1, 'No hit, or the hit is marked as inactive', `offered like any other: "${hits.find((h) => h.includes(off.no))}"`);
  });

  await qa.step(2, async () => {
    const toasts = await submitLeave(page, { employee: off.no, from: '2027-11-01', to: '2027-11-01', reason: reason(qa) });
    if (toasts.includes('Leave submitted')) qa.deviation(2, 'Refused: the employee is not active', 'submitted');
  });

  qa.notRun(3, 'needs a branch with more than 200 employees; Podomoro has fewer, so the 200-hit limit cannot be reached');
});

qaTest('TC-APP010-032', async ({ page, qa }) => {
  const l = new LeavePage(page);
  const d = l.typeDialog;
  // LT-ANNUAL is shared; an active type of this test with a pending application stands in for it at steps 2 and 3.
  const own = qa.name('X Annual');
  await l.open();
  await l.openTypes();
  await d.getByRole('textbox', { name: 'Name' }).fill(own);
  await d.getByRole('textbox', { name: 'Type' }).fill('ANNUAL');
  await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('12');
  let mark = await toastMark(page);
  await d.getByRole('button', { name: 'Save type' }).click();
  expect(await toastsAfter(page, mark)).toContain('Leave type saved');
  const emp = await employee(page, qa);
  const r = reason(qa);
  expect(await submitLeave(page, { employee: emp.no, type: own, from: '2027-12-06', to: '2027-12-06', reason: r })).toContain('Leave submitted');
  qa.note(2, `a type of this test ("${own} · ANNUAL") with a pending application stands in for the shared LT-ANNUAL, so LT-ANNUAL stays active`);

  await qa.step(1, async () => {
    await l.open();
    await l.openSubmit();
    const options = await l.submitDialog.getByRole('combobox', { name: 'Leave type' }).locator('option').allInnerTexts();
    expect(options.some((o) => o.includes(HR.off.name))).toBe(false);
  });

  await qa.step(2, async () => {
    await l.open();
    await l.openTypes();
    await d.getByRole('combobox', { name: 'Leave types' }).selectOption({ label: `${own} · ANNUAL` });
    await d.getByRole('checkbox', { name: 'Active' }).uncheck();
    mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save type' }).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).toContain('Leave type saved');
    if (!toasts.some((t) => /pending|warning/i.test(t))) qa.deviation(2, 'A warning that a pending application uses this type', 'switched off without a warning');
  });

  await qa.step(3, async () => {
    const toasts = await decide(page, r, 'Approve');
    qa.note(3, `approving the application of the switched-off type: "${toasts.join(' / ')}"`);
  });

  await qa.step(4, async () => {
    await l.open();
    await l.openTypes();
    await d.getByRole('textbox', { name: 'Name' }).fill(HR.annual.name);
    await d.getByRole('textbox', { name: 'Type' }).fill(HR.annual.type);
    mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save type' }).click();
    if ((await toastsAfter(page, mark)).includes('Leave type saved')) qa.deviation(4, 'Refused: the type exists', `saved: "${HR.annual.name} · ${HR.annual.type}" is listed twice`);
  });

  await qa.step(5, async () => {
    await l.open();
    await l.openTypes();
    await d.getByRole('textbox', { name: 'Name' }).fill(qa.name('X Negatif'));
    await d.getByRole('textbox', { name: 'Type' }).fill('NEG');
    await d.getByRole('spinbutton', { name: 'Number of leaves' }).fill('-5');
    mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save type' }).click();
    if ((await toastsAfter(page, mark)).includes('Leave type saved')) qa.deviation(5, 'Refused: the number cannot be negative', 'saved with -5');
  });
});
