import { isPlatformBrowser } from '@angular/common';
import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { RoadmapEntry, RoadmapEntryKind } from '@bdo/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { finalize } from 'rxjs';

import { isLoginRequiredPath } from '../../core/auth.guard';
import { IdentityService } from '../../core/identity.service';
import { RoadmapApiService } from '../../core/roadmap-api.service';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { ROADMAP_ICONS } from './roadmap-icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-roadmap-page',
  imports: [NgIcon, RouterLink, TutorialSurfaceDirective],
  providers: [provideIcons(ROADMAP_ICONS)],
  templateUrl: './roadmap-page.html',
  styleUrl: './roadmap-page.scss',
})
export class RoadmapPage implements OnInit {
  private readonly api = inject(RoadmapApiService);
  readonly identity = inject(IdentityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly entries = signal<RoadmapEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly loaded = signal(false);
  readonly trailEntries = computed(() =>
    [...this.entries()]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((entry) => ({
        ...entry,
        kindLabel: this.kindLabel(entry.kind),
        links: entry.links.filter(
          (link) => this.identity.authenticated() || !isLoginRequiredPath(link.path),
        ),
      })),
  );

  ngOnInit() {
    this.load();
    if (this.browser) void this.identity.initialize().catch(() => undefined);
  }

  kindLabel(kind: RoadmapEntryKind): string {
    return kind === 'flow' ? $localize`Fase` : $localize`Pilar`;
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.entries.set(response.entries);
          this.loaded.set(true);
        },
        error: () => {
          this.error.set('Não foi possível carregar o Roadmap agora. Tente novamente.');
          this.loaded.set(false);
        },
      });
  }
}
