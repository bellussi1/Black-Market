import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RngPage } from './rng-page';

describe('RngPage', () => {
  useMemoryStorage();

  it('uses the shared heading and exposes editable expected-value inputs', async () => {
    const fixture = await renderComponent(RngPage);
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.tool-page > header.tool-heading h1')?.textContent).toContain(
      'Quanto vale abrir',
    );
    expect(page.textContent).toContain('Preço por caixa');
    expect(page.textContent).toContain('Probabilidade');
    expect(page.querySelector('.action-row button')?.textContent).toContain('Remover resultado');
  });
});
