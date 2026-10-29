import { asOnSite } from '../../../lib/i18n';
import { expect, qaTest, test } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark } from '../../../lib/assertions';
import { todayWib } from '../../../lib/dates';
import { OtDeskPage, OtRequestsPage } from '../../../pages/ot/OtPages';
import { backToIndonesian, switchLanguage } from '../shared/language';
import { screenOpens } from '../shared/screen-opens';
import { act, procedure, request, toastsAfter } from './helpers';

/**
 * 08-operation-theater.xlsx: hub and language (008), Dossiers, Billing
 * policy, Calendar, Pain and Surgical case (035 … 043), and the screen check
 * of every route (044 … 050).
 */

test.beforeEach(async ({ page }) => {
  test.slow();
  await installToastRecorder(page);
});

test.afterEach(async ({ page }) => {
  await backToIndonesian(page);
});

qaTest('TC-APP008-008', async ({ page, qa }) => {
  const main = page.getByRole('main');
  const ot = new OtRequestsPage(page);

  await qa.step(1, async () => {
    await page.goto('/id/apps');
    await page.getByRole('link', { name: /^Operation Theater\b/ }).first().click();
    await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/^Home\s*\/\s*Apps\s*\/\s*Operation Theater$/);
    await expect(main.getByRole('heading', { level: 1, name: 'Operation Theater' })).toBeVisible();
    await expect(main.getByText('OT requests — schedule & consumption', { exact: true })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Open requests' })).toBeVisible();
    qa.deviation(1, 'A button "Open requests"', '"Open requests" is a link');
    await expect(main.getByRole('heading', { level: 2, name: 'Workflow' })).toBeVisible();
    const tiles = (await main.getByRole('link').allInnerTexts()).map((t) => t.trim()).filter((t) => t && t !== 'Open requests' && !['Home', 'Apps'].includes(t));
    if (tiles.join('|') !== 'Requests') qa.deviation(1, 'One tile "Requests" under "Workflow"', `tiles: ${tiles.join(', ')}`);
  });

  await qa.step(2, async () => {
    await main.getByRole('link', { name: 'Requests', exact: true }).last().click();
    await expect(ot.heading).toBeVisible();
    await page.goto('/id/ot');
    await page.getByRole('complementary').getByRole('link', { name: 'Requests', exact: true }).first().click();
    await expect(ot.heading).toBeVisible();
  });

  await qa.step(3, () => asOnSite(async () => {
    await switchLanguage(page, 'ID');
    await page.goto('/id/ot/requests');
    const h1 = (await main.getByRole('heading', { level: 1 }).innerText()).trim();
    const cols = (await main.getByRole('columnheader').allInnerTexts()).map((c) => c.trim());
    const buttons = (await main.getByRole('button').allInnerTexts()).map((c) => c.trim()).filter(Boolean);
    qa.note(3, `heading "${h1}"; columns ${cols.join(', ')}; buttons ${[...new Set(buttons)].slice(0, 8).join(', ')}`);
    const english = [h1 === 'OT requests' && 'heading', cols.includes('Blocked') && '"Blocked"', buttons.includes('Schedule') && '"Schedule"'].filter(Boolean);
    if (english.length) qa.deviation(3, 'Headings, column names, buttons and toasts are Indonesian ("Permintaan OT", "Jadwalkan", …)', `English: ${english.join(', ')}`);
  }));
});

qaTest('TC-APP008-035', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  const name = qa.name('X Set apendektomi');
  const item = qa.prefix('X Kasa steril');
  const d = desk.dialog();

  await qa.step(1, async () => {
    await page.goto('/id/ot');
    await page.getByRole('complementary').getByRole('link', { name: 'Dossiers' }).first().click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Dossiers' })).toBeVisible();
    await expect(desk.main.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(desk.main.getByRole('textbox', { name: 'Procedure' })).toBeVisible();
  });

  await qa.step(2, async () => {
    await desk.main.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d.getByText('Dossiers', { exact: true })).toBeVisible();
    for (const f of ['Name', 'Item']) {
      await expect(d.getByRole('textbox', { name: f })).toBeVisible();
      expect(await d.getByRole('textbox', { name: f }).evaluate((e) => (e as HTMLInputElement).required)).toBe(true);
    }
    await expect(d.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Name' }).fill(name);
    await d.getByRole('textbox', { name: 'Item' }).fill(item);
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    expect(await toastsAfter(page, mark)).toContain('Saved');
    await expect(desk.main.getByRole('listitem').filter({ hasText: name })).toContainText(item);
  });

  await qa.step(4, async () => {
    const first = (await desk.main.getByRole('listitem').first().innerText()).replace(/\s+/g, ' ');
    await desk.main.getByRole('textbox', { name: 'Procedure' }).fill(qa.name('X Apendektomi'));
    const mark = await toastMark(page);
    await desk.main.getByRole('button', { name: 'Procedure', exact: true }).click();
    expect(await toastsAfter(page, mark)).toContain('Saved');
    qa.note(4, `linked to the first dossier of the list: "${first}"`);
  });
});

