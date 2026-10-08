import 'reflect-metadata';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { datasetVersions, referenceCollections, referenceRecords } from '@bdo/database/schema';
import { NestFactory } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';

import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import { normalizeName, referenceKinds } from './reference-kinds';

async function run() {
  const [directory, version] = process.argv.slice(2);
  if (!directory || !version) throw new Error('Informe diretório de extração e UUID do dataset.');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const database = app.get(DatabaseService);
    const [dataset] = await database.db
      .select()
      .from(datasetVersions)
      .where(eq(datasetVersions.id, version))
      .limit(1);
    if (!dataset || dataset.status !== 'active')
      throw new Error('O catálogo selecionado não está ativo.');
    for (const [kind, [filename, section, label]] of Object.entries(referenceKinds)) {
      const bytes = await readFile(join(resolve(directory), filename));
      const checksum = createHash('sha256').update(bytes).digest('hex');
      const [held] = await database.db
        .select()
        .from(referenceCollections)
        .where(
          and(
            eq(referenceCollections.datasetVersionId, version),
            eq(referenceCollections.kind, kind),
          ),
        )
        .limit(1);
      if (held) {
        if (held.checksum !== checksum)
          throw new Error('Uma coleção já publicada tem outro conteúdo. Crie um dataset novo.');
        continue;
      }
      const data: unknown = JSON.parse(bytes.toString('utf8'));
      const collection =
        section && data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)[section]
          : data;
      if (!Array.isArray(collection)) throw new Error('Coleção incompatível: ' + kind);
      const seen = new Set<string>();
      const rows = collection.map((value: unknown, index: number) => {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error('Registro incompatível: ' + kind);
        const record = value as Record<string, unknown>;
        const identity =
          record['urn'] ??
          record['id'] ??
          record['key'] ??
          record['mastery'] ??
          record['index'] ??
          record['baseId'];
        let id =
          typeof identity === 'string' || typeof identity === 'number'
            ? String(identity)
            : String(index);
        if (seen.has(id))
          id +=
            '-' + createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 16);
        if (seen.has(id)) throw new Error('Registro duplicado: ' + kind);
        seen.add(id);
        const candidateName = record['baseId'] ?? identity;
        const nameId =
          typeof candidateName === 'string' || typeof candidateName === 'number'
            ? String(candidateName)
            : String(index);
        const name =
          typeof record['name'] === 'string' && record['name']
            ? record['name']
            : label + ' · ' + nameId;
        return {
          datasetVersionId: version,
          kind,
          id: id.slice(0, 120),
          name,
          searchName: normalizeName(name + ' ' + id),
          data: record,
        };
      });
      await database.db.transaction(async (tx) => {
        for (let offset = 0; offset < rows.length; offset += 200)
          await tx.insert(referenceRecords).values(rows.slice(offset, offset + 200));
        await tx
          .insert(referenceCollections)
          .values({ datasetVersionId: version, kind, checksum, count: rows.length });
      });
      process.stdout.write(kind + ': ' + rows.length + '\n');
    }
  } finally {
    await app.close();
  }
}
void run().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : 'Falha na importação') + '\n');
  process.exitCode = 1;
});
