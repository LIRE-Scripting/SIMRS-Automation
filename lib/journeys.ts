import journeysJson from '../data/journeys.json';

/** One checklist step, exactly as written on the "Steps" sheet. */
export interface Step {
  step: number;
  action: string;
  expected: string;
}

/** One test journey, exactly as written on the "Journeys" sheet. */
export interface Journey {
  id: string;
  journey: string;
  path: string;
  priority: string;
  role: string;
  goal: string;
  preconditions: string;
  testData: string;
  expectedEnd: string;
  steps: Step[];
}

export const journeys = journeysJson as Journey[];

export function journeyById(id: string): Journey {
  const found = journeys.find((j) => j.id === id);
  if (!found) throw new Error(`Journey ${id} not found in data/journeys.json`);
  return found;
}

