import * as fs from 'node:fs';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { HR } from '../../../lib/hr-data';
import { EmployeesPage } from '../../../pages/hr/HrPages';
import { createEmployee, employee, employeeData, toastsAfter } from './helpers';
import { TC_APP010_001, TC_APP010_002, TC_APP010_005 } from './cases';
import { sourceOnSite } from '../../../lib/i18n';

/** 10-hr.xlsx, feature "Employees (/hr/employees)". Employees are made per test. */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

qaTest('TC-APP010-001', TC_APP010_001);

qaTest('TC-APP010-002', TC_APP010_002);

qaTest('TC-APP010-003', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const emp = await employee(page, qa);
  let d = p.dialog('Edit employee');

  await qa.step(1, async () => {
    d = await p.openEdit(emp.no);
    await expect(p.text(d, 'Designation')).toHaveValue(HR.emp1.designation);
  });

  await qa.step(2, async () => {
    await p.fill(d, { designation: 'QA Kepala Ruangan', status: 'Inactive' });
    await p.walk(d);
    const mark = await toastMark(page);
    await p.save(d).click();
    expect(await toastsAfter(page, mark)).toContain('Employee updated');
  });

  await qa.step(3, async () => {
    d = await p.openEdit(emp.no);
    await expect(p.text(d, 'Designation')).toHaveValue('QA Kepala Ruangan');
    await expect(d.getByRole('combobox', { name: 'Employment status' })).toHaveValue(/Inactive/i);
  });
});

qaTest('TC-APP010-005', TC_APP010_005);

qaTest('TC-APP010-006', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const two = await employee(page, qa, HR.emp2);

  await qa.step(1, async () => {
    await p.open();
    await expect(p.rows()).toHaveCount(10);
    await expect(p.pager()).toHaveText(/^Showing 1–10 of \d+$/);
    await expect(p.table.getByRole('columnheader')).toHaveText(['Employee no.', 'Name', 'Edit']);
    const nos = await p.rows().evaluateAll((rs) => rs.map((r) => (r.querySelector('td')?.textContent ?? '').trim()));
    expect(nos).toEqual([...nos].sort());
  });

  await qa.step(2, async () => {
    await p.find('QA-EMP-00');
    // The list is replaced after the search answers.
    await expect.poll(async () => (await p.rows().allInnerTexts()).every((t) => t.toLowerCase().includes('qa-emp-00')), { timeout: 15_000 }).toBe(true);
  });

  await qa.step(3, async () => {
    await p.find(two.name.replace('QA-HRM Karyawan Dua', 'karyawan dua').toLowerCase());
    await expect(p.row(two.no)).toHaveCount(1);
  });

  let file = '';
  await qa.step(4, async () => {
    await p.find('QA-EMP-00');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const dl = await download;
    expect(dl.suggestedFilename()).toBe('employees.csv');
    file = test.info().outputPath('employees.csv');
    await dl.saveAs(file);
  });

  await qa.step(5, async () => {
    const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
    // The file is written in the language of the site ("No. karyawan,Nama" on /id).
    expect(lines[0]).toMatch(new RegExp(`^${sourceOnSite('Employee no.')},${sourceOnSite('Name')}$`));
    const total = Number((await p.pager().innerText()).match(/of (\d+)$/)![1]);
    qa.note(5, `${lines.length - 1} line(s) in the file; the search shows ${total}`);
    expect(lines.length - 1).toBe(total);
  });
});

