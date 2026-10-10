import { marketSnapshots } from '@bdo/database/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';

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
      // Thirty days at eight-minute intervals, including separately timed item/hot observations.
      .limit(12000);
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
  async boardObservations(
    region: string,
    itemIds: number[],
    locale: string,
    now: number,
    pairs?: { itemId: number; subId: number }[],
  ) {
    if (!itemIds.length) return [];
    if (pairs && (!pairs.length || pairs.length > 100)) return [];
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
          pairs
            ? or(
                ...pairs.map((pair) =>
                  and(
                    eq(marketSnapshots.itemId, pair.itemId),
                    eq(marketSnapshots.subId, pair.subId),
                  ),
                ),
              )
            : undefined,
          gte(marketSnapshots.fetchedAt, new Date(now - 30 * 86400000 - 3600000)),
        ),
      )
      .orderBy(
        asc(marketSnapshots.itemId),
        asc(marketSnapshots.subId),
        asc(marketSnapshots.fetchedAt),
      )
      .limit(600001);
    if (rows.length < 600001) return rows;
    // Group ordering makes only the final pair potentially incomplete. Preserve
    // earlier complete series; later pairs simply have no established coverage.
    const last = rows[rows.length - 1];
    return rows.filter((row) => row.itemId !== last.itemId || row.subId !== last.subId);
  }
  async prune() {
    await this.database.db
      .delete(marketSnapshots)
      .where(lt(marketSnapshots.fetchedAt, new Date(Date.now() - 31 * 86400000)));
  }
}
