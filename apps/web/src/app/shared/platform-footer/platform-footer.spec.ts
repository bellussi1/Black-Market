import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PrivacyService } from '../../core/privacy.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PlatformFooter } from './platform-footer';

describe('platform footer', () => {
  useMemoryStorage();
  it('provides one named footer with legal and support links', async () => {
    const fixture = await renderComponent(PlatformFooter);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('footer').length).toBe(1);
    expect(element.querySelector('footer')?.getAttribute('aria-label')).toBeTruthy();
    for (const path of ['/termos', '/privacidade', '/cookies', '/contato', '/sobre/']) {
      expect(element.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
    expect(element.querySelectorAll('nav[aria-label]').length).toBe(2);
    expect(element.querySelector('a[href="/settings"]')).toBeNull();
    expect(element.textContent).toContain('© ' + new Date().getUTCFullYear());
    expect(element.textContent).toContain('sem afiliação');
    expect(element.querySelector('.footer-identity p')?.textContent).toMatch(
      /Black Desert Online.*sem afiliação com a Pearl Abyss/i,
    );
  });
  it('opens the existing preference mechanism without requiring optional analytics', async () => {
    const fixture = await renderComponent(PlatformFooter);
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.type).toBe('button');
    expect(button.disabled).toBe(false);
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    try {
      button.focus();
      expect(document.activeElement).toBe(button);
      button.click();
    } finally {
      element.remove();
    }
    expect(TestBed.inject(PrivacyService).open()).toBe(true);
    expect(TestBed.inject(PrivacyService).allowsAnalytics()).toBe(false);
  });
});
