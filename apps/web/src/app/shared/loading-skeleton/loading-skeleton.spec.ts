import { describe, expect, it } from 'vitest';

import { renderComponent } from '../../testing/test-setup';
import { LoadingSkeleton } from './loading-skeleton';

describe('LoadingSkeleton', () => {
  it('announces the pending content accessibly and keeps decoration hidden', async () => {
    const fixture = await renderComponent(LoadingSkeleton, {
      variant: 'rows',
      count: 3,
      label: 'Carregando cotações',
    });
    const element = fixture.nativeElement as HTMLElement;
    const status = element.querySelector('[role="status"]');

    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(status?.textContent).toContain('Carregando cotações');
    expect(element.querySelectorAll('.skeleton-row')).toHaveLength(3);
    expect(element.querySelector('.skeleton-visual')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the selected layout shape without domain data', async () => {
    const fixture = await renderComponent(LoadingSkeleton, { variant: 'table', count: 4 });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.skeleton-table-row')).toHaveLength(4);
    expect(element.textContent).not.toMatch(/prata|item #|receita/i);
  });

  it('uses an abstract map shape instead of chart bars for map data', async () => {
    const fixture = await renderComponent(LoadingSkeleton, {
      variant: 'map',
      count: 4,
      label: 'Carregando conexões',
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.skeleton-map')).not.toBeNull();
    expect(element.querySelectorAll('.skeleton-map-marker')).toHaveLength(4);
    expect(element.querySelector('.skeleton-chart')).toBeNull();
  });
});
