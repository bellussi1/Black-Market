# Otimizador exato de produção e origem dos materiais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` after the user approves Native execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calcular e aplicar a melhor combinação de compra e produção para a fórmula selecionada, com lucro por hora, tempo e maestria transparentes.

**Architecture:** Substituir a enumeração binária limitada por uma busca exata de estados alcançáveis. Podar somente quando um limite superior provar que uma ramificação não pode superar o melhor resultado completo; não usar custo/tempo Pareto isoladamente para lucro/hora. Criar um adaptador entre o grafo Angular e `planProduction()`, e representar as escolhas por material com caixas individuais.

**Tech Stack:** TypeScript, `@bdo/calculators`, Angular signals/RxJS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-recipe-market-autoresolver-design.md`

## Global Constraints

- Avaliar apenas a fórmula atualmente selecionada; não procurar automaticamente entre as 12 fórmulas do produto 1407.
- O limite de segurança excedido ou dados necessários ausentes resultam em estado incompleto, nunca em um ótimo parcial anunciado como definitivo.
- Lucro em prata usa aritmética inteira; o desempate é determinístico e minimiza desembolso.
- A maestria é override local, debounce exato de 250 ms; rendimento fixo permanece fixo e rendimento variável deve ser identificado como estimativa.
- Rendimento estimado entra automaticamente no cálculo, sem ação/botão de confirmação. Ajuste manual é opcional e fica no modo avançado.
- A análise do produto final é para venda: estoque zerado não sugere que produzir é a única forma de obter o item; disponibilidade permanece separada da receita de venda e do lucro.
- Sem tempo útil para todos os métodos escolhidos, não exibir lucro/hora como completo.
- Não alterar o perfil salvo, não adicionar dependências, sem emojis.
- Executar após `2026-10-10-recipe-market-cache.md`, no mesmo branch `codex/recipe-market-autoresolver`.

## Estado implementado — 16/10/2026

O código atual usa `maxOptimizationStates` com default **10.000** e teto rígido de **10.000** estados. A proposta anterior abaixo de 100.000 default/1.000.000 teto e 250.000 no adaptador era planejamento e não corresponde ao produto implementado. O adaptador da árvore não substitui o limite. Ao alcançar o orçamento, o resultado fica incompleto e não certifica um ótimo. A otimização é exata para as escolhas de receita e materiais alcançáveis no grafo selecionado; não pesquisa fórmulas alternativas de todo o catálogo.

Em 16/10/2026, a entrada do Worker foi corrigida para carregar estimativas confirmadas de coleta de todo item alcançável, mesmo quando aquele item também pode ser produzido. A spec da árvore verifica que a estimativa permanece no payload e a spec do solver verifica que coletar pode superar comprar/produzir. Escolhas manuais seguem preservadas.

## Review Focus

- Lucro negativo: dominância de custo/tempo simples pode inverter a melhor taxa; teste contra uma enumeração exaustiva pequena.
- Recursos compartilhados entre ramos e sobras de lotes: estados equivalentes precisam incluir demanda, estoque livre, produção excedente e dimensões que afetem viabilidade; teste com DAG compartilhado.
- Limite alcançado depois de encontrar um candidato: não classificar candidato parcial como ótimo; teste de `optimization-limit`.
- Cotação ausente/vencida ou tempo não calibrado: manter cenário incompleto e sem taxa horária definitiva; testes do adaptador/planner.
- Toggle manual após recomendação: recálculo deve invalidar a recomendação aplicada e respeitar as escolhas; teste de componente.

---

### Task 1: Busca exata com poda por limite superior comprovado

**Files:**

- Modify: `packages/calculators/src/production-planner.ts`
- Test: `packages/calculators/src/production-planner.spec.ts`

**Interfaces:**

- Keep `planProduction(input: ProductionPlannerInput): ProductionPlannerResult` and the existing ranked/incomplete result shape.
- Current implementation: `maxOptimizationStates?: number`, default and hard cap 10,000 visited states. Do not read the earlier 100,000/1,000,000/250,000 values in older planning notes as runtime limits.
- Extend `ProductionChoice` with `gather` and `ProductionPlannerInput` with `gatheringEstimates?: Record<number, ProductionEstimate>`; estimated gathering is a virtual step, while missing yield/time produces an incomplete plan.
- Add an internal `OptimizationSearchResult` carrying `best`, `bestPending`, `visitedStates`, `prunedStates`, and `complete`.
- A returned optimum is ranked only when every branch is evaluated or removed by a proof-safe dominance rule. On budget exhaustion, set `optimization-limit`, null out `profit` and `profitPerHour`, and put the candidate in `incomplete`.

- [x] **Step 1: Add failing tests for the search safety contract**

Tests cover the exhaustive small-graph oracle, negative profit, shared stock/surplus, state-limit safety, explicit gathering estimates, the 38-producer chain, the selected Edania topology snapshot, safe rate pruning, and the byproduct guard.

- [x] **Step 2: Run the planner tests and confirm the new assertions fail**

Run: `pnpm --filter @bdo/calculators exec vitest run src/production-planner.spec.ts`
Expected: the new search contract tests fail against branch-count enumeration.

- [x] **Step 3: Implement canonical state search and conservative pruning**

Expand buy/produce/gather choices deterministically. Exact duplicate choice states are discarded. For additional pruning, evaluate a partial state with unresolved sources set to buy; when no subproduct is configured for sale and root revenue plus a positive lower bound on duration are known, use root net revenue as a profit ceiling and the partial duration as a time floor. Prune only if integer cross-multiplication proves the best complete rate is strictly greater than that upper bound. This remains safe with negative profits and preserves ties. If sale-valued byproducts or required bound inputs are present/missing, keep searching. Gathering remains virtual only with explicit yield and time. Stop at `maxOptimizationStates`; never rank a partial result.

- [x] **Step 4: Verify against the exhaustive small-graph oracle and Edania fixture**

Run: `pnpm --filter @bdo/calculators exec vitest run src/production-planner.spec.ts`
Expected: the small graph matches exhaustive enumeration; the synthetic chain and a versioned snapshot of the selected SA/PT Edania graph topology complete within the configured budget. Fixture costs, quantities, yields and times are synthetic. The completion status certifies no unvisited, unpruned branch remains.

- [x] **Step 5: Commit the planner algorithm**

```bash
git add packages/calculators/src/production-planner.ts packages/calculators/src/production-planner.spec.ts
git commit -m "feat(calculators): prune production search with safe rate bounds"
```

### Task 2: Build planner input from the selected recipe graph

**Files:**

- Create: `apps/web/src/app/shared/recipe-tree/recipe-production-adapter.ts`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-production-adapter.spec.ts`
- Modify if needed: `apps/web/src/app/shared/recipe-tree/recipe-tree-model.ts`

