import { describe, expect, it } from 'vitest';

import { isPublicSeoPath, publicDescription } from './seo-content';

describe('unified page metadata', () => {
  it('indexes item details under Mercado and keeps family and storage private', () => {
    expect(isPublicSeoPath('/market/items/5301')).toBe(true);
    expect(publicDescription('/market/items/5301')).toContain('Mercado');
    for (const path of ['/family', '/storage', '/inventory', '/gear', '/settings']) {
      expect(isPublicSeoPath(path)).toBe(false);
    }
    expect(isPublicSeoPath('/market/items/0')).toBe(false);
    expect(isPublicSeoPath('/market/items/invalid')).toBe(false);
  });
});
