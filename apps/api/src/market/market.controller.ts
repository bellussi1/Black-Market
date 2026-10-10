import {
  DATA_LOCALES,
  dataLocaleForUi,
  DEFAULT_DATA_LOCALE,
  DEFAULT_REGION,
  MARKET_PROVIDER_REGIONS,
} from '@bdo/shared';
import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { MarketService } from './market.service';
import { MarketBoardService } from './market-board.service';
import { MarketHistoryService } from './market-history.service';
const querySchema = z.object({
  region: z.enum(MARKET_PROVIDER_REGIONS).default(DEFAULT_REGION),
  locale: z.preprocess(
    (value) => (typeof value === 'string' ? dataLocaleForUi(value) : value),
    z.enum(DATA_LOCALES).default(DEFAULT_DATA_LOCALE),
  ),
  itemId: z.coerce.number().int().min(1).max(2_000_000_000),
});
@ApiTags('Mercado')
@Controller('market')
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly history: MarketHistoryService,
    private readonly boardService: MarketBoardService,
  ) {}
  @Get('board')
  @ApiOperation({
    summary: 'Itens populares e busca no catálogo completo, com atualização local de 8 minutos',
  })
  board(@Query() query: Record<string, unknown>) {
    return this.boardService.board(query);
  }
  @Get('production-quotes')
  @ApiOperation({
    summary: 'Consulta em lote os preços resumidos de até 100 materiais de produção',
  })
  productionQuotes(@Query() query: Record<string, unknown>) {
    return this.boardService.productionQuotes(query);
  }
  @Get('items/:id/history')
  historyFor(@Param('id') itemId: string, @Query() query: Record<string, unknown>) {
    const input = querySchema
      .extend({ subId: z.coerce.number().int().min(0).max(100).default(0) })
      .safeParse({ ...query, itemId });
    if (!input.success) throw new BadRequestException('Confira o item e a região.');
    return this.history.history(
      input.data.region,
      input.data.itemId,
      input.data.subId,
      input.data.locale,
    );
  }
  @Get('items/:id')
  @ApiOperation({ summary: 'Consulta um ID no Arsha, com cache local de 8 minutos' })
  @ApiQuery({ name: 'region', required: false, enum: [...MARKET_PROVIDER_REGIONS] })
  @ApiQuery({ name: 'locale', required: false, enum: [...DATA_LOCALES], example: 'pt' })
  lookup(
    @Param('id') itemId: string,
    @Query('region') region: string | undefined,
    @Query('locale') locale: string | undefined,
  ) {
    const parsed = querySchema.safeParse({ itemId, region, locale });
    if (!parsed.success)
      throw new BadRequestException(
        'Informe um ID positivo, uma região suportada e um idioma válido.',
      );
    return this.market.lookup(parsed.data.region, parsed.data.itemId, parsed.data.locale);
  }
}
