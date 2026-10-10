import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketService } from './market.service';
import { MarketCollector } from './market-collector.service';
import type { MarketHistoryService } from './market-history.service';

describe('tracked item collector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('updates tracked quotes after eight minutes and stops requesting on shutdown', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: 10,
            sid: 0,
            name: 'Item',
            basePrice: 100,
            currentStock: 2,
            totalTrades: 3,
          }),
        ),
      ),
    );
    const config = new ConfigService({
      MARKET_COLLECTOR_ENABLED: true,
      MARKET_TRACKED_ITEMS: '10',
    });
    const market = new MarketService(config);
    const collector = new MarketCollector(config, market, {
      prune: () => Promise.resolve(undefined),
    } as unknown as MarketHistoryService);
    collector.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    expect(upstream).toHaveBeenCalledTimes(2);
    collector.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('schedules the next observation after a slow quote completes so its cache expires', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify({
                    id: 10,
                    sid: 0,
                    name: 'Item',
                    basePrice: 100,
                    currentStock: 2,
                    totalTrades: 3,
                  }),
                ),
              ),
            1000,
          );
        }),
    );
    const config = new ConfigService({
      MARKET_COLLECTOR_ENABLED: true,
      MARKET_TRACKED_ITEMS: '10',
    });
    const collector = new MarketCollector(config, new MarketService(config), {
      prune: () => Promise.resolve(),
    } as unknown as MarketHistoryService);
    collector.onModuleInit();
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    expect(upstream).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(upstream).toHaveBeenCalledTimes(2);
    collector.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(9 * 60 * 1000);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
});
