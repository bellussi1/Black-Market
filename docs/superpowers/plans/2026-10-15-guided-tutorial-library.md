# Biblioteca de tutoriais guiados por tela — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar tours curtos iniciados sob demanda, editáveis por tela e servidos pelo banco/API, sem permitir que conteúdo editorial escolha código, rota ou seletor.

**Architecture:** `@bdo/shared` será a fonte versionada das telas e âncoras permitidas; Drizzle persistirá guias e passos, e a API validará cada leitura e escrita usando esse registro. No navegador, um serviço Angular carrega Driver.js somente após acionamento explícito, resolve âncoras para elementos DOM e renderiza o conteúdo como texto; a gestão reutiliza a identidade administrativa e a concorrência otimista do Roadmap.

**Tech Stack:** Angular 22.2 com SSR, NestJS 12, Drizzle ORM, PostgreSQL, `driver.js` com versão exata no `apps/web`, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-15-guided-tutorial-library-design.md`

## Global Constraints

- Primeira publicação: Mercado e Receitas/Crafting públicos; Scan, Armazém e Recomendações autenticados pelo `authGuard` existente.
- Guias só iniciam após ação explícita; cada abertura começa no passo 1, e dispensar, concluir e replay continuam distintos e sem progresso persistido.
- Registro de telas e âncoras fica no código compartilhado. O banco guarda `screenKey` e `anchorKey` permitidos; nunca rota, seletor CSS, atributo, HTML, JavaScript ou ação executável.
- Guias têm de 1 a 8 passos; `title` tem até 100 caracteres e `body` até 360 caracteres. A ordem salva é densa, de `0` a `n - 1`.
- O conteúdo publicado inicial é `pt-BR`; não há fallback para outra localidade. A interface envia `uiLocale()`.
- Migração não inclui copy de exemplo ou conteúdo de negócio. Seed de conteúdo é versionado, idempotente e preserva valores já editados; nenhum texto do guia fica no bundle Angular.
- `GET /api/v1/tutorials/:screenKey?locale=pt-BR` é público e usa `Cache-Control: public, max-age=60, stale-while-revalidate=300`; `GET /manage` e `PUT /manage/:screenKey` usam `Cache-Control: private, no-store`.
- Leitura pública retorna `guide: null` sem guia ativo e 404 para tela desconhecida. Escritas substituem atomicamente e usam `expectedUpdatedAt`; conflito retorna 409 sem apagar o rascunho.
- Gestão confere Firebase no servidor e reutiliza `ROADMAP_ADMIN_FIREBASE_UIDS`; guard ou `canManageRoadmap` no Angular não substituem autorização da API.
- Driver.js e DOM só são acessados no browser, após render e clique. Mudança de rota encerra o único tour ativo; falhas do tutorial não bloqueiam a tela.
- Texto de guia é dado não confiável e sempre vira `textContent`; markup HTML/Markdown é rejeitado. O cliente passa ao Driver.js somente elementos DOM resolvidos por chave permitida.
- Controles do tour são botões nativos, localizados, com foco visível e alvos de pelo menos 44 × 44 px. Teclado não intercepta setas ou digitação dos controles da tela; Escape dispensa. Foco vai ao popover ao iniciar, título/texto/progresso são anunciados e foco retorna ao launcher quando possível.
- Overlay não avança nem fecha; avançar/voltar nunca aciona o alvo. O progresso é `n de m`; rolagem da página continua disponível para alcançar âncoras.
- Movimento reduzido desativa animação/transição e rolagem suave do tour. O popover adapta largura/altura a viewports estreitas e não corta conteúdo longo.
- O tema usa superfícies carvão, borda bronze/dourada e controles retangulares; sem imagem de menu in-game, emoji, neon, pílula arredondada ou beacon como única indicação.
- Analytics permite somente início, conclusão e dispensa, com consentimento já existente. Propriedades de tutorial: `screenKey` registrado e revisão `updatedAt`; não enviar texto, passo, âncora, URL completa ou dados da conta/workspace.
- Não criar RLS por usuário para conteúdo público; navegador nunca acessa PostgreSQL diretamente. A role runtime ganha somente os privilégios necessários às duas tabelas novas.

## Review Focus

1. Texto persistido contendo tags, links Markdown ou caracteres de ataque deve continuar texto inerte: `tutorial.service.spec.ts` (`renders hostile title and body with textContent only`) e `tutorial-validation.spec.ts` (`rejects HTML and Markdown in guide text`).
2. Âncoras duplicadas, ocultas ou removidas entre passos não podem destacar outro elemento nem travar o tour: `tutorial-anchor-resolver.spec.ts` (`omits hidden and duplicate targets`) e `tutorial.service.spec.ts` (`skips a future target removed during the tour`).
3. Alternância desktop/mobile ou abas pode deixar mais de um alvo no DOM; apenas o único alvo visível é elegível: `tutorial-anchor-resolver.spec.ts` (`resolves exactly one visible target among responsive variants`) e testes de template da Task 8.
4. Preferência `prefers-reduced-motion` deve afetar instância e tema sem tocar APIs do browser em SSR: `tutorial.service.spec.ts` (`disables motion and smooth scrolling when reduced motion is requested`) e `pnpm test:ssr` na Task 11.
5. Consentimento revogado enquanto o tour está aberto deve cancelar envios e impedir eventos posteriores: `analytics.service.spec.ts` (`stops tutorial events immediately when analytics consent is revoked`).

---

### Task 1: Contratos compartilhados e registro de telas/âncoras

**Files:**

- Create: `packages/shared/src/tutorials.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/api/src/tutorials/tutorial-registry.spec.ts`

**Interfaces:**

- `TUTORIAL_LOCALES`: tupla inicial `['pt-BR']`.
- `TUTORIAL_SCREEN_REGISTRY`: entradas `market`, `recipes`, `scans`, `storage` e `recommendations`, cada uma com rota/componente responsável, acesso (`public` ou `authenticated`) e âncoras permitidas com identificador e chave estável.
- `TutorialScreenKey` é a união das cinco chaves acima; `TutorialLocale` é derivado de `TUTORIAL_LOCALES`; `TutorialAnchorKey` é a união das chaves de âncora listadas abaixo.
- `TutorialScreenDefinition` tem `{ screenKey, route, access, anchors: { key, labelKey }[] }`. `TutorialGuideStep` tem `{ id, sortOrder, anchorKey: string | null, title, body }`; a resposta preserva `anchorKey` como string para que o editor detecte chaves removidas do registro.
- `TutorialGuide` tem `{ id, screenKey, locale, enabled, updatedAt, steps }`; `TutorialPublicGuide` tem `{ screenKey, locale, updatedAt, steps: { sortOrder, anchorKey, title, body }[] }` sem estado administrativo ou IDs.
- `TutorialGuideResponse` tem `{ guide: TutorialPublicGuide | null }`; `TutorialManagementResponse` tem `{ screens: TutorialScreenDefinition[], locales: TutorialLocale[], guides: TutorialGuide[] }`.
- `TutorialGuideUpdateRequest` tem `{ expectedUpdatedAt: string | null, enabled: boolean, steps: { sortOrder, anchorKey: string | null, title, body }[] }`.
- Helpers puros: `isTutorialScreenKey(value: string)` e `isTutorialAnchorForScreen(screenKey, anchorKey)`; a API e o cliente não reinterpretam chave desconhecida como seletor.
- Chaves iniciais das âncoras: `market.search`, `market.filters`, `market.results`; `recipes.search`, `recipes.methods`, `recipes.tree`; `scans.capture`, `scans.review`; `storage.items`, `storage.projects`; `recommendations.conditions`, `recommendations.ranking`.

- [ ] **Step 1: Escrever os testes de contrato que falham** em `apps/api/src/tutorials/tutorial-registry.spec.ts`:
  - `lists only the five first-publication screens with the specified access boundary`: nomes/rotas esperados e classificação pública/autenticada acima.
  - `keeps every anchor unique and scoped to its registered screen`: não há chave duplicada e a chave de outra tela não é aceita.
  - `rejects unknown screen and anchor keys`: lookup de tela/chave inexistente falha fechado.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-registry.spec.ts`
