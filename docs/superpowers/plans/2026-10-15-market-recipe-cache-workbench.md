# Mercado e Oficina de Receitas Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make Mercado and Receitas feel immediate through query-correct memory caching, lightweight route resolvers, and intent prefetch, while presenting the recipe workbench in a desktop-first 2:1 layout with temporary mastery controls.

**Architecture:** Keep market quotes and board queries in MarketCacheService; put public catalog request caching in CatalogApiService so resolvers, prefetch, and pages share identical requests. Resolvers prepare only the initial data for the target route; a small intent directive warms those same repositories on focus or pointer hover. Keep mastery simulation state inside RecipeTree and change only its presentation and regression coverage.

**Tech Stack:** Angular 22.2, Angular Router ResolveFn, RxJS 7.8, Angular signals, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-10-15-market-recipe-route-cache-and-workbench-design.md

## Global Constraints

- Use active catalog taxonomy and item data; do not hardcode item names, recipe names, category labels, formulas, or icons.
- Key public data by region, preferred locale, active dataset version/checksum, and all effective query parameters.
- Share duplicate in-flight requests; keep matching stale data visible while revalidating and retain it if refresh fails.
- Never show data for a different filter, region, locale, or dataset as the current result.
- Do not cache authenticated workspace data or run recipe calculations/optimization in a resolver.
- Preserve desktop-first layout at approximately 2fr/1fr; stack panels below 900px.
- Mastery overrides stay temporary, range from 0 to 3000, and apply only to produced steps where the profession has a modeled yield effect.
- Keep keyboard operation, visible focus, semantic loading/error states, and reduced-motion behavior.

## Review Focus

- Different market query keys (category, search, stock filter, sort, page, page size, or region) must never reuse another result; pin this in the MarketCacheService tests.
- An expired matching result must render before refresh and remain available if refresh errors; pin this in the cache and board tests.
- Empty results and request errors must not remove the category taxonomy or move the board geometry; pin this in MarketBoard tests.
- Resolver and intent-prefetch calls for the same URL must share one request, and catalog version changes must invalidate incompatible entries; pin this in cache/resolver tests.
- Recipes with and without a variable-yield Processing step must show only applicable mastery controls; changing overrides must recalculate the simulation without changing the saved character; pin this in RecipeTree tests.

---

### Task 1: Stable market taxonomy and query-aware board cache

**Files:**

- Modify: apps/web/src/app/core/market-cache.service.ts
- Test: apps/web/src/app/core/market-cache.service.spec.ts
- Modify: apps/web/src/app/features/market/market-board.ts
- Modify: apps/web/src/app/features/market/market-board.html
- Modify: apps/web/src/app/features/market/market-board.scss
- Test: apps/web/src/app/features/market/market-board.spec.ts

**Interfaces:**

- Produce MarketBoardCacheQuery with region, search text, category ID, sort, page, page size, and stock filter.
- Produce MarketCacheService.boardKey(query) and resolveBoard(query, forceRefresh?) returning the matching MarketBoardResponse.
- Taxonomy is loaded independently of the filtered board result and stays available through loading, empty, and error states.

- [ ] Step 1: Add four tests: empty/error filtered responses keep the taxonomy visible; changing category, search, stock filter, sort, page, page size, or region changes the canonical key; two simultaneous identical queries issue one HTTP request; an expired query emits its matching cached response first and retains it after refresh failure.
- [ ] Step 2: Run pnpm --dir apps/web exec ng test --watch=false --include=app/core/market-cache.service.spec.ts --include=app/features/market/market-board.spec.ts and confirm the new assertions fail.
- [ ] Step 3: Implement the canonical query key, shared in-flight request, stale revalidation, and independent category state using the API taxonomy response.
- [ ] Step 4: Update the board to use resolveBoard and preserve the existing row dimensions while data is loading or unavailable; keep parent selection inclusive of its children and child selection visibly nested.
- [ ] Step 5: Run the same focused specs and commit the six Task 1 files as fix(market): stabilize taxonomy and cache board queries.

### Task 2: In-memory cache for public catalog reads

**Files:**

- Modify: apps/web/src/app/core/catalog-api.service.ts
- Test: apps/web/src/app/core/catalog-api.service.spec.ts
- Modify as needed: apps/web/src/app/core/region-preferences.ts

**Interfaces:**

- Existing public read methods retain their current observable payload types so current consumers remain compatible.
- Cache identity includes region, preferred data locale, endpoint, effective parameters, and the active dataset version/checksum learned from responses.
- Identical requests share an in-flight observable; expired entries remain available while one refresh runs.

- [ ] Step 1: Add tests asserting that a fresh response avoids a second HTTP request, duplicate calls issue one request, region/locale/endpoint/parameters produce separate entries, a changed dataset version cannot return the previous dataset, and a failed refresh leaves stale data available.
- [ ] Step 2: Run pnpm --dir apps/web exec ng test --watch=false --include=app/core/catalog-api.service.spec.ts and confirm the new assertions fail.
- [ ] Step 3: Add bounded in-memory cache behavior to categories, item pages, item detail, recipe list, recipe detail, and item recipe lookups. Use the existing five-minute market cache TTL as the public catalog freshness interval.
- [ ] Step 4: Keep icons/dataset metadata tied to the same response version; do not persist catalog data or include private workspace endpoints.
- [ ] Step 5: Run the service and affected page specs, then commit the service and its spec as feat(web): cache public catalog reads in memory.

