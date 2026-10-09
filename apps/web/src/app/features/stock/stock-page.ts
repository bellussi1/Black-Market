import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';

import { CatalogApiService } from '../../core/catalog-api.service';
import type { Workspace } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { ItemIcon } from '../../shared/item-icon/item-icon';

type Stock = Workspace['inventory'][number];
@Component({
  selector: 'app-stock-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ItemIcon, CatalogItemPicker],
  templateUrl: './stock-page.html',
  styleUrl: './stock-page.scss',
})
export class StockPage {
  readonly store = inject(WorkspaceStore);
  readonly catalog = inject(CatalogApiService);
  readonly kind = inject(Router).url.split(/[?#]/)[0] === '/inventory' ? 'inventory' : 'storage';
  readonly search = signal('');
  readonly destination = signal('');
  readonly view = signal<'grid' | 'list'>('grid');
  readonly page = signal(0);
  readonly message = signal('');
  readonly items = signal(new Map<number, CatalogItem>());
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly stock = computed(() =>
    this.store
      .data()
      .inventory.filter(
        (row) => row.region === this.store.data().region && (row.kind ?? 'storage') === this.kind,
      ),
  );
  readonly locations = computed(() => [...new Set(this.stock().map((row) => row.location))].sort());
  readonly rows = computed(() =>
    this.stock().filter(
      (row) =>
        row.name.toLocaleLowerCase('pt-BR').includes(this.search().toLocaleLowerCase('pt-BR')) &&
        (!this.destination() ||
          (this.kind === 'inventory'
            ? row.characterId === this.destination()
            : row.location === this.destination())),
    ),
  );
  readonly visibleRows = computed(() =>
    this.rows().slice(this.page() * 48, (this.page() + 1) * 48),
  );
  readonly history = computed(() =>
    this.store
      .data()
      .screenshotImports.filter((row) => row.region === this.store.data().region)
      .slice(-10)
      .reverse(),
  );
  readonly previousPage = (page: number) => Math.max(0, page - 1);
  readonly nextPage = (page: number) => page + 1;
  draft: Stock | null = null;
  removed: Stock | null = null;
  constructor() {
    effect((cleanup) => {
      const ids = [
        ...new Set(
          this.visibleRows()
            .map((row) => row.itemId)
            .filter((id): id is number => Boolean(id)),
        ),
      ];
      if (!ids.length) {
        this.items.set(new Map());
        return;
      }
      const sub = this.catalog.getItems({ ids, page: 1, pageSize: 100 }).subscribe({
        next: (result) => this.items.set(new Map(result.items.map((item) => [item.id, item]))),
        error: () =>
          this.message.set('As imagens não puderam ser carregadas. Seus itens continuam salvos.'),
      });
      cleanup(() => sub.unsubscribe());
    });
  }
  newItem() {
    this.draft = {
      id: crypto.randomUUID(),
      region: this.store.data().region,
      name: '',
      kind: this.kind,
      characterId:
        this.kind === 'inventory' ? this.destination() || this.profiles()[0]?.id : undefined,
      location: this.kind === 'storage' ? this.destination() || 'Velia' : '',
      quantity: 0,
      target: 0,
      price: '0',
    };
  }
  edit(row: Stock) {
    this.draft = structuredClone(row);
  }
  remove(row: Stock) {
    if (
      this.store.update((state) => ({
        ...state,
        inventory: state.inventory.filter((entry) => entry.id !== row.id),
      }))
    ) {
      this.removed = structuredClone(row);
      this.message.set('Item removido. Você pode desfazer nesta página.');
    } else
      this.message.set(
        'Este item não pôde ser removido. Verifique se ele está reservado em um plano.',
      );
  }
  undoRemove() {
    const row = this.removed;
    if (!row) return;
    if (
      this.store
        .data()
        .inventory.some(
          (entry) =>
            entry.id === row.id ||
            (entry.region === row.region &&
              entry.itemId === row.itemId &&
              entry.location === row.location &&
              (entry.kind ?? 'storage') === (row.kind ?? 'storage') &&
              entry.characterId === row.characterId),
        )
    ) {
      this.message.set('O item já foi recriado. Confira o registro existente antes de restaurar.');
      return;
    }
    if (this.store.update((state) => ({ ...state, inventory: [...state.inventory, row] }))) {
      this.removed = null;
      this.message.set('Item restaurado.');
    }
  }
  choose(item: CatalogItem | null) {
    if (this.draft) this.draft = { ...this.draft, itemId: item?.id, name: item?.name ?? '' };
  }
  save() {
    const draft = this.draft;
    if (!draft?.itemId) {
      this.message.set('Selecione um item do catálogo.');
      return;
    }
    const profile = this.profiles().find((row) => row.id === draft.characterId);
    if (this.kind === 'inventory' && !profile) {
      this.message.set('Selecione o personagem do inventário.');
      return;
    }
    const location = this.kind === 'inventory' ? profile!.name : draft.location.trim();
    if (
      !location ||
      !Number.isSafeInteger(draft.quantity) ||
      draft.quantity < 0 ||
      draft.quantity > 1e9
    ) {
      this.message.set('Confira o local e uma quantidade inteira entre zero e um bilhão.');
      return;
    }
    const duplicate = this.stock().some(
      (row) =>
        row.id !== draft.id &&
        row.itemId === draft.itemId &&
        (this.kind === 'inventory'
          ? row.characterId === draft.characterId
          : row.location.toLocaleLowerCase('pt-BR') === location.toLocaleLowerCase('pt-BR')),
    );
    if (duplicate) {
      this.message.set(
        'Este item já está neste local. Edite o registro existente para atualizar a quantidade.',
      );
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        inventory: [
          ...state.inventory.filter((row) => row.id !== draft.id),
          {
            ...draft,
            kind: this.kind,
            region: state.region,
            location,
            updatedAt: new Date().toISOString(),
            sources: undefined,
          },
        ],
      }))
    ) {
      this.draft = null;
      this.message.set('Item atualizado.');
    } else
      this.message.set(
        'Não foi possível salvar. Confira seus dados e o espaço disponível no navegador.',
      );
  }
  resetPage() {
    this.page.set(0);
  }
  date(value?: string) {
    return value ? new Date(value).toLocaleString('pt-BR') : 'Ainda sem data registrada';
  }
  modeLabel(mode: string) {
    return (
      (
        {
          reviewed: 'Itens revisados atualizados',
          merge: 'Itens novos acrescentados',
          replace: 'Local completo substituído',
          gear: 'Equipamentos atualizados',
        } as Record<string, string>
      )[mode] ?? mode
    );
  }
}
