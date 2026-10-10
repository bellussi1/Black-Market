import { marketSnapshots } from '@bdo/database/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import type { MarketLookup } from './arsha-provider';
@Injectable()
export class MarketHistoryService {
  constructor(private readonly database: DatabaseService) {}
  async save(response: MarketLookup, quoteScope: 'item' | 'hot' = 'item') {
    const fetchedAt = new Date(response.fetchedAt);
    const values = response.items.map((item) => ({
      region: response.region,
      itemId: item.itemId,
      subId: item.subId,
      locale: response.locale ?? 'pt',
      payload: { ...item, quoteScope },
      fetchedAt,
    }));
    if (!values.length) return;
    const insert = this.database.db.insert(marketSnapshots).values(values);
    if (quoteScope === 'hot') await insert.onConflictDoNothing();
    else
      await insert.onConflictDoUpdate({
        target: [
          marketSnapshots.region,
          marketSnapshots.itemId,
          marketSnapshots.subId,
          marketSnapshots.locale,
          marketSnapshots.fetchedAt,
        ],
        set: { payload: sql`excluded.payload` },
      });
  }
  async latest(region: string, id: number, locale: string): Promise<MarketLookup | null> {
    const filters = [
      eq(marketSnapshots.region, region),
      eq(marketSnapshots.itemId, id),
      eq(marketSnapshots.locale, locale),
      // Only explicit complete /item snapshots can hydrate the item quote cache.
      // Legacy observations may have come from /hot, so their scope is unknown.
      eq(sql<string>`${marketSnapshots.payload}->>'quoteScope'`, 'item'),
    ];
    const [latest] = await this.database.db
      .select({ fetchedAt: marketSnapshots.fetchedAt })
      .from(marketSnapshots)
      .where(and(...filters))
      .orderBy(desc(marketSnapshots.fetchedAt))
      .limit(1);
    if (!latest) return null;
    const rows = await this.database.db
      .select()
      .from(marketSnapshots)
      .where(and(...filters, eq(marketSnapshots.fetchedAt, latest.fetchedAt)))
      .limit(50);
    return {
      source: 'arsha',
      region,
      locale,
      fetchedAt: latest.fetchedAt.toISOString(),
      cacheStatus: 'cached',
      upstreamCacheMinutes: 30,
      items: rows.map((row) => {
        const { quoteScope: _scope, ...quote } = row.payload;
        return quote as unknown as MarketLookup['items'][number];
      }),
    };
  }
  async history(region: string, id: number, subId: number, locale: string) {
    const rows = await this.database.db
      .select({ fetchedAt: marketSnapshots.fetchedAt, payload: marketSnapshots.payload })
      .from(marketSnapshots)
      .where(
        and(
          eq(marketSnapshots.region, region),
          eq(marketSnapshots.itemId, id),
          eq(marketSnapshots.subId, subId),
          eq(marketSnapshots.locale, locale),
        ),
      )
      .orderBy(desc(marketSnapshots.fetchedAt))
      .limit(1500);
    return {
      region,
      itemId: id,
      subId,
      source: 'arsha',
      points: rows.reverse().map((row) => ({
        fetchedAt: row.fetchedAt,
        price: row.payload['price'] ?? null,
        stock: row.payload['stock'] ?? null,
        totalTrades: row.payload['totalTrades'] ?? null,
      })),
    };
  }
  async boardObservations(region: string, itemIds: number[], locale: string, now: number) {
    if (!itemIds.length) return [];
    const rows = await this.database.db
      .select({
        itemId: marketSnapshots.itemId,
        subId: marketSnapshots.subId,
        fetchedAt: marketSnapshots.fetchedAt,
        payload: marketSnapshots.payload,
      })
      .from(marketSnapshots)
      .where(
        and(
          eq(marketSnapshots.region, region),
          eq(marketSnapshots.locale, locale),
          inArray(marketSnapshots.itemId, itemIds),
          gte(marketSnapshots.fetchedAt, new Date(now - 30 * 86400000 - 3600000)),
        ),
      )
      .orderBy(asc(marketSnapshots.fetchedAt))
      .limit(150001);
    // A truncated series cannot establish complete window coverage.
    return rows.length >= 150001 ? [] : rows;
  }
  async prune() {
    await this.database.db
      .delete(marketSnapshots)
      .where(lt(marketSnapshots.fetchedAt, new Date(Date.now() - 31 * 86400000)));
  }
}
