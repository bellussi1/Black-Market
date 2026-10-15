import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TutorialPublicGuide, TutorialScreenKey } from '@bdo/shared';
import { finalize } from 'rxjs';

import { uiLocale } from '../../core/locale';
import { TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { LoadingSkeleton } from '../loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-tutorial-launcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSkeleton],
  templateUrl: './tutorial-launcher.html',
  styleUrl: './tutorial-launcher.scss',
})
export class TutorialLauncher implements OnInit {
  readonly screenKey = input.required<TutorialScreenKey>();

  private readonly api = inject(TutorialApiService);
  private readonly tutorial = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);

  readonly guide = signal<TutorialPublicGuide | null>(null);
  readonly loading = signal(false);
  readonly starting = signal(false);
  readonly requestFailed = signal(false);
  readonly needsUpdate = signal(false);
  readonly startFailed = signal(false);

  ngOnInit(): void {
    this.loadGuide();
  }

  loadGuide(): void {
    this.loading.set(true);
    this.requestFailed.set(false);
    this.needsUpdate.set(false);
    this.startFailed.set(false);

    this.api
      .getPublished(this.screenKey(), uiLocale())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ guide }) => this.guide.set(guide),
        error: () => {
          this.guide.set(null);
          this.requestFailed.set(true);
        },
      });
  }

  async start(launcher: HTMLButtonElement): Promise<void> {
    const guide = this.guide();
    if (!guide || this.loading() || this.starting()) return;

    this.needsUpdate.set(false);
    this.startFailed.set(false);
    this.starting.set(true);
    try {
      const result = await this.tutorial.startTour(guide, launcher);
      this.needsUpdate.set(result === 'needs-update');
      this.startFailed.set(result === 'unavailable');
    } catch {
      this.startFailed.set(true);
    } finally {
      this.starting.set(false);
    }
  }
}
