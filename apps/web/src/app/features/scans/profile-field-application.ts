import { type CharacterProfile, characterSchema, lifeSkills } from '@bdo/calculators';

import type { ScreenFieldCandidate } from './screen-recognition';

const numericLimits: Record<string, { min: number; max: number; integer?: boolean }> = {
  level: { min: 1, max: 100, integer: true },
  mainAp: { min: 0, max: 5000, integer: true },
  awakeAp: { min: 0, max: 5000, integer: true },
  dp: { min: 0, max: 5000, integer: true },
  inventoryUsed: { min: 0, max: 300, integer: true },
  inventoryCapacity: { min: 0, max: 300, integer: true },
  carriedWeight: { min: 0, max: 10000 },
  weightLimit: { min: 0, max: 10000 },
};

function validNumber(field: string, value: unknown): value is number {
  const limits = numericLimits[field];
  return (
    !!limits &&
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= limits.min &&
    value <= limits.max &&
    (!limits.integer || Number.isInteger(value))
  );
}

/** Applies only explicitly selected, unambiguous, modeled profile values. */
export function applyProfileFieldCandidates(
  profile: CharacterProfile,
  candidates: readonly ScreenFieldCandidate[],
  selectedKeys: ReadonlySet<string>,
): CharacterProfile {
  let current = characterSchema.parse(profile);
  for (const entry of candidates) {
    if (!selectedKeys.has(entry.field) || entry.status !== 'candidate' || entry.value === null)
      continue;
    const update: Record<string, unknown> = {};
    if (entry.field === 'name' || entry.field === 'className') {
      if (typeof entry.value !== 'string') continue;
      update[entry.field] = entry.value.trim();
      if (!update[entry.field]) continue;
    } else if (entry.field === 'weightLimit' || entry.field === 'carriedWeight') {
      if (entry.unit !== 'LT' || !validNumber(entry.field, entry.value)) continue;
      update[entry.field] = entry.value;
    } else if (entry.field.startsWith('mastery.')) {
      const skill = entry.field.slice('mastery.'.length);
      if (
        !(lifeSkills as readonly string[]).includes(skill) ||
        typeof entry.value !== 'number' ||
        !Number.isInteger(entry.value) ||
        entry.value < 0 ||
        entry.value > 5000
      )
        continue;
      current = {
        ...current,
        mastery: { ...current.mastery, [skill]: entry.value },
      };
      continue;
    } else {
      if (!validNumber(entry.field, entry.value)) continue;
      update[entry.field] = entry.value;
    }

    const parsed = characterSchema.safeParse({ ...current, ...update });
    if (parsed.success) current = parsed.data;
  }
  return current;
}
