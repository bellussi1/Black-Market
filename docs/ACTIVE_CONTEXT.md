# Estado Ativo do Projeto (Context Handoff)

_Este arquivo é o canal oficial de passagem de bastão de contexto entre OpenAI Codex e Antigravity. Mantenha-o sempre atualizado ao trocar de agente._

---

## 1. Sessão Atual: 10/10/2026

- **Agente Atual**: Antigravity
- **Branch Ativa**: `codex/bdo-ui-redesign` (11 commits à frente de `origin/codex/bdo-ui-redesign`)
- **Últimos Commits**:
  - `df545ba` `feat(recipes): single craft count field, acquisition strategies, debounced market lookup, and make-vs-buy insights`
  - `3d71d13` `feat(recipes): add recipe yield resolver with mastery scaling and life skill mapping`
  - `c7ef564` `feat(scans): standardize bdo ui buttons, action confirmation animations, and unified batch consolidation`
  - `cd97e78` `fix(scans): support full HD and 4K resolutions and calibrate grid pitch in storage detection`
  - `e08e39a` `docs: update context handoff with crafting calculator and bdo ui standardization`
  - `a421d2c` `feat(recipes): add crafting economics calculator, batch market query, and profit metrics`
  - `497c2cb` `feat(scans): improve ocr quantity reconciliation, direct batch save, and bdo styled cards`

---

## 2. Servidores Locais Ativos

- **Frontend Web (Angular + SSR)**: `http://localhost:4200/` (respondendo 200 OK)
- **Backend API (NestJS)**: `http://localhost:3000/api/v1` (respondendo 200 OK)

---

## 3. Realizações Desta Sessão (Antigravity)

### 3.1. Padronização Rigorosa de UI nos Scans (Skill BDO UI Design)

1. **Eliminação Completa do Botão Verde Fora da Regra**:
   - O botão `.btn-save-master` anteriormente usava gradiente verde (`#388e3c`/`#2e7d32`) e borda verde `#4caf50`.
   - Foi 100% remodelado para a identidade do Black Market: ouro/bronze nobre (`var(--bm-accent)`), texto carvão contrastante (`var(--bm-background)`), cantos chanfrados de 2px, box-shadow BDO e hover suave `var(--bm-accent-hover)`.
   - Remoção de qualquer emoji (inclusive foguete ou ícones Unicode decorativos).
2. **Unificação da Barra de Consolidação**:
   - Eliminada a duplicação confusa onde dois botões com textos idênticos apareciam lado a lado.
   - Definida hierarquia cristalina:
     - **Ação Primária**: `Confirmar e salvar lote (X itens)` (ou no armazém/inventário/equipamentos dependendo do destino ativo via `saveBatchLabel()`), em ouro nobre BDO (`.btn-save-master`).
     - **Ação Secundária Seletiva**: `Salvar apenas X revisados` (`.btn.subtle`), disponível quando o usuário escolhe atualizar manualmente apenas itens específicos marcados.
3. **Animações e Transições de Confirmação de Ações**:
   - Adicionada animação `@keyframes bm-confirm-glow` para dar feedback visual tátil e elegante no ato de inclusão/confirmação.
   - Transição suave em `.btn-cell-confirm`, `.scan-cell.reviewed` (com borda e box-shadow inset dourado BDO).
   - Notas discretas `.quantity-note` para indicar leitura original e valor convertido.

### 3.2. Calibração do Reconhecimento OCR com Imagens Reais do Jogo

1. **Resolução de Tela Desbloqueada (1080p, 1440p, 4K)**:
   - Identificado e corrigido o limite de 2.000.000 pixels em `storage-grid.ts` que fazia capturas Full HD (1920×1080 = 2.073.600 px) retornarem array vazio de grades.
   - Limite expandido para 12.000.000 px e suporte a pitches de 14px a 160px.
2. **Grades de 8 e 9 Colunas Calibradas**:
   - Calibrados os passos e tolerâncias para suportar fielmente tanto armazéns de 8 colunas quanto de 9 colunas (conforme screenshots reais de Velia).
3. **Quantidades Abreviadas (k e M) e Itens Unitários**:
   - Suporte refinado a sufixos `k` e `M` com limpeza de pontuações de borda (ex: `139.1k`, `319.9k`, `1.3M`).
   - Itens unitários sem texto numérico na imagem do jogo agora são confiantemente atribuídos com 1 unidade.
   - O botão de ação primária em lote (`confirmAndSaveAll()`) auto-converte e preenche estimativas para salvar tudo diretamente sem exigir que o usuário digite ou confirme slot a slot manualmente.
4. **Numerais Romanos Estendidos para Equipamentos**:
   - Validados tiers até X (DEC) para os novos equipamentos Fallen God e armas do Soberano (VI, VII, VIII, IX, X).

### 3.3. Reformulação da Calculadora de Crafting & Árvore de Receitas

1. **Unificação dos Campos de Quantidade**:
   - Eliminados campos duplicados e confusos ("Quantidade total desejada" e "Produção por operação").
   - Substituído por campo único e direto: **"Quantia de receitas"** (`craftCount`).
   - Sincronização reativa bidirecional entre `craftCount` e `target` respeitando o `effectiveYield` do item final, garantindo que os ingredientes calculados correspondam a exatamente `craftCount * recipe.ingredient.quantity`.
