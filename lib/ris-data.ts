import { catalogueOf } from './qa-data';

/**
 * Shared data of 12 RIS (00-test-data.xlsx | Catalogue, application "12 RIS"),
 * read from the catalogue text.
 */
function row(shortName: string) {
  const r = catalogueOf('12').find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no 12 row "${shortName}"`);
  return r;
}

const full = row('Full order').what.match(
  /Order ref (\S+); Accession no (\S+); Study description "([^"]+)"; Study date today (\d{2}:\d{2}); Reported by "([^"]+)"; Reported date today (\d{2}:\d{2}); Image link (\S+); Report link (\S+)$/,
);
if (!full) throw new Error('00-test-data.xlsx | Catalogue "Full order" (12) has another wording');

export const RIS = {
  full: { ref: full[1], accession: full[2], study: full[3], studyTime: full[4], reportedBy: full[5], reportedTime: full[6], image: full[7], report: full[8] },
  short: { study: row('Short order').what.match(/"([^"]+)"/)![1] },
} as const;
