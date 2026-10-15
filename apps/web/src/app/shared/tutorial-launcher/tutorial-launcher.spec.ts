import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { TutorialPublicGuide } from '@bdo/shared';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { TutorialLauncher } from './tutorial-launcher';

const guide: TutorialPublicGuide = {
  screenKey: 'market',
  locale: 'pt-BR',
  updatedAt: '2026-10-15T15:00:00.000Z',
  steps: [{ sortOrder: 0, anchorKey: null, title: 'Pesquisa', body: 'Digite um item.' }],
};

async function createFixture(api: Partial<TutorialApiService>) {
  const startTour = vi.fn().mockResolvedValue('started');
  await TestBed.configureTestingModule({
    imports: [TutorialLauncher],
    providers: [
      { provide: TutorialApiService, useValue: api },
      { provide: TutorialService, useValue: { startTour } },
    ],
  }).compileComponents();
  const fixture: ComponentFixture<TutorialLauncher> = TestBed.createComponent(TutorialLauncher);
  fixture.componentRef.setInput('screenKey', 'market');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, startTour };
}

describe('TutorialLauncher', () => {
  it('hides when no published guide exists', async () => {
    const { fixture } = await createFixture({ getPublished: () => of({ guide: null }) });

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('shows retry after a failed guide request without blocking the screen', async () => {
    const request = new Subject<{ guide: TutorialPublicGuide | null }>();
    const getPublished = vi.fn().mockReturnValueOnce(request).mockReturnValue(of({ guide }));
    const { fixture } = await createFixture({ getPublished });
    request.error(new Error('API indisponível'));
    fixture.detectChanges();

    const retry = fixture.nativeElement.querySelector('button');
    expect(retry?.textContent).toContain('Tentar novamente');
    retry?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getPublished).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain(
      'Tutorial desta tela',
    );
  });

  it('starts only after keyboard or pointer activation of the native launcher', async () => {
    const { fixture, startTour } = await createFixture({ getPublished: () => of({ guide }) });
    const launcher = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    expect(startTour).not.toHaveBeenCalled();
    expect(launcher?.tagName).toBe('BUTTON');

    launcher?.click();
    await fixture.whenStable();

    expect(startTour).toHaveBeenCalledTimes(1);
    expect(startTour.mock.calls[0]?.[0]).toEqual(guide);
    expect(startTour.mock.calls[0]?.[1]).toBe(launcher);
  });
});
