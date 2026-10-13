import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpenText,
  lucideBoxes,
  lucideChartNoAxesCombined,
  lucideChevronDown,
  lucideCompass,
  lucideDice5,
  lucideFlaskConical,
  lucideHammer,
  lucideHouse,
  lucideListChecks,
  lucideMap,
  lucideMenu,
  lucidePickaxe,
  lucideScanLine,
  lucideSparkles,
  lucideStore,
  lucideUserRound,
  lucideUsersRound,
  lucideWarehouse,
  lucideX,
} from '@ng-icons/lucide';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
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
import { BdoSelect } from '../ui/native-select/bdo-select';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-workspace-layout',

  imports: [
    NgIcon,
    HlmButton,
    BdoSelect,
    RouterLink,

    RouterLinkActive,

    RouterOutlet,

    FormsModule,

    AdSlot,

    PrivacyControls,

    PlatformFooter,
    CatalogItemPicker,
  ],

  providers: [
    provideIcons({
      lucideBookOpenText,
      lucideBoxes,
      lucideChartNoAxesCombined,
      lucideChevronDown,
      lucideCompass,
      lucideDice5,
      lucideFlaskConical,
      lucideHammer,
      lucideHouse,
      lucideListChecks,
      lucideMap,
      lucideMenu,
      lucidePickaxe,
      lucideScanLine,
      lucideSparkles,
      lucideStore,
      lucideUserRound,
      lucideUsersRound,
      lucideWarehouse,
      lucideX,
    }),
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
        { path: '/', label: 'Início', icon: 'lucideHouse' },
        { path: '/scans', label: 'Importar capturas', icon: 'lucideScanLine' },
        { path: '/market', label: 'Mercado', icon: 'lucideStore' },
        { path: '/recipes', label: 'Explorar receitas', icon: 'lucideBookOpenText' },
        { path: '/recommendations', label: 'O que fazer', icon: 'lucideCompass' },
        { path: '/storage', label: 'Armazém', icon: 'lucideWarehouse' },
        { path: '/family', label: 'Família', icon: 'lucideUsersRound' },
        { path: '/shopping', label: 'Lista de materiais', icon: 'lucideListChecks' },
      ]
    : [
        { path: '/', label: $localize`Início`, icon: 'lucideHouse' },

        { path: '/recommendations', label: $localize`Ganhar prata`, icon: 'lucideCompass' },
      ].filter((link) => isMvpPathEnabled(link.path));

  readonly navGroups = [
    {
      title: 'Seus itens',
      icon: 'lucideBoxes',
      links: [{ path: '/storage', label: 'Armazém', icon: 'lucideWarehouse' }],
    },

    {
      title: $localize`Mercado e produção`,
      icon: 'lucideStore',

      links: [
        { path: '/recipes', label: $localize`Receitas`, icon: 'lucideBookOpenText' },

        { path: '/market', label: $localize`Consultar mercado`, icon: 'lucideChartNoAxesCombined' },

        { path: '/crafting', label: $localize`Calcular produção`, icon: 'lucideHammer' },
      ],
    },

    {
      title: $localize`Personagem e evolução`,
      icon: 'lucideUsersRound',

      links: [
        { path: '/family', label: $localize`Família`, icon: 'lucideUsersRound' },

        {
          path: '/enhancement',
          label: $localize`Aprimoramento e acúmulos`,
          icon: 'lucideSparkles',
        },

        { path: '/lifeskills', label: $localize`Profissões e rendimento`, icon: 'lucidePickaxe' },

        { path: '/buffs', label: $localize`Buffs e combinações`, icon: 'lucideFlaskConical' },
      ],
    },

    {
      title: $localize`Materiais e planejamento`,
      icon: 'lucideBoxes',

      links: [
        { path: '/storage', label: $localize`Armazém`, icon: 'lucideWarehouse' },

        { path: '/scans', label: $localize`Importar por captura`, icon: 'lucideScanLine' },

        { path: '/world', label: $localize`Bases e trabalhadores`, icon: 'lucideMap' },

        { path: '/plans', label: $localize`Meus planos`, icon: 'lucideListChecks' },

        { path: '/rng', label: $localize`Caixas e vendedor noturno`, icon: 'lucideDice5' },
      ],
    },

    {
      title: $localize`Guias e conta`,
      icon: 'lucideBookOpenText',

      links: [
        { path: '/reference', label: $localize`Guia do mundo`, icon: 'lucideBookOpenText' },

        { path: '/account', label: $localize`Minha conta`, icon: 'lucideUserRound' },
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
