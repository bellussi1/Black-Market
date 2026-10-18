import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButton } from '@bdo/ui/button';

import { LoginFlowService } from './login-flow.service';

@Component({
  selector: 'app-login-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton],
  template: `
    <section [attr.aria-busy]="!identity.ready() || flow.loading() ? 'true' : null">
      <p>
        Entre com Google ou Steam para acessar seus dados pessoais e sincronizar entre dispositivos.
        Não usamos a conta ou a senha do jogo.
      </p>
      @if (!identity.ready()) {
        <p role="status">Consultando sua conta…</p>
      } @else if (identity.error()) {
        <p role="alert">{{ identity.error() }}</p>
        <button hlmBtn variant="outline" type="button" (click)="retry()">Tentar novamente</button>
      } @else if (!identity.enabled()) {
        <p>
          A sincronização entre dispositivos ainda não está disponível. O backup local continua
          acessível em Configurações.
        </p>
      } @else if (!identity.authenticated()) {
        <div
          class="social-actions"
          data-account-actions
          [attr.aria-busy]="flow.loading() ? 'true' : null"
        >
          @if (identity.googleEnabled()) {
            <button
              class="social-button"
              type="button"
              (click)="flow.google()"
              [disabled]="flow.loading()"
              aria-label="Entrar com Google"
            >
              <img src="/auth/google-sign-in.png" alt="Entrar com Google" width="189" height="40" />
            </button>
          }
          @if (identity.steamEnabled()) {
            <button
              class="social-button"
              type="button"
              (click)="flow.steam()"
              [disabled]="flow.loading()"
              aria-label="Entrar com Steam"
            >
              <img src="/auth/steam-sign-in.png" alt="Entrar com Steam" width="180" height="35" />
            </button>
          }
        </div>
      }
      <p role="status" data-account-action-status aria-live="polite">
        {{ flow.loading() ? 'Operação em andamento…' : flow.message() }}
      </p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin-block: 0 1rem;
      color: var(--bm-text-muted);
    }
    .social-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .social-button {
      width: 216px;
      min-height: 44px;
      padding: 2px;
      display: grid;
      place-items: center;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .social-button img {
      object-fit: contain;
      max-width: 100%;
    }
    .social-button:focus-visible {
      outline: 2px solid var(--bm-accent);
      outline-offset: 3px;
    }
    .social-button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
    [role='status'] {
      min-height: 1.5em;
      margin-top: 12px;
    }
  `,
})
export class LoginPanel {
  readonly flow = inject(LoginFlowService);
  readonly identity = this.flow.identity;
  constructor() {
    if (!this.identity.ready()) void this.flow.initialize();
  }
  retry(): void {
    void this.identity.retry().catch(() => undefined);
  }
}
