import type { Routes } from '@angular/router';

import { mvpRouteGuard, SCREENSHOT_MVP } from './core/mvp-scope';
import { WorkspaceLayout } from './layout/workspace-layout';

export const routes: Routes = [
  {
    path: '',

    component: WorkspaceLayout,

    children: [
      {
        path: 'inventory',
        title: 'Black Market � Inventário',
        data: { private: true },
        loadComponent: () => import('./features/stock/stock-page').then((m) => m.StockPage),
      },

      {
        path: 'demo',
        title: $localize`Black Market · Demonstração`,
        data: { private: true },
        loadComponent: () => import('./features/demo/demo-page').then((m) => m.DemoPage),
      },

      ...[
        { path: 'termos', legal: 'terms', title: 'Termos de Uso' },

        { path: 'privacidade', legal: 'privacy', title: 'Política de Privacidade' },

        { path: 'cookies', legal: 'cookies', title: 'Cookies' },

        { path: 'contato', legal: 'contact', title: 'Contato' },
      ].map((page) => ({
        path: page.path,

        title: 'Black Market · ' + page.title,

        data: { legal: page.legal },

        loadComponent: () =>
          import('./features/legal/legal-page').then((module) => module.LegalPage),
      })),

      {
        path: 'scans',

        title: $localize`Black Market · Importar por print`,

        data: { private: true },

        loadComponent: () =>
          import('./features/scans/scans-page').then((module) => module.ScansPage),
      },

      {
        path: 'recipes/items/:id',
        title: $localize`Black Market · Explorar produção e obtenção`,
        loadComponent: () =>
          import('./features/recipes/recipes-page').then((module) => module.RecipesPage),
      },
      {
        path: 'recipes/:key',

        title: $localize`Black Market · Receita`,

        loadComponent: () =>
          import('./features/recipes/recipes-page').then((module) => module.RecipesPage),
      },

      {
        path: 'recipes',

        title: $localize`Black Market · Receitas`,

        loadComponent: () =>
          import('./features/recipes/recipes-page').then((module) => module.RecipesPage),
      },

      {
        path: 'database/items/:id',

        title: $localize`Black Market · Item`,

        loadComponent: () =>
          import('./features/catalog/item-detail-page').then((module) => module.ItemDetailPage),
      },

      {
        path: 'world',

        title: $localize`Black Market · Bases e trabalhadores`,

        loadComponent: () =>
          import('./features/world/world-page').then((module) => module.WorldPage),
      },

      {
        path: 'recommendations',

        title: $localize`Black Market · Ganhar prata`,

        data: { private: true },

        loadComponent: () =>
          import('./features/recommendations/recommendations-page').then(
            (module) => module.RecommendationsPage,
          ),
      },

      {
        path: 'account',

        title: $localize`Black Market · Minha conta`,

        data: { private: true },

        loadComponent: () =>
          import('./features/account/account-page').then((module) => module.AccountPage),
      },

      {
        path: 'profile',

        title: $localize`Black Market · Meu personagem`,

        data: { private: true },

        loadComponent: () =>
          SCREENSHOT_MVP
            ? import('./features/player/player-page').then((m) => m.PlayerPage)
            : import('./features/profile/profile-page').then((module) => module.ProfilePage),
      },

      {
        path: 'shopping',
        title: 'Black Market · Lista de materiais',
        data: { private: true },
        loadComponent: () =>
          import('./features/shopping/shopping-page').then((m) => m.ShoppingPage),
      },
      {
        path: 'plans',

        title: $localize`Black Market · Meus planos`,

        data: { private: true },

        loadComponent: () =>
          import('./features/plans/plans-page').then((module) => module.PlansPage),
      },

      {
        path: 'reference/:kind/:id',

        title: $localize`Black Market · Referência`,

        loadComponent: () =>
          import('./features/reference/reference-page').then((module) => module.ReferencePage),
      },

      {
        path: 'reference/:kind',

        title: $localize`Black Market · Referências`,

        loadComponent: () =>
          import('./features/reference/reference-page').then((module) => module.ReferencePage),
      },

      { path: 'reference', redirectTo: 'reference/npcs', pathMatch: 'full' as const },

      {
        path: '',

        title: $localize`Black Market · Seu planejador de Black Desert`,

        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },

      {
        path: 'database/items',

        title: $localize`Black Market · Catálogo`,

        loadComponent: () =>
          import('./features/catalog/item-catalog-page').then((m) => m.ItemCatalogPage),
      },

      {
        path: 'market',

        title: $localize`Black Market · Mercado`,

        loadComponent: () => import('./features/market/market-page').then((m) => m.MarketPage),
      },

      {
        path: 'crafting',

        title: $localize`Black Market · Produção`,

        loadComponent: () =>
          import('./features/crafting/crafting-page').then((m) => m.CraftingPage),
      },

      {
        path: 'enhancement',

        title: $localize`Black Market · Aprimoramento`,

        loadComponent: () =>
          import('./features/enhancement/enhancement-page').then((m) => m.EnhancementPage),
      },

      {
        path: 'gear',

        title: $localize`Black Market · Equipamentos`,

        data: { private: true },

        loadComponent: () =>
          SCREENSHOT_MVP
            ? import('./features/gear/gear-inventory-page').then((m) => m.GearInventoryPage)
            : import('./features/gear/gear-page').then((m) => m.GearPage),
      },

      {
        path: 'lifeskills',

        title: $localize`Black Market · Profissões`,

        loadComponent: () =>
          import('./features/lifeskills/lifeskills-page').then((m) => m.LifeskillsPage),
      },

      {
        path: 'storage',

        title: $localize`Black Market · Armazém`,

        data: { private: true },

        loadComponent: () =>
          SCREENSHOT_MVP
            ? import('./features/stock/stock-page').then((m) => m.StockPage)
            : import('./features/storage/storage-page').then((m) => m.StoragePage),
      },

      {
        path: 'rng',

        title: $localize`Black Market · Caixas`,

        loadComponent: () => import('./features/rng/rng-page').then((m) => m.RngPage),
      },

      {
        path: 'buffs',

        title: $localize`Black Market · Buffs`,

        loadComponent: () => import('./features/buffs/buffs-page').then((m) => m.BuffsPage),
      },

      {
        path: 'settings',

        title: $localize`Black Market · Dados e backup`,

        data: { private: true },

        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },

      {
        path: '**',

        title: $localize`Black Market · Página não encontrada`,

        data: { noindex: true },

        loadComponent: () =>
          import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
    ].map((route) => ('redirectTo' in route ? route : { ...route, canMatch: [mvpRouteGuard] })),
  },
];
