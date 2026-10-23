import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { AutomaticScanPage, scanModeForScreenKind } from './automatic-scan-page';

describe('Automatic capture loading state', () => {
  useMemoryStorage();

  it('routes life equipment to its own mode and unknown screens to a manual choice', () => {
    expect(scanModeForScreenKind('life-equipment')).toBe('life-gear');
    expect(scanModeForScreenKind('equipment')).toBe('gear');
    expect(scanModeForScreenKind('unknown')).toBe('unknown');
    expect(scanModeForScreenKind('market')).toBe('unknown');
  });

  it('keeps capture setup under the shared page heading', async () => {
    const fixture = await renderComponent(AutomaticScanPage);
    const page = fixture.nativeElement as HTMLElement;

    expect(
      page
        .querySelector('.tool-page.scan-workspace > header.tool-heading h1#capture-title')
        ?.textContent?.trim().length,
    ).toBeGreaterThan(0);
    expect(page.querySelector('.upload-area')).not.toBeNull();
  });

  it('announces screen detection without changing the upload panel height', async () => {
    const fixture = await renderComponent(AutomaticScanPage);
    const page = fixture.componentInstance;
    page.reading.set(true);
    page.message.set('Identificando a tela…');
    fixture.detectChanges();

    const upload = (fixture.nativeElement as HTMLElement).querySelector('.upload-area');
    expect(upload?.getAttribute('aria-busy')).toBe('true');
    expect(upload?.querySelector('[role="status"]')?.textContent).toContain('Identificando');
  });
});
