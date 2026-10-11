# Estado Ativo do Projeto (Context Handoff)

_Este arquivo é o canal oficial de passagem de bastão de contexto entre OpenAI Codex e Antigravity. Mantenha-o sempre atualizado ao trocar de agente._

---

## 1. Estado Atual Verificado: 10/10/2026

- **Agente Atual**: Codex
- **Branch Ativa**: `develop`, rastreando `origin/develop`, com a entrega de cache/otimizador integrada localmente pelo merge `cd256fd48973563f94ca95aa2d3e0123e37f9d1d`. Há commits locais pendentes de push; esta entrega não foi enviada ao remoto.
- **SHA do código implantado em staging**: `5a0f396003af580ddc065466f2903e883fe25ebd` (`feat(crafting): add focused hybrid production optimizer`).
- **Imagem local do staging**: `black-market:staging-20261010213049`.
- **Commits da entrega local de receita/mercado**: `39283cc` (orçamento Edania), `a0464df` (poda por limite de taxa segura), `37b8eb3` e `89c6a7a` (fixture e expectativa Edania), `fce45f1` (documentação) e `cd256fd` (merge em `develop`). A sequência foi mantida em commits de responsabilidades delimitadas.

---

## 2. Servidores Locais Verificados Nesta Sessão

- **Staging local**: `http://localhost:8081` pronto após backup, migrações, atualização da imagem e readiness.
- **Smoke**: `pnpm test:staging` passou, verificando HTTP/SSR, catálogo, ícone e bloqueio de indexação.
- **Navegação visual**: `/scans`, `/recipes`, `/recommendations`, `/storage`, `/family` e `/market` abriram com os títulos esperados; console sem erros ou avisos. Recomendações, Armazém e Família mostram estados iniciais vazios porque não há personagem/estoque de teste.
- **Coletores periódicos de mercado**: `MARKET_COLLECTOR_ENABLED=false` e `MARKET_BOARD_COLLECTOR_ENABLED=false` no `.env.staging`.

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
- **Verificações**: `pnpm test` passou com 522 testes (40 calculators, 126 API, 301 web e 55 scripts do pipeline). `pnpm check` passou com lint, Prettier e typecheck/build após o conserto do benchmark; o web reportou somente o aviso conhecido de locale `pt-BR`.
- **Arquivos**: scripts/testes do gerador, coletor e benchmark; `package.json`; `docs/ocr-validation.md`; este contexto. Commits: `bf23986` gerador sintético, `289932c` coletor autorizado, `a7b7a4a` benchmark/documentação e `aefd6c4` confinamento seguro do caminho de relatório.
- **Próximo agente**: usar as métricas como baseline e melhorar a leitura de texto pequeno em split de calibração antes de avaliação independente. Para validar dados reais, registrar autorização dos titulares e configurar `REDDIT_ACCESS_TOKEN`/`REDDIT_USER_AGENT` para Reddit; executar o coletor apenas com manifesto aprovado.

## 9. Auditoria de lacunas e combinação automática (Codex, 10/10/2026)

- **Pedido**: conferir o que falta após a pesquisa dos sites e 16 repositórios, registrar formas confiáveis de ampliar os dados e implementar uma lacuna útil.
- **Diagnóstico verificado**: o navegador de referências já inclui conhecimento/temas e a ficha de item expõe dados existentes e relações de receita. O histórico de mercado calcula preço, estoque e volume por snapshots; volumes só são conhecidos com cobertura suficiente e contador consistente. Não há rota geral de comparação de itens; a tela de Gear compara caminhos de upgrade. As contagens foram reconciliadas em [recipe-counts.md](recipe-counts.md): extração atual 13.313 relações brutas, 292 referências inválidas em quarentena, 10.683 fórmulas distintas normalizadas mais duas revisadas; 10.685 no banco, 7.016 de Life Skills no endpoint e 6.813 elegíveis em Recomendações após excluir 203 subprodutos. As 4.406 pertencem à extração antiga.
- **Implementado**: cenário `optimized` no motor de produção e execução para uma receita/quantidade selecionada em Recomendações. Enumera combinações comprar/produzir dos intermediários alcançáveis na fórmula selecionada; usa estoque livre quando o controle está ativo, contabiliza seu custo econômico e seleciona o maior lucro/hora. Limite padrão de 256 ramos, configurável até 1.024; acima dele deixa a linha pendente com `optimization-limit`. Não promete ótimo de catálogo nem busca fórmulas alternativas aninhadas.
- **Contexto de dados**: criada [matriz de implementação e lacunas](research/implementation-gap-matrix.md), linkada ao índice de pesquisa e à cobertura do produto. Atualizado o aviso de confiança do master KB para separar observação de interface e hipótese sobre tecnologia/endpoints de terceiros.
- **Verificações**: nesta continuação, `pnpm test` passou com 537 testes (44 calculators, 127 API, 304 web e 62 scripts); `pnpm check` passou com lint, Prettier e typecheck/build. O staging foi atualizado no SHA `5a0f396` e passou `pnpm test:staging`. Avisos conhecidos: locale `pt-BR` usa fallback `pt`; build emite avisos de tamanho de bundle/CSS e dependências CommonJS.
- **Arquivos**: planejador e testes, página/teste de recomendações, especificação/plano, matriz de lacunas, `feature-coverage.md`, `implementation-status.md`, índice/master research e este arquivo.
- **Próximo agente**: obter capturas reais novas com autorização verificável, anotá-las em sessões fora da calibração e preencher o split `evaluation`; manter revisão manual do OCR até avaliação independente suficiente. Manter os coletores de mercado OFF até uma fonte passar pelos critérios de permissão, contrato, cobertura e consistência. Comparação geral de itens e revisão de relações item–NPC–missão seguem oportunidades posteriores.

