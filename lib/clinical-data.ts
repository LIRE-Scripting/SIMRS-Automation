import { expect } from '@playwright/test';
import type { DrugOrder } from '../pages/clinical/ConsultationPage';
import { catalogueOf } from './qa-data';

/**
 * Shared data of 03 Patient Care (00-test-data.xlsx | Catalogue, rows of
 * application "03 Patient Care"), read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('03').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 03 row "${shortName}"`);
  return r;
}

const FIELDS: (keyof DrugOrder)[] = [
  'Drug', 'Generic', 'Form', 'Strength unit', 'Strength', 'Route', 'Age band', 'Dose unit', 'Dose type', 'Dose', 'Frequency', 'Clock times', 'Days',
];

/**
 * "Drug Paracetamol 500mg Tablet; Generic Paracetamol; …; Days 5. Quantity 10"
 * -> { Drug: 'Paracetamol 500mg Tablet', Generic: 'Paracetamol', … } and the quantity.
 */
function parseOrder(text: string): { order: DrugOrder; quantity?: string } {
  const [body, quantity] = text.split(/\.\s*Quantity\s+/);
  const order: Partial<DrugOrder> = {};
  for (const part of body.split(';').map((p) => p.trim())) {
    const key = FIELDS.find((f) => part.startsWith(`${f} `));
    if (!key) throw new Error(`Unknown order field in "${part}" (00-test-data.xlsx | Catalogue)`);
    order[key] = part.slice(key.length + 1).replace(/^"|"$/g, '');
  }
  return { order: order as DrugOrder, quantity: quantity?.trim() };
}

const standard = parseOrder(row('Standard order').what);

/** Interaction pairs: "Warning pair: A with B. Blocking pair: C with D. …" */
const pairs = row('Interaction pairs').what.match(/Warning pair: (.+?) with (.+?)\. Blocking pair: (.+?) with (.+?)\./);
if (!pairs) throw new Error('00-test-data.xlsx | Catalogue "Interaction pairs" has another wording');

/** "Drug Meropenem 1g Injection with Restriction level "High", Restriction type "Antibiotic", Restriction item "Meropenem"" */
const restricted = row('Restricted order').what.match(
  /Drug (.+?) with Restriction level "(.+?)", Restriction type "(.+?)", Restriction item "(.+?)"/,
);
if (!restricted) throw new Error('00-test-data.xlsx | Catalogue "Restricted order" has another wording');

export const CLINICAL = {
  pt1: { name: row('PT-1').what.match(/"([^"]+)"/)![1] },
  twins: { name: row('PT-2, PT-3').what.match(/"([^"]+)"/)![1] },
  standardOrder: standard.order,
  standardQuantity: standard.quantity,
  warningPair: [pairs[1], pairs[2]] as const,
  blockingPair: [pairs[3], pairs[4]] as const,
  restricted: { drug: restricted[1], level: restricted[2], type: restricted[3], item: restricted[4] },
} as const;

/**
 * A full formulary for a drug the workbook names only by its label ("Omeprazole
 * 20mg Kapsul", "Ibuprofen 400mg Tablet", "Amlodipine 5mg Tablet", "Meropenem
 * 1g Injection"): generic, strength and form are read from the label; the
 * rest is the standard order's (open question Q19).
 */
export function orderFor(label: string): DrugOrder {
  const m = label.match(/^(\S+)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/);
  if (!m) throw new Error(`Cannot read generic, strength and form from "${label}"`);
  return { ...CLINICAL.standardOrder, Drug: label, Generic: m[1], Strength: m[2], 'Strength unit': m[3], Form: m[4] };
}

/** PT-1's date of birth: the catalogue says "with a date of birth" without one; 01's PT-1 date is used (Q19). */
export const PT1_DATE_OF_BIRTH = (() => {
  const d = catalogueOf('01').find((c) => c.shortName === 'PT-1')!.what.match(/\d{4}-\d{2}-\d{2}/)![0];
  expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  return d;
})();
