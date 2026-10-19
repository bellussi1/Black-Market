import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PlayerPage } from './player-page';
describe('Progressive player workspace', () => {
  useMemoryStorage();
  it('presents family tabs and character selection within the shared page hierarchy', async () => {
    const fixture = await renderComponent(PlayerPage);
    const element: HTMLElement = fixture.nativeElement;
    const heading = element.querySelector('header.tool-heading');
    const tabs = element.querySelector('.workspace-tabs');
    const selectionPanel = element.querySelector('section.panel');
    const selection = selectionPanel?.querySelector('.panel-heading');

    expect(heading?.querySelector('h1')?.textContent).toContain('Família');
    expect(heading?.getAttribute('aria-labelledby')).toBe('player-page-title');
    expect(heading?.querySelector('#player-page-title')).not.toBeNull();
    expect(heading?.querySelector('.tool-kicker')?.textContent).toContain('MEU ESPAÇO');
    expect(tabs?.getAttribute('aria-label')).toContain('Áreas da Família');
    expect(selection?.querySelector('h2')?.textContent).toContain('Personagem ativo');
    expect(selectionPanel?.getAttribute('aria-labelledby')).toBe('bdo-roster-title');
    expect(selectionPanel?.querySelector('#bdo-roster-title')).not.toBeNull();
    expect(selectionPanel?.querySelector('select')).not.toBeNull();
  });
  it('opens equipment inside family while retaining the active character and family data', async () => {
    const params = new BehaviorSubject(convertToParamMap({ tab: 'character' }));
    const fixture = await renderComponent(PlayerPage, {}, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
    ]);
    const page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    page.saveCharacter({
      gear: [{ slot: 'tool', itemId: 10001, name: 'Ferramenta de coleta', level: 0, caphras: 0 }],
    });
    page.saveFamily({ name: 'Minha família' });
    page.skill = 'cooking';
    page.tier = 'Guru';
    page.skillLevel = 10;
    page.saveSkill();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      '.bdo-identity-grid input',
    ) as HTMLInputElement;
    nameInput.value = 'Aventureiro Revisado';
    nameInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(page.current()?.name).toBe('Aventureiro Revisado');

    params.next(convertToParamMap({ tab: 'equipment' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-gear-inventory-page')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(page.current()?.gear[0]?.name).toBe('Ferramenta de coleta');

    params.next(convertToParamMap({ tab: 'family' }));
    fixture.detectChanges();
    const familyName = fixture.nativeElement.querySelector(
      '#family-panel input',
    ) as HTMLInputElement;
    familyName.value = 'Família revisada';
    familyName.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(page.family().name).toBe('Família revisada');
    expect(page.family().lifeSkills?.cooking?.level).toBe(10);
    expect(page.current()?.name).toBe('Aventureiro Revisado');

    params.next(convertToParamMap({ tab: 'character' }));
    fixture.detectChanges();
    expect(page.current()?.name).toBe('Aventureiro Revisado');
    expect(page.current()?.gear[0]?.name).toBe('Ferramenta de coleta');
    expect(fixture.nativeElement.textContent).toContain('Conjuntos e complementos');
  });
  it('creates with only a name and rejects invalid edits without mutating saved mastery', async () => {
    const fixture = await renderComponent(PlayerPage),
      page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    expect(page.current()?.name).toBe('Aventureiro');
    page.saveMastery('cooking', '850');
    page.saveMastery('cooking', '9000');
    expect(page.current()?.mastery.cooking).toBe(850);
    expect(page.message()).toContain('Valor inválido');
    expect(page.store.data().families).toBeUndefined();
  });
  it('hides scan and storage shortcuts from signed-out visitors', async () => {
    const fixture = await renderComponent(PlayerPage);
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).not.toContain('/scans');
    expect(links).not.toContain('/storage');
  });
  it('keeps family data per region and does not invent unknown life skill levels', async () => {
    const fixture = await renderComponent(PlayerPage),
      page = fixture.componentInstance;
    page.saveFamily({ name: 'Família SA', energyMax: 500 });
    page.skill = 'cooking';
    page.tier = 'Guru';
    page.skillLevel = 10;
    page.saveSkill();
    expect(page.family().lifeSkills?.cooking?.level).toBe(10);
    expect(page.family().lifeSkills?.fishing).toBeUndefined();
    page.store.setRegion('na');
    expect(page.family().name).toBe('');
    page.undoFamily();
    expect(page.family().name).toBe('');
    page.saveFamily({ name: 'Família NA' });
    page.store.setRegion('sa');
    expect(page.family().name).toBe('Família SA');
  });
  it('renders BDO item icons for registered character complements', async () => {
    const fixture = await renderComponent(PlayerPage);
    const page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    page.accessory('artifacts', {
      id: 721001,
      name: 'Artefato de Culinária',
      description: null,
      grade: 'blue',
      weight: null,
      category: null,
      icon: null,
      categories: [],
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('#character-complements app-item-icon')
        ?.getAttribute('title'),
    ).toContain('Artefato de Culinária');
  });

  it.each(['character', 'equipment', 'family'] as const)(
    'renders only the %s primary panel while keeping the character context visible',
    async (tab) => {
      const params = new BehaviorSubject(convertToParamMap({ tab }));
      const fixture = await renderComponent(PlayerPage, {}, [
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ]);
      const element: HTMLElement = fixture.nativeElement;
      const ids = ['character-panel', 'equipment-panel', 'family-panel'];

      expect(ids.filter((id) => element.querySelector(`#${id}`))).toEqual([`${tab}-panel`]);
      const roster = element.querySelector('.bdo-roster-panel')!;
      const selectedPanel = element.querySelector(`#${tab}-panel`)!;
      expect(roster).not.toBeNull();
      expect(
        roster.compareDocumentPosition(selectedPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(element.querySelector('[data-tour="family-character.character"]')).not.toBeNull();
      expect(
        element.querySelectorAll('nav[aria-label="Áreas da Família"] a[aria-current="page"]'),
      ).toHaveLength(1);
    },
  );

  it.each([undefined, 'unknown'] as const)(
    'uses the character panel for a %s tab query',
    async (requestedTab) => {
      const query = requestedTab ? { tab: requestedTab, keep: 'yes' } : { keep: 'yes' };
      const params = new BehaviorSubject(convertToParamMap(query));
      const fixture = await renderComponent(PlayerPage, {}, [
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ]);

      expect(fixture.componentInstance.tab()).toBe('character');
      expect(fixture.nativeElement.querySelector('#character-panel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#equipment-panel')).toBeNull();
      expect(fixture.nativeElement.querySelector('#family-panel')).toBeNull();
    },
  );

  it.each(['character', 'equipment'] as const)(
    'shows an instructional empty state without fabricated %s data',
    async (tab) => {
      const params = new BehaviorSubject(convertToParamMap({ tab }));
      const fixture = await renderComponent(PlayerPage, {}, [
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ]);

      expect(fixture.nativeElement.querySelector(`#${tab}-panel`)).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        tab === 'character'
          ? 'Um nome é suficiente para começar'
          : 'Crie ou selecione um personagem',
      );
      expect(fixture.nativeElement.querySelector('.bdo-p-window')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-gear-inventory-page')).toBeNull();
    },
  );

  it('updates the selected view in the URL and preserves unrelated query values', async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerPage],
      providers: [provideRouter([{ path: 'family', component: PlayerPage }])],
    }).compileComponents();
    const harness = await RouterTestingHarness.create('/family?keep=1');
    const router = TestBed.inject(Router);
    const equipmentLink = harness.routeNativeElement!.querySelector(
      'a[href*="tab=equipment"]',
    ) as HTMLAnchorElement | null;

    expect(equipmentLink).not.toBeNull();
    equipmentLink!.click();
    await harness.fixture.whenStable();

    expect(router.url).toContain('tab=equipment');
    expect(router.url).toContain('keep=1');
    expect(
      harness.routeNativeElement?.querySelector('a[aria-current="page"]')?.textContent,
    ).toContain('Equipamento');
  });

  it('shows the character attributes as a collapsed secondary group', async () => {
    const fixture = await renderComponent(PlayerPage);
    const page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector(
      '#character-panel details[data-family-secondary]',
    ) as HTMLDetailsElement | null;

    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(details?.querySelector('.bdo-stats-grid')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.bdo-mastery-grid')).not.toBeNull();
  });
});
