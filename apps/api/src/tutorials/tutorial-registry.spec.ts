import {
  isTutorialAnchorForScreen,
  isTutorialLocale,
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
} from '@bdo/shared';
import { describe, expect, it } from 'vitest';

describe('tutorial screen and anchor registry', () => {
  it('lists only the five first-publication screens with the specified access boundary', () => {
    expect(TUTORIAL_LOCALES).toEqual(['pt-BR']);
    expect(
      TUTORIAL_SCREEN_REGISTRY.map((entry) => ({
        screenKey: entry.screenKey,
        route: entry.route,
        access: entry.access,
      })),
    ).toEqual([
      { screenKey: 'market', route: '/market', access: 'public' },
      { screenKey: 'recipes', route: '/recipes', access: 'public' },
      { screenKey: 'scans', route: '/scans', access: 'authenticated' },
      { screenKey: 'storage', route: '/storage', access: 'authenticated' },
      { screenKey: 'recommendations', route: '/recommendations', access: 'authenticated' },
    ]);
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
    expect(seen.size).toBe(12);
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
