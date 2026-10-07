import { describe, expect, it } from 'vitest';
import { EnhancementPage } from './enhancement-page';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';

describe('EnhancementPage', () => {
  useMemoryStorage();
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
