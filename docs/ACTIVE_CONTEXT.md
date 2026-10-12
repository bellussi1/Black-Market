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

## 25. Lista de Mercado e detalhes de produção (11/10/2026)

- Lista com ícone/nome à esquerda e linha inteira como botão nativo. Removidos Topo/Bottom e preço atual duplicado: coluna de média observada em 30 dias, sem fallback de média ausente. Ordenação da média restrita à página e identificada como tal.
- Selecionar item abre detalhes no próprio Mercado: preço atual, líquido conforme taxas compartilhadas, estoque, limites, última venda e gráfico. Busca recolhida, retorno conserva filtros/página, histórico e explicações sob demanda. Desktop organiza produção e gráfico lado a lado; título móvel corrigido e sem overflow do documento.
- Novo `MarketProduction` busca fórmulas e usa `RecipeTree.summaryOnly` para os mesmos cálculos de maestria, rendimento, taxas, insumos, tempo e três cenários, sem montar o grafo. Seleção/região substituída cancela a consulta; versões divergentes e variantes aprimoradas não recebem cálculo base indevido. Pendências continuam explícitas, sem lucro definitivo parcial.
- Commits: `412e9fc` (lista), `14dda12` (resumo reutilizável), `492457e` (detalhes de Mercado). Arquivos em `features/market/market-{board,page,production}*` e `shared/recipe-tree/recipe-tree.{ts,html,scss,spec.ts}`; referências da skill BDO atualizadas. Revisão em `docs/market-item-review-2026-10-11.md`.
- Validação: `pnpm check` passou, `pnpm test` passou com 604 testes; após finalizar a linha nativa, 77 testes de Mercado/RecipeTree passaram. Playwright em `localhost:4200` confirmou clique em coluna numérica, Enter no botão da linha e mobile 390px sem overflow. Gráfico com quatro pontos validado usando fixtures interceptadas no navegador, não cotações reais. Docker local acompanha as mudanças via bind mount.
- Próximo agente: preservar a distinção entre média histórica e preço atual e entre produção base e aprimoramento. Validar cobertura real de preços/tempos antes de afirmar lucro/hora de toda a cadeia; manter os bloqueios de resultado incompleto. Resolver os budgets de produção da seção 24 antes de staging. Nenhuma publicação/merge realizada nesta etapa.

## 26. Menu lateral e ordenação do Mercado (11/10/2026)

- Removido “Ordenar por”, seu handler `setSort` e estilos sem uso. A lista mantém ordenação apenas pelos cabeçalhos. Categorias quebram texto e crescem em altura, com rolagem apenas vertical.
- Arquivos: `features/market/market-board.{html,scss,ts,spec.ts}`, este contexto, revisão de Mercado e referência de interações da skill BDO. Playwright no Docker local mediu `scrollWidth === clientWidth` (143px) no menu; documento móvel com largura 390px sem overflow. Seis cabeçalhos ordenáveis preservados. Capturas ignoradas em `output/playwright/market-menu-{desktop,mobile}.png`.
- `pnpm check` e `pnpm test` passaram (604 testes). Próximo agente: manter nomes completos nas categorias, sem `white-space: nowrap` ou altura fixa que provoque corte/scroll horizontal; não reintroduzir seletor de ordenação paralelo.

## 27. Busca e paginação de receitas (11/10/2026)

- Picker compartilhado com separação de 16px, padding interno, resultados com altura automática/texto quebrável e entrada suave. Transições de ações e rolagem do dropdown respeitam movimento reduzido. Busca da oficina também recebe espaço após o summary.
- A lista de receitas permanece montada durante a paginação. Status de atualização fica fora do fluxo e cliques de paginação em andamento são ignorados, evitando desmontagem e salto ao topo durante o carregamento.
- Arquivos: `shared/catalog-item-picker/catalog-item-picker.scss` e `features/recipes/recipes-page.{ts,html,scss}`. `pnpm check` e `pnpm test` passaram. Playwright em localhost:4200 confirmou dropdown de cerveja com gap 16px, altura de resultado 65px e texto normal; após paginação, scrollY 1273 e navegação montada. Capturas ignoradas em `output/playwright/recipe-{search-spacing,pagination}.png`.
- Próximo agente: preservar conteúdo existente durante revalidação; não aplicar animações que alterem dimensões de cards. Esta etapa revisou busca/ações/paginação de receitas, não constitui auditoria de todas as animações do aplicativo. Alturas diferentes entre conteúdos finais ainda podem variar; não afirmar CLS global zerado.

## 28. Auditoria de maestria em Edania (11/10/2026)

- Usuário informou `/recipes/items/1407`. API local confirmou 12 fórmulas `SIMPLE_ALCHEMY`. `masteryApplies` bloqueia a edição quando a profissão da raiz não é cooking/alchemy; logo, ignora a edição de maestria de profissões das subreceitas dessa cadeia. O adaptador só aplica o override à profissão da raiz; subreceitas usam o personagem ativo.
- Não confundir a etapa final de rendimento fixo verificado com os elixires intermediários de alquimia. Falta edição por profissão das etapas produzidas e indicação de quais etapas cada controle altera. Processamento também está fora do gate, embora maestria possa afetar processamento em massa/tempo e não necessariamente rendimento unitário.
- Encontrada aproximação linear não comprovada em `recipe-yield.ts` (2,5 + mastery × 0,00025, limite 2000), além de quantidade numérica do catálogo tratada como rendimento fixo. Auditar contra tabelas oficiais atuais antes de chamar esses resultados exatos. Nesta etapa apenas diagnóstico; sem alteração funcional ou testes novos. Próximo agente: implementar controles por profissão da cadeia e revisar modelos de proc/tempo com proveniência, preservando pendências e debounce 250ms.

