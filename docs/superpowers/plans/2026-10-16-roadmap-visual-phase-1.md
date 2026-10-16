# Roadmap Visual Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Roadmap visual hierarchy to Home and Recommendations without changing calculations, API contracts, access rules, or persisted data.

**Architecture:** Keep the existing standalone Angular pages and domain-specific layouts. Reuse global BDO tokens and `.panel`/`.panel-heading` styles; make only page-local structural changes for Home and Recommendations. Preserve the current Roadmap-driven Home focus and the existing recommendation ranking and uncertainty model.

**Tech Stack:** Angular 22.2.1, standalone components, signals, SCSS, Spartan Helm/Brain.

**Spec:** `docs/superpowers/specs/2026-10-16-roadmap-inspired-visual-rollout-design.md`

## Global Constraints

- Do not change calculations, API contracts, access rules, or persisted data.
- Preserve the Home focus order and login-aware links from the Roadmap API.
- Keep recommendation metrics, source/coverage explanations, pending state, and unknown values explicit.
- Use existing BDO tokens and rectangular controls; do not add a generic layout wrapper or dependency.
- Keep loading, empty, error, and populated states distinct; reserve layout space during loading.
- Keep keyboard focus, labels, contrast, reduced-motion behavior, and narrow viewport reflow.
- Do not remove or weaken existing guards to make a route inspectable.

## Review Focus

- Long Home focus titles, status labels, and link labels wrap without clipping or horizontal overflow.
- Roadmap focus loading keeps the Home structure stable and exposes a concise accessible status.
- Recommendation results remain the first financial decision surface; only a complete ranked result may receive winner emphasis.
- Incomplete/unknown inputs do not inherit winner styling or imply a reliable profit/hour.
- At 390 px, result values and their labels remain associated and controls remain operable.

---

### Task 1: Align Home with Roadmap hierarchy

**Files:**
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.html`
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.scss`
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.spec.ts`
- Reuse: `apps/web/src/styles/_layout.scss`, `apps/web/src/styles/_tokens.scss`

**Interfaces:**
- Consumes: `DashboardPage.homeFocuses`, `roadmapLoading`, `roadmapError`, `roadmapLoaded`.
- Produces: stable Home page sections with the shared panel/title-bar hierarchy and an accessible focus-loading skeleton.

- [ ] **Step 1: Add regression coverage** for focus skeleton semantics, empty/error status, one primary link with secondary links, and no duplicated focus CTA.
- [ ] **Step 2: Run the focused DashboardPage spec** and confirm the new skeleton assertion fails before markup is changed.
- [ ] **Step 3: Align the Home focus and continuation section headings** with `.panel` and `.panel-heading`; preserve the active focus order and existing route/login link filtering.
- [ ] **Step 4: Add a reserved-size loading skeleton** that respects `prefers-reduced-motion` and exposes `role="status"` with concise text; preserve the existing retry and empty states.
- [ ] **Step 5: Run DashboardPage specs and inspect Home** at 1440×900 and 390×844, including loading, loaded, and long-link content.
- [ ] **Step 6: Commit** the Home visual slice atomically.

### Task 2: Clarify Recommendations decision hierarchy

**Files:**
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.html`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.scss`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.spec.ts`

**Interfaces:**
- Consumes: existing `plans()`, `topPlans()`, `busy()`, `snapshot()`, and `result.incomplete` state.
- Produces: a clear result-first panel hierarchy with winner emphasis restricted to the first complete ranked opportunity.

- [ ] **Step 1: Add regression coverage** for winner emphasis only on ranked results and explicit incomplete/loading states.
- [ ] **Step 2: Run the focused Recommendations spec** and confirm the new assertion fails before markup changes.
- [ ] **Step 3: Refine section heading, ranking count, top result, and supporting metrics** using the Roadmap panel hierarchy; do not reorder user controls in a way that hides assumptions or changes results.
- [ ] **Step 4: Reserve result-space during initial loading** with a skeleton that cannot be mistaken for a calculated amount; preserve text status and existing error/empty behavior.
- [ ] **Step 5: Run the focused Recommendations specs and inspect** desktop/narrow layouts, keyboard focus, long recipe names, and incomplete data.
- [ ] **Step 6: Commit** the Recommendations visual slice atomically.

### Task 3: Record competitor review and handoff

**Files:**
- Create: `docs/research/home-recommendations-competitive-review-2026-10-16.md`
- Modify: `docs/ACTIVE_CONTEXT.md`
- Modify: `docs/ANTIGRAVITY_HANDOFF.md`
- Modify: `docs/superpowers/plans/2026-10-16-backlog-execution.md`

**Interfaces:**
- Consumes: public-page observations collected on 16/10/2026.
- Produces: auditable sources, access limits, and phase status for the next Codex/Antigravity session.

- [ ] **Step 1: Record** each public competitor's relevant surface, accessible/blocked status, date, and URL; separate UI observation from calculation claims.
- [ ] **Step 2: Update** ACTIVE_CONTEXT, handoff, and the backlog plan with completed, partial, blocked, and next actions.
- [ ] **Step 3: Review the staged file list and diffs** so the two UI commits and documentation commit remain atomic and do not absorb unrelated dirty work.
