/**
 * The Excel reports are written in Indonesian, the language of the testers
 * (the suite itself runs on /id, lib/i18n). This is the vocabulary of the
 * report builders: statuses, sheet names, column headers and the sentences
 * they write themselves. Texts taken from elsewhere (the reference workbooks,
 * the blocker lists, the notes written by the tests) are kept as they are.
 * run-summary.json and the docs keep the English statuses.
 */

/** Statuses of a test (summary) and of a step (result workbooks, the template's list). */
export const STATUS_ID: Record<string, string> = {
  Passed: 'Lulus',
  Deviation: 'Deviasi',
  Failed: 'Gagal',
  Blocked: 'Terblokir',
  'Not run': 'Belum dijalankan',
  'Not Run': 'Belum dijalankan',
};

/** The English status of an Indonesian one (for reading a result workbook back). */
export function statusFromId(text: string): string {
  const hit = Object.entries(STATUS_ID).find(([, id]) => id === text);
  return hit ? (hit[0] === 'Not run' ? 'Not Run' : hit[0]) : text;
}

export const statusId = (s: string): string => STATUS_ID[s] ?? s;

/** Sentences the builders write, in the order they are tried; the first that matches is used. */
const SENTENCES: [RegExp, string][] = [
  [/^Test written, not run yet: a spec in tests\/modules declares it, but no results file of this run has it$/, 'Test sudah ditulis, belum dijalankan: sebuah spec di tests/modules mendeklarasikannya, tetapi belum ada file hasil run ini yang memuatnya'],
  [/^No test: the plan makes it "automate" \((.+?)\) but no spec in tests\/modules declares it yet$/, 'Belum ada test: rencana menandainya "automate" ($1), tetapi belum ada spec di tests/modules yang mendeklarasikannya'],
  [/^Every step not run: /, 'Semua langkah tidak dijalankan: '],
  [/^Passed; not run: /, 'Lulus; tidak dijalankan: '],
  [/^skipped$/, 'dilewati'],
  [/^site defect \(the server answered with an error\)$/, 'cacat situs (server menjawab dengan error)'],
  [/^check: locator or screen content \(automation or site\)$/, 'cek: locator atau isi layar (otomasi atau situs)'],
  [/^check: timeout \(slow page or a missing wait\)$/, 'cek: timeout (halaman lambat atau kurang menunggu)'],
  [/^check: the value on screen differs from the expected one$/, 'cek: nilai di layar berbeda dari yang diharapkan'],
  [/^check: see the error$/, 'cek: lihat error'],
  [/^Known: blocker /, 'Diketahui: blocker '],
  [/^Negative\/boundary test \(input wrong on purpose or at a limit; check the request\): a refusal should be a message, not HTTP 500$/, 'Test negatif/batas (input sengaja salah atau di batas; cek request): penolakan seharusnya berupa pesan, bukan HTTP 500'],
  [/^Positive test \(input meant to be valid\): server error, not a known blocker$/, 'Test positif (input dimaksudkan valid): error server, bukan blocker yang diketahui'],
  [/^earlier run of the test \(rerun later\)$/, 'run sebelumnya dari test ini (jalankan ulang nanti)'],
  [/^no screenshot$/, 'tidak ada tangkapan layar'],
];

/** A sentence of a builder in Indonesian; other texts unchanged. */
export function sentenceId(text: string): string {
  for (const [re, id] of SENTENCES) if (re.test(text)) return text.replace(re, id);
  return text;
}