Expected: FAIL porque o registro e os tipos exportados ainda não existem.

- [ ] **Step 3: Implementar os contratos** em `packages/shared/src/tutorials.ts` e exportá-los por `packages/shared/src/index.ts`; manter nomes, caminhos, chaves e níveis de acesso apenas no registro de código.

- [ ] **Step 4: Verificar build e testes**

Run: `pnpm --filter @bdo/shared build`
Expected: PASS com declarações/artefatos CommonJS e browser compilados.

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-registry.spec.ts`
Expected: PASS nos três testes.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/tutorials.ts packages/shared/src/index.ts apps/api/src/tutorials/tutorial-registry.spec.ts
git commit -m "feat(tutorials): define shared screen registry"
```

### Task 2: Schema Drizzle, migração e privilégios runtime

**Files:**

- Modify: `packages/database/src/schema.ts`
- Create: `packages/database/drizzle/0012_tutorial_guides.sql` (the Roadmap plan already uses migration `0011`)
- Modify: `packages/database/drizzle/meta/_journal.json` e snapshot Drizzle gerado
- Modify: `deploy/runtime-role.sql`
- Modify: `apps/api/src/database/runtime-role.ts`, `runtime-role.spec.ts`
- Create: `apps/api/src/tutorials/tutorial-schema.spec.ts`

**Interfaces:**

- `tutorialGuides`: UUID, `screen_key`, `locale`, `enabled`, `updated_at`; unicidade `(screen_key, locale)`.
- `tutorialGuideSteps`: UUID, `guide_id` com cascade, `sort_order`, `anchor_key` nullable, `title`, `body`; unicidade `(guide_id, sort_order)` e `sort_order >= 0`.
- Exportar ambas as tabelas no objeto `schema`; `screen_key` e associação `anchor_key` continuam sendo validados pelo registro compartilhado, não por cópia mutável no banco.
- A role `black_market_app` precisa de SELECT/INSERT/UPDATE/DELETE nas tabelas de guias e passos para leitura e substituição administrativa; manter os privilégios atuais das demais tabelas.
- `RuntimePrivileges`/`RUNTIME_PRIVILEGES_QUERY` adicionam `tutorial_guides_select|insert|update|delete` e `tutorial_steps_select|insert|update|delete`, todos obrigatórios para o fluxo API definido.

