import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MarketService } from './market.service';
import { MarketHistoryService } from './market-history.service';
@Injectable()
export class MarketCollector implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(MarketCollector.name);
  constructor(
    private readonly config: ConfigService,
    private readonly market: MarketService,
    private readonly history: MarketHistoryService,
  ) {}
  onModuleInit() {
    if (!this.config.get<boolean>('MARKET_COLLECTOR_ENABLED', false)) return;
    this.timer = setInterval(() => void this.collect(), 30 * 60 * 1000);
    this.timer.unref();
    void this.collect();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async collect() {
    if (this.running) return;
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
