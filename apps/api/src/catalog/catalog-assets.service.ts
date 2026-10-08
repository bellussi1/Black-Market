import { join } from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { iconPath, readIcon, readIconAliases } from './catalog-assets';

@Injectable()
export class CatalogAssetsService {
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
