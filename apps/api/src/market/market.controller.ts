import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MarketService } from './market.service';
const querySchema = z.object({
  region: z.enum(['sa', 'na', 'eu']).default('sa'),
  itemId: z.coerce.number().int().min(1).max(2_000_000_000),
});
@ApiTags('Mercado')
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}
  @Get('items/:id')
  @ApiOperation({ summary: 'Consulta um ID no Arsha, com cache de 30 minutos' })
  @ApiQuery({ name: 'region', required: false, enum: ['sa', 'na', 'eu'] })
  lookup(
    @Param('id') itemId: string,
    @Query('region') region: string | undefined,
  ) {
    const parsed = querySchema.safeParse({ itemId, region });
    if (!parsed.success)
      throw new BadRequestException(
        'Informe um ID inteiro positivo e região sa, na ou eu.',
      );
    return this.market.lookup(parsed.data.region, parsed.data.itemId);
  }
}
