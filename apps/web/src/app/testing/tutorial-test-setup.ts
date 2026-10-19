import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { isTutorialAnchorForScreen, type TutorialScreenKey } from '@bdo/shared';
import { of } from 'rxjs';
import { beforeEach, expect } from 'vitest';

import { TutorialApiService } from '../core/tutorial-api.service';
import { TutorialSurfaceDirective } from '../shared/tutorials/tutorial-surface.directive';

/** Keep page contracts independent of publication and HTTP guide loading. */
export function useTutorialGuideStub(): void {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TutorialApiService, useValue: { getPublished: () => of({ guide: null }) } },
      ],
    });
  });
}

export function expectTutorialAnchors<T>(
  fixture: ComponentFixture<T>,
  screenKey: TutorialScreenKey,
  expected: string[],
): void {
  const surfaces = fixture.debugElement.queryAll(By.directive(TutorialSurfaceDirective));
  expect(surfaces).toHaveLength(1);
  expect(
    (
      surfaces[0].injector.get(TutorialSurfaceDirective) as TutorialSurfaceDirective
    ).appTutorialSurface(),
  ).toBe(screenKey);
  const element = fixture.nativeElement as HTMLElement;
  expect(element.querySelector('app-tutorial-launcher')).toBeNull();
  const anchors = [...element.querySelectorAll<HTMLElement>('[data-tour]')];
  for (const anchor of anchors) {
    expect(isTutorialAnchorForScreen(screenKey, anchor.dataset['tour'] ?? '')).toBe(true);
  }
  const visible = anchors.filter((anchor) => !anchor.closest('[hidden]'));
  expect(visible.map((anchor) => anchor.dataset['tour']).sort()).toEqual([...expected].sort());
  expect(new Set(visible.map((anchor) => anchor.dataset['tour'])).size).toBe(visible.length);
}
