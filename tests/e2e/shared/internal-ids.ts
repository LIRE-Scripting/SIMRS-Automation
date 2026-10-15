import { expect, type Page } from '@playwright/test';
import { registerPatient } from '../../../lib/ambulatory-data';
import { RegisteredPatientsPage } from '../../../pages/ambulatory/RegisteredPatientsPage';
import { BedsPage } from '../../../pages/inpatient/InpatientPages';

/**
 * Internal ids (UUID) that several screens ask for but no screen shows. They
 * are read from the answers the screens get from the server (Q27): the patient
 * search of Registered patients and the list of Bed management.
 */

/** Waits for any answer that carries `marker` and returns its body (tried while `act` repeats). */
async function answerWith(page: Page, marker: string, act: () => Promise<void>): Promise<string> {
  // The body is kept as soon as it is seen: a later navigation makes it unreadable.
  let body = '';
  for (let i = 0; i < 3 && !body; i++) {
    const answer = page
      .waitForResponse(
        async (r) => {
          const text = await r.text().catch(() => '');
          if (text.includes(marker)) body = text;
          return !!body;
        },
        { timeout: 10_000 },
      )
      .catch(() => null);
    await act();
    await answer;
  }
  expect(body, `an answer that carries ${marker}`).not.toBe('');
  return body;
}

/** The item with `key` = `value` in a server-action answer ("1:{"items":[…]}"). */
function itemOf<T extends Record<string, unknown>>(body: string, key: string, value: string): T {
  for (const line of body.split('\n')) {
    const json = line.replace(/^[0-9a-z]+:/, '');
    try {
      const data = JSON.parse(json) as { items?: T[] } | T[];
      const items = Array.isArray(data) ? data : data.items ?? [];
      const it = items.find((x) => x[key] === value);
      if (it) return it;
    } catch {
      // not JSON
    }
  }
  throw new Error(`No item with ${key} "${value}" in the answer`);
}

/** A registered test patient with its internal id. */
export async function patientWithId(page: Page, excelName: string, token: string): Promise<{ id: string; fullName: string; mrn: string }> {
  const p = await registerPatient(page, excelName, token);
  const reg = new RegisteredPatientsPage(page);
  const body = await answerWith(page, `"mrn":"${p.mrn}"`, async () => {
    await reg.open();
    await reg.search(p.mrn);
  });
  const id = itemOf<{ id: string; mrn: string }>(body, 'mrn', p.mrn).id as string;
  return { id, ...p };
}

/** A new bed of Bed management (Inpatient) with its internal id. */
export async function bedWithId(page: Page, no: string, description = 'QA IGD'): Promise<{ id: string; no: string }> {
  const beds = new BedsPage(page);
  await beds.open();
  await beds.add({ no, description });
  const body = await answerWith(page, `"${no}"`, async () => {
    await beds.open();
    await beds.search(no);
  });
  const line = body.split('\n').find((l) => l.includes(`"${no}"`))!;
  const m = line.match(new RegExp(`\\{[^{}]*"${no}"[^{}]*\\}`));
  const id = m?.[0].match(/"id":"([0-9a-f-]{36})"/)?.[1];
  expect(id, `the id of bed ${no}`).toBeTruthy();
  return { id: id!, no };
}
