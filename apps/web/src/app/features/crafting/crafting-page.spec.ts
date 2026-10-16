import { TestBed } from '@angular/core/testing';
import { defaultTax } from '@bdo/calculators';
import type { CatalogItem, CatalogRecipe, MarketLookupResponse } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { MarketCacheService } from '../../core/market-cache.service';
import { emptyWorkspace } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { CraftingPage } from './crafting-page';

describe('CraftingPage', () => {
  useMemoryStorage();
  it('opens on a recipe workbench and explains how it differs from recipe discovery', async () => {
    const fixture = await render(CraftingPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.tab()).toBe('workshop');
    expect(element.textContent).toContain('Configure lote, maestria e recursos');
    expect(element.textContent).toContain('comparar comprar, produzir e coletar');
    expect(element.textContent).toContain('Descobrir receitas e origens');
    expect(element.querySelector('app-recipe-tree')).toBeNull();
  });

  it('renders economic profit separately from cash needed for owned ingredients', async () => {
    const fixture = await render(CraftingPage);
    const page = fixture.componentInstance;
    page.tab.set('manual');
    page.form.set({
      ...defaultTax,
      exempt: true,
      crafts: 2,
      yield: 2.5,
      salePrice: '100',
      extraCost: '10',
      minutes: 30,
      ingredients: [{ name: 'Material', quantity: 3, owned: 5, price: '20' }],
    });
    fixture.detectChanges();
    expect(page.result().value?.profit).toBe('370');
    expect(page.result().value?.cashCost).toBe('30');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.hero-metric')?.textContent,
    ).toContain('370');
  });
  it('fills a catalog scenario from an unexpired market quote for the active region', async () => {
    const fixture = await render(CraftingPage);
    const page = fixture.componentInstance;
    const cache = TestBed.inject(MarketCacheService);
    const product = {
      id: 100,
      name: 'Produto',
      category: 'Comida',
      categories: [],
      iconUrl: null,
    } as unknown as CatalogItem;
    cache.cacheLookupResponse(
      {
        source: 'arsha',
        region: 'sa',
        locale: 'pt',
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        upstreamCacheMinutes: 30,
        items: [
          {
            itemId: 100,
            subId: 0,
            name: 'Produto',
            price: '900',
            stock: 3,
            totalTrades: '12',
            minPrice: '100',
            maxPrice: '1000',
            lastSoldPrice: null,
            lastSoldAt: null,
          },
        ],
      } satisfies MarketLookupResponse,
      'sa',
    );
    page.recipeProduct.set(product);
    page.useCatalogRecipe({
      key: 'produto-recipe',
      type: 'COOK',
      station: null,
      inputs: [{ itemId: 200, name: 'Ingrediente', quantity: '2' }],
      outputs: [{ itemId: 100, name: 'Produto', quantity: '1' }],
    } satisfies CatalogRecipe);

    expect(page.form().salePrice).toBe('900');
    expect(page.form().ingredients[0].price).toBe('0');
    expect(page.recipeMessage()).toContain('origem e horário no Mercado');
  });
  it('keeps regional inventory separate when the shared region selector changes', async () => {
    await render(CraftingPage);
    const store = TestBed.inject(WorkspaceStore);
    store.replace({
      ...emptyWorkspace(),
      inventory: [
        {
          id: 'a',
          name: 'Material',
          region: 'sa',
          location: 'Velia',
          quantity: 5,
          target: 10,
          price: '100',
        },
      ],
    });
    store.setRegion('eu');
    expect(store.data().region).toBe('eu');
    expect(store.data().inventory.filter((r) => r.region === store.data().region)).toHaveLength(0);
    store.setRegion('sa');
    expect(store.data().inventory[0].quantity).toBe(5);
  });
});
