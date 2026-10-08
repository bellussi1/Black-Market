import { Module } from '@nestjs/common';

import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { MarketCollector } from './market-collector.service';
import { MarketHistoryService } from './market-history.service';
@Module({
  controllers: [MarketController],
  providers: [MarketService, MarketHistoryService, MarketCollector],
})
export class MarketModule {}
