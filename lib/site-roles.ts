/**
 * Role accounts that exist on the site (Settings | Users, given by the requester on 2026-11-09): one rs.<role>
 * login per hospital role, all Active, signing in with the shared password of .env (QA_PASSWORD).
 * They stand for the workbook roles where a test needs the role itself rather than an administrator.
 */
export interface SiteRole {
  login: string;
  name: string;
  email: string;
  role: string;
}

export const SITE_ROLES = {
  roster: { login: 'rs.roster', name: 'Eko Prasetyo', email: 'rs.roster@klikmed.local', role: 'roster' },
  bpjs: { login: 'rs.bpjs', name: 'Fitriani Ningsih', email: 'rs.bpjs@klikmed.local', role: 'bpjs' },
  budget: { login: 'rs.budget', name: 'Hadi Santoso', email: 'rs.budget@klikmed.local', role: 'budget' },
  radiografer: { login: 'rs.radiografer', name: 'Hendra Saputra', email: 'rs.radiografer@klikmed.local', role: 'radiografer' },
  procurement: { login: 'rs.procurement', name: 'Irfan Maulana', email: 'rs.procurement@klikmed.local', role: 'procurement' },
  gudang: { login: 'rs.gudang', name: 'Joko Susanto', email: 'rs.gudang@klikmed.local', role: 'gudang' },
  pendaftaran: { login: 'rs.pendaftaran', name: 'Maya Anggraini', email: 'rs.pendaftaran@klikmed.local', role: 'pendaftaran' },
  ok: { login: 'rs.ok', name: 'Ns. Putri Amelia', email: 'rs.ok@klikmed.local', role: 'ok' },
  igd: { login: 'rs.igd', name: 'Ns. Rudi Hartono', email: 'rs.igd@klikmed.local', role: 'igd' },
  perawat: { login: 'rs.perawat', name: 'Ns. Wulan Utami', email: 'rs.perawat@klikmed.local', role: 'perawat' },
  // The list given ends at the e-mail: role and status are taken to follow the others.
  gizi: { login: 'rs.gizi', name: 'Nur Aisyah', email: 'rs.gizi@klikmed.local', role: 'gizi' },
} as const satisfies Record<string, SiteRole>;

export type SiteRoleKey = keyof typeof SITE_ROLES;
