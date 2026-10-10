# Estado Ativo do Projeto (Context Handoff)

_Este arquivo é o canal oficial de passagem de bastão de contexto entre OpenAI Codex e Antigravity. Mantenha-o sempre atualizado ao trocar de agente._

---

## 1. Sessão Atual: 10/10/2026

- **Agente Anterior**: OpenAI Codex (iniciou na branch `codex/bdo-ui-redesign`)
- **Agente Atual**: Antigravity
- **Branch Ativa**: `codex/bdo-ui-redesign` (5 commits à frente de `origin/codex/bdo-ui-redesign`)
- **Últimos Commits**:
  - `a421d2c` `feat(recipes): add crafting economics calculator, batch market query, and profit metrics`
  - `497c2cb` `feat(scans): improve ocr quantity reconciliation, direct batch save, and bdo styled cards`
  - `63ba41b` `fix(catalog): support powershell 5.1 paths and stabilize nest integration test`
  - `e5a31c4` `docs(research): add master bdo knowledge base and multi-agent handoff protocol`
  - `b9c43c9` `feat: simplify expandable crafting steps and primary actions`

---

## 2. Servidores Locais Ativos

- **Frontend Web (Angular + SSR)**: `http://localhost:4200/` (respondendo 200 OK)
- **Backend API (NestJS)**: `http://localhost:3000/api/v1` (respondendo 200 OK)

---

## 3. Realizações Desta Sessão (Antigravity)

### 3.1. Dados do Jogo e Catálogo (Extração e Verificação)
1. **Cliente Local Detectado**:
   - O jogo está instalado localmente em `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online`.
   - O catálogo extraído atual é `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-60bd5677-catalog` (77MB de `items.json`, 2.7MB de `recipes.json`, `icons/`, `manufacture.json`, etc.).
   - Corrigida a compatibilidade de resolução de caminhos no Windows PowerShell 5.1 no script `scripts/sync-game-catalog.ps1`.
2. **Caso de Teste Extenso: Fármaco da Harmonia - Edania**:
   - Verificados os itens de teste no catálogo e API:
     - `1408`: `[Grupo] Imortalidade: Fármaco da Harmonia - Edania` (`/recipes/items/1408`).
     - `1407`: `[Grupo] Fármaco da Harmonia - Edania` (paridade com `bdolytics.com/pt/crafting/1407:d08c075d84ae`).
     - Cadeia profunda de alquimia simples com 6+ níveis de profundidade (Fármacos de Raiva, Adaptação, Potencial, Decadência, Ira Descontrolada, Elixir de Edania Poderoso, Óleos da Imortalidade).

### 3.2. Calculadora de Crafting & Rentabilidade (Paridade BDOLytics)
1. **Consulta de Cotações da Receita em Lote (1-Click Market Query)**:
   - Adicionado método `consultAllTreePrices()` em `RecipeTree`: consulta em paralelo as cotações de mercado de todos os insumos e subprodutos da árvore (`parts().keys()` + item raiz) via `MarketApi.getItem()`.
   - Atualiza `livePrices` imediatamente, disparando o recálculo reativo da árvore, custos e rentabilidade.
2. **Métricas Econômicas em Tempo Real**:
   - **Faturamento Bruto**: Valor de venda base × quantidade total produzida.
   - **Faturamento Líquido**: Retorno pós-taxa do Mercado Central considerando Pacote Econômico (84,5%) e buffs configurados pelo usuário (`calculateMarket`).
   - **Custo dos Materiais**: Custo total de aquisição dos materiais faltantes (descontando estoque do usuário).
   - **Lucro Líquido Total**: `Faturamento Líquido - Custo dos Materiais`.
   - **Margem de Lucro (%)**: Margem percentual com classes semânticas `.profit-positive` (verde suave BDO) e `.profit-negative` (vermelho suave).
   - **Tempo de Produção Configurável**: Input numérico para tempo em segundos por operação (padrão 1,0s), calculando o tempo total formatado (ex: `1m 15s` ou `2h 30m`).
   - **Lucro por Hora**: Métrica em moedas de prata por hora para comparação direta com grind e outras lifeskills.
   - **Faturamento por Hora**: Taxa de faturamento rateada por tempo.
3. **Painel Econômico Dedicado**:
   - Novo card `.economic-dashboard` no topo da árvore de produção com grid de métricas, botão de atualizar cotações com spinner discreto e suporte ao painel expansível de taxas do mercado (`<app-tax-options>`).

### 3.3. Padronização Rigorosa de UI (Skill BDO UI Design)
1. **Regra Absoluta: ZERO EMOJIS**:
   - 100% dos emojis foram removidos da interface (inclusive símbolos Unicode em favor de SVGs acessíveis com tokens de design BDO).
2. **Componentes e Interações**:
   - Botões com altura mínima de 44px, cantos levemente arredondados (2px), fundo carvão neutro e bordas bronze/ouro.
   - Inputs numéricos e selects com `tabular-nums`, foco dourado (`var(--bm-accent)`) e transição fluida de 180ms cubic-bezier(0.16, 1, 0.3, 1).
   - Microinterações de confirmação (animações de fade-in e feedback visual de ação realizada).

### 3.4. Qualidade e Testes (AGENTS.md)
- `pnpm format`: Arquivos formatados via Prettier.
- `pnpm check`: **PASSOU** 100% (0 erros de ESLint, formatação OK, bundles de browser e SSR gerados).
- `pnpm test`: **PASSOU** 100% em todos os pacotes:
  - 126 testes unitários e de integração na API (`@bdo/api`).
  - 284 testes unitários na Web (`@bdo/web`, incluindo novos testes para `consultAllTreePrices`, lucro por hora e métricas econômicas).
  - 40 testes unitários em `@bdo/calculators`.
  - Total: **450 testes passando** no monorepo.

---

## 4. Arquivos Modificados / Criados

- `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`: Adicionados `craftTimeSeconds`, `treeMarketLoading`, `treeMarketMessage`, computeds econômicos (`grossRevenue`, `netRevenue`, `profit`, `profitPerHour`, `revenuePerHour`, `profitMargin`, etc.) e método `consultAllTreePrices()`.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.html`: Novo painel `.economic-dashboard`, grid de métricas econômicas, botão de consulta do mercado e preservação de `.cost-value`.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.scss`: Estilos BDO UI para `.economic-dashboard`, `.metric-card`, botões de ação e responsividade mobile.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`: Testes unitários para consulta de cotações em lote e cálculo de métricas econômicas da receita.
- `apps/web/src/app/features/recipes/recipes-page.scss`: Padronização de botões, inputs e selects BDO UI.
- `apps/web/src/app/features/market/market-page.html`: Remoção de caractere Unicode e substituição por SVG acessível.
- `scripts/sync-game-catalog.ps1`: Compatibilidade de caminhos relativos com Windows PowerShell 5.1.
- `apps/api/src/operations/http-policy.integration.spec.ts`: Ajuste de timeout do hook `beforeAll` para estabilidade em concorrência.

---

## 5. Próximos Passos (Instruções para Codex ou Antigravity)

1. Realizar merge da branch `codex/bdo-ui-redesign` na branch principal (`main` ou equivalente) conforme solicitado pelo usuário, ou criar pull request para validação final.
2. Explorar o módulo de **Comparação de Itens** (inspirado na arquitetura do `bdo-viewer`).
3. Adicionar opção no painel econômico da receita para salvar presets de maestria/tempo por tipo de profissão (Culinária vs Alquimia vs Processamento).
