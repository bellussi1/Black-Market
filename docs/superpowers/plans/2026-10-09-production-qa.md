# Production recommendations and browser QA implementation plan

> **For agentic workers:** Use subagent-driven-development for the independent catalogue, calculator and fixture tasks; execute browser QA and integration in the parent task.

**Goal:** Restore Edania recipes, provide reversible character/stock test data and compare production economics using current quotes and explicit assumptions.

**Architecture:** A consistent catalogue snapshot supplies life-skill recipe graphs. A pure calculator evaluates three sourcing scenarios without extrapolating mastery bonuses. The Angular private recommendation page hydrates prices in bounded batches, lets users calibrate yields/times and shows missing conditions separately. Demonstration uses the existing in-memory store.

**Tech Stack:** Angular, Nest, Drizzle/PostgreSQL, TypeScript, Vitest, Playwright.

- [x] Catalogue: reproduce missing item1407 recipe, verify current client and official sources, publish narrow supplement with backup and provenance; regression tests and consistent production snapshot endpoint.
- [x] Calculator: test recursive quantities/time, shared stock/reservations, tax, cash versus economic costs, limits and invalid/cyclic/unknown data before implementation.
- [x] Demo: schema-valid fictional character and stock using real item identities, no fake market quotes; clear session-only indicator and exit.
- [x] UI: active private O que fazer route, catalogue/market loading progress, profile context, assumptions, per-material choices and prices, ranked results and blockers. Validate rounding/unknown values and mobile layout.
- [x] Browser QA: active routes, search/pagination/quote/history, recipe tree, storage/family edits, image import types/review/save/cancel/duplicates, shopping and privacy. Save repeatable evidence under output/playwright; report limitations explicitly.
- [x] Review and verification: focused regression tests, full tests/build/lint/SSR, fresh Playwright checks after deployment; commit only task-owned files.
