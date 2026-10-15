import { HttpErrorResponse } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  RESPONSE_INIT,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import type { Subscription } from 'rxjs';

import { ReferenceApi, type ReferenceEntry } from '../../core/reference-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { SeoService } from '../../core/seo.service';
import { LoadingSkeleton } from '../../shared/loading-skeleton/loading-skeleton';
import { BdoSelect } from '../../ui/native-select/bdo-select';
import { referenceFields } from './reference-fields';
@Component({
  selector: 'app-reference-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, HlmCard, HlmButton, BdoSelect, FormsModule, RouterLink, LoadingSkeleton],
  templateUrl: './reference-page.html',
})
export class ReferencePage implements OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly api = inject(ReferenceApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly preferences = inject(RegionPreferences);
  readonly kinds = signal<{ kind: string; label: string; total: number }[]>([]);
  readonly entries = signal<ReferenceEntry[]>([]);
  readonly selected = signal<ReferenceEntry | null>(null);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly message = signal('');
  kind = 'npcs';
  search = '';
  page = 1;
  private request?: Subscription;
  private kindRequest?: Subscription;
  private lastRegion = '';
  readonly fields = referenceFields;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (this.kind !== params.get('kind')) {
        this.page = 1;
        this.search = '';
      }
      this.kind = params.get('kind') ?? 'npcs';
      const id = params.get('id');
      if (id) this.loadDetail(id);
      else this.load();
    });
    effect(() => {
      const region = this.preferences.region();
      untracked(() => {
        if (this.lastRegion && region !== this.lastRegion) {
          this.kinds.set([]);
          this.loadKinds();
          this.page = 1;
          const id = this.route.snapshot.paramMap.get('id');
          if (id) this.loadDetail(id);
          else this.load();
        }
        this.lastRegion = region;
      });
    });
    this.loadKinds();
  }
  private loadKinds() {
    this.kindRequest?.unsubscribe();
    this.kindRequest = this.api.kinds().subscribe({
      next: (result) => this.kinds.set(result.kinds),
      error: () => this.message.set('Não foi possível carregar as categorias. Tente novamente.'),
    });
  }
  changeKind() {
    void this.router.navigate(['/reference', this.kind]);
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.message.set('');
    this.selected.set(null);
    this.request = this.api.list(this.kind, this.search, this.page).subscribe({
      next: (result) => {
        this.entries.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.entries.set([]);
        this.seo.unavailable();
        if (this.response) this.response.status = 503;
        this.message.set('Não foi possível carregar esta consulta. Tente novamente mais tarde.');
      },
    });
  }
  loadDetail(id: string) {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.message.set('');
    this.request = this.api.detail(this.kind, id).subscribe({
      next: (result) => {
        this.selected.set(result);
        this.seo.describe(
          result.name,
          'Informações e relações de ' +
            result.name.replace(/<[^>]*>/g, '') +
            ' em Black Desert Online.',
        );
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.selected.set(null);
        this.seo.unavailable();
        if (this.response)
          this.response.status =
            error instanceof HttpErrorResponse && error.status === 404 ? 404 : 503;
        this.message.set('Não encontramos este registro no catálogo da região selecionada.');
      },
    });
  }
  searchNow() {
    this.page = 1;
    this.load();
  }
  next(delta: number) {
    this.page += delta;
    this.load();
  }
  label() {
    return this.kinds().find((row) => row.kind === this.kind)?.label ?? 'Referências do jogo';
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
    this.kindRequest?.unsubscribe();
  }
}
