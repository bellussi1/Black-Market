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
              data-social-provider="google"
              type="button"
              (click)="flow.google()"
              [disabled]="flow.loading()"
              aria-label="Entrar com Google"
              i18n-aria-label
            >
              <img
                class="provider-art"
                src="/auth/google-sign-in.png"
                alt=""
                width="360"
                height="80"
              />
            </button>
          }
          @if (identity.steamEnabled()) {
            <button
              class="social-button"
              data-social-provider="steam"
              type="button"
              (click)="flow.steam()"
              [disabled]="flow.loading()"
              aria-label="Entrar com Steam"
              i18n-aria-label
            >
              <img
                class="provider-art"
                src="/auth/steam-sign-in.png"
                alt=""
                width="180"
                height="35"
              />
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
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .social-button {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-width: 0;
      min-height: 52px;
      padding: 5px 10px;
      border: 1px solid var(--bm-control-border);
      border-radius: 2px;
      background: var(--bm-input);
      cursor: pointer;
      transition:
        border-color 160ms ease,
        background-color 160ms ease,
        box-shadow 160ms ease;
    }
    .social-button:hover:not(:disabled) {
      border-color: var(--bm-accent);
      background: var(--bm-surface-raised);
    }
    .social-button img {
      object-fit: contain;
      max-width: 100%;
      max-height: 40px;
      width: auto;
      height: auto;
    }
    .social-button:focus-visible {
      outline: 2px solid var(--bm-accent);
      outline-offset: 3px;
      box-shadow: 0 0 0 4px var(--bm-accent-soft);
    }
    .social-button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
    [role='status'] {
      min-height: 1.5em;
      margin-top: 12px;
    }
    @media (max-width: 540px) {
      .social-actions {
        grid-template-columns: minmax(0, 1fr);
      }
      .social-button {
        min-height: 52px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .social-button {
        transition: none;
      }
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