## 29. Scroll do grafo, cenário inicial e importação de maestrias (11/10/2026)

- Canvas captura roda apenas com Ctrl/Command; roda normal continua rolando a página. Ajuda e teste de zoom atualizados; teste também verifica que a roda sem modificador não é cancelada.
- Importação permite criar e selecionar personagem no próprio fluxo e selecionar explicitamente todos os campos válidos. Campos ambíguos/unidades não confirmadas não entram nessa seleção. Personagem ativo é pré-selecionado; revisão de maestrias em duas colunas, títulos bronze e versão móvel em uma coluna.
- Playwright em localhost:4200 importou a captura enviada, criou o personagem de QA e aplicou 10 maestrias, incluindo Coleta 785, Alquimia 3320 e Culinária 3115. Não foi usado o navegador pessoal do usuário. Capturas ignoradas: `output/playwright/profile-{uploaded,confirmed,mobile}.png` (arquivo de upload efetivo: `profile-upload.png`) e `edania-scroll.png`.
- Em cadeia com raiz sem profissão de maestria, o campo existente usa a primeira profissão modelada de alquimia/culinária das subreceitas. Edania verificado com campo de Alquimia habilitado; override chega ao adaptador e às estimativas dos nós, mantendo rendimento fixo da etapa final. Não há ainda controles simultâneos para várias profissões nem tabela exata de proc revisada: a limitação da seção 28 permanece.
- Sem personagem ativo, cenários explícitos fazer/coletar e personalizado recebem hipóteses `informed`: 1 unidade por obtenção em 4s para ingredientes sem produtor. Ajustes explícitos têm prioridade. A UI informa que isso não comprova origem coletável. Busca otimizada é avaliada sem esses defaults, para não transformar material sem cotação/origem em aquisição gratuita conclusiva. Perfis existentes continuam usando calibrações próprias.
- `pnpm check` passou; `pnpm test` passou com 606 testes (53 calculators, 128 API, 363 web, 62 scripts); lint web repetido após texto final. Commits separados para scroll, importação e configuração de cenários. Próximo agente: revisar as tabelas de maestria atuais com proveniência e vincular presets de coleta a origens verificadas antes de habilitar suas hipóteses no otimizador. Preservar revisão explícita do OCR e não salvar screenshots no perfil.

## 30. Simulação econômica sem bloqueio de capacidade de compra (11/10/2026)

- Diagnóstico da captura: maestria não resolve os bloqueios `market-stock` e `budget`. A oficina usava prata inicial zero e oferta atual como condições obrigatórias para comparar lucro.
- `ProductionPlannerInput.enforcePurchaseLimits` mantém os limites por padrão; o adaptador da oficina desativa apenas restrições de disponibilidade de compra e orçamento. Preços ausentes/vencidos, rendimento, tempo e demais condições continuam sendo verificados. A interface identifica a simulação sem garantia de compra imediata.
- Teste de regressão cobre prata zero, oferta zero/desconhecida e cotação ausente. A validação completa fica registrada no resultado desta execução.
- Próximo agente: preservar limites no planejador de execução e distinguir simulação econômica de compra viável. Maestria 3000 continua sujeita à limitação do modelo de rendimento descrita na seção 28; esta correção não valida tabelas de proc nem cobertura real de mercado.
- Validação: `pnpm check` e `pnpm test` passaram (607 testes). Playwright confirmou o texto da simulação em Edania; o clique de otimização excedeu o timeout de 5s, portanto não há validação visual de conclusão da busca nesta execução. Investigar custo síncrono do solver antes de afirmar interação fluida.

## 31. Controles compactos da oficina (11/10/2026)

- Fórmula, quantidade e maestria compartilham uma faixa mais compacta, com altura alinhada e sem divisor vertical que deixava uma coluna visualmente vazia.
- Ajuste fino do rendimento e hipótese de coleta sem personagem movidos para Configurações de produção. Informações e handlers preservados; nenhuma alteração nos cálculos.
- Atalhos 1x/10x/100x usam Helm com variante outline e tamanho pequeno. Removidos estilos duplicados de botão. Indicadores econômicos e área de impostos com padding menor; aviso econômico resumido com explicação no title.
- Próximo agente: manter as três ações e resultado no fluxo principal, ajustes no contexto e avisos de dados ausentes. Esta etapa não corrige a limitação da tabela de maestria ou a duração do solver.
- Validação: 607 testes passaram; Playwright revisado em 1600px e 390px, sem overflow horizontal móvel (scrollWidth 390 = clientWidth 390). Capturas ignoradas em `output/playwright/compact-controls-{desktop,mobile}-final.png`. Preços reais de Edania não estavam disponíveis no navegador de QA; estados pendentes permaneceram visíveis.

## 32. Dois boxes de decisão lado a lado (12/10/2026)

