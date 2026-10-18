import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { PRIVACY_COOKIE, PrivacyService } from '../../core/privacy.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PrivacyControls } from './privacy-controls';

function cookieValue(name: string): string | null {
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
  return value === undefined ? null : decodeURIComponent(value);
}

describe('privacy preference controls', () => {
  useMemoryStorage();

  it('does not ask users to accept an optional service that is unavailable', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.open.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Nenhum evento de estatísticas será enviado');
    expect(element.querySelector('button')).not.toBeNull();
    expect(element.textContent).not.toContain('Aceitar estatísticas');
    expect(element.textContent).not.toContain('Rejeitar opcionais');
  });

  it('shows essential storage as always active and analytics as off before a choice', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.optionalAvailable.set(true);
    privacy.open.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Sempre ativos');
    expect(element.textContent).toContain('Sem escolha ainda');
    expect(privacy.allowsAnalytics()).toBe(false);
  });

  it('shows an enabled choice and disables analytics with one direct action', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.optionalAvailable.set(true);
    privacy.save(true);
    privacy.open.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Estatísticas permitidas');
    const revoke = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Desativar estatísticas'),
    );
    expect(revoke).toBeTruthy();
    revoke!.click();

    expect(privacy.allowsAnalytics()).toBe(false);
    expect(JSON.parse(cookieValue(PRIVACY_COOKIE)!).analytics).toBe(false);
  });

  it('lets a user revoke an older choice while the optional service is unavailable', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(true);
    privacy.open.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Autorização anterior');
    const revoke = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Revogar'),
    )!;
    expect(revoke).toBeTruthy();
    revoke.click();
    expect(privacy.allowsAnalytics()).toBe(false);
    expect(JSON.parse(cookieValue(PRIVACY_COOKIE)!).analytics).toBe(false);
  });

  it('restores focus after closing preferences with Escape', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    const host = fixture.nativeElement as HTMLElement;
    const returnFocus = document.createElement('button');
    returnFocus.textContent = 'Configurar privacidade';
    document.body.append(returnFocus, host);
    try {
      returnFocus.focus();
      privacy.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement?.textContent).toContain('Preferências de privacidade');
      host
        .querySelector('.privacy-panel')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).toBe(returnFocus);
    } finally {
      returnFocus.remove();
      host.remove();
    }
  });

  it('keeps the notice visible when browser storage prevents preference persistence', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.optionalAvailable.set(true);
    fixture.detectChanges();
    vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
    fixture.nativeElement.querySelector('button')!.click();
    fixture.detectChanges();
    expect(privacy.storageWarning()).toContain('enquanto esta página estiver aberta');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'enquanto esta página estiver aberta',
    );
  });
});
