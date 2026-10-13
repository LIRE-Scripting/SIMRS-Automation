import scanJson from '../data/module-scan/rs.json';

/** One scanned screen of a module (hub or sub screen). */
export interface ScanScreen {
  label: string;
  data: {
    path?: string;
    requested?: string;
    headings?: string[];
    tables?: { rows: number; headers: string[]; sample: string }[];
    empty?: string | null;
    redirectedToLogin?: boolean;
  } | null;
  shot?: string;
}

/** One module with all of its scanned screens. */
export interface ScanModule {
  slug: string;
  name: string;
  href: string;
  screens: ScanScreen[];
}

export interface ModuleScan {
  admin: string;
  username: string;
  loginOk: boolean;
  modules: ScanModule[];
}

/** Result of the rs.admin module scan (26 modules / 127 screens). */
export const rsScan = scanJson as unknown as ModuleScan;
