import {
  isTutorialAnchorForScreen,
  isTutorialLocale,
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
} from '@bdo/shared';
import { describe, expect, it } from 'vitest';

describe('tutorial screen and anchor registry', () => {
  it('registers every active MVP surface exactly once', () => {
    const expected = [
      'home',
      'roadmap',
      'market',
      'market-quote',
      'market-calculator',
      'market-saved',
      'market-item',
      'recipes',
      'recipe-workshop',
      'crafting-workshop',
      'crafting-manual',
      'crafting-library',
      'recommendations',
      'storage',
      'stock-inventory',
      'family-character',
      'family-family',
      'family-equipment',
      'lifeskills-sessions',
      'lifeskills-mastery',
      'lifeskills-training',
      'scans',
      'scans-review',
      'scans-profile',
      'shopping',
      'plans',
      'settings',
    ];

    const registered = TUTORIAL_SCREEN_REGISTRY.map((screen) => screen.screenKey);
    expect(registered).toHaveLength(expected.length);
    expect(new Set(registered).size).toBe(expected.length);
    expect([...registered].sort()).toEqual([...expected].sort());
  });

  it('preserves the six published screen keys', () => {
    for (const key of [
      'market',
      'recipes',
      'recipe-workshop',
      'scans',
      'storage',
      'recommendations',
    ]) {
      expect(isTutorialScreenKey(key)).toBe(true);
    }
  });

  it('keeps the workshop tour separate from the recipes catalogue', () => {
    expect(TUTORIAL_LOCALES).toEqual(['pt-BR']);
    const screens = new Map(TUTORIAL_SCREEN_REGISTRY.map((entry) => [entry.screenKey, entry]));
    expect(screens.get('recipes')).toMatchObject({ route: '/recipes', access: 'public' });
    expect(screens.get('recipe-workshop')).toMatchObject({
      route: '/recipes/items/:id',
      access: 'public',
    });
    expect(screens.get('market')).toMatchObject({ route: '/market', access: 'public' });
    expect(screens.get('scans')).toMatchObject({ route: '/scans', access: 'authenticated' });
    expect(screens.get('storage')).toMatchObject({ route: '/storage', access: 'authenticated' });
    expect(screens.get('recommendations')).toMatchObject({
      route: '/lifeskills?tab=production',
      access: 'authenticated',
    });
  });

  it('keeps every anchor unique and scoped to its registered screen', () => {
    const seen = new Set<string>();
    for (const screen of TUTORIAL_SCREEN_REGISTRY) {
      expect(screen.anchors.length).toBeGreaterThan(0);
      for (const anchor of screen.anchors) {
        expect(seen.has(anchor.key)).toBe(false);
        seen.add(anchor.key);
        expect(anchor.key.startsWith(`${screen.screenKey}.`)).toBe(true);
        expect(isTutorialAnchorForScreen(screen.screenKey, anchor.key)).toBe(true);
        for (const other of TUTORIAL_SCREEN_REGISTRY) {
          if (other.screenKey !== screen.screenKey) {
            expect(isTutorialAnchorForScreen(other.screenKey, anchor.key)).toBe(false);
          }
        }
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(TUTORIAL_SCREEN_REGISTRY.length * 2);
  });

  it('rejects unknown screen and anchor keys', () => {
    expect(isTutorialScreenKey('market')).toBe(true);
    expect(isTutorialScreenKey('family')).toBe(false);
    expect(isTutorialScreenKey('unknown')).toBe(false);
    expect(isTutorialScreenKey('')).toBe(false);
    expect(isTutorialAnchorForScreen('market', 'market.unknown')).toBe(false);
    expect(isTutorialAnchorForScreen('market', '[data-tour="market.search"]')).toBe(false);
    expect(isTutorialAnchorForScreen('unknown', 'market.search')).toBe(false);
    expect(isTutorialLocale('pt-BR')).toBe(true);
    expect(isTutorialLocale('en-US')).toBe(false);
  });
});
