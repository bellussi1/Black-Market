# MMORPG UI Design Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Establish one tested BDO-inspired visual contract for tokens, layout, controls and future UI work.

**Architecture:** Extend the existing Sass `--bm-*` theme and local Spartan primitives without changing the palette or introducing a UI dependency. Treat `bdo-ui-design` as the product standard; keep `ui-design` as its composition/review workflow and document the shared contracts in `docs/design-system/bdo-ui.md`.

**Tech Stack:** Angular 22, Sass, Tailwind 4, Spartan 1.6.3 Brain, local `@bdo/ui`, Vitest through Angular CLI.

**Spec:** `docs/design-system/ui-standardization-spec-2026-10-18.md`

## Global Constraints

- Do not alter formulas, price, quotes, in-game mastery, domain model or market data.
- Do not delete user records, presets, profiles or data; do not reset database, workspace or session.
- Do not remove or redirect `/recommendations`, `/lifeskills` or `/family`, change guards or publish/deploy.
- Do not install another visual library or rewrite the application in another framework.
- Preserve the charcoal/bronze palette, Barlow Semi Condensed, keyboard accessibility, visible focus and `prefers-reduced-motion` behavior.
- The standard interactive control remains 44 px; the compact variant is reserved for dense tables/toolbars.
- Desktop QA covers 1920×1080, 2560×1440, 1600×900 and 1366×768; retain mobile behavior and check 390×844 for overflow.

## Review Focus

- Existing pages with local margin/padding overrides must align to the same page container while preserving usable wide layouts; pin this with layout-token contract tests and viewport checks in Task 2.
- Buttons below the standard height must not become primary actions; pin allowed variants and class output in Task 3.
- High-density game surfaces must retain their game-specific geometry; visually verify recipes tree and gear wheel in Task 2 and the route migration plan.
- Reduced-motion users must not receive route enter/exit animations; verify computed behavior in browser in Task 2.
- A future feature author must find one source of truth and distinguish product identity from layout workflow; verify link/role language in docs in Task 4.

---

### Task 1: Define the design-token contract

**Files:**

- Create: `apps/web/src/styles/ui-token-contract.spec.ts`
- Modify: `apps/web/src/styles/_tokens.scss`
- Modify: `apps/web/src/styles/_layout.scss`
- Modify: `apps/web/src/styles/_responsive.scss`

**Interfaces:**

- Consumes: existing `--bm-*` palette, 1440 px default page max, Barlow Semi Condensed, shared `tool-page` and responsive layout.
- Produces: token contract for spacing, typography roles, standard/compact control heights, standard/wide page containers and motion timing. Keep existing palette and standard 44 px control height.

- [x] **Step 1: Write the failing token contract test**
  - Add test `defines the shared spacing, typography, control, page-width and motion tokens`.
  - Assert the 4 px spacing ladder (4, 8, 12, 16, 24, 32, 40, 48 px), type roles (32 px display, current 26–30 px page title, 19 px section title, 16 px body, 14 px support, 12 px metadata), standard 44 px and compact 36 px controls, current 1440 px page width plus an explicit 1760 px wide variant, and named route enter/exit durations matching the current 220/120 ms transition.
- [x] **Step 2: Run the new test and verify it fails**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/styles/ui-token-contract.spec.ts"`
  - Expected: missing token assertions fail before Sass changes.
- [x] **Step 3: Implement the tokens and page-container variants**
  - Add semantic custom properties in `_tokens.scss`; make `tool-page` use the 1440 px token and add an explicit wide modifier using the 1760 px token. Map responsive page padding and spacing to the scale without changing domain layouts.
- [x] **Step 4: Run the contract test and visual viewport check**
  - Run the same focused test; Expected: PASS.
  - In browser, inspect Home, Market, recipe tree and Gear at the four desktop viewports; verify no page-level horizontal overflow at 390×844 and no change to gear/tree geometry.
- [x] **Step 5: Commit**
  - Commit message: `style(ui): define shared BDO layout tokens`

### Task 2: Normalize shared controls and motion hooks

