# Home e Roadmap em uma trilha dinâmica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar fases e pilares em uma trilha pública de ordem global e fazer a Home promover todos os focos editoriais ativos carregados da API.

**Architecture:** Manter o contrato público `{ entries, updatedAt }` e os tipos `flow | pillar`; mudar a semântica de `sortOrder` para posição global, persistida por índice único e editada em uma lista única. A Home e o Roadmap público consomem `RoadmapApiService.getPublic()`, filtram destinos protegidos conforme a identidade e mantêm estados explícitos sem conteúdo editorial embutido.

**Tech Stack:** pnpm 10.28.1, Node.js ^24.15.0, Angular 22, NestJS 12, Zod, Drizzle ORM/Kit, PostgreSQL, Vitest e testes Angular com `ng test`.

**Spec:** `docs/superpowers/specs/2026-10-15-home-roadmap-dynamic-flow-design.md`

## Global Constraints

- Manter os valores `flow | pillar` no banco e no contrato público por compatibilidade.
- Usar `sortOrder` como posição global da trilha, sem reiniciar a contagem por tipo. A API e o banco exigem posições únicas globalmente.
- Manter os campos atuais de conteúdo (`slug`, `title`, `summary`, `description`, `statusLabel`, `icon`, `featured` e `links`).
- `featured` continua sendo uma marcação independente por entrada: uma ou mais entradas podem ser focos da Home e também recebem destaque visual no Roadmap.
- Não adicionar campos de data, previsão, conclusão percentual ou prazo.
- Não há quantidade máxima de etapas ou pilares definida pelo produto. A renderização se adapta à lista retornada; limites genéricos de corpo da API continuam sendo uma proteção de transporte, não um limite de cards.
- Remover o teto de 32 registros da tela de gestão e da validação da coleção, assim como o teto artificial de posição `1000`.
- Continuam valendo os limites por campo (`slug` 64, `title` 120, `summary` 280, `description` 1600, `statusLabel` 60, `icon` 64, até 8 links por entrada, rótulo de link 80 e caminho interno 180 caracteres), a validação de caminhos internos, a rejeição de HTML e o controle de concorrência por `expectedUpdatedAt`.
- Rejeitar destinos repetidos dentro dos links de uma mesma entrada; o mesmo caminho pode aparecer em entradas diferentes.
- O formato e o endpoint da resposta pública permanecem `{ entries, updatedAt }`, sem personalização por usuário.
- O endpoint público continua retornando conteúdo editorial global e não recebe estado de autenticação. Não incluir dados do workspace, personagem, estoque ou preferências privadas nos registros de Roadmap.
- A resposta pública conserva o valor `flow` por compatibilidade, mas `sortOrder` passa a significar ordem global. API e Web devem ser liberadas juntas para que todas as telas adotem a trilha unificada.
- Usar `isLoginRequiredPath()` para filtrar links de todas as entradas. A filtragem no cliente não substitui o `authGuard` nas rotas nem a verificação server-side da tela de gestão.
- Não preencher estados de carregamento ou falha com conteúdo fictício, nem promover automaticamente uma entrada sem `featured` para foco.
- Manter o tema Black Market: superfícies de carvão, molduras finas, bronze/ouro reservado a foco e seleção, controles retangulares e conteúdo denso.
- Preservar hierarquia semântica, foco de teclado visível, alvos de pelo menos 44 × 44 px e suporte a `prefers-reduced-motion: reduce`.

## Review Focus

