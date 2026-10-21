# Altura dos painéis de receita — 19/10/2026

Pedido: reduzir os dois boxes de produto/configuração e resultado mostrados na captura do usuário, diminuindo rolagem e mantendo o conteúdo acessível.

## Causa e ajuste

O grid reservava dois terços da largura à configuração e um terço ao resultado. Três ações de cenário ocupavam linhas separadas no resultado estreito; o esticamento padrão do grid impunha essa altura também à configuração. Uma regra mais específica deixava os campos da configuração usando somente metade da área interna. O status de otimização vazio ainda reservava 40 px.

`recipe-tree.scss` agora divide os painéis igualmente, alinha pelo início e dá a largura interna completa à configuração. Cenários usam três colunas em containers de pelo menos 480 px; abaixo disso, duas opções ficam lado a lado e o otimizador ocupa a linha seguinte. As quatro métricas usam uma linha quando há espaço e duas no container menor. Status cresce com o texto, sem mínimo vazio de 40 px.

A proporção 1:1 substitui a composição 2:1 da decisão de 15/10 para atender ao pedido posterior de compactação; o canvas e a sidebar da árvore mantêm sua geometria. O teste existente que fixava o estilo antigo apresentou RED e foi atualizado ao novo contrato; não foi removido nem ignorado.

As três ações, descrições, campos, atalhos de lote e métricas continuam visíveis. Ajustes secundários preservam o disclosure existente; nada foi recolhido para obter a redução. Controles conservam as variantes/tamanhos compartilhados. Grafo, cálculos, preços, rendimento, navegação e estado não foram alterados. Revisão estática independente não encontrou achados acionáveis, incluindo especificidade e modo `summary-only`.

## Consulta pública

Consulta em 19/10/2026, sem login ou coleta de dados. O ajuste usa o problema reproduzido no Black Market; não adota implementação ou fórmulas externas.