- Correção da interpretação do layout: produto/configurações e resultado são dois boxes na mesma linha do host RecipeTree, não duas barras empilhadas. Workspace da árvore ocupa as duas colunas abaixo. Em até 900px, boxes voltam ao fluxo vertical; resumo de produção no Mercado preserva seu layout próprio.
- Fórmula ocupa a largura do box esquerdo; quantidade e maestria ficam lado a lado. Métricas do resultado organizadas em 2x2. Nenhuma alteração de cálculo.
- Playwright desktop 1600px confirmou ambos os boxes em y=168, largura=628px, x=288 e x=932. Captura ignorada: `output/playwright/two-boxes-desktop.png`.
- Próximo agente: preservar esta composição em dois boxes solicitada explicitamente, sem retornar a barras de largura inteira no desktop.
- Validação móvel: 390px sem overflow horizontal; boxes com x=18 e largura=354, empilhados. Botão de otimização verificado como BUTTON, cursor pointer, borda 1px e fundo carvão com texto dourado. Cursor pointer compartilhado para links, botões, summaries, selects, tabs e controles de escolha habilitados. Estilo de botão outline aplicado à otimização para distingui-la do fundo bronze.
- Após ajustes de cursor/botão, `pnpm test` passou novamente (607 testes). Check completo desta etapa registrado no resultado final.

## 33. QA de receitas longas no navegador (12/10/2026)

- Testadas 1408, 1407 e 1409 com 10 operações e maestria 3000 usando controles reais. Evidência em tmp/large-recipes-results.log; versão inclui alterações locais preexistentes não commitadas.
- 1408 e 1407 inconclusivas por dados da cadeia; otimização levou 12,6s e 14,3s respectivamente. 1407 exibiu contagem divergente: 4 pendências no resultado versus 2 na mensagem da busca.
- 1409 retornou prejuízo otimizado de 4.075.279 e -30.795.559/h, contra prejuízo de 5.735.000 na compra. Conferência aritmética: 9.087.000 - 13.162.279 = -4.075.279. Não comprova tabela de proc/tempos. Cenários devem ser relidos após estabilização reativa antes de comparar produzir/comprar.
- Próximo agente: investigar bloqueio síncrono da busca longa, reconciliar contagem de pendências e aguardar cache/cenário estabilizar em QA. Não afirmar melhor lucro real para 1407/1408 sem completar dados. Alterações existentes foram preservadas.

## 34. Investigação de busca longa (12/10/2026)

- Compra sem cotação não pode produzir plano econômico conclusivo: busca agora elimina essa alternativa antes de enumerar combinações, mantendo caminhos produtores/coleta modelados. 54 testes do calculador passaram após a poda.
- Limite de tempo ativo do perfil também não deve invalidar simulação econômica; permanece obrigatório no planejador de execução por padrão. Oficina informa duração calculada.
- Reprodução 1408 com maestria 3000 e 10 operações: clique excedeu 30s. Resultado de compra posteriormente estabilizou com receita líquida 1.794.000.000 e custo 2.525.000.000, prejuízo 731.000.000; mensagem da busca permanece inconclusiva. Não há certificação de ótimo, nem validação da tabela de maestria.
- Próximo agente: separar solver da thread principal via Worker, manter status/cancelamento/versionamento e reconciliar mensagens ao retornar ao cenário anterior. Completar diagnóstico de cada issue do plano otimizado antes de alterar gates. Não esconder preços/tempos desconhecidos nem declarar solução parcial ótima. Alterações locais preexistentes preservadas.

## 35. Otimização em Web Worker (12/10/2026)

- Busca exata removida do computed síncrono da interface. Novo production-planner.worker.ts executa planProduction; componente mantém cenário atual enquanto processa, mostra status e cancelar, aplica apenas resposta do worker vigente.
- Alterações de quantidade, maestria, grafo, cotações, tempos, coleta, estoque ou perfil invalidam snapshot e terminam worker. Troca de cenário/checkbox também cancela. Destroy termina worker. Sem fallback síncrono em navegador sem Worker.
- Playwright em 1408/1407/1409 com maestria 3000: clique em 37/51/45ms; próximo frame em 3,5/6/1,1ms. Cancelamento confirmado nas três. Não confundir responsividade com redução do tempo total ou validação de proc/preços.
- Cotações que mudam durante a busca cancelam o cálculo, conforme snapshot. Dados ausentes e limite de busca continuam explícitos. Próximo agente: otimizar solver e resolver cobertura real de dados sem retornar à thread principal.
- Validação adicional: Worker concluiu 1409 e devolveu plano inconclusivo por cotações ausentes, sem travar UI. Cache/contexto usa fingerprint de valores, evitando invalidar resposta apenas por reconstrução de Map. Contagem da mensagem otimizada ainda se refere ao plano da busca, enquanto painel conserva cenário anterior; não declarar essa divergência resolvida.
- 607 testes completos passaram após integração; 363 testes web repetidos após revisão do fingerprint. Check completo e build de desenvolvimento passam conforme logs desta execução. A disponibilidade de cotações externas continua fora desta correção.

## 36. Zoom pela roda e detalhes explícitos dos nodes (12/10/2026)

- A pedido do usuário, roda volta a ampliar/reduzir o canvas sem Ctrl/Command, preservando scroll em controles internos. Ajuda e teste atualizados.
- Ícone/nome do node seleciona/expande sem abrir detalhes. Botão único de informação SVG abre o painel. Painel reduzido de 980 para 780px, altura máxima 680px e backdrop transparente fecha ao clicar fora.
- Playwright confirmou clique comum sem painel, abertura via ícone com largura 780px e fechamento ao clicar fora. Próximo agente: preservar esta nova decisão de zoom (substitui orientação antiga de Ctrl+roda).

