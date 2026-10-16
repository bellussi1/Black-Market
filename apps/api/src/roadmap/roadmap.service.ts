import { roadmapEntries } from '@bdo/database/schema';
import type { RoadmapEntry, RoadmapResponse } from '@bdo/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { parseRoadmapUpdate } from './roadmap-validation';

@Injectable()
export class RoadmapService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<RoadmapResponse> {
    const rows = await this.database.db.select().from(roadmapEntries);
    const entries = [...rows]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(
        (row): RoadmapEntry => ({
          id: row.id,
          slug: row.slug,
          kind: row.kind,
          sortOrder: row.sortOrder,
          title: row.title,
          summary: row.summary,
          description: row.description,
          statusLabel: row.statusLabel,
          icon: row.icon,
          featured: row.featured,
          links: row.links,
        }),
      );
    const latest = rows.reduce<Date | null>(
      (value, row) => (value && value > row.updatedAt ? value : row.updatedAt),
      null,
    );
    return { entries, updatedAt: latest?.toISOString() ?? null };
  }

  async replace(input: unknown): Promise<RoadmapResponse> {
    const parsed = parseRoadmapUpdate(input);
    await this.database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('roadmap:content', 0))`);
      const currentRows = await tx.select().from(roadmapEntries);
      const currentTimestamp = currentRows.reduce<Date | null>(
        (value, row) => (value && value > row.updatedAt ? value : row.updatedAt),
        null,
      );
      if ((currentTimestamp?.toISOString() ?? null) !== parsed.expectedUpdatedAt)
        throw new ConflictException(
          'O Roadmap foi alterado por outra pessoa. Recarregue antes de salvar novamente.',
        );

      await tx.delete(roadmapEntries);
      if (parsed.entries.length) {
        const updatedAt = new Date();
        await tx.insert(roadmapEntries).values(
          parsed.entries.map(({ id, ...entry }) => ({
            ...(id ? { id } : {}),
            ...entry,
            updatedAt,
          })),
        );
      }
    });
    return this.list();
  }
}
