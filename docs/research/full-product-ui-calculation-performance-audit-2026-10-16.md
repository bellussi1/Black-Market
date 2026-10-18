# Auditoria de produto, UI, cálculos e desempenho — Black Market BDO

**Data:** 16/10/2026 (America/Sao_Paulo). **Escopo:** investigação e documentação; nenhuma correção de aplicação.
**Base:** branch `main`, HEAD `81cea47415b82d22587e0a96f9920062c39b46ab`.
**Prompt executado:** [prompt refinado](full-product-audit-prompt-2026-10-16.md).
**Evidência estruturada:** [inventário, rotas, casos e medidas](evidence/full-product-audit-2026-10-16.json).

## 1. Resultado e decisões

A base funciona e os testes passaram, mas a experiência ainda tem lacunas de recuperação de dados, autenticação, interpretação econômica e estabilidade visual. Não foi identificado P0 na cobertura executada. Isso não certifica áreas autenticadas nem o produto inteiro: esta sessão usou um navegador isolado sem login.

Os dois P1 são: recuperar/exportar dados locais depende de autenticação; e o custo equivalente de peixe seco usa uma proporção não confirmada como entrada econômica. A Home também apresenta um defeito reproduzido de SSR: um aviso falso de recuperação desaparece após hidratação e desloca o conteúdo 67 px. Três repetições em staging registraram CLS acumulado de 0,1602 / 0,2127 / 0,2127.

Requisitos novos confirmados pelo usuário: login em modal com overlay/blur e retorno ao destino; botões sociais com marcas corretas; `/settings` como configurações da conta. Eles ainda não estão implementados. `/settings` já pertence a Dados e backup, portanto a mudança exige composição de responsabilidades e compatibilidade, não apenas renomear `/account`.

Não voltar a implementar Chart.js, skeletons ou cache de rotas como se estivessem ausentes. O gráfico local foi visto com 34 observações e possui uma tabela textual. A paginação de Receitas usa 25 skeletons, mantém dados durante a carga e preserva-os após erro. Os problemas restantes são específicos, descritos abaixo.

## 2. Método, ambiente e cobertura

### Continuidade e fontes locais

Foram lidos os cinco chats referenciados por `read_thread`, o índice de contexto e a nota do projeto. O inventário inicial encontrou **143 arquivos em docs, 138 Markdown e cinco anexos/outros formatos**, incluindo o prompt recém-criado, antes deste relatório. O JSON de evidências preserva a lista e os tamanhos daquele instante; arquivos acrescentados depois não entram nessa contagem.

A inspeção documental priorizou AGENTS, ACTIVE_CONTEXT (incluindo §§149–154), ANTIGRAVITY_HANDOFF, checklist, roadmap, fila, estado de implementação, redesenho, arquitetura, cálculos, cobertura, staging, OCR e auditorias por área. Também foram examinadas as specs de autenticação, Home/Roadmap, Coach, tutorial, rollout visual e otimizador recursivo. O inventário não equivale à leitura integral de todos os parágrafos históricos ou anexos binários. Arquivos de pesquisa e snapshots antigos foram confrontados com código e runtime antes de sustentar um achado.

Skills usadas: Superpowers para orientação, investigação de causas e verificação; `ui-design`, agente de revisão visual e `bdo-ui-design` para os critérios do projeto; referências Angular/Spartan para a composição existente; revisão de animações e Playwright para movimento e navegação. A skill de planejamento foi consultada, mas não se criou plano de implementação: a entrega autorizada é auditoria e as correções aguardam revisão.

### Ambiente real

- Web de desenvolvimento: `http://localhost:4200`; API: `http://localhost:3000`; PostgreSQL local: 5432.
- Staging: `http://localhost:8081`, imagem observada `black-market:staging-20261016192740`; PostgreSQL isolado.
- Ambas as APIs responderam `/ready` com banco disponível e anunciaram Google/Steam ativos em `/api/v1/identity/config`. Apenas os indicadores booleanos foram registrados.
- Navegador Chromium controlado por Playwright CLI, sessão separada `bdo-audit`, visitante. Ego não estava disponível no PATH; o fallback não reutilizou o perfil pessoal.
- Desktop 1440×900; tela estreita 390×844. Sem throttling de CPU/rede. Medidas locais sofreram concorrência com builds/testes.
- Node do shell **24.13.0**, pnpm 10.28.1. O engine exige Node `^24.15.0`; ver AUD-20.
- A API dev ficou temporariamente indisponível durante a execução. Houve tentativa de iniciar watch, que falhou no startup; essa instância adicional foi encerrada. A porta 3000 voltou a responder em outro processo. Não se confirmou a causa da interrupção; os erros dessa janela não foram tratados como falha de credenciais.
- Não houve login interativo, impersonação, criação de conta, seed, migração persistente, geração/leitura de chaves Admin, alteração de Firebase, push ou deploy. A navegação pode causar os caches/snapshots normais das consultas do próprio produto.
- O plano preexistente não rastreado `docs/superpowers/plans/2026-10-16-roadmap-visual-phase-3.md` foi preservado.

### Matriz de rotas e estados