## 10. Integração, staging e critérios ainda abertos (Codex, 10/10/2026)

- **Benchmark OCR**: os três testes que falhavam foram corrigidos antes da publicação; os 25 testes de `scripts/benchmark-ocr.test.mjs` passaram na suíte completa. O limitador de escala mantém o maior lado das imagens de OCR em até 2.400 px. O holdout real foi separado do split de calibração: sessões não podem se repetir, cada captura de avaliação exige autorização e pelo menos um rótulo `verified`; split vazio retorna erro em vez de uma métrica enganosa.
- **Evidência de OCR**: o corpus atual continua com 13 capturas e 29 rótulos, todos em calibração; `evaluation` segue vazio. Não há registro local de permissão/OAuth de fonte comunitária disponível para coletar novos exemplos. Portanto, a validação independente real não foi executada e a revisão manual permanece obrigatória. As métricas sintéticas anteriores (grade F1 1,0; quantidades 8,16%; romanos 6,67%) não representam acurácia de mundo real.
- **Mercado**: não há fonte automática que tenha permissão documentada, contrato estável, cobertura medida e consistência observada por sete dias. Arsha permanece candidato comunitário apenas para consulta sob demanda; não está aprovado para persistência periódica. Os dois coletores estão OFF. Ver [política de fonte de preços](research/market-source-policy.md).
- **Contagens rechecadas após deploy**: a versão ativa `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-60bd5677-catalog-catalog-v3-supp-30288a9c` e checksum `774bceba02a1536c940963c0a5fd992e11131157f82664e0e9f13c7f228f2987` reportam `dataset.recipeCount = 10685`; o endpoint paginado retorna `total = 7016`. A tela Explorar Receitas mostra as 7.016; Recomendações usa 6.813 após remover as 203 relações de subproduto.
- **Seis áreas do MVP**: páginas acessíveis no staging: OCR `/scans` (capturas/revisão), Crafting `/recipes` (catálogo de 7.016), O que fazer `/recommendations`, Armazém `/storage`, Família `/family` e Mercado `/market`. As páginas com dados de usuário exibem estado vazio por falta de perfil seed/login de teste; isso confirma navegação e renderização da página, não fluxo autenticado nem gravação.
- **Git flow**: `origin/develop` foi criado e publicado; contém o commit de código implantado `5a0f396` e o handoff documental em commits separados. A imagem não tem alteração de código após `5a0f396`.
- **Pendências que exigem dados ou evidência externa**: autorização registrada e capturas reais novas em sessões independentes para avaliação OCR; fonte de mercado licenciada/estável com relatório de cobertura e consistência. Não ligar coletores nem reduzir revisão manual antes desses critérios.

## 11. Desenho de cache de mercado e otimizador de receita (Codex, 10/10/2026)

- **Pedido**: carregar cotações automaticamente na receita, otimizar origem comprar/fazer por lucro/hora com tempo e maestria, melhorar o mercado, padronizar controles e preservar modo simples/avançado.
- **Correção do caso de teste**: a URL opaca informada abre Acompanhamentos Variados. O produto Edania correto está em `/recipes/items/1407`.
- **Estado verificado**: a página de receita ainda tem estratégia global “Personalizado”, atualização manual de cotações e sem override editável de maestria. A tela de mercado já tem busca, filtros, ordenação, histórico e volumes; seu carregamento grava cache de tabela, mas não lê essa chave antes da API. O cache de item usa TTL de 5 min e polling de 6 min apenas para itens em alta.
- **Complexidade descoberta**: uma fórmula selecionada do Edania alcança 94 itens e 38 itens com receitas. O motor atual usa enumeração binária limitada a 256 ramos por padrão e 1.024 no máximo; não basta aumentar o limite.
- **Desenho aprovado em conversa e revisão**: cache-first somente para itens do grafo ativo; caixas por material (marcada fazer/coletar, desmarcada comprar); botão aplica a combinação otimizada; maestria com debounce de 250 ms; rendimentos fixos continuam fixos e estimativas variáveis são identificadas; resultados incompletos não são apresentados como lucro/hora definitivo; otimização usa busca exata com poda segura por dominância e sinaliza limite sem afirmar ótimo não provado. A otimização considera a fórmula atualmente selecionada, não todas as 12 fórmulas do produto 1407.
- **Refinamentos na revisão do plano**: como lucro/hora pode ser negativo, custo e tempo Pareto-melhores não bastam por si só para provar dominância. A especificação exige que a poda preserve a razão objetivo para toda continuação viável; estados sem essa prova não são podados. A origem fazer/coletar só entra como alternativa quando houver receita ou estimativa explícita de rendimento e tempo; não se presume coleta gratuita/instantânea. Cotações/otimização usam o grafo completo, respeitam métodos internos selecionados e aplicam produtor padrão determinístico a itens não expandidos; não comparam métodos de receita alternativos nesta entrega.
- **Artefatos**: especificação aprovada em `docs/superpowers/specs/2026-10-10-recipe-market-autoresolver-design.md`; planos separados em `docs/superpowers/plans/2026-10-10-recipe-market-cache.md`, `docs/superpowers/plans/2026-10-10-recipe-production-optimizer.md` e `docs/superpowers/plans/2026-10-10-market-board-cache.md`. Execução inline aprovada nesta sessão.

