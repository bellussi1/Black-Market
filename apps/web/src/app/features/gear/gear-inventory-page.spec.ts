import { characterSchema } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { GearInventoryPage } from './gear-inventory-page';
describe('Character equipment management', () => {
  useMemoryStorage();
  it('keeps equipment identity and review actions grouped when embedded and standalone', async () => {
    const fixture = await renderComponent(GearInventoryPage, {}, [
      { provide: IdentityService, useValue: { authenticated: () => true } },
    ]);
    const page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const standaloneHeading = element.querySelector('.tool-page > header.tool-heading');

    expect(standaloneHeading).not.toBeNull();
    expect(standaloneHeading?.getAttribute('aria-labelledby')).toBe('gear-page-title');
    expect(standaloneHeading?.querySelector('#gear-page-title')?.textContent).toContain(
      'Meus equipamentos',
    );
    expect(standaloneHeading?.querySelector('.action-row')?.textContent).toContain(
      'Importar equipamentos por captura',
    );
    expect(standaloneHeading?.querySelector('.action-row')?.textContent).toContain(
      'Ver inventário',
    );
    expect(element.querySelector('.gear-character-context')?.getAttribute('aria-labelledby')).toBe(
      'gear-character-title',
    );
    expect(element.querySelector('#gear-character-title')?.textContent).toContain(
      'Personagem ativo',
    );
    expect(element.querySelector('app-equipment-sheet')).not.toBeNull();
    expect(element.textContent).toContain('Adicionar ou corrigir equipamento manualmente');

    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    const embeddedHeading = element.querySelector(
      '.tool-page > header.page-heading[aria-labelledby="gear-embedded-title"]',
    );
    expect(embeddedHeading?.querySelector('#gear-embedded-title')?.textContent).toContain(
      'Equipamentos do personagem',
    );
    expect(embeddedHeading?.querySelector('.action-row')).toBeNull();
    expect(element.querySelector('.gear-character-context')).toBeNull();
    expect(element.querySelector('app-equipment-sheet')).not.toBeNull();
    expect(page.profile()?.name).toBe('Aventureiro');
  });
  it('uses the shared active character when equipment selection changes', async () => {
    const fixture = await renderComponent(GearInventoryPage);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({ id: 'one', name: 'Primeiro', region: 'sa' }),
        characterSchema.parse({ id: 'two', name: 'Segundo', region: 'sa' }),
      ],
      activeCharacterId: 'one',
    }));
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'two';
    select.dispatchEvent(new Event('change'));
    expect(page.store.activeCharacter()?.id).toBe('two');
    page.store.update((state) => ({ ...state, activeCharacterId: 'one' }));
    expect(page.profile()?.id).toBe('one');
  });
  it('hides scan and storage shortcuts when no account is signed in', async () => {
    const fixture = await renderComponent(GearInventoryPage);
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).not.toContain('/scans');
    expect(links).not.toContain('/storage');
  });
  it('creates a character and saves manual equipment without calculating attributes', async () => {
    const fixture = await renderComponent(GearInventoryPage),
      page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    page.slot = 'mainhand';
    page.item = { id: 10010, name: 'Espada', icon: null } as CatalogItem;
    page.level = 19;
    page.caphras = 3;
    page.save();
    expect(page.profile()!.gear[0]).toMatchObject({
      itemId: 10010,
      slot: 'mainhand',
      level: 19,
      caphras: 3,
      levelConfirmed: true,
      caphrasConfirmed: true,
    });
    expect(page.profile()!.mainAp).toBe(0);
    page.level = 99;
    page.item = { id: 10010, name: 'Espada' } as CatalogItem;
    page.save();
    expect(page.profile()!.gear[0].level).toBe(19);
    expect(page.message()).toContain('Confira');
  });
});
