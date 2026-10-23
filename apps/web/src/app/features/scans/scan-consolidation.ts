export type DuplicateChoice = 'unresolved' | 'latest' | 'maximum' | 'distinct-stacks';
export type StockUpdateMode = 'reviewed' | 'merge' | 'replace';
export interface ReviewedOccurrence {
  itemId: number;
  name: string;
  quantity: number;
  location: string;
  kind: 'storage' | 'inventory';
  characterId?: string;
  source: { hash: string; slot: number; capture: number; position?: string };
}
export function occurrenceKey(row: ReviewedOccurrence): string {
  return JSON.stringify([
    row.kind,
    row.characterId ?? '',
    row.kind === 'inventory' ? '' : row.location.trim().toLocaleLowerCase('pt-BR'),
    row.itemId,
  ]);
}
export function occurrenceGroups(rows: ReviewedOccurrence[]): Map<string, ReviewedOccurrence[]> {
  const groups = new Map<string, ReviewedOccurrence[]>();
  for (const row of rows) {
    const key = occurrenceKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}
/** Repeated observations are never added without an explicit distinct-stack decision. */
export function consolidateOccurrences(
  rows: ReviewedOccurrence[],
  choices: Readonly<Record<string, DuplicateChoice>>,
) {
  return [...occurrenceGroups(rows)].map(([key, group]) => {
    if (
      group.some(
        (row) => !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 1e9,
      )
    )
      throw new Error('Confira as quantidades: use inteiros de 1 a 1 bilhão.');
    const choice = choices[key] ?? 'unresolved';
    if (group.length > 1 && choice === 'unresolved')
      throw new Error('Escolha como tratar cada item repetido.');
    // Exact repeated screenshot + slot is one observation, even if marked as separate stacks.
    const unique = [
      ...new Map(
        group.map((row) => [
          JSON.stringify([row.source.hash, row.source.position ?? row.source.slot]),
          row,
        ]),
      ).values(),
    ];
    const last = group.at(-1)!;
    const quantity =
      choice === 'distinct-stacks'
        ? unique.reduce((sum, row) => sum + row.quantity, 0)
        : choice === 'maximum'
          ? Math.max(...group.map((row) => row.quantity))
          : last.quantity;
    if (quantity > 1e9) throw new Error('A quantidade consolidada ultrapassa o limite permitido.');
    return { ...last, quantity, sources: unique.map((row) => row.source) };
  });
}
export function imageHashDistance(a: string, b: string): number {
  if (a.length !== 64 || b.length !== 64) return 64;
  return [...a].filter((bit, i) => bit !== b[i]).length;
}
export function stockMatches(
  row: { itemId?: number; location: string; kind?: string; characterId?: string },
  incoming: ReviewedOccurrence,
): boolean {
  return (
    row.itemId === incoming.itemId &&
    (row.kind ?? 'storage') === incoming.kind &&
    (row.characterId ?? '') === (incoming.characterId ?? '') &&
    (incoming.kind === 'inventory' ||
      row.location.trim().toLocaleLowerCase('pt-BR') ===
        incoming.location.trim().toLocaleLowerCase('pt-BR'))
  );
}