**Interfaces:**

- Add `buildRecipeProductionInput(graph: RecipeProductionGraph, operations: number, workspace: Workspace, quotes: ReadonlyMap<number, MarketItemQuote>, methodTimes: ReadonlyMap<string, number>, gatherEstimates: ReadonlyMap<number, ProductionEstimate>, sourceOverrides: ReadonlyMap<number, ProductionChoice>, now: Date): ProductionPlannerInput`.
- Consume the `RecipeProductionGraph` contract created by the preceding quote/cache plan.
- The adapter maps the graph's selected producer methods, market freshness/availability, free inventory after reservations, tax settings, fixed/estimated yields, explicit gather estimates and manual source overrides into the planner contract.
- Unknown method time or required quote remains absent and must make the planner result incomplete; no default time or price is synthesized.
- For unexpanded intermediate items, use the stable default producer selected by `resolveRecipeProductionGraph`; do not claim the optimizer compared alternative recipe methods.

- [x] **Step 1: Add failing adapter tests**

Test `maps the selected root and reachable producers`, `excludes reserved inventory`, `maps manual source overrides`, `keeps fixed Edania yields fixed`, `marks variable yields as estimates`, `maps explicit gather yield and time`, and `does not invent missing quote, gather yield or craft time`.

- [x] **Step 2: Run the focused adapter test and confirm it fails before implementation**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-production-adapter.spec.ts`
Expected: the module and mapping assertions fail.

- [x] **Step 3: Implement the typed adapter**

Map only the `RecipeProductionGraph`, translate quote `observedAt`/availability, map source overrides to planner choices, and supply time/yield estimates from explicitly available inputs. Preserve exact recipe keys and item IDs; never create a zero-time gathering estimate.

- [x] **Step 4: Run the focused adapter test**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-production-adapter.spec.ts`
Expected: adapter mapping tests pass.

- [x] **Step 5: Commit the adapter**

```bash
git add apps/web/src/app/shared/recipe-tree/recipe-production-adapter.ts apps/web/src/app/shared/recipe-tree/recipe-production-adapter.spec.ts apps/web/src/app/shared/recipe-tree/recipe-tree-model.ts
git commit -m "feat(crafting): map recipe graph to production planner"
```

### Task 3: Method time and gathering calibration

**Files:**

- Modify: `apps/web/src/app/shared/recipe-tree/recipe-session.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.html`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-session.spec.ts`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`

**Interfaces:**

- Extend `RecipeSession` with optional `methodTimes?: Record<string, number>` and `gatherEstimates?: Record<number, ProductionEstimate>` so existing in-memory sessions still load.
- Add `setMethodTime(method: string, seconds: number | null): void` and `setGatherEstimate(itemId: number, expectedYield: number | null, craftSeconds: number | null): void`.
- One entered method time applies to recipes of that method in this selected graph; overrides are local to its recipe session.
- A gather estimate is usable only when `expectedYield > 0` and `craftSeconds > 0`; missing values remain absent and produce a planner issue.
- Replace the uncalibrated default `craftTimeSeconds = 1.0` with missing time until the user supplies a method time in the advanced controls. A user-set gathering estimate is marked `source: 'calibrated'`.

- [x] **Step 1: Add failing session and calibration tests**

Test `round trips method time settings`, `round trips gather yield and time`, `rejects zero or invalid calibrations`, `does not default an unknown method to one second`, and `keeps old RecipeSession values readable`.

