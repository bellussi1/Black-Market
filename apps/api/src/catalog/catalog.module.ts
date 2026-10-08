import { Module } from '@nestjs/common';

import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogAssetsService } from './catalog-assets.service';
import { CatalogImporterService } from './catalog-importer.service';
import { CatalogSitemapService } from './catalog-sitemap.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogImporterService, CatalogService, CatalogAssetsService, CatalogSitemapService],
  exports: [CatalogImporterService, CatalogService],
})
export class CatalogModule {}
