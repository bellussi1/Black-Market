import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { TutorialLauncher } from '../../shared/tutorials/tutorial-launcher';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { MarketPage } from '../market/market-page';
import { RecipesPage } from '../recipes/recipes-page';
import { RecommendationsPage } from '../recommendations/recommendations-page';
import { AutomaticScanPage } from '../scans/automatic-scan-page';
import { StockPage } from '../stock/stock-page';
import { StoragePage } from '../storage/storage-page';

describe('Tutorial page anchors', () => {
  useMemoryStorage();
  it('marketPage registers search filters and results exactly once', async () => {
    const fixture = await renderComponent(MarketPage);
    for (const key of ['market.search', 'market.filters', 'market.results'])
      expect(fixture.nativeElement.querySelectorAll(`[data-tour="${key}"]`)).toHaveLength(1);
    const surface = fixture.debugElement.query(By.directive(TutorialSurfaceDirective));
    expect(surface?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe('market');
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });
  it('recipesPage registers its catalogue tutorial without a page launcher', async () => {
    const fixture = await renderComponent(RecipesPage);
    expect(fixture.nativeElement.querySelector('[data-tour="recipes.search"]')).not.toBeNull();
    const surface = fixture.debugElement.query(By.directive(TutorialSurfaceDirective));
    expect(surface?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe('recipes');
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });
  it('automaticScanPage exposes capture and review only in visible states', async () => {
    const fixture = await renderComponent(AutomaticScanPage);
    expect(fixture.nativeElement.querySelectorAll('[data-tour="scans.capture"]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-tour="scans.review"]')).toBeNull();
    fixture.componentInstance.kind.set('storage');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-tour="scans.capture"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-tour="scans.review"]')).toHaveLength(1);
  });
  it('storagePage exposes item and project targets without duplicates', async () => {
    const fixture = await renderComponent(StoragePage);
    expect(fixture.nativeElement.querySelectorAll('[data-tour="storage.items"]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('[data-tour="storage.projects"]')).toHaveLength(
      1,
    );
  });
  it('stockPage exposes registered item anchor', async () => {
    const fixture = await renderComponent(StockPage);
    expect(fixture.nativeElement.querySelectorAll('[data-tour="storage.items"]')).toHaveLength(1);
    expect(
      fixture.debugElement.query(By.directive(TutorialLauncher)).componentInstance.screenKey(),
    ).toBe('storage');
  });
  it('recommendationsPage uses its registered launcher without changing loading states', async () => {
    const fixture = await renderComponent(RecommendationsPage);
    expect(
      fixture.debugElement.query(By.directive(TutorialLauncher)).componentInstance.screenKey(),
    ).toBe('recommendations');
  });
});
