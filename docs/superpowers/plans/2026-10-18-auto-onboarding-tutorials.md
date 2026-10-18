# Onboarding Automático por Rota e Aba — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Iniciar automaticamente uma introdução acessível e versionada na primeira visita a cada superfície funcional ativa do MVP, sem launcher em página nem mudança de layout.

**Architecture:** O registro compartilhado define uma chave estável para cada rota, aba real ou etapa de fluxo que exige orientação separada. Uma diretiva Angular sem elementos de layout solicita o guia publicado, consulta o estado local `screenKey + guideRevision` e inicia o Driver.js apenas quando a tela e os alvos estão prontos. A API prioriza conteúdo ativo do banco e serve conteúdo pt-BR versionado apenas quando não há registro; Configurações pode redefinir o progresso local.

**Tech Stack:** pnpm workspace, TypeScript compartilhado, NestJS, Drizzle/PostgreSQL já existente, Angular 22, RxJS, Driver.js, Vitest e Playwright disponível no projeto.

**Spec:** `docs/superpowers/specs/2026-10-18-onboarding-e-ajuda-contextual-design.md`

## Global Constraints

- O tour abre na primeira visita a cada rota/aba funcional, depois que navegação, autenticação e alvos estejam prontos.
- Não inserir launcher, botão, skeleton ou mensagem de tutorial no fluxo da página; usar diretiva sobre elementos existentes e popover em camada separada.
- Concluir/dispensar suprime a abertura automática até a revisão do guia mudar; navegação intermediária não marca o guia como visto.
- Cobrir apenas superfícies de jogador ativas com `SCREENSHOT_MVP`; excluir aliases, rotas legais, administrativas e suspensas.
- A chave fica dentro do limite de 64 caracteres do `screen_key`; não criar migration ou seed.
- Guia pt-BR admite até 12 passos, título de até 100 caracteres e corpo de até 360 caracteres por passo.
- Banco ativo prevalece; guia explicitamente desativado suprime fallback; fallback versionado não se aplica silenciosamente a locale sem tradução revisada.
- SSR não pode acessar `window`, `document`, `localStorage` nem instanciar Driver.js.
- Analytics mantém consentimento e propriedades allowlisted existentes; nenhuma chave ou progresso de onboarding contém dados pessoais.
- Manter foco, teclado, leitor de tela, reduced motion e viewport estreito conforme a especificação.

## Review Focus

- **Acesso direto a rota autenticada:** assegurar que o tour espere a autenticação e nunca abra por cima do login; cobrir em Task 5.
- **Aba ou etapa com âncora oculta, tardia ou duplicada:** impedir abertura incorreta e pular apenas passo que ficou indisponível; cobrir em Tasks 4–5.
- **Storage bloqueado ou indisponível:** não repetir o tour a cada mudança de detecção na mesma aba e manter a funcionalidade principal; cobrir em Task 3.
- **SSR sem APIs do browser:** importar e renderizar sem acessar DOM, storage ou Driver.js; cobrir em Tasks 3 e 6.
- **Linha no banco ausente versus desativada:** fallback só para ausência, não para desativação editorial; cobrir em Task 2.

---

## Mapa de arquivos e interfaces

