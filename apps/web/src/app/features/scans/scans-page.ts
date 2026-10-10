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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { characterSchema, gearSlots } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { SCREENSHOT_MVP } from '../../core/mvp-scope';
import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import {
  confirmedEquipmentStatistics,
  emptyEquipmentStatistics,
  enhancementLevel,
  type EnhancementReading,
  equipmentStatFields,
  type EquipmentStatistics,
} from './equipment-reading';
import { detectEquipmentFrames, suggestEquipmentLayout } from './equipment-slots';
import { groupItemOptions } from './item-option-groups';
import {
  type Crop,
  type IconIndex,
  IconRefiner,
  NumberReader,
  type QuantityReading,
  rankCandidates,
} from './print-reader';
import {
  consolidateOccurrences,
  type DuplicateChoice,
  imageHashDistance,
  occurrenceGroups,
  type ReviewedOccurrence,
  stockMatches,
  type StockUpdateMode,
} from './scan-consolidation';
import { isDefinitelyEmptySlot, isKnownLockedSlot } from './slot-visibility';
import { detectStorageGrids, type GridDetection } from './storage-grid';
import { parseVisibleQuantity } from './visible-quantity';

export interface CellDraft {
  enhancementSuggestion?: EnhancementReading | null;
  score?: number;
  sourceRect?: Crop;
  levelConfirmed?: boolean;
  caphrasConfirmed?: boolean;
  ignored?: boolean;
  itemUncertain?: boolean;
  autoExcluded?: boolean;
  id: number;
  preview: string;
  options: CatalogItem[];
  item: CatalogItem | null;
  quantity: string;
  quantityText: string;
  quantityEstimate: string | null;
  quantityUncertain: boolean;
  quantityConfidence?: number;
  include: boolean;
  reviewed: boolean;
  slot: string;
  level: number;
  caphras: number;
}
type ScanMode = 'storage' | 'inventory' | 'gear' | 'number';
interface ScanJob {
  autoArea?: boolean;
  equipmentStatistics?: EquipmentStatistics;
  statisticsConfirmed?: boolean;
  id: string;
  file: File;
  url: string;
  thumbnail: string;
  hash: string;
  fingerprint: string;
  width: number;
  height: number;
  mode: ScanMode;
  location: string;
  profileId: string;
  bounds: Crop;
  columns: number;
  rows: number;
  areas: GridDetection[];
  cells: CellDraft[];
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'cancelled' | 'duplicate';
  error: string;
  warning: string;
  elapsedMs: number;
  emptySlots: number;
}
@Component({
  selector: 'app-scans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CatalogItemPicker, ItemIcon],
  templateUrl: './scans-page.html',
  styleUrl: './scans-page.scss',
})
export class ScansPage implements OnDestroy {
  readonly screenshotMvp = SCREENSHOT_MVP;
  readonly batchElapsedMs = signal(0);
  private readonly analytics = inject(AnalyticsService);
  readonly store = inject(WorkspaceStore);
  readonly catalog = inject(CatalogApiService);
  private readonly http = inject(HttpClient);
  private readonly reader = new NumberReader();
  private refiner?: IconRefiner;
  private image?: ImageBitmap;
  readonly jobs = signal<ScanJob[]>([]);
  readonly activeJobId = signal('');
  readonly batchRunning = signal(false);
  readonly preparing = signal(false);
  readonly locked = computed(() => this.busy() || this.batchRunning() || this.preparing());
  readonly batchProgress = signal('');
  readonly duplicateChoices = signal<Record<string, DuplicateChoice>>({});
  readonly updateMode = signal<StockUpdateMode>('reviewed');
  readonly fullLocationConfirmed = signal(false);
  readonly allReviewed = computed(() =>
    this.jobs().flatMap((job) =>
      job.cells.filter((cell) => cell.include && cell.reviewed).map((cell) => ({ job, cell })),
    ),
  );
  readonly duplicateGroups = computed(() =>
    [...occurrenceGroups(this.reviewedOccurrences())].filter(([, rows]) => rows.length > 1),
  );
  readonly reliableBatchCount = computed(() =>
    this.jobs().reduce(
      (count, job) => count + job.cells.filter((cell) => this.reliable(cell, job.mode)).length,
      0,
    ),
  );
  readonly importableCount = computed(() => this.allReviewed().length + this.reliableBatchCount());
  readonly pendingBatchCount = computed(() =>
    this.jobs().reduce(
      (count, job) =>
        count +
        job.cells.filter(
          (cell) => !cell.reviewed && !cell.ignored && !this.reliable(cell, job.mode),
        ).length,
      0,
    ),
  );
  readonly totalIdentifiedCount = computed(() =>
    this.jobs().reduce(
      (count, job) =>
        count +
        job.cells.filter(
          (cell) =>
            !cell.ignored && !!cell.item && (job.mode === 'gear' ? Boolean(cell.slot) : true),
        ).length,
      0,
    ),
  );
  readonly canSaveDirectly = computed(() => this.totalIdentifiedCount() > 0);
  readonly saveBatchLabel = computed(() => {
    const count = this.totalIdentifiedCount();
    const modes = new Set(this.jobs().map((j) => j.mode));
    if (modes.size === 1) {
      const mode = [...modes][0];
      if (mode === 'storage') return `Confirmar e salvar no armazém (${count} itens)`;
      if (mode === 'inventory') return `Confirmar e salvar no inventário (${count} itens)`;
      if (mode === 'gear') return `Confirmar e salvar equipamentos (${count} itens)`;
    }
    return `Confirmar e salvar lote (${count} itens)`;
  });
  readonly batchConfirmed = signal(false);
  private batchCancelled = false;
  private loadGeneration = 0;
  private activationGeneration = 0;
  readonly activeCaptureNumber = computed(
    () => this.jobs().findIndex((job) => job.id === this.activeJobId()) + 1,
  );
  readonly hasResults = (job: ScanJob) => job.cells.length > 0;
  readonly activeJob = computed(() => this.jobs().find((job) => job.id === this.activeJobId()));
  readonly statusLabels: Record<ScanJob['status'], string> = {
    queued: 'Pronta para analisar',
    processing: 'Analisando',
    ready: 'Disponível para revisão',
    failed: 'Não foi possível analisar',
    cancelled: 'Cancelada — pode tentar novamente',
    duplicate: 'Captura idêntica — não será repetida',
  };
  readonly emptySlots = signal(0);
  private cachedIndex?: { region: string; index: IconIndex };
  private generation = 0;
  private region = this.store.data().region;
  readonly preview = signal('');
  readonly picking = signal(false);
  private cropStart?: { x: number; y: number };
  readonly cells = signal<CellDraft[]>([]);
  equipmentStatistics = emptyEquipmentStatistics();
  statisticsConfirmed = false;
  readonly equipmentStatFields = equipmentStatFields;
  readonly equipmentStatLabels = { mainAp: 'PA principal', awakeAp: 'PA de despertar', dp: 'PD' };
  readonly reviewPage = signal(0);
  readonly reviewPageSize = 12;
  readonly reviewFilter = signal<'pending' | 'all'>('pending');
  readonly autoRead = signal(false);
  readonly skipLockedSlots = signal(true);
  readonly reviewCells = computed(() =>
    this.reviewFilter() === 'pending'
      ? this.cells().filter((cell) => !cell.reviewed && !cell.ignored && !this.reliable(cell))
      : this.cells(),
  );
  readonly reliableCount = computed(
    () => this.cells().filter((cell) => this.reliable(cell)).length,
  );
  readonly visibleCells = computed(() =>
    this.reviewCells().slice(
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
  private uploadMode: ScanMode | null = null;
  private uploadLocation: string | null = null;
  private uploadProfileId: string | null = null;
  get captureMode() {
    return this.uploadMode ?? this.mode;
  }
  set captureMode(value: ScanMode) {
    this.uploadMode = value;
    if (!this.jobs().length) this.mode = value;
  }
  get captureLocation() {
    return this.uploadLocation ?? this.location;
  }
  set captureLocation(value: string) {
    this.uploadLocation = value;
    if (!this.jobs().length) this.location = value;
  }
  get captureProfileId() {
    return this.uploadProfileId ?? this.profileId;
  }
  set captureProfileId(value: string) {
    this.uploadProfileId = value;
    if (!this.jobs().length) this.profileId = value;
  }
  mode: ScanMode = (['storage', 'inventory', 'gear'].includes(
    inject(ActivatedRoute).snapshot.queryParamMap.get('type') ?? '',
  )
    ? inject(ActivatedRoute).snapshot.queryParamMap.get('type')
    : 'storage') as ScanMode;
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
  captureCharacterName = '';
  createCaptureCharacter(forNewCapture = false) {
    const parsed = characterSchema.safeParse({
      id: crypto.randomUUID(),
      name: this.captureCharacterName,
      region: this.store.data().region,
    });
    if (!parsed.success) {
      this.message.set('Informe um nome de 1 a 80 caracteres para o personagem.');
      return;
    }
    if (
      !this.store.update((state) => ({
        ...state,
        characters: [...state.characters, parsed.data],
        activeCharacterId: parsed.data.id,
      }))
    )
      return;
    if (forNewCapture) {
      this.uploadProfileId = parsed.data.id;
      this.captureCharacterName = '';
      this.message.set(
        'Personagem criado para as novas capturas. Os destinos anteriores foram mantidos.',
      );
      return;
    }
    this.uploadProfileId = parsed.data.id;
    this.profileId = parsed.data.id;
    this.jobs.update((jobs) =>
      jobs.map((job) =>
        job.mode !== 'storage' && !job.profileId ? { ...job, profileId: parsed.data.id } : job,
      ),
    );
    this.destinationChanged();
    this.captureCharacterName = '';
    this.message.set('Personagem criado. As capturas e resultados do lote foram mantidos.');
  }
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
    this.profileId = this.store.activeCharacter()?.id ?? '';
    this.location =
      this.store
        .data()
        .inventory.find((row) => row.region === this.region && row.kind !== 'inventory')
        ?.location ?? 'Velia';
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (region !== this.region) {
          this.resetEquipmentStatistics();
          this.cancel();
          this.clearJobs();
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
  reliable(cell: CellDraft, mode: ScanMode = this.mode) {
    if (cell.reviewed || cell.ignored || cell.autoExcluded || !cell.item) return false;
    if (mode === 'number') return false;
    if (mode === 'gear') {
      return Boolean(cell.slot) && (cell.score === undefined || cell.score <= 18);
    }
    return (
      !cell.itemUncertain &&
      cell.score !== undefined &&
      cell.score <= 18 &&
      !cell.quantityUncertain &&
      cell.quantityEstimate === null &&
      (cell.quantityConfidence ?? 0) >= 70 &&
      this.integer(cell.quantity) !== null
    );
  }
  confirmReliable() {
    for (const cell of this.cells())
      if (this.reliable(cell)) {
        cell.include = true;
        cell.reviewed = true;
      }
    this.cells.set([...this.cells()]);
    this.reviewPage.set(0);
    this.saveActiveJob();
    this.batchConfirmed.set(false);
    this.message.set(
      'Sugestões nítidas confirmadas. Revise as pendências e o destino antes de sincronizar.',
    );
  }
  confirmReliableBatch() {
    this.saveActiveJob();
    const count = this.reliableBatchCount();
    this.jobs.update((jobs) =>
      jobs.map((job) => ({
        ...job,
        cells: job.cells.map((cell) =>
          this.reliable(cell, job.mode) ? { ...cell, include: true, reviewed: true } : cell,
        ),
      })),
    );
    const active = this.activeJob();
    if (active) this.cells.set(active.cells);
    this.reviewPage.set(0);
    this.batchConfirmed.set(false);
    this.message.set(
      `${count} itens identificados incluídos no lote. Corrija somente as pendências que deseja importar.`,
    );
  }
  useEstimate(cell: CellDraft) {
    if (!cell.quantityEstimate) return;
    cell.quantity = cell.quantityEstimate;
    this.edited(cell);
    this.review(cell, true);
  }
  useDefaultQuantity(cell: CellDraft, qty = '1') {
    cell.quantity = qty;
    this.edited(cell);
    this.review(cell, true);
  }
  toggleIgnore(cell: CellDraft) {
    cell.ignored = !cell.ignored;
    if (cell.ignored) {
      cell.include = false;
      cell.reviewed = false;
      this.message.set(`Espaço ${cell.id + 1} ignorado. Não será importado.`);
    } else {
      this.message.set(`Espaço ${cell.id + 1} restaurado.`);
    }
    this.cells.set([...this.cells()]);
    this.saveActiveJob();
    this.batchConfirmed.set(false);
  }
  async confirmAndSaveAll() {
    if (this.locked()) return;
    this.saveActiveJob();
    this.jobs.update((jobs) =>
      jobs.map((job) => ({
        ...job,
        cells: job.cells.map((cell) => {
          if (cell.ignored || !cell.item) return cell;
          if (job.mode === 'storage' || job.mode === 'inventory') {
            const qty = this.integer(cell.quantity);
            const resolvedQty =
              qty !== null && qty > 0 ? cell.quantity : (cell.quantityEstimate ?? '1');
            return {
              ...cell,
              quantity: resolvedQty,
              quantityUncertain: false,
              include: true,
              reviewed: true,
              autoExcluded: false,
            };
          } else if (job.mode === 'gear') {
            if (cell.slot) {
              return { ...cell, include: true, reviewed: true, autoExcluded: false };
            }
          }
          return cell;
        }),
      })),
    );
    const active = this.activeJob();
    if (active) this.cells.set(active.cells);
    this.batchConfirmed.set(true);
    await this.saveBatch();
  }
  setReviewFilter(filter: 'pending' | 'all') {
    this.reviewFilter.set(filter);
    this.reviewPage.set(0);
  }
  changeMode() {
    this.resetEquipmentStatistics();
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
    } else if (['storage', 'inventory'].includes(this.mode) && this.image) {
      this.suggestGrid();
    }
    const job = this.activeJob();
    if (job && job.status !== 'duplicate') job.status = 'queued';
    this.saveActiveJob();
    this.batchConfirmed.set(false);
  }
  async file(event: Event) {
    const input = event.target as HTMLInputElement;
    await this.openFiles(Array.from(input.files ?? []));
    input.value = '';
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
  private async fileBytes(file: File): Promise<ArrayBuffer> {
    if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Arquivo ilegível.'));
      reader.readAsArrayBuffer(file);
    });
  }
  private async openFiles(files: File[], replacementId?: string) {
    if (this.locked() || !files.length) return;
    if (this.jobs().length + files.length - (replacementId ? 1 : 0) > 8) {
      this.message.set('O lote aceita até 8 capturas. Remova uma imagem antes de adicionar outra.');
      return;
    }
    this.preparing.set(true);
    const generation = ++this.loadGeneration;
    try {
      for (const file of files) {
        if (
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          file.size > 10 * 1024 * 1024 ||
          !file.size
        ) {
          this.message.set(
            'Escolha PNG, JPG ou WebP de até 10 MB. Os arquivos válidos foram mantidos.',
          );
          continue;
        }
        let image: ImageBitmap | undefined;
        try {
          image = await createImageBitmap(file);
          if (generation !== this.loadGeneration) return;
          if (image.width < 16 || image.height < 16 || image.width * image.height > 12_000_000)
            throw new Error('Dimensões não permitidas.');
          const digest = await crypto.subtle.digest('SHA-256', await this.fileBytes(file));
          const hash = [...new Uint8Array(digest)]
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
          if (generation !== this.loadGeneration) return;
          const canvas = document.createElement('canvas');
          canvas.width = 8;
          canvas.height = 8;
          const context = canvas.getContext('2d');
          context?.drawImage(image, 0, 0, 8, 8);
          const pixels = context?.getImageData(0, 0, 8, 8).data;
          const tones = Array.from({ length: 64 }, (_, i) =>
            pixels ? (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3 : 0,
          );
          const mean = tones.reduce((a, b) => a + b, 0) / 64;
          const fingerprint = tones.map((n) => (n > mean ? '1' : '0')).join('');
          // Thumbnails must not decode eight full resolution screenshots at once.
          const thumb = document.createElement('canvas');
          const thumbScale = Math.min(160 / image.width, 100 / image.height, 1);
          thumb.width = Math.max(1, Math.round(image.width * thumbScale));
          thumb.height = Math.max(1, Math.round(image.height * thumbScale));
          thumb.getContext('2d')?.drawImage(image, 0, 0, thumb.width, thumb.height);
          const thumbnail = thumb.toDataURL('image/jpeg', 0.8);
          const exact = this.jobs().find((job) => job.id !== replacementId && job.hash === hash);
          const similar =
            !exact &&
            this.jobs().find((job) => imageHashDistance(job.fingerprint, fingerprint) <= 5);
          let areas: GridDetection[] = [];
          if (this.captureMode !== 'gear')
            try {
              areas = detectStorageGrids(image, image.width, image.height);
            } catch {
              /* manual crop remains available */
            }
          const first = areas[0];
          let autoArea = areas.length === 1;
          if (this.captureMode === 'gear') {
            try {
              autoArea =
                detectEquipmentFrames(image, {
                  left: 0,
                  top: 0,
                  width: image.width,
                  height: image.height,
                }).length >= 8;
            } catch {
              autoArea = false;
            }
          }
          const job: ScanJob = {
            autoArea,
            id: crypto.randomUUID(),
            file,
            url: URL.createObjectURL(file),
            thumbnail,
            hash,
            fingerprint,
            width: image.width,
            height: image.height,
            mode: this.captureMode,
            location: this.captureLocation,
            profileId: this.captureProfileId,
            bounds: first?.bounds ?? { left: 0, top: 0, width: image.width, height: image.height },
            columns: first?.columns ?? (this.captureMode === 'gear' ? 1 : 8),
            rows: first?.rows ?? (this.captureMode === 'gear' ? 1 : 4),
            areas,
            cells: [],
            status: exact ? 'duplicate' : 'queued',
            error: '',
            warning: exact
              ? 'Arquivo idêntico a outra captura deste lote.'
              : similar
                ? 'Imagem visualmente semelhante. Confira possíveis sobreposições antes de salvar.'
                : '',
            elapsedMs: 0,
            emptySlots: 0,
          };
          this.jobs.update((rows) => [...rows, job]);
          this.batchConfirmed.set(false);
        } catch {
          if (generation === this.loadGeneration)
            this.message.set('Uma imagem não pôde ser aberta. As outras capturas foram mantidas.');
        } finally {
          image?.close();
        }
      }
      if (!this.activeJobId() && this.jobs().length)
        await this.activateJob(this.jobs()[0].id, true);
    } finally {
      this.preparing.set(false);
      const queued = this.jobs().filter((job) => job.status === 'queued');
      if (this.autoRead() && queued.length && queued.every((job) => job.autoArea))
        await this.readBatch();
    }
  }
  private saveActiveJob() {
    const job = this.activeJob();
    if (!job) return;
    Object.assign(job, {
      mode: this.mode,
      location: this.location,
      profileId: this.profileId,
      bounds: { ...this.bounds },
      columns: this.columns,
      rows: this.rows,
      cells: this.cells(),
      areas: this.gridAreas(),
      emptySlots: this.emptySlots(),
      equipmentStatistics: { ...this.equipmentStatistics },
      statisticsConfirmed: this.statisticsConfirmed,
    });
    this.jobs.set([...this.jobs()]);
  }
  async activateJob(id: string, internal = false) {
    if (this.locked() && !internal) return;
    this.saveActiveJob();
    const job = this.jobs().find((row) => row.id === id);
    if (!job) return;
    const token = ++this.activationGeneration;
    this.preparing.set(true);
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(job.file);
    } catch {
      this.message.set(
        'Não foi possível abrir esta captura. Substitua a imagem ou tente novamente.',
      );
      throw new Error('Captura indisponível.');
    } finally {
      this.preparing.set(false);
    }
    if (token !== this.activationGeneration) {
      image.close();
      return;
    }
    this.image?.close();
    this.image = image;
    this.activeJobId.set(id);
    this.width = image.width;
    this.height = image.height;
    this.preview.set(job.url);
    this.mode = job.mode;
    this.location = job.location;
    this.profileId = job.profileId;
    this.bounds = { ...job.bounds };
    this.columns = job.columns;
    this.rows = job.rows;
    this.cells.set(job.cells);
    this.equipmentStatistics = { ...(job.equipmentStatistics ?? emptyEquipmentStatistics()) };
    this.statisticsConfirmed = job.statisticsConfirmed ?? false;
    this.emptySlots.set(job.emptySlots);
    this.gridAreas.set(job.areas);
    this.gridSuggested.set(
      job.areas.some(
        (area) => area.bounds.left === job.bounds.left && area.bounds.top === job.bounds.top,
      ),
    );
    this.reviewPage.set(0);
    this.confirmStock = false;
    this.numberDraft = '';
  }
  removeJob(id: string) {
    if (this.locked()) return;
    const job = this.jobs().find((row) => row.id === id);
    if (!job) return;
    URL.revokeObjectURL(job.url);
    this.jobs.update((rows) => rows.filter((row) => row.id !== id));
    if (this.activeJobId() === id) {
      this.image?.close();
      this.image = undefined;
      this.activeJobId.set('');
      this.cells.set([]);
      this.preview.set('');
      if (this.jobs()[0]) void this.activateJob(this.jobs()[0].id);
    }
    this.batchConfirmed.set(false);
    this.duplicateChoices.set({});
  }
  async replaceJob(id: string, event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (this.locked() || files.length !== 1) return;
    // Add and validate first; a failed replacement must preserve the existing review.
    const job = this.jobs().find((row) => row.id === id);
    if (!job) return;
    const before = this.jobs().length;
    await this.openFiles(files, id);
    if (this.jobs().length > before) this.removeJob(id);
  }
  retryJob(id: string) {
    if (this.locked()) return;
    const job = this.jobs().find((row) => row.id === id);
    if (job) {
      job.status = 'queued';
      job.error = '';
      this.jobs.set([...this.jobs()]);
      this.batchConfirmed.set(false);
    }
  }
  clearJobs() {
    this.loadGeneration++;
    this.activationGeneration++;
    this.image?.close();
    this.image = undefined;
    for (const job of this.jobs()) URL.revokeObjectURL(job.url);
    this.jobs.set([]);
    this.activeJobId.set('');
    this.preview.set('');
    this.batchConfirmed.set(false);
  }
  jobChanged(job: ScanJob) {
    job.equipmentStatistics = emptyEquipmentStatistics();
    job.statisticsConfirmed = false;
    job.cells = [];
    job.status = job.warning.startsWith('Arquivo idêntico') ? 'duplicate' : 'queued';
    this.jobs.set([...this.jobs()]);
    this.batchConfirmed.set(false);
    this.duplicateChoices.set({});
    if (job.id === this.activeJobId()) {
      this.mode = job.mode;
      this.location = job.location;
      this.profileId = job.profileId;
      this.cells.set([]);
      this.resetEquipmentStatistics();
      if (this.mode === 'gear') {
        this.bounds = { left: 0, top: 0, width: this.width, height: this.height };
        this.columns = 1;
        this.rows = 1;
      } else this.suggestGrid();
    }
  }
  jobDestinationChanged(job: ScanJob) {
    job.statisticsConfirmed = false;
    if (job.id === this.activeJobId()) {
      this.location = job.location;
      this.profileId = job.profileId;
      this.statisticsConfirmed = false;
    }
    this.jobs.set([...this.jobs()]);
    this.batchConfirmed.set(false);
    this.fullLocationConfirmed.set(false);
    this.duplicateChoices.set({});
  }
  destinationChanged() {
    this.statisticsConfirmed = false;
    this.saveActiveJob();
    this.batchConfirmed.set(false);
    this.fullLocationConfirmed.set(false);
    this.confirmStock = false;
    this.duplicateChoices.set({});
  }
  async readBatch() {
    if (this.locked()) return;
    this.saveActiveJob();
    this.batchRunning.set(true);
    const batchStarted = performance.now();
    this.batchCancelled = false;
    this.batchConfirmed.set(false);
    const pending = this.jobs().filter((job) =>
      ['queued', 'failed', 'cancelled'].includes(job.status),
    );
    try {
      for (const [i, job] of pending.entries()) {
        if (this.batchCancelled) break;
        this.batchProgress.set(`Captura ${i + 1} de ${pending.length}`);
        try {
          await this.activateJob(job.id, true);
          await this.read();
        } catch {
          job.status = 'failed';
          job.error = 'Não foi possível abrir esta captura. Tente substituí-la.';
          this.jobs.set([...this.jobs()]);
        }
      }
    } finally {
      this.batchElapsedMs.set(Math.round(performance.now() - batchStarted));
      this.batchRunning.set(false);
      this.batchProgress.set('');
      this.message.set(
        this.batchCancelled
          ? 'Lote cancelado. Resultados anteriores continuam disponíveis.'
          : 'Lote analisado. Aceite os itens identificados e corrija apenas as pendências que deseja importar.',
      );
    }
  }
  suggestGrid(): boolean {
    if (!this.image || this.busy() || !['storage', 'inventory'].includes(this.mode)) return false;
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
    this.resetEquipmentStatistics();
    this.gridSuggested.set(false);
    this.cells.set([]);
    this.reviewPage.set(0);
    this.confirmStock = false;
    const job = this.activeJob();
    if (job && job.status !== 'duplicate') job.status = 'queued';
    this.saveActiveJob();
    this.batchConfirmed.set(false);
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
    const job = this.activeJob();
    const started = performance.now();
    const previousCells = job?.cells ?? [];
    if (job) {
      job.status = 'processing';
      job.error = '';
      this.jobs.set([...this.jobs()]);
    }
    this.emptySlots.set(0);
    this.analytics.capture('journey_started', { feature: 'scans', action: 'read_print' });
    this.busy.set(true);
    this.message.set('');
    this.cells.set([]);
    this.numberDraft = '';
    this.confirmNumber = false;
    this.confirmStock = false;
    this.reviewPage.set(0);
    this.resetEquipmentStatistics();
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
        const index =
          this.cachedIndex?.region === this.readingRegion
            ? this.cachedIndex.index
            : await firstValueFrom(
                this.http.get<IconIndex>(environment.apiBaseUrl + '/api/v1/catalog/icon-index', {
                  params: { region: this.readingRegion, version: '2' },
                }),
              );
        this.cachedIndex = { region: this.readingRegion, index };
        const positions: { cell: Crop; matches: ReturnType<typeof rankCandidates> }[] = [];
        const gearFrames = mode === 'gear' ? detectEquipmentFrames(image, bounds) : [];
        const equipmentLayout = suggestEquipmentLayout(gearFrames, bounds);
        if (mode === 'gear' && !gearFrames.length && (bounds.width > 160 || bounds.height > 160)) {
          throw new Error('Recorte um ícone de equipamento para leitura manual.');
        }
        const slotCrops = gearFrames.length
          ? gearFrames
          : Array.from({ length: rows * columns }, (_, i) => ({
              left: bounds.left + ((i % columns) * bounds.width) / columns,
              top: bounds.top + (Math.floor(i / columns) * bounds.height) / rows,
              width: bounds.width / columns,
              height: bounds.height / rows,
            }));
        for (const [slotIndex, cell] of slotCrops.entries()) {
          if (generation !== this.generation) return;
          this.progress.set(
            `Comparando formas e cores… espaço ${slotIndex + 1} de ${slotCrops.length}`,
          );
          // Allow painting, keyboard input and cancellation between every slot.
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (generation !== this.generation) return;
          const test = document.createElement('canvas');
          test.width = 32;
          test.height = 32;
          const ctx = test.getContext('2d', { willReadFrequently: true });
          ctx?.drawImage(image, cell.left, cell.top, cell.width, cell.height, 0, 0, 32, 32);
          const data = ctx?.getImageData(0, 0, 32, 32).data;
          if (
            data &&
            (isDefinitelyEmptySlot(data, 32, 32) ||
              (mode !== 'gear' && this.skipLockedSlots() && isKnownLockedSlot(data, 32, 32)))
          ) {
            this.emptySlots.update((n) => n + 1);
            continue;
          }
          positions.push({ cell, matches: rankCandidates(image, cell, index) });
        }
        this.refiner?.close();
        const refiner = new IconRefiner();
        this.refiner = refiner;
        for (let start = 0; start < positions.length; start += 4) {
          if (generation !== this.generation) {
            refiner.close();
            return;
          }
          this.progress.set(
            `Comparando detalhes dos itens… ${Math.round((start / positions.length) * 100)}%`,
          );
          await Promise.all(
            positions.slice(start, start + 4).map(async (position) => {
              position.matches = await refiner.refine(
                image,
                position.cell,
                position.matches,
                (id) =>
                  `${environment.apiBaseUrl}/api/v1/items/${id}/icon?dataset=${encodeURIComponent(index.checksum)}`,
              );
            }),
          );
        }
        refiner.close();
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
            .filter((item): item is CatalogItem => Boolean(item))
            .sort((a, b) => {
              const da = matches.find((m) => m.id === a.id)!.distance;
              const db = matches.find((m) => m.id === b.id)!.distance;
              // Identical icons also occur on retired event and placeholder records.
              // Prefer a categorized, ordinary item in the visual tie; never confirm it.
              if (
                da <= (matches[0]?.distance ?? 0) + 0.25 &&
                db <= (matches[0]?.distance ?? 0) + 0.25
              ) {
                return (
                  Number(Boolean(b.category)) - Number(Boolean(a.category)) ||
                  Number(/^[\[★]/.test(a.name)) - Number(/^[\[★]/.test(b.name)) ||
                  a.id - b.id
                );
              }
              return da - db;
            });
          const best = matches[0];
          const uniqueSuggestion =
            best &&
            !best.sharedIcon &&
            best.distance <= 24 &&
            (!matches[1] || matches[1].distance - best.distance >= 2);
          const canvas = document.createElement('canvas');
          const previewScale = 64 / Math.max(cell.width, cell.height);
          canvas.width = Math.max(1, Math.round(cell.width * previewScale));
          canvas.height = Math.max(1, Math.round(cell.height * previewScale));
          canvas
            .getContext('2d')
            ?.drawImage(
              image,
              cell.left,
              cell.top,
              cell.width,
              cell.height,
              0,
              0,
              canvas.width,
              canvas.height,
            );
          return {
            id,
            score: best?.distance,
            sourceRect: { ...cell },
            preview: canvas.toDataURL(),
            options,
            item: uniqueSuggestion ? (items.get(best.id) ?? null) : (options[0] ?? null),
            itemUncertain: !uniqueSuggestion,
            quantity: '',
            quantityText: '',
            quantityEstimate: null,
            quantityUncertain: false,
            include: false,
            reviewed: false,
            slot:
              mode === 'gear' ? (equipmentLayout.slots.get(gearFrames.indexOf(cell)) ?? '') : '',
            level: 0,
            caphras: 0,
            levelConfirmed: false,
            caphrasConfirmed: false,
          };
        });
        this.cells.set(drafts);
        if (mode === 'gear') {
          this.progress.set('Lendo os símbolos de aprimoramento…');
          const enhancements = await this.reader.readEnhancements(
            image,
            positions.map(({ cell }) => cell),
          );
          if (generation !== this.generation) return;
          this.cells.set(
            drafts.map((draft, i) => ({ ...draft, enhancementSuggestion: enhancements[i] })),
          );
          if (equipmentLayout.statistics.length) {
            this.progress.set('Lendo PA e PD da ficha…');
            const values = await this.reader.readQuantities(
              image,
              equipmentLayout.statistics.map(({ crop }) => crop),
            );
            if (generation !== this.generation) return;
            for (const [i, { field }] of equipmentLayout.statistics.entries()) {
              const value = values[i];
              if (
                value?.value &&
                !value.approximate &&
                value.confidence >= 50 &&
                Number(value.value) <= 5000
              )
                this.equipmentStatistics[field] = value.value;
            }
          }
        }
        if (mode === 'storage' || mode === 'inventory') {
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
              const hasExactReading = Boolean(
                reading?.value && !reading.approximate && reading.confidence >= 50,
              );
              const isApproximate = Boolean(reading?.approximate);
              const hasNoText = !reading?.text || reading.text.trim() === '';

              let qty = '';
              let uncertain = true;
              let confidence = reading?.confidence ?? 0;

              if (hasExactReading && reading?.value) {
                qty = reading.value;
                uncertain = false;
              } else if (isApproximate) {
                qty = '';
                uncertain = true;
              } else if (draft.item && hasNoText) {
                // In BDO, inventory/storage slots with an item and no number text overlay represent 1 unit.
                qty = '1';
                uncertain = false;
                confidence = 85;
              }

              return {
                ...draft,
                quantity: qty,
                quantityText: reading?.text ?? '',
                quantityEstimate: reading?.approximate ? reading.value : null,
                quantityUncertain: uncertain,
                quantityConfidence: confidence,
              };
            }),
          );
        }
        if (generation !== this.generation) return;
        this.message.set(
          mode === 'gear'
            ? `${drafts.length} ícones preparados. Confira item, posição e aprimoramento. Trajes e artefatos podem aparecer sem posição; ignore o que não faz parte do conjunto de combate. Caphras não é visível nesta ficha.`
            : `${drafts.length} espaços analisados. Resultados confiáveis estão prontos para importar; corrija somente os casos duvidosos que deseja incluir.`,
        );
      }
      if (job) {
        job.status = 'ready';
        job.elapsedMs = Math.round(performance.now() - started);
        this.saveActiveJob();
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
      if (job) {
        job.status = generation === this.generation ? 'failed' : 'cancelled';
        job.error = 'A leitura falhou. Tente novamente ou ajuste o recorte.';
        if (previousCells.length) this.cells.set(previousCells);
        this.saveActiveJob();
      }
      if (generation === this.generation) {
        this.analytics.capture('journey_failed', {
          feature: 'scans',
          action: 'read_print',
          status: 'failed',
        });
        this.message.set(
          mode === 'gear'
            ? 'Não encontramos molduras confiáveis. Recorte um ícone de equipamento e use uma linha e uma coluna.'
            : 'Não foi possível concluir a leitura. Tente um recorte menor ou preencha manualmente.',
        );
      }
    } finally {
      if (job?.status === 'processing') {
        job.status = 'cancelled';
        if (previousCells.length) this.cells.set(previousCells);
        this.saveActiveJob();
      }
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
    this.batchCancelled = true;
    this.generation++;
    this.refiner?.close();
    void this.reader.close();
    this.message.set('Leitura cancelada. Nenhum dado foi salvo.');
  }
  select(cell: CellDraft, item: CatalogItem | null) {
    if (item && !cell.options.some((option) => option.id === item.id)) {
      cell.options = [item, ...cell.options];
    }
    cell.item = item;
    cell.itemUncertain = false;
    cell.autoExcluded = true;
    if (this.mode === 'gear') {
      cell.levelConfirmed = false;
      cell.caphrasConfirmed = false;
    }
    cell.reviewed = false;
    cell.include = false;
    this.confirmStock = false;
    this.cells.set([...this.cells()]);
    this.saveActiveJob();
    this.batchConfirmed.set(false);
    this.duplicateChoices.set({});
  }
  choose(cell: CellDraft, id: string) {
    this.select(cell, cell.options.find((item) => item.id === Number(id)) ?? null);
  }
  integer(value: string) {
    const parsed = parseVisibleQuantity(value);
    return parsed && !parsed.approximate ? Number(parsed.value) : null;
  }
  edited(cell: CellDraft) {
    // Keep a correction in the editor until explicit inclusion, even between keystrokes.
    cell.autoExcluded = true;
    if (this.mode === 'storage' || this.mode === 'inventory') {
      cell.quantityUncertain = this.integer(cell.quantity) === null;
      cell.quantityEstimate = null;
      cell.quantityConfidence = cell.quantityUncertain ? 0 : 100;
    }
    cell.reviewed = false;
    cell.include = false;
    this.confirmStock = false;
    this.cells.set([...this.cells()]);
    this.saveActiveJob();
    this.batchConfirmed.set(false);
    this.duplicateChoices.set({});
  }
  private resetEquipmentStatistics() {
    this.equipmentStatistics = emptyEquipmentStatistics();
    this.statisticsConfirmed = false;
  }
  statisticsEdited() {
    this.statisticsConfirmed = false;
    this.saveActiveJob();
    this.batchConfirmed.set(false);
  }
  confirmStatistics(checked: boolean) {
    this.statisticsConfirmed = checked;
    this.saveActiveJob();
    this.batchConfirmed.set(false);
  }
  suggestedLevel(cell: CellDraft) {
    return cell.enhancementSuggestion
      ? enhancementLevel(cell.enhancementSuggestion, cell.slot)
      : null;
  }
  acceptEnhancement(cell: CellDraft) {
    const level = this.suggestedLevel(cell);
    if (level === null) return;
    cell.level = level;
    cell.levelConfirmed = true;
    this.edited(cell);
  }
  slotEdited(cell: CellDraft) {
    cell.levelConfirmed = false;
    this.edited(cell);
  }
  review(cell: CellDraft, checked: boolean) {
    if (
      checked &&
      (!cell.item ||
        (this.mode === 'gear' && !this.slots.includes(cell.slot as (typeof gearSlots)[number])) ||
        (['storage', 'inventory'].includes(this.mode) && this.integer(cell.quantity) === null))
    )
      return;
    cell.ignored = false;
    cell.reviewed = checked;
    cell.include = checked;
    cell.autoExcluded = !checked;
    this.message.set(
      checked ? `${cell.item?.name} incluído no lote.` : `${cell.item?.name} retirado do lote.`,
    );
    this.confirmStock = false;
    this.cells.set([...this.cells()]);
    this.saveActiveJob();
    this.batchConfirmed.set(false);
    this.duplicateChoices.set({});
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
  reviewedOccurrences(): ReviewedOccurrence[] {
    return this.jobs()
      .flatMap((job) =>
        job.cells
          .filter((cell) => (cell.include && cell.reviewed) || this.reliable(cell, job.mode))
          .map((cell) => ({ job, cell })),
      )
      .filter(({ job }) => job.mode === 'storage' || job.mode === 'inventory')
      .filter(({ cell }) => cell.item && this.integer(cell.quantity) !== null)
      .map(({ job, cell }) => ({
        itemId: cell.item!.id,
        name: cell.item!.name,
        quantity: this.integer(cell.quantity)!,
        kind: job.mode as 'storage' | 'inventory',
        location:
          job.mode === 'inventory'
            ? (this.profiles().find((profile) => profile.id === job.profileId)?.name ?? '')
            : job.location.trim(),
        characterId: job.mode === 'inventory' ? job.profileId : undefined,
        source: {
          hash: job.hash,
          slot: cell.id,
          capture: this.jobs().indexOf(job) + 1,
          position: cell.sourceRect
            ? Object.values(cell.sourceRect)
                .map((n) => Math.round(n * 100) / 100)
                .join(',')
            : undefined,
        },
      }));
  }
  chooseDuplicate(key: string, value: DuplicateChoice) {
    this.duplicateChoices.update((choices) => ({ ...choices, [key]: value }));
    this.batchConfirmed.set(false);
  }
  ignore(cell: CellDraft) {
    cell.include = false;
    cell.reviewed = false;
    cell.ignored = true;
    this.message.set(`Espaço ${cell.id + 1} ignorado. Não será importado.`);
    this.cells.set([...this.cells()]);
    this.saveActiveJob();
    this.batchConfirmed.set(false);
  }
  async saveBatch() {
    if (this.locked() || !this.batchConfirmed() || this.readingRegion !== this.store.data().region)
      return;
    this.saveActiveJob();
    this.confirmReliableBatch();
    const selected = this.allReviewed();
    if (!selected.length) {
      this.message.set('Confira e inclua pelo menos um item.');
      return;
    }
    if (
      selected.some(
        ({ job, cell }) =>
          !cell.item ||
          (['storage', 'inventory'].includes(job.mode) && this.integer(cell.quantity) === null) ||
          (!job.location.trim() && job.mode === 'storage') ||
          (['inventory', 'gear'].includes(job.mode) &&
            !this.profiles().some((profile) => profile.id === job.profileId)),
      )
    ) {
      this.message.set('Confira item, quantidade e destino de todas as capturas.');
      return;
    }
    try {
      const stock = consolidateOccurrences(this.reviewedOccurrences(), this.duplicateChoices());
      const gear = selected.filter(({ job }) => job.mode === 'gear');
      const statisticJobs = this.jobs().filter(
        (job) => job.mode === 'gear' && job.status === 'ready' && job.statisticsConfirmed,
      );
      if (new Set(statisticJobs.map((job) => job.profileId)).size !== statisticJobs.length)
        throw new Error('Confirme PA e PD em apenas uma captura por personagem neste lote.');
      const statistics = new Map(
        statisticJobs.map((job) => [
          job.profileId,
          confirmedEquipmentStatistics(job.equipmentStatistics ?? emptyEquipmentStatistics()),
        ]),
      );
      const gearKeys = gear.map(({ job, cell }) => JSON.stringify([job.profileId, cell.slot]));
      if (new Set(gearKeys).size !== gearKeys.length)
        throw new Error(
          'Há equipamentos repetidos na mesma posição. Ignore um deles ou corrija o slot.',
        );
      if (
        gear.some(
          ({ cell }) =>
            !gearSlots.includes(cell.slot as (typeof gearSlots)[number]) ||
            !Number.isInteger(cell.level) ||
            cell.level < 0 ||
            cell.level > 30 ||
            !Number.isInteger(cell.caphras) ||
            cell.caphras < 0 ||
            cell.caphras > 20,
        )
      )
        throw new Error('Confira posição, aprimoramento e Caphras de cada equipamento.');
      if (
        this.updateMode() === 'replace' &&
        (!this.fullLocationConfirmed() ||
          this.jobs().some(
            (job) =>
              job.status !== 'duplicate' &&
              (job.status !== 'ready' || job.cells.some((cell) => !cell.include && !cell.ignored)),
          ))
      )
        throw new Error(
          'Para substituir um local inteiro, revise ou ignore todos os espaços e confirme que enviou o estoque completo.',
        );
      const region = this.readingRegion;
      const now = new Date().toISOString();
      const saved = this.store.update((state) => {
        let inventory = [...state.inventory];
        const sameLocation = (row: (typeof inventory)[number], incoming: ReviewedOccurrence) =>
          row.region === region &&
          (row.kind ?? 'storage') === incoming.kind &&
          (row.characterId ?? '') === (incoming.characterId ?? '') &&
          (incoming.kind === 'inventory' ||
            row.location.trim().toLocaleLowerCase('pt-BR') ===
              incoming.location.trim().toLocaleLowerCase('pt-BR'));
        for (const incoming of stock) {
          const matches = inventory.filter(
            (row) => row.region === region && stockMatches(row, incoming),
          );
          if (
            matches.length > 1 ||
            inventory.some(
              (row) =>
                sameLocation(row, incoming) &&
                !row.itemId &&
                row.name.toLocaleLowerCase('pt-BR') === incoming.name.toLocaleLowerCase('pt-BR'),
            )
          )
            throw new Error(
              'Há registros antigos ambíguos neste local. Vincule os itens ao catálogo e corrija as duplicidades.',
            );
        }
        if (this.updateMode() === 'replace')
          inventory = inventory.filter(
            (row) =>
              !stock.some((incoming) => sameLocation(row, incoming)) ||
              stock.some((incoming) => row.region === region && stockMatches(row, incoming)),
          );
        for (const incoming of stock) {
          const previous = inventory.find(
            (row) => row.region === region && stockMatches(row, incoming),
          );
          if (previous && this.updateMode() === 'merge') continue;
          const entry = {
            ...previous,
            id: previous?.id ?? crypto.randomUUID(),
            region,
            itemId: incoming.itemId,
            name: incoming.name,
            location: incoming.location,
            kind: incoming.kind,
            characterId: incoming.characterId,
            quantity: incoming.quantity,
            target: previous?.target ?? 0,
            price: previous?.price ?? '0',
            updatedAt: now,
            sources: incoming.sources,
          };
          inventory = previous
            ? inventory.map((row) => (row.id === previous.id ? entry : row))
            : [...inventory, entry];
        }
        const characters = state.characters.map((profile) => {
          const equipment = gear.filter(({ job }) => job.profileId === profile.id);
          if (!equipment.length) return profile;
          return {
            ...profile,
            ...statistics.get(profile.id),
            gear: [
              ...profile.gear.filter(
                (part) => !equipment.some(({ cell }) => cell.slot === part.slot),
              ),
              ...equipment.map(({ cell }) => {
                const previous = profile.gear.find(
                  (part) => part.slot === cell.slot && part.itemId === cell.item!.id,
                );
                return {
                  slot: cell.slot as (typeof gearSlots)[number],
                  itemId: cell.item!.id,
                  name: cell.item!.name,
                  level: cell.levelConfirmed ? cell.level : (previous?.level ?? 0),
                  caphras: cell.caphrasConfirmed ? cell.caphras : (previous?.caphras ?? 0),
                  levelConfirmed: cell.levelConfirmed ?? false,
                  caphrasConfirmed: cell.caphrasConfirmed ?? false,
                };
              }),
            ],
          };
        });
        const locations = [
          ...new Set(
            selected.map(({ job }) =>
              job.mode === 'storage'
                ? job.location.trim()
                : this.profiles().find((profile) => profile.id === job.profileId)!.name,
            ),
          ),
        ];
        return {
          ...state,
          inventory,
          characters,
          screenshotImports: [
            ...state.screenshotImports,
            {
              id: crypto.randomUUID(),
              region,
              createdAt: now,
              mode: stock.length ? this.updateMode() : ('gear' as const),
              itemCount: stock.length + gear.length,
              locations,
              sourceHashes: [...new Set(selected.map(({ job }) => job.hash))],
            },
          ].slice(-60),
        };
      });
      if (saved) {
        this.analytics.capture('journey_completed', {
          feature: 'scans',
          action: 'import',
          status: 'success',
        });
        this.batchConfirmed.set(false);
        this.message.set(
          this.store.message()
            ? 'Disponível nesta sessão. O navegador não conseguiu guardar seus dados: exporte um backup em Dados e backup.'
            : 'Importação salva. Você pode consultar os itens no armazém, inventário ou equipamentos. As imagens originais não foram armazenadas.',
        );
      } else
        this.message.set(
          'Não foi possível salvar. Seus resultados de revisão continuam disponíveis. Confira também Dados e backup.',
        );
    } catch (error) {
      this.message.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível consolidar os itens. Revise os destinos e quantidades.',
      );
    }
  }
  ngOnDestroy() {
    this.batchCancelled = true;
    this.clearJobs();
    this.generation++;
    this.refiner?.close();
    this.image?.close();
    void this.reader.close();
  }
}
