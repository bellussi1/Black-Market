# Ajuda Contextual e Confirmação Visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que formulários e ações do MVP expliquem entradas importantes e confirmem visualmente carregamento, resultado, salvamento, erro e próximo passo sem deixar telas funcionais reduzidas a campos sem contexto.

**Architecture:** Criar um componente compartilhado de orientação de campo acessível, usando os tokens BDO e os padrões Angular atuais. Aplicá-lo por grupos de fluxos que compartilham decisões de Life Skills, mantendo os campos e dados existentes; reutilizar `calculation-feedback`, skeletons, estados de página e modelos de teste já existentes em vez de criar um segundo sistema global de loading ou alterar regras de domínio.

**Tech Stack:** Angular 22, componentes standalone, signals/inputs, Spartan e tokens BDO, XLIFF pt-BR, Vitest, Playwright disponível no projeto.

**Spec:** `docs/superpowers/specs/2026-10-18-onboarding-e-ajuda-contextual-design.md`

## Global Constraints

- Campo importante mostra finalidade, unidade, formato, exemplo ou impacto no resultado fora do placeholder e fora do tour.
- Formulários funcionais têm propósito visível, hierarquia BDO, resultado/estado e próxima ação; tela vazia explica como avançar.
- Loading, atualização, vazio, erro, sucesso e desabilitado são estados distintos; reutilizar skeletons proporcionais e manter dados úteis durante atualização.
- Mensagens de erro ficam junto ao campo ou resultado, descrevem correção/retry e preservam entradas.
- Resultado e confirmação descrevem a ação real; nunca sugerem que um preço listado garante venda nem que uma estimativa é uma transação confirmada.
- Não mudar cálculo, fórmula, preço, algoritmo OCR, inventário ou política de persistência neste plano.
- Respeitar identidade BDO, WCAG, teclado, reduced motion, SSR, desktop-first e viewport 390×844.
- Não copiar conteúdo ou snapshots de concorrentes para fixtures; usar doubles/fixtures locais determinísticos já aprovados.

## Review Focus

- **Valores extremos ou vazios:** aceitar valor zero, vazio, unidade incompleta e texto longo sem esconder a ajuda ou resultado esperado; cobrir Tasks 1–4.
- **Erro de validação seguido de correção:** mensagem associada ao input, valor preservado, estado de erro atualizado e retorno ao helper sem colapso; cobrir Tasks 1–4.
- **Salvamento assíncrono e falha:** loading/sucesso/erro distinguíveis no mesmo contexto, repetição segura e dados não apagados; cobrir Tasks 3–5.
- **Pessoa sem dados próprios:** vazio explica a razão e apresenta um próximo passo útil, sem exibir formulário sem contexto; cobrir Tasks 3–5.
- **Viewport estreito e movimento reduzido:** rótulos, unidades, status, erro e ações não causam overflow nem dependem de animação/cor; cobrir Tasks 1 e 6.

---

## Mapa de arquivos e interfaces

- `apps/web/src/app/shared/field-guidance/field-guidance.ts` (novo): interface reutilizável de texto de apoio por campo.
- `apps/web/src/app/shared/field-guidance/field-guidance.html`, `.scss`, `.spec.ts` (novos): conteúdo, tema e contrato acessível.
- `apps/web/src/app/shared/calculation-feedback.ts`: reutilizar conversão de erro de cálculo/validação existente.
- `apps/web/src/app/shared/loading-skeleton/`: reutilizar variants atuais; só criar variante se uma tela não tiver forma adequada já registrada.
- Templates/TS/specs de Mercado, Catálogo, Receitas, Oficina, Life Skills e Recomendações: ajuda de preço, receita, maestria, rendimento, decisão e interpretação de resultado.
- Templates/TS/specs de Scan, Família, Armazém, Shopping, Planos e Configurações: destino, revisão, persistência, salvamento, importação e confirmação.
- Home/Roadmap: empty/help copy e ação seguinte nos blocos funcionais, sem refazer layout aprovado.
- `apps/web/src/locale/messages.pt-BR.xlf`: localização de mensagens novas.
- `docs/research/contextual-guidance-review-2026-10-18.md`, índice de pesquisa, checklist e `docs/ACTIVE_CONTEXT.md`: evidências e handoff final.

## Contrato de `app-field-guidance`

Adicionar componente standalone com esta API:

```ts
id = input.required<string>();
hint = input.required<string>();
unit = input<string | null>(null);
example = input<string | null>(null);
error = input<string | null>(null);
status = input<string | null>(null);
```

O elemento host recebe `id`, e o input relacionado aponta para ele em `aria-describedby`. O helper fica sempre visível; unidade e exemplo são texto auxiliar curto; erro/status usam uma região reservada no componente para evitar deslocar conteúdo quando aparecem. O texto não é truncado e o erro é anunciado sem repetir cada tecla. Não envolver `<input>` em novo `<label>` nem mudar forms existentes para Reactive Forms.

