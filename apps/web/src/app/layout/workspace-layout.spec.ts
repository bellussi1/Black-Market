import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../testing/test-setup';
import { WorkspaceLayout } from './workspace-layout';

describe('workspace navigation', () => {
  useMemoryStorage();

  it('uses the supplied logo and preserves the separate wordmark', async () => {
    const fixture = await renderComponent(WorkspaceLayout);
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.brand')!;
    const wordmark = brand.querySelector('.brand-wordmark')!;

    expect(brand.querySelector('.brand-symbol')?.getAttribute('src')).toBe('/brand-mark.png');
    expect(brand.querySelector('.brand-symbol')?.getAttribute('alt')).toBe('');
    expect(brand.querySelector('.brand-symbol')?.getAttribute('aria-hidden')).toBe('true');
    expect(wordmark.children[0].textContent?.trim()).toBe('BLACK');
    expect(wordmark.children[1].textContent?.trim()).toBe('MARKET');
    expect(brand.querySelector('.brand-market')?.textContent?.trim()).toBe('MARKET');
  });

  it('offers one destination for storage, family and market', async () => {
    const fixture = await renderComponent(WorkspaceLayout);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('#workspace-navigation')!;
    const paths = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(paths.filter((path) => path === '/storage')).toHaveLength(1);
    expect(paths.filter((path) => path === '/family')).toHaveLength(1);
    expect(paths.filter((path) => path === '/market')).toHaveLength(1);
    expect(paths.filter((path) => path === '/crafting')).toHaveLength(1);
    expect(paths.filter((path) => path === '/roadmap')).toHaveLength(1);
    for (const path of ['/inventory', '/profile', '/gear', '/database/items', '/settings']) {
      expect(paths).not.toContain(path);
    }
    expect(nav.textContent).toContain('Armazém');
    expect(nav.textContent).toContain('Família');
    expect(nav.textContent).toContain('Calcular produção');
    expect(nav.textContent).toContain('Roadmap');
  });
});
