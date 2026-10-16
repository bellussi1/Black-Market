import { Body, Controller, Get, Header, Headers, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IdentityService } from '../workspace/identity.service';
import { TutorialsService } from './tutorials.service';

@ApiTags('Tutorials')
@Controller('tutorials')
export class TutorialsController {
  constructor(
    private readonly tutorials: TutorialsService,
    private readonly identity: IdentityService,
  ) {}

  @Get('manage')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Retorna telas registradas e tutoriais para edição administrativa' })
  async getForManagement(@Headers('authorization') authorization?: string) {
    await this.identity.roadmapAdmin(authorization);
    return this.tutorials.getManagement();
  }

  @Put('manage/:screenKey')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Substitui atomicamente o tutorial de uma tela registrada' })
  async replace(
    @Headers('authorization') authorization: string | undefined,
    @Param('screenKey') screenKey: string,
    @Query('locale') locale = 'pt-BR',
    @Body() body: unknown,
  ) {
    await this.identity.roadmapAdmin(authorization);
    return this.tutorials.replace(screenKey, locale, body);
  }

  @Get(':screenKey')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Retorna o tutorial publicado para uma tela registrada' })
  getPublic(@Param('screenKey') screenKey: string, @Query('locale') locale = 'pt-BR') {
    return this.tutorials.getPublished(screenKey, locale);
  }
}
