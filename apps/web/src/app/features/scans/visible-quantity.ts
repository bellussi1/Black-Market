export interface VisibleQuantity {
  text: string;
  value: string;
  approximate: boolean;
}

/** Keep abbreviated game values distinct from exact inventory quantities. */
export function parseVisibleQuantity(raw: string): VisibleQuantity | null {
  const text = raw.trim().replace(/\s+/g, '');
  if (!text || text.length > 30) return null;
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