qaTest('TC-APP010-027', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const d = p.dialog('Create employee');

  await qa.step(1, async () => {
    await p.open();
    await p.openNew();
    const e = employeeData(qa);
    await p.fill(d, { ...e, dob: undefined });
    await expect(p.next(d)).toBeDisabled();
    const marked = await d.locator('[aria-invalid="true"], .field-error, [role="alert"]').count();
    if (!marked) qa.deviation(1, 'The missing field is marked, or a message names it', '"Next" is only disabled; nothing shows which field is missing');
  });

  await qa.step(2, async () => {
    const e = employeeData(qa);
    const toasts = await createEmployee(page, { ...e, name: '' }).catch((err: Error) => [`not possible: ${err.message.split('\n')[0]}`]);
    if (toasts.includes('Employee saved')) qa.deviation(2, 'Refused: an employee needs a name', 'saved without a name');
    else qa.note(2, `result: ${toasts.join(' / ')}`);
  });

  await qa.step(3, async () => {
    await p.open();
    await p.openNew();
    for (const f of ['Gender', 'Category']) {
      const isList = await d.getByRole('combobox', { name: f }).count();
      if (!isList) qa.deviation(3, `"${f}" is a list to choose from`, `"${f}" is a free text field`);
    }
  });

  await qa.step(4, async () => {
    const e = employeeData(qa);
    const toasts = await createEmployee(page, { ...e, email: 'bukan-email', dob: '2099-01-01' });
    if (toasts.includes('Employee saved')) qa.deviation(4, 'Refused: not an e-mail address; date of birth in the future', 'saved');
  });

  await qa.step(5, async () => {
    const e = employeeData(qa);
    const toasts = await createEmployee(page, { ...e, no: `${e.no}-${'X'.repeat(80)}`.slice(0, 65) });
    expect(toasts).not.toContain('Employee saved');
    if (!toasts.some((t) => /64|long|limit/i.test(t))) qa.deviation(5, 'Refused with a message that names the limit of 64', `toast "${toasts.join(' / ')}"`);
  });
});

qaTest('TC-APP010-028', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const one = await employee(page, qa);
  const two = await employee(page, qa, HR.emp2);
  const save = async (no: string, v: { reportingAuthority?: string; accountLogin?: string }) => {
    const d = await p.openEdit(no);
    await p.fill(d, v);
    await p.walk(d);
    const mark = await toastMark(page);
    await p.save(d).click();
    return toastsAfter(page, mark);
  };

  await qa.step(1, async () => {
    const toasts = await save(one.no, { reportingAuthority: one.no });
    expect(toasts).toContain('An employee cannot be their own reporting authority.');
  });

  await qa.step(2, async () => {
    const toasts = await save(one.no, { reportingAuthority: 'QA-TIDAK-ADA' });
    expect(toasts).not.toContain('Employee updated');
    if (!toasts.some((t) => /exist|QA-TIDAK-ADA/i.test(t))) qa.deviation(2, 'A message that this employee number does not exist', `toast "${toasts.join(' / ')}"`);
  });

  await qa.step(3, async () => {
    const toasts = await save(one.no, { reportingAuthority: '', accountLogin: `qa.tidak.ada.${qa.token().toLowerCase()}` });
    expect(toasts).not.toContain('Employee updated');
    if (!toasts.some((t) => /exist|user/i.test(t))) qa.deviation(3, 'A message that this user does not exist', `toast "${toasts.join(' / ')}"`);
  });

  // Linking the admin accounts U1/U2 to a test employee would change real accounts; USR-1 is not known.
  qa.notRun(4, 'needs a user account linked to EMP-2 and USR-1, whose login comes with the test-data set-up (not given)');

  await qa.step(5, async () => {
    expect(await save(one.no, { accountLogin: '', reportingAuthority: two.no })).toContain('Employee updated');
    const toasts = await save(two.no, { accountLogin: '', reportingAuthority: one.no });
    if (toasts.includes('Employee updated')) qa.deviation(5, 'The second save is refused: the two would report to each other', 'both saved');
  });
});

