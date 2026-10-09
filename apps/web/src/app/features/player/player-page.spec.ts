import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PlayerPage } from './player-page';
describe('Progressive player workspace', () => {
  useMemoryStorage();
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