- Dados legados têm `sort_order` repetido entre tipos; a migração deve preservar todos os demais campos e ordenar primeiro as fases antigas, depois os pilares, mantendo a ordem relativa de cada tipo. Teste: `migratesLegacyOrderToGlobalSequenceAndPreservesAllOtherColumns` em `apps/api/src/roadmap/roadmap-migration.integration.spec.ts`.
- Coleções válidas podem ter mais de 32 registros e posições acima de 1000; validação, editor e ordenação devem aceitar esses valores sem truncar. Testes: `acceptsMoreThan32EntriesAndSortOrderAbove1000` em `apps/api/src/roadmap/roadmap-validation.spec.ts` e `allowsMultipleHomeFocusEntriesAndCollectionsAbove32` em `apps/web/src/app/features/roadmap/roadmap-manage-page.spec.ts`.
- Caminhos repetidos dentro de uma entrada duplicam ações; o mesmo destino em entradas distintas continua válido. Teste: `rejectsRepeatedPathsInOneEntryButAllowsTheSamePathAcrossEntries` em `apps/api/src/roadmap/roadmap-validation.spec.ts`.
- Durante a inicialização assíncrona da identidade, um visitante não pode ver um link protegido; links públicos continuam visíveis e `returnUrl` só é incluído quando `safeInternalReturnUrl()` aceita o primeiro destino. Testes: `filtersProtectedLinksUntilIdentityInitializationCompletes` em `apps/web/src/app/features/roadmap/roadmap-page.spec.ts` e `filtersProtectedFocusLinksUntilIdentityInitializationCompletes` em `apps/web/src/app/features/dashboard/dashboard-page.spec.ts`.
- Títulos/descrições extensos, vários focos e links, lista vazia e viewport estreita não podem cortar conteúdo, mudar a ordem semântica ou gerar overflow; a ordem continua compreensível sem depender de marcador visual. Testes: `rendersMixedKindsInOneOrderedListWithTextualTypeAndFocus` em `apps/web/src/app/features/roadmap/roadmap-page.spec.ts` e `rendersEveryFeaturedEntryInGlobalOrder` em `apps/web/src/app/features/dashboard/dashboard-page.spec.ts`; complementar com revisão de viewport e teclado descrita nas Tasks 3 e 5.

---

## File Map

- `packages/database/src/schema.ts`: declarar unicidade global de `sortOrder` na tabela `roadmap_entries`.
- `packages/database/drizzle/0011_global_roadmap_order.sql`, `packages/database/drizzle/meta/0010_snapshot.json` e `packages/database/drizzle/meta/_journal.json`: migrar a ordenação existente e registrar o novo estado Drizzle.
- `apps/api/src/roadmap/roadmap-migration.integration.spec.ts`: aplicar a migração sobre uma tabela temporária PostgreSQL com fixture legada e verificar ordem, preservação de conteúdo e unicidade global.
- `apps/api/src/roadmap/roadmap-validation.ts` e `roadmap-validation.spec.ts`: remover limites de coleção/posição e validar posições globais e destinos distintos por entrada.
- `apps/api/src/roadmap/roadmap.service.ts` e `roadmap.service.spec.ts`: devolver a coleção pela ordem global, sem agrupamento por `kind`.
- `apps/web/src/app/features/roadmap/roadmap-page.ts`, `roadmap-page.html`, `roadmap-page.scss` e `roadmap-page.spec.ts`: renderizar a lista global semântica, aplicar a filtragem de acesso e os estados de carregamento/vazio/falha, e apresentar a trilha responsiva.
- `apps/web/src/app/features/roadmap/roadmap-manage-page.ts`, `roadmap-manage-page.html`, `roadmap-manage-page.scss` e `roadmap-manage-page.spec.ts`: editar todas as entradas em uma lista, reordenar entre tipos e selecionar qualquer quantidade de focos.
- `apps/web/src/app/features/dashboard/dashboard-page.ts`, `dashboard-page.html`, `dashboard-page.scss` e `dashboard-page.spec.ts`: substituir a jornada e o diretório estáticos pelos focos dinâmicos, preservando busca contextual e retomada local.
- Os contratos existentes em `packages/shared/src/roadmap.ts`, a API de `RoadmapApiService`, `isLoginRequiredPath()` e `safeInternalReturnUrl()` permanecem compatíveis e são reutilizados; não criar endpoint ou tipo editorial duplicado.

### Task 1: Migrar `roadmap_entries` para ordenação global

**Files:**

- Modify: `packages/database/src/schema.ts`
- Create: `packages/database/drizzle/0011_global_roadmap_order.sql`
- Create: `packages/database/drizzle/meta/0010_snapshot.json` (gerado pelo Drizzle)
- Modify: `packages/database/drizzle/meta/_journal.json`
- Create: `apps/api/src/roadmap/roadmap-migration.integration.spec.ts`

**Interfaces:**

- Consumes: tabela PostgreSQL existente `roadmap_entries`, com índice `roadmap_entries_kind_order_uidx` e `sort_order` único apenas por `kind`.
- Produces: índice único global `roadmap_entries_sort_order_uidx`; `sort_order` legado reatribuído de zero em diante, primeiro por `kind = 'flow'`, depois `kind = 'pillar'`, preservando ordem anterior por `sort_order` e usando `id` como desempate determinístico. Todos os outros valores por linha permanecem iguais.

