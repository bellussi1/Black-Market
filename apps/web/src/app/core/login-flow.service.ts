import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';

import { IdentityService } from './identity.service';
import { LoginIntentService } from './login-intent.service';

@Injectable({ providedIn: 'root' })
export class LoginFlowService {
  readonly identity = inject(IdentityService);
  readonly intent = inject(LoginIntentService);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly message = signal('');
  private callbackPending?: Promise<void>;

  initialize(requested?: string | null): Promise<void> {
    if (requested !== undefined) this.intent.restore(requested);
    if (!this.browser) return this.identity.initialize();
    if (this.callbackPending) return this.callbackPending;
    const hash = this.document.defaultView?.location.hash ?? '';
    if (!hash.startsWith('#steam-')) return this.identity.initialize().catch(() => undefined);
    const view = this.document.defaultView!;
    view.history.replaceState(
      view.history.state,
      '',
      view.location.pathname + view.location.search,
    );
    this.callbackPending = this.perform(async () => {
      await this.identity.initialize();
      const code = hash.match(/^#steam-code=([A-Za-z0-9_-]{43})$/)?.[1];
      if (code) {
        await this.identity.exchangeSteamCode(code);
        this.message.set('Login Steam concluído.');
        await this.continueAfterLogin();
      } else if (hash === '#steam-linked') this.message.set('Conta Steam vinculada.');
      else if (hash === '#steam-conflict')
        this.message.set('Esta conta Steam já está vinculada a outro usuário.');
      else this.message.set('Não foi possível confirmar o acesso Steam. Tente entrar novamente.');
    }).finally(() => {
      this.callbackPending = undefined;
    });
    return this.callbackPending;
  }

  async perform(action: () => Promise<void>): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.message.set('');
    try {
      await action();
    } catch {
      this.message.set('Não foi possível concluir o login. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  google(): Promise<void> {
    return this.perform(async () => {
      await this.identity.google();
      await this.continueAfterLogin();
    });
  }

  steam(): Promise<void> {
    return this.perform(() => this.identity.steam());
  }

  private async continueAfterLogin(): Promise<void> {
    const destination = this.intent.returnUrl();
    this.intent.close();
    if (destination) await this.router.navigateByUrl(destination, { replaceUrl: true });
  }
}