qaTest('TC-APP008-036', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  await qa.step(1, async () => {
    await desk.open('dossiers', 'Dossiers');
    await desk.main.getByRole('button', { name: 'Save', exact: true }).click();
    const d = desk.dialog();
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    expect(await d.getByRole('textbox', { name: 'Name' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
  });
});

qaTest('TC-APP008-037', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  const d = desk.dialog();
  const incision = qa.name('X sama');

  await qa.step(1, async () => {
    await page.goto('/id/ot');
    await page.getByRole('complementary').getByRole('link', { name: 'Billing' }).first().click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Billing policy' })).toBeVisible();
    await expect(desk.main.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  await qa.step(2, async () => {
    await desk.main.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d.getByRole('textbox', { name: 'Incision' })).toBeVisible();
    await expect(d.getByRole('combobox')).toHaveText(/single\s*multiple/);
    await expect(d.getByRole('spinbutton')).toBeVisible();
    if (!(await d.getByRole('combobox', { name: 'Branch' }).or(d.getByRole('textbox', { name: 'Branch' })).count())) qa.deviation(2, 'A dialog with "Branch", …', 'no "Branch" field');
  });

  await qa.step(3, async () => {
    await d.getByRole('textbox', { name: 'Incision' }).fill(incision);
    await d.getByRole('combobox').selectOption('single');
    await d.getByRole('spinbutton').fill('50');
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    expect(await toastsAfter(page, mark)).toContain('Saved');
    await expect(desk.main.getByText(new RegExp(`^${incision} single 50%$`))).toBeVisible();
  });
});

qaTest('TC-APP008-038', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  await qa.step(1, async () => {
    await desk.open('policies', 'Billing policy');
    await desk.main.getByRole('button', { name: 'Save', exact: true }).click();
    const d = desk.dialog();
    const incision = qa.name('X sama');
    await d.getByRole('textbox', { name: 'Incision' }).fill(incision);
    await d.getByRole('spinbutton').fill('');
    const mark = await toastMark(page);
    await d.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}"`);
    if (toasts.includes('Saved')) {
      // Saved with no percentage: the server should refuse it.
      qa.deviation(1, 'Refused: "incision, department type, and percentage are required"', `"Saved." with the percentage empty (policy "${incision}")`);
      return;
    }
    await page.goto('/id/ot/policies');
    await expect(desk.main.getByText(incision)).toHaveCount(0);
  });
});

qaTest('TC-APP008-039', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  const day = todayWib(1);
  const room = qa.code('X-OK1');
  const p = procedure(qa, qa.prefix('X Apendektomi'));
  await request(page, { procedure: p, room, start: `${day}T08:00`, end: `${day}T09:00` });
  expect(await act(page, p, 'Place on calendar')).toContain('Scheduled');
  const slot = desk.main.getByRole('button').filter({ hasText: room });

  await qa.step(1, async () => {
    await page.goto('/id/ot');
    await page.getByRole('complementary').getByRole('link', { name: 'Calendar' }).first().click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible();
    await expect(desk.main.locator('input[type="date"]')).toHaveValue(todayWib());
  });

  await qa.step(2, async () => {
    await desk.main.locator('input[type="date"]').fill(day);
    await expect(slot).toContainText(`${day}T08:00`);
  });

  await qa.step(3, async () => {
    // "Shift one hour" is a drop zone: the slot is dragged onto it.
    const shift = desk.main.getByRole('button', { name: 'Shift one hour' });
    const mark = await toastMark(page);
    await slot.dragTo(shift);
    qa.note(3, '"Shift one hour" is a drop zone under the slots; the slot is dragged onto it');
    const toasts = await toastsAfter(page, mark);
    qa.note(3, `toast "${toasts.join(' / ')}"`);
    expect(toasts).not.toContain('Saved');
    await expect(slot).toContainText(`${day}T08:00`);
  });
  qa.blocked(3, 32);
});

