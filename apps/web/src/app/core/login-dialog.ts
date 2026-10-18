import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { HlmButton } from '@bdo/ui/button';

import { LoginIntentService } from './login-intent.service';
import { LoginPanel } from './login-panel';

@Component({
  selector: 'app-login-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginPanel, HlmButton],
  template: `
    <dialog
      #dialog
      aria-labelledby="login-dialog-title"
      aria-describedby="login-dialog-description"
      tabindex="-1"
      (cancel)="cancel($event)"
      (close)="intent.close()"
      (click)="backdrop($event)"
      (keydown.escape)="cancel($event)"
    >
      <div class="dialog-heading">
        <h2 id="login-dialog-title">Entre para continuar</h2>
        <button hlmBtn variant="outline" type="button" (click)="close()">Fechar</button>
      </div>
      <p id="login-dialog-description">Sua página e suas escolhas continuam aqui ao fechar.</p>
      @if (intent.opened()) {
        <app-login-panel />
      }
    </dialog>
  `,
  styles: `
    dialog {
      margin: auto;
      width: min(540px, calc(100vw - 32px));
      max-height: calc(100dvh - 32px);
      overflow: auto;
      padding: 24px;
      background: var(--bm-surface, #202020);
      color: var(--bm-text);
      border: 1px solid var(--bm-accent);
      border-radius: 2px;
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 65%);
      backdrop-filter: blur(6px);
    }
    .dialog-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 1.25rem;
      margin: 0;
    }
    p {
      margin-block: 0 20px;
      color: var(--bm-text-muted);
    }
  `,
})
export class LoginDialog {
  readonly intent = inject(LoginIntentService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!this.browser || !dialog) return;
      if (this.intent.opened() && !dialog.open) dialog.showModal?.();
      else if (!this.intent.opened() && dialog.open) dialog.close?.();
    });
    effect((cleanup) => {
      if (!this.browser || !this.intent.opened()) return;
      const body = this.document.body;
      const overflow = body.style.overflow;
      body.style.overflow = 'hidden';
      cleanup(() => {
        body.style.overflow = overflow;
      });
    });
  }
  close(): void {
    this.dialog()?.nativeElement.close?.();
    this.intent.close();
  }
  cancel(event: Event): void {
    event.preventDefault();
    this.close();
  }
  backdrop(event: MouseEvent): void {
    if (event.target !== this.dialog()?.nativeElement) return;
    const rect = this.dialog()!.nativeElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      this.close();
  }
}