- [ ] **Step 1: Escrever o teste de migração legado em `apps/api/src/roadmap/roadmap-migration.integration.spec.ts`**

Adicionar `it('migratesLegacyOrderToGlobalSequenceAndPreservesAllOtherColumns', ...)`. Com `ROADMAP_MIGRATION_TEST_URL` apontando para PostgreSQL descartável, criar `roadmap_entries` temporária com o índice antigo e registros `flow`/`pillar` intercalados, executar o SQL real de `0011_global_roadmap_order.sql` e verificar: posições finais `0..N-1`, todas as fases antes dos pilares, ordem relativa antiga por tipo, igualdade de IDs/slugs/tipos/textos/status/ícones/foco/links e rejeição de uma posição repetida entre tipos. O teste deve ser marcado como ignorável apenas quando a variável de ambiente não estiver definida.

- [ ] **Step 2: Rodar o teste para confirmar que a migração ainda falta**

Run: `pnpm --filter @bdo/api exec vitest run src/roadmap/roadmap-migration.integration.spec.ts`
Expected: FAIL porque `0011_global_roadmap_order.sql` ainda não existe; com `ROADMAP_MIGRATION_TEST_URL` ausente, a execução deve indicar o teste como ignorado e não conta como verificação da migração.

- [ ] **Step 3: Atualizar o schema e gerar o esqueleto da migração**

Em `packages/database/src/schema.ts`, trocar `roadmap_entries_kind_order_uidx` (`kind`, `sortOrder`) por `roadmap_entries_sort_order_uidx` (`sortOrder`), sem adicionar restrição para `featured`. Em seguida rodar `pnpm --filter @bdo/database exec drizzle-kit generate --name global_roadmap_order --breakpoints`; confirmar os nomes gerados e usar `0011_global_roadmap_order.sql` e `0010_snapshot.json` no plano de arquivos.

- [ ] **Step 4: Completar a migração antes de criar o índice global**

Em `0011_global_roadmap_order.sql`, remover o índice antigo, atribuir os novos valores com `row_number() over (order by case kind when 'flow' then 0 else 1 end, sort_order, id) - 1`, e então criar o índice único global gerado. O `UPDATE` deve alterar somente `sort_order`; não recriar, excluir ou reescrever conteúdo editorial.

- [ ] **Step 5: Rodar a integração e validar o estado Drizzle**

Run: `pnpm --filter @bdo/api exec vitest run src/roadmap/roadmap-migration.integration.spec.ts`
Expected: PASS quando `ROADMAP_MIGRATION_TEST_URL` estiver configurada para banco PostgreSQL descartável.

Run: `pnpm db:check` e `pnpm --filter @bdo/database build`
Expected: journal/snapshots consistentes e build do pacote de banco concluído.

- [ ] **Step 6: Commit**

```bash
git add packages/database/src/schema.ts packages/database/drizzle/0011_global_roadmap_order.sql packages/database/drizzle/meta/0010_snapshot.json packages/database/drizzle/meta/_journal.json apps/api/src/roadmap/roadmap-migration.integration.spec.ts
git commit -m "feat(roadmap): migrate to global ordering"
```

### Task 2: Aplicar a ordem global e validar a coleção na API

**Files:**

- Modify: `apps/api/src/roadmap/roadmap-validation.ts`
- Modify: `apps/api/src/roadmap/roadmap-validation.spec.ts`
- Modify: `apps/api/src/roadmap/roadmap.service.ts`
- Modify: `apps/api/src/roadmap/roadmap.service.spec.ts`

**Interfaces:**

- Consumes: índice global da Task 1; os contratos existentes `RoadmapUpdateRequest`, `RoadmapEntry` e `RoadmapResponse` de `packages/shared/src/roadmap.ts`.
- Produces: `parseRoadmapUpdate(input: unknown): RoadmapUpdateInput` com `sortOrder` globalmente único, sem teto de coleção/posição e com caminhos distintos dentro de cada entrada; `RoadmapService.list(): Promise<RoadmapResponse>` ordenado somente por `sortOrder`.

- [ ] **Step 1: Escrever os testes de validação e ordenação global**