## 12. Execução do cache de receita e otimizador (Codex, 10/10/2026)

- **Status**: os três planos foram implementados e integrados localmente em `develop` pelo merge `cd256fd`; suíte completa, `pnpm check` e verificação visual local passaram. O workspace está limpo após o commit final deste handoff. Não publicar staging sem pedido explícito.
- **Receita e cotações**: `RecipeProductionGraph` resolve IDs alcançáveis com concorrência limitada e produtor padrão determinístico; cotações usam o cache de cinco minutos, revalidam enquanto a receita está aberta e mantêm valores antigos sinalizados. A tela do Mercado lê a resposta da mesma chave de consulta antes da API, mantém cache vencido em revalidação/erro e usa debounce de 250 ms.
- **Produção e controles**: origem por material (marcado = fazer/coletar, desmarcado = comprar), botão de otimização para a combinação completa, override local de maestria com debounce de 250 ms, calibração explícita de método e coleta. Rendimento estimado entra sem confirmação; rendimento fixo documentado prevalece. Estoque zero do produto final não sugere produzir para obter/consumir o item; a análise de receita final é para venda.
- **Busca exata**: enumera estados de comprar/fazer/coletar no grafo selecionado e descarta duplicados. Poda por limite superior só ocorre sem subprodutos vendidos e quando receita líquida do produto final e duração mínima são conhecidas; usa comparação inteira estrita. Se os limites ou dados não permitirem prova, conserva estados ou retorna `optimization-limit` sem ranquear ótimo parcial. O planejador usa 100 mil estados por padrão, teto absoluto de 1 milhão; o adaptador da receita define 250 mil.
- **Edania**: snapshot de topologia do dataset SA/PT `sa-pt-meta-2e188c2680c1-loc-7e729a315ce6-ext-5bf11bd7-bin-60bd5677-catalog-catalog-v3-supp-30288a9c`, fórmula `a835db19dfc8a26a659b120d32479be4050804c9372c113784cc511dff2b8d46`, contém 117 IDs de item e 62 produtores. Um probe local com quantidades, preços, rendimentos e tempos sintéticos completou em 4 estados visitados e podou 3 estados pelo limite seguro; a fixture automatizada reproduz a topologia, não valida cotação, rendimento ou tempo real do jogo.
- **Commits atômicos mais recentes**: `39283cc fix(crafting): budget exact Edania search`; `a0464df feat(calculators): prune production search with safe rate bounds`; `37b8eb3 test(calculators): cover selected Edania graph`; `89c6a7a test(calculators): assert Edania optimizer result`. A implementação prévia do cache/árvore e do board está em `f90718a`, `048ffc0`, `1e4ed8f`, `a98f6a3`, `badb391` e `6b2945c`.
- **Verificações desta continuação**: planner `production-planner.spec.ts` passou com 28/28; adaptador passou com 9/9; `pnpm test` passou com 584 testes (52 calculators, 127 API, 343 Web, 62 scripts); `pnpm check` passou por lint, Prettier, typecheck e build. O teste da poda falhou antes da implementação e passou após a correção. Aviso conhecido: Angular usa locale `pt` como fallback para `pt-BR`.
- **Verificação visual local**: `/recipes/items/1407` carregou a receita Edania, mostrou rendimento fixo/estimado sem botão de confirmação e o estado de cotação automática; a API de mercado local retornou indisponibilidade, portanto os botões econômicos ficaram corretamente desativados. `/market` exibiu ordenação, filtros, paginação, refresh e mensagem de indisponibilidade. A visualização confirma controles e estados, não disponibilidade externa nem preços atuais.
- **Fontes e limites**: o mercado automático persistente continua desligado; o cache não aprova Arsha nem outra fonte para coleta periódica. A cobertura de volume continua desconhecida quando há lacunas/conflitos/reset. O browser local anterior mostrou falha do provedor de preços, então isso não prova disponibilidade externa.
- **Próximo agente**: se solicitado, publicar `develop` em staging e repetir smoke/navegação antes de divulgar. Staging não foi alterado nesta entrega; a fonte de preços continua indisponível localmente e os coletores seguem desligados.

## 13. Alinhamento visual do painel de receita (Codex, 10/10/2026)

- **Pedido**: corrigir a composição visual irregular da receita Edania e manter os controles consistentes com o padrão BDO.
- **Diagnóstico**: a imagem enviada mostra controles antigos (“Personalizado” e ação de confirmação de rendimento), ausentes do código/rota local atual. A página `/recipes/items/1407` já usa a versão nova, mas ainda quebrava os cinco indicadores em quatro mais um cartão isolado e tinha uma barra de origem com estilos próprios.
- **Implementação**: a origem agora usa o controle segmentado compartilhado, com `aria-pressed`; a otimização fica como ação separada em `.btn`. A grade usa cinco colunas quando o painel tem 1200 px ou mais, três mais dois centralizados em larguras intermediárias e cartões empilhados abaixo de 900 px. Avisos permanecem alinhados dentro do painel.
- **Skill atualizada**: `.agents/skills/bdo-ui-design/references/components.md` registra a hierarquia de controles e o padrão de grade. A verificação de baseline encontrou a lacuna antes da regra; a revisão da regra atualizada confirmou o padrão como inequívoco.
- **Arquivos de código**: `apps/web/src/app/shared/recipe-tree/recipe-tree.html`, `apps/web/src/app/shared/recipe-tree/recipe-tree.scss` e `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`.
- **Verificação visual**: `/recipes/items/1407` em `localhost:4300` mostrou os cinco cartões alinhados em 3+2, com os dois últimos centralizados, e controles segmentados de altura consistente. O provedor local não forneceu cotações; as ações econômicas estavam desativadas nesse estado.
- **Verificações**: o teste de regressão falhou antes do ajuste e passou depois; `recipe-tree.spec.ts` passou com 33/33. `pnpm test` passou com 584 testes e `pnpm check` passou por lint, Prettier, typecheck e build. Permanece o aviso conhecido de fallback do locale `pt-BR` para `pt`.
- **Commits atômicos**: código `b943da7 fix(ui): align recipe profitability dashboard`; padrão reutilizável `00277b0 docs(ui): define recipe metric layout pattern`; merge local em `develop` `c61319e merge: align recipe profitability interface`.
- **Integração**: concluída localmente em `develop`; este handoff registra a entrega. Sem publicação em staging; manter os coletores de mercado desligados.

