# Combinação automática de compra e produção — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma combinação automática, limitada e explicável de compra, produção e estoque à comparação de uma receita escolhida.

**Architecture:** Estender o planejador puro em `packages/calculators` para enumerar configurações binárias de compra/produção dos intermediários e selecionar o maior lucro econômico por hora. Expor uma única execução focada na página de recomendações, preservando o ranking geral atual e o resultado pendente quando a busca exceder o limite.

**Tech Stack:** TypeScript, Vitest, Angular standalone, templates existentes.

**Spec:** `docs/superpowers/specs/2026-10-10-automatic-hybrid-production.md`

## Global Constraints

- Não inventar preços, quantidades, rendimentos ou tempos ausentes.
- Materiais próprios continuam com custo econômico de reposição.
- O limite padrão da busca é 256 combinações; ultrapassá-lo gera pendência explícita.
- A otimização cobre uma receita e sua fórmula produtora selecionada; não anunciar ótimo global de catálogo.
- Preservar texto sem emojis e convenções visuais atuais do Black Market.

## Review Focus

- Estoque reservado não pode ser alocado à combinação automática: cobrir com o teste existente de reservas/novo caso do cenário.
- Preço ausente ou oferta insuficiente em um ramo não pode zerar seu custo: o caminho automático reutiliza `evaluate()`, coberto por `separates incomplete data and preserves negative but valid rankings` e `does not buy more units than the exact shared market offer`.
- Ciclos e árvores acima do limite não podem causar recursão infinita ou resultado enganoso: `blocks recursive cycles, absent time and stale calibrated contexts` cobre a recursão compartilhada; `returns an explicit pending result when the route search exceeds its branch limit` cobre o limite novo.
- Alterar a receita/quantidade selecionada deve invalidar resultados antigos: cobrir no componente.
- Nenhuma receita selecionada preserva os três cenários atuais, sem adicionar execução automática.

---

### Task 1: Planejador de combinações híbridas

**Files:**

- Modify: `packages/calculators/src/production-planner.ts`
- Test: `packages/calculators/src/production-planner.spec.ts`

**Interfaces:**

- Consumes: entradas, cotações, receitas, reservas, restrições e comparador existentes.
- Produces: `ProductionCandidate.optimizeCrafts?: number`, cenário `optimized`, limite configurável até 1024 combinações e issue `optimization-limit`.

- [x] Escrever `finds the fastest profitable hybrid of buying and producing intermediates` (espera custo/caixa 21, lucro 629, 61 s e compra/produção separadas) e `uses only unreserved stock in the automatic strategy` (espera 1 unidade livre alocada).
- [x] Executar os testes focados e confirmar falha por interface/cenário ausente.
- [x] Implementar enumeração determinística das opções produtivas alcançáveis, incluindo limite e pendências; `returns an explicit pending result when the route search exceeds its branch limit` exige `optimization-limit`, e `does not add an automatic scenario when the candidate has no optimization request` preserva os três cenários.
- [x] Rodar os testes do planejador e confirmar cenários existentes preservados.

### Task 2: Execução focada na página de recomendações

**Files:**

- Modify: `apps/web/src/app/features/recommendations/recommendations-page.ts`
- Modify: `apps/web/src/app/features/recommendations/recommendations-page.html`
- Test: `apps/web/src/app/features/recommendations/recommendations-page.spec.ts`

**Interfaces:**

- Consumes: `optimizeCrafts` e cenário `optimized` da Task 1.
- Produces: campo de operações para receita selecionada, envio do candidato focado e rótulo acessível da combinação automática.

- [x] Escrever `adds an automatic combination for the selected recipe and requested operation count` (espera cenário `optimized`, receita `elixir` e 3 operações).
- [x] Executar o teste e confirmar falha antes da implementação.
- [x] Expor o campo, invalidar comparações antigas ao editar e passar um candidato otimizado.
- [x] Rodar testes de recomendações e conferir o template.

### Task 3: Contexto de pesquisa e handoff

**Files:**

- Create: `docs/research/implementation-gap-matrix.md`
- Modify: `docs/research/README.md`
- Modify: `docs/research/master-bdo-knowledge-base.md`
- Modify: `docs/ACTIVE_CONTEXT.md`

- [x] Registrar capacidades encontradas no código, lacunas verificadas e dados/fontes que ainda precisam de validação.
- [x] Atualizar o handoff com a entrega, arquivos e limitações reais da busca.

### Task 4: Verificação

- [x] Executar `pnpm test` e `pnpm check`; corrigir qualquer regressão desta mudança.
- [x] Inspecionar diff e estado Git para confirmar que o artefato local de dados pesquisado não entrou na mudança.
