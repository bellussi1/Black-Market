import { HttpErrorResponse } from '@angular/common/http';
import type { OnDestroy, OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  CatalogCategory,
  CatalogItem,
  CatalogPage,
  CatalogRecipesResponse,
} from '@bdo/shared';
import type { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { RegionPreferences } from '../../core/region-preferences';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-item-catalog-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './item-catalog-page.html',
  styleUrl: './item-catalog-page.scss',
})
export class ItemCatalogPage implements OnInit, OnDestroy {
  private readonly api = inject(CatalogApiService);
  private readonly preferences = inject(RegionPreferences);
  private lastRegion = this.preferences.region();

  constructor() {
    effect(() => {
      const region = this.preferences.region();
      untracked(() => {
        if (region === this.lastRegion) return;
        this.lastRegion = region;
        this.closeItem();
        this.categoryId.set('');
        this.categories.set([]);
        this.page.set(1);
        this.loadCategories();
        this.loadItems();
      });
    });
  }
  private itemsRequest?: Subscription;
  private categoriesRequest?: Subscription;
  private detailRequest?: Subscription;
  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly pageSize = 48;
  readonly result = signal<CatalogPage | null>(null);
  readonly categories = signal<CatalogCategory[]>([]);
  readonly selectedItem = signal<CatalogItem | null>(null);
  readonly recipesProduced = signal<CatalogRecipesResponse | null>(null);
  readonly recipesUsed = signal<CatalogRecipesResponse | null>(null);
  readonly search = signal('');
  readonly categoryId = signal('');
  readonly grade = signal('');
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly categoryError = signal(false);
  readonly detailError = signal(false);
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.result()?.total ?? 0) / this.pageSize)),
  );
  readonly hasFilters = computed(() => Boolean(this.search() || this.categoryId() || this.grade()));

  readonly grades = [
    { value: 'white', label: 'Branco' },
    { value: 'green', label: 'Verde' },
    { value: 'blue', label: 'Azul' },
    { value: 'yellow', label: 'Amarelo' },
    { value: 'orange', label: 'Laranja' },
  ];

  ngOnInit(): void {
    this.loadCategories();
    this.loadItems();
  }

  ngOnDestroy(): void {
    this.itemsRequest?.unsubscribe();
    this.categoriesRequest?.unsubscribe();
    this.detailRequest?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value.trimStart());
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadItems();
    }, 240);
  }

  onCategory(event: Event): void {
    this.categoryId.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.loadItems();
  }

  onGrade(event: Event): void {
    this.grade.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.loadItems();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pageCount() || nextPage === this.page()) return;
    this.page.set(nextPage);
    this.loadItems();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    document.querySelector('.catalog-results')?.scrollIntoView({ behavior, block: 'start' });
  }

  openItem(item: CatalogItem): void {
    this.selectedItem.set(item);
    this.detailLoading.set(true);
    this.detailError.set(false);
    this.recipesProduced.set(null);
    this.recipesUsed.set(null);
    this.detailRequest?.unsubscribe();
    this.detailRequest = forkJoin({
      item: this.api.getItem(item.id),
      produced: this.api.getItemRecipes(item.id, 'produces'),
      used: this.api.getItemRecipes(item.id, 'uses'),
    }).subscribe({
      next: (response) => {
        this.selectedItem.set(response.item.item);
        this.recipesProduced.set(response.produced);
        this.recipesUsed.set(response.used);
      },
      error: () => {
        this.detailError.set(true);
        this.detailLoading.set(false);
      },
      complete: () => this.detailLoading.set(false),
    });
  }

  closeItem(): void {
    this.detailRequest?.unsubscribe();
    this.selectedItem.set(null);
    this.recipesProduced.set(null);
    this.recipesUsed.set(null);
    this.detailLoading.set(false);
    this.detailError.set(false);
  }

  resetFilters(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.search.set('');
    this.categoryId.set('');
    this.grade.set('');
    this.page.set(1);
    this.loadItems();
  }

  retry(): void {
    this.loadCategories();
    this.loadItems();
  }

  retryCategories(): void {
    this.loadCategories();
  }

  rangeEnd(total: number): number {
    return Math.min(this.page() * this.pageSize, total);
  }

  formatWeight(value: string | null): string {
    if (value === null) return 'Peso não informado';
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value))} LT`;
  }

  formatImportedAt(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  formatCount(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  visibleRecipeCount(total: number): number {
    return Math.min(4, total);
  }

  gradeLabel(value: string | null): string {
    return this.grades.find((grade) => grade.value === value)?.label ?? value ?? 'Sem grau';
  }

  private loadCategories(): void {
    this.categoriesRequest?.unsubscribe();
    this.categoryError.set(false);
    this.categoriesRequest = this.api.getCategories().subscribe({
      next: (response) => this.categories.set(response.categories),
      error: () => this.categoryError.set(true),
    });
  }

  private loadItems(): void {
    this.itemsRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.itemsRequest = this.api
      .getItems({
        q: this.search().trim(),
        categoryId: this.categoryId(),
        grade: this.grade(),
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => {
          this.error.set(this.errorMessage(error));
          this.loading.set(false);
        },
        complete: () => this.loading.set(false),
      });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'A API não respondeu. Confira se a API e o PostgreSQL estão iniciados.';
    }
    return 'Não foi possível carregar o catálogo agora. Tente novamente.';
  }
}
