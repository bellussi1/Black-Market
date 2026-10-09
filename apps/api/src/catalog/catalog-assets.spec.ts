import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { publishCatalogAssets } from './catalog-assets';

describe('Atomic catalog icon publication', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bdo-catalog-assets-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  async function source(corrupt = false) {
    const input = join(root, 'input');
    await mkdir(join(input, 'icons'), { recursive: true });
    const icon = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#c5a46a' },
    })
      .webp()
      .toBuffer();
    const aliases = Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [`urn::item:${i + 1}`, `icons/${i + 1}.webp`]),
    );
    await Promise.all(
      Object.values(aliases).map((path, index) =>
        writeFile(join(input, path), corrupt && index === 10 ? Buffer.from('invalid') : icon),
      ),
    );
    await writeFile(join(input, 'asset_redirects.json'), JSON.stringify(aliases));
    return input;
  }
  it('publishes all files and produces identical manifests when revalidating an existing checksum', async () => {
    const input = await source(),
      assets = join(root, 'assets'),
      checksum = 'a'.repeat(64);
    expect(await publishCatalogAssets(input, assets, checksum)).toEqual({
      itemAliases: 24,
      files: 24,
    });
    const manifest = await readFile(join(assets, checksum, 'asset_redirects.json'), 'utf8');
    expect(await publishCatalogAssets(input, assets, checksum)).toEqual({
      itemAliases: 24,
      files: 24,
    });
    expect(await readFile(join(assets, checksum, 'asset_redirects.json'), 'utf8')).toBe(manifest);
    expect(
      Object.keys(
        JSON.parse(await readFile(join(assets, checksum, 'integrity.json'), 'utf8')) as Record<
          string,
          string
        >,
      ),
    ).toHaveLength(24);
  });
  it('never activates a partially copied directory when a source icon is invalid', async () => {
    const input = await source(true),
      assets = join(root, 'assets'),
      checksum = 'b'.repeat(64);
    await expect(publishCatalogAssets(input, assets, checksum)).rejects.toThrow('inválido');
    await expect(stat(join(assets, checksum))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
