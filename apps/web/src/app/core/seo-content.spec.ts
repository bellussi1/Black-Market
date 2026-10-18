import { describe, expect, it } from 'vitest';

import { isPublicSeoPath, publicDescription, withNonAffiliationDisclosure } from './seo-content';

describe('unified page metadata', () => {
  it('indexes item details under Mercado and keeps family and storage private', () => {
    expect(isPublicSeoPath('/market/items/5301')).toBe(true);
    expect(publicDescription('/market/items/5301')).toContain('Mercado');
    expect(isPublicSeoPath('/roadmap')).toBe(true);
    expect(publicDescription('/roadmap')).toContain('Crafting');
    expect(isPublicSeoPath('/crafting')).toBe(true);
    for (const path of ['/family', '/storage', '/inventory', '/gear', '/settings']) {
      expect(isPublicSeoPath(path)).toBe(false);
    }
    expect(isPublicSeoPath('/market/items/0')).toBe(false);
    expect(isPublicSeoPath('/market/items/invalid')).toBe(false);
  });

  it('adds a clear non-affiliation disclosure to game-related search descriptions', () => {
    const description = publicDescription('/');

    expect(description).toContain('sem afiliação com a Pearl Abyss');
    expect(description?.match(/Pearl Abyss/g)).toHaveLength(1);
  });

  it('does not append the disclosure to unrelated descriptions or duplicate an existing notice', () => {
    expect(withNonAffiliationDisclosure('Receitas e materiais para organizar.')).toBe(
      'Receitas e materiais para organizar.',
    );
    expect(
      withNonAffiliationDisclosure(
        'Ferramenta independente de Black Desert Online, sem afiliação com a Pearl Abyss.',
      ),
    ).toBe('Ferramenta independente de Black Desert Online, sem afiliação com a Pearl Abyss.');
  });
});