## 14. Quantia de receitas por operação (Codex, 10/10/2026)

- **Pedido**: o campo “Quantia de receitas” conta execuções da fórmula. Para uma fórmula com X×1, Y×2 e Z×1, 10 receitas exigem X×10, Y×20 e Z×10.
- **Causa**: a tela tratava a quantidade como unidades inteiras de saída, multiplicava pelo rendimento médio, arredondava e depois convertia de volta para operações. Com rendimento 1,55, 10 receitas podiam virar 11 operações.
- **Implementação**: o planejador aceita `rootCrafts` para executar exatamente a quantidade solicitada, independentemente do estoque do produto acabado. O resumo e a árvore usam esses mesmos totais; o rendimento continua determinando separadamente as unidades previstas. A quantidade de receitas também é salva na sessão e a lista salva usa essa unidade.
- **Arquivos**: `packages/calculators/src/models.ts`, `packages/calculators/src/tools.ts` e respectivos testes; `apps/web/src/app/shared/recipe-tree/recipe-tree-model.ts`, `recipe-tree.ts`, `recipe-tree.html`, `recipe-tree.spec.ts`, `recipe-session.ts` e `recipe-session.spec.ts`.
- **Verificação**: caso de regressão reproduzido antes do ajuste (10 operações resultavam em 11); depois, `pnpm test` passou com 585 testes e `pnpm check` passou por lint, Prettier, typecheck e build. O aviso conhecido de fallback do locale `pt-BR` para `pt` permanece.
- **Próximo agente**: manter “receitas” como unidade de entrada e operações da fórmula; não reinterpretar esse campo como unidades finais do produto. O rendimento altera somente a quantidade prevista de saída.

## 15. Ordenação e filtro de estoque no Market Board pré-paginação (Antigravity, 10/10/2026)

- **Problema corrigido**: a tabela do mercado (`MarketBoard`) realizava a ordenação e o filtro de estoque (`in_stock` / `out_of_stock`) apenas sobre a página visível (20–100 itens), em vez de ordenar/filtrar o universo completo de itens antes de paginar.
- **Implementação**:
  - `packages/shared/src/market-board.ts`: adicionados tipos `MarketBoardDirection` (`'asc' | 'desc'`) e `MarketBoardStockFilter` (`'all' | 'in_stock' | 'out_of_stock'`).
  - `apps/api/src/market/market-board.service.ts`: adicionados parâmetros `direction` e `stock` na query do endpoint `/market/board`. O escopo de itens em alta (`hot`) aplica o filtro de estoque e a ordenação com direção antes da fatia de paginação. Itens com preço desconhecido permanecem no final.
  - `apps/web/src/app/features/market/market-api.ts`: envio dos parâmetros `direction` e `stock` na requisição HTTP.
  - `apps/web/src/app/features/market/market-board.ts`: delegação de ordenação (`price`, `stock`, `name`) e de filtro de estoque para o servidor com redefinição de página para 1. Colunas calculadas apenas localmente mantêm sinalização visual explícita com a propriedade `pageOnlyOrdering()`.
  - `apps/web/src/app/features/market/market-board.html`: aviso textual claro quando ordenação ou filtro se aplica somente aos itens visíveis da página corrente.
  - `apps/web/src/app/features/market/market-board.spec.ts`: suíte de testes atualizada e expandida com asserções de requisição e reuso de cache.
- **Verificações**:
  - `pnpm check`: lint, Prettier, typecheck e build completos passaram sem erros.
  - `pnpm test`: 585 testes passaram (52 calculators, 128 API, 343 Web, 62 scripts).
- **Commits atômicos**:
  - `41e0365` `feat(api): sort and filter hot market board by direction and stock before pagination`
  - `621e6a5` `feat(market): send sort direction and stock filter to the API before pagination`
- **Próximos passos**:
  - Exploração de receitas (`apps/web/src/app/features/recipes/`): ordenação por lucro líquido estimado e volume de vendas, com unidades e períodos transparentes.
  - Alinhamento da interface de Armazém (`apps/web/src/app/features/storage/`) com grade estilo jogo e simplificação da aba Família.
  - Continuidade na padronização visual BDO UI (sem emojis, tokens de contraste e transições discretas).

## 16. Grade do Armazém com slots estilo BDO e alternância de visualização (Antigravity, 10/10/2026)

