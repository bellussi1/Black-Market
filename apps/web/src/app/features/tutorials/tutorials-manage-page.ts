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
import {
  isTutorialAnchorForScreen,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
  type TutorialGuide,
  type TutorialGuideStepInput,
  type TutorialGuideUpdateRequest,
  type TutorialScreenKey,
} from '@bdo/shared';

import { IdentityService } from '../../core/identity.service';
import { TutorialApiService } from '../../core/tutorial-api.service';

const MARKUP =
  /<\/?[a-z!][^>]*>|\[[^\]]+\]\([^)]+\)|(?:^|\s)#{1,6}\s|```|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?:^|\s)\*[^*]+\*(?=\s|$|[.,!?])|(?:^|\s)_[^_]+_(?=\s|$|[.,!?])|~~[^~]+~~|(?:^|\n)\s*(?:>\s|[-+*]\s|\d+[.)]\s)/i;
const ANCHOR_LABELS: Record<string, string> = {
  'home.main-actions': $localize`Atalhos principais`,
  'home.lifeskill-entry': $localize`Acesso a profissões`,
  'roadmap.progress': $localize`Progresso do Roadmap`,
  'roadmap.feature-cards': $localize`Recursos do Roadmap`,
  'market.search': $localize`Busca de itens`,
  'market.filters': $localize`Filtros de mercado`,
  'market.results': $localize`Resultados do mercado`,
  'market-quote.search': $localize`Busca para cotação`,
  'market-quote.quote-panel': $localize`Painel de cotação`,
  'market-calculator.inputs': $localize`Entradas da venda`,
  'market-calculator.result': $localize`Resultado líquido`,
  'market-saved.list': $localize`Cotações salvas`,
  'market-saved.actions': $localize`Ações das cotações`,
  'market-item.summary': $localize`Resumo do item`,
  'market-item.details': $localize`Dados do catálogo`,
  'recipes.search': $localize`Busca de receitas`,
  'recipes.catalogue': $localize`Catálogo de receitas`,
  'recipes.methods': $localize`Fórmulas de produção`,
  'recipes.tree': $localize`Árvore de receitas`,
  'recipe-workshop.batch-mastery': $localize`Lote e maestria`,
  'recipe-workshop.financial': $localize`Resultado financeiro`,
  'recipe-workshop.strategy': $localize`Estratégia e otimizador`,
  'recipe-workshop.materials-returns': $localize`Materiais e retornos`,
  'scans.capture': $localize`Envio de captura`,
  'scans.review': $localize`Revisão da captura`,
  'storage.items': $localize`Itens do armazém`,
  'storage.projects': $localize`Projetos de produção`,
  'recommendations.conditions': $localize`Preferências de atividades`,
  'recommendations.ranking': $localize`Ranking de atividades`,
  'crafting-workshop.recipe': $localize`Produto da oficina`,
  'crafting-workshop.settings': $localize`Configurações da receita`,
  'crafting-workshop.result': $localize`Plano de produção`,
  'crafting-manual.recipe': $localize`Produto da simulação`,
  'crafting-manual.settings': $localize`Premissas da simulação`,
  'crafting-library.catalogue': $localize`Biblioteca de receitas`,
  'crafting-library.search': $localize`Busca na biblioteca`,
};
const empty = (): TutorialGuideUpdateRequest => ({
  expectedUpdatedAt: null,
  enabled: false,
  steps: [],
});
@Component({
  selector: 'app-tutorials-manage-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './tutorials-manage-page.html',
  styleUrl: './tutorials-manage-page.scss',
})
export class TutorialsManagePage implements OnInit {
  readonly identity = inject(IdentityService);
  private readonly api = inject(TutorialApiService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly screens = TUTORIAL_SCREEN_REGISTRY;
  readonly locales = TUTORIAL_LOCALES;
  readonly screenKey = signal<TutorialScreenKey>('market');
  readonly authorized = signal(false);
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly serverErrors = signal<Record<string, string>>({});
  private readonly drafts = signal<Partial<Record<TutorialScreenKey, TutorialGuideUpdateRequest>>>(
    {},
  );
  private readonly baselines = signal<Partial<Record<TutorialScreenKey, string>>>({});
  readonly draft = computed(() => this.drafts()[this.screenKey()] ?? empty());
  readonly dirty = computed(
    () => JSON.stringify(this.draft()) !== this.baselines()[this.screenKey()],
  );
  readonly validation = computed(() => {
    const errors: Record<string, string> = {};
    const steps = this.draft().steps;
    if (steps.length < 1 || steps.length > 8)
      errors['steps'] = $localize`Use de uma a oito etapas.`;
    steps.forEach((step, index) => {
      if (step.anchorKey !== null && !isTutorialAnchorForScreen(this.screenKey(), step.anchorKey))
        errors[`steps.${index}.anchorKey`] =
          $localize`Selecione uma âncora válida ou uma etapa geral.`;
      for (const field of ['title', 'body'] as const) {
        const value = step[field].trim();
        const limit = field === 'title' ? 100 : 360;
        if (!value || value.length > limit || MARKUP.test(value))
          errors[`steps.${index}.${field}`] =
            $localize`Use texto simples, preenchido e dentro do limite de caracteres.`;
      }
    });
    return errors;
  });
  readonly valid = computed(() => Object.keys(this.validation()).length === 0);
  ngOnInit(): void {
    void this.initialize();
  }
  async initialize(): Promise<void> {
    if (!this.browser) return;
    try {
      await this.identity.initialize();
      this.authorized.set(this.identity.canManageRoadmap());
      if (this.authorized()) await this.load();
      else this.loading.set(false);
    } catch {
      this.error.set($localize`Não foi possível verificar o acesso. Tente novamente.`);
      this.loading.set(false);
    }
  }
  screenLabel(key: TutorialScreenKey): string {
    return this.screens.find((screen) => screen.screenKey === key)?.label ?? key;
  }
  anchorLabel(key: string): string {
    if (ANCHOR_LABELS[key]) return ANCHOR_LABELS[key];
    return this.anchors().some((anchor) => anchor.key === key)
      ? key.slice(key.indexOf('.') + 1).replaceAll('-', ' ')
      : $localize`Âncora removida`;
  }
  anchors() {
    return this.screens.find((screen) => screen.screenKey === this.screenKey())?.anchors ?? [];
  }
  invalidAnchor(key: string | null): boolean {
    return key !== null && !isTutorialAnchorForScreen(this.screenKey(), key);
  }
  async load(): Promise<void> {
    if (!this.authorized() || this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.getManagement();
      const drafts: Partial<Record<TutorialScreenKey, TutorialGuideUpdateRequest>> = {};
      const baselines: Partial<Record<TutorialScreenKey, string>> = {};
      for (const screen of this.screens) {
        const guide = result.guides.find(
          (guide) => guide.screenKey === screen.screenKey && guide.locale === 'pt-BR',
        );
        const draft = guide ? this.fromGuide(guide) : empty();
        drafts[screen.screenKey] = draft;
        baselines[screen.screenKey] = JSON.stringify(draft);
      }
      this.drafts.set(drafts);
      this.baselines.set(baselines);
      this.loaded.set(true);
      this.serverErrors.set({});
    } catch {
      this.error.set(
        $localize`Não foi possível carregar os tutoriais. Seu rascunho foi preservado.`,
      );
    } finally {
      this.loading.set(false);
    }
  }
  selectScreen(key: TutorialScreenKey): void {
    this.screenKey.set(key);
    this.serverErrors.set({});
    this.error.set('');
    this.message.set('');
  }
  private update(draft: TutorialGuideUpdateRequest): void {
    this.drafts.update((current) => ({ ...current, [this.screenKey()]: draft }));
    this.serverErrors.set({});
    this.message.set('');
  }
  setEnabled(enabled: boolean): void {
    this.update({ ...this.draft(), enabled });
  }
  patchStep(index: number, field: 'title' | 'body' | 'anchorKey', value: string | null): void {
    this.update({
      ...this.draft(),
      steps: this.draft().steps.map((step, at) =>
        at === index ? { ...step, [field]: value } : step,
      ),
    });
  }
  addStep(): void {
    if (this.draft().steps.length >= 8) return;
    this.update({
      ...this.draft(),
      steps: [
        ...this.draft().steps,
        { sortOrder: this.draft().steps.length, anchorKey: null, title: '', body: '' },
      ],
    });
  }
  removeStep(index: number): void {
    this.setSteps(this.draft().steps.filter((_, at) => at !== index));
  }
  moveStep(index: number, direction: 1 | -1): void {
    const steps = [...this.draft().steps],
      next = index + direction;
    if (next < 0 || next >= steps.length) return;
    [steps[index], steps[next]] = [steps[next], steps[index]];
    this.setSteps(steps);
  }
  private setSteps(steps: TutorialGuideStepInput[]): void {
    this.update({
      ...this.draft(),
      steps: steps.map((step, index) => ({ ...step, sortOrder: index })),
    });
  }
  fieldError(index: number, field: string): string {
    const key = `steps.${index}.${field}`;
    return this.serverErrors()[key] ?? this.validation()[key] ?? '';
  }
  async save(): Promise<void> {
    if (!this.authorized() || this.saving() || !this.valid() || !this.loaded()) return;
    const key = this.screenKey(),
      draft = this.draft();
    this.saving.set(true);
    this.error.set('');
    try {
      const guide = await this.api.replace(key, 'pt-BR', draft);
      const saved = this.fromGuide(guide);
      this.drafts.update((current) => ({ ...current, [key]: saved }));
      this.baselines.update((current) => ({ ...current, [key]: JSON.stringify(saved) }));
      this.serverErrors.set({});
      this.message.set($localize`Tutorial salvo.`);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409)
        this.error.set(
          $localize`Outra pessoa alterou este tutorial. Seu rascunho foi preservado. Recarregue a versão salva antes de editar novamente.`,
        );
      else {
        this.error.set($localize`Não foi possível salvar. Seu rascunho foi preservado.`);
        if (error instanceof HttpErrorResponse && Array.isArray(error.error?.issues)) {
          const errors: Record<string, string> = {};
          for (const issue of error.error.issues) {
            if (Array.isArray(issue.path) && typeof issue.message === 'string')
              errors[issue.path.join('.')] = issue.message;
          }
          this.serverErrors.set(errors);
        }
      }
    } finally {
      this.saving.set(false);
    }
  }
  private fromGuide(guide: TutorialGuide): TutorialGuideUpdateRequest {
    return {
      expectedUpdatedAt: guide.updatedAt,
      enabled: guide.enabled,
      steps: [...guide.steps]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ sortOrder, anchorKey, title, body }) => ({ sortOrder, anchorKey, title, body })),
    };
  }
}
