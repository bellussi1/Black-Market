import { By } from '@angular/platform-browser';
import { personalPlanSchema } from '@bdo/calculators';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PlansPage } from './plans-page';

describe('PlansPage tutorial surface', () => {
  useMemoryStorage();

  it('uses the shared page heading and keeps the save action visible for a new plan', async () => {
    const fixture = await renderComponent(PlansPage);
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.tool-page > header.tool-heading h1')?.textContent).toContain(
      'Do objetivo à próxima tarefa',
    );
    expect(page.querySelector('[data-tour="plans.actions"] button')?.textContent).toContain(
      'Salvar plano',
    );
  });

  it('shows collection and action anchors even when the user has no plans yet', async () => {
    const fixture = await renderComponent(PlansPage);
    const element = fixture.nativeElement as HTMLElement;
    const tutorial = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      ?.injector.get(TutorialSurfaceDirective);

    expect(tutorial?.appTutorialSurface()).toBe('plans');
    expect(element.querySelector('[data-tour="plans.collection"]')).not.toBeNull();
    expect(element.querySelector('[data-tour="plans.actions"]')).not.toBeNull();
    expect(element.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('renders BDO item icons for draft and saved plan materials', async () => {
    const catalog = {
      getItems: vi.fn(() =>
        of({
          items: [{ id: 9001, name: 'Sal', grade: 'white', icon: null }],
        }),
      ),
      resolveIconUrl: vi.fn(() => null),
    };
    const fixture = await renderComponent(PlansPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
    ]);
    const page = fixture.componentInstance;
    page.add({
      id: 9001,
      name: 'Sal',
      description: null,
      grade: 'white',
      weight: null,
      category: null,
      icon: null,
      categories: [],
    });
    page.store.update((state) => ({
      ...state,
      personalPlans: [
        personalPlanSchema.parse({
          id: 'plan-1',
          region: 'sa',
          name: 'Plano com ícone',
          createdAt: new Date().toISOString(),
          materials: [{ itemId: 9001, name: 'Sal', quantity: 5 }],
        }),
      ],
    }));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.row-editor app-item-icon')?.getAttribute('title')).toContain(
      'Sal',
    );
    expect(
      element.querySelector('[data-tour="plans.collection"] app-item-icon')?.getAttribute('title'),
    ).toContain('Sal');
  });
});