- [ ] **Step 1: Escrever testes de esquema/privilégios que falham** em `apps/api/src/tutorials/tutorial-schema.spec.ts` e ampliar `apps/api/src/database/runtime-role.spec.ts`:
  - `models unique screen and locale and the tutorial step cascade/order constraints`: verificar colunas, unicidades, FK cascade e check não negativo via `getTableConfig`.
  - `requires only the four tutorial table privileges used by the API`: a role aceita o conjunto exato e falha quando qualquer grant necessário falta.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/database build`
Expected: FAIL porque as tabelas novas ainda não estão exportadas.

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-schema.spec.ts src/database/runtime-role.spec.ts`
Expected: FAIL nas asserções de schema e privilégio tutorial.

- [ ] **Step 3: Implementar schema, migração e grants**; gerar e revisar o SQL Drizzle, aplicar constraints descritas na interface e adicionar grants explícitos somente para `tutorial_guides` e `tutorial_guide_steps`. Atualizar a query de privilégios e o objeto esperado sem ampliar grants preexistentes.

- [ ] **Step 4: Verificar schema, migração e role**

Run: `pnpm --filter @bdo/database build`
Expected: PASS.

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-schema.spec.ts src/database/runtime-role.spec.ts`
Expected: PASS.

Run: `pnpm db:check`
Expected: PASS com journal ordenado e sem conflitos de migração.

- [ ] **Step 5: Commit**

```bash
git add packages/database/src/schema.ts packages/database/drizzle apps/api/src/tutorials/tutorial-schema.spec.ts apps/api/src/database/runtime-role.ts apps/api/src/database/runtime-role.spec.ts deploy/runtime-role.sql
git commit -m "feat(tutorials): add guide persistence schema"
```

### Task 3: Validação server-side de payloads

**Files:**

- Create: `apps/api/src/tutorials/tutorial-validation.ts`
- Create: `apps/api/src/tutorials/tutorial-validation.spec.ts`

**Interfaces:**

- `parseTutorialGuideUpdate(screenKey: string, locale: string, input: unknown): TutorialGuideUpdateRequest` valida a tela no registro, locale suportado, `expectedUpdatedAt`, `enabled` e passos.
- Cada passo recebe ordem inteira não negativa e âncora nula ou permitida para a tela. A validação ordena pela ordem recebida e normaliza `sortOrder` para `0..n-1`.
- Rejeitar quantidade fora de 1–8, título/corpo vazios ou acima de 100/360 caracteres, HTML, Markdown e campos extras; não aceitar campos de rota, seletor, callback ou ação.

- [ ] **Step 1: Escrever testes de validação que falham** em `apps/api/src/tutorials/tutorial-validation.spec.ts`:
  - `accepts one to eight pt-BR plain-text steps and normalizes their order`: limites inclusivos e entradas fora de sequência resultam em ordens densas `0..n-1`.
  - `rejects unsupported locales, unknown screens, zero or nine steps, and overlong fields`: confirmar erros de payload.
  - `rejects HTML, Markdown, extra selector fields, and cross-screen anchors`: texto malicioso, rota/seletor e chave incompatível são rejeitados.
  - `accepts a null anchor as an intentional general step`: a etapa sem destaque continua válida.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-validation.spec.ts`
Expected: FAIL porque o parser ainda não existe.

- [ ] **Step 3: Implementar `parseTutorialGuideUpdate`** com Zod estrito e validação de âncora por `isTutorialAnchorForScreen`; manter mensagens de erro com `path` do campo para o editor.

- [ ] **Step 4: Executar os testes focados**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-validation.spec.ts`
Expected: PASS nos quatro testes.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tutorials/tutorial-validation.ts apps/api/src/tutorials/tutorial-validation.spec.ts
git commit -m "feat(tutorials): validate guide edits"
```

### Task 4: Serviço de persistência e seed idempotente

**Files:**

- Create: `apps/api/src/tutorials/tutorials.service.ts`
- Create: `apps/api/src/tutorials/tutorials.service.spec.ts`
- Create: `apps/api/src/tutorials/tutorial-seed.ts`, `tutorial-seed-content.ts`, `tutorial-seed.cli.ts`, `tutorial-seed.module.ts` e `tutorial-seed.spec.ts`
- Modify: `apps/api/package.json`

**Interfaces:**

