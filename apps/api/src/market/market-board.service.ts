import {
  categories,
  categoryTranslations,
  itemCategories,
  itemTranslations,
} from '@bdo/database/schema';
import type {
  CatalogCategory,
  CatalogItem,
  MarketBoardPageSize,
  MarketBoardResponse,
} from '@bdo/shared';
import {
  DATA_LOCALES,
  dataLocaleForUi,
  DEFAULT_DATA_LOCALE,
  DEFAULT_REGION,
  MARKET_PROVIDER_REGIONS,
} from '@bdo/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { CatalogService } from '../catalog/catalog.service';
import { DatabaseService } from '../database/database.service';
import { type MarketLookup, normalizeArshaHot } from './arsha-provider';
import { MarketHistoryService } from './market-history.service';
import { type MarketObservation, observedMarketStatistics } from './market-statistics';

const TTL = 30 * 60 * 1000;
const querySchema = z.object({
  region: z.enum(MARKET_PROVIDER_REGIONS).default(DEFAULT_REGION),
  locale: z.preprocess(
    (value) => (typeof value === 'string' ? dataLocaleForUi(value) : value),
    z.enum(DATA_LOCALES).default(DEFAULT_DATA_LOCALE),
  ),
  q: z.string().trim().max(80).default(''),
  categoryId: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['hot', 'price', 'stock', 'name']).default('hot'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .refine((value) => [20, 50, 100].includes(value))
    .default(20),
});
type Metadata = { name: string; categories: CatalogCategory[] };
type HeldBoard = {
  response: MarketLookup;
  metadata: Map<number, Metadata>;
  expires: number;
  retryAt: number;
};

function normalized(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();
}

@Injectable()
export class MarketBoardService {
  private readonly cache = new Map<string, HeldBoard>();
  private readonly pending = new Map<string, Promise<HeldBoard>>();
  private active = 0;
  private requests = 0;
  private windowStart = Date.now();

  constructor(
    private readonly config: ConfigService,
    private readonly catalog: CatalogService,
    private readonly database: DatabaseService,
    private readonly history: MarketHistoryService,
  ) {}

  /** The SA board collector shares the same cached hot request as page visits. */
  async refresh(): Promise<void> {
    if (!this.config.get<boolean>('MARKET_PROVIDER_ENABLED', true)) return;
    await this.hot(DEFAULT_REGION, DEFAULT_DATA_LOCALE);
  }

