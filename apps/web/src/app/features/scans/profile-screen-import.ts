import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CharacterProfile } from '@bdo/calculators';

import { WorkspaceStore } from '../../core/workspace-store';
import type { Crop } from './print-reader';
import { applyProfileFieldCandidates } from './profile-field-application';
import {
  type DetectedScreenPane,
  detectScreenPanes,
  type OcrTextLine,
  parseScreenFields,
  type ScreenFieldCandidate,
  type ScreenKind,
} from './screen-recognition';
import { ScreenTextReader } from './screen-text-reader';

const kinds: ScreenKind[] = [
  'storage',
  'inventory',
  'mastery',
  'character-roster',
  'character-status',
  'equipment',
  'market',
  'unknown',
];

const fieldLabels: Record<string, string> = {
  'storage.location': 'Local do armazém · prévia',
  'storage.capacity': 'Espaços do armazém · prévia',
  'market.load': 'Carga do mercado (VT) · prévia',
  inventoryUsed: 'Espaços usados no inventário',
  inventoryCapacity: 'Capacidade do inventário',
  carriedWeight: 'Peso carregado (LT)',
  weightLimit: 'Limite de peso (LT)',
  name: 'Nome do personagem',
  className: 'Classe',
  level: 'Nível',
  mainAp: 'PA principal',
  awakeAp: 'PA de despertar',
  dp: 'PD',
  'mastery.gathering': 'Maestria · Coleta',
  'mastery.cooking': 'Maestria · Culinária',
  'mastery.alchemy': 'Maestria · Alquimia',
  'mastery.processing': 'Maestria · Processamento',
  'mastery.fishing': 'Maestria · Pesca',
  'mastery.hunting': 'Maestria · Caça',
  'mastery.training': 'Maestria · Treinamento',
  'mastery.trading': 'Maestria · Comércio',
  'mastery.farming': 'Maestria · Cultivo',
  'mastery.sailing': 'Maestria · Navegação',
  'mastery.barter': 'Maestria · Permuta',
  'mastery.unknown': 'Maestria não identificada · prévia',
};

const editableFields = new Set([
  'name',
  'className',
  'level',
  'mainAp',
  'awakeAp',
  'dp',
  'inventoryUsed',
  'inventoryCapacity',
  'carriedWeight',
  'weightLimit',
  'mastery.gathering',
  'mastery.cooking',
  'mastery.alchemy',
  'mastery.processing',
  'mastery.fishing',
  'mastery.hunting',
  'mastery.training',
  'mastery.trading',
  'mastery.farming',
  'mastery.sailing',
  'mastery.barter',
]);
const manualFieldOptions = [...editableFields].map((value) => ({
  value,
  label: fieldLabels[value] ?? value,
}));

function displayValue(value: string | number | null): string {
  return value === null ? '—' : String(value);
}

function dedupeCandidates(candidates: readonly ScreenFieldCandidate[]): ScreenFieldCandidate[] {
  const grouped = new Map<string, ScreenFieldCandidate[]>();
  for (const candidate of candidates) {
    grouped.set(candidate.field, [...(grouped.get(candidate.field) ?? []), candidate]);
  }
  const resolved = [...grouped.values()].map((entries) => {
    const best = entries.reduce((previous, entry) =>
      entry.confidence > previous.confidence ? entry : previous,
    );
    const values = new Set(entries.map((entry) => JSON.stringify([entry.value, entry.unit])));
    if (values.size === 1) return best;
    return {
      ...best,
      rawText: entries
        .map((entry) => `${entry.rawText} → ${displayValue(entry.value)}`)
        .join(' · '),
      value: null,
      status: 'ambiguous' as const,
    };
  });
  return resolved.sort((a, b) =>
    (fieldLabels[a.field] ?? a.field).localeCompare(fieldLabels[b.field] ?? b.field, 'pt-BR'),
  );
}

@Component({
  selector: 'app-profile-screen-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './profile-screen-import.html',
  styleUrl: './profile-screen-import.scss',
})
export class ProfileScreenImportComponent implements OnDestroy {
  readonly store = inject(WorkspaceStore);
  private readonly reader = inject(ScreenTextReader);
  readonly characters = computed(() =>
    this.store
      .data()
      .characters.filter((character) => character.region === this.store.data().region),
  );
  readonly imageUrl = signal('');
  readonly imageName = signal('');
  readonly imageSize = signal({ width: 0, height: 0 });
  readonly reading = signal(false);
  readonly progress = signal(0);
  readonly message = signal('');
  readonly lines = signal<OcrTextLine[]>([]);
  readonly panes = signal<DetectedScreenPane[]>([]);
  readonly paneIndex = signal(0);
  readonly selectedKind = signal<ScreenKind>('unknown');
  readonly paneBounds = signal<Crop>({ left: 0, top: 0, width: 1, height: 1 });
  readonly candidates = signal<ScreenFieldCandidate[]>([]);
  readonly selectedFields = signal<string[]>([]);
  readonly manualField = signal('');
  readonly targetId = signal('');
  readonly kindOptions = kinds;
  readonly manualFields = manualFieldOptions;
  readonly labels = fieldLabels;
  readonly visibleCandidates = computed(() => this.candidates());
  private bitmap?: ImageBitmap;
  private objectUrl = '';
  private generation = 0;

