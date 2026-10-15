import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { CatalogItemPicker } from './catalog-item-picker';

describe('Catalog picker search scope', () => {
  useMemoryStorage();
  it('keeps ordinary catalog pickers unrestricted', async () => {
    const fixture = await renderComponent(CatalogItemPicker);
    fixture.componentInstance.query.set('espada');
    fixture.componentInstance.find();
    const request = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/items'),
    );
    expect(request.request.params.has('scope')).toBe(false);
    request.flush({ items: [], total: 0, dataset: null, page: 1, pageSize: 12 });
    fixture.componentInstance.loadCategories();
    const categories = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/categories'),
    );
    expect(categories.request.params.has('scope')).toBe(false);
    categories.flush({ categories: [], dataset: null });
    TestBed.inject(HttpTestingController).verify();
  });
  it('replaces cached general categories with scoped categories after changing scope', async () => {
    const fixture = await renderComponent(CatalogItemPicker);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.loadCategories();
    http
      .expectOne((r) => r.url.endsWith('/categories'))
      .flush({
        categories: [{ id: 'weapon', name: 'Armas', parentId: null, sortOrder: 1 }],
        dataset: null,
      });
    fixture.componentInstance.category.set('weapon');
    fixture.componentRef.setInput('scope', 'life-skill');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.categories()).toEqual([]);
    expect(fixture.componentInstance.category()).toBe('');
    fixture.componentInstance.loadCategories();
    const scoped = http.expectOne((r) => r.url.endsWith('/categories'));
    expect(scoped.request.params.get('scope')).toBe('life-skill');
    scoped.flush({
      categories: [{ id: 'material', name: 'Material', parentId: null, sortOrder: 1 }],
      dataset: null,
    });
    expect(fixture.componentInstance.categories().map((category) => category.name)).toEqual([
      'Material',
    ]);
    http.verify();
  });
  it('clears previous results and cancels pending searches when the scope changes', async () => {
    const fixture = await renderComponent(CatalogItemPicker);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.query.set('espada');
    fixture.componentInstance.open.set(true);
    fixture.componentInstance.find();
    http
      .expectOne((r) => r.url.endsWith('/items'))
      .flush({
        items: [{ id: 1, name: 'Espada', categories: [] }],
        total: 1,
        dataset: { version: 'same' },
        page: 1,
        pageSize: 12,
      });
    fixture.componentInstance.query.set('espadas');
    fixture.componentInstance.find();
    const pending = http.expectOne((r) => r.url.endsWith('/items'));
    fixture.componentInstance.loadCategories();
    const pendingCategories = http.expectOne((r) => r.url.endsWith('/categories'));
    fixture.componentRef.setInput('scope', 'life-skill');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending.cancelled).toBe(true);
    expect(pendingCategories.cancelled).toBe(true);
    expect(fixture.componentInstance.result()).toBeNull();
    expect(fixture.componentInstance.open()).toBe(false);
    fixture.componentInstance.find();
    const scoped = http.expectOne((r) => r.url.endsWith('/items'));
    expect(scoped.request.params.get('scope')).toBe('life-skill');
    scoped.flush({ items: [], total: 0, dataset: null, page: 1, pageSize: 12 });
    http.verify();
  });
});
