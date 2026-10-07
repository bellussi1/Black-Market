import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogImporterService } from './catalog-importer.service';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogImporterService, CatalogService],
  exports: [CatalogImporterService],
})
export class CatalogModule {}
