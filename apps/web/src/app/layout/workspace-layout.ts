import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ADVERTISING } from '../core/advertising';
import { visibleMarkets } from '../core/market-configuration';
import { PrivacyService } from '../core/privacy.service';
import { RegionPreferences } from '../core/region-preferences';
import { AdSlot } from '../shared/ad-slot/ad-slot';
import { PrivacyControls } from '../shared/privacy-controls/privacy-controls';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workspace-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule, AdSlot, PrivacyControls],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.scss',
})
export class WorkspaceLayout {
  readonly privacy = inject(PrivacyService);
  readonly year = new Date().getFullYear();
  private readonly router = inject(Router);
  private readonly path = signal(this.router.url);
  readonly showAds = computed(
    () =>
      ADVERTISING.previewSlots &&
      ![
        '/settings',
        '/storage',
        '/gear',
        '/profile',
        '/plans',
        '/account',
        '/scans',
        '/recommendations',
      ].some((route) => this.path().startsWith(route)),
  );
  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.path.set(event.urlAfterRedirects));
  }
  readonly preferences = inject(RegionPreferences);
  readonly markets = computed(() => visibleMarkets(this.preferences.region()));
  readonly links = [
    { path: '/recommendations', label: $localize`Ganhar prata`, code: '★' },
    { path: '/', label: $localize`Visão geral`, code: '00' },
    { path: '/database/items', label: $localize`Catálogo de itens`, code: '01' },
    { path: '/recipes', label: $localize`Receitas`, code: '◈' },
    { path: '/market', label: $localize`Mercado e imposto`, code: '02' },
    { path: '/crafting', label: $localize`Oficina de produção`, code: '03' },
    { path: '/enhancement', label: $localize`Aprimoramento e acúmulos (FS)`, code: '04' },
    { path: '/gear', label: $localize`Progressão de equipamentos`, code: '05' },
    { path: '/lifeskills', label: $localize`Profissões e treino`, code: '06' },
    { path: '/storage', label: $localize`Armazém e projetos`, code: '07' },
    { path: '/scans', label: $localize`Importar por print`, code: '▧' },
    { path: '/rng', label: $localize`Caixas e vendedor noturno`, code: '08' },
    { path: '/buffs', label: $localize`Buffs e combinações`, code: '09' },
    { path: '/settings', label: $localize`Dados e backup`, code: '10' },
    { path: '/reference', label: $localize`Guia do mundo`, code: '11' },
    { path: '/world', label: $localize`Bases e trabalhadores`, code: '↗' },
    { path: '/profile', label: $localize`Meu personagem`, code: '12' },
    { path: '/plans', label: $localize`Meus planos`, code: '13' },
    { path: '/account', label: $localize`Minha conta`, code: '14' },
  ];
}