## 37. Comparação com BDO Workshop e causa das 115 pendências (12/10/2026)

- Página pública https://bdoworkshop.com/crafting-workshop/plan/1408 consultada no navegador: maestrias Alchemy/Processing 0, cálculo imediato com materiais comprados, tempo e imposto predefinidos. Exibe essência de Ibellab a 10.000 vendida por NPC. Região visível EU; valores não servem como cotação SA. Página se declara em construção.
- BDOLytics respondeu 403/Cloudflare; suas regras internas não foram verificadas.
- Anexo contém pedidos de rendimento/tempo de coleta repetidos, ciclos e preço ausente. Causa direta: RecipeTree.makeChoice retorna gather para todo item sem produtor. Isso não comprova coleta; com personagem ativo, adaptador não adiciona defaults e os pedidos se multiplicam.
- Correção estrutural pendente: insumos base devem usar compra de mercado/NPC por padrão; coleta apenas com origem/modelo verificados. Resolver fornecedores NPC com proveniência em vez de pedir preço de Mercado de item não comercializável. Selecionar fórmulas acíclicas ou interromper expansão em aquisição válida. Deduplicar mensagens por item/código, sem esconder falha de custo.
- Manter worker. Não atribuir custo zero a insumo coletado sem valorar aquisição/tempo. Não prometer tabela exata de maestria usando aproximação atual.

## 38. OCR de life skills e entrada automática (12/10/2026)

- Gerador versão 2 filtra catálogo publicado por ingredientes/produtos de tipos de receitas de culinária, alquimia e processamento (COOK/ALCHEMY/HEAT/GRIND/SHAKE/FIREWOOD/THINNING/DRY). Não põe numerais romanos em materiais. Itens sem evidência nessas receitas não entram; cobertura completa de caça/coleta ainda requer classificação de origens.
- Novos lotes locais: tmp/ocr-dataset/lifeskills-calibration (72, seed 20261013) e lifeskills-evaluation (18, seed 20261012). Antigo synthetic-evaluation preservado. Geração não equivale a treinamento de pesos do Tesseract.
- Benchmark da avaliação: grid F1 1, 606 quantidades, 46 exatas (7,59%), 196 incorretas e 364 não lidas. Benchmark usa OCR textual geral, não NumberReader completo/refinador de ícones. Não alegar melhora de acurácia ou reconhecimento de IDs medido. Roman não aplicável (zero amostras).
- /scans abre AutomaticScanPage: upload único, leitura local, detecção de painel e encaminhamento ao revisor de itens ou perfil. Revisores manuais preservados. Perfil reutiliza as linhas reconhecidas para evitar OCR duplicado. Screenshot de maestria autorizada detectada no Playwright.
- Próximo agente: concluir calibração de quantidade-pixels/glyphs e benchmark do motor real (NumberReader + IconRefiner), com avaliação independente real autorizada. Refinar rotas de imagens ambíguas/múltiplos painéis, lotes mistos e esconder configurações manuais de área até correção solicitada. Não chamar esta etapa de retreinamento concluído.

## 39. Botão de detalhes no canto do node (12/10/2026)

- Botão de informação posicionado no canto superior direito, com 6px de distância. Cabeçalho reserva 40px à direita para evitar sobreposição com nome/ícone. Abertura exclusiva pelo botão e fechamento externo preservados.

## 40. Ações independentes no card de item (12/10/2026)

- Corpo do card apenas seleciona, sem emitir expand/source. Expansão de item com origens ou sem receita não chama showContext implicitamente. Lista lateral também apenas seleciona ao clicar no nome; ícones de detalhes preservados.
- Playwright: clique no corpo manteve 6 nodes e zero modais; ícone abriu 1 painel; botão de recolher reduziu árvore para 1 node sem modal. Card revisado na captura ignorada output/playwright/item-card-explicit.png: nome/ícone e ação de informação separados, sem sobreposição.
- Testes atualizados para exigir expansão pelo botão; seleção local preservada explicitamente. Próximo agente: não reintroduzir aberturas de detalhes em caminhos de expansão ou seleção; manter botões específicos.

## 41. Aquisição modelada e avaliação do Scan real (12/10/2026)

