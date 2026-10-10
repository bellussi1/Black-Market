import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
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
    expect(fixture.componentInstance.methods()).toHaveLength(1);
    const methodSelector = fixture.nativeElement.querySelector(
      '.production-method select',
    ) as HTMLSelectElement;
    expect(methodSelector.value).toBe(variants[0].key);
    fixture.componentInstance.choose({ target: { value: variants[1].key } } as unknown as Event);
    fixture.detectChanges();
    expect(fixture.componentInstance.recipe()?.inputs[0].itemId).toBe(5600);
    expect(methodSelector.value).toBe(variants[0].key);
    expect(fixture.nativeElement.querySelector('app-recipe-tree').textContent).toContain(
      'Erva Daninha',
    );
    expect(fixture.nativeElement.querySelector('.dataset-provenance')).toBeNull();
    const mode = fixture.nativeElement.querySelector('.mode-toggle') as HTMLButtonElement;
    mode.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dataset-provenance')).not.toBeNull();
    mode.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dataset-provenance')).toBeNull();
    http.verify();
  });
  it('rejects invalid catalog IDs without making requests', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('-1')]);
    expect(fixture.componentInstance.message()).toContain('não encontrado');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
  it('scopes the workshop picker and resets recipe pagination when switching life skill groups', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('')]);
    const http = TestBed.inject(HttpTestingController);
    const flushList = (page: number, group: string | null) => {
      const request = http.expectOne((r) => r.url.endsWith('/recipes'));
      expect(request.request.params.get('page')).toBe(String(page));
      expect(request.request.params.get('recipeGroup')).toBe(group);
      request.flush({ recipes: [], total: 100, page, pageSize: 24, dataset });
    };
    flushList(1, null);
    fixture.detectChanges();
    const picker = fixture.debugElement.query(By.directive(CatalogItemPicker))
      .componentInstance as CatalogItemPicker;
    picker.query.set('carne');
    picker.find();
    const items = http.expectOne((r) => r.url.endsWith('/items'));
    expect(items.request.params.get('scope')).toBe('life-skill');
    items.flush({ items: [], total: 0, page: 1, pageSize: 12, dataset });
    fixture.componentInstance.move(1);
    flushList(2, null);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#recipe-group') as HTMLSelectElement;
    expect(select).not.toBeNull();
    select.value = 'alchemy';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    flushList(1, 'alchemy');
    expect(fixture.componentInstance.page).toBe(1);
    http.verify();
  });
});
