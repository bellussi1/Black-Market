import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  type OnInit,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  isTutorialAnchorForScreen,
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
  type TutorialGuide,
  type TutorialGuideUpdateRequest,
  type TutorialLocale,
  type TutorialScreenKey,
} from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmInput } from '@bdo/ui/input';
import { HlmTextarea } from '@bdo/ui/textarea';

import { IdentityService } from '../../core/identity.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { BdoSelect } from '../../ui/native-select/bdo-select';

type Step = TutorialGuideUpdateRequest['steps'][number];
type Draft = { enabled: boolean; steps: Step[]; updatedAt: string | null; baseline: string };
type FieldErrors = Record<string, string>;
const snapshot = (draft: Pick<Draft, 'enabled' | 'steps'>) =>
  JSON.stringify({ enabled: draft.enabled, steps: draft.steps });

@Component({
  selector: 'app-tutorials-manage-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, HlmButton, HlmInput, HlmTextarea, BdoSelect],
  templateUrl: './tutorials-manage-page.html',
  styleUrl: './tutorials-manage-page.scss',
})
export class TutorialsManagePage implements OnInit {
  readonly identity = inject(IdentityService);
  private readonly api = inject(TutorialApiService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly attempted = signal(false);
  private readonly drafts = signal<Record<string, Draft>>({});
  private readonly apiErrors = signal<FieldErrors>({});
  readonly screens = Object.values(TUTORIAL_SCREEN_REGISTRY);
  readonly locales = TUTORIAL_LOCALES;
  readonly screenKey = signal<TutorialScreenKey>('market');
  readonly locale = signal<TutorialLocale>('pt-BR');
  readonly accessVerified = signal(false);
  readonly authorized = computed(() => this.accessVerified() && this.identity.canManageRoadmap());
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly newGuideLabel = $localize`Ainda não criado`;
  readonly moveUpLabel = $localize`Mover acima o passo`;
  readonly moveDownLabel = $localize`Mover abaixo o passo`;
  readonly removeLabel = $localize`Remover o passo`;
  readonly confirmingReload = signal(false);
  private readonly draftKey = computed(() => `${this.screenKey()}:${this.locale()}`);
  private readonly draft = computed(() => this.drafts()[this.draftKey()]);
  readonly steps = computed(() => this.draft()?.steps ?? []);
  readonly enabled = computed(() => this.draft()?.enabled ?? false);
  readonly updatedAt = computed(() => this.draft()?.updatedAt ?? null);
  readonly dirty = computed(() => {
    const draft = this.draft();
    return !!draft && snapshot(draft) !== draft.baseline;
  });
  readonly anyDirty = computed(() =>
    Object.values(this.drafts()).some((draft) => snapshot(draft) !== draft.baseline),
  );
  readonly anchors = computed(() => TUTORIAL_SCREEN_REGISTRY[this.screenKey()].anchors);
  readonly errors = computed(() => ({ ...this.validate(), ...this.apiErrors() }));
  readonly valid = computed(() => Object.keys(this.errors()).length === 0);
  readonly screenLabels: Record<TutorialScreenKey, string> = {
    market: $localize`Mercado`,
    recipes: $localize`Receitas`,
    scans: $localize`Importar por print`,
    storage: $localize`Armazém`,
    recommendations: $localize`O que fazer?`,
  };
  readonly anchorLabels: Record<string, string> = {
    'market.search': $localize`Busca de itens`,
    'market.filters': $localize`Filtros do mercado`,
    'market.results': $localize`Resultados do mercado`,
    'recipes.search': $localize`Busca de receitas`,
    'recipes.methods': $localize`Métodos de obtenção`,
    'recipes.tree': $localize`Árvore de produção`,
    'scans.capture': $localize`Envio da captura`,
    'scans.review': $localize`Revisão da captura`,
    'storage.items': $localize`Itens do armazém`,
    'storage.projects': $localize`Projetos`,
    'recommendations.conditions': $localize`Condições da comparação`,
    'recommendations.ranking': $localize`Ranking de atividades`,
  };

  constructor() {
    effect(() => {
      if (this.authorized() && !this.attempted()) untracked(() => void this.load());
    });
  }

  ngOnInit() {
    void this.initialize();
  }

  async initialize() {
    if (!this.browser) return;
    this.error.set('');
    try {
      await this.identity.initialize();
      this.accessVerified.set(true);
      if (this.authorized()) await this.load();
    } catch {
      this.error.set(
        $localize`Não foi possível verificar o acesso administrativo. Tente novamente.`,
      );
    }
  }

  async load() {
    if (!this.authorized() || this.loading() || this.saving()) return;
    this.attempted.set(true);
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.getManagement();
      if (this.destroyRef.destroyed || !this.authorized()) return;
      const drafts: Record<string, Draft> = {};
      for (const screen of this.screens)
        for (const locale of this.locales) {
          const guide = result.guides.find(
            (value) => value.screenKey === screen.screenKey && value.locale === locale,
          );
          drafts[`${screen.screenKey}:${locale}`] = this.createDraft(guide);
        }
      this.drafts.set(drafts);
      this.loaded.set(true);
      this.apiErrors.set({});
      this.confirmingReload.set(false);
    } catch {
      this.error.set($localize`Não foi possível carregar os tutoriais. Tente novamente.`);
    } finally {
      this.loading.set(false);
    }
  }

