import { catalogueOf } from './qa-data';

/**
 * Shared data of 14 Hospital Accounts (00-test-data.xlsx | Catalogue,
 * application "14 Hospital Accounts"), read from the catalogue text.
 */
function row(app: string, shortName: string) {
  const r = catalogueOf(app).find((c) => c.shortName === shortName);
  if (!r) throw new Error(`00-test-data.xlsx | Catalogue has no ${app} row "${shortName}"`);
  return r;
}

const settings = row('14', 'Counter settings BR-A').what.match(
  /Tax rate (\d+)%, Discount cap ([\d,]+), Rounding (\d+), Refund limit ([\d,]+), Cash limit (\d+) \(off\), Identity threshold (\d+) \(off\)/,
);
if (!settings) throw new Error('00-test-data.xlsx | Catalogue "Counter settings BR-A" has another wording');
const plain = (s: string) => s.replace(/,/g, '');

/** "Rules for BR-A" of 05 Pharmacy: outpatient price and the cashier's maximum line discount. */
const rules = row('05', 'Rules for BR-A').what.match(/site margin (\d+)%, tax (\d+)%.*"Maximum line discount \(%\)" (\d+)/);
if (!rules) throw new Error('00-test-data.xlsx | Catalogue "Rules for BR-A" (05) has another wording');

export const BILLING = {
  counter: {
    'Tax rate (%)': settings[1],
    'Discount cap (IDR)': plain(settings[2]),
    Rounding: settings[3],
    'Refund limit (IDR)': plain(settings[4]),
    'Cash limit (IDR)': settings[5],
    'Identity threshold (IDR)': settings[6],
    'Maximum line discount (%)': rules[3],
  },
  itemPrice: { margin: rules[1], tax: rules[2] },
  bpjs: { name: row('14', 'PT-BPJS').what.match(/"([^"]+)"/)![1] },
  none: { name: row('14', 'PT-NONE').what.match(/"([^"]+)"/)![1] },
} as const;
