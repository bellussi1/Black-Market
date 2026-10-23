import type { Crop } from './print-reader';

/** Grid valleys sit to the right of long quantity prefixes in the game font. */
export function quantityTextCrop(cell: Crop, mode: 'storage' | 'inventory'): Crop {
  if (mode === 'inventory')
    return {
      left: cell.left + cell.width * 0.03,
      top: cell.top + cell.height * 0.45,
      width: cell.width * 0.94,
      height: cell.height * 0.5,
    };
  const left = Math.max(0, cell.left - cell.width * 0.12);
  const right = cell.left + cell.width * 0.86;
  return {
    left,
    top: cell.top + cell.height * 0.57,
    width: right - left,
    height: cell.height * 0.37,
  };
}

export interface VisibleQuantity {
  text: string;
  value: string;
  approximate: boolean;
}

/** Keep abbreviated game values distinct from exact inventory quantities. */
export function parseVisibleQuantity(raw: string): VisibleQuantity | null {
  const rawText = raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/([kKmM])[.,:;_\-]+$/, '$1');
  if (!rawText || rawText.length > 30) return null;
  // A multi-digit M value without a separator could have lost the decimal,
  // such as the real 1.4M capture read as 14M. Keep it for manual correction.
  if (/^\d{2,}[mM]$/.test(rawText)) return null;
  // A four-digit K value may have lost the display decimal, such as the real
  // 169.2k capture read as 1698k. Keep it for manual correction.
  if (/^\d{4}[kK]$/.test(rawText)) return null;
  const text = rawText;
  if (/^\d{5,}[kK]$/i.test(text)) return null;
  const compact = /^(\d+)(?:[.,](\d{1,3}))?([kKmM])$/.exec(text);
  let value: number;
  let approximate = false;
  if (compact) {
    const multiplier = compact[3].toLowerCase() === 'k' ? 1000 : 1_000_000;
    value = Number(`${compact[1]}.${compact[2] ?? '0'}`) * multiplier;
    approximate = true;
  } else if (/^\d+$/.test(text)) {
    value = Number(text);
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(text) || /^\d{1,3}(?:,\d{3})+$/.test(text)) {
    value = Number(text.replace(/[.,]/g, ''));
  } else return null;
  value = Math.round(value);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return { text, value: String(value), approximate };
}
