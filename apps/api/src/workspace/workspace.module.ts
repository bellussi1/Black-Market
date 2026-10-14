import { Module } from '@nestjs/common';

import { FirebaseAuthService } from './firebase-auth.service';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { SteamAuthService } from './steam-auth.service';
import { DatabaseSteamAuthStore, STEAM_AUTH_STORE } from './steam-auth.store';
import { SteamOpenIdService } from './steam-openid.service';
import { TestWorkspaceSeeder } from './test-workspace-seeder';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
@Module({
  controllers: [WorkspaceController, IdentityController],
  providers: [
    WorkspaceService,
    IdentityService,
    FirebaseAuthService,
    SteamOpenIdService,
    SteamAuthService,
    TestWorkspaceSeeder,
    DatabaseSteamAuthStore,
    { provide: STEAM_AUTH_STORE, useExisting: DatabaseSteamAuthStore },
  ],
})
export class WorkspaceModule {}
