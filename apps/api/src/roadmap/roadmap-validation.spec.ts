import { describe, expect, it } from 'vitest';

import { parseRoadmapUpdate } from './roadmap-validation';

const entry = {
  slug: 'market',
  kind: 'pillar' as const,
  sortOrder: 0,
  title: 'Mercado',
  summary: 'Consulte preços do Mercado Central.',
  description: 'Use as cotações nas simulações.',
  statusLabel: 'Disponível',
  icon: 'lucideStore',
  featured: false,
  links: [{ label: 'Abrir mercado', path: '/market' }],
};

describe('roadmap update validation', () => {
  it('accepts an editable collection and normalizes optional fields', () => {
    expect(parseRoadmapUpdate({ entries: [entry] })).toEqual({
      entries: [{ ...entry, links: entry.links }],
      expectedUpdatedAt: null,
    });
  });

  it('rejects duplicate slugs and order positions within the same kind', () => {
    expect(() => parseRoadmapUpdate({ entries: [entry, { ...entry, sortOrder: 1 }] })).toThrow();
    expect(() =>
      parseRoadmapUpdate({ entries: [entry, { ...entry, slug: 'crafting' }] }),
    ).toThrow();
  });

  it('accepts only internal paths and plain text content', () => {
    expect(() =>
      parseRoadmapUpdate({
        entries: [{ ...entry, links: [{ label: 'Site', path: '//example.com' }] }],
      }),
    ).toThrow();
    expect(() =>
      parseRoadmapUpdate({ entries: [{ ...entry, description: '<img src=x onerror=alert(1)>' }] }),
    ).toThrow();
  });

  it('supports removing every entry without substituting hardcoded content', () => {
    expect(parseRoadmapUpdate({ entries: [] })).toEqual({
      entries: [],
      expectedUpdatedAt: null,
    });
  });
});
