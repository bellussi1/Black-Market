# Cache e acabamento da tela de Mercado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` after the user approves Native execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a tela do Mercado mostrar primeiro a última resposta conhecida da mesma busca e atualizar automaticamente, mantendo os detalhes, filtros, ordenação, gráficos e volumes existentes.

**Architecture:** Usar uma chave canônica de região, consulta, categoria, ordenação, página e tamanho para ler/gravar `boardMap`. A tela mantém a resposta antiga visível durante atualização/falha e aplica o mesmo padrão de controles/feedback das primitivas globais.

**Tech Stack:** Angular signals, RxJS, `MarketCacheService`, Vitest, SCSS global e componentes existentes de gráfico/histórico.

**Spec:** `docs/superpowers/specs/2026-10-10-recipe-market-autoresolver-design.md`

## Global Constraints

- Chave da resposta inclui região, busca normalizada, categoria, ordenação remota, página e tamanho; TTL de 5 minutos.
- Busca com debounce de 250 ms; consulta manual de atualização continua disponível na tela geral do Mercado.
- Respostas antigas permanecem identificadas pela idade/estado de sincronização; falha não apaga cache válido.
- Volume histórico sem cobertura suficiente permanece desconhecido; nunca converter ausência em zero.
- Preservar colunas clicáveis, filtro de estoque, histórico, intervalo de preço e volumes atuais; sem nova dependência ou emojis.
- Executar após `2026-10-10-recipe-production-optimizer.md`, no mesmo branch `codex/recipe-market-autoresolver`.

## Review Focus

- Consulta A muda para B e depois retorna para A: reutilizar apenas a chave correspondente e nunca rotular A como resultado de B; teste em `market-board.spec.ts`.
- Resposta em cache vencida com API falhando: manter a tabela e indicar idade/falha; teste em `market-board.spec.ts`.
- Região muda com requisição pendente: descartar a resposta da região antiga; teste em `market-board.spec.ts`.
- Busca rápida: somente uma requisição após 250 ms sem digitação; teste com timers falsos.
- Histórico sem amostras: continuar desconhecido (`—`), não volume zero; manter teste de regressão existente.

---

### Task 1: Leitura da resposta de board pelo cache

**Files:**

- Modify: `apps/web/src/app/core/market-cache.service.ts`
- Test: `apps/web/src/app/core/market-cache.service.spec.ts`

**Interfaces:**

- Add `getCachedBoardResponse(key: string, region: Region): CachedBoardEntry | null`.
- Keep `cacheBoardResponse(key: string, response: MarketBoardResponse, region: Region): void` and the five-minute TTL.
- Return stale entries too; caller decides whether to refresh based on `expiresAt` and whether the refresh is forced.

- [x] **Step 1: Add failing board cache tests**

Test `returns fresh board entries by canonical key`, `returns expired entries for stale display`, and `keeps region-specific board entries separate`.

- [x] **Step 2: Run the focused cache tests and confirm the new assertions fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/core/market-cache.service.spec.ts`
Expected: the board-read/freshness assertions fail.

- [x] **Step 3: Implement board cache lookup**

Read from `boardMap` by exact key and verify the requested region matches the stored entry. Do not change storage source or collector policy.

- [x] **Step 4: Run the focused cache tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=app/core/market-cache.service.spec.ts`
Expected: all cache service tests pass.

- [x] **Step 5: Commit board cache lookup**

```bash
git add apps/web/src/app/core/market-cache.service.ts apps/web/src/app/core/market-cache.service.spec.ts
git commit -m "feat(market): expose cached board responses"
```

### Task 2: Cache-first loading, background refresh and search debounce

**Files:**

- Modify: `apps/web/src/app/features/market/market-board.ts`
- Modify: `apps/web/src/app/features/market/market-board.html`
- Modify: `apps/web/src/app/features/market/market-board.spec.ts`
- Modify if needed: `apps/web/src/app/features/market/market-refresh.ts`

