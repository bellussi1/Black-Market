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
import type { CatalogItem, RoadmapEntry } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { finalize } from 'rxjs';

import { isLoginRequiredPath } from '../../core/auth.guard';
import { safeInternalReturnUrl } from '../../core/auth-return-url';
import { IdentityService } from '../../core/identity.service';
import { isMvpPathEnabled, SCREENSHOT_MVP } from '../../core/mvp-scope';
import { RegionPreferences } from '../../core/region-preferences';
import { RoadmapApiService } from '../../core/roadmap-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { LoadingSkeleton } from '../../shared/loading-skeleton/loading-skeleton';
import { PlayerOverview } from '../../shared/player-overview/player-overview';
import { ROADMAP_ICONS } from '../roadmap/roadmap-icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-page',
  imports: [
    HlmCard,
    HlmButton,
    RouterLink,
    NgIcon,
    PlayerOverview,
    CatalogItemPicker,
    LoadingSkeleton,
  ],
  providers: [provideIcons(ROADMAP_ICONS)],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly api = inject(RoadmapApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly selectedItem = signal<CatalogItem | null>(null);
  readonly screenshotMvp = SCREENSHOT_MVP;
  readonly isEnabled = isMvpPathEnabled;
  readonly store = inject(WorkspaceStore);
  readonly identity = inject(IdentityService);
  readonly preferences = inject(RegionPreferences);
  readonly counts = this.preferences.counts;
  readonly hasWorkspaceData = computed(() =>
    this.counts().some((stat) => stat.value > 0 && isMvpPathEnabled(stat.path)),
  );
  readonly canOpenPath = (path: string) =>
    this.identity.authenticated() || !isLoginRequiredPath(path);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly loaded = signal(false);
  readonly entries = signal<RoadmapEntry[]>([]);
  readonly homeFocuses = computed(() =>
    this.entries()
      .filter((entry) => entry.featured === true)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((entry) => {
        const links = entry.links.filter((link) => this.canOpenPath(link.path));
        const requiresLogin = entry.links.length > 0 && links.length === 0;
        return {
          entry,
          links,
          requiresLogin,
          returnUrl: requiresLogin ? safeInternalReturnUrl(entry.links[0]?.path ?? null) : null,
        };
      }),
  );

  ngOnInit() {
    this.load();
    if (this.browser) void this.identity.initialize().catch(() => undefined);
  }

  load() {
    if (this.loading() && this.loaded()) return;
    this.loading.set(true);
    this.error.set('');
    // Keep previously loaded focus cards visible while a refresh is in flight.
    this.api
      .getPublic()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.entries.set(response.entries);
          this.loaded.set(true);
        },
        error: () => {
          this.error.set('Não foi possível carregar os focos atuais. Tente novamente.');
        },
      });
  }
}
