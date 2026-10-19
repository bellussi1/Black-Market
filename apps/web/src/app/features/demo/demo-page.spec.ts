import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent } from '../../testing/test-setup';
import { DemoPage } from './demo-page';

describe('DemoPage loading states', () => {
  it('uses the shared page heading and keeps the preparation action in view', async () => {
    const catalog = { getItems: vi.fn(() => new Subject<never>()) };
    const store = { data: signal({ region: 'sa' }), startDemo: vi.fn() };
    const fixture = await renderComponent(DemoPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: WorkspaceStore, useValue: store },
    ]);
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.tool-page > header.tool-heading h1')?.textContent).toContain(
      'Experimente com um jogador de exemplo',
    );
    expect(page.querySelector('[data-demo-catalog] button')?.textContent).toContain(
      'Preparar demonstração',
    );
  });

  it('reserves catalog rows and exposes the pending catalog request to assistive technology', async () => {
    const response = new Subject<never>();
    const catalog = { getItems: vi.fn(() => response) };
    const store = {
      data: signal({ region: 'sa' }),
      startDemo: vi.fn(),
    };
    const fixture = await renderComponent(DemoPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: WorkspaceStore, useValue: store },
    ]);

    const pending = fixture.componentInstance.prepare();
    fixture.detectChanges();

    const panel = (fixture.nativeElement as HTMLElement).querySelector('[data-demo-catalog]');
    expect(catalog.getItems).toHaveBeenCalledOnce();
    expect(panel?.getAttribute('aria-busy')).toBe('true');
    expect(panel?.querySelectorAll('.demo-skeleton-row').length).toBeGreaterThan(0);
    expect(panel?.querySelector('[role="status"]')?.textContent).toContain('catálogo');

    response.complete();
    await pending;
  });
});
