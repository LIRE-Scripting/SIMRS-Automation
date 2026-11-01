import type { Locator } from '@playwright/test';

/**
 * Reads a barcode drawn by the site as an SVG of black <rect> bars (MRN,
 * admission number, lab sample ID: Code 39, narrow 1 and wide 3 units, seen
 * 2026-11-01), the way a barcode reader would: from the bars and the gaps
 * between them, not from the text printed under it. Stands for "Scans the
 * printed barcode" of the workbooks.
 */

// Code 39: 9 elements per character (bar, space, … bar), 1 = wide.
const CODE39: Record<string, string> = {
  '000110100': '0', '100100001': '1', '001100001': '2', '101100000': '3', '000110001': '4',
  '100110000': '5', '001110000': '6', '000100101': '7', '100100100': '8', '001100100': '9',
  '100001001': 'A', '001001001': 'B', '101001000': 'C', '000011001': 'D', '100011000': 'E',
  '001011000': 'F', '000001101': 'G', '100001100': 'H', '001001100': 'I', '000011100': 'J',
  '100000011': 'K', '001000011': 'L', '101000010': 'M', '000010011': 'N', '100010010': 'O',
  '001010010': 'P', '000000111': 'Q', '100000110': 'R', '001000110': 'S', '000010110': 'T',
  '110000001': 'U', '011000001': 'V', '111000000': 'W', '010010001': 'X', '110010000': 'Y',
  '011010000': 'Z', '010000101': '-', '110000100': '.', '011000100': ' ', '010010100': '*',
  '010101000': '$', '010100010': '/', '010001010': '+', '000101010': '%',
};

/** The bars of an SVG barcode as [x, width], left to right. */
export async function barsOf(svg: Locator): Promise<[number, number][]> {
  return svg.evaluate((s) =>
    Array.from(s.querySelectorAll('rect'))
      .filter((r) => (r.getAttribute('fill') ?? '').toLowerCase() === 'black' || (r.getAttribute('fill') ?? '') === '#000' || (r.getAttribute('fill') ?? '') === '#000000')
      .map((r) => [Number(r.getAttribute('x') ?? 0), Number(r.getAttribute('width') ?? 0)] as [number, number])
      .sort((a, b) => a[0] - b[0]),
  );
}

/** Decodes Code 39 bars ([x, width]); throws when they are no Code 39 symbol. */
export function decodeCode39(bars: [number, number][]): string {
  // Element widths: bar, gap, bar, gap, …
  const widths: number[] = [];
  bars.forEach(([x, w], i) => {
    if (i > 0) widths.push(x - (bars[i - 1][0] + bars[i - 1][1]));
    widths.push(w);
  });
  const narrow = Math.min(...widths.filter((w) => w > 0));
  const wide = (w: number) => (w > narrow * 1.5 ? '1' : '0');
  let out = '';
  for (let i = 0; i + 9 <= widths.length; i += 10) {
    const pattern = widths.slice(i, i + 9).map(wide).join('');
    const ch = CODE39[pattern];
    if (ch === undefined) throw new Error(`not a Code 39 character at element ${i}: ${pattern}`);
    out += ch;
  }
  if (!out.startsWith('*') || !out.endsWith('*')) throw new Error(`Code 39 without its start and stop "*": ${out}`);
  return out.slice(1, -1);
}

/** What a reader returns for the barcode drawn in `svg`. */
export async function scan(svg: Locator): Promise<string> {
  return decodeCode39(await barsOf(svg));
}
