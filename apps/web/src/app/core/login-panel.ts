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
              <span class="social-icon" aria-hidden="true">
                <svg
                  class="provider-icon"
                  data-provider-icon="google"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                >
                  <path
                    d="M21.805 10.023H12.18v3.955h5.527c-.238 1.273-.961 2.352-2.047 3.076v2.556h3.314c1.939-1.785 3.058-4.414 3.058-7.539 0-.695-.062-1.367-.227-2.048Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12.18 22c2.766 0 5.086-.914 6.781-2.477l-3.314-2.556c-.918.617-2.092.982-3.467.982-2.666 0-4.926-1.8-5.734-4.221H3.02v2.639A10.237 10.237 0 0 0 12.18 22Z"
                    fill="#34A853"
                  />
                  <path
                    d="M6.446 13.728a6.135 6.135 0 0 1 0-3.918V7.171H3.02a10.247 10.247 0 0 0 0 9.196l3.426-2.639Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.18 5.589c1.504 0 2.854.517 3.916 1.532l2.938-2.938C17.258 2.533 14.946 1.538 12.18 1.538A10.237 10.237 0 0 0 3.02 7.171l3.426 2.639c.808-2.421 3.068-4.221 5.734-4.221Z"
                    fill="#EA4335"
                  />
                </svg>
              </span>
              <span class="social-label" i18n>Entrar com Google</span>
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
              <span class="social-icon" aria-hidden="true">
                <svg
                  class="provider-icon"
                  data-provider-icon="steam"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path
                    d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.387 3.387 0 0 1 1.912-.59c.064 0 .128.003.19.008l2.861-4.142V8.91a4.528 4.528 0 0 1 4.524-4.524c2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396a3.406 3.406 0 0 1-3.322-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0ZM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012Zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015Zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265Z"
                  />
                </svg>
              </span>
              <span class="social-label" i18n>Entrar com Steam</span>
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
      color: var(--bm-muted);
    }
    .social-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .social-button {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-width: 0;
      min-height: 48px;
      padding: 10px 16px;
      border: 1px solid var(--bm-control-border);
      border-radius: 2px;
      background: var(--bm-surface-raised);
      color: var(--bm-text);
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgb(216 185 120 / 10%);
      transition:
        border-color 140ms ease,
        background-color 140ms ease,
        color 140ms ease,
        box-shadow 140ms ease;
    }
    .social-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border: 1px solid var(--bm-border);
      border-radius: 2px;
      background: var(--bm-input);
      color: var(--bm-text);
      transition: border-color 140ms ease;
    }
    .provider-icon {
      display: block;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .social-label {
      overflow-wrap: anywhere;
      line-height: 1.25;
    }
    .social-button:hover:not(:disabled) {
      border-color: var(--bm-accent);
      background: var(--bm-accent-soft);
      color: var(--bm-accent-hover);
      box-shadow: inset 0 0 0 1px var(--bm-accent-soft);
    }
    .social-button:hover:not(:disabled) .social-icon {
      border-color: var(--bm-accent);
    }
    .social-button:focus-visible {
      outline: 2px solid var(--bm-focus);
      outline-offset: 2px;
      border-color: var(--bm-accent);
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
    }
    @media (prefers-reduced-motion: reduce) {
      .social-button,
      .social-icon {
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
