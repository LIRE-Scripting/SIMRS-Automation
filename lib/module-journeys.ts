import inventory from '../data/module-journeys/inventory.json';
import ris from '../data/module-journeys/ris.json';
import diet from '../data/module-journeys/diet.json';
import budget from '../data/module-journeys/budget.json';
import cssd from '../data/module-journeys/cssd.json';
import finance from '../data/module-journeys/finance.json';
import emergency from '../data/module-journeys/emergency.json';
import clinical from '../data/module-journeys/clinical.json';
import services from '../data/module-journeys/services.json';
import sourcing from '../data/module-journeys/sourcing.json';
import maintenance from '../data/module-journeys/maintenance.json';
import appointment from '../data/module-journeys/appointment.json';
import adt from '../data/module-journeys/adt.json';
import bloodbank from '../data/module-journeys/bloodbank.json';
import ot from '../data/module-journeys/ot.json';
import procurement from '../data/module-journeys/procurement.json';
import hr from '../data/module-journeys/hr.json';
import laboratory from '../data/module-journeys/laboratory.json';
import billing from '../data/module-journeys/billing.json';
import mrd from '../data/module-journeys/mrd.json';
import housekeeping from '../data/module-journeys/housekeeping.json';

/** One checklist step, exactly as written on the workbook "Steps" sheet. */
export interface ModuleStep {
  step: number;
  action: string;
  expected: string;
}

/** One test journey for a module suite, as written on the "Journeys" sheet. */
export interface ModuleJourney {
  id: string;
  journey: string;
  path: string;
  priority: string;
  role: string;
  goal: string;
  preconditions: string;
  testData: string;
  expectedEnd: string;
  steps: ModuleStep[];
}

const all: ModuleJourney[] = [
  ...(inventory as ModuleJourney[]),
  ...(ris as ModuleJourney[]),
  ...(diet as ModuleJourney[]),
  ...(budget as ModuleJourney[]),
  ...(cssd as ModuleJourney[]),
  ...(finance as ModuleJourney[]),
  ...(emergency as ModuleJourney[]),
  ...(clinical as ModuleJourney[]),
  ...(services as ModuleJourney[]),
  ...(sourcing as ModuleJourney[]),
  ...(maintenance as ModuleJourney[]),
  ...(appointment as ModuleJourney[]),
  ...(adt as ModuleJourney[]),
  ...(bloodbank as ModuleJourney[]),
  ...(ot as ModuleJourney[]),
  ...(procurement as ModuleJourney[]),
  ...(hr as ModuleJourney[]),
  ...(laboratory as ModuleJourney[]),
  ...(billing as ModuleJourney[]),
  ...(mrd as ModuleJourney[]),
  ...(housekeeping as ModuleJourney[]),
];

export const moduleJourneys = all;

export function moduleJourneyById(id: string): ModuleJourney {
  const found = all.find((j) => j.id === id);
  if (!found) throw new Error(`Journey ${id} not found in data/module-journeys/`);
  return found;
}

/** Journeys of one module prefix (e.g. "INV"), in workbook order. */
export function moduleJourneysByPrefix(prefix: string): ModuleJourney[] {
  return all.filter((j) => j.id.startsWith(`${prefix}-JRN-`));
}
