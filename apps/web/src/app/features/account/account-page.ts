import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../core/analytics.service';
import { IdentityService } from '../../core/identity.service';
import { type Workspace, workspaceSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';

@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, HlmCard, HlmButton, FormsModule],
  templateUrl: './account-page.html',
})
export class AccountPage {
  private readonly analytics = inject(AnalyticsService);
  readonly identity = inject(IdentityService);
  readonly store = inject(WorkspaceStore);
  private readonly http = inject(HttpClient);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly snapshot = signal<Workspace | null>(null);
  readonly cloudVersion = signal<number | null>(null);
  readonly updatedAt = signal('');
  email = '';
  confirmDownload = false;
  confirmUpload = false;
  confirmDelete = false;
  constructor() {
    effect(() => {
      this.identity.userId();
      untracked(() => {
        this.snapshot.set(null);
        this.cloudVersion.set(null);
        this.confirmDownload = false;
        this.confirmUpload = false;
        this.confirmDelete = false;
      });
    });
    void this.identity
      .initialize()
      .catch(() =>
        this.message.set('Não foi possível consultar sua conta. Tente novamente mais tarde.'),
      );
  }
  private async perform(action: () => Promise<void>) {
    if (this.loading()) return;
    this.loading.set(true);
    this.message.set('');
    try {
      await action();
    } catch (error) {
      this.analytics.capture('journey_failed', {
        feature: 'account',
        action: 'sync',
        status: 'failed',
      });
      this.message.set(
        error instanceof HttpErrorResponse
          ? error.status === 409
            ? 'Há uma versão mais recente em outro dispositivo. Carregue-a e revise antes de salvar.'
            : 'Não foi possível sincronizar agora. Seus dados neste navegador foram mantidos.'
          : 'Não foi possível concluir. Confira seu acesso e tente novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  async signIn() {
    await this.perform(async () => {
      await this.identity.signIn(this.email);
      this.message.set('Confira seu e-mail e abra o link de acesso.');
    });
  }
  async google() {
    await this.perform(() => this.identity.google());
  }
  async load() {
    await this.perform(async () => {
      const owner = this.identity.userId();
      const token = await this.identity.token();
      const result = await firstValueFrom(
        this.http.get<{ version: number; data: unknown; updatedAt: string | null }>(
          environment.apiBaseUrl + '/api/v1/workspace',
          { headers: { Authorization: 'Bearer ' + token } },
        ),
      );
      if (!owner || owner !== this.identity.userId()) return;
      this.snapshot.set(result.data ? workspaceSchema.parse(result.data) : null);
      this.cloudVersion.set(result.version);
      this.updatedAt.set(result.updatedAt ?? '');
      this.confirmDownload = false;
      this.confirmUpload = false;
      this.message.set(
        result.data
          ? 'Confira a cópia da conta antes de escolher qual versão usar.'
          : 'Sua conta ainda não possui dados salvos. Você pode enviar a cópia deste navegador.',
      );
    });
  }
  async upload() {
    if (this.store.demoActive()) {
      this.message.set('Saia da demonstração para sincronizar seus dados pessoais.');
      return;
    }
    if (!this.confirmUpload || this.cloudVersion() === null) return;
    await this.perform(async () => {
      const owner = this.identity.userId();
      this.analytics.capture('journey_started', { feature: 'account', action: 'sync' });
      const snapshot = structuredClone(this.store.data());
      const token = await this.identity.token();
      const result = await firstValueFrom(
        this.http.put<{ version: number; updatedAt: string }>(
          environment.apiBaseUrl + '/api/v1/workspace',
          { expectedVersion: this.cloudVersion(), data: snapshot },
          { headers: { Authorization: 'Bearer ' + token } },
        ),
      );
      if (!owner || owner !== this.identity.userId()) return;
      this.cloudVersion.set(result.version);
      this.updatedAt.set(result.updatedAt);
      this.snapshot.set(snapshot);
      this.confirmUpload = false;
      this.analytics.capture('journey_completed', {
        feature: 'account',
        action: 'sync',
        status: 'success',
      });
      this.message.set('Dados salvos na sua conta.');
    });
  }
  download() {
    if (!this.confirmDownload || !this.snapshot()) return;
    if (this.store.replace(this.snapshot())) {
      this.confirmDownload = false;
      this.message.set('A cópia da conta foi aplicada neste navegador.');
    }
  }
  async remove() {
    if (!this.confirmDelete) return;
    await this.perform(async () => {
      const owner = this.identity.userId();
      const token = await this.identity.token();
      const result = await firstValueFrom(
        this.http.delete<{ deleted: boolean; version: number }>(
          environment.apiBaseUrl + '/api/v1/workspace',
          {
            headers: { Authorization: 'Bearer ' + token },
          },
        ),
      );
      if (!owner || owner !== this.identity.userId()) return;
      this.snapshot.set(null);
      this.cloudVersion.set(result.version);
      this.confirmDelete = false;
      this.message.set('A cópia na conta foi excluída. Os dados deste navegador foram mantidos.');
    });
  }
  summary(state: Workspace) {
    return {
      materials: state.inventory.length,
      characters: state.characters.length,
      plans: state.personalPlans.length,
      sessions: state.sessions.length,
    };
  }
}