**Files:**

- Create: `apps/web/src/app/ui/button/src/lib/hlm-button.spec.ts`
- Modify: `apps/web/src/app/ui/button/src/lib/hlm-button.ts`
- Modify: `apps/web/src/styles/_controls.scss`
- Modify: `apps/web/src/styles/_layout.scss`

**Interfaces:**

- Consumes: token names and heights from Task 1; existing `HlmButton`, `.tabs`, `.workspace-tabs`, route View Transitions and reduced-motion media query.
- Produces: shared default/compact button contracts, one visual tab contract for existing markup, semantic route-transition tokens and no new motion behavior.

- [x] **Step 1: Write failing button-contract tests**
  - Add tests `keeps standard and compact buttons at the shared heights` and `keeps every icon action at least 36px` for `buttonVariants`.
- [x] **Step 2: Run the focused tests and verify failure**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="src/app/ui/button/src/lib/hlm-button.spec.ts"`
  - Expected: compact/icon size assertions fail before changes.
- [x] **Step 3: Align the primitive variants and shared tabs**
  - Keep the default button at 44 px; map `xs`, `sm` and `lg` button sizes to the 36 px compact height; give all icon button sizes a minimum 36 px box. Retain the focus-visible ring. Map `.tabs`, `.workspace-tabs` and `.segmented-control` to shared spacing/type/selection tokens while preserving markup compatibility. Keep `aria-current`/tab semantics at call sites, not in CSS.
- [x] **Step 4: Tokenize existing route transitions and reduced motion**
  - Replace local 120/220 ms literals with named tokens; keep animation limited to the page transition element and retain `prefers-reduced-motion: reduce` behavior.
- [x] **Step 5: Run focused tests and browser review**
  - Run the same focused test command and the token contract from Task 1; Expected: PASS.
  - Verify focus ring, disabled state, active tabs, 44/36 px sizing and reduced-motion in browser.
- [x] **Step 6: Commit**
  - Commit message: `style(ui): unify buttons tabs and route motion`

### Task 3: Publish the source-of-truth design guidance

**Files:**

- Modify: `.agents/skills/bdo-ui-design/SKILL.md`
- Modify: `.agents/skills/ui-design/SKILL.md`
- Modify: `.agents/skills/ui-design/agents/design-ui.md`
- Modify: `docs/design-system/bdo-ui.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: tokens and shared control behavior from Tasks 1–2.
- Produces: one product identity reference and a separate workflow/review reference, linked from project agent instructions.

- [x] **Step 1: Compare current documentation with the implemented contract**
  - Inspect each listed document and write down stale or missing canonical-source, token, typography/control/page-variant, route-vs-content tab and exception-policy statements before editing.
- [x] **Step 2: Update BDO UI skill and catalogue**
  - Document actual token names and components from Tasks 1–2; keep existing recipe/gear-specific rules and explicit-data constraints.
- [x] **Step 3: Scope the UI design skill and agent**
  - State that they govern hierarchy/composition/review and defer identity, tokens and component variants to `bdo-ui-design`.
- [x] **Step 4: Update AGENTS and verify documentation**
  - Clarify canonical/workflow roles in the existing UI instructions; do not add a third skill or contradictory design values.
  - Run: `pnpm exec prettier --check .agents/skills/bdo-ui-design/SKILL.md .agents/skills/ui-design/SKILL.md .agents/skills/ui-design/agents/design-ui.md docs/design-system/bdo-ui.md AGENTS.md` and `git diff --check`.
  - Expected: both exit 0 and the documented token names match the implemented styles.
- [x] **Step 5: Commit**
  - Commit message: `docs(ui): establish canonical BDO design guidance`

## Final Verification

- Run `pnpm --filter @bdo/web test:components`, `pnpm check`, `pnpm --filter @bdo/web build` and `pnpm test:ssr`.
- Review all screenshots and responsive states named above; preserve any pre-existing build warnings accurately.
- Update checklist and handoff only for this foundation scope; do not include unrelated route redesigns in these commits.