Em `roadmap-validation.spec.ts`, adicionar `it('acceptsMoreThan32EntriesAndSortOrderAbove1000', ...)`, com pelo menos 33 itens, última posição `1001` e duas entradas `featured: true`; adicionar `it('rejectsDuplicateSortOrdersAcrossKinds', ...)` e `it('rejectsRepeatedPathsInOneEntryButAllowsTheSamePathAcrossEntries', ...)`. Em `roadmap.service.spec.ts`, alterar a fixture para posições globalmente distintas e adicionar `it('returnsPersistedEntriesInGlobalSortOrderRegardlessOfKind', ...)` com tipos intercalados.

- [ ] **Step 2: Rodar as specs para confirmar falhas**

Run: `pnpm --filter @bdo/api exec vitest run src/roadmap/roadmap-validation.spec.ts src/roadmap/roadmap.service.spec.ts`
Expected: FAIL nos testes novos por limite de 32/1000, unicidade ainda por tipo, caminhos repetidos ainda aceitos e serviço ainda agrupando por tipo.

- [ ] **Step 3: Implementar as regras globais em `roadmap-validation.ts` e `roadmap.service.ts`**

Remover `.max(1000)` de `sortOrder` e `.max(32)` de `entries`; manter os demais limites atuais por campo. Fazer a unicidade usar apenas `sortOrder`, com mensagem de erro de ordem única no Roadmap inteiro. Validar caminhos repetidos com escopo por entrada; a mesma rota em entradas diferentes deve continuar válida. Manter `featured` como booleano independente sem regra de exclusividade. Ordenar `list()` com `left.sortOrder - right.sortOrder` sem comparar `kind`.

- [ ] **Step 4: Rodar as specs de API para confirmar aprovação**

Run: `pnpm --filter @bdo/api exec vitest run src/roadmap/roadmap-validation.spec.ts src/roadmap/roadmap.service.spec.ts`
Expected: PASS nos testes novos e existentes, incluindo HTML/caminho interno, coleção vazia, conflito `expectedUpdatedAt` e transação de substituição.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/roadmap/roadmap-validation.ts apps/api/src/roadmap/roadmap-validation.spec.ts apps/api/src/roadmap/roadmap.service.ts apps/api/src/roadmap/roadmap.service.spec.ts
git commit -m "feat(roadmap): validate global order and links"
```

### Task 3: Renderizar o Roadmap público como trilha única

**Files:**

- Modify: `apps/web/src/app/features/roadmap/roadmap-page.ts`
- Modify: `apps/web/src/app/features/roadmap/roadmap-page.html`
- Modify: `apps/web/src/app/features/roadmap/roadmap-page.scss`
- Modify: `apps/web/src/app/features/roadmap/roadmap-page.spec.ts`

**Interfaces:**

- Consumes: `RoadmapApiService.getPublic(): Observable<RoadmapResponse>`, `IdentityService.authenticated()` e `isLoginRequiredPath(path: string)`.
- Produces: uma lista computada pela posição global; cada item conserva `RoadmapEntry`, mostra “Fase” para `flow` e “Pilar” para `pillar`, e expõe somente links permitidos para a sessão atual.

- [ ] **Step 1: Escrever os testes da trilha e filtragem de links**

Em `roadmap-page.spec.ts`, substituir as expectativas de duas seções por `it('rendersMixedKindsInOneOrderedListWithTextualTypeAndFocus', ...)`: API retorna tipos intercalados com `sortOrder` distintos; verificar uma única `<ol>`, `<li><article>`, sequência global idêntica, rótulos textuais de tipo e “Foco da Home”, status em texto e links separados. Adicionar `it('filtersProtectedLinksUntilIdentityInitializationCompletes', ...)` com `initialize()` pendente: rota pública visível, rota protegida ausente enquanto visitante e visível quando o sinal de autenticação passa a `true`. Manter/ajustar testes de vazio, falha, retry e permissão do link de gestão.

- [ ] **Step 2: Rodar a spec para confirmar falhas**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/roadmap/roadmap-page.spec.ts`
Expected: FAIL porque a tela ainda separa `flow` e `pillar` e não rotula o tipo/foco em uma lista comum.

- [ ] **Step 3: Implementar a lista e os estados em `roadmap-page.ts`/`.html`**

