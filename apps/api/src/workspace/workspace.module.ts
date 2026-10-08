import { Module } from '@nestjs/common';

import { IdentityService } from './identity.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
@Module({ controllers: [WorkspaceController], providers: [WorkspaceService, IdentityService] })
export class WorkspaceModule {}
