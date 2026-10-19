import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { LifeskillsPage } from '../lifeskills/lifeskills-page';
import { MarketPage } from '../market/market-page';
import { PlayerPage } from '../player/player-page';
import { RecipesPage } from '../recipes/recipes-page';
import { RecommendationsPage } from '../recommendations/recommendations-page';
import { AutomaticScanPage } from '../scans/automatic-scan-page';
import { type CellDraft, ScansPage } from '../scans/scans-page';
import { StockPage } from '../stock/stock-page';
import { StoragePage } from '../storage/storage-page';

describe('Automatic tutorial surfaces', () => {
  useMemoryStorage();

  it('keeps public market anchors without a page launcher', async () => {
    const market = await renderComponent(MarketPage);
    for (const key of ['market.search', 'market.filters', 'market.results'])
      expect(market.nativeElement.querySelectorAll(`[data-tour="${key}"]`)).toHaveLength(1);
    expect(market.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('keeps the public recipe catalogue anchor without a page launcher', async () => {
    const recipes = await renderComponent(RecipesPage);
    expect(recipes.nativeElement.querySelector('[data-tour="recipes.search"]')).not.toBeNull();
    expect(recipes.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('maps stock and personal inventory tabs to distinct guide surfaces', async () => {
    const fixture = await renderComponent(StockPage);
    const page = fixture.componentInstance;
    const surface = () => fixture.debugElement.query(By.directive(TutorialSurfaceDirective));

    expect(surface()).not.toBeNull();
    expect(surface()?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe('storage');
    expect(fixture.nativeElement.querySelector('[data-tour="storage.items"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-tour="storage.projects"]')).toHaveLength(
      1,
    );

    page.kind.set('inventory');
    fixture.detectChanges();
    expect(surface()?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe(
      'stock-inventory',
    );
    expect(
      fixture.nativeElement.querySelector('[data-tour="stock-inventory.location"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-tour="stock-inventory.items"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('starts the scan review guide only after review rows exist', async () => {
    const fixture = await renderComponent(AutomaticScanPage);
    const directive = () =>
      fixture.debugElement
        .query(By.directive(TutorialSurfaceDirective))
        ?.injector.get(TutorialSurfaceDirective);

    expect(directive()?.appTutorialSurface()).toBe('scans');
    expect(directive()?.ready()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-tour="scans.capture"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-tour="scans.review"]')).toHaveLength(1);

    fixture.componentInstance.kind.set('storage');
    fixture.detectChanges();
    expect(directive()?.appTutorialSurface()).toBe('scans-review');
    expect(directive()?.ready()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('[data-tour="scans.review"]')).toHaveLength(1);

    const scans = fixture.debugElement.query(By.directive(ScansPage))
      ?.componentInstance as ScansPage;
    scans.preview.set('data:image/png;base64,AA==');
    scans.cells.set([
      {
        id: 1,
        preview: 'data:image/png;base64,AA==',
        options: [],
        item: null,
        quantity: '1',
        quantityText: '1',
        quantityEstimate: null,
        quantityUncertain: false,
        include: true,
        reviewed: false,
        slot: '1',
        level: 0,
        caphras: 0,
      } as CellDraft,
    ]);
    fixture.detectChanges();
    expect(directive()?.ready()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-tour="scans-review.rows"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-tour="scans-review.save"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('maps family tabs to their own surface keys and keeps the tutorial launcher absent', async () => {
    const fixture = await renderComponent(PlayerPage);
    const page = fixture.componentInstance;
    const tutorial = () =>
      fixture.debugElement
        .query(By.directive(TutorialSurfaceDirective))
        ?.injector.get(TutorialSurfaceDirective);

    expect(tutorial()?.appTutorialSurface()).toBe('family-character');
    page.name = 'Aventureiro';
    page.create();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-tour="family-character.character"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-tour="family-character.lifeskills"]'),
    ).not.toBeNull();

    page.tab.set('family');
    fixture.detectChanges();
    expect(tutorial()?.appTutorialSurface()).toBe('family-family');
    expect(
      fixture.nativeElement.querySelector('[data-tour="family-family.characters"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-tour="family-family.actions"]'),
    ).not.toBeNull();

    page.tab.set('equipment');
    fixture.detectChanges();
    expect(tutorial()?.appTutorialSurface()).toBe('family-equipment');
    expect(
      fixture.nativeElement.querySelector('[data-tour="family-equipment.slots"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-tour="family-equipment.stats"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('maps each public Life Skills tab to a guide with its visible anchors', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const page = fixture.componentInstance;
    const tutorial = () =>
      fixture.debugElement
        .query(By.directive(TutorialSurfaceDirective))
        ?.injector.get(TutorialSurfaceDirective);

    for (const [tab, key, anchors] of [
      ['sessions', 'lifeskills-sessions', ['sessions', 'results']],
      ['mastery', 'lifeskills-mastery', ['profile', 'inputs']],
      ['training', 'lifeskills-training', ['plans', 'results']],
    ] as const) {
      page.tab.set(tab);
      fixture.detectChanges();
      expect(tutorial()?.appTutorialSurface()).toBe(key);
      for (const anchor of anchors)
        expect(
          fixture.nativeElement.querySelector(`[data-tour="${key}.${anchor}"]`),
        ).not.toBeNull();
    }
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('keeps both storage implementations launcher-free and registers their visible targets', async () => {
    const fixture = await renderComponent(StoragePage);
    const tutorial = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      ?.injector.get(TutorialSurfaceDirective);
    expect(tutorial?.appTutorialSurface()).toBe('storage');
    expect(fixture.nativeElement.querySelector('[data-tour="storage.items"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-tour="storage.projects"]')).toBeNull();
    fixture.componentInstance.tab.set('projects');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-tour="storage.items"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-tour="storage.projects"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('uses automatic recommendations onboarding after the private page data is ready', async () => {
    const fixture = await renderComponent(RecommendationsPage);
    const tutorial = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      ?.injector.get(TutorialSurfaceDirective);
    expect(tutorial?.appTutorialSurface()).toBe('recommendations');
    expect(tutorial?.ready()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });
});
