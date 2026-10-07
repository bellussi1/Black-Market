import { uiLocale } from '../core/locale';

export function silver(value: string | bigint | null | undefined): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat(uiLocale()).format(BigInt(value));
  } catch {
    return '—';
  }
}
export function number(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: digits }).format(value);
}
export function date(value: string): string {
  return new Intl.DateTimeFormat(uiLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
