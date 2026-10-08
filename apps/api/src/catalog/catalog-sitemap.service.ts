import { itemVersions, recipes, referenceRecords } from '@bdo/database/schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asc, count, eq } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { CatalogService } from './catalog.service';
const xml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
@Injectable()
export class CatalogSitemapService {
  constructor(
    private readonly config: ConfigService,
    private readonly catalog: CatalogService,
    private readonly database: DatabaseService,
  ) {}
  origin() {
    const value = this.config.get<string>('PUBLIC_SITE_URL');
    if (!value) throw new NotFoundException('Endereço público ainda não configurado.');
    return new URL(value).origin;
  }
  async index() {
    const origin = this.origin();
    const dataset = await this.catalog.getActiveDataset('sa', undefined, 'pt');
    const types: { type: string; total: number }[] = [{ type: 'public', total: 1 }];
    if (dataset) {
      const [items] = await this.database.db
        .select({ total: count() })
        .from(itemVersions)
        .where(eq(itemVersions.datasetVersionId, dataset.id));
      const [recipeCount] = await this.database.db
        .select({ total: count() })
        .from(recipes)
        .where(eq(recipes.datasetVersionId, dataset.id));
      types.push(
        { type: 'items', total: Number(items?.total ?? 0) },
        { type: 'recipes', total: Number(recipeCount?.total ?? 0) },
      );
      const [referenceCount] = await this.database.db
        .select({ total: count() })
        .from(referenceRecords)
        .where(eq(referenceRecords.datasetVersionId, dataset.id));
      types.push({ type: 'reference', total: Number(referenceCount?.total ?? 0) });
    }
    const maps = types
      .filter((row) => row.total > 0)
      .flatMap((row) =>
        Array.from(
          { length: Math.max(1, Math.ceil(row.total / 10000)) },
          (_, index) =>
            `<sitemap><loc>${xml(origin + '/sitemaps/' + row.type + '/' + (index + 1) + '.xml')}</loc></sitemap>`,
        ),
      );
    return (
      '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      maps.join('') +
      '</sitemapindex>'
    );
  }
  async page(type: string, page: number) {
    if (
      !['public', 'items', 'recipes', 'reference'].includes(type) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100
    )
      throw new BadRequestException('Página não encontrada.');
    const origin = this.origin();
    const dataset = await this.catalog.getActiveDataset('sa', undefined, 'pt');
    let paths: string[] = [];
    if (type === 'public') {
      if (page !== 1) throw new NotFoundException();
      paths = [
        '/',
        '/sobre',
        '/database/items',
        '/recipes',
        '/reference/npcs',
        '/reference/quests',
        '/reference/knowledge',
        '/reference/nodes',
        '/reference/skills',
        '/reference/lightstones',
        '/world',
        '/market',
        '/crafting',
        '/enhancement',
        '/lifeskills',
        '/rng',
        '/buffs',
        '/termos',
        '/privacidade',
        '/cookies',
        '/contato',
      ];
    } else if (dataset) {
      if (type === 'items') {
        const rows = await this.database.db
          .select({ id: itemVersions.itemId })
          .from(itemVersions)
          .where(eq(itemVersions.datasetVersionId, dataset.id))
          .orderBy(asc(itemVersions.itemId))
          .limit(10000)
          .offset((page - 1) * 10000);
        paths = rows.map((row) => '/database/items/' + row.id);
      } else if (type === 'recipes') {
        const rows = await this.database.db
          .select({ key: recipes.recipeKey })
          .from(recipes)
          .where(eq(recipes.datasetVersionId, dataset.id))
          .orderBy(asc(recipes.recipeKey))
          .limit(10000)
          .offset((page - 1) * 10000);
        paths = rows.map((row) => '/recipes/' + encodeURIComponent(row.key));
      } else {
        const rows = await this.database.db
          .select({ kind: referenceRecords.kind, id: referenceRecords.id })
          .from(referenceRecords)
          .where(eq(referenceRecords.datasetVersionId, dataset.id))
          .orderBy(asc(referenceRecords.kind), asc(referenceRecords.id))
          .limit(10000)
          .offset((page - 1) * 10000);
        paths = rows.map(
          (row) => '/reference/' + encodeURIComponent(row.kind) + '/' + encodeURIComponent(row.id),
        );
      }
    }
    if (!paths.length) throw new NotFoundException('Página não encontrada.');
    const stamp = dataset?.finishedAt?.toISOString();
    return (
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths
        .map(
          (path) =>
            '<url><loc>' +
            xml(origin + path) +
            '</loc>' +
            (stamp ? '<lastmod>' + stamp + '</lastmod>' : '') +
            '</url>',
        )
        .join('') +
      '</urlset>'
    );
  }
}
