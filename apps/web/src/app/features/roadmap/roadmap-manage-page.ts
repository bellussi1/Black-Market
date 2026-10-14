import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { RoadmapEntryInput, RoadmapEntryKind } from '@bdo/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';

import { IdentityService } from '../../core/identity.service';
import { RoadmapApiService } from '../../core/roadmap-api.service';
import { ROADMAP_ICON_OPTIONS, ROADMAP_ICONS } from './roadmap-icons';

type DraftEntry = RoadmapEntryInput & { draftKey: string };
type EditorGroup = {
  kind: RoadmapEntryKind;
  kicker: string;
  title: string;
  addLabel: string;
  itemLabel: string;
  untitledLabel: string;
  orderLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  removeLabel: string;
  entries: DraftEntry[];
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-roadmap-manage-page',
  imports: [FormsModule, NgIcon, RouterLink],
  providers: [provideIcons(ROADMAP_ICONS)],
  templateUrl: './roadmap-manage-page.html',
  styleUrl: './roadmap-manage-page.scss',
})
export class RoadmapManagePage implements OnInit {
  readonly identity = inject(IdentityService);
  private readonly api = inject(RoadmapApiService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private nextKey = 0;

  readonly accessVerified = signal(false);
  readonly authorized = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly entries = signal<DraftEntry[]>([]);
  readonly updatedAt = signal<string | null>(null);
  readonly message = signal('');
  readonly error = signal('');
  readonly pendingRemoval = signal<string | null>(null);
  readonly hasChanges = signal(false);
  readonly flowEntries = computed(() => this.orderedEntries('flow'));
  readonly pillars = computed(() => this.orderedEntries('pillar'));
  readonly editorGroups = computed<EditorGroup[]>(() => [
    {
      kind: 'flow',
      kicker: $localize`SEQUÊNCIA DA EXPERIÊNCIA`,
      title: $localize`Etapas do fluxo`,
      addLabel: $localize`Adicionar etapa`,
      itemLabel: $localize`Etapa`,
      untitledLabel: $localize`Etapa sem título`,
      orderLabel: $localize`Reordenar etapa`,
      moveUpLabel: $localize`Mover para cima`,
      moveDownLabel: $localize`Mover para baixo`,
      removeLabel: $localize`Remover etapa`,
      entries: this.flowEntries(),
    },
    {
      kind: 'pillar',
      kicker: $localize`ÁREAS DO PRODUTO`,
      title: $localize`Pilares`,
      addLabel: $localize`Adicionar pilar`,
      itemLabel: $localize`Pilar`,
      untitledLabel: $localize`Pilar sem título`,
      orderLabel: $localize`Reordenar pilar`,
      moveUpLabel: $localize`Mover para cima`,
      moveDownLabel: $localize`Mover para baixo`,
      removeLabel: $localize`Remover pilar`,
      entries: this.pillars(),
    },
  ]);
  readonly iconOptions = ROADMAP_ICON_OPTIONS;

  ngOnInit() {
    void this.initialize();
  }

  private async initialize() {
    if (!this.browser) return;
    try {
      await this.identity.initialize();
      this.authorized.set(this.identity.canManageRoadmap());
      this.accessVerified.set(true);
      if (this.authorized()) await this.load();
      else this.loading.set(false);
    } catch {
      this.accessVerified.set(true);
      this.error.set('Não foi possível verificar o acesso administrativo. Tente novamente.');
      this.loading.set(false);
    }
  }

  async load() {
    if (!this.authorized()) return;
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.getManaged();
      this.entries.set(result.entries.map((entry) => ({ ...entry, draftKey: entry.id })));
      this.updatedAt.set(result.updatedAt);
      this.hasChanges.set(false);
      this.pendingRemoval.set(null);
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.authorized.set(false);
        this.error.set('Sua sessão não tem permissão para editar o Roadmap.');
      } else {
        this.error.set('Não foi possível carregar o conteúdo salvo. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  orderedEntries(kind: RoadmapEntryKind): DraftEntry[] {
    return this.entries()
      .filter((entry) => entry.kind === kind)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  addEntry(kind: RoadmapEntryKind) {
    const number = ++this.nextKey;
    const entries = this.orderedEntries(kind);
    const slugBase = kind === 'flow' ? 'nova-etapa' : 'novo-pilar';
    let slug = `${slugBase}-${number}`;
    while (this.entries().some((entry) => entry.slug === slug))
      slug = `${slugBase}-${++this.nextKey}`;
    const created: DraftEntry = {
      draftKey: `draft-${this.nextKey}`,
      slug,
      kind,
      sortOrder: entries.length,
      title: '',
      summary: '',
      description: '',
      statusLabel: null,
      icon: this.iconOptions[0] ?? 'lucideMap',
      featured: false,
      links: [],
    };
    this.entries.update((current) => [...current, created]);
    this.markChanged();
  }

  patch(draftKey: string, values: Partial<RoadmapEntryInput>) {
    this.entries.update((current) =>
      current.map((entry) => (entry.draftKey === draftKey ? { ...entry, ...values } : entry)),
    );
    this.markChanged();
  }

  changeKind(draftKey: string, kind: RoadmapEntryKind) {
    const current = this.entries();
    const entry = current.find((value) => value.draftKey === draftKey);
    if (!entry || entry.kind === kind) return;
    const nextOrder = this.orderedEntries(kind).length;
    let updated = current.map((value) =>
      value.draftKey === draftKey ? { ...value, kind, sortOrder: nextOrder } : value,
    );
    for (const groupKind of ['flow', 'pillar'] as const) {
      const ordered = updated
        .filter((value) => value.kind === groupKind)
        .sort((left, right) => left.sortOrder - right.sortOrder);
      const positions = new Map(ordered.map((value, index) => [value.draftKey, index]));
      updated = updated.map((value) =>
        value.kind === groupKind
          ? { ...value, sortOrder: positions.get(value.draftKey) ?? value.sortOrder }
          : value,
      );
    }
    this.entries.set(updated);
    this.markChanged();
  }

  patchLink(draftKey: string, index: number, values: { label?: string; path?: string }) {
    const entry = this.entries().find((value) => value.draftKey === draftKey);
    if (!entry) return;
    this.patch(draftKey, {
      links: entry.links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...values } : link,
      ),
    });
  }

  addLink(draftKey: string) {
    const entry = this.entries().find((value) => value.draftKey === draftKey);
    if (!entry || entry.links.length >= 8) return;
    this.patch(draftKey, { links: [...entry.links, { label: '', path: '' }] });
  }

  removeLink(draftKey: string, index: number) {
    const entry = this.entries().find((value) => value.draftKey === draftKey);
    if (!entry) return;
    this.patch(draftKey, { links: entry.links.filter((_, linkIndex) => linkIndex !== index) });
  }

  move(kind: RoadmapEntryKind, draftKey: string, direction: -1 | 1) {
    const reordered = this.orderedEntries(kind);
    const currentIndex = reordered.findIndex((entry) => entry.draftKey === draftKey);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= reordered.length) return;
    [reordered[currentIndex], reordered[nextIndex]] = [
      reordered[nextIndex]!,
      reordered[currentIndex]!,
    ];
    const positions = new Map(reordered.map((entry, index) => [entry.draftKey, index]));
    this.entries.update((current) =>
      current.map((entry) =>
        entry.kind === kind
          ? { ...entry, sortOrder: positions.get(entry.draftKey) ?? entry.sortOrder }
          : entry,
      ),
    );
    this.markChanged();
  }

