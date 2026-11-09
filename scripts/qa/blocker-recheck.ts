/**
 * How each blocker was last re-checked on the site, in Indonesian: the blocker watch
 * (tests/modules/00-access/blocker-watch.spec.ts, .qa-state/blocker-watch.json), a look by hand,
 * or the tests themselves (a found blocker its tests mark only when the symptom is seen). Used by
 * the summary's sheet Blocker and docs/qa/blocker.md.
 */
import fs from 'node:fs';

/** The blocker watch (tests/modules/00-access/blocker-watch.spec.ts): the newest look at each watched blocker. */
export const WATCH: Record<string, { at: string; holds: boolean; symptom: string }> = fs.existsSync('.qa-state/blocker-watch.json') ? JSON.parse(fs.readFileSync('.qa-state/blocker-watch.json', 'utf8')) : {};
/** Blockers re-checked by hand on the site, with no watch (2026-11-01). */
const RECHECKED: Record<number, string> = {
  1: 'Masih berlaku (2026-11-01): test login lewat /apps sebagai jalan keluar.',
  15: 'Sudah dijawab: izin menulis diberikan 2026-10-21 (QA_ALLOW_WRITES).',
  16: 'Sudah dijawab: akun per peran U3–U8 dibuat 2026-10-20.',
  6: 'Dicek 2026-11-01: masih berlaku. "Record code" dengan "Semua cabang" menjawab "The code could not be recorded".',
  9: 'Belum bisa dicek: registrasi IGD Podomoro butuh konfigurasi registrasi (blocker 13).',
  38: 'Masih berlaku (2026-11-09): dicek setiap run oleh TC-APP018-039, dan dicoba manual di User Rights; tetap "Failed to save rights.".',
  22: 'Dicek otomatis oleh test-nya di setiap run: test gagal bila peringatan interaksi obat muncul.',
  14: 'Bukan cacat situs: journey butuh data dari aplikasi lain; dijalankan lewat rantai E2E dan data buatan test.',
};
export const recheckOf = (no: number, source: string): string => {
  const w = WATCH[String(no)];
  if (w) return `${w.holds ? 'Masih berlaku' : 'TAMPAKNYA SUDAH SELESAI'} (pengawas blocker, ${w.at.slice(0, 10)}): ${w.symptom.slice(0, 120)}`;
  if (RECHECKED[no]) return RECHECKED[no];
  // Found blockers that some tests mark without trying the step (no watch yet).
  if ([18, 26, 29, 36].includes(no)) return 'Sebagian test menandainya tanpa mencoba langkahnya dan belum ada pengawas: belum dicek ulang sejak ditemukan.';
  return source.startsWith('docs/') ? 'Dicek otomatis oleh test-nya di setiap run (langkah dicoba, ditandai blocker hanya bila gejalanya muncul).' : '';
};