## Task 1: Criar orientação de campo acessível

**Files:**

- Create: `apps/web/src/app/shared/field-guidance/field-guidance.ts`
- Create: `apps/web/src/app/shared/field-guidance/field-guidance.html`
- Create: `apps/web/src/app/shared/field-guidance/field-guidance.scss`
- Create: `apps/web/src/app/shared/field-guidance/field-guidance.spec.ts`
- Modify: `apps/web/src/app/shared/index.ts`, somente se esse barrel for usado por componentes similares

**Interfaces:**

- Produces: API `id`, `hint`, `unit`, `example`, `error`, `status` exatamente conforme contrato acima.
- Produces: função de apresentação privada para juntar unidade/exemplo sem receber HTML dinâmico.

- [ ] **Step 1: Escrever testes RED** — adicionar `it('renders persistent hint and optional unit/example')`, `it('associates the host id with aria-describedby')`, `it('announces error and status in their reserved region')` e `it('renders supplied text as inert text')`.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/shared/field-guidance/field-guidance.spec.ts"`; esperar componente ausente.
- [ ] **Step 3: Implementar componente e estilos** — usar componentes/tokens existentes, sem emoji, respeitar foco/contraste, texto longo e `prefers-reduced-motion`; feedback permanece legível sem cor.
- [ ] **Step 4: Confirmar GREEN** — repetir o spec; verificar no componente que texto longo quebra linha, erro não substitui a ajuda e `prefers-reduced-motion` remove movimento decorativo.
- [ ] **Step 5: Commit atômico** — `feat(ui): add accessible contextual field guidance`.

## Task 2: Explicar dados de Mercado, item e Receitas

**Files:**

- Modify: `apps/web/src/app/features/market/market-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/catalog/item-detail-page.html`, `.ts`/spec correspondente se necessário
- Modify: `apps/web/src/app/features/recipes/recipes-page.html`, `.ts`, `.spec.ts`

**Interfaces:**

- Consumes: `app-field-guidance` da Task 1.
- Produces: campos de região, preço/quantidade, período e filtro/seleção mostram unidade, proveniência/idade e o efeito que têm na consulta; receita/item contextualiza origens e limitações dos dados.

- [ ] **Step 1: Escrever testes RED** — adicionar `it('explains region, price unit and quote freshness')`, `it('distinguishes a missing quote from zero')`, `it('labels item price and origin availability')` e `it('explains recipe search, method and next step')`.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/market/market-page.spec.ts" --include="app/features/catalog/item-detail-page.spec.ts" --include="app/features/recipes/recipes-page.spec.ts"`.
- [ ] **Step 3: Integrar orientação** — associar IDs a `aria-describedby`, preservando filtros, atalhos e parâmetros atuais; não inventar garantia de venda nem informação de concorrente.
- [ ] **Step 4: Confirmar GREEN** — repetir specs; verificar ausência de helper dependente exclusivamente de tooltip/placeholder.
- [ ] **Step 5: Commit atômico** — `feat(market): explain quote inputs and recipe discovery`.

## Task 3: Explicar planejamento de produção, Life Skills e recomendações

**Files:**

- Modify: `apps/web/src/app/features/crafting/crafting-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/shared/recipe-tree/recipe-tree.html`, `.ts`, specs focados
- Modify: `apps/web/src/app/features/lifeskills/lifeskills-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.html`, `.ts`, `.spec.ts`

**Interfaces:**

- Consumes: `app-field-guidance` e `calculation-feedback.ts` existentes.
- Produces: orientação contextual para lote/operações, maestria, rendimento, quantidade própria/comprada/coletada, tempo de atividade, XP observado e interpretação do ranking/retorno.

- [ ] **Step 1: Escrever testes RED** — adicionar `it('explains batch count and mastery units')`, `it('identifies owned, purchased and gathered material quantities')`, `it('labels life session units and observed output')` e `it('explains why a recommendation is ranked or missing')`.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/crafting/crafting-page.spec.ts" --include="app/shared/recipe-tree/recipe-tree.spec.ts" --include="app/features/lifeskills/lifeskills-page.spec.ts" --include="app/features/recommendations/recommendations-page.spec.ts"`.
- [ ] **Step 3: Integrar helper e resumo de resultado** — manter fórmulas, arredondamento, cache e políticas atuais; copy faz distinção entre estimativa e rendimento observado.
- [ ] **Step 4: Confirmar GREEN** — repetir specs e validar teclado/foco nas abas Workshop, Manual, Library, Sessions, Mastery e Training.
- [ ] **Step 5: Commit atômico** — `feat(lifeskills): clarify production and mastery inputs`.

## Task 4: Explicar estados de Família, Armazém, listas e planos

**Files:**

- Modify: `apps/web/src/app/features/player/player-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/stock/stock-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/shopping/shopping-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/plans/plans-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/settings/settings-page.html`, `.ts`, `.spec.ts`

**Interfaces:**

