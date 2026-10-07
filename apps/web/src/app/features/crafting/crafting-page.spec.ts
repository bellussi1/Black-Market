import { TestBed } from '@angular/core/testing';
import { defaultTax } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import { emptyWorkspace } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { CraftingPage } from './crafting-page';

describe('CraftingPage', () => {
  useMemoryStorage();
  it('renders economic profit separately from cash needed for owned ingredients', async () => {
    const fixture = await render(CraftingPage);
    const page = fixture.componentInstance;
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
