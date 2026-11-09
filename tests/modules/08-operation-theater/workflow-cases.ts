import { expect, qaTest, test, type Qa } from '../../../fixtures/e2e';
import { installToastRecorder, toastMark, SERVER_FAILURE } from '../../../lib/assertions';
import { OtDeskPage, OtRequestsPage } from '../../../pages/ot/OtPages';
import { act, cellsOf, dossier, full, procedure, request, toastsAfter } from './helpers';
import type { QaBody } from '../../../fixtures/e2e';

/** The test cases of workflow.spec.ts, shared with the end-to-end chains (chain.run). */

export const SERVER_ERROR = SERVER_FAILURE;

export const NOTE = 'X Operasi selesai tanpa penyulit';

export const REASON = 'X pasien demam';

/** A refusal: the status is unchanged; the text shown is recorded. */
export async function refused(qa: Qa, step: number, page: import('@playwright/test').Page, p: string, before: string, toasts: string[], serverText: string) {
  expect((await cellsOf(page, p))[2]).toBe(before);
  qa.note(step, `text shown: "${toasts.join(' / ') || 'none'}" (the server refuses with "${serverText}")`);
}

export const TC_APP008_025: QaBody = async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const r = full(qa);

  await qa.step(1, async () => {
    await ot.open();
    await ot.openNew();
    for (const f of ['Procedures display', 'Patient', 'Room', 'Start', 'End', 'Chief surgeon'] as const) await expect(ot.field(f)).toBeVisible();
    await expect(ot.amount()).toBeVisible();
    if (!(await ot.dialog.getByRole('textbox', { name: 'Branch' }).or(ot.dialog.getByRole('combobox', { name: 'Branch' })).count())) {
      qa.deviation(1, 'A dialog with "Branch", …', 'no "Branch" field (the request takes the branch of the session)');
    }
  });

  await qa.step(2, async () => {
    await ot.fill(r);
    const mark = await toastMark(page);
    await ot.save().click();
    expect(await toastsAfter(page, mark)).toContain('Request created');
    const c = await cellsOf(page, r.procedure);
    qa.note(2, `Status "${c[2]}" (no separate phase is shown)`);
    expect(c[2]).toBe('pending');
  });

  await qa.step(3, async () => {
    const toasts = await act(page, r.procedure, 'Place on calendar');
    qa.note(3, `toast "${toasts.join(' / ')}"`);
    expect(toasts).toContain('Scheduled');
  });

  await qa.step(4, async () => {
    const desk = new OtDeskPage(page);
    await desk.open('calendar', 'Calendar');
    await desk.main.locator('input[type="date"]').fill(r.day);
    const slot = desk.main.getByRole('button').filter({ hasText: r.room });
    await expect(slot).toHaveCount(1);
    await expect(slot).toContainText(`${r.day}T08:00`);
    qa.note(4, `slot: ${(await slot.innerText()).replace(/\s+/g, ' ')}; the end time is not shown`);
  });
};

export const TC_APP008_026: QaBody = async ({ page, qa }) => {
  const p = procedure(qa, qa.prefix('X Apendektomi'));
  await request(page, { procedure: p });
  await qa.step(1, async () => {
    const toasts = await act(page, p, 'Place on calendar');
    expect(toasts).not.toContain('Scheduled');
    qa.note(1, `text shown: "${toasts.join(' / ')}" (the server refuses with "room, start, and end are required")`);
  });
};

/** A request taken through validate, pre-anaesthesia and start; returns its procedure text. */
export async function started(page: import('@playwright/test').Page, qa: Qa, until: 'validated' | 'pre' | 'started' | 'in_progress'): Promise<string> {
  const p = procedure(qa, qa.prefix('X Apendektomi'));
  await request(page, { procedure: p });
  const order = ['Validate', 'Pre-anesthesia', 'Start', 'In progress'] as const;
  const stop = { validated: 1, pre: 2, started: 3, in_progress: 4 }[until];
  for (const a of order.slice(0, stop)) expect((await act(page, p, a)).some((t) => SERVER_ERROR.test(t))).toBe(false);
  return p;
}

