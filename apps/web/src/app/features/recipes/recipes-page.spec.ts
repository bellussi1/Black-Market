import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipesPage } from './recipes-page';
const dataset = {
  region: 'sa',
  locale: 'pt',
  version: 'local-verifiable-fixture',
  importedAt: '2026-10-08T02:35:29Z',
  checksum: null,
  itemCount: 74216,
  recipeCount: 4406,
};
describe('Universal recipe explorer', () => {
  useMemoryStorage();
  const route = (id: string) => ({
    provide: ActivatedRoute,
    useValue: { paramMap: of(convertToParamMap({ id })), queryParamMap: of(convertToParamMap({})) },
  });
  it('loads an item by stable ID and supports alternatives without adding mutually exclusive inputs', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('5301')]),
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/items/5301'))
      .flush({
        item: {
          id: 5301,
          name: 'Reagente Líquido Limpo',
          categories: [],
          iconUrl: null,
          sourceData: {},
        },
        dataset,
      });
    const variants = [5439, 5600].map((id, index) => ({
      key: String(index).repeat(64),
      type: 'ALCHEMY',
      station: null,
      inputs: [{ itemId: id, name: index ? 'Erva Daninha' : 'Grama Selvagem', quantity: '1' }],
      outputs: [{ itemId: 5301, name: 'Reagente Líquido Limpo', quantity: null }],
    }));
    http
      .expectOne((r) => r.url.endsWith('/items/5301/recipes'))
      .flush({ recipes: variants, total: 2, dataset, direction: 'produces' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.item()?.id).toBe(5301);
    expect(fixture.componentInstance.alternatives()).toHaveLength(2);
    const methodSelector = fixture.nativeElement.querySelector(
      '.production-method select',
    ) as HTMLSelectElement;
    expect(methodSelector.value).toBe(variants[0].key);
    fixture.componentInstance.choose({ target: { value: variants[1].key } } as unknown as Event);
    fixture.detectChanges();
    expect(fixture.componentInstance.recipe()?.inputs[0].itemId).toBe(5600);
    expect(methodSelector.value).toBe(variants[1].key);
    expect(fixture.nativeElement.querySelector('app-recipe-tree').textContent).toContain(
      'Erva Daninha',
    );
    http.verify();
  });
  it('rejects invalid catalog IDs without making requests', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('-1')]);
    expect(fixture.componentInstance.message()).toContain('não encontrado');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
