import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MarketService } from './market.service';
import { MarketHistoryService } from './market-history.service';
@Injectable()
export class MarketCollector implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private stopped = false;
  private readonly logger = new Logger(MarketCollector.name);
  constructor(
    private readonly config: ConfigService,
    private readonly market: MarketService,
    private readonly history: MarketHistoryService,
  ) {}
  onModuleInit() {
    if (!this.config.get<boolean>('MARKET_COLLECTOR_ENABLED', false)) return;
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
      8 * 60 * 1000,
    );
    this.timer.unref();
  }
  private async collect() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      const value = this.config.get<string>('MARKET_TRACKED_ITEMS', '');
      const ids = [
        ...new Set(
          value
            .split(',')
            .map(Number)
            .filter((id) => Number.isSafeInteger(id) && id > 0 && id <= 2e9),
        ),
      ].slice(0, 20);
      for (const id of ids) {
        try {
          await this.market.lookup('sa', id, 'pt');
        } catch {
          this.logger.warn(
            'Uma consulta agendada ficou indisponível; os dados anteriores foram preservados.',
          );
        }
      }
      await this.history.prune();
    } catch {
      this.logger.warn('Não foi possível concluir a coleta agendada.');
    } finally {
      this.running = false;
    }
  }
}
