import { Module } from '@nestjs/common';

import { FirebaseAuthService } from './firebase-auth.service';
import { IdentityService } from './identity.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, IdentityService, FirebaseAuthService],
})
export class WorkspaceModule {}