- [x] **Step 2: Run the focused recipe session/tree tests and confirm they fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-session.spec.ts --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: the calibration and session assertions fail against the current single 1-second root value.

- [x] **Step 3: Implement explicit calibration state and advanced inputs**

Store seconds per recipe method and expected gathering yield/seconds per item in the active `RecipeSession`. Show one calibration control per method present in the selected graph. Only valid positive values enter the planner input; do not substitute defaults.

- [x] **Step 4: Run the focused recipe session/tree tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-session.spec.ts --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: calibration persistence, validation, and missing-time behavior pass.

- [x] **Step 5: Commit calibrated timing inputs**

```bash
git add apps/web/src/app/shared/recipe-tree/recipe-session.ts apps/web/src/app/shared/recipe-tree/recipe-tree.ts apps/web/src/app/shared/recipe-tree/recipe-tree.html apps/web/src/app/shared/recipe-tree/recipe-session.spec.ts apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts
git commit -m "feat(crafting): add explicit recipe time calibration"
```

### Task 4: Per-material choices, optimizer action and mastery override

**Files:**

- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.html`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.scss`
- Test: `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`

**Interfaces:**

- Add `readonly masteryOverride = signal<number | null>(null)` and `setMasteryOverride(value: number | null): void`; profile mastery remains the initial displayed value and is never mutated.
- Add `optimizeAcquisition(): void` to run the planner for `craftCount()` operations and apply the complete optimal item-source map.
- Apply estimated default yield automatically when recipe yield metadata is absent; keep manual yield adjustment only in advanced mode and remove any yield confirmation action.
- A zero-stock root quote must not render a recommendation to produce the final product as a way to obtain it. Keep availability separate from sale revenue and profit.
- Keep `toggleMaterialSource(itemId: number)` as the manual override; checked maps to production/gathering, unchecked to market purchase.
- Remove the global “Personalizado” strategy mode. Keep existing “Comprar todos” and “Coletar / Fazer tudo” as bulk checkbox actions if they still only set per-item choices.
- Derive material cost, net revenue, total time and profit/hour from the active `ProductionPlan`; the optimization button uses `scenario: 'optimized'`, while checkbox edits use the manual choices result. A result with issues remains incomplete in the economic summary.
- Manual mastery accepts an integer from 0 to 5,000. The visible value falls back to the active character's matching life skill when no override is set.

- [x] **Step 1: Add failing component tests**

Test `debounces mastery override by exactly 250ms`, `does not mutate the saved character mastery`, `applies the optimizer's complete source map`, `keeps a manual checkbox edit after optimization`, `removes the global Personalizado control`, `uses estimated default yield without a confirmation action`, `does not recommend producing a zero-stock final item as a way to obtain it`, and `does not show complete profit per hour without required data`.

- [x] **Step 2: Run the focused recipe tree tests and confirm the new assertions fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: the new mastery, optimizer, checkbox, yield-confirmation, and root-scarcity assertions fail.

- [x] **Step 3: Implement recommendation state and 250 ms mastery debounce**

Use RxJS or Angular signal effects to recalculate after 250 ms without a quote request. Initialize the override from the active character's matching life skill; fixed yield sources remain authoritative.

- [x] **Step 4: Replace the global custom mode with checkboxes and optimization action**

Render one labeled checkbox per material ID. The optimize button applies the source map only when the planner returns a complete result. Manual edits invalidate the prior recommendation and recalculate from current choices.

- [x] **Step 5: Run the focused recipe tree tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-tree.spec.ts`
Expected: the new component tests and all existing tree tests pass.

- [x] **Step 6: Commit recipe optimization controls**

```bash
git add apps/web/src/app/shared/recipe-tree/recipe-tree.ts apps/web/src/app/shared/recipe-tree/recipe-tree.html apps/web/src/app/shared/recipe-tree/recipe-tree.scss apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts
git commit -m "feat(crafting): apply optimized per-material sources"
```

### Task 5: Verify Edania recipe behavior and full checks

- [x] **Step 1: Run calculator and recipe tree suites**

Run: `pnpm --filter @bdo/calculators test && pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-tree.spec.ts --include=app/shared/recipe-tree/recipe-session.spec.ts --include=app/shared/recipe-tree/recipe-production-adapter.spec.ts`
Expected: all optimizer, adapter, calibration and component tests pass.

- [x] **Step 2: Verify `/recipes/items/1407` in the browser**

Expected: entering mastery recalculates after 250 ms, quotes are reused from the cache, the optimization button applies one complete source selection, and the result states any missing price/time or search limit.

- [x] **Step 3: Update `docs/ACTIVE_CONTEXT.md` and run repository checks**

Run: `pnpm test` and `pnpm check`.
Expected: all tests, lint, format, typecheck and build succeed; update context with exact totals and any remaining incomplete-data limits.

- [x] **Step 4: Commit documentation and verification record**

```bash
git add docs/ACTIVE_CONTEXT.md
git commit -m "docs(crafting): record exact recipe optimizer delivery"
```
