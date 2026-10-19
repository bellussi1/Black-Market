# Life Skills and Recommendations Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present production recommendations and observed Life Skills sessions through one navigational hub while preserving both URLs and their access boundaries.

**Architecture:** Keep the domain page components and calculations, but render a single reusable route-navigation component from both pages. The route remains the authorization boundary; `tab` makes the selected view bookmarkable. Remove mastery/training from the primary navigation while preserving legacy queries and presets with an explicit notice.

**Tech Stack:** Angular 22 standalone components, Router, signals, Vitest, local BDO controls.

**Spec:** `docs/design-system/ui-standardization-spec-2026-10-18.md`

## Global Constraints

- Do not alter formulas, price, quotes, in-game mastery, domain model or market data.
- Do not delete user records, presets, profiles or data; do not reset database, workspace or session.
- Do not remove or redirect `/recommendations`, `/lifeskills` or `/family`, change guards or publish/deploy.
- Do not install another visual library or rewrite the application in another framework.
- Preserve existing session calculations and the charcoal/bronze BDO visual identity.
- Keep `/recommendations` protected by `authGuard`; keep `/lifeskills` public. A query parameter is never authorization.
- Desktop QA covers 1920×1080, 2560×1440, 1600×900 and 1366×768; retain mobile behavior and check 390×844 for overflow.

## Review Focus

- Anonymous direct access to `/recommendations` must still invoke the guard; test in `auth.guard.spec.ts`.
- `/lifeskills?tab=production` must never render protected recommendation data; test the page's public access state.
- Browser back/forward and refresh must restore the selected view; exercise Router query state in feature tests and browser QA.
- Legacy `tab=mastery|training` must retain calculations and presets with an explanatory notice; test both queries and unchanged workspace payload.
- Missing session values must remain distinct from an entered zero; preserve and run existing comparison tests.

---

### Task 1: Add reusable route navigation

**Files:**

- Create: `apps/web/src/app/features/lifeskills/life-skills-hub-nav.ts`
- Create: `apps/web/src/app/features/lifeskills/life-skills-hub-nav.html`
- Create: `apps/web/src/app/features/lifeskills/life-skills-hub-nav.scss`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.ts`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.html`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.spec.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.html`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.spec.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.scss`

**Interfaces:**

- Consumes: `@angular/router` `RouterLink`; the route paths and access rules in `app.routes.ts` remain unchanged.
- Produces: standalone `LifeSkillsHubNav` with `activeTab = input.required<'production' | 'sessions'>()` and two router links: `/recommendations?tab=production` and `/lifeskills?tab=sessions`. Route links expose `aria-current="page"`; they are not buttons with `aria-pressed`.

- [x] **Step 1: Add failing navigation assertions to both page specs**
  - Assert the production anchor targets `/recommendations?tab=production`, the sessions anchor targets `/lifeskills?tab=sessions`, and exactly the current route link exposes `aria-current="page"`.
- [x] **Step 2: Run both page specs and verify the new assertions fail**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/lifeskills/lifeskills-page.spec.ts" --include="src/app/features/recommendations/recommendations-page.spec.ts"`
  - Expected: the new common-navigation assertions fail against the current duplicate navs.
- [x] **Step 3: Implement the shared navigation component**
  - Add the typed input, two `RouterLink` anchors, translated labels, active styling from the shared tabs contract and keyboard focus.
- [x] **Step 4: Replace duplicate navigation on both pages**
  - Render `LifeSkillsHubNav` in Life Skills and Recommendations; remove their competing tab markup and local styles only after both pages pass their view tests. Do not change route guards, resolvers, page title, analytics or calculations.
- [x] **Step 5: Re-run both page specs**
  - Run the same command; Expected: PASS.
- [x] **Step 6: Commit**
  - Commit message: `feat(lifeskills): share recommendations navigation`

### Task 2: Sync query state and preserve legacy tools

**Files:**

- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.ts`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.html`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.spec.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.html`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.spec.ts`
- Test: `apps/web/src/app/core/auth.guard.spec.ts`

**Interfaces:**

- Consumes: `LifeSkillsHubNav`, `tab` query contract and existing `calculateInvestment`, `calculateTraining`, `PresetBar` behavior.
- Produces: `production|sessions` canonical views, protected/public route gates, legacy-only panels for `mastery|training`, and safe defaults for missing/invalid values.

- [ ] **Step 1: Add failing tests for access, canonical, legacy and invalid queries**
  - Add `keeps recommendations behind authGuard` to `auth.guard.spec.ts`.
  - Add `does not render production data from the public Life Skills route` with `tab=production` and a visible `/recommendations` link.
  - Add `links the shared sessions tab to the public Life Skills URL` to `recommendations-page.spec.ts`.
  - Assert `tab=sessions` renders sessions; `tab=production` on public `/lifeskills` shows only an access CTA; `tab=mastery` and `tab=training` keep their current panels and show a legacy notice; missing/unknown query uses the route default.
  - Assert changing routes with RouterLink updates browser history and back/forward restores the expected tab.
  - Assert legacy preset JSON in `WorkspaceStore` is byte-for-byte unchanged after opening each legacy view.
- [ ] **Step 2: Run the focused tests and verify failure**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/lifeskills/lifeskills-page.spec.ts" --include="src/app/features/recommendations/recommendations-page.spec.ts" --include="src/app/core/auth.guard.spec.ts"`
  - Expected: new public-gate/history/legacy-notice assertions fail before implementation; existing auth behavior remains passing.
- [ ] **Step 3: Implement query parsing and safe route state**
  - Parse `production|sessions|mastery|training`; derive route default by URL. Render no Recommendations content from public `/lifeskills`; expose a link to the protected path. Keep legacy tools out of primary nav, preserve their existing calculation and preset inputs, and add a concise notice above the requested legacy panel.
- [ ] **Step 4: Run focused tests and preserve access boundaries**
  - Run the same command; Expected: PASS and no guard test is weakened.
- [ ] **Step 5: Commit**
  - Commit message: `feat(lifeskills): preserve legacy links and route state`

### Task 3: Compact the observed-session workspace

**Files:**

- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.html`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.ts` only if view-model state is needed; do not change calculation inputs or formulas.
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.spec.ts`

**Interfaces:**

- Consumes: existing session form, result/comparison signals and route state from Task 2.
- Produces: a desktop arrangement that shows action, data confidence and current result early; secondary history/help can be disclosed without removing actions.

- [ ] **Step 1: Add failing tests for session data states and action placement**
  - Add `places the session action and result before secondary history` and `keeps missing optional data distinct from a user-entered zero`.
- [ ] **Step 2: Run the session tests and verify the layout assertion fails**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/lifeskills/lifeskills-page.spec.ts"`
  - Expected: new view-order assertion fails; existing math/comparison tests remain passing.
- [ ] **Step 3: Recompose the session layout**
  - Use shared page/container/panel contracts; at desktop place the session form and result/quality summary together, with history/comparison in an accessible secondary panel. Keep labels, units, saving/deletion affordances and formula outputs.
- [ ] **Step 4: Run focused tests and browser checks**
  - Run the same focused command; Expected: PASS.
  - Inspect both routes anonymous and authorized at all four desktop viewports; verify direct URL, refresh, back/forward, legacy links, no layout shift during tour and no horizontal overflow at 390×844. Do not edit real session data.
- [ ] **Step 5: Commit**
  - Commit message: `style(lifeskills): prioritize session results`

## Final Verification

- Run all Lifeskills, Recommendations and auth guard component specs, `pnpm check`, `pnpm --filter @bdo/web build` and `pnpm test:ssr`.
- Verify no route redirect was introduced and neither private content nor user data became public.
- Update checklist and handoff with commit hashes and any inaccessible authenticated browser states.
