export const TUTORIAL_LOCALES = ['pt-BR'] as const;

export type TutorialLocale = (typeof TUTORIAL_LOCALES)[number];

export type TutorialScreenKey = 'market' | 'recipes' | 'scans' | 'storage' | 'recommendations';

export type TutorialAnchorKey =
  | 'market.search'
  | 'market.filters'
  | 'market.results'
  | 'recipes.search'
  | 'recipes.methods'
  | 'recipes.tree'
  | 'scans.capture'
  | 'scans.review'
  | 'storage.items'
  | 'storage.projects'
  | 'recommendations.conditions'
  | 'recommendations.ranking';

export interface TutorialScreenDefinition {
  screenKey: TutorialScreenKey;
  route: string;
  access: 'public' | 'authenticated';
  anchors: { key: TutorialAnchorKey; labelKey: string }[];
}

export const TUTORIAL_SCREEN_REGISTRY = {
  market: {
    screenKey: 'market',
    route: '/market',
    access: 'public',
    anchors: [
      { key: 'market.search', labelKey: 'tutorial.anchors.market.search' },
      { key: 'market.filters', labelKey: 'tutorial.anchors.market.filters' },
      { key: 'market.results', labelKey: 'tutorial.anchors.market.results' },
    ],
  },
  recipes: {
    screenKey: 'recipes',
    route: '/recipes',
    access: 'public',
    anchors: [
      { key: 'recipes.search', labelKey: 'tutorial.anchors.recipes.search' },
      { key: 'recipes.methods', labelKey: 'tutorial.anchors.recipes.methods' },
      { key: 'recipes.tree', labelKey: 'tutorial.anchors.recipes.tree' },
    ],
  },
  scans: {
    screenKey: 'scans',
    route: '/scans',
    access: 'authenticated',
    anchors: [
      { key: 'scans.capture', labelKey: 'tutorial.anchors.scans.capture' },
      { key: 'scans.review', labelKey: 'tutorial.anchors.scans.review' },
    ],
  },
  storage: {
    screenKey: 'storage',
    route: '/storage',
    access: 'authenticated',
    anchors: [
      { key: 'storage.items', labelKey: 'tutorial.anchors.storage.items' },
      { key: 'storage.projects', labelKey: 'tutorial.anchors.storage.projects' },
    ],
  },
  recommendations: {
    screenKey: 'recommendations',
    route: '/recommendations',
    access: 'authenticated',
    anchors: [
      {
        key: 'recommendations.conditions',
        labelKey: 'tutorial.anchors.recommendations.conditions',
      },
      {
        key: 'recommendations.ranking',
        labelKey: 'tutorial.anchors.recommendations.ranking',
      },
    ],
  },
} as const satisfies Record<TutorialScreenKey, TutorialScreenDefinition>;

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

export interface TutorialPublicGuide {
  screenKey: TutorialScreenKey;
  locale: TutorialLocale;
  updatedAt: string;
  steps: { sortOrder: number; anchorKey: string | null; title: string; body: string }[];
}

export interface TutorialGuideResponse {
  guide: TutorialPublicGuide | null;
}

export interface TutorialManagementResponse {
  screens: TutorialScreenDefinition[];
  locales: TutorialLocale[];
  guides: TutorialGuide[];
}

export interface TutorialGuideUpdateRequest {
  expectedUpdatedAt: string | null;
  enabled: boolean;
  steps: { sortOrder: number; anchorKey: string | null; title: string; body: string }[];
}

export function isTutorialScreenKey(value: string): value is TutorialScreenKey {
  return Object.hasOwn(TUTORIAL_SCREEN_REGISTRY, value);
}

export function isTutorialAnchorForScreen(
  screenKey: string,
  anchorKey: string,
): anchorKey is TutorialAnchorKey {
  return (
    isTutorialScreenKey(screenKey) &&
    TUTORIAL_SCREEN_REGISTRY[screenKey].anchors.some((anchor) => anchor.key === anchorKey)
  );
}
