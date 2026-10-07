export function silver(value: string | bigint | null | undefined): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat('pt-BR').format(BigInt(value));
  } catch {
    return '—';
  }
}
export function number(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);
}
export function date(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
