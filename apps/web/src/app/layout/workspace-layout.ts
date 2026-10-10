import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';
import { filter } from 'rxjs';

import { ADVERTISING } from '../core/advertising';
import { visibleMarkets } from '../core/market-configuration';
import { isMvpPathEnabled, SCREENSHOT_MVP } from '../core/mvp-scope';
import { RegionPreferences } from '../core/region-preferences';
import { WorkspaceStore } from '../core/workspace-store';
import { AdSlot } from '../shared/ad-slot/ad-slot';
import { CatalogItemPicker } from '../shared/catalog-item-picker/catalog-item-picker';
import { PlatformFooter } from '../shared/platform-footer/platform-footer';
import { PrivacyControls } from '../shared/privacy-controls/privacy-controls';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-workspace-layout',

  imports: [
    RouterLink,

    RouterLinkActive,

    RouterOutlet,

    FormsModule,

    AdSlot,

    PrivacyControls,

    PlatformFooter,
    CatalogItemPicker,
  ],

  templateUrl: './workspace-layout.html',

  styleUrl: './workspace-layout.scss',
})
export class WorkspaceLayout {
  readonly quickSearchOpen = signal(false);
  openItem(item: CatalogItem | null) {
    if (!item) return;
    this.quickSearchOpen.set(false);
    void this.router.navigate(['/market/items', item.id]);
  }
  readonly screenshotMvp = SCREENSHOT_MVP;

  readonly store = inject(WorkspaceStore);

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
        '/family',

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

      .subscribe((event) => {
        this.path.set(event.urlAfterRedirects);

        this.mobileNavOpen.set(false);
        this.quickSearchOpen.set(false);
      });
  }

  readonly preferences = inject(RegionPreferences);

  readonly markets = computed(() => visibleMarkets(this.preferences.region()));

  readonly mobileNavOpen = signal(false);

  readonly primaryLinks = SCREENSHOT_MVP
    ? [
        { path: '/', label: 'Início' },
        { path: '/scans', label: 'Importar capturas' },
        { path: '/market', label: 'Mercado' },
        { path: '/recipes', label: 'Explorar receitas' },
        { path: '/storage', label: 'Armazém' },
        { path: '/family', label: 'Família' },
        { path: '/shopping', label: 'Lista de materiais' },
      ]
    : [
        { path: '/', label: $localize`Início` },

        { path: '/recommendations', label: $localize`Ganhar prata` },
      ].filter((link) => isMvpPathEnabled(link.path));

  readonly navGroups = [
    { title: 'Seus itens', links: [{ path: '/storage', label: 'Armazém' }] },

    {
      title: $localize`Mercado e produção`,

      links: [
        { path: '/recipes', label: $localize`Receitas` },

        { path: '/market', label: $localize`Consultar mercado` },

        { path: '/crafting', label: $localize`Calcular produção` },
      ],
    },

    {
      title: $localize`Personagem e evolução`,

      links: [
        { path: '/family', label: $localize`Família` },

        { path: '/enhancement', label: $localize`Aprimoramento e acúmulos` },

        { path: '/lifeskills', label: $localize`Profissões e rendimento` },

        { path: '/buffs', label: $localize`Buffs e combinações` },
      ],
    },

    {
      title: $localize`Materiais e planejamento`,

      links: [
        { path: '/storage', label: $localize`Armazém` },

        { path: '/scans', label: $localize`Importar por captura` },

        { path: '/world', label: $localize`Bases e trabalhadores` },

        { path: '/plans', label: $localize`Meus planos` },

        { path: '/rng', label: $localize`Caixas e vendedor noturno` },
      ],
    },

    {
      title: $localize`Guias e conta`,

      links: [
        { path: '/reference', label: $localize`Guia do mundo` },

        { path: '/account', label: $localize`Minha conta` },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => isMvpPathEnabled(link.path)),
    }))
    .filter((group) => !SCREENSHOT_MVP && group.links.length);

  readonly utilityLinks = [
    { path: '/termos', label: $localize`Termos de Uso` },

    { path: '/privacidade', label: $localize`Política de Privacidade` },

    { path: '/cookies', label: $localize`Cookies e armazenamento` },

    { path: '/contato', label: $localize`Contato e suporte` },
  ];

  readonly allLinks = [
    ...this.primaryLinks,

    ...this.navGroups.flatMap((group) => group.links),

    ...this.utilityLinks,
  ];

  readonly currentPage = computed(() => {
    const currentPath = this.path().split(/[?#]/, 1)[0];

    const link = this.allLinks.find(
      (candidate) =>
        currentPath === candidate.path ||
        (candidate.path !== '/' && currentPath.startsWith(`${candidate.path}/`)),
    );

    return link?.label ?? $localize`Black Market`;
  });

  groupIsActive(group: (typeof this.navGroups)[number]): boolean {
    const currentPath = this.path().split(/[?#]/, 1)[0];

    return group.links.some(
      (link) => currentPath === link.path || currentPath.startsWith(`${link.path}/`),
    );
  }
}
