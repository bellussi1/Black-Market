import type { CatalogItem } from '@bdo/shared';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ReferenceApi, type ReferenceEntry } from '../../core/reference-api.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { EquipmentReference } from './equipment-reference';

describe('EquipmentReference loading state', () => {
  useMemoryStorage();

  it('keeps an accessible reserved skeleton until catalog and reference data finish loading', async () => {
    const itemResponse = new Subject<{
      item: CatalogItem & { sourceData: Record<string, unknown> };
    }>();
    const enhancementResponse = new Subject<ReferenceEntry>();
    const caphrasResponse = new Subject<ReferenceEntry>();
    const fixture = await renderComponent(EquipmentReference, {}, [
      { provide: CatalogApiService, useValue: { getItem: () => itemResponse } },
      {
        provide: ReferenceApi,
        useValue: {
          detail: (kind: string) =>
            kind === 'enhancements' ? enhancementResponse : caphrasResponse,
        },
      },
    ]);
    const item = {
      id: 9601,
      name: 'Armadura de teste',
      description: null,
      grade: null,
      weight: '1',
      category: 'Armor',
      icon: null,
      categories: [],
    };

    fixture.componentInstance.select(item);
    fixture.detectChanges();
    const loading = fixture.nativeElement.querySelector('.equipment-reference-status');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('section.panel')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(
      fixture.nativeElement.querySelector('.equipment-reference-result-skeleton'),
    ).not.toBeNull();

    itemResponse.next({ item: { ...item, sourceData: { enhancement: { urn: 'armor-test' } } } });
    itemResponse.complete();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.equipment-reference-result-skeleton'),
    ).not.toBeNull();

    enhancementResponse.next({
      id: 'armor-test',
      name: 'Armadura de teste',
      data: { levels: [{ level: 0, name: 'Base' }] },
    });
    enhancementResponse.complete();
    caphrasResponse.next({ id: 'caphras-test', name: 'Caphras', data: { levels: [] } });
    caphrasResponse.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.equipment-reference-result-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('section.panel')?.hasAttribute('aria-busy')).toBe(
      false,
    );
    expect(fixture.nativeElement.querySelector('select')).not.toBeNull();
  });
});
