import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { PlansPage } from './plans-page';

describe('PlansPage tutorial surface', () => {
  useMemoryStorage();

  it('shows collection and action anchors even when the user has no plans yet', async () => {
    const fixture = await renderComponent(PlansPage);
    const element = fixture.nativeElement as HTMLElement;
    const tutorial = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      ?.injector.get(TutorialSurfaceDirective);

    expect(tutorial?.appTutorialSurface()).toBe('plans');
    expect(element.querySelector('[data-tour="plans.collection"]')).not.toBeNull();
    expect(element.querySelector('[data-tour="plans.actions"]')).not.toBeNull();
    expect(element.querySelector('app-tutorial-launcher')).toBeNull();
  });
});
