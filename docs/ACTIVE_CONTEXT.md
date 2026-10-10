# Estado Ativo do Projeto (Context Handoff)

_Este arquivo é o canal oficial de passagem de bastão de contexto entre OpenAI Codex e Antigravity. Mantenha-o sempre atualizado ao trocar de agente._

---

## 1. Estado Atual Verificado: 10/10/2026

- **Agente Atual**: Codex
- **Branch Ativa**: `develop`, publicada e rastreando `origin/develop`.
- **SHA do código implantado em staging**: `5a0f396003af580ddc065466f2903e883fe25ebd` (`feat(crafting): add focused hybrid production optimizer`).
- **Imagem local do staging**: `black-market:staging-20261010213049`.
- **Commits desta entrega**: `7a6cf4a` (limite OCR 4K), `e660d25` (coletores de mercado OFF), `4831f49` e `3f4d408` (contagens/fontes), `542dc72` (split de avaliação OCR), `c9290c9` (política de mercado) e `5a0f396` (combinação automática de crafting). Cada commit tem uma responsabilidade delimitada.

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
