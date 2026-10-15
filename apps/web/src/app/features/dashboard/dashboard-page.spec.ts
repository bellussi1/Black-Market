import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { renderComponent } from '../../testing/test-setup';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage navigation', () => {
  it('omits links to login-required features while signed out', async () => {
    const fixture = await renderComponent(DashboardPage, {}, [
      {
        provide: IdentityService,
        useValue: { authenticated: signal(false) },
      },
    ]);
    const paths = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].map(
      (link) => new URL(link.getAttribute('href') ?? '/', 'http://localhost').pathname,
    );

    for (const path of ['/scans', '/storage', '/recommendations', '/family', '/shopping'])
      expect(paths).not.toContain(path);
  });
});