Remover `flowEntries` e `pillars`; expor uma coleção ordenada pela API/`sortOrder` e filtrar todos os `entry.links` com `isLoginRequiredPath()` enquanto `authenticated()` for falso. Preservar a chamada a `IdentityService.initialize()` no navegador e a API pública sem estado de usuário. Renderizar uma `<ol>` contendo um `<li>` e `<article>` por entrada; apresentar o tipo, o rótulo textual “Foco da Home” quando `featured`, ícone decorativo com `aria-hidden="true"`, status textual opcional e um link por ação. Não tornar o cartão inteiro linkável. Preservar o estado vazio “O Roadmap ainda não tem conteúdo”, carregamento `role="status"`, falha `role="alert"` com “Tentar novamente” e link de gestão apenas para administrador.

- [ ] **Step 4: Estilizar eixo desktop e coluna mobile em `roadmap-page.scss`**

Usar o eixo central e alternância visual de cartões por posição da lista no desktop; no breakpoint estreito, usar um eixo lateral e uma coluna, sem mudar DOM/ordem nem gerar overflow horizontal. Remover alturas rígidas que cortem conteúdo, permitir quebra de títulos/descrições/links, aplicar alvos mínimos de 44 × 44 px, contorno de foco visível e zerar movimento no `prefers-reduced-motion: reduce`. Tipo, foco e estado devem ter texto além da cor; números ornamentais ficam `aria-hidden`.

- [ ] **Step 5: Rodar a spec e revisar viewport/teclado**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/roadmap/roadmap-page.spec.ts`
Expected: PASS com ordem mista, filtragem de visitante/autenticado e estados de vazio/falha/retry.

Run: `pnpm dev:web`
Expected: em `http://localhost:4200/roadmap`, confirmar manualmente no desktop (1440 px) cartões alternados e no viewport estreito (390 px) uma coluna na mesma ordem; percorrer links com Tab e confirmar foco visível, rótulos compreensíveis e movimento reduzido respeitado. Não há harness de viewport/E2E configurado no repositório.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/roadmap/roadmap-page.ts apps/web/src/app/features/roadmap/roadmap-page.html apps/web/src/app/features/roadmap/roadmap-page.scss apps/web/src/app/features/roadmap/roadmap-page.spec.ts
git commit -m "feat(roadmap): render one accessible global trail"
```

### Task 4: Editar Roadmap em uma lista global

**Files:**

- Modify: `apps/web/src/app/features/roadmap/roadmap-manage-page.ts`
- Modify: `apps/web/src/app/features/roadmap/roadmap-manage-page.html`
- Modify: `apps/web/src/app/features/roadmap/roadmap-manage-page.scss`
- Modify: `apps/web/src/app/features/roadmap/roadmap-manage-page.spec.ts`

**Interfaces:**

- Consumes: os tipos `RoadmapEntryInput`/`RoadmapEntryKind` e `RoadmapApiService.getManaged()`/`replace()` existentes.
- Produces: `move(draftKey: string, direction: -1 | 1)` sobre a lista global; `changeKind(draftKey: string, kind: RoadmapEntryKind)` que conserva `sortOrder`; adicionar ao final e normalizar posições `0..N-1` ao mover/remover; campo de foco rotulado “Mostrar como foco na Home”.

- [ ] **Step 1: Preparar fixture válida e escrever testes de lista global**

Em `roadmap-manage-page.spec.ts`, corrigir `storedEntries` para não repetir posições entre tipos e adicionar `it('rendersOneEditorListInGlobalOrder', ...)`, `it('movesEntriesAcrossKindsAndNormalizesGlobalOrder', ...)`, `it('changingKindPreservesGlobalPosition', ...)`, `it('addsAtEndAndRenumbersAfterRemoval', ...)`, `it('allowsMultipleHomeFocusEntriesAndCollectionsAbove32', ...)` e `it('validatesRepeatedDestinationsBeforeSaving', ...)`. Asserções devem cobrir os dados enviados a `replace()`, duas ou mais caixas `featured` marcadas, 33 entradas, ordem contínua, rejeição local de caminhos repetidos na mesma entrada e nome acessível exato do controle de foco.

- [ ] **Step 2: Rodar a spec para confirmar falhas**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/roadmap/roadmap-manage-page.spec.ts`
Expected: FAIL porque a página ainda agrupa tipos, muda a posição ao alterar tipo, move/remover só dentro do grupo e impede mais de 32 entradas.

- [ ] **Step 3: Implementar a ordem global em `roadmap-manage-page.ts`**