- `packages/shared/src/tutorials.ts`: tipos e registro central das superfícies e âncoras válidas.
- `apps/api/src/tutorials/tutorial-validation.ts`: limites e validação compartilhados com o editor.
- `apps/api/src/tutorials/tutorial-seed-content.ts`: conteúdo de fallback versionado pt-BR; apesar do nome histórico, não executar seed.
- `apps/api/src/tutorials/tutorials.service.ts`: precedência de conteúdo do banco e fallback.
- `apps/web/src/app/core/tutorial.service.ts`: lifecycle do Driver.js, foco e encerramento.
- `apps/web/src/app/core/tutorial-api.service.ts`: leitura pública do guia.
- `apps/web/src/app/core/tutorial-onboarding-state.service.ts` (novo): progresso local versionado e reset.
- `apps/web/src/app/shared/tutorials/tutorial-surface.directive.ts` (novo): vincula chave de superfície a elemento já existente, sem renderizar host filho.
- `apps/web/src/app/shared/tutorials/tutorial-launcher.*`: remover depois de migrar todas as referências.
- Templates da Home, Roadmap, Mercado, Receitas, Oficina, Recomendações, Armazém, Família, Profissões, Scan, Lista de materiais, Planos e Configurações: registrar superfície/âncoras.
- `apps/web/src/app/features/tutorials/tutorials-manage-page.*`: apresentar rótulos de superfície legíveis e permitir editar todas as guias do registro.
- `apps/web/src/app/features/settings/settings-page.*`: permitir redefinir onboarding e confirmar visualmente a ação.
- `docs/research/automated-onboarding-review-2026-10-18.md`, índice de pesquisa, checklist e `docs/ACTIVE_CONTEXT.md`: evidências e handoff final.

## Superfícies estáveis

Usar exatamente estas chaves iniciais e rótulos visíveis correspondentes no editor:

`home`, `roadmap`, `market`, `market-quote`, `market-calculator`, `market-saved`, `market-item`, `recipes`, `recipe-workshop`, `crafting-workshop`, `crafting-manual`, `crafting-library`, `recommendations`, `storage`, `stock-inventory`, `family-character`, `family-family`, `family-equipment`, `lifeskills-sessions`, `lifeskills-mastery`, `lifeskills-training`, `scans`, `scans-review`, `scans-profile`, `shopping`, `plans`, `settings`.

Preserve existing keys `market`, `recipes`, `recipe-workshop`, `scans`, `storage` and `recommendations` for the primary surfaces. Existing published database rows continue to govern those screens; secondary tabs use new keys.

`scans-review` é uma superfície própria porque a âncora de revisão só existe após a captura; seu tour começa quando os itens revisáveis aparecem pela primeira vez. Modos de captura e alternâncias visuais que não são abas continuam no guia `scans`. Alias `/profile`, `/gear`, `/inventory` e `/account` não duplicam superfícies dos destinos canônicos.

## Task 1: Definir o contrato de superfície e âncoras

**Files:**

- Modify: `packages/shared/src/tutorials.ts`
- Test: `apps/api/src/tutorials/tutorial-registry.spec.ts`
- Test: `apps/api/src/tutorials/tutorial-validation.spec.ts`
- Modify: `apps/api/src/tutorials/tutorial-validation.ts`

**Interfaces:**

- Produces: `TutorialScreenKey` com as 27 chaves listadas acima; `TutorialScreenDefinition` com `screenKey`, rota canônica, nível de acesso, rótulo editorial e âncoras permitidas.
- Produces: `isTutorialScreenKey`, `getTutorialScreenDefinition` e `isTutorialAnchorForScreen` continuam como validadores públicos do contrato.

