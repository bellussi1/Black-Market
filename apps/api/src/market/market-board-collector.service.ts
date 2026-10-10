import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MarketBoardService } from './market-board.service';
import { MarketHistoryService } from './market-history.service';

@Injectable()
export class MarketBoardCollector implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private stopped = false;
  private readonly logger = new Logger(MarketBoardCollector.name);
  constructor(
    private readonly config: ConfigService,
    private readonly board: MarketBoardService,
    private readonly history: MarketHistoryService,
  ) {}

  onModuleInit() {
    if (
      !this.config.get<boolean>('MARKET_PROVIDER_ENABLED', true) ||
      !this.config.get<boolean>('MARKET_BOARD_COLLECTOR_ENABLED', true)
    )
      return;
    // Start the timer after the first fetch finishes so its 30-minute cache has
    // expired at the next tick. History warms only while this API stays running.
    void this.collect().then(() => this.schedule());
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(
      () => {
        void this.collect().then(() => this.schedule());
      },
      30 * 60 * 1000,
    );
    this.timer.unref();
  }

  private async collect() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      await this.board.refresh();
      await this.history.prune();
    } catch {
      this.logger.warn('Não foi possível observar o quadro de mercado nesta coleta.');
    } finally {
      this.running = false;
    }
  }
}
