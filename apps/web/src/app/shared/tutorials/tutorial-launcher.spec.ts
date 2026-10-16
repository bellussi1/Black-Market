import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
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
  it('reserves an accessible loading state while the guide is fetched', async () => {
    const response = new Subject<{ guide: typeof guide | null }>();
    const fixture = await renderComponent(TutorialLauncher, { screenKey: 'market' }, [
      { provide: TutorialApiService, useValue: { getPublished: () => response } },
    ]);

    const loading = fixture.nativeElement.querySelector('.tutorial-loading');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelector('.tutorial-sr-only')).not.toBeNull();
    expect(loading?.textContent).toContain('Carregando tutorial');
    response.next({ guide });
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tutorial-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain(
      'Tutorial desta tela',
    );
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
  it('announces an in-progress tour launch while waiting for the runtime', async () => {
    let finishStart!: (message: string) => void;
    const startTour = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishStart = resolve;
        }),
    );
    const fixture = await renderComponent(TutorialLauncher, { screenKey: 'market' }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour } },
    ]);
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toContain('Iniciando tutorial');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Iniciando tutorial',
    );

    finishStart('');
    await fixture.whenStable();
  });
});