| Fonte                                                                              | Resultado                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop — Crafting Workshop](https://bdoworkshop.com/crafting-workshop)      | Leitor indisponível; sem nova observação interna                                                                                                                                                                             |
| [BDO Codex — Recipes](https://bdocodex.com/us/recipes/)                            | Resposta sem conteúdo legível; não confirmou composição interna                                                                                                                                                              |
| [BDOLytics — Cooking Market SA](https://bdolytics.com/en/SA/cooking/market)        | Leitor indisponível; sem comparação de resultados                                                                                                                                                                            |
| [Garmoth — Lifeskill Summary](https://garmoth.com/grind-tracker/null/life/summary) | Resultado público indexado mostra resumo com métricas de total, prata/hora e horas, além de filtros; não foi verificado um simulador de receita equivalente. Consulta direta ao tracker global não devolveu conteúdo legível |

## QA e gates

Chrome headless isolado, fixtures de receita/mercado e APIs do browser interceptadas, sem usar conta ou gravar no servidor. Mesma fixture para medir antes/depois; o mock sem preços completos não certifica cálculos ou cotações. A linha de base em 1920×1080 reproduziu painéis de 949/475 px de largura e 518 px de altura, compatíveis com a composição da captura recebida.

Sete amostras passaram sem overflow detectado nos painéis ou erros não tratados: cinco resoluções canônicas e viewports CSS equivalentes ao reflow de 125%/150% em 1920×1080 (1536×864 e 1280×720, sem certificar zoom nativo/rasterização). Inspecionadas capturas de 1920, 1366 e 390 px. Atalhos de lote, troca de cenário e abertura dos ajustes continuam funcionando.

| Viewport  | Configuração antes → depois | Resultado antes → depois | Árvore aparece mais acima |
| --------- | --------------------------- | ------------------------ | ------------------------- |
| 1920×1080 | 518 → 308 px                | 518 → 283 px             | 210 px                    |
| 2560×1440 | 518 → 308 px                | 518 → 283 px             | 210 px                    |
| 1600×900  | 518 → 308 px                | 518 → 283 px             | 210 px                    |
| 1366×768  | 538 → 308 px                | 538 → 308 px             | 230 px                    |
| 390×844   | 418 → 418 px                | 535 → 454 px             | 81 px                     |
| 1536×864  | 538 → 308 px                | 538 → 283 px             | 230 px                    |
| 1280×720  | 538 → 308 px                | 538 → 419 px             | 119 px                    |

Capturas e métricas locais ficam fora do Git em `C:/Users/Bellussi/.codex/visualizations/2026/10/19/01a1544f-c7df-7d10-9ca6-ea8ed5d33e83/compact-recipe/`: `baseline.json`, `verify.json`, `baseline-1920.png`, `verify-1920.png`, `verify-1366.png` e `verify-390.png`. São amostras sintéticas de composição, não cotações reais.

`pnpm check` passou. A primeira suíte completa teve somente a falha do contrato CSS 2:1 anterior (867 testes Web passaram); após atualizar a expectativa, `pnpm test` integral passou: 78 Calculators, 270 API +1 ignorado por exigir PostgreSQL descartável, 868 Web e 81 scripts — **1.297 aprovados/1 ignorado**. Lint do spec atualizado e format check dos arquivos alterados também passaram.

Build de produção e `pnpm test:ssr` passaram. Inicial 504,37 kB/135,53 kB estimados em transferência; árvore 19,06 kB ante aviso de 16 kB e catálogo 16,03 kB. Avisos de tamanho, locale pt-BR→pt e CommonJS do OCR permanecem; budgets intactos. Não foram criados testes unitários para espelhar a alteração de CSS: foi atualizado o contrato existente, complementado pela medição no browser.

Servidor temporário de QA 4202 encerrado antes dos testes; 4200 e os outros checkouts preservados. Sem push/merge/deploy ou mudanças de conta/banco.

## Continuação de 20/10/2026 — maestrias visíveis

Na receita Acompanhamentos Variados (`5670a9e98801c39fb5b8114c0915fca0d456d61b2f7f6e97473da1808c31cab0`), os campos existentes de Culinária e Processamento estavam habilitados, mas ocultos dentro do disclosure fechado. Foram movidos para o painel principal, junto da quantidade. A grade compacta mantém os campos lado a lado quando há espaço e empilha no mobile; uma explicação compartilhada informa que os ajustes pertencem à simulação. Tributos e calibração continuam nos ajustes secundários.

O conjunto de profissões, as fórmulas, alternativas do otimizador e a persistência existentes não foram alterados. Não foram adicionados efeitos de Coleta ou de outras profissões sem modelo de cálculo. A indicação desativada de fórmula sem efeito permanece.

Consulta pública em 20/10/2026, sem login ou coleta de cotações:

| Fonte                                                                                                                             | Observação e limite                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BDO Workshop](https://bdoworkshop.com/)                                                                                          | Superfície pública apresenta ferramentas de crafting/mercado; shell JavaScript não permitiu verificar campos de maestria.                                                        |
| [BDO Codex — Acompanhamentos Variados](https://bdocodex.com/us/item/9209/)                                                        | Descrição, ingredientes e requisito de culinária observáveis; não foi identificado um controle equivalente de simulação com várias maestrias. Preços de outra região não usados. |
| [BDOLytics — Cooking Market SA](https://bdolytics.com/en/SA/cooking/market)                                                       | Leitor indisponível; não foi possível verificar o formulário, sem concluir ausência da funcionalidade.                                                                           |
| [Garmoth — Cooking](https://garmoth.com/mastery-brackets/cooking) e [Processing](https://garmoth.com/mastery-brackets/processing) | Tabelas públicas por maestria; a consulta orienta a apresentação dos campos e não certifica nem substitui os coeficientes existentes.                                            |

QA com a receita real e API local em contexto descartável: ambos os campos visíveis e editáveis, disclosure secundário fechado, sem overflow horizontal em 1920, 1366, 390 e 320 px e sem `pageerror`. No cenário fazer/coletar, trocar Culinária de 0 para 1250 e Processamento de 0 para 1000 atualizou as estimativas das respectivas etapas; a ficha do visitante permaneceu ausente. Os números são premissas do planejador, não homologação de rendimento no jogo. O teste existente de várias profissões apresentou RED para o acesso oculto e passou após a mudança; os 75 testes do componente passaram, incluindo preservação da ficha.

Limpar Culinária no browser retomou o valor-base e preservou o override de Processamento. Revisão independente sem achados acionáveis. `pnpm check`, `pnpm test` integral (**1.304 aprovados/1 ignorado**), build de produção e `pnpm test:ssr` passaram. Árvore em 18,34 kB, ainda acima do aviso existente de 16 kB; budgets preservados. Permanecem os avisos de locale e CommonJS do OCR. Prévia `4200` e API `3000` continuam no checkout principal `main`, sem mudanças no banco ou na conta.

## Alinhamento e medidas compartilhadas — 20/10/2026

A captura posterior do usuário mostrou recuos, títulos e controles com medidas diferentes. Configuração, resultado e métricas agora usam os gutters de painel existentes; os cabeçalhos compartilham hierarquia tipográfica. Quantidade e maestrias ficam lado a lado quando o container comporta o grupo, com estimativas abaixo; no espaço menor, empilham sem ocultar campos. Removida a segunda camada de recuo das maestrias. Após esclarecimento do usuário, configuração e resultado esticam até a altura do maior conteúdo na mesma linha, sem altura fixa; empilhados, continuam com alturas próprias. Essa orientação substitui a decisão anterior de não esticar esses dois cards.

Campos da receita usam 44 px; atalhos, fechar, informação e disclosures compactos usam 36 px. Também foram corrigidas alturas locais de campos do OCR, ações do Armazém e disclosure da ficha de equipamento. As medidas vêm dos tokens existentes, sem nova variante ou mudança de cálculo/estado. A revisão identificou falta de espaço entre grupos no modo resumido do Mercado; o grid com gap de 12 px foi aplicado à base comum e conferido em `/market?item=9209` em 1920/1366/390 px.

Consulta pública repetida em 20/10: [Workshop](https://bdoworkshop.com/) apresentou o shell que exige JavaScript; [Codex receitas](https://bdocodex.com/us/recipes/) e [BDOLytics SA](https://bdolytics.com/en/SA/cooking/market) indisponíveis no leitor; [Garmoth Cooking](https://garmoth.com/mastery-brackets/cooking) apresentou tabelas e navegação pública. Essas superfícies não confirmam equivalência dos layouts nem medidas internas; a padronização segue os tokens e a reprodução local, sem importar fórmulas.

QA da receita em 2560/1920/1600/1366/390/320 px e reflow equivalente a 125%/150% de 1920 (1536/1280 CSS px): campos visíveis, sem overflow de página nem `pageerror`. Reflow não certifica zoom nativo/rasterização. Em 1920, configuração com duas maestrias passou de 454 para cerca de 364 px; campos medidos em 44 px e atalhos em 36 px. Capturas locais ignoradas pelo Git: `.playwright-mcp/alignment-1920.png` e `alignment-390.png`.

Home, Profissões, catálogo de receitas e Mercado conferidos como visitante em 1920/390 px, sem overflow; Família/OCR redirecionam por guarda de acesso. Não é homologação de conteúdo autenticado preenchido do OCR, Armazém ou Família nesta rodada. Testes existentes cobrem esses componentes; não foi criada simulação de login para alegar QA real.

Conferência final em 1366 px: os três campos na mesma baseline, todos com 44 px; configuração em cerca de 385 px. Edição de Culinária/Processamento, atalho 10x, abertura/fechamento dos detalhes e disclosure funcionaram sem `pageerror`. Revisão independente concluída após corrigir o espaçamento do resumo. `pnpm check`, suíte integral (1.304 aprovados/1 ignorado), produção e SSR aprovados; avisos existentes de CSS da árvore, locale e CommonJS do OCR permanecem. Sem mudanças em budgets, fórmulas, perfil ou banco.

Alturas iguais verificadas após o esclarecimento: diferença entre bordas inferiores de 0 px em 1920/1366/1536/1280, inclusive com ajustes abertos. Em 390 px, alturas independentes preservadas; sem overflow ou `pageerror`. Check e suíte integral repetidos e aprovados (1.304 aprovados/1 ignorado).

## Alinhamento do plano de materiais — 20/10/2026

A captura posterior mostrou quantidade comprimida pelo status, checkbox em uma segunda linha desconectada e texto dos retornos começando em outro recuo. Materiais passam a separar detalhes e coluna de quantidade/controle; o status duplicado foi retirado quando há a opção Produzir. Ícones têm slot estável, nomes quebram sem corte e retornos usam as mesmas colunas de ícone/texto/ação. O rodapé vazio não ocupa espaço. Os bindings de produção, seleção, venda e salvamento permanecem iguais.

Consulta pública específica: [Workshop #9601](https://bdoworkshop.com/crafting-workshop/plan/9601) indisponível, [BDOLytics #9601](https://bdolytics.com/en/crafting/9601:558d95547e1d) sem conteúdo textual e [Codex #9209](https://bdocodex.com/us/item/9209/) bloqueado no leitor. [Garmoth — frutos do mar](https://garmoth.com/market/category/material/seafood) apresenta linhas com ícone, nome e preço; não foi verificado um controle de compra/produção equivalente. A composição segue os tokens do projeto, sem copiar implementação ou cálculos concorrentes.

QA da rota pública em 1920/2560/1600/1366/390 px e reflow 1536/1280: mesmos eixos dos nomes nos quatro materiais e no retorno, quantidades alinhadas à direita, sem overflow horizontal ou `pageerror`. Nomes extensos/unidos testados temporariamente no DOM do contexto descartável, sem invadir os controles. Produzir e Incluir venda alternaram e foram restaurados. Capturas ignoradas `.playwright-mcp/sidebar-1920.png` e `sidebar-390.png`.

`pnpm check`, suíte integral (**1.318 aprovados/1 ignorado**), extração i18n, produção e SSR aprovados; revisão independente sem achados. Inicial 499,84 kB e budgets preservados; avisos existentes de CSS da árvore, locale e CommonJS de OCR permanecem. Sem nova lógica de cálculo ou escrita em banco.

## Prévia de otimização — 20/10/2026

A captura do usuário mostrava título extenso, avisos e fórmulas sem recuo, métricas pequenas e decisões escondidas. A prévia agora tem título curto e contexto do lote, resultado estimado em quatro métricas e escolhas abertas por padrão. Cada material separa nome/ícone das quantidades Comprar, Fazer e Estoque; etapas mostram operações e tempo. Pendências, alcance/fórmulas e premissas usam seções secundárias. Cabeçalho e ações permanecem visíveis na rolagem interna, com grade de duas métricas no celular. O estado sem plano mantém pendências visíveis e não oferece aplicar.

O diálogo nativo e as funções de cálculo, aplicação, descarte e invalidação foram preservados. Escape/cancel usam fechamento controlado; ao sair com foco dentro da janela, o foco retorna ao acionador sem scroll. “Melhor encontrado” continua distinto de ótimo certificado; a mudança não certifica resultados nem altera custos/tempos. Estilos exclusivos foram separados em `recipe-optimization-dialog.scss`, como segundo estilo encapsulado do componente, mantendo os budgets existentes.

Consulta pública em 20/10: [Workshop — plano #9601](https://bdoworkshop.com/crafting-workshop/plan/9601) indisponível no leitor; [BDOLytics — crafting #9601](https://bdolytics.com/en/crafting/9601:558d95547e1d) sem conteúdo textual verificável; [Codex — item #9209](https://bdocodex.com/us/item/9209/) restringiu o acesso. [Garmoth — Cooking](https://garmoth.com/mastery-brackets/cooking) expôs tabelas de maestria, sem uma prévia equivalente de otimização verificada. Não foram comparadas saídas com premissas pareadas nem importadas fórmulas ou cotações desses sites.

QA em contexto descartável na receita pública, em 1920/1536/1280/390/320 px: nenhuma rolagem horizontal no diálogo; cabeçalho e rodapé visíveis ao rolar até o fim. 1536/1280 verificam reflow equivalente a 125%/150% de 1920, sem certificar zoom nativo. Escape devolveu foco ao botão. Aplicar transferiu o lucro/h e o cenário da prévia para a receita; fechar descartou a proposta. Nome extenso sem espaços quebrou sem invadir as quantidades. Estado limitado veio do cálculo real; certificado e ausência de plano foram conferidos também com fixture temporária de apresentação, sem certificar o algoritmo ou a conta Google. Sem `pageerror` nas interações monitoradas. Capturas locais ignoradas: `.playwright-mcp/optimizer-ui-final-desktop.png` e `optimizer-ui-final-mobile.png`.

Fechamento em 21/10/2026: `pnpm check`, `pnpm test` (**1.318 aprovados/1 ignorado**), repetição dos 75 testes da árvore após o ajuste de foco, build de produção e `pnpm test:ssr` aprovados. Revisão independente sem achados. Inicial 499,84 kB; CSS principal da árvore 18,66 kB (aviso existente de 16 kB; limite de erro 20 kB preservado). Permanecem os avisos de locale e CommonJS do OCR. Sem migração ou escrita em dados reais.