- [x] **Step 1: Escrever testes de contrato que falham** — adicionar `it('registers every active MVP surface exactly once')`, que compara as 27 chaves com o conjunto acima; `it('preserves the six published screen keys')`, que valida as seis chaves legadas; e `it('accepts twelve guide steps and rejects thirteen')`, que verifica limites sem alterar título/corpo.
- [x] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-registry.spec.ts src/tutorials/tutorial-validation.spec.ts`; esperar falha por superfícies ainda não registradas.
- [x] **Step 3: Implementar o registro e o limite de 12 passos** — adicionar rotas/tab labels e âncoras estáveis; ajustar o validador para 12 passos sem afrouxar os limites de título/corpo ou validar seletor livre.
- [x] **Step 4: Confirmar GREEN** — repetir os dois specs; garantir todos os casos da matriz aprovados.
- [x] **Step 5: Commit atômico** — `feat(tutorials): register active route and tab surfaces`.

## Task 2: Publicar fallback versionado para todas as superfícies

**Files:**

- Modify: `apps/api/src/tutorials/tutorial-seed-content.ts`
- Modify: `apps/api/src/tutorials/tutorials.service.ts`
- Test: `apps/api/src/tutorials/tutorial-workshop-seed.spec.ts`
- Test: `apps/api/src/tutorials/tutorials.service.spec.ts`

**Interfaces:**

- Consumes: registro e tipos da Task 1.
- Produces: uma entrada pt-BR de pelo menos duas etapas válidas por chave sem introduzir regra de jogo ou cálculo novo; `getPublished(screenKey, locale)` mantém o contrato de resposta atual.

- [x] **Step 1: Escrever testes de precedência que falham** — adicionar `it('serves a versioned pt-BR fallback for each registered surface')`, `it('prefers an active row and suppresses fallback for a disabled row')` e `it('does not write during a public guide read')`.
- [x] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/api exec vitest run src/tutorials/tutorial-workshop-seed.spec.ts src/tutorials/tutorials.service.spec.ts`; esperar falha para as novas chaves.
- [x] **Step 3: Escrever guias pt-BR** — 2–12 passos curtos por superfície, exemplos claramente ilustrativos, orientação prioritária a Life Skills e sem afirmar preço listado como venda garantida.
- [x] **Step 4: Manter precedência editorial** — usar fallback somente quando não houver linha; uma linha `enabled=false` retorna guia nulo; conteúdo ativo do banco continua prevalecendo; não chamar `tutorials:seed`.
- [x] **Step 5: Confirmar GREEN** — repetir os specs e verificar o endpoint local público para uma chave sem linha persistida.
- [x] **Step 6: Commit atômico** — `feat(tutorials): add versioned guides for MVP surfaces`.

## Task 3: Criar progresso local e iniciar tours sem launcher

**Files:**

- Create: `apps/web/src/app/core/tutorial-onboarding-state.service.ts`
- Create: `apps/web/src/app/core/tutorial-onboarding-state.service.spec.ts`
- Modify: `apps/web/src/app/core/tutorial.service.ts`
- Modify: `apps/web/src/app/core/tutorial.service.spec.ts`
- Create: `apps/web/src/app/shared/tutorials/tutorial-surface.directive.ts`
- Create: `apps/web/src/app/shared/tutorials/tutorial-surface.directive.spec.ts`
- Modify: `apps/web/src/app/core/tutorial-anchor-resolver.ts`
- Test: `apps/web/src/app/core/tutorial-anchor-resolver.spec.ts`

**Interfaces:**

- Produces: `TutorialOnboardingStateService.hasSeen(screenKey: TutorialScreenKey, guideRevision: string): boolean`, `.markSeen(screenKey, guideRevision, status: 'completed' | 'dismissed'): void` e `.resetAll(): void`.
- Produces: diretiva `[appTutorialSurface]="screenKey"` que só vincula estado e não adiciona filhos, estilos de layout ou controles visíveis.
- Produces: `TutorialService.startTour(guide: TutorialPublicGuide, returnFocusTo?: HTMLElement | null): Promise<string>` sem parâmetro obrigatório de botão launcher.

