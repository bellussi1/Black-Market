import type { Routes } from '@angular/router';

import { WorkspaceLayout } from './layout/workspace-layout';
export const routes: Routes = [
  {
    path: '',
    component: WorkspaceLayout,
    children: [
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
        loadComponent: () => import('./features/gear/gear-page').then((m) => m.GearPage),
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
        loadComponent: () => import('./features/storage/storage-page').then((m) => m.StoragePage),
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
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
