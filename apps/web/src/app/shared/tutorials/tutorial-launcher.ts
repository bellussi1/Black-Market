import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { TutorialPublicGuide, TutorialScreenKey } from '@bdo/shared';

import { TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';

@Component({
  selector: 'app-tutorial-launcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tutorial-launcher.html',
  styleUrl: './tutorial-launcher.scss',
})
export class TutorialLauncher {
  readonly screenKey = input.required<TutorialScreenKey>();
  private readonly api = inject(TutorialApiService);
  private readonly runtime = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly guide = signal<TutorialPublicGuide | null>(null);
  readonly error = signal(false);
  readonly starting = signal(false);
  readonly message = signal('');
  constructor() {
    effect(() => {
      const key = this.screenKey();
      if (this.browser) this.load(key);
    });
  }
  load(key = this.screenKey()): void {
    this.error.set(false);
    this.api
      .getPublished(key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.guide.set(result.guide),
        error: () => this.error.set(true),
      });
  }
  async start(launcher: HTMLButtonElement): Promise<void> {
    const guide = this.guide();
    if (!guide || this.starting()) return;
    this.starting.set(true);
    this.message.set('');
    try {
      this.message.set(await this.runtime.startTour(guide, launcher));
    } catch {
      this.message.set($localize`Não foi possível abrir o tutorial. Tente novamente.`);
    } finally {
      this.starting.set(false);
    }
  }
}