| Rota/fluxo                                                                    | Navegador e estados                                                                                            | Inspeção adicional                                                           | Limite                                                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/`                                                                           | Desktop/estreito; carregado, falha da API dev observada; SSR e três cargas repetidas em staging                | Template, foco do Roadmap, store, métricas                                   | Visitante; não exercitado com personagem/sessão real                          |
| `/roadmap`                                                                    | Desktop/estreito; carregado e erro durante indisponibilidade dev; staging carregado                            | Spec, ordenação e estilos                                                    | Lista atual; não editada nem testada com conteúdo extremo                     |
| `/market`                                                                     | Desktop/estreito; board, busca por nome/ID, detalhe de Balenos, histórico vazio em staging e preenchido local  | Cache, sort global/local, API, chart e tabela                                | Não se auditou cada categoria/variante nem comparação de preços entre regiões |
| `/recipes`                                                                    | Desktop/estreito; 25 cards; paginação, atraso de 600 ms e erro de rede simulados apenas na página do auditor   | Busy, inert, skeleton, geometria, filtros                                    | Sem benchmark de todo o catálogo                                              |
| `/recipes/items/9601`                                                         | Desktop/estreito; fórmula de Balenos, 100 receitas, maestrias padrão, resultado incompleto, painel de detalhes | Grafo, adapter, equivalência e solver                                        | Lucro permaneceu pendente; não foi forçada uma cotação inexistente            |
| `/crafting`                                                                   | Desktop/estreito; entrada da oficina e abas existentes                                                         | Template, reaproveitamento da árvore                                         | Sem salvar receita ou preset                                                  |
| `/account`                                                                    | Desktop/estreito; login Google/Steam visível; erro quando API caiu                                             | Retorno interno, callback e estados                                          | Sem consentimento/login real; sem sync de workspace                           |
| `/settings`, `/storage`, `/family`, `/recommendations`, `/plans`, `/shopping` | Desktop: redirecionamento para `/account?returnUrl=...`                                                        | Código das rotas, backup e contratos; specs existentes na suíte              | Conteúdo autenticado não inspecionado visualmente                             |
| `/scans`, `/scans/profile`                                                    | Clique no Scan e acesso direto ao perfil levam ao login                                                        | Orquestrador, critérios de revisão/quantidade e documentação OCR             | Não houve upload/aplicação de captura nem benchmark novo                      |
| `/gear`                                                                       | Redireciona para Família com `tab=equipment`, depois login                                                     | Rotas e escopo                                                               | Equipamento real não auditado                                                 |
| `/world`                                                                      | Retorna à Home por suspensão no MVP                                                                            | Escopo compartilhado                                                         | Não classificar como ferramenta removida ou erro de disponibilidade           |
| `/tutorials`                                                                  | 404                                                                                                            | Rotas: existem gestão e launchers por tela, não biblioteca pública nessa URL | Não significa que todos os tutoriais estejam ausentes                         |
| `/sobre/`                                                                     | Desktop carregado                                                                                              | Navegação e documento                                                        | Legal/contato não receberam revisão jurídica                                  |
| Admin de Roadmap/tutorials e demais utilitários suspensos                     | Código/docs e testes existentes                                                                                | Guards/escopo e especificações                                               | Sem ações administrativas ou liberação de rotas                               |

A inspeção visual incluiu capturas reais, não apenas leitura de DOM. Diretório: `output/playwright/full-audit-2026-10-16/`. As capturas e logs brutos são locais e ignorados pelo Git; o JSON consolidado em docs contém os resultados reproduzíveis.

## 3. Achados priorizados

P0: impede uso central ou compromete dados; P1: erro relevante ou bloqueio frequente; P2: atrito importante, requisito ausente ou inconsistência; P3: acabamento/oportunidade. Prioridade de um bloqueio de lançamento não equivale a defeito novo. Esforço P/M/G é tamanho relativo, sem promessa de prazo.

| ID     | Prioridade | Tipo                                  | Achado                                                                | Esforço / confiança                             |
| ------ | ---------- | ------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| AUD-01 | P1         | Bug de fluxo                          | Recuperação/exportação local depende de login                         | M / alta                                        |
| AUD-02 | P1         | Risco de cálculo confirmado no código | Equivalência culinária 1:1 não verificada entra no custo              | M / alta no caminho; ratio correto desconhecido |
| AUD-03 | P2         | Bug SSR e estabilidade                | Falso aviso local provoca deslocamento na Home                        | M / alta                                        |
| AUD-04 | P2         | Requisito funcional                   | Login ainda é página e não modal contextual                           | G / alta                                        |
| AUD-05 | P2         | Arquitetura de informação/copy        | Migração para Settings conflita com backup existente                  | M / alta                                        |
| AUD-06 | P2         | UI/identidade                         | Botões sociais sem marcas e com fonte genérica do produto             | M / alta                                        |
| AUD-07 | P2         | Estado de erro                        | Falha de rede é apresentada como login não configurado                | M / alta                                        |
| AUD-08 | P2         | Premissas econômicas                  | Tempos padrão são tratados como calibrados                            | M / alta no código                              |
| AUD-09 | P2         | Comunicação numérica                  | Quantidade exibida trunca a média usada no faturamento                | P / alta                                        |
| AUD-10 | P2         | Lacuna funcional conhecida            | Otimização não pesquisa fórmulas recursivas alternativas              | G / alta                                        |
| AUD-11 | P2         | Estabilidade visual                   | Skeleton da paginação não estabiliza a chegada dos novos textos       | M / alta na amostra                             |
| AUD-12 | P2         | Semântica/heading                     | Detalhe de receita fica sem H1 visível/acessível                      | P / alta                                        |
| AUD-13 | P2         | Validação incompleta                  | Login/sessão/retorno reais não certificados                           | M / alta quanto à lacuna                        |
| AUD-14 | P2         | Bloqueio de dados/validação           | OCR sem corpus real independente suficiente                           | G / alta                                        |
| AUD-15 | P2         | Bloqueio de dados                     | Ranking atual de lucro e demanda SA não sustentado por feed confiável | G / alta                                        |
| AUD-16 | P2         | Desempenho                            | Bundle inicial acima do aviso definido pelo projeto                   | M / alta                                        |
| AUD-17 | P3         | UX                                    | Explorar receitas e Calcular produção duplicam parte do caminho       | M / média                                       |
| AUD-18 | P3         | Texto e nome acessível                | Inglês interno e sufixo duplicado em controle de quantidade           | P / alta                                        |
| AUD-19 | P2         | Documentação                          | Estado principal e snapshots históricos contradizem o runtime         | P / alta                                        |
| AUD-20 | P2         | Ambiente                              | Node do shell abaixo do engine do monorepo                            | P / alta                                        |

### AUD-01 — Backup e recuperação local atrás da autenticação

**Fluxo/reprodução:** como visitante, seguir “Recuperar dados locais” ou abrir `/settings`. O navegador termina em `/account?returnUrl=%2Fsettings`; não há acesso ao botão de exportar no componente Settings. **Evidência:** `app.routes.ts:337`–342; `settings-page.html:23`–27; `workspace-store.ts:134`; banner em `workspace-layout.html:158`. A combinação de um backup local inválido com visitante foi inferida do código, sem corromper armazenamento para testá-la.

**Esperado/impacto:** a pessoa deve preservar o arquivo local mesmo sem sessão ou provedor disponível. Hoje a recuperação depende de um serviço externo que não é necessário para exportar o navegador. Não foi observada perda de dados. **Causa:** proteção da rota inteira inclui funções puramente locais. **Recomendação/aceite:** expor recuperação/exportação local por caminho apropriado e manter ações de nuvem autenticadas; comprovar backup preservado com sessão ausente/expirada e provedor fora do ar. Dependência: decisão de composição de Settings em AUD-05. Esforço M.

### AUD-02 — Equivalência de peixe seca sem regra validada

**Reprodução técnica:** `deriveRecipeMarketEquivalents` deriva pares DRY e atribui `quantityRatio: 1` a todos; `resolveRecipeMaterialPrice` multiplica o preço pelo ratio e o adapter insere o resultado no mapa econômico como preço de mercado. **Evidência:** `apps/api/src/catalog/recipe-market-equivalents.ts:59`; `recipe-market-equivalent-price.ts:46`; `recipe-production-adapter.ts:342`; apresentação de “1 un. ... por unidade” em `recipe-materials-sidebar.html`.

**Impacto/esperado:** uma relação de processamento DRY não comprova substituição culinária. O custo pode ficar incorreto sem que a incompletude da equivalência viaje com o preço. A pesquisa existente mostra evidência conflitante e não permite impor “2” a todos os peixes. **Recomendação/aceite:** carregar razão por ID/versão de fonte validada ou manter a equivalência não verificada fora de lucro conclusivo. Testar variantes e receitas aceitas pelo cliente SA/PT. Não alterar ratios apenas para coincidir com concorrentes. Dependência externa: dado de equivalência ou teste real do jogo. Esforço M; magnitude econômica por par não medida. Revalidação de pendência conhecida, não descoberta de uma regra nova.

### AUD-03 — Aviso falso no SSR e CLS da Home

**Reprodução:** GET de `/` e `/market` em 4200 e 8081 contém “Não foi possível ler seus dados locais”. O store tenta ler `localStorage` no constructor sem guarda de plataforma; a exceção do servidor recebe o mesmo texto que uma falha real no navegador. Após hidratação, a mensagem desaparece. **Evidência:** `workspace-store.ts:35`–47; `RegionPreferences` já distingue plataforma em `region-preferences.ts:64`; JSON runtime e capturas/fontes de shifts.

**Medida:** Home em staging, 1440×900, janela de 1,8 s, três repetições: 0,160238 / 0,212662 / 0,212662. A fonte principal foi `.content-frame`, y=139→72. Nas duas maiores, `.home-search` também mudou ao trocar a composição dos focos/skeleton. Isso identifica duas transições, não uma atribuição exclusiva de todo o CLS ao store.

**Esperado/recomendação:** SSR não diagnostica corrupção de um navegador que não pode ler. Restaurar dados somente no contexto apropriado e evitar que a hidratação altere indevidamente o banner; depois alinhar reserva dos focos com quantidade/altura reais. **Aceite:** GET não anuncia recuperação falsa; mesmas cargas sem salto de 67 px e com métricas registradas. Investigar banner real, fontes e foco vazio/múltiplo para não esconder problemas legítimos. Esforço M. Métricas são de laboratório local, não CWV de campo.

### AUD-04 — Modal de login ainda ausente

**Reprodução:** clicar Importar capturas na Home ou abrir uma rota pessoal diretamente leva à página Conta. **Evidência:** `auth.guard.ts:28`–36; links de Home em `dashboard-page.html:104`; matriz de rotas. **Esperado:** modal com overlay/blur, foco, Escape/fechamento, scroll do fundo controlado, destino preservado e retorno ao contexto ao cancelar.

**Causa/impacto:** o guard entrega UrlTree para Account; não existe orquestração de modal nesse fluxo. É lacuna frente ao novo pedido, não regressão do guard anterior. **Recomendação/aceite:** definir o serviço de intenção de login e o contexto seguro para entrada direta; testar link, URL digitada, reload, cancelamento, sessão expirada e retorno Google/Steam. Preservar `safeInternalReturnUrl`, sem expor conteúdo protegido. Dependências: AUD-05 e AUD-13. Esforço G.

### AUD-05 — Settings já existe e a comunicação de backup ficou obsoleta

**Evidência/reprodução:** `/settings` é Dados e backup, com guard; `/account` reúne login, provedores e sync. O template `settings-page.html:16`–17 ainda afirma que não há conta/sincronização, contradizendo a implementação configurada. **Impacto:** uma simples troca de path colidiria com backup e deixaria callbacks/links antigos inconsistentes.

**Recomendação/aceite:** compor configurações de conta e dados locais, explicando onde cada cópia fica; preservar schemas/backup e redirecionar links antigos com parâmetros relevantes. Inventariar cabeçalho, Home, guards, retorno permitido, callbacks Steam, smoke e SSR. Nenhuma dessas rotas foi alterada. Dependências: AUD-01/AUD-04. Esforço M; configuração existente não significa sync validado.

### AUD-06 — Botões sociais sem identidade dos provedores

**Reprodução:** abrir `/account` com ambos ativos. Os dois botões medem 44 px e usam Barlow Semi Condensed, mas não têm ícone/logo; são botões genéricos `btn` e `btn subtle`. **Evidência:** DOM de login e `account-page.html:60`–83.

**Esperado/recomendação:** padrão compartilhado de dimensões, alinhamento e estados, preservando as regras de cada marca. As [diretrizes Google](https://developers.google.com/identity/branding-guidelines) exigem tratamento específico para botão, marca e fonte; a [Steam](https://steamcommunity.com/dev) fornece botões para login OpenID. Padronizar o contêiner não significa substituir a marca por um ícone genérico ou obrigar o Google a usar Barlow. **Aceite:** ativos adequados, contraste/foco/loading/erro e igual destaque entre opções; registrar a revisão das marcas. Sem baixar/copiar assets nesta auditoria. Esforço M.

### AUD-07 — Falha da configuração remota vira “login não configurado”

**Reprodução observada:** durante `ERR_CONNECTION_REFUSED` em `identity/config`, Conta mostrou simultaneamente “login social ainda não está configurado” e “não foi possível consultar sua conta”. Os smokes antes/depois e o runtime posterior anunciaram os dois provedores ativos. **Evidência:** console da varredura desktop; `identity.service.ts`, `load()` termina marcando `ready=true` mesmo ao lançar erro, enquanto enabled permanece falso; `account-page.html:10` e ramo `!identity.enabled()`.

**Esperado/recomendação:** distinguir configuração desativada, consulta indisponível e carregamento. Permitir repetir a consulta mantendo o destino, sem instruir reconfiguração de credenciais já válidas. **Aceite:** falha de rede isolada produz estado recuperável e não declara ausência de configuração; ao recuperar a API, o login volta sem perder intenção. Esforço M; a causa da queda da API não foi atribuída ao produto.

### AUD-08 — Tempo padrão não deve representar calibração real

**Evidência:** `defaultRecipeMethodSeconds` (`recipe-production-adapter.ts:68`) fornece 1,2 s para Culinária/Alquimia normal e 6 s para outros métodos. `recipe-tree.ts:1206` injeta defaults em `effectiveMethodTimes`; `applyDefaultMethodTimes` também os persiste no estado ao otimizar. O adapter classifica uma estimativa variável com tempo presente como `calibrated` (`recipe-production-adapter.ts:172`–189), sem conservar se o tempo veio do usuário. A ajuda diz “Sem um tempo calibrado, o lucro por hora fica indisponível”.

**Observado:** visitante de Balenos recebeu maestria 1000 e 29,6 s estimados para 100 receitas, antes de informar tempo. Lucro permaneceu pendente por preços; não houve afirmação de lucro errado nesse caso. **Impacto/esperado:** defaults podem ser úteis e já fazem parte do fluxo aprovado, mas não comprovam equipamento/buffs/tempo do jogador. **Recomendação/aceite:** propagar origem padrão/informada/calibrada e mostrar a premissa junto à comparação; a explicação deve corresponder à regra que permite classificar lucro/hora. Não obrigar confirmação adicional de rendimento aprovado por esta auditoria. Esforço M.

### AUD-09 — Média de produção e faturamento com arredondamentos diferentes

**Reprodução:** Balenos, 100 receitas, Culinária 1000. A UI mostrou “Estimativa do produto: 276 unidades”, média arredondada 2,77 e bruto 8.024.300 a 29.000/un. Esse bruto corresponde a **276,7**, não 276 unidades. **Causa/evidência:** `recipe-tree.ts:1037`–1038 usa `Math.floor`; o motor conserva o rendimento esperado fracionário para a receita de venda. Captura `recipe-tree-desktop.png`.

**Esperado/recomendação:** mostrar quantidade média coerente, por exemplo 276,7 unidades esperadas, distinguindo de lote inteiro garantido. Não arredondar a matemática para mascarar a diferença visual. **Aceite:** quantidade exibida e faturamento se reconciliam nos rendimentos fracionários e lotes pequenos. Esforço P; não é evidência de erro no cálculo de taxas.

### AUD-10 — Otimizador recursivo permanece planejado

**Evidência:** `resolveRecipeProductionGraph` guarda um produtor por item (`recipe-production-graph.ts:30` e seleção em torno de 96); adapter fornece uma candidata raiz. O plano/spec de 16/10 aguardam revisão e não há implementação da busca entre fórmulas recursivas.

**Esperado:** comparar as fórmulas candidatas sob snapshot pareado, uma fórmula por intermediário, sem dividir demanda entre métodos. **Recomendação/aceite:** executar somente após revisão do plano, com oráculo exaustivo, cobertura/versionamento e distinção entre melhor encontrado e ótimo certificado ao atingir 10.000 estados. O solver existente já distingue incompletude e não deve ser substituído por uma heurística rotulada como ótima. Esforço G. Pendência conhecida, não erro demonstrado no ótimo do grafo atual.

### AUD-11 — Chegada da página seguinte altera altura apesar do skeleton

**Reprodução controlada:** `/recipes`, desktop, primeira→segunda página, atraso de 600 ms apenas na requisição do navegador do auditor. Grade antes/durante: 938 px; 25 placeholders, `aria-busy=true`, conteúdo anterior inert. Depois: 982,39 px. A diferença foi **44,39 px**, com novos textos. A faixa vazia de status reserva 28 px. **Evidência:** `chart-pagination.txt`, `recipes-page.html` na grade/pager; `recipes-page.scss` em `.refresh-status` e grid.

**Impacto/esperado:** preservar geometria durante loading funciona, mas não estabiliza toda a troca de conteúdo. **Recomendação/aceite:** testar reserva compatível com linhas variáveis sem cortar nomes nem fixar cards com texto escondido; manter posição/foco do pager e avaliar a faixa vazia. Medir transição para páginas com nomes longos e última página, não só primeiro skeleton. Não chamar os 44 px de CLS: esta interação não recebeu uma medida isolada de CLS. Esforço M.

### AUD-12 — Receita selecionada sem heading principal

**Reprodução:** abrir `/recipes/items/9601` e aguardar dados. O único H1 está no header com `[hidden]="!!item()"`; produto é H2. DOM confirmou zero H1 visível. **Evidência:** `recipes-page.html:2`–4; `recipe-tree.html` na identidade; `recipe-interactions.txt`.

**Esperado/recomendação:** um heading principal significativo para o item/planejamento ativo, com hierarquia consistente e sem título visual redundante. Ausência de H1 isoladamente não é uma declaração automática de falha WCAG, mas prejudica orientação e contraria o padrão das rotas. **Aceite:** leitura por headings identifica o produto como início da página em lista e detalhe. Esforço P.

### AUD-13 — Sessão real e retorno ainda sem validação

**Confirmado:** smokes local/staging passaram, provedores visíveis e APIs prontas. **Não verificado:** consentimento Google/Steam, sessão real, expiração, `identity/me`, workspace com token válido, retorno e sincronização entre dispositivos. A sessão isolada não concluiu autenticação nem acessou contas.

**Recomendação/aceite:** executar uma matriz com login humano por provedor/ambiente e contas de teste autorizadas; depois verificar isolamento, retorno, conflito de sync e saída. Documentar antes de marcar login/sync como pronto. Não é pedido para recriar chaves. Dependência: intervenção do titular e identidade de teste para seed, se desejado. Esforço M. Sem alegar falha de autenticação que não foi reproduzida.

### AUD-14 — OCR ainda sem prova independente suficiente

**Evidência:** critérios atuais em `scans-page.ts:470`–495 mantêm item/quantidade incertos fora da importação válida; quantidade estimada exige escolha. `docs/research/real-ocr-calibration.md` registra repetição do corpus: 33/90 rótulos visíveis corretos, 2/2 quantidades aceitas corretas e 90/90 slots enviados à revisão; diagnóstico de inventário 0/12. Esses resultados são históricos e não foram recalculados agora.

**Esperado/impacto:** calibração repetida e dados sintéticos não medem acurácia geral. **Recomendação/aceite:** sessão real independente autorizada, ground truth por ID/quantidade, split congelado e avaliação de cobertura, falsos aceites, revisão e tempo; incluir armazenamento, inventário, maestria/equipamento conforme o objetivo. Não reduzir revisão por confiança OCR nem presumir unidade na imagem sem evidência. Esforço G; conteúdo protegido não recebeu QA visual nesta sessão.

### AUD-15 — Lucro e demanda SA atuais precisam de dados adequados

**Evidência:** política de fonte em `market-source-policy.md`; UI separa contador de negociações de unidades/liquidez. Em staging Balenos não tinha histórico; local tinha 34 observações no período consultado. Um histórico parcial e a presença de estoque não bastam para ordenar consumíveis por vendas garantidas ou lucro realizável.

**Recomendação/aceite:** separar ranking econômico de demanda e exibir região, variante, idade, cobertura e unidade; obter fonte permitida e consistente antes da ingestão contínua. Comparação por lucro exige mesmas premissas, tempo, rendimento, estoque e taxas. Não preencher volume ausente com zero. Esforço G/dependência externa; a interface atual já sinaliza vários desses limites. Não há ranking “vencedor SA” calculável com as evidências desta sessão.

### AUD-16 — Bundle inicial 553,57 kB

**Medida:** build serial completo passou; Web inicial 553,57 kB bruto e 149,80 kB de transferência estimada pelo compilador, 53,57 kB acima do aviso de 500 kB. Locale pt-BR recai para pt; Tesseract/regenerator permanecem CommonJS no caminho lazy. **Impacto:** orçamento de manutenção não cumprido; isso não comprova LCP ruim em produção.

**Recomendação/aceite:** reduzir dependências iniciais a partir de stats reais, mantendo SSR e carregamento sob demanda de OCR/auth/gráfico; não elevar budget para encerrar o item. Repetir build e comparar bytes/caminhos. Warnings de locale/CommonJS não foram tratados como quebras funcionais. Esforço M.

### AUD-17 — Dois caminhos de oficina com descoberta parcialmente duplicada

**Evidência:** menu “Explorar receitas” → `/recipes`, título “Oficina de produção”; menu “Calcular produção” → `/crafting`, título “Planeje uma receita”; ambos selecionam produto/fórmula e reutilizam RecipeTree. A área manual/biblioteca de Crafting tem valor distinto. **Impacto:** para novo usuário os nomes não explicam claramente onde começa a descoberta e onde continua o mesmo cenário.

**Recomendação:** medir um fluxo de descoberta→produção e unificar rótulos/entrada do workbench; preservar receita manual, biblioteca, links antigos e estado. Não há evidência de analytics para matar uma tela. **Aceite:** usuário chega ao mesmo cenário sem repetir seleção nem perder escolhas; navegação distingue catálogo de planejamento. Esforço M, confiança média por ser oportunidade de UX.

### AUD-18 — Texto técnico e sufixo redundante

**Reprodução:** a receita mostra “(cooking maestria: 1000)” e o spinbutton tem nome acessível “Quantia de receitas receitas”. **Evidência:** `recipe-tree.ts:344`, template do controle e snapshot de receita.

**Recomendação/aceite:** traduzir o identificador interno via rótulo de profissão e separar label de unidade auxiliar na árvore acessível. Preservar unidade visual útil. Esforço P; sem alterar cálculo.

### AUD-19 — Snapshot inicial induz retomada errada

**Evidência:** abertura de ACTIVE_CONTEXT declara “Estado Atual Verificado: 10/10/2026”, branch develop e imagem antiga, embora HEAD atual esteja em main e §154 registre Firebase configurado. Outros documentos se identificam como snapshots históricos; Settings e algumas linhas de UI ainda falam em ausência de conta/configuração.

**Recomendação/aceite:** ponteiro destacado para o último handoff, com branch/HEAD/imagem/validações e limite histórico; checklist deve incorporar estes achados sem duplicar capacidades. Preservar histórico. Nesta auditoria o ponteiro/contexto e as linhas pertinentes do checklist foram reconciliados; relatórios históricos não foram reescritos como se tivessem sido atuais. Esforço P. A implementação de UI antiga continua pendente em AUD-05.

### AUD-20 — Node local não satisfaz o contrato

**Reprodução/evidência:** `node --version` retorna v24.13.0; `package.json` exige `^24.15.0`, e desenvolvimento documenta 24.21.0. Os checks executados neste shell continuam evidência real, mas foram feitos fora do intervalo declarado.

**Recomendação/aceite:** selecionar runtime suportado e repetir os gates no ambiente padronizado antes de integrar correções ou publicar. Não atribuir falhas nativas anteriores a essa diferença sem reprodução. Não foi trocado Node global nesta auditoria. Esforço P.

## 4. Cálculos e propriedades verificadas

Nove casos locais foram executados contra o pacote compilado, sem POST que altere dados. São verificações pontuais independentes da UI, além da suíte existente.

| Caso controlado                                                                      | Saída observada                                                                          | Interpretação                                            |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Preço 1000, quantidade 10, custo 2000, taxa 35%, sem VP                              | Bruto 10.000; líquido 6.500; lucro 4.500                                                 | Taxa aplicada ao total                                   |
| Mesmo caso com VP                                                                    | Líquido 8.450; lucro 6.450                                                               | Retenção 84,5%; não 95%                                  |
| Mercado quantidade zero                                                              | ZodError                                                                                 | Zero não gera divisão/resultado fictício                 |
| Mercado preço zero                                                                   | Líquido zero e prejuízo do custo                                                         | Zero válido difere de dado ausente                       |
| 10 crafts, yield 2,5; insumo 2/craft, 5 próprios a 100; extra 100; venda 1000; 2 min | 25 produtos; custo econômico 2.100; caixa 1.600; líquido 16.250; lucro 14.150; 424.500/h | Estoque diminui caixa, não elimina custo de oportunidade |
| Mesmo craft sem estoque                                                              | Custo econômico e lucro iguais; caixa 2.100                                              | Comparação de estoque coerente                           |
| Insumo sem preço                                                                     | ZodError                                                                                 | Ausência não vira custo zero                             |
| Venda a 1 no mesmo craft                                                             | Lucro -2.084; -62.520/h                                                                  | Prejuízo preservado                                      |
| Tempo zero                                                                           | ZodError                                                                                 | Não produz infinito por hora                             |

As retenções básicas têm apoio no [guia oficial SA do Mercado](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=47), consultado em 16/10: imposto base de 35% e 84,5% coletado com VP. Isso não confirma todos os bônus manuais, categorias especiais ou valores futuros.

No planner, custos/receitas monetárias usam inteiros, lucro/hora depende de duração positiva e pendências tornam o lucro inconclusivo. O teste Edania e outras regressões existentes passaram. Não se demonstrou erro na aritmética básica de taxas/custo de oportunidade. Permanecem separados: regra de yield/maestria, proporção de substituição, tempo e cotações de entrada.

A UI Balenos mostrou bruto 8.024.300 e líquido 5.215.795 sem VP, coerentes com retenção de 65%. Custo/lucro ficaram pendentes por quatro insumos/etapas. Isso é comportamento esperado diante de preços/dados insuficientes, não bug a “corrigir” preenchendo zeros.

## 5. Pesquisa competitiva atual

**Data de consulta:** 16/10/2026. Somente superfícies públicas e indexação; sem login, CAPTCHA, endpoint privado ou cópia de dados operacionais. URLs e resultados de acesso abaixo se referem a esta sessão. Evidência histórica dos demais relatórios não foi promovida a observação nova.

| Fonte/URL                                                                                                                                                                                   | Idioma/região e observação                                                                                       | Limites e utilidade                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/) / [Crafting Workshop](https://bdoworkshop.com/crafting-workshop)                                                                                   | Home EN declara calculadoras de crafting/mercado e scans; exige JS para ferramentas                              | Detalhe de crafting não acessível no leitor. Não foi verificado Buy all/Craft all/Best profit com entradas pareadas nesta sessão                                  |
| [Política Workshop](https://bdoworkshop.com/privacy-policy)                                                                                                                                 | EN, atualizada em 10/10/2026; descreve login social, dados no navegador/conta e tratamento de scans              | Declaração do operador, não teste de persistência. Inspira separar contexto anônimo e conta; Black Market não deve copiar a política de envio/retenção de imagens |
| [BDO Codex receitas](https://bdocodex.com/us/mrecipes/) / [Culinária](https://bdocodex.com/us/recipes/culinary/)                                                                            | EN/US na URL; catálogo com busca, paginação, ingredientes e produtos                                             | mrecipes acessível; Culinária direta restrita e indexação disponível. Não há cálculo econômico pareado obtido; região da URL não equivale a SA vigente            |
| [BDOLytics processing](https://bdolytics.com/en/NA/processing/market) / [Culinária](https://bdolytics.com/en/cooking) / [tax calculator](https://bdolytics.com/en/NA/market/tax-calculator) | EN; URLs NA redirecionam às rotas sem NA. Índice público mostra Recipe/Input/Silver per Hour/Price/Volume 14d/XP | Páginas atuais sem texto extraível; indexação de até meses atrás, não número atual. Região efetiva e parâmetros da calculadora não puderam ser controlados        |
| [Garmoth Mercado](https://garmoth.com/market) / [Checklist](https://garmoth.com/checklist)                                                                                                  | EN, Mercado mostrou EU; separa itens populares, tendências e variações                                           | Agregados vazios; superfície não forneceu algoritmo geral de cadeia. Não comparar zeros/vazios com SA nem concluir inexistência de ferramenta não encontrada      |

**Conclusões de fluxo:** descoberta pública e dados pessoais são responsabilidades separadas; catálogo relacional e planejamento econômico resolvem tarefas diferentes; demanda, estoque e rentabilidade precisam de escopos explícitos. A organização do Mercado Garmoth é observação da interface; o que ele usa internamente para ranking não foi estabelecido. A política Workshop não comprova algoritmo de OCR.

**Comparação matemática pareada:** não foi possível obter, nos quatro concorrentes, um mesmo cenário controlável de item/variante/SA/quantidade/maestria/tempo/taxas/preços/snapshot. Portanto **não há conclusão sobre equivalência de algoritmos ou vencedor atual**. Os nove casos locais verificam contratos do Black Market e não são benchmarks copiados dos concorrentes. Próxima comparação deve registrar a matriz completa e alterar uma variável por vez.

**Marcas sociais:** [Google Identity](https://developers.google.com/identity/branding-guidelines) e [Steam OpenID/Brand and Links](https://steamcommunity.com/dev) foram consultados como fontes primárias para AUD-06.

## 6. Desempenho, layout e movimento

Amostra de carga do staging, desktop 1440×900, browser já usado na sessão, sem throttling; janela após navegação de 1,8 s. LCP é a última entrada observada, não uma distribuição de campo. Builds/testes no mesmo computador podem afetar latência.

| Rota     | LCP observado | Soma de shifts sem input recente | Condição                                                  |
| -------- | ------------- | -------------------------------- | --------------------------------------------------------- |
| Home     | 176 ms        | 0,212662                         | Banner SSR e focos dinâmicos; repetição 0,160238–0,212662 |
| Roadmap  | 188 ms        | 0                                | Lista atual carregada                                     |
| Mercado  | 660 ms        | 0,081187                         | Board com dados, tutorial/categorias/ícones               |
| Receitas | 284 ms        | 0,058565                         | Lista inicial com 25 cards                                |

Não houve coleta válida de INP/TBT nem instrumentação de long tasks nessa execução. A lista de performance entries retornou zero long tasks, mas isso não comprova ausência delas, pois não foi instalado observer dedicado. O tempo de 1.204 ms da paginação inclui o atraso artificial e a espera do harness: não é INP.

O HTML SSR bruto observado foi 65.568 bytes na Home staging e 459.235 bytes no Mercado staging; em dev, 69.941 e 503.505 bytes. São bytes do HTML descomprimido, não transferência de rede medida, e incluem markup/metadados de SSR. O tamanho do Mercado merece profile com categorias/tabela, mas não prova sozinho lentidão ou uma nova falha prioritária.

**Verificações visuais positivas:**

- Não foi observado overflow horizontal do documento nas rotas públicas examinadas em 1440×900 e 390×844. O Mercado estreito usa scroll interno: tabela 860 px para região de 327 px.
- Paleta carvão/bronze, fonte Barlow, botões retangulares e foco aparecem nos caminhos inspecionados. Roadmap usa trilha própria; não se recomenda copiar a timeline para tabela ou árvore.
- Home/Roadmap têm entradas de 220 ms; Conta 180 ms; chart 180 ms e desligamento por reduced motion. Esses tempos estão abaixo de 300 ms.
- A preferência reduced motion no grafo inspecionado não deixou animações correndo no instante amostrado. Isso não testa todos os eventos/animações nem garante o comportamento de cada chamada JS de scroll.
- O painel de detalhes da receita moveu o foco para Fechar após a atualização; Tab entrou em controles do painel. A prova imediata anterior ao render não foi usada para alegar defeito de foco.
- O gráfico local tem nome acessível e tabela de observações; portanto não foi registrada a hipótese inicial de ausência de alternativa textual. A documentação primária de [acessibilidade do Chart.js](https://www.chartjs.org/docs/latest/general/accessibility.html) ressalta que canvas precisa dessa camada.
- Balenos staging tinha histórico vazio, local tinha 34 pontos. Isso não indica defeito no Chart.js.

**Cobertura que falta:** contraste medido de todos os estados, leitor de tela real, zoom 200/400%, todos os elementos com teclado, escala de listas grandes, pan/zoom e expansão exaustiva do grafo, tooltip de todas as métricas e todas as telas autenticadas. Inspeção de captura bonita não certifica esses itens.

## 7. Funcionalidades e dependências reconciliadas

| Área                    | Estado nesta auditoria                                                                   | Próximo gate                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Home/Roadmap            | Implementadas, carregadas e inspecionadas; estabilidade da Home parcial                  | AUD-03 e contraste/conteúdo variável                              |
| Login Google/Steam      | Configuração pronta; validação interativa incompleta                                     | AUD-13; depois fluxo novo AUD-04/05/06                            |
| Dados/backup e sync     | Componentes existem; recuperação sem login bloqueada; nuvem não validada com sessão      | AUD-01/05/13                                                      |
| Mercado/cache/histórico | Implementados e examinados; board/gráfico reais vistos; fonte/demanda limitada           | AUD-15/16; não repetir migração Chart.js                          |
| Receitas/árvore         | Implementadas e parcial em dados/UX; resultado incompleto preservado                     | AUD-02/08/09/11/12                                                |
| Otimização              | Aquisição no grafo atual implementada; alternativas recursivas planejadas                | Revisão e execução do plano, AUD-10                               |
| Coach/O que fazer       | Código/spec presentes, exige sessão e dados válidos                                      | QA autenticado e resultado explicado por premissa                 |
| Família/gear/estoque    | Implementação e testes existentes; cobertura visual desta auditoria bloqueada por sessão | Login de teste; não marcar fase visual pronta com base só em spec |
| OCR                     | Assistido com revisão; validação independente insuficiente                               | AUD-14; não treinar/importar automaticamente nesta fase           |
| Tutorial                | Launchers/gestão existentes; raiz /tutorials ausente                                     | Teste de gestão e conteúdo publicado em banco descartável         |
| World e utilitários     | Suspensos pelo MVP ou históricos                                                         | Escopo/dataset e QA próprios antes de liberar                     |
| Operação/produção       | Staging e smokes locais passaram; sem validação externa de campo/CI/domínio              | Fonte, identidade de teste, pipeline remoto e ambiente suportado  |

## 8. Verificação executada

- `pnpm test`: **1.066 aprovados e 1 ignorado** — Calculators 68; API 248 (+1 ignorado); Web 672; scripts/OCR 78. O caso ignorado requer PostgreSQL descartável. Nenhum teste novo foi escrito.
- `pnpm -r --workspace-concurrency=1 --if-present build`: passou, inclusive Web/SSR; bundle e avisos em AUD-16.
- `pnpm test:auth:local`: passou; `pnpm test:auth:staging`: passou (também HTTP/SSR/catálogo/ícone/noindex).
- Primeira execução de `pnpm check`: lint passou e format check encontrou apenas o prompt documental criado nesta auditoria. Esse arquivo foi formatado; a falha inicial não é regressão preexistente. A execução final de `pnpm check` passou (lint, formatação e typecheck, exit 0); `git diff --check` passou. A atualização documental final foi novamente conferida com Prettier.
- Nove casos de cálculo, GET de readiness/config/SSR, navegação e medidas descritas acima foram concluídos.
- As chamadas de rede abortadas/atrasadas para testar paginação foram limitadas ao navegador do auditor e removidas ao final do cenário.
- Não se rodou CI remoto, migração em banco persistente, benchmark novo de OCR ou login real. Não há declaração de produção pronta.

## 9. Sequência recomendada de correção, sem execução

1. **Preservação de dados e SSR:** AUD-01 e AUD-03, com regressão de visitante/backup/SSR e repetição de CLS. Baixo acoplamento com catálogo e maior efeito imediato na confiança.
2. **Fluxo de entrada/configurações:** AUD-04/05/06/07, em uma spec conjunta que preserve retorno/callbacks e exportação local. Validar AUD-13 com titular antes de marcar concluído.
3. **Honestidade econômica:** AUD-02/08/09; confirmar dados de equivalência e propagar proveniência de tempos/quantidades. Omitir conclusão numérica quando faltarem premissas.
4. **Otimizador:** revisar o plano existente e executar AUD-10 com oráculo e snapshot/versionamento. Não aumentar o limite de busca sem medidas.
5. **UX e estabilidade:** AUD-11/12/17/18 e QA real das telas protegidas após sessão de teste. Reduzir scroll por hierarquia, preservando informação necessária.
6. **Dados e escala:** AUD-14/15; corpus independente, fonte de mercado e critérios de cobertura precedem automação/ranking definitivo.
7. **Qualidade operacional:** AUD-16/19/20, ambiente suportado, perfil de bundle e documentação de retomada. Repetir gates no runtime padronizado antes de integrar/publicar.

As recomendações não autorizam remover funcionalidades, iniciar coleta contínua ou implementar correções. O próximo passo é a revisão dos achados pelo usuário.