- Consumes: componente de orientação da Task 1 e feedback de cálculo existente.
- Produces: campos explicam personagem/destino, quantidade/unidade, estado local vs sincronização e o impacto das ações de exportar/importar/aplicar/remover.

- [ ] **Step 1: Escrever testes RED** — adicionar `it('explains character and item destination fields')`, `it('offers a next action when personal inventory is empty')`, `it('preserves an invalid or unsaved edit')` e `it('confirms destructive replacement before applying it')`.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/player/player-page.spec.ts" --include="app/features/stock/stock-page.spec.ts" --include="app/features/shopping/shopping-page.spec.ts" --include="app/features/plans/plans-page.spec.ts" --include="app/features/settings/settings-page.spec.ts"`.
- [ ] **Step 3: Integrar orientação e estados de ação** — manter estrutura aprovada das páginas e não refazer o layout operacional do Armazém neste plano; mostrar estado e feedback na linha/ação correspondente.
- [ ] **Step 4: Confirmar GREEN** — repetir specs; não mutar dado real ou fixture compartilhada.
- [ ] **Step 5: Commit atômico** — `feat(storage): clarify personal data and inventory actions`.

## Task 5: Orientar captura e revisão OCR sem esconder resultados

**Files:**

- Modify: `apps/web/src/app/features/scans/scans-page.html`, `.ts`, `.spec.ts`
- Modify: `apps/web/src/app/features/scans/profile-screen-import.html`, `.ts`, spec correspondente

**Interfaces:**

- Consumes: helper da Task 1, estados atuais do Scan e commit prévio SCAN-01 (filtro padrão `all`).
- Produces: campos para tipo de captura, corte, destino e confirmação de persistência contextualizados; todo item continua visível com estados claro/pendente/removido e contagem de lote.

- [ ] **Step 1: Escrever testes RED** — adicionar `it('keeps recognized, pending and removed rows visible during review')`, `it('shows destination and quantity before batch save')` e `it('preserves the capture and corrected values after save failure')`.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/scans/scans-page.spec.ts" --include="app/features/scans/profile-screen-import.spec.ts"`.
- [ ] **Step 3: Integrar guia dos campos e confirmação de lote** — preservar crop, OCR, confiança e regra de inclusão; não alterar imagem, dado persistente nem algoritmo.
- [ ] **Step 4: Confirmar GREEN** — repetir specs; cobrir fluxo de teclado para corrigir quantidade e finalizar lote.
- [ ] **Step 5: Commit atômico** — `feat(scans): clarify review and save feedback`.

## Task 6: Fechar estados de vazio/carregamento/sucesso e documentação

**Files:**

- Modify: `apps/web/src/app/features/dashboard/dashboard-page.html` e spec correspondente
- Modify: `apps/web/src/app/features/roadmap/roadmap-page.html` e spec correspondente
- Modify: apenas gaps confirmados em estados vazios/erros dos fluxos das Tasks 2–5
- Modify: `apps/web/src/locale/messages.pt-BR.xlf`, gerado/atualizado pelo `pnpm --filter @bdo/web i18n:extract`
- Create: `docs/research/contextual-guidance-review-2026-10-18.md`
- Modify: `docs/research/README.md`, `docs/project-feature-checklist.md`, `docs/ACTIVE_CONTEXT.md`

**Interfaces:**

- Consumes: padrões da Task 1 e estados locais já existentes de carregamento/cálculo.
- Produces: estados vazios com contexto e ação seguinte; async existente reutiliza `app-loading-skeleton`; o handoff separa verificação automatizada, visual e autenticada.

- [ ] **Step 1: Escrever teste RED** — adicionar `it('shows a useful next action on an empty home state')` e `it('distinguishes loading, empty and error roadmap states')`.
- [ ] **Step 2: Confirmar RED** — executar `pnpm --filter @bdo/web exec ng test --watch=false --include="app/features/dashboard/dashboard-page.spec.ts" --include="app/features/roadmap/roadmap-page.spec.ts"`.
- [ ] **Step 3: Implementar somente gaps observados** — reutilizar `LoadingSkeleton`, `calculation-feedback` e estados locais; não adicionar spinner/skeleton a cálculo síncrono ou a estado já coberto.
- [ ] **Step 4: Confirmar GREEN e extrair XLIFF** — repetir specs e executar `pnpm --filter @bdo/web i18n:extract`; revisar `apps/web/src/locale/messages.pt-BR.xlf` para as strings novas.
- [ ] **Step 5: Registrar pesquisa e checklist** — incluir fontes, limites de acesso, superfícies verificadas, feature codes concluídos e pendentes; não adicionar preços de concorrentes a fixtures.
- [ ] **Step 6: Verificação final** — specs focados, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:ssr`, `git diff --check`, Prettier e QA desktop 1440×900 / mobile 390×844 em navegador autorizado. Documentar qualquer bloqueio do ambiente.
- [ ] **Step 7: Commits atômicos e handoff** — manter cada grupo de interface/documentação em commit de responsabilidade única e preservar `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md`.
