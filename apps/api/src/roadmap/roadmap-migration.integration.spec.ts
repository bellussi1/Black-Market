import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

const migrationTestUrl = process.env.ROADMAP_MIGRATION_TEST_URL;

describe('roadmap global order migration', () => {
  it.skipIf(!migrationTestUrl)(
    'migratesLegacyOrderToGlobalSequenceAndPreservesAllOtherColumns',
    async () => {
      const sqlPath = resolve(
        __dirname,
        '../../../../packages/database/drizzle/0011_global_roadmap_order.sql',
      );
      const migrationSql = await readFile(sqlPath, 'utf8');
      const statements = migrationSql
        .split('--> statement-breakpoint')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      const client = new Client({ connectionString: migrationTestUrl });
      const schemaName = `roadmap_mig_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      await client.connect();
      try {
        await client.query(`CREATE SCHEMA "${schemaName}"`);
        await client.query(`SET search_path TO "${schemaName}"`);
        await client.query(`CREATE TYPE "roadmap_entry_kind" AS ENUM ('flow', 'pillar')`);
        await client.query(`
          CREATE TABLE "roadmap_entries" (
            "id" uuid PRIMARY KEY,
            "slug" varchar(64) NOT NULL,
            "kind" "roadmap_entry_kind" NOT NULL,
            "sort_order" integer NOT NULL,
            "title" varchar(120) NOT NULL,
            "summary" varchar(280) NOT NULL,
            "description" text DEFAULT '' NOT NULL,
            "status_label" varchar(60),
            "icon" varchar(64) NOT NULL,
            "featured" boolean DEFAULT false NOT NULL,
            "links" jsonb DEFAULT '[]'::jsonb NOT NULL,
            "updated_at" timestamp with time zone NOT NULL,
            CONSTRAINT "roadmap_entries_order_check" CHECK ("sort_order" >= 0),
            CONSTRAINT "roadmap_entries_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
          )
        `);
        await client.query(
          `CREATE UNIQUE INDEX "roadmap_entries_slug_uidx" ON "roadmap_entries" USING btree ("slug")`,
        );
        await client.query(
          `CREATE UNIQUE INDEX "roadmap_entries_kind_order_uidx" ON "roadmap_entries" USING btree ("kind", "sort_order")`,
        );

        const legacyRows = [
          {
            id: '00000000-0000-4000-8000-000000000003',
            slug: 'pilar-economia',
            kind: 'pillar',
            sortOrder: 0,
            title: 'Pilar Economia',
            summary: 'Resumo economia',
            description: 'Descricao economia',
            statusLabel: 'Ativo',
            icon: 'coins',
            featured: true,
            links: [{ label: 'Mercado', path: '/market' }],
            updatedAt: '2026-10-14T10:00:00.000Z',
          },
          {
            id: '00000000-0000-4000-8000-000000000002',
            slug: 'fase-2',
            kind: 'flow',
            sortOrder: 1,
            title: 'Fase 2',
            summary: 'Resumo fase 2',
            description: 'Descricao fase 2',
            statusLabel: 'Em curso',
            icon: 'compass',
            featured: false,
            links: [{ label: 'Receitas', path: '/recipes' }],
            updatedAt: '2026-10-14T11:00:00.000Z',
          },
          {
            id: '00000000-0000-4000-8000-000000000001',
            slug: 'fase-1',
            kind: 'flow',
            sortOrder: 0,
            title: 'Fase 1',
            summary: 'Resumo fase 1',
            description: 'Descricao fase 1',
            statusLabel: null,
            icon: 'map',
            featured: true,
            links: [{ label: 'Armazem', path: '/storage' }],
            updatedAt: '2026-10-14T09:00:00.000Z',
          },
          {
            id: '00000000-0000-4000-8000-000000000004',
            slug: 'pilar-ocr',
            kind: 'pillar',
            sortOrder: 1,
            title: 'Pilar OCR',
            summary: 'Resumo ocr',
            description: 'Descricao ocr',
            statusLabel: 'Estavel',
            icon: 'scan',
            featured: false,
            links: [],
            updatedAt: '2026-10-14T12:00:00.000Z',
          },
        ];

        for (const row of legacyRows) {
          await client.query(
            `INSERT INTO "roadmap_entries"
              ("id", "slug", "kind", "sort_order", "title", "summary", "description", "status_label", "icon", "featured", "links", "updated_at")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::timestamptz)`,
            [
              row.id,
              row.slug,
              row.kind,
              row.sortOrder,
              row.title,
              row.summary,
              row.description,
              row.statusLabel,
              row.icon,
              row.featured,
              JSON.stringify(row.links),
              row.updatedAt,
            ],
          );
        }

        for (const statement of statements) {
          await client.query(statement);
        }

        const result = await client.query<{
          id: string;
          slug: string;
          kind: string;
          sort_order: number;
          title: string;
          summary: string;
          description: string;
          status_label: string | null;
          icon: string;
          featured: boolean;
          links: Array<{ label: string; path: string }>;
          updated_at: Date;
        }>(`SELECT * FROM "roadmap_entries" ORDER BY "sort_order" ASC`);

        expect(
          result.rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            kind: row.kind,
            sortOrder: row.sort_order,
            title: row.title,
            summary: row.summary,
            description: row.description,
            statusLabel: row.status_label,
            icon: row.icon,
            featured: row.featured,
            links: row.links,
            updatedAt: row.updated_at.toISOString(),
          })),
        ).toEqual([
          { ...legacyRows[2], sortOrder: 0 },
          { ...legacyRows[1], sortOrder: 1 },
          { ...legacyRows[0], sortOrder: 2 },
          { ...legacyRows[3], sortOrder: 3 },
        ]);

        await expect(
          client.query(
            `INSERT INTO "roadmap_entries"
              ("id", "slug", "kind", "sort_order", "title", "summary", "description", "status_label", "icon", "featured", "links", "updated_at")
             VALUES ('00000000-0000-4000-8000-000000000005', 'colisao', 'pillar', 0, 'Colisao', 'Resumo', '', null, 'shield', false, '[]'::jsonb, NOW())`,
          ),
        ).rejects.toThrow(/roadmap_entries_sort_order_uidx/);
      } finally {
        await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        await client.end();
      }
    },
  );
});
