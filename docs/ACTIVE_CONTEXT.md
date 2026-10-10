# Estado Ativo do Projeto (Context Handoff)

_Este arquivo é o canal oficial de passagem de bastão de contexto entre OpenAI Codex e Antigravity. Mantenha-o sempre atualizado ao trocar de agente._

---

## 1. Sessão Atual: 10/10/2026

- **Agente Atual**: Antigravity
- **Branch Ativa**: `codex/bdo-ui-redesign` (13 commits à frente de `origin/codex/bdo-ui-redesign`)
- **Últimos Commits**:
  - `9b73cb1` `feat(market): add centralized market cache service, auto-sync, interactive column sorting, and stock filters`
  - `4612e1f` `docs: update context handoff with crafting calculator redesign and make-vs-buy insights`
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

### 3.4. Cache Centralizado do Mercado, Auto-Sync & Melhorias na Tela de Mercado

1. **Serviço de Cache Centralizado (`MarketCacheService`)**:
   - `quotesMap`: cache reativo indexado por `${region}:${itemId}:${subId}`.
   - Hidratação e persistência em `localStorage` (`bm_market_cache_${region}`) com suporte seguro a SSR e gerenciamento de cotas.
   - `resolveQuote()` e `resolveQuotesBatch()`: retornam imediatamente cotações em cache e resolvem cotações ausentes/expiradas em background.
   - Polling automático e sincronização em background a cada 6 minutos (com detecção de foco e aba visível via `visibilitychange`).
   - Eliminação de botões manuais desnecessários ("Consultar mercado"), substituídos por badges de sincronização automática e atualização sutil.
2. **Ordenação Interativa de Colunas no Mercado Central (`MarketBoard`)**:
   - Cabeçalhos de coluna clicáveis com alternância de direção (`asc`/`desc`): Item (A-Z), Preço atual, Média 30d, Estoque, Volume 24h, Volume 15d, Volume 30d.
   - Indicadores visuais nobres BDO com setas de ordenação e `aria-sort`.
3. **Filtros Rápidos de Disponibilidade de Estoque**:
   - Pílulas de filtro rápido: `Todos`, `Com estoque` (itens com disponibilidade imediata), `Estoque zerado` (oportunidades de produção/venda), `Com volume 24h`.
   - Limpeza de busca com 1 clique (`✕`).
4. **Detalhes de Preço, Tendências & Medidor Visual de Mercado**:
   - Badge de tendência (`trend-badge`): calcula variação % entre o preço atual e a média de 30 dias (`+X.X%`, `-X.X%`, `Estável`).
   - Medidor visual de limites de mercado (`price-meter`): barra percentual indicando se a cotação está próxima do Bottom ou do Topo.
   - Tags de estoque: destaque com tag nobre para itens com estoque zerado no mercado.
5. **Integração na Árvore de Receitas (`RecipeTree`)**:
   - A árvore de receitas agora consome diretamente `MarketCacheService.resolveQuotesBatch()`, tornando os cálculos de rentabilidade instantâneos caso os insumos já estejam no cache.

### 3.6. Incorporação do Acervo Oficial de UI In-Game (Interface In Game BDO)

