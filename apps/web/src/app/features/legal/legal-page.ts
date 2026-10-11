import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { publicContact } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';

import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/privacy.service';
import { legalDocuments, legalUpdatedOn } from './legal-content';
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCard, HlmButton, RouterLink, RouterLinkActive],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
})
export class LegalPage {
  readonly updatedOn = legalUpdatedOn;
  readonly updatedLabel = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(legalUpdatedOn + 'T00:00:00Z'));
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
