# Application-wide MMORPG UI Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the shared BDO layout, typography, controls and visual states across every registered app route, correcting only evidenced inconsistencies.

**Architecture:** Consume the shared tokens and control contract from the design-foundation plan. Audit route owners, guards and existing feature-specific styles; migrate by route family with behavior tests and browser review. Preserve domain compositions such as market tables, crafting trees, gear wheels and OCR review queues.

**Tech Stack:** Angular 22 standalone routes, Sass/Tailwind, Spartan local controls, Vitest through Angular CLI, local Playwright/browser QA.

**Spec:** `docs/design-system/ui-standardization-spec-2026-10-18.md`

## Global Constraints

- Do not alter formulas, price, quotes, in-game mastery, domain model or market data.
- Do not delete user records, presets, profiles or data; do not reset database, workspace or session.
- Do not remove or redirect existing URLs or change access guards.
- Do not install another visual library or rewrite the application in another framework.
- Preserve the charcoal/bronze palette, Barlow Semi Condensed, keyboard accessibility, visible focus and `prefers-reduced-motion` behavior.
- Standard interactive controls remain 44 px; compact 36 px controls are reserved for dense tables/toolbars.
- Audit all route owners from `apps/web/src/app/app.routes.ts`; all registered UI receives the common baseline, including operations/admin/diagnostic tools.
- Desktop QA covers 1920×1080, 2560×1440, 1600×900 and 1366×768; retain mobile behavior and check 390×844 for overflow.
- Use public competitor surfaces for each user-facing feature family as required by `AGENTS.md`; distinguish observations from calculations/rules, and record unavailable sources instead of guessing.

## Review Focus

- Completed UIQ-01..06 and existing visual fixes must not be reverted; check the existing feature checklist before each route group.
- Market and recipe numbers/unknown values must retain current semantics; run market/recipe behavior specs in Task 3.
- OCR uncertainty, corrections, destination selection and explicit apply confirmation must not change; run scan/storage/profile specs in Task 4.
- Direct navigation must retain route guard, loading state and URL behavior; route-matrix tests and authenticated browser checks cover this in Tasks 1 and 4.
- Long names, empty results, narrow widths and reduced motion must not clip content or shift the layout; pin representative cases in each group and inspect the full viewport matrix in Task 6.

---

### Task 1: Build the route and competitor coverage matrix

**Files:**

- Create: `docs/research/ui-route-inventory-2026-10-19.md`
- Modify: `docs/project-feature-checklist.md`
- Read: `apps/web/src/app/app.routes.ts`
- Read: `docs/research/competitor-review-playbook.md`
- Read: `docs/research/recipe-market-flow-review-2026-10-18.md`
- Read: `docs/research/authenticated-workflows-ui-review-2026-10-18.md`

**Interfaces:**

- Consumes: registered routes, route owners, guards/resolvers and existing feature/research checklists.
- Produces: one route-to-component/test/guard/layout matrix for `/`, `/demo`, `/termos`, `/privacidade`, `/cookies`, `/contato`, `/inventory` (redirect), `/scans`, `/scans/profile`, `/recipes`, `/recipes/:key`, `/recipes/items/:id`, `/market`, `/market/items/:id`, `/database/items`, `/database/items/:id` (redirects), `/world`, `/tutorials/manage`, `/roadmap/manage`, `/roadmap`, `/recommendations`, `/account` (redirect), `/profile` (redirect), `/family`, `/shopping`, `/plans`, `/reference` (redirect), `/reference/:kind`, `/reference/:kind/:id`, `/crafting`, `/enhancement`, `/gear` (redirect), `/lifeskills`, `/storage`, `/rng`, `/buffs`, `/settings` and the not-found route. Include redirects as redirects, not page owners.

- [ ] **Step 1: Inventory every route and its owner**
  - Record component/template/style/test files, auth guard, resolver, public/private status and existing shared layout contract in the new inventory.
- [ ] **Step 2: Reconcile existing evidence and checklist state**
  - Link relevant current research for Market, Recipes, Storage/Scans, Family, Gear and public references. For areas without a verified competitor equivalent, record attempted pages and “not verified”; do not infer formulas or copy data.
- [ ] **Step 3: Add one coverage test for route records**
  - Add `apps/web/src/app/app.routes.spec.ts` with `keeps every route in the UI inventory registered with its current guard and owner` and `preserves declared redirect-only records as redirects`.