  requestRemove(draftKey: string) {
    this.pendingRemoval.set(draftKey);
  }

  cancelRemove() {
    this.pendingRemoval.set(null);
  }

  confirmRemove(draftKey: string) {
    const entry = this.entries().find((value) => value.draftKey === draftKey);
    if (!entry) return;
    const remaining = this.orderedEntries(entry.kind).filter(
      (value) => value.draftKey !== draftKey,
    );
    const positions = new Map(remaining.map((value, index) => [value.draftKey, index]));
    this.entries.update((current) =>
      current
        .filter((value) => value.draftKey !== draftKey)
        .map((value) =>
          value.kind === entry.kind
            ? { ...value, sortOrder: positions.get(value.draftKey) ?? value.sortOrder }
            : value,
        ),
    );
    this.pendingRemoval.set(null);
    this.markChanged();
  }

  async save() {
    if (!this.authorized() || this.saving() || !this.validate()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.replace({
        expectedUpdatedAt: this.updatedAt(),
        entries: this.entries().map(({ draftKey: _draftKey, ...entry }) => entry),
      });
      this.entries.set(result.entries.map((entry) => ({ ...entry, draftKey: entry.id })));
      this.updatedAt.set(result.updatedAt);
      this.hasChanges.set(false);
      this.pendingRemoval.set(null);
      this.message.set('Roadmap salvo.');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.error.set(
          'O Roadmap foi alterado por outra pessoa. Seu rascunho foi mantido; recarregue a versão atual antes de substituir o conteúdo.',
        );
      } else if (
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403)
      ) {
        this.authorized.set(false);
        this.error.set('Sua sessão não tem permissão para salvar o Roadmap.');
      } else {
        this.error.set('Não foi possível salvar. O rascunho continua nesta tela.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  private validate(): boolean {
    const entries = this.entries();
    if (entries.length > 32) return this.reject('O Roadmap pode ter até 32 etapas e pilares.');
    const slugs = entries.map((entry) => entry.slug.trim());
    if (slugs.some((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))
      return this.reject('Revise os identificadores: use letras minúsculas, números e hífens.');
    if (new Set(slugs).size !== slugs.length)
      return this.reject('Cada etapa e pilar precisa de um identificador único.');
    for (const entry of entries) {
      if (!entry.title.trim() || !entry.summary.trim())
        return this.reject('Preencha o título e o resumo de cada etapa e pilar.');
      if (entry.title.length > 120 || entry.summary.length > 280 || entry.description.length > 1600)
        return this.reject('Há um texto acima do limite de caracteres indicado nos campos.');
      if (/<\/?[a-z][^>]*>/i.test(`${entry.title}\n${entry.summary}\n${entry.description}`))
        return this.reject('Use texto simples, sem marcação HTML.');
      if (!this.iconOptions.includes(entry.icon)) return this.reject('Escolha um ícone da lista.');
      if (entry.statusLabel && entry.statusLabel.length > 60)
        return this.reject('O estado deve ter até 60 caracteres.');
      if (entry.links.length > 8) return this.reject('Cada item pode ter até 8 links.');
      if (
        entry.links.some(
          (link) =>
            !link.label.trim() ||
            link.label.length > 80 ||
            !/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(link.path.trim()),
        )
      )
        return this.reject('Use um rótulo e um caminho interno válido em cada link.');
    }
    this.error.set('');
    return true;
  }

  private reject(message: string) {
    this.error.set(message);
    return false;
  }

  private markChanged() {
    this.hasChanges.set(true);
    this.message.set('');
    this.error.set('');
  }
}
