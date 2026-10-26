# Plano hierárquico da receita — 26/10/2026

## Decisão

Implementar a **variação A, árvore contínua**, aprovada pelo usuário para o painel lateral da Oficina de Receitas. O painel deve acompanhar o cenário de aquisição ativo e revelar a cadeia de materiais por sub-receita, sem duplicar quantidades agregadas nem repetir lucro/h em várias superfícies.

## Evidência local

Na rota `/recipes/items/1407`, o produto `[Grupo] Fármaco da Harmonia - Edania` usa a fórmula de Alquimia simples, método 1, com cinco materiais diretos. No cenário de 100 receitas, o simulador carregado mostra saída estimada de 10.000 unidades. Ao selecionar Produzir para Elixir da Vontade, o plano passa a incluir quatro materiais da sub-receita: Reagente em pó Puro (10.850), Erva Aurora (43.400), Sangue de Lobo (65.100) e Água Purificada (32.550). As cotações estavam pendentes; esses valores são evidência do cenário local observado, não preços ou regras universais.

O plano atual apresenta materiais em uma lista plana, embora a visualização de produção tenha relações de pai e filho. Nas capturas fornecidas para Acompanhamentos Variados, o lucro/h da sub-receita aparece tanto no painel lateral quanto no comparativo do resultado, gerando repetição no mesmo contexto de decisão.

## Pesquisa competitiva

Consulta pública em 26/10/2026. A inspeção valida padrões de apresentação, não fórmulas, preços ou dados do Black Market.

| Produto e superfície                                                                                                     | Observação pública                                                                                                                                                                        | Limite da evidência                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [BDOLytics — calculadora de receita de culinária](https://bdolytics.com/en/cooking/9607:b7eed989316a)                    | Separa quantidades, estoque, custos, lucro e tempo; também oferece análise de receitas intermediárias e árvore da receita. Apoia manter premissas e cadeia acessíveis junto do resultado. | A página depende de conteúdo dinâmico e não prova a fórmula interna nem um resultado comparável ao cenário SA do Black Market. |
| [BDO Codex — Acompanhamentos Variados](https://bdocodex.com/pt/recipe/119/)                                              | Apresenta entradas e saídas e uma calculadora simples de quantidade, preço, custos e lucro.                                                                                               | Não foi observada uma árvore de planejamento aninhada nesta página.                                                            |
| [Garmoth — mercado de comidas](https://garmoth.com/market/category/consumables/food)                                     | Lista preços de mercado e categorias de consumíveis.                                                                                                                                      | Não foi encontrado um planejador encadeado equivalente na superfície pública consultada.                                       |
| [BDO Workshop](https://bdoworkshop.com/) e [plano de crafting 1407](https://bdoworkshop.com/crafting-workshop/plan/1407) | A página pública anuncia calculadoras de crafting/mercado e leitura por screenshots.                                                                                                      | O conteúdo do plano não ficou acessível ao extrator; a hierarquia interna permanece não verificada.                            |

Nenhum snapshot de concorrente, fórmula ou preço será incorporado ao produto.

## Comportamento aprovado

1. A coluna lateral mostra o produto final como contexto e todos os materiais diretos da fórmula ativa.
2. Cada material com produtor conhecido pode revelar seus próprios insumos. A árvore inicia compacta; a expansão é controlada por etapa e funciona também por teclado.
3. Se a etapa está em Produzir, as linhas descendentes usam quantidades agregadas do plano atual, estoque e origem já calculados pelo planner.
4. Se a etapa está em Comprar, os descendentes são somente uma referência de fórmula, com quantidade por operação e indicação visível de que não entram no custo nem na lista de compra deste cenário. Não oferecer ações de origem em descendentes de referência.
5. Um item reutilizado em ramos diferentes exibe seu total agregado uma única vez. Outras ocorrências apontam para a primeira linha do item, sem repetir total, estoque ou controles.
6. Quantidade ou cálculo indisponível permanece como pendente. Não estimar preço ou estoque ausente.
7. Retornos previstos permanecem em seção separada, com seus controles Vender/Guardar existentes.
8. Lucro/h de sub-receitas tem um único ponto de comparação no resultado da receita. Remover os indicadores repetidos do plano lateral, da árvore visual e de Etapas expansíveis. O plano lateral continua focado em quantidades, estoque, custos unitários e origem.
9. Ramos com fórmula ausente, ciclo ou limite de profundidade exibem estado explicativo e não travam o painel. Inicialmente, manter os descendentes recolhidos para receitas extensas como a 1407.

## Critérios de aceite

- A receita 1407 apresenta uma hierarquia lateral, sem perder o total por item do cenário ativo.
- Produzir Elixir da Vontade revela seus quatro materiais; comprar a sub-receita revela a fórmula somente como referência, sem incluí-la no total atual.
- Um item usado em dois ramos não duplica quantidade, estoque ou controles Comprar/Produzir.
- Usuário consegue expandir e recolher etapas com mouse e teclado; `aria-expanded` reflete o estado.
- Lucro/h aparece apenas no comparativo do resultado, com estado pendente quando os dados não bastam.
- Retornos e ações de compras mantêm o comportamento atual.
- Layout usa tokens e padrões existentes do catálogo BDO, sem overflow em tela estreita.
