import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { AutomaticScanPage } from './automatic-scan-page';

describe('Automatic capture loading state', () => {
  useMemoryStorage();

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
