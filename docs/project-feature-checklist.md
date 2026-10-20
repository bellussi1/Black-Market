# Catálogo de pedidos e prioridades

Consolidado em 20/10/2026. Uma fonte para status/fila/cobertura; não é leitura inicial obrigatória. Use [estado atual](ACTIVE_CONTEXT.md) e busque o domínio ou ID necessário.

## Como interpretar

- A matriz de pedidos abaixo conserva as linhas e origens do catálogo de 18/10. São estados datados, não certificação universal do código atual; entregas posteriores e prioridades desta seção prevalecem.
- Marcas: `[x]` entregue no escopo indicado; `[~]` parcial; `[ ]` pendente; `[!]` dependência externa; `[?]` revalidar. Não reimplemente uma entrega só porque um snapshot tem checkbox antigo.
- Histórico integral de conversas, notas e tabelas anteriores: [snapshot](archive/2026-10-20/project-feature-checklist.md). Status/fila/cobertura antigos também estão no [arquivo](archive/README.md).

## Regra permanente para novos pedidos

Atualize a entrada do domínio ou ID existente, preservando origem, data, evidência e limite. Crie ID apenas para demanda distinta; não replique a fila noutro documento. Mudança de estado exige conferir o código/ambiente e apontar a fonte técnica. Detalhes de execução ficam no relatório pertinente; o contexto recebe somente um link e o próximo passo.

## Atualizações verificadas em 19–20/10

- Unificação de Profissões/Família e fundação BDO entregues; [estado atual](ACTIVE_CONTEXT.md) aponta os relatórios. Família preenchida/administração e zoom equivalente tiveram [35 amostras sintéticas](research/ui-filled-zoom-controls-2026-10-19.md); isso não homologa login, persistência ou zoom nativo.
- [Receitas compactas](research/recipe-decision-panels-density-2026-10-19.md), [foco/detalhes](research/recipe-expansion-focus-details-2026-10-19.md), [Home](research/home-hierarchy-refresh-2026-10-19.md) e [Profissões](research/lifeskills-visual-refresh-2026-10-19.md) implementados nesta branch. Não reabrir esses pedidos como tarefas novas.
- UI-STD-04/07: novas matrizes complementam a amostra autenticada vazia anterior, sem convertê-la em QA real de conta preenchida. PERF-01: fechada em 20/10; produção abaixo do aviso de 500 kB. Evidências no relatório do shell indicado na prioridade.
- DATA-01/02/03/04 continuam dependendo das fontes/corpus descritos abaixo. Autorização de serviço externo, importação, coleta, migração ou deploy deve ser conferida na sessão/ambiente, não inferida de um documento antigo.

## Prioridades e decisões com ID

### FEAT-01 — Comparação de sessões observadas

- **Estado da execução:** Concluída no código; gates passaram
- **Próxima entrega / dependência concreta:** Agrupar por rota, profissão, maestria e modo; região isolada; amostra, período e prata/h ponderada por duração. Sem previsão por maestria ou ranking universal.

### DATA-05 — Metadados estruturados para subprodutos aleatórios

- **Estado da execução:** Concluída no extrator/importador e no serviço de catálogo (`4620fe7`)
- **Próxima entrega / dependência concreta:** `readExtractorDataset` grava `sourceData.randomByproduct = true` na importação e `CatalogService` consome o metadado estruturado com fallback localizado (`pt/es/en`) para datasets já publicados.

### DATA-01 — Catálogo/receitas pós-patch e ícones ausentes

- **Estado da execução:** Bloqueada por dados verificados
- **Próxima entrega / dependência concreta:** Extração SA/PT atualizada e autorizada; validar relações culinárias/IDs e assets #9738/#9740. Não restaurar DRY 1:1 por inferência.

### DATA-02 — Ordenação por lucro/vendas e liquidez SA

- **Estado da execução:** Fonte temporal continua pendente; apresentação corrigida para negociações acumuladas, sem garantia de volume/liquidez, estoque desconhecido explícito e contador exato.
- **Próxima entrega / dependência concreta:** Fonte permitida com unidade, período, cobertura e frescor; premissas pareadas. Contador acumulado não é volume diário. Correção em ACTIVE_CONTEXT §184.

### DATA-03 — OCR completo e medição independente

- **Estado da execução:** Ferramentas presentes; corpus pendente
- **Próxima entrega / dependência concreta:** Capturas autorizadas com rótulos independentes, separadas da calibração. Medir item/quantidade/perfil/gear por campo; sem precisão presumida.

### DATA-04 — Mapa completo, grind/coleta/caça/pesca e workers automáticos

- **Estado da execução:** Modelos manuais parciais; dataset pendente
- **Próxima entrega / dependência concreta:** Locais/rotas, produção/tempo e regras por patch com procedência. FEAT-01 organiza observações pessoais, sem substituir esses dados.

### RULE-01 — Curvas de FS/XP/CP, aprimoramento e bônus automáticos

- **Estado da execução:** Calculadoras manuais presentes; regras pendentes
- **Próxima entrega / dependência concreta:** Regras e tabelas versionadas por equipamento/profissão/patch; casos de referência. Não inferir chances privadas ou normalização por maestria.

### AUTH-01 — Google/Steam e recuperação/sync em conta real

- **Estado da execução:** Validado localmente com login Google real, sessão autenticada e consulta de dados salvos em `/settings`; vínculo Steam OpenID segue disponível
- **Próxima entrega / dependência concreta:** Sessão Google verificada ao vivo (`Enzo Bellussi`, provedor `Google`), consulta de workspace (`Consultar meus dados salvos`) e comparação nuvem vs. navegador validadas sem sobrescrever dados locais. Veja `docs/ACTIVE_CONTEXT.md` §178.

### AUTH-02 — Padronização dos botões sociais Google/Steam na paleta da marca

- **Estado da execução:** Concluída: ícones vetoriais SVG oficiais do Google e da Steam em slot dedicado + paleta BDO (`--bm-surface-raised`, `--bm-control-border`, `--bm-accent`)
- **Próxima entrega / dependência concreta:** Substituídas as imagens PNG díspares por botões padronizados da marca (`LoginPanel` e `Vincular Google/Steam` em `AccountPage`), validados por spec (14/14) e visualmente em 1440×900 e 390×844. Veja `docs/ACTIVE_CONTEXT.md` §178.

### TOUR-01 — Tour recipe-workshop no ambiente alvo

- **Estado da execução:** Concluído: guia servido por `localhost:3000/api/v1/tutorials/recipe-workshop?locale=pt-BR`, auto-start e reinício local em `/settings` validados ao vivo
- **Próxima entrega / dependência concreta:** QA visual em Playwright confirmou resposta HTTP 200 da API local, avanço até conclusão do tour em `/recipes/items/9601` e confirmação de reinício em `/settings`. Veja `docs/ACTIVE_CONTEXT.md` §177–178.

### QA-01 — Fluxos privados, teclado, mobile e casos extremos

- **Estado da execução:** Concluído em sessão local autenticada (`1440×900` e `390×844`) sem overflow horizontal; validação OCR independente segue em DATA-03
- **Próxima entrega / dependência concreta:** `docs/research/authenticated-workflows-ui-review-2026-10-18.md`. `/settings`, `/storage`, `/scans`, `/family` (`Personagens`, `Equipamentos`, `Família e benefícios`), `/recommendations`, `/shopping`, `/plans` e `/roadmap` validados com sessão Google ativa sem alterar dados reais da conta. Veja `docs/ACTIVE_CONTEXT.md` §178.

