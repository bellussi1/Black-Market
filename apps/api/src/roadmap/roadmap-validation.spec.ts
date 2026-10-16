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

  it('acceptsMoreThan32EntriesAndSortOrderAbove1000', () => {
    const entries = Array.from({ length: 33 }, (_, index) => ({
      ...entry,
      slug: `entry-${index + 1}`,
      kind: index % 2 === 0 ? ('flow' as const) : ('pillar' as const),
      sortOrder: index === 32 ? 1001 : index,
      featured: index < 2,
    }));
    const parsed = parseRoadmapUpdate({ entries });
    expect(parsed.entries).toHaveLength(33);
    expect(parsed.entries[32]?.sortOrder).toBe(1001);
    expect(parsed.entries.filter((item) => item.featured)).toHaveLength(2);
  });

  it('rejectsDuplicateSortOrdersAcrossKinds', () => {
    expect(() =>
      parseRoadmapUpdate({
        entries: [
          { ...entry, slug: 'flow-step', kind: 'flow', sortOrder: 0 },
          { ...entry, slug: 'pillar-step', kind: 'pillar', sortOrder: 0 },
        ],
      }),
    ).toThrow();
  });

  it('rejectsRepeatedPathsInOneEntryButAllowsTheSamePathAcrossEntries', () => {
    expect(() =>
      parseRoadmapUpdate({
        entries: [
          {
            ...entry,
            links: [
              { label: 'Mercado', path: '/market' },
              { label: 'Mercado novamente', path: ' /market ' },
            ],
          },
        ],
      }),
    ).toThrow();

    expect(
      parseRoadmapUpdate({
        entries: [
          {
            ...entry,
            slug: 'flow-market',
            kind: 'flow',
            sortOrder: 0,
            links: [{ label: 'Abrir mercado', path: '/market' }],
          },
          {
            ...entry,
            slug: 'pillar-market',
            kind: 'pillar',
            sortOrder: 1,
            links: [{ label: 'Consultar mercado', path: '/market' }],
          },
        ],
      }).entries,
    ).toHaveLength(2);
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
