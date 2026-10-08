import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { gearSlots } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { groupItemOptions } from './item-option-groups';
import {
  type Crop,
  type IconIndex,
  NumberReader,
  type QuantityReading,
  rankCandidates,
} from './print-reader';
import { detectStorageGrids, type GridDetection } from './storage-grid';
import { parseVisibleQuantity } from './visible-quantity';

interface CellDraft {
  id: number;
  preview: string;
  options: CatalogItem[];
  item: CatalogItem | null;
  quantity: string;
  quantityText: string;
  quantityEstimate: string | null;
  quantityUncertain: boolean;
  include: boolean;
  reviewed: boolean;
  slot: string;
  level: number;
  caphras: number;
}
@Component({
  selector: 'app-scans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CatalogItemPicker, ItemIcon],
  templateUrl: './scans-page.html',
  styleUrl: './scans-page.scss',
})
export class ScansPage implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  readonly store = inject(WorkspaceStore);
  readonly catalog = inject(CatalogApiService);
  private readonly http = inject(HttpClient);
  private readonly reader = new NumberReader();
  private image?: ImageBitmap;
  private generation = 0;
  private region = this.store.data().region;
  readonly preview = signal('');
  readonly picking = signal(false);
  private cropStart?: { x: number; y: number };
  readonly cells = signal<CellDraft[]>([]);
  readonly reviewPage = signal(0);
  readonly reviewPageSize = 12;
  readonly visibleCells = computed(() =>
    this.cells().slice(
      this.reviewPage() * this.reviewPageSize,
      (this.reviewPage() + 1) * this.reviewPageSize,
    ),
  );
  readonly includedCount = computed(() => this.cells().filter((cell) => cell.include).length);
  readonly suggestionCount = computed(
    () => this.cells().filter((cell) => cell.options.length).length,
  );
  readonly abbreviatedCount = computed(
    () => this.cells().filter((cell) => cell.quantityEstimate !== null).length,
  );
  readonly gridSuggested = signal(false);
  readonly gridAreas = signal<GridDetection[]>([]);
  readonly selectedArea = signal(0);
  readonly groupItemOptions = groupItemOptions;
  readonly busy = signal(false);
  readonly progress = signal('');
  readonly message = signal('');
  width = 0;
  height = 0;
  bounds: Crop = { left: 0, top: 0, width: 1, height: 1 };
  columns = 8;
  rows = 4;
  location = 'Velia';
  mode: 'storage' | 'gear' | 'number' = 'storage';
  readonly slots = gearSlots;
  readonly slotLabels: Readonly<Record<string, string>> = {
    mainhand: 'Arma principal',
    offhand: 'Arma secundária',
    awakening: 'Despertar',
    helmet: 'Elmo',
    armor: 'Armadura',
    gloves: 'Luvas',
    shoes: 'Sapatos',
    necklace: 'Colar',
    belt: 'Cinto',
    ring1: 'Anel 1',
    ring2: 'Anel 2',
    earring1: 'Brinco 1',
    earring2: 'Brinco 2',
    tool: 'Ferramenta',
    clothes: 'Traje de profissão',
  };
  profileId = '';
  field = 'silver';
  numberDraft = '';
  confirmNumber = false;
  confirmStock = false;
  private readingRegion = '';
  readonly numericFields = [
    { id: 'silver', name: 'Prata' },
    { id: 'energy', name: 'Energia atual' },
    { id: 'mainAp', name: 'PA principal' },
    { id: 'awakeAp', name: 'PA de despertar' },
    { id: 'dp', name: 'PD' },
    { id: 'gathering', name: 'Maestria de coleta' },
    { id: 'cooking', name: 'Maestria de culinária' },
    { id: 'alchemy', name: 'Maestria de alquimia' },
    { id: 'processing', name: 'Maestria de processamento' },
    { id: 'fishing', name: 'Maestria de pesca' },
    { id: 'hunting', name: 'Maestria de caça' },
  ];
  constructor() {
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (region !== this.region) {
          this.generation++;
          this.cells.set([]);
          this.numberDraft = '';
          this.profileId = '';
          this.confirmStock = false;
          this.confirmNumber = false;
          this.message.set(
            'A região mudou. Faça uma nova leitura para usar os dados neste mercado.',
          );
          this.region = region;
        }
      });
    });
  }
  profiles() {
    return this.store.data().characters.filter((row) => row.region === this.store.data().region);
  }
  changeMode() {
    this.cells.set([]);
    this.numberDraft = '';
    this.confirmNumber = false;
    this.confirmStock = false;
    this.gridSuggested.set(false);
    this.gridAreas.set([]);
    this.reviewPage.set(0);
    if (this.mode === 'gear') {
      this.columns = 1;
      this.rows = 1;
    } else if (this.mode === 'storage' && this.image) {
      this.suggestGrid();
    }
  }
  async file(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await this.openImage(file);
  }
  async paste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (!files.length) return;
    event.preventDefault();
    await this.openFiles(files);
  }
  dragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = this.busy() ? 'none' : 'copy';
  }
  async drop(event: DragEvent) {
    event.preventDefault();
    await this.openFiles(Array.from(event.dataTransfer?.files ?? []));
  }
  private async openFiles(files: File[]) {
    if (this.busy()) return;
    if (files.length !== 1) {
      this.message.set('Importe uma captura por vez. Revise e salve antes de abrir a próxima.');
      return;
    }
    await this.openImage(files[0]);
  }
  private async openImage(file: File) {
    if (this.busy()) return;
    const generation = ++this.generation;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      this.message.set('Escolha um print PNG, JPG ou WebP de até 10 MB.');
      return;
    }
    try {
      const image = await createImageBitmap(file);
      if (generation !== this.generation) {
        image.close();
        return;
      }
      if (image.width * image.height > 12_000_000) {
        image.close();
        this.message.set('O print é muito grande. Recorte a parte que deseja importar.');
        return;
      }
      this.cells.set([]);
      this.numberDraft = '';
      this.confirmStock = false;
      this.confirmNumber = false;
      this.image?.close();
      this.image = image;
      this.width = image.width;
      this.height = image.height;
      if (this.preview()) URL.revokeObjectURL(this.preview());
      this.preview.set(URL.createObjectURL(file));
      this.bounds = { left: 0, top: 0, width: this.width, height: this.height };
      this.reviewPage.set(0);
      this.gridSuggested.set(false);
      this.gridAreas.set([]);
      if (this.mode !== 'storage' || !this.suggestGrid()) {
        this.message.set(
          'Captura aberta. Selecione somente a grade de itens ou o número que deseja ler.',
        );
      }
    } catch {
      this.message.set('Não foi possível abrir esta imagem. Tente salvar o print novamente.');
    }
  }
  suggestGrid(): boolean {
    if (!this.image || this.busy() || this.mode !== 'storage') return false;
    try {
      const grids = detectStorageGrids(this.image, this.width, this.height);
      this.gridAreas.set(grids);
      if (grids.length) {
        this.useGridArea(0);
        const grid = grids[0];
        this.message.set(
          `Grade sugerida: ${grid.columns} colunas e ${grid.rows} linhas. Confira o contorno antes de ler.`,
        );
        return true;
      }
    } catch {
      // Manual cropping remains available when canvas inspection is unavailable.
    }
    this.message.set(
      'Não localizamos uma grade regular. Selecione a área de itens e confira linhas e colunas.',
    );
    return false;
  }
  useGridArea(index: number) {
    const grid = this.gridAreas()[index];
    if (!grid || this.busy()) return;
    this.bounds = { ...grid.bounds };
    this.columns = grid.columns;
    this.rows = grid.rows;
    this.invalidateCrop();
    this.selectedArea.set(index);
    this.gridSuggested.set(true);
  }
  invalidateCrop() {
    this.gridSuggested.set(false);
    this.cells.set([]);
    this.reviewPage.set(0);
    this.confirmStock = false;
  }
  validCrop() {
    return (
      Object.values(this.bounds).every(Number.isFinite) &&
      this.bounds.left >= 0 &&
      this.bounds.top >= 0 &&
      this.bounds.width >= 9 &&
      this.bounds.height >= 8 &&
      this.bounds.left + this.bounds.width <= this.width &&
      this.bounds.top + this.bounds.height <= this.height
    );
  }
  async read() {
    this.picking.set(false);
    this.cropStart = undefined;
    if (this.busy() || !this.image) return;
    if (!this.validCrop()) {
      this.message.set('Ajuste o recorte para ficar dentro da imagem.');
      return;
    }
    if (
      this.mode !== 'number' &&
      (!Number.isInteger(this.rows) ||
        !Number.isInteger(this.columns) ||
        this.rows < 1 ||
        this.columns < 1 ||
        this.rows * this.columns > 400)
    ) {
      this.message.set('Escolha uma grade com até 400 espaços.');
      return;
    }
    const image = this.image;
    const generation = ++this.generation;
    const mode = this.mode;
    const bounds = { ...this.bounds };
    const rows = this.rows;
    const columns = this.columns;
    this.readingRegion = this.store.data().region;
    this.analytics.capture('journey_started', { feature: 'scans', action: 'read_print' });
    this.busy.set(true);
    this.message.set('');
    this.cells.set([]);
    this.numberDraft = '';
    this.confirmNumber = false;
    this.confirmStock = false;
    this.reviewPage.set(0);
    try {
      if (mode === 'number') {
        this.progress.set('Lendo o número…');
        const value = await this.reader.read(image, bounds);
        if (generation !== this.generation) return;
        this.numberDraft = value;
        this.message.set(
          value
            ? 'Confira o número e o campo antes de aplicar.'
            : 'Não conseguimos ler este número. Você pode preenchê-lo manualmente.',
        );
      } else {
        this.progress.set('Preparando a comparação de itens…');
        const index = await firstValueFrom(
          this.http.get<IconIndex>(environment.apiBaseUrl + '/api/v1/catalog/icon-index', {
            params: { region: this.readingRegion, version: '2' },
          }),
        );
        const positions: { cell: Crop; matches: ReturnType<typeof rankCandidates> }[] = [];
        for (let row = 0; row < rows; row++)
          for (let column = 0; column < columns; column++) {
            if (generation !== this.generation) return;
            const cell = {
              left: bounds.left + (column * bounds.width) / columns,
              top: bounds.top + (row * bounds.height) / rows,
              width: bounds.width / columns,
              height: bounds.height / rows,
            };
            positions.push({ cell, matches: rankCandidates(image, cell, index) });
            if (positions.length % 10 === 0)
              await new Promise<void>((resolve) => setTimeout(resolve, 0));
          }
        const ids = [
          ...new Set(positions.flatMap((position) => position.matches.map((match) => match.id))),
        ];
        const items = new Map<number, CatalogItem>();
        for (let start = 0; start < ids.length; start += 100) {
          if (generation !== this.generation) return;
          this.progress.set('Buscando os nomes dos itens sugeridos…');
          const result = await firstValueFrom(
            this.catalog.getItems({ ids: ids.slice(start, start + 100), page: 1, pageSize: 100 }),
          );
          for (const item of result.items) items.set(item.id, item);
        }
        if (generation !== this.generation) return;
        const drafts: CellDraft[] = positions.map(({ cell, matches }, id) => {
          const options = matches
            .map((match) => items.get(match.id))
            .filter((item): item is CatalogItem => Boolean(item));
          const best = matches[0];
          const uniqueSuggestion =
            best &&
            !best.sharedIcon &&
            best.distance <= 10 &&
            (!matches[1] || matches[1].distance - best.distance >= 3);
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          canvas
            .getContext('2d')
            ?.drawImage(image, cell.left, cell.top, cell.width, cell.height, 0, 0, 64, 64);
          return {
            id,
            preview: canvas.toDataURL(),
            options,
            item: uniqueSuggestion ? (items.get(best.id) ?? null) : null,
            quantity: '',
            quantityText: '',
            quantityEstimate: null,
            quantityUncertain: false,
            include: false,
            reviewed: false,
            slot: '',
            level: 0,
            caphras: 0,
          };
        });
        this.cells.set(drafts);
        if (mode === 'storage') {
          this.progress.set(`Lendo quantidades de ${drafts.length} espaços…`);
          const crops = positions.map(({ cell }) => ({
            left: cell.left + cell.width * 0.03,
            top: cell.top + cell.height * 0.57,
            width: cell.width * 0.94,
            height: cell.height * 0.37,
          }));
          const quantities: QuantityReading[] = [];
          // Bounded contact sheets avoid very tall canvases on wide warehouses.
          for (let start = 0; start < crops.length; start += 50) {
            if (generation !== this.generation) return;
            const batch = crops.slice(start, start + 50);
            quantities.push(
              ...(await this.reader.readQuantities(image, batch, (progress) => {
                if (generation === this.generation)
                  this.progress.set(
                    `Lendo quantidades… ${Math.round(((start + progress * batch.length) / crops.length) * 100)}%`,
                  );
              })),
            );
          }
          if (generation !== this.generation) return;
          this.cells.set(
            drafts.map((draft, i) => {
              const reading = quantities[i];
              return {
                ...draft,
                quantity:
                  reading?.value && !reading.approximate && reading.confidence >= 50
                    ? reading.value
                    : '',
                quantityText: reading?.text ?? '',
                quantityEstimate: reading?.approximate ? reading.value : null,
                quantityUncertain: !reading?.value || reading.confidence < 50,
              };
            }),
          );
        }
        if (generation !== this.generation) return;
        this.message.set(
          `${drafts.length} espaços preparados para revisão. Confirme somente os itens e as quantidades que conferiu no jogo. Valores abreviados precisam da quantidade exata.`,
        );
      }
      const hasResult =
        mode === 'number'
          ? Boolean(this.numberDraft)
          : this.cells().some((cell) => cell.options.length > 0 || Boolean(cell.quantity));
      this.analytics.capture('journey_completed', {
        feature: 'scans',
        action: 'read_print',
        status: 'success',
        result: hasResult ? 'matches' : 'no_matches',
      });
    } catch {
      if (generation === this.generation) {
        this.analytics.capture('journey_failed', {
          feature: 'scans',
          action: 'read_print',
          status: 'failed',
        });
        this.message.set(
          'Não foi possível concluir a leitura. Tente um recorte menor ou preencha manualmente.',
        );
      }
    } finally {
      this.busy.set(false);
      this.progress.set('');
    }
  }
  cropDown(event: PointerEvent) {
    if (!this.picking() || this.busy()) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.cropStart = this.imagePoint(event, target);
  }
  cropMove(event: PointerEvent) {
    if (!this.cropStart) return;
    const point = this.imagePoint(event, event.currentTarget as HTMLElement);
    this.bounds = {
      left: Math.floor(Math.min(this.cropStart.x, point.x)),
      top: Math.floor(Math.min(this.cropStart.y, point.y)),
      width: Math.floor(Math.abs(point.x - this.cropStart.x)),
      height: Math.floor(Math.abs(point.y - this.cropStart.y)),
    };
  }
  cropUp(event: PointerEvent) {
    if (!this.cropStart) return;
    this.cropMove(event);
    this.invalidateCrop();
    this.cropStart = undefined;
    this.picking.set(false);
  }
  private imagePoint(event: PointerEvent, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(this.width, ((event.clientX - rect.left) / rect.width) * this.width)),
      y: Math.max(
        0,
        Math.min(this.height, ((event.clientY - rect.top) / rect.height) * this.height),
      ),
    };
  }
  cancel() {
    this.generation++;
    this.message.set('Leitura cancelada. Nenhum dado foi salvo.');
  }
  select(cell: CellDraft, item: CatalogItem | null) {
    if (item && !cell.options.some((option) => option.id === item.id)) {
      cell.options = [item, ...cell.options];
    }
    cell.item = item;
    cell.reviewed = false;
    cell.include = false;
    this.confirmStock = false;
    this.cells.set([...this.cells()]);
  }
  choose(cell: CellDraft, id: string) {
    this.select(cell, cell.options.find((item) => item.id === Number(id)) ?? null);
  }
  integer(value: string) {
    const parsed = parseVisibleQuantity(value);
    return parsed && !parsed.approximate ? Number(parsed.value) : null;
  }
  edited(cell: CellDraft) {
    cell.reviewed = false;
    cell.include = false;
    this.confirmStock = false;
    this.cells.set([...this.cells()]);
  }
  review(cell: CellDraft, checked: boolean) {
    if (
      checked &&
      (!cell.item || (this.mode === 'storage' && this.integer(cell.quantity) === null))
    )
      return;
    cell.reviewed = checked;
    cell.include = checked;
    this.confirmStock = false;
    this.cells.set([...this.cells()]);
  }
  applyNumber() {
    if (!this.confirmNumber || this.readingRegion !== this.store.data().region || this.busy())
      return;
    const profile = this.profiles().find((row) => row.id === this.profileId);
    const value = this.integer(this.numberDraft);
    if (!profile || value === null) {
      this.message.set('Selecione o personagem e informe um número inteiro.');
      return;
    }
    const field = this.field;
    if (!this.numericFields.some((row) => row.id === field)) return;
    const updated = ['silver', 'energy', 'mainAp', 'awakeAp', 'dp'].includes(field)
      ? { ...profile, [field]: field === 'silver' ? String(value) : value }
      : { ...profile, mastery: { ...profile.mastery, [field]: value } };
    if (
      this.store.update((state) => ({
        ...state,
        characters: state.characters.map((row) => (row.id === profile.id ? updated : row)),
      }))
    ) {
      this.analytics.capture('journey_completed', {
        feature: 'scans',
        action: 'import',
        status: 'success',
      });
      this.message.set('Valor atualizado no personagem.');
      this.confirmNumber = false;
    }
  }
  applyStock() {
    if (!this.confirmStock || this.readingRegion !== this.store.data().region || this.busy())
      return;
    const entries = this.cells().filter((cell) => cell.include);
    const seen = new Set<number>();
    if (
      !this.location.trim() ||
      !entries.length ||
      entries.some((cell) => !cell.item || !cell.reviewed || this.integer(cell.quantity) === null)
    ) {
      this.message.set('Confira item, quantidade, local e a revisão de cada espaço incluído.');
      return;
    }
    for (const cell of entries) {
      const id = cell.item!.id;
      if (seen.has(id)) {
        this.message.set(
          'O mesmo item aparece mais de uma vez. Ajuste sua quantidade total e inclua apenas um espaço por item.',
        );
        return;
      }
      seen.add(id);
    }
    const location = this.location.trim();
    const region = this.readingRegion;
    if (
      entries.some(
        (cell) =>
          this.store
            .data()
            .inventory.filter(
              (row) =>
                row.region === region && row.itemId === cell.item!.id && row.location === location,
            ).length > 1,
      )
    ) {
      this.message.set(
        'Existem registros duplicados neste local. Organize-os no armazém antes de importar.',
      );
      return;
    }
    if (
      this.store
        .data()
        .inventory.some(
          (row) =>
            row.region === region &&
            row.location === location &&
            !row.itemId &&
            entries.some((cell) => cell.item!.name === row.name),
        )
    ) {
      this.message.set(
        'Existe um registro manual com o mesmo nome. Vincule-o ao item no armazém antes de importar.',
      );
      return;
    }
    if (
      this.store.update((state) => {
        let inventory = [...state.inventory];
        for (const cell of entries) {
          const item = cell.item!;
          const matching = inventory.filter(
            (row) => row.region === region && row.itemId === item.id && row.location === location,
          );
          if (matching.length > 1) throw new Error('Registros duplicados no armazém.');
          const previous = matching[0];
          const entry = {
            id: previous?.id ?? crypto.randomUUID(),
            region,
            itemId: item.id,
            name: item.name,
            location,
            quantity: this.integer(cell.quantity)!,
            target: previous?.target ?? 0,
            price: previous?.price ?? '0',
          };
          inventory = previous
            ? inventory.map((row) => (row.id === previous.id ? entry : row))
            : [...inventory, entry];
        }
        return { ...state, inventory };
      })
    ) {
      this.analytics.capture('journey_completed', {
        feature: 'scans',
        action: 'import',
        status: 'success',
      });
      this.message.set('Quantidades atualizadas. Itens fora deste print foram mantidos.');
      this.confirmStock = false;
    }
  }
  applyGear() {
    if (!this.confirmStock || this.busy() || this.readingRegion !== this.store.data().region)
      return;
    const profile = this.profiles().find((row) => row.id === this.profileId);
    const entries = this.cells().filter((cell) => cell.include);
    if (
      !profile ||
      !entries.length ||
      entries.some(
        (cell) =>
          !cell.item ||
          !cell.reviewed ||
          !gearSlots.includes(cell.slot as (typeof gearSlots)[number]),
      )
    ) {
      this.message.set(
        'Escolha o personagem e confira item, posição e nível de cada equipamento incluído.',
      );
      return;
    }
    if (new Set(entries.map((cell) => cell.slot)).size !== entries.length) {
      this.message.set('Inclua apenas um equipamento por posição.');
      return;
    }
    const updated = {
      ...profile,
      gear: [
        ...profile.gear.filter((row) => !entries.some((cell) => cell.slot === row.slot)),
        ...entries.map((cell) => ({
          slot: cell.slot as (typeof gearSlots)[number],
          itemId: cell.item!.id,
          name: cell.item!.name,
          level: cell.level,
          caphras: cell.caphras,
        })),
      ],
    };
    if (
      this.store.update((state) => ({
        ...state,
        characters: state.characters.map((row) => (row.id === profile.id ? updated : row)),
      }))
    ) {
      this.analytics.capture('journey_completed', {
        feature: 'scans',
        action: 'import',
        status: 'success',
      });
      this.message.set(
        'Equipamentos atualizados no personagem. As outras posições foram mantidas.',
      );
      this.confirmStock = false;
    }
  }
  ngOnDestroy() {
    this.generation++;
    this.image?.close();
    if (this.preview()) URL.revokeObjectURL(this.preview());
    void this.reader.close();
  }
}