Substituir `EditorGroup`, `flowEntries`, `pillars` e `editorGroups` por uma única coleção ordenada e rótulos derivados do tipo da entrada. Fazer `move()` trocar vizinhos na sequência total e renumerar todas; `changeKind()` alterar somente `kind`; `addEntry()` inserir na última posição global; `confirmRemove()` remover e renumerar todos os restantes. Remover a validação `entries.length > 32` e a desativação do botão de adicionar por contagem. Validar destinos duplicados localmente por entrada usando caminhos normalizados antes de enviar; a API continua sendo a validação final. Manter confirmação de remoção, rascunho, validação de campos, controle de concorrência, conflito e feedback.

- [ ] **Step 4: Implementar a lista e o foco acessível no template/styles**

Renderizar uma única seção/lista com cada entrada mostrando “Fase” ou “Pilar”, botões mover para cima/baixo desabilitados somente nos extremos globais e todos os campos atuais. Renomear o texto da caixa de seleção para “Mostrar como foco na Home”; não limitar quantas são selecionadas. Preservar layout adaptável, labels, foco visível e controles de toque utilizáveis.

- [ ] **Step 5: Rodar a spec para confirmar aprovação**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/roadmap/roadmap-manage-page.spec.ts`
Expected: PASS com reordenação entre tipos, posição preservada ao trocar tipo, adição/remoção global, múltiplos focos e 33 registros; testes existentes de acesso negado, conflito e salvamento continuam passando.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/roadmap/roadmap-manage-page.ts apps/web/src/app/features/roadmap/roadmap-manage-page.html apps/web/src/app/features/roadmap/roadmap-manage-page.scss apps/web/src/app/features/roadmap/roadmap-manage-page.spec.ts
git commit -m "feat(roadmap): manage entries in global order"
```

### Task 5: Substituir jornadas estáticas da Home por focos da API

**Files:**

- Modify: `apps/web/src/app/features/dashboard/dashboard-page.ts`
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.html`
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.scss`
- Modify: `apps/web/src/app/features/dashboard/dashboard-page.spec.ts`

**Interfaces:**

- Consumes: `RoadmapApiService.getPublic(): Observable<RoadmapResponse>`, `IdentityService.authenticated()`/`initialize()`, `isLoginRequiredPath(path: string)` e `safeInternalReturnUrl(candidate: string | null): string | null`.
- Produces: `homeFocuses`, uma lista computada, filtrada por `featured` e ordenada por `sortOrder`; cada foco contém a entrada da API, links públicos permitidos e, para visitantes sem links públicos, `returnUrl` seguro ou `null`.

- [ ] **Step 1: Escrever os testes da Home dinâmica e estados da API**

Em `dashboard-page.spec.ts`, adicionar `it('rendersEveryFeaturedEntryInGlobalOrder', ...)` para múltiplos focos mistos, verificando que títulos, resumo, descrição, estado, ícone e links vêm da resposta API em ordem global. Adicionar `it('doesNotPromoteUnfeaturedEntriesAndShowsRoadmapFallback', ...)`, `it('filtersProtectedFocusLinksUntilIdentityInitializationCompletes', ...)` (inclua um foco só com `/recommendations` e outro só com `/family`; validar ausência dos caminhos protegidos, botão “Entrar para acessar” e `returnUrl` apenas no destino aceito por `safeInternalReturnUrl()`), e `it('keepsSearchAndContinueSectionsAvailableWhenRoadmapFailsAndCanRetry', ...)`. Verificar também que não existem `.flow-card`, `.journey-grid` ou `details.more-tools`, e que busca por item e “Continue de onde parou” permanecem.