qaTest('TC-APP008-040', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  const chronic = desk.main.getByRole('heading', { level: 2, name: 'Chronic pain' }).locator('xpath=..');
  const acute = desk.main.getByRole('heading', { level: 2, name: 'Acute pain' }).locator('xpath=..');
  const note = qa.name('X nyeri punggung 3 bulan');
  const med = qa.name('X Parasetamol');
  let chronicRefused = '';

  await qa.step(1, async () => {
    await page.goto('/id/ot');
    await page.getByRole('complementary').getByRole('link', { name: 'Pain' }).first().click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Pain' })).toBeVisible();
    await expect(chronic.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(acute.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  await qa.step(2, async () => {
    const patient = chronic.getByRole('textbox').first();
    qa.note(2, `the patient field is prefilled with the id "${await patient.inputValue()}"; it is kept (no patient id is shown on any screen)`);
    await chronic.getByRole('textbox', { name: 'Note' }).fill(note);
    const mark = await toastMark(page);
    await chronic.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    if (!toasts.includes('Saved') && (await desk.main.getByText(/^QA-nyeri punggung 3 bulan /).count())) {
      // The only patient id the screen offers already holds a chronic note of an earlier run; a second one is refused.
      chronicRefused = toasts.join(' / ');
      return;
    }
    expect(toasts).toContain('Saved');
    await expect(desk.main.getByText(note)).toBeVisible();
  });
  if (chronicRefused) qa.notRun(2, `the prefilled patient id already holds a chronic note from an earlier run and a second one is refused ("${chronicRefused}"); no other patient id is shown on any screen`);

  await qa.step(3, async () => {
    await acute.getByRole('textbox', { name: 'Medication' }).fill(med);
    await acute.getByRole('textbox', { name: 'Dose' }).fill('1 g');
    const mark = await toastMark(page);
    await acute.getByRole('button', { name: 'Save' }).click();
    expect(await toastsAfter(page, mark)).toContain('Saved');
    await expect(desk.main.getByText(new RegExp(`${med}.*1 g`))).toBeVisible();
  });
});

qaTest('TC-APP008-041', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  await qa.step(1, async () => {
    await desk.open('pain', 'Pain');
    const chronic = desk.main.getByRole('heading', { level: 2, name: 'Chronic pain' }).locator('xpath=..');
    const note = qa.name('X nyeri punggung 3 bulan');
    await chronic.getByRole('textbox').first().fill('');
    await chronic.getByRole('textbox', { name: 'Note' }).fill(note);
    const mark = await toastMark(page);
    await chronic.getByRole('button', { name: 'Save' }).click();
    const toasts = await toastsAfter(page, mark);
    expect(toasts).not.toContain('Saved');
    await page.goto('/id/ot/pain');
    await expect(desk.main.getByText(note)).toHaveCount(0);
    qa.note(1, `text shown: "${toasts.join(' / ') || 'none'}"`);
  });
});

qaTest('TC-APP008-042', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  await qa.step(1, async () => {
    await desk.open('pain', 'Pain');
    const acute = desk.main.getByRole('heading', { level: 2, name: 'Acute pain' }).locator('xpath=..');
    await acute.getByRole('textbox', { name: 'Medication' }).fill(qa.name('X Parasetamol'));
    await acute.getByRole('textbox', { name: 'Dose' }).fill('');
    const mark = await toastMark(page);
    await acute.getByRole('button', { name: 'Save' }).click();
    expect(await acute.getByRole('textbox', { name: 'Dose' }).evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(await toastsAfter(page, mark, 3_000)).toEqual([]);
  });
});

qaTest('TC-APP008-043', async ({ page, qa }) => {
  const desk = new OtDeskPage(page);
  await qa.step(1, async () => {
    await page.goto('/id/ot');
    await desk.main.getByRole('link', { name: 'Case', exact: true }).click();
    await expect(desk.main.getByRole('heading', { level: 1, name: 'Surgical case' })).toBeVisible();
    await expect(
      desk.main.getByText(
        'Pre-anesthesia, intraoperative handover, and recovery sit on the request. An elective caesarean needs a neonatal lead or a waiver. Discharge with a coding gap stays on the verifier queue.',
        { exact: true },
      ),
    ).toBeVisible();
  });
});

const SCREENS: [string, string, string][] = [
  ['TC-APP008-044', '/ot', 'Operation Theater'],
  ['TC-APP008-045', '/ot/calendar', 'Calendar'],
  ['TC-APP008-046', '/ot/case', 'Surgical case'],
  ['TC-APP008-047', '/ot/dossiers', 'Dossiers'],
  ['TC-APP008-048', '/ot/pain', 'Pain'],
  ['TC-APP008-049', '/ot/policies', 'Billing policy'],
  ['TC-APP008-050', '/ot/requests', 'OT requests'],
];
for (const [id, route, heading] of SCREENS) {
  qaTest(id, async ({ page, qa }) => {
    await qa.step(1, () => screenOpens(page, route, heading));
  });
}