qaTest('TC-APP010-030', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const emp = await employee(page, qa);

  await qa.step(1, async () => {
    const d = await p.openEdit(emp.no);
    for (const step of ['Dependents', 'Contacts', 'Qualifications', 'Employment'] as const) {
      void step;
      await p.next(d).click();
    }
    await p.next(d).click();
    await p.addRow(d, { 'Licensing authority': 'QA Majelis', 'Valid till': '2020-12-31' });
    const mark = await toastMark(page);
    await p.save(d).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).toContain('Employee updated');
    if (!toasts.some((t) => /expire/i.test(t))) qa.deviation(1, 'A warning that the licence has expired', 'saved without a word');
  });

  await qa.step(2, async () => {
    await p.open();
    await p.find(emp.no);
    const text = await p.row(emp.no).innerText();
    if (!/expire|licen/i.test(text)) qa.deviation(2, 'Expired or soon-expiring licences are marked', 'the list shows number and name only');
  });

  await qa.step(3, async () => {
    const side = (await page.getByRole('navigation', { name: 'HR' }).getByRole('link').allInnerTexts()).join(', ');
    if (!/licen/i.test(side)) qa.deviation(3, 'A report or a filter of licences that run out', `no such screen (HR menu: ${side})`);
  });
});

qaTest('TC-APP010-031', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const emp = await employee(page, qa);
  const d = await p.openEdit(emp.no);

  await qa.step(1, async () => {
    const labels = await d.locator('input').evaluateAll((es) => es.map((e) => (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
    const missing = ['national ID', 'joining date'].filter((f) => !labels.some((l) => new RegExp(f.split(' ')[0], 'i').test(l)));
    if (missing.length) qa.deviation(1, 'A national ID number and a joining date on "File"', `missing: ${missing.join(', ')}`);
  });

  await qa.step(2, async () => {
    await p.next(d).click();
    await p.next(d).click();
    await d.getByRole('button', { name: 'Add', exact: true }).click();
    if (!(await d.getByLabel(/phone/i).count())) qa.deviation(2, 'A phone field on "Contacts"', 'a contact is an address (Type, Address, Country, State, District, City)');
  });

  await qa.step(3, async () => {
    const d2 = await p.openEdit(emp.no);
    const type = await p.text(d2, 'Photo location').getAttribute('type');
    if (type !== 'file') qa.deviation(3, 'A file can be chosen and is shown', '"Photo location" is a text field; no file is uploaded or shown');
  });

  await qa.step(4, async () => {
    await p.open();
    await p.find(emp.no);
    const buttons = await p.row(emp.no).getByRole('button').allInnerTexts();
    const statuses = await (await p.openEdit(emp.no)).getByRole('combobox', { name: 'Employment status' }).locator('option').allInnerTexts();
    qa.note(4, `row buttons: ${buttons.join(', ')}; statuses: ${statuses.join(', ')}`);
    if (!buttons.some((b) => /delete|remove/i.test(b))) qa.deviation(4, 'A delete, or a status for it', `no delete; statuses ${statuses.join(', ')}`);
  });
});

qaTest('TC-APP010-038', async ({ page, qa }) => {
  const p = new EmployeesPage(page);
  const t = qa.token();
  const xss = { no: `QA-EMP-XSS-${t}`, name: '<script>alert(1)</script>' };
  const csv = { no: `QA-EMP-CSV-${t}`, name: '=HYPERLINK("http://example.invalid","x")' };
  let alerted = false;
  page.on('dialog', async (dlg) => {
    alerted = true;
    await dlg.dismiss();
  });

  await qa.step(1, async () => {
    const saved: typeof xss[] = [];
    for (const e of [xss, csv]) {
      const toasts = await createEmployee(page, { ...employeeData(qa), ...e });
      if (toasts.includes('Employee saved')) saved.push(e);
      else qa.deviation(1, 'Both employees are saved and their names shown as typed', `"${e.name}" is refused: "${toasts.join(' / ')}"`);
    }
    await p.open();
    await p.find(`-${t}`);
    for (const e of saved) await expect(p.row(e.no).getByRole('cell').nth(1)).toHaveText(e.name);
    expect(alerted).toBe(false);
  });

  qa.notRun(2, 'covered in Leave applications (the reason is free text, TC-APP010-022)');

  await qa.step(3, async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const file = test.info().outputPath('employees.csv');
    await (await download).saveAs(file);
    const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(csv.no)) ?? '';
    qa.note(3, `the line in employees.csv: ${line}`);
    if (/,"?=/.test(line)) qa.deviation(3, 'The second name is shown as text, not run as a formula', 'the cell begins with "=" as typed');
  });
});
