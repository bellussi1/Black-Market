import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
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
import { candidates, type Crop, type IconIndex, NumberReader } from './print-reader';

interface CellDraft {
  id: number;
  preview: string;
  options: CatalogItem[];
  item: CatalogItem | null;
  quantity: string;
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
    if (this.mode === 'gear') {
      this.columns = 1;
      this.rows = 1;
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
      this.message.set('Print aberto. Ajuste o recorte antes de ler.');
    } catch {
      this.message.set('Não foi possível abrir esta imagem. Tente salvar o print novamente.');
    }
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
        this.rows * this.columns > 100)
    ) {
      this.message.set('Escolha uma grade com até 100 espaços.');
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
            params: { region: this.readingRegion },
          }),
        );
        const drafts: CellDraft[] = [];
        for (let row = 0; row < rows; row++)
          for (let column = 0; column < columns; column++) {
            if (generation !== this.generation) return;
            const cell = {
              left: bounds.left + (column * bounds.width) / columns,
              top: bounds.top + (row * bounds.height) / rows,
              width: bounds.width / columns,
              height: bounds.height / rows,
            };
            this.progress.set(
              `Conferindo espaço ${row * columns + column + 1} de ${rows * columns}…`,
            );
            const ids = candidates(image, cell, index);
            if (!ids.length) continue;
            const result = await firstValueFrom(
              this.catalog.getItems({ ids, page: 1, pageSize: 100 }),
            );
            if (generation !== this.generation) return;
            const quantity =
              mode === 'gear'
                ? ''
                : await this.reader.read(image, {
                    left: cell.left,
                    top: cell.top + cell.height * 0.72,
                    width: cell.width,
                    height: cell.height * 0.28,
                  });
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            canvas
              .getContext('2d')
              ?.drawImage(image, cell.left, cell.top, cell.width, cell.height, 0, 0, 64, 64);
            drafts.push({
              id: row * columns + column,
              preview: canvas.toDataURL(),
              options: result.items,
              item: null,
              quantity,
              include: false,
              reviewed: false,
              slot: '',
              level: 0,
              caphras: 0,
            });
            this.cells.set([...drafts]);
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
          }
        if (generation !== this.generation) return;
        this.message.set(
          drafts.length
            ? 'Revise os itens sugeridos e as quantidades. Marque somente os espaços conferidos.'
            : 'Nenhum item foi reconhecido. Ajuste o recorte ou use o cadastro manual.',
        );
      }
      const hasResult = mode === 'number' ? Boolean(this.numberDraft) : this.cells().length > 0;
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
    cell.item = item;
    cell.reviewed = false;
    this.confirmStock = false;
  }
  choose(cell: CellDraft, id: string) {
    this.select(cell, cell.options.find((item) => item.id === Number(id)) ?? null);
  }
  integer(value: string) {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized) && !/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) return null;
    const result = Number(normalized.replaceAll('.', ''));
    return Number.isSafeInteger(result) && result >= 0 ? result : null;
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
