import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { AnalyticsService } from './core/analytics.service';

describe('App', () => {
  const startAnalytics = vi.fn();
  beforeEach(async () => {
    startAnalytics.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: { start: startAnalytics } },
      ],
    }).compileComponents();
  });

  it('starts optional analytics after rendering the app', async () => {
    const fixture = TestBed.createComponent(App);
    expect(startAnalytics).not.toHaveBeenCalled();
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(startAnalytics).toHaveBeenCalledOnce());
  });

  it('does not start analytics if the root is destroyed while its module loads', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(startAnalytics).not.toHaveBeenCalled();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the root router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