- `TutorialsService.getPublished(screenKey, locale): Promise<TutorialGuideResponse>` retorna somente guia habilitado com `guide: null` quando ausente/desativado; tela não registrada gera 404.
- `TutorialsService.getManagement(): Promise<TutorialManagementResponse>` retorna metadados do registro/idiomas e todos os guias, inclusive desativados.
- `TutorialsService.replace(screenKey, locale, input: TutorialGuideUpdateRequest): Promise<TutorialGuide>` valida, compara `expectedUpdatedAt`, troca guia/passos numa transação e retorna a revisão salva. `null` cria somente quando não existe; timestamp só grava em igualdade.
- `seedTutorialGuides(revision, entries)` insere guias e passos apenas para chaves ausentes; conflito preserva todos os campos já editados. CLI `pnpm --filter @bdo/api tutorials:seed` carrega a constante versionada `TUTORIAL_SEED_REVISION` de `tutorial-seed-content.ts`.

- [ ] **Step 1: Escrever os testes de serviço e seed que falham**:
  - `apps/api/src/tutorials/tutorials.service.spec.ts`: `returns null when a registered guide is disabled or missing`; `lists registered screens and locales including disabled guides`; `replaces metadata and ordered steps atomically on matching version`; `creates only with a null expectedUpdatedAt`; `rejects stale versions without deleting the current guide`.
  - `apps/api/src/tutorials/tutorial-seed.spec.ts`: `inserts missing guides once and preserves later administrative edits when rerun` usando conteúdo sintético exclusivo do teste.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorials.service.spec.ts src/tutorials/tutorial-seed.spec.ts`
Expected: FAIL porque o serviço e o seed não existem.

- [ ] **Step 3: Implementar serviço, conteúdo inicial e runner** com transação, lock de concorrência e `onConflictDoNothing`; registrar o comando CLI no pacote. Escrever passos curtos a partir dos controles reais de cada tela, armazená-los somente na lista de dados do seed e conferir os rótulos/âncoras contra a UI atual. Esse seed é apenas bootstrap do banco e preserva qualquer edição posterior; o cliente sempre lê o conteúdo publicado pela API, sem cópia/fallback no bundle.

- [ ] **Step 4: Executar os testes focados**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorials.service.spec.ts src/tutorials/tutorial-seed.spec.ts`
Expected: PASS nos seis testes.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tutorials/tutorials.service.ts apps/api/src/tutorials/tutorials.service.spec.ts apps/api/src/tutorials/tutorial-seed.ts apps/api/src/tutorials/tutorial-seed-content.ts apps/api/src/tutorials/tutorial-seed.cli.ts apps/api/src/tutorials/tutorial-seed.module.ts apps/api/src/tutorials/tutorial-seed.spec.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(tutorials): persist and seed guide content"
```

### Task 5: Endpoints públicos e administrativos

**Files:**

- Create: `apps/api/src/tutorials/tutorials.controller.ts`, `tutorials.controller.spec.ts`, `tutorials.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**

- `GET /api/v1/tutorials/:screenKey?locale=pt-BR`: público, cache 60 s + `stale-while-revalidate=300`; retorna guia ativo ou `guide: null`; desconhecida 404.
- `GET /api/v1/tutorials/manage`: verificar `IdentityService.roadmapAdmin(authorization)` antes de chamar o serviço; devolver desativados e `private, no-store`.
- `PUT /api/v1/tutorials/manage/:screenKey?locale=pt-BR`: mesma autorização server-side, substituição validada e `private, no-store`.
- Declarar rota estática `manage` antes de `:screenKey` no controller para impedir colisão com o segmento dinâmico.

- [ ] **Step 1: Escrever testes do controller que falham** em `apps/api/src/tutorials/tutorials.controller.spec.ts`:
  - `serves a public registered guide without checking identity and keeps the public cache policy`.
  - `returns 404 for an unregistered public screen`.
  - `checks the roadmap administrator before both management operations` e confirma que serviço não é chamado após negação.
  - `keeps manage routes distinct from the dynamic screen route`: verificar caminhos/metadados Nest das três operações.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorials.controller.spec.ts`
Expected: FAIL porque controller e módulo não existem.

- [ ] **Step 3: Implementar controller e módulo** usando `IdentityService` e `TutorialsService`; declarar os headers exatos da especificação e registrar `TutorialsModule` em `AppModule`.

- [ ] **Step 4: Executar os testes focados e lint da API**

Run: `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorials.controller.spec.ts`
Expected: PASS nos quatro testes.

Run: `pnpm --filter @bdo/api lint`
Expected: PASS sem warnings.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tutorials/tutorials.controller.ts apps/api/src/tutorials/tutorials.controller.spec.ts apps/api/src/tutorials/tutorials.module.ts apps/api/src/app.module.ts
git commit -m "feat(tutorials): expose public and managed endpoints"
```

### Task 6: Cliente HTTP e resolução segura de âncoras

**Files:**

- Create: `apps/web/src/app/core/tutorial-api.service.ts`, `tutorial-api.service.spec.ts`
- Create: `apps/web/src/app/core/tutorial-anchor-resolver.ts`, `tutorial-anchor-resolver.spec.ts`

**Interfaces:**

