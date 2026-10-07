import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { z } from 'zod';

const aliasesSchema = z.record(z.string(), z.string());
const MAX_ICON_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 24 * 1024 * 1024;

export function iconPath(root: string, relative: string): string {
  if (!/^icons\/(?:[a-z0-9_-][a-z0-9_. -]*\/)*[a-z0-9_-][a-z0-9_. -]*\.webp$/.test(relative)) {
    throw new Error('Caminho de ícone inválido no manifesto.');
  }
  const path = resolve(root, relative);
  if (!path.startsWith(resolve(root, 'icons') + sep)) {
    throw new Error('Ícone fora da pasta permitida.');
  }
  return path;
}

export async function readIcon(path: string): Promise<Buffer> {
  const info = await stat(path);
  if (!info.isFile() || info.size < 12 || info.size > MAX_ICON_BYTES) {
    throw new Error('Tamanho de ícone inválido.');
  }
  const bytes = await readFile(path);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('O ícone não é WebP.');
  }
  return bytes;
}

export async function readIconAliases(directory: string): Promise<Record<string, string>> {
  const path = join(directory, 'asset_redirects.json');
  if ((await stat(path)).size > MAX_MANIFEST_BYTES)
    throw new Error('Manifesto de ícones muito grande.');
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  return aliasesSchema.parse(parsed);
}

/** Publish only item icons. Dataset JSON and other client assets are never served. */
export async function publishCatalogAssets(
  input: string,
  assetsRoot: string,
  checksum: string,
): Promise<{ itemAliases: number; files: number }> {
  const aliases = await readIconAliases(input);
  const items = Object.fromEntries(
    Object.entries(aliases).filter(([key]) => /^urn::item:[1-9]\d*$/.test(key)),
  );
  const paths = [...new Set(Object.values(items))];
  await mkdir(assetsRoot, { recursive: true });
  const target = join(assetsRoot, checksum);
  let exists = false;
  try {
    await stat(target);
    exists = true;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const staging = exists ? null : await mkdtemp(join(assetsRoot, '.staging-'));
  const hashes = new Map<string, string>();
  const available = new Set<string>();
  for (const relative of paths) {
    const source = iconPath(input, relative);
    try {
      const bytes = await readIcon(source);
      if (staging) {
        const destination = iconPath(staging, relative);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, bytes);
      }
      hashes.set(relative, createHash('sha256').update(bytes).digest('hex'));
      available.add(relative);
    } catch (error) {
      // The extractor can advertise a missing or undecodable archive entry.
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
  }
  const published = Object.fromEntries(
    Object.entries(items).filter(([, path]) => available.has(path)),
  );
  const manifest = JSON.stringify(published);
  const integrity = JSON.stringify(
    Object.fromEntries([...hashes].sort(([a], [b]) => a.localeCompare(b))),
  );
  if (exists) {
    if (
      (await readFile(join(target, 'integrity.json'), 'utf8')) !== integrity ||
      (await readFile(join(target, 'asset_redirects.json'), 'utf8')) !== manifest
    ) {
      throw new Error('Já existem outros ícones para este checksum. Use uma nova extração.');
    }
  } else if (staging) {
    await writeFile(join(staging, 'asset_redirects.json'), manifest);
    await writeFile(join(staging, 'integrity.json'), integrity);
    await rename(staging, target);
  }
  return { itemAliases: Object.keys(published).length, files: available.size };
}