  selectScreen(value: string) {
    if (!this.saving() && isTutorialScreenKey(value)) {
      this.screenKey.set(value);
      this.clearFeedback();
    }
  }
  selectLocale(value: string) {
    if (!this.saving() && this.locales.some((locale) => locale === value)) {
      this.locale.set(value as TutorialLocale);
      this.clearFeedback();
    }
  }
  setEnabled(enabled: boolean) {
    this.change({ enabled });
  }
  patchStep(index: number, values: Partial<Step>) {
    this.change({
      steps: this.steps().map((step, current) =>
        current === index ? { ...step, ...values } : step,
      ),
    });
  }
  addStep() {
    if (this.steps().length >= 8) return;
    this.change({
      steps: [
        ...this.steps(),
        { sortOrder: this.steps().length, anchorKey: null, title: '', body: '' },
      ],
    });
  }
  removeStep(index: number) {
    this.change({
      steps: this.steps()
        .filter((_, current) => current !== index)
        .map((step, sortOrder) => ({ ...step, sortOrder })),
    });
  }
  moveStep(index: number, direction: -1 | 1) {
    const steps = [...this.steps()];
    const next = index + direction;
    if (!steps[index] || !steps[next]) return;
    [steps[index], steps[next]] = [steps[next]!, steps[index]!];
    this.change({ steps: steps.map((step, sortOrder) => ({ ...step, sortOrder })) });
  }
  isValidAnchor(anchor: string | null) {
    return anchor === null || isTutorialAnchorForScreen(this.screenKey(), anchor);
  }
  fieldError(index: number, field: string) {
    return this.errors()[`steps.${index}.${field}`] ?? '';
  }

  async save() {
    // API validation remains authoritative; local validation gives immediate field feedback.
    if (
      !this.authorized() ||
      !this.loaded() ||
      this.loading() ||
      this.saving() ||
      !this.dirty() ||
      !this.valid()
    )
      return;
    const key = this.draftKey();
    const screen = this.screenKey();
    const locale = this.locale();
    const request: TutorialGuideUpdateRequest = {
      expectedUpdatedAt: this.updatedAt(),
      enabled: this.enabled(),
      steps: this.steps().map((step, sortOrder) => ({ ...step, sortOrder })),
    };
    this.saving.set(true);
    this.clearFeedback();
    try {
      const result = await this.api.replace(screen, locale, request);
      if (this.destroyRef.destroyed) return;
      this.drafts.update((current) => ({ ...current, [key]: this.createDraft(result) }));
      this.message.set($localize`Tutorial salvo.`);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.error.set(
          $localize`Outra pessoa alterou este tutorial. Seu rascunho foi mantido. Recarregue o conteúdo salvo antes de refazer a edição.`,
        );
      } else {
        if (error instanceof HttpErrorResponse && error.status === 400)
          this.applyApiErrors(error.error);
        this.error.set($localize`Não foi possível salvar. Seu rascunho continua nesta tela.`);
      }
    } finally {
      this.saving.set(false);
    }
  }

  private createDraft(guide?: TutorialGuide): Draft {
    const values = {
      enabled: guide?.enabled ?? false,
      steps: [...(guide?.steps ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ anchorKey, title, body }, sortOrder) => ({ anchorKey, title, body, sortOrder })),
    };
    return { ...values, updatedAt: guide?.updatedAt ?? null, baseline: snapshot(values) };
  }
  private change(values: Partial<Pick<Draft, 'enabled' | 'steps'>>) {
    const key = this.draftKey();
    const draft = this.draft();
    if (!draft || !this.authorized() || this.saving() || this.loading()) return;
    this.drafts.update((current) => ({ ...current, [key]: { ...draft, ...values } }));
    this.clearFeedback();
  }
  private clearFeedback() {
    this.error.set('');
    this.message.set('');
    this.apiErrors.set({});
    this.confirmingReload.set(false);
  }
  private validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (this.steps().length < 1 || this.steps().length > 8)
      errors['steps'] = $localize`Use de 1 a 8 passos.`;
    this.steps().forEach((step, index) => {
      for (const [field, limit] of [
        ['title', 100],
        ['body', 360],
      ] as const) {
        const text = step[field].trim();
        if (!text || text.length > limit)
          errors[`steps.${index}.${field}`] =
            field === 'title'
              ? $localize`Informe um título de 1 a 100 caracteres.`
              : $localize`Informe um texto de 1 a 360 caracteres.`;
      }
      if (!this.isValidAnchor(step.anchorKey))
        errors[`steps.${index}.anchorKey`] =
          $localize`Escolha uma âncora disponível ou uma etapa geral.`;
    });
    return errors;
  }
  private applyApiErrors(payload: unknown) {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('issues' in payload) ||
      !Array.isArray(payload.issues)
    )
      return;
    const fields: FieldErrors = {};
    for (const issue of payload.issues) {
      if (!issue || !Array.isArray(issue.path) || typeof issue.message !== 'string') continue;
      const path = issue.path.join('.');
      if (path === 'steps' || /^steps\.\d+\.(title|body|anchorKey)$/.test(path))
        fields[path] = issue.message;
    }
    this.apiErrors.set(fields);
  }
}
