import { MARKET_REFRESH_MS } from './market-history';

/** Browser-only refresh lifecycle. Inactive tabs retain data while timers are suspended. */
export class MarketRefresh {
  private active = false;
  private lastRefresh = Date.now();
  private timer?: ReturnType<typeof setTimeout>;
  private readonly visibilityChanged = () => this.schedule();
  constructor(
    private readonly document: Document,
    private readonly refresh: () => void,
  ) {
    document.addEventListener('visibilitychange', this.visibilityChanged);
  }
  setActive(active: boolean): void {
    this.active = active;
    this.schedule();
  }
  markRefreshed(): void {
    this.lastRefresh = Date.now();
    this.schedule();
  }
  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.active || this.document.hidden) return;
    const remaining = MARKET_REFRESH_MS - (Date.now() - this.lastRefresh);
    if (remaining <= 0) {
      this.lastRefresh = Date.now();
      this.refresh();
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.schedule(),
      Math.max(1, MARKET_REFRESH_MS - (Date.now() - this.lastRefresh)),
    );
  }
  destroy(): void {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.document.removeEventListener('visibilitychange', this.visibilityChanged);
  }
}