- [ ] **Step 4: Run the new route test**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/app.routes.spec.ts"`
  - Expected: PASS against the current route table; any mismatch is resolved in the inventory, not by silently changing routing.
- [ ] **Step 5: Commit the route inventory and checklist link**
  - Run: `pnpm exec prettier --check docs/research/ui-route-inventory-2026-10-19.md docs/project-feature-checklist.md` and `git diff --check`; Expected: exit 0.
  - Commit message: `docs(ui): inventory route standardization scope`

### Task 2: Migrate high-traffic public workspaces

**Files:**

- Modify: `apps/web/src/app/features/dashboard/dashboard-page.html`
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.scss`
- Test: `apps/web/src/app/features/dashboard/dashboard-page.spec.ts`
- Modify: `apps/web/src/app/features/market/market-page.html`
- Modify: `apps/web/src/app/features/market/market-page.scss`
- Test: `apps/web/src/app/features/market/market-page.spec.ts`
- Modify: `apps/web/src/app/features/market/market-board.html`
- Modify: `apps/web/src/app/features/market/market-board.scss`
- Test: `apps/web/src/app/features/market/market-board.spec.ts`
- Modify: `apps/web/src/app/features/recipes/recipes-page.html`
- Modify: `apps/web/src/app/features/recipes/recipes-page.scss`
- Test: `apps/web/src/app/features/recipes/recipes-page.spec.ts`
- Modify: `apps/web/src/app/features/catalog/item-catalog-page.html`
- Modify: `apps/web/src/app/features/catalog/item-catalog-page.scss`
- Test: `apps/web/src/app/features/catalog/item-catalog-page.spec.ts`
- Modify: `apps/web/src/app/features/catalog/item-detail-page.html`
- Modify: `apps/web/src/app/features/catalog/item-detail-page.scss`
- Test: `apps/web/src/app/features/catalog/item-detail-page.spec.ts`

**Interfaces:**

- Consumes: shared tokens/controls from the foundation plan and existing Market/Recipe data contracts.
- Produces: consistent page/container/heading/control rhythm while preserving Home focus card, Market filters/table/chart and recipe search/tree/details.

- [ ] **Step 1: Add failing view-contract assertions**
  - Add one assertion in each listed page spec for shared page container, heading hierarchy, main action/state and active-navigation semantics. Add long-title and empty-result cases where the existing fixture permits.
- [ ] **Step 2: Run focused public-workspace tests**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/dashboard/dashboard-page.spec.ts" --include="src/app/features/market/market-page.spec.ts" --include="src/app/features/market/market-board.spec.ts" --include="src/app/features/recipes/recipes-page.spec.ts" --include="src/app/features/catalog/item-catalog-page.spec.ts" --include="src/app/features/catalog/item-detail-page.spec.ts"`
  - Expected: any new structural assertion fails only where a route diverges from the shared contract; existing calculations and filters pass.
- [ ] **Step 3: Align only evidenced layout/control divergence**
  - Replace local common margins, header typography, buttons/tabs and state spacing with shared tokens. Preserve all domain-specific table, chart, tree, search and detail interactions; do not change API or calculations.
- [ ] **Step 4: Run focused tests and inspect desktop views**
  - Run the same command; Expected: PASS.
  - Inspect Home, Market, Catalog, Recipe list and a recipe detail at 1920×1080 and 1600×900; sample 2560×1440/1366×768 and 390×844 for container width, long names, empty/loading state and overflow.
- [ ] **Step 5: Commit the public workspace batch**
  - Commit message: `style(ui): align public market and recipe workspaces`

### Task 3: Migrate public reference and editorial routes

**Files:**

- Modify/Test: `apps/web/src/app/features/world/world-page.html`, `world-page.scss`, `world-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/world/worker-empire.html`, `worker-empire.scss`, `worker-empire-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/roadmap/roadmap-page.html`, `roadmap-page.scss`, `roadmap-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/reference/reference-page.html`, `reference-page.scss`, `reference-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/legal/legal-page.html`, `legal-page.scss`, `legal-page.spec.ts`

**Interfaces:**

- Consumes: page/container/header/panel contracts and route matrix from Tasks 1–2.
- Produces: consistent public informational and editorial pages without changing source attribution, legal content, filters or roadmap meaning.

