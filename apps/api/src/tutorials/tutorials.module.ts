import { Module } from '@nestjs/common';

import { FirebaseAuthService } from '../workspace/firebase-auth.service';
import { IdentityService } from '../workspace/identity.service';
import { TutorialsController } from './tutorials.controller';
import { TutorialsService } from './tutorials.service';

@Module({
  controllers: [TutorialsController],
  providers: [TutorialsService, IdentityService, FirebaseAuthService],
})
export class TutorialsModule {}
