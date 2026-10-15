import { DOCUMENT } from '@angular/common';
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
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../core/analytics.service';
import { AUTH_RETURN_URL_KEY, safeInternalReturnUrl } from '../../core/auth-return-url';
import { IdentityService } from '../../core/identity.service';
import { type Workspace, workspaceSchema } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';

@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCard, HlmButton, FormsModule],
  templateUrl: './account-page.html',
})
export class AccountPage {
  private readonly analytics = inject(AnalyticsService);
  readonly identity = inject(IdentityService);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly returnUrl = signal<string | null>(null);
  readonly store = inject(WorkspaceStore);
  private readonly http = inject(HttpClient);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly snapshot = signal<Workspace | null>(null);
  readonly cloudVersion = signal<number | null>(null);
  readonly updatedAt = signal('');
  confirmDownload = false;
  confirmUpload = false;
  confirmDelete = false;
  constructor() {
    this.restoreReturnUrl();
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
    const callback = this.consumeSteamCallback();
    void this.identity.initialize().then(
      () => this.finishSteamCallback(callback),
      () => this.message.set('Não foi possível consultar sua conta. Tente novamente mais tarde.'),
    );
  }
  private async perform(action: () => Promise<void>, trackSyncFailure = true) {
    if (this.loading()) return;
    this.loading.set(true);
    this.message.set('');
    try {
      await action();
    } catch (error) {
      if (trackSyncFailure)
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
  async google() {
    await this.perform(async () => {
      await this.identity.google();
      await this.continueAfterLogin();
    }, false);
  }
  async steam() {
    await this.perform(() => this.identity.steam(), false);
  }
  async linkGoogle() {
    await this.perform(async () => {
      await this.identity.linkGoogle();
      this.message.set('Conta Google vinculada.');
    }, false);
  }
  async linkSteam() {
    await this.perform(() => this.identity.linkSteam(), false);
  }
  async signOut() {
    await this.perform(async () => {
      await this.identity.signOut();
      this.message.set('Você saiu da sua conta.');
    }, false);
  }
  private restoreReturnUrl(): void {
    const browser = this.document.defaultView;
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    let destination = safeInternalReturnUrl(requested);

    try {
      if (requested === null && browser)
        destination = safeInternalReturnUrl(browser.sessionStorage.getItem(AUTH_RETURN_URL_KEY));
      if (browser) {
        if (destination) browser.sessionStorage.setItem(AUTH_RETURN_URL_KEY, destination);
        else browser.sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
      }
    } catch {
      destination = null;
    }

    this.returnUrl.set(destination);
  }

  private async continueAfterLogin(): Promise<void> {
    const destination = this.returnUrl();
    if (!destination) return;

    try {
      this.document.defaultView?.sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
    } catch {
      // A browser privacy setting may block storage; the in-memory destination still works.
    }
    this.returnUrl.set(null);
    await this.router.navigateByUrl(destination, { replaceUrl: true });
  }
  private consumeSteamCallback(): { kind: 'code'; code: string } | { kind: string } | null {
    const browser = this.document.defaultView;
    if (!browser) return null;
    const hash = browser.location.hash;
    if (!hash.startsWith('#steam-')) return null;

    browser.history.replaceState(
      browser.history.state,
      '',
      browser.location.pathname + browser.location.search,
    );
    const code = hash.match(/^#steam-code=([A-Za-z0-9_-]{43})$/)?.[1];
    if (code) return { kind: 'code', code };
    if (hash === '#steam-linked') return { kind: 'linked' };
    if (hash === '#steam-conflict') return { kind: 'conflict' };
    return { kind: 'error' };
  }
  private async finishSteamCallback(callback: { kind: string; code?: string } | null) {
    if (!callback) return;
    if (callback.kind === 'linked') {
      this.message.set('Conta Steam vinculada.');
      return;
    }
    if (callback.kind === 'conflict') {
      this.message.set('Esta conta Steam já está vinculada a outro usuário.');
      return;
    }
    if (callback.kind !== 'code' || !callback.code) {
      this.message.set('Não foi possível confirmar o acesso Steam. Tente entrar novamente.');
      return;
    }
    await this.perform(async () => {
      await this.identity.exchangeSteamCode(callback.code!);
      this.message.set('Login Steam concluído.');
      await this.continueAfterLogin();
    }, false);
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
  linkedProviderLabels(): string {
    return this.identity
      .providers()
      .map((provider) => (provider === 'google' ? 'Google' : 'Steam'))
      .join(' e ');
  }
}