- [ ] **Step 1: Add failing shared-layout assertions**
  - Add `uses the shared page container and heading hierarchy` to each affected spec; assert existing route-specific actions/content remain present.
- [ ] **Step 2: Run the focused test set and verify gaps**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/world/world-page.spec.ts" --include="src/app/features/world/worker-empire-page.spec.ts" --include="src/app/features/roadmap/roadmap-page.spec.ts" --include="src/app/features/reference/reference-page.spec.ts" --include="src/app/features/legal/legal-page.spec.ts"`
  - Expected: new layout assertions identify only actual mismatches; existing data/navigation assertions pass.
- [ ] **Step 3: Apply the shared visual contract**
  - Reuse common width, type, panel, control and state tokens. Keep source/date labels, route filters, editorial content, legal disclaimer and management links unchanged.
- [ ] **Step 4: Run focused tests and inspect routes**
  - Run the same command; Expected: PASS.
  - Inspect `/world`, `/roadmap`, `/reference`, `/termos`, `/privacidade` and `/cookies` in desktop viewports, then verify no narrow-screen overflow.
- [ ] **Step 5: Commit the public-information batch**
  - Commit message: `style(ui): align reference and editorial routes`

### Task 4: Migrate authenticated storage, scan and profile flows

**Files:**

- Modify/Test: `apps/web/src/app/features/stock/stock-page.html`, `stock-page.scss`, `stock-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/storage/storage-page.html`, `storage-page.scss`, `storage-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/scans/automatic-scan-page.html`, `automatic-scan-page.scss`, `automatic-scan-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/scans/scans-page.html`, `scans-page.scss`, `scans-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/scans/profile-screen-import.html`, `profile-screen-import.scss`, `profile-screen-import.spec.ts`
- Modify/Test: `apps/web/src/app/features/account/account-page.html`, `account-page.scss`, `account-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/gear/gear-inventory-page.html`, `gear-inventory-page.scss`, `gear-inventory-page.spec.ts`
- Reconcile without editing: `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md`

**Interfaces:**

- Consumes: shared foundation and the preserved visual phase-3 plan; current guards, session/account state, storage review and OCR application boundary.
- Produces: common hierarchy across private operational flows with all review/confirmation controls intact.

- [ ] **Step 1: Reconcile the existing phase-3 plan and current code**
  - Read each item in the preserved plan and compare it with the route inventory, current source, tests and commits. Do not edit/delete that untracked plan; do not repeat any already completed work.
- [ ] **Step 2: Add failing layout assertions to the affected page specs**
  - Assert shared header/container, visible review status, explicit destination, uncertainty/error state and primary action grouping for each route. Assert a signed-out visitor still cannot see personal storage/scan shortcuts.
- [ ] **Step 3: Run focused tests and verify only presentation assertions fail**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/stock/stock-page.spec.ts" --include="src/app/features/storage/storage-page.spec.ts" --include="src/app/features/scans/automatic-scan-page.spec.ts" --include="src/app/features/scans/scans-page.spec.ts" --include="src/app/features/scans/profile-screen-import.spec.ts" --include="src/app/features/account/account-page.spec.ts" --include="src/app/features/gear/gear-inventory-page.spec.ts"`
  - Expected: view assertions expose visual gaps; OCR confidence, undo, auth and saved equipment behavior tests pass unchanged.
- [ ] **Step 4: Apply shared hierarchy without changing review semantics**
  - Keep scan items visible during validation, distinguish valid/removal/uncertain states, preserve preview/edit/destination/apply confirmation, and keep storage location/quantity/actions explicit. Use shared tokens for container, buttons, fields and panels.
- [ ] **Step 5: Run focused tests and authorized browser review**
  - Run the same command; Expected: PASS.
  - With the already authorized local account, inspect screens at the four desktop sizes and 390×844 without changing real profile/inventory data; if the session is unavailable, stop at access gate and report the missing visual check.
- [ ] **Step 6: Commit the personal-workspace batch**
  - Commit message: `style(ui): align private storage and review flows`

### Task 5: Migrate planning, management and utility routes

**Files:**