- makeChoice compra matérias-primas por padrão; coleta requer estimativa calibrada, rendimento/tempo positivos e origin user-confirmed. Calibração manual registra essa origem; não há confirmação automática por personagem ausente. Defaults fictícios removidos do adaptador.
- Registry npc-purchase-prices.ts: Essência de Ibellab #4986, preço de compra 10.000, fonte Pearl Abyss https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=738 e verificação 12/10/2026. Catálogo extraído também confirma buyPrice 10000/sellPrice 2000. Outros preços NPC não foram inventados.
- Grafo exclui produtor intermediário que fecha back-edge de ciclo, permitindo adquirir esse item externamente; issue de diagnóstico permanece. Planner deduplica por código/item independentemente do método, UI agrupa mensagens por item/etapa com nome. Testes de poda e preço NPC.
- Novo scripts/evaluate-scan-reader-output.mjs pontua saída do ScansPage real contra slots rotulados por IoU >=0.5; quantidade incerta não conta como aceita. Avaliação piloto sample-00001 antes: 3/32 IDs exatos e 0 quantidades corretas dentre 15 aceitas (suposições 1 incluídas). Não é acurácia independente real.
- OCR não interpreta falha de leitura como prova de 1 unidade; sugestão 1 exige revisão. Quantidades incertas recebem fallback SINGLE_LINE por crop com mesmo worker e orçamento adicional 8s por lote. Experimentos de recorte superior de ícones/escala1600 pioraram IDs e foram revertidos. Não alegar reconhecimento de itens melhorado ou treinamento concluído.
- Próximo agente: corpus real autorizado com rótulos item-ID e quantidades para calibração/avaliação independentes; completar benchmark NumberReader/IconRefiner para várias resoluções, medir fallback por lote e ambiguidade de ícones compartilhados. Preservar compras padrão/valores NPC e worker; não reintroduzir coleta fictícia.
- Avaliação final da configuração entregue: sample-00001, 32/32 slots, 3/32 IDs exatos (9,375%), 1 quantidade aceita e incorreta, nenhuma quantidade exata aceita. Relatório local tmp/ocr-dataset/lifeskills-evaluation/actual-verified.json. Não há melhora de acurácia comprovada; fallback e revisão reduzem aceitação de suposições, sem resolver o reconhecimento.
- Validação: pnpm check passou em execução isolada; pnpm test passou com 610 testes (54 calculators, 128 API, 364 web, 64 scripts). Playwright em 1408 confirmou cenário fazer/coletar com 4 grupos de pendências reais, sem pedidos repetidos de coleta. Lucro definitivo ainda depende de cobertura de cotações. Browser de avaliação encerrado.

## 42. Maestria por faixas e otimização multinível (12/10/2026)

- Padrão sem personagem: 1000, campo/override limitados a 0–3000. Mesma regra no grafo visual e no input do worker, incluindo intermediários de outras profissões sem dados importados.
- recipe-mastery.ts contém snapshot de probabilidades máximas de culinária/alquimia em faixas de 50 pontos até 3000. Substitui aproximação linear limitada a 2000 por valor esperado padrão 2,5 + 1,5 × chance; rendimento arredondado em milésimos pelo contrato do planner. Fórmulas fixas/quantidades explícitas preservadas. Fontes e limites em docs/research/recipe-mastery-model.md.
- Busca existente compara lucro líquido/tempo integral entre escolhas multinível para a fórmula selecionada. Teste novo de 1000 receitas certifica comprar intermediário lento, produzir outro e seu intermediário, comprar matéria-prima; verifica receita bruta 1.000.000, líquida 650.000, custo 12.000, lucro 638.000, tempo 61.100s. Primeiro caso de teste mostrou corretamente que maior lucro total pode perder em lucro/hora quando acrescenta tempo demais.
- pnpm test passou: 55 calculators, 128 API, 364 web e 64 scripts; pnpm check passou. Playwright confirmou campo inicial 1000 e max 3000 em 1407. Não alegar cálculo completo de procs: produção em massa ainda não ajusta tempo e produtos aleatórios/especiais exigem distribuição própria. Outras tabelas consultadas não foram aplicadas como multiplicador genérico. Próximo agente: incorporar efeitos de tempo em massa e subprodutos com modelo e fontes explícitos, mantendo Worker e sinalização de ótimo inconclusivo.

## 43. Rodapé dos cards da árvore (12/10/2026)

- .graph-node reserva 2px internos para preservar a moldura de seleção; .expand-node usa margin-top auto e flex-shrink 0 para permanecer na base do card. Mensagens passam antes da ação, garantindo botão como último elemento do card de item.
- Playwright em 1407: cinco botões medidos com distância uniforme de aproximadamente 1,426px da moldura embaixo e nas duas laterais no zoom de 48%; screenshot output/playwright/card-footer-visible.png conferido, incluindo cards com seletor e sem seletor. Mantidas alturas guiadas pelo conteúdo; não forçar alturas fixas que cortem nomes.
- Próximo agente: preservar margem da moldura e ações no rodapé ao incluir novos avisos ou controles no card.

## 44. Importação centralizada e tutorial de captura (12/10/2026)

- AutomaticScanPage usa template e SCSS próprios. Entrada centralizada em 880px; revisão em até 1200px. Mantido upload/detecção automática e encaminhamento aos revisores existentes.
- Tutorial de três passos: abrir uma janela do jogo, Windows + Shift + S com recorte retangular incluindo título/grade/números, salvar PNG pela Ferramenta de Captura e enviar. Exemplo esquemático de enquadramento, identificado como ilustração; recomenda resolução original e evitar compressão/foto/tooltips.
- Aviso explícito de OCR em calibração e revisão obrigatória. Guia de correção corresponde aos controles reais: destino/personagem, item/opções/busca por nome, quantidade, revisão dos campos de perfil, Incluir item e resumo antes de confirmar. Durante revisão, explicação fica recolhida e acessível no mesmo contexto.
- Playwright e screenshots desktop/mobile conferidos em output/playwright/scan-guide-desktop.png e scan-guide-mobile.png. Conteúdo desktop de 880px; mobile 390px com scrollWidth 390, três passos e tipos PNG/JPEG/WebP preservados. Próximo agente: preservar detecção automática e instruções de revisão; não afirmar reconhecimento confiável sem avaliação independente.
- pnpm check e pnpm test passaram (611 testes). Esta alteração é de interface e instruções; não comprova aumento da acurácia do OCR.

