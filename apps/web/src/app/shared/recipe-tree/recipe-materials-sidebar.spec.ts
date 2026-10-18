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
  it('explains the production choice and disables it when no production method is known', async () => {
    const fixture = await renderComponent(RecipeMaterialsSidebar, { materials: [material] });
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Desmarcado, ele entra na compra');
    const emit = vi.spyOn(fixture.componentInstance.toggleSource, 'emit');
    checkbox.click();
    expect(emit).not.toHaveBeenCalled();
  });
  it('changes the shared source decision when a production method exists', async () => {
    const fixture = await renderComponent(RecipeMaterialsSidebar, {
      materials: [{ ...material, canProduce: true }],
    });
    const emit = vi.spyOn(fixture.componentInstance.toggleSource, 'emit');
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    checkbox.click();
    expect(emit).toHaveBeenCalledWith(1);
  });
});
