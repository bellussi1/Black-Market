import {
  categories,
  categoryTranslations,
  itemCategories,
  itemTranslations,
  itemVersions,
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
  marketPriceReference,
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
import { type MarketLookup, normalizeArshaHot, normalizeArshaSummary } from './arsha-provider';
import { MarketHistoryService } from './market-history.service';
import { type MarketObservation, observedMarketStatistics } from './market-statistics';

const TTL = 8 * 60 * 1000;
const querySchema = z.object({
  region: z.enum(MARKET_PROVIDER_REGIONS).default(DEFAULT_REGION),
  locale: z.preprocess(
    (value) => (typeof value === 'string' ? dataLocaleForUi(value) : value),
    z.enum(DATA_LOCALES).default(DEFAULT_DATA_LOCALE),
  ),
  q: z.string().trim().max(80).default(''),
  categoryId: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['hot', 'price', 'stock', 'name']).default('hot'),
  direction: z.enum(['asc', 'desc']).optional(),
  stock: z.enum(['all', 'in_stock', 'out_of_stock']).default('all'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .refine((value) => [20, 50, 100].includes(value))
    .default(20),
});
type Metadata = { name: string; categories: CatalogCategory[] };
type BoardQuery = z.infer<typeof querySchema>;
type BoardCandidate = Pick<CatalogItem, 'id' | 'name' | 'iconUrl' | 'categories'>;
type HeldBoard = {
  response: MarketLookup;
  metadata: Map<number, Metadata>;
  expires: number;
  retryAt: number;
  catalogItems?: BoardCandidate[];
  total?: number;
  categories?: CatalogCategory[];
  quotesUnavailable?: boolean;
};

function normalized(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();
}

@Injectable()
export class MarketBoardService {
  private readonly cache = new Map<string, HeldBoard>();
  private readonly productionCache = new Map<string, HeldBoard>();
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

  /** Consumable production inputs; summary scope never establishes equipment variants. */
  async productionQuotes(rawQuery: Record<string, unknown>): Promise<MarketLookup> {
    const parsed = querySchema
      .pick({ region: true, locale: true })
      .extend({
        ids: z
          .string()
          .max(1200)
          .regex(/^\d+(,\d+)*$/)
          .transform((value) => [...new Set(value.split(',').map(Number))])
          .refine(
            (ids) =>
              ids.length > 0 &&
              ids.length <= 100 &&
              ids.every((id) => Number.isSafeInteger(id) && id > 0 && id <= 2_000_000_000),
          ),
      })
      .safeParse(rawQuery);
    if (!parsed.success) throw new BadRequestException('Informe até 100 IDs de materiais válidos.');
    if (!this.config.get<boolean>('MARKET_PROVIDER_ENABLED', true))
      throw new ServiceUnavailableException('O mercado está indisponível no momento.');
    const { region, locale } = parsed.data;
    const dataset = await this.catalog.getActiveDataset(region, undefined, locale);
    const requested = new Set(parsed.data.ids);
    const rows = dataset
      ? await this.database.db
          .select({
            itemId: itemVersions.itemId,
            category: itemVersions.category,
            sourceData: itemVersions.sourceData,
          })
          .from(itemVersions)
          .where(
            and(
              eq(itemVersions.datasetVersionId, dataset.id),
              inArray(itemVersions.itemId, parsed.data.ids),
            ),
          )
      : [];
    const ids = rows
      .filter((row) => {
        const maxEnhance = row.sourceData['maxEnhance'] ?? 0;
        const sourceCategory = row.sourceData['category'];
        const categories = `${row.category ?? ''} ${typeof sourceCategory === 'string' ? sourceCategory : ''}`;
        return (
          requested.has(row.itemId) &&
          typeof maxEnhance === 'number' &&
          Number.isFinite(maxEnhance) &&
          maxEnhance <= 0 &&
          !/weapon|armor|accessory/i.test(categories)
        );
      })
      .map((row) => row.itemId)
      .sort((a, b) => a - b);
    if (!ids.length)
      return {
        source: 'arsha',
        region,
        locale,
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        upstreamCacheMinutes: 30,
        items: [],
      };
    const key = `production:${dataset!.id}:${region}:${locale}:${ids.join(',')}`;
    const held = await this.loadBoard(key, async () => {
      let items: MarketLookup['items'];
      try {
        items = normalizeArshaSummary(
          await this.fetchPayload(`https://api.arsha.io/v2/${region}/search?lang=${locale}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids),
          }),
          ids,
        );
      } catch {
        throw new ServiceUnavailableException(
          'Não foi possível consultar os preços de produção. Tente novamente.',
        );
      }
      const now = Date.now();
      const entry: HeldBoard = {
        response: {
          source: 'arsha',
          region,
          locale,
          fetchedAt: new Date(now).toISOString(),
          cacheStatus: 'fetched',
          upstreamCacheMinutes: 30,
          items,
        },
        metadata: new Map(),
        expires: now + TTL,
        retryAt: 0,
      };
      this.storeBoard(key, entry);
      return entry;
    });
    return held.response;
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
    if (query.q || query.categoryId) return this.catalogBoard(query);
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
    if (query.stock !== 'all')
      matches = matches.filter((item) =>
        query.stock === 'in_stock' ? item.stock > 0 : item.stock === 0,
      );
    if (query.sort !== 'hot') {
      // Defaults keep the documented behaviour: cheapest first, most stocked first, A-Z.
      const defaultDirection = query.sort === 'stock' ? 'desc' : 'asc';
      const flip = (query.direction ?? defaultDirection) !== defaultDirection ? -1 : 1;
      const tie = (a: (typeof matches)[number], b: (typeof matches)[number]) =>
        a.itemId - b.itemId || a.subId - b.subId;
      matches = [...matches].sort((a, b) => {
        if (query.sort === 'price') {
          // Unknown prices stay last in both directions: they carry no ordering information.
          const leftPrice = marketPriceReference(a).value;
          const rightPrice = marketPriceReference(b).value;
          if (leftPrice === null && rightPrice !== null) return 1;
          if (rightPrice === null && leftPrice !== null) return -1;
          const left = BigInt(leftPrice ?? '0');
          const right = BigInt(rightPrice ?? '0');
          return left === right ? tie(a, b) : (left < right ? -1 : 1) * flip;
        }
        if (query.sort === 'stock') {
          return a.stock === b.stock ? tie(a, b) : (b.stock - a.stock) * flip;
        }
        const byName =
          (held.metadata.get(a.itemId)?.name ?? a.name).localeCompare(
            held.metadata.get(b.itemId)?.name ?? b.name,
            query.locale,
          ) * flip;
        return byName || tie(a, b);
      });
    }
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
      this.history
        .boardObservations(
          query.region,
          ids,
          query.locale,
          now,
          page.map((item) => ({ itemId: item.itemId, subId: item.subId })),
        )
        .catch(() => []),
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
    for (const category of held.categories ?? []) allCategories.set(category.id, category);
    for (const metadata of held.metadata.values())
      for (const category of metadata.categories) allCategories.set(category.id, category);
    return {
      ...held.response,
      scope: 'hot',
      sort: query.sort,
      refreshMinutes: 8,
      items: page.map((item) => ({
        ...item,
        quoteScope: 'variant',
        marketAvailable: true,
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

  private async catalogBoard(query: BoardQuery): Promise<MarketBoardResponse> {
    const key = `${query.region}:${query.locale}:catalog:${JSON.stringify([
      normalized(query.q),
      query.categoryId,
      query.page,
      query.pageSize,
    ])}`;
    const held = await this.loadBoard(key, (previous) =>
      this.fetchCatalogBoard(key, query, previous),
    );
    const quotes = new Map(held.response.items.map((item) => [item.itemId, item]));
    return {
      ...held.response,
      scope: query.q ? 'search' : 'category',
      sort: 'name',
      refreshMinutes: 8,
      quotesUnavailable: held.quotesUnavailable ?? false,
      total: held.total ?? 0,
      page: query.page,
      pageSize: query.pageSize as MarketBoardPageSize,
      categories: held.categories ?? [],
      items: (held.catalogItems ?? []).map((item) => {
        const quote = quotes.get(item.id);
        return {
          itemId: item.id,
          // Placeholder only: consumers must obtain /item variants before showing history.
          subId: 0,
          name: item.name,
          price: quote?.price ?? null,
          stock: quote?.stock ?? null,
          totalTrades: quote?.totalTrades ?? null,
          minPrice: null,
          maxPrice: quote?.maxPrice ?? null,
          lastSoldPrice: null,
          lastSoldAt: null,
          quoteScope: 'summary',
          marketAvailable: Boolean(quote),
          iconUrl: item.iconUrl ?? null,
          categories: item.categories,
          ...observedMarketStatistics([], Date.now()),
        };
      }),
    };
  }

  private async fetchCatalogBoard(
    key: string,
    query: BoardQuery,
    held?: HeldBoard,
  ): Promise<HeldBoard> {
    try {
      const catalogQuery = {
        region: query.region,
        preferredLocale: query.locale,
        q: query.q,
        categoryId: query.categoryId,
        page: query.page,
        pageSize: query.pageSize,
      };
      const [catalogPage, categoryPage] = await Promise.all([
        this.catalog.listItems(catalogQuery),
        this.catalog.listCategories({ region: query.region, preferredLocale: query.locale }),
      ]);
      let candidates: BoardCandidate[] = catalogPage.items;
      let total = catalogPage.total;
      const exactId = /^\d+$/.test(query.q) ? Number(query.q) : null;
      // An exact provider ID remains usable before it reaches the local catalog.
      if (
        !total &&
        !query.categoryId &&
        exactId &&
        Number.isSafeInteger(exactId) &&
        exactId <= 2_000_000_000
      ) {
        total = 1;
        if (query.page === 1)
          candidates = [{ id: exactId, name: `Item #${exactId}`, iconUrl: null, categories: [] }];
      }
      const ids = candidates.map((item) => item.id);
      let items: MarketLookup['items'] = [];
      let quotesUnavailable = false;
      try {
        if (ids.length)
          items = normalizeArshaSummary(
            await this.fetchPayload(
              `https://api.arsha.io/v2/${query.region}/search?lang=${query.locale}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids),
              },
            ),
            ids,
          );
      } catch {
        if (held) {
          held.retryAt = Date.now() + 60000;
          held.quotesUnavailable = true;
          return { ...held, response: { ...held.response, cacheStatus: 'stale' } };
        }
        quotesUnavailable = true;
      }
      const byId = new Map(items.map((item) => [item.itemId, item]));
      // Provider names supply the label for IDs not yet present in the catalog.
      if (!catalogPage.total)
        candidates = candidates.map((item) => ({
          ...item,
          name: byId.get(item.id)?.name ?? item.name,
        }));
      const entry: HeldBoard = {
        response: {
          source: 'arsha',
          region: query.region,
          locale: query.locale,
          fetchedAt: new Date().toISOString(),
          cacheStatus: quotesUnavailable ? 'stale' : 'fetched',
          upstreamCacheMinutes: 30,
          items,
        },
        metadata: new Map(),
        catalogItems: candidates,
        total,
        categories: categoryPage.categories,
        quotesUnavailable,
        expires: quotesUnavailable ? 0 : Date.now() + TTL,
        retryAt: quotesUnavailable ? Date.now() + 60000 : 0,
      };
      this.storeBoard(key, entry);
      // Summaries must not become sid=0 observations or hydrate complete /item snapshots.
      return entry;
    } catch {
      if (held) {
        held.retryAt = Date.now() + 60000;
        return { ...held, response: { ...held.response, cacheStatus: 'stale' } };
      }
      throw new ServiceUnavailableException(
        'Não foi possível consultar os itens do catálogo no mercado.',
      );
    }
  }

  private async hot(region: string, locale: string): Promise<HeldBoard> {
    const key = `${region}:${locale}`;
    return this.loadBoard(key, (held) => this.fetchHot(region, locale, held));
  }

  private async loadBoard(
    key: string,
    fetchBoard: (held?: HeldBoard) => Promise<HeldBoard>,
  ): Promise<HeldBoard> {
    const held = (key.startsWith('production:') ? this.productionCache : this.cache).get(key);
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
    const request = fetchBoard(held);
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
      const items = normalizeArshaHot(
        await this.fetchPayload(`https://api.arsha.io/v2/${region}/hot?lang=${locale}`),
      );
      const response: MarketLookup = {
        source: 'arsha',
        region,
        locale,
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        upstreamCacheMinutes: 30,
        items,
      };
      const [metadata, categoryPage] = await Promise.all([
        this.metadata(
          region,
          locale,
          items.map((item) => item.itemId),
        ).catch(() => new Map<number, Metadata>()),
        this.catalog.listCategories({ region, preferredLocale: locale }).catch(() => null),
      ]);
      const entry = {
        response,
        metadata,
        categories: categoryPage?.categories,
        expires: Date.now() + TTL,
        retryAt: 0,
      };
      const key = `${region}:${locale}`;
      this.storeBoard(key, entry);
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

  private storeBoard(key: string, entry: HeldBoard) {
    const production = key.startsWith('production:');
    const cache = production ? this.productionCache : this.cache;
    const capacity = production ? 24 : 15;
    if (!cache.has(key) && cache.size >= capacity) cache.delete(cache.keys().next().value!);
    cache.set(key, entry);
  }

  private async fetchPayload(url: string, options: RequestInit = {}): Promise<unknown> {
    const upstream = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', ...options.headers },
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
    return JSON.parse(text);
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