- `TutorialApiService.getPublished(screenKey: TutorialScreenKey, locale: string): Observable<TutorialGuideResponse>` envia locale e não exige token.
- `TutorialApiService.getManagement(): Promise<TutorialManagementResponse>` e `replace(screenKey, locale, update): Promise<TutorialGuide>` usam bearer Firebase obtido por `IdentityService`.
- `resolveTutorialSteps(document: Document, screenKey, steps)` compara `data-tour` com âncoras permitidas e retorna somente etapas gerais ou elementos únicos, visíveis e registrados; reporta etapas omitidas para a UI acessível.
- Resolver percorre elementos `[data-tour]` e compara o valor à chave permitida; nunca compõe seletor com texto vindo da API.

- [ ] **Step 1: Escrever testes que falham**:
  - `apps/web/src/app/core/tutorial-api.service.spec.ts`: `loads public content with ui locale without identity`; `adds a verified bearer token to management read and replacement`.
  - `apps/web/src/app/core/tutorial-anchor-resolver.spec.ts`: `resolves only keys registered for the requested screen`; `omits hidden and duplicate targets`; `resolves exactly one visible target among responsive variants`; `keeps null-anchor steps centered`.

- [ ] **Step 2: Executar testes para confirmar a falha**

Run: `pnpm --filter @bdo/shared build`
Expected: PASS, preparando os contratos consumidos pelo Angular.

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/tutorial-api.service.spec.ts" --include="app/core/tutorial-anchor-resolver.spec.ts"`
Expected: FAIL porque serviços e resolver ainda não existem.

- [ ] **Step 3: Implementar cliente e resolver**; usar `uiLocale()` como default no ponto de chamada, bearer só nas rotas de gestão e geometria/estilo computado no browser para a condição de visibilidade.

- [ ] **Step 4: Executar testes focados**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/tutorial-api.service.spec.ts" --include="app/core/tutorial-anchor-resolver.spec.ts"`
Expected: PASS nos seis testes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/core/tutorial-api.service.ts apps/web/src/app/core/tutorial-api.service.spec.ts apps/web/src/app/core/tutorial-anchor-resolver.ts apps/web/src/app/core/tutorial-anchor-resolver.spec.ts
git commit -m "feat(tutorials): fetch guides and resolve anchors"
```

### Task 7: Driver.js sob demanda, popover textual e launcher

**Files:**

- Modify: `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/src/styles.scss`
- Create: `apps/web/src/app/core/tutorial.service.ts`, `tutorial.service.spec.ts`
- Create: `apps/web/src/app/shared/tutorial-launcher/tutorial-launcher.ts`, `.html`, `.scss`, `.spec.ts`
- Create: `apps/web/src/app/features/tutorials/tutorial-popover.scss`

**Interfaces:**

- `TutorialService.startTour(guide: TutorialGuide, launcher: HTMLButtonElement): Promise<void>` cria uma única instância Driver.js depois do clique e depois de `isPlatformBrowser`; cada chamada volta ao passo 1.
- `TutorialService.destroyTour(reason: 'completed' | 'dismissed' | 'navigation')` fecha a instância, limpa estado volátil e devolve foco ao launcher se ainda estiver conectado.
- Se todos os alvos forem omitidos e não houver etapa geral, não abrir Driver.js; anunciar que o guia precisa de atualização no launcher.
- `TutorialLauncher` recebe `screenKey`, consulta a API, esconde-se em `guide: null`, mostra retry discreto em falha e chama `startTour` somente por botão acionado.
- O adapter do popover injeta título/corpo via `textContent`; Driver.js recebe `HTMLElement` resolvido e nunca passa `title`/`description` do banco aos sinks HTML.
- Configuração local do tour fornece botões localizados, progresso, overlay sem ação, saída por Escape, rolagem quando necessária, skip de alvo desaparecido após `ANCHOR_RECHECK_DELAY_MS = 150`, restauração de foco e encerramento na navegação.
- Tema importa CSS base do Driver.js e aplica classe própria com tokens carvão/bronze; movimento reduzido desativa animação e rolagem suave.

- [ ] **Step 1: Escrever testes que falham**:
  - `apps/web/src/app/core/tutorial.service.spec.ts`: `does not import or construct Driver before a browser click`; `renders hostile title and body with textContent only`; `starts every replay at step one and distinguishes completion from dismissal`; `destroys the active tour on route navigation and restores connected focus`; `skips a future target removed during the tour`; `does not open an empty tour and announces that the guide needs an update`; `disables motion and smooth scrolling when reduced motion is requested`.
  - `apps/web/src/app/shared/tutorial-launcher/tutorial-launcher.spec.ts`: `hides when no published guide exists`; `shows retry after a failed guide request without blocking the screen`; `starts only after keyboard or pointer activation`.

- [ ] **Step 2: Executar testes para confirmar a falha**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/tutorial.service.spec.ts" --include="app/shared/tutorial-launcher/tutorial-launcher.spec.ts"`
Expected: FAIL porque o serviço e launcher ainda não existem.

- [ ] **Step 3: Fixar Driver.js e implementar o ciclo de vida**; carregar com `import('driver.js')` dentro do início do tour no browser, montar passos a partir do resolver, encerrar ao iniciar navegação e não persistir estado.

- [ ] **Step 4: Implementar popover e launcher** com conteúdo textual, controles nativos/localizados, retry, progresso e estados acessíveis; não incluir copy editorial do guia.

