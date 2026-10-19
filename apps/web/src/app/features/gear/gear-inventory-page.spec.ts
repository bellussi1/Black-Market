import { characterSchema } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { GearInventoryPage } from './gear-inventory-page';
describe('Character equipment management', () => {
  useMemoryStorage();
  it('selects an equipment position in context without writing before confirmation', async () => {
    const fixture = await renderComponent(GearInventoryPage);
    const page = fixture.componentInstance;
    page.name = 'Profissão';
    page.create();
    fixture.detectChanges();
    const before = structuredClone(page.profile());
    const tool = fixture.nativeElement.querySelector('[data-slot="tool"]') as HTMLButtonElement;
    tool.click();
    fixture.detectChanges();
    expect(page.slot).toBe('tool');
    expect(page.profile()).toEqual(before);
    page.item = { id: 10, name: 'Ferramenta' } as CatalogItem;
    page.level = 19;
    page.save();
    fixture.detectChanges();
    expect(page.profile()?.gear.find((row) => row.slot === 'tool')?.itemId).toBe(10);
    const tome = fixture.nativeElement.querySelector('[data-slot="tome"]') as HTMLButtonElement;
    tome.click();
    fixture.detectChanges();
    expect(page.slot).toBe('tome');
    expect(page.item).toBeNull();
    page.item = { id: 11, name: 'Tomo' } as CatalogItem;
    page.level = 19;
    page.caphras = 20;
    page.save();
    expect(page.profile()?.gear.find((row) => row.slot === 'tome')).toMatchObject({
      level: 0,
      caphras: 0,
    });
    expect(page.profile()?.gear.find((row) => row.slot === 'tool')?.level).toBe(19);
  });
  it('keeps equipment identity and review actions grouped when embedded and standalone', async () => {
    const fixture = await renderComponent(GearInventoryPage);
    const page = fixture.componentInstance;
    const standaloneElement: HTMLElement = fixture.nativeElement;
    expect(standaloneElement.querySelector('header.tool-heading h1')?.textContent).toContain(
      'Meus equipamentos',
    );
    expect(
      standaloneElement.querySelector('header.tool-heading')?.getAttribute('aria-labelledby'),
    ).toBe('gear-page-title');
    expect(
      standaloneElement.querySelector('section.panel .panel-heading h2')?.textContent,
    ).toContain('Personagem');
    expect(
      standaloneElement.querySelector(
        'section[aria-labelledby="gear-character-title"] #gear-character-title',
      )?.textContent,
    ).toContain('Personagem ativo');
    expect(standaloneElement.querySelector('details summary')?.textContent).toContain(
      'Cadastrar personagem',
    );

    page.name = 'Aventureiro';
    page.create();
    fixture.detectChanges();
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    const embeddedElement: HTMLElement = fixture.nativeElement;
    expect(embeddedElement.querySelector('.panel-heading h2')?.textContent).toContain(
      'Equipamentos do personagem',
    );
    expect(
      embeddedElement.querySelector('.gear-embedded-header')?.getAttribute('aria-labelledby'),
    ).toBe('gear-embedded-title');
    expect(embeddedElement.querySelector('#gear-embedded-title')).not.toBeNull();
    expect(embeddedElement.querySelector('app-equipment-sheet')).not.toBeNull();
    expect(embeddedElement.querySelector('.equipment-editor summary')?.textContent).toContain(
      'Adicionar ou corrigir equipamento manualmente',
    );
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

  it('offers 1-click Roman numeral enhancement presets adapted for weapons vs accessories', async () => {
    const fixture = await renderComponent(GearInventoryPage);
    const page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    page.chooseSlot('mainhand');
    fixture.detectChanges();

    expect(page.enhancementPresets().some((p) => p.label === 'V (PEN)' && p.value === 20)).toBe(
      true,
    );

    page.chooseSlot('necklace');
    fixture.detectChanges();
    expect(page.enhancementPresets().some((p) => p.label === 'V (PEN)' && p.value === 5)).toBe(
      true,
    );
  });
});
