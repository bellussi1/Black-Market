import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CatalogItemDetail, CatalogRecipe } from '@bdo/shared';
import { forkJoin } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { silver } from '../formatters';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import { type BranchAction, RecipeBranch } from './recipe-branch';
import { type ItemSources, RecipeKnowledge } from './recipe-knowledge';
import {
  nodeFor,
  patchNode,
  planRecipeTree,
  type RecipeNode,
  withRecipe,
} from './recipe-tree-model';
@Component({
  selector: 'app-recipe-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, RecipeBranch, ItemIcon],
  templateUrl: './recipe-tree.html',
})
export class RecipeTree {
  readonly typeLabel = recipeTypeLabel;
  setRootYield(value: number | null) {
    this.patch('root', (node) => ({ ...node, yield: Number(value) || null }));
  }
  readonly recipe = input.required<CatalogRecipe>();
  readonly store = inject(WorkspaceStore);
  readonly catalog = inject(CatalogApiService);
  private readonly knowledge = inject(RecipeKnowledge);
  private readonly destroyRef = inject(DestroyRef);
  readonly root = signal<RecipeNode | null>(null);
  readonly target = signal(100);
  readonly view = signal<'tree' | 'list'>('tree');
  readonly context = signal<{
    node: RecipeNode;
    item: CatalogItemDetail;
    origins: ItemSources;
    recipes: CatalogRecipe[];
  } | null>(null);
  readonly contextLoading = signal(false);
  readonly contextMessage = signal('');
  readonly silver = silver;
  private revision = 0;
  readonly plan = computed(() => {
    const root = this.root();
    return root ? planRecipeTree(root, this.target(), this.store.data()) : null;
  });
  readonly profile = this.store.activeCharacter;
  readonly mastery = computed(() => {
    const type = this.recipe().type;
    const skill = type === 'COOK' ? 'cooking' : type === 'ALCHEMY' ? 'alchemy' : 'processing';
    return {
      skill,
      label: skill === 'cooking' ? 'Culinária' : skill === 'alchemy' ? 'Alquimia' : 'Processamento',
      value: this.profile()?.mastery[skill] ?? null,
    };
  });
  constructor() {
    effect(() => {
      const recipe = this.recipe();
      this.revision++;
      const output = recipe.outputs[0];
      this.context.set(null);
      this.contextMessage.set('');
      this.root.set(
        output
          ? withRecipe(
              nodeFor(output, 'root'),
              recipe,
              this.store.demoActive() && !output.quantity ? 2.5 : undefined,
            )
          : null,
      );
    });
  }
  patch(path: string, change: (node: RecipeNode) => RecipeNode) {
    this.root.update((root) => (root ? patchNode(root, path, change) : null));
  }
  find(path: string, node = this.root()): RecipeNode | null {
    if (!node) return null;
    if (node.path === path) return node;
    for (const child of node.children) {
      const found = this.find(path, child);
      if (found) return found;
    }
    return null;
  }
  action(event: BranchAction) {
    const node = this.find(event.path);
    if (!node) return;
    if (event.action === 'source') {
      this.showContext(node);
      return;
    }
    if (event.action === 'collapse') {
      this.patch(node.path, (n) => ({ ...n, expanded: false }));
      return;
    }
    if (event.action === 'buy') {
      this.patch(node.path, (n) => ({
        ...n,
        recipe: null,
        children: [],
        expanded: false,
        yield: null,
      }));
      return;
    }
    if (event.action === 'yield') {
      this.patch(node.path, (n) => ({ ...n, yield: Number(event.value) || null }));
      return;
    }
    if (event.action === 'quantity') {
      this.patch(node.path, (n) => ({ ...n, part: { ...n.part, quantity: String(event.value) } }));
      return;
    }
    if (event.action === 'choose') {
      const recipe = node.options.find((r) => r.key === event.value);
      if (recipe)
        this.patch(node.path, (n) =>
          withRecipe(n, recipe, this.store.demoActive() ? 2.5 : undefined),
        );
      return;
    }
    if (node.recipe) {
      this.patch(node.path, (n) => ({ ...n, expanded: true }));
      return;
    }
    const ancestry = node.path.split('/');
    let parent = this.root();
    const ids: number[] = [];
    for (let i = 1; i < ancestry.length; i++) {
      if (parent) {
        ids.push(parent.part.itemId);
        parent = parent.children[Number(ancestry[i])];
      }
    }
    if (ids.includes(node.part.itemId) || ancestry.length > 12) {
      this.patch(node.path, (n) => ({
        ...n,
        message:
          'Esta origem repetiria um item da cadeia. Escolha outro método ou compre o ingrediente.',
      }));
      return;
    }
    const revision = this.revision;
    this.patch(node.path, (n) => ({ ...n, loading: true, message: '' }));
    this.knowledge
      .produces(node.part.itemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (revision !== this.revision) return;
          this.patch(node.path, (n) => {
            const ready = {
              ...n,
              options: response.recipes,
              loading: false,
              message: response.recipes.length
                ? ''
                : 'Não há produção conhecida para este item. Consulte as outras origens.',
            };
            return response.recipes.length === 1
              ? withRecipe(ready, response.recipes[0], this.store.demoActive() ? 2.5 : undefined)
              : ready;
          });
        },
        error: () => {
          if (revision === this.revision)
            this.patch(node.path, (n) => ({
              ...n,
              loading: false,
              message: 'Não foi possível carregar as receitas deste ingrediente. Tente novamente.',
            }));
        },
      });
  }
  showContext(node: RecipeNode) {
    const revision = this.revision;
    this.contextLoading.set(true);
    this.contextMessage.set('');
    this.context.set(null);
    forkJoin({
      item: this.knowledge.item(node.part.itemId),
      origins: this.knowledge.sources(node.part.itemId),
      recipes: this.knowledge.produces(node.part.itemId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (revision !== this.revision) return;
          this.context.set({
            node,
            item: result.item.item,
            origins: result.origins,
            recipes: result.recipes.recipes,
          });
          this.contextLoading.set(false);
        },
        error: () => {
          if (revision === this.revision) {
            this.contextLoading.set(false);
            this.contextMessage.set(
              'Não foi possível consultar as origens agora. A receita continua disponível.',
            );
          }
        },
      });
  }
  quote(id: number) {
    return (
      this.store
        .data()
        .quotes.filter((q) => q.region === this.store.data().region && q.itemId === id && !q.subId)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null
    );
  }
  owned(id: number) {
    return this.store
      .data()
      .inventory.filter((r) => r.region === this.store.data().region && r.itemId === id)
      .reduce((n, r) => n + r.quantity, 0);
  }
  plain(text: string | null) {
    return text?.replace(/<[^>]*>/g, '') ?? '';
  }
}