**Interfaces:**

- Use `load(options: { forceRefresh?: boolean; preservePrevious?: boolean } = {}): void`; automatic refresh defaults to cache-first, manual refresh explicitly sets both flags. `MarketRefresh` invokes `load({ forceRefresh: true, preservePrevious: true })`.
- Canonical key format: `board:${region}:${trimmedQuery}:${category}:${sort}:${sortColumn}:${sortDirection}:${page}:${pageSize}`.
- On load, display a cached response immediately; skip API for a fresh cache unless force refresh was requested. For stale cache, refresh in the background and retain it on error.

- [x] **Step 1: Add failing board tests**

Test `renders a fresh same-query board without an API request`, `renders stale cached results while revalidating`, `retains stale results on refresh failure`, `does not show a prior query under the new search`, `uses a different cache entry for every query and sort key`, and `debounces search at 250ms`.

- [x] **Step 2: Run market board tests and confirm the new assertions fail**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=features/market/market-board.spec.ts`
Expected: cache-first and debounce assertions fail before implementation.

- [x] **Step 3: Implement cache-first query lifecycle**

Build the canonical key from the request filters plus client-side sort column/direction. Render matching cached data immediately, skip fresh requests, revalidate stale data, preserve stale results after failures, and unsubscribe outdated query requests. When no cache entry exists for a changed query, do not label the prior query's response as the new result. Keep manual refresh as force refresh.

- [x] **Step 4: Set search debounce to 250 ms and preserve market data presentation**

Update search scheduling. Keep sortable columns, stock filters, trend/range details, history and all three volume windows. Align local controls with shared global focus/disabled styles and honor reduced motion.

- [x] **Step 5: Run focused market tests**

Run: `pnpm --filter @bdo/calculators build && pnpm --filter @bdo/web exec ng test --watch=false --include=features/market/market-board.spec.ts --include=features/market/market-page.spec.ts --include=features/market/market-history.spec.ts --include=features/market/market-refresh.spec.ts`
Expected: cache lifecycle, sorting, filters, detail and history tests pass.

- [x] **Step 6: Commit board cache and interaction behavior**

```bash
git add apps/web/src/app/features/market/market-board.ts apps/web/src/app/features/market/market-board.html apps/web/src/app/features/market/market-board.spec.ts apps/web/src/app/features/market/market-refresh.ts
git commit -m "feat(market): render cached board while refreshing"
```

### Task 3: Visual and interaction verification

- [x] **Step 1: Verify `/market` in the browser at wide and narrow viewport widths**

Check sortable headers with keyboard, focus visibility, selected stock filters, search feedback, stale/loading/error states, price-history details, and reduced-motion behavior.

- [x] **Step 2: Run the focused and full repository checks**

Run: `pnpm test` and `pnpm check`.
Expected: all repository tests, lint, format, typecheck and build pass.

- [x] **Step 3: Update the handoff and reusable UI guidance**

Record the cache key/TTL behavior and any market information that remains unavailable from the current source in `docs/ACTIVE_CONTEXT.md`; update `docs/project-feature-checklist.md` and `docs/research/implementation-gap-matrix.md` with verified status, without claiming a new source or broader coverage. Update `.agents/skills/bdo-ui-design/SKILL.md` only with reusable visual/interaction patterns confirmed by this implementation.

- [x] **Step 4: Commit final documentation and merge locally**

Review `git status` for unrelated changes, commit only the intended handoff/coverage/skill changes, confirm the feature branch is clean, then merge it into `develop` only after all plan checks pass.

```bash
git add docs/ACTIVE_CONTEXT.md docs/project-feature-checklist.md docs/research/implementation-gap-matrix.md .agents/skills/bdo-ui-design/SKILL.md
git commit -m "docs(market): record cache-first market delivery"
git switch develop
git merge --no-ff codex/recipe-market-autoresolver
```
