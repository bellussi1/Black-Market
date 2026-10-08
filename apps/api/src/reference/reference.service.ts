import { referenceCollections, referenceRecords } from '@bdo/database/schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
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
