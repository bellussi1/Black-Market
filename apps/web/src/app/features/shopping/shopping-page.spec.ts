import { By } from '@angular/platform-browser';
import { personalPlanSchema } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ShoppingPage } from './shopping-page';
describe('Integrated shopping list', () => {
  useMemoryStorage();
  it('shares stock once across plans and updates after imports without changing inventory', async () => {
    const fixture = await renderComponent(ShoppingPage),
      page = fixture.componentInstance;
    const plan = (id: string) =>
      personalPlanSchema.parse({
        id,
        region: 'sa',
        name: 'Produção',
        sourceItemId: 5301,
        createdAt: new Date().toISOString(),
        materials: [{ itemId: 1, name: 'Sal', quantity: 10 }],
      });
    page.store.update((state) => ({
      ...state,
      personalPlans: [plan('a'), plan('b')],
      inventory: [
        {
          id: 'stock',
          region: 'sa',
          itemId: 1,
          name: 'Sal',
          quantity: 12,
          target: 0,
          price: '0',
          location: 'Velia',
          kind: 'storage',
        },
      ],
    }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/scans"]')).toBeNull();
    expect(page.rows()[0]).toMatchObject({ required: 20, available: 12, missing: 8 });
    page.store.update((state) => ({
      ...state,
      inventory: state.inventory.map((row) => ({ ...row, quantity: 30 })),
    }));
    expect(page.rows()[0].missing).toBe(0);
    page.remove(page.plans()[0]);
    page.undo();
    expect(page.plans()).toHaveLength(2);
    expect(page.store.data().inventory[0].quantity).toBe(30);
  });

  it('guides both the empty and populated shopping workflows without a launcher', async () => {
    const fixture = await renderComponent(ShoppingPage);
    const element = fixture.nativeElement as HTMLElement;
    const tutorial = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      ?.injector.get(TutorialSurfaceDirective);

    expect(tutorial?.appTutorialSurface()).toBe('shopping');
    expect(element.querySelector('[data-tour="shopping.items"]')).not.toBeNull();
    expect(element.querySelector('[data-tour="shopping.actions"]')).not.toBeNull();
    expect(element.querySelector('app-tutorial-launcher')).toBeNull();

    fixture.componentInstance.store.update((state) => ({
      ...state,
      personalPlans: [
        personalPlanSchema.parse({
          id: 'tour-plan',
          region: 'sa',
          name: 'Produção de teste',
          sourceItemId: 5301,
          createdAt: new Date().toISOString(),
        }),
      ],
    }));
    fixture.detectChanges();
    expect(element.querySelector('[data-tour="shopping.items"]')).not.toBeNull();
    expect(element.querySelector('[data-tour="shopping.actions"]')).not.toBeNull();
  });
});
