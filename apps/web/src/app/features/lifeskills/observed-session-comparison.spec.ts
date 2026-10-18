import { activitySchema, defaultTax } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import type { Workspace } from '../../core/workspace-models';
import { compareObservedSessions } from './observed-session-comparison';

type Session = Workspace['sessions'][number];
const session = (id: string, input: Record<string, unknown> = {}): Session => ({
  id,
  region: 'sa',
  createdAt: '2026-10-16T12:00:00Z',
  input: activitySchema.parse({
    ...defaultTax,
    name: 'Minha rota',
    minutes: 60,
    energy: 0,
    cost: '0',
    directIncome: '100',
    items: [],
    mode: 'active',
    skill: 'gathering',
    mastery: 1000,
    ...input,
  }),
});

describe('observed session comparison', () => {
  it('sums each recorded tax and price inside the same group', () => {
    const [row] = compareObservedSessions(
      [
        session('a', { directIncome: '0', items: [{ name: 'Item', quantity: 1, price: '100' }] }),
        session('b', {
          directIncome: '0',
          valuePack: true,
          items: [{ name: 'Item', quantity: 1, price: '200' }],
        }),
      ],
      'sa',
    );
    expect(row).toMatchObject({ count: 2, profit: '234', perHour: '117' });
  });

  it('orders fractional rates before truncation, including negative rates', () => {
    const rows = compareObservedSessions(
      [
        session('a', { name: 'A menor', minutes: 120, directIncome: '1' }),
        session('b', { name: 'Z maior', minutes: 90, directIncome: '1' }),
        session('c', { name: 'A perda maior', minutes: 90, directIncome: '0', cost: '1' }),
        session('d', { name: 'Z perda menor', minutes: 120, directIncome: '0', cost: '1' }),
      ],
      'sa',
    );
    expect(rows.map((row) => row.name)).toEqual([
      'Z maior',
      'A menor',
      'Z perda menor',
      'A perda maior',
    ]);
  });
  it('weights profit by duration instead of averaging hourly rates and keeps sample dates', () => {
    const first = session('a', { minutes: 30, directIncome: '100' });
    const last = {
      ...session('b', { minutes: 90, directIncome: '100' }),
      createdAt: '2026-10-16T13:00:00Z',
    };
    const [row] = compareObservedSessions([last, first], 'sa');
    expect(row).toMatchObject({
      count: 2,
      minutes: 120,
      profit: '200',
      perHour: '100',
      firstAt: first.createdAt,
      lastAt: last.createdAt,
    });
  });

  it('isolates region, profession, mastery and active/AFK context including unknown legacy fields', () => {
    const rows = [
      session('a'),
      session('b', { mastery: 0 }),
      session('c', { mastery: undefined }),
      session('d', { mode: 'afk' }),
      session('e', { skill: 'fishing' }),
      session('f', { mode: undefined }),
      { ...session('g'), region: 'eu' as const },
    ];
    expect(compareObservedSessions(rows, 'sa')).toHaveLength(6);
    expect(compareObservedSessions(rows, 'eu')).toHaveLength(1);
  });

  it('combines spelling case and surrounding whitespace but preserves distinct route names', () => {
    const rows = compareObservedSessions(
      [session('a'), session('b', { name: ' MINHA ROTA ' }), session('c', { name: 'Outra rota' })],
      'sa',
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.name === 'Minha rota')?.count).toBe(2);
  });

  it('uses each recorded tax and costs, preserves losses and orders observed rates descending', () => {
    const rows = compareObservedSessions(
      [
        session('a', { name: 'Perda', directIncome: '0', cost: '20' }),
        session('b', {
          name: 'Mercado',
          directIncome: '0',
          taxPercent: 35,
          valuePack: false,
          collectionBonus: 0,
          items: [{ name: 'Item', quantity: 1, price: '100' }],
        }),
        session('c', { name: 'NPC', directIncome: '70' }),
      ],
      'sa',
    );
    expect(rows.map((row) => row.perHour)).toEqual(['70', '65', '-20']);
  });

  it('keeps very large silver exact and supports sub-minute measurements', () => {
    const [row] = compareObservedSessions(
      [session('a', { minutes: 0.001, directIncome: '999999999999999999999999' })],
      'sa',
    );
    expect(row.perHour).toBe(String(999999999999999999999999n * 60000n));
  });

  it('returns no fabricated observations for an empty sample and does not mutate saved sessions', () => {
    expect(compareObservedSessions([], 'sa')).toEqual([]);
    const rows = [session('a')];
    const snapshot = structuredClone(rows);
    compareObservedSessions(rows, 'sa');
    expect(rows).toEqual(snapshot);
  });
});
