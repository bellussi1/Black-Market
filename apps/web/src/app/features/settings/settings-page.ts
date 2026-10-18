import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';

import { MAX_BACKUP_BYTES } from '../../core/region-preferences';
import { TutorialOnboardingStateService } from '../../core/tutorial-onboarding-state.service';
import { emptyWorkspace, type Workspace, workspaceSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { validationMessage } from '../../shared/calculation-feedback';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { AccountPage } from '../account/account-page';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings-page',
  imports: [HlmCard, HlmButton, FormsModule, AccountPage, TutorialSurfaceDirective],
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  private tutorialResetTrigger: HTMLButtonElement | null = null;
  readonly store = inject(WorkspaceStore);
  private readonly tutorialOnboarding = inject(TutorialOnboardingStateService);
  readonly candidate = signal<Workspace | null>(null);
  readonly error = signal('');
  readonly tutorialResetConfirmation = signal(false);
  readonly tutorialResetMessage = signal('');
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

  requestTutorialReset(event: Event): void {
    this.tutorialResetTrigger = event.currentTarget as HTMLButtonElement;
    this.tutorialResetMessage.set('');
    this.tutorialResetConfirmation.set(true);
  }

  cancelTutorialReset(): void {
    this.tutorialResetConfirmation.set(false);
    this.tutorialResetTrigger?.focus();
  }

  confirmTutorialReset(): void {
    if (!this.tutorialResetConfirmation()) return;
    this.tutorialOnboarding.resetAll();
    this.tutorialResetConfirmation.set(false);
    this.tutorialResetMessage.set(
      $localize`As apresentações serão exibidas novamente quando você visitar cada tela.`,
    );
    this.tutorialResetTrigger?.focus();
  }
}
