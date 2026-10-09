import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CatalogApiService } from '../../core/catalog-api.service';
import { preferredDataLocale } from '../../core/locale';
import { WorkspaceStore } from '../../core/workspace-store';
export interface ItemSources {
  nodes: {
    id: string;
    name: string;
    territory: string | null;
    managerNode: string | null;
    contribution: number | null;
    position: number[] | null;
  }[];
  updatedAt: string | null;
}
@Injectable({ providedIn: 'root' })
export class RecipeKnowledge {
  private readonly catalog = inject(CatalogApiService);
  private readonly store = inject(WorkspaceStore);
  private readonly http = inject(HttpClient);
  private readonly items = new Map<string, ReturnType<CatalogApiService['getItem']>>();
  private readonly recipes = new Map<string, ReturnType<CatalogApiService['getItemRecipes']>>();
  private readonly origins = new Map<string, ReturnType<RecipeKnowledge['requestSources']>>();
  private key(id: number) {
    return `${this.store.data().region}/${preferredDataLocale()}/${id}`;
  }
  item(id: number) {
    const k = this.key(id);
    if (!this.items.has(k)) {
      if (this.items.size >= 300) this.items.clear();
      this.items.set(
        k,
        this.catalog.getItem(id).pipe(shareReplay({ bufferSize: 1, refCount: true })),
      );
    }
    return this.items.get(k)!;
  }
  produces(id: number) {
    const k = this.key(id);
    if (!this.recipes.has(k)) {
      if (this.recipes.size >= 300) this.recipes.clear();
      this.recipes.set(
        k,
        this.catalog
          .getItemRecipes(id, 'produces')
          .pipe(shareReplay({ bufferSize: 1, refCount: true })),
      );
    }
    return this.recipes.get(k)!;
  }
  private requestSources(id: number) {
    return this.http.get<ItemSources>(environment.apiBaseUrl + '/api/v1/world/item-sources/' + id, {
      params: { region: this.store.data().region, preferredLocale: preferredDataLocale() },
    });
  }
  sources(id: number) {
    const k = this.key(id);
    if (!this.origins.has(k)) {
      if (this.origins.size >= 300) this.origins.clear();
      this.origins.set(
        k,
        this.requestSources(id).pipe(shareReplay({ bufferSize: 1, refCount: true })),
      );
    }
    return this.origins.get(k)!;
  }
}