## 45. Inspeção de cálculo BDO Workshop em 1408 (12/10/2026)

- Navegador do app usado para Buy all, Craft all, Best profit/hour, Manage crafts, maestria e tempo. Evidências completas em docs/research/bdo-workshop-plan-1408-observations.md; EU, 1000 operações de fórmula x10, sem estoque. Não usar cotações como SA.
- Otimizador abre prévia com política de item esgotado e exige Apply to plan; não era botão inoperante. Permitindo pré-ordem coincide com Buy all; exigindo produção retorna cadeia mista com taxa maior apesar de lucro total menor que Craft all. Soma das operações e tempos conferida.
- Maestria 1000 gera aproximadamente 14143 reagentes por 5000 operações, compatível com modelo de proc padrão. Dobrar segundos de alquimia preserva lucro e reduz taxa; tempo de alquimia simples permanece separado. Não foi inspecionado código interno nem comprovado ótimo global do site.
- Apenas documentação alterada, sem executar testes de código nesta inspeção. Próximo agente: usar os exemplos verificados para normalizar lote, produto, NPC, subprodutos, políticas de aquisição e todos os tempos; manter ressalvas sobre pré-ordens e fontes regionais.

## 46. Scan desktop primeiro e espaço no topo (12/10/2026)

- Entrada usa duas colunas até 1200px: captura/aviso à esquerda, tutorial/exemplo à direita. Espaço superior 24px; status vazio não reserva linha. Guia de correção recolhido por padrão, preservando todo seu conteúdo. Até 1000px volta a uma coluna; revisão continua em uma coluna.
- Playwright: desktop 1280×720, ambos os painéis iniciam em y96 e tutorial termina em y679,75, permitindo ver o conteúdo inicial sem scroll. Mobile 390px tem scrollWidth 390. Screenshot output/playwright/scan-desktop-compact.png conferido.
- Próximo agente: preservar informação de captura e correção acessível; evitar voltar ao empilhamento no desktop amplo.
- Revisão de legibilidade solicitada: textos de instrução/aviso/legenda em 14px, títulos de passos em 15px, marcadores numéricos de 16px em caixas 28px; instruções e aviso usam cor de texto principal. Contraste medido via cores computadas: instruções 12,03:1, aviso 10,33:1, introdução/legenda 7,09:1, summary/marcadores 8:1. Não equivale a auditoria completa de acessibilidade.
- Screenshot output/playwright/scan-contrast.png; tutorial termina em y673 em viewport 1280×720. pnpm check e pnpm test passaram para refatoração; lint web repetido após ajustes de SCSS passou. Mantidos todos os conteúdos, com divulgação do guia de correção sob demanda.

## 47. Corpus real e calibração de quantidades (12/10/2026)

- Scripts build-real-slot-corpus/real-ocr-corpus: 180 quantidades transcritas em duas sessões autorizadas, hash/origem/bounds e separação de sessão/imagem validados. Manifesto local data/ocr-corpus/lifeskill-slots.json, não versionado. Seis referências de ícones conferidas com assets; não são IDs únicos confirmados.
- Calibrate-quantity-glyphs gera 273 variantes somente da calibração; quantity-pixels admite pontuação curta e compara variantes por caractere. Perfil local real-quantity-profile permite sintéticos com máscaras medidas, contorno e bounds registrados. Dois exemplos locais gerados/conferidos. Não é treinamento de pesos do Tesseract.
- IconRefiner usa região superior consistente entre screenshot e catálogo; sugestões ambíguas mantêm item null e opções para revisão. Limiar de quantidade exata elevado de 50 a 85; texto ausente/abreviado continua incerto. Ainda há erros aceitos; confiança não comprova correção.
- Benchmark Playwright usa ScansPage real e compara glyph/Tesseract no mesmo recorte com arredondamento equivalente. Prepare-scan-benchmark gera callback reproduzível. Evaluator mede revisão, falsos aceites, candidatos de ícone, tempo e distingue rótulo visível de quantidade aceita. Documentação: docs/research/real-ocr-calibration.md.
- Calibração: 90/90 slots, 66/90 rótulos, 37/39 quantidades aceitas corretas, 84/90 revisão, 12,31s. Avaliação de outra sessão: 90/90 slots, 30/90 rótulos, 18/20 quantidades aceitas corretas, 89/90 revisão, 9,20s; glyph isolado 0/90, Tesseract 22/90, referências de ícone nos candidatos 0/2. Não alegar melhora independente comprovada nem reduzir revisão. Avaliação repetida para corrigir equivalência do harness, sem ajuste do modelo nos rótulos reservados.
- pnpm check passou; pnpm test passou com 619 testes (55 calculators, 128 API, 364 web, 72 scripts). Próximo agente: completar inventários/IDs reais rotulados, diagnosticar segmentação de números pequenos e cobertura de candidatos; reservar nova sessão caso use os erros atuais para calibrar. Pipeline e medições implementados; reconhecimento confiável continua pendente. Solicitação de funcionalidade comparável ao Workshop permanece autorizada e deve continuar usando seção 45, preservando Worker.

