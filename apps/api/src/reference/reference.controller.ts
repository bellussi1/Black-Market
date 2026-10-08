import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ReferenceService } from './reference.service';
@ApiTags('Referências do jogo')
@Controller('reference')
export class ReferenceController {
  constructor(private readonly references: ReferenceService) {}
  @Get() kinds(@Query() query: Record<string, unknown>) {
    return this.references.kinds(query);
  }
  @Get(':kind') list(@Param('kind') kind: string, @Query() query: Record<string, unknown>) {
    return this.references.list(kind, query);
  }
  @Get(':kind/:id') detail(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.references.detail(kind, id, query);
  }
}
