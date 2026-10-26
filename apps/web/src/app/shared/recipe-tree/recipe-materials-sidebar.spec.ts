import { describe, expect, it, vi } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipeMaterialsSidebar } from './recipe-materials-sidebar';

const material = {
  itemId: 1,
  name: 'Material de nome longo para a receita',
  iconUrl: null,
  source: 'buy',
  canProduce: false,
  required: 100,
  quantityPending: false,
  unitPrice: null,
  stock: null,
};
describe('Recipe material decisions', () => {
  useMemoryStorage();
  it('offers no production choice when no production method is known', async () => {
    const fixture = await renderComponent(RecipeMaterialsSidebar, { materials: [material] });
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sidebar-source-badge')?.textContent).toContain(
      'Comprar',
    );
  });
  it('changes the shared source decision when a production method exists', async () => {
    const fixture = await renderComponent(RecipeMaterialsSidebar, {
      materials: [{ ...material, canProduce: true }],
    });
    const emit = vi.spyOn(fixture.componentInstance.toggleSource, 'emit');
    const make = fixture.nativeElement.querySelector('input[value="make"]') as HTMLInputElement;
    make.click();
    expect(emit).toHaveBeenCalledWith(1);
  });

  it('keeps the recipe tree collapsed by default and exposes its nested controls accessibly', async () => {
    const rootMaterial = { ...material, canProduce: true };
    const childMaterial = { ...rootMaterial, itemId: 2, name: 'Insumo da sub-receita', required: 6 };
    const child = {
      path: 'plan/0/0',
      itemId: 2,
      part: { itemId: 2, name: childMaterial.name, quantity: '3' },
      state: 'active',
      quantityMode: 'planned',
      displayQuantity: 6,
      material: childMaterial,
      perOperation: 3,
      producerRecipe: null,
      planned: true,
      producible: false,
      depthLimited: false,
      children: [],
    };
    const fixture = await renderComponent(RecipeMaterialsSidebar, {
      materials: [rootMaterial, childMaterial],
      product: {
        itemId: 99,
        part: { itemId: 99, name: 'Produto Final', quantity: '1' },
        quantity: 100,
      },
      hierarchy: [
        {
          path: 'plan/0',
          itemId: 1,
          part: { itemId: 1, name: rootMaterial.name, quantity: '2' },
          state: 'active',
          quantityMode: 'planned',
          displayQuantity: 100,
          material: rootMaterial,
          perOperation: 2,
          producerRecipe: null,
          planned: true,
          producible: true,
          depthLimited: false,
          children: [child],
        },
      ],
    });

    expect(fixture.nativeElement.querySelector('.plan-product-context')?.textContent).toContain(
      'Produto Final',
    );
    const toggle = fixture.nativeElement.querySelector('.plan-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBeNull();
    expect(fixture.nativeElement.querySelector('.plan-children')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.sidebar-material-row')).toHaveLength(1);

    toggle.click();
    fixture.detectChanges();
    const openToggle = fixture.nativeElement.querySelector('.plan-toggle') as HTMLButtonElement;
    expect(openToggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      fixture.nativeElement.ownerDocument.getElementById(openToggle.getAttribute('aria-controls')!),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.sidebar-material-row')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.sidebar-material-row input[type="radio"]'))
      .toHaveLength(4);

    openToggle.click();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('.plan-toggle') as HTMLButtonElement).getAttribute(
        'aria-expanded',
      ),
    ).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.sidebar-material-row')).toHaveLength(1);
  });
});
