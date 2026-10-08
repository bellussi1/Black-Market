import { marketSnapshots } from '@bdo/database/schema';
import { Injectable } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import type { MarketLookup } from './arsha-provider';
@Injectable()
export class MarketHistoryService {
  constructor(private readonly database: DatabaseService) {}
  async save(response: MarketLookup) {
    const fetchedAt = new Date(response.fetchedAt);
    const values = response.items.map((item) => ({
      region: response.region,
      itemId: item.itemId,
      subId: item.subId,
      locale: response.locale ?? 'pt',
      payload: { ...item },
      fetchedAt,
    }));
    if (values.length)
      await this.database.db.insert(marketSnapshots).values(values).onConflictDoNothing();
  }
  async latest(region: string, id: number, locale: string): Promise<MarketLookup | null> {
    const filters = [
      eq(marketSnapshots.region, region),
      eq(marketSnapshots.itemId, id),
      eq(marketSnapshots.locale, locale),
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
      items: rows.map((row) => row.payload as unknown as MarketLookup['items'][number]),
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
      .limit(180);
    return {
      region,
      itemId: id,
      subId,
      source: 'arsha',
      points: rows.reverse().map((row) => ({
        fetchedAt: row.fetchedAt,
        price: row.payload['price'] ?? null,
        stock: row.payload['stock'] ?? null,
      })),
    };
  }
  async prune() {
    await this.database.db
      .delete(marketSnapshots)
      .where(lt(marketSnapshots.fetchedAt, new Date(Date.now() - 30 * 86400000)));
  }
}
