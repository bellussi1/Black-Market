# Roadmap Visual Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Harmonize the active Storage, Family/Character, Equipment, and screenshot review flows with the approved Roadmap visual hierarchy while preserving every existing action and data-review boundary.

**Architecture:** Reuse the existing global `tool-heading`, `page-heading`, `panel-heading`, and BDO controls. Make small template and component-scoped style changes in the existing route components; keep the game inventory view, character tabs, capture steps, review cards, and OCR correction controls in their current domain-specific structures.

**Tech Stack:** Angular standalone components, templates, SCSS, Vitest, shared BDO tokens and Spartan UI components.

**Spec:** `docs/superpowers/specs/2026-10-16-roadmap-inspired-visual-rollout-design.md`

## Global Constraints

- Do not alter calculations, contracts, APIs, permissions, persistence, or OCR confidence/review rules.
- Preserve the capture preview, explicit destination selection, corrections, uncertainty states, and confirmation before applying OCR results.
- Do not truncate names, quantities, or metrics; variable content expands its panel.
- Keep keyboard operation, visible focus, accessible labels, minimum touch targets, contrast, and reduced-motion behavior.
- Verify desktop 1440×900 and narrow 390×844 layouts; do not weaken existing behavior tests.
- Do not seed, migrate, or write to persistent local, staging, or production databases for this visual phase.

## Review Focus

- A signed-out visitor must not gain links to authenticated storage or scan actions.
- Empty inventory and long character/item names must preserve a legible layout and not create page-level horizontal overflow.
- Uncertain OCR items, missing quantities, and errors must remain distinct from ready-to-save results.
- Switching between character tabs and equipment must preserve the active character and family data.
- Narrow screens and keyboard focus must keep the primary upload, review, and save actions reachable without clipped panels.

---

### Task 1: Storage and inventory surfaces

**Files:**

- Modify: `apps/web/src/app/features/stock/stock-page.html`
- Modify: `apps/web/src/app/features/stock/stock-page.scss`
- Test: `apps/web/src/app/features/stock/stock-page.spec.ts`
- Modify: `apps/web/src/app/features/storage/storage-page.html`
- Test: `apps/web/src/app/features/storage/storage-page.spec.ts`

**Interfaces:**

- Consumes: current `/storage` route, which renders `StockPage` while `SCREENSHOT_MVP` is true; `StoragePage` remains the detailed route implementation when that mode is disabled.
- Produces: consistent page headers, grouped import/manual actions, filters, item count, and view controls. Preserve pagination on the active `StockPage` and CSV preview; the detailed `StoragePage` inventory currently has no list pagination and remains unchanged.

- [x] **Step 1: Write failing view-structure tests**
  - Add `groups storage context, primary actions and filters before the item list` to `stock-page.spec.ts`.
  - Extend `Storage import guidance` to assert the detailed implementation uses the shared header and keeps import guidance, CSV, and manual entry available.
- [x] **Step 2: Run the focused tests and confirm the new assertions fail**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/stock/stock-page.spec.ts --include=app/features/storage/storage-page.spec.ts`
  - Expected: new header/group assertions fail; existing stock/import behavior tests continue to run.
- [x] **Step 3: Align storage headers and group related controls**
  - Use shared header/panel classes and visible labels; keep filters, grid/list toggle, manual edit, import, and pagination semantics unchanged.
- [x] **Step 4: Re-run focused tests**
  - Run the same command; Expected: all stock and storage specs pass.
- [x] **Step 5: Commit**
  - Commit message: `feat(storage): align stock workspace hierarchy`

### Task 2: Family, character, and equipment screens

**Files:**

- Modify: `apps/web/src/app/features/player/player-page.html`
- Test: `apps/web/src/app/features/player/player-page.spec.ts`
- Modify: `apps/web/src/app/features/gear/gear-inventory-page.html`
- Test: `apps/web/src/app/features/gear/gear-inventory-page.spec.ts`

**Interfaces:**

- Consumes: existing `/family` tabs and shared active character state; equipment can render embedded inside the Family screen or standalone in the personal workspace.
- Produces: a consistent heading, section hierarchy, character selection, family summary, and equipment review surface while retaining current tab and active-character behavior.

- [x] **Step 1: Write failing view-structure tests**
  - Add `presents family tabs and character selection within the shared page hierarchy` to `player-page.spec.ts`.
  - Add `keeps equipment identity and review actions grouped when embedded and standalone` to `gear-inventory-page.spec.ts`.
- [x] **Step 2: Run the focused tests and confirm the new assertions fail**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/player/player-page.spec.ts --include=app/features/gear/gear-inventory-page.spec.ts`
  - Expected: new shared hierarchy assertions fail; current character and equipment behavior specs pass.
