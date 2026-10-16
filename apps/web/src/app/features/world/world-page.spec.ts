import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { WorldPage } from './world-page';

describe('WorldPage loading state', () => {
  useMemoryStorage();

  it('reserves the map dimensions and exposes a busy status while connections load', async () => {
    const fixture = await renderComponent(WorldPage, {}, [
      { provide: HttpClient, useValue: { get: () => new Subject<unknown>() } },
    ]);

    const loading = fixture.nativeElement.querySelector('.world-map-loading-skeleton');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.textContent).toContain('Carregando conexões');
    expect(fixture.nativeElement.querySelector('svg[viewBox="0 0 1000 1000"]')).toBeNull();
    const empire = fixture.nativeElement.querySelector('.empire');
    expect(empire?.getAttribute('aria-busy')).toBe('true');
    expect(empire?.querySelector('.empire-loading')?.textContent).toContain('Carregando bases');
  });
});
