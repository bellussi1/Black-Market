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
      <section
        class="privacy-panel"
        aria-labelledby="privacy-title"
        tabindex="-1"
        (keydown.escape)="close()"
      >
        <h2 id="privacy-title" #title tabindex="-1" i18n>Sua privacidade</h2>
        <p i18n>
          As ferramentas guardam dados neste dispositivo. Se você confirmar a sincronização, uma
          cópia será enviada à sua conta. Estatísticas são opcionais e não incluem sua conta,
          estoque nem prints.
        </p>
        <p><a routerLink="/cookies" i18n>Como usamos cookies e armazenamento</a></p>
        @if (privacy.optionalAvailable()) {
          <p i18n>Necessários: sempre ativos para as funções que você usa.</p>
          <div class="action-row">
            <button class="btn" (click)="privacy.save(true)" i18n>Aceitar estatísticas</button>
            <button class="btn" (click)="privacy.save(false)" i18n>Rejeitar opcionais</button>
            <button class="btn subtle" (click)="personalize()" i18n>Personalizar</button>
            @if (privacy.open()) {
              <button type="button" class="btn subtle" (click)="close()" i18n>
                Fechar preferências
              </button>
            }
          </div>
          @if (customize) {
            <p i18n>Necessários: sempre ativos para os recursos solicitados.</p>
            <label class="check-row">
              <input
                type="checkbox"
                [checked]="analytics"
                (change)="analytics = $any($event.target).checked"
              />
              <span i18n>Estatísticas de uso opcionais</span>
            </label>
            <button type="button" class="btn" (click)="privacy.save(analytics)" i18n>
              Salvar escolhas
            </button>
          }
        } @else {
          <p role="status" i18n>
            Estatísticas opcionais estão indisponíveis. Nenhuma ferramenta opcional será iniciada.
          </p>
          @if (privacy.choices()?.analytics === true) {
            <button type="button" class="btn" (click)="privacy.save(false)" i18n>
              Revogar autorização anterior
            </button>
          }
          @if (privacy.open()) {
            <button type="button" class="btn subtle" (click)="close()" i18n>
              Fechar preferências
            </button>
          }
        }
        @if (privacy.storageWarning(); as warning) {
          <p role="status" aria-live="polite">{{ warning }}</p>
        }
      </section>
    }
  `,
  styleUrl: './privacy-controls.scss',
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
  close() {
    this.privacy.open.set(false);
  }
}
