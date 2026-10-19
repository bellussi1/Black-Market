# Family Workspace Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the three Family sections into actual exclusive, URL-backed tabs while preserving character context and saved data.

**Architecture:** Keep `/family`, its `authGuard`, `PlayerPage`, `WorkspaceStore` and `GearInventoryPage`. Use the existing `?tab=character|equipment|family` contract to conditionally render one main section at a time; retain the character selector/create action above the selected panel.

**Tech Stack:** Angular 22 standalone component, Router query params, signals, Vitest, local Spartan controls.

**Spec:** `docs/design-system/ui-standardization-spec-2026-10-18.md`

## Global Constraints

- Do not alter formulas, price, quotes, in-game mastery, domain model or market data.
- Do not delete user records, presets, profiles or data; do not reset database, workspace or session.
- Do not remove or redirect `/family`, change its guard or publish/deploy.
- Do not install another visual library or rewrite the application in another framework.
- Preserve every character, equipment, mastery, family benefit and existing save action.
- Keep the active character selector/create flow in the shared page context; switching tabs cannot reset saved profile or family data.
- Desktop QA covers 1920×1080, 2560×1440, 1600×900 and 1366×768; retain mobile behavior and check 390×844 for overflow.

## Review Focus

- Selecting equipment and returning to character/family must preserve active character and saved family data; assert with `player-page.spec.ts`.
- A visitor without a selected character must see an instructional empty state, not fabricated stats; test the existing profile-empty branch.
- Switching tabs must update query state and back/forward; test Router navigation and direct query params.
- Character and family fields that save on blur must not lose a typed value during tab navigation; test save-on-blur behavior before conditional rendering.
- Only the selected primary panel may be exposed to accessibility tree; assert unselected panels are absent, not merely visually hidden.

---

### Task 1: Implement exclusive URL-backed Family panels

**Files:**

- Modify: `apps/web/src/app/features/player/player-page.spec.ts`
- Modify: `apps/web/src/app/features/player/player-page.ts`
- Modify: `apps/web/src/app/features/player/player-page.html`

**Interfaces:**

- Consumes: current `tab` signal (`character|equipment|family`), RouterLink query handling and selected-character state.
- Produces: route-backed tabs with stable panel ids `character-panel`, `equipment-panel`, `family-panel`; exactly one domain panel is rendered while shared character context remains visible.

- [x] **Step 1: Add failing exclusive-panel tests**
  - Add `renders exactly one primary panel for each supported tab` for `character`, `equipment` and `family`; each case asserts its selected panel exists and the other two do not.
  - Add `uses character as the default for missing and invalid tab values`.
  - Add `updates the family query when a tab is selected` with a Router spy or RouterTestingHarness.
- [x] **Step 2: Add the data-preservation regression test**
  - Extend `opens equipment inside family while retaining the active character and family data` to switch `character → equipment → family → character` and assert name, mastery, gear slots and family profile are unchanged. Add a blur-save assertion for an edited character field before navigating away.
- [x] **Step 3: Run the player page test and verify the expected failure**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/player/player-page.spec.ts"`
  - Expected: exclusive-panel assertion fails because the current template renders the sections together.
- [x] **Step 4: Conditionally render the selected domain section**
  - Put character sheet/masteries/attributes under `character-panel`, embedded `app-gear-inventory-page` under `equipment-panel`, and family/tax/profession sections under `family-panel`.
  - Do not conditionally remove the character selector, create form, route navigation, global save feedback or tutorials. Normalize only invalid/missing tab state to `character`; preserve unrelated query parameters.
- [x] **Step 5: Run focused tests**
  - Run the same command; Expected: PASS, including exactly-one-panel, blur-save, active character and family persistence tests.
- [x] **Step 6: Commit**
  - Commit: `62849f2 feat(family): render selected workspace tab` (includes secondary-details refinement in the same Family workspace responsibility).

### Task 3: Refine the shared Family header and secondary details

**Files:**

- Modify: `apps/web/src/app/features/player/player-page.html`
- Modify: `apps/web/src/app/features/player/player-page.scss`
- Modify: `apps/web/src/app/features/player/player-page.spec.ts`

**Interfaces:**

- Consumes: exclusive panels from Task 1 and shared tokens/control variants from the design-foundation plan.
- Produces: one visible character context, clear panel heading and compact secondary groups while keeping all data and actions discoverable.

- [x] **Step 1: Add failing context and secondary-group assertions**
  - Add `keeps the active-character selector and create action above every selected panel`.
  - Add `keeps secondary attributes accessible without exposing inactive panels`.
- [x] **Step 2: Run focused player tests and confirm the context/group assertions fail**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/player/player-page.spec.ts"`
- [x] **Step 3: Align markup and secondary group behavior**
  - Reuse global page/panel/tabs tokens; keep all fields labelled and make secondary sections disclosed via native accessible details or an existing shared disclosure primitive. Do not hide the primary identity, key mastery, active gear or saved state.
- [x] **Step 4: Run focused tests and inspect the browser**
  - Player, gear, tutorial, Life Skills, Recommendations and auth guard specs passed. Component tests cover selected-only panels, no-character states, focusable route links, URL updates, blur-save and preservation of character/family/gear.
  - Browser inspection of `/family` is deferred: the isolated 4201 origin has no session and its guard redirects to Home. The real 4200 tab and account data were left untouched; repeat the private visual matrix with an authorized session.
- [x] **Step 5: Commit**
  - Commit: `62849f2 feat(family): render selected workspace tab`.

## Final Verification

- Run `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/features/player/player-page.spec.ts" --include="src/app/features/gear/gear-inventory-page.spec.ts"`, `pnpm check` and `pnpm --filter @bdo/web build`.
- Component tests cover `/family?tab=character`, `/family?tab=equipment` and `/family?tab=family` with empty and synthetic profiles. The direct browser route reached Home due to the session guard; repeat visual QA with the authorized local session without editing user data.
- Update checklist and handoff with the exact commits and any authenticated browser limitations.