1. **Mapeamento e Decomposição das 32+ Telas Oficiais**:
   - Analisado o acervo do [Interface In Game - Black Desert Online](https://interfaceingame.com/games/black-desert-online/), cobrindo todas as categorias de telas in-game:
     - **Mercado e Loja**: `Central Market`, `Purchase Longbow`, `Pearl Box`, `NPC Shop`.
     - **Armazém e Inventário**: `Storage`, `Inventory`, `Equipment`, `Transfusion`.
     - **Progressão e Maestria**: `My Information (P)`, `Enhance`, `Fish Guide`, `Ranking`, `Gained Knowledge`.
     - **Diálogos, Missões e Modais**: `Quest Summary`, `Accept Quest`, `Quest Completed`, `Select Quest`, `Ongoing Quests`, `Recruit Guild Member`.
     - **HUD e Janelas de Configuração**: `Game Window`, `Hotkey`, `Attendance Reward`, `Main Menu`, `Optimization`.
2. **Criação do Guia Canônico de Componentes BDO (`bdo-interface-in-game-guide.md`)**:
   - Criado [`.agents/skills/bdo-ui-design/references/bdo-interface-in-game-guide.md`](.agents/skills/bdo-ui-design/references/bdo-interface-in-game-guide.md) detalhando a anatomia oficial de janelas BDO, molduras de 2px, cabeçalhos bronze (`#715b37`), o marcador ornamental losango (`◇`), grades afundadas de slots com contadores no canto inferior direito, medidores visuais de limites e regras negativas rigorosas (ZERO emojis, zero botões estilo pílula arredondada, zero cores neon).
3. **Atualização da Skill e Catálogo Visual**:
   - Atualizado [`.agents/skills/bdo-ui-design/references/visual-references.md`](.agents/skills/bdo-ui-design/references/visual-references.md) correlacionando os 16 assets locais aos screenshots do Interface In Game e indexando o acervo estendido.
   - Atualizado [`.agents/skills/bdo-ui-design/SKILL.md`](.agents/skills/bdo-ui-design/SKILL.md) com a nova referência canônica.
4. **Primitivas Visuais no Design System do Black Market**:
   - Criadas classes utilitárias em `apps/web/src/styles/_controls.scss`:
     - `.bdo-diamond`: O losango característico `◇` dourado para títulos e itens de lista.
     - `.bdo-window`: Moldura de janela com relevo escuro e linha de brilho dourado sutil no topo.
     - `.bdo-slot`: Slot afundado de 44×44 px com sombra interna e contorno com transição em ouro no hover.
     - `.bdo-slot-count`: Quantidade fixada no canto inferior direito com sombra preta legível.
     - `.bdo-meter` e `.bdo-meter-fill`: Medidores lineares inspirados nas barras de capacidade e maestria do jogo.
   - Aplicado alinhamento numérico tabular (`class="numeric"`) nas colunas do armazém em `apps/web/src/app/features/storage/storage-page.html`.

### 3.7. Qualidade e Testes (AGENTS.md)

- `pnpm format`: 100% formatado via Prettier.
- `pnpm check`: **PASSOU** 100% (0 erros de ESLint, formatação verificada, bundles Angular gerados com sucesso).
- `pnpm test`: **PASSOU** 100% em todos os pacotes:
  - 126 testes unitários e de integração na API (`@bdo/api`).
  - 301 testes unitários na Web (`@bdo/web`).
  - 40 testes unitários em `@bdo/calculators`.
  - Total: **467 testes passando** no monorepo.

---

## 4. Arquivos Modificados / Criados

- `.agents/skills/bdo-ui-design/references/bdo-interface-in-game-guide.md`: Guia canônico completo baseado no repositório Interface In Game.
- `.agents/skills/bdo-ui-design/references/visual-references.md`: Mapeamento das 32+ telas catalogadas e correspondência de assets.
- `.agents/skills/bdo-ui-design/SKILL.md`: Atualização das referências da skill de UI do BDO.
- `apps/web/src/styles/_controls.scss`: Primitivas visuais BDO (`.bdo-diamond`, `.bdo-window`, `.bdo-slot`, `.bdo-slot-count`, `.bdo-meter`).
- `apps/web/src/app/features/storage/storage-page.html`: Alinhamento tabular numérico e formatação de dados de armazém.
- `docs/ACTIVE_CONTEXT.md`: Atualização do contexto de handoff e registro das implementações.

---

## 5. Próximos Passos (Instruções para Codex ou Antigravity)

1. Validar no navegador (`http://localhost:4200/market`) a ordenação das colunas, filtros de estoque e medidores visuais.
2. Validar no navegador (`http://localhost:4200/storage`) a grade de itens e tabelas densas no padrão BDO.
3. Se solicitado pelo usuário, proceder com o merge da branch `codex/bdo-ui-redesign` para a branch principal (`main`).

---

## 6. Handoff de redação (Codex, 10/10/2026)

- **Pedido**: melhorar o prompt de continuidade entre Codex e Antigravity, cobrindo otimização de lucro, UI/UX, fluxos, mercado, armazém, família e staging/CI/CD.
- **Concluído**: consulta deste contexto e das regras de UI; verificação de `git status` (limpo antes desta nota) e dos três commits recentes. O prompt revisado será entregue no chat; esta sessão não implementou as melhorias descritas nele.
- **Estado observado**: os commits mais recentes são `de395d4`, `bb36911` e `776c981`; a lista histórica da seção 1 não representa o topo atual do Git.
- **Arquivo modificado nesta sessão**: `docs/ACTIVE_CONTEXT.md`, apenas para registrar este handoff.
- **Próximo agente**: conferir novamente o Git e validar as implementações existentes no código e no navegador antes de executar o prompt revisado. Os próximos passos da seção 5 permanecem pendentes; esta sessão não repetiu testes nem confirmou o estado dos servidores.

---

## 7. Desenho de corpus OCR (Codex, 10/10/2026)

- **Pedido atual**: organizar as capturas e ampliar OCR para os campos estruturados do Black Market em armazém, inventário, maestria, peso e personagens. O usuário confirmou excluir chat, HUD e diálogos.
- **Diagnóstico**: o leitor local já cobre grade/ícones/quantidades, equipamento e recortes numéricos. O perfil já contém capacidade/peso, atributos e maestria numérica; falta classificar panes e preencher esses grupos automaticamente. O acervo contém 14 arquivos próprios do jogo, 13 únicos; um par tem SHA-256 idêntico. Vários frames pertencem à mesma sessão, então não são avaliação independente. Referências externas ficam fora do corpus de OCR.
- **Aprovação**: usuário aprovou o desenho e pediu para seguir com a implementação. Especificação em `docs/superpowers/specs/2026-10-10-bdo-ocr-corpus-design.md`; commit `695e330 docs(ocr): specify local corpus and screen readers`. Plano em `docs/superpowers/plans/2026-10-10-bdo-ocr-corpus.md`.
- **Corpus local**: 13 imagens próprias copiadas para `data/ocr-corpus/images/` com nomes SHA-256; duplicata exata omitida; 29 rótulos manuais no manifesto ignorado `data/ocr-corpus/manifest.json`. Dados continuam locais e fora do Git. Não há split independente para avaliação.
- **Implementado nesta etapa**: `scripts/validate-ocr-corpus.mjs`; `scripts/validate-screen-ocr.mjs`; parser de panes/campos com associação geométrica de maestria e peso; leitor Tesseract local em português com ampliação de telas pequenas até 1,5× e coordenadas de volta ao original; mapper limitado ao schema do personagem; rota de revisão `/scans/profile` com correção de valores/área/tipo, conflito ambíguo, comparação com valores atuais, seleção explícita de personagem/campos e preservação de não selecionados; links/documentação de uso e limites.
- **Corpus local**: 13 capturas e 29 rótulos manuais, com coordenadas corrigidas visualmente para maestria, personagens e capacidade de Heidel. Imagens e manifesto continuam ignorados pelo Git.
- **Limites**: VT, unidade de peso não reconhecida, local/capacidade do armazém, rank/progresso e campos sem modelo ficam como prévia. Uma fração de peso sem unidade fica ambígua até o usuário confirmar LT; peso `VT` nunca preenche `carriedWeight`/`weightLimit`. Atividades de maestria desconhecidas não são associadas a profissões próximas. O relatório usa a categoria do manifesto quando o detector não encontra o tipo de tela e informa essa contagem separadamente.
- **Verificações**: `node scripts/validate-ocr-corpus.mjs data/ocr-corpus/manifest.json` reportou 13 capturas/29 rótulos. `node scripts/validate-screen-ocr.mjs data/ocr-corpus/manifest.json`, com associação por categoria e região anotada, reportou 16 campos exatos, 11 sem leitura, 1 incorreto, 1 não suportado e nenhum ambíguo; 14 telas detectadas e 7 avaliadas com fallback da categoria anotada. Resultado restrito ao conjunto de calibração, sem valor geral de acurácia. `pnpm check` passou após os últimos ajustes (lint, Prettier, typecheck e build; avisos de locale `pt-BR` já conhecidos). Nenhum teste unitário ou fluxo Playwright foi executado.
- **Próximo agente**: a precisão ainda requer capturas de sessões independentes, sobretudo para armazém e peso. Testes automatizados e fluxo de navegador não foram executados nesta entrega.

## 8. Pipeline local de dados OCR (Codex, 10/10/2026)

- **Pedido**: implementar geração sintética com ground truth, coleta de capturas reais com autorização registrada e benchmark dos leitores de grade, quantidade e tier romano. O escopo confirmado cobre dados que alimentam o app; chat, HUD e diálogos ficam fora.
- **Sintéticos**: `scripts/generate-synthetic-ocr-dataset.mjs` compõe imagens com ícones do catálogo publicado e manifesto SHA-256 com coordenadas/rótulos exatos; cobre 1080p/1440p/4K, escalas 100/110/120%, grades de oito/nove colunas, quantidades comuns/abreviadas e numerais I–X. Saída local ignorada em `tmp/ocr-dataset/`.
- **Capturas reais**: `scripts/scrape-bdo-screenshots.mjs` exige origem/permissão registrada. Reddit usa OAuth oficial e User-Agent registrado; os testes não fazem download real. O coletor exige HTTPS/host aprovado, bloqueia destinos locais, valida redirects, tamanho e formato, deduplica por hash e mantém a origem autorizada. Capturas sem rótulo revisado não são elegíveis para treinamento.
- **Benchmark**: `scripts/benchmark-ocr.mjs` usa detectores/parsers atuais do frontend, Tesseract em português e associação geométrica. Relatório agregado separa precisão/recall/F1 da grade, acertos/incorretos/não lidos para quantidades e romanos e contagens por variante; não inclui texto nem caminhos das imagens.
- **Avaliação observada**: lote sintético local com 18 imagens, grade F1 1,0 (837/837); quantidades exatas 47/576 (8,16%), incluindo 31/273 comuns e 16/303 abreviadas; romanos exatos 3/45 (6,67%). O OCR atual não lida bem com texto pequeno sobre ícones; o resultado é diagnóstico do lote e requer melhoria antes de confiar na extração de quantidades/tiers. Sem capturas reais autorizadas, não há acurácia de mundo real nem composição 80/20 atingida.
- **Verificações**: `pnpm test` passou com 520 testes (40 calculators, 126 API, 301 web e 53 scripts do pipeline). `pnpm check` passou com lint, Prettier e typecheck/build; o web reportou somente o aviso conhecido de locale `pt-BR`.
- **Arquivos**: scripts/testes do gerador, coletor e benchmark; `package.json`; `docs/ocr-validation.md`; este contexto. Commits anteriores: `bf23986` gerador sintético e `289932c` coletor autorizado.
- **Próximo agente**: usar as métricas como baseline e melhorar a leitura de texto pequeno em split de calibração antes de avaliação independente. Para validar dados reais, registrar autorização dos titulares e configurar `REDDIT_ACCESS_TOKEN`/`REDDIT_USER_AGENT` para Reddit; executar o coletor apenas com manifesto aprovado.
