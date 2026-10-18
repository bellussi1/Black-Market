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
import type { CatalogItem, RoadmapEntry, RoadmapEntryKind, RoadmapLink } from '@bdo/shared';
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
import { PlayerOverview } from '../../shared/player-overview/player-overview';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { ROADMAP_ICONS } from '../roadmap/roadmap-icons';

export interface HomeFocusView {
  entry: RoadmapEntry;
  kindLabel: string;
  primaryLink: RoadmapLink | null;
  secondaryLinks: RoadmapLink[];
  requiresLoginToAccess: boolean;
  loginReturnUrl: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-page',
  imports: [
    HlmCard,
    HlmButton,
    NgIcon,
    RouterLink,
    PlayerOverview,
    CatalogItemPicker,
    TutorialSurfaceDirective,
  ],
  providers: [provideIcons(ROADMAP_ICONS)],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly roadmapApi = inject(RoadmapApiService);
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

  readonly roadmapEntries = signal<RoadmapEntry[]>([]);
  readonly roadmapLoading = signal(false);
  readonly roadmapError = signal('');
  readonly roadmapLoaded = signal(false);
  readonly homeFocuses = computed<HomeFocusView[]>(() => {
    const authenticated = this.identity.authenticated();
    return [...this.roadmapEntries()]
      .filter((entry) => entry.featured)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((entry) => {
        const allowedLinks = entry.links.filter(
          (link) => authenticated || !isLoginRequiredPath(link.path),
        );
        const requiresLoginToAccess =
          !authenticated && entry.links.length > 0 && allowedLinks.length === 0;
        const loginReturnUrl = requiresLoginToAccess
          ? safeInternalReturnUrl(entry.links[0]?.path ?? null)
          : null;
        return {
          entry,
          kindLabel: this.kindLabel(entry.kind),
          primaryLink: allowedLinks[0] ?? null,
          secondaryLinks: allowedLinks.slice(1),
          requiresLoginToAccess,
          loginReturnUrl,
        };
      });
  });

  ngOnInit() {
    this.loadRoadmap();
    if (this.browser) void this.identity.initialize().catch(() => undefined);
  }

  kindLabel(kind: RoadmapEntryKind): string {
    return kind === 'flow' ? $localize`Fase` : $localize`Pilar`;
  }

  loadRoadmap() {
    this.roadmapLoading.set(true);
    this.roadmapError.set('');
    this.roadmapApi
      .getPublic()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => this.roadmapLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.roadmapEntries.set(response.entries);
          this.roadmapLoaded.set(true);
        },
        error: () => {
          this.roadmapError.set(
            'Não foi possível carregar os focos do Roadmap agora. Tente novamente.',
          );
          this.roadmapLoaded.set(false);
        },
      });
  }
}