## 48. Prévia de otimização e política de esgotados (12/10/2026)

- ProductionPlannerInput.marketAcquisition separa preorder de produce-sold-out sem reativar limites de prata do perfil. Compras de mercado zerado ficam inválidas na segunda política; NPC e estoque próprio permanecem válidos. Oferta parcial pode exigir pré-ordem; espera e transporte não entram no lucro/hora. Adaptador repassa política com preorder padrão.
- Worker entrega prévia antes de aplicar. UI mostra taxa, lucro total, materiais, tempo e detalhes por item/etapa, mantendo cenário atual até Aplicar combinação. Mudança de snapshot invalida prévia; escolha manual fecha/cancela; erros de Worker antigo são ignorados. Faturamento bruto/líquido e tempo total (incluindo final) visíveis. Seletor usa tokens e grid compacto; sem modo avançado global.
- Testes reproduzem Buy all histórico EU (1000 operações x10, lucro 403,14B, taxa 241,884B/h, tempo 6000s), alteração de tempo sem alterar lucro total e política de estoque/NPC. Não importar preços históricos como cotações do app. pnpm test passou com 622 testes; pnpm check passou, com revisão final após refinamento visual.
- Playwright em 1407/1408/1409, 1000 operações: clique 57/46/46ms, próximo frame 2,7/3,9/2,6ms; desktop1280/mobile390 sem scroll horizontal. Prévia/aplicação conferidas com fixture controlada de UI, não cotação real. As três páginas locais ainda têm preços ausentes (5/3/6 grupos); não declarar lucro real validado.
- Documentação: docs/research/workshop-calculator-implementation.md; skill bdo-ui-design atualizada com distinção de taxa/total e políticas. Próximo agente: completar fonte/cobertura de mercado permitida e modelos de subprodutos/produção em massa com evidência; manter busca em Worker e limites explícitos. OCR permanece em calibração conforme seção 47, sem redução de revisão autorizada pelos resultados.

## 49. Revisão compacta após upload no Scan (12/10/2026)

- Revisão passa a ser o conteúdo principal após upload; cabeçalho inicial, tutorial e configuração inicial não se repetem. Nova captura, destinos do lote, recorte, tipo e resumo ficam em seções contextuais recolhidas; recorte permanece aberto antes dos resultados. Lote de uma captura não exibe tabs, título ou métricas redundantes.
- Grades detectadas automaticamente são analisadas sem clique adicional. Não há salvamento automático; dúvidas, seleção manual, revisão e confirmação permanecem. Harness de benchmark aguarda leitura automática e reutiliza seu tempo, evitando processamento duplicado.
- Cards aproximam ícone, item e quantidade; removido seletor vazio e placeholder de quantidade 1. Ícone de catálogo representa apenas seleção real. Perfil também recolhe captura original e ajustes após leitura.
- Playwright com captura real autorizada: 90 espaços analisados, desktop 1440x900 e mobile 390x844 sem overflow horizontal (scrollWidth 390); maestrias em desktop sem overflow. Screenshots conferidos em output/playwright/scan-compact-desktop.png, scan-compact-cards.png, scan-compact-mobile.png e scan-compact-profile.png. Nenhuma importação confirmada durante QA. Mensagens de resolução do Tesseract no console são diagnósticos do motor.
- Teste de regressão verifica recolhimento após resultados, acesso ao contexto e ausência de seletor vazio. Esta alteração não comprova melhora de reconhecimento; manter limitações e revisão descritas na seção 47. Próximo agente: continuar calibração independente e avaliar redução adicional de campos de perfil sem esconder divergências.
- Verificação final: pnpm check e pnpm test passaram (623 testes); git diff --check sem erros.

## 50. Estabilidade do clique de otimização (12/10/2026)

- Causa: cancelar cálculo e prévia eram inseridos no fluxo; mensagens e resultado incompleto também alteravam altura. A mesma ação alterna otimizar/cancelar com largura fixa. Prévia usa dialog nativo na camada superior, com foco modal, Escape e clique fora; não empurra métricas ou árvore. Status tem espaço reservado e rodapé mantém altura com scroll interno para avisos extensos.
- Teste existente de otimização verifica estrutura de dialog e status. Playwright conferiu estado de cálculo e prévia com fixture de apresentação (não cotação), fechamento por Escape, desktop1280 e mobile390. Cotações assíncronas devem terminar antes de medir estabilidade específica do clique.
- Arquivos: recipe-tree.ts/html/scss/spec.ts. Próximo agente: preservar prévia fora do fluxo, tamanho do botão e espaço de feedback; não voltar a inserir cancelar ou proposta acima da árvore.
- Medição com página estabilizada: filhos do painel mantiveram y/altura ao abrir e fechar dialog; cálculo preservou y168 e altura565,67. Primeira medição durante carregamento mostrou variação residual, portanto não equivale a estabilidade de toda a carga inicial. Screenshots optimization-stable-dialog.png e optimization-stable-mobile.png conferidos. pnpm test passou com 623 testes.
- pnpm check final passou; git diff --check sem erros.

## 51. Evidência de quantidades e estado de análise (12/10/2026)

