import { ActivatedRoute, convertToParamMap } from '@angular/router';
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
    expect(heading?.querySelector('.tool-kicker')?.textContent).toContain('MEU ESPAÇO');
    expect(tabs?.getAttribute('aria-label')).toContain('Dados pessoais');
    expect(selection?.querySelector('h2')?.textContent).toContain('Personagem ativo');
    expect(selectionPanel?.querySelector('select')).not.toBeNull();
  });
  it('opens equipment inside family while retaining the active character and family data', async () => {
    const params = new BehaviorSubject(convertToParamMap({ tab: 'equipment' }));
    const fixture = await renderComponent(PlayerPage, {}, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
    ]);
    const page = fixture.componentInstance;
    page.name = 'Aventureiro';
    page.create();
    page.saveFamily({ name: 'Minha família' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-gear-inventory-page')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    params.next(convertToParamMap({ tab: 'family' }));
    fixture.detectChanges();
    expect(page.family().name).toBe('Minha família');
    expect(page.current()?.name).toBe('Aventureiro');
    params.next(convertToParamMap({ tab: 'character' }));
    fixture.detectChanges();
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
});
