# Recipe Screen Compact Settings Implementation Plan

> For agentic workers: implement this plan task by task with superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Make the Black Market recipe screen easier to scan by compacting the two decision panels and moving secondary settings out of their default view.

**Architecture:** Keep one recipe context and preserve RecipeTree state. Leave method, quantity, estimated output/time and economic result visible; gather mastery, production calibration, stock selection and tax controls into one collapsed disclosure within the production panel.

**Tech Stack:** Angular, standalone RecipeTree component, SCSS, Vitest/Angular testing, Playwright.

**Spec:** User-approved direction in this conversation: compact the two upper blocks, remove advanced fields from the default view, focus the screen on recipe calculations and the production graph.

## Global Constraints

- Respect the BDO UI skill: charcoal panels, restrained bronze accents, rectangular controls and no invented market or recipe values.
- Keep settings in the recipe context; do not add a global advanced mode or a new route.
- Preserve calculations, selections, graph nodes, expansion, pan and zoom while relocating settings.
- Keep method and quantity controls available in the default view.
- Maintain keyboard access, visible focus, responsive reflow and no horizontal page overflow.

## Review Focus

- Settings disclosure starts collapsed while current recipe and calculated metrics remain visible.
- Changing advanced mastery, stock or tax values still updates the same calculation.
- Existing graph DOM, selection, expansion, pan and zoom state are not reset by settings interaction.
- At tablet and mobile widths, both decision panels and settings disclosure fit without horizontal overflow.
- Unavailable quotes or incomplete production inputs remain explicitly marked as pending or incomplete.

---

## Task 1: Compact recipe controls and group secondary settings

- [x] Add a RecipeTree spec that verifies quantity stays in the main panel and mastery, production calibration, stock selection and taxes live inside one initially collapsed settings disclosure.
- [x] Run the targeted RecipeTree test; confirm the new structural assertion fails against the current screen.
- [x] Move the mastery controls and tax-options panel into the existing production-options disclosure; rename the disclosure to make its scope clear.
- [x] Tighten the production panel and result summary spacing without hiding market status, incomplete-result warnings or any of the four economic metrics.
- [x] Run the targeted RecipeTree test and the existing @bdo/web test suite.
- [x] Run pnpm check and pnpm test from the repository root as required by AGENTS.md.
- [x] Verify the recipe view in the browser at desktop and mobile widths; expand settings and confirm calculations and graph state remain intact.
- [x] Commit the compact recipe controls and required context handoff as one local feature commit; do not merge or push this separate repository.

Expected: the top cards become shorter and easier to scan; advanced controls remain reachable in their original context; the graph remains mounted and interactive.
