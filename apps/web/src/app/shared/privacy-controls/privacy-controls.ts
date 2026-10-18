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
        role="region"
        aria-labelledby="privacy-title"
        tabindex="-1"
        (keydown.escape)="close()"
      >
        @let choice = privacy.choices();
        <h2 id="privacy-title" #title tabindex="-1" i18n>Preferências de privacidade</h2>
        <p class="privacy-intro" i18n>
          Você decide sobre as estatísticas opcionais. Os recursos necessários continuam ativos e
          sua escolha pode ser alterada pelo rodapé a qualquer momento.
        </p>
        <div
          class="privacy-categories"
          aria-label="Categorias de armazenamento e dados"
          i18n-aria-label
        >
          <article class="privacy-category">
            <div class="category-heading">
              <h3 i18n>Armazenamento necessário</h3>
              <span class="status-chip required" i18n>Sempre ativos</span>
            </div>
            <p i18n>
              Guarda sua região e a escolha de privacidade para manter as preferências do site.
            </p>
          </article>
          <article class="privacy-category">
            <div class="category-heading">
              <h3 i18n>Estatísticas de uso</h3>
              @if (choice?.analytics === true && privacy.optionalAvailable()) {
                <span class="status-chip enabled" role="status" i18n>Estatísticas permitidas</span>
              } @else if (choice?.analytics === true) {
                <span class="status-chip enabled" role="status" i18n>Autorização anterior</span>
              } @else if (choice?.analytics === false) {
                <span class="status-chip disabled" role="status" i18n>Estatísticas recusadas</span>
              } @else {
                <span class="status-chip disabled" role="status" i18n>Sem escolha ainda</span>
              }
            </div>
            <p i18n>
              Mede áreas visitadas e etapas agregadas para orientar melhorias. Não envia dados da
              conta, armazém, pesquisas, nomes ou IDs de itens nem imagens. Só funciona depois do
              aceite e quando o serviço está configurado.
            </p>
            @if (privacy.optionalAvailable() && choice?.analytics === true) {
              <button type="button" class="btn revoke" (click)="privacy.save(false)" i18n>
                Desativar estatísticas
              </button>
            }
          </article>
        </div>
        <p class="privacy-link">
          <a routerLink="/cookies" i18n>Detalhes sobre cookies e armazenamento</a>
        </p>
        @if (privacy.optionalAvailable()) {
          <div class="action-row">
            <button type="button" class="btn primary" (click)="privacy.save(true)" i18n>
              Permitir estatísticas
            </button>
            <button type="button" class="btn" (click)="privacy.save(false)" i18n>
              Recusar estatísticas
            </button>
            <button class="btn subtle" (click)="personalize()" i18n>Personalizar</button>
            @if (privacy.open()) {
              <button type="button" class="btn subtle" (click)="close()" i18n>
                Fechar preferências
              </button>
            }
          </div>
          @if (customize) {
            <div class="customize-panel">
              <label class="check-row">
                <input
                  type="checkbox"
                  [checked]="analytics"
                  (change)="analytics = $any($event.target).checked"
                />
                <span>
                  <strong i18n>Permitir estatísticas opcionais</strong>
                  <small i18n>Você pode desativar novamente nas preferências de privacidade.</small>
                </span>
              </label>
              <button type="button" class="btn primary" (click)="privacy.save(analytics)" i18n>
                Salvar escolha
              </button>
            </div>
          }
        } @else {
          <p class="availability-note" role="status" i18n>
            Estatísticas de uso estão indisponíveis neste ambiente. Nenhum evento de estatísticas
            será enviado, mesmo que você tenha autorizado anteriormente.
          </p>
          @if (choice?.analytics === true) {
            <button type="button" class="btn" (click)="privacy.save(false)" i18n>
              Revogar escolha anterior
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
