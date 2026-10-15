import { BadRequestException } from '@nestjs/common';
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

  it('rejects duplicate slugs', () => {
    let error: unknown;
    try {
      parseRoadmapUpdate({ entries: [entry, { ...entry, sortOrder: 1 }] });
    } catch (caught) {
      error = caught;
    }

    if (!(error instanceof BadRequestException)) throw new Error('Expected slug validation error.');
    expect(error.getResponse()).toMatchObject({
      issues: [
        {
          path: ['entries', 1, 'slug'],
          message: 'Cada identificador deve ser único.',
        },
      ],
    });
  });

  it('acceptsMoreThan32EntriesAndSortOrderAbove1000', () => {
    const entries = Array.from({ length: 33 }, (_, index) => ({
      ...entry,
      slug: `entry-${index}`,
      sortOrder: index === 32 ? 1001 : index,
      featured: index < 2,
    }));

    expect(parseRoadmapUpdate({ entries }).entries).toHaveLength(33);
    expect(parseRoadmapUpdate({ entries }).entries[32]?.sortOrder).toBe(1001);
    expect(parseRoadmapUpdate({ entries }).entries.filter(({ featured }) => featured)).toHaveLength(
      2,
    );
  });

  it('rejectsDuplicateSortOrdersAcrossKinds', () => {
    expect(() =>
      parseRoadmapUpdate({
        entries: [entry, { ...entry, slug: 'flow-intro', kind: 'flow' }],
      }),
    ).toThrow();
  });

  it('rejectsRepeatedPathsInOneEntryButAllowsTheSamePathAcrossEntries', () => {
    expect(() =>
      parseRoadmapUpdate({
        entries: [{ ...entry, links: [...entry.links, ...entry.links] }],
      }),
    ).toThrow();
    expect(() =>
      parseRoadmapUpdate({
        entries: [entry, { ...entry, slug: 'market-second', sortOrder: 1 }],
      }),
    ).not.toThrow();
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
