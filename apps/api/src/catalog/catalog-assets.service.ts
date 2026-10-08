import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { iconPath, readIcon, readIconAliases } from './catalog-assets';

@Injectable()
export class CatalogAssetsService {
  private readonly indices = new Map<string, unknown>();
  async getIconIndex(checksum: string | null) {
    if (!checksum || !/^[a-f0-9]{64}$/.test(checksum))
      throw new NotFoundException('Leitura de imagens indisponível.');
    const cached = this.indices.get(checksum);
    if (cached) return cached;
    try {
      const path = join(
        this.config.getOrThrow<string>('CATALOG_ASSETS_DIR'),
        checksum,
        'icon-index-v1.json',
      );
      if ((await stat(path)).size > 8 * 1024 * 1024) throw new Error('Índice grande.');
      const schema = z.object({
        algorithm: z.literal('dhash-top-v1'),
        checksum: z.literal(checksum),
        entries: z
          .array(
            z.object({
              hash: z.string().regex(/^[a-f0-9]{16}$/),
              ids: z.array(z.number().int().positive()).max(74216),
            }),
          )
          .max(100000),
      });
      const result = schema.parse(JSON.parse(await readFile(path, 'utf8')));
      if (this.indices.size >= 2) this.indices.delete(this.indices.keys().next().value!);
      this.indices.set(checksum, result);
      return result;
    } catch {
      throw new NotFoundException('Leitura de imagens indisponível no momento.');
    }
  }
  private readonly manifests = new Map<string, Promise<Record<string, string>>>();

  constructor(private readonly config: ConfigService) {}

  async getIconUrl(id: number, checksum: string | null): Promise<string | null> {
    if (!checksum || !this.config.get<string>('CATALOG_ASSETS_DIR')) return null;
    try {
      const aliases = await this.getManifest(checksum);
      const relative = aliases[`urn::item:${id}`];
      if (!relative) return null;
      const publicBase = this.config.get<string>('CATALOG_ASSETS_PUBLIC_URL');
      return publicBase
        ? `${publicBase.replace(/\/$/, '')}/${checksum}/${relative.split('/').map(encodeURIComponent).join('/')}`
        : `/api/v1/items/${id}/icon?dataset=${checksum}`;
    } catch {
      return null;
    }
  }

  private getManifest(checksum: string): Promise<Record<string, string>> {
    let manifest = this.manifests.get(checksum);
    if (!manifest) {
      if (this.manifests.size >= 8) this.manifests.delete(this.manifests.keys().next().value!);
      const root = this.config.getOrThrow<string>('CATALOG_ASSETS_DIR');
      manifest = readIconAliases(join(root, checksum)).catch((error: unknown) => {
        this.manifests.delete(checksum);
        throw error;
      });
      this.manifests.set(checksum, manifest);
    }
    return manifest;
  }

  async getIcon(id: number, checksum: string | undefined): Promise<Buffer> {
    const root = this.config.get<string>('CATALOG_ASSETS_DIR');
    if (
      !root ||
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !checksum ||
      !/^[a-f0-9]{64}$/.test(checksum)
    ) {
      throw new NotFoundException('Ícone indisponível.');
    }
    const directory = `${root}/${checksum}`;
    try {
      const aliases = await this.getManifest(checksum);
      const relative = aliases[`urn::item:${id}`];
      if (!relative) throw new Error('Sem ícone.');
      return await readIcon(iconPath(directory, relative));
    } catch {
      throw new NotFoundException('Ícone indisponível.');
    }
  }
}
