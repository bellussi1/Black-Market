import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ProfileScreenImportComponent } from './profile-screen-import';

describe('Profile screen import destination', () => {
  useMemoryStorage();
  it('keeps preview, field selection and apply action under the shared import heading', async () => {
    const fixture = await renderComponent(ProfileScreenImportComponent);
    const page = fixture.componentInstance;
    page.imageUrl.set('data:image/png;base64,AA==');
    page.imageName.set('captura.png');
    page.imageSize.set({ width: 100, height: 100 });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const heading = element.querySelector('header.tool-heading');
    const review = element.querySelector('section[aria-labelledby="profile-review-title"]');
    expect(heading?.querySelector('h1')?.textContent).toContain('Importar dados do personagem');
    expect(element.querySelector('.capture-preview img')).not.toBeNull();
    expect(review?.querySelector('.panel-heading h2')?.id).toBe('profile-review-title');
    expect(review?.querySelector('.profile-actions button')?.textContent).toContain(
      'Aplicar campos selecionados',
    );
  });
  it('marks the profile capture as busy and keeps OCR progress in a live status region', async () => {
    const fixture = await renderComponent(ProfileScreenImportComponent);
    const page = fixture.componentInstance;
    page.imageUrl.set('data:image/png;base64,AA==');
    page.imageName.set('captura.png');
    page.imageSize.set({ width: 100, height: 100 });
    page.reading.set(true);
    page.progress.set(0.4);
    fixture.detectChanges();

    const progress = (fixture.nativeElement as HTMLElement).querySelector('.ocr-progress');
    expect(progress?.getAttribute('aria-busy')).toBe('true');
    expect(progress?.getAttribute('role')).toBe('status');
    expect(progress?.querySelector('progress')?.getAttribute('value')).toBe('0.4');
  });
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
