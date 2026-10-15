import {
  isTutorialAnchorForScreen,
  isTutorialScreenKey,
  TUTORIAL_SCREEN_REGISTRY,
} from '@bdo/shared';
import { describe, expect, it } from 'vitest';

describe('tutorial screen registry', () => {
  it('lists only the five first-publication screens with the specified access boundary', () => {
    expect(
      Object.values(TUTORIAL_SCREEN_REGISTRY).map(({ screenKey, route, access }) => [
        screenKey,
        route,
        access,
      ]),
    ).toEqual([
      ['market', '/market', 'public'],
      ['recipes', '/recipes', 'public'],
      ['scans', '/scans', 'authenticated'],
      ['storage', '/storage', 'authenticated'],
      ['recommendations', '/recommendations', 'authenticated'],
    ]);
  });

  it('keeps every anchor unique and scoped to its registered screen', () => {
    const keys = Object.values(TUTORIAL_SCREEN_REGISTRY).flatMap(({ anchors }) =>
      anchors.map(({ key }) => key),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(isTutorialAnchorForScreen('market', 'market.search')).toBe(true);
    expect(isTutorialAnchorForScreen('recipes', 'market.search')).toBe(false);
  });

  it('rejects unknown screen and anchor keys', () => {
    expect(isTutorialScreenKey('unknown')).toBe(false);
    expect(isTutorialAnchorForScreen('unknown', 'market.search')).toBe(false);
    expect(isTutorialAnchorForScreen('market', 'market.unknown')).toBe(false);
  });
});
