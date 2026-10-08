import type { HttpErrorResponse } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { calculateMarket, defaultTax, type MarketInput, marketSchema } from '@bdo/calculators';
import type { CatalogItem, MarketItemQuote, MarketLookupResponse } from '@bdo/shared';
import type { Subscription } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { type Quote, quoteSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate, validationMessage } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { date, number, silver } from '../../shared/formatters';
import { PresetBar } from '../../shared/preset-bar';
import { TaxOptionsComponent } from '../../shared/tax-options';
import { MarketApi } from './market-api';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-market-page',
  imports: [FormsModule, TaxOptionsComponent, PresetBar, CalculationProof, CatalogItemPicker],
  templateUrl: './market-page.html',
})
export class MarketPage implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    const catalog = inject(CatalogApiService);
    inject(ActivatedRoute, { optional: true })
      ?.queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = Number(params.get('item'));
        if (Number.isInteger(id) && id > 0 && id <= 2147483647) {
          this.liveRequest?.unsubscribe();
          this.liveRequest = catalog.getItem(id).subscribe({
            next: (result) => this.selectItem(result.item),
            error: () => this.lookupError.set('Não encontramos este item na região selecionada.'),
          });
        }
      });
  }
  private readonly api = inject(MarketApi);
  private liveRequest?: Subscription;
  readonly lookupId = signal('');
  readonly lookupLoading = signal(false);
  readonly live = signal<MarketLookupResponse | null>(null);
  readonly lookupError = signal('');
  readonly store = inject(WorkspaceStore);
  readonly form = signal<MarketInput>({ ...defaultTax, price: '0', quantity: 1, cost: '0' });
  readonly result = computed(() => evaluate(() => calculateMarket(this.form())));
  search = '';
  category = '';
  favoritesOnly = false;
  sort = 'name';
  draft = { name: '', category: '', price: '0', stock: 0, itemId: null as number | null };
  readonly catalogItem = signal<CatalogItem | null>(null);
  readonly history = signal<{ fetchedAt: string; price: string | null; stock: number | null }[]>(
    [],
  );
  readonly historyMessage = signal('');
  private historyRequest?: Subscription;
  historySubId = 0;
  showHistory() {
    const id = Number(this.lookupId());
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      this.historyMessage.set('Escolha um item para consultar seu histórico.');
      return;
    }
    this.historyRequest?.unsubscribe();
    this.history.set([]);
    this.historyMessage.set('Carregando histórico…');
    this.historyRequest = this.api
      .history(id, this.store.data().region, this.historySubId)
      .subscribe({
        next: (response) => {
          this.history.set(response.points);
          this.historyMessage.set(
            response.points.length
              ? ''
              : 'Ainda não há observações guardadas para este item e variante.',
          );
        },
        error: () =>
          this.historyMessage.set('Não foi possível carregar o histórico. Tente novamente.'),
      });
  }

  selectItem(item: CatalogItem | null): void {
    this.historyRequest?.unsubscribe();
    this.history.set([]);
    this.historyMessage.set('');
    this.historySubId = 0;
    this.catalogItem.set(item);
    this.lookupId.set(item ? String(item.id) : '');
    this.draft = {
      ...this.draft,
      name: item?.name || '',
      category: item ? item.categories[0]?.name || item.category || $localize`Sem categoria` : '',
      itemId: item?.id ?? null,
    };
  }
  readonly selectedId = signal('');
  readonly error = signal('');
  readonly selected = computed(() =>
    this.store.data().quotes.find((q) => q.id === this.selectedId()),
  );
  readonly silver = silver;
  readonly number = number;
  readonly date = date;
  patch(value: Partial<MarketInput>): void {
    this.form.update((s) => ({ ...s, ...value }));
  }
  load(input: unknown): void {
    this.form.set(marketSchema.parse(input));
  }
  get quotes(): Quote[] {
    const rows = this.store
      .data()
      .quotes.filter(
        (q) =>
          q.region === this.store.data().region &&
          q.name.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()) &&
          (!this.category || q.category === this.category) &&
          (!this.favoritesOnly || q.favorite),
      );
    return rows.sort((a, b) =>
      this.sort === 'price'
        ? BigInt(a.price) < BigInt(b.price)
          ? -1
          : BigInt(a.price) > BigInt(b.price)
            ? 1
            : 0
        : a.name.localeCompare(b.name),
    );
  }
  get categories(): string[] {
    return [
      ...new Set(
        this.store
          .data()
          .quotes.filter((q) => q.region === this.store.data().region)
          .map((q) => q.category),
      ),
    ].sort();
  }
  saveQuote(): void {
    this.error.set('');
    const now = new Date().toISOString();
    const existing = this.store
      .data()
      .quotes.find(
        (q) =>
          q.region === this.store.data().region &&
          (q.itemId && this.draft.itemId
            ? q.itemId === this.draft.itemId
            : q.name.toLocaleLowerCase() === this.draft.name.trim().toLocaleLowerCase()),
      );
    const parsed = quoteSchema.safeParse({
      ...this.draft,
      id: existing?.id ?? crypto.randomUUID(),
      region: this.store.data().region,
      favorite: existing?.favorite ?? false,
      observedAt: now,
      history: [
        ...(existing?.history ?? []),
        { price: this.draft.price, stock: this.draft.stock, observedAt: now },
      ].slice(-120),
    });
    if (!parsed.success) {
      this.error.set(validationMessage(parsed.error));
      return;
    }
    if (
      this.store.update((s) => ({
        ...s,
        quotes: [...s.quotes.filter((q) => q.id !== parsed.data.id), parsed.data],
      }))
    ) {
      this.selectedId.set(parsed.data.id);
      this.draft = { name: '', category: '', price: '0', stock: 0, itemId: null };
    }
  }
  toggle(q: Quote): void {
    this.store.update((s) => ({
      ...s,
      quotes: s.quotes.map((row) => (row.id === q.id ? { ...row, favorite: !row.favorite } : row)),
    }));
  }
  remove(id: string): void {
    this.store.update((s) => ({ ...s, quotes: s.quotes.filter((q) => q.id !== id) }));
    if (this.selectedId() === id) this.selectedId.set('');
  }
  use(q: Quote): void {
    this.patch({ price: q.price });
    this.selectedId.set(q.id);
  }
  points(q: Quote): string {
    const values = q.history.map((r) => BigInt(r.price));
    const min = values.reduce((a, b) => (a < b ? a : b), values[0] ?? 0n);
    const max = values.reduce((a, b) => (a > b ? a : b), values[0] ?? 0n);
    return values
      .map(
        (v, index) =>
          (values.length === 1 ? 500 : (index * 1000) / (values.length - 1)) +
          ',' +
          (max === min ? 80 : 145 - Number(((v - min) * 130n) / (max - min))),
      )
      .join(' ');
  }
  lookup(): void {
    if (!/^[1-9]\d{0,9}$/.test(this.lookupId()) || Number(this.lookupId()) > 2_000_000_000) {
      this.lookupError.set('Informe um ID de item válido.');
      return;
    }
    this.liveRequest?.unsubscribe();
    this.analytics.capture('journey_started', { feature: 'market', action: 'search' });
    this.lookupLoading.set(true);
    this.lookupError.set('');
    this.live.set(null);
    this.liveRequest = this.api.getItem(this.lookupId(), this.store.data().region).subscribe({
      next: (response) => {
        this.analytics.capture('journey_completed', {
          feature: 'market',
          action: 'search',
          status: 'success',
        });
        this.live.set(response);
        this.lookupLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.analytics.capture('journey_failed', {
          feature: 'market',
          action: 'search',
          status: 'failed',
        });
        this.lookupLoading.set(false);
        this.lookupError.set(
          error.status === 429
            ? 'Você fez várias consultas em pouco tempo. Aguarde um momento e tente novamente.'
            : error.status === 404
              ? 'Não encontramos uma cotação para este item no mercado selecionado.'
              : 'Não foi possível consultar os preços agora. Tente novamente mais tarde.',
        );
      },
    });
  }
  saveLive(item: MarketItemQuote): void {
    const response = this.live();
    if (
      !response ||
      item.price === null ||
      response.cacheStatus === 'stale' ||
      response.region !== this.store.data().region
    )
      return;
    const held = this.store
      .data()
      .quotes.find(
        (q) => q.region === response.region && q.itemId === item.itemId && q.subId === item.subId,
      );
    const snapshot = {
      price: item.price,
      stock: item.stock,
      observedAt: response.fetchedAt,
      source: 'arsha' as const,
    };
    const history = held?.history.some(
      (h) => h.observedAt === snapshot.observedAt && h.price === snapshot.price,
    )
      ? held.history
      : [...(held?.history ?? []), snapshot].slice(-120);
    const parsed = quoteSchema.safeParse({
      id: held?.id ?? crypto.randomUUID(),
      name: item.name + (item.subId ? ' · variante ' + item.subId : ''),
      region: response.region,
      category:
        this.catalogItem()?.id === item.itemId
          ? this.draft.category || $localize`Sem categoria`
          : held?.category || $localize`Sem categoria`,
      source: 'arsha',
      nameLocale: response.locale ?? null,
      itemId: item.itemId,
      subId: item.subId,
      price: item.price,
      stock: item.stock,
      observedAt: response.fetchedAt,
      favorite: held?.favorite ?? false,
      history,
    });
    if (!parsed.success) {
      this.lookupError.set(validationMessage(parsed.error));
      return;
    }
    this.store.update((s) => ({
      ...s,
      quotes: [...s.quotes.filter((q) => q.id !== parsed.data.id), parsed.data],
    }));
    this.patch({ price: item.price });
    this.selectedId.set(parsed.data.id);
  }
  ngOnDestroy(): void {
    this.liveRequest?.unsubscribe();
    this.historyRequest?.unsubscribe();
  }
}
