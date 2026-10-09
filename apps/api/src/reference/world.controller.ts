import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';

import { ReferenceService } from './reference.service';
@Controller('world')
export class WorldController {
  constructor(private readonly references: ReferenceService) {}
  @Get('nodes') nodes(@Query() query: Record<string, unknown>) {
    return this.references.nodes(query);
  }
  @Get('item-sources/:id') sources(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
  ) {
    return this.references.itemSources(id, query);
  }
}
