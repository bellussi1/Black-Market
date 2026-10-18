import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
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
import type {
  CatalogItem,
  MarketBoardItem,
  MarketItemQuote,
  MarketLookupResponse,
  TutorialScreenKey,
} from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import type { Subscription } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { uiLocale } from '../../core/locale';
import { MarketCacheService } from '../../core/market-cache.service';
import { RouteIntentPrefetchDirective } from '../../core/route-intent-prefetch.directive';
import { type Quote, quoteSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate, validationMessage } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { date, number, silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { PresetBar } from '../../shared/preset-bar';
import { TaxOptionsComponent } from '../../shared/tax-options';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { BdoSelect } from '../../ui/native-select/bdo-select';

type CalculationQuoteContext = {
  name: string;
  price: string;
  region: string;
  observedAt: string;
  stale: boolean;
};
import { MarketApi, type MarketHistoryPoint } from './market-api';
import { MarketBoard } from './market-board';
import { type HistoryMetric, historyObservations, marketChart } from './market-history';
import { MarketHistoryChart } from './market-history-chart';
import { MarketProduction } from './market-production';
import { MarketRefresh } from './market-refresh';

type MarketHistoryMetric = HistoryMetric;
type MarketHistoryRange = 'day' | 'week' | 'month';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-market-page',
  imports: [
    TutorialSurfaceDirective,
    HlmInput,
    HlmCard,
    HlmButton,
    BdoSelect,
    FormsModule,
    RouterLink,
    RouteIntentPrefetchDirective,
    TaxOptionsComponent,
    PresetBar,
    CalculationProof,
    CatalogItemPicker,
    ItemIcon,
    MarketBoard,
    MarketHistoryChart,
    MarketProduction,
  ],
  templateUrl: './market-page.html',
  styleUrl: './market-page.scss',
})
export class MarketPage implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    effect(() => {
      const active = this.workspaceView() === 'quote' && !!this.lookupId();
      untracked(() => this.refresh?.setActive(active));
    });
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (region === this.quoteRegion) return;
        this.quoteRegion = region;
        this.liveRequest?.unsubscribe();
        this.historyRequest?.unsubscribe();
        this.live.set(null);
        this.history.set([]);
        this.historyLoading.set(false);
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
  private readonly document = inject(DOCUMENT);
  readonly cache = inject(MarketCacheService);
  private lookupTimer?: ReturnType<typeof setTimeout>;
  private liveRequest?: Subscription;
  private itemRequest?: Subscription;
  private readonly refresh = isPlatformBrowser(inject(PLATFORM_ID))
    ? new MarketRefresh(inject(DOCUMENT), () => {
        if (!this.lookupLoading()) this.lookup(true);
      })
    : null;
  readonly lookupId = signal('');
  readonly workspaceView = signal<'board' | 'quote' | 'calculator' | 'saved'>('board');
  readonly tutorialSurface = computed<TutorialScreenKey>(() => {
    switch (this.workspaceView()) {
      case 'quote':
        return 'market-quote';
      case 'calculator':
        return 'market-calculator';
      case 'saved':
        return 'market-saved';
      default:
        return 'market';
    }
  });
  readonly lookupLoading = signal(false);
  readonly live = signal<MarketLookupResponse | null>(null);
  readonly lookupError = signal('');
  currentQuote(): MarketItemQuote | undefined {
    return this.live()?.items.find((item) => item.subId === this.historySubId);
  }
  showItemDetails(): void {
    this.showHistory(true);
    const chart = this.document.getElementById('market-history');
    chart?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    chart?.focus({ preventScroll: true });
  }

  onLookupIdChange(id: string): void {
    this.lookupId.set(id);
    if (/^[1-9]\d{0,9}$/.test(id)) {
      if (this.lookupTimer) clearTimeout(this.lookupTimer);
      this.lookupTimer = setTimeout(() => this.lookup(), 350);
    }
  }
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
  readonly historyLoading = signal(false);
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
      case 'volume':
        return $localize`Negociações registradas por intervalo`;
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
    const duration =
      this.historyRange() === 'day'
        ? 24 * 60 * 60_000
        : this.historyRange() === 'week'
          ? 7 * 24 * 60 * 60_000
          : 30 * 24 * 60 * 60_000;
    const observations = historyObservations(this.history(), this.historyMetric()).filter(
      (point) => Date.parse(point.fetchedAt) >= Date.now() - duration,
    );
    return marketChart(observations, this.historyMetric() === 'volume');
  });
  readonly historyValueLabel = (value: bigint): string =>
    new Intl.NumberFormat(uiLocale()).format(value);
  readonly intervalLabel = (minutes: number | undefined): string =>
    minutes === undefined ? '' : number(minutes, 1) + ' min';

  showHistory(preserve = false) {
    const id = Number(this.lookupId());
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      this.historyLoading.set(false);
      this.historyMessage.set('Escolha um item para consultar seu histórico.');
      return;
    }
    this.historyRequest?.unsubscribe();
    if (!preserve) this.history.set([]);
    this.historyMessage.set('Carregando histórico…');
    this.historyLoading.set(true);
    this.historyRequest = this.api
      .history(id, this.store.data().region, this.historySubId)
      .subscribe({
        next: (response) => {
          this.historyLoading.set(false);
          this.history.set(response.points);
          this.historyMessage.set(
            response.points.length
              ? ''
              : 'Ainda não há observações guardadas para este item e variante.',
          );
        },
        error: () => {
          this.historyLoading.set(false);
          this.historyMessage.set('Não foi possível carregar o histórico. Tente novamente.');
        },
      });
  }

  selectItem(item: CatalogItem | null, subId = 0): void {
    if (item) this.workspaceView.set('quote');
    this.liveRequest?.unsubscribe();
    this.live.set(null);
    this.lookupLoading.set(false);
    this.historyRequest?.unsubscribe();
    this.history.set([]);
    this.historyLoading.set(false);
    this.historyMessage.set('');
    this.historySubId = subId;
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
  selectBoardItem(item: MarketBoardItem): void {
    this.selectItem(
      {
        id: item.itemId,
        name: item.name,
        iconUrl: item.iconUrl,
        icon: null,
        categories: item.categories,
        category: item.categories[0]?.name ?? null,
        grade: null,
        weight: null,
        description: null,
      },
      item.quoteScope === 'summary' ? 0 : item.subId,
    );
  }
  netPrice(price: string | null): string | null {
    if (price === null) return null;
    const result = evaluate(() =>
      calculateMarket({
        ...this.form(),
        ...this.store.data().taxOptions,
        price,
        quantity: 1,
        cost: '0',
      }),
    );
    return result.value?.net ?? null;
  }
  tradeCount(value: string | null | undefined): string {
    if (value === null || value === undefined) return '—';
    try {
      return new Intl.NumberFormat(uiLocale()).format(BigInt(value));
    } catch {
      return '—';
    }
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
  readonly calculationContext = signal<CalculationQuoteContext | null>(null);
  readonly calculationQuote = computed(() => {
    const context = this.calculationContext();
    if (context) return context;
    const quote = this.selected();
    return quote
      ? {
          name: quote.name,
          price: quote.price,
          region: quote.region,
          observedAt: quote.observedAt,
          stale: false,
        }
      : null;
  });
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
    this.calculationContext.set(null);
    this.patch({ price: q.price });
    this.selectedId.set(q.id);
    this.workspaceView.set('calculator');
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
  lookup(preserve = false): void {
    if (!/^[1-9]\d{0,9}$/.test(this.lookupId()) || Number(this.lookupId()) > 2_000_000_000) {
      this.lookupError.set('Informe um ID de item válido.');
      return;
    }
    this.refresh?.markRefreshed();
    this.liveRequest?.unsubscribe();
    this.historyRequest?.unsubscribe();
    this.historyLoading.set(false);
    if (!preserve) {
      this.history.set([]);
      this.historyMessage.set('');
    }
    this.analytics.capture('journey_started', { feature: 'market', action: 'search' });
    this.lookupLoading.set(true);
    this.lookupError.set('');
    if (!preserve) this.live.set(null);
    this.liveRequest = this.api.getItem(this.lookupId(), this.store.data().region).subscribe({
      next: (response) => {
        this.refresh?.markRefreshed();
        this.analytics.capture('journey_completed', {
          feature: 'market',
          action: 'search',
          status: 'success',
        });
        this.live.set(response);
        this.cache.cacheLookupResponse(response, this.store.data().region);
        this.lookupLoading.set(false);
        if (!response.items.some((item) => item.subId === this.historySubId))
          this.historySubId = response.items[0]?.subId ?? 0;
        this.showHistory(preserve);
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
  canCalculateLive(item: MarketItemQuote): boolean {
    const response = this.live();
    return Boolean(
      response &&
      response.region === this.store.data().region &&
      item.price !== null &&
      /^[1-9]\d*$/.test(item.price),
    );
  }
  canSaveLive(item: MarketItemQuote): boolean {
    const response = this.live();
    return Boolean(this.canCalculateLive(item) && response && response.cacheStatus !== 'stale');
  }
  liveQuoteSaved(item: MarketItemQuote): boolean {
    const response = this.live();
    if (!response || item.price === null) return false;
    return this.store
      .data()
      .quotes.some(
        (quote) =>
          quote.region === response.region &&
          quote.itemId === item.itemId &&
          quote.subId === item.subId &&
          quote.observedAt === response.fetchedAt &&
          quote.price === item.price,
      );
  }
  calculateLive(item: MarketItemQuote): void {
    const response = this.live();
    if (!response || !this.canCalculateLive(item) || item.price === null) return;
    this.calculationContext.set({
      name: item.name + (item.subId ? ' · variante ' + item.subId : ''),
      price: item.price,
      region: response.region,
      observedAt: response.fetchedAt,
      stale: response.cacheStatus === 'stale',
    });
    this.selectedId.set('');
    this.patch({ price: item.price });
    this.workspaceView.set('calculator');
  }
  ngOnDestroy(): void {
    if (this.lookupTimer) clearTimeout(this.lookupTimer);
    this.refresh?.destroy();
    this.itemRequest?.unsubscribe();
    this.liveRequest?.unsubscribe();
    this.historyRequest?.unsubscribe();
  }
}
