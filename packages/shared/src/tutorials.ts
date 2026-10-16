export const TUTORIAL_LOCALES = ['pt-BR'] as const;

export type TutorialLocale = (typeof TUTORIAL_LOCALES)[number];

export type TutorialAccessLevel = 'public' | 'authenticated';

export type TutorialScreenKey =
  | 'market'
  | 'recipes'
  | 'recipe-workshop'
  | 'scans'
  | 'storage'
  | 'recommendations';

export type TutorialAnchorKey =
  | 'market.search'
  | 'market.filters'
  | 'market.results'
  | 'recipes.search'
  | 'recipes.methods'
  | 'recipes.tree'
  | 'recipe-workshop.batch-mastery'
  | 'recipe-workshop.financial'
  | 'recipe-workshop.strategy'
  | 'recipe-workshop.materials-returns'
  | 'scans.capture'
  | 'scans.review'
  | 'storage.items'
  | 'storage.projects'
  | 'recommendations.conditions'
  | 'recommendations.ranking';

export interface TutorialAnchorDefinition {
  key: TutorialAnchorKey;
  labelKey: string;
}

export interface TutorialScreenDefinition {
  screenKey: TutorialScreenKey;
  route: string;
  access: TutorialAccessLevel;
  anchors: readonly TutorialAnchorDefinition[];
}

export const TUTORIAL_SCREEN_REGISTRY: readonly TutorialScreenDefinition[] = [
  {
    screenKey: 'market',
    route: '/market',
    access: 'public',
    anchors: [
      { key: 'market.search', labelKey: 'tutorial.anchor.market.search' },
      { key: 'market.filters', labelKey: 'tutorial.anchor.market.filters' },
      { key: 'market.results', labelKey: 'tutorial.anchor.market.results' },
    ],
  },
  {
    screenKey: 'recipes',
    route: '/recipes',
    access: 'public',
    anchors: [
      { key: 'recipes.search', labelKey: 'tutorial.anchor.recipes.search' },
      { key: 'recipes.methods', labelKey: 'tutorial.anchor.recipes.methods' },
      { key: 'recipes.tree', labelKey: 'tutorial.anchor.recipes.tree' },
    ],
  },
  {
    screenKey: 'recipe-workshop',
    route: '/recipes/items/:id',
    access: 'public',
    anchors: [
      {
        key: 'recipe-workshop.batch-mastery',
        labelKey: 'tutorial.anchor.recipe-workshop.batch-mastery',
      },
      { key: 'recipe-workshop.financial', labelKey: 'tutorial.anchor.recipe-workshop.financial' },
      { key: 'recipe-workshop.strategy', labelKey: 'tutorial.anchor.recipe-workshop.strategy' },
      {
        key: 'recipe-workshop.materials-returns',
        labelKey: 'tutorial.anchor.recipe-workshop.materials-returns',
      },
    ],
  },
  {
    screenKey: 'scans',
    route: '/scans',
    access: 'authenticated',
    anchors: [
      { key: 'scans.capture', labelKey: 'tutorial.anchor.scans.capture' },
      { key: 'scans.review', labelKey: 'tutorial.anchor.scans.review' },
    ],
  },
  {
    screenKey: 'storage',
    route: '/storage',
    access: 'authenticated',
    anchors: [
      { key: 'storage.items', labelKey: 'tutorial.anchor.storage.items' },
      { key: 'storage.projects', labelKey: 'tutorial.anchor.storage.projects' },
    ],
  },
  {
    screenKey: 'recommendations',
    route: '/recommendations',
    access: 'authenticated',
    anchors: [
      { key: 'recommendations.conditions', labelKey: 'tutorial.anchor.recommendations.conditions' },
      { key: 'recommendations.ranking', labelKey: 'tutorial.anchor.recommendations.ranking' },
    ],
  },
] as const;

export interface TutorialGuideStep {
  id: string;
  sortOrder: number;
  anchorKey: string | null;
  title: string;
  body: string;
}

export interface TutorialGuide {
  id: string;
  screenKey: TutorialScreenKey;
  locale: TutorialLocale;
  enabled: boolean;
  updatedAt: string;
  steps: TutorialGuideStep[];
}

export interface TutorialPublicStep {
  sortOrder: number;
  anchorKey: string | null;
  title: string;
  body: string;
}

export interface TutorialPublicGuide {
  screenKey: TutorialScreenKey;
  locale: TutorialLocale;
  updatedAt: string;
  steps: TutorialPublicStep[];
}

export interface TutorialGuideResponse {
  guide: TutorialPublicGuide | null;
}

export interface TutorialManagementResponse {
  screens: TutorialScreenDefinition[];
  locales: TutorialLocale[];
  guides: TutorialGuide[];
}

export interface TutorialGuideStepInput {
  sortOrder: number;
  anchorKey: string | null;
  title: string;
  body: string;
}

export interface TutorialGuideUpdateRequest {
  expectedUpdatedAt: string | null;
  enabled: boolean;
  steps: TutorialGuideStepInput[];
}

const SCREEN_BY_KEY = new Map<string, TutorialScreenDefinition>(
  TUTORIAL_SCREEN_REGISTRY.map((entry) => [entry.screenKey, entry]),
);

export function isTutorialLocale(value: string): value is TutorialLocale {
  return (TUTORIAL_LOCALES as readonly string[]).includes(value);
}

export function isTutorialScreenKey(value: string): value is TutorialScreenKey {
  return SCREEN_BY_KEY.has(value);
}

export function getTutorialScreenDefinition(
  screenKey: string,
): TutorialScreenDefinition | undefined {
  return SCREEN_BY_KEY.get(screenKey);
}

export function isTutorialAnchorForScreen(
  screenKey: string,
  anchorKey: string,
): anchorKey is TutorialAnchorKey {
  const screen = SCREEN_BY_KEY.get(screenKey);
  if (!screen) {
    return false;
  }
  return screen.anchors.some((anchor) => anchor.key === anchorKey);
}
