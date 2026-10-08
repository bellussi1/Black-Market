import { describe, expect, it } from 'vitest';

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
});
