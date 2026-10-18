import type { CatalogItemDetail } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { renderComponent } from '../../testing/test-setup';
import { RecipeItemQuickInfo } from './recipe-item-quick-info';

describe('recipe item quick information', () => {
  it('keeps the game item identity compact and reveals long descriptions on demand', async () => {
    const item: CatalogItemDetail = {
      id: 1,
      name: 'Item Collection Increase Scroll: Advanced',
      description:
        'Can be placed in the Family Inventory\nPersonal transaction unavailable\nDescription\nEffects\nCharges 120 minutes',
      grade: 'yellow',
      weight: '0.1000',
      category: 'Consumable',
      icon: null,
      categories: [],
      sourceData: {},
    };
    const fixture = await renderComponent(RecipeItemQuickInfo, { item });
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('false');
    expect(element.querySelector('h2')?.textContent).toBe(item.name);
    expect(element.textContent).toContain('Consumable');
    expect(element.textContent).toContain('0,1 LT');
    expect(element.querySelectorAll('.quick-item-description > p')).toHaveLength(3);

    (element.querySelector('.quick-description-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.quick-item-description > p')).toHaveLength(5);
    expect(element.querySelector('.quick-description-toggle')?.textContent).toContain(
      'Mostrar menos',
    );
  });

  it('announces catalog loading without presenting the description as missing', async () => {
    const fixture = await renderComponent(RecipeItemQuickInfo, {
      fallbackName: 'Item conhecido',
      loading: true,
    });
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Consultando');
    expect(element.textContent).not.toContain('Descrição não disponível');
    expect(element.querySelector('.quick-item-info')?.getAttribute('aria-busy')).toBe('true');
  });

  it('uses an absolute in-tree surface instead of a viewport-fixed modal', () => {
    const styles = (
      RecipeItemQuickInfo as unknown as { ɵcmp: { styles: readonly string[] } }
    ).ɵcmp.styles.join('\n');
    expect(styles).toContain('position: absolute');
    expect(styles).not.toContain('position: fixed');
  });

  it('keeps a known zero weight and does not invent unavailable descriptions', async () => {
    const item: CatalogItemDetail = {
      id: 2,
      name: 'Tábua',
      description: null,
      grade: null,
      weight: '0',
      category: null,
      icon: null,
      categories: [],
      sourceData: {},
    };
    const fixture = await renderComponent(RecipeItemQuickInfo, { item });

    expect(fixture.nativeElement.textContent).toContain('0 LT');
    expect(fixture.nativeElement.textContent).toContain('Descrição não disponível');
  });
});