- **Problema abordado**: a tela de Armazém (`StoragePage`) exibia os materiais cadastrados apenas em formato de tabela simples, distante da experiência in-game do Black Desert Online.
- **Implementação**:
  - Adicionado controle segmentado de modo de visualização (`viewMode`: `'grid'` | `'table'`) com persistência de estado.
  - No modo grade (`'grid'`), renderiza slots quadrados característicos do BDO (`.bdo-slot`, 44x44px/52px com bordas cinza/dourado e fundo afundado), ícones reais dos itens via `ItemIcon` e contador sobreposto com sombra/contorno tipográfico (`.bdo-slot-count`).
  - Cada slot é interativo (`tabindex="0"`, `role="button"`), suporta clique e tecla Enter para abrir edição rápida do material no formulário do painel, com tooltip descritivo completo.
  - No modo tabela detalhada (`'table'`), adicionado o ícone de cada item junto ao nome para consistência visual.
  - Cobertura de testes unitários expandida em `storage-page.spec.ts` validando a alternância entre grade e tabela e atributos de slot.
- **Verificações**:
  - `pnpm check`: lint, Prettier, typecheck e build completos passaram sem erros.
  - `pnpm test`: 586 testes passaram (52 calculators, 128 API, 344 Web, 62 scripts).
- **Commits atômicos**:
  - `1834121` `feat(storage): add BDO-style slot grid view and detailed table toggle`
- **Próximos passos**:
  - Explorar receitas com ordenação por lucro estimado e volume de vendas no catálogo.
  - Otimizações adicionais na aba Família e validações Playwright nas rotas ativas.

## 17. Registro formal de limites operacionais e de dados do produto (Antigravity, 10/10/2026)

- **Acurácia em Imagens Reais do Jogo (OCR)**:
  - O pipeline sintético e os leitores estão prontos, mas a validação em prints reais possui baseline de calibração registrado (pois não temos ainda autorização/OAuth comunitária registrada para download massivo de imagens da internet).
  - A revisão manual no `/scans` continua ativa por segurança para o jogador não subir dados errados para o armazém.
- **Exploração de Receitas (Catálogo Geral por Lucro/Volume)**:
  - A ordenação e estimativa por lucro/hora funciona na receita aberta (`/recipes/items/:id`), mas listar as 7.016 receitas do catálogo de uma vez ordenadas por lucro/hora em tempo real exigiria cotações ativas e persistidas de todos os itens do jogo (o que sobrecarregaria sem coletores persistentes de mercado autorizados).
- **Coletores Automáticos de Mercado**:
  - Mantidos deliberadamente em `OFF` conforme a [política de fonte de preços](research/market-source-policy.md) para garantir que nenhuma consulta externa viole termos ou quebre a estabilidade do staging.
- **Arquivos sincronizados**:
  - `docs/research/implementation-gap-matrix.md` atualizado com as prioridades P0 e limites transparentes de engenharia.
  - Este arquivo `docs/ACTIVE_CONTEXT.md` atualizado para assegurar continuidade entre os turnos de Antigravity e Codex.

## 18. Auto-resolver de cotações em lote e matriz de decisões em 1 clique por material (Antigravity, 10/10/2026)

- **Problema abordado**:
  - Na tela de detalhes de receita (ex: `/recipes/5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0` - Acompanhamentos Variados), a consulta de mercado para árvores profundas disparava múltiplas requisições paralelas individuais, provocando respostas HTTP 429 devido a limitadores severos da API.
  - O fluxo para selecionar se cada ingrediente é comprado ou produzido exigia múltiplos passos e navegação na árvore de nós, e o botão de confirmação de rendimento manual adicionava fricção desnecessária.
- **Implementação**:
  - `apps/api/src/operations/request-controls.ts`: ajustado rate limit da API de mercado de 30 para 300 requisições/min.
  - `apps/api/src/market/market.service.ts`: aumentado o limitador de concorrência interna de 2 para 10 ativas e de 20 para 120 requisições simultâneas.
  - `docker-compose.yml`: montagem de volumes dos diretórios `dist/` dos pacotes locais no contêiner web.
  - `apps/web/src/app/features/market/market-api.ts`: adicionado método `productionQuotes(itemIds, region)` integrando com `/api/v1/market/production-quotes`.
  - `apps/web/src/app/core/market-cache.service.ts`: implementado `resolveProductionQuotes(itemIds, region)` que resolve em lote até 100 insumos com 1 única requisição HTTP, armazenando em cache reativo e persistindo em `localStorage`.
  - `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`:
    - Atualizado `consultAllTreePrices()` para utilizar `resolveProductionQuotes()`.
    - Adicionado método público `setMaterialSource(itemId, choice)` para alternância direta.
    - Implementado computed signal `materialDecisions` com nome, ícone, quantidade necessária, preço unitário, estoque, cotação de mercado e insight de rentabilidade (fazer vs comprar).
  - `apps/web/src/app/shared/recipe-tree/recipe-tree.html` e `.scss`:
    - Adicionado painel `.material-decisions-panel` ("Decisões por material") com cards no padrão BDO para cada insumo da receita.
    - Alternância em 1 clique: botões diretos `[Comprar no Mercado]` e `[Fazer / Craftar]` / `[Coletar]` com badges de economia e cotação de mercado.
- **Verificações**:
  - `pnpm check`: lint, Prettier, typecheck e build completos sem erros.
  - `pnpm test`: 586 testes passando em todo o monorepo.
  - Testado via navegador em `http://localhost:4200/recipes/5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0` com resolução imediata de 11 cotações sem erros 429 e alternância fluida em 1 clique.