- [x] **Step 1: Escrever specs RED do estado** — adicionar `it('starts unseen surface and suppresses completed or dismissed revision')`, `it('allows a new published revision to start once')`, `it('resetAll clears only tutorial progress')` e `it('uses in-memory progress when localStorage is unavailable')`.
- [x] **Step 2: Confirmar RED do estado** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/tutorial-onboarding-state.service.spec.ts"`.
- [x] **Step 3: Implementar e verificar estado** — implementar persistência mínima; repetir o spec e confirmar os quatro casos.
- [x] **Step 4: Escrever specs RED do runtime sem launcher** — adicionar `it('starts without requiring a launcher element')`, `it('does not mark a tour seen when navigation interrupts it')`, `it('returns focus after explicit replay')` e `it('loads Driver.js only in the browser')`.
- [x] **Step 5: Confirmar RED do runtime** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/core/tutorial.service.spec.ts"`.
- [x] **Step 6: Refatorar runtime e criar diretiva** — `TutorialService.startTour(guide, returnFocusTo?)`; conclusão/dispensa gravam estado, navegação não grava; a diretiva inputs `screenKey`/`ready` aguarda guia/alvos únicos visíveis e cancela trabalho ao mudar de superfície/destruir.
- [x] **Step 7: Confirmar GREEN** — executar specs de estado, runtime e `tutorial-anchor-resolver`; testar renderização server sem `localStorage`/DOM.
- [x] **Step 8: Commit atômico** — `feat(tutorials): auto-start guides without page launchers`.

## Task 4: Integrar onboarding às rotas públicas e abas de produção

**Files:**

- Modify: `apps/web/src/app/features/dashboard/dashboard-page.html` e spec correspondente
- Modify: `apps/web/src/app/features/roadmap/roadmap-page.html` e spec correspondente
- Modify: `apps/web/src/app/features/market/market-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/catalog/item-detail-page.html` e spec existente, se houver
- Modify: `apps/web/src/app/features/recipes/recipes-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/crafting/crafting-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/tutorials/tutorial-anchors.spec.ts`
- Remove, após migração integral: `apps/web/src/app/shared/tutorials/tutorial-launcher.ts`, `.html`, `.scss` e specs do launcher

**Interfaces:**

- Consumes: diretiva headless da Task 3 e keys/tipos da Task 1.
- Produces: mercado vincula `market|market-quote|market-calculator|market-saved`; Oficina vincula `crafting-workshop|crafting-manual|crafting-library`; Receitas usa `recipes|recipe-workshop`; detalhes do Mercado usam `market-item`.

- [x] **Step 1: Adicionar regressões** — adicionar `it('uses the active market tab as the tutorial surface')`, `it('uses the active crafting tab as the tutorial surface')`, `it('preserves the published market and recipe screen keys')` e `it('does not render a page-level tutorial launcher')`.
- [x] **Step 2: Confirmar RED** — executar os specs existentes de Dashboard, Roadmap, Market, Recipes, Crafting e `tutorial-anchors.spec.ts` com `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/dashboard/dashboard-page.spec.ts" --include="app/features/roadmap/roadmap-page.spec.ts" --include="app/features/market/market-page.spec.ts" --include="app/features/recipes/recipes-page.spec.ts" --include="app/features/crafting/crafting-page.spec.ts" --include="app/features/tutorials/tutorial-anchors.spec.ts"`.
- [x] **Step 3: Vincular as superfícies existentes** — colocar a diretiva nos elementos raiz existentes; usar o valor da aba atual; adicionar `ready` à resolução/carregamento do componente; não criar markup de tutorial na página.
- [x] **Step 4: Validar conteúdos dinâmicos** — em Receitas e detalhes, iniciar somente quando o item e a árvore atuais estiverem prontos; não forçar seleção nem expandir árvore para fabricar âncoras.
- [x] **Step 5: Confirmar GREEN** — repetir specs; assertar que troca de aba mantém geometria dos wrappers e não cria botões de tutorial.
- [x] **Step 6: Commit atômico** — `feat(tutorials): onboard public MVP surfaces automatically`.

## Task 5: Integrar onboarding às rotas de jogador e fluxos privados

**Files:**

- Modify: `apps/web/src/app/features/recommendations/recommendations-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/stock/stock-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/player/player-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/scans/scans-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/scans/profile-screen-import.html`, `.ts`, spec existente
- Modify: `apps/web/src/app/features/shopping/shopping-page.html` e spec correspondente
- Modify: `apps/web/src/app/features/plans/plans-page.html` e spec correspondente
- Modify: `apps/web/src/app/features/settings/settings-page.html` e spec correspondente
- Modify: `apps/web/src/app/features/tutorials/tutorials-manage-page.html`, `.ts`, `.spec.ts`

