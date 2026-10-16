# Roadmap Visual Phase 2 Implementation Plan

> **Execução:** continuação autorizada em 16/10/2026 do rollout progressivo de Mercado e Receitas.

**Objetivo:** aplicar a hierarquia aprovada da Roadmap ao Mercado e à Oficina sem alterar dados, filtros, cálculo, contratos ou regras de acesso.

**Direção:** preservar a tabela densa do Mercado e a árvore de produção. Tornar visíveis os grupos de consulta, disponibilidade, resultado e estado; manter skeletons, foco, labels e alvos já existentes.

## Escopo e limites

- Mercado: cabeçalho interno com contexto e estado de cotação; rótulo visível para filtros de disponibilidade; agrupar ações; manter paginação junto ao resumo e antes da tabela; manter interpretações de preço, estoque e contagem de negociações.
- Receitas: agrupar catálogo/filtro/cartões em um painel; aproximar seletor de atividade da lista; reservar espaço para o primeiro carregamento; realçar explicitamente seleções de cenário na oficina; retirar clipping interno do resumo financeiro.
- Não mexer em cálculos, endpoint, persistência, tabela de colunas, categorias/subcategorias, limites de busca ou estrutura/posicionamento da árvore.

## Verificação

- Specs de `MarketBoard`, `RecipesPage` e `RecipeTree`.
- `pnpm check`, `pnpm test` e build de produção do Web.
- Revisão no navegador em 1440×900 e 390×844 com dados locais quando disponíveis; anotar indisponibilidade da API, foco e qualquer estado que não possa ser observado.
- Pesquisa dos quatro concorrentes registrada separando observação pública de hipótese.

## Entregas

- [x] Cobrir a hierarquia visível e o skeleton inicial do catálogo de receitas.
- [x] Cobrir rótulo visível e grupo de ações dos filtros do Mercado sem regressão de paginação/tabela.
- [x] Ajustar os templates/estilos do Mercado, lista de Receitas e resumo financeiro/controles da árvore.
- [x] Executar specs focadas (90/90), `pnpm check`, `pnpm test` (1.011 aprovados, 1 ignorado) e build de produção; inspecionar viewport desktop e estreita.
- [x] Registrar auditoria competitiva, atualizar checklist, handoff e contexto; commitar as fatias de código e documentos atomicamente.

## Resultado

- Mercado: cabeçalho interno compacto carvão/bronze, rótulo “Disponibilidade”, ações agrupadas e “Com registros 24h” para não sugerir unidades vendidas.
- Receitas: skeleton reservado no primeiro carregamento, atualização dentro do fluxo do catálogo, filtro junto dos resultados e hierarquia alinhada à Roadmap.
- Oficina: estratégia selecionada visível; resumo financeiro e mensagens podem crescer sem clipping/rolagem aninhada fixa; cabeçalhos da árvore e materiais seguem a mesma superfície visual.
- QA do navegador: Mercado com 20 linhas reais de cache, catálogo e detalhe da receita mediram `scrollWidth` igual à largura do viewport em 390×844; tabela mantém rolagem interna. Em desktop, a árvore permaneceu contida. A API bloqueou `4203` por CORS; na origem `4200`, Mercado carregou 407 itens em cache (200). `production-quotes` retornou 503 pois Arsha respondeu 500 com bloqueio Imperva; não contornar. O tour `recipe-workshop` retornou `guide: null`; nenhum dado foi apagado e não houve migração/seed.
- Build: concluiu sem erro de budget CSS. O bundle inicial permanece em 600,57 kB (aviso acima de 500 kB); persistem os avisos de locale `pt-BR`→`pt` e dependências CommonJS do OCR.
- Revisão competitiva: `docs/research/market-recipe-competitive-review-2026-10-16.md`; observação visual não é tratada como prova de fórmula ou fonte de dados.
- Commits de código: `b90f83d` (Mercado) e `bd0140b` (Receitas/oficina). A documentação/handoff é commitada separadamente.
