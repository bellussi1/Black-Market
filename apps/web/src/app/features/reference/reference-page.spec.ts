import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ReferenceApi, type ReferenceEntry } from '../../core/reference-api.service';
import { renderComponent } from '../../testing/test-setup';
import { ReferencePage } from './reference-page';

describe('ReferencePage loading states', () => {
  it('reserves a page of result cards and marks the real list request busy', async () => {
    const kinds = new Subject<{ kinds: { kind: string; label: string; total: number }[] }>();
    const results = new Subject<{
      items: ReferenceEntry[];
      total: number;
      page: number;
      pageSize: number;
      updatedAt: null;
    }>();
    const api = {
      kinds: vi.fn(() => kinds),
      list: vi.fn(() => results),
      detail: vi.fn(),
    };
    const params = convertToParamMap({ kind: 'npcs' });
    const fixture = await renderComponent(ReferencePage, {}, [
      { provide: ReferenceApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(params), snapshot: { paramMap: params } },
      },
    ]);

    const element = fixture.nativeElement as HTMLElement;
    const resultsRegion = element.querySelector('[data-reference-results]');
    expect(element.querySelector('.tool-page .tool-heading')).not.toBeNull();
    expect(element.querySelector('h1')?.textContent).toContain('Referências do jogo');
    expect(element.querySelector('input[type="search"]')).not.toBeNull();
    expect(api.list).toHaveBeenCalledOnce();
    expect(resultsRegion?.getAttribute('aria-busy')).toBe('true');
    expect(resultsRegion?.querySelectorAll('.reference-skeleton-card')).toHaveLength(24);
    expect(resultsRegion?.querySelector('[role="status"]')?.textContent).toContain('Carregando');
  });

  it('announces pending category metadata without presenting an empty selector as ready', async () => {
    const kinds = new Subject<{ kinds: { kind: string; label: string; total: number }[] }>();
    const api = {
      kinds: vi.fn(() => kinds),
      list: vi.fn(() => new Subject<never>()),
      detail: vi.fn(),
    };
    const params = convertToParamMap({ kind: 'npcs' });
    const fixture = await renderComponent(ReferencePage, {}, [
      { provide: ReferenceApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(params), snapshot: { paramMap: params } },
      },
    ]);

    const category = (fixture.nativeElement as HTMLElement).querySelector('[data-reference-kinds]');
    expect(category?.getAttribute('aria-busy')).toBe('true');
    expect(category?.querySelector('[role="status"]')?.textContent).toContain('categorias');
  });

  it('reserves a detail layout while its record request is pending', async () => {
    const kinds = new Subject<{ kinds: { kind: string; label: string; total: number }[] }>();
    const detail = new Subject<ReferenceEntry>();
    const api = {
      kinds: vi.fn(() => kinds),
      list: vi.fn(),
      detail: vi.fn(() => detail),
    };
    const params = convertToParamMap({ kind: 'npcs', id: '123' });
    const fixture = await renderComponent(ReferencePage, {}, [
      { provide: ReferenceApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(params), snapshot: { paramMap: params } },
      },
    ]);

    const loading = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-reference-detail-loading]',
    );
    expect(api.detail).toHaveBeenCalledOnce();
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelectorAll('.reference-detail-skeleton-field')).toHaveLength(6);
    expect(loading?.querySelector('[role="status"]')?.textContent).toContain('Carregando registro');
  });
});
