import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';
import { WorldController } from './world.controller';
@Module({
  imports: [CatalogModule],
  controllers: [ReferenceController, WorldController],
  providers: [ReferenceService],
})
export class ReferenceModule {}
