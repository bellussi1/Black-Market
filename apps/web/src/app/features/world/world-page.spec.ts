import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { WorldNode } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import { RegionPreferences } from '../../core/region-preferences';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { WorldPage } from './world-page';

const nodes: WorldNode[] = [
  {
    id: 'velia',
    name: 'Velia',
    x: 0,
    z: 0,
    contribution: 1,
    enabled: true,
    main: true,
    links: ['heidel'],
  },
  {
    id: 'heidel',
    name: 'Heidel',
    x: 10,
    z: 10,
    contribution: 2,
    enabled: true,
    main: true,
    links: ['velia'],
  },
];

function worldRequest() {
  return TestBed.inject(HttpTestingController).expectOne((request) =>
    request.url.includes('/api/v1/world/nodes'),
  );
}

describe('WorldPage loading states', () => {
  useMemoryStorage();

  it('reserves a map-shaped placeholder on first load and presents a separate empty state', async () => {
    const fixture = await renderComponent(WorldPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.skeleton-map')).not.toBeNull();
    expect(element.querySelector('svg[role="img"]')).toBeNull();
    worldRequest().flush({ nodes: [] });
    fixture.detectChanges();

    expect(element.querySelector('.skeleton-map')).toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Não há conexões');
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps the previous map visible during a region refresh', async () => {
    const fixture = await renderComponent(WorldPage);
    const element = fixture.nativeElement as HTMLElement;
    worldRequest().flush({ nodes });
    fixture.detectChanges();

    expect(element.querySelector('svg[role="img"]')).not.toBeNull();
    TestBed.inject(RegionPreferences).setRegion('eu');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector('svg[role="img"]')).not.toBeNull();
    expect(element.querySelector('.skeleton-map')).toBeNull();
    expect(element.querySelector('.world-map-refresh-slot [role="status"]')).not.toBeNull();
    expect(element.querySelector<HTMLSelectElement>('#world-destination')?.disabled).toBe(true);

    worldRequest().flush({ nodes: nodes.slice(0, 1) });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelectorAll('circle')).toHaveLength(1);
    expect(element.querySelector<HTMLSelectElement>('#world-destination')?.disabled).toBe(false);
    TestBed.inject(HttpTestingController).verify();
  });
});
