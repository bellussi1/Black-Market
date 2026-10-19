# Home: busca e ações antes da explicação — 19/10/2026

## Pedido e decisão

Melhorar a UI da Home a partir da captura enviada. A coluna inicial acumulava proposta, três explicações, acesso à conta e link de profissões antes da busca. A coluna direita reservava metade do espaço ao Roadmap, mesmo com um único foco.

Reorganização delimitada ao template/SCSS de Dashboard: introdução curta e navegação pública à esquerda, busca à direita; benefícios em três colunas compactas; acesso à conta em faixa contextual; Roadmap abaixo usando a largura disponível. Abaixo de 800 px de container, os grupos refluem para uma coluna, na mesma ordem de leitura e teclado. Um único foco ocupa a linha; vários focos usam grade adaptativa. Sem alturas fixas ou truncamento de nomes.

Reutiliza tokens, painéis e variantes Helm existentes; não cria componente, tema, endpoint ou padrão compartilhado novo. Ação principal abre Receitas; Profissões e Mercado são alternativas. Texto de recomendações deixou de prometer ranking instantâneo. Busca continua independente do login, enquanto Armazém/OCR/recomendações mantêm seu requisito de conta. Guards, cálculos, persistência, estados do Roadmap e alvos de tutorial preservados.

## Pesquisa pública

Consulta em 19/10/2026, páginas públicas, sem login ou coleta de dados de jogo. Observações de conteúdo/navegação, sem inferência de algoritmos ou equivalência de resultados.

| Fonte                                    | Observação e limite                                                                                                                                                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/) | Descrição pública apresenta ferramentas de enhancement, progressão, crafting, mercado e capturas. Ferramentas dependem de JavaScript; composição visual completa não verificada pelo leitor.                                  |
| [BDO Codex US](https://bdocodex.com/us/) | Navegação de banco por itens, quests, NPCs e conhecimento, seguida de atualizações e comentários. Referência de descoberta por destino; não é equivalente ao planejador pessoal.                                              |
| [BDOLytics](https://bdolytics.com/)      | Redirecionou para `/en`, sem conteúdo legível retornado. Fluxo da Home não verificado; não inferir ausência de recursos.                                                                                                      |
| [Garmoth](https://garmoth.com/)          | Navegação por Mercado, Enhancing, Tools, Grind Tracker e Gear Planner; Home com guias, cupons e conteúdo comunitário. Mostra destinos concretos por atividade. Não foi adotado seu catálogo de conteúdo ou um feed editorial. |

A decisão local é facilitar começar uma tarefa pública antes de apresentar a trilha do produto. Nenhum texto extenso, asset, dataset ou implementação externa foi copiado.

## Verificação

O teste existente de acesso público foi ampliado para verificar destinos de Receitas/Mercado na entrada e busca antes da faixa de conta. Observado falhando antes da alteração; os 10 testes de Dashboard passaram depois, incluindo seleção dos focos, ordenação, links protegidos, erro/retry, tutorial e abertura do login.

QA com Chrome isolado, APIs do browser interceptadas e fixtures sem gravação no servidor. Cinco resoluções: 1920×1080, 2560×1440, 1600×900, 1366×768 e 390×844. Conferidos busca/seleção e destinos do item, login/Escape, foco por Tab, estados erro/vazio do Roadmap, dois focos e nome de personagem longo sem espaços. Zero overflow horizontal ou pageerror nas amostras. A fixture de estado autenticado altera sinais somente no contexto isolado; não comprova login ou persistência reais.

Na entrada pública, busca começa em aproximadamente 125 px e termina em 325 px nas amostras desktop. No celular, começa em 548 px e termina em 769 px, antes do fim da primeira tela de 844 px. A faixa de conta tem cerca de 138 px no desktop; a busca não depende dela. Medidas da fixture atual, não comparação pareada com a captura recortada enviada pelo usuário.

Layout equivalente a 125%/150% em tela física 1920×1080 validado por CDP: larguras CSS 1536/1280 e DPR 1,25/1,5 confirmados no browser, sem overflow com item selecionado. Isso não certifica o comando de zoom nativo do Chrome. Capturas inicial, móvel, nome longo e zoom inspecionadas. A preparação de screenshot foi ajustada para conservar o viewport emulado; repetição final confirmou as medidas.

`pnpm check` passou após a composição final; XLIFF extraído com 1.682 mensagens. Build de desenvolvimento e 10 testes de Dashboard passaram. Suíte integral: **1.300 testes aprovados e 1 ignorado** (78 Calculators, 270 API +1 ignorado, 871 Web, 81 scripts). Build de produção e `pnpm test:ssr` passaram: inicial 504,39 kB/135,56 kB estimados transferidos, catálogo 16,03 kB e árvore 19,06 kB. Avisos preexistentes de tamanho, locale e CommonJS permanecem; budgets intactos.

Evidências fora do Git: `C:/Users/Bellussi/.codex/visualizations/2026/10/19/01a1544f-c7df-7d10-9ca6-ea8ed5d33e83/home/`, com `metrics.json`, `home-preview.png`, cinco `home-*.png`, cinco `authenticated-*.png` e `zoom-{125,150}.png`. Runner temporário `tmp/home-qa.mjs`; logs ignorados `home-{layout-red,layout-green,check,test,browser-final,i18n,production,ssr}.log`. Todos os dados de busca/personagem/focos dessas capturas são sintéticos.

Entrega local na branch `codex/ui-ux-audit-completion`, worktree de mesmo nome; servidor temporário 4202 encerrado e servidor anterior 4200 preservado. Sem push, merge, deploy ou alteração de banco. Usar a base atual ao evoluir a Home, sem restabelecer a prioridade visual do Roadmap sobre a busca.