- [ ] **Step 5: Executar testes focados e build SSR**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/tutorial.service.spec.ts" --include="app/shared/tutorial-launcher/tutorial-launcher.spec.ts"`
Expected: PASS nos dez testes.

Run: `pnpm --filter @bdo/web build`
Expected: PASS com bundle browser e servidor SSR; nenhum import de Driver.js toca `window`/DOM no servidor.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/styles.scss apps/web/src/app/core/tutorial.service.ts apps/web/src/app/core/tutorial.service.spec.ts apps/web/src/app/shared/tutorial-launcher apps/web/src/app/features/tutorials/tutorial-popover.scss
git commit -m "feat(tutorials): add on-demand guided tour runtime"
```

### Task 8: Ligar as cinco telas e marcar alvos estáveis

**Files:**

- Modify: `apps/web/src/app/features/market/market-page.ts`, `market-page.html`, `market-board.html`, `market-page.spec.ts`
- Modify: `apps/web/src/app/features/recipes/recipes-page.ts`, `recipes-page.html`, `recipes-page.spec.ts`
- Modify: `apps/web/src/app/features/scans/automatic-scan-page.ts`, `automatic-scan-page.html`, `scans-page.html`; create/modify `automatic-scan-page.spec.ts`
- Modify: `apps/web/src/app/features/storage/storage-page.ts`, `storage-page.html`, `storage-page.spec.ts`, `stock/stock-page.ts`, `stock/stock-page.html`, `stock/stock-page.spec.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.ts`, `recommendations-page.html`, `recommendations-page.spec.ts`

**Interfaces:**

- Cada página chama o launcher reutilizável com sua chave literal; manter header/área de ajuda e o mesmo rótulo localizado nas telas compatíveis.
- Adicionar os `data-tour` literais do registro em grupos/controles sem alterar suas ações. Elementos responsivos/abas escondidas não podem resultar em mais de um alvo visível com a mesma chave.
- Mercado e Receitas mantêm browsing público. Scan, Armazém e Recomendações mantêm os guards/rotas existentes; nenhum dado pessoal entra no pedido tutorial.

- [ ] **Step 1: Escrever testes de template que falham** nos arquivos `.spec.ts` listados:
  - `marketPage registers search, filters and results anchors exactly once`.
  - `recipesPage registers search, methods and recipe tree anchors exactly once`.
  - `automaticScanPage exposes capture and review anchors only in their visible states`.
  - `storagePage and stockPage expose the registered item anchor without visible duplicates`.
  - `recommendationsPage registers conditions and ranking anchors exactly once`.
    Em cada teste conferir que o launcher usa a chave esperada e os alvos usam apenas as chaves registradas.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/market/market-page.spec.ts" --include="app/features/recipes/recipes-page.spec.ts" --include="app/features/scans/automatic-scan-page.spec.ts" --include="app/features/storage/storage-page.spec.ts" --include="app/features/stock/stock-page.spec.ts" --include="app/features/recommendations/recommendations-page.spec.ts"`
Expected: FAIL nas novas asserções de launcher e `data-tour`.

- [ ] **Step 3: Marcar âncoras nas telas** com namespaces estáveis do Task 1; conferir as duas variantes da rota Armazém e os estados de captura/revisão do Scan.

- [ ] **Step 4: Inserir o launcher nos headers/áreas de ajuda** e adicionar `TutorialLauncher` às imports Angular necessárias; não alterar `authGuard` nem fluxo de dados.

- [ ] **Step 5: Executar os seis testes de tela**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/market/market-page.spec.ts" --include="app/features/recipes/recipes-page.spec.ts" --include="app/features/scans/automatic-scan-page.spec.ts" --include="app/features/storage/storage-page.spec.ts" --include="app/features/stock/stock-page.spec.ts" --include="app/features/recommendations/recommendations-page.spec.ts"`
Expected: PASS com uma instância visível por chave em cada estado coberto.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/market apps/web/src/app/features/recipes apps/web/src/app/features/scans/automatic-scan-page* apps/web/src/app/features/scans/scans-page.html apps/web/src/app/features/storage apps/web/src/app/features/stock apps/web/src/app/features/recommendations
git commit -m "feat(tutorials): register anchors on first-release screens"
```

### Task 9: Editor administrativo e entrada no Roadmap

**Files:**

- Create: `apps/web/src/app/features/tutorials/tutorials-manage-page.ts`, `.html`, `.scss`, `.spec.ts`
- Modify: `apps/web/src/app/app.routes.ts`
- Modify: `apps/web/src/app/features/roadmap/roadmap-page.html`, `roadmap-page.spec.ts`

**Interfaces:**

- Rota direta `/tutorials/manage`, `private` e `noindex`; a página verifica `IdentityService.canManageRoadmap()` para UX, mas API mantém a autorização obrigatória.
- Editor lê somente telas/idiomas do registro; edita ativação e 1–8 passos, texto simples, ordem, âncora registrada ou `anchorKey: null`; sem campo de rota/seletor e sem WYSIWYG.
- Estado do editor distingue carregamento, erro recuperável, limpo/sujo, salvando e salvo. Erros de validação ficam junto aos campos; 409 e falhas mantêm o rascunho.
- Reordenação/add/remove envia substituição completa e usa `expectedUpdatedAt` recebido no GET/salvamento.
- Âncora antiga removida do registro aparece como inválida e bloqueia salvar até seleção válida ou etapa geral; depois de PUT bem-sucedido, a versão retornada atualiza imediatamente o estado local do editor.
- Roadmap só mostra o link localizado **Editar tutoriais** para `canManageRoadmap`; acesso direto permanece tratado pela página/API.

- [ ] **Step 1: Escrever testes do editor que falham** em `apps/web/src/app/features/tutorials/tutorials-manage-page.spec.ts` e `roadmap-page.spec.ts`:
  - `lists only code-registered screens and locales and offers no selector input`.
  - `creates, edits, removes and reorders steps with a null general anchor option`.
  - `shows field validation and blocks invalid anchors or step counts`.
  - `preserves the full draft after a 409 conflict and after a failed save`.
  - `marks a removed registry anchor invalid and blocks save until it is replaced`.
  - `shows the returned guide revision immediately after a successful save`.
  - `keeps the editor recoverable after a failed management read`.
  - `marks changes dirty, toggles enabled state and clears dirty state after save`.
  - `does not load management content when canManageRoadmap is false`.
  - `shows Editar tutoriais only to a roadmap administrator`.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/tutorials/tutorials-manage-page.spec.ts" --include="app/features/roadmap/roadmap-page.spec.ts"`
