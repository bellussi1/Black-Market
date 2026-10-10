import { describe, expect, it, vi } from 'vitest';

import { MARKET_REFRESH_MS } from './market-history';
import { MarketRefresh } from './market-refresh';

describe('market refresh lifecycle', () => {
  it('waits eight minutes after a successful response so the server cache can expire', () => {
    vi.useFakeTimers();
    const doc = new EventTarget() as Document;
    Object.defineProperty(doc, 'hidden', { value: false });
    const update = vi.fn();
    const refresh = new MarketRefresh(doc, update);
    refresh.setActive(true);
    vi.advanceTimersByTime(2_000);
    refresh.markRefreshed();
    vi.advanceTimersByTime(MARKET_REFRESH_MS - 1);
    expect(update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(1);
    refresh.destroy();
    vi.useRealTimers();
  });

  it('refreshes every eight minutes, pauses inactive or hidden views and cleans up', () => {
    vi.useFakeTimers();
    let hidden = false;
    const doc = new EventTarget() as Document;
    Object.defineProperty(doc, 'hidden', { get: () => hidden });
    const update = vi.fn();
    const refresh = new MarketRefresh(doc, update);
    refresh.setActive(true);
    vi.advanceTimersByTime(MARKET_REFRESH_MS);
    expect(update).toHaveBeenCalledTimes(1);
    refresh.setActive(false);
    vi.advanceTimersByTime(MARKET_REFRESH_MS);
    expect(update).toHaveBeenCalledTimes(1);
    refresh.setActive(true);
    expect(update).toHaveBeenCalledTimes(2);
    hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(MARKET_REFRESH_MS);
    expect(update).toHaveBeenCalledTimes(2);
    hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(update).toHaveBeenCalledTimes(3);
    refresh.destroy();
    vi.advanceTimersByTime(MARKET_REFRESH_MS * 2);
    expect(update).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
