import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { renderComponent } from '../../testing/test-setup';
import { ItemDossier } from './item-dossier';

describe('item dossier presentation', () => {
  it('announces pending catalog data without declaring the description absent', async () => {
    const fixture = await renderComponent(ItemDossier, {
      loading: true,
      fallbackName: 'Anel confirmado',
    });
    expect(fixture.nativeElement.textContent).toContain('Carregando descrição');
    expect(fixture.nativeElement.textContent).not.toContain('Descrição não disponível');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Descrição não disponível');
  });
  it('renders full item text safely with weight zero and known description segments', async () => {
    const item: CatalogItem = {
      id: 1,
      name: 'Equipamento de Vida com um nome bastante longo',
      description:
        '<script>window.bad=true</script><PAColor0xff57b4e2>Maestria informada<PAOldColor>\n\n※ Confira no jogo',
      weight: '0.0000',
      grade: 'blue',
      category: null,
      categories: [],
      icon: null,
    };
    const fixture = await renderComponent(ItemDossier, { item });
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h3')?.textContent).toBe(item.name);
    expect(element.querySelector('script')).toBeNull();
    expect(element.textContent).not.toContain('window.bad');
    expect(element.textContent).toContain('0 LT');
    expect(element.querySelector('.copy-info')?.textContent).toContain('Maestria informada');
    expect(element.querySelector('.description-note')).not.toBeNull();
  });
  it('keeps the confirmed name and identifier when catalog data is unavailable', async () => {
    const fixture = await renderComponent(ItemDossier, {
      fallbackName: 'Meu item confirmado',
      itemId: 212,
      showMarketLink: true,
    });
    expect(fixture.nativeElement.textContent).toContain('Meu item confirmado');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe(
      '/market/items/212',
    );
    expect(fixture.nativeElement.textContent).toContain('Descrição não disponível');
  });
});
