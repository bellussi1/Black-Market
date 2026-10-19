import { describe, expect, it } from 'vitest';

import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { EnhancementPage } from './enhancement-page';

describe('EnhancementPage', () => {
  useMemoryStorage();

  it('keeps the enhancement purpose and active workspace visible in the shared shell', async () => {
    const fixture = await render(EnhancementPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.tool-page > header.tool-heading h1')?.textContent).toContain(
      'Entenda o risco antes de tentar',
    );
    expect(element.querySelector('.tabs [aria-pressed="true"]')?.textContent).toContain(
      'Custo e probabilidade',
    );
  });

  it('renders the finite-horizon probability rather than guaranteeing a result', async () => {
    const fixture = await render(EnhancementPage);
    fixture.componentInstance.patch({ chance: 50, limit: 2, attemptCost: '100' });
    fixture.detectChanges();
    expect(fixture.componentInstance.result().value?.successPercent).toBe(75);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.hero-metric')?.textContent,
    ).toContain('75%');
  });
});
