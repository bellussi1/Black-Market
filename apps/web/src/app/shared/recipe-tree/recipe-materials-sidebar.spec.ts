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
});
