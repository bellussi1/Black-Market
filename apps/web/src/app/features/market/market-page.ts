import type { HttpErrorResponse } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  calculateMarket,
  defaultTax,
  type MarketInput,
  marketSchema,
  type TaxOptions,
} from '@bdo/calculators';
import type { CatalogItem, MarketItemQuote, MarketLookupResponse } from '@bdo/shared';
import type { Subscription } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { uiLocale } from '../../core/locale';
import { type Quote, quoteSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate, validationMessage } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { date, number, silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { PresetBar } from '../../shared/preset-bar';
import { TaxOptionsComponent } from '../../shared/tax-options';
import { MarketApi, type MarketHistoryPoint } from './market-api';

type MarketHistoryMetric = 'price' | 'stock' | 'totalTrades';
type MarketHistoryRange = 'day' | 'week' | 'month';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-market-page',
  imports: [
    FormsModule,
    RouterLink,
    TaxOptionsComponent,
    PresetBar,
    CalculationProof,
    CatalogItemPicker,
    ItemIcon,
  ],
  templateUrl: './market-page.html',
})
export class MarketPage implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (region === this.quoteRegion) return;
        this.quoteRegion = region;
        this.liveRequest?.unsubscribe();
        this.live.set(null);
        this.history.set([]);
        this.lookupLoading.set(false);
        if (this.lookupId()) this.lookup();
      });
    });
    const catalog = inject(CatalogApiService);
    inject(ActivatedRoute, { optional: true })
      ?.queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = Number(params.get('item'));
        if (Number.isInteger(id) && id > 0 && id <= 2147483647) {
          this.liveRequest?.unsubscribe();
          this.itemRequest?.unsubscribe();
          this.itemRequest = catalog.getItem(id).subscribe({
            next: (result) => this.selectItem(result.item),
            error: () => this.lookupError.set('Não encontramos este item na região selecionada.'),
          });
        }
      });
  }
  private readonly api = inject(MarketApi);
  private readonly catalog = inject(CatalogApiService);
  private liveRequest?: Subscription;
  private itemRequest?: Subscription;
  readonly lookupId = signal('');
  readonly lookupLoading = signal(false);
  readonly live = signal<MarketLookupResponse | null>(null);
  readonly lookupError = signal('');
  readonly store = inject(WorkspaceStore);
  private quoteRegion = this.store.data().region;
  readonly form = signal<MarketInput>({
    ...defaultTax,
    ...this.store.data().taxOptions,
    price: '0',
    quantity: 1,
    cost: '0',
  });
  readonly priceView = signal<'gross' | 'net'>('gross');
  readonly quoteIcon = computed(() =>
    this.catalogItem() ? this.catalog.resolveIconUrl(this.catalogItem()!) : null,
  );
  readonly result = computed(() => evaluate(() => calculateMarket(this.form())));
  search = '';
  category = '';
  favoritesOnly = false;
  sort = 'name';
  draft = { name: '', category: '', price: '0', stock: 0, itemId: null as number | null };
  readonly catalogItem = signal<CatalogItem | null>(null);
  readonly history = signal<MarketHistoryPoint[]>([]);
  readonly historyMessage = signal('');
  private historyRequest?: Subscription;
  historySubId = 0;
  readonly historyMetric = signal<MarketHistoryMetric>('price');
  readonly historyRange = signal<MarketHistoryRange>('week');
  readonly historyMetricLabel = computed(() => {
    switch (this.historyMetric()) {
      case 'price':
        return $localize`Preço de venda`;
      case 'stock':
        return $localize`Estoque disponível`;
      case 'totalTrades':
        return $localize`Contador de transações`;
    }
  });
  readonly historySeries = computed(() => {
    const points = this.history();
    const now = Date.now();
    const duration =
      this.historyRange() === 'day'
        ? 24 * 60 * 60 * 1000
        : this.historyRange() === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(now)) return [];
    return points.filter((point) => {
      const observedAt = Date.parse(point.fetchedAt);
      return Number.isFinite(observedAt) && observedAt >= now - duration;
    });
  });
  readonly historyChart = computed(() => {
    const points = this.historySeries()
      .map((point) => ({ point, value: this.historyValue(point) }))
      .filter(
        (entry): entry is { point: MarketHistoryPoint; value: bigint } => entry.value !== null,
      );
    if (points.length < 2)
      return {
        points: '',
        min: '—',
        max: '—',
        samples: points.length,
        startAt: '',
        endAt: '',
      };

    const values = points.map((entry) => entry.value);
    const min = values.reduce((a, b) => (a < b ? a : b));
    const max = values.reduce((a, b) => (a > b ? a : b));
    const firstAt = Date.parse(points[0].point.fetchedAt);
    const lastAt = Date.parse(points.at(-1)!.point.fetchedAt);
    const timeSpan = Math.max(lastAt - firstAt, 1);
    const coords = points.map(({ point, value }) => {
      const elapsed = Date.parse(point.fetchedAt) - firstAt;
      const x = 44 + Math.round((elapsed / timeSpan) * 640);
      const relative = max === min ? 0.5 : Number(((value - min) * 1000n) / (max - min)) / 1000;
      const y = 176 - Math.round(relative * 136);
      return `${x},${y}`;
    });
    return {
      points: coords.join(' '),
      min: this.historyValueLabel(min),
      max: this.historyValueLabel(max),
      samples: points.length,
      startAt: points[0].point.fetchedAt,
      endAt: points.at(-1)!.point.fetchedAt,
    };
  });

  private historyValue(point: MarketHistoryPoint): bigint | null {
    const raw =
      this.historyMetric() === 'price'
        ? point.price
        : this.historyMetric() === 'totalTrades'
          ? point.totalTrades
          : point.stock === null
            ? null
            : String(point.stock);
    return raw !== null && raw !== undefined && /^\d{1,24}$/.test(raw) ? BigInt(raw) : null;
  }

  private historyValueLabel(value: bigint): string {
    return new Intl.NumberFormat(uiLocale()).format(value);
  }

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
    this.liveRequest?.unsubscribe();
    this.live.set(null);
    this.lookupLoading.set(false);
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
    if (item) this.lookup();
  }
  netPrice(price: string | null): string | null {
    if (price === null) return null;
    const result = evaluate(() =>
      calculateMarket({ ...this.form(), price, quantity: 1, cost: '0' }),
    );
    return result.value?.net ?? null;
  }
  setTaxes(value: MarketInput | TaxOptions) {
    this.patch(value);
    const parsed = marketSchema.safeParse(this.form());
    if (!parsed.success) return;
    const { taxPercent, valuePack, collectionBonus, exempt } = parsed.data;
    this.store.update((state) => ({
      ...state,
      taxOptions: { taxPercent, valuePack, collectionBonus, exempt },
    }));
  }
  setValuePack(valuePack: boolean) {
    this.setTaxes({ ...this.form(), valuePack });
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
    this.itemRequest?.unsubscribe();
    this.liveRequest?.unsubscribe();
    this.historyRequest?.unsubscribe();
  }
}
