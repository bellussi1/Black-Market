import { Body, Controller, Get, Header, Headers, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IdentityService } from '../workspace/identity.service';
import { RoadmapService } from './roadmap.service';

@ApiTags('Roadmap')
@Controller('roadmap')
export class RoadmapController {
  constructor(
    private readonly roadmap: RoadmapService,
    private readonly identity: IdentityService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Retorna o Roadmap público persistido' })
  getPublic() {
    return this.roadmap.list();
  }

  @Get('manage')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Retorna o Roadmap para edição administrativa' })
  async getForManagement(@Headers('authorization') authorization?: string) {
    await this.identity.roadmapAdmin(authorization);
    return this.roadmap.list();
  }

  @Put('manage')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Substitui o conteúdo do Roadmap em uma transação' })
  async replace(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    await this.identity.roadmapAdmin(authorization);
    return this.roadmap.replace(body);
  }
}
