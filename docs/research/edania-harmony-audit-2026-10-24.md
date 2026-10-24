# Auditoria do Fármaco da Harmonia — Edania

Revisão em 24/10/2026 de receitas, rendimentos, ícones e custos do #1407, com conferência do Fármaco da Harmonia #1399 e do item derivado #1408. Regras do jogo foram separadas de dados do cliente, cotações e estimativas calculadas.

## Resultado

Não encontrei divergência de composição, agrupamento, rendimento fixo, seleção de preço ou associação dos ícones no código e catálogo ativos. A falha encontrada era documental: a referência antiga marcava o rendimento do lote como desconhecido e tratava o x10 de 2025 como atual, mesmo com o patch oficial de agosto de 2026 e o catálogo ativo contendo as receitas x10 e x100.

O dataset consultado na API local foi `sa-pt-meta-11e938d92a61-loc-72e54f5dc932-ext-5bf11bd7-bin-60bd5677-catalog-catalog-v3-supp-37cd81cf`, importado em 18/10/2026, com checksum `e9a59310fb4d0b1d0039b5439360d943b3b50d3a02d3faa9c20ed7d1ecae8bed` (74.523 itens; 10.683 receitas). A busca pública de notas SA até 22/10/2026 não encontrou mudança posterior na fórmula. As [notas oficiais de 27/08/2026](https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=8511) confirmam os lotes atuais; as [notas de 21/08/2025](https://www.sa.playblackdesert.com/PT-BR/News/Detail?groupContentNo=6639) registram a composição unitária original.

## Receitas e rendimentos

O endpoint `GET /api/v1/items/1407/recipes?direction=produces&pageSize=100` retornou 12 receitas: quatro unitárias, quatro para 10 unidades e quatro para 100. Em cada tamanho, existem as quatro combinações das substituições superiores de Vontade (#702 ×3 ou #703 ×1 por escala) e Edania (#1409 ×3 ou #1410 ×1 por escala).

| Saída      | Ingredientes de cada operação                                                       | Rendimento validado |
| ---------- | ----------------------------------------------------------------------------------- | ------------------: |
| #1407 ×1   | #1399 ×1, #1409 ×3 ou #1410 ×1, #702 ×3 ou #703 ×1, #820936 ×1                      |                   1 |
| #1407 ×10  | #1399 ×10, #1409 ×30 ou #1410 ×10, #702 ×30 ou #703 ×10, #821372 ×1                 |                  10 |
| #1407 ×100 | #1399 ×100, #1409 ×300 ou #1410 ×100, #702 ×300 ou #703 ×100, #821372 ×10, #4986 ×1 |                 100 |

As notas oficiais estabelecem a troca da receita x10 antiga (Catalisador Mágico ×10 e Essência de Ibellab ×1) pela receita atual com Catalisador Mágico Concentrado ×1 e sem Essência. O lote x100 novo usa Catalisador Mágico Concentrado ×10 e Essência de Ibellab ×1. O Catalisador Concentrado é vendido por NPC por 10.000.000 pratas, também confirmado pelo preço NPC do catálogo ativo.

As saídas do catálogo estão sem quantidade. `recipe-fixed-yields.ts` reconhece as composições atuais por IDs e quantidades exatas e retorna 1/10/100. Não aplica maestria genérica a Alquimia Simples. `recipe-equivalents.ts` agrupa os três lotes numa família e mantém o seletor de lote. A composição histórica de 2025 não passa pela validação atual de rendimento.

O item #1399 tem uma receita confirmada que produz 10 unidades com dez de cada um dos cinco fármacos-base (#1389, #1391, #1393, #1395 e #1397). Os rendimentos fixos desses cinco produtos também são aplicados; os preços estimados abaixo consideram as receitas catalogadas de cada um. O rendimento e a chance do Elixir de Edania Poderoso permanecem variáveis e não foram inventados.

O derivado #1408 também foi conferido: quatro relações ativas cobrem receita unitária e lote de 10, usando #1178 ou #1179. O rendimento fixo é 1/10. A rota do óleo de evento #1179 não tem cotação de mercado. A rota do óleo comum #1178 pode ser calculada com os valores abaixo.

## Ícones e descrições

As rotas de ícones dos itens #1399, #1407, #1408, #1409, #1410, #702, #703, #820936, #821372, #4986, #1178 e #1179 responderam `200 image/webp` usando o checksum ativo. Conferi visualmente os pares #1407/#1408, #1409/#1410 e #820936/#821372: cada um conserva a arte do item correto e os pares são distintos.

O item #1179 usa no cliente o mesmo caminho de ícone de #1178 (`00001178.dds`); os WebP servidos têm o mesmo SHA-256. É reutilização da arte de origem para o óleo de evento, não troca acidental de ID na rota. Não alterei os assets.

## Custos calculados

A cotação SA/pt das entradas diretas veio da API local, fonte Arsha, com `fetchedAt` **2026-10-24 03:29:49 UTC** e cache upstream de até 30 minutos. Os preços dos cinco fármacos-base usados na rota recursiva de #1399 vieram de uma consulta bem-sucedida separada às **03:21:29 UTC**; preços de NPC vieram do catálogo ativo, importado em 18/10/2026. Uma única requisição combinada para 52 IDs falhou com HTTP 503, então os dois snapshots são identificados separadamente.

| Item                                             | Preço unitário usado | Estoque / origem                   |
| ------------------------------------------------ | -------------------: | ---------------------------------- |
| #1399 Fármaco da Harmonia                        |           25.000.000 | Mercado, 1.543                     |
| #1407 Fármaco da Harmonia - Edania               |           29.400.000 | Mercado, 18.873                    |
| #1408 Imortalidade: Fármaco da Harmonia - Edania |          280.000.000 | Cotação de referência, estoque 0   |
| #702 Elixir da Vontade                           |               85.500 | Cotação de referência, estoque 0   |
| #703 Elixir da Vontade Extraordinária            |              149.000 | Cotação de referência, estoque 0   |
| #1409 Elixir de Edania                           |              464.000 | Mercado, 890                       |
| #1410 Elixir de Edania Poderoso                  |            1.450.000 | Mercado, 67                        |
| #1178 Óleo da Imortalidade Decadente             |           37.300.000 | Mercado, 1.852                     |
| #1179 Óleo da Imortalidade Decadente de evento   |                    — | Sem cotação retornada              |
| #820936 Catalisador Mágico                       |            1.000.000 | NPC, catálogo ativo                |
| #821372 Catalisador Mágico Concentrado           |           10.000.000 | NPC; confirmado nas notas oficiais |
| #4986 Essência de Ibellab                        |               10.000 | NPC, catálogo ativo                |

Na falta de estoque e de preço máximo, `recipeMarketPrice` conserva o último valor como cotação de referência. Por isso os preços de #702 e #703 entram na simulação, mas não provam que o jogador consiga comprá-los agora. O preço de #1407 também não é receita líquida de venda. Custos abaixo são apenas de materiais: sem imposto de venda, ferramentas, energia, duração ou valor do trabalho.

O cálculo foi refeito para todas as 12 receitas com as quantidades reais do catálogo. A tabela mostra o custo total por lote em duas rotas. “Comprar #1399” usa o preço de mercado de 25.000.000; “fabricar #1399” substitui esse valor por 18.739.500 pratas de materiais, calculados pela opção totalmente precificada de menor custo para cada um dos cinco fármacos-base.

| Vontade            | Edania              |             Comprar #1399 (1 / 10 / 100) |            Fabricar #1399 (1 / 10 / 100) |
| ------------------ | ------------------- | ---------------------------------------: | ---------------------------------------: |
| #702 ×3 por escala | #1409 ×3 por escala | 27.648.500 / 276.485.000 / 2.764.860.000 | 21.388.000 / 213.880.000 / 2.138.810.000 |
| #703 ×1 por escala | #1409 ×3 por escala | 27.541.000 / 275.410.000 / 2.754.110.000 | 21.280.500 / 212.805.000 / 2.128.060.000 |
| #702 ×3 por escala | #1410 ×1 por escala | 27.706.500 / 277.065.000 / 2.770.660.000 | 21.446.000 / 214.460.000 / 2.144.610.000 |
| #703 ×1 por escala | #1410 ×1 por escala | 27.599.000 / 275.990.000 / 2.759.910.000 | 21.338.500 / 213.385.000 / 2.133.860.000 |

No lote x100, o Catalisador Concentrado custa 100.000.000 (dez unidades) e a Essência custa 10.000; essa Essência acrescenta 100 pratas por produto. O x10 usa um Catalisador Concentrado por operação, equivalente a 1.000.000 por saída. Assim, a normalização por rendimento reproduz o custo por unidade, com o pequeno acréscimo do Ibellab no x100.

| Fármaco-base                            | Menor custo por unidade calculado |
| --------------------------------------- | --------------------------------: |
| #1389                                   |                         3.765.000 |
| #1391                                   |                         1.916.000 |
| #1393                                   |                         2.009.500 |
| #1395                                   |                         5.035.000 |
| #1397                                   |                         6.014.000 |
| **Fármaco da Harmonia #1399 fabricado** |                    **18.739.500** |

Essa rota custa 6.260.500 menos por #1399 do que comprá-lo pela cotação observada de 25.000.000. A combinação de menor custo de materiais para #1407 é #703 + #1409; custa 21.280.500 por unidade quando #1399 é fabricado e 21.280.600 no lote x100. Contra a cotação de referência de #1407 em 29.400.000, a diferença bruta é 8.119.500 antes de impostos e tempo; isso não é uma estimativa de lucro líquido.

Como conferência do #1408 pela rota do óleo comum, comprar #1407 custa 253.200.000 por unidade (29.400.000 + 6 × 37.300.000); o lote de 10 com Ibellab custa 2.532.010.000, ou 253.201.000 por produto. Produzindo #1407 pela combinação de menor custo, os valores passam a 245.080.500 por unidade e 245.081.500 no lote x10. O preço de mercado observado para #1408 está sem estoque; não usei como venda confirmada.

## Validação e limites

- A API ativa retornou 12 receitas de #1407 e as distribuiu em 4/4/4 pelas quantidades 1/10/100; a substituição 3:1 aparece em cada escala.
- Os 12 ícones responderam 200 no mesmo checksum do item; os pares principais foram inspecionados visualmente. Os óleos de evento e comum compartilham a arte do cliente.
- Os cálculos por lote foram pareados com quantidades reais, quotes SA/PT e preços NPC do mesmo catálogo. `recipeMarketPrice`, `fixedRecipeYield`, `recipeFamilies` e o adaptador de produção têm cobertura de testes para referência sem estoque, rendimentos fixos, lotes 1/10/100, equivalências e preço NPC.
- As cotações de entradas diretas representam a consulta das 03:29 UTC; a rota recursiva dos cinco fármacos-base representa a consulta separada das 03:21 UTC. Entradas sem estoque podem mudar e não garantem compra. O custo recursivo de #1399 escolhe a receita de materiais mais barata com preço disponível na consulta correspondente, não comprova disponibilidade integral nem inclui tempo, esforço, impostos ou subprodutos probabilísticos.
- Nenhum comportamento de interface, catálogo ativo ou banco foi alterado nesta auditoria. Os metadados do suplemento e documentos foram atualizados; não foi feita nova importação nem rebuild do aplicativo.