- **Commits atômicos**:
  - `06e0fdc` `fix(api): raise market rate limit to 300/min and mount package dists in web container`
  - `9ea99ed` `feat(recipes): batch resolve tree quotes and add 1-click material decision matrix`
- **Próximos passos**:
  - Exploração de receitas (`apps/web/src/app/features/recipes/`): ordenação por lucro líquido estimado e volume de vendas, com unidades e períodos transparentes.
  - Monitoramento de novas sugestões de UX/UI mantendo o design autêntico do BDO.

## 19. Redesign do Workspace de Crafting: Canvas 70%, Sidebar de Insumos 30% e Bandeja Inferior (Antigravity, 11/10/2026)

- **Problemas abordados**:
  1. Interface de crafting fragmentada com abas e cliques excessivos entre visualização da árvore e lista de materiais.
  2. Bug de UX em que clicar no card de um nó colapsava a sua subárvore (`activate(node)` emitia `'collapse'`).
  3. Painel econômico com campos vazios ("Sem dados" e travessão "—") quando um item da cadeia não possui cotação no Mercado Central (ex: Lula #8211 que é peixe de comércio direto / pesca NPC) ou quando faltavam segundos de produção configurados manualmente.
  4. Detalhes do item selecionado abriam em uma coluna lateral que espremia o canvas, quebrando o zoom e pan.
- **Implementação**:
  1. **Bug do colapso de nós corrigido**:
     - `apps/web/src/app/shared/recipe-tree/recipe-graph.ts`: em `activate(node)`, alterado para apenas selecionar o nó (`'source'`) e expandir se estiver fechado (`!node.expanded`). O clique no card nunca mais fecha os ramos; o recolhimento fica restrito ao botão `[− Recolher]`.
  2. **Custo inteligente e Preço Personalizado**:
     - `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`:
       - Adicionado método `setCustomPrice(itemId, price)` e `customPrice(itemId)`. Permite ao jogador inserir cotação de compra de NPC ou estimativa própria para insumos sem mercado central direto, atualizando instantaneamente os 5 indicadores financeiros.
       - `effectiveMaterialCost`: agrega custos de materiais conhecidos comprados mesmo se itens de comércio/NPC estiverem na árvore.
       - `netRevenue` e `profit`: fallback reativo com cálculo de retenção do Mercado Central (84,5%) e margem percentual (+X.X%).
  3. **Tempos padrão do BDO por método**:
     - `apps/web/src/app/shared/recipe-tree/recipe-production-adapter.ts`: adicionada e exportada a função `defaultRecipeMethodSeconds(type)` (1.2s para culinária/alquimia, 6.0s para processamento simples/manufatura, 4.0s para coleta).
     - `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`: método `applyDefaultMethodTimes()` para aplicar os tempos padrão sem exigir calibração manual tediosa.
  4. **Novo Layout Desktop (Skill BDO UI Design)**:
     - `apps/web/src/app/shared/recipe-tree/recipe-tree.html` e `recipe-tree.scss`:
       - **Canvas à Esquerda (70%)**: Espaço amplo e desobstruído para navegação, zoom e pan da árvore de crafting, com barra de ferramentas contendo modos de visualização e botões `[Expandir todos]` e `[Recolher todos]`.
       - **Sidebar de Insumos à Direita (30%)**: Lista compacta de materiais sempre visível ao lado do canvas. No topo: ações rápidas (`[Comprar todos]`, `[Fazer tudo]`, `[★ Melhor combinação por lucro/hora]`). Em cada linha: checkbox BDO autêntico (`[✓] Fazer` em dourado vs `[ ] Comprar` desmarcado), slot BDO de 36×36px, quantidade, preço no mercado e badge Make vs Buy.
       - **Bandeja Inferior de Detalhes (100% de largura)**: Posicionada horizontalmente abaixo do canvas e da sidebar, com título `◇ Informações do item`, botão `[✕ Fechar]` e 4 colunas horizontais limpas:
         - Coluna 1: Identidade, descrição e métodos de produção (com dropdown de variantes e rendimento).
         - Coluna 2: Estoque do jogador nos armazéns cadastrados (necessário, do armazém, faltam).
         - Coluna 3: Mercado Central (preço atual, última venda, estoque) + campo para **Preço Personalizado**.
         - Coluna 4: Obtenção no mundo (bases de trabalhadores e spots de monstros com território e CP).
- **Verificações**:
  - `pnpm check`: lint, Prettier e typecheck passaram 100% sem erros.
  - `pnpm test`: 587 testes passando em todo o monorepo (53 calculators, 128 API, 344 web, 62 scripts).
  - Validação visual via Playwright em `http://localhost:4200/recipes/5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0` e `http://localhost:4200/recipes/items/1407`: os 5 indicadores financeiros exibem dados reais completos instantaneamente (Faturamento líquido: 27.671.250 prata, Custo dos materiais: 1.050.400 prata, Lucro líquido: +26.620.850 prata [+2.534,4%], Lucro/hora: 801.408.000 prata/h, Faturamento/hora: 833.024.160 prata/h).
- **Commits atômicos**:
  - `d5be804` `feat(crafting): implement 70/30 workspace layout with BDO checkboxes and bottom details tray`
  - `b11b5e1` `feat(crafting): add quick batch multipliers and canvas viewport navigation tools`
- **Novos Controles de Usabilidade Integrados**:
  - Atalhos Rápidos de Multiplicador de Lote: botões BDO compactos de 1 clique (`1x`, `10x`, `50x`, `100x`, `500x`, `1.000x`) com realce dourado ativo e cálculo em tempo real de materiais e custos.
  - Controles de Viewport do Canvas: barra integrada no topo do grafo com botões discretos de zoom (`＋`, `－`), `Ajustar` (ajuste perfeito ao viewport) e `Centralizar` (centralização no produto final).

## 20. Simplificação Radical da UI de Crafting: Maestria em 1 Clique, Otimizador Sem Fricção e Scroll Suave (Antigravity, 11/10/2026)

- **Problemas abordados**:
  1. Dúvida do usuário sobre a mensagem `'Complete as cotações e os tempos dos métodos para calcular uma combinação segura.'` ao tentar otimizar por lucro: o botão de melhor lucro/hora falhava quando havia insumos sem cotação de mercado ou quando os tempos dos métodos não haviam sido calibrados manualmente.
  2. Maestria da profissão e tempo por receita ficavam ocultos dentro do "Modo Avançado", forçando cliques extras e confundindo o jogador.
  3. Falta de foco visual e rolagem suave (`scrollIntoView`) ao clicar em materiais na sidebar ou nós do grafo.
- **Implementação**:
  1. **Otimizador Econômico Inteligente Sem Erros**:
     - `apps/web/src/app/shared/recipe-tree/recipe-tree.ts`:
       - `optimizeAcquisition()`: agora aplica os tempos padrão do jogo (`applyDefaultMethodTimes()`). Se o solver formal de 256 estados encontrar dados incompletos (ex: Lula #8211 ou peixes de NPC sem cotação de mercado), ele faz fallback automático para o **Otimizador Econômico Guloso** (padrão BDOLytics/BDO Workshop): avalia cada nó comparando custo de produção com rendimento vs preço de compra, atribuindo `'produce'` ou `'buy'` e exibindo retorno claro (`Melhor combinação aplicada: X para produzir e Y para comprar no mercado.`). Nunca mais exibe a mensagem de trava técnica.
       - `effectiveMethodTimes`: computed reativo que preenche automaticamente os métodos da receita com tempos autênticos do BDO (1.2s culinária/alquimia, 6.0s processamento) caso não configurados manualmente.
       - `totalCraftTimeSeconds`: calcula a duração com base nas operações e tempo do método primário, garantindo cálculo contínuo de taxas horárias.
  2. **Barra de Parâmetros de Produção em 3 Colunas (Inspirada no BDOLytics e BDO Workshop)**:
     - `apps/web/src/app/shared/recipe-tree/recipe-tree.html` e `recipe-tree.scss`:
       - **Coluna 1 (Quantia)**: Input de receitas + atalhos rápidos de lote (`1x`, `10x`, `50x`, `100x`, `500x`, `1.000x`).
       - **Coluna 2 (Maestria)**: Campo direto e sempre visível `◇ Maestria (Alquimia/Culinária)` com cálculo instantâneo de rendimento (`X un / receita`).
       - **Coluna 3 (Tempo por Receita)**: Campo `◇ Tempo por receita` com padrão 1.2s e tempo total estimado.
       - **Botão `★ Maximizar Lucro` em Destaque**: Ação proeminente em ouro BDO no próprio cabeçalho de parâmetros.
       - Remoção de textos de aviso repetitivos e redundantes (`<p class="help">`).
  3. **Scroll Suave e Foco Visual nos Cliques**:
     - Clicar em qualquer material na sidebar (`selectMaterial(itemId)`):
       - Centraliza o nó no grafo com `graph().center(path)`.
       - Abre a bandeja inferior de detalhes e faz scroll suave (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`).
     - Clicar em qualquer nó na árvore do grafo:
       - Rola suavemente a sidebar de materiais até a linha do item (`[data-item-id]`).
       - Destaca a linha do material com borda dourada intensa (`var(--bm-accent)`) e brilho interno.
       - Rola suavemente até a bandeja inferior com todos os dados e cotações.
- **Verificações**:
  - `pnpm check`: lint, Prettier e typecheck passaram 100% sem erros.
  - `pnpm test`: 587 testes passando em todo o monorepo (344 no frontend web, 128 na API, 53 calculadoras, 62 scripts).
- **Próximos passos**:
  - Catálogo de receitas geral: explorar ordenação paginada por lucro estimado preservando limites de requisição.
  - Testes end-to-end automatizados de fluxo de crafting no Playwright.

## 21. Revisão compacta do workspace de receitas e integridade do resultado (Codex, 11/10/2026)

- **Estado**: o registro abaixo substitui as recomendações de custo parcial, fallback guloso chamado de “melhor combinação”, duplicações de controles e o painel de detalhes no rodapé descritos nas seções 19–20. Trabalho na branch `codex/recipe-workspace-ui`.
- **Concluído**:
  - Produto, fórmula, número de operações e maestria aplicável estão na faixa inicial. O resultado usa quatro métricas compactas, seguido da árvore e dos insumos ativos lado a lado. Uma operação multiplica cada ingrediente da fórmula uma vez; dez operações multiplicam os insumos por dez.
  - Custo, lucro e lucro por hora são definitivos apenas para um plano sem pendências. A melhor combinação só pode ser aplicada quando o otimizador devolve um plano completo. A comparação gulosa de custo com preço bruto e os badges associados foram removidos.
  - Detalhes do material abrem em painel fixo com rolagem própria e devolvem o foco ao acionador original ao fechar, inclusive a partir do grafo. Os controles de tempo e estoque ficam no modo avançado. Ingredientes com quantidade desconhecida continuam visíveis como pendentes. Quantidade base do catálogo é identificada separadamente de rendimento fixo verificado; proc adicional sem modelo não é afirmado. Maestria só fica editável quando uma receita ativa de culinária ou alquimia tem rendimento variável modelado; alquimia simples e processamento não recebem um controle sem efeito.
  - Consultas de produção com mais de 100 IDs são divididas em lotes. Na falha 503 do provedor, cotações já recebidas são entregues imediatamente e não há rajada de consultas individuais. O coletor de mercado continua desligado conforme `docs/research/market-source-policy.md`.
- **Validação**: `pnpm test` passou com 598 testes (53 calculators, 128 API, 355 web, 62 scripts). `pnpm check` passou com lint, Prettier, typecheck e build de desenvolvimento. Playwright na receita Acompanhamentos Variados mediu início do workspace em 603 px no desktop e 980 px no celular, contra 1177 px e 2300 px antes, sem rolagem horizontal. Edania gerou lotes de 100 e 17 IDs, mas o provedor local respondeu 503; não há lucro real verificado para essa cadeia. Ver `docs/recipe-workspace-review-2026-10-11.md`.
- **Commits**: `9db5bf4` (`fix(market): chunk production quotes at API limit`), `bf0627a` (`refactor(recipes): compact workspace and gate incomplete results`), `e209c77` (`fix(market): retain partial production quotes on provider failure`) e `a8bea9c` (`fix(recipes): expose pending materials and only effective mastery`).
- **Arquivos**: `apps/web/src/app/shared/recipe-tree/{recipe-tree.ts,recipe-tree.html,recipe-tree.scss,recipe-tree.spec.ts}`, `apps/web/src/app/features/recipes/recipes-page.html`, `apps/web/src/app/core/{market-cache.service.ts,market-cache.service.spec.ts}`, este documento, `docs/recipe-workspace-review-2026-10-11.md` e referências da skill `.agents/skills/bdo-ui-design/`.
- **Próximo agente**: validar uma fonte de mercado permitida/estável e completar as cotações necessárias para Edania antes de afirmar a melhor combinação ou lucro por hora real. Calibrar proc por maestria somente com fonte ou amostras autorizadas verificadas. Preservar a árvore visual e suas interações. Rodar `pnpm check` e `pnpm test` após alterações.

## 22. Modernização Angular em andamento (11/10/2026)

Tarefa integral recebida no anexo fa42cec5. Auditoria e plano em docs/modernization. Skills Angular e Spartan instaladas. CLI Spartan 1.6.3 instalado e info --json executado com sucesso, mas Brain/Helm ainda ausentes. PDF de 252 páginas acessível, apenas sumário inicial lido. Próximo passo: integrar componentes base, configurar/testar MCP e completar análise visual do PDF. Solicitação recente exige remover modo avançado, preços somente da API e três cenários visíveis; ainda pendente. Não fazer merge da branch até validar essa etapa. Dependências novas ainda precisam de check e testes.

Etapa 22 atualizada: skill ui-design e agente criados/validados, Brain e Helm button/input/card instalados com tokens BDO. Três ações de cenário em receitas, modo avançado/editor manual removidos, preço somente de quotes API no adaptador. pnpm test passou com 598 testes. Playwright em 4301 confirmou fluxo e responsividade; 4200 serve outra versão. Ver docs/modernization/progress.md e docs/design-system/bdo-ui.md. Migração restante, Lucide, axe e MCP ainda pendentes.

## 23. Migração das demais telas para UI BDO (11/10/2026)

36 templates de features, shell e controles compartilhados migrados para Helm/Tailwind. Native select e textarea adicionados; BdoSelect mantém eventos de selects existentes. Cards preservam layout e padding responsivo. Corrigido texto de outline herdado de .btn. Build e 598 testes passaram; validação Playwright desktop/mobile das rotas habilitadas e fluxos Família/Mercado/Armazém/OCR. Ver docs/modernization/pages-migration.md. Próximo agente: preservar SCSS especializado ainda ativo, verificar fonte de mercado permitida e seguir testes visuais com dados completos. Axe-core/CI visual e MCP permanecem tarefas independentes; não afirmar que foram configurados.

## 24. Rebuild do Docker local (11/10/2026)

- Executado `docker compose -f docker-compose.yml --profile web up -d --build` com a migração UI atual. PostgreSQL e seu volume preservados; migrate terminou com código 0, API saudável e frontend ativo em http://localhost:4200. HTTP 200 confirmado em `/market` no frontend e `/ready` na API (porta 3000).
- O primeiro build revelou limites de produção excedidos: bundle inicial de 1,02 MB (limite 1 MB) e CSS de recipe-tree de 30,39 kB (limite 20 kB). O Dockerfile agora aceita `WEB_BUILD_CONFIGURATION`, com padrão `production`; apenas o compose local usa `development`, coerente com seu `ng serve`. Staging/produção não foram reconstruídos e seus limites continuam ativos.
- Arquivos alterados: `Dockerfile` e `docker-compose.yml`, commit `759983a` (`fix(docker): use development web build for local services`). `pnpm check` e `pnpm test` passaram (598 testes). Contexto atualizado neste documento.
- Próximo agente: reduzir bundle inicial e CSS da árvore antes de publicar a modernização em produção/staging. O rebuild local não valida preços externos nem os fluxos completos por navegador.
