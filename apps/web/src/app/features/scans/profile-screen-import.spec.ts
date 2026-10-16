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

  it('keeps preview, field selection and apply action grouped under the shared heading', async () => {
    const fixture = await renderComponent(ProfileScreenImportComponent);
    const component = fixture.componentInstance;
    component.newCharacterName.set('Patoin');
    component.createTarget();
    component.imageUrl.set('blob:capture-preview');
    component.imageName.set('maestria.png');
    component.imageSize.set({ width: 1280, height: 720 });
    component.candidates.set([
      {
        field: 'mastery.cooking',
        rawText: 'Culinária 1500',
        value: 1500,
        confidence: 94,
        bounds: { left: 0, top: 0, width: 100, height: 20 },
        status: 'candidate',
      },
    ]);
    component.selectedFields.set(['mastery.cooking']);
    fixture.detectChanges();

    const page = fixture.nativeElement.querySelector('.profile-screen-import') as HTMLElement;
    const heading = page.querySelector('.tool-heading[aria-labelledby="profile-import-title"]');
    const flow = page.querySelector('.profile-import-flow');
    expect(heading?.textContent).toContain('Revisar dados do personagem');
    expect(flow?.querySelector('.capture-preview img')).toBeTruthy();
    expect(flow?.querySelector('.candidate-list')).toBeTruthy();
    const applyButton = flow?.querySelector('.profile-actions button') as HTMLButtonElement | null;
    expect(applyButton?.textContent).toContain('Aplicar campos selecionados');
    expect(applyButton?.disabled).toBe(false);
  });
});