export const TC_APP008_027: QaBody = async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa, qa.prefix('X Apendektomi'));
  await request(page, { procedure: p });
  const status = async () => (await cellsOf(page, p))[2];

  await qa.step(1, async () => {
    await act(page, p, 'Validate');
    expect(await status()).toBe('validated');
  });

  await qa.step(2, async () => {
    const toasts = await act(page, p, 'Pre-anesthesia');
    expect(toasts.some((t) => SERVER_ERROR.test(t))).toBe(false);
    qa.note(2, `Status after "Pre-anesthesia": "${await status()}" (no phase text for pre-anaesthesia)`);
  });

  await qa.step(3, async () => {
    await act(page, p, 'Start');
    expect(await status()).toBe('validated · started');
    await act(page, p, 'In progress');
    expect(await status()).toBe('validated · in_progress');
  });

  await qa.step(4, async () => {
    await ot.open();
    await ot.note.fill(qa.prefix(NOTE));
    await act(page, p, 'Complete');
    expect(await status()).toBe('validated · completed');
    const shown = await (await ot.row(p)).innerText();
    if (!shown.includes(qa.prefix(NOTE))) qa.note(4, 'the note is not shown in the list; it is kept on the request only');
  });
};

export const TC_APP008_028: QaBody = async ({ page, qa }) => {
  await qa.step(1, async () => {
    const p = await started(page, qa, 'validated');
    await refused(qa, 1, page, p, 'validated', await act(page, p, 'Validate'), 'validate only from pending');
  });
  await qa.step(2, async () => {
    const p = procedure(qa, qa.prefix('X Apendektomi'));
    await request(page, { procedure: p });
    await refused(qa, 2, page, p, 'pending', await act(page, p, 'Pre-anesthesia'), 'pre-anesthesia needs a validated request');
  });
  await qa.step(3, async () => {
    const p = await started(page, qa, 'validated');
    await refused(qa, 3, page, p, 'validated', await act(page, p, 'Start'), 'pre-anesthesia required');
  });
  await qa.step(4, async () => {
    const p = await started(page, qa, 'pre');
    await refused(qa, 4, page, p, 'validated', await act(page, p, 'In progress'), 'start the surgery first');
  });
  await qa.step(5, async () => {
    const p = await started(page, qa, 'started');
    const ot = new OtRequestsPage(page);
    await ot.open();
    await ot.note.fill(qa.prefix(NOTE));
    await refused(qa, 5, page, p, 'validated · started', await act(page, p, 'Complete'), 'surgery is not in progress');
  });
};

export const TC_APP008_029: QaBody = async ({ page, qa }) => {
  const p = await started(page, qa, 'in_progress');
  await qa.step(1, async () => {
    const ot = new OtRequestsPage(page);
    await ot.open();
    await ot.note.fill('');
    await refused(qa, 1, page, p, 'validated · in_progress', await act(page, p, 'Complete'), 'operation note required');
  });
};

export const TC_APP008_030: QaBody = async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const a = procedure(qa, qa.prefix('X Apendektomi'));
  const b = procedure(qa, qa.prefix('X Apendektomi'));
  for (const p of [a, b]) await request(page, { procedure: p });

  await qa.step(1, async () => {
    await ot.open();
    await ot.reason.fill(qa.prefix(REASON));
    await act(page, a, 'Defer');
    expect((await cellsOf(page, a))[2]).toBe('deferred');
  });

  await qa.step(2, async () => {
    await act(page, a, 'Resume');
    expect((await cellsOf(page, a))[2]).toBe('pending');
  });

  await qa.step(3, async () => {
    await ot.open();
    await ot.reason.fill(qa.prefix(REASON));
    await act(page, b, 'Cancel request');
    expect((await cellsOf(page, b))[2]).toBe('cancelled');
  });
};

