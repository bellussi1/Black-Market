# Profissões: navegação, sessão e rendimento — 19/10/2026

## Pedido e composição

Melhorar a UI de `http://localhost:4200/lifeskills`, deixando-a mais atrativa. Página existente consultada em Chrome isolado, sem sessão de conta; tutorial inicial foi fechado com Escape para inspecionar o conteúdo. Servidor anterior e seus arquivos preservados.

Mudança delimitada aos templates/estilos de Lifeskills e navegação compartilhada do hub. Navegação conserva links de URL e `aria-current`, com ícones decorativos Lucide já disponíveis no projeto, títulos e descrições em painéis de seleção. Cabeçalho ganha hierarquia/linha de contexto sem banner grande. Formulário agrupa contexto e valores, usa colunas conforme espaço interno e mantém controles padrão. Resumo destaca prata por hora e acompanha a rolagem no desktop; abaixo de 900 px de container, permanece no fluxo. Não há scroll interno novo.

Cabeçalho nativo de Comparações/histórico deixa de herdar margens negativas da barra de título global; todos os registros continuam no disclosure existente, sem novas etapas. Página pública de Produção apresenta os três contextos usados e alternativa de receitas sem conta, preservando bloqueio, retorno do login e montagem privada somente após autenticação. Aviso de registros locais aparece na aba de sessões, evitando sugerir acesso anônimo às recomendações.

Tokens/primitivas existentes, sem biblioteca, cálculo, contrato de dados, rota ou persistência nova. Não promete retorno garantido nem transforma zero ou dado ausente em estimativa diferente.

## Pesquisa pública

Consulta em 19/10/2026. Somente conteúdo/navegação públicos; sem comparação numérica de cálculos, login ou extração de datasets.

| Fonte                                                                       | Observação e limite                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)                                    | Apresenta crafting, mercado, progressão e capturas como ferramentas. Ferramentas dependem de JavaScript; não foi verificado um formulário equivalente de sessões pessoais.                            |
| [BDO Codex US](https://bdocodex.com/us/)                                    | Banco organizado por itens/quests/NPCs/conhecimento e atualizações. Referência de consulta; nenhum equivalente de registro pessoal foi observado na página consultada.                                |
| [BDOLytics — Cooking Market SA](https://bdolytics.com/en/SA/cooking/market) | URL indisponível ao leitor. Não inferir ausência de ferramenta ou comportamento.                                                                                                                      |
| [Garmoth — Grind Tracker](https://garmoth.com/grind-tracker)                | Redirecionou para Best Grind Spots; leitor sem conteúdo. Navegação pública previamente consultada separa tracker e spots, mas registro autenticado e formulário não foram verificados nesta consulta. |

Aplicação local: diferenciar navegação de planejamento e observações, mantendo resultado perto das entradas. Sem copiar assets, implementação, textos extensos ou métricas concorrentes.

## Evidências

Teste de acesso público ampliado para verificar alternativa de receitas no contexto de login; falhou antes e passou depois. **22 testes focados passaram**, incluindo comparação, URL/abas, montagem privada, SSR público, registro e estados de acesso.

Chrome isolado com todas as APIs do browser interceptadas: cinco resoluções (1920×1080, 2560×1440, 1600×900, 1366×768, 390×844) e dois layouts equivalentes a zoom 125%/150% por CDP, com largura CSS/DPR confirmados. Zero overflow da página ou pageerror; tabela do histórico conserva scroll horizontal local permitido. Não é certificação do comando de zoom nativo do navegador.

Conferidos resultado positivo/negativo, foco por Tab, registro local, abertura do histórico/comparação, preservação do formulário entre abas, seleção da navegação, acesso público negado sem montagem privada, alternativa de receitas e login/Escape. Nenhuma escrita de API foi emitida; registros ficaram somente no contexto descartável. Isso não homologa sincronização ou autenticação reais. Sticky do resumo medido a 16 px do topo após scroll desktop; mobile usa fluxo normal. Cards de métricas ficaram em duas colunas também no celular (resumo com cerca de 552 px de altura). Capturas desktop/mobile e Produção pública inspecionadas; valores preenchidos são sintéticos.

`pnpm check` passou; após o refinamento final do grid móvel, build de desenvolvimento e matriz de browser foram repetidos. XLIFF com 1.692 mensagens. Suíte integral: **1.300 testes aprovados e 1 ignorado** (78 Calculators, 270 API +1 ignorado, 871 Web, 81 scripts). Formatação final dos arquivos alterados passou. Build de produção passou: inicial 504,83 kB/135,52 kB estimados transferidos, árvore 19,06 kB e catálogo 16,03 kB. Avisos existentes de tamanho/locale/CommonJS e budgets preservados.

SSR final passou. A primeira rodada ainda esperava a frase antiga “Comece sem conta”; atualizada para “Sessões sem conta”, com cobertura da ausência do aviso na aba Produção. A primeira versão dessa nova asserção também encontrou o nome da classe no CSS SSR; corrigida para procurar somente elementos `p`. Repetição final, lint do script e formatação passaram, sem mudança adicional de produto para contornar o teste.

Evidências fora do Git: `C:/Users/Bellussi/.codex/visualizations/2026/10/19/01a1544f-c7df-7d10-9ca6-ea8ed5d33e83/lifeskills/`, incluindo `metrics.json`, `lifeskills-preview.png`, cinco capturas de sessões, cinco de Produção pública e `zoom-{125,150}.png`. Runner temporário: `tmp/lifeskills-qa.mjs`; logs ignorados `lifeskills-{red,green,check,test,dev-final,browser-final,i18n,production,ssr}.log`.

Entrega local na branch/worktree `ui-ux-audit-completion`; padrão de navegação registrado no catálogo BDO. Servidor temporário 4202 encerrado; servidor anterior 4200 e demais checkouts preservados. Sem push, merge, deploy ou alteração de banco. Manter controles/estados existentes ao evoluir a composição, sem montar produção privada no SSR ou transformar links de URL em tabs ARIA locais.
