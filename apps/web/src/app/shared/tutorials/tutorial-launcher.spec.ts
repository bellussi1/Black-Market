import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { TutorialLauncher } from './tutorial-launcher';
const guide = {
  screenKey: 'market' as const,
  locale: 'pt-BR' as const,
  updatedAt: '2026-10-15T12:00:00.000Z',
  steps: [{ sortOrder: 0, anchorKey: null, title: 'Título', body: 'Texto' }],
};
describe('TutorialLauncher', () => {
  useMemoryStorage();
  it('hides when no published guide exists', async () => {
    const fixture = await renderComponent(TutorialLauncher, { screenKey: 'market' }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide: null }) } },
    ]);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
  it('shows retry after a failed guide request without blocking the screen', async () => {
    const getPublished = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error()))
      .mockReturnValue(of({ guide }));
    const fixture = await renderComponent(TutorialLauncher, { screenKey: 'market' }, [
      { provide: TutorialApiService, useValue: { getPublished } },
    ]);
    expect(fixture.nativeElement.textContent).toContain('indisponível');
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tutorial desta tela');
  });
  it('starts only after keyboard or pointer activation', async () => {
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialLauncher, { screenKey: 'market' }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour } },
    ]);
    expect(startTour).not.toHaveBeenCalled();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('button');
    button.click();
    await fixture.whenStable();
    expect(startTour).toHaveBeenCalledWith(guide, button);
    expect(TestBed.inject(TutorialService)).toBeDefined();
  });
});
