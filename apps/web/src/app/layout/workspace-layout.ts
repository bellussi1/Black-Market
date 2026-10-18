import { isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';
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
  lucideSettings,
  lucideSparkles,
  lucideStore,
  lucideUserRound,
  lucideUsersRound,
  lucideWarehouse,
  lucideX,
} from '@ng-icons/lucide';
import { filter } from 'rxjs';

import { ADVERTISING } from '../core/advertising';
import { isLoginRequiredPath } from '../core/auth.guard';
import { safeInternalReturnUrl } from '../core/auth-return-url';
import { IdentityService } from '../core/identity.service';
import { LoginDialog } from '../core/login-dialog';
import { LoginIntentService } from '../core/login-intent.service';
import { visibleMarkets } from '../core/market-configuration';
import { isMvpPathEnabled, SCREENSHOT_MVP } from '../core/mvp-scope';
import { PrivacyService } from '../core/privacy.service';
import { RegionPreferences } from '../core/region-preferences';
import { RouteIntentPrefetchDirective } from '../core/route-intent-prefetch.directive';
import type { WorkspaceStore } from '../core/workspace-store';
import { AdSlot } from '../shared/ad-slot/ad-slot';
import { CatalogItemPicker } from '../shared/catalog-item-picker/catalog-item-picker';
import { PlatformFooter } from '../shared/platform-footer/platform-footer';
import { PrivacyControls } from '../shared/privacy-controls/privacy-controls';

