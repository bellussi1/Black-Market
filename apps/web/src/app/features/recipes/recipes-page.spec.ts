import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { expectTutorialAnchors, useTutorialGuideStub } from '../../testing/tutorial-test-setup';
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
  useTutorialGuideStub();
  it('uses the shared page container and keeps search and result content under one heading', async () => {
    const fixture = await renderComponent(RecipesPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.recipe-explorer.tool-page')).not.toBeNull();
    expect(element.querySelector('h1')?.textContent).toContain('Explorar receitas e origens');
    expect(element.querySelector('.search-panel app-catalog-item-picker')).not.toBeNull();
  });

  it('registers only unique tutorial anchors for the active page state', async () => {
    const fixture = await renderComponent(RecipesPage);
    expectTutorialAnchors(fixture, 'recipes', ['recipes.search']);
    fixture.componentInstance.item.set({
      id: 5301,
      name: 'Produto',
      categories: [],
      sourceData: {},
    } as never);
    fixture.componentInstance.alternatives.set([
      {
        key: '1'.repeat(64),
        type: 'ALCHEMY',
        station: null,
        inputs: [],
        outputs: [{ itemId: 5301, name: 'Produto', quantity: '1' }],
      },
    ]);
    fixture.detectChanges();
    expectTutorialAnchors(fixture, 'recipes', [
      'recipes.search',
      'recipes.methods',
      'recipes.tree',
    ]);
  });
  const route = (id: string) => ({
    provide: ActivatedRoute,
    useValue: {
      paramMap: of(convertToParamMap(id ? { id } : {})),
      queryParamMap: of(convertToParamMap({})),
    },
  });
  it('loads an item by stable ID and supports alternatives without adding mutually exclusive inputs', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('5301')]),
      http = TestBed.inject(HttpTestingController);
    expect(fixture.nativeElement.querySelector('.recipe-tree-loading')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.recipe-tree-loading')?.getAttribute('aria-hidden'),
    ).toBe('true');
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
    expect(fixture.nativeElement.querySelectorAll('h1:not([hidden])')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('app-recipe-tree h1')?.textContent).toContain(
      'Reagente Líquido Limpo',
    );
    expect(fixture.nativeElement.querySelector('.production-entry')).toBeNull();
    const count = fixture.nativeElement.querySelector('.craft-count-input') as HTMLInputElement;
    count.value = '42';
    count.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(count.value).toBe('42');
    const surface = fixture.debugElement.query(By.directive(TutorialSurfaceDirective));
    expect(surface?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe(
      'recipe-workshop',
    );
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
    for (const anchor of [
      'recipe-workshop.batch-mastery',
      'recipe-workshop.financial',
      'recipe-workshop.strategy',
      'recipe-workshop.materials-returns',
    ])
      expect(fixture.nativeElement.querySelectorAll(`[data-tour="${anchor}"]`)).toHaveLength(1);
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
    expect(fixture.nativeElement.querySelector('.dataset-provenance')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.mode-toggle')).toBeNull();
    http.verify();
  });
  it('changes the selected recipe from the URL without reloading the item and recipe data', async () => {
    const firstKey = '1'.repeat(64);
    const secondKey = '2'.repeat(64);
    const queryParams = new BehaviorSubject(convertToParamMap({ recipe: firstKey }));
    const fixture = await renderComponent(RecipesPage, {}, [
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ id: '5301' })),
          queryParamMap: queryParams,
        },
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/items/5301'))
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
    const recipes = [firstKey, secondKey].map((key, index) => ({
      key,
      type: 'ALCHEMY',
      station: null,
      inputs: [{ itemId: 5439 + index, name: `Material ${index}`, quantity: '1' }],
      outputs: [{ itemId: 5301, name: 'Reagente Líquido Limpo', quantity: null }],
    }));
    http
      .expectOne((request) => request.url.endsWith('/items/5301/recipes'))
      .flush({
        recipes,
        total: recipes.length,
        dataset,
        direction: 'produces',
      });
    await fixture.whenStable();
    fixture.detectChanges();

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.setMethod(recipes[1]);
    queryParams.next(convertToParamMap({ recipe: secondKey }));
    fixture.detectChanges();

    expect(fixture.componentInstance.recipe()?.key).toBe(secondKey);
    expect(fixture.componentInstance.loading()).toBe(false);
    queryParams.next(convertToParamMap({ recipe: firstKey }));
    fixture.detectChanges();
    expect(fixture.componentInstance.recipe()?.key).toBe(firstKey);
    expect(fixture.componentInstance.loading()).toBe(false);
    http.verify();
  });
  it('starts with the largest verified recipe batch and keeps smaller batches selectable', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('1407')]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/items/1407'))
      .flush({
        item: {
          id: 1407,
          name: 'Edania',
          categories: [],
          iconUrl: null,
          sourceData: {},
        },
        dataset,
      });
    const makeBatch = (
      key: string,
      scale: number,
      catalystId: number,
      catalystQuantity: number,
    ) => ({
      key,
      type: 'SIMPLE_ALCHEMY',
      station: null,
      inputs: [
        { itemId: 1399, name: 'Harmonia', quantity: String(scale) },
        { itemId: 702, name: 'Vontade', quantity: String(scale * 3) },
        { itemId: 1409, name: 'Elixir', quantity: String(scale * 3) },
        { itemId: catalystId, name: 'Catalisador', quantity: String(catalystQuantity) },
      ],
      outputs: [{ itemId: 1407, name: 'Edania', quantity: null }],
    });
    const batches = [
      makeBatch('1'.repeat(64), 1, 820936, 1),
      makeBatch('2'.repeat(64), 10, 821372, 1),
    ];
    http
      .expectOne((r) => r.url.endsWith('/items/1407/recipes'))
      .flush({ recipes: batches, total: batches.length, dataset, direction: 'produces' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.recipe()?.key).toBe(batches[1].key);
    expect(fixture.componentInstance.rootBatchOptions().map((batch) => batch.quantity)).toEqual([
      1, 10,
    ]);
    const batchSelector = fixture.nativeElement.querySelector(
      '#root-recipe-batch',
    ) as HTMLSelectElement;
    expect(batchSelector.value).toBe(batches[1].key);
    fixture.componentInstance.chooseBatch({
      target: { value: batches[0].key },
    } as unknown as Event);
    expect(fixture.componentInstance.recipe()?.key).toBe(batches[0].key);
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
      expect(request.request.params.get('pageSize')).toBe('25');
      expect(request.request.params.get('recipeGroup')).toBe(group);
      request.flush({ recipes: [], total: 100, page, pageSize: 25, dataset });
    };
    flushList(1, null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-tour="recipes.catalogue"]')).toHaveLength(
      1,
    );
    const surface = fixture.debugElement.query(By.directive(TutorialSurfaceDirective));
    expect(surface?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe('recipes');
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
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
  it('reserves the recipe catalogue layout and groups its filter with the results', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('')]);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.recipe-skeleton-card')).toHaveLength(25);
    expect(element.querySelector('.recipe-list-skeleton')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(element.querySelector('.recipe-pagination-bar-skeleton')).not.toBeNull();

    http
      .expectOne((request) => request.url.endsWith('/recipes'))
      .flush({
        recipes: [],
        total: 0,
        page: 1,
        pageSize: 24,
        dataset,
      });
    fixture.detectChanges();

    const browser = element.querySelector<HTMLElement>('.recipe-browser')!;
    expect(browser.getAttribute('aria-labelledby')).toBe('recipe-browser-title');
    expect(
      browser.querySelector('#recipe-group')?.closest('.recipe-browser-heading'),
    ).not.toBeNull();
    expect(browser.querySelector('.recipe-list-skeleton')).toBeNull();
    expect(browser.textContent).toContain('Comece por uma receita');
    expect(element.querySelector('h1')?.textContent).toContain('Explorar receitas e origens');
    http.verify();
  });
  it('shows an in-place skeleton while paginating and requests one more recipe per page', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [route('')]);
    const http = TestBed.inject(HttpTestingController);
    const makeRecipes = (page: number) =>
      Array.from({ length: 25 }, (_, index) => ({
        key: `${page}${String(index).padStart(63, '0')}`,
        type: 'COOKING',
        name: `Receita ${page}-${index + 1}`,
        outputs: [],
        inputs: [],
      }));
    const first = http.expectOne((request) => request.url.endsWith('/recipes'));
    expect(first.request.params.get('pageSize')).toBe('25');
    first.flush({ recipes: makeRecipes(1), total: 50, page: 1, pageSize: 25, dataset });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('.recipe-card:not(.recipe-skeleton-card)'),
    ).toHaveLength(25);
    fixture.componentInstance.move(1);
    fixture.detectChanges();

    const nextPage = http.expectOne((request) => request.url.endsWith('/recipes'));
    expect(nextPage.request.params.get('page')).toBe('2');
    expect(nextPage.request.params.get('pageSize')).toBe('25');
    expect(fixture.nativeElement.querySelector('.recipe-cards')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(fixture.nativeElement.querySelectorAll('.recipe-pagination-skeleton-card')).toHaveLength(
      25,
    );
    expect(
      fixture.nativeElement.querySelector('.recipe-cards-content')?.getAttribute('inert'),
    ).not.toBe(null);

    nextPage.flush({ recipes: makeRecipes(2), total: 50, page: 2, pageSize: 25, dataset });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.recipe-pagination-skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Receita 2-1');
    const next = fixture.nativeElement.querySelector(
      '.pagination-bar button:last-child',
    ) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    next.click();
    http.expectNone((request) => request.url.endsWith('/recipes'));
    http.verify();
  });
});

