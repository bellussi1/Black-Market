import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { publicContact } from '@bdo/shared';

import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/privacy.service';
import { legalDocuments } from './legal-content';
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="tool-page legal-page">
      <header class="tool-heading">
        <p class="tool-kicker">BLACK MARKET</p>
        <h1>{{ document().title }}</h1>
        <p>{{ document().intro }}</p>
      </header>
      @for (section of document().sections; track section.title) {
        <section class="panel">
          <h2>{{ section.title }}</h2>
          @for (paragraph of section.paragraphs; track $index) {
            <p>{{ paragraph }}</p>
          }
        </section>
      }
      <section class="panel">
        <h2 i18n>Responsável e contato</h2>
        @if (config().controllerName) {
          <p>{{ config().controllerName }}</p>
        } @else {
          <p i18n>Identificação do responsável ainda não publicada.</p>
        }
        @if (config().contactEmail; as email) {
          <a [href]="'mailto:' + email">{{ email }}</a>
        } @else {
          <p i18n>Canal público de contato ainda não configurado.</p>
        }
        <button class="btn subtle" (click)="privacy.open.set(true)" i18n>
          Alterar preferências de privacidade
        </button>
      </section>
      <nav aria-label="Informações institucionais" i18n-aria-label>
        <a routerLink="/termos" i18n>Termos</a> ·
        <a routerLink="/privacidade" i18n>Privacidade</a> ·
        <a routerLink="/cookies" i18n>Cookies</a> · <a routerLink="/contato" i18n>Contato</a>
      </nav>
    </article>
  `,
  styles: `
    .legal-page {
      max-width: 900px;
    }
    .legal-page p {
      line-height: 1.75;
      max-width: 75ch;
    }
    .legal-page nav {
      padding-block: 24px;
    }
    .legal-page nav a {
      display: inline-block;
      min-height: 44px;
      padding: 10px;
    }
    .legal-page h2 {
      font: 400 28px var(--bm-font-display);
    }
  `,
})
export class LegalPage {
  readonly privacy = inject(PrivacyService);
  readonly document = signal(legalDocuments['terms']);
  readonly config = signal<{ contactEmail: string | null; controllerName: string | null }>({
    ...publicContact,
  });
  constructor() {
    inject(ActivatedRoute)
      .data.pipe(takeUntilDestroyed())
      .subscribe((data) =>
        this.document.set(legalDocuments[String(data['legal'])] ?? legalDocuments['terms']),
      );
    inject(HttpClient)
      .get<{ contactEmail: string | null; controllerName: string | null }>(
        environment.apiBaseUrl + '/api/v1/platform/config',
      )
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (value) => this.config.set(value), error: () => undefined });
  }
}
