import { DOCUMENT } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { PrivacyService } from '../../core/privacy.service';
@Component({
  selector: 'app-privacy-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (privacy.open() || privacy.needsChoice()) {
      <section class="privacy-panel" aria-labelledby="privacy-title">
        <h2 id="privacy-title" #title tabindex="-1" i18n>Sua privacidade</h2>
        <p i18n>
          O armazenamento necessário mantém suas preferências e dados do jogo. Estatísticas
          opcionais ajudam a entender o uso das ferramentas, sem enviar seu nome, e-mail, estoque ou
          prints.
        </p>
        <p><a routerLink="/cookies" i18n>Como usamos cookies e armazenamento</a></p>
        <div class="action-row">
          <button class="btn" (click)="privacy.save(true)" i18n>Aceitar estatísticas</button
          ><button class="btn" (click)="privacy.save(false)" i18n>Rejeitar opcionais</button
          ><button class="btn subtle" (click)="personalize()" i18n>Personalizar</button>
          @if (privacy.open()) {
            <button class="btn subtle" (click)="privacy.open.set(false)" i18n>
              Fechar preferências
            </button>
          }
        </div>
        @if (customize) {
          <p i18n>Necessários: sempre ativos para os recursos solicitados.</p>
          <label class="check-row"
            ><input
              type="checkbox"
              [checked]="analytics"
              (change)="analytics = $any($event.target).checked"
            /><span i18n>Estatísticas de uso opcionais</span></label
          ><button class="btn" (click)="privacy.save(analytics)" i18n>Salvar escolhas</button>
        }
      </section>
    }
  `,
  styles: `
    .privacy-panel {
      position: fixed;
      bottom: 16px;
      right: 16px;
      left: 16px;
      z-index: 100;
      max-width: 760px;
      max-height: 85vh;
      overflow: auto;
      margin-left: auto;
      background: var(--bm-surface);
      color: var(--bm-text);
      border: 1px solid var(--bm-control-border);
      padding: 24px;
      box-shadow: 0 12px 48px #0008;
    }
    .privacy-panel h2 {
      font: 400 26px var(--bm-font-display);
    }
    .privacy-panel p {
      line-height: 1.6;
    }
  `,
})
export class PrivacyControls {
  readonly privacy = inject(PrivacyService);
  private readonly document = inject(DOCUMENT);
  private readonly title = viewChild<ElementRef<HTMLHeadingElement>>('title');
  private returnFocus: HTMLElement | null = null;
  private wasOpened = false;
  constructor() {
    afterRenderEffect(() => {
      const opened = this.privacy.open();
      if (opened && !this.wasOpened && this.title()) {
        this.returnFocus =
          this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
        this.title()?.nativeElement.focus({ preventScroll: true });
        this.wasOpened = true;
      } else if (!opened && this.wasOpened) {
        this.returnFocus?.focus({ preventScroll: true });
        this.returnFocus = null;
        this.wasOpened = false;
      }
    });
  }
  customize = false;
  analytics = this.privacy.allowsAnalytics();
  personalize() {
    this.analytics = this.privacy.allowsAnalytics();
    this.customize = true;
  }
}
