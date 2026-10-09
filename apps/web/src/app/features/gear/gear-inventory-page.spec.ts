import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { GearInventoryPage } from './gear-inventory-page';
describe('Character equipment management', () => {
  useMemoryStorage();
  it('creates a character and saves manual equipment without calculating attributes', async () => {
    const fixture = await renderComponent(GearInventoryPage),
      page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    page.slot = 'mainhand';
    page.item = { id: 10010, name: 'Espada', icon: null } as CatalogItem;
    page.level = 19;
    page.caphras = 3;
    page.save();
    expect(page.profile()!.gear[0]).toMatchObject({
      itemId: 10010,
      slot: 'mainhand',
      level: 19,
      caphras: 3,
      levelConfirmed: true,
      caphrasConfirmed: true,
    });
    expect(page.profile()!.mainAp).toBe(0);
    page.level = 99;
    page.item = { id: 10010, name: 'Espada' } as CatalogItem;
    page.save();
    expect(page.profile()!.gear[0].level).toBe(19);
    expect(page.message()).toContain('Confira');
  });
});
