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
