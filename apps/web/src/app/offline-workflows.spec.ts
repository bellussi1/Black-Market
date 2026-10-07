import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MarketPage } from './features/market/market-page';
import { CraftingPage } from './features/crafting/crafting-page';
import { EnhancementPage } from './features/enhancement/enhancement-page';
import { BuffsPage } from './features/buffs/buffs-page';
import { SettingsPage } from './features/settings/settings-page';
import { WorkspaceStore } from './core/workspace-store';
import { emptyWorkspace } from './core/workspace-models';
import { defaultTax } from '@bdo/calculators';
describe('workflows without the game dataset', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  async function render<T>(component: Type<T>) {
    await TestBed.configureTestingModule({
      imports: [component],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  it('queries by ID through our API and saves provenance for a price above zero', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    page.lookupId.set('676');
    page.lookup();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('http://localhost:3000/api/v1/market/items/676?region=sa');
    const item = {
      itemId: 676,
      subId: 0,
      name: 'Example',
      price: '340000',
      stock: 3,
      totalTrades: '50',
      minPrice: '1',
      maxPrice: '500000',
      lastSoldPrice: null,
      lastSoldAt: null,
    };
    request.flush({
      source: 'arsha',
      region: 'sa',
      fetchedAt: '2026-10-07T12:00:00Z',
      cacheStatus: 'fetched',
      upstreamCacheMinutes: 30,
      items: [item],
    });
    page.saveLive(item);
    fixture.detectChanges();
    const quote = TestBed.inject(WorkspaceStore).data().quotes[0];
    expect(quote.source).toBe('arsha');
    expect(quote.itemId).toBe(676);
    expect(quote.history[0].source).toBe('arsha');
    expect(page.form().price).toBe('340000');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Example');
    http.verify();
  });
  it('renders economic profit separately from cash needed for owned ingredients', async () => {
    const fixture = await render(CraftingPage);
    const page = fixture.componentInstance;
    page.form.set({
      ...defaultTax,
      exempt: true,
      crafts: 2,
      yield: 2.5,
      salePrice: '100',
      extraCost: '10',
      minutes: 30,
      ingredients: [{ name: 'Material', quantity: 3, owned: 5, price: '20' }],
    });
    fixture.detectChanges();
    expect(page.result().value?.profit).toBe('370');
    expect(page.result().value?.cashCost).toBe('30');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.hero-metric')?.textContent,
    ).toContain('370');
  });
  it('keeps regional inventory separate when the shared region selector changes', async () => {
    await render(CraftingPage);
    const store = TestBed.inject(WorkspaceStore);
    store.replace({
      ...emptyWorkspace(),
      inventory: [
        {
          id: 'a',
          name: 'Material',
          region: 'sa',
          location: 'Velia',
          quantity: 5,
          target: 10,
          price: '100',
        },
      ],
    });
    store.setRegion('eu');
    expect(store.data().region).toBe('eu');
    expect(store.data().inventory.filter((r) => r.region === store.data().region)).toHaveLength(0);
    store.setRegion('sa');
    expect(store.data().inventory[0].quantity).toBe(5);
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
  it('activates one buff per exclusive group and removes expired effects from totals', async () => {
    const fixture = await render(BuffsPage);
    const page = fixture.componentInstance;
    const base = {
      group: 'Food',
      effect: 'XP',
      value: 10,
      unit: '%',
      duration: 1,
      enabled: false,
      startedAt: null,
    };
    const first = { ...base, id: 'one', name: 'Buff A' };
    const second = { ...base, id: 'two', name: 'Buff B', value: 20 };
    TestBed.inject(WorkspaceStore).replace({ ...emptyWorkspace(), buffs: [first, second] });
    page.toggle(first);
    page.toggle(second);
    expect(page.active().map((r) => r.id)).toEqual(['two']);
    page.start();
    page.now.set(Date.now() + 61_000);
    expect(page.totals()).toHaveLength(0);
  });
  it('previews a valid backup and replaces only after the checkbox is selected', async () => {
    const fixture = await render(SettingsPage);
    const page = fixture.componentInstance;
    const backup = { ...emptyWorkspace(), region: 'eu' };
    const event = {
      target: { files: [{ size: 100, text: async () => JSON.stringify(backup) }] },
    } as unknown as Event;
    await page.read(event);
    expect(page.candidate()?.region).toBe('eu');
    page.replace();
    expect(TestBed.inject(WorkspaceStore).data().region).toBe('sa');
    page.confirmReplace = true;
    page.replace();
    expect(TestBed.inject(WorkspaceStore).data().region).toBe('eu');
  });
});