type NavigationLink = { path: string; label: string; icon?: string; requiresAuth?: boolean };
type NavigationGroup = { title: string; icon: string; links: NavigationLink[] };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-workspace-layout',

  imports: [
    NgIcon,
    RouterLink,

    RouterLinkActive,

    RouterOutlet,
    RouteIntentPrefetchDirective,

    AdSlot,

    PrivacyControls,

    PlatformFooter,
    CatalogItemPicker,
    LoginDialog,
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
      lucideSettings,
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
  private readonly searchTrigger = viewChild<ElementRef<HTMLButtonElement>>('searchTrigger');
  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  readonly skipHref = computed(() => {
    const currentUrl = this.path();
    const hashIndex = currentUrl.indexOf('#');
    const urlWithoutFragment = hashIndex >= 0 ? currentUrl.slice(0, hashIndex) : currentUrl;
    return `${urlWithoutFragment || '/'}#workspace-main`;
  });

  skipToContent(event: Event): void {
    event.preventDefault();
    const main = this.mainContent()?.nativeElement;
    if (!main) return;
    main.focus({ preventScroll: true });
    main.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }

  closeQuickSearch(): void {
    this.quickSearchOpen.set(false);
    this.searchTrigger()?.nativeElement.focus();
  }
  closeMobileNavigation(): void {
    this.mobileNavOpen.set(false);
    this.menuTrigger()?.nativeElement.focus();
  }
  openItem(item: CatalogItem | null) {
    if (!item) return;
    this.quickSearchOpen.set(false);
    void this.router.navigate(['/market/items', item.id]);
  }

  onMarketRegionChange(event: Event): void {
    this.preferences.setRegion((event.target as HTMLSelectElement).value);
  }

  readonly screenshotMvp = SCREENSHOT_MVP;

  readonly store = signal<WorkspaceStore | null>(null);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private sessionRequested = false;

  private readonly router = inject(Router);

  readonly identity = inject(IdentityService);
  readonly privacy = inject(PrivacyService);
  protected readonly loginIntent = inject(LoginIntentService);

  private readonly path = signal(this.router.url);
  readonly canShowPage = computed(
    () => !isLoginRequiredPath(this.path()) || this.identity.authenticated(),
  );

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
        '/lifeskills',

        '/account',

        '/scans',

        '/recommendations',
      ].some((route) => this.path().startsWith(route)),
  );

  constructor() {
    effect(() => {
      if (
        this.browser &&
        this.identity.ready() &&
        !this.identity.authenticated() &&
        isLoginRequiredPath(this.path())
      ) {
        this.loginIntent.request(this.path());
        void this.router.navigateByUrl('/', { replaceUrl: true });
      }
    });
    effect(() => {
      if (
        !this.browser ||
        this.sessionRequested ||
        (!this.identity.authenticated() && !this.path().startsWith('/demo'))
      )
        return;
      this.sessionRequested = true;
      void import('../core/workspace-store').then(({ WorkspaceStore }) => {
        if (this.destroyRef.destroyed) return;
        this.store.set(this.injector.get(WorkspaceStore));
      });
    });
    void this.identity.initialize().catch(() => undefined);
    this.router.events

      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),

        takeUntilDestroyed(),
      )

      .subscribe((event) => {
        this.path.set(event.urlAfterRedirects);

        if (this.browser) {
          const url = this.router.parseUrl(event.urlAfterRedirects);
          const requested = safeInternalReturnUrl(url.queryParams['loginReturnUrl'] ?? null);
          if (requested && url.root.children['primary'] === undefined) {
            this.loginIntent.request(requested);
            delete url.queryParams['loginReturnUrl'];
            void this.router.navigateByUrl(url, { replaceUrl: true });
          }
        }

        this.mobileNavOpen.set(false);
        this.quickSearchOpen.set(false);
      });
  }

  readonly preferences = inject(RegionPreferences);

  readonly markets = computed(() => visibleMarkets(this.preferences.region()));

  readonly mobileNavOpen = signal(false);

  private readonly primaryLinkOptions: NavigationLink[] = SCREENSHOT_MVP
    ? [
        { path: '/', label: 'Início', icon: 'lucideHouse' },
        { path: '/scans', label: 'Importar capturas', icon: 'lucideScanLine', requiresAuth: true },
        { path: '/market', label: 'Mercado', icon: 'lucideStore' },
        { path: '/recipes', label: 'Explorar receitas', icon: 'lucideBookOpenText' },
        { path: '/crafting', label: 'Calcular produção', icon: 'lucideHammer' },
        {
          path: '/recommendations',
          label: 'O que fazer',
          icon: 'lucideCompass',
          requiresAuth: true,
        },
        { path: '/storage', label: 'Armazém', icon: 'lucideWarehouse', requiresAuth: true },
        {
          path: '/lifeskills',
          label: $localize`Profissões e rendimento`,
          icon: 'lucidePickaxe',
          requiresAuth: true,
        },
        {
          path: '/family',
          label: 'Família',
          icon: 'lucideUsersRound',
          requiresAuth: true,
        },
        {
          path: '/shopping',
          label: 'Lista de materiais',
          icon: 'lucideListChecks',
          requiresAuth: true,
        },
        {
          path: '/plans',
          label: $localize`Meus planos`,
          icon: 'lucideListChecks',
          requiresAuth: true,
        },
        {
          path: '/settings',
          label: $localize`Configurações e backup`,
          icon: 'lucideSettings',
        },
        { path: '/roadmap', label: 'Roadmap', icon: 'lucideMap' },
      ]
    : [
        { path: '/', label: $localize`Início`, icon: 'lucideHouse' },

        {
          path: '/recommendations',
          label: $localize`Ganhar prata`,
          icon: 'lucideCompass',
          requiresAuth: true,
        },
      ].filter((link) => isMvpPathEnabled(link.path));

  readonly primaryLinks = computed(() => this.primaryLinkOptions);

  private readonly navGroupOptions: NavigationGroup[] = [
    {
      title: 'Seus itens',
      icon: 'lucideBoxes',
      links: [{ path: '/storage', label: 'Armazém', icon: 'lucideWarehouse', requiresAuth: true }],
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
        {
          path: '/family',
          label: $localize`Família`,
          icon: 'lucideUsersRound',
          requiresAuth: true,
        },

        {
          path: '/enhancement',
          label: $localize`Aprimoramento e acúmulos`,
          icon: 'lucideSparkles',
        },

        {
          path: '/lifeskills',
          label: $localize`Profissões e rendimento`,
          icon: 'lucidePickaxe',
          requiresAuth: true,
        },

        { path: '/buffs', label: $localize`Buffs e combinações`, icon: 'lucideFlaskConical' },
      ],
    },

    {
      title: $localize`Materiais e planejamento`,
      icon: 'lucideBoxes',

      links: [
        {
          path: '/storage',
          label: $localize`Armazém`,
          icon: 'lucideWarehouse',
          requiresAuth: true,
        },

        {
          path: '/scans',
          label: $localize`Importar por captura`,
          icon: 'lucideScanLine',
          requiresAuth: true,
        },

        {
          path: '/shopping',
          label: $localize`Lista de materiais`,
          icon: 'lucideListChecks',
          requiresAuth: true,
        },

        { path: '/world', label: $localize`Bases e trabalhadores`, icon: 'lucideMap' },

        {
          path: '/plans',
          label: $localize`Meus planos`,
          icon: 'lucideListChecks',
          requiresAuth: true,
        },

        { path: '/rng', label: $localize`Caixas e vendedor noturno`, icon: 'lucideDice5' },
      ],
    },

    {
      title: $localize`Guias e conta`,
      icon: 'lucideBookOpenText',

      links: [
        { path: '/reference', label: $localize`Guia do mundo`, icon: 'lucideBookOpenText' },

        {
          path: '/settings',
          label: $localize`Configurações e backup`,
          icon: 'lucideSettings',
        },

        { path: '/roadmap', label: $localize`Roadmap`, icon: 'lucideMap' },
      ],
    },
  ];

  readonly navGroups = computed(() =>
    this.navGroupOptions
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => isMvpPathEnabled(link.path)),
      }))
      .filter((group) => !SCREENSHOT_MVP && group.links.length),
  );

  readonly utilityLinks = [
    { path: '/termos', label: $localize`Termos de Uso` },

    { path: '/privacidade', label: $localize`Política de Privacidade` },

    { path: '/cookies', label: $localize`Cookies e armazenamento` },

    { path: '/contato', label: $localize`Contato e suporte` },
  ];

  readonly allLinks = computed(() => [
    ...this.primaryLinks(),
    ...this.navGroups().flatMap((group) => group.links),
    ...this.utilityLinks,
  ]);

  readonly currentPage = computed(() => {
    const currentPath = this.path().split(/[?#]/, 1)[0];

    const link = this.allLinks().find(
      (candidate) =>
        currentPath === candidate.path ||
        (candidate.path !== '/' && currentPath.startsWith(`${candidate.path}/`)),
    );

    return link?.label ?? $localize`Black Market`;
  });

  groupIsActive(group: NavigationGroup): boolean {
    const currentPath = this.path().split(/[?#]/, 1)[0];

    return group.links.some(
      (link) => currentPath === link.path || currentPath.startsWith(`${link.path}/`),
    );
  }
}
