import { Module } from '@nestjs/common';

import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogImporterService } from './catalog-importer.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogImporterService, CatalogService],
  exports: [CatalogImporterService],
})
export class CatalogModule {}
