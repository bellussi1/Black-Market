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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import type { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import type { StorageCsvRow } from '../../core/storage-csv';
import { parseStorageCsv, StorageCsvError } from '../../core/storage-csv';
import { type Workspace, workspaceSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { validationMessage } from '../../shared/calculation-feedback';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { download } from '../../shared/download';
import { number, silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { TutorialLauncher } from '../../shared/tutorial-launcher/tutorial-launcher';
import { BdoSelect } from '../../ui/native-select/bdo-select';
type Stock = Workspace['inventory'][number];
type Project = Workspace['projects'][number];
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storage-page',
  imports: [
    TutorialLauncher,
    HlmInput,
    HlmCard,
    HlmButton,
    BdoSelect,
    FormsModule,
    RouterLink,
    CatalogItemPicker,
    ItemIcon,
  ],
  templateUrl: './storage-page.html',
})
export class StoragePage implements OnDestroy {
  readonly catalogApi = inject(CatalogApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly catalog = inject(CatalogApiService);
  private importRequest?: Subscription;
  private importGeneration = 0;
  private lastRegion = '';
  readonly importRows = signal<(StorageCsvRow & { name: string })[]>([]);
  readonly importLoading = signal(false);
  readonly importMessage = signal('');
  readonly importRegion = signal('');
  readonly importConfirmed = signal(false);
  readonly importPage = signal(0);
  constructor() {
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (this.lastRegion && region !== this.lastRegion) this.cancelImport();
        this.lastRegion = region;
      });
    });
  }

  downloadImportTemplate(): void {
    download(
      'black-market-armazem-modelo.csv',
      '\uFEFFitemId;quantidade;local;meta;preco\n',
      'text/csv;charset=utf-8',
    );
  }
  confirmImport(event: Event): void {
    this.importConfirmed.set((event.target as HTMLInputElement).checked);
  }

  cancelImport(): void {
    this.importGeneration += 1;
    this.importRequest?.unsubscribe();
    this.importRows.set([]);
    this.importLoading.set(false);
    this.importConfirmed.set(false);
    this.importPage.set(0);
  }

  async readImport(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.cancelImport();
    this.importMessage.set('');
    if (!file) return;
    const generation = this.importGeneration;
    const region = this.store.data().region;
    this.analytics.capture('journey_started', { feature: 'storage', action: 'import' });
    this.importRegion.set(region);
    this.importLoading.set(true);
    try {
      if (file.size > 200_000) throw new StorageCsvError($localize`O CSV aceita até 200 KB.`);
      const rows = parseStorageCsv(await file.text());
      if (generation !== this.importGeneration) return;
      const ids = [...new Set(rows.map((row) => row.itemId))];
      const batches = [];
      for (let index = 0; index < ids.length; index += 100) {
        batches.push(
          this.catalog.getItems({ ids: ids.slice(index, index + 100), page: 1, pageSize: 100 }),
        );
      }
      this.importRequest = forkJoin(batches).subscribe({
        next: (responses) => {
          if (generation !== this.importGeneration || region !== this.store.data().region) return;
          const items = new Map(
            responses.flatMap((response) => response.items).map((item) => [item.id, item]),
          );
          const missing = ids.filter((id) => !items.has(id));
          if (missing.length) {
            this.analytics.capture('journey_failed', {
              feature: 'storage',
              action: 'import',
              status: 'failed',
            });
            this.importMessage.set(
              $localize`Itens ausentes no catálogo desta região: ${missing.slice(0, 10).join(', ')}. Nenhum dado foi importado.`,
            );
          } else {
            this.importRows.set(rows.map((row) => ({ ...row, name: items.get(row.itemId)!.name })));
          }
          this.importLoading.set(false);
        },
        error: () => {
          this.analytics.capture('journey_failed', {
            feature: 'storage',
            action: 'import',
            status: 'failed',
          });
          this.importMessage.set(
            $localize`O catálogo não respondeu. Tente carregar o CSV novamente.`,
          );
          this.importLoading.set(false);
        },
      });
    } catch (error) {
      if (generation !== this.importGeneration) return;
      this.analytics.capture('journey_failed', {
        feature: 'storage',
        action: 'import',
        status: 'failed',
      });
      this.importMessage.set(
        error instanceof StorageCsvError
          ? error.message
          : $localize`Não foi possível abrir a planilha. Escolha o arquivo novamente.`,
      );
      this.importLoading.set(false);
    }
  }

  applyImport(): void {
    if (
      !this.importConfirmed() ||
      !this.importRows().length ||
      this.importRegion() !== this.store.data().region
    )
      return;
    const region = this.store.data().region;
    const ambiguous = this.importRows().find((row) => {
      const samePlace = this.allStock().filter(
        (entry) =>
          entry.location.toLocaleLowerCase('pt-BR') === row.location.toLocaleLowerCase('pt-BR'),
      );
      return (
        samePlace.filter((entry) => entry.itemId === row.itemId).length > 1 ||
        samePlace.some(
          (entry) =>
            !entry.itemId &&
            entry.name.toLocaleLowerCase('pt-BR') === row.name.toLocaleLowerCase('pt-BR'),
        )
      );
    });
    if (ambiguous) {
      this.importMessage.set(
        $localize`Revise o registro de ${ambiguous.name} em ${ambiguous.location}. Associe o item antigo ao catálogo e consolide duplicados antes de importar.`,
      );
      return;
    }
    const saved = this.store.update((state) => {
      const inventory = [...state.inventory];
      for (const row of this.importRows()) {
        const index = inventory.findIndex(
          (entry) =>
            entry.region === region &&
            entry.itemId === row.itemId &&
            entry.location.toLocaleLowerCase('pt-BR') === row.location.toLocaleLowerCase('pt-BR'),
        );
        const existing = index >= 0 ? inventory[index] : undefined;
        const entry: Stock = {
          id: existing?.id || crypto.randomUUID(),
          region,
          itemId: row.itemId,
          name: row.name,
          location: row.location,
          quantity: row.quantity,
          target: row.target ?? existing?.target ?? 0,
          price: row.price ?? existing?.price ?? '0',
        };
        if (index >= 0) inventory[index] = entry;
        else inventory.push(entry);
      }
      return { ...state, inventory };
    });
    if (saved) {
      this.analytics.capture('journey_completed', {
        feature: 'storage',
        action: 'import',
        status: 'success',
      });
      this.cancelImport();
      this.importMessage.set(
        $localize`Importação concluída. Itens fora das linhas importadas foram mantidos.`,
      );
    }
  }

  ngOnDestroy(): void {
    this.cancelImport();
  }
  readonly store = inject(WorkspaceStore);
  readonly tab = signal('stock');
  readonly viewMode = signal<'grid' | 'table'>('table');
  search = '';
  location = '';
  draft: Stock = this.newStock();
  project: Project = this.newProject();
  readonly selectedProject = signal('');
  readonly error = signal('');
  readonly silver = silver;
  readonly number = number;
  resolveIcon(row: Stock): string | null {
    return row.itemId ? `${environment.apiBaseUrl}/api/v1/items/${row.itemId}/icon` : null;
  }
  selectStock(item: CatalogItem | null): void {
    this.draft = { ...this.draft, name: item?.name || '', itemId: item?.id };
  }
  selectMaterial(index: number, item: CatalogItem | null): void {
    this.project.materials[index] = {
      ...this.project.materials[index],
      name: item?.name || '',
      itemId: item?.id,
    };
  }
  readonly allStock = computed(() =>
    this.store.data().inventory.filter((r) => r.region === this.store.data().region),
  );
  readonly valuation = computed(() =>
    String(this.allStock().reduce((sum, r) => sum + BigInt(r.price) * BigInt(r.quantity), 0n)),
  );
  readonly currentProject = computed(() =>
    this.store
      .data()
      .projects.find(
        (r) => r.id === this.selectedProject() && r.region === this.store.data().region,
      ),
  );
  readonly materials = computed(() =>
    (this.currentProject()?.materials ?? []).map((m) => {
      const owned = this.allStock()
        .filter((r) =>
          r.itemId && m.itemId
            ? r.itemId === m.itemId
            : r.name.toLocaleLowerCase() === m.name.toLocaleLowerCase(),
        )
        .reduce((n, r) => n + r.quantity, 0);
      const missing = Math.max(0, m.target - owned);
      return {
        ...m,
        owned,
        missing,
        percent: Math.min(100, (owned / m.target) * 100),
        cost: String(BigInt(m.price) * BigInt(missing)),
      };
    }),
  );
  readonly projectCost = computed(() =>
    String(this.materials().reduce((sum, r) => sum + BigInt(r.cost), 0n)),
  );
  readonly completed = computed(() => this.materials().filter((r) => r.missing === 0).length);
  get rows(): Stock[] {
    return this.allStock().filter(
      (r) =>
        r.name.toLocaleLowerCase().includes(this.search.toLocaleLowerCase()) &&
        (!this.location || r.location === this.location),
    );
  }
  get locations(): string[] {
    return [...new Set(this.allStock().map((r) => r.location))].sort();
  }
  get projects(): Project[] {
    return this.store.data().projects.filter((r) => r.region === this.store.data().region);
  }
  newStock(): Stock {
    return {
      id: crypto.randomUUID(),
      region: this.store.data().region,
      name: '',
      location: 'Velia',
      quantity: 0,
      target: 0,
      price: '0',
    };
  }
  newProject(): Project {
    return {
      id: crypto.randomUUID(),
      region: this.store.data().region,
      name: '',
      materials: [{ name: '', target: 1, price: '0' }],
    };
  }
  saveStock(): void {
    const candidate = {
      ...this.store.data(),
      inventory: [
        ...this.store.data().inventory.filter((r) => r.id !== this.draft.id),
        { ...this.draft, region: this.store.data().region },
      ],
    };
    if (this.store.replace(candidate)) {
      this.draft = this.newStock();
      this.error.set('');
    }
  }
  edit(row: Stock): void {
    this.draft = structuredClone(row);
  }
  remove(id: string): void {
    this.store.update((s) => ({ ...s, inventory: s.inventory.filter((r) => r.id !== id) }));
  }
  exportList(): void {
    if (this.rows.length > 500) {
      this.error.set(
        'A planilha aceita até 500 materiais. Use os filtros de local ou nome para exportar em partes.',
      );
      return;
    }
    if (this.rows.some((row) => !row.itemId)) {
      this.error.set(
        'Antes de exportar, edite os materiais antigos e selecione o item na busca. Assim, a planilha poderá ser importada de volta.',
      );
      return;
    }
    const safe = (v: string) =>
      '"' + (/^[=+\-@]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
    const text = [
      'itemId;quantidade;local;meta;preco',
      ...this.rows.map((r) =>
        [r.itemId, r.quantity, safe(r.location), r.target, r.price].join(';'),
      ),
    ].join('\n');
    download('black-market-materiais.csv', '\uFEFF' + text, 'text/csv;charset=utf-8');
  }
  saveProject(): void {
    if (
      new Set(this.project.materials.map((r) => r.name.trim().toLocaleLowerCase())).size !==
      this.project.materials.length
    ) {
      this.error.set('Use cada material uma vez no projeto.');
      return;
    }
    const parsed = workspaceSchema.safeParse({
      ...this.store.data(),
      projects: [
        ...this.store.data().projects.filter((r) => r.id !== this.project.id),
        { ...this.project, region: this.store.data().region },
      ],
    });
    if (!parsed.success) {
      this.error.set(validationMessage(parsed.error));
      return;
    }
    if (this.store.replace(parsed.data)) {
      this.selectedProject.set(this.project.id);
      this.project = this.newProject();
      this.error.set('');
    }
  }
  editProject(p: Project): void {
    this.project = structuredClone(p);
  }
  removeProject(id: string): void {
    this.store.update((s) => ({ ...s, projects: s.projects.filter((r) => r.id !== id) }));
  }
  addMaterial(): void {
    this.project.materials.push({ name: '', target: 1, price: '0' });
  }
  removeMaterial(index: number): void {
    this.project.materials.splice(index, 1);
  }
}