- Modify/Test: `apps/web/src/app/features/shopping/shopping-page.html`, `shopping-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/plans/plans-page.html`, `plans-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/crafting/crafting-page.html`, `crafting-page.scss`, `crafting-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/enhancement/enhancement-page.html`, `enhancement-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/rng/rng-page.html`, create `rng-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/buffs/buffs-page.html`, `buffs-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/settings/settings-page.html`, `settings-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/tutorials/tutorials-manage-page.html`, `tutorials-manage-page.scss`, `tutorials-manage-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/roadmap/roadmap-manage-page.html`, `roadmap-manage-page.scss`, `roadmap-manage-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/demo/demo-page.html`, `demo-page.scss`, `demo-page.spec.ts`
- Modify/Test: `apps/web/src/app/features/not-found/not-found-page.html`, create `not-found-page.spec.ts`

**Interfaces:**

- Consumes: shared tokens/components and route matrix; current persistence, guard, calculation and tutorial behaviors.
- Produces: common page hierarchy and input/feedback states on all remaining registered end-user, utility and management pages.

- [ ] **Step 1: Add or extend route view-contract tests**
  - For each listed page, assert shared page container/heading and visible primary action, empty state or result; for persisted pages also assert save/load behavior remains unchanged.
- [ ] **Step 2: Run focused utility tests before markup changes**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/shopping/shopping-page.spec.ts" --include="src/app/features/plans/plans-page.spec.ts" --include="src/app/features/crafting/crafting-page.spec.ts" --include="src/app/features/enhancement/enhancement-page.spec.ts" --include="src/app/features/rng/rng-page.spec.ts" --include="src/app/features/buffs/buffs-page.spec.ts" --include="src/app/features/settings/settings-page.spec.ts" --include="src/app/features/tutorials/tutorials-manage-page.spec.ts" --include="src/app/features/roadmap/roadmap-manage-page.spec.ts" --include="src/app/features/demo/demo-page.spec.ts" --include="src/app/features/not-found/not-found-page.spec.ts"`
  - Expected: newly added view-contract checks fail only where hierarchy is absent; existing calculations/guards remain passing.
- [ ] **Step 3: Align the shared hierarchy and field feedback**
  - Use the common page, panel, input, button, tabs and feedback contract. Preserve every domain control and existing validation message. Do not combine or remove workflows as part of styling.
- [ ] **Step 4: Run focused tests and inspect direct routes**
  - Run the same command; Expected: PASS.
  - Inspect utility, settings and management routes with their existing permissions; validate focus, loading/error states, long labels and viewport behavior.
- [ ] **Step 5: Commit the utility-route batch**
  - Commit message: `style(ui): align planning and utility routes`

### Task 6: Complete route audit and quality gates

**Files:**

- Modify: `docs/research/ui-route-inventory-2026-10-19.md`
- Modify: `docs/project-feature-checklist.md`
- Modify: `docs/ACTIVE_CONTEXT.md`
- Modify: `docs/ANTIGRAVITY_HANDOFF.md`
- Modify: `docs/research/README.md`

- [ ] **Step 1: Re-audit the complete route matrix against current source**
  - Every registered route is marked with current shared container/control pattern, focused test, guard and browser QA outcome. No route is marked complete solely because it compiles.
- [ ] **Step 2: Run all verification gates serially**
  - Run: `pnpm check`, `pnpm test`, `pnpm --filter @bdo/web build` and `pnpm test:ssr`.
  - Expected: all pass; report pre-existing budgets/warnings faithfully. Do not raise bundle/style budgets to hide regression.
- [ ] **Step 3: Perform final browser review**
  - Revisit the changed routes in 1920×1080, 2560×1440, 1600×900, 1366×768 and 390×844; verify no layout shift, page overflow, focus loss, inaccessible state or console error. Test reduced motion.
- [ ] **Step 4: Update the checklists and handoff**
  - Record only verified route families as complete and list any blocked private route or unverified external source separately.
- [ ] **Step 5: Commit the final audit record**
  - Run: `pnpm exec prettier --check <changed markdown files>` and `git diff --check`; Expected: exit 0.
  - Commit message: `docs(ui): close application-wide route audit`

## Execution Order

1. Complete the design-foundation plan.
2. Complete the Life Skills/Recommendations hub plan and Family tabs plan; these may be sequenced either way after foundation, but this native execution keeps commits serial.
3. Execute this route rollout plan; reuse completed UIQ-01..06 work and reconcile the preserved visual phase-3 plan before touching its routes.
