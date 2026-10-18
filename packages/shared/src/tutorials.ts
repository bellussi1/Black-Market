export const TUTORIAL_LOCALES = ['pt-BR'] as const;
export const TUTORIAL_MAX_STEPS = 12;

export type TutorialLocale = (typeof TUTORIAL_LOCALES)[number];

export type TutorialAccessLevel = 'public' | 'authenticated';

export type TutorialScreenKey =
  | 'home'
  | 'roadmap'
  | 'market'
  | 'market-quote'
  | 'market-calculator'
  | 'market-saved'
  | 'market-item'
  | 'recipes'
  | 'recipe-workshop'
  | 'crafting-workshop'
  | 'crafting-manual'
  | 'crafting-library'
  | 'recommendations'
  | 'storage'
  | 'stock-inventory'
  | 'family-character'
  | 'family-family'
  | 'family-equipment'
  | 'lifeskills-sessions'
  | 'lifeskills-mastery'
  | 'lifeskills-training'
  | 'scans'
  | 'scans-review'
  | 'scans-profile'
  | 'shopping'
  | 'plans'
  | 'settings';

export type TutorialAnchorKey = `${TutorialScreenKey}.${string}`;

export interface TutorialAnchorDefinition {
  key: TutorialAnchorKey;
  labelKey: string;
}

export interface TutorialScreenDefinition {
  screenKey: TutorialScreenKey;
  route: string;
  access: TutorialAccessLevel;
  label: string;
  anchors: readonly TutorialAnchorDefinition[];
}

const screen = (
  screenKey: TutorialScreenKey,
  route: string,
  access: TutorialAccessLevel,
  label: string,
  anchors: readonly string[],
): TutorialScreenDefinition => ({
  screenKey,
  route,
  access,
  label,
  anchors: anchors.map((anchor) => ({
    key: `${screenKey}.${anchor}` as TutorialAnchorKey,
    labelKey: `tutorial.anchor.${screenKey}.${anchor}`,
  })),
});

export const TUTORIAL_SCREEN_REGISTRY: readonly TutorialScreenDefinition[] = [
  screen('home', '/', 'public', 'Início', ['main-actions', 'lifeskill-entry']),
  screen('roadmap', '/roadmap', 'public', 'Roadmap', ['progress', 'feature-cards']),
  screen('market', '/market', 'public', 'Mercado · Painel', ['search', 'filters', 'results']),
  screen('market-quote', '/market', 'public', 'Mercado · Cotação', ['search', 'quote-panel']),
  screen('market-calculator', '/market', 'public', 'Mercado · Calculadora', ['inputs', 'result']),
  screen('market-saved', '/market', 'public', 'Mercado · Salvos', ['list', 'actions']),
  screen('market-item', '/market/items/:id', 'public', 'Mercado · Detalhe do item', [
    'summary',
    'history',
  ]),
  screen('recipes', '/recipes', 'public', 'Receitas · Catálogo', ['search', 'methods', 'tree']),
  screen('recipe-workshop', '/recipes/items/:id', 'public', 'Receitas · Oficina', [
    'batch-mastery',
    'financial',
    'strategy',
    'materials-returns',
  ]),
  screen('crafting-workshop', '/crafting', 'public', 'Produção · Oficina', [
    'recipe',
    'settings',
    'result',
  ]),
  screen('crafting-manual', '/crafting', 'public', 'Produção · Manual', ['recipe', 'settings']),
  screen('crafting-library', '/crafting', 'public', 'Produção · Biblioteca', [
    'catalogue',
    'search',
  ]),
  screen('recommendations', '/recommendations', 'authenticated', 'O que fazer', [
    'conditions',
    'ranking',
  ]),
  screen('storage', '/storage', 'authenticated', 'Armazém · Cidades', ['items', 'projects']),
  screen('stock-inventory', '/storage', 'authenticated', 'Armazém · Inventário pessoal', [
    'location',
    'items',
  ]),
  screen('family-character', '/family', 'authenticated', 'Família · Personagem ativo', [
    'character',
    'lifeskills',
  ]),
  screen('family-family', '/family', 'authenticated', 'Família · Personagens', [
    'characters',
    'actions',
  ]),
  screen('family-equipment', '/family', 'authenticated', 'Família · Equipamento', [
    'slots',
    'stats',
  ]),
  screen('lifeskills-sessions', '/lifeskills', 'public', 'Profissões · Sessões', [
    'sessions',
    'results',
  ]),
  screen('lifeskills-mastery', '/lifeskills', 'public', 'Profissões · Maestria', [
    'profile',
    'inputs',
  ]),
  screen('lifeskills-training', '/lifeskills', 'public', 'Profissões · Treino', [
    'plans',
    'results',
  ]),
  screen('scans', '/scans', 'authenticated', 'Scan · Captura', ['capture', 'review']),
  screen('scans-review', '/scans', 'authenticated', 'Scan · Revisão', ['rows', 'save']),
  screen('scans-profile', '/scans/profile', 'authenticated', 'Scan · Importar personagem', [
    'profile-input',
    'profile-preview',
  ]),
  screen('shopping', '/shopping', 'authenticated', 'Lista de materiais', ['items', 'actions']),
  screen('plans', '/plans', 'authenticated', 'Meus planos', ['collection', 'actions']),
  screen('settings', '/settings', 'authenticated', 'Configurações', ['account', 'tutorials']),
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
