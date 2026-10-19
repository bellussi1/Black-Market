import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, PLATFORM_ID, signal, untracked } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { isTutorialScreenKey, type TutorialScreenKey } from '@bdo/shared';
import { filter, Subject, takeUntil } from 'rxjs';

import { environment } from '../../environments/environment';
import { type Feature, featureOf } from './feature-area';
import { PrivacyService } from './privacy.service';
export { type Feature, featureOf } from './feature-area';
export type AnalyticsEvent =
  | 'page_viewed'
  | 'item_detail_opened'
  | 'journey_started'
  | 'journey_completed'
  | 'journey_failed';
export type TutorialAnalyticsEvent =
  | 'tutorial_started'
  | 'tutorial_completed'
  | 'tutorial_dismissed';
export interface EventProperties {
  feature: Feature;
  action?: 'search' | 'save' | 'import' | 'calculate' | 'sync' | 'read_print';
  status?: 'success' | 'failed';
  result?: 'matches' | 'no_matches';
}
export function cleanProperties(value: EventProperties) {
  return {
    feature:
      value.feature === 'legal'
        ? 'legal'
        : featureOf(
            '/' +
              (value.feature === 'home'
                ? ''
                : value.feature === 'catalog'
                  ? 'database/items'
                  : value.feature),
          ),
    ...(['search', 'save', 'import', 'calculate', 'sync', 'read_print'].includes(value.action ?? '')
      ? { action: value.action }
      : {}),
    ...(['success', 'failed'].includes(value.status ?? '') ? { status: value.status } : {}),
    ...(['matches', 'no_matches'].includes(value.result ?? '') ? { result: value.result } : {}),
  };
}
interface Config {
  enabled: boolean;
  key: string | null;
  host: string | null;
}
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly destroy = inject(DestroyRef);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly privacy = inject(PrivacyService);
  private readonly config = signal<Config | null>(null);
  private started = false;
  private id = '';
  private lastPage = '';
  private lastConsent = false;
  private events = 0;
  private readonly revoked = new Subject<void>();
  constructor() {
    this.privacy.changes.pipe(takeUntilDestroyed(this.destroy)).subscribe((choice) => {
      if (choice?.analytics !== true) this.disable();
    });
    effect(() => {
      const consent = this.privacy.allowsAnalytics(),
        config = this.config();
      untracked(() => {
        if (!consent) {
          this.disable();
          return;
        }
        if (config?.enabled && !this.lastConsent) {
          this.lastConsent = true;
          this.page(this.router.url);
        }
      });
    });
  }
  private disable() {
    this.revoked.next();
    this.privacy.clearAnalyticsIdentifier();
    this.id = '';
    this.lastPage = '';
    this.lastConsent = false;
  }
  start() {
    if (this.started || !this.browser || !environment.production) return;
    this.started = true;
    this.http
      .get<Config>(environment.apiBaseUrl + '/api/v1/analytics/config', { transferCache: false })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (config) => {
          this.config.set(config);
          this.privacy.optionalAvailable.set(Boolean(config.enabled && config.key && config.host));
          if (!config.enabled) this.disable();
        },
        error: () => this.config.set(null),
      });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((event) => this.page(event.urlAfterRedirects));
  }
  private page(url: string) {
    const page = featureOf(url);
    if (page === this.lastPage) return;
    if (this.capture('page_viewed', { feature: page })) this.lastPage = page;
  }
  captureTutorial(
    event: 'tutorial_started' | 'tutorial_completed' | 'tutorial_dismissed',
    screenKey: TutorialScreenKey,
    guideUpdatedAt: string,
  ): boolean {
    if (
      !['tutorial_started', 'tutorial_completed', 'tutorial_dismissed'].includes(event) ||
      !isTutorialScreenKey(screenKey) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(guideUpdatedAt) ||
      !Number.isFinite(Date.parse(guideUpdatedAt)) ||
      new Date(guideUpdatedAt).toISOString() !== guideUpdatedAt
    )
      return false;
    return this.send(event, { screenKey, guideUpdatedAt });
  }
  capture(event: AnalyticsEvent, properties: EventProperties): boolean {
    if (
      ![
        'page_viewed',
        'item_detail_opened',
        'journey_started',
        'journey_completed',
        'journey_failed',
      ].includes(event)
    )
      return false;
    return this.send(event, cleanProperties(properties));
  }
  private send(
    event: AnalyticsEvent | 'tutorial_started' | 'tutorial_completed' | 'tutorial_dismissed',
    properties:
      | ReturnType<typeof cleanProperties>
      | { screenKey: TutorialScreenKey; guideUpdatedAt: string },
  ): boolean {
    const config = this.config();
    if (
      !this.browser ||
      !environment.production ||
      !config?.enabled ||
      !config.key ||
      !config.host ||
      !this.privacy.allowsAnalytics() ||
      this.events >= 100
    )
      return false;
    if (!this.id) {
      this.id = this.privacy.ensureAnalyticsIdentifier() ?? '';
      if (!this.id) return false;
    }
    this.events++;
    this.http
      .post(
        config.host + '/i/v0/e/',
        {
          api_key: config.key,
          event,
          properties: {
            ...properties,
            distinct_id: this.id,
            $process_person_profile: false,
            $ip: null,
          },
        },
        { transferCache: false },
      )
      .pipe(takeUntil(this.revoked), takeUntilDestroyed(this.destroy))
      .subscribe({ error: () => undefined });
    return true;
  }
}