  async board(rawQuery: Record<string, unknown>): Promise<MarketBoardResponse> {
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success)
      throw new BadRequestException(
        'Confira os filtros, a região e o tamanho da página (20, 50 ou 100).',
      );
    if (!this.config.get<boolean>('MARKET_PROVIDER_ENABLED', true))
      throw new ServiceUnavailableException('O mercado está indisponível no momento.');
    const query = parsed.data;
    const held = await this.hot(query.region, query.locale);
    const terms = normalized(query.q).split(/\s+/).filter(Boolean);
    let matches = held.response.items.filter((item) => {
      const metadata = held.metadata.get(item.itemId);
      const names = normalized(`${item.name} ${metadata?.name ?? ''}`);
      return (
        terms.every((term) =>
          /^\d+$/.test(term) ? String(item.itemId) === term : names.includes(term),
        ) &&
        (!query.categoryId ||
          metadata?.categories.some(
            (category) =>
              category.id === query.categoryId || category.parentId === query.categoryId,
          ))
      );
    });
    if (query.sort !== 'hot')
      matches = [...matches].sort((a, b) => {
        if (query.sort === 'price') {
          if (a.price === null && b.price !== null) return 1;
          if (b.price === null && a.price !== null) return -1;
          const left = BigInt(a.price ?? '0');
          const right = BigInt(b.price ?? '0');
          return left === right ? a.itemId - b.itemId || a.subId - b.subId : left < right ? -1 : 1;
        }
        if (query.sort === 'stock')
          return b.stock - a.stock || a.itemId - b.itemId || a.subId - b.subId;
        return (
          (held.metadata.get(a.itemId)?.name ?? a.name).localeCompare(
            held.metadata.get(b.itemId)?.name ?? b.name,
            query.locale,
          ) ||
          a.itemId - b.itemId ||
          a.subId - b.subId
        );
      });
    const page = matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    const ids = [...new Set(page.map((item) => item.itemId))];
    const now = Date.now();
    const [catalogItems, observations] = await Promise.all([
      ids.length
        ? this.catalog
            .listItems({
              region: query.region,
              preferredLocale: query.locale,
              ids: ids.join(','),
              pageSize: 100,
            })
            .then((result) => result.items)
            .catch(() => [] as CatalogItem[])
        : Promise.resolve([] as CatalogItem[]),
      this.history.boardObservations(query.region, ids, query.locale, now).catch(() => []),
    ]);
    const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
    const byItem = new Map<string, MarketObservation[]>();
    for (const point of observations) {
      const key = `${point.itemId}:${point.subId}`;
      const existing = byItem.get(key) ?? [];
      existing.push(point);
      byItem.set(key, existing);
    }
    const allCategories = new Map<string, CatalogCategory>();
    for (const metadata of held.metadata.values())
      for (const category of metadata.categories) allCategories.set(category.id, category);
    return {
      ...held.response,
      items: page.map((item) => ({
        ...item,
        name:
          held.metadata.get(item.itemId)?.name ?? catalogById.get(item.itemId)?.name ?? item.name,
        iconUrl: catalogById.get(item.itemId)?.iconUrl ?? null,
        categories:
          held.metadata.get(item.itemId)?.categories ??
          catalogById.get(item.itemId)?.categories ??
          [],
        ...observedMarketStatistics(byItem.get(`${item.itemId}:${item.subId}`) ?? [], now),
      })),
      total: matches.length,
      page: query.page,
      pageSize: query.pageSize as MarketBoardPageSize,
      categories: [...allCategories.values()].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, query.locale),
      ),
    };
  }

  private async hot(region: string, locale: string): Promise<HeldBoard> {
    const key = `${region}:${locale}`;
    const held = this.cache.get(key);
    const now = Date.now();
    if (held && held.expires > now)
      return { ...held, response: { ...held.response, cacheStatus: 'cached' } };
    if (held && held.retryAt > now)
      return { ...held, response: { ...held.response, cacheStatus: 'stale' } };
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (now - this.windowStart >= 60000) {
      this.windowStart = now;
      this.requests = 0;
    }
    if (this.active >= 2 || this.requests >= 20) {
      if (held) return { ...held, response: { ...held.response, cacheStatus: 'stale' } };
      throw new HttpException(
        'Aguarde antes de atualizar o mercado.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.active++;
    this.requests++;
    const request = this.fetchHot(region, locale, held);
    this.pending.set(key, request);
    try {
      return await request;
    } finally {
      this.active--;
      this.pending.delete(key);
    }
  }

  private async fetchHot(region: string, locale: string, held?: HeldBoard): Promise<HeldBoard> {
    try {
      const upstream = await fetch(`https://api.arsha.io/v2/${region}/hot?lang=${locale}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (!upstream.ok) throw new Error('Upstream unavailable');
      const reader = upstream.body?.getReader();
      if (!reader) throw new Error('Empty upstream body');
      const decoder = new TextDecoder();
      let text = '';
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 2_000_000) {
            await reader.cancel();
            throw new Error('Payload too large');
          }
          text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        reader.releaseLock();
      }
      const items = normalizeArshaHot(JSON.parse(text));
      const response: MarketLookup = {
        source: 'arsha',
        region,
        locale,
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        upstreamCacheMinutes: 30,
        items,
      };
      const metadata = await this.metadata(
        region,
        locale,
        items.map((item) => item.itemId),
      ).catch(() => new Map<number, Metadata>());
      const entry = { response, metadata, expires: Date.now() + TTL, retryAt: 0 };
      const key = `${region}:${locale}`;
      if (!this.cache.has(key) && this.cache.size >= 15)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, entry);
      await this.history.save(response, 'hot').catch(() => undefined);
      return entry;
    } catch {
      if (held) {
        held.retryAt = Date.now() + 60000;
        return { ...held, response: { ...held.response, cacheStatus: 'stale' } };
      }
      throw new ServiceUnavailableException('O provedor não forneceu um quadro de mercado válido.');
    }
  }

  private async metadata(region: string, locale: string, ids: number[]) {
    const result = new Map<number, Metadata>();
    const dataset = await this.catalog.getActiveDataset(region, undefined, locale);
    if (!dataset || !ids.length) return result;
    const rows = await this.database.db
      .select({
        itemId: itemTranslations.itemId,
        name: itemTranslations.name,
        id: categories.id,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        categoryName: categoryTranslations.name,
      })
      .from(itemTranslations)
      .leftJoin(
        itemCategories,
        and(
          eq(itemCategories.datasetVersionId, itemTranslations.datasetVersionId),
          eq(itemCategories.itemId, itemTranslations.itemId),
        ),
      )
      .leftJoin(
        categories,
        and(
          eq(categories.datasetVersionId, itemCategories.datasetVersionId),
          eq(categories.id, itemCategories.categoryId),
        ),
      )
      .leftJoin(
        categoryTranslations,
        and(
          eq(categoryTranslations.datasetVersionId, categories.datasetVersionId),
          eq(categoryTranslations.categoryId, categories.id),
          eq(categoryTranslations.language, dataset.locale),
        ),
      )
      .where(
        and(
          eq(itemTranslations.datasetVersionId, dataset.id),
          eq(itemTranslations.language, dataset.locale),
          inArray(itemTranslations.itemId, [...new Set(ids)]),
        ),
      );
    for (const row of rows) {
      const metadata = result.get(row.itemId) ?? { name: row.name, categories: [] };
      if (row.id && row.categoryName)
        metadata.categories.push({
          id: row.id,
          parentId: row.parentId,
          sortOrder: row.sortOrder ?? 0,
          name: row.categoryName,
        });
      result.set(row.itemId, metadata);
    }
    return result;
  }
}