**Interfaces:**

- Produces: chaves `recommendations`, `storage|stock-inventory`, `family-character|family-family|family-equipment`, `lifeskills-sessions|lifeskills-mastery|lifeskills-training`, `scans|scans-review|scans-profile`, `shopping`, `plans` e `settings`.
- `scans-review` só inicia quando resultados revisáveis aparecem; chaves privadas só são consultadas depois de `authGuard` concluir.

- [x] **Step 1: Adicionar regressões** — adicionar `it('starts the scan review guide only after review rows exist')`, `it('waits for authentication before starting a private guide')`, `it('maps each real workspace tab to its own surface key')` e `it('does not render a page-level tutorial launcher')`.
- [x] **Step 2: Confirmar RED** — executar os specs de Recommendations, Stock, Player, LifeSkills, Scans, Profile Import, Shopping, Plans, Settings e tutorials; a primeira execução falhou no limite/contexto ainda ausente, como esperado.
- [x] **Step 3: Registrar superfícies** — vincular diretiva a raiz/tab/estado existente; manter todos os registros OCR visíveis e não alterar dados ou cálculos.
- [x] **Step 4: Atualizar editor administrativo** — listar rótulo humano, rota e aba; validar guias com 12 etapas; manter rascunho quando salvamento/concorrência falha.
- [x] **Step 5: Confirmar GREEN** — repetir specs; garantir rota administrativa sem auto-tour e sem expor preview como guia do jogador.
- [x] **Step 6: Commit atômico** — `feat(tutorials): cover private MVP routes and workflow states`.

## Task 6: Permitir rever introduções em Configurações e fechar verificação

**Files:**

- Modify: `apps/web/src/app/features/settings/settings-page.html`, `.ts`, `.scss`, `.spec.ts`
- Modify: `apps/web/src/app/core/tutorial-onboarding-state.service.spec.ts`
- Create: `docs/research/automated-onboarding-review-2026-10-18.md`
- Modify: `docs/research/README.md`
- Modify: `docs/project-feature-checklist.md`
- Modify: `docs/ACTIVE_CONTEXT.md`

**Interfaces:**

- Consumes: `TutorialOnboardingStateService.resetAll()` da Task 3.
- Produces: seção central Ajuda e tutoriais com ação para reiniciar o progresso das apresentações; após limpar, cada tour volta a iniciar quando sua superfície for visitada.

- [ ] **Step 1: Escrever teste RED** — adicionar `it('resets onboarding only after confirmation and reports success')`, verificando que progresso de tutorial é limpo e backup/dados pessoais não mudam.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/settings/settings-page.spec.ts"`.
- [ ] **Step 3: Implementar seção central** — botão somente em Configurações; não colocar launcher em Home, Mercado, Receitas, Scan ou outras superfícies; repetir spec e confirmar GREEN.
- [ ] **Step 4: Registrar pesquisa pública atual e limites** — distinguir observação direta, superfície inacessível e ausência não verificada; ligar fontes competitivas da especificação.
- [ ] **Step 5: Atualizar checklist e handoff** — marcar TOUR como implementado apenas após gates; listar superfícies cobertas, testes e QA pendentes com precisão.
- [ ] **Step 6: Rodar verificações sequenciais** — `pnpm check`, `pnpm test`, `pnpm build` e `pnpm test:ssr`; inspecionar `/` e `/settings`, 1440×900 e 390×844, no navegador autorizado. Se o localhost não estiver acessível, documentar o bloqueio sem contornar a política.
- [ ] **Step 7: Confirmar diff e commits** — `git diff --check`, Prettier nos arquivos tocados, branch status; commits separados por tarefa, sem incluir o plano não rastreado preexistente.
- [ ] **Step 8: Commit documental atômico** — `docs(tutorials): record automatic onboarding rollout`.