2. **Auto-Consulta de Cotações com Debounce & Rendimento Médio com Maestria**:
   - Consulta de mercado automática ao selecionar uma receita ou trocar de item, via debounce reativo (350ms) (`autoMarket$`), eliminando a necessidade de clicar em botões manuais.
   - Resolução de rendimentos baseada na profissão do item (`COOKING` -> `cooking`, `ALCHEMY` -> `alchemy`, `PROCESSING`/`MANUFACTURE` -> `processing`) e na maestria do jogador (com botão de 1 clique "Usar rendimento médio padrão" e fallback seguro de 2.50 base até ~3.00 para 2000 maestria).
3. **Estratégias Rápidas de Aquisição (Presets)**:
   - `Comprar todos`: Simula o custo de adquirir 100% dos insumos no Mercado Central.
   - `Coletar tudo (100% Lucro)`: Assume custo zero para materiais próprios/coletados, onde a receita líquida representa 100% de margem.
   - `Personalizado`: Ativado automaticamente ao alternar insumos individuais.
4. **Controle Granular por Ingrediente**:
   - Alternância item a item na tabela e na árvore entre Comprar e Coletar/Próprio (`toggleMaterialSource`), recalculando instantaneamente o custo efetivo de materiais, receita líquida e lucro.
5. **Motor de Insights Make vs Buy ("Vale a pena craftar ou comprar direto?")**:
   - Comparativo direto entre custo unitário de produção e preço no Mercado Central.
   - Exibição de tags de decisão: "Vale a pena craftar! Economia de X prata/un" vs "Mais barato comprar pronto no mercado" vs "Estoque zerado no Mercado Central".
   - Detalhamento de volume de mercado (`totalTrades`), estoque atual (`stock`) e economia calculada em prata e porcentagem.
   - ZERO emojis, 100% aderente às regras de design do BDO (bordas de 2px, superfícies de carvão e acentos nobres em dourado/bronze).

### 3.4. Qualidade e Testes (AGENTS.md)

- `pnpm format`: Arquivos formatados via Prettier.
- `pnpm check`: **PASSOU** 100% (0 erros de ESLint, formatação verificada, bundles Angular gerados com sucesso).
- `pnpm test`: **PASSOU** 100% em todos os pacotes:
  - 126 testes unitários e de integração na API (`@bdo/api`).
  - 294 testes unitários na Web (`@bdo/web`).
  - 40 testes unitários em `@bdo/calculators`.
  - Total: **460 testes passando** no monorepo.

---

## 4. Arquivos Modificados / Criados

- `apps/web/src/app/shared/recipe-tree/recipe-yield.ts`: Resolução de rendimentos médios por maestria de profissão (Cooking, Alchemy, Processing) e rendimentos canônicos fixos (Harmonia = 10, Edania = 1, etc.).
- `apps/web/src/app/shared/recipe-tree/recipe-yield.spec.ts`: Testes unitários do resolvedor de rendimento.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`: Campo único `craftCount`, sincronização com `target`, debounce reativo de mercado (350ms), estratégias de aquisição (`buy_all`, `gather_all`, `custom`), cotações completas (`stock`, `totalTrades`) e computed `rootInsight` / `intermediateInsights`.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.html`: Card de quantidade única, seletor de estratégias de aquisição, card Make vs Buy nobre, coluna interativa de aquisição na tabela de materiais e modo avançado para ajustes finos.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.scss`: Estilização no padrão BDO UI com badges de decisão, switches de aquisição e cards de insight.
- `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`: 26 testes cobrindo todo o novo fluxo de craft count, estratégias e insights econômicos.
- `apps/web/src/app/features/scans/scans-page.scss`: Remoção do botão verde, adoção de tokens BDO, badges padronizados e animação `bm-confirm-glow`.
- `apps/web/src/app/features/scans/scans-page.html`: Ações unificadas, botão mestre dinâmico `saveBatchLabel()`, notas limpas de quantidade e sem emojis.
- `apps/web/src/app/features/scans/scans-page.ts`: Adicionado computed `saveBatchLabel`, refinamento de `reliable` e resolução de estimativas.
- `apps/web/src/app/features/scans/scans-page.spec.ts`: Teste para `saveBatchLabel` e validação do fluxo de salvamento direto.
- `apps/web/src/app/features/scans/storage-grid.ts`: Suporte a imagens 1080p, 1440p e 4K (até 12MP) e passos de pitch ampliados.
- `apps/web/src/app/features/scans/storage-grid.spec.ts`: Teste com frame Full HD 1080p.
- `apps/web/src/app/features/scans/visible-quantity.ts`: Higienização de pontuação pós-sufixo em quantidades k/M.
- `apps/api/src/market/market-history.service.spec.ts`: Timeout de 30s para teste de estresse de 600k linhas.

---

## 5. Próximos Passos (Instruções para Codex ou Antigravity)

1. Validar no navegador (`http://localhost:4200/recipes/items/1408`) o comportamento da receita Fármaco da Harmonia com o novo campo de quantia de receitas e insights Make vs Buy.
2. Validar no navegador (`http://localhost:4200/scans`) o upload das imagens de armazém enviadas pelo usuário em lote.
3. Se solicitado pelo usuário, proceder com o merge da branch `codex/bdo-ui-redesign` para a branch principal (`main`).
