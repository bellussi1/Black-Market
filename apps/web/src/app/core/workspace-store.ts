import type { OnDestroy } from '@angular/core';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { CalculatorKey, CharacterProfile } from '@bdo/calculators';

import { validationMessage } from '../shared/calculation-feedback';
import { download } from '../shared/download';
import { RegionPreferences } from './region-preferences';
import { emptyWorkspace, presetSchema, type Workspace, workspaceSchema } from './workspace-models';

const STORAGE_KEY = 'black-market.workspace.v1';

@Injectable({ providedIn: 'root' })
export class WorkspaceStore implements OnDestroy {
  private readonly preferences = inject(RegionPreferences);
  private readonly internal = signal<Workspace>(emptyWorkspace());
  private readonly demonstration = signal<Workspace | null>(null);
  readonly demoActive = computed(() => this.demonstration() !== null);
  readonly data = computed(() => this.demonstration() ?? this.internal());
  readonly activeCharacter = computed<CharacterProfile | null>(() => {
    const state = this.data(),
      characters = state.characters.filter((c) => c.region === state.region);
    return characters.find((c) => c.id === state.activeCharacterId) ?? characters[0] ?? null;
  });
  readonly message: RegionPreferences['message'];
  readonly blocked: RegionPreferences['blocked'];
  private readonly unsubscribe: () => void;
  private recovery = '';

  constructor() {
    const preferences = this.preferences;
    this.message = preferences.message;
    this.blocked = preferences.blocked;
    this.internal.update((state) => ({ ...state, region: preferences.region() }));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.recovery = raw;
        this.internal.set({
          ...workspaceSchema.parse(JSON.parse(raw)),
          region: preferences.region(),
        });
      }
    } catch {
      this.message.set(
        'Não foi possível ler seus dados locais. Exporte um backup antes de substituir o armazenamento.',
      );
      this.blocked.set(Boolean(this.recovery));
    }
    preferences.setSummary(this.data());
    this.unsubscribe = preferences.onRegionChange((region) => {
      if (this.data().region !== region) this.update((state) => ({ ...state, region }));
    });
  }
  update(change: (state: Workspace) => Workspace): boolean {
    if (this.demoActive()) return this.replace(change(this.data()));
    if (this.blocked()) {
      this.message.set(
        'O backup local precisa ser recuperado em Dados e backup antes de salvar alterações.',
      );
      return false;
    }
    return this.replace(change(this.data()));
  }
  replace(raw: unknown): boolean {
    try {
      const value = workspaceSchema.parse(raw);
      if (this.demoActive() || value.demonstration) {
        this.demonstration.set({
          ...value,
          demonstration: value.demonstration ?? { version: 'brazil-v1', label: 'Demonstração' },
        });
        this.preferences.setSummary(this.data());
        return true;
      }
      this.internal.set(value);
      this.blocked.set(false);
      this.preferences.setSummary(value);
      this.preferences.setRegion(value.region);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        this.message.set('');
        this.recovery = '';
      } catch {
        this.message.set(
          'Alterações disponíveis nesta sessão. O navegador não permitiu salvar: exporte um backup.',
        );
      }
      return true;
    } catch (error) {
      this.message.set(validationMessage(error));
      return false;
    }
  }
  setRegion(value: string): void {
    this.preferences.setRegion(value);
  }
  startDemo(raw: unknown): boolean {
    const parsed = workspaceSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.demonstration) {
      this.message.set('Confira os dados da demonstração antes de continuar.');
      return false;
    }
    this.demonstration.set(parsed.data);
    this.preferences.setSummary(parsed.data);
    return true;
  }
  exitDemo(): void {
    this.demonstration.set(null);
    this.preferences.setSummary(this.internal());
    this.preferences.setRegion(this.internal().region);
  }
  ngOnDestroy(): void {
    this.unsubscribe();
  }
  savePreset(tool: CalculatorKey, name: string, input: unknown): boolean {
    const preset = presetSchema.safeParse({
      id: crypto.randomUUID(),
      name,
      input,
      tool,
      region: this.data().region,
      savedAt: new Date().toISOString(),
    });
    if (!preset.success) {
      this.message.set(validationMessage(preset.error));
      return false;
    }
    return this.update((s) => ({ ...s, presets: [...s.presets, preset.data] }));
  }
  removePreset(id: string): void {
    this.update((s) => ({ ...s, presets: s.presets.filter((r) => r.id !== id) }));
  }
  exportBackup(): void {
    download(
      this.demoActive() ? 'black-market-demonstracao.json' : 'black-market-backup.json',
      this.blocked() && !this.demoActive()
        ? this.recovery
        : JSON.stringify({ ...this.data() }, null, 2),
      'application/json',
    );
  }
}
