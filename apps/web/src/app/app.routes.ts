import { Routes } from '@angular/router';
import { DashboardPage } from './features/dashboard/dashboard-page';

export const routes: Routes = [
  { path: '', component: DashboardPage },
  {
    path: 'database/items',
    loadComponent: () =>
      import('./features/catalog/item-catalog-page').then((module) => module.ItemCatalogPage),
  },
  { path: '**', redirectTo: '' },
];
