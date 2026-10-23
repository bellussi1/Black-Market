const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/** Catalog categories are stronger evidence than a visual resemblance. */
export function isEquipmentCandidateForSlot(
  item: { category: string | null },
  slot: string,
): boolean {
  const categories: Record<string, string> = {
    mainhand: 'mainweapon',
    offhand: 'subweapon',
    awakening: 'awakenweapon',
    helmet: 'armor',
    armor: 'armor',
    gloves: 'armor',
    shoes: 'armor',
    ring1: 'accessory',
    ring2: 'accessory',
    earring1: 'accessory',
    earring2: 'accessory',
    necklace: 'accessory',
    belt: 'accessory',
  };
  const category = item.category?.toLowerCase();
  if (!slot) return Boolean(category && Object.values(categories).includes(category));
  return Boolean(categories[slot] && category === categories[slot]);
}
export interface EnhancementReading {
  text: string;
  rank: number | null;
  numeric: number | null;
}
/** Accepts only one complete visible label. No guessed substitutions (1/I, V/Y). */
export function parseEnhancement(text: string): EnhancementReading | null {
  const value = text.trim().toUpperCase();
  const rank = roman.indexOf(value);
  if (rank > 0) return { text: value, rank, numeric: null };
  if (/^\+(?:[1-9]|1[0-5])$/.test(value))
    return { text: value, rank: null, numeric: Number(value.slice(1)) };
  return null;
}
export function enhancementLevel(reading: EnhancementReading, slot: string): number | null {
  if (
    !/^(mainhand|offhand|awakening|helmet|armor|gloves|shoes|ring[12]|earring[12]|necklace|belt)$/.test(
      slot,
    )
  )
    return null;
  const accessory = /^(ring|earring|necklace|belt)/.test(slot);
  if (reading.numeric !== null) return accessory ? null : reading.numeric;
  return reading.rank === null ? null : accessory ? reading.rank : 15 + reading.rank;
}
export const equipmentStatFields = ['mainAp', 'awakeAp', 'dp'] as const;
export type EquipmentStatistics = Record<(typeof equipmentStatFields)[number], string>;
export const emptyEquipmentStatistics = (): EquipmentStatistics => ({
  mainAp: '',
  awakeAp: '',
  dp: '',
});
export function confirmedEquipmentStatistics(
  draft: EquipmentStatistics,
): Partial<Record<(typeof equipmentStatFields)[number], number>> {
  const result: Partial<Record<(typeof equipmentStatFields)[number], number>> = {};
  for (const field of equipmentStatFields) {
    if (!draft[field].trim()) continue;
    if (!/^\d{1,4}$/.test(draft[field].trim()) || Number(draft[field]) > 5000)
      throw new Error(
        'Confira PA principal, PA de despertar e PD: use números inteiros de 0 a 5000.',
      );
    result[field] = Number(draft[field]);
  }
  return result;
}
