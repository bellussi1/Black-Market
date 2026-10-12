import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ProfileScreenImportComponent } from './profile-screen-import';

describe('Profile screen import destination', () => {
  useMemoryStorage();
  it('creates and selects a destination without leaving the import', async () => {
    const fixture = await renderComponent(ProfileScreenImportComponent);
    const component = fixture.componentInstance;
    component.newCharacterName.set('Patoin');
    component.createTarget();
    expect(component.targetCharacter?.name).toBe('Patoin');
    expect(component.store.data().characters).toHaveLength(1);
    expect(component.store.data().activeCharacterId).toBe(component.targetId());
  });
  it('does not create a character without a name', async () => {
    const fixture = await renderComponent(ProfileScreenImportComponent);
    fixture.componentInstance.createTarget();
    expect(fixture.componentInstance.store.data().characters).toHaveLength(0);
  });
});
