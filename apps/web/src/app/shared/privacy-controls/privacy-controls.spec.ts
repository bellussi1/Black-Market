import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { PrivacyService } from '../../core/privacy.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PrivacyControls } from './privacy-controls';

describe('privacy preference controls', () => {
  useMemoryStorage();

  it('does not ask users to accept an optional service that is unavailable', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.open.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Nenhuma ferramenta opcional será iniciada');
    expect(element.querySelector('button')).not.toBeNull();
    expect(element.textContent).not.toContain('Aceitar estatísticas');
    expect(element.textContent).not.toContain('Rejeitar opcionais');
  });

  it('lets a user revoke an older choice while the optional service is unavailable', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(true);
    privacy.open.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const revoke = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Revogar'),
    )!;
    expect(revoke).toBeTruthy();
    revoke.click();
    expect(privacy.allowsAnalytics()).toBe(false);
    expect(localStorage.getItem('black-market.privacy.v1')).toContain('false');
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
      expect(document.activeElement?.textContent).toContain('Sua privacidade');
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
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      removeItem: () => undefined,
    });
    fixture.nativeElement.querySelector('button')!.click();
    fixture.detectChanges();
    expect(privacy.storageWarning()).toContain('enquanto esta página estiver aberta');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'enquanto esta página estiver aberta',
    );
  });
});
