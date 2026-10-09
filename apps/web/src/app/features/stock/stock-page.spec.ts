import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { StockPage } from './stock-page';
describe('Reviewed stock management', () => {
  useMemoryStorage();
  it('keeps legacy storage records and validates manual quantities and identities', async () => {
    const fixture = await renderComponent(StockPage),
      page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      inventory: [
        {
          id: 'old',
          itemId: 212,
          name: 'Corda',
          region: 'sa',
          location: 'Velia',
          quantity: 48,
          price: '0',
          target: 0,
        },
      ],
    }));
    expect(page.stock()).toHaveLength(1);
    page.edit(page.stock()[0]);
    page.draft!.quantity = 49;
    page.save();
    expect(page.stock()[0].quantity).toBe(49);
    expect(page.stock()[0].updatedAt).toBeDefined();
    page.newItem();
    page.draft!.itemId = 212;
    page.draft!.name = 'Corda';
    page.draft!.quantity = 2;
    page.save();
    expect(page.message()).toContain('já está');
    expect(page.stock()).toHaveLength(1);
    page.remove(page.stock()[0]);
    expect(page.stock()).toHaveLength(0);
    page.undoRemove();
    expect(page.stock()[0].quantity).toBe(49);
  });
  it('associates an inventory with a real character instead of merging into a city', async () => {
    const fixture = await renderComponent(StockPage),
      page = fixture.componentInstance;
    Object.defineProperty(page, 'kind', { value: 'inventory' });
    const { characterSchema } = await import('@bdo/calculators');
    page.store.update((state) => ({
      ...state,
      characters: [characterSchema.parse({ id: 'one', name: 'Aventureiro', region: 'sa' })],
    }));
    page.newItem();
    page.draft!.itemId = 212;
    page.draft!.name = 'Corda';
    page.draft!.quantity = 11;
    page.save();
    expect(page.stock()[0]).toMatchObject({
      kind: 'inventory',
      characterId: 'one',
      location: 'Aventureiro',
      quantity: 11,
    });
    const original = page.store.data();
    page.draft = { ...page.stock()[0], quantity: -1 };
    page.save();
    expect(page.store.data()).toBe(original);
  });
});
