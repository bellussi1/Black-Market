import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketService } from './market.service';
const payload = {
  id: 10,
  sid: 0,
  name: 'Example',
  basePrice: 100,
  currentStock: 3,
  totalTrades: 5,
};
describe('market cache', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('shares a cached quote instead of multiplying upstream requests', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload)));
    const service = new MarketService(new ConfigService({ MARKET_PROVIDER_ENABLED: true }));
    expect((await service.lookup('sa', 10)).cacheStatus).toBe('fetched');
    expect((await service.lookup('sa', 10)).cacheStatus).toBe('cached');
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('keeps the last valid timestamp during failure and backs off', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(payload)))
      .mockRejectedValue(new Error('unavailable'));
    const service = new MarketService(new ConfigService({ MARKET_PROVIDER_ENABLED: true }));
    const original = await service.lookup('sa', 10);
    vi.setSystemTime(new Date('2026-10-07T12:31:00Z'));
    const stale = await service.lookup('sa', 10);
    expect(stale.cacheStatus).toBe('stale');
    expect(stale.fetchedAt).toBe(original.fetchedAt);
    await service.lookup('sa', 10);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('reuses a quote until eight minutes and then obtains the latest provider observation', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ...payload, currentStock: 7 }))),
      );
    const service = new MarketService(new ConfigService());
    const original = await service.lookup('sa', 10);
    vi.setSystemTime(new Date('2026-10-07T12:07:59Z'));
    expect((await service.lookup('sa', 10)).fetchedAt).toBe(original.fetchedAt);
    vi.setSystemTime(new Date('2026-10-07T12:08:00Z'));
    expect(await service.lookup('sa', 10)).toMatchObject({
      cacheStatus: 'fetched',
      fetchedAt: '2026-10-07T12:08:00.000Z',
      items: [{ ...original.items[0], stock: 7 }],
    });
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('does not make an outbound request when disabled', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch');
    const service = new MarketService(new ConfigService({ MARKET_PROVIDER_ENABLED: false }));
    await expect(service.lookup('sa', 10)).rejects.toThrow();
    expect(upstream).not.toHaveBeenCalled();
  });
});
