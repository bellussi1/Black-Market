import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { LifeskillsPage } from './lifeskills-page';

describe('lifeskill session analytics', () => {
  useMemoryStorage();

  it('records a saved session without its name, inputs, or calculated silver', async () => {
    const capture = vi.fn();
    const fixture = await renderComponent(LifeskillsPage, {}, [
      { provide: AnalyticsService, useValue: { capture } },
    ]);
    fixture.componentInstance.save();

    expect(capture.mock.calls).toEqual([
      ['journey_started', { feature: 'lifeskills', action: 'save' }],
      ['journey_completed', { feature: 'lifeskills', action: 'save', status: 'success' }],
    ]);
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(/Minha sessão|silver|999999/i);
  });
});
