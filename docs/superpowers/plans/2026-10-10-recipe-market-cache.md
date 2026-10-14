# Cache de cotações da receita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` after the user approves Native execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir uma receita com os preços já guardados, atualizar cotações ausentes ou vencidas em segundo plano e manter a página atualizada enquanto estiver aberta.

**Architecture:** Estender `MarketCacheService` para servir primeiro o cache e revalidar em lotes com concorrência limitada. `RecipeTree` consulta somente os IDs do grafo da fórmula ativa, mostra a idade/estado de cada cotação e descarta respostas de contextos anteriores.

**Tech Stack:** Angular signals, RxJS, `MarketCacheService`, Vitest, `HttpTestingController`.

**Spec:** `docs/superpowers/specs/2026-10-10-recipe-market-autoresolver-design.md`

## Global Constraints

- TTL de cotações: 5 minutos; revalidação enquanto a receita estiver aberta; encerrar timer ao destruir o componente.
- Consultar somente IDs únicos do grafo ativo, com no máximo 6 requisições simultâneas; não varrer o catálogo nem ativar coletores.
- Manter cotações antigas visíveis durante falha, claramente identificadas como antigas.
- Resposta de receita, região ou dataset anterior não pode sobrescrever o contexto atual.
- Não adicionar dependências; sem emojis na interface ou logs.
- Executar este plano primeiro no branch `codex/recipe-market-autoresolver`, criado sobre `develop` no checkout atual após a aprovação dos planos.

## Review Focus

- Cache vencido com erro de rede: manter o valor anterior e identificá-lo como antigo; teste em `market-cache.service.spec.ts`.
- Lote grande: nunca ultrapassar 6 requisições simultâneas; teste com `HttpTestingController`.
- Troca rápida de receita/região: descartar a resposta anterior; teste em `recipe-tree.spec.ts`.
- Receita sem cotação de parte dos itens: exibir pendências sem transformar ausências em preço zero; teste em `recipe-tree.spec.ts`.
- Saída da rota: interromper a atualização periódica; teste com timers falsos em `recipe-tree.spec.ts`.

---

### Task 1: Revalidação de cotações cache-first

**Files:**

- Modify: `apps/web/src/app/core/market-cache.service.ts`
- Test: `apps/web/src/app/core/market-cache.service.spec.ts`

**Interfaces:**

- Keep `resolveQuotesBatch(itemIds: (number | string)[], region?: Region, forceRefresh?: boolean): Observable<Map<number, MarketItemQuote>>`.
- Add `getCachedQuoteEntry(itemId: number | string, region?: Region, subId?: number): CachedQuoteEntry | null` to expose freshness timestamps without changing the quote contract.
- A batch with cached expired entries emits those entries immediately, then emits the refreshed result; a cache-fresh batch makes no HTTP request. Failed refresh retains the last value.

- [x] **Step 1: Add failing cache behavior tests**

Add tests named `emits stale quote immediately and refreshed quote after revalidation`, `falls back to stale quotes when refresh fails`, `does not request fresh cached quotes`, and `limits batch requests to six in flight`.

- [x] **Step 2: Run the focused tests and confirm the new assertions fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/core/market-cache.service.spec.ts`
Expected: the new freshness/concurrency assertions fail; existing cache tests still compile.

- [x] **Step 3: Implement quote entry access and bounded stale-while-revalidate batches**

Implement the interfaces above using the existing TTL and cache map. Emit stale entries before refresh and cap active per-item requests at six. Preserve fresh-cache short-circuit and API error fallback.

- [x] **Step 4: Run the focused tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/core/market-cache.service.spec.ts`
Expected: all `MarketCacheService` tests pass.

- [x] **Step 5: Commit the cache behavior**

```bash
git add apps/web/src/app/core/market-cache.service.ts apps/web/src/app/core/market-cache.service.spec.ts
git commit -m "feat(market): serve stale quotes while revalidating"
```

### Task 2: Preload and refresh the active recipe graph

**Files:**

- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`
- Create: `apps/web/src/app/shared/recipe-tree/recipe-production-graph.ts`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-production-graph.spec.ts`

**Interfaces:**

