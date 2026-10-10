// Recipe types present in the client extract. Discovery excludes worker workshops,
// guild crafting and skill records; direct item/recipe relationships stay intact.
export const LIFE_SKILL_RECIPE_GROUPS = {
  cooking: ['COOK', 'SIMPLE_COOK'],
  alchemy: ['ALCHEMY', 'SIMPLE_ALCHEMY'],
  processing: ['HEAT', 'GRIND', 'DRY', 'FIREWOOD', 'SHAKE', 'THINNING'],
  imperial: ['ROYALGIFT_COOK', 'ROYALGIFT_ALCHEMY'],
} as const;

export type LifeSkillRecipeGroup = keyof typeof LIFE_SKILL_RECIPE_GROUPS;

export const LIFE_SKILL_RECIPE_TYPES = Object.values(LIFE_SKILL_RECIPE_GROUPS).flat();