  get targetCharacter(): CharacterProfile | null {
    return this.characters().find((character) => character.id === this.targetId()) ?? null;
  }

  async chooseFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      this.message.set('Escolha PNG, JPG ou WebP de até 10 MB.');
      return;
    }
    const generation = ++this.generation;
    await this.clearImage();
    try {
      const bitmap = await createImageBitmap(file);
      if (generation !== this.generation) {
        bitmap.close();
        return;
      }
      if (bitmap.width * bitmap.height > 12_000_000) {
        bitmap.close();
        this.message.set('A imagem precisa ter até 12 megapixels.');
        return;
      }
      this.bitmap = bitmap;
      this.objectUrl = URL.createObjectURL(file);
      this.imageUrl.set(this.objectUrl);
      this.imageName.set(file.name);
      this.imageSize.set({ width: bitmap.width, height: bitmap.height });
      this.message.set('Imagem pronta. Leia a tela para revisar os campos encontrados.');
      await this.readImage(generation);
    } catch {
      if (generation === this.generation) this.message.set('Não foi possível abrir esta imagem.');
    }
  }

  private async readImage(generation: number): Promise<void> {
    if (!this.bitmap) return;
    this.reading.set(true);
    this.progress.set(0);
    this.message.set('Lendo texto localmente…');
    try {
      const lines = await this.reader.read(this.bitmap, (value) => {
        if (generation === this.generation) this.progress.set(value);
      });
      if (generation !== this.generation) return;
      this.lines.set(lines);
      const panes = detectScreenPanes(lines, this.imageSize().width, this.imageSize().height);
      this.panes.set(panes);
      this.paneIndex.set(0);
      const pane = panes[0];
      this.selectedKind.set(pane?.kind ?? 'unknown');
      this.paneBounds.set(
        pane?.bounds ?? {
          left: 0,
          top: 0,
          width: this.imageSize().width,
          height: this.imageSize().height,
        },
      );
      this.refreshCandidates();
      this.message.set(
        lines.length
          ? 'Confira o tipo de tela e revise cada campo antes de aplicar.'
          : 'Nenhum texto legível. Ajuste a área ou preencha os dados manualmente.',
      );
    } catch (error) {
      if (generation === this.generation)
        this.message.set(
          error instanceof Error
            ? `${error.message} A imagem continua disponível para revisão manual.`
            : 'Falha no OCR. A imagem continua disponível para revisão manual.',
        );
    } finally {
      if (generation === this.generation) this.reading.set(false);
    }
  }

  async cancelReading(): Promise<void> {
    this.generation++;
    await this.reader.close();
    this.reading.set(false);
    this.progress.set(0);
    this.message.set(
      'Leitura cancelada. A imagem continua disponível para ajuste e preenchimento manual.',
    );
  }

  async retry(): Promise<void> {
    if (this.reading()) await this.cancelReading();
    await this.reader.close();
    await this.readImage(++this.generation);
  }

  paneChanged(value: string): void {
    const index = Number(value);
    if (!Number.isInteger(index) || !this.panes()[index]) return;
    this.paneIndex.set(index);
    const pane = this.panes()[index];
    this.selectedKind.set(pane.kind);
    this.paneBounds.set({ ...pane.bounds });
    this.refreshCandidates();
  }

  setKind(value: ScreenKind): void {
    this.selectedKind.set(value);
    this.refreshCandidates();
  }

  setBound(key: keyof Crop, value: number): void {
    const current = this.paneBounds();
    const maximum =
      key === 'left' || key === 'width' ? this.imageSize().width : this.imageSize().height;
    const nextValue = Number.isFinite(value) ? Math.max(0, Math.min(maximum, value)) : 0;
    const next = { ...current, [key]: nextValue };
    if (key === 'left')
      next.width = Math.max(1, Math.min(next.width, this.imageSize().width - nextValue));
    if (key === 'top')
      next.height = Math.max(1, Math.min(next.height, this.imageSize().height - nextValue));
    if (key === 'width')
      next.width = Math.max(1, Math.min(nextValue, this.imageSize().width - next.left));
    if (key === 'height')
      next.height = Math.max(1, Math.min(nextValue, this.imageSize().height - next.top));
    this.paneBounds.set(next);
    this.refreshCandidates();
  }

  private refreshCandidates(): void {
    const pane: DetectedScreenPane = {
      kind: this.selectedKind(),
      bounds: this.paneBounds(),
      confidence: this.panes()[this.paneIndex()]?.confidence ?? 0,
    };
    this.candidates.set(dedupeCandidates(parseScreenFields(pane, this.lines())));
    this.selectedFields.set([]);
  }

  isSelected(field: string): boolean {
    return this.selectedFields().includes(field);
  }

  toggleField(field: string, checked: boolean): void {
    this.selectedFields.update((selected) =>
      checked ? [...new Set([...selected, field])] : selected.filter((item) => item !== field),
    );
  }

  fieldLabel(field: string): string {
    return fieldLabels[field] ?? field;
  }

  kindLabel(kind: ScreenKind): string {
    const labels: Record<ScreenKind, string> = {
      storage: 'Armazém',
      inventory: 'Inventário',
      mastery: 'Maestria',
      'character-roster': 'Personagens',
      'character-status': 'Status do personagem',
      equipment: 'Equipamento',
      market: 'Mercado',
      unknown: 'Não identificado',
    };
    return labels[kind];
  }

  statusLabel(status: ScreenFieldCandidate['status']): string {
    const labels: Record<ScreenFieldCandidate['status'], string> = {
      candidate: 'Revisar',
      ambiguous: 'Ambíguo',
      missing: 'Não encontrado',
      unsupported: 'Somente leitura',
    };
    return labels[status];
  }

  displayValue(value: string | number | null): string {
    return displayValue(value);
  }

  currentValue(field: string): string {
    const profile = this.targetCharacter;
    if (!profile) return 'Escolha um personagem para comparar';
    if (field.startsWith('mastery.')) {
      const skill = field.slice('mastery.'.length) as keyof CharacterProfile['mastery'];
      return displayValue(profile.mastery[skill] ?? null);
    }
    const value = profile[field as keyof CharacterProfile];
    return typeof value === 'string' || typeof value === 'number' ? displayValue(value) : '—';
  }

  canEdit(candidate: ScreenFieldCandidate): boolean {
    return editableFields.has(candidate.field);
  }

  canSelect(candidate: ScreenFieldCandidate): boolean {
    return !['carriedWeight', 'weightLimit'].includes(candidate.field) || candidate.unit === 'LT';
  }

  needsWeightUnit(candidate: ScreenFieldCandidate): boolean {
    return ['carriedWeight', 'weightLimit'].includes(candidate.field) && !candidate.unit;
  }

  confirmWeightUnit(candidate: ScreenFieldCandidate, unit: string): void {
    if (unit !== 'LT' || typeof candidate.value !== 'number') return;
    this.candidates.update((rows) =>
      rows.map((row) => (row === candidate ? { ...row, unit: 'LT', status: 'candidate' } : row)),
    );
    this.selectedFields.update((selected) => selected.filter((field) => field !== candidate.field));
  }

  addManualField(): void {
    const field = this.manualField();
    if (
      !editableFields.has(field) ||
      this.candidates().some((candidate) => candidate.field === field)
    )
      return;
    this.candidates.update((rows) => [
      ...rows,
      {
        field,
        rawText: 'Entrada manual',
        value: null,
        ...(['carriedWeight', 'weightLimit'].includes(field) ? { unit: 'LT' as const } : {}),
        confidence: 100,
        bounds: this.paneBounds(),
        status: 'ambiguous',
      },
    ]);
    this.manualField.set('');
  }

  editCandidate(candidate: ScreenFieldCandidate, rawValue: string): void {
    let value: string | number | null = rawValue.trim();
    const numeric =
      editableFields.has(candidate.field) && !['name', 'className'].includes(candidate.field);
    if (numeric) {
      const normalized = rawValue.replace(/\s/g, '').replace(',', '.');
      value = normalized ? Number(normalized) : null;
      if (typeof value === 'number' && !Number.isFinite(value)) value = null;
    }
    this.candidates.update((rows) =>
      rows.map((row) =>
        row === candidate
          ? { ...row, value, status: value === null || value === '' ? 'ambiguous' : 'candidate' }
          : row,
      ),
    );
    this.selectedFields.update((selected) => selected.filter((field) => field !== candidate.field));
  }

  apply(): void {
    const profile = this.targetCharacter;
    if (!profile) {
      this.message.set('Escolha um personagem existente para receber os campos selecionados.');
      return;
    }
    const selected = new Set(this.selectedFields());
    const updated = applyProfileFieldCandidates(profile, this.candidates(), selected);
    if (JSON.stringify(updated) === JSON.stringify(profile)) {
      this.message.set(
        'Nenhum valor novo foi aplicado. Confira o personagem, a unidade e os campos selecionados.',
      );
      return;
    }
    if (
      !this.store.update((state) => ({
        ...state,
        characters: state.characters.map((character) =>
          character.id === profile.id ? updated : character,
        ),
      }))
    ) {
      this.message.set(this.store.message() || 'Não foi possível salvar os campos selecionados.');
      return;
    }
    this.message.set(
      'Campos selecionados aplicados ao personagem escolhido. Os demais dados foram preservados.',
    );
  }

  private async clearImage(): Promise<void> {
    await this.reader.close();
    this.bitmap?.close();
    this.bitmap = undefined;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = '';
    this.imageUrl.set('');
    this.imageName.set('');
    this.imageSize.set({ width: 0, height: 0 });
    this.lines.set([]);
    this.panes.set([]);
    this.candidates.set([]);
    this.selectedFields.set([]);
    this.targetId.set('');
  }

  async ngOnDestroy(): Promise<void> {
    this.generation++;
    await this.clearImage();
  }
}
