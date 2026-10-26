# Recipe Plan Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the active recipe chain in the sidebar while keeping aggregate quantities accurate and sub-recipe profit/hour in one comparison area.

**Architecture:** A pure hierarchy builder combines normalized production recipes, the active planner steps, catalog item parts, and aggregated material rows. The sidebar recursively renders planned children as interactive rows and inactive recipe children as read-only per-operation references; repeated item IDs point to the single canonical aggregate row. Profit/hour is rendered only in the result comparison.

**Tech Stack:** Angular 22, TypeScript, Vitest, pnpm workspace.

**Spec:** [Recipe plan hierarchy research and design](../../research/recipe-plan-hierarchy-2026-10-26.md)

## Global Constraints

- Preserve the existing eight dirty recipe-tree files and unrelated changes within them.
- Keep source choices and stock aggregation keyed by `itemId`; do not calculate prices, yields, or stock in the presentation layer.
- For inactive recipe references, show per-operation input quantities and clearly mark that those inputs are excluded while the parent is bought.
- Render aggregate plan quantity once per item; repeated occurrences must not add controls or duplicate totals.
- Reuse BDO tokens, current source selectors, and existing return-product behavior.
- Keep competitor snapshots out of product calculations.

## Review Focus

- Same item appears directly and under more than one sub-recipe; total appears once and other occurrences reference it.
- A bought sub-recipe expands without implying its preview materials are part of the current purchase/cost plan.
- A produced sub-recipe with missing yield or missing recipe does not show fabricated child totals.
- Cycles, repeated item IDs, and recipes deeper than the planner limit do not recurse indefinitely.
- Keyboard disclosure state, item selection, and source controls remain correctly associated after expansion.

## Files and Responsibilities

- `apps/web/src/app/shared/recipe-tree/recipe-plan-hierarchy.ts`: pure hierarchy projection from normalized recipes and planner output.
- `apps/web/src/app/shared/recipe-tree/recipe-plan-hierarchy.spec.ts`: exact nesting, active/reference, duplicate, and cycle coverage.
- `apps/web/src/app/shared/recipe-tree/recipe-materials-sidebar.ts`: disclosure state and event bridge for recursive plan nodes.
- `apps/web/src/app/shared/recipe-tree/recipe-materials-sidebar.html` / `.scss`: recursive sidebar hierarchy and compact reference rows.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.ts` / `.html`: supply current hierarchy and render the single sub-recipe comparison.
- `apps/web/src/app/shared/recipe-tree/recipe-branch.ts` / `.html` and `recipe-graph.ts` / `.html`: remove repeated sub-recipe profit/hour badges.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`: integration behavior for expansion, source changes, and unique comparison placement.
- `docs/README.md`: add the focused research/spec link to the source map.
- `docs/design-system/bdo-ui.md`: document the approved hierarchy and single comparison placement.
- `docs/ACTIVE_CONTEXT.md`: replace the current handoff summary after completion.

## Interfaces

`buildRecipePlanHierarchy<TMaterial extends { itemId: number; name: string; iconUrl: string | null }>(input: RecipePlanHierarchyInput<TMaterial>): RecipePlanHierarchy<TMaterial>` accepts `rootRecipe: ProductionRecipe`, `producerRecipes: readonly ProductionRecipe[]`, `plan: Pick<ProductionPlan, 'steps' | 'recipeChoices'> | null`, `materials: readonly TMaterial[]`, `parts: ReadonlyMap<number, CatalogRecipePart>`, and `productQuantity: number | null`. It returns `{ product: { itemId, name, iconUrl, quantity }, materials: readonly RecipePlanNode<TMaterial>[] }`. Each node contains `key`, `itemId`, `part`, `material: TMaterial | null`, `displayQuantity: number | null`, `quantityMode: 'planned' | 'reference' | 'pending'`, `referenceKey: string | null`, `planned: boolean`, `producerRecipe: ProductionRecipe | null`, and recursive `children`. Planned child totals come from the one aggregated material row; inactive branches use normalized per-operation input quantity. Repeated IDs return a reference node to the canonical row. Traversal stops at cycles and depth 12.

Before Task 1, commit only the spec and this plan as `docs(recipes): specify hierarchical recipe plan`. For code tasks, commit each completed task under one responsibility: `feat(recipes): build recipe plan hierarchy`, `feat(recipes): render nested recipe plan`, `fix(recipes): centralize sub-recipe profit comparison`, and `docs(recipes): document hierarchical recipe plan`. Never stage the existing unrelated dirty hunks.

## Tasks

### 1. Prove hierarchy projection behavior with failing tests

- [ ] Add `buildRecipePlanHierarchy` tests for direct inputs, produced nested inputs using aggregate plan quantities, bought sub-recipes showing per-operation reference quantities, duplicate item IDs pointing to one canonical row, and cycle/depth protection.
- [ ] Run `pnpm --filter @bdo/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-plan-hierarchy.spec.ts`; confirm failures are missing builder behavior, not test setup errors.

### 2. Implement the pure hierarchy projection

- [ ] Implement `RecipePlanHierarchyInput`, recursive node/result types, and `buildRecipePlanHierarchy` in `recipe-plan-hierarchy.ts`.
- [ ] Run the helper spec and require all assertions to pass without modifying planner calculation rules.
- [ ] Commit the helper and its tests as `feat(recipes): build recipe plan hierarchy`.

### 3. Render the recursive sidebar plan

- [ ] Replace the flat material loop with product context plus recursive nodes; active rows keep current selection, price, stock, and source events; inactive children are read-only per-operation references.
- [ ] Add path-stable expand/collapse buttons with `aria-expanded` and `aria-controls`; handle repeated-item references without duplicate totals/actions.
- [ ] Update integration tests for 1407-style nested production, source-toggle synchronization, collapsed/open state, and pending calculations.
- [ ] Commit the sidebar hierarchy as `feat(recipes): render nested recipe plan`.

### 4. Keep sub-recipe profit/hour in one place

- [ ] Restore a compact, initially collapsed comparison disclosure in `Resultado da receita`, using `subRecipeComparisons()` and existing summary values.
- [ ] Remove sub-recipe profit/hour markup and unused input plumbing from the sidebar, graph nodes, and expandable steps.
- [ ] Update tests to assert the comparison exists once and repeated badges are absent.
- [ ] Commit the single comparison placement as `fix(recipes): centralize sub-recipe profit comparison`.

### 5. Record design and verify the complete change

- [ ] Add the research document to `docs/README.md`, update the BDO UI catalog, and replace `docs/ACTIVE_CONTEXT.md` with the new state and evidence link.
- [ ] Run focused specs, `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm test:ssr` as required for the Angular UI change.
- [ ] Inspect the diff and browser evidence for `/recipes/items/1407`, including expanded and collapsed branches and a narrow viewport; preserve unrelated dirty work and report any pre-existing failures.
- [ ] Commit the docs and handoff updates as `docs(recipes): document hierarchical recipe plan`.