### Task 3: Route resolvers and intent prefetch

**Files:**

- Create: apps/web/src/app/core/public-route-data.ts
- Create: apps/web/src/app/core/public-route-data.spec.ts
- Create: apps/web/src/app/core/route-intent-prefetch.directive.ts
- Create: apps/web/src/app/core/route-intent-prefetch.directive.spec.ts
- Modify: apps/web/src/app/app.routes.ts
- Modify: apps/web/src/app/layout/workspace-layout.html
- Modify: apps/web/src/app/features/market/market-page.ts
- Modify: apps/web/src/app/features/recipes/recipes-page.ts
- Modify: apps/web/src/app/features/market/market-page.spec.ts
- Modify: apps/web/src/app/features/recipes/recipes-page.spec.ts

**Interfaces:**

- Produce marketRouteResolver for the initial board and taxonomy.
- Produce recipesRouteResolver for the first recipe list, a selected item plus its producing recipes, or a selected recipe plus its product and producing methods.
- Produce RouteIntentPrefetchDirective with a route URL input; focus and pointerenter call the same public route data service used by resolvers.

- [ ] Step 1: Add resolver tests asserting route-specific endpoint calls for /market, /recipes, /recipes/items/:id, and /recipes/:key; invalid IDs/keys return a recoverable not-found state; upstream failures do not leave navigation stuck.
- [ ] Step 2: Add directive tests asserting focus and pointerenter each warm the same route service, repeated intent creates one request, and private routes create no prefetch; run pnpm --dir apps/web exec ng test --watch=false --include=app/core/public-route-data.spec.ts --include=app/core/route-intent-prefetch.directive.spec.ts and confirm the new assertions fail.
- [ ] Step 3: Implement lightweight resolvers that request only route-critical public data and rely on the caches from Tasks 1 and 2.
- [ ] Step 4: Add the directive to the Mercado/Receitas navigation links and relevant item/recipe links; ensure route activation and prefetch share request identity.
- [ ] Step 5: Make pages reuse resolved/cached data without clearing the current view before a same-route refresh; expose stale/error freshness concisely and keep retry behavior.
- [ ] Step 6: Run pnpm --dir apps/web exec ng test --watch=false --include=app/core/public-route-data.spec.ts --include=app/core/route-intent-prefetch.directive.spec.ts --include=app/features/market/market-page.spec.ts --include=app/features/recipes/recipes-page.spec.ts; commit the resolver, directive, route, layout, and page changes as feat(web): resolve and prefetch public market routes.

### Task 4: Desktop-first recipe workbench and mastery placement

**Files:**

- Modify: apps/web/src/app/shared/recipe-tree/recipe-tree.scss
- Modify: apps/web/src/app/shared/recipe-tree/recipe-tree.html only if needed to group the existing controls
- Test: apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts

**Interfaces:**

- Keep existing temporary mastery signals, profession detection, calculation adapter, and profile fallback behavior.
- Place the product/configuration panel in the left 2fr column and the result panel in the right 1fr column; keep the production tree full-width below.

- [ ] Step 1: Add assertions for a desktop 2fr/1fr grid, controls inside the product/configuration panel, one-column stacking at 900px and below, and Processing mastery shown only for a variable-yield Processing step; assert edited mastery changes simulated output but not active-character mastery.
- [ ] Step 2: Run pnpm --dir apps/web exec ng test --watch=false --include=app/shared/recipe-tree/recipe-tree.spec.ts and confirm the new layout assertion fails against the current 1:1 grid.
- [ ] Step 3: Change the top-level desktop grid to 2fr/1fr with safe min-widths; keep the internal configuration readable and the result actions within its panel.
- [ ] Step 4: Verify temporary profession and Processing overrides still recalculate yields/revenue/profit and do not mutate the active character; adjust the template only if the current grouping fails the approved reference.
- [ ] Step 5: Run the RecipeTree spec and production-adapter spec, then commit the template/style/spec changes as feat(recipes): balance workbench panels and mastery controls.

### Task 5: Integrated verification and handoff

**Files:**

- Modify: docs/ACTIVE_CONTEXT.md
- Update: docs/superpowers/plans/2026-10-15-market-recipe-cache-workbench.md checkboxes as tasks finish

- [ ] Step 1: Run the four focused ng test commands from Tasks 1–4 after all commits are present.
- [ ] Step 2: Run pnpm check and pnpm test; record any pre-existing or environment-only failures distinctly.
- [ ] Step 3: Run the staging smoke test and verify local /market, /recipes, /recipes/items/9609, and /recipes/5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0 in a desktop browser.
- [ ] Step 4: Verify category stability, no full-page reload on recipe selection, stale-cache labeling, no console errors, and the 2:1 panel proportions after data loads.
- [ ] Step 5: Update ACTIVE_CONTEXT with commits, verification, and remaining staging-provider blockers; commit as docs: record market and recipe route improvements.
