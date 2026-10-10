import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { MarketBoardService } from './market-board.service';
import { MarketBoardCollector } from './market-board-collector.service';
import { MarketCollector } from './market-collector.service';
import { MarketHistoryService } from './market-history.service';
@Module({
  imports: [CatalogModule],
  controllers: [MarketController],
  providers: [
    MarketService,
    MarketHistoryService,
    MarketCollector,
    MarketBoardService,
    MarketBoardCollector,
  ],
})
export class MarketModule {}
