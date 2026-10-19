# Enquadramento da expansão e detalhes da árvore — 19/10/2026

Pedido: dar foco ao item aberto na expansão de Receitas e melhorar o card do ícone de informação. O usuário esclareceu que o problema do card envolve scroll e zoom.

## Comportamento

- Expansão manual enquadra uma vez o item no terço superior da parte visível do canvas, com espaço abaixo para os filhos. Preserva zoom, escolhas e rolagem da página. A compensação de pan existente mantém a âncora durante chegada de dados/medidas; recolhimento, expansão em lote e atualização de preços não acionam novo enquadramento.
- Detalhes permanecem fora do transform da árvore, conservando sua escala de leitura. Posição e altura usam a medida real do card e a interseção entre canvas e janela, inclusive com a página parcialmente rolada. Observação do tamanho e listeners de scroll/resize atualizam essa posição; frames/listeners são limpos no destroy.
- Roda no card rola somente seu conteúdo, sem zoom da árvore ou encadeamento para a página nos limites. Cabeçalho/Fechar permanecem acessíveis ao rolar a descrição. Escape e retorno de foco ao acionador preservam o comportamento existente.
- Canvas usa `overflow: clip`: não é uma área de scroll nativo, pois sua câmera já é controlada por transform. A rolagem própria do card continua em `overflow: auto`. A QA reproduziu `scrollLeft=25` no container antigo, deixando o card 12 px além do limite visível do canvas ao revelar controles internos; a correção impede essa segunda câmera.

Essa decisão substitui a regra histórica de não reenquadrar uma expansão manual. Não introduz fit global automático nem animação que interfira na âncora do wheel. Guia canônico e referência de crafting atualizados; cálculos e conteúdo do catálogo preservados.

## Pesquisa pública

Consulta em 19/10/2026, sem autenticação ou coleta de datasets. Pesquisa limitada a alternativas de organização/interação; não houve comparação numérica de algoritmos.

| Fonte                                                                         | Resultado                                                                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — Crafting Workshop](https://bdoworkshop.com/crafting-workshop) | Leitor indisponível; não verificou enquadramento/popup atual                                                                             |
| [BDO Codex — Recipes](https://bdocodex.com/us/recipes/)                       | URL restrita ao leitor; sem inferir ausência de recurso                                                                                  |
| [BDOLytics — Cooking Market SA](https://bdolytics.com/en/SA/cooking/market)   | Leitor indisponível; sem comparação de scroll/zoom                                                                                       |
| [Garmoth — Gear Planner](https://garmoth.com/character/default)               | Navegação pública de personagem/gear e comparação acessível; não foi verificada árvore de receitas ou comportamento equivalente de popup |

## Verificação

Três testes observados em RED antes da correção: expansão sem enquadramento, card acima da área visível ao rolar o canvas e wheel sem consumo próprio. Depois da correção, **107 testes focados passaram**, incluindo a cobertura existente de ancoragem, zoom, arraste, receitas e detalhes. Revisão estática independente, incluindo `overflow: clip` e título sticky, sem achados acionáveis. `pnpm check` passou; alterações finais de SCSS também foram compiladas na sequência.

QA em Chrome isolado com dados sintéticos e APIs do browser interceptadas, sem conta, dados de usuário ou gravação no servidor. A preparação da amostra aguarda a rolagem suave iniciada pela automação antes de medir wheel; não confundir esse movimento de preparação com rolagem causada pelo card. A medição inicial verificou cinco resoluções e motivou a checagem adicional dos limites do canvas e scroll nativo.

Matriz final passou em **1920×1080, 2560×1440, 1600×900, 1366×768 e 390×844**, sem pageerror. Em cada amostra: expansão por botão nativo preservou zoom 0,7 e enquadrou o item; wheel moveu a descrição 200 px sem mover página/câmera; card ficou dentro da interseção janela/canvas durante mudanças de zoom da câmera e após rolar a página; Fechar permaneceu visível e devolveu foco ao ícone original. O scroll nativo do canvas ficou em **0/0** em todas as leituras, incluindo a regressão anteriormente observada em 1366 px. Inspeção das capturas desktop/mobile confirmou esses limites.

O teste de zoom usa o método real da câmera do grafo; não certifica zoom nativo do navegador, pinch ou gestos touch. A amostra móvel usa viewport/touch habilitado, sem simular gesto de pinça. Não há homologação de autenticação/persistência nessa fixture.

Gates: `pnpm check` passou; suíte integral passou **1.300 testes e 1 ignorado** (78 Calculators, 270 API + 1 ignorado, 871 Web, 81 scripts). Após o refinamento final de SCSS, build de desenvolvimento e matriz de browser foram repetidos; format check dos arquivos alterados passou. Extração XLIFF concluiu com 1.680 mensagens, somente localizações atualizadas. Build de produção e `pnpm test:ssr` passaram. Inicial 504,39 kB/135,51 kB estimados em transferência; árvore 19,06 kB e catálogo 16,03 kB. Avisos existentes de tamanho, locale e CommonJS mantidos; budgets intactos.

Evidências locais, fora do Git: `C:/Users/Bellussi/.codex/visualizations/2026/10/19/01a1544f-c7df-7d10-9ca6-ea8ed5d33e83/recipe-focus/metrics.json` e `details-{1920,2560,1600,1366,390}.png`. Logs ignorados na worktree: `recipe-focus-{red,green,check,test,dev-final,browser-final,native-red,i18n,production,ssr}.log`. Runner temporário: `tmp/recipe-focus-qa.mjs`.

Código/testes/XLIFF em `a58ca4b`, branch `codex/ui-ux-audit-completion`; documentação/guia em commit separado. Servidor temporário 4202 encerrado; servidor anterior 4200 e demais checkouts preservados. Sem push, merge, deploy ou alteração de banco.
