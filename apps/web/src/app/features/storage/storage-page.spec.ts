import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { StoragePage } from './storage-page';

describe('Storage import guidance', () => {
  useMemoryStorage();
  it('offers screenshots first, explains CSV provenance and retains manual entry', async () => {
    const fixture = await renderComponent(StoragePage);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a[href="/scans"]')?.textContent).toContain('Importar por print');
    expect(element.textContent).toContain('O BDO não exporta seu armazém em CSV');
    expect(element.querySelector('a[href="#storage-manual-title"]')).not.toBeNull();
    const csv = Array.from(element.querySelectorAll('details')).find((details) =>
      details.querySelector('summary')?.textContent?.includes('Já tenho uma planilha'),
    );
    expect(csv).toBeDefined();
    expect(csv?.open).toBe(false);
    expect(csv?.textContent).toContain(
      'Não existe um botão para exportar esse arquivo diretamente do jogo',
    );
  });
  it('renders user-provided names as text rather than executable markup', async () => {
    const fixture = await renderComponent(StoragePage);
    fixture.componentInstance.store.update((state) => ({
      ...state,
      inventory: [
        {
          id: 'markup',
          region: 'sa',
          name: '<img src=x onerror=alert(1)>',
          location: 'Velia',
          quantity: 1,
          target: 0,
          price: '0',
        },
      ],
    }));
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('td img')).toBeNull();
    expect(element.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('records CSV import start and completion without its contents or file name', async () => {
    const capture = vi.fn();
    const fixture = await renderComponent(StoragePage, {}, [
      { provide: AnalyticsService, useValue: { capture } },
    ]);
    const page = fixture.componentInstance;
    const file = new File(
      ['itemId;quantidade;local;meta;preco\n9001;42;Local particular;0;0'],
      'private-warehouse.csv',
      { type: 'text/csv' },
    );
    await page.readImport({ target: { files: [file] } } as unknown as Event);
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url.endsWith('/api/v1/items') && request.params.has('ids'))
      .flush({ items: [{ id: 9001, name: 'Example item' }], total: 1, dataset: null });
    page.confirmImport({ target: { checked: true } } as unknown as Event);
    page.applyImport();

    expect(capture.mock.calls).toEqual([
      ['journey_started', { feature: 'storage', action: 'import' }],
      ['journey_completed', { feature: 'storage', action: 'import', status: 'success' }],
    ]);
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(
      /private-warehouse|Local particular|9001|42|Example item/i,
    );
  });
});