Expected: FAIL porque rota, editor e link ainda não existem.

- [ ] **Step 3: Implementar editor e rota** usando os contratos e serviço HTTP dos Tasks 1/6; converter mensagens de validação da API em erros por campo, manter cópia imutável do rascunho em 409 e mostrar no editor a revisão retornada pelo PUT sem repetir a leitura pública cacheada.

- [ ] **Step 4: Adicionar link no Roadmap** com a flag já derivada da identidade, sem tratá-la como autorização backend.

- [ ] **Step 5: Executar testes focados**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/tutorials/tutorials-manage-page.spec.ts" --include="app/features/roadmap/roadmap-page.spec.ts"`
Expected: PASS nos dez testes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/tutorials/tutorials-manage-page.ts apps/web/src/app/features/tutorials/tutorials-manage-page.html apps/web/src/app/features/tutorials/tutorials-manage-page.scss apps/web/src/app/features/tutorials/tutorials-manage-page.spec.ts apps/web/src/app/app.routes.ts apps/web/src/app/features/roadmap/roadmap-page.html apps/web/src/app/features/roadmap/roadmap-page.spec.ts
git commit -m "feat(tutorials): add administrator guide editor"
```

### Task 10: Eventos agregados e atualização da política de privacidade

**Files:**

- Modify: `apps/web/src/app/core/analytics.service.ts`, `analytics.service.spec.ts`
- Modify: `apps/web/src/app/core/tutorial.service.ts` e `tutorial.service.spec.ts`
- Modify: `apps/web/src/app/features/legal/legal-content.ts`, `legal-page.spec.ts`

**Interfaces:**

- Adicionar `captureTutorial(event: 'tutorial_started' | 'tutorial_completed' | 'tutorial_dismissed', screenKey: TutorialScreenKey, guideUpdatedAt: string): boolean` com allowlist separada do `EventProperties` genérico.
- Emitir início, conclusão e dispensa uma vez por abertura/finalização; encerramento por navegação não vira conclusão/dispensa adicional. Nunca emitir evento por passo.
- Respeitar `AnalyticsService` configurado e `PrivacyService.allowsAnalytics()`; revogação cancela pendências pelo mecanismo existente. Não criar identificador, cookie ou consentimento novo.
- Atualizar somente a descrição da política para informar categorias dos três eventos e os campos agregados permitidos; não inserir dados de tutorial nos eventos genéricos existentes.

- [ ] **Step 1: Escrever testes que falham**:
  - `apps/web/src/app/core/analytics.service.spec.ts`: `sends only allowlisted tutorial properties after consent`; `does not send tutorial events without consent or when analytics is disabled`; `stops tutorial events immediately when analytics consent is revoked`.
  - `apps/web/src/app/core/tutorial.service.spec.ts`: `emits exactly one start and one terminal event for completion or dismissal, never per step`.
  - `apps/web/src/app/features/legal/legal-page.spec.ts`: `describes tutorial start, completion and dismissal as optional aggregate analytics`.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/analytics.service.spec.ts" --include="app/core/tutorial.service.spec.ts" --include="app/features/legal/legal-page.spec.ts"`
Expected: FAIL porque o evento/tutorial não existe e a política não o descreve.

- [ ] **Step 3: Implementar a via allowlisted de tutorial** preservando o consentimento/identificador existentes e transmitindo apenas `screenKey` e `guideUpdatedAt` como campos do evento.