- [x] **Step 3: Align family and equipment markup**
  - Apply shared heading/section grouping; keep profile fields, tabs, saved gear slots, import links, and unknown values unchanged.
- [x] **Step 4: Re-run focused tests**
  - Run the same command; Expected: all family and equipment specs pass.
- [x] **Step 5: Commit**
  - Commit message: `feat(profile): align family and equipment hierarchy`

### Task 3: Screenshot capture and OCR review

**Files:**

- Modify: `apps/web/src/app/features/scans/automatic-scan-page.html`
- Modify: `apps/web/src/app/features/scans/automatic-scan-page.scss`
- Modify: `apps/web/src/app/features/scans/scans-page.html`
- Test: `apps/web/src/app/features/scans/scans-page.spec.ts`
- Modify: `apps/web/src/app/features/scans/profile-screen-import.html`
- Modify: `apps/web/src/app/features/scans/profile-screen-import.scss`
- Test: `apps/web/src/app/features/scans/profile-screen-import.spec.ts`

**Interfaces:**

- Consumes: current capture upload, recognition result, item review, profile-field review, and explicit apply actions.
- Produces: shared capture/review headings and panel hierarchy with the existing step order, edits, selected destinations, uncertainty labels, and confirmations intact.

- [x] **Step 1: Write failing presentation-boundary tests**
  - Extend `Screenshot entry` with `keeps capture context and review status visible without hiding the pending review`.
  - Extend `Profile screen import destination` with `keeps preview, field selection and apply action grouped under the shared heading`.
- [x] **Step 2: Run focused tests and confirm the new assertions fail**
  - Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/scans/scans-page.spec.ts --include=app/features/scans/profile-screen-import.spec.ts`
  - Expected: new hierarchy assertions fail; OCR decisions and destination tests continue to run.
- [x] **Step 3: Align capture and review presentation**
  - Use shared header and panel hierarchy; preserve the review queue, OCR uncertainty, manual corrections, profile-field selection, and explicit confirmation unchanged.
- [x] **Step 4: Re-run focused tests**
  - Run the same command; Expected: all scan and profile import specs pass.
- [x] **Step 5: Commit**
  - Commit message: `feat(scans): align capture and review hierarchy`

### Task 4: Competitive review, checklist, and handoff

**Files:**

- Create: `docs/research/storage-profile-gear-competitive-review-2026-10-16.md`
- Modify: `docs/project-feature-checklist.md`
- Modify: `docs/ACTIVE_CONTEXT.md`

- [x] **Step 1: Record the public comparison**
  - Include the current public pages/coverage for BDO Workshop, BDO Codex, BDOLytics, and Garmoth; distinguish rendered observations, search-indexed claims, inaccessible UI, and unverified functionality.
- [x] **Step 2: Reconcile the checklist and handoff**
  - Mark only the visual phase-3 scope completed; preserve OCR, Firebase, data-quality, and authentication blockers as pending.
- [x] **Step 3: Format and verify documentation**
  - Run: `pnpm exec prettier --check <changed markdown files>` and `git diff --check`.
  - Expected: both commands exit 0.
- [x] **Step 4: Commit**
  - Commit message: `docs: record storage profile and OCR visual rollout`

## Final Verification

- Run focused specs for Storage, Family, Equipment, and Scans after their tasks.
- Run `pnpm check` and `pnpm test` after the final code changes.
- Run `pnpm --filter @bdo/web build` and report existing budget/locale/CommonJS warnings accurately.
- Inspect affected public/authenticated screens in a browser when a valid local identity is available; if authentication blocks access, document that limitation and do not bypass the guard.
- Check `git diff --check`, review the complete branch diff, and update the handoff with commit SHAs and any unverified browser states.
