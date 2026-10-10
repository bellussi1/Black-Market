import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MarketBoardService } from './market-board.service';
import { MarketBoardCollector } from './market-board-collector.service';
import type { MarketHistoryService } from './market-history.service';

function fixture(config: Record<string, unknown> = {}) {
  const refresh = vi.fn().mockResolvedValue(undefined);
  const prune = vi.fn().mockResolvedValue(undefined);
  const collector = new MarketBoardCollector(
    new ConfigService(config),
    { refresh } as unknown as MarketBoardService,
    { prune } as unknown as MarketHistoryService,
  );
  return { collector, refresh, prune };
}

describe('market board collector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('observes the full board on startup and every 30 minutes, then cancels on shutdown', async () => {
    const { collector, refresh, prune } = fixture();
    collector.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(prune).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(refresh).toHaveBeenCalledTimes(2);
    collector.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it.each([{ MARKET_PROVIDER_ENABLED: false }, { MARKET_BOARD_COLLECTOR_ENABLED: false }])(
    'does not collect when disabled: %j',
    async (config) => {
      const { collector, refresh } = fixture(config);
      collector.onModuleInit();
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(refresh).not.toHaveBeenCalled();
      collector.onModuleDestroy();
    },
  );
  it('avoids overlapping collection and never schedules after shutdown during an in-flight startup', async () => {
    let complete!: () => void;
    const { collector, refresh } = fixture();
    refresh.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    collector.onModuleInit();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    collector.onModuleDestroy();
    complete();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
