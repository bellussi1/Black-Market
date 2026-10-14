import { Module } from '@nestjs/common';

import { IdentityService } from '../workspace/identity.service';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';

@Module({
  controllers: [RoadmapController],
  providers: [RoadmapService, IdentityService],
})
export class RoadmapModule {}
