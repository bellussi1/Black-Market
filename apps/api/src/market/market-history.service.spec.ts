import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service';
import type { MarketLookup } from './arsha-provider';
import { MarketHistoryService } from './market-history.service';

describe('MarketHistoryService', () => {
  it('hydrates the complete item variant set instead of newer partial hot or unmarked observations', async () => {
    const fetchedAt = new Date('2026-10-09T11:40:00Z');
    const item = {
      itemId: 10,
      subId: 0,
      name: 'Armor',
      price: '100',
      stock: 3,
      totalTrades: '500',
      minPrice: null,
      maxPrice: null,
      lastSoldPrice: null,
      lastSoldAt: null,
    };
    const complete = [0, 5, 10].map((subId) => ({
      region: 'sa',
      itemId: 10,
      subId,
      locale: 'pt',
      fetchedAt,
      payload: { ...item, subId, quoteScope: 'item' },
    }));
    const rows = [
      ...complete,
      {
        ...complete[0],
        fetchedAt: new Date('2026-10-09T11:50:00Z'),
        payload: { ...item, quoteScope: 'hot' },
      },
      { ...complete[0], fetchedAt: new Date('2026-10-09T11:55:00Z'), payload: { ...item } },
    ];
    const conditions: { sql: string; params: unknown[] }[] = [];
    const database = {
      db: {
        select: () => {
          let condition: { sql: string; params: unknown[] };
          const query = {
            from: () => query,
            where: (filter: SQL) => {
              condition = new PgDialect().sqlToQuery(filter);
              conditions.push(condition);
              return query;
            },
            orderBy: () => query,
            limit: (limit: number) => {
              const scoped =
                condition.sql.includes('quoteScope') && condition.params.includes('item');
              const timestamp = condition.params.find((value) => value instanceof Date);
              return Promise.resolve(
                rows
                  .filter(
                    (row) =>
                      (!scoped ||
                        ('quoteScope' in row.payload && row.payload.quoteScope === 'item')) &&
                      (!timestamp || row.fetchedAt.getTime() === timestamp.getTime()),
                  )
                  .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime())
                  .slice(0, limit),
              );
            },
          };
          return query;
        },
      },
    } as unknown as DatabaseService;
    const result = await new MarketHistoryService(database).latest('sa', 10, 'pt');
    expect(result?.fetchedAt).toBe('2026-10-09T11:40:00.000Z');
    expect(result?.items.map((quote) => quote.subId)).toEqual([0, 5, 10]);
    expect(conditions).toHaveLength(2);
    for (const condition of conditions) {
      expect(condition.sql).toContain('quoteScope');
      expect(condition.params).toContain('item');
    }
  });
  it('tags snapshots by source scope while preserving historical prices and counters', async () => {
    const values: Record<string, unknown>[] = [];
    const database = {
      db: {
        insert: () => ({
          values: (rows: Record<string, unknown>[]) => {
            values.push(...rows);
            return {
              onConflictDoNothing: () => Promise.resolve(undefined),
              onConflictDoUpdate: () => Promise.resolve(undefined),
            };
          },
        }),
      },
    } as unknown as DatabaseService;
    const service = new MarketHistoryService(database);
    const response: MarketLookup = {
      source: 'arsha',
      region: 'sa',
      locale: 'pt',
      fetchedAt: '2026-10-09T11:40:00Z',
      cacheStatus: 'fetched',
      upstreamCacheMinutes: 30,
      items: [
        {
          itemId: 10,
          subId: 0,
          name: 'Armor',
          price: '100',
          stock: 3,
          totalTrades: '500',
          minPrice: null,
          maxPrice: null,
          lastSoldPrice: null,
          lastSoldAt: null,
        },
      ],
    };
    await service.save(response);
    await service.save(response, 'hot');
    expect(values.map((row) => row['payload'])).toEqual([
      { ...response.items[0], quoteScope: 'item' },
      { ...response.items[0], quoteScope: 'hot' },
    ]);
  });
  it('replaces a same-timestamp partial hot snapshot with the complete item variants, and never overwrites those with hot scope', async () => {
    const stored = new Map<number, Record<string, unknown>>();
    const updates: { target: unknown[]; set: { payload: SQL } }[] = [];
    const database = {
      db: {
        insert: () => ({
          values: (rows: { subId: number; payload: Record<string, unknown> }[]) => ({
            onConflictDoNothing: () => {
              for (const row of rows)
                if (!stored.has(row.subId)) stored.set(row.subId, row.payload);
              return Promise.resolve(undefined);
            },
            onConflictDoUpdate: (config: { target: unknown[]; set: { payload: SQL } }) => {
              updates.push(config);
              for (const row of rows) stored.set(row.subId, row.payload);
              return Promise.resolve(undefined);
            },
          }),
        }),
      },
    } as unknown as DatabaseService;
    const service = new MarketHistoryService(database);
    const item = {
      itemId: 10,
      subId: 0,
      name: 'Armor',
      price: '100',
      stock: 3,
      totalTrades: '500',
      minPrice: null,
      maxPrice: null,
      lastSoldPrice: null,
      lastSoldAt: null,
    };
    const response: MarketLookup = {
      source: 'arsha',
      region: 'sa',
      locale: 'pt',
      fetchedAt: '2026-10-09T11:40:00Z',
      cacheStatus: 'fetched',
      upstreamCacheMinutes: 30,
      items: [item],
    };
    await service.save(response, 'hot');
    await service.save({ ...response, items: [0, 5, 10].map((subId) => ({ ...item, subId })) });
    await service.save({ ...response, items: [{ ...item, price: '200' }] }, 'hot');
    expect(
      [...stored.values()].map((payload) => ({
        subId: payload['subId'],
        price: payload['price'],
        quoteScope: payload['quoteScope'],
      })),
    ).toEqual([
      { subId: 0, price: '100', quoteScope: 'item' },
      { subId: 5, price: '100', quoteScope: 'item' },
      { subId: 10, price: '100', quoteScope: 'item' },
    ]);
    expect(updates).toHaveLength(1);
    expect(updates[0].target).toHaveLength(5);
    expect(new PgDialect().sqlToQuery(updates[0].set.payload).sql).toBe('excluded.payload');
  });
  it('returns the stored transaction counter without inventing daily volume', async () => {
    const fetchedAt = new Date('2026-10-08T12:00:00.000Z');
    const rowsQuery = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockResolvedValue([
        {
          fetchedAt,
          payload: { price: '250000', stock: 12, totalTrades: '1400' },
        },
      ]),
    };
    rowsQuery.from.mockReturnValue(rowsQuery);
    rowsQuery.where.mockReturnValue(rowsQuery);
    rowsQuery.orderBy.mockReturnValue(rowsQuery);
    const database = {
      db: { select: vi.fn().mockReturnValue(rowsQuery) },
    } as unknown as DatabaseService;
    const service = new MarketHistoryService(database);

    const response = await service.history('sa', 676, 0, 'pt');

    expect(response.points).toEqual([
      {
        fetchedAt,
        price: '250000',
        stock: 12,
        totalTrades: '1400',
      },
    ]);
  });
  it('retains a full thirty-day graph collected every eight minutes', async () => {
    const now = Date.parse('2026-10-09T12:00:00Z');
    const rows = Array.from({ length: 5401 }, (_, index) => ({
      fetchedAt: new Date(now - index * 8 * 60000),
      payload: { price: '100', stock: 2, totalTrades: String(10000 - index) },
    }));
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: (cap: number) => Promise.resolve(rows.slice(0, cap)),
    };
    const database = { db: { select: () => query } } as unknown as DatabaseService;
    const result = await new MarketHistoryService(database).history('sa', 10, 0, 'pt');
    expect(result.points).toHaveLength(5401);
    expect(result.points[0].fetchedAt.toISOString()).toBe('2026-09-09T12:00:00.000Z');
    expect(result.points[5400].fetchedAt.toISOString()).toBe('2026-10-09T12:00:00.000Z');
  });
  it('reads only requested variants and preserves complete pairs when another series is truncated', async () => {
    const row = (itemId: number, subId: number) => ({
      itemId,
      subId,
      fetchedAt: new Date('2026-10-09T12:00:00Z'),
      payload: { price: '10', totalTrades: '100' },
    });
    const rows = [row(10, 5), ...Array.from({ length: 600000 }, () => row(20, 0))];
    let filter!: { sql: string; params: unknown[] };
    const query = {
      from: () => query,
      where: (condition: SQL) => {
        filter = new PgDialect().sqlToQuery(condition);
        return query;
      },
      orderBy: () => query,
      limit: (cap: number) => Promise.resolve(rows.slice(0, cap)),
    };
    const database = { db: { select: () => query } } as unknown as DatabaseService;
    const result = await new MarketHistoryService(database).boardObservations(
      'sa',
      [10, 20],
      'pt',
      Date.parse('2026-10-09T12:00:00Z'),
      [
        { itemId: 10, subId: 5 },
        { itemId: 20, subId: 0 },
      ],
    );
    expect(result).toEqual([row(10, 5)]);
    expect(filter.sql).toContain('sub_id');
    expect(filter.params).toContain(5);
  }, 30_000);
});