describe('recipe catalogue last page', () => {
  useMemoryStorage();
  it('keeps the pager before the grid while rendering a complete long name and retaining the page after an error', async () => {
    const fixture = await renderComponent(RecipesPage, {}, [
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({})), queryParamMap: of(convertToParamMap({})) },
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    const longName = 'Receita de nome muito longo com todos os materiais e qualidades '.repeat(8);
    const rows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        key: String(index).padStart(64, '0'),
        type: 'COOKING',
        name: longName,
        inputs: [],
        outputs: [],
      }));
    http
      .expectOne((r) => r.url.endsWith('/recipes'))
      .flush({ recipes: rows(25), total: 26, page: 1, pageSize: 25, dataset });
    fixture.detectChanges();
    fixture.componentInstance.move(1);
    http
      .expectOne((r) => r.url.endsWith('/recipes'))
      .flush({ recipes: rows(1), total: 26, page: 2, pageSize: 25, dataset });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.recipe-card strong').textContent).toBe(longName);
    expect(
      fixture.nativeElement.querySelectorAll('.recipe-cards-content .recipe-card'),
    ).toHaveLength(1);
    const pager = fixture.nativeElement.querySelector('.pagination-bar') as HTMLElement;
    const cards = fixture.nativeElement.querySelector('.recipe-cards') as HTMLElement;
    expect(pager.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fixture.componentInstance.filterGroup({ target: { value: 'alchemy' } } as unknown as Event);
    http
      .expectOne((r) => r.url.endsWith('/recipes'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pagination-bar span').textContent.trim()).toBe(
      'Página 2',
    );
    expect(fixture.nativeElement.querySelector('.recipe-card strong').textContent).toBe(longName);
    http.verify();
  });
});
