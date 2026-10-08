import { Body, Controller, Delete, Get, Header, Headers, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IdentityService } from './identity.service';
import { WorkspaceService } from './workspace.service';
@ApiTags('Conta e dados pessoais')
@Controller()
export class WorkspaceController {
  constructor(
    private readonly identity: IdentityService,
    private readonly workspaces: WorkspaceService,
  ) {}
  @Get('identity/config') config() {
    return this.identity.publicConfig();
  }
  @Get('workspace') @Header('Cache-Control', 'private,no-store') async get(
    @Headers('authorization') token: string | undefined,
  ) {
    return this.workspaces.get(await this.identity.owner(token));
  }
  @Put('workspace') @Header('Cache-Control', 'private,no-store') async put(
    @Headers('authorization') token: string | undefined,
    @Body() body: unknown,
  ) {
    return this.workspaces.save(await this.identity.owner(token), body);
  }
  @Delete('workspace') @Header('Cache-Control', 'private,no-store') async remove(
    @Headers('authorization') token: string | undefined,
  ) {
    return this.workspaces.remove(await this.identity.owner(token));
  }
}
