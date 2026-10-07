import { Routes } from '@angular/router';
import { WorkspaceLayout } from './layout/workspace-layout';
export const routes: Routes = [
  {
    path: '',
    component: WorkspaceLayout,
    children: [
      {
        path: '',
        title: 'Black Market · Seu caderno de aventura',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'database/items',
        title: 'Black Market · Catálogo',
        loadComponent: () =>
          import('./features/catalog/item-catalog-page').then((m) => m.ItemCatalogPage),
      },
      {
        path: 'market',
        title: 'Black Market · Mercado',
        loadComponent: () => import('./features/market/market-page').then((m) => m.MarketPage),
      },
      {
        path: 'crafting',
        title: 'Black Market · Produção',
        loadComponent: () =>
          import('./features/crafting/crafting-page').then((m) => m.CraftingPage),
      },
      {
        path: 'enhancement',
        title: 'Black Market · Enhancement',
        loadComponent: () =>
          import('./features/enhancement/enhancement-page').then((m) => m.EnhancementPage),
      },
      {
        path: 'gear',
        title: 'Black Market · Gear',
        loadComponent: () => import('./features/gear/gear-page').then((m) => m.GearPage),
      },
      {
        path: 'lifeskills',
        title: 'Black Market · Life skills',
        loadComponent: () =>
          import('./features/lifeskills/lifeskills-page').then((m) => m.LifeskillsPage),
      },
      {
        path: 'storage',
        title: 'Black Market · Armazém',
        loadComponent: () => import('./features/storage/storage-page').then((m) => m.StoragePage),
      },
      {
        path: 'rng',
        title: 'Black Market · Caixas',
        loadComponent: () => import('./features/rng/rng-page').then((m) => m.RngPage),
      },
      {
        path: 'buffs',
        title: 'Black Market · Buffs',
        loadComponent: () => import('./features/buffs/buffs-page').then((m) => m.BuffsPage),
      },
      {
        path: 'settings',
        title: 'Black Market · Dados e backup',
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