- [ ] **Step 2: Rodar a spec para confirmar falhas**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/dashboard/dashboard-page.spec.ts`
Expected: FAIL porque a Home ainda renderiza conteúdo de `journeyOptions`/`tools` e não consulta `/api/v1/roadmap`.

- [ ] **Step 3: Carregar, filtrar e expor os focos em `dashboard-page.ts`**

Injetar `RoadmapApiService`, iniciar a leitura pública no ciclo de vida da Home e inicializar `IdentityService` no navegador. Criar sinais distintos para `loading`, `error`, `loaded` e `entries`; calcular `homeFocuses` com `featured === true` em ordem crescente de `sortOrder`, sem promover não destacados. Filtrar links via `isLoginRequiredPath()` antes de expô-los ao template. Se todos os destinos forem protegidos para visitante, calcular o retorno exclusivamente por `safeInternalReturnUrl(entry.links[0]?.path ?? null)`; se não aceitar, apontar para `/account` sem query. Falha de leitura deve ficar explícita e ter um método de retry; não carregar arrays de substituição.

- [ ] **Step 4: Trocar o hero, estados e cards no template/styles**

Remover `journeyOptions`, `journeys`, `tools`, botões fixos de hero, o fluxo “Um caminho simples”, a grade de jornadas e o diretório “Ver todas as ferramentas”. No espaço promocional ao lado do hero, adicionar a seção “Focos atuais” com todos os `homeFocuses` e os dados editoriais recebidos. Para cada foco, usar o primeiro link permitido como ação principal e os demais como secundários; sem links, usar só o acesso genérico ao `/roadmap`; para links todos protegidos, oferecer “Entrar para acessar”. Incluir estados `role="status"` de carregamento/vazio e `role="alert"` com retry. Preservar busca, navegação contextual do item, retomada local, nota de fonte e navegação principal. Estilizar cartões sem altura fixa, com quebra de texto, links de pelo menos 44 × 44 px, foco visível e movimento reduzido.

- [ ] **Step 5: Rodar a spec e revisar Home responsiva**

Run: `pnpm --filter @bdo/web exec ng test --watch=false --include=app/features/dashboard/dashboard-page.spec.ts`
Expected: PASS para foco único/múltiplo/ausente, sessão visitante/autenticada, retorno seguro, falha/retry e manutenção dos módulos contextuais.

Run: `pnpm dev:web`
Expected: em `http://localhost:4200/`, confirmar no desktop (1440 px) a promoção de focos ao lado do hero; em 390 px, conteúdo em coluna sem corte/overflow. Usar Tab/Shift+Tab para confirmar a ordem de foco e contornos; testar redução de movimento. Verificar que não há duplicação estática de jornada/ferramentas.

- [ ] **Step 6: Verificar os contratos e o build em conjunto**

Run: `pnpm test`
Expected: PASS em API, Web, calculators e scripts; o teste de migração PostgreSQL deve executar com a URL descartável configurada ou aparecer explicitamente como ignorado quando ela não estiver definida.

Run: `pnpm check` e `pnpm build`
Expected: lint, Prettier, typecheck e builds sem erros. Confirmar que as telas consomem `{ entries, updatedAt }`, preservam `flow | pillar` e usam a mesma posição global; API e Web devem ser liberadas juntas.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/features/dashboard/dashboard-page.ts apps/web/src/app/features/dashboard/dashboard-page.html apps/web/src/app/features/dashboard/dashboard-page.scss apps/web/src/app/features/dashboard/dashboard-page.spec.ts
git commit -m "feat(home): promote roadmap featured entries"
```

## Self-review de cobertura do spec

- Ordem global de fases/pilares, migração determinística e preservação de conteúdo: Tasks 1–3.
- Contrato `{ entries, updatedAt }`, validação global, campos/HTML/caminhos, teto removido, destinos repetidos e concorrência: Task 2.
- Lista `<ol>`/`<li>`/`<article>`, ordem, tipo, foco textual, status textual, links separados, ícones decorativos e estados públicos: Task 3.
- Editor único, cruzamento de tipo, posição ao trocar tipo, adição/remover com normalização, vários focos e preservação de guard/conflict/draft: Task 4.
- Home dinâmica, remoção de cópias estáticas, foco múltiplo em ordem, primeira ação/links secundários, ausência de foco, caminhos protegidos e destino de login seguro, retry e ferramentas contextuais preservadas: Task 5.
- Desktop alternado, mobile em uma coluna, conteúdo variável sem corte, ordem de tab, leitores de tela, foco visível, alvos de 44 × 44 px e movimento reduzido: Tasks 3 e 5.
- Limite inevitável do harness atual: não existe teste de navegador/viewport configurado no repositório. Os testes Angular validam estrutura e estados; viewport, navegação por teclado e movimento reduzido ficam como revisão manual nas Tasks 3 e 5, sem adicionar uma dependência E2E ao escopo. Não existe runner de migração no pacote `@bdo/database`; o teste de preservação usa uma tabela temporária PostgreSQL em banco descartável e pode ser ignorado somente quando `ROADMAP_MIGRATION_TEST_URL` não estiver configurada.