- [ ] **Step 4: Atualizar a política e executar testes focados**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/analytics.service.spec.ts" --include="app/core/tutorial.service.spec.ts" --include="app/features/legal/legal-page.spec.ts"`
Expected: PASS; após revogação não há evento em voo nem novo evento de tutorial.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/core/analytics.service.ts apps/web/src/app/core/analytics.service.spec.ts apps/web/src/app/core/tutorial.service.ts apps/web/src/app/core/tutorial.service.spec.ts apps/web/src/app/features/legal/legal-content.ts apps/web/src/app/features/legal/legal-page.spec.ts
git commit -m "feat(tutorials): track consented aggregate tour events"
```

### Task 11: Verificação integrada, acessibilidade e viewports

**Files:**

- Create: `apps/web/src/app/features/tutorials/tutorial-accessibility.spec.ts`
- No new route, permission, copy, analytics category or runtime state.

**Interfaces:**

- Testar fluxo completo do launcher: teclado inicia, Tab/Shift+Tab alcançam controles, Enter/Espaço acionam, Escape dispensa, foco retorna quando possível e setas/digitação de input continuam na tela.
- Testar semântica anunciada de título, corpo e progresso; botões nativos com nomes, foco visível e dimensão mínima 44 × 44 px.
- Verificar comportamento visual em desktop e viewport estreita, incluindo texto de até 360 caracteres, ausência de overflow horizontal, alvos fixos/ocultos e preferência de movimento reduzido.

- [ ] **Step 1: Escrever testes de acessibilidade integrados que falham** em `apps/web/src/app/features/tutorials/tutorial-accessibility.spec.ts`:
  - `supports keyboard start, previous, next, escape and focus restoration`.
  - `announces current title, body and progress without duplicate live regions`.
  - `keeps native controls at least 44 by 44 pixels with visible focus styles`.
  - `preserves arrow-key and text input behavior in the underlying page`.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/tutorials/tutorial-accessibility.spec.ts"`
Expected: FAIL nas asserções de teclado, foco e controles.

- [ ] **Step 3: Corrigir somente os comportamentos de tour necessários** no launcher/tema/páginas que os testes identificarem; conteúdo longo deve quebrar linha sem reticências, e popover nunca pode cobrir ou perder o passo atual.

- [ ] **Step 4: Rodar testes de acessibilidade e compilação SSR**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/tutorials/tutorial-accessibility.spec.ts"`
Expected: PASS nos quatro testes.

Run: `pnpm --filter @bdo/web build`
Expected: PASS com builds de browser e SSR.

Run: `pnpm test:ssr`
Expected: PASS no smoke SSR sem instanciar Driver.js ou acessar DOM no servidor.

Run: `pnpm --filter @bdo/api test`
Expected: PASS em toda a suíte Vitest da API.

Run: `pnpm --filter @bdo/web test`
Expected: PASS em toda a suíte Vitest do Angular.

Run: `pnpm check`
Expected: PASS em lint, format check e typecheck do monorepo.

- [ ] **Step 5: Verificação manual em browser**

Run in terminal 1: `pnpm dev:api`

Run in terminal 2: `pnpm dev:web`

Expected: usando apenas dados temporários de um banco local de desenvolvimento, em Mercado/Receitas públicos e Scan/Armazém/Recomendações autenticados, o launcher aparece apenas com guia ativo; tour não abre sozinho; confirmar com teclado/leitor de tela, zoom alto, viewport estreita, movimento reduzido, alvo ausente e retry após falha de API. Não copiar esse conteúdo temporário para seed/migração. Rotas autenticadas continuam bloqueadas sem sessão e a tela principal segue utilizável quando API/tutorial falha.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/tutorials/tutorial-accessibility.spec.ts apps/web/src/app/core/tutorial.service.ts apps/web/src/app/shared/tutorial-launcher apps/web/src/app/features/tutorials/tutorial-popover.scss
git commit -m "test(tutorials): cover accessible guided tour flow"
```

## Self-Review: cobertura do spec

- Escopo de primeira publicação e fronteira pública/autenticada: Tasks 1, 5, 8 e 11.
- Registro de telas/âncoras, estabilidade, resolução única e comportamento de variantes: Tasks 1, 6, 8 e 11.
- Modelo de banco, constraints e privilégio mínimo: Task 2.
- Limites, locale, texto simples, validação e ordenação: Task 3.
- Cache, respostas públicas/privadas, transação, concorrência e seed: Tasks 4–5.
- Lazy browser-only, SSR, uma instância, navegação, texto inerte, passos ausentes e replay: Tasks 6–8 e 11.
- Editor, auth admin, rascunho em 409 e link no Roadmap: Tasks 5 e 9.
- Teclado, foco, leitor de tela, alvos, movimento reduzido, texto longo e viewport móvel: Tasks 7, 8 e 11.
- Analytics consentido e atualização da política: Task 10.

**Conteúdo editorial do seed:** a especificação exige guias iniciais para o fluxo principal, mas não contém seus textos. Durante a Task 4, redigir conteúdo curto e verificá-lo contra os nomes/controles reais das cinco telas; persistir os valores no seed idempotente, fora do bundle. Após o primeiro seed, o banco e o editor administrativo são a fonte operacional, e o seed nunca sobrescreve alterações. Fixture sintética fica restrita aos testes.