export const TC_APP008_031: QaBody = async ({ page, qa }) => {
  const p = procedure(qa, qa.prefix('X Apendektomi'));
  await request(page, { procedure: p });
  await qa.step(1, async () => {
    const ot = new OtRequestsPage(page);
    await ot.open();
    await ot.reason.fill('');
    await refused(qa, 1, page, p, 'pending', await act(page, p, 'Defer'), 'reason required');
    await refused(qa, 1, page, p, 'pending', await act(page, p, 'Cancel request'), 'reason required');
  });
};

export const TC_APP008_032: QaBody = async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  await qa.step(1, async () => {
    const p = procedure(qa, qa.prefix('X Apendektomi'));
    await request(page, { procedure: p });
    await refused(qa, 1, page, p, 'pending', await act(page, p, 'Resume'), 'resume only a deferred request');
  });
  await qa.step(2, async () => {
    const p = procedure(qa, qa.prefix('X Apendektomi'));
    await request(page, { procedure: p });
    await ot.open();
    await ot.reason.fill(qa.prefix(REASON));
    await act(page, p, 'Defer');
    expect((await cellsOf(page, p))[2]).toBe('deferred');
    await ot.reason.fill(qa.prefix(REASON));
    await refused(qa, 2, page, p, 'deferred', await act(page, p, 'Defer'), 'defer refused');
  });
  await qa.step(3, async () => {
    const p = await started(page, qa, 'in_progress');
    await ot.open();
    await ot.note.fill(qa.prefix(NOTE));
    await act(page, p, 'Complete');
    expect((await cellsOf(page, p))[2]).toBe('validated · completed');
    await ot.reason.fill(qa.prefix(REASON));
    await refused(qa, 3, page, p, 'validated · completed', await act(page, p, 'Cancel request'), 'cancel refused after completed');
  });
};

export const TC_APP008_033: QaBody = async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  const p = procedure(qa, qa.prefix('X Apendektomi'));
  const patient = qa.name('X Pasien OT 01');
  await request(page, { procedure: p, patient });
  const d = await dossier(page, qa);
  qa.note(1, `dossier "${d.name}", id ${d.id} read from the Dossiers list`);

  await qa.step(1, async () => {
    await ot.open();
    await ot.dossier.fill(d.id);
    const toasts = await act(page, p, 'Record dossier');
    qa.note(1, `toast "${toasts.join(' / ')}"; row afterwards: ${(await cellsOf(page, p)).slice(0, 5).join(' | ')}`);
    expect(toasts.some((t) => SERVER_ERROR.test(t))).toBe(false);
  });

  await qa.step(2, async () => {
    await page.goto('/id/pharmacy/orders');
    const rows = page.getByRole('main').getByRole('table').getByRole('row').filter({ hasText: patient });
    qa.note(2, `Pharmacy Orders rows for "${patient}": ${(await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' // ') || 'none'}`);
  });
};

export const TC_APP008_034: QaBody = async ({ page, qa }) => {
  const ot = new OtRequestsPage(page);
  await qa.step(1, async () => {
    const p = procedure(qa, qa.prefix('X Apendektomi'));
    await request(page, { procedure: p, patient: qa.name('X Pasien OT 01') });
    await ot.open();
    await ot.dossier.fill('');
    await refused(qa, 1, page, p, 'pending', await act(page, p, 'Record dossier'), 'dossier required');
  });
  await qa.step(2, async () => {
    const p = procedure(qa, qa.prefix('X Apendektomi'));
    await request(page, { procedure: p });
    const d = await dossier(page, qa);
    await ot.open();
    await ot.dossier.fill(d.id);
    await refused(qa, 2, page, p, 'pending', await act(page, p, 'Record dossier'), 'patient name required');
  });
};
