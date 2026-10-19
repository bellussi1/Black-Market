import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { LifeskillsPage } from './lifeskills-page';

@Component({ template: '<p data-protected-route>Recommendations route</p>' })
class RecommendationsRouteStub {}

describe('lifeskill session analytics', () => {
  useMemoryStorage();

  it('links the shared hub to production and keeps the public sessions route active', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const links = Array.from(
      fixture.nativeElement.querySelectorAll(
        'nav[aria-label="Navegação de Life Skills e recomendações"] a',
      ),
    ) as HTMLAnchorElement[];

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/recommendations?tab=production',
      '/lifeskills?tab=sessions',
    ]);
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(links[1].getAttribute('aria-current')).toBe('page');
  });

  it('never exposes production data from the public Life Skills route', async () => {
    const params = new BehaviorSubject(convertToParamMap({ tab: 'production' }));
    const fixture = await renderComponent(LifeskillsPage, {}, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
    ]);
    const page = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(page.tab()).toBe('production');
    expect(element.textContent).toContain('Recomendações de produção exigem uma conta');
    expect(element.querySelector('a[href="/recommendations?tab=production"]')).not.toBeNull();
    expect(element.querySelector('[data-tour="lifeskills-sessions.sessions"]')).toBeNull();
    expect(element.textContent).not.toContain('Melhores retornos completos');
  });

  it.each(['mastery', 'training'] as const)(
    'preserves the %s legacy panel and workspace while making the session link primary',
    async (legacyTab) => {
      const params = new BehaviorSubject(convertToParamMap({ tab: legacyTab }));
      const fixture = await renderComponent(LifeskillsPage, {}, [
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ]);
      const page = fixture.componentInstance;
      const before = JSON.stringify(page.store.data());
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('[data-legacy-tool-notice]')).not.toBeNull();
      expect(element.querySelector('[data-tour="lifeskills-mastery.profile"]') !== null).toBe(
        legacyTab === 'mastery',
      );
      expect(element.querySelector('[data-tour="lifeskills-training.plans"]') !== null).toBe(
        legacyTab === 'training',
      );
      expect(JSON.stringify(page.store.data())).toBe(before);
      expect(element.querySelector('a[href="/lifeskills?tab=sessions"]')).not.toBeNull();
      expect(element.querySelector('nav a[aria-current="page"]')).toBeNull();
    },
  );

  it('returns to sessions when a legacy or invalid query is opened and keeps URL defaults stable', async () => {
    const params = new BehaviorSubject(convertToParamMap({ tab: 'mastery' }));
    const fixture = await renderComponent(LifeskillsPage, {}, [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
    ]);
    const page = fixture.componentInstance;

    params.next(convertToParamMap({ tab: 'unknown' }));
    fixture.detectChanges();
    expect(page.tab()).toBe('sessions');
    expect(
      fixture.nativeElement.querySelector('[data-tour="lifeskills-sessions.sessions"]'),
    ).not.toBeNull();

    params.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(page.tab()).toBe('sessions');
  });

  it('navigates between hub destinations and restores direct query state', async () => {
    await TestBed.configureTestingModule({
      imports: [LifeskillsPage, RecommendationsRouteStub],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'lifeskills', component: LifeskillsPage },
          { path: 'recommendations', component: RecommendationsRouteStub },
        ]),
        { provide: TutorialApiService, useValue: { getPublished: () => of({ guide: null }) } },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create('/lifeskills?tab=mastery');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/lifeskills?tab=mastery');

    harness
      .routeNativeElement!.querySelector<HTMLAnchorElement>('a[href="/lifeskills?tab=sessions"]')!
      .click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/lifeskills?tab=sessions');

    harness
      .routeNativeElement!.querySelector<HTMLAnchorElement>(
        'a[href="/recommendations?tab=production"]',
      )!
      .click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/recommendations?tab=production');
    expect(harness.routeNativeElement?.querySelector('[data-protected-route]')).not.toBeNull();

    const publicPage = await harness.navigateByUrl('/lifeskills?tab=sessions', LifeskillsPage);
    expect(router.url).toBe('/lifeskills?tab=sessions');
    expect(publicPage.tab()).toBe('sessions');
    const legacyPage = await harness.navigateByUrl('/lifeskills?tab=training', LifeskillsPage);
    await harness.fixture.whenStable();
    expect(router.url).toBe('/lifeskills?tab=training');
    expect(legacyPage.tab()).toBe('training');
  });

  it('compares saved observations by context and refreshes the sample after deletion', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const page = fixture.componentInstance;
    page.patch({
      name: 'Rota observada',
      skill: 'gathering',
      mode: 'active',
      mastery: 0,
      minutes: 30,
      directIncome: '100',
    });
    page.save();
    page.patch({ minutes: 90 });
    page.save();
    page.patch({
      mode: 'afk',
      name: 'Outra atividade',
      minutes: 60,
      directIncome: '0',
      cost: '20',
    });
    page.save();
    fixture.detectChanges();
    const comparison = () =>
      fixture.nativeElement.querySelector('[data-session-comparison]') as HTMLElement | null;
    expect(comparison()?.textContent).toContain('Rota observada');
    expect(comparison()?.textContent).toContain('120');
    expect(comparison()?.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(comparison()?.textContent).toContain('Outra atividade');
    expect(comparison()?.textContent).toContain('0');
    const row = page.sessions().find((session) => session.input.name === 'Outra atividade');
    page.removeSession(row!.id);
    fixture.detectChanges();
    expect(comparison()?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(comparison()?.textContent).not.toContain('Outra atividade');
    const cells = comparison()!.querySelectorAll('tbody td');
    expect(cells[0].textContent).toContain('2');
    expect(cells[3].textContent?.trim()).toBe('100');
    for (const session of [...page.sessions()]) page.removeSession(session.id);
    fixture.detectChanges();
    expect(comparison()).toBeNull();
  });

  it('shows unknown legacy context separately from zero mastery and updates with region', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const page = fixture.componentInstance;
    page.patch({ name: 'Legado' });
    page.save();
    page.patch({ name: 'Atual', mastery: 0, mode: 'active', skill: 'fishing' });
    page.save();
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('[data-session-comparison]').textContent;
    expect(text).toContain('Maestria não informada');
    expect(text).toContain('Modo não informado');
    expect(text).toContain('Maestria 0');
    expect(text).toContain('Pesca');
    page.store.update((state) => ({ ...state, region: 'eu' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-session-comparison]')).toBeNull();
  });

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
