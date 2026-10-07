import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { iconPath, readIcon, readIconAliases } from './catalog-assets';

@Injectable()
export class CatalogAssetsService {
  private readonly manifests = new Map<string, Promise<Record<string, string>>>();

  constructor(private readonly config: ConfigService) {}

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
      let manifest = this.manifests.get(checksum);
      if (!manifest) {
        if (this.manifests.size >= 8) this.manifests.delete(this.manifests.keys().next().value!);
        manifest = readIconAliases(directory).catch((error: unknown) => {
          this.manifests.delete(checksum);
          throw error;
        });
        this.manifests.set(checksum, manifest);
      }
      const aliases = await manifest;
      const relative = aliases[`urn::item:${id}`];
      if (!relative) throw new Error('Sem ícone.');
      return await readIcon(iconPath(directory, relative));
    } catch {
      throw new NotFoundException('Ícone indisponível.');
    }
  }
}