- Keep `consultAllTreePrices()` as the refresh entry point; invoke it on active recipe identity changes and every TTL interval while active.
- Add `resolveRecipeProductionGraph(root: CatalogRecipe, api: CatalogApiService, selectedMethods: ReadonlyMap<number, string>, expectedDatasetVersion: string): Observable<RecipeProductionGraph>`.
- Define `RecipeProductionGraph` with `rootRecipe: CatalogRecipe`, `producerRecipes: CatalogRecipe[]`, sorted unique `itemIds: number[]`, `issues: { itemId: number; code: 'missing-producer' | 'cycle' | 'dataset-mismatch' }[]`, and `datasetVersion: string`.
- Resolve each reachable intermediate through `CatalogApiService.getItemRecipes(itemId, 'produces')` with at most 6 concurrent requests. Honor methods selected in the visible tree; when no selection exists, choose the first recipe after stable sorting by key. Do not enumerate alternate formula methods as optimizer decisions.
- Add a private quote subscription/revision guard so changing recipe, item, dataset, or region cancels or ignores the old request.
- The quote query set is `RecipeProductionGraph.itemIds`, not just currently expanded `parts()`; the 1407 Edania case should resolve its full reachable graph before quote loading.

- [x] **Step 1: Add failing graph and quote lifecycle tests**

In `recipe-production-graph.spec.ts`, test `resolves all reachable unique item IDs`, `reuses the visible selected nested method`, `chooses a stable recipe for an unselected intermediate`, `reports missing producer or cycle`, and `rejects a dataset version mismatch`. With fake timers in `recipe-tree.spec.ts`, verify selection loads the graph then quotes its IDs, a second quote refresh occurs at 5 minutes, a changed identity ignores the earlier response, and destroying the fixture prevents another refresh.

- [x] **Step 2: Run the focused tree tests and confirm the new assertions fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-production-graph.spec.ts --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: the new lifecycle assertions fail before implementation.

- [x] **Step 3: Implement the scoped refresh lifecycle**

Resolve the current graph from the selected root method, then quote its complete unique item set through the cache batch API. Update quote maps from each emitted snapshot, clear subscription/timer on identity change or component destroy, and refresh quotes every five minutes. Keep graph and quote requests independent of mastery edits.

- [x] **Step 4: Run the focused tree tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-production-graph.spec.ts --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: all graph loading and automatic quote refresh tests pass.

- [x] **Step 5: Commit the recipe refresh lifecycle**

```bash
git add apps/web/src/app/shared/recipe-tree/recipe-tree.ts apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts apps/web/src/app/shared/recipe-tree/recipe-production-graph.ts apps/web/src/app/shared/recipe-tree/recipe-production-graph.spec.ts
git commit -m "feat(crafting): refresh active recipe quotes automatically"
```

### Task 3: Show quote freshness and remove recipe quote buttons

**Files:**

- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.html`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.scss`
- Modify if needed: `apps/web/src/app/shared/recipe-tree/recipe-branch.html`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`

- [x] **Step 1: Add failing view tests for fresh, stale, and missing quote states**

Assert that stale entries include their cached age, missing entries remain pending, and no recipe action says “Consultar mercado” or “Consultar cotação atual”.

- [x] **Step 2: Run the focused tree tests and confirm the view assertions fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: stale/missing status and removed-action assertions fail.

- [x] **Step 3: Implement freshness labels and remove manual consultation affordances**

Use `CachedQuoteEntry.fetchedAt` for the status label. Preserve a retry/error state only for the automatic resolver; never replace absent quotes with zero. Keep labels and focus states accessible.

- [x] **Step 4: Run the focused tree tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: all quote state and recipe action assertions pass.

- [x] **Step 5: Commit the recipe quote UI**

```bash
git add apps/web/src/app/shared/recipe-tree/recipe-tree.ts apps/web/src/app/shared/recipe-tree/recipe-tree.html apps/web/src/app/shared/recipe-tree/recipe-tree.scss apps/web/src/app/shared/recipe-tree/recipe-branch.html apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts
git commit -m "feat(crafting): show automatic quote freshness"
```

### Task 4: Verify recipe quote resolver end to end

- [x] **Step 1: Run all web tests**

Run: `pnpm --filter @bdo/web test`
Expected: all web tests pass.

- [x] **Step 2: Verify `/recipes/items/1407` in the browser**

Expected: cached values render immediately when available, only active graph items refresh, and stale/missing states are visible without a manual quote button.

- [x] **Step 3: Record implementation evidence in `docs/ACTIVE_CONTEXT.md`**

Record the new quote lifecycle, focused tests, and any limits.

- [x] **Step 4: Commit the handoff update**

```bash
git add docs/ACTIVE_CONTEXT.md
git commit -m "docs(crafting): record recipe quote resolver"
```
