import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

const databaseUrl = process.env.ROADMAP_MIGRATION_TEST_URL;
const migrationsDirectory = resolve(process.cwd(), '../../packages/database/drizzle');

describe('roadmap global ordering migration', () => {
  it.skipIf(!databaseUrl)(
    'migratesLegacyOrderToGlobalSequenceAndPreservesAllOtherColumns',
    async () => {
      const migration = await readFile(
        resolve(migrationsDirectory, '0011_global_roadmap_order.sql'),
        'utf8',
      );
      const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
      await client.connect();
      try {
        // The caller must supply a disposable database. All fixture DDL/data is rolled back.
        await client.query('BEGIN');
        await client.query(`
          CREATE TYPE public.roadmap_entry_kind AS ENUM ('flow', 'pillar');
          CREATE TEMP TABLE roadmap_entries (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            slug varchar(64) NOT NULL,
            kind public.roadmap_entry_kind NOT NULL,
            sort_order integer NOT NULL CHECK (sort_order >= 0),
            title varchar(120) NOT NULL,
            summary varchar(280) NOT NULL,
            description text NOT NULL DEFAULT '',
            status_label varchar(60),
            icon varchar(64) NOT NULL,
            featured boolean NOT NULL DEFAULT false,
            links jsonb NOT NULL DEFAULT '[]'::jsonb,
            updated_at timestamptz NOT NULL DEFAULT now()
          );
          CREATE UNIQUE INDEX roadmap_entries_slug_uidx ON roadmap_entries (slug);
          CREATE UNIQUE INDEX roadmap_entries_kind_order_uidx
            ON roadmap_entries (kind, sort_order);
        `);

        const legacyEntries = [
          ['pillar-late', 'pillar', 30],
          ['flow-middle', 'flow', 10],
          ['pillar-first', 'pillar', 0],
          ['flow-late', 'flow', 30],
          ['pillar-middle', 'pillar', 10],
          ['flow-first', 'flow', 0],
        ] as const;
        for (const [index, [slug, kind, order]] of legacyEntries.entries()) {
          await client.query(
            `INSERT INTO roadmap_entries
              (id, slug, kind, sort_order, title, summary, description,
               status_label, icon, featured, links, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
              slug,
              kind,
              order,
              `Título ${slug}`,
              `Resumo ${slug}`,
              index === 0 ? '' : `Descrição editorial ${slug}`,
              index % 2 === 0 ? null : 'Em evolução',
              index % 2 === 0 ? 'lucideBoxes' : 'lucideCompass',
              index % 2 === 0,
              JSON.stringify(
                index === 0
                  ? []
                  : [
                      { label: `Abrir ${slug}`, path: '/market' },
                      { label: 'Receitas', path: '/recipes' },
                    ],
              ),
              `2026-10-${String(index + 1).padStart(2, '0')}T12:34:56.123Z`,
            ],
          );
        }

        const before = await client.query(
          "SELECT id, to_jsonb(entry) - 'sort_order' AS content FROM roadmap_entries entry ORDER BY id",
        );
        for (const statement of migration.split('--> statement-breakpoint')) {
          if (statement.trim()) await client.query(statement);
        }

        const ordered = await client.query(
          'SELECT slug, kind, sort_order FROM roadmap_entries ORDER BY sort_order',
        );
        expect(ordered.rows).toEqual([
          { slug: 'flow-first', kind: 'flow', sort_order: 0 },
          { slug: 'flow-middle', kind: 'flow', sort_order: 1 },
          { slug: 'flow-late', kind: 'flow', sort_order: 2 },
          { slug: 'pillar-first', kind: 'pillar', sort_order: 3 },
          { slug: 'pillar-middle', kind: 'pillar', sort_order: 4 },
          { slug: 'pillar-late', kind: 'pillar', sort_order: 5 },
        ]);
        const after = await client.query(
          "SELECT id, to_jsonb(entry) - 'sort_order' AS content FROM roadmap_entries entry ORDER BY id",
        );
        expect(after.rows).toEqual(before.rows);
        await expect(
          client.query("UPDATE roadmap_entries SET sort_order = 0 WHERE slug = 'pillar-first'"),
        ).rejects.toMatchObject({ code: '23505', constraint: 'roadmap_entries_sort_order_uidx' });
      } finally {
        try {
          await client.query('ROLLBACK');
        } finally {
          await client.end();
        }
      }
    },
    15000,
  );
});
