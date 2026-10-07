import 'reflect-metadata';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CatalogImporterService } from './catalog-importer.service';
import { readExtractorDataset } from './extractor-dataset';

function parseArgs(argv: string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith('--'))
      throw new Error(`Argumento inesperado: ${key ?? ''}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`Falta o valor de ${key}.`);
    if (options.has(key))
      throw new Error(`${key} foi informado mais de uma vez.`);
    options.set(key, value);
    index += 1;
  }
  const allowed = new Set(['--input', '--version', '--region', '--locale']);
  const unknown = [...options.keys()].find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Opção desconhecida: ${unknown}`);
  return options;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputDirectory = args.get('--input');
  const version = args.get('--version');
  const region = (args.get('--region') ?? 'sa').toLocaleLowerCase('en-US');
  const locale = (args.get('--locale') ?? 'en').toLocaleLowerCase('en-US');
  if (!inputDirectory || !version) {
    throw new Error(
      'Uso: pnpm --filter @bdo/api data:import -- --input <pasta> --version <fingerprint> [--region sa] [--locale en]',
    );
  }
  if (version.length > 160)
    throw new Error('--version aceita até 160 caracteres.');
  if (!/^[a-z0-9-]{2,12}$/i.test(region)) throw new Error('--region inválida.');
  if (!/^[a-z]{2,8}$/i.test(locale)) throw new Error('--locale inválido.');

  const dataset = await readExtractorDataset(resolve(inputDirectory));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const importer = app.get(CatalogImporterService);
    const result = await importer.publish(dataset, {
      datasetVersion: version,
      region,
      locale,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Falha desconhecida na importação.';
  process.stderr.write(`Falha na importação do catálogo: ${message}\n`);
  process.exitCode = 1;
});
