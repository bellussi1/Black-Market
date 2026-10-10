import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { characterSchema } from '@bdo/calculators';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { StockPage } from './stock-page';
describe('Reviewed stock management', () => {
  useMemoryStorage();
  it('switches storage and character inventories in the same page without moving an open edit', async () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    const fixture = await renderComponent(StockPage, {}, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [characterSchema.parse({ id: 'one', name: 'Aventureiro', region: 'sa' })],
      inventory: [
        {
          id: 'city',
          itemId: 212,
          name: 'Corda',
          region: 'sa',
          location: 'Velia',
          quantity: 5,
          target: 0,
          price: '0',
        },
        {
          id: 'bag',
          itemId: 212,
          name: 'Corda',
          region: 'sa',
          location: 'Aventureiro',
          kind: 'inventory',
          characterId: 'one',
          quantity: 9,
          target: 0,
          price: '0',
        },
      ],
    }));
    expect(page.stock().map((row) => row.id)).toEqual(['city']);
    params.next(convertToParamMap({ tab: 'inventory' }));
    expect(page.stock().map((row) => row.id)).toEqual(['bag']);
    page.edit(page.stock()[0]);
    page.draft!.quantity = 11;
    params.next(convertToParamMap({ tab: 'storage' }));
    page.draft!.quantity = -1;
    page.save();
    expect(page.store.data().inventory.find((row) => row.id === 'bag')?.quantity).toBe(9);
    page.draft!.quantity = 11;
    page.save();
    expect(page.store.data().inventory.find((row) => row.id === 'bag')).toMatchObject({
      kind: 'inventory',
      characterId: 'one',
      quantity: 11,
    });
    expect(page.stock()[0]).toMatchObject({ id: 'city', quantity: 5 });
    expect(page.store.data().inventory).toHaveLength(2);
  });
  it('rejects missing inventory owners and cross-region edits while retaining the original record', async () => {
    const fixture = await renderComponent(StockPage),
      page = fixture.componentInstance;
    page.kind.set('inventory');
    page.newItem();
    page.draft!.itemId = 212;
    page.draft!.name = 'Corda';
    page.draft!.quantity = 3;
    page.draft!.characterId = 'missing';
    page.save();
    expect(page.message()).toContain('Selecione o personagem');
    expect(page.store.data().inventory).toHaveLength(0);
    page.kind.set('storage');
    page.newItem();
    page.draft!.itemId = 212;
    page.draft!.name = 'Corda';
    page.draft!.quantity = 5;
    page.save();
    const original = page.stock()[0];
    page.edit(original);
    page.draft!.quantity = 9;
    page.store.setRegion('na');
    page.save();
    expect(page.message()).toContain('Volte à região');
    expect(page.store.data().inventory.find((row) => row.id === original.id)).toEqual(original);
  });
  it('renders old manual records without constructing a URL with an undefined ID', async () => {
    const fixture = await renderComponent(StockPage),
      page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      inventory: [
        {
          id: 'manual',
          name: 'Material antigo',
          region: 'sa',
          location: 'Velia',
          quantity: 3,
          target: 0,
          price: '0',
        },
      ],
    }));
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.textContent).toContain('Material antigo');
  });
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
    page.kind.set('inventory');
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
