import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';

import { MAX_BACKUP_BYTES } from '../../core/region-preferences';
import { emptyWorkspace, type Workspace, workspaceSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { validationMessage } from '../../shared/calculation-feedback';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings-page',
  imports: [HlmCard, HlmButton, FormsModule],
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  readonly store = inject(WorkspaceStore);
  readonly candidate = signal<Workspace | null>(null);
  readonly error = signal('');
  confirmReplace = false;
  confirmRecoveryReset = false;
  readonly counts = computed(() => this.summary(this.store.data()));
  summary(s: Workspace) {
    return [
      { name: 'Cotações', count: s.quotes.length },
      { name: 'Materiais', count: s.inventory.length },
      { name: 'Receitas manuais', count: s.recipes.length },
      { name: $localize`Conjuntos de equipamentos`, count: s.gear.length },
      { name: 'Sessões', count: s.sessions.length },
      { name: 'Buffs', count: s.buffs.length },
      { name: 'Presets de cálculo', count: s.presets.length },
      { name: 'Projetos', count: s.projects.length },
      { name: 'Tentativas', count: s.enhancementLog.length },
      { name: 'Combinações de buffs', count: s.buffPresets.length },
    ];
  }
  async read(event: Event): Promise<void> {
    this.error.set('');
    this.candidate.set(null);
    this.confirmReplace = false;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      this.error.set('Escolha um backup do Black Market com até 20 MB.');
      return;
    }
    try {
      this.candidate.set(workspaceSchema.parse(JSON.parse(await file.text())));
    } catch (error) {
      this.error.set(validationMessage(error));
    }
  }
  replace(): void {
    if (this.confirmReplace && this.candidate()) {
      this.store.replace(this.candidate());
      this.candidate.set(null);
      this.confirmReplace = false;
    }
  }
  recoverEmpty(): void {
    if (this.confirmRecoveryReset)
      this.store.replace({ ...emptyWorkspace(), region: this.store.data().region });
  }
}
