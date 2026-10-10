import { z } from 'zod';
const integerMoney = z
  .union([
    z.string().regex(/^\d{1,24}$/),
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  ])
  .transform(String);
const rawItemSchema = z.object({
  id: z.number().int().positive(),
  sid: z.number().int().nonnegative(),
  name: z.string().min(1).max(300),
  basePrice: integerMoney,
  currentStock: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  totalTrades: integerMoney,
  priceMin: integerMoney.optional(),
  priceMax: integerMoney.optional(),
  lastSoldPrice: integerMoney.optional(),
  lastSoldTime: z.number().int().nonnegative().optional(),
});
export function normalizeArsha(payload: unknown, expectedId: number) {
  const entries = z
    .array(rawItemSchema)
    .min(1)
    .max(50)
    .parse(Array.isArray(payload) ? payload : [payload]);
  if (entries.some((entry) => entry.id !== expectedId))
    throw new RangeError('O provedor retornou outro ID de item.');
  return entries.map(toQuote);
}

/** The hot endpoint is an ordered board, with many distinct item IDs. */
export function normalizeArshaHot(payload: unknown) {
  const entries = z
    .array(
      rawItemSchema.extend({
        id: z.number().int().positive().max(2_000_000_000),
        sid: z.number().int().nonnegative().max(100),
      }),
    )
    .min(1)
    .max(2000)
    .parse(payload);
  const keys = new Set(entries.map((item) => `${item.id}:${item.sid}`));
  if (keys.size !== entries.length) throw new RangeError('Duplicate hot quote.');
  return entries.map(toQuote);
}

function toQuote(entry: z.infer<typeof rawItemSchema>) {
  return {
    itemId: entry.id,
    subId: entry.sid,
    name: entry.name,
    price: BigInt(entry.basePrice) > 0n ? entry.basePrice : null,
    stock: entry.currentStock,
    totalTrades: entry.totalTrades,
    minPrice: entry.priceMin ?? null,
    maxPrice: entry.priceMax ?? null,
    lastSoldPrice:
      entry.lastSoldPrice && BigInt(entry.lastSoldPrice) > 0n ? entry.lastSoldPrice : null,
    lastSoldAt:
      entry.lastSoldTime && entry.lastSoldTime < 32_503_680_000
        ? new Date(entry.lastSoldTime * 1000).toISOString()
        : null,
  };
}
export type ProviderItem = ReturnType<typeof normalizeArsha>[number];
export interface MarketLookup {
  source: 'arsha';
  region: string;
  locale: string;
  fetchedAt: string;
  cacheStatus: 'fetched' | 'cached' | 'stale';
  upstreamCacheMinutes: number;
  items: ProviderItem[];
}
