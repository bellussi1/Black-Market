# BDO UI implementation plan

> For agentic workers: use executing-plans for the graph and dispatching-parallel-agents for independent theme and recipe-page work. Follow the approved design and local bdo-ui-design skill.

**Goal:** Apply the BDO visual language throughout the web project and deliver a stable, accessible crafting tree.
**Architecture:** Reuse Angular signals/OnPush, existing SCSS layers and custom SVG/DOM graph. Keep calculation and catalog APIs intact. Use natural node sizing with measured connections and persistent position reservations.
**Tech Stack:** Angular 22, TypeScript, SCSS, Vitest.
**Spec:** ../specs/2026-10-09-bdo-recipes-design.md

## Constraints and rulings

- Original item icons reserve 44px and never exceed 48px; no product dependency added.
- No fabricated yields/prices, no hidden required fields, no loss of recipe state on mode change.
- Scope expanded by user to entire project: shared theme plus review of main routes.
- User explicitly approved implementation; continue directly in this session. Work in the existing checkout on a feature branch to preserve the running local server and installed dependencies.
- Independent theme and recipe-page tasks have disjoint file ownership; main worker owns graph behavior and integration.

## Review focus

- Long labels/messages change card dimensions: measure and connect real bounding boxes.
- Expanding unknown descendants versus hiding known descendants: unaffected positions stay fixed.
- Wheel at viewport edges/deltaMode lines: preserve cursor world coordinate and normalize input.
- Drag originating on a card: cross threshold must suppress click, controls and keyboard remain usable.
- Narrow/hidden viewport and mode changes: no automatic zero-size fit or graph remount.

## Task 1 · Shared theme

- [x] Refine styles/\_tokens.scss, base/layout/forms/controls/workstation at source; window headers and common cards use bronze/charcoal and sans fonts.
- [x] Audit app shell, market, inventory, storage, profile, calculators, legal and import pages for contrast/responsiveness; refine scoped SCSS if needed.
- [x] Format modified styles; review affected routes in a real browser.

## Task 2 · Stable graph layout

- [x] Add real behavior tests to graph specs: known subtree collapse keeps nodes at original coordinates; new children do not move siblings; measured tall nodes don't overlap and connections leave their bottom.
- [x] Run ng test including graph/tree specs and observe expected failures.
- [x] Implement layout options with measured sizes and retained placement map by path, reserving hidden descendants. Derive visible bounds and SVG links from real boxes.
- [x] Verify layout tests and existing source-node/limit tests.

## Task 3 · Viewport and node interactions

- [x] Add tests for wheel cursor anchor, zoom clamping, bidimensional fit and drag threshold/click suppression; inspect pointer cancellation cleanup.
- [x] Implement native non-passive wheel listener, pointer gestures, bounded zoom and fit; clean up browser listeners/observers/frames via DestroyRef.
- [x] Remove fixed card height/name clamp, add data-path measurement, separate expand/details controls and meaningful ARIA states; short transform/opacity transitions respect reduced motion.
- [x] Validate actual browser geometry and gestures, not merely component method calls.

## Task 4 · Simple/advanced recipes

- [x] Write failing preservation test in recipe-tree.spec.ts, then implement advanced signal/toggle while keeping graph mounted.
- [x] Compact product/method/quantity controls; required missing yield remains accessible. Reveal details on demand and provide close action.
- [x] Keep stock/tax/provenance calculations intact; adapt narrow displays with steps/graph navigation.
- [x] Run recipe page and tree specs.

## Task 5 · Integration and validation

- [x] Run web full test suite, lint and production build; fix regressions.
- [x] Review browser desktop/mobile, long text and nested branches; inspect focus/reduced-motion rules and automated node-limit coverage. Save screenshots and concrete measurements; document untested touch, screen-reader and large-tree scenarios in docs/bdo-ui-validation.md.
- [x] Obtain independent review, address actionable findings, update spec/skill with implementation facts and report remaining limitations.