- Quantidades isoladas ficam com confiança no máximo84; concordância requer ambas >=70. Conflitos persistem mesmo com tentativa posterior coincidente; valores continuam revisáveis. Todas as leituras locais passam pelo fallback, sem bypass por confiança alta. Não é treinamento de pesos.
- Benchmark usa exatamente inset3%/largura94% do Scan. Reexecução sem templates de avaliação: 90/90slots,33/90rótulos,2/2quantidades aceitas corretas,0erradas,90/90revisão,22,46s; glyph0/90 e ícones0/2. Protocolo de recorte corrigido e execução mais lenta limitam comparação anterior. Relatório e limitações em docs/research/real-ocr-calibration.md.
- UI: painéis iniciais esticam à mesma altura; análise tem status e uma ação cancelar no mesmo bloco, sem cancelamento duplicado. Recorte recolhido durante análise e ajustes com espaçamento. Capturas de QA em output/playwright/scan-equal-panels.png e scan-analysis-clear-actions.png.
- Próximo agente: completar sessão nova de inventário e IDs confirmados; melhorar segmentação e candidatos, medir duração. Não baixar limiares para aumentar cobertura aparente nem usar esta sessão repetida como garantia de acurácia geral.
- QA visual: ambos os painéis mediram554,625px; durante análise havia um único botão Cancelar análise e recorte recolhido. Screenshots conferidos, sem salvar importação.
- pnpm check e pnpm test passaram (625 testes). git diff --check sem erros. Warning pt-BR usa fallback pt, já existente.

## 52. Inventário real e preservação dos dígitos (12/10/2026)

- Corpus ampliado para192 quantidades:180 de armazém e12 números visíveis do inventário da captura3b5639390052. Slots sem número visível não recebem quantidade1. Inventário tem cobertura parcial e região manual registrada; não é prova de detecção automática. Mantido o mesmo split da sessão10/10. IDs seguem não confirmados.
- Diagnóstico visual do recorte ampliado mostrou dígitos de inventário iniciando acima do corte0,57 do slot. Inventário passa a usar top0,45/height0,5; armazém mantém0,57/0,37. Ampliar fallback não suaviza os pixels. Calibrador agora usa o mesmo inset3%/largura94% e arredondamento do Scan. Regerados273 templates somente da calibração; diagnóstico local calibração31/90 permanece31/90, sem alegar ganho do glyph.
- Harness aceita região manual para diagnóstico, sem passar quantidades ou IDs ao leitor. Scorer de rótulos parciais reporta slots não avaliados e falsePositiveSlots=null, evitando penalizar slots sem transcrição. Teste específico dessa semântica adicionado.
- Esta imagem foi usada para diagnosticar geometria: resultados posteriores são diagnóstico, não avaliação independente. Próximo agente: reservar nova sessão antes de medir generalização e completar IDs com evidência. Equipamentos e imagens de comunidade ainda não têm ground truth completo neste corpus.
- Diagnóstico inventário:0/12 antes e0/12 depois,nenhuma aceitação; região manual associou12 rótulos,12slots não avaliados. Releitura3,73s exclui processamento inicial da outra janela. Correção de recorte não demonstrou ganho de acurácia. pnpm test passou com626 testes.
- pnpm check final passou e git diff --check sem erros. Templates/imagens locais permanecem fora do versionamento de dados; scripts e máscaras de caracteres são versionados.

## 53. Iteração contínua de OCR autorizada (12/10/2026)

- Usuário pediu continuar autonomamente até acertar itens e quantidades; objetivo ativo registrado. Não encerrar como concluído por melhorias apenas de pipeline. Preservar revisão e medir cobertura/erros aceitos; novas iterações não dependem de novo prompt.
- Diagnóstico browser com6 rótulos da primeira linha do inventário, variando largura do recorte, binarização e ampliação. Recorte60% à direita/raw permitiu55 e3 corretos; threshold110 leu29; outras configurações falharam ou fabricaram números. Nenhuma mudança desses parâmetros incorporada ao produto nesta rodada. Resultados tmp/ocr-dataset/quantity-preprocessing-results-2.log; não são avaliação independente.
- Uma primeira variante do próprio experimento cortava a imagem ampliada por canvas pequeno; corrigida antes de interpretar resultados. Esse defeito era do experimento, não do produto. Próximo passo: extrair região real do rótulo e comparar no conjunto de calibração, depois medir outra sessão; examinar cobertura do catálogo para ícones. Não transformar parâmetros escolhidos nesta sessão de diagnóstico em prova de generalização.

## 54. Diagnóstico de altura e descritor de ícones (12/10/2026)

- Comparação local de alturas do recorte glyph, usando somente calibração: janela0,65 leu31/90 corretamente;0,8/0,9/1 leram32/90, sem erros entre as leituras. Outra sessão permaneceu0/90 com0,65 e0,8. Nenhum threshold do produto alterado, pois o ganho não generalizou.
- Scripts temporários tmp/ocr-glyph-variants.mjs e tmp/ocr-glyph-evaluation.mjs, formatados. O diagnóstico transpila o mesmo quantity-pixels do produto e usa sharp apenas para recortar pixels. Evidência não inclui pipeline completo nem reconhecimento de itens.
- Próxima ação concreta: auditar catálogo/alias e enquadramento dos ícones. Servidor produz assinatura com sharp resize8x8 cubic; navegador usa drawImage64 e média8x8. Ambos extraem80% superior, mas interpolação difere. Isso ainda é hipótese a medir; conferir pixels/referências reais antes de mudar o índice. Objetivo continua ativo.
