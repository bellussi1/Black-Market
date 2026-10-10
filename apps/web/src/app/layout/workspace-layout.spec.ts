import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../testing/test-setup';
import { WorkspaceLayout } from './workspace-layout';

describe('workspace navigation', () => {
  useMemoryStorage();

  it('offers one destination for storage, family and market', async () => {
    const fixture = await renderComponent(WorkspaceLayout);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('#workspace-navigation')!;
    const paths = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(paths.filter((path) => path === '/storage')).toHaveLength(1);
    expect(paths.filter((path) => path === '/family')).toHaveLength(1);
    expect(paths.filter((path) => path === '/market')).toHaveLength(1);
    for (const path of ['/inventory', '/profile', '/gear', '/database/items', '/settings']) {
      expect(paths).not.toContain(path);
    }
    expect(nav.textContent).toContain('Armazém');
    expect(nav.textContent).toContain('Família');
  });
});
