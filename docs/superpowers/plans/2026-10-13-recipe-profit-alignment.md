# Recipe Profit Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Align expected recipe revenue with BDOlytics for four requested BDO recipes at 3,000 mastery, including sell/keep choices for returns.

**Architecture:** Keep mastery and weighted bonus yields in focused recipe helpers; adapt all expected outputs into the existing production planner by item ID. Load catalog names/icons for bonus items and present the large random alchemy pool in a collapsed UI group with independent sale choices.

**Tech Stack:** TypeScript, Angular signals/templates, Vitest, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-10-13-recipe-profit-alignment.md`

## Global Constraints

- Preserve existing market/NPC quote rules and in-memory quote cache.
- Do not alter the user's default mastery; use 3,000 for validation.
- Show a temporary simulation input for each active variable-yield profession (Cooking, Alchemy, Processing); never write it into the saved character profile.
- Keep unpriced required ingredients unresolved; do not invent market values.
- Commit cohesive changes atomically with explicit paths.

## Review Focus

- Repeated return item IDs must aggregate without double-counting: adapter and planner test.
- Mastery bracket boundaries and >3,000 values must use the lower bracket/clamp: mastery test.
- Unpriced returns must not become assumed revenue: adapter test.
- Missing required inputs must keep profit inconclusive: four-recipe live validation.
- Generic bonus list must remain usable and accessible: UI spec/DOM test.

### Task 1: Expected alchemy and special meal returns

**Files:**

- Modify: `apps/web/src/app/shared/recipe-tree/recipe-mastery.ts`
- Create: `apps/web/src/app/shared/recipe-tree/recipe-alchemy-extra-items.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-production-adapter.ts`
- Test: `recipe-mastery-catalog.spec.ts`, `recipe-production-adapter.spec.ts`

**Interfaces:** expose exact mastery chance/yield helpers and weighted alchemy return products per craft; adapter aggregates repeated product IDs.

- [x] Add failing tests for expected alchemy yield at 0/1000/3000 and expected return products.
- [x] Run targeted tests and observe expected failures.
- [x] Implement bracket tables, pools, clean-liquid-reagent quantity and weighted yields; use 0.3 per special recipe product when the verified recipe proc applies.
- [x] Aggregate quantities and preserve independent sell/keep settings.
- [x] Run targeted mastery, adapter, and planner tests.
- [x] Commit calculation/API changes separately from UI.

### Task 2: Return catalog metadata and usable sell/keep UI

**Files:**

- Modify: `apps/web/src/app/shared/recipe-tree/recipe-bonus-products.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`, `.html`, `.scss`, `.spec.ts`
- Test: `recipe-tree.spec.ts`, `recipe-bonus-products.spec.ts`

**Interfaces:** return IDs are quoteable through the existing quote pipeline; UI metadata is loaded from the existing catalog endpoint; generic alchemy pool renders collapsed by default.

- [x] Add failing tests for all quote IDs and grouped return controls.
- [x] Run targeted tests and observe expected failures.
- [x] Fetch catalog item names/icons in batches; keep unpriced returns excluded from revenue by default.
- [x] Render recipe returns plus a collapsed random-bonus section with quantity, price/source, and one sell/keep control per item.
- [x] Add separate temporary mastery values for each active profession in the selected production graph; keep them out of the character profile and save only inside the in-memory recipe session.
- [x] Run targeted UI tests and `pnpm check`.
- [x] Commit UI and metadata changes as an atomic commit.

### Task 3: Four recipe comparisons and handoff

**Files:**

- Modify: `docs/ACTIVE_CONTEXT.md`
- Test: live recipe routes and full workspace suites.

- [x] With each recipe graph and market snapshot loaded, set 3,000 mastery and verify Folha Verde, Edania, Ração Orgânica, and Refeição de Valência individually.
- [x] Record input cost, sale revenue, profit/operation, return quantities, and unresolved prices; compare output categories and toggles with BDOlytics and BDO Workshop. Financial results are explicitly marked non-equivalent when quotes, strategy or tracked inventory differ.
- [x] Run `pnpm check`, `pnpm test`, and `git diff --check`; report build budget failures if present without changing thresholds.
- [x] Update `docs/ACTIVE_CONTEXT.md` with evidence, limits, changed files, and next step.
- [x] Commit documentation and any unrelated pending formatting change separately.

## Comparison limits

The local graph, BDOLytics and BDO Workshop agree on the tested expected output categories for Valencia Meal and Edania where the same product page is available. The live market snapshots and acquisition choices differ, and BDOLytics does not expose a matching calculator for item 1408; those totals cannot certify identical profit. BDO Workshop labels its calculator a work in progress and emphasizes tracked stock, recipe-chain choices and sold-out strategy. Missing local input quotes remain unresolved, so Ração Orgânica and Edania do not receive a conclusive local profit.

## Execution

The user has repeatedly authorized inline implementation and explicitly asked that each recipe be tested; execute inline without pausing for another approval.
