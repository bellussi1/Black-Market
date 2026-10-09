import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service';
import type { CatalogService } from './catalog.service';
import { CatalogSitemapService } from './catalog-sitemap.service';
describe('Screenshot MVP public sitemap', () => {
  const service = () =>
    new CatalogSitemapService(
      new ConfigService({ PUBLIC_SITE_URL: 'https://example.com' }),
      { getActiveDataset: vi.fn().mockResolvedValue(null) } as unknown as CatalogService,
      {} as DatabaseService,
    );
  it('lists public core routes without advertising suspended tools or personal data', async () => {
    const xml = await service().page('public', 1);
    expect(xml).toContain('/market');
    expect(xml).toContain('/recipes');
    expect(xml).toContain('/privacidade');
    for (const path of [
      '/reference',
      '/world',
      '/crafting',
      '/gear',
      '/inventory',
      '/storage',
      '/account',
    ])
      expect(xml).not.toContain(`<loc>https://example.com${path}`);
  });
  it('does not serve a sitemap for disabled reference modules', async () => {
    await expect(service().page('reference', 1)).rejects.toThrow('temporariamente');
  });
});
