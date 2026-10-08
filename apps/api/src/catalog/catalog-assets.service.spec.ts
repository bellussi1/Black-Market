import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CatalogAssetsService } from './catalog-assets.service';

describe('Published recognition indices', () => {
  let root: string;
  const checksum = 'a'.repeat(64);
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'black-market-icon-index-'));
    await mkdir(join(root, checksum));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const legacy = {
    algorithm: 'dhash-top-v1',
    checksum,
    entries: [{ hash: '0'.repeat(16), ids: [6201, 6202] }],
  };
  const color = {
    algorithm: 'rgb-top-v2',
    checksum,
    entries: [{ rgb: Buffer.alloc(192, 32).toString('base64'), ids: [6201, 6202] }],
  };
  const publish = (version: number, index: unknown) =>
    writeFile(join(root, checksum, `icon-index-v${version}.json`), JSON.stringify(index));
  const service = () => new CatalogAssetsService(new ConfigService({ CATALOG_ASSETS_DIR: root }));
  it('supports existing indices and picks up a newly published color index without restarting', async () => {
    await publish(1, legacy);
    const assets = service();
    expect(await assets.getIconIndex(checksum)).toEqual(legacy);
    await publish(2, color);
    expect(await assets.getIconIndex(checksum)).toEqual(color);
  });
  it('refuses malformed descriptors, mismatched datasets and empty identities', async () => {
    const assets = service();
    for (const bad of [
      { ...color, checksum: 'b'.repeat(64) },
      { ...color, entries: [{ rgb: 'bad', ids: [1] }] },
      { ...color, entries: [{ ...color.entries[0], ids: [] }] },
    ]) {
      await publish(2, bad);
      await expect(assets.getIconIndex(checksum)).rejects.toThrow('indisponível');
    }
    await expect(assets.getIconIndex('../outside')).rejects.toThrow('indisponível');
  });
});
