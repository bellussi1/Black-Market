import { referenceCollections, referenceRecords } from '@bdo/database/schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import { CatalogService } from '../catalog/catalog.service';
import { parseCatalogQuery } from '../catalog/catalog-query';
import { DatabaseService } from '../database/database.service';
import { isReferenceKind, normalizeName, referenceKinds } from './reference-kinds';

@Injectable()
export class ReferenceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly catalog: CatalogService,
  ) {}
  async nodes(query: Record<string, unknown>) {
    const dataset = await this.dataset(query);
    if (!dataset) return { nodes: [], updatedAt: null };
    const rows = await this.database.db
      .select({ id: referenceRecords.id, name: referenceRecords.name, data: referenceRecords.data })
      .from(referenceRecords)
      .where(
        and(eq(referenceRecords.datasetVersionId, dataset.id), eq(referenceRecords.kind, 'nodes')),
      )
      .limit(5000);
    const nodes = rows.flatMap((row) => {
      const pos = row.data['position'];
      if (
        !Array.isArray(pos) ||
        pos.length !== 3 ||
        !pos.every((value) => typeof value === 'number' && Number.isFinite(value))
      )
        return [];
      const links = row.data['links'];
      const urns =
        links && typeof links === 'object' && !Array.isArray(links)
          ? (links as Record<string, unknown>)['urns']
          : [];
      return [
        {
          id: row.id,
          name: row.name.replace(/<[^>]*>/g, ''),
          x: pos[0] as number,
          z: pos[2] as number,
          contribution:
            typeof row.data['contribution'] === 'number' ? row.data['contribution'] : null,
          enabled: row.data['enabled'] !== false,
          main: row.data['main'] === true,
          links: Array.isArray(urns)
            ? urns.filter((value): value is string => typeof value === 'string')
            : [],
        },
      ];
    });
    return { nodes, updatedAt: dataset.finishedAt };
  }
  async itemSources(itemId: number, query: Record<string, unknown>) {
    if (!Number.isSafeInteger(itemId) || itemId < 1 || itemId > 2147483647)
      throw new BadRequestException('Item inválido.');
    const dataset = await this.dataset(query);
    if (!dataset) return { nodes: [], updatedAt: null };
    const rows = await this.database.db
      .select({ id: referenceRecords.id, name: referenceRecords.name, data: referenceRecords.data })
      .from(referenceRecords)
      .where(
        and(
          eq(referenceRecords.datasetVersionId, dataset.id),
          eq(referenceRecords.kind, 'nodes'),
          sql`${referenceRecords.data} @> ${JSON.stringify({ products: { urns: [`urn::item:${itemId}`] } })}::jsonb`,
        ),
      )
      .limit(51);
    const relatedIds = [
      ...new Set(
        rows
          .flatMap((r) => [r.data['territory'], r.data['managerNode']])
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];
    const related = relatedIds.length
      ? await this.database.db
          .select({ id: referenceRecords.id, name: referenceRecords.name })
          .from(referenceRecords)
          .where(
            and(
              eq(referenceRecords.datasetVersionId, dataset.id),
              inArray(referenceRecords.id, relatedIds),
            ),
          )
      : [];
    const names = new Map(related.map((r) => [r.id, r.name.replace(/<[^>]*>/g, '')]));
    return {
      nodes: rows.slice(0, 50).map((r) => ({
        id: r.id,
        name: r.name.replace(/<[^>]*>/g, ''),
        territory: typeof r.data['territory'] === 'string' ? r.data['territory'] : null,
        managerNode: typeof r.data['managerNode'] === 'string' ? r.data['managerNode'] : null,
        territoryName:
          typeof r.data['territory'] === 'string' ? (names.get(r.data['territory']) ?? null) : null,
        managerNodeName:
          typeof r.data['managerNode'] === 'string'
            ? (names.get(r.data['managerNode']) ?? null)
            : null,
        contribution: typeof r.data['contribution'] === 'number' ? r.data['contribution'] : null,
        position:
          Array.isArray(r.data['position']) &&
          r.data['position'].length === 3 &&
          r.data['position'].every((v) => typeof v === 'number' && Number.isFinite(v))
            ? r.data['position']
            : null,
        links:
          typeof r.data['links'] === 'object' &&
          r.data['links'] !== null &&
          'urns' in r.data['links'] &&
          Array.isArray(r.data['links'].urns)
            ? r.data['links'].urns.filter((id): id is string => typeof id === 'string')
            : [],
        products:
          typeof r.data['products'] === 'object' &&
          r.data['products'] !== null &&
          'urns' in r.data['products'] &&
          Array.isArray(r.data['products'].urns)
            ? r.data['products'].urns.filter((id): id is string => typeof id === 'string')
            : [],
      })),
      truncated: rows.length > 50,
      dataset: { version: dataset.version, region: dataset.region, locale: dataset.locale },
      updatedAt: dataset.finishedAt,
    };
  }
  private async dataset(query: Record<string, unknown>) {
    const parsed = parseCatalogQuery(query, { pagination: false });
    return this.catalog.getActiveDataset(parsed.region, parsed.locale, parsed.preferredLocale);
  }
  async kinds(query: Record<string, unknown>) {
    const dataset = await this.dataset(query);
    if (!dataset) return { kinds: [], updatedAt: null };
    const rows = await this.database.db
      .select()
      .from(referenceCollections)
      .where(eq(referenceCollections.datasetVersionId, dataset.id));
    return {
      kinds: rows.map((row) => ({
        kind: row.kind,
        label: isReferenceKind(row.kind) ? referenceKinds[row.kind][2] : row.kind,
        total: row.count,
      })),
      updatedAt: dataset.finishedAt,
    };
  }
  async list(kind: string, query: Record<string, unknown>) {
    if (!isReferenceKind(kind)) throw new NotFoundException('Esta consulta não está disponível.');
    const parsed = z
      .object({
        q: z.string().trim().max(80).default(''),
        page: z.coerce.number().int().min(1).max(10000).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(24),
      })
      .safeParse(query);
    if (!parsed.success) throw new BadRequestException('Confira os filtros da busca.');
    const dataset = await this.dataset(query);
    const { page, pageSize, q } = parsed.data;
    if (!dataset) return { items: [], total: 0, page, pageSize, updatedAt: null };
    const filters = [
      eq(referenceRecords.datasetVersionId, dataset.id),
      eq(referenceRecords.kind, kind),
    ];
    if (q)
      for (const token of normalizeName(q).split(/\s+/)) {
        filters.push(
          sql`${referenceRecords.searchName} like ${'%' + token.replace(/[\\%_]/g, '\\$&') + '%'}`,
        );
      }
    const [total] = await this.database.db
      .select({ total: count() })
      .from(referenceRecords)
      .where(and(...filters));
    const rows = await this.database.db
      .select({ id: referenceRecords.id, name: referenceRecords.name })
      .from(referenceRecords)
      .where(and(...filters))
      .orderBy(asc(referenceRecords.name), asc(referenceRecords.id))
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    return {
      items: rows.map((row) => ({ ...row, name: row.name.replace(/<[^>]*>/g, '') })),
      total: Number(total?.total ?? 0),
      page,
      pageSize,
      updatedAt: dataset.finishedAt,
    };
  }
  async detail(kind: string, id: string, query: Record<string, unknown>) {
    if (!isReferenceKind(kind) || id.length > 120)
      throw new NotFoundException('Registro não encontrado.');
    const dataset = await this.dataset(query);
    if (!dataset) throw new NotFoundException('Dados indisponíveis para esta região.');
    const [row] = await this.database.db
      .select()
      .from(referenceRecords)
      .where(
        and(
          eq(referenceRecords.datasetVersionId, dataset.id),
          eq(referenceRecords.kind, kind),
          eq(referenceRecords.id, id),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Registro não encontrado.');
    return {
      id: row.id,
      name: row.name.replace(/<[^>]*>/g, ''),
      kind: row.kind,
      data: row.data,
      updatedAt: dataset.finishedAt,
    };
  }
}