### PERF-01 — Bundle inicial abaixo do aviso de 500 kB

- **Estado da execução:** Concluída em 20/10 no build local de produção, com budgets preservados. [Medição e verificação](research/shell-bundle-deferral-review-2026-10-18.md#continuação-de-20102026--entrypoints-e-css-sem-consumidores).
- **Próxima entrega / dependência concreta:** Acompanhar o budget, cuja margem é pequena. Tutoriais e dados sintéticos saíram do grafo inicial; imports focados e quatro testes protegem a separação. Aviso do catálogo eliminado na limpeza seguinte; CSS da árvore ainda acima do aviso, junto de locale e CommonJS do OCR. Evidências no mesmo relatório; não alegar ganho de Core Web Vitals a partir de bytes.

### OPS-01 — Observabilidade local da aplicação e visão read-only do PostgreSQL

- **Estado da execução:** Implementado localmente: métricas Prometheus opt-in, dashboard Grafana local e Adminer com papel PostgreSQL somente leitura. Web `4200`, API monitorada `3000`, Grafana `3001`, Prometheus `9090` e Adminer `8082` estão presos a loopback.
- **Próxima entrega / dependência concreta:** Validado em banco local: 23 tabelas-base públicas, `item_versions=445580`, `reference_records=209177`; `SELECT` permitido e `INSERT`/`UPDATE` negados. Staging/produção, uptime externo, analytics e release continuam dependentes de configuração. Veja `docs/local-operations.md`, `docs/research/local-observability-db-viewer-design-2026-10-18.md` e ACTIVE_CONTEXT §171.

### LEGAL-01 — Licenças/assets e revisão legal

- **Estado da execução:** Dependência externa
- **Próxima entrega / dependência concreta:** Confirmar direitos e procedência antes de publicação comercial/publicidade; analytics somente com consentimento.

### PRODUCT-01 — Nome/domínio, monetização, ranking comunitário e novos mercados

- **Estado da execução:** Decisão de produto pendente
- **Próxima entrega / dependência concreta:** Definir escopo, fonte/privacidade e viabilidade recorrente. Não criar paywall, scraping de leaderboard ou novos mercados automaticamente.

### UIQ-01 — Logo e ícones do menu

- **Estado e evidência:** Implementado previamente em `0d5568a`: mesmo emblema do favicon, sem ícones repetidos. Preservado.

### UIQ-02 — Reduzir as quatro abas do Mercado

- **Estado e evidência:** Implementado: Mercado e Cotações pessoais; detalhes e simulação no fluxo do item, preservando busca/valores.

### UIQ-03 — Etapas expansíveis como visualização

- **Estado e evidência:** Implementado: sem formulários por expansão; ajustes e procs raros no detalhe compartilhado.

### UIQ-04 — Explicar o plano lateral e cenários

- **Estado e evidência:** Implementado: Produzir explícito, desmarcado significa comprar, produção indisponível sem método conhecido; Incluir venda estável e explicação de guarda. Cenários descrevem seu efeito.

### UIQ-05 — Margens comuns e animações de rota

- **Estado e evidência:** Alterações locais revisadas e concluídas: tokens de largura/padding, Home/Mercado/Receitas/Recomendações/Família/Roadmap alinhados; transições de entrada/saída, fallback e reduced-motion.

### UIQ-06 — Melhor cálculo e todos os ícones

- **Estado e evidência:** Modelos existentes mantidos e cobertos por specs de maestria, otimização, taxas/estoque/tempo; ícones principais da receita reportada carregados. Auditoria numérica externa com premissas pareadas e certificação de todo o catálogo permanecem pendentes; Cotações positivas sem estoque agora entram como referência; Lula fresca não possui mercado e sua equivalência culinária ainda requer validação (§185).

### UI-STD-01 — Inventário visual e pesquisa pública

- **Estado:** Todas as rotas registradas foram reconciliadas com owners, guardas específicas, `mvpRouteGuard`, redirects, SSR e specs. Pesquisa pública registrada para as famílias alteradas.
- **Próximo passo:** Revisitar a matriz se novas rotas ou mudanças de acesso/SSR forem adicionadas.

### UI-STD-02 — Uma página de Profissões e produção

- **Estado:** Implementado: rota canônica `/lifeskills`, abas `production` e `sessions`, cabeçalho/container/navegação únicos; `/recommendations` é alias com query/hash preservados. Produção só monta no navegador autenticado.
- **Próximo passo:** Login, logout, SSR, mesma instância de página e sessão em edição cobertos por testes; cinco viewports autenticados sem overflow.

### UI-STD-03 — Retorno de maestria e tempo de treino

- **Estado:** Implementado: painéis legados continuam disponíveis por URL com aviso e presets intactos; fora da navegação principal
- **Próximo passo:** Nenhuma remoção de dado; manter compatibilidade até decisão explícita de descontinuação.

### UI-STD-04 — Família

- **Estado:** Painéis exclusivos por query e campos em grade alinhada; inputs de 44 px, rótulos quebram sem truncar e painéis compartilhados têm mesma altura na linha desktop.
- **Próximo passo:** Validado em cinco resoluções com sessão; conta de automação sem personagem. Ficha preenchida permanece coberta por fixtures, sem criar dados reais.

### UI-STD-05 — Design system MMORPG

- **Estado:** Fundação aplicada às rotas públicas, privadas, editoriais, de planejamento e utilitárias; Família/Equipamento, scans, estoque e conta mantêm hierarquia funcional.
- **Próximo passo:** Conservar exceção de leitura legal (900 px), geometria de domínio e compatibilidade/revisão ao alterar componentes.

### UI-STD-06 — Densidade, estados e motion

- **Estado:** Hierarquia, campos/ações e estados de tela foram cobertos por contratos e specs nas famílias migradas; OCR, confirmação, salvamento e reduced-motion preservados.
- **Próximo passo:** Verificar tours/layout shift e estados com sessão real quando houver ambiente autenticado isolado; não alterar regras de negócio por estilo.

### UI-STD-07 — QA desktop-first

- **Estado:** Revisão de todos os 25 owners de rota, aliases e gates; navegação autenticada desktop; hub e painéis compartilhados de Família nos cinco tamanhos sem overflow.
- **Próximo passo:** Conteúdo suspenso do MVP e edição administrativa não certificados; documentar separadamente a amostra autenticada vazia e HTTP 429 da navegação em lote.

## 1. Produto, público e pesquisa

### `[~]` Ajudar o jogador a decidir o que produzir, comprar, coletar, vender ou fazer

- **Estado e escopo (base 18/10):** Mercado, receitas, perfil, armazém e recomendações existem. O Coach atual se concentra em produção; não há cálculo geral confiável de prata/h para atividades externas.
- **Evidência e lacuna:** `docs/product-vision.md`, `docs/archive/2026-10-20/feature-coverage.md`, `docs/research/implementation-gap-matrix.md`. Fechar lacunas de dados/modelos antes de prometer comparações completas.
- **Origem:** Resumo do projeto; Análise consolidada; Checklist plataforma web; Analisar respostas do formulário

### `[~]` Pesquisa da comunidade e necessidades de Life Skills

- **Estado e escopo (base 18/10):** Pesquisa em português/reais foi publicada e analisada; 31 respostas são exploratórias, não representam estatisticamente toda a comunidade. Sinais registrados: calculadora de custo/lucro (20), mapa de coleta (18), clareza de receitas (17), retorno/hora (10).
- **Evidência e lacuna:** `docs/product-research.md`. Não converter preferência declarada em demanda representativa; decisões de escopo continuam com o roadmap.
- **Origem:** Analisar respostas do formulário; Melhorar prompt de UI UX

### `[!]` Modelo gratuito/pago, preço mensal e monetização

- **Estado e escopo (base 18/10):** Foram perguntados interesse em recursos gratuitos/pagos e preço mensal. A visão do produto mantém consultas/ferramentas principais gratuitas; receita/assinatura não está definida.
- **Evidência e lacuna:** `docs/product-vision.md`, `docs/product-research.md`. Decisão comercial pendente; não implementar paywall por inferência.
- **Origem:** Analisar respostas do formulário; Checklist plataforma web

### `[!]` Nome final e domínio

- **Estado e escopo (base 18/10):** “Black Market” continua nome de trabalho e descreve o mercado do BDO, mas o usuário apontou associação com “mercado negro” e dificuldade de domínio. O aviso de independência foi alinhado às menções públicas; isso não decide nome nem domínio.
- **Evidência e lacuna:** Nenhuma decisão de marca/domínio foi registrada. Não renomear app, pacotes ou docs sem decisão do usuário.
- **Origem:** Preparar prompt completo para Antigravity; resumo do projeto

## 2. Catálogo, receitas e fontes de dados

### `[~]` Catálogo de itens, nomes, ícones, categorias e variantes

- **Estado e escopo (20/10):** Catálogo versionado, ícones, nomes e preços de NPC preservados. A inferência universal de preço fresco a partir de DRY continua desativada. Variantes revisadas de Culinária unitária usam Gobião/Calamar/Marisco desidratados com SKU real, preservando a fresca e a escolha por URL; grafo e ranking compartilham essas composições. A tabela geral de proporções e os ícones #9738/#9740 continuam pendentes; não extrapolar por nome, grade ou rendimento de desidratação.
- **Evidência e lacuna:** `docs/research/catalog-corrections-competitive-review-2026-10-16.md`, `docs/research/fish-price-equivalence-review-2026-10-16.md`, `apps/api/src/catalog/recipe-market-equivalents.ts`, `apps/api/src/catalog/npc-purchase-price.ts`. Revalidar com extração pós-patch; importar equivalências por ID e versão ou validar no cliente SA/PT; localizar fonte oficial dos dois ícones e verificar vendedores/preços.
- **Origem:** Implementar árvore de crafting interativa; Identificar tecnologias e APIs; Refinar prompt de melhorias BDO; pedidos de catálogo (16/10/2026)

### `[~]` Receitas atualizadas e processo de atualização

- **Estado e escopo (base 18/10):** Pipeline documentado e revisão da extração SA/PT de 10/10 com zero divergências estruturais/API e zero diferenças de quantidade nas relações comparáveis. Em 18/10 foi corrigida a listagem da página 4: o item 9711, “Comida Retirada”, tinha descrição de subproduto aleatório, mas metadado estrutural ausente e era contado como receita. O item segue no catálogo; saídas aleatórias não aparecem como receitas diretamente fabricáveis. A extração ainda não confirma o patch atual e outras relações/probabilidades continuam limitadas por fonte.
- **Evidência e lacuna:** `docs/recipe-catalog-update.md`, `docs/recipe-counts.md`, `docs/recipe-review-2026-10-10.md`, `docs/tiers-and-regional-recipes.md`, `docs/research/recipe-byproduct-listing-review-2026-10-18.md`, `apps/api/src/catalog/catalog.service.ts` e seus testes. Atualizar extração com taxonomia estruturada de subprodutos e revalidar fórmulas antes de publicar dados novos.
- **Origem:** Implementar árvore de crafting interativa; prompt Antigravity; correção de receitas (18/10/2026)

### `[~]` Recipe Explorer e árvore interativa de crafting

- **Estado e escopo (base 18/10):** Catálogo, ficha e árvore clicável com expansão de ramificações, navegação/zoom e visão de materiais estão implementados. A cobertura dos métodos de obtenção e spots varia conforme a fonte.
- **Evidência e lacuna:** `docs/recipe-explorer.md`, `docs/recipe-review-2026-10-10.md`, `docs/research/useful-links.md`. Completar ligações verificáveis a coleta, abate, grind e Life Skills sem transformar lacunas em fatos.
- **Origem:** Implementar árvore de crafting interativa; Melhore meu prompt Mock

### `[x]` Fontes úteis organizadas por funcionalidade

- **Estado e escopo (base 18/10):** 21 links foram organizados como referências para receitas, armazém, coleta, mapa, mercado, workers, equipamento e guias.
- **Evidência e lacuna:** `docs/research/useful-links.md`. Revalidar por região, idioma, patch, data e licença antes de usar como dado operacional.
- **Origem:** Documentar fontes úteis por função

### `[~]` Pesquisa de BDO Workshop, BDO Codex, BDOLytics e Garmoth

- **Estado e escopo (base 18/10):** Auditoria transversal de 16/10 executada após refinar o prompt dos cinco chats: quatro fontes públicas consultadas, com acesso/indexação/limites separados; nenhum benchmark matemático pareado entre concorrentes pôde ser concluído. Pesquisas anteriores continuam históricas.
- **Evidência e lacuna:** Relatório integral em docs/research/full-product-ui-calculation-performance-audit-2026-10-16.md; evidência estruturada em docs/research/evidence/full-product-audit-2026-10-16.json.
- **Origem:** Todos os chats de produto; política de pesquisa aprovada em AGENTS.md; novo pedido Codex (16/10/2026)

### `[!]` API oficial ou leitura autorizada de dados da conta/armazém

- **Estado e escopo (base 18/10):** Foi proposta integração opcional, somente leitura e autorizada pelo jogador. Não há API oficial de armazém pessoal confirmada nem acesso disponível implementado.
- **Evidência e lacuna:** `docs/storage-import-strategy.md`, `docs/production-and-accounts.md`. A proposta de contato à Pearl Abyss foi redigida, mas não deve ser considerada enviada ou aprovada; não acessar endpoints privados, memória ou credenciais do jogo.
- **Origem:** Draft Pearl Abyss proposal email; Documentar fontes úteis por função

### `[~]` Licença, privacidade e procedência de dados/assets

- **Estado e escopo (base 18/10):** Políticas e avisos de independência estão publicados no site, shell, SEO e material para crawlers; isso não concede direitos. Licenças de extração e assets ainda restringem publicação/monetização e exigem revisão humana.
- **Evidência e lacuna:** `docs/legal-pages.md`, `docs/privacy-inventory.md`, `docs/research/market-source-policy.md`, `docs/research/master-bdo-knowledge-base.md`. Confirmar direitos antes de uso comercial/publicidade.
- **Origem:** Refinar prompt de melhorias BDO; proposta à Pearl Abyss; auditorias de dados

## 3. Mercado

### `[x]` Market Board: categorias, subcategorias, filtros e busca

- **Estado e escopo (base 18/10):** Painel lateral expansível, busca/filtros, limpar filtros e estados de seleção estão implementados. A interface aceita consulta além de materiais de receita.
- **Evidência e lacuna:** `docs/ACTIVE_CONTEXT.md` §§130, 135; `apps/web/src/app/features/market/market-board.*`. Manter categorias úteis acessíveis e evitar que resultados não relacionados a Life Skills dominem a ordenação inicial.
- **Origem:** Refinar prompt de melhorias BDO; pedidos de melhoria da tela de Mercado

### `[x]` Paginação, tamanho da página e loading estável

- **Estado e escopo (base 18/10):** Paginação e itens por página ficam acima da tabela; skeleton no primeiro carregamento; dados existentes são preservados durante atualização. O alinhamento do seletor/cabeçalho foi corrigido.
- **Evidência e lacuna:** `docs/ACTIVE_CONTEXT.md` §§130, 135. A revisão registrada em viewport estreita e teclado não encontrou overflow/falha de foco.
- **Origem:** Melhorias na tela de mercado; corrigir UI do mercado

### `[~]` Preço de compra/venda, taxa, bruto/líquido e ponto de equilíbrio

- **Estado e escopo (base 18/10):** Em 16/10, Mercado recebeu descrições que esclarecem suas quatro áreas, a estimativa líquida, origem/região/idade e que contador de negociações não é unidades vendidas; atalhos ligam detalhe, receitas e Oficina. Simulador e cotações pessoais foram preservados, sem apagar o histórico do workspace. Falta consulta confiável/fresca quando o upstream retorna erro; valores continuam estimativas.
- **Evidência e lacuna:** `apps/web/src/app/features/market/market-page.html/.ts`, `docs/research/crafting-market-flow-competitive-review-2026-10-16.md`, `docs/ACTIVE_CONTEXT.md` §145. Próximo: revisar dados pareados e fechar fonte/origem/frescor; não remover dados locais sem migração/decisão.
- **Origem:** Refinar prompt BDO; pedidos de Mercado (16/10/2026)

### `[~]` Fonte automática, histórico, gráficos e volume/liquidez

- **Estado e escopo (base 18/10):** Chart.js e tabela textual revalidados no Mercado local para Balenos: 34 observações no período, preenchimento bronze e intervalo longo tracejado; staging mostrou corretamente histórico vazio no mesmo item. Cache e coletores não foram alterados. Ranking confiável de vendas/lucro SA continua dependente de fonte/unidade/cobertura e premissas válidas.
- **Evidência e lacuna:** AUD-15/16; docs/research/full-product-ui-calculation-performance-audit-2026-10-16.md. Não reimplementar o gráfico como pendência; diferenças entre os bancos não são defeito de renderização.
- **Origem:** Pedido de gráfico preenchido (16/10/2026); competitor reviews

### `[~]` Cache e carga de cotações em receitas/recomendações

- **Estado e escopo (base 18/10):** Cache e proteções contra fan-out foram adicionados. Preço máximo ausente ou HTTP 429/503 pode deixar cenários incompletos; não apresentar lucro/h definitivo sem dados necessários.
- **Evidência e lacuna:** `docs/ACTIVE_CONTEXT.md` §112; `docs/research/workshop-calculator-implementation.md`; specs de mercado/receitas. Repetir profiling e fluxo com fonte estável, sem consultas individuais desnecessárias.
- **Origem:** Refinar prompt de melhorias BDO; validações de recomendações

### `[!]` Ordenar Explorar Receitas/mercado por lucro e vendas confiáveis

- **Estado e escopo (base 18/10):** Pedido reiterado em 16/10/2026: identificar consumíveis de Culinária/Alquimia com maior lucro atual e maior volume. Na consulta de 16/10, a página BDOLytics indexada usava região North America e snapshot de semanas atrás; Garmoth exibiu EU com campos agregados vazios; o histórico SA local não tem cobertura/unidade confirmada e `production-quotes` respondeu 503 pelo bloqueio do upstream. Não é possível declarar os vencedores atuais de SA com evidência disponível.
- **Evidência e lacuna:** `docs/archive/2026-10-20/implementation-queue.md`, `docs/market-item-review-2026-10-11.md`, `docs/research/market-source-policy.md`, `docs/research/cooking-alchemy-catalog-market-audit-2026-10-16.md`. Manter lucro líquido/hora e demanda em dimensões separadas, com região, timestamp, unidade/janela, cobertura e estados desconhecidos; usar somente uma fonte permitida e atual para ordenar.
- **Origem:** Refinar prompt de melhorias BDO; Auditoria do Coach; novo pedido Codex (16/10/2026)

## 4. Oficina, receitas e cálculo financeiro

### `[~]` Calculadora de receita: quantidade, materiais, produtos e subprodutos

- **Estado e escopo (base 18/10):** Refatoração entregue em 16/10: `/crafting` inicia em Planejar uma receita, seleciona item/fórmula/lote e abre a árvore; `/recipes` mantém descoberta/origens; modos Simulação manual e Minhas receitas seguem disponíveis. Consulta valida versão do catálogo e preços de Mercado usam cache da região ativa (5 min) com fallback nas cotações pessoais; não altera armazém salvo. Specs focadas e suíte Web passam; smoke local em 16/10 com API/DB ativos carregou Refeição de Balenos (#9601), insumos e cotação. Desktop completo ainda não foi auditado nesta rodada.
- **Evidência e lacuna:** `apps/web/src/app/features/crafting/crafting-page.ts/.html`, `apps/web/src/app/features/crafting/crafting-page.spec.ts`, `docs/research/crafting-market-flow-competitive-review-2026-10-16.md`, `docs/ACTIVE_CONTEXT.md` §145. Próximo: repetir com API/dados ativos em desktop, testar dados recentes e pareados, maestria/retornos e preservar estado local.
- **Origem:** Árvore de crafting; pedidos de Recipes/Crafting; refatoração de `/crafting` (16/10/2026)

### `[~]` Maestria atualiza produção, faturamento e lucro

- **Estado e escopo (base 18/10):** Regressões cobrem as três profissões; a reprodução local de Refeição de Balenos (#9601), 100 receitas, mudou de 276,7 unidades médias (a UI agora preserva 276,7)/8.024.300 bruto/6.780.533 líquido a 1.000 Culinária para 250/7.250.000/6.126.250 a 0. Quatro insumos sem estoque e sem máxima utilizável deixam custo/lucro pendentes; o relato original ainda precisa de entradas pareadas completas.
- **Evidência e lacuna:** `apps/web/src/app/shared/recipe-tree/recipe-tree.spec.ts`, `docs/research/recipe-mastery-model.md`, `docs/ACTIVE_CONTEXT.md` §134. Para fechar o relato, comparar receita, lote, maestrias antes/depois, estratégia, rendimento manual, cotações, bruto/líquido e totais.
- **Origem:** Relato de maestria na receita; BDO Workshop 9601; auditorias pareadas

### `[~]` Botão “melhor lucro possível” / combinação comprar-fazer-coletar

- **Estado e escopo (base 18/10):** O otimizador testa alternativas alcançáveis na cadeia selecionada e a correção preserva estimativas válidas de coleta mesmo quando a escolha padrão é produzir. A busca atual tem limite rígido de 10.000 estados; ao atingi-lo, não certifica o ótimo.
- **Evidência e lacuna:** `packages/calculators/src/production-planner.ts`, testes da árvore e `production-planner.spec.ts`, `docs/superpowers/plans/2026-10-10-recipe-production-optimizer.md`. Não cobre ótimo global do catálogo nem, em todos os casos, fórmulas alternativas para cada produto.
- **Origem:** Melhorias em Recipes; “melhor lucro possível”; Auditoria de alternativas de coleta

### `[~]` Custo econômico, dinheiro necessário e lucro/hora

- **Estado e escopo (base 18/10):** O smoke 9601 confirmou faturamento calculável: 8.024.300 × 84,5% = 6.780.533 (imposto 35%, Value Pack marcado); sem preço comprável para quatro de cinco materiais, custo, lucro líquido e prata/h permanecem pendentes.
- **Evidência e lacuna:** `docs/research/workshop-calculator-implementation.md`, `docs/calculators.md`. Exibir claramente premissas, limites e falta de dado; não chamar estimativa incompleta de lucro definitivo.
- **Origem:** BDO Workshop 9601; Coach; prompts de melhoria do cálculo

### `[~]` Comparação pareada com BDO Workshop

- **Estado e escopo (base 18/10):** Plano público Balenos Meal 9601 foi observado em quantidades/maestrias e documentado; são snapshots arredondados de interface, não prova da fórmula privada.
- **Evidência e lacuna:** `docs/research/competitor-market-crafting-audit-2026-10-14.md`, `docs/research/bdo-workshop-plan-1408-observations.md`. Repetir apenas com entradas, região, taxa, tempo, estoque e data pareados; não inferir endpoint privado.
- **Origem:** Pedido de engenharia reversa do BDO Workshop; tutorial de oficina

### `[x]` Testar todas as receitas/fórmulas candidatas de um produto

- **Estado e escopo (base 18/10):** Implementação autorizada em 16/10 após a auditoria: solver percorre alternativas da raiz e intermediários, inclusive substituições verificadas, uma fórmula por item, estoque/sobras compartilhados e compra/produção/coleta. Limite global de 10.000 estados; melhor encontrado separado de ótimo certificado. Prévia, aplicar/descartar e invalidação por snapshot implementados.
- **Evidência e lacuna:** `docs/research/audit-remediation-2026-10-16.md`; spec/plano recursivo de 16/10. Gates focados e oráculo independente de 300 grafos. Certificação depende de catálogo completo/versionado e premissas conhecidas; faltas não viram resultado conclusivo.
- **Origem:** Melhorias em Recipes; decisão do usuário e “Siga com a implementação” (16/10/2026)

### `[~]` Tour contextual `recipe-workshop`

- **Estado e escopo (base 18/10):** Tour de quatro passos (lote/maestria, resultado, estratégia, materiais/retornos) está no código. Migrações e seed idempotente foram exercitados num PostgreSQL `tmpfs` descartável; o endpoint retornou quatro passos. O banco local persistente continua sem seed.
- **Evidência e lacuna:** `packages/shared/src/tutorials.ts`, `apps/api/src/tutorials/tutorial-seed-content.ts`, `docs/ACTIVE_CONTEXT.md` §§134, 140. Não semear o volume persistente, staging ou produção sem autorização e alvo confirmado; a tela local existente ainda pode mostrar “Tutorial indisponível”.
- **Origem:** Pedido tutorial similar ao BDO Workshop; design do tour aprovado

## 5. Recomendações e atividades

### `[~]` “O que fazer?” / Coach de Atividades

- **Estado e escopo (20/10):** Ranking sincronizado ao personagem ativo, com alternativas por produto e profissões secundárias preservadas. Comparação contextual de venda independente da final e dos intermediários em todos os níveis, respeitando os mesmos recursos e mostrando pendências.
- **Evidência e lacuna:** [Ranking e cadeias](research/home-recommendations-competitive-review-2026-10-16.md), `docs/research/activity-coach-competitive-review.md` e `docs/research/implementation-gap-matrix.md`. Homologação da conta Google real e cobertura de dados continuam pendentes; não somar lucros independentes nem prometer ótimo global.
- **Origem:** Refinar prompt de melhorias BDO; Coach de Atividades; Analisar respostas do formulário

### `[x]` Usar sessões observadas do próprio jogador

- **Estado e escopo (base 18/10):** Comparação pessoal implementada: grupos por rota/profissão/maestria/modo, região isolada, tamanho da amostra, minutos e período; lucro total e prata/h ponderada pela duração. `/lifeskills` é pública desde 18/10; visitante usa o armazenamento local. Login continua necessário para sincronizar dados entre dispositivos.
- **Evidência e lacuna:** `apps/web/src/app/features/lifeskills/observed-session-comparison.ts`, `docs/research/observed-sessions-checklist-2026-10-16.md` e `docs/research/home-social-login-ui-review-2026-10-18.md`. Sem normalização por maestria/patch; QA visual autenticado permanece pendente.
- **Origem:** Visão de produto; pesquisa da comunidade; perfil de profissões

### `[~]` Comparar coleta, grind, pesca e caça em prata/h confiável

- **Estado e escopo (base 18/10):** Comparação das observações pessoais entregue nesta rodada; o modelo universal por profissão/local/patch permanece ausente. Sessões semelhantes são agrupadas sem misturar campos desconhecidos com zero/ativo.
- **Evidência e lacuna:** FEAT-01 e DATA-04 na fila abaixo. Falta dataset verificável para previsão/normalização, coleta comunitária e ranking geral; não converter a comparação pessoal em promessa de drops.
- **Origem:** Objetivo do produto; formulários; fontes Garmoth/BDOLytics/BDO Foundry

### `[~]` Recomendar plano executável e explicar por quê

- **Estado e escopo (base 18/10):** Planos, materiais faltantes, reserva de estoque e justificativa básica existem. Conclusão de plano não debita estoque fisicamente; recomendações dependem de dados presentes.
- **Evidência e lacuna:** `docs/archive/2026-10-20/feature-coverage.md`, `docs/roadmap.md`. Validar o caminho perfil→opção→plano→sessão e explicar preços/dados insuficientes.
- **Origem:** Análise consolidada; checklist plataforma web; Refinar prompt de melhorias BDO

### `[~]` Caso de Refeição de Valência e divergência com concorrentes

- **Estado e escopo (base 18/10):** Há uma comparação relatada com valores diferentes, mas falta pareamento suficiente de quantidade, região, maestria, taxa, tempo, receita, buffs e cotação.
- **Evidência e lacuna:** `docs/research/activity-coach-competitive-review.md`. Manter como investigação aberta; não ajustar fórmula a partir de um snapshot isolado.
- **Origem:** Auditoria do Coach; comparação BDOLytics

## 6. Perfil, autenticação e dados de teste

### `[~]` Personagem, família e preferências

- **Estado e escopo (base 18/10):** Código conferido em 16/10: PlayerPage/modelo têm prata/energia/tempo, onze maestrias, peso máximo, capacidade de inventário, níveis familiares, pets/montarias, trajes de pérola e complementos. Há 15 posições de gear. A antiga indicação de campos periféricos não verificados não deve gerar reimplementação.
- **Evidência e lacuna:** `apps/web/src/app/features/player/player-page.{ts,html}`, `packages/calculators/src/personal.ts`, `docs/research/feature-continuation-2026-10-16.md`. Dados continuam informados/confirmados; efeitos de combinações e leitura OCR completa não são certificados pela existência dos campos.
- **Origem:** Perfil/mock/OCR; reconciliação de funcionalidades (16/10/2026)

### `[~]` Equipamentos, AP/DP e comparação de upgrades

- **Estado e escopo (base 18/10):** Redesign de 16/10 implementado: órbita com 17 slots tradicionais e ferramenta/traje em destaque, seleção/edição e ficha de descrição contextual. Layout e leitura entregues; cálculo/comparação de upgrades permanece parcial. Dados PA/PD continuam informados; sem agregação de bônus ou novo algoritmo de upgrade.
- **Evidência e lacuna:** `docs/research/gear-lifeskill-layout-2026-10-16.md`; capturas e links fornecidos pelo usuário. Pedra alquímica/tomo opcionais, backups/presets compatíveis, descrição segura, revisão independente e QA visual desktop/390/320 px em prévia sintética; catálogo público real conferido. Ver gates finais em ACTIVE_CONTEXT §160. QA da sessão autenticada permanece pendente.
- **Origem:** Importação de gear; prompts de perfil mock; pedido de layout/descrição e foco Life Skills (16/10/2026)

### `[~]` Login Google e Steam

- **Estado e escopo (base 18/10):** Firebase local/staging configurados e revalidados em 16/10: readiness com banco disponível, enabled/googleEnabled/steamEnabled=true e ambos os smokes passaram. Login/consentimento interativo, sessão, sync e retorno autenticado continuam não verificados. Falha transitória agora tem erro recuperável/retry, sem ser apresentada como configuração ausente.
- **Evidência e lacuna:** AUD-07/13; docs/research/full-product-ui-calculation-performance-audit-2026-10-16.md. Não recriar credenciais. Validar com o titular e conta de teste antes de seed ou de marcar sessão pronta.
- **Origem:** Pedido de login Google/Steam local e staging para teste (16/10/2026)

### `[x]` Mostrar áreas autenticadas no menu e encaminhar visitantes ao login

- **Estado e escopo (base 18/10):** Modal contextual implementado, com blur, scroll lock, cancelamento e retorno de foco; destino interno validado em clique e acesso direto. Settings público compõe conta e backup local; /account mantém query/fragment no redirect. Assets oficiais Google/Steam e erro/retry.
- **Evidência e lacuna:** AUD-01/04/05/06/07; `docs/research/audit-remediation-2026-10-16.md`. 61 testes focados e QA desktop/mobile como visitante; login real segue na linha específica.
- **Origem:** Pedido de login contextual e “Siga com a implementação” (16/10/2026)

### `[~]` Demo local e personagem/armazém de teste

- **Estado e escopo (base 18/10):** `/demo` cria dados sintéticos em memória/sessão para testar a UI. Não equivale a persistência real. Há CLI de seed protegido para staging, mas não foi executado.
- **Evidência e lacuna:** `docs/ACTIVE_CONTEXT.md` §134, `apps/api/src/workspace/test-workspace-seeder.ts`. Seed requer ambiente staging, Firebase e UID allowlisted; confirmar destino antes de gravar.
- **Origem:** Personagem mock; seed local/staging; pedido de testar rotas autenticadas

### `[!]` Sincronizar e recuperar dados em nuvem

- **Estado e escopo (base 18/10):** Backup local funciona sem login, inclusive exportação do original corrupto, com QA em 16/10; sync remoto real segue sem certificação; configuração de R2 permanece pendente. Login social está configurado em local/staging, mas ainda falta validar sessão interativa.
- **Evidência e lacuna:** `docs/backup-recovery.md`, `docs/staging-local.md`, `docs/archive/2026-10-20/ANTIGRAVITY_HANDOFF.md`. Configurar somente ambiente dedicado, com cifragem, restore validado e retenção definida.
- **Origem:** Custo de infraestrutura; Login Google/Steam; staging

## 7. Armazém, inventário e OCR

### `[~]` Armazéns por cidade/local, inventário e quantidade

- **Estado e escopo (base 18/10):** Lista detalhada é padrão e identifica quantidade e destino; edição fica no item; remoção pede confirmação e pode ser desfeita. Grade opcional e importação CSV continuam disponíveis. Modelo ainda não representa todas as particularidades de pilhas/vínculos do jogo.
- **Evidência e lacuna:** `docs/research/authenticated-workflows-ui-review-2026-10-18.md`, `stock-page.spec.ts` (11/11 focados). Repetir QA autenticado; validar fluxo manual/CSV, atualizações parciais e preservação de itens ausentes.
- **Origem:** UI de Armazém; BDO Workshop Storage Tracker; prompts de importação

### `[~]` OCR de até oito imagens em lote

- **Estado e escopo (base 18/10):** Processamento/revisão de capturas e suporte a lotes/grades está no código; texto/quantidades e candidatos de item são preenchidos quando reconhecidos. Não anunciar leitura automática perfeita.
- **Evidência e lacuna:** `docs/ocr-validation.md`, `docs/research/real-ocr-calibration.md`, `docs/print-import-tutorial.md`. Verificar cada tela, sobreposição e lote no fluxo atual.
- **Origem:** Organizar imagens para treinar OCR; Melhore meu prompt Mock

### `[~]` Reconhecer estoque/inventário e corrigir itens/quantidades

- **Estado e escopo (base 18/10):** Ícones são comparados com catálogo e há correção manual; quantidades abreviadas, grades e itens unitários têm heurísticas calibradas. Confiança geral ainda não foi medida em avaliação independente.
- **Evidência e lacuna:** `docs/ocr-validation.md`, `docs/storage-import-strategy.md`. Manter candidatos/dúvidas visíveis e revisão humana; ícones de UI devem respeitar limite visual de 48×48 pedido.
- **Origem:** OCR; UI de importação; prompt Mock

### `[~]` OCR de personagem, maestria, peso e gear

- **Estado e escopo (base 18/10):** Há fluxos e campos para scans de perfil, maestrias, peso e equipamentos com revisão. A leitura individual de gear, junção de várias telas e validade por patch permanecem limitadas.
- **Evidência e lacuna:** `docs/ocr-validation.md`, `docs/research/real-ocr-calibration.md`, `docs/ACTIVE_CONTEXT.md` §§128, 134. Expandir corpus independente, não reutilizar só imagens de calibração.
- **Origem:** Organizar imagens para treinar OCR; importação de gear/perfil

### `[!]` Medir acurácia real e garantir segurança ao salvar

- **Estado e escopo (base 18/10):** Corpus anotado conhecido tem 13 capturas/29 rótulos, todos de calibração; o split independente de avaliação está vazio. A revisão e confirmação continuam obrigatórias antes de persistir.
- **Evidência e lacuna:** `docs/ocr-validation.md`, planos `docs/superpowers/plans/2026-10-10-bdo-ocr-*`. Obter imagens autorizadas de participantes/sessões independentes e medir erro por campo, duplicação, tempo de correção e confiança.
- **Origem:** Organizar imagens para treinar OCR; pesquisa e calibração OCR

### `[~]` Salvar lote ao armazém sem revisar cada slot

- **Estado e escopo (base 18/10):** Confirmação em lote com revisão seletiva, conflitos de sobreposição e preservação dos itens ausentes já existem. Continuação de 16/10 adiciona Desfazer última importação em memória na tela: restaura estoque/gear/campos e histórico, preserva edições alheias e bloqueia conflitos/reservas.
- **Evidência e lacuna:** `docs/research/feature-continuation-2026-10-16.md`, `docs/storage-import-strategy.md`. 42 testes focados e revisão independente; sair/reload encerra a opção. OCR independente, alinhamento automático de scroll e coordenação entre abas/dispositivos continuam fora desta entrega.
- **Origem:** Pesquisa/OCR; pedido de verificar features e continuar a implementação (16/10/2026)

## 8. Outras ferramentas de Life Skills e calculadoras

### `[~]` Aprimoramento, failstack, Caphras e Cron Stones

- **Estado e escopo (base 18/10):** Calculadoras e tabelas/referências existem com entradas explícitas, horizonte e probabilidades onde suportados. Não modelam automaticamente todas as regras de downgrade, destruição e chances do jogo.
- **Evidência e lacuna:** `docs/calculators.md`, `docs/archive/2026-10-20/feature-coverage.md`, `docs/research/useful-links.md`. Revalidar regras por patch; não inventar curva de failstack.
- **Origem:** Fontes úteis por função; checklist plataforma web

### `[~]` Nós, workers, império e contribuição/CP

- **Estado e escopo (base 18/10):** Rotas, trabalhadores/tarefas, custo/alojamento, CP compartilhado e comparação manual existem. Workload, habilidades, distância, drops e melhor alocação global não são calculados de forma completa.
- **Evidência e lacuna:** `docs/worker-empire.md`, `docs/research/garmoth-workerman-arsha.md`. Completar somente com dados de região/patch e critérios de retorno medidos.
- **Origem:** Fontes úteis por função; ferramentas Workerman/BDOWorker

### `[~]` XP e progresso de profissões, buffs/cristais e outros planejadores

- **Estado e escopo (base 18/10):** Sessões observadas e algumas referências/calculadoras existem; timers/bibliotecas são em parte manuais. Curvas universais de XP, breeding/cavalos, caps e efeitos combinados não estão completos.
- **Evidência e lacuna:** `docs/archive/2026-10-20/feature-coverage.md`, `docs/calculators.md`, `docs/research/useful-links.md`. Listar cada calculadora existente antes de adicionar outra e indicar fonte/unidade.
- **Origem:** Fontes úteis por função; pesquisa e prompts de funcionalidades

### `[!]` Mapa de coleta, grind spots e comparação de atividades

- **Estado e escopo (base 18/10):** Aparece nas respostas da comunidade, no fluxo de árvore de receitas e na visão do produto. Não há conjunto de dados completo e validado para retorno/hora comparável em todos os spots.
- **Evidência e lacuna:** `docs/archive/2026-10-20/implementation-queue.md` itens 9–10, `docs/product-research.md`. Definir observação, amostra, patch, gear, buffs, duração e proveniência antes de abrir ranking.
- **Origem:** Analisar respostas do formulário; árvore interativa; Garmoth/BDOLytics

## 9. Navegação, tutorial, UI/UX e acessibilidade

### `[x]` Home e Roadmap em ordem global dinâmica

- **Estado e escopo (base 18/10):** Busca rápida de item e acesso público a Profissões e rendimento foram movidos para o bloco inicial, antes dos focos. A busca omite categoria nesta entrada compacta; filtros completos continuam em Receitas. Estados de carregamento, erro, vazio e todos os focos do Roadmap foram preservados. QA visual Playwright validado em 1440×900 (`scrollWidth=1425`) e 390×844 (`scrollWidth=375`) sem overflow horizontal.
- **Evidência e lacuna:** `docs/research/home-social-login-ui-review-2026-10-18.md`; AUD-03 em `docs/research/audit-remediation-2026-10-16.md`; `docs/ACTIVE_CONTEXT.md` §177.
- **Origem:** Refactor da Home; foco de produto em Life Skills; trilha dinâmica do Roadmap

### `[x]` Biblioteca de tours guiados por tela

- **Estado e escopo (base 18/10):** Registro, API, editor administrativo e runtime Driver.js sob demanda/SSR seguro existem. Tours automáticos cobrem superfícies funcionais do MVP e esperam a rota, a aba, a autenticação e os alvos reais ficarem prontos. Não há launcher por página; Configurações permite reiniciar o progresso local com confirmação. Guia servido por `GET /api/v1/tutorials/recipe-workshop?locale=pt-BR` e reinício em `/settings` validados ao vivo.
- **Evidência e lacuna:** `docs/research/automated-onboarding-review-2026-10-18.md`, plano de 18/10 e `docs/ACTIVE_CONTEXT.md` §177. Fluxo autenticado humano continua vinculado a AUTH-01/QA-01.
- **Origem:** Rollout de onboarding aprovado; biblioteca e conteúdo de tutoriais versionados

### `[x]` Interface inspirada no BDO, desktop-first, mais simples e compacta

- **Estado e escopo (base 18/10):** Rollout preservado e padronizado com ícones de item BDO (`<app-item-icon>`, raridade e fallback de inicial) em todas as tabelas e listas restantes (`/recommendations`, `/shopping`, `/plans` e complementos de `/family`). QA desktop/mobile público e autenticado concluído em `1440×900` e `390×844` sem overflow.
- **Evidência e lacuna:** AUD-04/06/09/11/12/17/18; `docs/research/audit-remediation-2026-10-16.md`; commit `ec24a50` e `docs/ACTIVE_CONTEXT.md` §179. Tokens/hierarquia Roadmap preservados; não copiar timeline.
- **Origem:** Chats UI/UX; aprovação do rollout e implementação da auditoria (16/10/2026); padronização de ícones/abas (18/10/2026)

### `[x]` Ficha rápida do item na árvore visual

- **Estado e escopo (base 18/10):** O ícone abre uma ficha de jogo compacta, modeless e ancorada ao nó, com categoria, nome, ícone, peso e descrição. A ficha completa de origens e mercado continua disponível pela ação “Detalhes e origem”. QA visual ao vivo em `/recipes/items/9601` confirmou abertura sem abrir a bandeja inferior e fechamento com retorno de foco.
- **Evidência e lacuna:** `docs/research/recipe-item-quick-info-review-2026-10-18.md`; `docs/ACTIVE_CONTEXT.md` §177.
- **Origem:** Pedido de 18/10: reduzir e aproximar do jogo o detalhe de item na árvore visual

### `[x]` Melhor apresentação da aba “Etapas expansíveis”

- **Estado e escopo (base 18/10):** Cabeçalho de cada etapa em `RecipeBranch` agora exibe selo de método/decisão (`step-action-badge`: ex. `Culinária`, `Alquimia`, `Obter pronto`, `Escolher método`), quantidade necessária, estoque utilizado (`Estoque: X` quando `> 0`) e saldo (`No estoque` / `Faltam Y`), mantendo ajustes secundários recolhidos. Validado por spec e Playwright em 1440×900 e 390×844 sem overflow.
- **Evidência e lacuna:** `docs/research/recipe-item-quick-info-review-2026-10-18.md`; commit `d459a07` e `docs/ACTIVE_CONTEXT.md` §177.
- **Origem:** Pedido de 18/10: revisar a melhor visualização das etapas de receita

### `[x]` Menu lateral, atalhos e navegação entre telas

- **Estado e escopo (base 18/10):** Em 18/10, o modo MVP passou de 13 links no mesmo nível para seis ações centrais e dois grupos recolhidos. Life Skills permanece em destaque; rotas ativas continuam encontráveis e atalhos autenticados seguem visíveis antes do login. Validado em sessão pública e autenticada em `1440×900` e `390×844`.
- **Evidência e lacuna:** `docs/research/mvp-navigation-refactor-review-2026-10-18.md`; foco, teclado, expansão, reflow em `390×844` e navegação autenticada verificados (`docs/ACTIVE_CONTEXT.md` §§178–179).
- **Origem:** Solicitação de 18/10: unificar fluxo e reduzir abas/rotas

### `[x]` Menos scrolls/cliques, melhor hierarquia, cards e interações

- **Estado e escopo (base 18/10):** Removida a faixa intermediária redundante `.production-entry` em `/recipes` (que exigia clique extra para rolar até a oficina já visível logo abaixo) e eliminada a 3ª aba duplicada `Materiais consolidados` em `RecipeTree` (já presente permanentemente na coluna lateral `RecipeMaterialsSidebar`). Adicionados ícones BDO e links diretos em Recomendações, Compras, Planos e Família.
- **Evidência e lacuna:** `docs/product-redesign.md`, `docs/ACTIVE_CONTEXT.md` §§130, 135–136, 179; commit `ec24a50`. Validado em Playwright (`1440×900` e `390×844`) sem overflow horizontal.
- **Origem:** Chats “Melhorar prompt UI UX”, “Melhorar prompt de UI UX”, “Melhore meu prompt Mock”; revisão de abas/fluxo (18/10)

### `[x]` Fluxo simples com opções avançadas

- **Estado e escopo (base 18/10):** Na oficina de receitas, o jogador informa lote/maestria e obtém cálculo imediato com tempos padrão por método e coluna lateral consolidada, mantendo calibração manual e detalhes em seções expansíveis sob demanda. No Armazém e Scan, a lista detalhada e todos os slots vêm prontos por padrão com ações inline.
- **Evidência e lacuna:** `docs/product-redesign.md`, `docs/roadmap.md`, `docs/ACTIVE_CONTEXT.md` §§172, 177–179.
- **Origem:** Melhorar prompt de UI UX; Refinar prompt de melhorias BDO

### `[~]` Skeletons e prevenção de layout shift

- **Estado e escopo (base 18/10):** Skeletons existentes revalidados em Receitas: 25 placeholders, aria-busy/inert e preservação dos 25 cards após erro de rede simulado. A chegada da página seguinte mudou a grade de 938 para 982,39px; status reserva 28px vazio. Medição staging: CLS Home 0,1602–0,2127, Mercado 0,0812, Receitas 0,0586 na amostra local; sem INP de campo. Rotas pessoais continuam sem QA visual com sessão, embora login agora esteja configurado.
- **Evidência e lacuna:** AUD-03/11/13; docs/research/full-product-ui-calculation-performance-audit-2026-10-16.md. Manter nomes completos; alinhar reserva e chegada de texto sem alegar estabilidade de todas as telas.
- **Origem:** Pedido de 16/10: Receitas com skeleton e animações/transições suaves em todos os carregamentos

### `[~]` Acessibilidade, teclado, telas estreitas e movimento

- **Estado e escopo (base 18/10):** Há semântica/foco/reduced-motion e verificações pontuais (Roadmap e Mercado). A prioridade visual declarada é Desktop First, mas isso não elimina teclado ou acessibilidade.
- **Evidência e lacuna:** `docs/bdo-ui-validation.md`, `docs/ui-accessibility-audit.md`, `docs/seo-performance-accessibility.md`. Fazer auditoria transversal restante antes de declarar cobertura geral.
- **Origem:** UI/UX; Roadmap; revisão do Mercado

## 10. Segurança, operação e qualidade

### `[~]` Ambiente local (Web, API, PostgreSQL)

- **Estado e escopo (base 18/10):** Localhost restabelecido em 16/10 após confirmar ausência de listeners. Web HTTP200/Home renderizada e API /ready status=ok/database=up; pnpm build completo passou. Dev Web/API iniciados com Node24.21 por PATH do processo.
- **Evidência e lacuna:** `docs/ACTIVE_CONTEXT.md` §158. Confirmar health em cada retomada. Não alterar credenciais/CORS nem iniciar coletores por inferência; avisos de bundle não são falha de acesso.
- **Origem:** Continuar implementação Black Market

### `[~]` Build, bundle e CSS

- **Estado e escopo (base 18/10):** Angular final de 501,04 kB bruto; melhoria de navegação/SSR verificada separadamente.
- **Evidência e lacuna:** Budget preservado; PERF-01 continua parcial. ACTIVE_CONTEXT §186.
- **Origem:** Continuidade de 18/10/2026

### `[x]` Testes, lint e verificação integral

- **Estado e escopo (base 18/10):** `pnpm check`, `pnpm test` e `pnpm test:ssr` passaram. Suíte: 78 Calculators, 259 API, 776 Web e 78 scripts/OCR.
- **Evidência e lacuna:** Evidência atual em `docs/ACTIVE_CONTEXT.md` §177. E2E autenticado permanece pendente até sessão real OAuth (AUTH-01/QA-01).
- **Origem:** Onboarding automático (18/10/2026)

### `[~]` CI/CD, staging e custo de infraestrutura

- **Estado e escopo (base 18/10):** Run #60 de `origin/main` falhou em `pnpm format:check` em quatro documentos; o estado local passa. O workflow também revelou asserções SSR obsoletas: `/crafting` é rota pública e `/account` privada ativa; smoke alinhado. XLIFF regenerado e guard pós-commit passou. Smoke legal, `db:check`, Compose e scripts PowerShell passaram.
- **Evidência e lacuna:** `docs/ACTIVE_CONTEXT.md` §146; `.github/workflows/ci.yml`; `docs/deployment.md`, `docs/staging-local.md`, `docs/backup-recovery.md`, `docs/production-audit.md`. Aguardar CI sobre o HEAD local após envio dos commits; revisar se persistirem falhas externas.
- **Origem:** Estimar custo da infraestrutura CI e staging; auditoria CI (16/10/2026)

### `[~]` Segurança, privacidade, cookies e analytics

- **Estado e escopo (base 18/10):** Painel reorganizado após aprovação: armazenamento necessário sempre ativo, estatísticas opcionais com finalidade, estado da escolha e ações permitir/recusar/personalizar; revogação direta. Serviço externo permanece desligado sem configuração, sem SDK ou cookies novos. Configuração e revisão jurídica continuam pendentes.
- **Evidência e lacuna:** `docs/research/privacy-controls-ui-review-2026-10-18.md`, `docs/privacy-inventory.md`, `docs/analytics.md`, `docs/production-audit.md`. Validar domínio publicado, serviços/suboperadores, retenção e textos com o responsável antes de ativar analytics.
- **Origem:** CI/CD; login; auditorias de segurança

### `[~]` SEO, páginas públicas e preparação para lançamento

- **Estado e escopo (base 18/10):** SSR, metadata, sitemap, legal e health estão implementados; descrições, shell e páginas estáticas agora mostram a ressalva de não afiliação junto das menções ao jogo. A comparação das páginas públicas está em `docs/research/non-affiliation-disclosure-review-2026-10-18.md`. SSR em domínio público, uptime, alertas e métricas de campo não foram validados. Publicidade permanece desativada até resolver licença.
- **Evidência e lacuna:** `docs/seo-performance-accessibility.md`, `docs/legal-pages.md`, `docs/production-audit.md`. Executar auditoria de produção com rótulos PASSOU/FALHOU/NÃO VERIFICADO.
- **Origem:** Checklist plataforma web; stack de analytics; staging

### `[x]` Continuidade Codex↔Antigravity

- **Estado e escopo (base 18/10):** `AGENTS.md`, `ACTIVE_CONTEXT`, handoff, fila, roadmap e prompt reutilizável existem. O checklist mestre é o índice transversal de feature/status/origem e agora tem regra permanente para registrar novos pedidos, comentários que alterem requisitos e correções.
- **Evidência e lacuna:** Aplicar a seção “Regra permanente para novos pedidos”; substituir o resumo de `docs/ACTIVE_CONTEXT.md` ao fechar cada fatia, sem outro handoff; commits atômicos por entrega, sem misturar alterações locais alheias.
- **Origem:** Usar Antigravity e Codex; pedido de 16/10/2026 para não perder contexto
